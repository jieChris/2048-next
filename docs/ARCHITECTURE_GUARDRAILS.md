# Guardrail Delta (2026-06-13, Stage-1AA Replay-Execution Runtime TS Boundary)

## Batch Impact
- `CoreReplayExecutionRuntime` is now installed from `src/bootstrap/replay-execution-runtime.ts` before home-family legacy scripts load.
- `src/core/replay-execution.ts` remains the tested TypeScript owner for replay action classification, step stats, IPS calculations, and replay action resolution.
- The installer preserves legacy tolerance for missing object inputs and the legacy `Unknown replay action` throw behavior for unresolved actions.
- `js/core_replay_execution_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_replay_execution_runtime.js` / `coreReplayExecutionRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-replay-execution-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-execution.spec.ts tests/unit/bootstrap-replay-execution-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1Z Replay-Dispatch Runtime TS Boundary)

## Batch Impact
- `CoreReplayDispatchRuntime` is now installed from `src/bootstrap/replay-dispatch-runtime.ts` before home-family legacy scripts load.
- `src/core/replay-dispatch.ts` remains the tested TypeScript owner for replay action dispatch planning.
- The installer preserves legacy tolerance for missing input objects and the legacy `Unknown replay action` throw behavior.
- `js/core_replay_dispatch_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_replay_dispatch_runtime.js` / `coreReplayDispatchRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-replay-dispatch-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-dispatch.spec.ts tests/unit/bootstrap-replay-dispatch-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1Y Replay-Lifecycle Runtime TS Boundary)

## Batch Impact
- `CoreReplayLifecycleRuntime` is now installed from `src/bootstrap/replay-lifecycle-runtime.ts` before home-family legacy scripts load.
- `src/core/replay-lifecycle.ts` remains the tested TypeScript owner for replay seek target normalization and replay step planning.
- The installer preserves legacy fallback/floor behavior for missing or non-numeric seek target inputs while keeping the pure core API strict.
- `js/core_replay_lifecycle_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_replay_lifecycle_runtime.js` / `coreReplayLifecycleRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-replay-lifecycle-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-lifecycle.spec.ts tests/unit/bootstrap-replay-lifecycle-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1X Replay-Loop Runtime TS Boundary)

## Batch Impact
- `CoreReplayLoopRuntime` is now installed from `src/bootstrap/replay-loop-runtime.ts` before home-family legacy scripts load.
- `src/core/replay-loop.ts` remains the tested TypeScript owner for replay step execution planning.
- The installer preserves legacy tolerance for missing input objects while keeping the pure core API strict.
- `js/core_replay_loop_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_replay_loop_runtime.js` / `coreReplayLoopRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-replay-loop-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-loop.spec.ts tests/unit/bootstrap-replay-loop-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1W Replay-Control Runtime TS Boundary)

## Batch Impact
- `CoreReplayControlRuntime` is now installed from `src/bootstrap/replay-control-runtime.ts` before home-family legacy scripts load.
- `src/core/replay-control.ts` remains the tested TypeScript owner for replay tick boundary planning.
- The installer preserves legacy tolerance for missing input and `replayEndState` objects while keeping the pure core API strict.
- `js/core_replay_control_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_replay_control_runtime.js` / `coreReplayControlRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-replay-control-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-control.spec.ts tests/unit/bootstrap-replay-control-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1V Replay-Flow Runtime TS Boundary)

## Batch Impact
- `CoreReplayFlowRuntime` is now installed from `src/bootstrap/replay-flow-runtime.ts` before home-family legacy scripts load.
- `src/core/replay-flow.ts` remains the tested TypeScript owner for replay end-state and seek rewind/restart planning.
- The installer preserves legacy tolerance for missing input objects while keeping the pure core API strict.
- `js/core_replay_flow_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_replay_flow_runtime.js` / `coreReplayFlowRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-replay-flow-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-flow.spec.ts tests/unit/bootstrap-replay-flow-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1U Replay-Timer Runtime TS Boundary)

## Batch Impact
- `CoreReplayTimerRuntime` is now installed from `src/bootstrap/replay-timer-runtime.ts` before home-family legacy scripts load.
- `src/core/replay-timer.ts` remains the tested TypeScript owner for replay pause/resume/speed/tick-stop and duration calculations.
- The installer preserves legacy tolerance for missing input objects while keeping the pure core API strict.
- `js/core_replay_timer_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_replay_timer_runtime.js` / `coreReplayTimerRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-replay-timer-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-timer.spec.ts tests/unit/bootstrap-replay-timer-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1T Move-Apply Runtime TS Boundary)

## Batch Impact
- `CoreMoveApplyRuntime` is now installed from `src/bootstrap/move-apply-runtime.ts` before home-family legacy scripts load.
- `src/core/move-apply.ts` remains the tested TypeScript owner for tile merge/move interaction planning.
- The installer preserves legacy tolerance for missing `input`, `cell`, `farthest`, and `next` objects while keeping the pure core API strict.
- `js/core_move_apply_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_move_apply_runtime.js` / `coreMoveApplyRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-move-apply-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-move-apply.spec.ts tests/unit/bootstrap-move-apply-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1S Undo-Restore Runtime TS Boundary)

