import { describe, expect, it, vi } from "vitest";

import {
  resolveIndexUiRuntimeContracts,
  resolveIndexUiRuntimeContractsCompat,
  resolveIndexUiCoreRuntimeContracts,
  resolveIndexUiHomeGuideRuntimeContracts,
  resolveIndexUiModalRuntimeContracts
} from "../../src/bootstrap/index-ui-runtime-contract";

function createModalRuntimeContext() {
  return {
    CoreReplayModalRuntime: {
      applyReplayModalOpen() {},
      applyReplayModalClose() {},
      applySettingsModalOpen() {},
      applySettingsModalClose() {}
    },
    CoreReplayExportRuntime: {
      applyReplayExport() {}
    },
    CoreReplayPageHostRuntime: {
      createReplayPageActionResolvers() {},
      applyReplayModalPageOpen() {},
      applyReplayModalPageClose() {},
      applyReplayExportPageAction() {},
      applyReplayExportPageActionFromContext() {}
    },
    CoreSettingsModalHostRuntime: {
      applySettingsModalOpenOrchestration() {},
      applySettingsModalCloseOrchestration() {}
    },
    CoreSettingsModalPageHostRuntime: {
      createSettingsModalInitResolvers() {},
      createSettingsModalActionResolvers() {},
      applySettingsModalPageOpen() {},
      applySettingsModalPageClose() {}
    }
  };
}

function createHomeGuideRuntimeContext() {
  return {
    CoreHomeGuideRuntime: {
      resolveHomeGuidePathname() {},
      isHomePagePath() {},
      buildHomeGuideSteps() {},
      buildHomeGuidePanelInnerHtml() {},
      buildHomeGuideSettingsRowInnerHtml() {},
      readHomeGuideSeenValue() {},
      markHomeGuideSeen() {},
      shouldAutoStartHomeGuide() {},
      resolveHomeGuideAutoStart() {},
      resolveHomeGuideSettingsState() {},
      resolveHomeGuideStepUiState() {},
      resolveHomeGuideStepRenderState() {},
      resolveHomeGuideStepIndexState() {},
      resolveHomeGuideStepTargetState() {},
      resolveHomeGuideElevationPlan() {},
      resolveHomeGuideBindingState() {},
      resolveHomeGuideControlAction() {},
      resolveHomeGuideToggleAction() {},
      resolveHomeGuideLifecycleState() {},
      resolveHomeGuideSessionState() {},
      resolveHomeGuideLayerDisplayState() {},
      resolveHomeGuideFinishState() {},
      resolveHomeGuideTargetScrollState() {},
      resolveHomeGuideDoneNotice() {},
      resolveHomeGuideDoneNoticeStyle() {},
      resolveHomeGuidePanelLayout() {},
      isHomeGuideTargetVisible() {}
    },
    CoreHomeGuideStartupHostRuntime: {
      applyHomeGuideAutoStart() {}
    },
    CoreHomeGuideSettingsHostRuntime: {
      applyHomeGuideSettingsUi() {}
    },
    CoreHomeGuidePageHostRuntime: {
      createHomeGuidePageResolvers() {},
      createHomeGuideLifecycleResolvers() {},
      applyHomeGuideSettingsPageInit() {},
      applyHomeGuideAutoStartPage() {},
      applyHomeGuideAutoStartPageFromContext() {}
    },
    CoreHomeGuideDomHostRuntime: {
      applyHomeGuideDomEnsure() {}
    },
    CoreHomeGuideDoneNoticeHostRuntime: {
      applyHomeGuideDoneNotice() {}
    },
    CoreHomeGuideHighlightHostRuntime: {
      applyHomeGuideHighlightClear() {},
      applyHomeGuideTargetElevation() {}
    },
    CoreHomeGuidePanelHostRuntime: {
      applyHomeGuidePanelPosition() {},
      resolveHomeGuideTargetVisibility() {}
    },
    CoreHomeGuideFinishHostRuntime: {
      applyHomeGuideFinish() {},
      applyHomeGuideFinishFromContext() {}
    },
    CoreHomeGuideStartHostRuntime: {
      applyHomeGuideStart() {}
    },
    CoreHomeGuideControlsHostRuntime: {
      applyHomeGuideControls() {}
    },
    CoreHomeGuideStepFlowHostRuntime: {
      applyHomeGuideStepFlow() {}
    },
    CoreHomeGuideStepHostRuntime: {
      applyHomeGuideStep() {},
      applyHomeGuideStepOrchestration() {}
    },
    CoreHomeGuideStepViewHostRuntime: {
      applyHomeGuideStepView() {}
    }
  };
}

