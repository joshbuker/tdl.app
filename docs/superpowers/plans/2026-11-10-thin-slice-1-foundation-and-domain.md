# Thin slice, plan 1: foundation and domain — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the TypeScript monorepo, CI, the scenario-coverage and licence checks, and the shared `@tdl/domain` package: models, validation, graph rules (links, cycles, redundancy, loops), next up, and the grant resolver. All of it is unit-tested, including on a 1,000-task chain.

**Architecture:** A pnpm workspace. `packages/domain` is plain, framework-independent TypeScript with no I/O: plans 2 (sync and server) and 3 (apps) import it on the server, in the browser, on Android and in Electron. Graph functions work on an in-memory `Graph` built from the tasks and links one user can see. That's how "per user" visibility works: callers filter first with the grant resolver, then build the graph. Every traversal is iterative, so depth is unbounded. `tools/` holds two CI checks: scenario coverage (scenario names in `docs/features` against acceptance test names) and licences.

This plan has only unit tests. Acceptance tests named after spec scenarios start in plan 2, which adds the first entries to `scenario-scope.json`.

**Tech Stack:** Node 26 LTS, pnpm workspaces, TypeScript (strict, ESM), Vitest, ESLint (flat config + typescript-eslint), `uuid` (UUIDv7), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-10-thin-slice-design.md`. Behavior comes from `docs/features/dependencies/link-tasks.md`, `next-up.md`, `soft-dependencies.md`, `docs/features/tasks/create-task.md`, `docs/features/app/sharing.md` and `docs/design-decisions/` (notably `visibility-scoped-graph.md`, `container-and-item-grants.md`, `strict-validation.md`, `links-are-records.md`).

## Global Constraints

- Node `26` (`.node-version`, and `"engines": { "node": ">=26" }`), provided by the repository's `shell.nix` (see `docs/design-decisions/nix-dev-shell.md`). Run every command inside `nix-shell`. Install nothing globally.
- Every package is `"license": "AGPL-3.0-only"`, `"type": "module"`, and `"private": true`.
- Dependencies must be AGPLv3-compatible and free with every feature used: no open-core, paid-tier or source-available (FSL, BSL, SSPL) packages. Task 3's check enforces this.
- Any dependency pinned below its latest version gets an entry in the root `PINS.md` saying why, and what would lift it (see `docs/design-decisions/version-pins.md`).
- Relative imports use `.ts` extensions (`allowImportingTsExtensions` and `rewriteRelativeImportExtensions` in `tsconfig.base.json`), so Node 26 can run tools directly with its built-in type stripping, and Vitest and later builds resolve the same paths.
- `@tdl/domain` has no runtime dependencies except `uuid`. It does no I/O and imports nothing from Node, Vue or the DOM.
- Domain logic never recurses over the graph: traversals use explicit stacks or queues.
- Domain functions return error **codes and IDs**, never English text. The apps translate them with vue-i18n (see `docs/design-decisions/translations-from-day-one.md`).
- Acceptance test files are named `*.acceptance.test.ts`, with `describe('<spec H1 title>')` and `test('<scenario H3 title>')` exactly.
- Commit messages are plain imperative sentences, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Links to tasks the user can't see:** `buildGraph` must drop them silently, so hidden tasks never block, never form loops, and never make links redundant (Task 5).
2. **The same pair linked twice** (two offline devices before the server folds them): a duplicate isn't a "path" for redundancy, and doesn't double-count in next up (Tasks 7 and 8).
3. **Titles that are only Unicode whitespace** (non-breaking spaces, tabs, newlines) are rejected as required. Inner whitespace is kept (Task 4).
4. **Stale access data:** a grant naming a missing list or task, or a task whose list is missing, gives "no access", not an exception (Task 9).
5. **Graphs a few thousand tasks wide and 1,000 deep** stay correct and fast (Task 8).

---

### Task 1: Workspace, tooling and CI

**Files:**
- Create: `shell.nix`, `.npmrc`, `package.json`, `pnpm-workspace.yaml`, `.node-version`, `.gitignore`, `tsconfig.base.json`, `eslint.config.js`, `vitest.config.ts`, `PINS.md`
- Create: `packages/domain/package.json`, `packages/domain/tsconfig.json`, `packages/domain/src/index.ts`, `packages/domain/test/smoke.test.ts`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: root scripts `pnpm lint`, `pnpm typecheck`, and `pnpm test`, which writes a Vitest JSON report to `reports/vitest.json`. Workspace globs are `packages/*`, `apps/*` and `tools/*`. Package name `@tdl/domain`, whose entry is `src/index.ts` (consumed as TypeScript source through workspace links; no build step yet).

- [ ] **Step 0: Create the development shell.**
  - `shell.nix` uses a pinned nixpkgs tarball with its sha256, and provides `nodejs_26` and pnpm. If nixpkgs has no `nodejs_26`, stop and report.
  - Its `shellHook` sets `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` and puts `./node_modules/.bin` on `PATH`.
  - `.npmrc` sets `store-dir=.pnpm-store`.
  - `.gitignore` adds `.pnpm-store`.
  - Verify: `nix-shell --run 'node --version && pnpm --version'` prints v26.x and a pnpm version.
- [ ] **Step 1: Write the smoke test** `packages/domain/test/smoke.test.ts`: `import * as domain from '../src/index.ts'` and `expect(domain).toBeTypeOf('object')`.
- [ ] **Step 2: Create the workspace.**
  - Root `package.json`: `"packageManager": "pnpm@<latest>"`, enabled with `corepack enable`.
  - Scripts:
    - `lint`: `eslint .`
    - `typecheck`: `tsc -b`, with project references to each package
    - `test`: `vitest run --reporter=default --reporter=json --outputFile.json=reports/vitest.json`
  - `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `module`/`moduleResolution` `NodeNext`, `target` `ES2023`.
  - `vitest.config.ts`: `test.projects: ['packages/*', 'tools/*']`.
  - `.gitignore`: `node_modules`, `reports`, `dist`, `coverage`, `.pnpm-store`.
- [ ] **Step 3: Run** `nix-shell --run 'pnpm install && pnpm lint && pnpm typecheck && pnpm test'`. Expected: all pass, and `reports/vitest.json` exists.
- [ ] **Step 4: Add CI** in `.github/workflows/ci.yml`.
  - Triggers: `push`, `pull_request`, and `schedule: - cron: '0 6 * * 1'` (weekly on main, per `releases-and-ci.md`).
  - One job on `ubuntu-latest`: checkout, `pnpm/action-setup`, `actions/setup-node` with `node-version-file: .node-version` and the pnpm cache, then `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
  - Tasks 2 and 3 append their checks to this job.
- [ ] **Step 5: Commit** with the message "Set up the Nix shell, pnpm workspace, TypeScript, Vitest, ESLint and CI".

### Task 2: Scenario coverage check

**Files:**
- Create: `tools/scenario-check/package.json` (`@tdl/scenario-check`), `tools/scenario-check/src/specs.ts`, `src/report.ts`, `src/check.ts`, `src/cli.ts`
- Create: `tools/scenario-check/test/specs.test.ts`, `test/report.test.ts`, `test/check.test.ts`
- Create: `scenario-scope.json` (initially `{}`)
- Modify: `package.json` (script `check:scenarios`: `node tools/scenario-check/src/cli.ts`, using Node 26's built-in type stripping), `.github/workflows/ci.yml` (run it after `pnpm test`)

**Interfaces:**
- Produces:
  - `parseSpec(markdown: string, path: string): Spec`, where `Spec = { path: string; title: string; status: 'Proposed' | 'Specified' | 'Implemented'; scenarios: string[] }`. `title` is the H1. `status` comes from the `Status:` line. `scenarios` are the H3 titles between `## Scenarios` and the next H2 or the end of the file.
  - `readVitestReport(json: unknown): AcceptanceResult[]`, where `AcceptanceResult = { file: string; feature: string; scenario: string; status: 'passed' | 'failed' | 'skipped' }`. It reads only files ending in `.acceptance.test.ts`. Vitest's JSON report statuses `pending` and `todo` map to `skipped`.
  - `checkScenarios(specs: Spec[], scope: Record<string, string[]>, results: AcceptanceResult[]): Problem[]`, where `Problem = { kind: 'missing' | 'orphan' | 'skipped' | 'malformed' | 'unknown-scope'; feature: string; scenario: string }`.
  - `scenario-scope.json` maps a spec path relative to `docs/features` (e.g. `"dependencies/link-tasks.md"`) to the scenario titles that must have tests.

- [ ] **Step 1: Write failing tests.**
  - `specs.test.ts`: parsing a fixture spec with H1 `# Link tasks`, `Status: Specified`, a `## Rules` section containing an `###` heading, and `## Scenarios` with `### Add a prerequisite` and `### Reject a cycle` gives `title: 'Link tasks'`, `status: 'Specified'` and `scenarios: ['Add a prerequisite', 'Reject a cycle']`. The H3 under Rules is excluded.
  - `report.test.ts`: from a fixture Vitest JSON report:
    - an assertion in `a.acceptance.test.ts` with `ancestorTitles: ['Link tasks']`, `title: 'Reject a cycle'` and `status: 'passed'` comes back as an `AcceptanceResult`;
    - one in `a.test.ts` is ignored;
    - `status: 'todo'` becomes `'skipped'`.
  - `check.test.ts`:
    - (a) a scenario in scope with no result gives `missing`;
    - (b) a result whose feature isn't any spec's title, or whose scenario isn't in that spec, gives `orphan`;
    - (c) with `status: 'Implemented'`, every scenario is required even without a scope entry, and a skipped result gives `skipped`;
    - (d) a scope entry naming an unknown spec path or scenario gives `unknown-scope`;
    - (e) a result with zero or more than one `ancestorTitles` gives `malformed`;
    - (f) everything matching gives `[]`.
- [ ] **Step 2: Run** `pnpm vitest run tools/scenario-check`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** `specs.ts`, `report.ts` and `check.ts` to the signatures above. Then write `cli.ts`, which:
  - loads every `docs/features/**/*.md` except `README.md`;
  - reads `scenario-scope.json` and `reports/vitest.json` (if the report is missing, it exits 1 with "run pnpm test first");
  - prints each problem as `<kind>: <feature> › <scenario>`;
  - exits 1 if there are any problems.

  Playwright reports are added in plan 3.
- [ ] **Step 4: Run** `pnpm vitest run tools/scenario-check`, then `pnpm test && pnpm check:scenarios`. Expected: tests PASS, and the check prints nothing and exits 0.
- [ ] **Step 5: Commit** with the message "Add the scenario coverage check".

### Task 3: Licence check

**Files:**
- Create: `tools/licence-check/package.json` (`@tdl/licence-check`), `src/policy.ts`, `src/cli.ts`, `test/policy.test.ts`
- Create: `licence-policy.json`
- Modify: `package.json` (script `check:licences`), `.github/workflows/ci.yml` (run it after install)

**Interfaces:**
- Produces: `isAllowed(spdx: string, allowed: readonly string[]): boolean`. It handles `OR` (any branch allowed), `AND` (all branches allowed), parentheses, and case-insensitive IDs. It also produces `findViolations(byLicence: Record<string, { name: string; versions: string[] }[]>, policy: Policy): Violation[]`, where `Policy = { allowed: string[]; exceptions: Record<string, string> }` (package name → reason) and `Violation = { name: string; versions: string[]; licence: string }`.
- `licence-policy.json` `allowed`: `MIT`, `ISC`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `0BSD`, `MPL-2.0`, `AGPL-3.0-only`, `AGPL-3.0-or-later`, `GPL-3.0-only`, `GPL-3.0-or-later`, `LGPL-2.1-or-later`, `LGPL-3.0-only`, `LGPL-3.0-or-later`, `CC0-1.0`, `Unlicense`, `BlueOak-1.0.0`, `Python-2.0`, `CC-BY-4.0`.

- [ ] **Step 1: Write failing tests** in `policy.test.ts`:
  - `isAllowed('MIT', allowed)` is true.
  - `isAllowed('(MIT OR FSL-1.1-MIT)', allowed)` is true.
  - `isAllowed('MIT AND BUSL-1.1', allowed)` is false.
  - `isAllowed('SSPL-1.0', allowed)` is false.
  - `isAllowed('UNKNOWN', allowed)` is false.
  - `findViolations` reports a `BUSL-1.1` package, and skips a violating package listed in `exceptions`.
- [ ] **Step 2: Run** `pnpm vitest run tools/licence-check`. Expected: FAIL.
- [ ] **Step 3: Implement** `policy.ts`. Then write `cli.ts`, which runs `pnpm licenses list --json`, applies `licence-policy.json`, prints each violation, and exits 1 if there are any.
- [ ] **Step 4: Run** `pnpm vitest run tools/licence-check && pnpm check:licences`. Expected: PASS, with no violations. If a current dependency violates, replace it, or add it to `exceptions` only if its licence is in fact compatible, and say why.
- [ ] **Step 5: Commit** with the message "Add the licence check".

### Task 4: Domain model, IDs and validation

**Files:**
- Create: `packages/domain/src/model.ts`, `src/ids.ts`, `src/validation.ts`
- Create: `packages/domain/test/validation.test.ts`, `test/ids.test.ts`, `test/fixtures.ts`
- Modify: `packages/domain/src/index.ts` (re-export), `packages/domain/package.json` (dependency `uuid`)

**Interfaces:**
- Produces, in `model.ts`:
  - `type Id = string`
  - `interface Task { id: Id; listId: Id; title: string; notes: string; completedAt: string | null }`. `completedAt` is an ISO instant.
  - `interface List { id: Id; ownerId: Id; title: string; editorsCanShare: boolean }`
  - `type LinkKind = 'hard' | 'soft'`
  - `interface Link { id: Id; prerequisiteId: Id; postrequisiteId: Id; kind: LinkKind; reason: string }`
  - `type Role = 'owner' | 'editor' | 'commenter' | 'viewer'`
  - `interface Grant { userId: Id; target: { kind: 'list' | 'task'; id: Id }; role: Exclude<Role, 'owner'> }`
- Produces, in `ids.ts`: `newId(): Id`, which returns a UUIDv7 string from `uuid`'s `v7`.
- Produces, in `validation.ts`:
  - `type FieldError = { field: string; code: 'required' }`
  - `type Validated<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] }`
  - `normalizeTitle(raw: string): string`, which trims leading and trailing whitespace (`String.prototype.trim`, which covers Unicode spaces) and nothing else.
  - `validateTaskInput(input: { title: string; notes?: string }): Validated<{ title: string; notes: string }>`
  - `validateListInput(input: { title: string }): Validated<{ title: string }>`
- Produces, in `test/fixtures.ts` (shared by Tasks 5 to 10):
  - `task(id: Id, opts?: Partial<Task>): Task`, defaulting to `listId 'L'`, `title id`, `notes ''`, `completedAt null`;
  - `done(id, opts?)`, the same with `completedAt` set;
  - `link(pre: Id, post: Id, opts?: Partial<Link>): Link`, whose id defaults to `` `${pre}->${post}` `` and kind to `'hard'`.

- [ ] **Step 1: Write failing tests.**
  - `ids.test.ts`: `newId()` matches `/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`, and two IDs made one after another sort in creation order.
  - `validation.test.ts`:
    - `validateTaskInput({ title: '  Buy milk  ' })` gives `{ ok: true, value: { title: 'Buy milk', notes: '' } }`.
    - `validateTaskInput({ title: '  \t\n ' })` gives `errors: [{ field: 'title', code: 'required' }]`.
    - `'Buy  oat\tmilk'` keeps its inner whitespace.
    - Notes are kept verbatim, including leading spaces.
    - `validateListInput({ title: '' })` gives `required`.
- [ ] **Step 2: Run** `pnpm vitest run packages/domain`. Expected: FAIL.
- [ ] **Step 3: Implement** `model.ts`, `ids.ts` and `validation.ts`, and re-export them from `index.ts`.
- [ ] **Step 4: Run** `pnpm vitest run packages/domain && pnpm typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Add domain models, UUIDv7 IDs and title validation".

