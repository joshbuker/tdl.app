// Random edits, shares and syncs by several users' devices, through faulty transports.
import type { Id, Role } from '@tdl/domain';
import { seededRandom, type Replica, type Transport } from '@tdl/sync';
import { Network, settle, type TestServer, type User } from '../acceptance/harness.ts';
import { faulty, NO_FAULTS, type Faults } from './faulty-transport.ts';

export interface ScriptOptions {
  users: number;
  devicesPerUser: number;
  steps: number;
}

/** A user and their devices, all settled once the script has run. */
export interface Party {
  user: User;
  devices: Replica[];
}

interface Device {
  party: Party;
  replica: Replica;
  network: Network;
}

const NAMES = ['alice', 'bob', 'carol', 'dave'];
const FAULTS: Faults = { drop: 0.1, dropReply: 0.1, duplicate: 0.1, delayMs: [0, 4] };
/** The script's clock starts here, so device HLCs depend only on the seed. */
const EPOCH = Date.UTC(2026, 10, 1);
const SHAREABLE_ROLES: Exclude<Role, 'owner'>[] = ['editor', 'viewer'];

/** The seeded choices a script makes. */
class Chooser {
  readonly next: () => number;

  constructor(seed: number) {
    this.next = seededRandom(seed);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T | undefined {
    return items[Math.floor(this.next() * items.length)];
  }
}

/** The devices' shared clock: fixed values, advanced by the script. */
class ScriptClock {
  private time: number;

  constructor(seed: number) {
    this.time = EPOCH + seed * 86_400_000;
  }

  readonly now = (): number => this.time;

  advance(ms: number): void {
    this.time += ms;
  }

  iso(): string {
    return new Date(this.time).toISOString();
  }
}

/** Runs `steps` random steps on random devices, then turns the faults off and settles every device. */
export async function runScript(server: TestServer, seed: number, options: ScriptOptions): Promise<Party[]> {
  const script = await Script.start(server, seed, options);
  for (let step = 0; step < options.steps; step++) await script.step(step);
  return script.finish();
}

class Script {
  private readonly inFlight: Promise<void>[] = [];
  private readonly server: TestServer;
  private readonly choose: Chooser;
  private readonly clock: ScriptClock;
  private readonly faults: Faults;
  private readonly devices: Device[];

  private constructor(parts: { server: TestServer; choose: Chooser; clock: ScriptClock; faults: Faults; devices: Device[] }) {
    this.server = parts.server;
    this.choose = parts.choose;
    this.clock = parts.clock;
    this.faults = parts.faults;
    this.devices = parts.devices;
  }

  static async start(server: TestServer, seed: number, { users, devicesPerUser }: ScriptOptions): Promise<Script> {
    const clock = new ScriptClock(seed);
    const faults = { ...FAULTS };
    const devices: Device[] = [];
    for (const name of NAMES.slice(0, users)) {
      const party: Party = { user: await server.signUp(name), devices: [] };
      for (let i = 0; i < devicesPerUser; i++) {
        const network = new Network();
        const rand = seededRandom(seed * 1000 + devices.length);
        const wrap = (transport: Transport) => faulty(transport, rand, faults);
        const replica = await server.device(party.user, { network, now: clock.now, wrap });
        party.devices.push(replica);
        devices.push({ party, replica, network });
      }
      await party.devices[0]?.createList(`${name}'s house`);
    }
    return new Script({ server, choose: new Chooser(seed), clock, faults, devices });
  }

  async step(step: number): Promise<void> {
    this.clock.advance(1 + Math.floor(this.choose.next() * 1000));
    const device = this.choose.pick(this.devices);
    const action = this.choose.pick(ACTIONS);
    if (device !== undefined && action !== undefined) await action(this, device, String(step));
  }

  async finish(): Promise<Party[]> {
    Object.assign(this.faults, NO_FAULTS);
    for (const device of this.devices) device.network.online = true;
    await Promise.all(this.inFlight);
    await settle(...this.devices.map((d) => d.replica));
    return [...new Set(this.devices.map((d) => d.party))];
  }