## Batch Impact
- `CoreUndoRestoreRuntime` is now installed from `src/bootstrap/undo-restore-runtime.ts` before home-family legacy scripts load.
- `src/core/undo-restore.ts` remains the tested TypeScript owner for undo restore state normalization.
- The installer preserves legacy `CoreEngineFacade.computeUndoRestoreState` delegation and falls back to the TypeScript owner when the facade is missing or throws.
- `js/core_undo_restore_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_undo_restore_runtime.js` / `coreUndoRestoreRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-undo-restore-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-undo-restore.spec.ts tests/unit/bootstrap-undo-restore-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1R Undo-Stack-Entry Runtime TS Boundary)

## Batch Impact
- `CoreUndoStackEntryRuntime` is now installed from `src/bootstrap/undo-stack-entry-runtime.ts` before home-family legacy scripts load.
- `src/core/undo-stack-entry.ts` remains the tested TypeScript owner for undo stack entry normalization.
- The installer preserves legacy tolerance for missing `input` while keeping the pure core API strict.
- `js/core_undo_stack_entry_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_undo_stack_entry_runtime.js` / `coreUndoStackEntryRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-undo-stack-entry-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-undo-stack-entry.spec.ts tests/unit/bootstrap-undo-stack-entry-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1Q Undo-Restore-Payload Runtime TS Boundary)

## Batch Impact
- `CoreUndoRestorePayloadRuntime` is now installed from `src/bootstrap/undo-restore-payload-runtime.ts` before home-family legacy scripts load.
- `src/core/undo-restore-payload.ts` remains the tested TypeScript owner for undo restore score/tile payload normalization.
- The installer preserves legacy tolerance for missing `input` while keeping the pure core API strict.
- `js/core_undo_restore_payload_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_undo_restore_payload_runtime.js` / `coreUndoRestorePayloadRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-undo-restore-payload-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-undo-restore-payload.spec.ts tests/unit/bootstrap-undo-restore-payload-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1P Undo-Tile-Restore Runtime TS Boundary)

## Batch Impact
- `CoreUndoTileRestoreRuntime` is now installed from `src/bootstrap/undo-tile-restore-runtime.ts` before home-family legacy scripts load.
- `src/core/undo-tile-restore.ts` remains the tested TypeScript owner for undo restore tile serialization.
- The installer preserves legacy tolerance for missing `input` and `previousPosition` objects while keeping the pure core API strict.
- `js/core_undo_tile_restore_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_undo_tile_restore_runtime.js` / `coreUndoTileRestoreRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-undo-tile-restore-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-undo-tile-restore.spec.ts tests/unit/bootstrap-undo-tile-restore-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1O Undo-Tile-Snapshot Runtime TS Boundary)

## Batch Impact
- `CoreUndoTileSnapshotRuntime` is now installed from `src/bootstrap/undo-tile-snapshot-runtime.ts` before home-family legacy scripts load.
- `src/core/undo-tile-snapshot.ts` remains the tested TypeScript owner for undo tile snapshot serialization.
- The installer preserves legacy tolerance for missing `input`, `tile`, and `target` objects while keeping the pure core API strict.
- `js/core_undo_tile_snapshot_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_undo_tile_snapshot_runtime.js` / `coreUndoTileSnapshotRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-undo-tile-snapshot-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-undo-tile-snapshot.spec.ts tests/unit/bootstrap-undo-tile-snapshot-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1N Post-Undo-Record Runtime TS Boundary)

## Batch Impact
- `CorePostUndoRecordRuntime` is now installed from `src/bootstrap/post-undo-record-runtime.ts` before home-family legacy scripts load.
- `src/core/post-undo-record.ts` remains the tested TypeScript owner for undo recording decisions and session replay action payloads.
- The installer preserves the legacy global runtime shape while delegating to the TypeScript owner.
- `js/core_post_undo_record_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_post_undo_record_runtime.js` / `corePostUndoRecordRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-post-undo-record-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-post-undo-record.spec.ts tests/unit/bootstrap-post-undo-record-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1M Move-Path Runtime TS Boundary)

