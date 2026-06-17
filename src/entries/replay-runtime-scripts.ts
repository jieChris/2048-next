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
import coreCloudReplayContractRuntimeUrl from "../../js/core_cloud_replay_contract_runtime.js?url";

export const replayLegacyScripts = [
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
  coreI18nRuntimeUrl,
  coreCloudReplayContractRuntimeUrl
] as const;
