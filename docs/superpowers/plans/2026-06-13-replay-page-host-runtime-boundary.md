# Replay Page Host Runtime TS Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Move `CoreReplayPageHostRuntime` installation to a tested TypeScript bootstrap boundary and retire `js/core_replay_page_host_runtime.js` from active entry manifests without deleting the legacy file.

**Architecture:** `src/bootstrap/replay-page-host.ts` remains the TypeScript owner for replay modal/export page-host orchestration. The module will expose the legacy `window.CoreReplayPageHostRuntime` shape before home-family legacy scripts load. `entry-manifest-audit` blocks the legacy replay page host URL from active play/home manifests.

**Tech Stack:** TypeScript, Vite URL manifests, Vitest, Playwright smoke checks, Node audit scripts.

---

### Task 1: Guard Active Manifests Against Replay Page Host Runtime

**Files:**
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`
- Modify: `scripts/entry-manifest-audit.mjs`

- [x] **Step 1: Write the failing audit registry test**

Add a test expecting `{ scriptPath: "core_replay_page_host_runtime.js", symbolName: "coreReplayPageHostRuntimeUrl" }` in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL before the retired-runtime registry entry exists.

- [x] **Step 3: Add registry entry and run GREEN**

Add the entry to `scripts/entry-manifest-audit.mjs`, then rerun the same Vitest command. Expected: PASS.

### Task 2: Install CoreReplayPageHostRuntime From TypeScript

**Files:**
- Create: `tests/unit/bootstrap-replay-page-host-runtime.spec.ts`
- Modify: `src/bootstrap/replay-page-host.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write the failing bootstrap runtime test**

Create a Vitest file covering runtime shape, supplied window installation, no overwrite, and null target.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-page-host-runtime.spec.ts
```

Expected: FAIL before `createReplayPageHostRuntime()` / `installReplayPageHostRuntime()` exist.

- [x] **Step 3: Add TypeScript bootstrap installer and home-family install call**

Add installer exports to `src/bootstrap/replay-page-host.ts` and call `installReplayPageHostRuntime()` in `src/entries/home-family-bootstrap.ts` before legacy scripts load.

- [x] **Step 4: Run focused GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-page-host.spec.ts tests/unit/bootstrap-replay-page-host-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: PASS.

### Task 3: Remove Replay Page Host Runtime From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Run manifest audit RED**

Run:

```bash
npm run audit:entry-manifest
```

Expected: FAIL because active manifests still reference `core_replay_page_host_runtime.js` / `coreReplayPageHostRuntimeUrl`.

- [x] **Step 2: Remove active manifest imports and exports**

Remove the `coreReplayPageHostRuntimeUrl` import and array entries from active manifest modules. Do not delete `js/core_replay_page_host_runtime.js`.

- [x] **Step 3: Run manifest audit GREEN**

Run:

```bash
npm run audit:entry-manifest
```

Expected: PASS.

### Task 4: Document Evidence And Run Full Gates

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-13-replay-page-host-runtime-boundary.md`

- [x] **Step 1: Prepend guardrail and roadmap evidence**

Use normal patching for `docs/ARCHITECTURE_GUARDRAILS.md` and byte-safe `perl -0pi` for `docs/ROADMAP_MILESTONES.md`.

- [x] **Step 2: Run full verification**

Run:

```bash
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
npm run verify:prepush
```

Expected: all commands exit 0.

- [x] **Step 3: Commit**

Run:

```bash
git status --short --branch
git diff --check
git add docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-13-replay-page-host-runtime-boundary.md scripts/entry-manifest-audit.mjs src/bootstrap/replay-page-host.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts tests/unit/bootstrap-replay-page-host-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
git commit -m "refactor: install replay page host runtime from ts"
```

Expected: one focused Stage 1AF commit.

### Self-Review

- Spec coverage: registry guardrail, TS bootstrap, manifest retirement, docs, verification, and commit are covered.
- Placeholder scan: no TBD/TODO/fill-in placeholders are present.
- Type consistency: runtime names consistently use `ReplayPageHost` / `coreReplayPageHostRuntimeUrl` / `CoreReplayPageHostRuntime`.
