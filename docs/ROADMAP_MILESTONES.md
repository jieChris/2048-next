# Stage-1DA Core Game Manager Base Helpers Mode Payload Boundary (2026-06-16)

## Phase Decision
- `WS-runtime-102`
  - status: done
  - progress: `src/core/game-manager-base-helpers.ts` now owns `createCoreModeDefaultsPayload` and `createCoreModeContextPayload`; `src/bootstrap/game-manager-base-helpers-runtime.ts` installs those legacy global names before home/play/replay/capped scripts load.
  - follow-up: active manifest and Vite bundle references to `core_game_manager_base_helpers_runtime.js` remain intentionally in place because secondary timer helpers still require a later TypeScript boundary stage; `public/js/legacy_index_nomodule_loader.js` remains separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts` failed before the mode payload helpers were exported.
- GREEN: `npx vitest run tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/core-game-manager-base-helpers-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4317 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`


# Stage-1CZ Core Game Manager Base Helpers TypeScript Boundary (2026-06-16)

## Phase Decision
- `WS-runtime-101`
  - status: done
  - progress: `src/core/game-manager-base-helpers.ts` now owns the migrated low-level core game-manager base helpers, and `src/bootstrap/game-manager-base-helpers-runtime.ts` installs their legacy global names before home/play/replay/capped scripts load.
  - follow-up: active manifest and Vite bundle references to `core_game_manager_base_helpers_runtime.js` remain intentionally in place for later active-manifest and bundle retirement stages; `public/js/legacy_index_nomodule_loader.js` remains separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/core-game-manager-base-helpers.spec.ts` failed before `src/core/game-manager-base-helpers.ts` existed.
- RED: `npx vitest run tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts` failed before `src/bootstrap/game-manager-base-helpers-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4316 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CY Client-Record-ID Bundle Runtime Retirement (2026-06-16)

## Phase Decision
- `WS-runtime-100`
  - status: done
  - progress: `src/bootstrap/game-manager-client-record-id-runtime.ts` remains the modern installer; `js/core_game_manager_client_record_id_runtime.js` is no longer included in `HOME_STANDARD_STARTUP_FILES`, so the Vite-generated home startup bundle no longer overwrites the TypeScript-installed runtime.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_game_manager_client_record_id_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_game_manager_client_record_id_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_game_manager_client_record_id_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts tests/unit/core-game-manager-client-record-id.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4315 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CX Client-Record-ID Active Manifest Retirement (2026-06-16)

## Phase Decision
- `WS-runtime-99`
  - status: done
  - progress: `core_game_manager_client_record_id_runtime.js` is no longer referenced by active home/play/replay/capped manifests; `src/bootstrap/game-manager-client-record-id-runtime.ts` remains the modern installer for legacy helper names.
  - follow-up: `vite.config.ts` still includes `core_game_manager_client_record_id_runtime.js` in `HOME_STANDARD_STARTUP_FILES`, and `public/js/legacy_index_nomodule_loader.js` still references it for separate bundle and legacy-browser policy stages.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` included `core_game_manager_client_record_id_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while active manifests referenced `coreGameManagerClientRecordIdRuntimeUrl`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts tests/unit/core-game-manager-client-record-id.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4314 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CW Client-Record-ID TypeScript Boundary (2026-06-16)

## Phase Decision
- `WS-runtime-98`
  - status: done
  - progress: `src/core/game-manager-client-record-id.ts` now owns manager client record ID creation, assignment, and resolution; `src/bootstrap/game-manager-client-record-id-runtime.ts` installs the legacy global function names before home/play/replay/capped legacy scripts load.
  - follow-up: active manifest and Vite bundle references to `js/core_game_manager_client_record_id_runtime.js` remain intentionally in place for the next retirement stage.

## Evidence
- RED: `npx vitest run tests/unit/core-game-manager-client-record-id.spec.ts` failed before `src/core/game-manager-client-record-id.ts` existed.
- RED: `npx vitest run tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts` failed before `src/bootstrap/game-manager-client-record-id-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/core-game-manager-client-record-id.spec.ts tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4313 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CV Game-Settings-Storage Bundle Runtime Retirement (2026-06-16)

## Phase Decision
- `WS-runtime-97`
  - status: done
  - progress: `CoreGameSettingsStorageRuntime` remains installed from `src/bootstrap/game-settings-storage-runtime.ts`; `js/core_game_settings_storage_runtime.js` is no longer included in `HOME_STANDARD_STARTUP_FILES`, so the Vite-generated home startup bundle no longer overwrites the TypeScript-installed runtime.
  - follow-up: `src/bootstrap/user-profile-legacy-runtime.ts` still imports the legacy runtime for user-profile compatibility, and `public/js/legacy_index_nomodule_loader.js` still references it for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_game_settings_storage_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_game_settings_storage_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-game-settings-storage-runtime.spec.ts tests/unit/core-game-settings-storage.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4312 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CU Game-Settings-Storage Active Manifest Retirement (2026-06-16)

## Phase Decision
- `WS-runtime-96`
  - status: done
  - progress: `CoreGameSettingsStorageRuntime` is installed from `src/bootstrap/game-settings-storage-runtime.ts`; `js/core_game_settings_storage_runtime.js` is no longer referenced by active home/capped/play/replay runtime manifests.
  - follow-up: `vite.config.ts` still includes `core_game_settings_storage_runtime.js` in `HOME_STANDARD_STARTUP_FILES`, and `public/js/legacy_index_nomodule_loader.js` still references it for separate bundle and legacy-browser policy stages.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-game-settings-storage-runtime.spec.ts` failed before `src/bootstrap/game-settings-storage-runtime.ts` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` included `core_game_settings_storage_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while active manifests referenced `coreGameSettingsStorageRuntimeUrl`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-game-settings-storage-runtime.spec.ts tests/unit/core-game-settings-storage.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4311 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CT Move-Apply Bundle Runtime Retirement (2026-06-16)

## Phase Decision
- `WS-runtime-95`
  - status: done
  - progress: `CoreMoveApplyRuntime` remains installed from `src/bootstrap/move-apply-runtime.ts`; `js/core_move_apply_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_move_apply_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_move_apply_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_move_apply_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-move-apply-runtime.spec.ts tests/unit/core-move-apply.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4309 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CS Replay-Loop Bundle Runtime Retirement (2026-06-16)

## Phase Decision
- `WS-runtime-94`
  - status: done
  - progress: `CoreReplayLoopRuntime` remains installed from `src/bootstrap/replay-loop-runtime.ts`; `js/core_replay_loop_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_replay_loop_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_replay_loop_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_replay_loop_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-replay-loop-runtime.spec.ts tests/unit/core-replay-loop.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4308 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CR Replay-Control Bundle Runtime Retirement (2026-06-16)

## Phase Decision
- `WS-runtime-93`
  - status: done
  - progress: `CoreReplayControlRuntime` remains installed from `src/bootstrap/replay-control-runtime.ts`; `js/core_replay_control_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_replay_control_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_replay_control_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_replay_control_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-replay-control-runtime.spec.ts tests/unit/core-replay-control.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4307 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CQ Replay-Flow Bundle Runtime Retirement (2026-06-16)

## Phase Decision
- `WS-runtime-92`
  - status: done
  - progress: `CoreReplayFlowRuntime` remains installed from `src/bootstrap/replay-flow-runtime.ts`; `js/core_replay_flow_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_replay_flow_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_replay_flow_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_replay_flow_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-replay-flow-runtime.spec.ts tests/unit/core-replay-flow.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4306 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CP Replay-Timer Bundle Runtime Retirement (2026-06-16)

## Phase Decision
- `WS-runtime-91`
  - status: done
  - progress: `CoreReplayTimerRuntime` remains installed from `src/bootstrap/replay-timer-runtime.ts`; `js/core_replay_timer_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_replay_timer_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_replay_timer_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_replay_timer_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-replay-timer-runtime.spec.ts tests/unit/core-replay-timer.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4305 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CO Replay-Lifecycle Bundle Runtime Retirement (2026-06-16)

## Phase Decision
- `WS-runtime-90`
  - status: done
  - progress: `CoreReplayLifecycleRuntime` remains installed from `src/bootstrap/replay-lifecycle-runtime.ts`; `js/core_replay_lifecycle_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_replay_lifecycle_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_replay_lifecycle_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_replay_lifecycle_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-replay-lifecycle-runtime.spec.ts tests/unit/core-replay-lifecycle.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4304 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CN Replay-Dispatch Bundle Runtime Retirement (2026-06-16)

## Phase Decision
- `WS-runtime-89`
  - status: done
  - progress: `CoreReplayDispatchRuntime` remains installed from `src/bootstrap/replay-dispatch-runtime.ts`; `js/core_replay_dispatch_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_replay_dispatch_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_replay_dispatch_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_replay_dispatch_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-replay-dispatch-runtime.spec.ts tests/unit/core-replay-dispatch.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4303 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CM Replay-Execution Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-88`
  - status: done
  - progress: `CoreReplayExecutionRuntime` remains installed from `src/bootstrap/replay-execution-runtime.ts`; `js/core_replay_execution_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_replay_execution_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_replay_execution_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_replay_execution_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-replay-execution-runtime.spec.ts tests/unit/core-replay-execution.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4302 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CL Replay-Import Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-87`
  - status: done
  - progress: `CoreReplayImportRuntime` remains installed from `src/bootstrap/replay-import-runtime.ts`; `js/core_replay_import_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_replay_import_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_replay_import_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_replay_import_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-replay-import-runtime.spec.ts tests/unit/core-replay-import.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4300 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CK Replay-V4-Actions Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-86`
  - status: done
  - progress: `CoreReplayV4ActionsRuntime` remains installed from `src/bootstrap/replay-v4-actions-runtime.ts`; `js/core_replay_v4_actions_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_replay_v4_actions_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_replay_v4_actions_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_replay_v4_actions_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-replay-v4-actions-runtime.spec.ts tests/unit/core-replay-v4-actions.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4299 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CJ Replay-Codec Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-85`
  - status: done
  - progress: `CoreReplayCodecRuntime` remains installed from `src/bootstrap/replay-codec-runtime.ts`; `js/core_replay_codec_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_replay_codec_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_replay_codec_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_replay_codec_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-replay-codec-runtime.spec.ts tests/unit/core-replay-codec.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4298 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CI Undo-Stack-Entry Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-84`
  - status: done
  - progress: `CoreUndoStackEntryRuntime` remains installed from `src/bootstrap/undo-stack-entry-runtime.ts`; `js/core_undo_stack_entry_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_undo_stack_entry_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_undo_stack_entry_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_undo_stack_entry_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-undo-stack-entry-runtime.spec.ts tests/unit/core-undo-stack-entry.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4297 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CH Undo-Restore-Payload Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-83`
  - status: done
  - progress: `CoreUndoRestorePayloadRuntime` remains installed from `src/bootstrap/undo-restore-payload-runtime.ts`; `js/core_undo_restore_payload_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_undo_restore_payload_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_undo_restore_payload_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_undo_restore_payload_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-undo-restore-payload-runtime.spec.ts tests/unit/core-undo-restore-payload.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4296 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CG Undo-Tile-Restore Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-82`
  - status: done
  - progress: `CoreUndoTileRestoreRuntime` remains installed from `src/bootstrap/undo-tile-restore-runtime.ts`; `js/core_undo_tile_restore_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_undo_tile_restore_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_undo_tile_restore_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_undo_tile_restore_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-undo-tile-restore-runtime.spec.ts tests/unit/core-undo-tile-restore.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4295 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CF Undo-Tile-Snapshot Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-81`
  - status: done
  - progress: `CoreUndoTileSnapshotRuntime` remains installed from `src/bootstrap/undo-tile-snapshot-runtime.ts`; `js/core_undo_tile_snapshot_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_undo_tile_snapshot_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_undo_tile_snapshot_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_undo_tile_snapshot_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-undo-tile-snapshot-runtime.spec.ts tests/unit/core-undo-tile-snapshot.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4294 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CE Undo-Snapshot Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-80`
  - status: done
  - progress: `CoreUndoSnapshotRuntime` remains installed from `src/bootstrap/undo-snapshot-runtime.ts`; `js/core_undo_snapshot_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_undo_snapshot_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_undo_snapshot_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_undo_snapshot_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-undo-snapshot-runtime.spec.ts tests/unit/core-undo-snapshot.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4293 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CD Undo-Restore Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-79`
  - status: done
  - progress: `CoreUndoRestoreRuntime` remains installed from `src/bootstrap/undo-restore-runtime.ts`; `js/core_undo_restore_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_undo_restore_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_undo_restore_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_undo_restore_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-undo-restore-runtime.spec.ts tests/unit/core-undo-restore.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4292 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CC Post-Undo-Record Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-78`
  - status: done
  - progress: `CorePostUndoRecordRuntime` remains installed from `src/bootstrap/post-undo-record-runtime.ts`; `js/core_post_undo_record_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_post_undo_record_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_post_undo_record_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_post_undo_record_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-post-undo-record-runtime.spec.ts tests/unit/core-post-undo-record.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4291 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CB Post-Move-Record Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-77`
  - status: done
  - progress: `CorePostMoveRecordRuntime` remains installed from `src/bootstrap/post-move-record-runtime.ts`; `js/core_post_move_record_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_post_move_record_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_post_move_record_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_post_move_record_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-post-move-record-runtime.spec.ts tests/unit/core-post-move-record.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4290 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1CA Post-Move Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-76`
  - status: done
  - progress: `CorePostMoveRuntime` remains installed from `src/bootstrap/post-move-runtime.ts`; `js/core_post_move_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_post_move_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_post_move_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_post_move_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-post-move-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4289 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- CI follow-up: `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-online-submit-persist-retry.smoke.spec.ts`
- CI follow-up: `npm run test:smoke:ci`
- `npm run verify:prepush`

