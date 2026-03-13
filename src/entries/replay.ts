import { loadLegacyScriptsSequentially } from "./legacy-loader";

import seedrandomUrl from "../../js/seedrandom.js?url";
import animframePolyfillUrl from "../../js/animframe_polyfill.js?url";
import replayInputManagerUrl from "../../js/replay_input_manager.js?url";
import themeManagerUrl from "../../js/theme_manager.js?url";
import modeCatalogUrl from "../../js/mode_catalog.js?url";
import htmlActuatorUrl from "../../js/html_actuator.js?url";
import gridUrl from "../../js/grid.js?url";
import tileUrl from "../../js/tile.js?url";
import localScoreManagerUrl from "../../js/local_score_manager.js?url";
import localHistoryStoreUrl from "../../js/local_history_store.js?url";
import coreModeCatalogRuntimeUrl from "../../js/core_mode_catalog_runtime.js?url";
import coreRulesRuntimeUrl from "../../js/core_rules_runtime.js?url";
import coreModeRuntimeUrl from "../../js/core_mode_runtime.js?url";
import coreSpecialRulesRuntimeUrl from "../../js/core_special_rules_runtime.js?url";
import coreDirectionLockRuntimeUrl from "../../js/core_direction_lock_runtime.js?url";
import coreGridScanRuntimeUrl from "../../js/core_grid_scan_runtime.js?url";
import coreMoveScanRuntimeUrl from "../../js/core_move_scan_runtime.js?url";
import coreMovePathRuntimeUrl from "../../js/core_move_path_runtime.js?url";
import coreScoringRuntimeUrl from "../../js/core_scoring_runtime.js?url";
import coreMergeEffectsRuntimeUrl from "../../js/core_merge_effects_runtime.js?url";
import corePostMoveRuntimeUrl from "../../js/core_post_move_runtime.js?url";
import corePostMoveRecordRuntimeUrl from "../../js/core_post_move_record_runtime.js?url";
import corePostUndoRecordRuntimeUrl from "../../js/core_post_undo_record_runtime.js?url";
import coreUndoRestoreRuntimeUrl from "../../js/core_undo_restore_runtime.js?url";
import coreUndoSnapshotRuntimeUrl from "../../js/core_undo_snapshot_runtime.js?url";
import coreUndoTileSnapshotRuntimeUrl from "../../js/core_undo_tile_snapshot_runtime.js?url";
import coreUndoTileRestoreRuntimeUrl from "../../js/core_undo_tile_restore_runtime.js?url";
import coreUndoRestorePayloadRuntimeUrl from "../../js/core_undo_restore_payload_runtime.js?url";
import coreUndoStackEntryRuntimeUrl from "../../js/core_undo_stack_entry_runtime.js?url";
import coreReplayCodecRuntimeUrl from "../../js/core_replay_codec_runtime.js?url";
import coreReplayV4ActionsRuntimeUrl from "../../js/core_replay_v4_actions_runtime.js?url";
import coreReplayImportRuntimeUrl from "../../js/core_replay_import_runtime.js?url";
import coreReplayExecutionRuntimeUrl from "../../js/core_replay_execution_runtime.js?url";
import coreReplayDispatchRuntimeUrl from "../../js/core_replay_dispatch_runtime.js?url";
import coreReplayLifecycleRuntimeUrl from "../../js/core_replay_lifecycle_runtime.js?url";
import coreReplayTimerRuntimeUrl from "../../js/core_replay_timer_runtime.js?url";
import coreReplayFlowRuntimeUrl from "../../js/core_replay_flow_runtime.js?url";
import coreReplayControlRuntimeUrl from "../../js/core_replay_control_runtime.js?url";
import coreReplayLoopRuntimeUrl from "../../js/core_replay_loop_runtime.js?url";
import coreMoveApplyRuntimeUrl from "../../js/core_move_apply_runtime.js?url";
import coreGameSettingsStorageRuntimeUrl from "../../js/core_game_settings_storage_runtime.js?url";
import coreGameManagerBaseHelpersRuntimeUrl from "../../js/core_game_manager_base_helpers_runtime.js?url";
import coreGameManagerEnvHelpersRuntimeUrl from "../../js/core_game_manager_env_helpers_runtime.js?url";
import coreGameManagerRuntimeCallHelpersRuntimeUrl from "../../js/core_game_manager_runtime_call_helpers_runtime.js?url";
import coreGameManagerSavedStateHelpersRuntimeUrl from "../../js/core_game_manager_saved_state_helpers_runtime.js?url";
import coreGameManagerRuntimeAccessorHelpersRuntimeUrl from "../../js/core_game_manager_runtime_accessor_helpers_runtime.js?url";
import coreGameManagerStatsUiHelpersRuntimeUrl from "../../js/core_game_manager_stats_ui_helpers_runtime.js?url";
import coreGameManagerMoveInputHelpersRuntimeUrl from "../../js/core_game_manager_move_input_helpers_runtime.js?url";
import coreGameManagerStatsDisplayHelpersRuntimeUrl from "../../js/core_game_manager_stats_display_helpers_runtime.js?url";
import coreGameManagerPanelTimerHelpersRuntimeUrl from "../../js/core_game_manager_panel_timer_helpers_runtime.js?url";
import coreGameManagerUndoStatsHelpersRuntimeUrl from "../../js/core_game_manager_undo_stats_helpers_runtime.js?url";
import coreGameManagerRestartSetupHelpersRuntimeUrl from "../../js/core_game_manager_restart_setup_helpers_runtime.js?url";
import coreGameManagerSetupTimerUiHelpersRuntimeUrl from "../../js/core_game_manager_setup_timer_ui_helpers_runtime.js?url";
import coreGameManagerSessionInitHelpersRuntimeUrl from "../../js/core_game_manager_session_init_helpers_runtime.js?url";
import coreGameManagerCommonRuntimeUrl from "../../js/core_game_manager_common_runtime.js?url";
import coreGameManagerReplayHelpersRuntimeUrl from "../../js/core_game_manager_replay_helpers_runtime.js?url";
import coreGameManagerModeRulesHelpersRuntimeUrl from "../../js/core_game_manager_mode_rules_helpers_runtime.js?url";
import coreGameManagerStaticRuntimeUrl from "../../js/core_game_manager_static_runtime.js?url";
import coreGameManagerBindingsRuntimeUrl from "../../js/core_game_manager_bindings_runtime.js?url";
import gameManagerUrl from "../../js/game_manager.js?url";
import coreBootstrapRuntimeUrl from "../../js/core_bootstrap_runtime.js?url";
import coreSimpleRuntimeContractRuntimeUrl from "../../js/core_simple_runtime_contract_runtime.js?url";
import coreSimpleStartupRuntimeUrl from "../../js/core_simple_startup_runtime.js?url";
import coreSimplePageHostRuntimeUrl from "../../js/core_simple_page_host_runtime.js?url";
import replayApplicationUrl from "../../js/replay_application.js?url";
import replayUiUrl from "../../js/replay_ui.js?url";
import coreI18nRuntimeUrl from "../../js/core_i18n_runtime.js?url";