### Task 5: Graph and path search

**Files:**
- Create: `packages/domain/src/graph/graph.ts`, `src/graph/paths.ts`
- Create: `packages/domain/test/graph/graph.test.ts`, `test/graph/paths.test.ts`

**Interfaces:**
- Consumes: `Task`, `Link` and `Id` from Task 4.
- Produces:
  - `interface Graph { tasks: ReadonlyMap<Id, Task>; links: ReadonlyMap<Id, Link>; outgoing: ReadonlyMap<Id, readonly Link[]>; incoming: ReadonlyMap<Id, readonly Link[]> }`
  - `buildGraph(tasks: Iterable<Task>, links: Iterable<Link>): Graph`, which drops links where either end isn't in `tasks`.
  - `prerequisitesOf(g: Graph, taskId: Id): Link[]` and `postrequisitesOf(g: Graph, taskId: Id): Link[]`
  - `hasPath(g: Graph, from: Id, to: Id, opts: { intermediates: 'any' | 'incomplete'; minLinks: 1 | 2; excludeLinkId?: Id }): boolean`. It follows links from prerequisite to postrequisite. `intermediates: 'incomplete'` only passes through tasks with `completedAt === null`; the endpoints `from` and `to` are never filtered. `minLinks: 2` ignores the direct single-link path. It uses an iterative BFS with a visited set.

