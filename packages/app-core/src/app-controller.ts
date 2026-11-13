import { newId, type AccountInput } from '@tdl/domain';
import { NetworkError, Replica, type FetchLike, type ReplicaStore } from '@tdl/sync';
import type { KeyValue, Platform } from './platform.ts';
import { ApiError, meSchema, ServerApi, type Me } from './server-api.ts';

/**
 * `ready` with `sessionEnded`: the session expired or ended, but the device keeps its data and
 * unsynced changes until the user logs in again (`logInAgain`) or logs out.
 */
export type AppState = { kind: 'starting' } | { kind: 'logged-out' } | { kind: 'ready'; me: Me; replica: Replica; sessionEnded: boolean };

export type LogOutResult = { kind: 'done' } | { kind: 'unsynced'; count: number; sessionEnded: boolean };

export interface AppControllerOptions {
  /** The server's URL, e.g. https://tdl.app, without a trailing slash. */
  baseUrl: string;
  platform: Platform;
  fetch?: FetchLike;
}

/** The KeyValue key of the cached `GET /api/me`, so the app can start offline. */
const ME_KEY = 'me';

/**
 * The app without its UI: starting up (offline first), logging in and out, and what happens when
 * the session expires or is revoked. UIs render `state()` and re-render on `onChange`.
 */
export class AppController {
  private readonly baseUrl: string;
  private readonly platform: Platform;
  private readonly fetch: FetchLike | undefined;

  private current: AppState = { kind: 'starting' };
  private readonly listeners = new Set<() => void>();
  private storage: { replicaStore: ReplicaStore; keyValue: KeyValue } | null = null;
  private token: string | null = null;
  /** Stops relaying the open replica's changes. */
  private stopRelay: (() => void) | null = null;
  /** Stops the open replica's live updates. */
  private stopLive: (() => void) | null = null;

  constructor(options: AppControllerOptions) {
    this.baseUrl = options.baseUrl;
    this.platform = options.platform;
    this.fetch = options.fetch;
  }

  state(): AppState {
    return this.current;
  }

  /** Calls `listener` after the state changes, or the open replica does. Returns a function that unsubscribes. */
  onChange(listener: () => void): () => void {
    const entry = (): void => {
      listener();
    };
    this.listeners.add(entry);
    return () => {
      this.listeners.delete(entry);
    };
  }