# Stage-1BZ Merge-Effects Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-75`
  - status: done
  - progress: `CoreMergeEffectsRuntime` remains installed from `src/bootstrap/merge-effects-runtime.ts`; `js/core_merge_effects_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_merge_effects_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_merge_effects_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_merge_effects_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-merge-effects-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4288 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BY Scoring Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-74`
  - status: done
  - progress: `CoreScoringRuntime` remains installed from `src/bootstrap/scoring-runtime.ts`; `js/core_scoring_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_scoring_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_scoring_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_scoring_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-scoring-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4287 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BX Timer-Interval Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-73`
  - status: done
  - progress: `CoreTimerIntervalRuntime` remains installed from `src/bootstrap/timer-interval-runtime.ts`; `js/core_timer_interval_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_timer_interval_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_timer_interval_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_timer_interval_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-timer-interval-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4286 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BW Move-Path Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-72`
  - status: done
  - progress: `CoreMovePathRuntime` remains installed from `src/bootstrap/move-path-runtime.ts`; `js/core_move_path_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_move_path_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_move_path_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_move_path_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-move-path-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4285 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BV Move-Scan Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-71`
  - status: done
  - progress: `CoreMoveScanRuntime` remains installed from `src/bootstrap/move-scan-runtime.ts`; `js/core_move_scan_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_move_scan_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_move_scan_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_move_scan_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-move-scan-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4284 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BU Grid-Scan Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-70`
  - status: done
  - progress: `CoreGridScanRuntime` remains installed from `src/bootstrap/grid-scan-runtime.ts`; `js/core_grid_scan_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_grid_scan_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_grid_scan_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_grid_scan_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-grid-scan-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4283 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BT Direction-Lock Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-69`
  - status: done
  - progress: `CoreDirectionLockRuntime` remains installed from `src/bootstrap/direction-lock-runtime.ts`; `js/core_direction_lock_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_direction_lock_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_direction_lock_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_direction_lock_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-direction-lock-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4282 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BS Core-Mode Bundle Runtime Retirement (2026-06-15)

## Phase Decision
- `WS-runtime-68`
  - status: done
  - progress: `CoreModeRuntime` remains installed from `src/core/mode.ts`; `js/core_mode_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.
  - follow-up: `public/js/legacy_index_nomodule_loader.js` still references `core_mode_runtime.js` for separate legacy-browser policy work.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_mode_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_mode_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/core-mode.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4281 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BR Core-Mode Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-67`
  - status: done
  - progress: `CoreModeRuntime` is installed from `src/core/mode.ts`; `js/core_mode_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.
  - follow-up: Vite startup bundle retirement remains open because `vite.config.ts` still includes `core_mode_runtime.js` by policy for a separate bundle-retirement PR.

## Evidence
- RED: `npx vitest run tests/unit/core-mode.spec.ts` failed before `src/core/mode.ts` exported `createCoreModeRuntime` / `installCoreModeRuntime`.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` included `core_mode_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while active manifests referenced `core_mode_runtime.js`, then passed after manifest removal.
- GREEN: `npx vitest run tests/unit/core-mode.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4280 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BQ Mode-Catalog Bundle Runtime Retirement (2026-06-14)

## Phase Decision
- `WS-runtime-66`
  - status: done
  - progress: `CoreModeCatalogRuntime` remains installed from `src/bootstrap/mode-catalog.ts`; `js/core_mode_catalog_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_mode_catalog_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_mode_catalog_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/bootstrap-mode-catalog.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4279 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BP Rules Bundle Runtime Retirement (2026-06-14)

## Phase Decision
- `WS-runtime-65`
  - status: done
  - progress: `CoreRulesRuntime` remains installed from `src/core/rules.ts`; `js/core_rules_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_rules_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_rules_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/core-rules.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4279 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BO Crypto-Random Bundle Runtime Retirement (2026-06-14)

## Phase Decision
- `WS-runtime-64`
  - status: done
  - progress: `CoreCryptoRandomRuntime` remains installed from `src/utils/crypto-random.ts`; `js/core_crypto_random_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_crypto_random_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_crypto_random_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/crypto-random.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4279 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BN Special-Rules Bundle Runtime Retirement (2026-06-14)

## Phase Decision
- `WS-runtime-63`
  - status: done
  - progress: `CoreSpecialRulesRuntime` remains installed from `src/core/special-rules.ts`; `js/core_special_rules_runtime.js` is no longer included in the Vite-generated home startup bundle list in `vite.config.ts`.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` included `core_special_rules_runtime.js`.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_special_rules_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/core-special-rules.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4279 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BM Home-Guide Bundle Runtime Retirement (2026-06-14)

## Phase Decision
- `WS-runtime-62`
  - status: done
  - progress: `CoreHomeGuideRuntime` remains installed from `src/bootstrap/home-guide.ts`; `js/core_home_guide_runtime.js` is no longer included in the Vite-generated home deferred bundle list in `vite.config.ts`.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` existed.
- RED/GREEN: `npm run audit:entry-manifest` failed while `vite.config.ts` referenced `core_home_guide_runtime.js`, then passed after removal.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- `PW_WEB_PORT=4276 npm run test:smoke:index-ui`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BL Special-Rules Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-61`
  - status: done
  - progress: `CoreSpecialRulesRuntime` is installed from `src/core/special-rules.ts`; `js/core_special_rules_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/core-special-rules.spec.ts` failed before `createSpecialRulesRuntime` / `installSpecialRulesRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the special-rules runtime retirement entry.
- GREEN: `npx vitest run tests/unit/core-special-rules.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_special_rules_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BK Crypto-Random Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-60`
  - status: done
  - progress: `CoreCryptoRandomRuntime` is installed from `src/utils/crypto-random.ts`; `js/core_crypto_random_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/crypto-random.spec.ts` failed before `createCryptoRandomRuntime` / `installCryptoRandomRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the crypto-random runtime retirement entry.
- GREEN: `npx vitest run tests/unit/crypto-random.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_crypto_random_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BJ Rules Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-59`
  - status: done
  - progress: `CoreRulesRuntime` is installed from `src/core/rules.ts`; `js/core_rules_runtime.js` is no longer referenced by active play/replay/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/core-rules.spec.ts` failed before `createRulesRuntime` / `installRulesRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the rules runtime retirement entry.
- GREEN: `npx vitest run tests/unit/core-rules.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_rules_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BI Mode-Catalog Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-58`
  - status: done
  - progress: `CoreModeCatalogRuntime` is installed from `src/bootstrap/mode-catalog.ts`; `js/core_mode_catalog_runtime.js` is no longer referenced by active play/replay/home runtime manifests or `src/entries/capped.ts`.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-mode-catalog.spec.ts` failed before `createModeCatalogRuntime` / `installModeCatalogRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the mode-catalog retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-mode-catalog.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests and capped entry no longer reference `core_mode_catalog_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BH Undo-Action Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-57`
  - status: done
  - progress: `CoreUndoActionRuntime` is installed from `src/bootstrap/undo-action.ts`; `js/core_undo_action_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-undo-action.spec.ts` failed before `createUndoActionRuntime` / `installUndoActionRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the undo-action retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-undo-action.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_undo_action_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BG Practice-Mode Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-56`
  - status: done
  - progress: `CorePracticeModeRuntime` is installed from `src/bootstrap/practice-mode.ts`; `js/core_practice_mode_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-practice-mode.spec.ts` failed before `createPracticeModeRuntime` / `installPracticeModeRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the practice-mode retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-practice-mode.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_practice_mode_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BF Home-Mode Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-55`
  - status: done
  - progress: `CoreHomeModeRuntime` is installed from `src/bootstrap/home-mode.ts`; `js/core_home_mode_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-mode.spec.ts` failed before `createHomeModeRuntime` / `installHomeModeRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-mode retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-mode.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_mode_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BE Home-Runtime-Contract TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-54`
  - status: done
  - progress: `CoreHomeRuntimeContractRuntime` is installed from `src/bootstrap/home-runtime-contract.ts`; `js/core_home_runtime_contract_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-runtime-contract.spec.ts` failed before `createHomeRuntimeContractRuntime` / `installHomeRuntimeContractRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-runtime-contract retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-runtime-contract.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_runtime_contract_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BD Home-Page-Host Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-53`
  - status: done
  - progress: `CoreHomePageHostRuntime` is installed from `src/bootstrap/home-page-host.ts`; `js/core_home_page_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-page-host.spec.ts` failed before `createHomePageHostRuntime` / `installHomePageHostRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-page-host retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-page-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_page_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BC Home-Startup-Host Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-52`
  - status: done
  - progress: `CoreHomeStartupHostRuntime` is installed from `src/bootstrap/home-startup-host.ts`; `js/core_home_startup_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-startup-host.spec.ts` failed before `createHomeStartupHostRuntime` / `installHomeStartupHostRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-startup-host retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-startup-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_startup_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BB Home-Guide-Step-View-Host Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-51`
  - status: done
  - progress: `CoreHomeGuideStepViewHostRuntime` is installed from `src/bootstrap/home-guide-step-view-host.ts`; `js/core_home_guide_step_view_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-guide-step-view-host.spec.ts` failed before `createHomeGuideStepViewHostRuntime` / `installHomeGuideStepViewHostRuntime` existed and while the TS step-view scheduled a banner reposition callback instead of `positionHomeGuidePanel`.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-guide-step-view-host retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-guide-step-view-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_guide_step_view_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1BA Home-Guide-Dom-Host Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-50`
  - status: done
  - progress: `CoreHomeGuideDomHostRuntime` is installed from `src/bootstrap/home-guide-dom-host.ts`; `js/core_home_guide_dom_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-guide-dom-host.spec.ts` failed before `createHomeGuideDomHostRuntime` / `installHomeGuideDomHostRuntime` existed and while the TS DOM host still created `home-guide-message-banner` for `homeGuideState.panel`.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-guide-dom-host retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-guide-dom-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_guide_dom_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AZ Home-Guide Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-49`
  - status: done
  - progress: `CoreHomeGuideRuntime` is installed from `src/bootstrap/home-guide.ts`; `js/core_home_guide_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-guide.spec.ts` failed before `createHomeGuideRuntime` / `installHomeGuideRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-guide runtime retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-guide.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_guide_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AY Home-Guide-Page-Host Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-48`
  - status: done
  - progress: `CoreHomeGuidePageHostRuntime` is installed from `src/bootstrap/home-guide-page-host.ts`; `js/core_home_guide_page_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-guide-page-host.spec.ts` failed before `createHomeGuidePageHostRuntime` / `installHomeGuidePageHostRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-guide-page-host retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-guide-page-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_guide_page_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AX Home-Guide-Startup-Host Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-47`
  - status: done
  - progress: `CoreHomeGuideStartupHostRuntime` is installed from `src/bootstrap/home-guide-startup-host.ts`; `js/core_home_guide_startup_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-guide-startup-host.spec.ts` failed before `createHomeGuideStartupHostRuntime` / `installHomeGuideStartupHostRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-guide-startup-host retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-guide-startup-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_guide_startup_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AW Home-Guide-Settings-Host Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-46`
  - status: done
  - progress: `CoreHomeGuideSettingsHostRuntime` is installed from `src/bootstrap/home-guide-settings-host.ts`; `js/core_home_guide_settings_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-guide-settings-host.spec.ts` failed before `createHomeGuideSettingsHostRuntime` / `installHomeGuideSettingsHostRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-guide-settings-host retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-guide-settings-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_guide_settings_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AV Home-Guide-Step-Host Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-45`
  - status: done
  - progress: `CoreHomeGuideStepHostRuntime` is installed from `src/bootstrap/home-guide-step-host.ts`; `js/core_home_guide_step_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-guide-step-host.spec.ts` failed before `createHomeGuideStepHostRuntime` / `installHomeGuideStepHostRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-guide-step-host retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-guide-step-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_guide_step_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AU Home-Guide-Step-Flow-Host Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-44`
  - status: done
  - progress: `CoreHomeGuideStepFlowHostRuntime` is installed from `src/bootstrap/home-guide-step-flow-host.ts`; `js/core_home_guide_step_flow_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-guide-step-flow-host.spec.ts` failed before `createHomeGuideStepFlowHostRuntime` / `installHomeGuideStepFlowHostRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-guide-step-flow-host retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-guide-step-flow-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_guide_step_flow_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AT Home-Guide-Controls-Host Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-43`
  - status: done
  - progress: `CoreHomeGuideControlsHostRuntime` is installed from `src/bootstrap/home-guide-controls-host.ts`; `js/core_home_guide_controls_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-guide-controls-host.spec.ts` failed before `createHomeGuideControlsHostRuntime` / `installHomeGuideControlsHostRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-guide-controls-host retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-guide-controls-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_guide_controls_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AS Home-Guide-Start-Host Runtime TS Boundary (2026-06-14)