- [ ] **Step 1: Write failing tests.**
  - `graph.test.ts`:
    - With tasks A and B and links `A->B` and `A->X` (X missing), `links.size` is 1, and `prerequisitesOf(g, 'B')` gives `[A->B]`.
    - `postrequisitesOf(g, 'A')` gives `[A->B]`.
  - `paths.test.ts`, on the chain A→B→C:
    - `hasPath(A, C, any, 1)` is true;
    - `hasPath(C, A, any, 1)` is false;
    - with B completed, `hasPath(A, C, incomplete, 1)` is false and `hasPath(A, C, any, 1)` is true;
    - with the direct link `A->C` added, `hasPath(A, C, any, minLinks 2, excludeLinkId 'A->C')` is true through B;
    - with only `A->C`, `hasPath(A, C, any, 2)` is false;
    - **unbounded depth:** a 1,000-task chain `t0→…→t999` gives `hasPath(t0, t999, any, 1)` true, and `hasPath(t999, t0, any, 1)` false.
- [ ] **Step 2: Run** `pnpm vitest run packages/domain/test/graph`. Expected: FAIL.
- [ ] **Step 3: Implement** `graph.ts` and `paths.ts`. For `minLinks: 2`, start the BFS from `from`'s postrequisites (skipping `excludeLinkId`), and don't accept `to` on the first link.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Add the task graph and iterative path search".