## Batch Impact
- `CoreMovePathRuntime` is now installed from `src/bootstrap/move-path-runtime.ts` before home-family legacy scripts load.
- `src/core/move-path.ts` remains the tested TypeScript owner for vectors, traversal order, position comparison, and farthest-position scans.
- The installer preserves legacy fallback behavior for missing vector and scan callbacks.
- `js/core_move_path_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_move_path_runtime.js` / `coreMovePathRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-move-path-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-move-path.spec.ts tests/unit/bootstrap-move-path-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1L Move-Scan Runtime TS Boundary)

## Batch Impact
- `CoreMoveScanRuntime` is now installed from `src/bootstrap/move-scan-runtime.ts` before home-family legacy scripts load.
- `src/core/move-scan.ts` remains the tested TypeScript owner for tile-match and moves-available decisions.
- The installer preserves legacy fallback behavior for missing scan callbacks.
- `js/core_move_scan_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_move_scan_runtime.js` / `coreMoveScanRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-move-scan-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-move-scan.spec.ts tests/unit/bootstrap-move-scan-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1K Grid-Scan Runtime TS Boundary)

## Batch Impact
- `CoreGridScanRuntime` is now installed from `src/bootstrap/grid-scan-runtime.ts` before home-family legacy scripts load.
- `src/core/grid-scan.ts` remains the tested TypeScript owner for available-cell scans, board matrix generation, and best-tile reads.
- The installer preserves legacy fallback behavior for missing scan callbacks.
- `js/core_grid_scan_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_grid_scan_runtime.js` / `coreGridScanRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-grid-scan-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-grid-scan.spec.ts tests/unit/bootstrap-grid-scan-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1J Direction-Lock Runtime TS Boundary)

## Batch Impact
- `CoreDirectionLockRuntime` is now installed from `src/bootstrap/direction-lock-runtime.ts` before home-family legacy scripts load.
- `src/core/direction-lock.ts` remains the tested TypeScript owner for direction-lock state decisions.
- The installer preserves the legacy `getLockedDirectionState(input, randomFromSeed)` API shape by adapting the second argument into the TypeScript input.
- `js/core_direction_lock_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_direction_lock_runtime.js` / `coreDirectionLockRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-direction-lock-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-direction-lock.spec.ts tests/unit/bootstrap-direction-lock-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1I Undo-Snapshot Runtime TS Boundary)

## Batch Impact
- `CoreUndoSnapshotRuntime` is now installed from `src/bootstrap/undo-snapshot-runtime.ts` before home-family legacy scripts load.
- `src/core/undo-snapshot.ts` remains the tested TypeScript owner for undo snapshot normalization.
- `js/core_undo_snapshot_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_undo_snapshot_runtime.js` / `coreUndoSnapshotRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-undo-snapshot-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-undo-snapshot.spec.ts tests/unit/bootstrap-undo-snapshot-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1H Post-Move-Record Runtime TS Boundary)

## Batch Impact
- `CorePostMoveRecordRuntime` is now installed from `src/bootstrap/post-move-record-runtime.ts` before home-family legacy scripts load.
- `src/core/post-move-record.ts` remains the tested TypeScript owner for move-history and session replay record decisions.
- `js/core_post_move_record_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_post_move_record_runtime.js` / `corePostMoveRecordRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-post-move-record-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-post-move-record.spec.ts tests/unit/bootstrap-post-move-record-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1G Merge-Effects Runtime TS Boundary)

## Batch Impact
- `CoreMergeEffectsRuntime` is now installed from `src/bootstrap/merge-effects-runtime.ts` before home-family legacy scripts load.
- `src/core/merge-effects.ts` remains the tested TypeScript owner for merge milestone, timer-stamp, and 32k UI side-effect decisions.
- `js/core_merge_effects_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_merge_effects_runtime.js` / `coreMergeEffectsRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-merge-effects-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-merge-effects.spec.ts tests/unit/bootstrap-merge-effects-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1F Post-Move Runtime TS Boundary)

## Batch Impact
- `CorePostMoveRuntime` is now installed from `src/bootstrap/post-move-runtime.ts` before home-family legacy scripts load.
- `src/core/post-move.ts` remains the tested TypeScript owner for post-move lifecycle decisions.
- `js/core_post_move_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_post_move_runtime.js` / `corePostMoveRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-post-move-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-post-move.spec.ts tests/unit/bootstrap-post-move-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1E Scoring Runtime TS Boundary)

## Batch Impact
- `CoreScoringRuntime` is now installed from `src/bootstrap/scoring-runtime.ts` before home-family legacy scripts load.
- `src/core/scoring.ts` remains the tested TypeScript owner for post-move scoring and combo bonus calculation.
- `js/core_scoring_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` now uses `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` to block retired runtime scripts, including scoring, from returning to active manifests.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-scoring-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-scoring.spec.ts tests/unit/bootstrap-scoring-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1D Timer Interval Runtime TS Boundary)

