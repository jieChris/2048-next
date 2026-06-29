# Grid Scan Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_grid_scan_runtime.js` from active runtime manifests by installing `CoreGridScanRuntime` from tested TypeScript before legacy game-manager scripts load.

**Architecture:** Keep `src/core/grid-scan.ts` as the pure grid scan owner. Add a bootstrap installer that exposes the legacy global shape and preserves legacy defaults for missing callback arguments.

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Grid-Scan Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add this Vitest case near the other retired runtime registry tests:

```ts
it("tracks grid-scan runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_grid_scan_runtime.js",
    symbolName: "coreGridScanRuntimeUrl"
  });
});
```

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`

Expected: FAIL because `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` does not yet include `core_grid_scan_runtime.js`.

- [x] **Step 3: Implement registry entry**

Add `{ scriptPath: "core_grid_scan_runtime.js", symbolName: "coreGridScanRuntimeUrl" }` to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

### Task 2: Install Grid-Scan Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/grid-scan-runtime.ts`
- Create: `tests/unit/bootstrap-grid-scan-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Create tests that require `createGridScanRuntime()` to expose `getAvailableCells`, `buildBoardMatrix`, and `getBestTileValue`; preserve legacy fallback behavior for missing callback arguments; install on `CoreGridScanRuntime`; avoid overwriting an existing runtime; and return `null` for a null target.

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/bootstrap-grid-scan-runtime.spec.ts`

Expected: FAIL because `src/bootstrap/grid-scan-runtime.ts` does not exist.

- [x] **Step 3: Implement installer**

Create `src/bootstrap/grid-scan-runtime.ts` with wrapper functions that delegate to `src/core/grid-scan.ts`, using `() => false` for missing `isBlockedCell`, `() => false` for missing `isCellAvailable`, and `() => 0` for missing `readCellValue`.

- [x] **Step 4: Install before legacy scripts**

Import and call `installGridScanRuntime()` in `src/entries/home-family-bootstrap.ts` before legacy game-manager scripts load.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `coreGridScanRuntimeUrl` imports and remove `coreGridScanRuntimeUrl` from play, replay, home, and capped runtime script arrays.

- [x] **Step 2: Run manifest audit**

Run: `npm run audit:entry-manifest`

Expected: PASS after every active manifest reference has been removed.

### Task 4: Verify and Document Stage 1K

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused GREEN checks**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-grid-scan.spec.ts tests/unit/bootstrap-grid-scan-runtime.spec.ts
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

Prepend Stage 1K evidence to `docs/ARCHITECTURE_GUARDRAILS.md` and `docs/ROADMAP_MILESTONES.md`.