const replayLegacyScripts = [
  seedrandomUrl,
  animframePolyfillUrl,
  replayInputManagerUrl,
  themeManagerUrl,
  modeCatalogUrl,
  htmlActuatorUrl,
  gridUrl,
  tileUrl,
  localScoreManagerUrl,
  localHistoryStoreUrl,
  coreModeCatalogRuntimeUrl,
  coreRulesRuntimeUrl,
  coreModeRuntimeUrl,
  coreSpecialRulesRuntimeUrl,
  coreDirectionLockRuntimeUrl,
  coreGridScanRuntimeUrl,
  coreMoveScanRuntimeUrl,
  coreMovePathRuntimeUrl,
  coreScoringRuntimeUrl,
  coreMergeEffectsRuntimeUrl,
  corePostMoveRuntimeUrl,
  corePostMoveRecordRuntimeUrl,
  corePostUndoRecordRuntimeUrl,
  coreUndoRestoreRuntimeUrl,
  coreUndoSnapshotRuntimeUrl,
  coreUndoTileSnapshotRuntimeUrl,
  coreUndoTileRestoreRuntimeUrl,
  coreUndoRestorePayloadRuntimeUrl,
  coreUndoStackEntryRuntimeUrl,
  coreReplayCodecRuntimeUrl,
  coreReplayV4ActionsRuntimeUrl,
  coreReplayImportRuntimeUrl,
  coreReplayExecutionRuntimeUrl,
  coreReplayDispatchRuntimeUrl,
  coreReplayLifecycleRuntimeUrl,
  coreReplayTimerRuntimeUrl,
  coreReplayFlowRuntimeUrl,
  coreReplayControlRuntimeUrl,
  coreReplayLoopRuntimeUrl,
  coreMoveApplyRuntimeUrl,
  coreGameSettingsStorageRuntimeUrl,
  coreGameManagerBaseHelpersRuntimeUrl,
  coreGameManagerEnvHelpersRuntimeUrl,
  coreGameManagerRuntimeCallHelpersRuntimeUrl,
  coreGameManagerSavedStateHelpersRuntimeUrl,
  coreGameManagerRuntimeAccessorHelpersRuntimeUrl,
  coreGameManagerStatsUiHelpersRuntimeUrl,
  coreGameManagerMoveInputHelpersRuntimeUrl,
  coreGameManagerStatsDisplayHelpersRuntimeUrl,
  coreGameManagerPanelTimerHelpersRuntimeUrl,
  coreGameManagerUndoStatsHelpersRuntimeUrl,
  coreGameManagerRestartSetupHelpersRuntimeUrl,
  coreGameManagerSetupTimerUiHelpersRuntimeUrl,
  coreGameManagerSessionInitHelpersRuntimeUrl,
  coreGameManagerCommonRuntimeUrl,
  coreGameManagerReplayHelpersRuntimeUrl,
  coreGameManagerModeRulesHelpersRuntimeUrl,
  coreGameManagerStaticRuntimeUrl,
  coreGameManagerBindingsRuntimeUrl,
  gameManagerUrl,
  coreBootstrapRuntimeUrl,
  coreSimpleRuntimeContractRuntimeUrl,
  coreSimpleStartupRuntimeUrl,
  coreSimplePageHostRuntimeUrl,
  replayApplicationUrl,
  replayUiUrl,
  coreI18nRuntimeUrl
] as const;

await loadLegacyScriptsSequentially(replayLegacyScripts);