### Task 6: Link rules

**Files:**
- Create: `packages/domain/src/graph/link-rules.ts`, `test/graph/link-rules.test.ts`

**Interfaces:**
- Consumes: `Graph` and `hasPath` from Task 5.
- Produces:
  - `type LinkRejection = { code: 'self' } | { code: 'not-editable'; taskId: Id } | { code: 'exists' } | { code: 'cycle'; prerequisiteId: Id; postrequisiteId: Id } | { code: 'redundant'; prerequisiteId: Id; postrequisiteId: Id }`
  - `checkNewLink(g: Graph, prerequisiteId: Id, postrequisiteId: Id, canEdit: (taskId: Id) => boolean): { ok: true } | { ok: false; rejection: LinkRejection }`

  Checks run in this order, and the first failure wins:
  1. **self:** the two IDs are the same.
  2. **not-editable:** the first of the prerequisite and postrequisite (in that order) that `canEdit` refuses.
  3. **exists:** a link already joins the pair, in either direction.
  4. **cycle:** `hasPath(post, pre, intermediates 'any', minLinks 1)`. Completed tasks count.
  5. **redundant:** `hasPath(pre, post, intermediates 'incomplete', minLinks 1)`.

  Recurring tasks aren't modelled in the slice, so that rule waits for the recurring-tasks spec. Hard and soft links count the same throughout (`soft-dependencies.md`).

