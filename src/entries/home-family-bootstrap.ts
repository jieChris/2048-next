import {
  createBootstrapPipeline,
  resolvePageDescriptor,
} from "../bootstrap/page-bootstrap";
import {
  registerEngineFacade,
  type EngineFacadeWindowLike,
} from "../bootstrap/engine-facade-host";
import {
  runBetaAccessGate,
  shouldRunBetaAccessGate,
} from "../bootstrap/access-gate";
import { bootstrapRankedSessionForHomeFamilyPage } from "../bootstrap/ranked-session";
import { restoreAuthSession } from "../services/auth-session";
import { getAccountPaletteSessionController } from "../features/palette/account-palette-session";
import { bindHomeUserDisplay } from "../bootstrap/home-user-display";
import { resolveStorageByName } from "../bootstrap/storage";
import { installAdminRescueClientServiceBoundary } from "../bootstrap/admin-rescue-client-service-boundary";
import { installAchievementUnlockToastRuntime } from "../bootstrap/achievement-unlock-toast";
import { installDirectionLockRuntime } from "../bootstrap/direction-lock-runtime";
import { installBreakoutEasterEggRuntime } from "../bootstrap/breakout-easter-egg";
import { installFlyingClickEffectRuntime } from "../bootstrap/flying-click-effect";
import { installGameOverUndoHostRuntime } from "../bootstrap/game-over-undo-host";
import { bindMobilePageScrollLock } from "../bootstrap/mobile-viewport";
import { installGameManagerBaseHelpersRuntime } from "../bootstrap/game-manager-base-helpers-runtime";
import { installGameManagerClientRecordIdRuntime } from "../bootstrap/game-manager-client-record-id-runtime";
import { installGameManagerEnvHelpersRuntime } from "../bootstrap/game-manager-env-helpers-runtime";
import { installGameManagerReplayHelperGlobals } from "../bootstrap/game-manager-replay-helpers-runtime";
import { installGameManagerRuntimeAccessorHelpersRuntime } from "../bootstrap/game-manager-runtime-accessor-helpers-runtime";
import { installGameManagerRuntimeCallHelpersRuntime } from "../bootstrap/game-manager-runtime-call-helpers-runtime";
import { installGameSettingsStorageRuntime } from "../bootstrap/game-settings-storage-runtime";
import { installGridScanRuntime } from "../bootstrap/grid-scan-runtime";
import { installHomeModeRuntime } from "../bootstrap/home-mode";
import { installHomePageHostRuntime } from "../bootstrap/home-page-host";
import { installHomeRuntimeContractRuntime } from "../bootstrap/home-runtime-contract";
import { installHomeStartupHostRuntime } from "../bootstrap/home-startup-host";
import { initOperationFeedbackSettingsUI } from "../bootstrap/operation-feedback-settings";
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
import { installReplayFlowRuntime } from "../bootstrap/replay-flow-runtime";
import { installReplayImportRuntime } from "../bootstrap/replay-import-runtime";
import { installReplayLifecycleRuntime } from "../bootstrap/replay-lifecycle-runtime";
import { installReplayLoopRuntime } from "../bootstrap/replay-loop-runtime";
import { installReplayTimerRuntime } from "../bootstrap/replay-timer-runtime";
import { installReplayV4ActionsRuntime } from "../bootstrap/replay-v4-actions-runtime";
import { installResponsiveRelayoutRuntime } from "../bootstrap/responsive-relayout";
import { installResponsiveRelayoutHostRuntime } from "../bootstrap/responsive-relayout-host";
import { installScoringRuntime } from "../bootstrap/scoring-runtime";
import { installTimerIntervalRuntime } from "../bootstrap/timer-interval-runtime";
import { installUndoActionRuntime } from "../bootstrap/undo-action";
import { installUndoRestoreRuntime } from "../bootstrap/undo-restore-runtime";
import { installUndoRestorePayloadRuntime } from "../bootstrap/undo-restore-payload-runtime";
import { installUndoSnapshotRuntime } from "../bootstrap/undo-snapshot-runtime";
import { installUndoStackEntryRuntime } from "../bootstrap/undo-stack-entry-runtime";
import { installUndoTileRestoreRuntime } from "../bootstrap/undo-tile-restore-runtime";
import { installUndoTileSnapshotRuntime } from "../bootstrap/undo-tile-snapshot-runtime";
import { installCappedRepeatLegendRuntime } from "../core/capped-repeat-legend";
import { installCustomSecondaryTimerRuntime } from "../core/custom-secondary-timers";
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
import { bindDisplayModeSync } from "../bootstrap/display-mode";

const GAME_STARTUP_CAPABILITIES = new Set<RuntimeCapability>([
  "core",
  "capped-core",
  "standard-startup",
  "capped-startup",
]);
const UI_STARTUP_CAPABILITIES = new Set<RuntimeCapability>([
  "settings-and-panel",
  "top-button-style",
  "index-tail",
  "i18n",
]);
const INDEX_STARTUP_BUNDLE_URL =
  "./js/home_standard_startup_bundle.js?v=20260803-operation-feedback";
const INDEX_DEFERRED_SIDE_EFFECT_RUNTIME_NAMES = [
  "core_capped_timer_scroll_runtime",
  "capped_timer_scroll",
  "core_bgm_runtime",
  "core_night_mode_runtime",
  "core_top_button_style_runtime",
  "core_top_action_bindings_host_runtime",
  "core_i18n_runtime",
] as const;
const LEGACY_INDEX_UI_RUNTIME_NAMES = [
  "core_index_ui_runtime_contract_runtime",
  "core_index_ui_page_host_runtime",
  "core_index_ui_page_resolvers_host_runtime",
  "core_index_ui_page_actions_host_runtime",
  "index_ui",
] as const;

function bindNightBackgroundSync(): void {
  if (typeof window === "undefined") {
    return;
  }
  const typedWindow = window as Window & {
    __nightBackgroundSyncBound?: boolean;
  };
  if (typedWindow.__nightBackgroundSyncBound) {
    bindDisplayModeSync({ documentLike: document, windowLike: window });
    return;
  }
  typedWindow.__nightBackgroundSyncBound = true;
  bindDisplayModeSync({ documentLike: document, windowLike: window });
}

function bindHomeFamilyMobilePageScrollLock(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  bindMobilePageScrollLock({
    documentLike: document,
    windowLike: window,
    navigatorLike: navigator,
    bodyLike: document.body,
    maxWidth: 760,
  });
}

function resolveIndexDeferredSideEffectScripts(): readonly string[] {
  return resolveHomeFamilyScriptsByCapabilities([
    "settings-and-panel",
    "top-button-style",
    "index-tail",
    "i18n",
  ]).filter((scriptUrl) =>
    INDEX_DEFERRED_SIDE_EFFECT_RUNTIME_NAMES.some((runtimeName) =>
      scriptUrl.includes(runtimeName),
    ),
  );
}

function shouldApplyIndexUiBootstrapFromTs(
  capabilities: readonly RuntimeCapability[],
): boolean {
  return capabilities.includes("index-tail") || capabilities.includes("play");
}

function filterLegacyIndexUiScripts(
  scripts: readonly string[],
): readonly string[] {
  return scripts.filter(
    (scriptUrl) =>
      !LEGACY_INDEX_UI_RUNTIME_NAMES.some((runtimeName) =>
        scriptUrl.includes(runtimeName),
      ),
  );
}

function resolveHomeFamilyRuntimeScriptsForLoad(
  capabilities: readonly RuntimeCapability[],
  useTsIndexUiBootstrap: boolean,
): readonly string[] {
  const scripts = resolveHomeFamilyScriptsByCapabilities(capabilities);
  return useTsIndexUiBootstrap ? filterLegacyIndexUiScripts(scripts) : scripts;
}

async function applyIndexUiBootstrapFromTsRuntime(): Promise<void> {
  const { applyIndexUiBootstrapFromTsRuntime } = await import(
    "./index-ui-bootstrap"
  );
  applyIndexUiBootstrapFromTsRuntime();
}

async function runBootstrapPipeline(pageId: string): Promise<void> {
  const descriptor = resolvePageDescriptor(pageId);
  const hooks = createBootstrapPipeline(descriptor);
  for (const hook of hooks) {
    await hook.run();
  }
}

async function loadHomeFamilyRuntimeScripts(
  capabilities: readonly RuntimeCapability[],
): Promise<void> {
  const useTsIndexUiBootstrap = shouldApplyIndexUiBootstrapFromTs(capabilities);
  const startupCapabilities = capabilities.filter((capability) =>
    GAME_STARTUP_CAPABILITIES.has(capability),
  );
  if (
    startupCapabilities.length === 0 ||
    startupCapabilities.length === capabilities.length
  ) {
    await loadLegacyScriptsSequentially(
      resolveHomeFamilyRuntimeScriptsForLoad(
        capabilities,
        useTsIndexUiBootstrap,
      ),
    );
    if (useTsIndexUiBootstrap) {
      await applyIndexUiBootstrapFromTsRuntime();
    }
    return;
  }

  const deferredCapabilities = capabilities.filter(
    (capability) => !GAME_STARTUP_CAPABILITIES.has(capability),
  );
  const uiStartupCapabilities = deferredCapabilities.filter((capability) =>
    UI_STARTUP_CAPABILITIES.has(capability),
  );
  const backgroundCapabilities = deferredCapabilities.filter(
    (capability) => !UI_STARTUP_CAPABILITIES.has(capability),
  );

  await loadLegacyScriptsSequentially(
    resolveHomeFamilyRuntimeScriptsForLoad(
      startupCapabilities,
      useTsIndexUiBootstrap,
    ),
  );
  if (uiStartupCapabilities.length > 0) {
    await loadLegacyScriptsSequentially(
      resolveHomeFamilyRuntimeScriptsForLoad(
        uiStartupCapabilities,
        useTsIndexUiBootstrap,
      ),
    );
  }
  if (useTsIndexUiBootstrap) {
    await applyIndexUiBootstrapFromTsRuntime();
  }
  if (backgroundCapabilities.length > 0) {
    void loadLegacyScriptsSequentially(
      resolveHomeFamilyRuntimeScriptsForLoad(
        backgroundCapabilities,
        useTsIndexUiBootstrap,
      ),
    ).catch(() => {});
  }
}

async function runIndexDeferredRuntimeLoad(): Promise<void> {
  const sideEffectScripts = resolveIndexDeferredSideEffectScripts();
  const sideEffectsReady =
    sideEffectScripts.length > 0
      ? loadLegacyScriptsSequentially(sideEffectScripts)
      : Promise.resolve();
  const indexUiReady = sideEffectsReady
    .then(() => applyIndexUiBootstrapFromTsRuntime())
    .catch(() => {});
  const leaderboardReady = loadLegacyScriptsSequentially(
    resolveHomeFamilyScriptsByCapabilities(["leaderboard"]),
  );

  await Promise.all([indexUiReady, leaderboardReady]);
}

function scheduleIndexDeferredRuntimeLoad(): void {
  if (typeof window === "undefined") return;

  let started = false;
  const loadDeferredRuntime = () => {
    if (started) return;
    started = true;
    void runIndexDeferredRuntimeLoad().catch(() => {});
  };

  const requestIdleCallback = (
    window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout?: number },
      ) => number;
    }
  ).requestIdleCallback;

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(loadDeferredRuntime, { timeout: 1_500 });
    return;
  }

  window.setTimeout(loadDeferredRuntime, 300);
}

export async function bootstrapHomeFamilyPage(pageId: string): Promise<void> {
  const manifest = getPageManifest(pageId);
  if (!manifest) {
    throw new Error(`Unknown page manifest: ${pageId}`);
  }

  const accountPaletteSession = getAccountPaletteSessionController();
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const storageLike = resolveStorageByName({
      // SAFETY: the helper only reads the named Web Storage property from Window.
      windowLike: window as unknown as Record<string, unknown>,
      storageName: "localStorage",
    });
    bindHomeUserDisplay({
      documentLike: document,
      pageId,
      windowLike: window,
      storageLike,
    });
  }

  await restoreAuthSession().catch(() => ({
    status: "transient_error" as const,
    code: "NETWORK_ERROR",
  }));
  if (
    typeof window !== "undefined" &&
    typeof window.localStorage?.getItem === "function"
  ) {
    void accountPaletteSession.bootstrap().catch(() => {});
  }
  bindNightBackgroundSync();
  if (shouldRunBetaAccessGate(pageId)) {
    const access = await runBetaAccessGate(pageId);
    if (!access.allowed) return;
  }
  bindHomeFamilyMobilePageScrollLock();
  await runBootstrapPipeline(pageId);
  await bootstrapRankedSessionForHomeFamilyPage(pageId).catch(() => {});
  const engineFacadeWindow: EngineFacadeWindowLike | undefined =
    typeof window === "undefined"
      ? undefined
      : (() => {
          // SAFETY: this adapter reads only the legacy engine globals installed on browser Window.
          return window as unknown as EngineFacadeWindowLike;
        })();
  registerEngineFacade(engineFacadeWindow);
  installCryptoRandomRuntime();
  installGameManagerClientRecordIdRuntime();
  installCustomSecondaryTimerRuntime();
  installGameManagerBaseHelpersRuntime();
  installGameManagerEnvHelpersRuntime();
  installGameManagerRuntimeCallHelpersRuntime();
  installGameManagerRuntimeAccessorHelpersRuntime();
  installAdminRescueClientServiceBoundary();
  installDirectionLockRuntime();
  installAchievementUnlockToastRuntime();
  installBreakoutEasterEggRuntime();
  installFlyingClickEffectRuntime();
  installGameOverUndoHostRuntime();
  installGridScanRuntime();
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
  installReplayFlowRuntime();
  installReplayLifecycleRuntime();
  installReplayLoopRuntime();
  installReplayTimerRuntime();
  installGameManagerReplayHelperGlobals();
  installScoringRuntime();
  installResponsiveRelayoutRuntime();
  installResponsiveRelayoutHostRuntime();
  installTimerIntervalRuntime();
  installUndoRestoreRuntime();
  installUndoRestorePayloadRuntime();
  installUndoSnapshotRuntime();
  installUndoStackEntryRuntime();
  installUndoTileRestoreRuntime();
  installUndoTileSnapshotRuntime();
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    initOperationFeedbackSettingsUI({
      documentLike: document,
      windowLike: window,
    });
  }
  if (pageId === "index") {
    await loadLegacyScriptsSequentially([INDEX_STARTUP_BUNDLE_URL]);
    accountPaletteSession.applyToThemeManager(
      typeof window === "undefined"
        ? undefined
        : (window as Window & { ThemeManager?: Record<string, unknown> })
            .ThemeManager,
    );
    if (manifest.capabilities.includes("announcement")) {
      await loadLegacyScriptsSequentially(
        resolveHomeFamilyScriptsByCapabilities(["announcement"]),
      );
    }
    scheduleIndexDeferredRuntimeLoad();
    return;
  }
  await loadHomeFamilyRuntimeScripts(manifest.capabilities);
  accountPaletteSession.applyToThemeManager(
    typeof window === "undefined"
      ? undefined
      : (window as Window & { ThemeManager?: Record<string, unknown> })
          .ThemeManager,
  );
}
