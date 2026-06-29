# Undo Restore Payload Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_undo_restore_payload_runtime.js` from active runtime manifests by installing `CoreUndoRestorePayloadRuntime` from tested TypeScript before legacy game-manager scripts load.

**Architecture:** Keep `src/core/undo-restore-payload.ts` as the pure undo payload owner. Add a bootstrap installer that exposes the legacy global runtime shape and preserves legacy tolerance for missing `input`.

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Undo-Restore-Payload Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add a test requiring `{ scriptPath: "core_undo_restore_payload_runtime.js", symbolName: "coreUndoRestorePayloadRuntimeUrl" }` in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`

Expected: FAIL until the retired registry includes undo-restore-payload.

- [x] **Step 3: Implement registry entry**

Add `core_undo_restore_payload_runtime.js` / `coreUndoRestorePayloadRuntimeUrl` to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

### Task 2: Install Undo-Restore-Payload Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/undo-restore-payload-runtime.ts`
- Create: `tests/unit/bootstrap-undo-restore-payload-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Create tests that require `createUndoRestorePayloadRuntime()` to expose `computeUndoRestorePayload`; match `src/core/undo-restore-payload.ts` for valid inputs; preserve legacy fallback behavior for missing `input`; install on `CoreUndoRestorePayloadRuntime`; avoid overwriting an existing runtime; and return `null` for a null target.

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/bootstrap-undo-restore-payload-runtime.spec.ts`

Expected: FAIL because `src/bootstrap/undo-restore-payload-runtime.ts` does not exist.

- [x] **Step 3: Implement installer**

Create `src/bootstrap/undo-restore-payload-runtime.ts` with a wrapper that delegates object inputs to `src/core/undo-restore-payload.ts` and normalizes missing legacy input to `{ prev: undefined, fallbackScore: undefined }` before delegation.

- [x] **Step 4: Install before legacy scripts**

Import and call `installUndoRestorePayloadRuntime()` in `src/entries/home-family-bootstrap.ts` before legacy game-manager scripts load.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `coreUndoRestorePayloadRuntimeUrl` imports and remove `coreUndoRestorePayloadRuntimeUrl` from play, replay, home, and capped runtime script arrays.

- [x] **Step 2: Run manifest audit**

Run: `npm run audit:entry-manifest`

Expected: PASS after every active manifest reference has been removed.

### Task 4: Verify and Document Stage 1Q

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused GREEN checks**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-undo-restore-payload.spec.ts tests/unit/bootstrap-undo-restore-payload-runtime.spec.ts
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

Prepend Stage 1Q evidence to `docs/ARCHITECTURE_GUARDRAILS.md` and `docs/ROADMAP_MILESTONES.md`.