  /**
   * With a stored replica and a cached `me`, opens it at once, then checks the session with the
   * server. Otherwise the server decides between `ready` and `logged-out`.
   */
  async start(): Promise<void> {
    const { replicaStore, keyValue } = await this.openStorage();
    this.token = this.platform.auth === 'token' ? await this.platform.loadToken() : null;
    const stored = await replicaStore.load();
    const cached = meSchema.safeParse(await keyValue.get(ME_KEY));

    if (stored !== null && cached.success && stored.userId === cached.data.userId) {
      await this.open(cached.data);
      await this.checkSession();
      await this.goLive();
      return;
    }

    if (this.platform.auth === 'token' && this.token === null) {
      this.setState({ kind: 'logged-out' });
      return;
    }
    try {
      const me = await this.api().me();
      await this.enter(me);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'session-revoked') await this.wipe();
      if (error instanceof ApiError || error instanceof NetworkError) {
        // Offline with nothing stored: there's nothing to show but the login page.
        this.setState({ kind: 'logged-out' });
        return;
      }
      throw error;
    }
  }

  /** Logs in, and opens the user's replica, replacing one stored for another user. */
  async logIn(identifier: string, password: string): Promise<void> {
    const { token } = await this.api(null).logIn(identifier, password);
    await this.useToken(token);
    await this.enter(await this.api().me());
  }

  /** Creates an account and logs in to it. */
  async signUp(input: AccountInput & { acceptTerms: boolean }): Promise<void> {
    const { token } = await this.api(null).signUp(input);
    await this.useToken(token);
    await this.enter(await this.api().me());
  }

  /**
   * After the session ended, logs in again as the same user and syncs the queued changes. Another
   * account is refused with `ApiError(403, 'different-user')`, and nothing changes.
   */
  async logInAgain(identifier: string, password: string): Promise<void> {
    const state = this.current;
    if (state.kind !== 'ready' || !state.sessionEnded) throw new Error('session-not-ended');
    const { token } = await this.api(null).logIn(identifier, password);
    const api = this.api(token);
    const me = await api.me();
    if (me.userId !== state.me.userId) {
      // End the session just made, so it isn't left behind. Failing to is harmless.
      await api.logOut().catch(() => undefined);
      throw new ApiError(403, 'different-user');
    }
    await this.useToken(token);
    await this.enter(me);
  }

  /**
   * Logs out: ends the session on the server if it can, and deletes the device's data either way. With
   * unsynced changes and no `choice`, changes nothing and reports them, so the user can choose.
   */
  async logOut(choice?: 'discard'): Promise<LogOutResult> {
    const state = this.current;
    if (state.kind === 'ready' && choice === undefined) {
      const count = state.replica.pending().length;
      if (count > 0) return { kind: 'unsynced', count, sessionEnded: state.sessionEnded };
    }
    try {
      await this.api().logOut();
    } catch {
      // The data goes whatever sign-out answers: the server may be unreachable or failing, or the session already ended.
    }
    await this.wipe();
    this.setState({ kind: 'logged-out' });
    return { kind: 'done' };
  }

  /** Stops live updates and the replica's change relay, e.g. when the app is torn down. */
  close(): void {
    this.stopLive?.();
    this.stopLive = null;
    this.stopRelay?.();
    this.stopRelay = null;
  }

  // Helpers

  /** Opens the user's replica, caches their `me`, and syncs. */
  private async enter(me: Me): Promise<void> {
    await this.open(me);
    const { keyValue } = await this.openStorage();
    await keyValue.set(ME_KEY, { ...me });
    await this.goLive();
  }

  /** Starts live updates and syncs, unless the session has ended (nothing is sent under a session that isn't the user's). */
  private async goLive(): Promise<void> {
    const state = this.current;
    if (state.kind !== 'ready' || state.sessionEnded) return;
    this.stopLive = state.replica.startLive();
    await state.replica.sync();
  }

  /**
   * Opens the user's replica with the current session, replacing any open one. A stored replica
   * of the same user is reopened, with its device ID; one of another user is replaced, with the
   * values kept beside it.
   */
  private async open(me: Me): Promise<void> {
    const { replicaStore, keyValue } = await this.openStorage();
    const stored = await replicaStore.load();
    if (stored !== null && stored.userId !== me.userId) await keyValue.clear();
    const deviceId = stored?.userId === me.userId ? stored.deviceId : newId();
    const transport = this.platform.transport({
      baseUrl: this.baseUrl,
      ...(this.token === null ? {} : { token: this.token }),
      ...(this.fetch === undefined ? {} : { fetch: this.fetch }),
    });
    const replica = await Replica.open({ store: replicaStore, transport, userId: me.userId, deviceId });

    this.close();
    this.stopRelay = replica.onChange(() => {
      this.replicaChanged(replica);
    });
    this.setState({ kind: 'ready', me, replica, sessionEnded: false });
  }

  /** Follows the open replica's session status, then relays the change. */
  private replicaChanged(replica: Replica): void {
    const state = this.current;
    if (state.kind !== 'ready' || state.replica !== replica) return;
    const status = replica.status();
    if (status === 'revoked') {
      // The replica has wiped its store; drop it, so nothing edits a wiped store.
      this.close();
      void this.wipe().then(() => {
        if (this.current === state) this.setState({ kind: 'logged-out' });
      });
      return;
    }
    if (status === 'logged-out' && !state.sessionEnded) {
      this.setState({ ...state, sessionEnded: true });
      return;
    }
    this.notify();
  }

  /** Checks the session of the replica opened offline: an expired one ends it, a revoked one wipes. */
  private async checkSession(): Promise<void> {
    const state = this.current;
    if (state.kind !== 'ready') return;
    try {
      const me = await this.api().me();
      if (this.current !== state) return;
      if (me.userId !== state.me.userId) {
        // The session is another user's (e.g. they logged in elsewhere in this browser).
        this.setState({ ...state, sessionEnded: true });
        return;
      }
      const { keyValue } = await this.openStorage();
      await keyValue.set(ME_KEY, { ...me });
      this.setState({ ...state, me });
    } catch (error) {
      if (this.current !== state) return;
      if (error instanceof ApiError && error.code === 'session-revoked') {
        await this.wipe();
        this.setState({ kind: 'logged-out' });
      } else if (error instanceof ApiError && error.status === 401) {
        this.setState({ ...state, sessionEnded: true });
      }
      // Offline, or the server failing: keep working on the device.
    }
  }

  /** Closes the replica and deletes the device's data and session token. */
  private async wipe(): Promise<void> {
    this.close();
    const { replicaStore, keyValue } = await this.openStorage();
    await replicaStore.wipe();
    await keyValue.clear();
    await this.useToken(null);
  }

  private async useToken(token: string | null): Promise<void> {
    if (this.platform.auth !== 'token') return;
    this.token = token;
    await this.platform.saveToken(token);
  }

  /** The server API with the current session, or with `token` (null for none). */
  private api(token: string | null = this.token): ServerApi {
    return new ServerApi({
      baseUrl: this.baseUrl,
      ...(this.platform.auth === 'token' && token !== null ? { token } : {}),
      ...(this.fetch === undefined ? {} : { fetch: this.fetch }),
    });
  }

  private async openStorage(): Promise<{ replicaStore: ReplicaStore; keyValue: KeyValue }> {
    this.storage ??= await this.platform.openStore();
    return this.storage;
  }

  private setState(state: AppState): void {
    this.current = state;
    this.notify();
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}
