import { createBootstrapPipeline, resolvePageDescriptor } from "../bootstrap/page-bootstrap";
import { registerEngineFacade, type EngineFacadeWindowLike } from "../bootstrap/engine-facade-host";
import { bootstrapRankedSessionForHomeFamilyPage } from "../bootstrap/ranked-session";
import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";
import { bindHomeUserDisplay } from "../bootstrap/home-user-display";
import { installAdminRescueClientServiceBoundary } from "../bootstrap/admin-rescue-client-service-boundary";
import { installDirectionLockRuntime } from "../bootstrap/direction-lock-runtime";
import { installGameOverUndoHostRuntime } from "../bootstrap/game-over-undo-host";
import { installGameManagerBaseHelpersRuntime } from "../bootstrap/game-manager-base-helpers-runtime";
import { installGameManagerClientRecordIdRuntime } from "../bootstrap/game-manager-client-record-id-runtime";
import { installGameManagerEnvHelpersRuntime } from "../bootstrap/game-manager-env-helpers-runtime";
import { installGameManagerReplayHelperGlobals } from "../bootstrap/game-manager-replay-helpers-runtime";
import { installGameManagerRuntimeAccessorHelpersRuntime } from "../bootstrap/game-manager-runtime-accessor-helpers-runtime";
import { installGameManagerRuntimeCallHelpersRuntime } from "../bootstrap/game-manager-runtime-call-helpers-runtime";
import { installGameSettingsStorageRuntime } from "../bootstrap/game-settings-storage-runtime";
import { installGridScanRuntime } from "../bootstrap/grid-scan-runtime";
import { installHomeGuideRuntime } from "../bootstrap/home-guide";
import { installHomeGuideControlsHostRuntime } from "../bootstrap/home-guide-controls-host";
import { installHomeGuideDomHostRuntime } from "../bootstrap/home-guide-dom-host";
import { installHomeGuideDoneNoticeHostRuntime } from "../bootstrap/home-guide-done-notice-host";
import { installHomeGuideFinishHostRuntime } from "../bootstrap/home-guide-finish-host";
import { installHomeGuideHighlightHostRuntime } from "../bootstrap/home-guide-highlight-host";
import { installHomeGuidePanelHostRuntime } from "../bootstrap/home-guide-panel-host";
import { installHomeGuidePageHostRuntime } from "../bootstrap/home-guide-page-host";
import { installHomeGuideSettingsHostRuntime } from "../bootstrap/home-guide-settings-host";
import { installHomeGuideStartHostRuntime } from "../bootstrap/home-guide-start-host";
import { installHomeGuideStepFlowHostRuntime } from "../bootstrap/home-guide-step-flow-host";
import { installHomeGuideStepHostRuntime } from "../bootstrap/home-guide-step-host";
import { installHomeGuideStepViewHostRuntime } from "../bootstrap/home-guide-step-view-host";
import { installHomeGuideStartupHostRuntime } from "../bootstrap/home-guide-startup-host";
import { installHomeModeRuntime } from "../bootstrap/home-mode";
import { installHomePageHostRuntime } from "../bootstrap/home-page-host";
import { installHomeRuntimeContractRuntime } from "../bootstrap/home-runtime-contract";
import { installHomeStartupHostRuntime } from "../bootstrap/home-startup-host";
import { installIndexUiStartupHostRuntime } from "../bootstrap/index-ui-startup-host";
import { installMergeEffectsRuntime } from "../bootstrap/merge-effects-runtime";
import { installModeCatalogRuntime } from "../bootstrap/mode-catalog";
import { installMoveApplyRuntime } from "../bootstrap/move-apply-runtime";
import { installMovePathRuntime } from "../bootstrap/move-path-runtime";
import { installMoveScanRuntime } from "../bootstrap/move-scan-runtime";
import { installPostMoveRecordRuntime } from "../bootstrap/post-move-record-runtime";
import { installPostMoveRuntime } from "../bootstrap/post-move-runtime";
import { installPostUndoRecordRuntime } from "../bootstrap/post-undo-record-runtime";
import { installPracticeModeRuntime } from "../bootstrap/practice-mode";
import { installPrettyTimeRuntime } from "../bootstrap/pretty-time";
import { installReplayCodecRuntime } from "../bootstrap/replay-codec-runtime";
import { installReplayControlRuntime } from "../bootstrap/replay-control-runtime";
import { installReplayDispatchRuntime } from "../bootstrap/replay-dispatch-runtime";
import { installReplayExecutionRuntime } from "../bootstrap/replay-execution-runtime";
import { installReplayExportRuntime } from "../bootstrap/replay-export";
import { installReplayFlowRuntime } from "../bootstrap/replay-flow-runtime";
import { installReplayImportRuntime } from "../bootstrap/replay-import-runtime";
import { installReplayLifecycleRuntime } from "../bootstrap/replay-lifecycle-runtime";
import { installReplayLoopRuntime } from "../bootstrap/replay-loop-runtime";
import { installReplayModalRuntime } from "../bootstrap/replay-modal";
import { installReplayPageHostRuntime } from "../bootstrap/replay-page-host";
import { installReplayTimerRuntime } from "../bootstrap/replay-timer-runtime";
import { installReplayV4ActionsRuntime } from "../bootstrap/replay-v4-actions-runtime";
import { installResponsiveRelayoutRuntime } from "../bootstrap/responsive-relayout";
import { installResponsiveRelayoutHostRuntime } from "../bootstrap/responsive-relayout-host";
import { installScoringRuntime } from "../bootstrap/scoring-runtime";
import { installSettingsModalHostRuntime } from "../bootstrap/settings-modal-host";
import { installSettingsModalPageHostRuntime } from "../bootstrap/settings-modal-page-host";
import { installTimerIntervalRuntime } from "../bootstrap/timer-interval-runtime";
import { installUndoActionRuntime } from "../bootstrap/undo-action";
import { installUndoRestoreRuntime } from "../bootstrap/undo-restore-runtime";
import { installUndoRestorePayloadRuntime } from "../bootstrap/undo-restore-payload-runtime";
import { installUndoSnapshotRuntime } from "../bootstrap/undo-snapshot-runtime";
import { installUndoStackEntryRuntime } from "../bootstrap/undo-stack-entry-runtime";
import { installUndoTileRestoreRuntime } from "../bootstrap/undo-tile-restore-runtime";
import { installUndoTileSnapshotRuntime } from "../bootstrap/undo-tile-snapshot-runtime";
import { installCappedRepeatLegendRuntime } from "../core/capped-repeat-legend";
import { installFallbackModeConfigsRuntime } from "../core/game-manager-fallback-mode-configs";
import { installCappedUiManagerForwardBindingsRuntime } from "../core/capped-ui-bindings";
import { installGameManagerActuatorPayloadStateRuntime } from "../core/game-manager-actuator-payload-state";
import { installGameManagerActuatePersistenceRuntime } from "../core/game-manager-actuate-persistence";
import { installGameManagerInputEventsRuntime } from "../core/game-manager-input-events";
import { installGameManagerNormalizedUndoEntryRuntime } from "../core/game-manager-normalized-undo-entry";
import { installGameManagerRedoRestorePipelineRuntime } from "../core/game-manager-redo-restore-pipeline";
import { installGameManagerRedoRestoreStateRuntime } from "../core/game-manager-redo-restore-state";
import { installGameManagerRuntimeStateRuntime } from "../core/game-manager-runtime-state";
import { installGameManagerSavedStatePersistenceBindingRuntime } from "../core/game-manager-saved-state-persistence-binding";
import { installGameManagerTimerElapsedRuntime } from "../core/game-manager-timer-elapsed";
import { installGameManagerTimerTickRuntime } from "../core/game-manager-timer-tick";
import { installGameManagerTimerStartRuntime } from "../core/game-manager-timer-start";
import { installGameManagerTimerRowVisibleStateRuntime } from "../core/game-manager-timer-row-visible-state";
import { installGameManagerUndoMoveHandlerRuntime } from "../core/game-manager-undo-move-handler";
import { installGameManagerUndoRestoredTilesRuntime } from "../core/game-manager-undo-restored-tiles";
import { installCoreModeRuntime } from "../core/mode";
import { installPostAccessorManagerForwardBindingsRuntime } from "../core/post-accessor-manager-forward-bindings";
import { installRankedCheckpointLocalMirrorSetupRuntime } from "../core/ranked-checkpoint-local-mirror-setup";
import { installRankedSessionSetupContextRuntime } from "../core/ranked-session-setup-context";
import { installPreAccessorManagerForwardBindingsRuntime } from "../core/pre-accessor-manager-forward-bindings";
import { installResetSetupReplayAndSpawnStateRuntime } from "../core/reset-setup-replay-and-spawn-state";
import { installRestartGameRuntime } from "../core/restart-game";
import { installSavedManagerProgressStateRuntime } from "../core/saved-manager-progress-state";
import { installSavedManagerBaseStateRuntime } from "../core/saved-manager-base-state";
import { installSavedManagerReplayStateRuntime } from "../core/saved-manager-replay-state";
import { installSavedManagerTimerStateRuntime } from "../core/saved-manager-timer-state";
import { installSavedPayloadCandidateRuntime } from "../core/saved-payload-candidate";
import { installSavedPayloadPersistFallbackRuntime } from "../core/saved-payload-persist-fallback";
import { installSavedPayloadReplayStringRuntime } from "../core/saved-payload-replay-string";
import { installSavedPayloadRichnessRuntime } from "../core/saved-payload-richness";
import { installSavedStatePersistTimestampsRuntime } from "../core/saved-state-persist-timestamps";
import { installSavedStateSyncPublishRuntime } from "../core/saved-state-sync-publish";
import { installSavedStateSyncPayloadRuntime } from "../core/saved-state-sync-payload";
import { installSessionReplaySnapshotRuntime } from "../core/session-replay-snapshot";
import { installSetupGameRuntime } from "../core/setup-game";
import { installSetupRestoreInitialBoardStateRuntime } from "../core/setup-restore-initial-board-state";
import { installSetupStateInitializationRuntime } from "../core/setup-state-initialization";
import { installSetupTimerRowNormalizeRuntime } from "../core/setup-timer-row-normalize";
import { installNoXSelectionRuntime } from "../core/no-x-selection-overlay";
import { installRulesRuntime } from "../core/rules";
import { installSetupUiStateRuntime } from "../core/setup-ui-state";
import { installSingleModePageLockRuntime } from "../core/single-mode-page-lock";
import { installSpecialRulesRuntime } from "../core/special-rules";
import { installStatsPanelCopyRuntime } from "../core/stats-panel-copy";
import { installCryptoRandomRuntime } from "../utils/crypto-random";
import { loadLegacyScriptsSequentially } from "./legacy-loader";
import { getPageManifest, type RuntimeCapability } from "./runtime-manifest";
import { resolveHomeFamilyScriptsByCapabilities } from "./home-family-shared";