- [ ] **Step 1: Write failing tests**, one per link-tasks scenario. All use `canEdit = () => true` unless stated.
  - **Add a prerequisite:** checking `Buy paint` → `Paint fence` with no links is ok.
  - **Reject a cycle:** with A→B→C, `C→A` gives `{ code: 'cycle', prerequisiteId: 'C', postrequisiteId: 'A' }`.
  - **Reject a redundant link:** with A→B→C all incomplete, `A→C` gives `redundant`.
  - **Cycles through completed tasks are still rejected:** with B done, `C→A` gives `cycle`.
  - **Completed tasks don't make links redundant:** with B done, `A→C` is ok.
  - **Can't link a task to itself:** `A→A` gives `self`.
  - **Link already exists:** with `A->B`, both `A→B` and `B→A` give `exists`.
  - **Both tasks must be editable:** with `canEdit = id => id !== 'Paint fence'`, both directions give `{ code: 'not-editable', taskId: 'Paint fence' }`.
  - **Soft links count:** with A→B soft, `B→A` gives `cycle`.
  - **Unbounded depth:** on a 1,000-task chain, `t999→t0` gives `cycle`, and `t0→t999` gives `redundant`.
- [ ] **Step 2: Run** `pnpm vitest run packages/domain/test/graph/link-rules.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `checkNewLink`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Add the rules for new links".

### Task 7: Redundant links and loops

**Files:**
- Create: `packages/domain/src/graph/analysis.ts`, `test/graph/analysis.test.ts`

**Interfaces:**
- Consumes: `Graph` and `hasPath` from Task 5.
- Produces:
  - `redundantLinkIds(g: Graph): Set<Id>`. A link P→Q is redundant when `hasPath(P, Q, intermediates 'incomplete', minLinks 2, excludeLinkId: link.id)`.
  - `interface Loop { taskIds: Id[]; linkIds: Id[] }`
  - `findLoops(g: Graph): Loop[]`. Each loop is a strongly connected component with more than one task, and `linkIds` are the links with both ends in it. `taskIds` and `linkIds` are sorted, and loops are sorted by their first task ID, so results are deterministic. It uses Tarjan's algorithm, written iteratively.

- [ ] **Step 1: Write failing tests.**
  - **Existing link that becomes redundant is kept:** with links `A->C`, `A->B` and `B->C`, the result is `{'A->C'}`.
  - With B completed, the result is empty.
  - **Duplicate pair:** with two links `A->C` (IDs `x` and `y`) and nothing else, the result is empty (Review Focus 2).
  - **Links that together form a cycle:** with `A->B` and `B->A`, `findLoops` gives `[{ taskIds: ['A','B'], linkIds: ['A->B','B->A'] }]`.
  - A three-task loop plus a separate chain gives exactly one loop.
  - An acyclic graph gives `[]`.
  - A 1,000-task chain closed back to `t0` gives one loop of 1,000 tasks, with no stack overflow.
- [ ] **Step 2: Run** `pnpm vitest run packages/domain/test/graph/analysis.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both functions.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Flag redundant links and loops".