## Batch Impact
- `CoreTimerIntervalRuntime` is now installed from `src/bootstrap/timer-interval-runtime.ts` before home-family legacy scripts load.
- `src/core/timer-interval.ts` remains the tested TypeScript owner for timer interval, move throttle, and timer invalidation helpers.
- `js/core_timer_interval_runtime.js` was retired from active play/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` now blocks `core_timer_interval_runtime.js` / `coreTimerIntervalRuntimeUrl` from returning to active entry manifests.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-timer-interval-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-timer-interval.spec.ts tests/unit/bootstrap-timer-interval-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Guardrail Delta (2026-06-13, Stage-1C Service Boundary Allowlist Zero)

## Batch Impact
- `DIRECT_SERVICE_USAGE_ALLOWLIST` is now empty.
- `admin_rescue_client_runtime.js` no longer calls browser storage or API transport directly.
- The admin rescue legacy runtime now consumes a typed `AdminRescueClientServiceBoundary` installed before home-family legacy scripts load.
- `service-boundary-audit` now reports `violations=0` without file exceptions.

## Verification
- RED: `npx vitest run tests/unit/service-boundary-audit-helpers.spec.ts`
- GREEN: `npx vitest run tests/unit/service-boundary-audit-helpers.spec.ts tests/unit/admin-rescue-client-runtime.spec.ts`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run audit:game-manager`
- `npm run build`

# Guardrail Delta (2026-06-13, Stage-1B Page Legacy Allowlist Zero)

## Batch Impact
- `PAGE_LEGACY_IMPORT_ALLOWLIST` is now empty.
- Remaining legacy page runtimes were moved out of `src/pages/*` direct imports and behind explicit `src/bootstrap/*-legacy-runtime.ts` adapters.
- `page-legacy-runtime-boundary-audit` now reports `legacyImports=0` for page shell files.
- Follow-up work should replace adapter internals with typed owners, but page shell exceptions are closed.

## Verification
- RED: `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/account-settings-page-bootstrap.spec.ts`
- GREEN: `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts tests/unit/account-settings-page-bootstrap.spec.ts`
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npx tsc --noEmit`
- direct-page refactor-contract smoke for account, account-settings, palette, password, register, and user-profile
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-shared-settings-toggles.smoke.spec.ts tests/smoke/pages-account-leaderboard-metric-filter.smoke.spec.ts tests/smoke/pages-user-profile-title.smoke.spec.ts`

# Guardrail Delta (2026-06-13, Stage-1B History Local Store)

## Batch Impact
- `history-page.ts` no longer imports any `../../js/*.js` legacy runtime directly.
- History store access now goes through an injected page runtime boundary.
- `history-page.ts` was removed from `PAGE_LEGACY_IMPORT_ALLOWLIST`.
- `PAGE_LEGACY_IMPORT_ALLOWLIST` shrank from `legacyImports=16` to `legacyImports=15`.

## Verification
- RED: `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/history-page-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts tests/unit/history-page-runtime.spec.ts`
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npx tsc --noEmit`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/history-records-view-list-export.smoke.spec.ts tests/smoke/history-records-import-core.smoke.spec.ts tests/smoke/history-records-import-mode-filter.smoke.spec.ts tests/smoke/history-records-owner-filter.smoke.spec.ts`
- `npx playwright test --config=playwright.refactor-contract.config.ts tests/refactor-contract/pages-history-page-system.smoke.spec.ts`

# Guardrail Delta (2026-06-13, Stage-1B History Storage Runtime)

## Batch Impact
- `history-page.ts` no longer imports `../../js/core_game_settings_storage_runtime.js` directly.
- History record normalization now uses a TypeScript adapter over `src/core/game-settings-storage.ts`.
- `PAGE_LEGACY_IMPORT_ALLOWLIST` shrank from `legacyImports=17` to `legacyImports=16`.
- The only remaining history page legacy import is `local_history_store`.

## Verification
- RED: `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/history-page-controller.spec.ts`
- GREEN: `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts tests/unit/history-page-controller.spec.ts`
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npx tsc --noEmit`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/history-records-view-list-export.smoke.spec.ts tests/smoke/history-records-import-core.smoke.spec.ts tests/smoke/history-records-import-mode-filter.smoke.spec.ts tests/smoke/history-records-owner-filter.smoke.spec.ts`
- `npx playwright test --config=playwright.refactor-contract.config.ts tests/refactor-contract/pages-history-page-system.smoke.spec.ts`

# Guardrail Delta (2026-06-13, Stage-1B History Mode Catalog)

