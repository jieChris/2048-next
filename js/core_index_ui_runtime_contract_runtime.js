(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function ensureRuntime(windowLike, key, methodNames, errorText) {
    var runtime = toRecord(windowLike[key]);
    for (var i = 0; i < methodNames.length; i++) {
      if (!asFunction(runtime[methodNames[i]])) {
        throw new Error(errorText);
      }
    }
    return runtime;
  }

  function resolveIndexUiModalRuntimeContracts(windowLike) {
    var win = toRecord(windowLike);
    return {
      replayModalRuntime: ensureRuntime(
        win,
        "CoreReplayModalRuntime",
        [
          "applyReplayModalOpen",
          "applyReplayModalClose",
          "applySettingsModalOpen",
          "applySettingsModalClose"
        ],
        "CoreReplayModalRuntime is required"
      ),
      replayExportRuntime: ensureRuntime(
        win,
        "CoreReplayExportRuntime",
        ["applyReplayExport"],
        "CoreReplayExportRuntime is required"
      ),
      replayPageHostRuntime: ensureRuntime(
        win,
        "CoreReplayPageHostRuntime",
        [
          "createReplayPageActionResolvers",
          "applyReplayModalPageOpen",
          "applyReplayModalPageClose",
          "applyReplayExportPageAction",
          "applyReplayExportPageActionFromContext"
        ],
        "CoreReplayPageHostRuntime is required"
      ),
      settingsModalHostRuntime: ensureRuntime(
        win,
        "CoreSettingsModalHostRuntime",
        ["applySettingsModalOpenOrchestration", "applySettingsModalCloseOrchestration"],
        "CoreSettingsModalHostRuntime is required"
      ),
      settingsModalPageHostRuntime: ensureRuntime(
        win,
        "CoreSettingsModalPageHostRuntime",
        [
          "createSettingsModalInitResolvers",
          "createSettingsModalActionResolvers",
          "applySettingsModalPageOpen",
          "applySettingsModalPageClose"
        ],
        "CoreSettingsModalPageHostRuntime is required"
      )
    };
  }


  function resolveIndexUiCoreRuntimeContracts(windowLike) {
    var win = toRecord(windowLike);
    return {
      timerModuleRuntime: ensureRuntime(
        win,
        "CoreTimerModuleRuntime",
        [
          "buildTimerModuleSettingsRowInnerHtml",
          "resolveTimerModuleSettingsState",
          "resolveTimerModuleCurrentViewMode",
          "resolveTimerModuleBindingState",
          "resolveTimerModuleViewMode",
          "resolveTimerModuleAppliedViewMode",
          "resolveTimerModuleInitRetryState"
        ],
        "CoreTimerModuleRuntime is required"
      ),
      timerModuleSettingsHostRuntime: ensureRuntime(
        win,
        "CoreTimerModuleSettingsHostRuntime",
        [
          "applyLegacyUndoSettingsCleanup",
          "ensureTimerModuleSettingsToggle",
          "applyTimerModuleSettingsUi"
        ],
        "CoreTimerModuleSettingsHostRuntime is required"
      ),
      timerModuleSettingsPageHostRuntime: ensureRuntime(
        win,
        "CoreTimerModuleSettingsPageHostRuntime",
        ["applyTimerModuleSettingsPageInit"],
        "CoreTimerModuleSettingsPageHostRuntime is required"
      ),
      themeSettingsRuntime: ensureRuntime(
        win,
        "CoreThemeSettingsRuntime",
        [
          "formatThemePreviewValue",
          "resolveThemePreviewTileValues",
          "resolveThemePreviewLayout",
          "resolveThemePreviewCssSelectors",
          "resolveThemeOptions",
          "resolveThemeSelectLabel",
          "resolveThemeDropdownToggleState",
          "resolveThemeBindingState",
          "resolveThemeOptionValue",
          "resolveThemeOptionSelectedState"
        ],
        "CoreThemeSettingsRuntime is required"
      ),
      themeSettingsHostRuntime: ensureRuntime(
        win,
        "CoreThemeSettingsHostRuntime",
        ["applyThemeSettingsUi"],
        "CoreThemeSettingsHostRuntime is required"
      ),
      themeSettingsPageHostRuntime: ensureRuntime(
        win,
        "CoreThemeSettingsPageHostRuntime",
        ["applyThemeSettingsPageInit"],
        "CoreThemeSettingsPageHostRuntime is required"
      ),
      practiceTransferRuntime: ensureRuntime(
        win,
        "CorePracticeTransferRuntime",
        [
          "buildPracticeModeConfigFromCurrent",
          "buildPracticeBoardUrl",
          "buildPracticeTransferToken",
          "buildPracticeTransferPayload",
          "persistPracticeTransferPayload",
          "createPracticeTransferNavigationPlan",
          "resolvePracticeTransferPrecheck"
        ],
        "CorePracticeTransferRuntime is required"
      ),
      practiceTransferHostRuntime: ensureRuntime(
        win,
        "CorePracticeTransferHostRuntime",
        ["applyPracticeTransferFromCurrent"],
        "CorePracticeTransferHostRuntime is required"
      ),
      practiceTransferPageHostRuntime: ensureRuntime(
        win,
        "CorePracticeTransferPageHostRuntime",
        [
          "createPracticeTransferPageActionResolvers",
          "applyPracticeTransferPageAction",
          "applyPracticeTransferPageActionFromContext"
        ],
        "CorePracticeTransferPageHostRuntime is required"
      ),
      undoActionRuntime: ensureRuntime(
        win,
        "CoreUndoActionRuntime",
        [
          "tryTriggerUndo",
          "tryTriggerUndoFromContext",
          "resolveUndoModeIdFromBody",
          "resolveUndoModeId",
          "isUndoCapableMode",
          "resolveUndoCapabilityFromContext",
          "isUndoInteractionEnabled"
        ],
        "CoreUndoActionRuntime is required"
      ),
      mobileHintRuntime: ensureRuntime(
        win,
        "CoreMobileHintRuntime",
        ["collectMobileHintTexts"],
        "CoreMobileHintRuntime is required"
      ),
      mobileHintUiRuntime: ensureRuntime(
        win,
        "CoreMobileHintUiRuntime",
        [
          "syncMobileHintTextBlockVisibility",
          "resolveMobileHintDisplayModel",
          "resolveMobileHintUiState"
        ],
        "CoreMobileHintUiRuntime is required"
      ),
      mobileHintModalRuntime: ensureRuntime(
        win,
        "CoreMobileHintModalRuntime",
        ["ensureMobileHintModalDom"],
        "CoreMobileHintModalRuntime is required"
      ),
      mobileHintOpenHostRuntime: ensureRuntime(
        win,
        "CoreMobileHintOpenHostRuntime",
        ["applyMobileHintModalOpen"],
        "CoreMobileHintOpenHostRuntime is required"
      ),
      mobileHintUiHostRuntime: ensureRuntime(
        win,
        "CoreMobileHintUiHostRuntime",
        ["applyMobileHintUiSync"],
        "CoreMobileHintUiHostRuntime is required"
      ),
      mobileHintHostRuntime: ensureRuntime(
        win,
        "CoreMobileHintHostRuntime",
        ["applyMobileHintToggleInit"],
        "CoreMobileHintHostRuntime is required"
      ),
      mobileHintPageHostRuntime: ensureRuntime(
        win,
        "CoreMobileHintPageHostRuntime",
        ["createMobileHintPageResolvers"],
        "CoreMobileHintPageHostRuntime is required"
      ),
      mobileTimerboxRuntime: ensureRuntime(
        win,
        "CoreMobileTimerboxRuntime",
        [
          "resolveStoredMobileTimerboxCollapsed",
          "persistMobileTimerboxCollapsed",
          "getTimerboxToggleIconSvg",
          "resolveMobileTimerboxCollapsedValue",
          "resolveMobileTimerboxDisplayModel",
          "resolveMobileTimerboxAppliedModel"
        ],
        "CoreMobileTimerboxRuntime is required"
      ),
      mobileTimerboxHostRuntime: ensureRuntime(
        win,
        "CoreMobileTimerboxHostRuntime",
        [
          "applyMobileTimerboxToggleInit",
          "applyMobileTimerboxUiSync",
          "applyMobileTimerboxUiSyncFromContext"
        ],
        "CoreMobileTimerboxHostRuntime is required"
      ),
      mobileTimerboxPageHostRuntime: ensureRuntime(
        win,
        "CoreMobileTimerboxPageHostRuntime",
        ["createMobileTimerboxPageResolvers"],
        "CoreMobileTimerboxPageHostRuntime is required"
      ),
      mobileUndoTopRuntime: ensureRuntime(
        win,
        "CoreMobileUndoTopRuntime",
        ["resolveMobileUndoTopButtonDisplayModel", "resolveMobileUndoTopAppliedModel"],
        "CoreMobileUndoTopRuntime is required"
      ),
      mobileUndoTopHostRuntime: ensureRuntime(
        win,
        "CoreMobileUndoTopHostRuntime",
        ["applyMobileUndoTopInit"],
        "CoreMobileUndoTopHostRuntime is required"
      ),
      mobileUndoTopAvailabilityHostRuntime: ensureRuntime(
        win,
        "CoreMobileUndoTopAvailabilityHostRuntime",
        ["applyMobileUndoTopAvailabilitySync", "applyMobileUndoTopAvailabilitySyncFromContext"],
        "CoreMobileUndoTopAvailabilityHostRuntime is required"
      ),
      topActionsRuntime: ensureRuntime(
        win,
        "CoreTopActionsRuntime",
        [
          "createGameTopActionsPlacementState",
          "createPracticeTopActionsPlacementState",
          "syncGameTopActionsPlacement",
          "syncPracticeTopActionsPlacement"
        ],
        "CoreTopActionsRuntime is required"
      ),
      topActionsHostRuntime: ensureRuntime(
        win,
        "CoreTopActionsHostRuntime",
        ["applyGameTopActionsPlacementSync", "applyPracticeTopActionsPlacementSync"],
        "CoreTopActionsHostRuntime is required"
      ),
      topActionsPageHostRuntime: ensureRuntime(
        win,
        "CoreTopActionsPageHostRuntime",
        ["createTopActionsPageResolvers"],
        "CoreTopActionsPageHostRuntime is required"
      ),
      mobileTopButtonsRuntime: ensureRuntime(
        win,
        "CoreMobileTopButtonsRuntime",
        ["ensureMobileUndoTopButtonDom", "ensureMobileHintToggleButtonDom"],
        "CoreMobileTopButtonsRuntime is required"
      ),
      mobileTopButtonsPageHostRuntime: ensureRuntime(
        win,
        "CoreMobileTopButtonsPageHostRuntime",
        ["createMobileTopButtonsPageResolvers"],
        "CoreMobileTopButtonsPageHostRuntime is required"
      ),
      mobileViewportRuntime: ensureRuntime(
        win,
        "CoreMobileViewportRuntime",
        [
          "isViewportAtMost",
          "isCompactGameViewport",
          "isTimerboxCollapseViewport",
          "isMobileGameViewport",
          "resolvePageScopeValue",
          "isGamePageScope",
          "isPracticePageScope",
          "isTimerboxMobileScope"
        ],
        "CoreMobileViewportRuntime is required"
      ),
      mobileViewportPageHostRuntime: ensureRuntime(
        win,
        "CoreMobileViewportPageHostRuntime",
        ["createMobileViewportPageResolvers"],
        "CoreMobileViewportPageHostRuntime is required"
      ),
      storageRuntime: ensureRuntime(
        win,
        "CoreStorageRuntime",
        ["resolveStorageByName", "safeSetStorageItem", "safeReadStorageItem"],
        "CoreStorageRuntime is required"
      ),
      prettyTimeRuntime: ensureRuntime(
        win,
        "CorePrettyTimeRuntime",
        ["formatPrettyTime"],
        "CorePrettyTimeRuntime is required"
      ),
      responsiveRelayoutRuntime: ensureRuntime(
        win,
        "CoreResponsiveRelayoutRuntime",
        ["resolveResponsiveRelayoutRequest", "applyResponsiveRelayout"],
        "CoreResponsiveRelayoutRuntime is required"
      ),
      responsiveRelayoutHostRuntime: ensureRuntime(
        win,
        "CoreResponsiveRelayoutHostRuntime",
        ["applyResponsiveRelayoutRequest", "applyResponsiveRelayoutRequestFromContext"],
        "CoreResponsiveRelayoutHostRuntime is required"
      ),
      topActionBindingsHostRuntime: ensureRuntime(
        win,
        "CoreTopActionBindingsHostRuntime",
        ["applyTopActionBindings"],
        "CoreTopActionBindingsHostRuntime is required"
      ),
      gameOverUndoHostRuntime: ensureRuntime(
        win,
        "CoreGameOverUndoHostRuntime",
        ["bindGameOverUndoControl"],
        "CoreGameOverUndoHostRuntime is required"
      ),
      indexUiStartupHostRuntime: ensureRuntime(
        win,
        "CoreIndexUiStartupHostRuntime",
        ["applyIndexUiStartup"],
        "CoreIndexUiStartupHostRuntime is required"
      ),
      indexUiPageHostRuntime: ensureRuntime(
        win,
        "CoreIndexUiPageHostRuntime",
        ["createIndexUiTryUndoHandler", "applyIndexUiPageBootstrap"],
        "CoreIndexUiPageHostRuntime is required"
      ),
      indexUiPageResolversHostRuntime: ensureRuntime(
        win,
        "CoreIndexUiPageResolversHostRuntime",
        ["createIndexUiMobileResolvers"],
        "CoreIndexUiPageResolversHostRuntime is required"
      ),
      indexUiPageActionsHostRuntime: ensureRuntime(
        win,
        "CoreIndexUiPageActionsHostRuntime",
        ["createIndexUiPageActionResolvers"],
        "CoreIndexUiPageActionsHostRuntime is required"
      )
    };
  }

  function resolveIndexUiRuntimeContractsCompat(runtimeLike, windowLike) {
    var runtime = toRecord(runtimeLike);
    var resolveBundle = asFunction(runtime.resolveIndexUiRuntimeContracts);
    if (resolveBundle) {
      var bundle = toRecord(resolveBundle(windowLike));
      if (
        isRecord(bundle.modalContracts) &&
        isRecord(bundle.coreContracts)
      ) {
        return {
          modalContracts: bundle.modalContracts,
          coreContracts: bundle.coreContracts
        };
      }
    }

    var resolveModalContracts = asFunction(runtime.resolveIndexUiModalRuntimeContracts);
    var resolveCoreContracts = asFunction(runtime.resolveIndexUiCoreRuntimeContracts);
    if (!resolveModalContracts || !resolveCoreContracts) {
      throw new Error("CoreIndexUiRuntimeContractRuntime is required");
    }

    return {
      modalContracts: toRecord(resolveModalContracts(windowLike)),
      coreContracts: toRecord(resolveCoreContracts(windowLike))
    };
  }

  function resolveIndexUiRuntimeContracts(windowLike) {
    return {
      modalContracts: resolveIndexUiModalRuntimeContracts(windowLike),
      coreContracts: resolveIndexUiCoreRuntimeContracts(windowLike)
    };
  }

  global.CoreIndexUiRuntimeContractRuntime = global.CoreIndexUiRuntimeContractRuntime || {};
  global.CoreIndexUiRuntimeContractRuntime.resolveIndexUiModalRuntimeContracts =
    resolveIndexUiModalRuntimeContracts;
  global.CoreIndexUiRuntimeContractRuntime.resolveIndexUiCoreRuntimeContracts =
    resolveIndexUiCoreRuntimeContracts;
  global.CoreIndexUiRuntimeContractRuntime.resolveIndexUiRuntimeContractsCompat =
    resolveIndexUiRuntimeContractsCompat;
  global.CoreIndexUiRuntimeContractRuntime.resolveIndexUiRuntimeContracts =
    resolveIndexUiRuntimeContracts;
})(typeof window !== "undefined" ? window : undefined);
