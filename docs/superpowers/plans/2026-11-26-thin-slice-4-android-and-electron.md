# Thin slice, plan 4: Android and Electron — Implementation Plan

**Status:** Not started.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the web app's code as an Android app (Quasar's Capacitor mode) and a desktop app (Quasar's Electron mode), each with its own SQLite driver and OS-protected session token, against the same server, and walk the phone and desktop parts of the demo checklist on an Android emulator and the Electron app.

**Architecture:**
- **Nothing above the platform changes.** `@tdl/app-core`'s `AppController` already supports token platforms, and `@tdl/device-store` already runs on any `SqlDriver`. Each new app supplies a `Platform` (from `@tdl/app-core`) and a `SqlDriver` (from `@tdl/device-store`), chosen at build time by Quasar's mode flags.
- **Android:** `@capacitor-community/sqlite` behind a `SqlDriver`, and the session token in `@aparajita/capacitor-secure-storage` (Android Keystore). The app runs at `https://localhost`.
- **Desktop:** the window loads the app from a private `tdl://app` scheme, so it has a real origin. SQLite (`node:sqlite`) and the token (`safeStorage`) live in Electron's main process, reached through a typed IPC layer that only answers the app's own frame. One instance at a time.
- **The server** trusts the apps' origins for sign-in and sign-up (Better Auth's first-login CSRF check refuses them today), and adds `tdl://app` to `APP_ORIGINS`.
- **Where the apps find the server:** a build-time `TDL_SERVER_URL`. "Choose a server" stays a later feature. While the homelab is down, the emulator reaches the laptop's server through `adb reverse tcp:3000 tcp:3000` at `http://localhost:3000`, which browsers treat as secure. A real phone over HTTPS joins the deferred homelab check.