## Batch Impact
- `history-page.ts` no longer imports `../../js/mode_catalog.js` directly.
- History mode catalog access now goes through an injected page runtime/controller boundary.
- `PAGE_LEGACY_IMPORT_ALLOWLIST` shrank from `legacyImports=18` to `legacyImports=17`.
- Remaining history page legacy imports are `core_game_settings_storage_runtime` and `local_history_store`.

## Verification
- RED: `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/history-page-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts tests/unit/history-page-runtime.spec.ts`
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npm run audit:service-boundary`
- `npx tsc --noEmit`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/history-records-import-mode-filter.smoke.spec.ts`
- `npx playwright test --config=playwright.refactor-contract.config.ts tests/refactor-contract/pages-history-page-system.smoke.spec.ts`

# Guardrail Delta (2026-06-13, Stage-1B History Theme)

## Batch Impact
- `history-page.ts` no longer imports `../../js/theme_manager.js`.
- `PAGE_LEGACY_IMPORT_ALLOWLIST` shrank from `legacyImports=19` to `legacyImports=18`.
- Remaining history page legacy imports are deliberately deferred to follow-up batches with behavior-specific owners.

## Verification
- `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npx playwright test --config=playwright.refactor-contract.config.ts tests/refactor-contract/pages-history-page-system.smoke.spec.ts`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/history-records-view-list-export.smoke.spec.ts tests/smoke/history-records-import-core.smoke.spec.ts tests/smoke/history-records-import-mode-filter.smoke.spec.ts tests/smoke/history-records-owner-filter.smoke.spec.ts`
- `npx playwright test --config=playwright.config.ts tests/smoke/pages-shared-settings-toggles.smoke.spec.ts -g "night preference reaches utility and direct pages with darkened key surfaces"`

# Guardrail Delta (2026-06-13, Stage-1 Legacy Retirement)

## Batch Impact
- `modes-page.ts` no longer imports `../../js/theme_manager.js`; the page legacy import allowlist shrank by one entry.
- `admin-page.ts` and `stone-2k-monitor-page.ts` moved direct storage/API behavior behind `src/services` and `src/storage` owners and no longer import `../../js/api_shared_utils.js`.
- `DIRECT_SERVICE_USAGE_ALLOWLIST` now retains only the legacy runtime exception that still lives under `js/`.
- `game-manager-audit` prepush blockers were reduced without behavior changes: replay autosubmit serialization fallback was split into smaller helpers, and saved-state helper line count is below the guardrail.

## Verification
- `npx vitest run tests/unit/service-boundary-audit-helpers.spec.ts tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts tests/unit/admin-replay-upload-ui.spec.ts tests/unit/services-api-client.spec.ts tests/unit/services-stone-2k-monitor.spec.ts tests/unit/storage-browser-storage.spec.ts`
- `npm run audit:service-boundary`
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npm run audit:entry-manifest && npm run audit:page-legacy-runtime-boundary && npm run audit:service-boundary && npm run test:unit && npm run test:smoke:pages && npm run build`
- `npm run test:smoke:pages`
- `npx playwright test --config=playwright.refactor-contract.config.ts tests/refactor-contract/pages-modes-page-system.smoke.spec.ts`
- `npm run verify:prepush`

# A-F Guardrail Delta (2026-03-22, Batch-WS4-03)

## Batch Impact
- Added `page-legacy-runtime-boundary-audit` to refactor gate to freeze `src/pages/* -> ../../js/*.js` legacy adapters.
- Current `src/pages` legacy imports are allowlisted; any new legacy import in page shells now fails gate.
- Dynamic `import("...")` is included in the audit scan.

## Guardrail Consequence
- WS4-03 is now enforceable: page-shell de-legacy can proceed by shrinking the allowlist.
- Next step: remove legacy imports per page and delete the corresponding allowlist entries.

# A-F Guardrail Delta (2026-03-22, Batch-WS4-02D3)

## Batch Impact
- Page-entry debt is now `0`: the audited set no longer contains any `direct-module` page entries.
- `entry-manifest-audit` now covers all 16 audited page entries under the same manifest/bootstrap classification model.
- Guard focus shifts from `entry migration` to `page-shell de-legacy`.

## Current Flaky Record
- `suspected_flake`
  - scope: unrelated `history` / `index-ui` smoke runs during repeated `verify:prepush` attempts
  - failure shapes observed: `ERR_CONNECTION_REFUSED`, `ERR_CONNECTION_RESET`, and isolated startup timeouts
  - rerun result: corresponding single-test reruns passed
  - final full `verify:prepush`: passed
  - impact on this batch decision: do not classify `user-profile` migration as a regression based on these signals

