// Logic extracted from index.html

var indexUiRuntimeContractRuntime = window.CoreIndexUiRuntimeContractRuntime;
var windowLike = typeof window !== "undefined" ? window : null;
if (
  !indexUiRuntimeContractRuntime ||
  typeof indexUiRuntimeContractRuntime.resolveIndexUiRuntimeContractsCompat !== "function"
) {
  throw new Error("CoreIndexUiRuntimeContractRuntime is required");
}
var indexUiRuntimeContractsBundle =
  indexUiRuntimeContractRuntime.resolveIndexUiRuntimeContractsCompat(
    indexUiRuntimeContractRuntime,
    windowLike
  );
var modalContracts = indexUiRuntimeContractsBundle.modalContracts;
var homeGuideContracts = indexUiRuntimeContractsBundle.homeGuideContracts;
var coreContracts = indexUiRuntimeContractsBundle.coreContracts;
var indexUiPageHostRuntime = coreContracts.indexUiPageHostRuntime;
var indexUiPageResolversHostRuntime = coreContracts.indexUiPageResolversHostRuntime;
var indexUiPageActionsHostRuntime = coreContracts.indexUiPageActionsHostRuntime;
var tryUndoFromUi = indexUiPageHostRuntime.createIndexUiTryUndoHandler({
  undoActionRuntime: coreContracts.undoActionRuntime,
  windowLike: windowLike
});
if (typeof tryUndoFromUi !== "function") {
  throw new Error("CoreIndexUiPageHostRuntime is required");
}
if (typeof indexUiPageHostRuntime.createIndexUiBootstrapResolvers !== "function") {
  throw new Error("CoreIndexUiPageHostRuntime is required");
}

var indexUiBootstrapResolvers = indexUiPageHostRuntime.createIndexUiBootstrapResolvers({
  indexUiPageResolversHostRuntime: indexUiPageResolversHostRuntime,
  indexUiPageActionsHostRuntime: indexUiPageActionsHostRuntime,
  coreContracts: coreContracts,
  modalContracts: modalContracts,
  homeGuideContracts: homeGuideContracts,
  documentLike: document,
  windowLike: windowLike,
  tryUndoFromUi: tryUndoFromUi
});
if (!indexUiBootstrapResolvers || typeof indexUiBootstrapResolvers !== "object") {
  throw new Error("CoreIndexUiPageHostRuntime is required");
}
indexUiPageHostRuntime.applyIndexUiPageBootstrap({
  indexUiStartupHostRuntime: coreContracts.indexUiStartupHostRuntime,
  topActionBindingsHostRuntime: coreContracts.topActionBindingsHostRuntime,
  gameOverUndoHostRuntime: coreContracts.gameOverUndoHostRuntime,
  documentLike: document,
  windowLike: windowLike,
  tryUndoFromUi: tryUndoFromUi,
  exportReplay: indexUiBootstrapResolvers.exportReplay,
  closeReplayModal: indexUiBootstrapResolvers.closeReplayModal,
  openPracticeBoardFromCurrent: indexUiBootstrapResolvers.openPracticeBoardFromCurrent,
  openSettingsModal: indexUiBootstrapResolvers.openSettingsModal,
  closeSettingsModal: indexUiBootstrapResolvers.closeSettingsModal,
  initThemeSettingsUI: indexUiBootstrapResolvers.initThemeSettingsUI,
  removeLegacyUndoSettingsUI: indexUiBootstrapResolvers.removeLegacyUndoSettingsUI,
  initTimerModuleSettingsUI: indexUiBootstrapResolvers.initTimerModuleSettingsUI,
  initMobileHintToggle: indexUiBootstrapResolvers.initMobileHintToggle,
  initMobileUndoTopButton: indexUiBootstrapResolvers.initMobileUndoTopButton,
  initHomeGuideSettingsUI: indexUiBootstrapResolvers.initHomeGuideSettingsUI,
  autoStartHomeGuideIfNeeded: indexUiBootstrapResolvers.autoStartHomeGuideIfNeeded,
  initMobileTimerboxToggle: indexUiBootstrapResolvers.initMobileTimerboxToggle,
  requestResponsiveGameRelayout: indexUiBootstrapResolvers.requestResponsiveGameRelayout,
  syncMobileTimerboxUI: indexUiBootstrapResolvers.syncMobileTimerboxUI,
  syncMobileHintUI: indexUiBootstrapResolvers.syncMobileHintUI,
  syncMobileUndoTopButtonAvailability: indexUiBootstrapResolvers.syncMobileUndoTopButtonAvailability,
  prettyTimeRuntime: coreContracts.prettyTimeRuntime
});