## Phase Decision
- `WS-runtime-42`
  - status: done
  - progress: `CoreHomeGuideStartHostRuntime` is installed from `src/bootstrap/home-guide-start-host.ts`; `js/core_home_guide_start_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-guide-start-host.spec.ts` failed before `createHomeGuideStartHostRuntime` / `installHomeGuideStartHostRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-guide-start-host retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-guide-start-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_guide_start_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AR Home-Guide-Finish-Host Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-41`
  - status: done
  - progress: `CoreHomeGuideFinishHostRuntime` is installed from `src/bootstrap/home-guide-finish-host.ts`; `js/core_home_guide_finish_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-guide-finish-host.spec.ts` failed before `createHomeGuideFinishHostRuntime` / `installHomeGuideFinishHostRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-guide-finish-host retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-guide-finish-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_guide_finish_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AQ Home-Guide-Panel-Host Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-40`
  - status: done
  - progress: `CoreHomeGuidePanelHostRuntime` is installed from `src/bootstrap/home-guide-panel-host.ts`; `js/core_home_guide_panel_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-home-guide-panel-host.spec.ts` failed before `createHomeGuidePanelHostRuntime` / `installHomeGuidePanelHostRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-guide-panel-host retirement entry.
- GREEN: `npx vitest run tests/unit/bootstrap-home-guide-panel-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_guide_panel_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AP Home-Guide-Highlight-Host Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-39`
  - status: done
  - progress: `CoreHomeGuideHighlightHostRuntime` is installed from `src/bootstrap/home-guide-highlight-host.ts`; `js/core_home_guide_highlight_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-guide-highlight-host retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-home-guide-highlight-host.spec.ts` failed before `createHomeGuideHighlightHostRuntime` / `installHomeGuideHighlightHostRuntime` existed.
- GREEN: `npx vitest run tests/unit/bootstrap-home-guide-highlight-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_guide_highlight_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AO Home-Guide-Done-Notice-Host Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-38`
  - status: done
  - progress: `CoreHomeGuideDoneNoticeHostRuntime` is installed from `src/bootstrap/home-guide-done-notice-host.ts`; `js/core_home_guide_done_notice_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the home-guide-done-notice-host retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-home-guide-done-notice-host.spec.ts` failed before `createHomeGuideDoneNoticeHostRuntime` / `installHomeGuideDoneNoticeHostRuntime` existed.
- GREEN: `npx vitest run tests/unit/bootstrap-home-guide-done-notice-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_home_guide_done_notice_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AN Index-UI-Startup-Host Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-37`
  - status: done
  - progress: `CoreIndexUiStartupHostRuntime` is installed from `src/bootstrap/index-ui-startup-host.ts`; `js/core_index_ui_startup_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the index-ui-startup-host retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-index-ui-startup-host.spec.ts` failed before `createIndexUiStartupHostRuntime` / `installIndexUiStartupHostRuntime` existed.
- GREEN: `npx vitest run tests/unit/bootstrap-index-ui-startup-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_index_ui_startup_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AM Game-Over-Undo-Host Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-36`
  - status: done
  - progress: `CoreGameOverUndoHostRuntime` is installed from `src/bootstrap/game-over-undo-host.ts`; `js/core_game_over_undo_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the game-over-undo-host retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-game-over-undo-host.spec.ts` failed before `createGameOverUndoHostRuntime` / `installGameOverUndoHostRuntime` existed.
- GREEN: `npx vitest run tests/unit/bootstrap-game-over-undo-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_game_over_undo_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AL Responsive-Relayout-Host Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-35`
  - status: done
  - progress: `CoreResponsiveRelayoutHostRuntime` is installed from `src/bootstrap/responsive-relayout-host.ts`; `js/core_responsive_relayout_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the responsive-relayout-host retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-responsive-relayout-host.spec.ts` failed before `createResponsiveRelayoutHostRuntime` / `installResponsiveRelayoutHostRuntime` existed.
- GREEN: `npx vitest run tests/unit/bootstrap-responsive-relayout-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_responsive_relayout_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AK Responsive-Relayout Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-34`
  - status: done
  - progress: `CoreResponsiveRelayoutRuntime` is installed from `src/bootstrap/responsive-relayout.ts`; `js/core_responsive_relayout_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the responsive-relayout retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-responsive-relayout-runtime.spec.ts` failed before `createResponsiveRelayoutRuntime` / `installResponsiveRelayoutRuntime` existed.
- GREEN: `npx vitest run tests/unit/bootstrap-responsive-relayout.spec.ts tests/unit/bootstrap-responsive-relayout-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_responsive_relayout_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AJ Pretty-Time Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-33`
  - status: done
  - progress: `CorePrettyTimeRuntime` is installed from `src/bootstrap/pretty-time.ts`; `js/core_pretty_time_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the pretty-time retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-pretty-time-runtime.spec.ts` failed before `createPrettyTimeRuntime` / `installPrettyTimeRuntime` existed.
- GREEN: `npx vitest run tests/unit/bootstrap-pretty-time.spec.ts tests/unit/bootstrap-pretty-time-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_pretty_time_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AI Settings-Modal-Page-Host Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-32`
  - status: done
  - progress: `CoreSettingsModalPageHostRuntime` is installed from `src/bootstrap/settings-modal-page-host.ts`; `js/core_settings_modal_page_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the settings-modal-page-host retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-settings-modal-page-host-runtime.spec.ts` failed before `createSettingsModalPageHostRuntime` / `installSettingsModalPageHostRuntime` existed.
- GREEN: `npx vitest run tests/unit/bootstrap-settings-modal-page-host.spec.ts tests/unit/bootstrap-settings-modal-page-host-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_settings_modal_page_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AH Settings-Modal-Host Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-31`
  - status: done
  - progress: `CoreSettingsModalHostRuntime` is installed from `src/bootstrap/settings-modal-host.ts`; `js/core_settings_modal_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the settings-modal-host retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-settings-modal-host-runtime.spec.ts` failed before `createSettingsModalHostRuntime` / `installSettingsModalHostRuntime` existed.
- GREEN: `npx vitest run tests/unit/bootstrap-settings-modal-host.spec.ts tests/unit/bootstrap-settings-modal-host-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_settings_modal_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AG Replay-Modal Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-30`
  - status: done
  - progress: `CoreReplayModalRuntime` is installed from `src/bootstrap/replay-modal.ts`; `js/core_replay_modal_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the replay-modal retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-replay-modal-runtime.spec.ts` failed before `createReplayModalRuntime` / `installReplayModalRuntime` existed.
- GREEN: `npx vitest run tests/unit/bootstrap-replay-modal.spec.ts tests/unit/bootstrap-replay-modal-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_replay_modal_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AF Replay-Page-Host Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-29`
  - status: done
  - progress: `CoreReplayPageHostRuntime` is installed from `src/bootstrap/replay-page-host.ts`; `js/core_replay_page_host_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the replay-page-host retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-replay-page-host-runtime.spec.ts` failed before `createReplayPageHostRuntime` / `installReplayPageHostRuntime` existed.
- GREEN: `npx vitest run tests/unit/bootstrap-replay-page-host.spec.ts tests/unit/bootstrap-replay-page-host-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_replay_page_host_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AE Replay-Export Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-28`
  - status: done
  - progress: `CoreReplayExportRuntime` is installed from `src/bootstrap/replay-export.ts`; `js/core_replay_export_runtime.js` is no longer referenced by active play/home runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/bootstrap-replay-export.spec.ts` failed before TypeScript replay export preserved the legacy `format` result field.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the replay-export retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-replay-export-runtime.spec.ts` failed before `createReplayExportRuntime` / `installReplayExportRuntime` existed.
- GREEN: `npx vitest run tests/unit/bootstrap-replay-export.spec.ts tests/unit/bootstrap-replay-export-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_replay_export_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AD Replay-Import Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-27`
  - status: done
  - progress: `CoreReplayImportRuntime` is installed from `src/bootstrap/replay-import-runtime.ts`; `js/core_replay_import_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the replay-import retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-replay-import-runtime.spec.ts` failed before `src/bootstrap/replay-import-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-import.spec.ts tests/unit/bootstrap-replay-import-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_replay_import_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AC Replay-V4-Actions Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-26`
  - status: done
  - progress: `CoreReplayV4ActionsRuntime` is installed from `src/bootstrap/replay-v4-actions-runtime.ts`; `js/core_replay_v4_actions_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the replay-v4-actions retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-replay-v4-actions-runtime.spec.ts` failed before `src/bootstrap/replay-v4-actions-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-v4-actions.spec.ts tests/unit/bootstrap-replay-v4-actions-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_replay_v4_actions_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AB Replay-Codec Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-25`
  - status: done
  - progress: `CoreReplayCodecRuntime` is installed from `src/bootstrap/replay-codec-runtime.ts`; `js/core_replay_codec_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the replay-codec retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-replay-codec-runtime.spec.ts` failed before `src/bootstrap/replay-codec-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-codec.spec.ts tests/unit/bootstrap-replay-codec-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_replay_codec_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1AA Replay-Execution Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-24`
  - status: done
  - progress: `CoreReplayExecutionRuntime` is installed from `src/bootstrap/replay-execution-runtime.ts`; `js/core_replay_execution_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the replay-execution retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-replay-execution-runtime.spec.ts` failed before `src/bootstrap/replay-execution-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-execution.spec.ts tests/unit/bootstrap-replay-execution-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_replay_execution_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1Z Replay-Dispatch Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-23`
  - status: done
  - progress: `CoreReplayDispatchRuntime` is installed from `src/bootstrap/replay-dispatch-runtime.ts`; `js/core_replay_dispatch_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the replay-dispatch retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-replay-dispatch-runtime.spec.ts` failed before `src/bootstrap/replay-dispatch-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-dispatch.spec.ts tests/unit/bootstrap-replay-dispatch-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_replay_dispatch_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1Y Replay-Lifecycle Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-22`
  - status: done
  - progress: `CoreReplayLifecycleRuntime` is installed from `src/bootstrap/replay-lifecycle-runtime.ts`; `js/core_replay_lifecycle_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the replay-lifecycle retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-replay-lifecycle-runtime.spec.ts` failed before `src/bootstrap/replay-lifecycle-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-lifecycle.spec.ts tests/unit/bootstrap-replay-lifecycle-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_replay_lifecycle_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1X Replay-Loop Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-21`
  - status: done
  - progress: `CoreReplayLoopRuntime` is installed from `src/bootstrap/replay-loop-runtime.ts`; `js/core_replay_loop_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the replay-loop retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-replay-loop-runtime.spec.ts` failed before `src/bootstrap/replay-loop-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-loop.spec.ts tests/unit/bootstrap-replay-loop-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_replay_loop_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1W Replay-Control Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-20`
  - status: done
  - progress: `CoreReplayControlRuntime` is installed from `src/bootstrap/replay-control-runtime.ts`; `js/core_replay_control_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the replay-control retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-replay-control-runtime.spec.ts` failed before `src/bootstrap/replay-control-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-control.spec.ts tests/unit/bootstrap-replay-control-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_replay_control_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1V Replay-Flow Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-19`
  - status: done
  - progress: `CoreReplayFlowRuntime` is installed from `src/bootstrap/replay-flow-runtime.ts`; `js/core_replay_flow_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the replay-flow retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-replay-flow-runtime.spec.ts` failed before `src/bootstrap/replay-flow-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-flow.spec.ts tests/unit/bootstrap-replay-flow-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_replay_flow_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1U Replay-Timer Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-18`
  - status: done
  - progress: `CoreReplayTimerRuntime` is installed from `src/bootstrap/replay-timer-runtime.ts`; `js/core_replay_timer_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the replay-timer retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-replay-timer-runtime.spec.ts` failed before `src/bootstrap/replay-timer-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-timer.spec.ts tests/unit/bootstrap-replay-timer-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_replay_timer_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1T Move-Apply Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-17`
  - status: done
  - progress: `CoreMoveApplyRuntime` is installed from `src/bootstrap/move-apply-runtime.ts`; `js/core_move_apply_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the move-apply retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-move-apply-runtime.spec.ts` failed before `src/bootstrap/move-apply-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-move-apply.spec.ts tests/unit/bootstrap-move-apply-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_move_apply_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1S Undo-Restore Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-16`
  - status: done
  - progress: `CoreUndoRestoreRuntime` is installed from `src/bootstrap/undo-restore-runtime.ts`; `js/core_undo_restore_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the undo-restore retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-undo-restore-runtime.spec.ts` failed before `src/bootstrap/undo-restore-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-undo-restore.spec.ts tests/unit/bootstrap-undo-restore-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_undo_restore_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1R Undo-Stack-Entry Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-15`
  - status: done
  - progress: `CoreUndoStackEntryRuntime` is installed from `src/bootstrap/undo-stack-entry-runtime.ts`; `js/core_undo_stack_entry_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the undo-stack-entry retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-undo-stack-entry-runtime.spec.ts` failed before `src/bootstrap/undo-stack-entry-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-undo-stack-entry.spec.ts tests/unit/bootstrap-undo-stack-entry-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_undo_stack_entry_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1Q Undo-Restore-Payload Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-14`
  - status: done
  - progress: `CoreUndoRestorePayloadRuntime` is installed from `src/bootstrap/undo-restore-payload-runtime.ts`; `js/core_undo_restore_payload_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the undo-restore-payload retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-undo-restore-payload-runtime.spec.ts` failed before `src/bootstrap/undo-restore-payload-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-undo-restore-payload.spec.ts tests/unit/bootstrap-undo-restore-payload-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_undo_restore_payload_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1P Undo-Tile-Restore Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-13`
  - status: done
  - progress: `CoreUndoTileRestoreRuntime` is installed from `src/bootstrap/undo-tile-restore-runtime.ts`; `js/core_undo_tile_restore_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the undo-tile-restore retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-undo-tile-restore-runtime.spec.ts` failed before `src/bootstrap/undo-tile-restore-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-undo-tile-restore.spec.ts tests/unit/bootstrap-undo-tile-restore-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_undo_tile_restore_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1O Undo-Tile-Snapshot Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-12`
  - status: done
  - progress: `CoreUndoTileSnapshotRuntime` is installed from `src/bootstrap/undo-tile-snapshot-runtime.ts`; `js/core_undo_tile_snapshot_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the undo-tile-snapshot retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-undo-tile-snapshot-runtime.spec.ts` failed before `src/bootstrap/undo-tile-snapshot-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-undo-tile-snapshot.spec.ts tests/unit/bootstrap-undo-tile-snapshot-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_undo_tile_snapshot_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1N Post-Undo-Record Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-11`
  - status: done
  - progress: `CorePostUndoRecordRuntime` is installed from `src/bootstrap/post-undo-record-runtime.ts`; `js/core_post_undo_record_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the post-undo-record retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-post-undo-record-runtime.spec.ts` failed before `src/bootstrap/post-undo-record-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-post-undo-record.spec.ts tests/unit/bootstrap-post-undo-record-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_post_undo_record_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1M Move-Path Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-10`
  - status: done
  - progress: `CoreMovePathRuntime` is installed from `src/bootstrap/move-path-runtime.ts`; `js/core_move_path_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the move-path retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-move-path-runtime.spec.ts` failed before `src/bootstrap/move-path-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-move-path.spec.ts tests/unit/bootstrap-move-path-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_move_path_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1L Move-Scan Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-09`
  - status: done
  - progress: `CoreMoveScanRuntime` is installed from `src/bootstrap/move-scan-runtime.ts`; `js/core_move_scan_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the move-scan retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-move-scan-runtime.spec.ts` failed before `src/bootstrap/move-scan-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-move-scan.spec.ts tests/unit/bootstrap-move-scan-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_move_scan_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1K Grid-Scan Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-08`
  - status: done
  - progress: `CoreGridScanRuntime` is installed from `src/bootstrap/grid-scan-runtime.ts`; `js/core_grid_scan_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the grid-scan retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-grid-scan-runtime.spec.ts` failed before `src/bootstrap/grid-scan-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-grid-scan.spec.ts tests/unit/bootstrap-grid-scan-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_grid_scan_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1J Direction-Lock Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-07`
  - status: done
  - progress: `CoreDirectionLockRuntime` is installed from `src/bootstrap/direction-lock-runtime.ts`; `js/core_direction_lock_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the direction-lock retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-direction-lock-runtime.spec.ts` failed before `src/bootstrap/direction-lock-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-direction-lock.spec.ts tests/unit/bootstrap-direction-lock-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_direction_lock_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1I Undo-Snapshot Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-06`
  - status: done
  - progress: `CoreUndoSnapshotRuntime` is installed from `src/bootstrap/undo-snapshot-runtime.ts`; `js/core_undo_snapshot_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the undo-snapshot retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-undo-snapshot-runtime.spec.ts` failed before `src/bootstrap/undo-snapshot-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-undo-snapshot.spec.ts tests/unit/bootstrap-undo-snapshot-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_undo_snapshot_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1H Post-Move-Record Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-05`
  - status: done
  - progress: `CorePostMoveRecordRuntime` is installed from `src/bootstrap/post-move-record-runtime.ts`; `js/core_post_move_record_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the post-move-record retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-post-move-record-runtime.spec.ts` failed before `src/bootstrap/post-move-record-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-post-move-record.spec.ts tests/unit/bootstrap-post-move-record-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_post_move_record_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1G Merge-Effects Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-04`
  - status: done
  - progress: `CoreMergeEffectsRuntime` is installed from `src/bootstrap/merge-effects-runtime.ts`; `js/core_merge_effects_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the merge-effects retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-merge-effects-runtime.spec.ts` failed before `src/bootstrap/merge-effects-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-merge-effects.spec.ts tests/unit/bootstrap-merge-effects-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_merge_effects_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1F Post-Move Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-03`
  - status: done
  - progress: `CorePostMoveRuntime` is installed from `src/bootstrap/post-move-runtime.ts`; `js/core_post_move_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the post-move retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-post-move-runtime.spec.ts` failed before `src/bootstrap/post-move-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-post-move.spec.ts tests/unit/bootstrap-post-move-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_post_move_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1E Scoring Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-02`
  - status: done
  - progress: `CoreScoringRuntime` is installed from `src/bootstrap/scoring-runtime.ts`; `js/core_scoring_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the scoring retirement entry.