function createCoreRuntimeContext() {
  return {
    CoreTimerModuleRuntime: {
      buildTimerModuleSettingsRowInnerHtml() {},
      resolveTimerModuleSettingsState() {},
      resolveTimerModuleCurrentViewMode() {},
      resolveTimerModuleBindingState() {},
      resolveTimerModuleViewMode() {},
      resolveTimerModuleAppliedViewMode() {},
      resolveTimerModuleInitRetryState() {}
    },
    CoreTimerModuleSettingsHostRuntime: {
      applyLegacyUndoSettingsCleanup() {},
      ensureTimerModuleSettingsToggle() {},
      applyTimerModuleSettingsUi() {}
    },
    CoreTimerModuleSettingsPageHostRuntime: {
      applyTimerModuleSettingsPageInit() {}
    },
    CoreThemeSettingsRuntime: {
      formatThemePreviewValue() {},
      resolveThemePreviewTileValues() {},
      resolveThemePreviewLayout() {},
      resolveThemePreviewCssSelectors() {},
      resolveThemeOptions() {},
      resolveThemeSelectLabel() {},
      resolveThemeDropdownToggleState() {},
      resolveThemeBindingState() {},
      resolveThemeOptionValue() {},
      resolveThemeOptionSelectedState() {}
    },
    CoreThemeSettingsHostRuntime: {
      applyThemeSettingsUi() {}
    },
    CoreThemeSettingsPageHostRuntime: {
      applyThemeSettingsPageInit() {}
    },
    CorePracticeTransferRuntime: {
      buildPracticeModeConfigFromCurrent() {},
      hasPracticeGuideSeen() {},
      buildPracticeBoardUrl() {},
      buildPracticeTransferToken() {},
      buildPracticeTransferPayload() {},
      persistPracticeTransferPayload() {},
      createPracticeTransferNavigationPlan() {},
      resolvePracticeTransferPrecheck() {}
    },
    CorePracticeTransferHostRuntime: {
      applyPracticeTransferFromCurrent() {}
    },
    CorePracticeTransferPageHostRuntime: {
      createPracticeTransferPageActionResolvers() {},
      applyPracticeTransferPageAction() {},
      applyPracticeTransferPageActionFromContext() {}
    },
    CoreUndoActionRuntime: {
      tryTriggerUndo() {},
      tryTriggerUndoFromContext() {},
      resolveUndoModeIdFromBody() {},
      resolveUndoModeId() {},
      isUndoCapableMode() {},
      resolveUndoCapabilityFromContext() {},
      isUndoInteractionEnabled() {}
    },
    CoreMobileHintRuntime: {
      collectMobileHintTexts() {}
    },
    CoreMobileHintUiRuntime: {
      syncMobileHintTextBlockVisibility() {},
      resolveMobileHintDisplayModel() {},
      resolveMobileHintUiState() {}
    },
    CoreMobileHintModalRuntime: {
      ensureMobileHintModalDom() {}
    },
    CoreMobileHintOpenHostRuntime: {
      applyMobileHintModalOpen() {}
    },
    CoreMobileHintUiHostRuntime: {
      applyMobileHintUiSync() {}
    },
    CoreMobileHintHostRuntime: {
      applyMobileHintToggleInit() {}
    },
    CoreMobileHintPageHostRuntime: {
      createMobileHintPageResolvers() {}
    },
    CoreMobileTimerboxRuntime: {
      resolveStoredMobileTimerboxCollapsed() {},
      persistMobileTimerboxCollapsed() {},
      getTimerboxToggleIconSvg() {},
      resolveMobileTimerboxCollapsedValue() {},
      resolveMobileTimerboxDisplayModel() {},
      resolveMobileTimerboxAppliedModel() {}
    },
    CoreMobileTimerboxHostRuntime: {
      applyMobileTimerboxToggleInit() {},
      applyMobileTimerboxUiSync() {},
      applyMobileTimerboxUiSyncFromContext() {}
    },
    CoreMobileTimerboxPageHostRuntime: {
      createMobileTimerboxPageResolvers() {}
    },
    CoreMobileUndoTopRuntime: {
      resolveMobileUndoTopButtonDisplayModel() {},
      resolveMobileUndoTopAppliedModel() {}
    },
    CoreMobileUndoTopHostRuntime: {
      applyMobileUndoTopInit() {}
    },
    CoreMobileUndoTopAvailabilityHostRuntime: {
      applyMobileUndoTopAvailabilitySync() {},
      applyMobileUndoTopAvailabilitySyncFromContext() {}
    },
    CoreTopActionsRuntime: {
      createGameTopActionsPlacementState() {},
      createPracticeTopActionsPlacementState() {},
      syncGameTopActionsPlacement() {},
      syncPracticeTopActionsPlacement() {}
    },
    CoreTopActionsHostRuntime: {
      applyGameTopActionsPlacementSync() {},
      applyPracticeTopActionsPlacementSync() {}
    },
    CoreTopActionsPageHostRuntime: {
      createTopActionsPageResolvers() {}
    },
    CoreMobileTopButtonsRuntime: {
      ensureMobileUndoTopButtonDom() {},
      ensureMobileHintToggleButtonDom() {}
    },
    CoreMobileTopButtonsPageHostRuntime: {
      createMobileTopButtonsPageResolvers() {}
    },
    CoreMobileViewportRuntime: {
      isViewportAtMost() {},
      isCompactGameViewport() {},
      isTimerboxCollapseViewport() {},
      isMobileGameViewport() {},
      resolvePageScopeValue() {},
      isGamePageScope() {},
      isPracticePageScope() {},
      isTimerboxMobileScope() {}
    },
    CoreMobileViewportPageHostRuntime: {
      createMobileViewportPageResolvers() {}
    },
    CoreStorageRuntime: {
      resolveStorageByName() {},
      safeSetStorageItem() {},
      safeReadStorageItem() {}
    },
    CorePrettyTimeRuntime: {
      formatPrettyTime() {}
    },
    CoreResponsiveRelayoutRuntime: {
      resolveResponsiveRelayoutRequest() {},
      applyResponsiveRelayout() {}
    },
    CoreResponsiveRelayoutHostRuntime: {
      applyResponsiveRelayoutRequest() {},
      applyResponsiveRelayoutRequestFromContext() {}
    },
    CoreTopActionBindingsHostRuntime: {
      applyTopActionBindings() {}
    },
    CoreGameOverUndoHostRuntime: {
      bindGameOverUndoControl() {}
    },
    CoreIndexUiStartupHostRuntime: {
      applyIndexUiStartup() {}
    },
    CoreIndexUiPageHostRuntime: {
      createIndexUiTryUndoHandler() {},
      applyIndexUiPageBootstrap() {}
    },
    CoreIndexUiPageResolversHostRuntime: {
      createIndexUiMobileResolvers() {}
    },
    CoreIndexUiPageActionsHostRuntime: {
      createIndexUiPageActionResolvers() {}
    }
  };
}

