function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function asContractShape<T>(value: unknown): T {
  return toRecord(value) as unknown as T;
}

function ensureRuntime(windowLike: Record<string, unknown>, key: string, methodNames: string[], errorText: string) {
  const runtime = toRecord(windowLike[key]);
  for (let i = 0; i < methodNames.length; i++) {
    const method = methodNames[i];
    if (!asFunction(runtime[method])) {
      throw new Error(errorText);
    }
  }
  return runtime;
}

export interface IndexUiModalRuntimeContracts {
  replayModalRuntime: Record<string, unknown>;
  replayExportRuntime: Record<string, unknown>;
  replayPageHostRuntime: Record<string, unknown>;
  settingsModalHostRuntime: Record<string, unknown>;
  settingsModalPageHostRuntime: Record<string, unknown>;
}

export interface IndexUiHomeGuideRuntimeContracts {
  homeGuideRuntime: Record<string, unknown>;
  homeGuideStartupHostRuntime: Record<string, unknown>;
  homeGuideSettingsHostRuntime: Record<string, unknown>;
  homeGuidePageHostRuntime: Record<string, unknown>;
  homeGuideDomHostRuntime: Record<string, unknown>;
  homeGuideDoneNoticeHostRuntime: Record<string, unknown>;
  homeGuideHighlightHostRuntime: Record<string, unknown>;
  homeGuidePanelHostRuntime: Record<string, unknown>;
  homeGuideFinishHostRuntime: Record<string, unknown>;
  homeGuideStartHostRuntime: Record<string, unknown>;
  homeGuideControlsHostRuntime: Record<string, unknown>;
  homeGuideStepFlowHostRuntime: Record<string, unknown>;
  homeGuideStepHostRuntime: Record<string, unknown>;
  homeGuideStepViewHostRuntime: Record<string, unknown>;
}

export interface IndexUiCoreRuntimeContracts {
  timerModuleRuntime: Record<string, unknown>;
  timerModuleSettingsHostRuntime: Record<string, unknown>;
  timerModuleSettingsPageHostRuntime: Record<string, unknown>;
  themeSettingsRuntime: Record<string, unknown>;
  themeSettingsHostRuntime: Record<string, unknown>;
  themeSettingsPageHostRuntime: Record<string, unknown>;
  practiceTransferRuntime: Record<string, unknown>;
  practiceTransferHostRuntime: Record<string, unknown>;
  practiceTransferPageHostRuntime: Record<string, unknown>;
  undoActionRuntime: Record<string, unknown>;
  mobileHintRuntime: Record<string, unknown>;
  mobileHintUiRuntime: Record<string, unknown>;
  mobileHintModalRuntime: Record<string, unknown>;
  mobileHintOpenHostRuntime: Record<string, unknown>;
  mobileHintUiHostRuntime: Record<string, unknown>;
  mobileHintHostRuntime: Record<string, unknown>;
  mobileHintPageHostRuntime: Record<string, unknown>;
  mobileTimerboxRuntime: Record<string, unknown>;
  mobileTimerboxHostRuntime: Record<string, unknown>;
  mobileTimerboxPageHostRuntime: Record<string, unknown>;
  mobileUndoTopRuntime: Record<string, unknown>;
  mobileUndoTopHostRuntime: Record<string, unknown>;
  mobileUndoTopAvailabilityHostRuntime: Record<string, unknown>;
  topActionsRuntime: Record<string, unknown>;
  topActionsHostRuntime: Record<string, unknown>;
  topActionsPageHostRuntime: Record<string, unknown>;
  mobileTopButtonsRuntime: Record<string, unknown>;
  mobileTopButtonsPageHostRuntime: Record<string, unknown>;
  mobileViewportRuntime: Record<string, unknown>;
  mobileViewportPageHostRuntime: Record<string, unknown>;
  storageRuntime: Record<string, unknown>;
  prettyTimeRuntime: Record<string, unknown>;
  responsiveRelayoutRuntime: Record<string, unknown>;
  responsiveRelayoutHostRuntime: Record<string, unknown>;
  topActionBindingsHostRuntime: Record<string, unknown>;
  gameOverUndoHostRuntime: Record<string, unknown>;
  indexUiStartupHostRuntime: Record<string, unknown>;
  indexUiPageHostRuntime: Record<string, unknown>;
  indexUiPageResolversHostRuntime: Record<string, unknown>;
  indexUiPageActionsHostRuntime: Record<string, unknown>;
}

