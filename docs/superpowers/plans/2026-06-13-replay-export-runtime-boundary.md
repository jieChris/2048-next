# Replay Export Runtime TS Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Move `CoreReplayExportRuntime` installation to a tested TypeScript bootstrap boundary and retire `js/core_replay_export_runtime.js` from active entry manifests without deleting the legacy file.

**Architecture:** `src/bootstrap/replay-export.ts` remains the TypeScript owner for replay export and clipboard behavior. The same module will expose a small installer for the legacy `window.CoreReplayExportRuntime` shape while preserving the legacy `applyReplayExport` result fields. `entry-manifest-audit` blocks the legacy replay export URL from active play/home manifests.

**Tech Stack:** TypeScript, Vite URL manifests, Vitest, Playwright smoke checks, Node audit scripts.

---

### Task 1: Preserve Replay Export Result Shape

**Files:**
- Modify: `tests/unit/bootstrap-replay-export.spec.ts`
- Modify: `src/bootstrap/replay-export.ts`

- [x] **Step 1: Write the failing result-shape test**

Add expectations that text exports return `{ exported: true, format: "text", replay }` and v1 `.rpl` exports return `{ exported: true, format: "v1-rpl-base64", replay }`.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-export.spec.ts
```

Expected: FAIL before TypeScript replay export returns the legacy `format` field.

- [x] **Step 3: Add the legacy `format` field and run GREEN**

Update `applyReplayExport()` to include the legacy `format` field, then rerun the same Vitest command. Expected: PASS.

### Task 2: Guard Active Manifests Against Replay Export Runtime

**Files:**
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`
- Modify: `scripts/entry-manifest-audit.mjs`

- [x] **Step 1: Write the failing audit registry test**

Add a test expecting `{ scriptPath: "core_replay_export_runtime.js", symbolName: "coreReplayExportRuntimeUrl" }` in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL before the retired-runtime registry entry exists.

- [x] **Step 3: Add registry entry and run GREEN**

Add the entry to `scripts/entry-manifest-audit.mjs`, then rerun the same Vitest command. Expected: PASS.

### Task 3: Install CoreReplayExportRuntime From TypeScript

**Files:**
- Create: `tests/unit/bootstrap-replay-export-runtime.spec.ts`
- Modify: `src/bootstrap/replay-export.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write the failing bootstrap runtime test**

Create a Vitest file covering runtime shape, supplied window installation, no overwrite, and null target.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-export-runtime.spec.ts
```

Expected: FAIL before `createReplayExportRuntime()` / `installReplayExportRuntime()` exist.

- [x] **Step 3: Add TypeScript bootstrap installer and home-family install call**

Add installer exports to `src/bootstrap/replay-export.ts` and call `installReplayExportRuntime()` in `src/entries/home-family-bootstrap.ts` before legacy scripts load.

- [x] **Step 4: Run focused GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-export.spec.ts tests/unit/bootstrap-replay-export-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: PASS.

### Task 4: Remove Replay Export Runtime From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Run manifest audit RED**

Run:

```bash
npm run audit:entry-manifest
```

Expected: FAIL because active manifests still reference `core_replay_export_runtime.js` / `coreReplayExportRuntimeUrl`.

- [x] **Step 2: Remove active manifest imports and exports**

Remove the `coreReplayExportRuntimeUrl` import and array entries from active manifest modules. Do not delete `js/core_replay_export_runtime.js`.

- [x] **Step 3: Run manifest audit GREEN**

Run:

```bash
npm run audit:entry-manifest
```

Expected: PASS.

### Task 5: Document Evidence And Run Full Gates

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-13-replay-export-runtime-boundary.md`

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
git add docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-13-replay-export-runtime-boundary.md scripts/entry-manifest-audit.mjs src/bootstrap/replay-export.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts tests/unit/bootstrap-replay-export.spec.ts tests/unit/bootstrap-replay-export-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
git commit -m "refactor: install replay export runtime from ts"
```

Expected: one focused Stage 1AE commit.

### Self-Review

- Spec coverage: result shape parity, registry guardrail, TS bootstrap, manifest retirement, docs, verification, and commit are covered.
- Placeholder scan: no TBD/TODO/fill-in placeholders are present.
- Type consistency: runtime names consistently use `ReplayExport` / `coreReplayExportRuntimeUrl` / `CoreReplayExportRuntime`.