const NIGHT_BACKGROUND_STORAGE_KEY = "settings_night_background_enabled_v1";
const LEGACY_REPLAY_HELPERS_RUNTIME_URL = "./js/core_game_manager_replay_helpers_runtime.js?v=20260617-replay-compat";
const GAME_STARTUP_CAPABILITIES = new Set<RuntimeCapability>([
  "core",
  "capped-core",
  "standard-startup",
  "capped-startup"
]);
const UI_STARTUP_CAPABILITIES = new Set<RuntimeCapability>([
  "settings-and-panel",
  "top-button-style",
  "index-tail",
  "i18n"
]);
const INDEX_STARTUP_BUNDLE_URL = "./js/home_standard_startup_bundle.js?v=20260622-game-dialog";
const INDEX_DEFERRED_BUNDLE_URL = "./js/home_standard_deferred_bundle.js?v=20260622-game-dialog";

function readNightBackgroundPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const storageLike = resolveStorageByName({
    windowLike: window as unknown as Record<string, unknown>,
    storageName: "localStorage"
  });
  return safeReadStorageItem({
    storageLike,
    key: NIGHT_BACKGROUND_STORAGE_KEY
  }) === "1";
}

function syncNightBackgroundAttribute(): void {
  if (typeof document === "undefined" || !document.documentElement) {
    return;
  }
  if (readNightBackgroundPreference()) {
    document.documentElement.setAttribute("data-night-background", "1");
    return;
  }
  document.documentElement.removeAttribute("data-night-background");
}