export interface IndexUiRuntimeContractsBundle {
  modalContracts: IndexUiModalRuntimeContracts;
  homeGuideContracts: IndexUiHomeGuideRuntimeContracts;
  coreContracts: IndexUiCoreRuntimeContracts;
}

export function resolveIndexUiRuntimeContractsCompat(
  runtimeLike: unknown,
  windowLike: unknown
): IndexUiRuntimeContractsBundle {
  const runtime = toRecord(runtimeLike);

  const resolveBundle = asFunction<(input: unknown) => unknown>(runtime.resolveIndexUiRuntimeContracts);
  if (resolveBundle) {
    const bundle = toRecord(resolveBundle(windowLike));
    if (
      isRecord(bundle.modalContracts) &&
      isRecord(bundle.homeGuideContracts) &&
      isRecord(bundle.coreContracts)
    ) {
      return {
        modalContracts: asContractShape<IndexUiModalRuntimeContracts>(bundle.modalContracts),
        homeGuideContracts: asContractShape<IndexUiHomeGuideRuntimeContracts>(
          bundle.homeGuideContracts
        ),
        coreContracts: asContractShape<IndexUiCoreRuntimeContracts>(bundle.coreContracts)
      };
    }
  }

  const resolveModalContracts = asFunction<(input: unknown) => unknown>(
    runtime.resolveIndexUiModalRuntimeContracts
  );
  const resolveHomeGuideContracts = asFunction<(input: unknown) => unknown>(
    runtime.resolveIndexUiHomeGuideRuntimeContracts
  );
  const resolveCoreContracts = asFunction<(input: unknown) => unknown>(
    runtime.resolveIndexUiCoreRuntimeContracts
  );

  if (!resolveModalContracts || !resolveHomeGuideContracts || !resolveCoreContracts) {
    throw new Error("CoreIndexUiRuntimeContractRuntime is required");
  }

  return {
    modalContracts: asContractShape<IndexUiModalRuntimeContracts>(
      resolveModalContracts(windowLike)
    ),
    homeGuideContracts: asContractShape<IndexUiHomeGuideRuntimeContracts>(
      resolveHomeGuideContracts(windowLike)
    ),
    coreContracts: asContractShape<IndexUiCoreRuntimeContracts>(resolveCoreContracts(windowLike))
  };
}