## Guardrail Consequence
- Next gate work should focus on two things:
  1. preserve `direct-module = 0` under `entry-manifest-audit`
  2. add the next-stage `legacy-runtime-import boundary` for `src/pages/*` transitional adapters

# A-F Guardrail Consolidation (2026-03-22)

## Single Truth
- 本节作为 2026-03-22 起的主规范，优先级高于下方仍保留的旧 `rg` 示例与零散补丁描述。
- 目标不是“再加一个检查命令”，而是把边界、阻断条件、例外机制、CI 放行条件写成单一真相。

## CI Blocking Topology
- `PR minimum`
  1. `npm run test:unit`
  2. `npm run audit:entry-manifest`
  3. `npm run audit:service-boundary`
  4. `npm run test:smoke:runtime-contract`
- `Main release minimum`
  1. `npm run verify:refactor:ci`
  2. `npm run build`
  3. deploy 必须依赖上一步成功的结果
- 在 deploy workflow 完成硬绑定之前，不得把“deploy 成功”视为最终发布证据。

## Service Boundary Single Truth
- `R4/R5` 的正式门禁命令统一为 `npm run audit:service-boundary`。
- 当前已阻断：
  - direct `localStorage.*`
  - direct `sessionStorage.*`
  - direct `fetch(...)`
- 下一批必须纳入的等价写法：
  - `window.fetch`
  - `globalThis.fetch`
  - bracket notation，例如 `['fetch']`、`['localStorage']`
- `.html inline script` 是否纳入同一审计面，必须显式决定；未决定前不得宣称“页面层直连已完全清零”。

## Allowed Owners And Exceptions
- `Allowed storage owners`
  - `src/storage/**`
  - 已审批的共享 helper
  - ADR 明确登记的临时 shim
- `Allowed network owners`
  - `src/services/**`（落地后）
  - 已审批的共享 fetch helper
  - ADR 明确登记的临时 shim
- 任一例外都必须登记：
  - path
  - owner
  - reason
  - expiry batch
  - replacement plan

## Gate Coverage Limits
- `service-boundary-audit`
  - 当前仍是 syntax-level gate，不等于 ownership-complete gate。
- `entry-manifest-audit`
  - 当前是 spec-table gate，不等于 repository HTML inventory gate。
- `release-ready`
  - 当前是 snippet gate，不是 workflow parser，也不是 deploy DAG validator。
- 任何对外结论都必须写清“当前 gate 能拦什么、不能拦什么”。

## Flaky Smoke Policy
- 满足以下条件的 smoke 视为 `flaky suspect`：
  - 首次完整运行失败；
  - 在无代码修改条件下，单用例或复跑通过。
- 每条记录必须落账：
  - test file
  - failure shape
  - rerun result
  - owner
  - quarantine decision
  - close condition
- 稳定性证据必须区分：
  - `first_run_pass`
  - `rerun_pass`
  - `suspected_flake`

# 架构红线与门禁规则

> 目标：把“理想状态”转为可执行、可阻断、可审计的工程规则。  
> 生效范围：全仓库（含页面入口、核心逻辑、测试、CI）。

## 1. 红线清单（不可违反）

### R1. 禁止新增 legacy 依赖
- 规则：禁止新增对 legacy loader、历史 runtime 主链路的依赖。
- 检测方式：`rg -n "legacy|runtime" js src *.html`，并结合 `npm run audit:entry-manifest` 检查入口是否回流到旧壳。
- 失败判定：新增页面、入口或运行链路必须依赖 legacy 才能工作，或在主流程中出现新的 legacy import/调用。

### R2. 禁止绕过 Engine 修改核心状态
- 规则：任何棋盘状态变更必须经 Engine 统一入口。
- 检测方式：`npm run test:unit` + `npm run test:smoke:runtime-contract`，并对 `GameManager` 相关变更点做静态扫描。
- 失败判定：页面层、feature 层、UI 层直接改核心状态对象，或测试证明存在绕过 Engine 的状态写入路径。

### R3. 禁止绕过 contracts 传递核心数据
- 规则：状态、回放、提交、同步、存档必须使用 contracts 定义。
- 检测方式：`npm run test:unit` 中的 contract/schema 相关用例 + 对 API/storage 结构做差异检查。
- 失败判定：页面/API/storage 层存在隐式结构并进入主链路，或序列化/反序列化不经过 contracts。

### R4. 禁止页面层直接读写 localStorage 业务数据
- 规则：页面不得直接写本地业务状态，统一通过 storage 抽象层访问。
- 检测方式：`rg -n "localStorage\\." src js`，并结合相关单测确认写入路径只落在 storage 模块。
- 失败判定：`app/pages/ui` 或业务页面出现 direct `localStorage.*` 业务调用，且未列入白名单。