function bindNightBackgroundSync(): void {
  if (typeof window === "undefined") {
    return;
  }
  const typedWindow = window as Window & { __nightBackgroundSyncBound?: boolean };
  if (typedWindow.__nightBackgroundSyncBound) {
    syncNightBackgroundAttribute();
    return;
  }
  typedWindow.__nightBackgroundSyncBound = true;
  syncNightBackgroundAttribute();
  window.addEventListener("storage", (event) => {
    if (!event || !event.key || event.key === NIGHT_BACKGROUND_STORAGE_KEY) {
      syncNightBackgroundAttribute();
    }
  });
}

async function runBootstrapPipeline(pageId: string): Promise<void> {
  const descriptor = resolvePageDescriptor(pageId);
  const hooks = createBootstrapPipeline(descriptor);
  for (const hook of hooks) {
    await hook.run();
  }
}

async function loadHomeFamilyRuntimeScripts(capabilities: readonly RuntimeCapability[]): Promise<void> {
  await loadLegacyScriptsSequentially([LEGACY_REPLAY_HELPERS_RUNTIME_URL]);
  const startupCapabilities = capabilities.filter((capability) =>
    GAME_STARTUP_CAPABILITIES.has(capability)
  );
  if (startupCapabilities.length === 0 || startupCapabilities.length === capabilities.length) {
    await loadLegacyScriptsSequentially(resolveHomeFamilyScriptsByCapabilities(capabilities));
    return;
  }

  const deferredCapabilities = capabilities.filter(
    (capability) => !GAME_STARTUP_CAPABILITIES.has(capability)
  );
  const uiStartupCapabilities = deferredCapabilities.filter((capability) =>
    UI_STARTUP_CAPABILITIES.has(capability)
  );
  const backgroundCapabilities = deferredCapabilities.filter(
    (capability) => !UI_STARTUP_CAPABILITIES.has(capability)
  );

  await loadLegacyScriptsSequentially(resolveHomeFamilyScriptsByCapabilities(startupCapabilities));
  if (uiStartupCapabilities.length > 0) {
    await loadLegacyScriptsSequentially(resolveHomeFamilyScriptsByCapabilities(uiStartupCapabilities));
  }
  if (backgroundCapabilities.length > 0) {
    void loadLegacyScriptsSequentially(resolveHomeFamilyScriptsByCapabilities(backgroundCapabilities)).catch(
      () => {}
    );
  }
}