  // Actions

  async create({ replica }: Device, label: string): Promise<void> {
    const list = this.choose.pick([...replica.state().lists.keys()]);
    if (list !== undefined) await replica.createTask(list, `task ${label}`);
  }

  async setField({ replica }: Device, field: 'title' | 'notes', label: string): Promise<void> {
    const task = this.randomTask(replica);
    if (task !== undefined) await replica.setTaskField(task, field, `${field} ${label}`);
  }

  async complete({ replica }: Device): Promise<void> {
    const task = this.randomTask(replica);
    if (task !== undefined) await replica.setTaskField(task, 'completedAt', this.choose.chance(0.5) ? this.clock.iso() : null);
  }

  async link({ replica }: Device): Promise<void> {
    const [from, to] = [this.randomTask(replica), this.randomTask(replica)];
    if (from !== undefined && to !== undefined) await replica.addLink(from, to, this.choose.chance(0.5) ? 'hard' : 'soft');
  }

  async unlink({ replica }: Device): Promise<void> {
    const link = this.choose.pick([...replica.state().links.keys()]);
    if (link !== undefined) await replica.removeLink(link);
  }

  /** The device's user invites another user to one of their lists or tasks; the invitee accepts. Refusals are ignored. */
  async share({ party, replica }: Device): Promise<void> {
    const { lists, tasks } = replica.state();
    const owned = [...lists.values()].filter((l) => l.ownerId === party.user.userId).map((l) => ({ kind: 'list' as const, id: l.id }));
    const ownedTasks = [...tasks.values()].filter((t) => lists.get(t.listId)?.ownerId === party.user.userId);
    const target = this.choose.pick([...owned, ...ownedTasks.map((t) => ({ kind: 'task' as const, id: t.id }))]);
    const invitee = this.choose.pick(this.devices.map((d) => d.party.user).filter((u) => u.userId !== party.user.userId));
    if (target === undefined || invitee === undefined) return;
    const body = { target, username: invitee.username, role: this.choose.pick(SHAREABLE_ROLES) };
    const invitation = await this.server.request('POST', '/api/invitations', { token: party.user.token, body });
    if (invitation.status !== 201) return;
    await this.server.request('POST', `/api/invitations/${(invitation.body as { id: Id }).id}/accept`, { token: invitee.token });
  }

  /** The device's user removes a grant they own or leaves one they hold. Refusals (e.g. a stale grant) are ignored. */
  async unshare({ party, replica }: Device): Promise<void> {
    const grant = this.choose.pick([...replica.state().grants.keys()]);
    if (grant !== undefined) await this.server.request('DELETE', `/api/grants/${grant}`, { token: party.user.token });
  }

  toggleNetwork(device: Device): Promise<void> {
    device.network.online = !device.network.online;
    return Promise.resolve();
  }

  /** Starts a sync without waiting for it, so devices sync concurrently with each other and with edits. */
  sync({ replica }: Device): Promise<void> {
    this.inFlight.push(replica.sync());
    return Promise.resolve();
  }

  private randomTask(replica: Replica): Id | undefined {
    return this.choose.pick([...replica.state().tasks.keys()]);
  }
}

type Action = (script: Script, device: Device, label: string) => Promise<void>;

const weighted = (weight: number, action: Action): Action[] => Array.from({ length: weight }, () => action);

const ACTIONS: Action[] = [
  ...weighted(4, (s, d, label) => s.create(d, label)),
  ...weighted(3, (s, d, label) => s.setField(d, 'title', label)),
  ...weighted(2, (s, d, label) => s.setField(d, 'notes', label)),
  ...weighted(2, (s, d) => s.complete(d)),
  ...weighted(2, (s, d) => s.link(d)),
  ...weighted(1, (s, d) => s.unlink(d)),
  ...weighted(1, (s, d) => s.share(d)),
  ...weighted(1, (s, d) => s.unshare(d)),
  ...weighted(1, (s, d) => s.toggleNetwork(d)),
  ...weighted(4, (s, d) => s.sync(d)),
];
