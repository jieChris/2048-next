# Replay V1 Init Tiles Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Move replay V1 initial-tile derivation from the legacy restart/setup runtime hotspot into the tested TypeScript session replay snapshot runtime boundary.

**Architecture:** Extend `src/core/session-replay-snapshot.ts` with `resolveReplayV1InitTilesFromBoardMatrix`, responsible for validating board dimensions and converting pow2/fibonacci initial board values into replay V1 `{ cellIndex, valueBit }` records. The legacy restart/setup runtime delegates to `CoreSessionReplaySnapshotRuntime` when available and keeps a compact fallback for standalone legacy execution.

**Tech Stack:** TypeScript core runtime, legacy VM bridge tests, Vitest, refactor closure audit.

---

### Task 1: Lock replay V1 init tile derivation

**Files:**
- Modify: `src/core/session-replay-snapshot.ts`
- Modify: `js/core_game_manager_restart_setup_helpers_runtime.js`
- Modify: `tests/unit/core-session-replay-snapshot.spec.ts`
- Modify: `tests/unit/core-game-manager-restart-seed.spec.ts`

- [x] **Step 1: Write TypeScript init tile tests**
  - Verify pow2 boards convert `2 -> valueBit 0` and `4 -> valueBit 1`.
  - Verify fibonacci boards convert `1 -> valueBit 0` and `2 -> valueBit 1`.
  - Verify malformed dimensions and unsupported values return `null`.
  - Evidence: failed with `TypeError: resolveReplayV1InitTilesFromBoardMatrix is not a function`.

- [x] **Step 2: Write legacy bridge test**
  - Inject `CoreSessionReplaySnapshotRuntime.resolveReplayV1InitTilesFromBoardMatrix` into the restart/setup VM harness.
  - Verify legacy `resolveReplayV1InitTilesFromBoardMatrix(manager, board, width, height, ruleset)` delegates normalized payload fields.
  - Evidence: failed by returning the old local fallback result (`null`) instead of the injected runtime value.

- [x] **Step 3: Implement runtime bridge**
  - Add `resolveReplayV1InitTilesFromBoardMatrix` to `src/core/session-replay-snapshot.ts`.
  - Add a compact legacy fallback and delegate to the TypeScript runtime when installed.

- [x] **Step 4: Verify**
  - `npx vitest run tests/unit/core-session-replay-snapshot.spec.ts tests/unit/core-game-manager-restart-seed.spec.ts`: 2 files passed, 19 tests passed.
  - `node scripts/refactor-closure-audit.mjs`: expected non-zero while long-term hotspots remain; hotspot count decreased to 15 and `resolveReplayV1InitTilesFromBoardMatrix` is no longer listed.