### Task 8: Next up and scale

**Files:**
- Create: `packages/domain/src/next-up.ts`, `test/next-up.test.ts`, `test/graph/scale.test.ts`

**Interfaces:**
- Consumes: `Graph`, `prerequisitesOf` and `findLoops` (Tasks 5 and 7).
- Produces: `nextUpTaskIds(g: Graph): Set<Id>`. A task is next up when all of these hold:
  - it is incomplete;
  - it isn't in any loop from `findLoops`, since loop tasks stay blocked (`sharing.md`);
  - every **hard** prerequisite in `g` is completed.

  Soft prerequisites never block. Prerequisites outside `g`, meaning hidden from this user, don't exist for this purpose. Trash isn't modelled in the slice.

- [ ] **Step 1: Write failing tests** in `next-up.test.ts`:
  - **Unblocked task is next up:** a lone incomplete A is next up.
  - **Blocked task is not next up:** with A→B, the result is `{A}`.
  - **Completing a prerequisite unblocks:** with A done, the result is `{B}`.
  - **Marking a prerequisite incomplete blocks again:** returning A to incomplete gives `{A}`.
  - A soft A→B gives `{A, B}`.
  - Duplicate hard links A→B (two IDs) still give `{A}`.
  - With A↔B looped and C standalone, the result is `{C}`.
  - Completed tasks are never next up.