describe("bootstrap index ui runtime contract", () => {
  it("resolves runtime contracts from compat helper via aggregate entry", () => {
    const resolveIndexUiRuntimeContracts = vi.fn(() => ({
      modalContracts: { id: "modal" },
      homeGuideContracts: { id: "guide" },
      coreContracts: { id: "core" }
    }));
    const runtimeLike = { resolveIndexUiRuntimeContracts };
    const windowLike = { id: "window-like" };

    const contracts = resolveIndexUiRuntimeContractsCompat(runtimeLike, windowLike);

    expect(resolveIndexUiRuntimeContracts).toHaveBeenCalledWith(windowLike);
    expect(contracts.modalContracts).toEqual({ id: "modal" });
    expect(contracts.homeGuideContracts).toEqual({ id: "guide" });
    expect(contracts.coreContracts).toEqual({ id: "core" });
  });

  it("resolves runtime contracts from compat helper via legacy entries", () => {
    const resolveIndexUiModalRuntimeContracts = vi.fn(() => ({ id: "modal" }));
    const resolveIndexUiHomeGuideRuntimeContracts = vi.fn(() => ({ id: "guide" }));
    const resolveIndexUiCoreRuntimeContracts = vi.fn(() => ({ id: "core" }));
    const runtimeLike = {
      resolveIndexUiModalRuntimeContracts,
      resolveIndexUiHomeGuideRuntimeContracts,
      resolveIndexUiCoreRuntimeContracts
    };
    const windowLike = { id: "window-like" };

    const contracts = resolveIndexUiRuntimeContractsCompat(runtimeLike, windowLike);

    expect(resolveIndexUiModalRuntimeContracts).toHaveBeenCalledWith(windowLike);
    expect(resolveIndexUiHomeGuideRuntimeContracts).toHaveBeenCalledWith(windowLike);
    expect(resolveIndexUiCoreRuntimeContracts).toHaveBeenCalledWith(windowLike);
    expect(contracts.modalContracts).toEqual({ id: "modal" });
    expect(contracts.homeGuideContracts).toEqual({ id: "guide" });
    expect(contracts.coreContracts).toEqual({ id: "core" });
  });

  it("throws when compat helper runtime entries are missing", () => {
    expect(() => resolveIndexUiRuntimeContractsCompat({}, { id: "window-like" })).toThrowError(
      "CoreIndexUiRuntimeContractRuntime is required"
    );
  });

  it("resolves aggregated index ui runtime contracts bundle", () => {
    const context = {
      ...createModalRuntimeContext(),
      ...createHomeGuideRuntimeContext(),
      ...createCoreRuntimeContext()
    };
    const contracts = resolveIndexUiRuntimeContracts(context);

    expect(typeof contracts.modalContracts.replayModalRuntime.applyReplayModalOpen).toBe("function");
    expect(typeof contracts.homeGuideContracts.homeGuideRuntime.buildHomeGuideSteps).toBe("function");
    expect(typeof contracts.coreContracts.indexUiStartupHostRuntime.applyIndexUiStartup).toBe(
      "function"
    );
  });

  it("resolves modal runtime contracts from window context", () => {
    const contracts = resolveIndexUiModalRuntimeContracts(createModalRuntimeContext());
    expect(typeof contracts.replayModalRuntime.applyReplayModalOpen).toBe("function");
    expect(typeof contracts.replayExportRuntime.applyReplayExport).toBe("function");
    expect(typeof contracts.replayPageHostRuntime.createReplayPageActionResolvers).toBe("function");
    expect(typeof contracts.settingsModalPageHostRuntime.createSettingsModalActionResolvers).toBe(
      "function"
    );
    expect(typeof contracts.settingsModalPageHostRuntime.applySettingsModalPageOpen).toBe("function");
  });

  it("throws when replay modal runtime contract is missing", () => {
    const context = createModalRuntimeContext();
    delete (context as { CoreReplayModalRuntime?: unknown }).CoreReplayModalRuntime;
    expect(() => resolveIndexUiModalRuntimeContracts(context)).toThrowError(
      "CoreReplayModalRuntime is required"
    );
  });

  it("throws when settings modal page host runtime contract is incomplete", () => {
    const context = createModalRuntimeContext();
    context.CoreSettingsModalPageHostRuntime = {
      applySettingsModalPageOpen() {}
    };
    expect(() => resolveIndexUiModalRuntimeContracts(context)).toThrowError(
      "CoreSettingsModalPageHostRuntime is required"
    );
  });

  it("resolves home guide runtime contracts from window context", () => {
    const contracts = resolveIndexUiHomeGuideRuntimeContracts(createHomeGuideRuntimeContext());
    expect(typeof contracts.homeGuideRuntime.buildHomeGuideSteps).toBe("function");
    expect(typeof contracts.homeGuideStepHostRuntime.applyHomeGuideStepOrchestration).toBe(
      "function"
    );
    expect(typeof contracts.homeGuidePageHostRuntime.createHomeGuidePageResolvers).toBe("function");
    expect(typeof contracts.homeGuidePageHostRuntime.createHomeGuideLifecycleResolvers).toBe(
      "function"
    );
    expect(typeof contracts.homeGuidePageHostRuntime.applyHomeGuideAutoStartPageFromContext).toBe(
      "function"
    );
  });

  it("throws when home guide runtime contract is missing", () => {
    const context = createHomeGuideRuntimeContext();
    delete (context as { CoreHomeGuideRuntime?: unknown }).CoreHomeGuideRuntime;
    expect(() => resolveIndexUiHomeGuideRuntimeContracts(context)).toThrowError(
      "CoreHomeGuideRuntime is required"
    );
  });

  it("throws when home guide step host runtime contract is incomplete", () => {
    const context = createHomeGuideRuntimeContext();
    context.CoreHomeGuideStepHostRuntime = {
      applyHomeGuideStep() {}
    };
    expect(() => resolveIndexUiHomeGuideRuntimeContracts(context)).toThrowError(
      "CoreHomeGuideStepHostRuntime is required"
    );
  });

  it("resolves core runtime contracts from window context", () => {
    const contracts = resolveIndexUiCoreRuntimeContracts(createCoreRuntimeContext());
    expect(typeof contracts.timerModuleRuntime.resolveTimerModuleViewMode).toBe("function");
    expect(typeof contracts.undoActionRuntime.tryTriggerUndoFromContext).toBe("function");
    expect(
      typeof contracts.practiceTransferPageHostRuntime.createPracticeTransferPageActionResolvers
    ).toBe("function");
    expect(typeof contracts.mobileHintPageHostRuntime.createMobileHintPageResolvers).toBe("function");
    expect(
      typeof contracts.mobileTimerboxPageHostRuntime.createMobileTimerboxPageResolvers
    ).toBe("function");
    expect(typeof contracts.topActionsPageHostRuntime.createTopActionsPageResolvers).toBe("function");
    expect(
      typeof contracts.mobileTopButtonsPageHostRuntime.createMobileTopButtonsPageResolvers
    ).toBe("function");
    expect(typeof contracts.mobileViewportPageHostRuntime.createMobileViewportPageResolvers).toBe(
      "function"
    );
    expect(typeof contracts.indexUiStartupHostRuntime.applyIndexUiStartup).toBe("function");
    expect(typeof contracts.indexUiPageHostRuntime.applyIndexUiPageBootstrap).toBe("function");
    expect(
      typeof contracts.indexUiPageResolversHostRuntime.createIndexUiMobileResolvers
    ).toBe("function");
    expect(
      typeof contracts.indexUiPageActionsHostRuntime.createIndexUiPageActionResolvers
    ).toBe("function");
  });

  it("throws when core runtime contract is missing", () => {
    const context = createCoreRuntimeContext();
    delete (context as { CoreTimerModuleRuntime?: unknown }).CoreTimerModuleRuntime;
    expect(() => resolveIndexUiCoreRuntimeContracts(context)).toThrowError(
      "CoreTimerModuleRuntime is required"
    );
  });

  it("throws when core runtime contract is incomplete", () => {
    const context = createCoreRuntimeContext();
    context.CoreTopActionBindingsHostRuntime = {};
    expect(() => resolveIndexUiCoreRuntimeContracts(context)).toThrowError(
      "CoreTopActionBindingsHostRuntime is required"
    );
  });
});
