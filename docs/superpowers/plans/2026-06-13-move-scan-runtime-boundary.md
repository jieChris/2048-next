# Move Scan Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_move_scan_runtime.js` from active runtime manifests by installing `CoreMoveScanRuntime` from tested TypeScript before legacy game-manager scripts load.

**Architecture:** Keep `src/core/move-scan.ts` as the pure move-scan owner. Add a bootstrap installer that exposes the legacy global shape and preserves legacy defaults for missing callback arguments.

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Move-Scan Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add a test requiring `{ scriptPath: "core_move_scan_runtime.js", symbolName: "coreMoveScanRuntimeUrl" }` in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`

Expected: FAIL until the retired registry includes move-scan.

- [x] **Step 3: Implement registry entry**

Add `core_move_scan_runtime.js` / `coreMoveScanRuntimeUrl` to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

### Task 2: Install Move-Scan Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/move-scan-runtime.ts`
- Create: `tests/unit/bootstrap-move-scan-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Create tests that require `createMoveScanRuntime()` to expose `tileMatchesAvailable` and `movesAvailable`; preserve legacy fallback behavior for missing callback arguments; install on `CoreMoveScanRuntime`; avoid overwriting an existing runtime; and return `null` for a null target.

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/bootstrap-move-scan-runtime.spec.ts`

Expected: FAIL because `src/bootstrap/move-scan-runtime.ts` does not exist.

- [x] **Step 3: Implement installer**

Create `src/bootstrap/move-scan-runtime.ts` with wrapper functions that delegate to `src/core/move-scan.ts`, using `() => false` for missing `isBlockedCell`, `() => null` for missing `getCellValue`, and `() => false` for missing `canMerge`.

- [x] **Step 4: Install before legacy scripts**

Import and call `installMoveScanRuntime()` in `src/entries/home-family-bootstrap.ts` before legacy game-manager scripts load.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `coreMoveScanRuntimeUrl` imports and remove `coreMoveScanRuntimeUrl` from play, replay, home, and capped runtime script arrays.

- [x] **Step 2: Run manifest audit**

Run: `npm run audit:entry-manifest`

Expected: PASS after every active manifest reference has been removed.

### Task 4: Verify and Document Stage 1L

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused GREEN checks**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-move-scan.spec.ts tests/unit/bootstrap-move-scan-runtime.spec.ts
```

Expected: PASS.

- [x] **Step 2: Run audits, build, smoke, and prepush**

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

- [x] **Step 3: Document evidence**

Prepend Stage 1L evidence to `docs/ARCHITECTURE_GUARDRAILS.md` and `docs/ROADMAP_MILESTONES.md`.