**Tech Stack:** Capacitor 8 (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli` ^8.6), `@capacitor-community/sqlite` ^8.1.1 (MIT), `@aparajita/capacitor-secure-storage` ^8.0.1 (MIT), Android SDK through nixpkgs' `androidenv` (compile and target API 36, minimum 24, JDK 21), the Android emulator (x86_64 `google_apis` image, KVM). Electron **45.3.4** (nixpkgs' version; Node 24.22, SQLite 3.54.1 through `node:sqlite`, checked 2026-11-26), Quasar's Electron mode with `@electron/packager`, Playwright's Electron support (`_electron` from `@playwright/test` 1.64.1).

**Spec:** `docs/superpowers/specs/2026-11-10-thin-slice-design.md` (goals: the shared packages run unchanged on Android and in Electron; demo checklist items 1 to 5, 7 and 8 on the phone and desktop. Item 6 needs bob's device offline while alice's stays online: locally only the emulator can go offline on its own, and it's alice's device here. Item 6 passed in the browser in plan 3, and runs on the real phone in the homelab check). Behavior also comes from:
- `features/app/platforms.md`, `features/account/login.md`;
- `design-decisions/electron-desktop.md`, `live-update-authentication.md`, `server-side-sessions.md`, `nix-dev-shell.md`, `licence-and-pricing.md`, `version-pins.md`;
- `docs/open-items.md`, "Next steps" item 4 and "Decided for plan 4".

## Global Constraints

- **Plans 1 to 3's constraints still hold:** Node 26 inside `nix-shell`; AGPL-3.0-only, ESM, private packages; `.ts` relative imports; the licence check and `PINS.md`; acceptance files named `*.acceptance.test.ts` with `describe('<spec H1>')` and `test('<scenario H3>')` exactly; no logic in components; every user-facing string through vue-i18n; `@tdl/app-core` uses no Vue, Quasar, DOM or Node APIs; `@tdl/device-store` depends only on `@tdl/sync` and `drizzle-orm`.
- **Generated, not hand-written:** `quasar mode add capacitor`, `quasar mode add electron`, and `cap add android` (run by Quasar's first Android build). Each generator's output is committed untouched, in its own commit, before any edit.
- **Use the Quasar MCP server** for Quasar's Capacitor and Electron docs (`search_docs`, `get_page`) before configuring either mode.
- **Platform code stays at the edges:** `apps/client/src/platform/<web|capacitor|electron>/` in the window, `apps/client/src-electron/` in Electron's main process. Each platform's logic (row mapping, transactions, path checks, sender checks, token rules) sits in a module with no Electron or Capacitor import, so Vitest tests it with fakes; the files that import `electron` or a Capacitor plugin only wire those modules up.
- **Native code is reached only through dynamic imports guarded by Quasar's flags** (`import.meta.env.QUASAR_CAPACITOR_MODE`, `QUASAR_ELECTRON_MODE`), so the web build contains none of it.
- **IDs and names:** Android `appId` `app.tdl`, app name `TDL App`. Desktop scheme `tdl`, host `app`: the window's origin is `tdl://app`. The Capacitor database is named `tdl-app`; the desktop one is `tdl-app.sqlite3` in `app.getPath('userData')`.
- **Server address:** `import.meta.env.TDL_SERVER_URL` in native builds (from `TDL_SERVER_URL` at build time, default `https://tdl.app`); the web build keeps `location.origin`.
- **`APP_ORIGINS` default:** `https://localhost,capacitor://localhost,tdl://app`. Origins are compared as exact strings after trimming and removing a trailing `/`: `new URL(x).origin` is `"null"` for `capacitor:` and `tdl:` URLs, so it must not be used to normalise them.
- **New dependencies** follow `docs/design-decisions/dependency-safety.md`: pnpm installs only versions at least 7 days old, so ranges resolve to the newest such version (e.g. Capacitor 8.6.2 until 8.6.3 is a week old), and anything added beyond what this plan names is compared with `pnpm stats:packages` first.
- **Pins:** npm `electron` at exactly nixpkgs' version (`45.3.4`, released 2026-11-17, so old enough to install), because `shell.nix` runs nixpkgs' Electron in its place (Electron's own download doesn't run on NixOS). Record it in `PINS.md`.
- **Android build files:** release builds allow HTTPS only. Cleartext is allowed for `localhost` only, in the debug build's network security config. `android:allowBackup="false"`.

## Review Focus

1. **Two columns with the same name, or rows read as arrays.** Android's plugin returns each row as an object keyed by column name, so a query returning two columns named `id` would silently lose one, and `values` rows depend on key order. The store contract fails any query whose result has duplicate column names, and the Capacitor driver's tests pin the column order it produces (Tasks 2 and 5).
2. **A batch that fails halfway on Android.** The second of three statements throws: the driver rolls back, rethrows, and the first statement's row isn't there; a later batch still works (Task 5).
3. **Paths outside the app folder through `tdl://app`.** `tdl://app/../../etc/passwd`, `%2e%2e/` and `%2F` forms, and a different host (`tdl://other/index.html`) answer 404 and never read outside the built app (Task 7).
4. **IPC from anything but the app's own frame.** A message from a frame whose URL isn't under `tdl://app/` (an iframe, or a page the window was steered to) is refused; the window can't navigate away from `tdl://app` or open new windows, and links to other sites open in the system browser (Task 7).
5. **A token that can't be read back.** Android's secure storage throwing on `get` (e.g. its Keystore key is gone) and desktop's `safeStorage` refusing to decrypt are both treated as "no token": the app shows the stored tasks and asks to log in again, as after an expired session, and never crashes at start (Tasks 5 and 7).

---

### Task 1: The server trusts the apps' origins

Better Auth checks `Origin` on sign-in and sign-up even without cookies (its first-login CSRF check, `formCsrfMiddleware` in 1.7), so a sign-in from `https://localhost` or `tdl://app` is refused with 403 `INVALID_ORIGIN`. Bearer sign-out has no cookie and isn't checked.

**Files:**
- Modify: `apps/server/src/config.ts`, `apps/server/src/auth.ts` (`trustedOrigins`), `apps/server/test/auth.test.ts`, `apps/server/test/app.test.ts`, `apps/server/test/ws.test.ts`, `apps/server/test/config.test.ts` (create if absent)
- Modify: `docs/self-hosting.md` (`APP_ORIGINS` default), `docs/design-decisions/live-update-authentication.md` (Electron's origin is `tdl://app`), `docs/open-items.md` (remove "CORS origins aren't normalised" and the sign-out item)

**Interfaces:**
- Produces: `normaliseOrigin(value: string): string` in `config.ts` (trim, drop one trailing `/`, lower-case the scheme and host; never `URL.origin`). `config.origin` and every `config.appOrigins` entry pass through it. `APP_ORIGINS` defaults to `https://localhost,capacitor://localhost,tdl://app`. Better Auth's `trustedOrigins` is `[config.origin, ...config.appOrigins]`.

- [ ] **Step 1: Write failing tests.**
  - `config.test.ts`: `normaliseOrigin('https://tdl.app/')` is `'https://tdl.app'`; `normaliseOrigin(' TDL://app ')` is `'tdl://app'`; `capacitor://localhost` is unchanged; `loadConfig` without `APP_ORIGINS` gives the three defaults.
  - `auth.test.ts`: for each of `https://localhost`, `capacitor://localhost` and `tdl://app`, a sign-up and a username sign-in sent with headers `origin: <app origin>`, `sec-fetch-site: cross-site`, `sec-fetch-mode: cors` succeed and return `set-auth-token`; the same from `https://evil.example` gets 403 `INVALID_ORIGIN`; a bearer `POST /api/auth/sign-out` with `origin: tdl://app` succeeds and the token then gets 401 on `/api/me`.
  - `app.test.ts`: a CORS preflight for `POST /api/sync/push` from `tdl://app`, asking for `authorization, content-type, tdl-protocol`, answers with `access-control-allow-origin: tdl://app`; from `https://evil.example` it doesn't.
  - `ws.test.ts`: a token socket with `Origin: tdl://app` authenticates by message and gets a feed message.
  - `auth.test.ts`: the session cookie set by a browser-style sign-up carries `SameSite=Lax`. Trusting the app origins is safe only because of this: browsers don't send the cookie on cross-site requests, so a page at `https://localhost` or `tdl://app` can't use someone's web session.
- [ ] **Step 2: Run** `pnpm vitest run apps/server/test/config.test.ts apps/server/test/auth.test.ts apps/server/test/app.test.ts apps/server/test/ws.test.ts`. Expected: the sign-in, sign-up, `tdl://app` and normalising cases fail.
- [ ] **Step 3: Implement** `normaliseOrigin`, the new default and `trustedOrigins`. If Better Auth's `matchesOriginPattern` doesn't match `tdl://app` or `capacitor://localhost` as plain strings, pass `trustedOrigins` as a function returning the request's `Origin` when it is exactly one of `config.appOrigins`, and say why in a comment.
- [ ] **Step 4: Run** `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `Trust the apps' origins for sign-in`, with the doc changes listed above.

### Task 2: A Node driver for every Node process, and unique column names

The Electron main process needs the `node:sqlite` driver that today lives in `packages/device-store/test/`. Android's plugin can't return two columns with the same name, so the store must never ask for one.

**Files:**
- Create: `packages/device-store/src/node-driver.ts`
- Modify: `packages/device-store/package.json` (`exports["./node"]`, both conditions as for `"."`), `packages/device-store/test/node-driver.ts` (re-export, or delete and update imports), `packages/device-store/test/store-contract.ts`, `packages/device-store/test/sqlite-store.test.ts`

**Interfaces:**
- Produces: `nodeSqliteDriver(path?: string): SqlDriver` exported from `@tdl/device-store/node` (default `':memory:'`), never from `@tdl/device-store`'s main entry, so the web build doesn't see `node:sqlite`. `batch` runs in `BEGIN`/`COMMIT` and rolls back on error, as today.
- Produces, test only: `checkedDriver(driver: SqlDriver, database: DatabaseSync): SqlDriver`, which prepares each statement on `database`, and throws `duplicate-column-names: <sql>` when `statement.columns()` has a repeated `name`.

- [ ] **Step 1: Write the failing test:** `checkedDriver` throws for `select 1 as id, 2 as id` and passes `select 1 as a, 2 as b`. Run the store contract for SQLite through `checkedDriver`.
- [ ] **Step 2: Run** `pnpm vitest run packages/device-store`. Expected: the `checkedDriver` test fails (not defined).
- [ ] **Step 3: Implement** the move, the export and `checkedDriver`. If a store query trips the check, give its columns distinct aliases.
- [ ] **Step 4: Run** `pnpm test && pnpm typecheck`. Expected: PASS, and `grep -r "node:sqlite" apps/client/dist/spa` after `pnpm --filter @tdl/client build` finds nothing.
- [ ] **Step 5: Commit** `Export the Node SQLite driver and check column names`.

### Task 3: Choose the platform and server at build time

**Files:**
- Create: `apps/client/src/platform/select.ts`, `apps/client/src/platform/select.test.ts`, `apps/client/src/platform/no-lock.ts`
- Modify: `apps/client/src/boot/app.ts`, `apps/client/quasar.config.ts` (`build.defineEnv.TDL_SERVER_URL: process.env.TDL_SERVER_URL ?? 'https://tdl.app'`), `apps/client/env.d.ts` (type `import.meta.env.TDL_SERVER_URL`), `docs/self-hosting.md` or a new `docs/building-the-apps.md` (the variable)

**Interfaces:**
- Produces:
  - `type AppMode = 'web' | 'capacitor' | 'electron'` and `appMode(env: { QUASAR_CAPACITOR_MODE?: boolean; QUASAR_ELECTRON_MODE?: boolean }): AppMode`.
  - `serverUrl(mode: AppMode, env: { TDL_SERVER_URL?: string }, origin: string): string`: `origin` on the web; otherwise `TDL_SERVER_URL` without a trailing `/`, throwing `server-url-missing` if it's empty.
  - `loadPlatform(mode: AppMode): Promise<{ platform: Platform; acquireLock: (onWaiting: () => void) => Promise<void> }>`: the web platform with the tab lock; the Capacitor or Electron platform (Tasks 5 and 8) with `noLock` (resolves at once), each through a dynamic `import()` inside an `if (import.meta.env.QUASAR_…_MODE)` branch.
  - The boot file awaits `loadPlatform(appMode(import.meta.env))` inside `startApp`'s start-up, so a failure shows the existing "couldn't start" page.

- [ ] **Step 1: Write failing tests** in `select.test.ts`: `appMode({})` is `'web'`; `appMode({ QUASAR_ELECTRON_MODE: true })` is `'electron'`; `serverUrl('web', { TDL_SERVER_URL: 'https://x' }, 'https://tdl.app')` is `'https://tdl.app'`; `serverUrl('capacitor', { TDL_SERVER_URL: 'http://localhost:3000/' }, 'https://localhost')` is `'http://localhost:3000'`; `serverUrl('electron', {}, 'tdl://app')` throws `server-url-missing`.
- [ ] **Step 2: Run** `pnpm vitest run apps/client/src/platform/select.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** them, with the Capacitor and Electron branches throwing `platform-not-built` until Tasks 5 and 8 fill them in. Keep `startApp`'s signature, passing the lock through.
- [ ] **Step 4: Run** `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`. Expected: PASS (the web app is unchanged).
- [ ] **Step 5: Commit** `Choose the platform and server address at build time`.

### Task 4: Android toolchain and Capacitor mode

**Files:**
- Modify: `shell.nix` (an `android ? false` argument), `.gitignore` (`.android/`), `docs/design-decisions/nix-dev-shell.md`, `docs/building-the-apps.md`
- Create (generated): `apps/client/src-capacitor/**`, then `apps/client/src-capacitor/android/**`
- Modify: `pnpm-workspace.yaml` (add `apps/client/src-capacitor`; merge any generated `allowBuilds`), `licence-policy.json` only if a new licence appears

**Interfaces:**
- Produces:
  - `nix-shell --arg android true`: everything in the default shell, plus `jdk21` and an `androidenv.composeAndroidPackages` SDK with platform `36`, build tools `36.0.0`, platform tools, the emulator and the `android-36` `google_apis` `x86_64` system image (nixpkgs config `android_sdk.accept_license = true`, `allowUnfree = true`). It exports `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `JAVA_HOME`, `ANDROID_AVD_HOME=$PWD/.android/avd`, and `GRADLE_OPTS=-Dorg.gradle.project.android.aapt2FromMavenOverride=$ANDROID_HOME/build-tools/36.0.0/aapt2` (the Maven aapt2 doesn't run on NixOS). The default shell is unchanged, so it stays small.
  - `docs/building-the-apps.md`: creating the emulator (`avdmanager create avd -n tdl -k "system-images;android-36;google_apis;x86_64"`), starting it (`emulator -avd tdl`), `adb reverse tcp:3000 tcp:3000`, building with `TDL_SERVER_URL=http://localhost:3000`, installing, and simulating offline with `adb reverse --remove tcp:3000`.

- [ ] **Step 1: Add the Android shell** and check it: `nix-shell --arg android true --run 'sdkmanager --list_installed && adb version && emulator -version && java -version'`. Expected: platform 36, build tools 36.0.0, the system image, Java 21.
- [ ] **Step 2: Create and boot the emulator** as the guide says. Expected: `adb devices` lists `emulator-5554 device`. Commit the shell and guide: `Add an Android shell and emulator`.
- [ ] **Step 3: Generate Capacitor mode** in `apps/client`: `pnpm exec quasar mode add capacitor`, answering app ID `app.tdl` and name `TDL App`. Commit untouched: `Add Quasar's Capacitor mode`.
- [ ] **Step 4: Join the workspace:** add `apps/client/src-capacitor` to `pnpm-workspace.yaml`, delete any lockfile or workspace file generated inside it, and run `pnpm install` from the root. Expected: one root lockfile; `pnpm check:licences` passes.
- [ ] **Step 5: Generate the Android project:** `TDL_SERVER_URL=http://localhost:3000 pnpm exec quasar build -m capacitor -T android --debug`. Commit `src-capacitor/android` untouched: `Generate the Android project`. Expected: a debug APK under `src-capacitor/android/app/build/outputs/apk/debug/`.
- [ ] **Step 6: Commit** `Fit Capacitor mode into the workspace`.

### Task 5: The Android platform

**Files:**
- Create: `apps/client/src/platform/capacitor/capacitor-driver.ts`, `capacitor-driver.test.ts`, `capacitor-token.ts`, `capacitor-token.test.ts`, `capacitor-platform.ts`
- Modify: `apps/client/src-capacitor/package.json` (the two plugins), `apps/client/src-capacitor/capacitor.config.ts`, `apps/client/src-capacitor/android/app/src/main/AndroidManifest.xml` (`allowBackup="false"`), create `apps/client/src-capacitor/android/app/src/debug/res/xml/network_security_config.xml` and `apps/client/src-capacitor/android/app/src/debug/AndroidManifest.xml` (cleartext for `localhost` only), `apps/client/src/platform/select.ts`, `.github/workflows/ci.yml`, `docs/building-the-apps.md`

**Interfaces:**
- Consumes: `SqlDriver`, `SqlMethod`, `openDeviceStore` (`@tdl/device-store`); `Platform` (`@tdl/app-core`); `loadPlatform` (Task 3).
- Produces:
  - `interface SqliteConnectionLike { query(statement: string, values?: unknown[]): Promise<{ values?: Record<string, unknown>[] }>; run(statement: string, values?: unknown[], transaction?: boolean): Promise<unknown>; beginTransaction(): Promise<unknown>; commitTransaction(): Promise<unknown>; rollbackTransaction(): Promise<unknown>; isTransactionActive(): Promise<{ result?: boolean }> }`, the subset of the plugin's `SQLiteDBConnection` used.
  - `capacitorDriver(connection: SqliteConnectionLike): SqlDriver`: `run` calls `connection.run(sql, params, false)` and returns no rows. It never passes `transaction: true`: on Android, a `run` that opens its own transaction while ours is open fails and rolls back ours, silently losing its earlier writes (plugin issue #700, open). `all` returns the row objects; `values` returns `Object.values(row)` per row; `get` returns only the first row as an array. `batch` calls `beginTransaction`, runs each query the same way, then `commitTransaction`. On any error it calls `rollbackTransaction` only if `isTransactionActive()` says one is open (the plugin may already have rolled back), then rethrows the original error. Calls are serialised (one at a time, in order), since the plugin's transaction is per connection.
  - `interface SecureStoreLike { get(key: string): Promise<unknown>; set(key: string, value: string): Promise<void>; remove(key: string): Promise<boolean> }` and `secureTokenStore(store: SecureStoreLike): { load(): Promise<string | null>; save(token: string | null): Promise<void> }` under the key `session-token`: `load` returns null for a missing or non-string value, and for a throwing `get` (logging it); `save(null)` removes.
  - `capacitorPlatform(serverUrl: string): Promise<Platform>`: `auth: 'token'`; `openStore` creates (or retrieves) the `tdl-app` connection with `new SQLiteConnection(CapacitorSQLite)`, no encryption, version 1, then `openDeviceStore(capacitorDriver(db))`; tokens through `secureTokenStore(SecureStorage)`; `transport` through `createHttpTransport({ ...options, baseUrl: serverUrl })`.

- [ ] **Step 1: Write failing tests** with fakes:
  - `capacitor-driver.test.ts`: a fake connection answering `[{ b: 2, a: 1 }]` gives `values` `[[2, 1]]` and `get` `[2, 1]`; an empty answer gives `get` `[]` rows; `run` passes `transaction: false`; a batch of three where the second throws calls `beginTransaction`, `rollbackTransaction`, never `commitTransaction`, and rejects with that error; when the fake reports no active transaction after the failure, `rollbackTransaction` isn't called and the original error still comes back; a following batch commits; two concurrent `exec` calls reach the fake one after the other.
  - `capacitor-token.test.ts`: `save('t')` then `load()` is `'t'`; `save(null)` then `load()` is null; a `get` that throws gives null; a non-string stored value gives null.
- [ ] **Step 2: Run** `pnpm vitest run apps/client/src/platform/capacitor`. Expected: FAIL.
- [ ] **Step 3: Implement** the driver, token store and platform; install `@capacitor-community/sqlite` and `@aparajita/capacitor-secure-storage` in `src-capacitor` and run `pnpm exec cap sync android` there; wire `loadPlatform`'s Capacitor branch. Set the manifest and the debug network security config. Run `pnpm check:licences`.
- [ ] **Step 4: Run** `pnpm lint && pnpm typecheck && pnpm test`. Expected: PASS.
- [ ] **Step 5: Check on the emulator,** with the server running locally (`docker compose up` with `ORIGIN=http://localhost:3000`, or the dev server) and `adb reverse tcp:3000 tcp:3000`: build with `TDL_SERVER_URL=http://localhost:3000`, install with `adb install -r`, and check: sign up as "carol"; create "Buy paint"; force-stop and reopen the app: still logged in and the task is there; `adb reverse --remove tcp:3000`, rename the task, see one pending change; restore the reverse: the change syncs and a browser logged in as carol shows it; log out: the login page shows, and reopening the app still shows it. Use `chrome://inspect` for the webview's console. Record any failure as a fix in this task before moving on.
- [ ] **Step 6: CI:** add an `android` job (ubuntu-latest's Android SDK, `actions/setup-java` with Java 21) running `pnpm install --frozen-lockfile` and `pnpm --filter @tdl/client exec quasar build -m capacitor -T android --debug` with `TDL_SERVER_URL=https://tdl.app`. Push and confirm it's green.
- [ ] **Step 7: Commit** `Add the Android platform: SQLite and the token in the Keystore`.

### Task 6: Electron toolchain and Electron mode

**Files:**
- Modify: `shell.nix` (`pkgs.electron`; export `ELECTRON_SKIP_BINARY_DOWNLOAD=1` and `ELECTRON_OVERRIDE_DIST_PATH=${pkgs.electron}/libexec/electron`, adjusted to wherever nixpkgs' unwrapped `electron` binary is), `docs/design-decisions/nix-dev-shell.md`, `PINS.md`, `docs/building-the-apps.md`
- Create (generated): `apps/client/src-electron/**`
- Modify: `apps/client/package.json` (`electron` at exactly `45.3.4`, `@electron/packager`, script `desktop`)

**Interfaces:**
- Produces:
  - `pnpm --filter @tdl/client exec quasar dev -m electron` opens the app in nixpkgs' Electron.
  - `pnpm --filter @tdl/client desktop`: `quasar build -m electron --skip-pkg` with `TDL_SERVER_URL` passed through, then `electron dist/electron/UnPackaged`. This is the slice's "local build" on NixOS. Packaging for other systems (`quasar build -m electron` without `--skip-pkg`) works on CI or other machines and is out of scope.

- [ ] **Step 1: Generate Electron mode** in `apps/client`: `pnpm exec quasar mode add electron`. Commit untouched: `Add Quasar's Electron mode`.
- [ ] **Step 2: Wire the toolchain:** the `shell.nix` additions, the exact `electron` pin and `PINS.md` row (lift when nixpkgs updates Electron), the `desktop` script. Run `pnpm install` and `pnpm check:licences`.
- [ ] **Step 3: Check:** inside `nix-shell`, `pnpm --filter @tdl/client exec quasar dev -m electron` opens a window showing the login page; `node -e "console.log(require('electron'))"` from `apps/client` prints a path inside the Nix store.
- [ ] **Step 4: Commit** `Run Electron from nixpkgs`.

### Task 7: Electron's main process

**Spec changes first** (each a rule and a scenario; add both scenarios to `scenario-scope.json`; their tests are in Task 8):
- `features/app/platforms.md`, rule: "On desktop, the app runs once. Opening it again brings the open window forward." Scenario `### Open the desktop app twice`: Given "alice" has the desktop app open, When she opens it again, Then no second window opens, And the open window comes to the front.
- `features/account/login.md`, rule: "The apps keep the session token in the operating system's protected storage. Where there is none (e.g. a Linux desktop without a keyring), the desktop app doesn't save it, so after a restart it shows the stored tasks and asks to log in again." Scenario `### Desktop without protected storage`: Given the desktop app runs where the operating system has no protected storage, And "alice" is logged in with a task "Paint fence", When she closes the app and opens it again, Then she sees "Paint fence", And she is asked to log in again.

**Files:**
- Create: `apps/client/src-electron/app-protocol.ts`, `app-protocol.test.ts`, `ipc.ts`, `ipc.test.ts`, `token-store.ts`, `token-store.test.ts`
- Modify: `apps/client/src-electron/electron-main.ts`, `apps/client/src-electron/electron-preload.ts`, `apps/client/vitest.config.ts` (include `src-electron/**/*.test.ts`), `docs/features/app/platforms.md`, `docs/features/account/login.md`, `scenario-scope.json`

**Interfaces:**
- Produces:
  - `APP_SCHEME = 'tdl'`, `APP_HOST = 'app'`, `APP_ORIGIN = 'tdl://app'`.
  - `resolveAppPath(root: string, url: string): string | null`: for `tdl://app/<path>`, the decoded path inside `root` (`/` and unknown paths give `index.html`, since the router uses hash mode); null for another host, or any path that resolves outside `root` after decoding.
  - `isAppFrame(url: string | undefined): boolean`: true only for URLs starting with `tdl://app/`.
  - `IPC = { dbExec: 'tdl:db:exec', dbBatch: 'tdl:db:batch', tokenLoad: 'tdl:token:load', tokenSave: 'tdl:token:save' } as const`, and `registerIpc(ipcMain: IpcMainLike, handlers: { driver: SqlDriver; token: TokenStore })`, where each handler first checks `isAppFrame(event.senderFrame?.url)` and throws `untrusted-sender` otherwise, and validates its arguments' shapes (strings, arrays, the four methods) with Zod.
  - `interface SafeStorageLike { isEncryptionAvailable(): boolean; getSelectedStorageBackend?(): string; encryptString(text: string): Buffer; decryptString(data: Buffer): string }`, `interface TokenStore { load(): Promise<string | null>; save(token: string | null): Promise<void> }`, and `fileTokenStore(options: { file: string; safeStorage: SafeStorageLike; platform: NodeJS.Platform }): TokenStore`. It writes the encrypted token to `file` when encryption is available and, on Linux, the backend isn't `basic_text` or `unknown`; otherwise it keeps the token in memory only and deletes `file`. `load` returns null for a missing file or one that won't decrypt. `save(null)` deletes the file.
  - The preload exposes `window.tdl = { db: { exec, batch }, token: { load, save } }` through `contextBridge`, typed by `TdlBridge` in `src/platform/electron/bridge.ts` (Task 8).
  - `electron-main.ts`: `protocol.registerSchemesAsPrivileged([{ scheme: 'tdl', privileges: { standard: true, secure: true, supportFetchAPI: true } }])` before `ready`; `protocol.handle('tdl', …)` serving through `resolveAppPath` (404 for null); in production the window loads `tdl://app/index.html` (dev keeps `QUASAR_APP_URL`); `webPreferences` `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`; `will-navigate` prevented unless the target is an app URL (or the dev server in dev); `setWindowOpenHandler` denies and opens `http(s)` URLs with `shell.openExternal`; `app.requestSingleInstanceLock()`, quitting if not held, and on `second-instance` restoring and focusing the window; the database opened with `nodeSqliteDriver(join(app.getPath('userData'), 'tdl-app.sqlite3'))` from `@tdl/device-store/node`; the token in `join(app.getPath('userData'), 'session-token')`.

- [ ] **Step 1: Update the two specs** as above and commit `Specify the desktop app's single window and token storage`.
- [ ] **Step 2: Write failing tests:**
  - `app-protocol.test.ts`: `tdl://app/` and `tdl://app/lists` resolve to `<root>/index.html`; `tdl://app/assets/app.js` to `<root>/assets/app.js`; `tdl://app/../../etc/passwd`, `tdl://app/%2e%2e/%2e%2e/etc/passwd`, `tdl://app/assets%2F..%2F..%2Fx` and `tdl://other/index.html` give null.
  - `ipc.test.ts`, with a fake `ipcMain` recording handlers: a call from `tdl://app/index.html` reaches the driver; from `https://evil.example/` or with no frame it rejects `untrusted-sender` and the driver isn't called; `tdl:db:exec` with method `'drop'` rejects.
  - `token-store.test.ts`, with a fake `safeStorage` and a temp directory: on Linux with `gnome_libsecret` it saves, and a new store on the same file loads the token; with `basic_text` the file never exists and `load()` returns the token only from the same store object; `save(null)` deletes the file; a file that fails to decrypt loads as null.
- [ ] **Step 3: Run** `pnpm vitest run apps/client/src-electron`. Expected: FAIL.
- [ ] **Step 4: Implement** the three modules, then wire them in `electron-main.ts` and the preload (check Quasar's Electron docs with the MCP server first, for the preload's build and `registerQuasarRuntime`).
- [ ] **Step 5: Run** `pnpm lint && pnpm typecheck && pnpm test`. Expected: PASS.
- [ ] **Step 6: Commit** `Add Electron's main process: app scheme, IPC, database and token`.

### Task 8: The desktop platform, and Electron's tests

**Files:**
- Create: `apps/client/src/platform/electron/bridge.ts`, `electron-platform.ts`, `electron-platform.test.ts`
- Create: `apps/client/e2e-electron/playwright.config.ts`, `apps/client/e2e-electron/fixtures.ts`, `apps/client/e2e-electron/desktop.acceptance.test.ts`, `apps/client/e2e-electron/desktop.test.ts`
- Modify: `apps/client/src/platform/select.ts`, root `package.json` (`test:electron`), `.github/workflows/ci.yml`, `tools/scenario-check/src/cli.ts` (also read `reports/playwright-electron.json` if present), `docs/building-the-apps.md`

**Interfaces:**
- Consumes: `IPC` names and the preload's `window.tdl` (Task 7); `startE2eServer` from `@tdl/server/testing` (plan 3).
- Produces:
  - `interface TdlBridge { db: { exec(sql: string, params: unknown[], method: SqlMethod): Promise<{ rows: unknown[] }>; batch(queries: { sql: string; params: unknown[]; method: SqlMethod }[]): Promise<{ rows: unknown[] }[]> }; token: { load(): Promise<string | null>; save(token: string | null): Promise<void> } }`.
  - `electronPlatform(bridge: TdlBridge, serverUrl: string): Platform`: `auth: 'token'`; `openStore` is `openDeviceStore(bridge.db)`; tokens through `bridge.token`; `transport` through `createHttpTransport({ ...options, baseUrl: serverUrl })`.
  - `startE2eServer` (plan 3) gains `port?: number`, used instead of a free port when given.
  - `ELECTRON_E2E_PORT = 3917`, in `e2e-electron/fixtures.ts`. `test:electron` runs `TDL_SERVER_URL=http://127.0.0.1:3917 quasar build -m electron --skip-pkg`, then `playwright test -c e2e-electron`, whose global setup runs `startE2eServer({ webRoot: 'apps/client/dist/spa', port: ELECTRON_E2E_PORT })` (the web root is unused here, but required). Each test launches `_electron.launch({ args: ['dist/electron/UnPackaged'], executablePath, env: { …process.env, TDL_USER_DATA: <fresh temp dir> } })`, where `executablePath` is `join(process.env.ELECTRON_OVERRIDE_DIST_PATH, 'electron')` when that variable is set (nixpkgs' Electron) and otherwise left out (npm's). `electron-main.ts` calls `app.setPath('userData', process.env.TDL_USER_DATA)` when it's set, so tests don't share data. The JSON reporter writes `reports/playwright-electron.json`.

- [ ] **Step 1: Write the failing unit test** `electron-platform.test.ts`: with a fake bridge over `nodeSqliteDriver()`, `openStore()` gives a store whose `load()` is null; `saveToken('t')` reaches the bridge; `auth` is `'token'`.
- [ ] **Step 2: Write the failing Electron tests:**
  - `desktop.acceptance.test.ts`, `describe('Platforms')`, `test('Open the desktop app twice')`: launch the app; launch it again with the same `TDL_USER_DATA`: the second process exits within 5 s and the first app still has one window.
  - `desktop.acceptance.test.ts`, `describe('Login')`, `test('Desktop without protected storage')`: launch with `--password-store=basic` (which makes Chromium's backend `basic_text` on Linux), sign up "alice", create "Paint fence", close, launch again with the same data and flag: "Paint fence" is listed and the session-ended dialog is shown.
  - `desktop.test.ts`: the window's URL starts with `tdl://app/`; `window.require` and `window.process` are undefined in the page; a `fetch` from the page to the e2e server's `/api/me` with a bearer token answers 200 (so CORS allows `tdl://app`); after the page sets `location.href = 'https://example.com/'`, the URL still starts with `tdl://app/`, and `window.open('https://example.com/')` returns null and opens no second window (`electronApp.windows()` has length 1).
- [ ] **Step 3: Run** `pnpm test:electron`. Expected: FAIL.
- [ ] **Step 4: Implement** the bridge type, the platform, `loadPlatform`'s Electron branch, the test configuration and fixtures, and the scenario-check change.
- [ ] **Step 5: Run** `pnpm lint && pnpm typecheck && pnpm test && pnpm test:electron && pnpm check:scenarios`. Expected: PASS.
- [ ] **Step 6: CI:** in the `check` job, after `pnpm test:e2e`, run `xvfb-run -a pnpm test:electron` (npm's Electron download on Ubuntu; no `ELECTRON_OVERRIDE_DIST_PATH`), before `pnpm check:scenarios`. Push and confirm it's green.
- [ ] **Step 7: Check by hand** with a keyring available (`pnpm --filter @tdl/client desktop` against the local server): sign up, quit, reopen: still logged in without the dialog. If this machine has no keyring, say so in the commit message and leave it for the homelab check.
- [ ] **Step 8: Commit** `Add the desktop platform and Electron's tests`.

### Task 9: The phone and desktop demo, locally

**Files:**
- Modify: `docs/building-the-apps.md` (anything learned), `docs/design-decisions/electron-desktop.md` (the app scheme, `node:sqlite` in the main process, `safeStorage` with the in-memory fallback, one instance, running unpackaged from nixpkgs on NixOS), create `docs/design-decisions/native-session-tokens.md` (Keystore through `@aparajita/capacitor-secure-storage`, `safeStorage` on desktop. Alternatives: the device database; `capacitor-secure-storage-plugin`, as popular but encrypting with RSA and PKCS#1 v1.5 padding, still 0.x; Capawesome Secure Preferences, paid; `keytar`, archived; `@napi-rs/keyring`, a native module where Electron's built-in `safeStorage` does the job. Consequences: a lost key means logging in again; one person maintains the Android plugin, so `capacitor-secure-storage-plugin` is the fallback if it stalls), the comparison facts for the SQLite plugin in `electron-desktop.md`'s and a new `android-sqlite.md`'s alternatives (`@capgo/capacitor-fast-sql`: a year old, one vendor, moves data through a local HTTP server on the device; Capawesome's plugin: paid; `better-sqlite3`: the desktop fallback if `node:sqlite` falls short), `docs/open-items.md` (plan 4 done; the real-phone checks join the deferred homelab check; next steps), this plan's status line

- [ ] **Step 1: Start the stack** locally (`docker compose up -d` with `ORIGIN=http://localhost:3000`), the emulator with `adb reverse tcp:3000 tcp:3000`, the Android debug build and the desktop build, both with `TDL_SERVER_URL=http://localhost:3000`.
- [ ] **Step 2: Walk the demo checklist's phone and desktop items:**
  1. Sign up "alice" in the browser and "bob" in the desktop app.
  2. On the emulator, logged in as alice, remove the reverse (offline), create tasks, edit notes and link a prerequisite; restore it, and the browser shows the changes.
  3. Alice shares a list with bob; edits to a task's notes in the browser and the desktop app reach each other within a second or two.
  4. Log out on the emulator and back in. From the browser's devices page, revoke the emulator's session: it stops syncing, and when it next reaches the server it shows the login page and its data is gone. Separately, expire the emulator's session (through the database, as the e2e fixture does): it keeps its unsynced change and asks to log in.
  5. With alice on the emulator and bob on the desktop sharing a list with tasks A and B, stop the server (`docker compose stop server`) so both are offline. The emulator links A before B, the desktop links B before A. Start the server: after syncing, both devices show both links, and the loop is flagged.
  6. Leave the emulator offline while the browser makes 200 changes; on reconnecting, the emulator catches up.

  Record any failure as a fix (with a test where one fits) before continuing.
- [ ] **Step 3: Run** `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm test:electron && pnpm check:scenarios`. Expected: PASS.
- [ ] **Step 4: Commit** `Walk the phone and desktop demo locally`, with the doc changes listed above. In `docs/open-items.md`, the deferred homelab check gains: the Android app on a real phone over HTTPS at `https://tdl.app` (a release build, so no cleartext), real airplane mode, and the desktop app against `https://tdl.app`.
