# Saved State Sync Event Payload Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Move cross-tab saved-state sync event parsing from the legacy panel timer runtime hotspot into the tested TypeScript saved-state sync payload runtime.

**Architecture:** Extend `src/core/saved-state-sync-payload.ts` so `CoreSavedStateSyncPayloadRuntime` owns both trim payload construction and event payload parsing. The legacy panel timer runtime delegates to `parseSavedStateSyncEventPayload` when the runtime is installed and keeps a compact fallback for standalone legacy execution.

**Tech Stack:** TypeScript core runtime, legacy VM bridge tests, Vitest, refactor closure audit.

---

### Task 1: Lock saved-state sync parsing behavior

**Files:**
- Modify: `src/core/saved-state-sync-payload.ts`
- Modify: `js/core_game_manager_panel_timer_helpers_runtime.js`
- Modify: `tests/unit/core-saved-state-sync-payload.spec.ts`
- Modify: `tests/unit/core-game-manager-panel-timer-runtime.spec.ts`

- [x] **Step 1: Write TypeScript parser tests**
  - Verify valid JSON object payloads parse to `{ sourceClientId, savedAt, state }`.
  - Verify `state.saved_at` takes precedence over outer `saved_at`.
  - Verify invalid JSON, missing object state, and missing positive timestamp return `null`.
  - Evidence: failed with `TypeError: parseSavedStateSyncEventPayload is not a function`.

- [x] **Step 2: Write legacy bridge test**
  - Inject `CoreSavedStateSyncPayloadRuntime.parseSavedStateSyncEventPayload` into the panel timer VM harness.
  - Verify legacy `parseSavedStateSyncEventPayload(manager, raw)` delegates to the TypeScript runtime with `raw`.
  - Evidence: failed by executing the old fallback path and throwing `ReferenceError: normalizeSavedStateRecordObject is not defined` in the isolated VM.

- [x] **Step 3: Implement runtime bridge**
  - Add `parseSavedStateSyncEventPayload` to the TypeScript runtime shape.
  - Add compact legacy fallback plus a delegating wrapper in `js/core_game_manager_panel_timer_helpers_runtime.js`.

- [x] **Step 4: Verify**
  - `npx vitest run tests/unit/core-saved-state-sync-payload.spec.ts tests/unit/core-game-manager-panel-timer-runtime.spec.ts`: 2 files passed, 10 tests passed.
  - `node scripts/refactor-closure-audit.mjs`: expected non-zero while long-term hotspots remain; hotspot count decreased to 17 and `parseSavedStateSyncEventPayload` is no longer listed.
