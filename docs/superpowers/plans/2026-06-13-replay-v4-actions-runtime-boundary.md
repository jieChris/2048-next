# Replay V4 Actions Runtime TS Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Move `CoreReplayV4ActionsRuntime` installation to a tested TypeScript bootstrap boundary and retire `js/core_replay_v4_actions_runtime.js` from active entry manifests without deleting the legacy file.

**Architecture:** `src/core/replay-v4-actions.ts` remains the pure TypeScript owner for v4C action decoding. A new `src/bootstrap/replay-v4-actions-runtime.ts` exposes the legacy `window.CoreReplayV4ActionsRuntime.decodeReplayV4Actions` shape before home-family legacy scripts load. `entry-manifest-audit` blocks the legacy v4 actions URL from active play/replay/home/capped manifests.

**Tech Stack:** TypeScript, Vite URL manifests, Vitest, Playwright smoke checks, Node audit scripts.

---

### Task 1: Guard Active Manifests Against Replay V4 Actions Runtime

**Files:**
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`
- Modify: `scripts/entry-manifest-audit.mjs`

- [x] **Step 1: Write the failing audit registry test**

Add a test expecting `{ scriptPath: "core_replay_v4_actions_runtime.js", symbolName: "coreReplayV4ActionsRuntimeUrl" }` in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL before the retired-runtime registry entry exists.

- [x] **Step 3: Add registry entry and run GREEN**

Add the entry to `scripts/entry-manifest-audit.mjs`, then rerun the same Vitest command. Expected: PASS.

### Task 2: Install CoreReplayV4ActionsRuntime From TypeScript

**Files:**
- Create: `tests/unit/bootstrap-replay-v4-actions-runtime.spec.ts`
- Create: `src/bootstrap/replay-v4-actions-runtime.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write the failing bootstrap test**

Create a Vitest file covering core parity, malformed escape behavior, supplied window installation, no overwrite, and null target.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-v4-actions-runtime.spec.ts
```

Expected: FAIL because `src/bootstrap/replay-v4-actions-runtime.ts` does not exist.

- [x] **Step 3: Add TypeScript bootstrap installer and home-family install call**

Create `src/bootstrap/replay-v4-actions-runtime.ts` and call `installReplayV4ActionsRuntime()` in `src/entries/home-family-bootstrap.ts` after `installReplayCodecRuntime()`.

- [x] **Step 4: Run focused GREEN**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-v4-actions.spec.ts tests/unit/bootstrap-replay-v4-actions-runtime.spec.ts
```

Expected: PASS.

### Task 3: Remove Replay V4 Actions Runtime From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Run manifest audit RED**

Run:

```bash
npm run audit:entry-manifest
```

Expected: FAIL because active manifests still reference `core_replay_v4_actions_runtime.js` / `coreReplayV4ActionsRuntimeUrl`.

- [x] **Step 2: Remove active manifest imports and exports**

Remove the `coreReplayV4ActionsRuntimeUrl` import and array entries from active manifest modules. Do not delete `js/core_replay_v4_actions_runtime.js`.

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
- Modify: `docs/superpowers/plans/2026-06-13-replay-v4-actions-runtime-boundary.md`

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
git add docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-13-replay-v4-actions-runtime-boundary.md scripts/entry-manifest-audit.mjs src/bootstrap/replay-v4-actions-runtime.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts src/entries/replay-runtime-scripts.ts tests/unit/bootstrap-replay-v4-actions-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
git commit -m "refactor: install replay v4 actions runtime from ts"
```

Expected: one focused Stage 1AC commit.

### Self-Review

- Spec coverage: registry guardrail, TS bootstrap, manifest retirement, docs, verification, and commit are covered.
- Placeholder scan: no TBD/TODO/fill-in placeholders are present.
- Type consistency: runtime names consistently use `ReplayV4Actions` / `coreReplayV4ActionsRuntimeUrl` / `CoreReplayV4ActionsRuntime`.