export function resolveIndexUiModalRuntimeContracts(windowLike: unknown): IndexUiModalRuntimeContracts {
  const win = toRecord(windowLike);
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

export function resolveIndexUiHomeGuideRuntimeContracts(
  windowLike: unknown
): IndexUiHomeGuideRuntimeContracts {
  const win = toRecord(windowLike);
  return {
    homeGuideRuntime: ensureRuntime(
      win,
      "CoreHomeGuideRuntime",
      [
        "resolveHomeGuidePathname",
        "isHomePagePath",
        "buildHomeGuideSteps",
        "buildHomeGuidePanelInnerHtml",
        "buildHomeGuideSettingsRowInnerHtml",
        "readHomeGuideSeenValue",
        "markHomeGuideSeen",
        "shouldAutoStartHomeGuide",
        "resolveHomeGuideAutoStart",
        "resolveHomeGuideSettingsState",
        "resolveHomeGuideStepUiState",
        "resolveHomeGuideStepRenderState",
        "resolveHomeGuideStepIndexState",
        "resolveHomeGuideStepTargetState",
        "resolveHomeGuideElevationPlan",
        "resolveHomeGuideBindingState",
        "resolveHomeGuideControlAction",
        "resolveHomeGuideToggleAction",
        "resolveHomeGuideLifecycleState",
        "resolveHomeGuideSessionState",
        "resolveHomeGuideLayerDisplayState",
        "resolveHomeGuideFinishState",
        "resolveHomeGuideTargetScrollState",
        "resolveHomeGuideDoneNotice",
        "resolveHomeGuideDoneNoticeStyle",
        "resolveHomeGuidePanelLayout",
        "isHomeGuideTargetVisible"
      ],
      "CoreHomeGuideRuntime is required"
    ),
    homeGuideStartupHostRuntime: ensureRuntime(
      win,
      "CoreHomeGuideStartupHostRuntime",
      ["applyHomeGuideAutoStart"],
      "CoreHomeGuideStartupHostRuntime is required"
    ),
    homeGuideSettingsHostRuntime: ensureRuntime(
      win,
      "CoreHomeGuideSettingsHostRuntime",
      ["applyHomeGuideSettingsUi"],
      "CoreHomeGuideSettingsHostRuntime is required"
    ),
    homeGuidePageHostRuntime: ensureRuntime(
      win,
      "CoreHomeGuidePageHostRuntime",
      [
        "createHomeGuidePageResolvers",
        "createHomeGuideLifecycleResolvers",
        "applyHomeGuideSettingsPageInit",
        "applyHomeGuideAutoStartPage",
        "applyHomeGuideAutoStartPageFromContext"
      ],
      "CoreHomeGuidePageHostRuntime is required"
    ),
    homeGuideDomHostRuntime: ensureRuntime(
      win,
      "CoreHomeGuideDomHostRuntime",
      ["applyHomeGuideDomEnsure"],
      "CoreHomeGuideDomHostRuntime is required"
    ),
    homeGuideDoneNoticeHostRuntime: ensureRuntime(
      win,
      "CoreHomeGuideDoneNoticeHostRuntime",
      ["applyHomeGuideDoneNotice"],
      "CoreHomeGuideDoneNoticeHostRuntime is required"
    ),
    homeGuideHighlightHostRuntime: ensureRuntime(
      win,
      "CoreHomeGuideHighlightHostRuntime",
      ["applyHomeGuideHighlightClear", "applyHomeGuideTargetElevation"],
      "CoreHomeGuideHighlightHostRuntime is required"
    ),
    homeGuidePanelHostRuntime: ensureRuntime(
      win,
      "CoreHomeGuidePanelHostRuntime",
      ["applyHomeGuidePanelPosition", "resolveHomeGuideTargetVisibility"],
      "CoreHomeGuidePanelHostRuntime is required"
    ),
    homeGuideFinishHostRuntime: ensureRuntime(
      win,
      "CoreHomeGuideFinishHostRuntime",
      ["applyHomeGuideFinish", "applyHomeGuideFinishFromContext"],
      "CoreHomeGuideFinishHostRuntime is required"
    ),
    homeGuideStartHostRuntime: ensureRuntime(
      win,
      "CoreHomeGuideStartHostRuntime",
      ["applyHomeGuideStart"],
      "CoreHomeGuideStartHostRuntime is required"
    ),
    homeGuideControlsHostRuntime: ensureRuntime(
      win,
      "CoreHomeGuideControlsHostRuntime",
      ["applyHomeGuideControls"],
      "CoreHomeGuideControlsHostRuntime is required"
    ),
    homeGuideStepFlowHostRuntime: ensureRuntime(
      win,
      "CoreHomeGuideStepFlowHostRuntime",
      ["applyHomeGuideStepFlow"],
      "CoreHomeGuideStepFlowHostRuntime is required"
    ),
    homeGuideStepHostRuntime: ensureRuntime(
      win,
      "CoreHomeGuideStepHostRuntime",
      ["applyHomeGuideStep", "applyHomeGuideStepOrchestration"],
      "CoreHomeGuideStepHostRuntime is required"
    ),
    homeGuideStepViewHostRuntime: ensureRuntime(
      win,
      "CoreHomeGuideStepViewHostRuntime",
      ["applyHomeGuideStepView"],
      "CoreHomeGuideStepViewHostRuntime is required"
    )
  };
}

export function resolveIndexUiCoreRuntimeContracts(
  windowLike: unknown
): IndexUiCoreRuntimeContracts {
  const win = toRecord(windowLike);
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
        "hasPracticeGuideSeen",
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

export function resolveIndexUiRuntimeContracts(windowLike: unknown): IndexUiRuntimeContractsBundle {
  return {
    modalContracts: resolveIndexUiModalRuntimeContracts(windowLike),
    homeGuideContracts: resolveIndexUiHomeGuideRuntimeContracts(windowLike),
    coreContracts: resolveIndexUiCoreRuntimeContracts(windowLike)
  };
}