- [ ] **Step 2: Write failing scale tests** in `scale.test.ts` (Review Focus 5):
  - On a 1,000-task chain, next up is `{t0}`. With `t0` to `t998` completed, it's `{t999}`.
  - On a generated layered DAG of 3,000 tasks and about 6,000 links (fixed seed, built so it's acyclic), each of these runs in under 50 ms, measured with `performance.now()` after one warm-up run: `checkNewLink` from the last layer to the first, `findLoops`, `nextUpTaskIds`.
  - `redundantLinkIds` on the same graph runs in under 500 ms.
- [ ] **Step 3: Run** `pnpm vitest run packages/domain/test/next-up.test.ts packages/domain/test/graph/scale.test.ts`. Expected: FAIL.
- [ ] **Step 4: Implement** `nextUpTaskIds`. If a timing budget fails, profile and fix the algorithm. Don't loosen the budget without asking.
- [ ] **Step 5: Run** the same command. Expected: PASS.
- [ ] **Step 6: Commit** with the message "Work out next up, and test the graph at scale".

### Task 9: Roles and grant resolver

**Files:**
- Create: `packages/domain/src/access/roles.ts`, `src/access/resolver.ts`
- Create: `packages/domain/test/access/roles.test.ts`, `test/access/resolver.test.ts`

**Interfaces:**
- Consumes: `Role`, `Grant`, `List` and `Task` from Task 4.
- Produces, in `roles.ts`:
  - `type Action = 'view' | 'comment' | 'edit' | 'addTask' | 'deleteTask' | 'shareTask' | 'manageAccess'`
  - `roleAllows(role: Role, action: Action, via: 'list' | 'task', list: Pick<List, 'editorsCanShare'>): boolean`, following the table in `sharing.md` "What each role can do":
    - **view:** all roles.
    - **comment:** commenter and above.
    - **edit** (edit, complete, link): editor and above.
    - **addTask** and **deleteTask:** owner, or editor through a **list** grant only.
    - **shareTask:** owner, or editor when `list.editorsCanShare` is true, and only through a list grant.
    - **manageAccess:** owner only.
- Produces, in `resolver.ts`:
  - `interface AccessData { lists: ReadonlyMap<Id, List>; tasks: ReadonlyMap<Id, Pick<Task, 'id' | 'listId'>>; grants: readonly Grant[] }`
  - `listRole(data: AccessData, userId: Id, listId: Id): Role | null`, which is `'owner'` if `list.ownerId === userId`, otherwise the highest list grant, otherwise `null`.
  - `taskAccess(data: AccessData, userId: Id, taskId: Id): { role: Role; via: 'list' | 'task' } | null`, the higher of `listRole` for the task's list and the user's highest task grant. On a tie, `via: 'list'`.
  - `can(data: AccessData, userId: Id, action: Action, taskId: Id): boolean`
  - `visibleTaskIds(data: AccessData, userId: Id): Set<Id>`
  - `canMoveTask(data: AccessData, userId: Id, taskId: Id, toListId: Id): boolean`. The user needs `editor` or above through **list** roles on both the current and destination lists, and if the two lists' owners differ, the user must own the task's current list. This is #3's bug: permission was checked only against the old record.

- [ ] **Step 1: Write failing tests.**
  - `roles.test.ts`: one assertion per cell of the sharing table, including:
    - an editor via `task` can't `deleteTask` or `addTask`;
    - an editor via `list` can `shareTask` only when `editorsCanShare`;
    - a viewer can't `edit`;
    - a commenter can `comment` but can't `edit`.
  - `resolver.test.ts`:
    - **Owner:** alice owns list House, so her `listRole` is `owner`.
    - **Share a list:** bob is an editor of House, so `can(bob, 'edit', 'Paint fence')` is true.
    - **Viewer can't edit:** as a viewer, `can(bob, 'edit', …)` is false.
    - **Share a single task:** bob has a task grant `editor` on Paint fence only, so `visibleTaskIds(bob)` gives `{'Paint fence'}` (not Fix roof), and `can(bob, 'edit', 'Paint fence')` is true.
    - **Grants only add access:** bob is an editor of House and a viewer of Paint fence, so `taskAccess` gives `editor` via `list`.
    - **Remove a collaborator / Leave a shared list:** after deleting bob's grant from `grants`, `visibleTaskIds(bob)` is empty.
    - **Moving:** bob, an editor on House, can't move Paint fence to his own list Bob's (different owner, and he doesn't own the task). Alice can move it to her other list Garden. Bob, an editor on House with only a viewer grant on Garden, can't move into Garden.
    - **Stale data (Review Focus 4):** a grant on a missing list, a task whose `listId` is missing, and an unknown task ID all give `null` or `false` without throwing.
- [ ] **Step 2: Run** `pnpm vitest run packages/domain/test/access`. Expected: FAIL.
- [ ] **Step 3: Implement** `roles.ts` and `resolver.ts`, with role rank `owner > editor > commenter > viewer`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Add roles and the shared grant resolver".

### Task 10: The graph each user sees

**Files:**
- Create: `packages/domain/src/view.ts`, `test/view.test.ts`
- Modify: `packages/domain/src/index.ts` (export everything from Tasks 4 to 10)

**Interfaces:**
- Consumes: `buildGraph` (Task 5), `visibleTaskIds` and `can` (Task 9), `checkNewLink` (Task 6), `findLoops` (Task 7), `nextUpTaskIds` (Task 8).
- Produces:
  - `userGraph(data: AccessData, tasks: Iterable<Task>, links: Iterable<Link>, userId: Id): Graph`, built from only the tasks visible to `userId`, so hidden tasks and their links vanish (`visibility-scoped-graph.md`).
  - `checkNewLinkFor(data: AccessData, tasks: Iterable<Task>, links: Iterable<Link>, userId: Id, prerequisiteId: Id, postrequisiteId: Id)`, which is `checkNewLink` on `userGraph` with `canEdit = id => can(data, userId, 'edit', id)`. A task the user can't see gives `{ code: 'not-editable', taskId }`, the same as one they can only view. That's deliberate: the error contract treats hidden as not found, and the rejection names only the ID the caller supplied.

- [ ] **Step 1: Write failing tests** in `view.test.ts`, mirroring the sharing scenarios at domain level:
  - **Hidden blocker:** Paint fence is in shared list House (bob is an editor), and alice's private Get paid → Paint fence. Then `nextUpTaskIds(userGraph(…, bob))` contains Paint fence and doesn't contain Get paid. For alice, Paint fence isn't next up.
  - **Loop only another user can see:** in Kitchen remodel (shared), Finalize budget → Scope the job (bob's private task) → Send estimate. Alice checks Send estimate → Finalize budget with `checkNewLinkFor`, and it's ok. After the link is added, `findLoops(userGraph(bob))` gives one loop with three links, and `findLoops(userGraph(alice))` gives `[]`.
  - **Private prerequisite on a shared task:** bob, an editor of House, adds his own Buy paint → Paint fence, and `checkNewLinkFor` is ok. Paint fence isn't next up for bob, but is next up for alice.
  - **Both tasks must be editable:** bob, a viewer of House, gets `{ code: 'not-editable', taskId: 'Paint fence' }` in both directions.
  - **Links to hidden tasks are dropped (Review Focus 1):** `userGraph(bob).links` has no link touching Get paid.
- [ ] **Step 2: Run** `pnpm vitest run packages/domain/test/view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `userGraph` and `checkNewLinkFor`, and export the public API from `index.ts`.
- [ ] **Step 4: Run the full suite**: `pnpm lint && pnpm typecheck && pnpm test && pnpm check:scenarios && pnpm check:licences`. Expected: all pass.
- [ ] **Step 5: Commit** with the message "Scope the graph to what each user can see". Then push, and confirm CI is green on GitHub.