### R5. 禁止页面层直接拼装业务网络协议
- 规则：页面层不直接组装业务请求体，统一通过 service/api 层。
- 检测方式：`rg -n "fetch\\(|/api/" src/entries js`，再由对应单测或 smoke 验证请求体由 service 层生成。
- 失败判定：页面层出现核心业务 API 字段拼装逻辑，或页面直接向后端发送未经 service 封装的协议数据。

### R6. 禁止新增散点 html 入口
- 规则：新页面必须登记到统一页面系统与入口 manifest。
- 检测方式：`npm run audit:entry-manifest` + `tests/unit/html-module-entry-pages.spec.ts`。
- 失败判定：根目录新增未纳管业务 html 入口，或页面没有进入统一入口映射。

### R7. 禁止 PKU 逻辑分叉
- 规则：PKU 功能必须与普通玩法共享同一 Engine/contracts 核心。
- 检测方式：PKU 相关 smoke + 对比普通玩法的核心调用链，确认共用同一协议与引擎。
- 失败判定：PKU 复制出一套独立规则实现，或出现双套核心逻辑并行维护。

## 2. 自动化门禁映射

| 红线 | 对应门禁 | 当前命令 |
|---|---|---|
| R1 | refactor gate + 入口扫描 | `npm run verify:prepush`（含 `legacy-boundary-audit`） / `npm run audit:entry-manifest` |
| R2 | 核心行为 unit + smoke | `npm run test:unit` / `npm run test:smoke:runtime-contract` |
| R3 | contracts 单测 + 集成校验 | `npm run test:unit` |
| R4 | 静态扫描（localStorage） | `rg -n "localStorage\\." src js` |
| R5 | service 边界审计 | `rg -n "fetch\\(|/api/" src/entries js` |
| R6 | entry-manifest 审计 | `npm run audit:entry-manifest` |
| R7 | replay/competition/pku 回归 | `npm run test:smoke:play-replay` + PKU 相关 smoke |

## 3. PR 阶段与主分支阶段的 CI 阻断策略

### 3.1 PR 阶段最小必跑项
PR 进入合并前，至少跑以下项：
1. `npm run test:unit`
2. `npm run audit:entry-manifest`
3. `npm run test:smoke:runtime-contract`

阻断规则：
- 任一项失败，PR 直接阻断，不能合并。
- 若失败指向 R1-R7 任一红线，必须同步补充对应测试或规则说明。
- 若失败属于临时环境问题，必须在 PR 评论中标注复现条件和替代验证证据。

### 3.2 主分支阶段最小必跑项
主分支合并后，至少跑以下项：
1. `npm run verify:prepush`
2. `npm run test:smoke:ci`
3. `npm run build`

阻断规则：
- 任一项失败，主分支发布链路阻断。
- 若失败是门禁规则失效，优先修门禁，不允许只修业务代码绕过。
- 若失败是 smoke 超时或不稳定，必须先稳定测试再恢复合并通道。

## 4. 违规分流处理时限（SLA）

### P0
- 定义：已影响主链路、发布或数据正确性，且有明确用户可见风险。
- 处理时限：2 小时内响应，24 小时内给出修复或回滚方案。
- 处理要求：必须立即升级给 A/E/F，优先阻断后续合并。

### P1
- 定义：高概率引发回归、门禁失败或核心功能异常，但未扩大到全量阻断。
- 处理时限：当日响应，2 个工作日内修复并补回归测试。
- 处理要求：进入当前迭代最高优先级，必要时冻结相关子任务。

### P2
- 定义：中等风险的架构债或测试缺口，不影响当天发布但会持续积累风险。
- 处理时限：3 个工作日内排期，5 个工作日内关闭或给出延期理由。
- 处理要求：写入 `docs/EXECUTION_LOG.md`，并在里程碑看板中跟踪。

### P3
- 定义：低风险、文档缺口、可维护性瑕疵或非阻断性告警。
- 处理时限：一周内评审，进入下个批次或显式放弃。
- 处理要求：不允许长期悬挂；超过一周必须升级为 P2 或关闭。

## 5. PR 检查清单（提交前必答）
1. 本次改动是否引入新的 legacy 依赖？
2. 是否存在绕过 Engine 的状态修改？
3. 是否有绕过 contracts 的隐式数据结构？
4. 页面层是否出现 direct localStorage 或业务 API 拼装？
5. 新页面是否纳入统一入口体系？
6. 对应单测/smoke 是否覆盖到边界行为？

任一项回答“是”且没有 ADR 或白名单说明，则不得合并。