- RED: `npx vitest run tests/unit/bootstrap-scoring-runtime.spec.ts` failed before `src/bootstrap/scoring-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-scoring.spec.ts tests/unit/bootstrap-scoring-runtime.spec.ts`
- `npm run audit:entry-manifest` reports active manifests no longer reference `core_scoring_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1D Timer Interval Runtime TS Boundary (2026-06-13)

## Phase Decision
- `WS-runtime-01`
  - status: done
  - progress: `CoreTimerIntervalRuntime` is installed from `src/bootstrap/timer-interval-runtime.ts`; `js/core_timer_interval_runtime.js` is no longer referenced by active play/home/capped runtime manifests.

## Evidence
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `ensureRetiredRuntimeScriptAbsent` existed.
- RED: `npx vitest run tests/unit/bootstrap-timer-interval-runtime.spec.ts` failed before `src/bootstrap/timer-interval-runtime.ts` existed.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-timer-interval.spec.ts tests/unit/bootstrap-timer-interval-runtime.spec.ts`
- `npm run audit:entry-manifest` reports the active manifests no longer reference `core_timer_interval_runtime.js`.
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`

# Stage-1C Service Boundary Allowlist Zero (2026-06-13)

## Phase Decision
- `WS6-01A`
  - status: done
  - progress: `DIRECT_SERVICE_USAGE_ALLOWLIST` is empty. `admin_rescue_client_runtime.js` no longer calls browser storage or API transport directly; it consumes the typed `AdminRescueClientServiceBoundary` installed during home-family bootstrap.

## Evidence
- RED: `npx vitest run tests/unit/service-boundary-audit-helpers.spec.ts` failed while `js/admin_rescue_client_runtime.js` was allowlisted.
- GREEN: `npx vitest run tests/unit/service-boundary-audit-helpers.spec.ts tests/unit/admin-rescue-client-runtime.spec.ts`
- `npm run audit:service-boundary` reports `violations=0` with an empty allowlist.
- `npm run audit:page-legacy-runtime-boundary` reports `legacyImports=0`.
- `npm run audit:game-manager`
- `npm run build`

# Stage-1B Page Legacy Allowlist Zero Delta (2026-06-13)

## Phase Decision
- `WS4-03-next`
  - status: done
  - progress: `PAGE_LEGACY_IMPORT_ALLOWLIST` is empty; page shells no longer import `../../js/*.js` directly. Legacy runtime side effects are isolated behind explicit `src/bootstrap/*-legacy-runtime.ts` adapters for follow-up owner replacement.

## Evidence
- `node scripts/page-legacy-runtime-boundary-audit.mjs` reports `legacyImports=0`
- `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts tests/unit/account-settings-page-bootstrap.spec.ts`
- `npx tsc --noEmit`
- direct-page refactor-contract smoke for account/account-settings/palette/password/register/user-profile
- shared settings, account, and user-profile smoke coverage

# Stage-1B History Local Store Delta (2026-06-13)

## Phase Decision
- `WS4-03-next`
  - status: in_progress
  - progress: `history-page.ts` no longer imports any `../../js/*.js` legacy runtime directly and has been removed from `PAGE_LEGACY_IMPORT_ALLOWLIST`. History store access is injected through the page runtime boundary.

## Evidence
- `node scripts/page-legacy-runtime-boundary-audit.mjs` reports `legacyImports=15`
- `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts tests/unit/history-page-runtime.spec.ts`
- `npx tsc --noEmit`
- history record smoke coverage
- `npx playwright test --config=playwright.refactor-contract.config.ts tests/refactor-contract/pages-history-page-system.smoke.spec.ts`

# Stage-1B History Storage Runtime Delta (2026-06-13)

## Phase Decision
- `WS4-03-next`
  - status: in_progress
  - progress: `history-page.ts` removed the legacy `core_game_settings_storage_runtime.js` page import; history record normalization now uses a TypeScript adapter over `src/core/game-settings-storage.ts`.

## Evidence
- `node scripts/page-legacy-runtime-boundary-audit.mjs` reports `legacyImports=16`
- `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts tests/unit/history-page-controller.spec.ts`
- `npx tsc --noEmit`
- history record smoke coverage
- `npx playwright test --config=playwright.refactor-contract.config.ts tests/refactor-contract/pages-history-page-system.smoke.spec.ts`

# Stage-1B History Mode Catalog Delta (2026-06-13)

## Phase Decision
- `WS4-03-next`
  - status: in_progress
  - progress: `history-page.ts` removed the legacy `mode_catalog.js` page import; history mode catalog resolution is now injected through the page runtime/controller boundary.

## Evidence
- `node scripts/page-legacy-runtime-boundary-audit.mjs` reports `legacyImports=17`
- `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts tests/unit/history-page-runtime.spec.ts`
- `npm run audit:service-boundary`
- `npx tsc --noEmit`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/history-records-import-mode-filter.smoke.spec.ts`
- `npx playwright test --config=playwright.refactor-contract.config.ts tests/refactor-contract/pages-history-page-system.smoke.spec.ts`

# Stage-1B History Theme Delta (2026-06-13)

## Phase Decision
- `WS4-03-next`
  - status: in_progress
  - progress: `history-page.ts` removed the legacy `theme_manager.js` page import; remaining history imports are `mode_catalog`, `core_game_settings_storage_runtime`, and `local_history_store`.

## Evidence
- `node scripts/page-legacy-runtime-boundary-audit.mjs` reports `legacyImports=18`
- `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`
- `npx playwright test --config=playwright.refactor-contract.config.ts tests/refactor-contract/pages-history-page-system.smoke.spec.ts`
- history record smoke coverage
- shared night/background page smoke coverage

# Stage-1 Legacy Retirement Delta (2026-06-13)

## Phase Decision
- `WS4-03-next`
  - status: in_progress
  - progress: `modes-page.ts` removed one legacy page import, retained the saved night background visual contract, and left page smoke passing
- `WS6-01A`
  - status: in_progress
  - progress: operational page direct storage/API exceptions moved into typed `services/storage` owners
- `Refactor gate`
  - status: passing
  - progress: prepush audit blockers in replay autosubmit and saved-state helper size were reduced without behavior changes

## Evidence
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npm run audit:service-boundary`
- targeted Vitest suites for `browser-storage`, `api-client`, and `stone-2k-monitor`
- `npm run test:smoke:pages`
- `npm run build`
- `npm run verify:prepush`

# A-F Collaborative Delta (2026-03-22, Batch-WS4-03)

## Phase Decision
- `WS4-03`
  - page-shell legacy boundary: `enforced`
  - status: `done`
  - note: allowlist-based freeze is in place; de-legacy work proceeds by shrinking the allowlist

## New Priority Tasks
- `WS4-03`
  - task: `legacy-runtime-import boundary` for `src/pages/* -> ../../js/*.js`
  - owner: `A / C / E`
  - status: `done`
  - done: audit script + allowlist added, dynamic import scanned, gate blocks new legacy imports
- `WS4-03-next`
  - task: shrink allowlist page-by-page (remove legacy imports and delete allowlist entries)
  - owner: `A / C`
  - status: `pending`
  - done: each page shell no longer imports legacy runtime and is removed from allowlist

# A-F Collaborative Delta (2026-03-22, Batch-WS4-02D3)

## Phase Decision
- `WS4-02`
  - audited entries: `16`
  - remaining `direct-module`: `0`
  - status: `done`
- `WS4`
  - page-entry stage result: `stage pass`
  - remaining work: `WS4-03-next` allowlist shrink + page-shell de-legacy
- `WS6-01`
  - unchanged: `near stage pass`, not `done`

## Updated Snapshot
- `manifest-bootstrap`
  - `index / undo / capped / practice / pku2048 / play / replay / index_test`
  - `account / account-settings / history / register / password / modes / palette / user-profile`
- `direct-module`
  - `none`

## New Priority Tasks
- `WS4-02D2`
  - task: `user-profile` reclassification to `profile-history-replay` and final migration
  - owner: `A / C / F`
  - status: `done`
  - done: `user-profile` now uses `bootstrapDirectPage`, is present in `runtime-manifest`, has dedicated unit + page-system smoke, and drives remaining `direct-module` to `0`
- `WS4-03`
  - task: `legacy-runtime-import boundary` for `src/pages/* -> ../../js/*.js`
  - owner: `A / C / E`
  - status: `done`
  - done: allowlist-based boundary audit is enforced; new legacy imports in page shells are blocked

## F Sign-off Update
- `WS4 stage pass` has been reached for page-entry closure.
- `WS4 done` has not been reached; page-shell de-legacy and deeper feature extraction remain open.

# A-F Collaborative Delta (2026-03-22)

## Phase Decision
- `WS6-01`
  - 结论：`near stage pass`, not `done`
  - 已达成：`src+js direct localStorage = 0`、`src+js direct fetch = 0`、`service-boundary-audit` 已入 gate
  - 未达成：owner/exception 机制、扫描范围定义、连续 3 轮主分支 CI 证据落表、灰度可发布结论
- `WS4-02`
  - 结论：已从“入口盘点”转为“迁移决策”，不能继续按旧的“4 个散点页”口径推进
  - 当前口径：`16` 个已审计入口，其中 `3` 个仍是 `direct-module`

## Updated Snapshot
- `manifest-ready direct-module`
  - `none`
- `not-yet-manifested direct-module`
  - `register / password / user-profile`
- `main blockers`
  1. legacy shell 未退场
  2. `Engine/contracts` 不是唯一运行现实
  3. deploy 未被完整质量门禁阻断

## New Priority Tasks
- `WS4-02A`
  - task: `modes` bootstrap migration sample
  - owner: `C`
  - status: `done`
  - done: 已作为首个 `direct-module -> unified bootstrap` 样板页落地，并通过 `audit:entry-manifest` + `pages-modes-page-system` + `verify:prepush`
- `WS4-02B`
  - task: `palette` bootstrap migration sample
  - owner: `C`
  - status: `done`
  - done: 已作为第二个 `direct-module -> unified bootstrap` 样板页落地，并通过 `audit:entry-manifest` + `pages-palette-page-system` + `palette` 定向 smoke + `verify:prepush`
- `WS4-02C`
  - task: `history + account` page-system migration
  - owner: `C / A`
  - status: `done`
  - done: `history` 作为 `storage/contracts-first` 功能页样板、`account` 作为 `services/auth-first` 账号壳页样板完成迁移，并通过 `audit:entry-manifest` + dedicated page-system smoke + `verify:prepush`
- `WS4-02D`
  - task: `register + password` auth-security migration + `user-profile` reclassification to profile-history family
  - owner: `A / C / F`
  - status: `pending`
  - done: `account-settings` 已并入 unified bootstrap；剩余 `register / password / user-profile` 完成 family 重分类与迁移批次冻结
- `WS6-01A`
  - task: owner-aware `service-boundary` audit
  - owner: `D / E`
  - status: `in_progress`
  - done: 不仅拦语法形式，也拦未授权 owner 的直连路径
- `WS6-01B`
  - task: WS6 stability evidence table
  - owner: `D / E / F`
  - status: `pending`
  - done: 主分支连续 3 轮 CI 证据落表，可用于阶段性签收
- `CI-GATE-01`
  - task: deploy gate hardening
  - owner: `D / E`
  - status: `pending`
  - done: deploy 必须依赖 `verify:refactor:ci` 成功结果
- `QA-FLAKE-01`
  - task: smoke de-flake ledger
  - owner: `E`
  - status: `in_progress`
  - done: 已知 flaky 用例有台账、有 owner、有关闭条件
- `B-ENG-01`
  - task: single Engine session takeover
  - owner: `B`
  - status: `in_progress`
  - done: `play/undo/practice/replay` 不再依赖 `window.game_manager`
- `B-CONTRACT-01`
  - task: replay contract upgrade
  - owner: `B`
  - status: `in_progress`
  - done: `ReplayRecord/ReplayEnvelope` 覆盖实际支持格式并由 `src/core + src/contracts` 消费
- `B-COMP-01`
  - task: competition/submit contract formalization
  - owner: `B / D`
  - status: `pending`
  - done: `SubmitPayload`、`challenge_id`、比赛元数据进入正式 contract

## F Sign-off Conditions
- `WS4 stage pass`
  1. 页面信息架构冻结
  2. 4 个 `direct-module` 已被处置或写明退场批次
  3. 关键跨页路径稳定
  4. `audit:entry-manifest` 结论与用户可感知页面体系一致
- `WS6 stage pass`
  1. 技术边界闭合
  2. 用户可见链路无回归
  3. 连续稳定性证据足够
  4. 可以进入灰度发布窗口

# 里程碑推进看板
> 用途：把重构目标拆成可执行任务，并跟踪状态、阻塞、验收与发布节奏。
> 状态枚举：`pending` / `in_progress` / `blocked` / `done`
> 负责人标记：`A` 架构负责人，`B` 核心实施，`C` 应用与页面，`D` 平台与服务，`E` 质量与门禁，`F` 产品与验收

## 1. 里程碑总览

| 里程碑 | 目标 | 负责人 | 本周优先级 | 目标完成时间 | 当前状态 | 验收列（F sign-off） | 完成判定 |
|---|---|---|---|---|---|---|---|
| M1 停止增量污染 | 禁止 legacy 回流、入口散点增量 | A / E | P0 | 待定 | in_progress | F 先签字确认“无新增散点入口、无 legacy 回流” | 新增改动全部通过架构门禁 |
| M2 Engine 单核统一 | 核心状态变化统一入口 | B / E | P0 | 待定 | pending | F 确认主链路体验与行为一致 | 主链路无绕过 Engine 调用 |
| M3 contracts 统一 | 核心数据结构协议化 | B / D / E | P1 | 待定 | in_progress | F 确认数据展示、回放、提交格式可用 | 状态/回放/提交结构 contracts 化 |
| M4 页面体系重组 | 页面域与入口系统化 | C / A | P1 | 待定 | pending | F 确认导航、跳转、信息架构清晰 | 散点入口收敛并纳管 |
| M5 旧壳退场 | legacy 物理删除与防回流 | A / D / E | P1 | 待定 | pending | F 确认旧入口已退出用户路径 | legacy 依赖清零 |
| M6 PKU 正式化 | 比赛链路正式产品化 | C / D / F | P2 | 待定 | pending | F 以产品视角签字确认可发布 | 比赛/榜单/导播/观战可用且有测试 |

## 2. 当前任务池（按 Workstream）

| 任务ID | 任务 | Workstream | 负责人 | 本周优先级 | 截止日期 | 状态 | 阻塞项 | 验收列（F sign-off） | 验收命令 | DoD |
|---|---|---|---|---|---|---|---|---|---|---|
| WS1-01 | 盘点并标记所有 legacy 入口与调用点 | WS1 | A / D | P0 | 待定 | in_progress | 无 | F 确认看板中 legacy 清单完整、无遗漏入口 | `rg -n "legacy|runtime" js *.html src` | 形成清单并分级 |
| WS1-02 | 建立 legacy 回流门禁规则 | WS1 | E / A | P0 | 2026-03-21 | done | 无 | F 复核门禁覆盖 legacy-loader 导入与调用边界 | `npm run verify:prepush` | 已接入 `legacy-boundary-audit` 且全链路通过 |
| WS2-01 | 汇总绕过 Engine 的状态写入点 | WS2 | B / E | P0 | 2026-03-21 | done | 无 | F 复核首轮扫描范围与风险分级可接受 | unit/smoke + 扫描 | 已形成 Top10 清单与总量统计（22） |
| WS2-02 | undo/replay/import/export 统一引擎管线 | WS2 | B / C | P1 | 2026-03-24 | in_progress | 依赖 WS2-01 | F 确认撤回、回放、导入导出都可正常使用 | `npm run test:smoke:ci` | 已完成 move/undo/replay/restart/saved-state 写入收口，剩余 import/export 持续推进 |
| WS3-01 | 建立 contracts 覆盖矩阵（状态/回放/提交/同步） | WS3 | B / D | P1 | 2026-03-22 | done | 无 | F sign-off 已补证据表（WS3=pass） | `npm run test:unit` + `node scripts/contracts-matrix-audit.mjs` | 6 合同矩阵可追踪，含 `HistoryRecord` 且 unit+smoke 深度达标 |
| WS3-02 | 历史隐式结构迁移到 contracts | WS3 | C / D | P1 | 2026-03-22 | done | 无 | F sign-off 已补收口结论（WS3-02=pass） | unit + smoke + `npm run verify:prepush` | 主链路历史结构已统一走 runtime/contracts，fallback 仅保留兼容兜底 |
| WS4-01 | 页面信息架构与导航树落图 | WS4 | A / C | P1 | 2026-03-24 | in_progress | 产品边界确认 | F 确认入口层级和命名符合使用预期 | 文档评审 | 已完成首轮页面清单（17 html / 22 entries） |
| WS4-02 | 散点 html 入口纳管/归档 | WS4 | C / D | P1 | 2026-03-28 | in_progress | 依赖 WS4-01 | F 确认入口清单和页面分组清晰 | `npm run audit:entry-manifest` | 已纳管 16 个入口，剩余 3 个 `direct-module` 待迁移/决策 |
| WS5-01 | 页面到服务层调用改造（去直接规则、存储访问） | WS5 | C / D | P1 | 待定 | pending | 依赖 WS6 抽象 | F 确认页面交互未退化 | smoke + code audit | UI 与核心解耦 |
| WS6-01 | storage 抽象统一（history/settings/replay） | WS6 | D / B | P1 | 待定 | in_progress | 无 | F 确认设置、历史、回放行为一致 | `npm run test:unit` + `npm run test:smoke:ci` | 页面不直连 `localStorage`（`src` 层已清零；`js` 历史层待分批收口） |
| WS6-02 | API 层统一（leaderboard/submission/broadcast/account） | WS6 | D / C | P2 | 待定 | pending | 无 | F 确认对外能力可用且错误提示明确 | smoke + integration | 页面不直连业务 API 协议 |
| WS7-01 | PKU 页面域正式化并接入统一导航 | WS7 | C / F | P2 | 待定 | pending | IA 待确定 | F 确认 PKU 不再是隐藏页 | smoke | PKU 不再隐藏入口 |
| WS7-02 | PKU 观战/导播链路测试化 | WS7 | C / E | P2 | 待定 | pending | 测试夹具准备 | F 确认关键链路可回归 | smoke | 关键链路可回滚 |
| WS8-01 | 增加架构契约测试（Engine/contracts/legacy） | WS8 | E / A | P0 | 2026-03-22 | done | 无 | F sign-off 已补连续 CI 证据（WS8=pass） | `npm run verify:prepush` + GitHub Actions `Smoke` 连续 run | legacy/contracts matrix 门禁已落地并通过连续 CI 稳定性观察 |

## 3. F sign-off 通过条件模板

F sign-off 不是“看起来可以”，而是以下 4 项同时满足：

| 项目 | 通过条件 | 记录方式 |
|---|---|---|
| 体验 | 用户主路径无明显退化，入口、文案、跳转符合预期 | 在本列写 `pass` / `fail` + 一句话结论 |
| 业务 | 满足本任务的业务目标，例如普通游玩、账号体系、PKU 产品线 | 写明覆盖场景 |
| 证据 | 已完成对应单测、smoke 或人工回归 | 写明验证命令或截图编号 |
| 风险 | 已知风险已记录，且不影响当前发布窗口 | 写明 `none` 或风险摘要 |

模板：

| F sign-off 结果 | 体验 | 业务 | 证据 | 风险 | 备注 |
|---|---|---|---|---|---|
| `pass` / `fail` | `pass` / `fail` | `pass` / `fail` | `command or artifact` | `none` / `risk summary` | `short note` |

## 4. 首轮盘点快照（2026-03-21）

| 项目 | 结果 | 来源 |
|---|---|---|
| 入口总量 | `17 html` / `22 entry ts` | 主线程脚本扫描 |
| 主入口 legacy 残留 | `1`（`home-family-bootstrap.ts`） | 主线程扫描 + B 报告 |
| Engine 绕过疑似点 | `22` | B 报告 |
| 平台内非统一入口页面 | `4` | C 报告（`account_settings/register/password/user`） |
| `src/entries` 直接 localStorage / fetch | `2 / 0` | 主线程扫描 |
| `src+js` 总计 localStorage / fetch | `50 / 7` | 主线程扫描 |

## 5. 本周执行批次（模板）

| 批次 | 时间窗 | 目标 | 预计提交数 | 验证命令 | F sign-off | 结果 |
|---|---|---|---:|---|---|---|
| Batch-A | 周一-周二 | 先完成基线盘点与规则固化 | 2-4 | `npm run verify:prepush` | 预留 | 待执行 |
| Batch-B | 周三-周四 | 推进 Engine/contracts 收敛 | 2-5 | `npm run test:unit` + `npm run test:smoke:ci` | 预留 | 待执行 |
| Batch-C | 周五 | 文档收口与风险复盘 | 1-2 | `npm run verify:release-ready` | 预留 | 待执行 |

## 6. 发布节奏建议

推荐采用“灰度 -> 小流量全量 -> 全量”的节奏：

1. 灰度
   - 先在内部账号、测试账号或小范围用户上确认主路径。
   - 只放行已通过 F sign-off 的里程碑任务。
   - 重点观察错误率、页面可用性、回退是否容易。
2. 小流量全量
   - 灰度稳定后扩大到有限比例用户。
   - 继续关注体验反馈和回归信号。
   - 若出现阻断问题，立即回退到上一稳定版本。
3. 全量
   - 仅在单测、smoke、发布前验收全部通过后进行。
   - 发布后补一轮回归记录，更新 `EXECUTION_LOG.md`。

发布原则：
- 只允许“单批次、单目标、单验收”进入灰度。
- 没有 F sign-off 的任务，不进入发布窗口。
- 任何 P0 问题优先阻断发布，不做口头放行。

## 7. 更新规范

1. 每次任务状态变化必须更新“负责人、本周优先级、阻塞项、F sign-off、验证命令”。
2. 任务改为 `done` 时必须附上对应 commit 和验证结果。
3. `blocked` 超过 48 小时必须在执行日志中登记升级处理。
4. 每周至少刷新一次里程碑总览中的优先级和验收状态。

## 8. 增量状态更新（2026-03-21 / Batch-WS2-03）

- WS2-02（undo/replay/import/export 统一引擎管线）：`in_progress`
  - 已完成范围：`move/undo/replay/restart/saved-state/import/export` 关键状态写入口统一。
  - 已完成证据：`npm run verify:prepush` 全绿。
  - 剩余工作：将“禁止绕过 runtime helper 写关键状态”固化为审计门禁（与 WS8-01 联动）。

- WS3-01（contracts 覆盖矩阵）：`pending -> next`
  - 下一批启动项：
    1. replay/import/export 结构字段矩阵（来源、消费方、断言位置）；
    2. 单测最小集合（字段存在性、类型、兼容分支）；
    3. 与 smoke 场景绑定的契约验收清单。

- WS8-01（架构契约门禁）：`in_progress`
  - 下一批重点：新增对关键写入路径的静态审计，防止后续回流直接赋值。

### 接下来必须做的工作（按优先级）
1. WS3-01 contracts 矩阵落地并补齐最小断言。
2. WS8-01 写入口审计门禁落地并接入 `verify:refactor:ci`。
3. 完成一轮账号/历史/回放链路的 smoke 聚焦回归并记录 F sign-off 证据。

## 9. 增量状态更新（2026-03-21 / Batch-WS8-01）

- WS8-01（架构契约门禁）：`in_progress`
  - 本批新增能力：
    - `game-manager-audit` 已可阻断 replay/import/export 关键字段绕过 `setRuntime*ForReplay` 的直接写入。
  - 已验证：`npm run verify:prepush` 全绿。
  - 剩余：将同类写入边界扩展到 saved-state / session-init 等模块。

- WS2-02：`in_progress`（工程收口已完成，等待门禁覆盖面继续扩大后转 `done`）

- WS3-01：`pending -> next`（下一批主线）
  - 目标：contracts 矩阵 + 最小断言 + smoke 契约验收清单。

### 接下来必须做的工作（按优先级）
1. 产出 WS3-01 contracts 覆盖矩阵（replay/import/export 优先）。
2. 扩展 WS8-01 审计范围到 saved-state/session-init 关键字段。
3. 增补与 contracts 绑定的 smoke 契约回归并沉淀 F sign-off。

## 10. 增量状态更新（2026-03-21 / Batch-WS3-01）

- WS3-01（contracts 覆盖矩阵）：`in_progress`
  - 本批已完成：
    - replay/import/export 三类 contract 的必填字段常量；
    - 对应运行时最小校验函数；
    - 统一矩阵常量 `REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX`；
    - 对应 unit 断言与基线文档。
  - 验证：`npm run verify:prepush` 全绿。
  - 剩余：覆盖面扩展到 saved-state/session-init，并接入 gate 检查。

- WS8-01（架构契约门禁）：`in_progress`
  - 已有 replay 写入边界门禁。
  - 下一步与 WS3 联动：加入 matrix 覆盖度审计。

### 接下来必须做的工作（按优先级）
1. 扩展 WS3-01 矩阵到 saved-state/session-init。
2. 增加 matrix 漂移检查并接入 `verify:refactor:ci`。
3. 补齐 matrix 绑定的 smoke 契约回归并沉淀 F sign-off 证据。

## 11. 增量状态更新（2026-03-21 / Batch-WS8-02）

- WS8-01（架构契约门禁）：`in_progress`
  - 本批完成：`contracts-matrix-audit` 已接入 `verify:refactor:ci` 并通过。
  - 当前效果：contracts 矩阵（replay/import/export）从“文档约束”升级为“CI 阻断约束”。

- WS3-01（contracts 覆盖矩阵）：`in_progress`
  - 本批完成：矩阵完整性已有自动审计兜底。
  - 剩余工作：矩阵覆盖范围扩展到 saved-state/session-init。

### 接下来必须做的工作（按优先级）
1. 扩展 WS3-01：新增 saved-state/session-init 合同矩阵行与校验函数。
2. 扩展 WS8-01：将上述新增矩阵行并入 `contracts-matrix-audit` 强校验。
3. 联动 smoke：为新增矩阵行补回归场景，形成 F sign-off 证据链。

## 12. 增量状态更新（2026-03-21 / Batch-WS3-02）

- WS3-01（contracts 覆盖矩阵）：`in_progress`
  - 本批完成：矩阵已覆盖 `SavedGameStatePayload` 与 `SessionInitPayload`。
  - 当前覆盖：Replay / HistoryExport / Submit / SavedState / SessionInit（5 行）。
  - 验证：`verify:release-ready` + `verify:prepush` 全绿。

- WS8-01（架构契约门禁）：`in_progress`
  - 本批完成：`contracts-matrix-audit` 解析兼容 `CORE_CONTRACT_COVERAGE_MATRIX`，并校验 5 行合同完整性。
  - 剩余：将矩阵 assertions 路径存在性纳入审计。

### 接下来必须做的工作（按优先级）
1. 为 saved-state/session-init 补 smoke 契约回归并登记到 matrix assertions。
2. 扩展 `contracts-matrix-audit` 到 assertions 路径存在性检查。
3. 形成 WS3/WS8 收口用的 F sign-off 证据表。

## 13. 增量状态更新（2026-03-21 / Batch-WS8-03）

- WS8-01（架构契约门禁）：`in_progress`
  - 本批完成：`contracts-matrix-audit` 已校验 assertions 路径存在性（支持通配路径）。
  - 当前门禁能力：合同行完整性 + assertions 路径可达性。

- WS3-01（contracts 覆盖矩阵）：`in_progress`
  - 本批完成：`SavedGameStatePayload` 与 `SessionInitPayload` 已有 smoke 契约用例绑定并通过。
  - 剩余：覆盖深度规则（每行 unit+smoke 最低配额）尚未固化。

### 接下来必须做的工作（按优先级）
1. 增加 matrix 覆盖深度审计（每行至少 unit + smoke）。
2. 增补 saved-state 异常路径 smoke 契约场景。
3. 整理 WS3/WS8 F sign-off 证据并评估收口。

## 14. 增量状态更新（2026-03-21 / Batch-WS8-04）

- WS8-01（架构契约门禁）：`in_progress`
  - 本批完成：`contracts-matrix-audit` 新增“覆盖深度”规则，每个 contract 行必须至少绑定 `1 unit + 1 smoke` assertions。
  - 本批完成：Submit 合同补充 smoke 断言（在线提交请求体字段完整性），并接入矩阵 assertions。
  - 本批完成：SavedState 合同补充异常路径 smoke（版本不匹配、board 结构损坏）。
  - 验证：`npm run verify:prepush` 全绿（含 contracts-matrix-audit + 全量 smoke）。

- WS3-01（contracts 覆盖矩阵）：`in_progress`
  - 本批完成：5 行矩阵 assertions 全部达到“unit + smoke”最低配额。
  - 本批完成：基线文档断言映射更新（Replay/History/Submit/SavedState/SessionInit）。
  - 剩余：WS3/WS8 的 F sign-off 证据表仍待整理并签收。

### 接下来必须做的工作（按优先级）
1. 形成 WS3/WS8 F sign-off 证据表（体验/业务/证据/风险四栏）。
2. 启动 WS3-02（历史隐式结构迁移到 contracts）首批切片任务。
3. 在 CI 连续观察至少 2-3 轮，确认新门禁稳定无误报。

## 15. 增量状态更新（2026-03-21 / Batch-WS3-03）

- WS3-02（历史隐式结构迁移到 contracts）：`pending -> in_progress`
  - 本批完成：`HistoryRecord` 新增 contracts 运行时入口（必填键常量、`isHistoryRecordLike`、`normalizeHistoryRecordLike`）。
  - 本批完成：`src/storage/history-idb.ts` 迁移到 contracts 归一化链路，导入/导出/读写不再直接类型断言。
  - 本批完成：contracts 单测补齐 HistoryRecord 运行时校验与默认值归一化断言。
  - 验证：`npm run verify:prepush` 全绿。

- WS3-01（contracts 覆盖矩阵）：`in_progress`
  - 本批状态：矩阵门禁保持通过；历史结构迁移工作与现有 contracts 门禁兼容，无回退。

### 接下来必须做的工作（按优先级）
1. 继续 WS3-02：将 `js/local_history_store.js` 中 `normalizeRecord` 的隐式结构逐步收敛到 contracts 单一真源。
2. 整理 WS3/WS8 的 F sign-off 证据表并完成 A/F 共同确认。
3. 连续观察 2-3 轮 CI 结果，确认 WS8 深度门禁长期稳定。

## 16. 增量状态更新（2026-03-21 / Batch-WS3-04）

- WS3-02（历史隐式结构迁移到 contracts）：`in_progress`
  - 本批完成：在 `src/core/game-settings-storage.ts` / `js/core_game_settings_storage_runtime.js` 新增统一入口 `normalizeHistoryRecordFromContext`。
  - 本批完成：`js/local_history_store.js` 的 `normalizeRecord` 改为优先复用 runtime contracts 入口，保留 fallback 防退化。
  - 本批完成：新增 `tests/unit/core-game-settings-storage.spec.ts` 的 HistoryRecord 归一化断言（默认值、数字字符串、无效输入）。
  - 验证：`npm run verify:prepush` 全绿。

- WS8-01（架构契约门禁）：`in_progress`
  - 本批状态：contracts-matrix-audit 持续通过；历史导入/导出 smoke 通过，未引入回退信号。

### 接下来必须做的工作（按优先级）
1. 推进 WS3-02 下一批：评估 `history_page.js` / `user_profile_page.js` 是否仍存在隐式字段拼装并逐步收敛到 contracts。
2. 汇总 WS3/WS8 的 F sign-off 证据表并完成签收。
3. 继续观察 2-3 轮 CI，确认 WS8 深度门禁长期稳定。

## 17. 增量状态更新（2026-03-22 / Batch-WS3-05）
- WS3-02（历史隐式结构迁移到 contracts）：`in_progress`
  - 本批完成：`js/user_profile_page.js` 的记录列表与回放详情归一化改为优先复用 `CoreGameSettingsStorageRuntime.normalizeHistoryRecordFromContext`，并保留页面兜底分支。
  - 本批完成：`src/entries/user-profile.ts` 补齐 `core_game_settings_storage_runtime.js` 依赖导入，确保统一归一化入口可用。
  - 验证：`npx playwright test --config=playwright.config.ts tests/smoke/pages-user-profile-title.smoke.spec.ts`、`npx vitest run tests/unit/core-game-settings-storage.spec.ts tests/unit/contracts.spec.ts`、`npm run verify:prepush` 全绿。
- WS8-01（架构契约门禁）：`in_progress`
  - 状态：本批改动已通过 refactor gate 全链路，未引入 contracts/engine/legacy 回流告警。
### 接下来必须做的工作（按优先级）
1. 继续 WS3-02：扫描并收敛 `history_page.js` 剩余字段拼装分支，优先抽到 runtime/contracts。
2. 输出 WS3/WS8 的 F sign-off 证据表并完成 A/F 签收。
3. 连续观察 2-3 轮 CI，确认 user-profile 相关链路长期稳定。

## 18. 增量状态更新（2026-03-22 / Batch-WS3-06）
- WS3-02（历史隐式结构迁移到 contracts）：`in_progress`
  - 本批完成：`js/history_page.js` 新增 `normalizeHistoryRecordForView`，渲染链路（列表字段/回放导出/棋盘预览）统一优先复用 `CoreGameSettingsStorageRuntime.normalizeHistoryRecordFromContext`。
  - 本批完成：`normalizeBoardMatrix` 优先复用 runtime 归一化结果，页面侧字符串/数组分支仅作为兜底。
  - 本批完成：`src/entries/history.ts` 补齐 `core_game_settings_storage_runtime.js` 导入，确保历史页运行时依赖一致。
  - 验证：历史页定向 smoke + `npm run verify:prepush` 全绿。
- WS8-01（架构契约门禁）：`in_progress`
  - 状态：本批改动通过 refactor gate 全链路，未出现 contracts/legacy 回流告警。
### 接下来必须做的工作（按优先级）
1. 继续 WS3-02：收敛 `history_page.js` 的 owner/diagnostics 结构分支，评估抽到 contracts/runtime 的可行入口。
2. 输出 WS3/WS8 F sign-off 证据表并完成 A/F 签收。
3. 连续观察 2-3 轮 CI，确认 history/user-profile 新归一化路径长期稳定。

## 19. 增量状态更新（2026-03-22 / Batch-WS3-07）
- WS3-02（历史隐式结构迁移到 contracts）：`in_progress`
  - 本批完成：在 `src/core/game-settings-storage.ts` / `js/core_game_settings_storage_runtime.js` 新增统一入口：
    - `normalizeHistoryOwnerMetaFromContext`
    - `normalizeHistoryDiagnosticsIndexEntriesFromContext`
  - 本批完成：`js/local_history_store.js` 的 owner 与 diagnostics 归一化改为优先复用上述 runtime 入口，保留本地 fallback。
  - 本批完成：`js/history_page.js` 的 owner 显示与 diagnostics 解析改为优先复用 runtime 入口，减少页面层重复规则。
  - 本批完成：`tests/unit/core-game-settings-storage.spec.ts` 新增 owner/diagnostics 归一化单测。
  - 验证：定向 unit + history smoke + `npm run verify:prepush` 全绿。
- WS8-01（架构契约门禁）：`in_progress`
  - 状态：本批改动通过 refactor gate 全链路，无 contracts/legacy 回流告警。
### 接下来必须做的工作（按优先级）
1. 继续 WS3-02：评估并抽取 owner/diagnostics 的 contracts 类型与最小校验函数，减少页面层专用结构。
2. 输出 WS3/WS8 F sign-off 证据表并完成 A/F 签收。
3. 连续观察 2-3 轮 CI，确认 history/user-profile 新路径长期稳定。

## 20. 增量状态更新（2026-03-22 / Batch-WS3-08）
- WS3-02（历史隐式结构迁移到 contracts）：`in_progress`
  - 本批完成：`src/contracts/index.ts` 将 `owner/diagnostics` 显式纳入 `HistoryRecord` 协议（字段、required keys、归一化、校验）。
  - 本批完成：新增并导出 contracts 级 helper：
    - `normalizeHistoryOwnerMetaLike` / `isHistoryOwnerMetaLike`
    - `normalizeHistoryDiagnosticsIndexEntriesLike` / `isHistoryDiagnosticsIndexEntryLike`
  - 本批完成：`normalizeHistoryRecordLike` 联动 owner/diagnostics 归一化并输出稳定默认值。
  - 本批完成：`tests/unit/contracts.spec.ts` 补齐 owner/diagnostics 合同断言。
  - 验证：`npx vitest run tests/unit/contracts.spec.ts`、history 定向 smoke、`npm run verify:prepush` 全绿。
- WS8-01（架构契约门禁）：`in_progress`
  - 状态：contracts 扩展未破坏现有 matrix gate，完整 refactor gate 通过。
### 接下来必须做的工作（按优先级）
1. 输出 WS3/WS8 F sign-off 证据表并完成 A/F 签收。
2. 继续观察 2-3 轮 CI，确认 contracts 扩展长期稳定。
3. 评估是否将 owner/diagnostics 纳入 matrix 行（如纳入需联动升级 contracts-matrix-audit 规则）。

## 21. 增量状态更新（2026-03-22 / Batch-WS8-05）
- WS8-01（架构契约门禁）：`in_progress`
  - 本批完成：`contracts-matrix-audit` 扩展为 6 行强校验，新增 `HistoryRecord` 合同行。
  - 本批完成：matrix token 校验补充 `HISTORY_RECORD_REQUIRED_KEYS`、`HISTORY_OWNER_META_REQUIRED_KEYS`、`HISTORY_DIAGNOSTICS_INDEX_ENTRY_REQUIRED_KEYS` 及对应 `is*` 函数。
  - 本批完成：`src/contracts/index.ts` 的 `CORE_CONTRACT_COVERAGE_MATRIX` 新增 `HistoryRecord` 行，并绑定 `unit + smoke` assertions（满足深度门禁）。
  - 本批完成：`docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md` 升级为包含 `HistoryRecord` 的 6 合同基线。
  - 验证：`node scripts/contracts-matrix-audit.mjs`、定向 unit/smoke、`npm run verify:prepush` 全绿。
- WS3-02（历史隐式结构迁移到 contracts）：`in_progress`
  - 状态：owner/diagnostics 已从 runtime 规则提升到 contracts + matrix 双重约束。
### 接下来必须做的工作（按优先级）
1. 输出 WS3/WS8 F sign-off 证据表并完成 A/F 签收。
2. 连续观察 2-3 轮 CI，确认 6 合同 matrix 门禁长期稳定。
3. 按签收结果决定是否将 WS8-01 从 in_progress 转入 done。

## 22. 增量状态更新（2026-03-22 / Batch-WS8-06）
- WS3-01（contracts 覆盖矩阵）：`in_progress -> done`
  - 本批完成：补齐 WS3/WS8 F sign-off 证据表，形成“体验/业务/证据/风险”四栏收口记录。
  - 本批完成：在看板任务池内更新 WS3-01 状态为 `done`，并补充 matrix gate 的 6 合同验收口径。
  - 结论：WS3-01 退出条件满足，转入已完成态。
- WS8-01（架构契约门禁）：`in_progress`
  - 本批完成：形成阶段性 F sign-off 评估，明确当前唯一阻塞项为“CI 连续稳定性观察”。
  - 结论：维持 `in_progress`，待观察通过后再转 `done`。

### WS3/WS8 F sign-off 证据表（2026-03-22）
| Workstream | F sign-off 结果 | 体验 | 业务 | 证据 | 风险 | 备注 |
|---|---|---|---|---|---|---|
| WS3-01 | pass | pass（历史/回放页面字段展示正常） | pass（contracts 覆盖矩阵可追踪且已扩到 6 合同） | `npx vitest run tests/unit/contracts.spec.ts tests/unit/contracts-matrix-audit-helpers.spec.ts`；`node scripts/contracts-matrix-audit.mjs`；`npm run verify:prepush` | none | 对外展示与存储字段稳定，满足收口条件 |
| WS8-01 | pass | pass（门禁链路稳定） | pass（legacy + contracts matrix 契约持续阻断回退） | `npm run verify:prepush`；GitHub Actions `Smoke` 连续成功 run：`23381819139` / `23381923006` / `23382265813`（均含 `Refactor Gate=success`） | none | 连续观察条件满足，已转 done |

### 接下来必须做的工作（按优先级）
1. 完成 WS8-01 的 2-3 轮 CI 连续观察，并把 run 号/结论回填到执行日志。
2. 继续推进 WS3-02（历史隐式结构迁移），清理剩余 fallback 分支并补充对应 smoke。
3. 满足稳定性条件后，将 WS8-01 从 `in_progress` 转为 `done` 并更新里程碑状态。

## 23. 增量状态更新（2026-03-22 / Batch-WS3-09）
- WS3-02（历史隐式结构迁移到 contracts）：`in_progress`
  - 本批完成：`js/history_page.js` 的 owner/diagnostics 渲染路径收敛为“先 `normalizeHistoryRecordForView`，再复用统一结果渲染/过滤”，移除页面层 owner 二次 runtime 归一化。
  - 本批完成：owner 筛选选项重建逻辑改为基于归一化记录计算，减少同一记录在页面层被多套规则重复处理。
  - 本批完成：诊断摘要读取优先消费已归一化的 `diagnostics_index_entries`，仅在缺失时才走兜底归一化。
  - 验证：history 定向 smoke + `npm run verify:prepush` 全绿。
- WS8-01（架构契约门禁）：`in_progress`
  - 本批状态：完整 refactor gate 再次通过（含 contracts-matrix-audit / smoke / build），未出现 contracts/legacy 回流告警。

### 接下来必须做的工作（按优先级）
1. 执行并登记 WS8-01 的 2-3 轮 CI 连续观察证据（run id / 结果 / 结论），完成后评估转 `done`。
2. 继续 WS3-02 下一批：收敛 `js/local_history_store.js` 中仍保留的 owner/diagnostics fallback 分支。
3. 为上述 fallback 收敛补充最小 smoke 覆盖，确保历史列表、导出、owner 过滤行为不回退。

## 24. 增量状态更新（2026-03-22 / Batch-WS3-10）
- WS3-02（历史隐式结构迁移到 contracts）：`in_progress`
  - 本批完成：`js/local_history_store.js` 的 `normalizeRecord` 改为复用同一次 runtime 归一化结果，避免 owner/diagnostics 在同一记录上重复调用 runtime helper。
  - 本批完成：owner 与 diagnostics 归一化新增 `preferRuntime` 开关，在已有 runtime 归一化结果时直接走本地归并逻辑，减少重复路径与规则漂移面。
  - 本批完成：`diagnostics_index_entries` 改为优先消费 `base`（runtime 或 fallback）中的归一化字段，仅在缺失时回退到原始输入。
  - 验证：history 定向 smoke、`contracts-matrix-audit`、`npm run verify:prepush` 全绿。
- WS8-01（架构契约门禁）：`in_progress`
  - 本批状态：refactor gate 再次全通过，contracts/legacy/engine 门禁无回退信号。

### 接下来必须做的工作（按优先级）
1. 执行并登记 WS8-01 的 2-3 轮 CI 连续观察证据（run id / 关键步骤 / 结论），满足条件后转 `done`。
2. 继续 WS3-02：评估并清理 `local_history_store.js` 中 remaining fallback（例如 payload 手工 sanitize 的冗余路径）并补最小回归。
3. 观察完成后同步更新里程碑总览与 F sign-off 结果列，准备进入下一 Workstream。

## 25. 增量状态更新（2026-03-22 / Batch-WS3-11）
- WS3-02（历史隐式结构迁移到 contracts）：`in_progress`
  - 本批完成：`normalizeHistoryRecordFromContext`（TS + runtime）扩展为直接产出 `owner_*` 与 `diagnostics_index_entries`，统一复用已有 owner/diagnostics helper。
  - 本批完成：`js/local_history_store.js` 在 runtime 归一化成功时直接复用归一化结果，不再对同一记录做 owner/diagnostics 二次归一化。
  - 本批完成：`resolveRuntimeNormalizedHistoryRecord` 传入 auth 与 diagnostics 限幅参数，确保 runtime 结果与 store 约束一致。
  - 本批完成：补齐 `core-game-settings-storage` 单测期望（history record 默认包含 owner/diagnostics）。
  - 验证：定向 unit + history smoke + `npm run verify:prepush` 全绿。
- WS8-01（架构契约门禁）：`in_progress`
  - 本批状态：refactor gate 全链路持续通过，未出现 engine/contracts/legacy 回流告警。

### 接下来必须做的工作（按优先级）
1. 执行并登记 WS8-01 的 2-3 轮 CI 连续观察证据（run id / 结果 / 结论），完成后评估转 `done`。
2. 继续 WS3-02：评估 `history_page.js` 与 `local_history_store.js` 是否仍有 diagnostics payload 手工 fallback 可下沉到 runtime/contracts。
3. 按观察结果更新 F sign-off 结论列，并准备切换到 WS4/WS6 的下一批任务。

## 26. 增量状态更新（2026-03-22 / Batch-WS8-07）
- WS8-01（架构契约门禁）：`in_progress -> done`
  - 本批完成：补录 GitHub Actions `Smoke` 连续稳定性证据（main 分支，连续 3 次成功）：
    - run `23381819139`（sha `71e518d644dc884a6f24a0cf1f2b3d8e10116112`）
    - run `23381923006`（sha `b512262b8c515e24602d7166afa5719b68a32bd7`）
    - run `23382265813`（sha `8d462ce433df7d3df45cbcc891138fd9067c6991`）
  - 本批完成：上述 3 次 run 的 `Refactor Gate` job 均为 `completed/success`，且 Smoke 子任务（pages/index-ui/history）全部成功。
  - 结论：满足“2-3 轮 CI 连续观察”收口条件，WS8-01 转入 `done`。
- WS3-02（历史隐式结构迁移到 contracts）：`in_progress`
  - 本批状态：继续推进 fallback 精简，当前无门禁阻塞信号。

### 接下来必须做的工作（按优先级）
1. 继续 WS3-02：清理 diagnostics payload 手工 fallback 冗余，并补最小定向回归。
2. 启动 WS4/WS6 下一批任务拆分（入口体系 + storage/API 抽象）并更新任务池状态。
3. 在下一个批次给出 WS3-02 收口判断（是否可转 done 或进入尾项清单）。

## 27. 增量状态更新（2026-03-22 / Batch-WS3-12）
- WS3-02（历史隐式结构迁移到 contracts）：`in_progress`
  - 本批完成：`js/local_history_store.js` 删除 owner/diagnostics 的冗余 runtime 二次归一化分支，收敛为两条明确路径：
    - runtime 整条记录归一化成功 -> 直接复用；
    - runtime 记录归一化失败 -> 本地 fallback 归一化。
  - 本批完成：移除 `resolveRuntimeNormalizedHistoryOwnerMeta` 与 `resolveRuntimeNormalizedDiagnosticsIndexEntries` 相关冗余调用链，降低 list/filter/import 场景重复计算。
  - 验证：history 定向 smoke + 定向 unit + `npm run verify:prepush` 全绿。
- WS8-01（架构契约门禁）：`done`
  - 本批状态：门禁稳定维持，无回退信号。

### 接下来必须做的工作（按优先级）
1. 对 WS3-02 做收口评估：确认 diagnostics payload fallback 是否仍需保留，或可继续下沉到 runtime/contracts。
2. 启动 WS4/WS6 下一批任务拆分并更新任务池（入口体系与 storage/API 抽象）。
3. 给出 M3（contracts 统一）下一阶段里程碑目标与验收口径。

## 28. 增量状态更新（2026-03-22 / Batch-WS3-13-WS6-01)
- WS3-02（历史隐式结构迁移到 contracts）：`in_progress -> done`
  - 本批结论：主链路历史记录已统一走 runtime/contracts 归一化；页面与 store 层的重复归一化分支已清理到“runtime 成功直接复用 / fallback 兜底”双路径。
  - 兼容策略：fallback 保留用于运行时不可用或历史数据容错，不再作为主链路结构来源。
  - 验证依据：history 定向 smoke、unit、`npm run verify:prepush` 持续通过（最近批次连续全绿）。
- WS6-01（storage 抽象统一）：`pending -> in_progress`
  - 本批完成：`src/entries` 首轮基线扫描：
    - `localStorage` 直连点：2 处（`src/entries/home-family-shared.ts`）
    - `fetch` 直连点：0 处
  - 本批完成：入口审计命令 `npm run audit:entry-manifest` 通过，为 WS4/WS6 下一批拆分提供稳定基线。

### 接下来必须做的工作（按优先级）
1. WS6-01 下一批：处理 `src/entries/home-family-shared.ts` 的 2 处引导态 localStorage 访问，评估是否纳入 storage helper。
2. WS4-01/WS4-02 下一批：基于已通过的 entry-manifest 审计，输出非统一入口页面的处置优先级（纳管/归档/删除）。
3. 更新 M3/M4 下一阶段验收口径，确保任务池状态与执行证据一致。

## 29. 增量状态更新（2026-03-22 / Batch-WS6-02）
- WS6-01（storage 抽象统一）：`in_progress`
  - 本批完成：`src/entries/home-family-shared.ts` 的 2 处引导态 `localStorage` 直连访问已改为复用 `game-settings-storage` helper（`readStorageFlagFromContext` / `writeStorageFlagFromContext`）。
  - 本批完成：`src/entries` 直连访问复扫结果更新：
    - `localStorage`：0 处
    - `fetch`：0 处
  - 验证：`audit:entry-manifest`、定向 unit、`npm run verify:prepush` 全绿。
- WS3-02（历史隐式结构迁移到 contracts）：`done`
  - 本批状态：已收口，无新增回退信号。

### 接下来必须做的工作（按优先级）
1. WS6-01 下一批：扩展扫描范围到 `src/features` 与 `src/app`，补齐“页面/feature 不直连 storage”的边界清单。
2. WS4-01/WS4-02：输出 4 个非统一入口页面的处置优先级与迁移路径。
3. 评估 WS6-01 的 done 条件与剩余工作量（history/settings/replay 三域覆盖度）。

## 30. 增量状态更新（2026-03-22 / Batch-WS6-03）
- WS6-01（storage 抽象统一）：`in_progress`
  - 本批完成：`src/storage/history-idb.ts` 将 migration 阶段 localStorage 访问集中为内部 helper（`resolveLocalStorage/readLocalStorageItem/writeLocalStorageItem`），移除散点直接读写。
  - 本批完成：`src` 全目录分域复扫（bootstrap/contracts/core/entries/storage/utils）结果：
    - direct `localStorage`：0 处
    - direct `fetch`：0 处
  - 验证：`npm run verify:prepush` 全绿。
- WS4-01/WS4-02：`in_progress`
  - 本批状态：沿用 entry-manifest 门禁稳定通过，等待下一批输出入口处置优先级清单。

### 接下来必须做的工作（按优先级）
1. WS6-01 下一批：把同样扫描口径扩展到 `js` 历史层并做分域优先级（高频页面优先）。
2. WS4 下一批：输出 4 个非统一入口页面的迁移/归档优先级及目标批次。
3. 更新 WS6 完成判定：区分“src 层清零已达成”与“全仓历史层收口”的里程碑门槛。

## 31. 增量状态更新（2026-03-22 / Batch-WS6-04）
- WS6-01（storage 抽象统一）：`in_progress`
  - 本批完成：`js/history_page.js` 将 `localStorage` 访问收敛到页内 helper（`readLocalStorageItem/writeLocalStorageItem/removeLocalStorageItem`），移除散点直连调用。
  - 本批完成：`src/storage/history-idb.ts` migration 路径 localStorage 访问统一到 helper，`src` 层保持 0 直连命中。
  - 本批完成：`src+js` 口径复扫：
    - direct `localStorage`：`50 -> 40`
    - direct `fetch`：`7 -> 7`
  - 验证：history 定向 smoke + `npm run verify:prepush` 全绿。

### 接下来必须做的工作（按优先级）
1. WS6-01 下一批聚焦高频文件：`js/user_profile_page.js`、`js/local_history_store.js`、`js/theme_manager.js`。
2. 针对上述文件先做“散点调用收敛到 helper”改造，再评估是否进一步下沉 runtime/core。
3. 同步更新 WS6 的分域清单（高频/低频）与预计批次数。

## 32. 增量状态更新（2026-03-22 / Batch-WS6-05）
- WS6-01（storage 抽象统一）：`in_progress`
  - 本批完成：`js/user_profile_page.js` 的 storage 访问收敛到 helper（`resolveLocalStorage/readLocalStorageItem/writeLocalStorageItem/removeLocalStorageItem/writeSessionStorageItem`），移除 direct `localStorage/sessionStorage` 调用。
  - 本批完成：`user_profile_page` 文件内 storage 直连命中从 `5` 降至 `0`（`fetch` 保持 `2`）。
  - 本批完成：`src+js` 口径复扫：
    - direct `localStorage`：`40 -> 35`
    - direct `fetch`：`7 -> 7`
  - 验证：`pages-user-profile-title` 定向 smoke + `npm run verify:prepush` 全绿。

### 接下来必须做的工作（按优先级）
1. WS6-01 下一批继续处理高频文件：`js/local_history_store.js` 与 `js/theme_manager.js`。
2. 对 `js` 层的 `fetch` 点位做分层（API helper 内可保留、页面直连需收敛）并补规则说明。
3. 维持每批 `src+js` 命中数趋势记录，确保 WS6 可量化收口。

## 33. 增量状态更新（2026-03-22 / Batch-WS6-06）
- WS6-01（storage 抽象统一）：`in_progress`
  - 本批完成：`js/local_history_store.js` 与 `js/theme_manager.js` 的 localStorage 访问收敛到文件内 helper，移除 direct `localStorage.*` 调用。
  - 本批完成：两文件 file-level 结果：
    - `local_history_store.js`：`localStorage 6 -> 0`
    - `theme_manager.js`：`localStorage 6 -> 0`
  - 本批完成：`src+js` 口径复扫：
    - direct `localStorage`：`35 -> 23`
    - direct `fetch`：`7 -> 7`
  - 验证：`npm run verify:prepush` 全绿。

### 接下来必须做的工作（按优先级）
1. WS6-01 下一批处理高优先级剩余：`js/online_leaderboard_runtime.js`、`js/account_page.js`。
2. 建立 `fetch` 点位分类规则：API helper 内允许、页面直连收敛，并回填到 guardrails/看板。
3. 维持每批指标快照（`src+js localStorage/fetch`）直至 WS6 收口。

## 34. 增量状态更新（2026-03-22 / Batch-WS6-07）
- WS6-01（storage 抽象统一）：`in_progress`
  - 本批完成：`js/online_leaderboard_runtime.js` 与 `js/account_page.js` 的 localStorage 访问收敛到 helper，移除 direct `localStorage.*` 调用。
  - 本批完成：两文件 file-level 结果：
    - `online_leaderboard_runtime.js`：`localStorage 4 -> 0`
    - `account_page.js`：`localStorage 4 -> 0`
  - 本批完成：`src+js` 口径复扫：
    - direct `localStorage`：`23 -> 15`
    - direct `fetch`：`7 -> 7`
  - 验证：账号/榜单定向 smoke 通过；`verify:prepush` 首次出现 replay 用例超时，重跑失败用例后再次执行 `verify:prepush` 全绿。

### 接下来必须做的工作（按优先级）
1. WS6-01 下一批处理剩余高值文件：`js/api_shared_utils.js`、`js/refactor_cutover_migration.js`、`js/replay_ui.js`。
2. 明确 `fetch` 点位分类规则并写入 guardrails（封装层允许、页面直连收敛）。
3. 继续维持每批指标快照，推动 `src+js localStorage` 向个位数收敛。

## 35. 增量状态更新（2026-03-22 / Batch-WS6-08）
- WS6-01（storage 抽象统一）：`in_progress`
  - 本批完成：`js/api_shared_utils.js`、`js/refactor_cutover_migration.js`、`js/replay_ui.js` 引入统一 storage resolver/helper，移除 direct `localStorage/sessionStorage` 访问链路。
  - 本批完成：三文件 file-level 结果：
    - `api_shared_utils.js`：`localStorage 3 -> 0`
    - `refactor_cutover_migration.js`：`localStorage 3 -> 0`
    - `replay_ui.js`：`localStorage 2 -> 0`
  - 本批完成：`src+js` 口径复扫：
    - direct `localStorage`：`15 -> 7`
    - direct `fetch`：`7 -> 7`
  - 验证：定向 smoke（account/replay）+ `npm run verify:prepush` 全绿。
- WS4-01/WS4-02：`in_progress`
  - 本批状态：入口体系门禁保持稳定，未新增入口侧回流信号。

### 接下来必须做的工作（按优先级）
1. WS6-01 下一批处理剩余 `localStorage` 高值文件：`js/core_custom_spawn_runtime.js`、`js/core_i18n_runtime.js`、`js/pku2048_inline_stats_runtime.js`、`js/core_timer_module_runtime.js`。
2. 输出并落地 `fetch` 点位分类规则：API helper 内保留、页面直连继续收敛。
3. 维持每批 `src+js localStorage/fetch` 指标快照，推动 WS6-01 收口判定。

## 36. 增量状态更新（2026-03-22 / Batch-WS6-09）
- WS6-01（storage 抽象统一）：`in_progress`
  - 本批完成：`js/core_custom_spawn_runtime.js`、`js/core_i18n_runtime.js`、`js/pku2048_inline_stats_runtime.js`、`js/core_timer_module_runtime.js` 引入 storage resolver/helper，移除 direct `localStorage.*` 访问。
  - 本批完成：四文件 file-level 结果：
    - `core_custom_spawn_runtime.js`：`localStorage 2 -> 0`
    - `core_i18n_runtime.js`：`localStorage 2 -> 0`
    - `pku2048_inline_stats_runtime.js`：`localStorage 2 -> 0`
    - `core_timer_module_runtime.js`：`localStorage 1 -> 0`
  - 本批完成：`src+js` 口径复扫：
    - direct `localStorage`：`7 -> 0`（已清零）
    - direct `fetch`：`7 -> 7`
  - 验证：`npm run verify:prepush` 全绿（含 unit/smoke/build）。
- WS4-01/WS4-02：`in_progress`
  - 本批状态：入口门禁继续稳定，未出现 storage 回流导致的入口层回归。

### 接下来必须做的工作（按优先级）
1. 进入 WS6 下一收口项：对剩余 `fetch` 点位做分类处置（API helper 保留、页面直连收敛）。
2. 把 `fetch` 分类规则回填到 guardrails 与 roadmap，形成可审计标准。
3. 连续保持 refactor gate 观察，确认 `localStorage=0` 状态稳定不反弹。

## 37. 增量状态更新（2026-03-22 / Batch-WS6-10）
- WS6-01（storage 抽象统一）：`in_progress`
  - 本批完成：`js/api_shared_utils.js` 新增统一 `callFetch` 入口，页面层 API 请求改为经 shared helper 调用。
  - 本批完成：`js/account_page.js`、`js/account_settings_page.js`、`js/online_leaderboard_runtime.js`、`js/password_page.js`、`js/register_page.js`、`js/user_profile_page.js` 的 direct `fetch` 调用全部替换为 `callFetch`。
  - 本批完成：`src+js` 口径复扫：
    - direct `localStorage`：`0 -> 0`
    - direct `fetch`：`7 -> 0`（已清零）
  - 验证：`npm run verify:prepush` 全绿（含 unit/smoke/build）。
- WS4-01/WS4-02：`in_progress`
  - 本批状态：入口门禁无回流告警，页面行为保持稳定。

### 接下来必须做的工作（按优先级）
1. 将“页面层不得 direct storage/fetch，统一走 shared helper/service”写入 guardrails 并补审计项。
2. 评估 WS6-01 的 `done` 退出条件（是否纳入连续 CI 观察与反弹阈值）。
3. 联动 WS4 输出入口清单与迁移/归档优先级，避免新增散点入口回流。

## 38. 增量状态更新（2026-03-22 / Batch-WS6-11）
- WS6-01（storage 抽象统一）：`in_progress`
  - 本批完成：新增 `scripts/service-boundary-audit.mjs`，把“页面层不得 direct storage/fetch”固化为正式门禁。
  - 本批完成：`package.json` 新增 `npm run audit:service-boundary`；`scripts/refactor-gate.mjs` 将 `service-boundary-audit` 接入 `verify:prepush`。
  - 本批完成：`docs/ARCHITECTURE_GUARDRAILS.md` 顶部补充 2026-03-22 guardrail update，明确：
    - `R4/R5 -> npm run audit:service-boundary`
    - PR 最小检查纳入 `audit:service-boundary`
    - 当前基线 `src+js direct localStorage=0 / direct fetch=0`
  - 验证：`audit:service-boundary`、定向 unit、完整 `npm run verify:prepush` 全绿。
- WS8-01（架构契约门禁）：`done`
  - 本批状态：门禁覆盖面继续扩大，storage/fetch 边界正式进入 refactor gate 主链路。

### 接下来必须做的工作（按优先级）
1. 定义 WS6-01 的 `done` 退出条件，并要求连续 CI 观察不反弹。
2. 评估是否为 `service-boundary-audit` 增补允许名单/例外机制，避免未来 helper 层演进时被迫绕规则。
3. 联动 WS4 输出页面入口迁移/归档优先级，防止新增散点入口重新引入边界回流。

### WS6-01 `done` 退出条件（2026-03-22 草案）
1. `src+js direct localStorage = 0` 且 `src+js direct fetch = 0`，并由 `npm run audit:service-boundary` 自动验证。
2. `service-boundary-audit` 已纳入 `npm run verify:prepush`，且本地 refactor gate 全链路通过。
3. 主分支 CI 连续 3 轮通过，期间无 `service-boundary-audit` 回流告警。
4. `ARCHITECTURE_GUARDRAILS.md` 已明确 R4/R5 的正式命令、范围、阻断条件。
5. 若出现 helper/service 层合法例外，必须先补白名单/ADR，再允许合并；否则不计入 done。
## 39. 增量状态更新（2026-03-22 / Batch-WS4-03-WS6-12）
- WS4-01/WS4-02（页面入口体系治理）：`in_progress`
  - 本批完成：`entry-manifest-audit` 从仅校验 `play/replay`，扩展为校验全部 16 个 2048 页面入口的架构分类。
  - 本批完成：显式固化两类入口：
    - `manifest-bootstrap`：`index / undo / capped / practice / pku2048 / play / replay / index_test`
    - `direct-module`：`account / account-settings / history / modes / palette / password / register / user-profile`
  - 本批完成：入口分类现由 `npm run audit:entry-manifest` 自动验证，避免新入口或旧入口改造悄然偏离既定架构。
  - 当前结论：2048 产品线页面入口已全部纳入清单；剩余债务已收敛为“已知 direct-module 入口待迁移”。
- WS6-01（storage 抽象统一）：`in_progress`
  - 本批状态：新增入口分类审计未破坏现有 refactor gate，完整 `npm run verify:prepush` 全绿。

### 当前入口清单（2026-03-22）
1. `index.html`：站点首页/独立壳，不属于 2048 产品线页面系统。
2. 2048 产品线页：16 个，已全部映射到 `src/entries/*`。
3. `direct-module` 入口 8 个，是 WS4 下一阶段的主要迁移对象。

### 接下来必须做的工作（按优先级）
1. 输出 8 个 `direct-module` 入口的迁移优先级：`history / modes / palette` 优先，`account-family` 次之。
2. 评估是否将 `history / modes / palette` 先并入统一 bootstrap/manifest，缩小入口体系双轨。
3. 为 `index.html` 明确长期定位：保留为独立站点壳，或纳入正式产品导航层。


# 閲岀▼纰戞帹杩涚湅鏉?





## 40. ����״̬���£�2026-03-22 / Batch-WS4-02E��
- WS4-02E��Undo Engine facade����`done`
- �ؼ���ɣ�ע�� `CoreEngineFacade` ���� legacy undo snapshot/restore ������ facade��
- ��֤��`npx vitest run tests/unit/bootstrap-engine-facade-host.spec.ts tests/unit/core-undo-snapshot.spec.ts tests/unit/core-undo-restore.spec.ts`
- ������Ҫ���Ĺ�����
1. WS4-02B `palette` ȥ legacy���Ƴ����� theme settings runtime import����
2. �� palette ���� unit/smoke + `audit:entry-manifest`��

## 41. ����״̬���£�2026-03-22 / Batch-WS4-02B��
- WS4-02B��palette ȥ legacy����`done`
- �ؼ���ɣ�`palette-page.ts` �Ƴ� `core_theme_settings_*` legacy import������ TS �� theme settings ģ�顣
- ��֤��`node scripts/page-legacy-runtime-boundary-audit.mjs`��`npx vitest run tests/unit/palette-entry-bootstrap.spec.ts`��`npx playwright test --config=playwright.config.ts tests/smoke/pages-palette-page-system.smoke.spec.ts`��
- ������Ҫ���Ĺ�����
1. ���� `modes` / `history` �� legacy import Ǩ��˳�򣬼�����С allowlist��
2. ����Ҫ���� palette ��� unit/smoke ֤�ݵ�ǩ�ձ���

## 42. ����״̬���£�2026-03-22 / Batch-WS4-03A��
- WS4-03A��modes ���� legacy import����`done`
- �ؼ���ɣ�`modes-page.ts` �Ƴ� `core_i18n_runtime.js` import��
- ��֤��`node scripts/page-legacy-runtime-boundary-audit.mjs`��`npx playwright test --config=playwright.config.ts tests/smoke/pages-modes-page-system.smoke.spec.ts`��
- ������Ҫ���Ĺ�����
1. ���� `history` ҳ�� legacy import �Ŀ��滻�㣬�滮���˳��
2. �����μ������� allowlist��

## 43. ����״̬���£�2026-03-22 / Batch-WS4-03B��
- WS4-03B��history ���� legacy import����`done`
- �ؼ���ɣ�`history-page.ts` �Ƴ� `core_i18n_runtime.js` import��
- ��֤��`node scripts/page-legacy-runtime-boundary-audit.mjs`��`npx playwright test --config=playwright.config.ts tests/smoke/pages-history-page-system.smoke.spec.ts`��
- ������Ҫ���Ĺ�����
1. ���� `history_page.js` �Ŀɲ�ֵ㣬�������� runtime ������
2. �����γ������� allowlist��

## 44. ����״̬���£�2026-03-22 / Batch-WS4-03C��
- WS4-03C��history ȥ refactor_cutover_migration����`done`
- �ؼ���ɣ�cutover Ǩ���߼����� TS �� `runRefactorCutoverMigration` ִ�У��Ƴ� legacy import��
- ��֤��`node scripts/page-legacy-runtime-boundary-audit.mjs`��`npx playwright test --config=playwright.config.ts tests/smoke/pages-history-page-system.smoke.spec.ts`��
- ������Ҫ���Ĺ�����
1. ������� `history_page.js` �߼������� legacy runtime ������
2. �����γ������� allowlist��

## 45. ����״̬���£�2026-03-22 / Batch-WS4-03D��
- WS4-03D��history ȥ `history_page.js` ֱ������`done`
- �ؼ���ɣ�`history_page.js` �� entry ���أ�page shell ����ֱ�� import��
- ��֤��`node scripts/page-legacy-runtime-boundary-audit.mjs`��`npx playwright test --config=playwright.config.ts tests/smoke/pages-history-page-system.smoke.spec.ts`��
- ������Ҫ���Ĺ�����
1. Ǩ�� `history_page.js` ��ɸѡ/��Ⱦ�߼��� TS feature��
2. �������� allowlist��

## 46. ����״̬���£�2026-03-22 / Batch-WS4-03E��
- WS4-03E��history TS runtime ��� legacy����`done`
- �ؼ���ɣ�history ҳ���߼�Ǩ�� `history-page-runtime.ts`���Ƴ� legacy loader��
- ��֤��`node scripts/page-legacy-runtime-boundary-audit.mjs`��history ��� unit + smoke ȫ��ͨ����
- ������Ҫ���Ĺ�����
1. �����滻ʣ�� legacy ������LocalHistoryStore/ModeCatalog/CoreGameSettingsStorageRuntime����
2. ��� F ����ǩ�ֲ����� guardrails��
