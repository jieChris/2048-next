import { createBootstrapPipeline, resolvePageDescriptor } from "../bootstrap/page-bootstrap";
import { registerEngineFacade, type EngineFacadeWindowLike } from "../bootstrap/engine-facade-host";
import { bootstrapRankedSessionForHomeFamilyPage } from "../bootstrap/ranked-session";
import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";
import { bindHomeUserDisplay } from "../bootstrap/home-user-display";
import { installAdminRescueClientServiceBoundary } from "../bootstrap/admin-rescue-client-service-boundary";
import { installDirectionLockRuntime } from "../bootstrap/direction-lock-runtime";
import { installGameOverUndoHostRuntime } from "../bootstrap/game-over-undo-host";
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
import { loadLegacyScriptsSequentially } from "./legacy-loader";
import { getPageManifest, type RuntimeCapability } from "./runtime-manifest";
import { resolveHomeFamilyScriptsByCapabilities } from "./home-family-shared";

const NIGHT_BACKGROUND_STORAGE_KEY = "settings_night_background_enabled_v1";
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
const INDEX_STARTUP_BUNDLE_URL = "./js/home_standard_startup_bundle.js?v=20260609-rescue-sync1";
const INDEX_DEFERRED_BUNDLE_URL = "./js/home_standard_deferred_bundle.js?v=20260609-rescue-sync1";

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
  if (pageId === "index" && typeof window !== "undefined" && typeof document !== "undefined") {
    bindHomeUserDisplay({
      documentLike: document,
      windowLike: window,
      storageLike: window.localStorage
    });
  }
  await runBootstrapPipeline(pageId);
  await bootstrapRankedSessionForHomeFamilyPage(pageId).catch(() => {});
  registerEngineFacade(
    typeof window === "undefined" ? undefined : (window as unknown as EngineFacadeWindowLike)
  );
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
  installPracticeModeRuntime();
  installHomeModeRuntime();
  installUndoActionRuntime();
  installHomeRuntimeContractRuntime();
  installHomePageHostRuntime();
  installIndexUiStartupHostRuntime();
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
    await loadLegacyScriptsSequentially([INDEX_STARTUP_BUNDLE_URL]);
    scheduleIndexDeferredRuntimeLoad();
    return;
  }
  await loadHomeFamilyRuntimeScripts(manifest.capabilities);
}