## 6. 违规处理
1. 发现违规后立即按 P0-P3 分级，并在当日登记到执行日志。
2. 触发 P0/P1 时，先阻断合并，再给出修复或回滚路径。
3. 触发 P2/P3 时，必须写明负责人、截止时间和下一次复核点。
4. 修复完成后补回归测试，并更新 `docs/ROADMAP_MILESTONES.md` 和 `docs/EXECUTION_LOG.md` 中的验证状态。
# Guardrail Update (2026-03-22)

## Service Boundary Gate
- `R4` and `R5` now map to `npm run audit:service-boundary`.
- Scope: `src/**/*.ts`, `src/**/*.js`, `js/**/*.ts`, `js/**/*.js`.
- Blocked patterns:
  - direct `localStorage.*`
  - direct `sessionStorage.*`
  - direct `fetch(...)`
- Required path:
  - page/UI layer -> shared helper or service/api layer
  - storage access -> storage/helper layer
  - network access -> shared fetch helper or service/api layer

## Refactor Gate Mapping
- `npm run verify:prepush` now includes `page-legacy-runtime-boundary-audit` and `service-boundary-audit`.
- Current expected refactor gate chain:
  - `game-manager-audit`
  - `entry-manifest-audit`
  - `page-legacy-runtime-boundary-audit`
  - `legacy-boundary-audit`
  - `service-boundary-audit`
  - `contracts-matrix-audit`
  - `engine-audit`
  - `unit`
  - `smoke`
  - `build`

## PR Minimum Checks
- PR minimum checks are now:
  1. `npm run test:unit`
  2. `npm run audit:entry-manifest`
  3. `npm run audit:service-boundary`
  4. `npm run test:smoke:runtime-contract`

## Baseline
- Repository baseline on 2026-03-22:
  - `src+js direct localStorage = 0`
  - `src+js direct fetch = 0`
- Any new direct hit is treated as an architecture regression and must be blocked by CI.
# A-F Guardrail Consolidation (2026-03-22)

## Single Truth
- 本节作为 2026-03-22 起的主规范，优先级高于下方仍保留的旧 `rg` 示例与零散补丁描述。
- 目标不是“再加一个检查命令”，而是把边界、阻断条件、例外机制、CI 放行条件写成单一真相。

## CI Blocking Topology
- `PR minimum`
  1. `npm run test:unit`
  2. `npm run audit:entry-manifest`
  3. `npm run audit:service-boundary`
  4. `npm run test:smoke:runtime-contract`
- `Main release minimum`
  1. `npm run verify:refactor:ci`
  2. `npm run build`
  3. deploy 必须依赖上一步成功的结果
- 在 deploy workflow 完成硬绑定之前，不得把“deploy 成功”视为最终发布证据。

## Service Boundary Single Truth
- `R4/R5` 的正式门禁命令统一为 `npm run audit:service-boundary`。
- 当前已阻断：
  - direct `localStorage.*`
  - direct `sessionStorage.*`
  - direct `fetch(...)`
- 下一批必须纳入的等价写法：
  - `window.fetch`
  - `globalThis.fetch`
  - bracket notation，例如 `["fetch"]`、`["localStorage"]`
- `.html inline script` 是否纳入同一审计面，必须显式决定；未决定前不得宣称“页面层直连已完全清零”。

## Allowed Owners And Exceptions
- `Allowed storage owners`
  - `src/storage/**`
  - 已审批的共享 helper
  - ADR 明确登记的临时 shim
- `Allowed network owners`
  - `src/services/**`（落地后）
  - 已审批的共享 fetch helper
  - ADR 明确登记的临时 shim
- 任一例外都必须登记：
  - path
  - owner
  - reason
  - expiry batch
  - replacement plan

## Gate Coverage Limits
- `service-boundary-audit`
  - 当前仍是 syntax-level gate，不等于 ownership-complete gate。
- `entry-manifest-audit`
  - 当前是 spec-table gate，不等于 repository HTML inventory gate。
- `release-ready`
  - 当前是 snippet gate，不是 workflow parser，也不是 deploy DAG validator。
- 任何对外结论都必须写清“当前 gate 能拦什么、不能拦什么”。

## Flaky Smoke Policy
- 满足以下条件的 smoke 视为 `flaky suspect`：
  - 首次完整运行失败；
  - 在无代码修改条件下，单用例或复跑通过。
- 每条记录必须落账：
  - test file
  - failure shape
  - rerun result
  - owner
  - quarantine decision
  - close condition
- 稳定性证据必须区分：
  - `first_run_pass`
  - `rerun_pass`
  - `suspected_flake`

# 鏋舵瀯绾㈢嚎涓庨棬绂佽鍒?


## [2026-03-22] Update
- history page shell no longer imports `history_page.js`; legacy page import allowlist reduced accordingly.