function scheduleIndexDeferredRuntimeLoad(): void {
  if (typeof window === "undefined") return;

  const loadDeferredRuntime = () => {
    void loadLegacyScriptsSequentially([
      INDEX_DEFERRED_BUNDLE_URL,
      ...resolveHomeFamilyScriptsByCapabilities(["announcement", "leaderboard"])
    ]).catch(() => {});
  };

  const requestIdleCallback = (
    window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
    }
  ).requestIdleCallback;

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(loadDeferredRuntime, { timeout: 1_000 });
    return;
  }

  window.setTimeout(loadDeferredRuntime, 0);
}

export async function bootstrapHomeFamilyPage(pageId: string): Promise<void> {
  const manifest = getPageManifest(pageId);
  if (!manifest) {
    throw new Error(`Unknown page manifest: ${pageId}`);
  }

  bindNightBackgroundSync();
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    bindHomeUserDisplay({
      documentLike: document,
      pageId,
      windowLike: window,
      storageLike: window.localStorage
    });
  }
  await runBootstrapPipeline(pageId);
  await bootstrapRankedSessionForHomeFamilyPage(pageId).catch(() => {});
  registerEngineFacade(
    typeof window === "undefined" ? undefined : (window as unknown as EngineFacadeWindowLike)
  );
  installCryptoRandomRuntime();
  installGameManagerClientRecordIdRuntime();
  installGameManagerBaseHelpersRuntime();
  installGameManagerEnvHelpersRuntime();
  installGameManagerRuntimeCallHelpersRuntime();
  installGameManagerRuntimeAccessorHelpersRuntime();
  installAdminRescueClientServiceBoundary();
  installDirectionLockRuntime();
  installGameOverUndoHostRuntime();
  installGridScanRuntime();
  installHomeGuideRuntime();
  installHomeGuideControlsHostRuntime();
  installHomeGuideDomHostRuntime();
  installHomeGuideDoneNoticeHostRuntime();
  installHomeGuideFinishHostRuntime();
  installHomeGuideHighlightHostRuntime();
  installHomeGuidePanelHostRuntime();
  installHomeGuidePageHostRuntime();
  installHomeGuideSettingsHostRuntime();
  installHomeGuideStartHostRuntime();
  installHomeGuideStepFlowHostRuntime();
  installHomeGuideStepHostRuntime();
  installHomeGuideStepViewHostRuntime();
  installHomeGuideStartupHostRuntime();
  installHomeStartupHostRuntime();
  installModeCatalogRuntime();
  installRulesRuntime();
  installSpecialRulesRuntime();
  installSingleModePageLockRuntime();
  installNoXSelectionRuntime();
  installFallbackModeConfigsRuntime();
  installCappedRepeatLegendRuntime();
  installCappedUiManagerForwardBindingsRuntime();
  installGameManagerActuatePersistenceRuntime();
  installGameManagerActuatorPayloadStateRuntime();
  installGameManagerInputEventsRuntime();
  installGameManagerNormalizedUndoEntryRuntime();
  installGameManagerRedoRestorePipelineRuntime();
  installGameManagerRedoRestoreStateRuntime();
  installGameManagerRuntimeStateRuntime();
  installGameManagerSavedStatePersistenceBindingRuntime();
  installGameManagerTimerElapsedRuntime();
  installGameManagerTimerTickRuntime();
  installGameManagerTimerStartRuntime();
  installGameManagerTimerRowVisibleStateRuntime();
  installGameManagerUndoMoveHandlerRuntime();
  installGameManagerUndoRestoredTilesRuntime();
  installRankedCheckpointLocalMirrorSetupRuntime();
  installRankedSessionSetupContextRuntime();
  installPostAccessorManagerForwardBindingsRuntime();
  installPreAccessorManagerForwardBindingsRuntime();
  installResetSetupReplayAndSpawnStateRuntime();
  installRestartGameRuntime();
  installSavedManagerBaseStateRuntime();
  installSavedManagerProgressStateRuntime();
  installSavedManagerReplayStateRuntime();
  installSavedManagerTimerStateRuntime();
  installSavedPayloadCandidateRuntime();
  installSavedPayloadPersistFallbackRuntime();
  installSavedPayloadReplayStringRuntime();
  installSavedPayloadRichnessRuntime();
  installSavedStatePersistTimestampsRuntime();
  installSavedStateSyncPublishRuntime();
  installSavedStateSyncPayloadRuntime();
  installSessionReplaySnapshotRuntime();
  installSetupGameRuntime();
  installSetupRestoreInitialBoardStateRuntime();
  installSetupStateInitializationRuntime();
  installSetupTimerRowNormalizeRuntime();
  installSetupUiStateRuntime();
  installStatsPanelCopyRuntime();
  installCoreModeRuntime();
  installPracticeModeRuntime();
  installHomeModeRuntime();
  installUndoActionRuntime();
  installHomeRuntimeContractRuntime();
  installHomePageHostRuntime();
  installIndexUiStartupHostRuntime();
  installGameSettingsStorageRuntime();
  installMergeEffectsRuntime();
  installMoveApplyRuntime();
  installMovePathRuntime();
  installMoveScanRuntime();
  installPostMoveRecordRuntime();
  installPostMoveRuntime();
  installPostUndoRecordRuntime();
  installPrettyTimeRuntime();
  installReplayImportRuntime();
  installReplayCodecRuntime();
  installReplayV4ActionsRuntime();
  installReplayControlRuntime();
  installReplayDispatchRuntime();
  installReplayExecutionRuntime();
  installReplayExportRuntime();
  installReplayFlowRuntime();
  installReplayLifecycleRuntime();
  installReplayLoopRuntime();
  installReplayModalRuntime();
  installReplayPageHostRuntime();
  installReplayTimerRuntime();
  installGameManagerReplayHelperGlobals();
  installScoringRuntime();
  installResponsiveRelayoutRuntime();
  installResponsiveRelayoutHostRuntime();
  installSettingsModalHostRuntime();
  installSettingsModalPageHostRuntime();
  installTimerIntervalRuntime();
  installUndoRestoreRuntime();
  installUndoRestorePayloadRuntime();
  installUndoSnapshotRuntime();
  installUndoStackEntryRuntime();
  installUndoTileRestoreRuntime();
  installUndoTileSnapshotRuntime();
  if (pageId === "index") {
    await loadLegacyScriptsSequentially([LEGACY_REPLAY_HELPERS_RUNTIME_URL]);
    await loadLegacyScriptsSequentially([INDEX_STARTUP_BUNDLE_URL]);
    scheduleIndexDeferredRuntimeLoad();
    return;
  }
  await loadHomeFamilyRuntimeScripts(manifest.capabilities);
}
