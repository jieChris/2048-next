import { describe, expect, it } from "vitest";

import { resolveHistoryRuntimeContracts } from "../../src/bootstrap/history-runtime-contract";

function createWindowLike() {
  return {
    CoreHistoryCanaryPolicyRuntime: {
      resolveCanaryPolicySnapshot: () => ({}),
      resolveStoredPolicyKeys: () => ({}),
      resolveCanaryPolicyActionPlan: () => ({}),
      resolveCanaryPolicyActionNotice: () => ""
    },
    CoreHistoryCanaryActionRuntime: {
      applyHistoryCanaryPolicyAction: () => ({}),
      applyHistoryCanaryPolicyActionByName: () => ({}),
      resolveHistoryCanaryPolicyUpdateFailureNotice: () => "",
      resolveHistoryCanaryPolicyApplyFeedbackState: () => ({}),
      applyHistoryCanaryPolicyActionByNameWithFeedback: () => ({}),
      applyHistoryCanaryPanelAction: () => ({})
    },
    CoreHistoryCanarySourceRuntime: {
      resolveHistoryCanaryRuntimePolicy: () => ({}),
      resolveHistoryCanaryRuntimeStoredPolicyKeys: () => ({}),
      resolveHistoryCanaryPolicySnapshotInput: () => ({}),
      resolveHistoryCanaryStoredPolicyInput: () => ({}),
      resolveHistoryCanaryPolicyAndStoredState: () => ({})
    },
    CoreHistoryCanaryPanelRuntime: {
      resolveHistoryCanaryPanelHtml: () => "",
      resolveHistoryCanaryActionName: () => ""
    },
    CoreHistoryCanaryHostRuntime: {
      resolveHistoryCanaryPanelRenderState: () => ({ panelHtml: "" }),
      applyHistoryCanaryPanelClickAction: () => ({
        shouldReload: false,
        reloadResetPage: false,
        statusText: "",
        isError: false
      })
    },
    CoreHistoryAdapterDiagnosticsRuntime: {
      resolveHistoryAdapterParityStatus: () => "",
      resolveHistoryAdapterBadgeState: () => ({}),
      resolveHistoryAdapterDiagnosticsState: () => ({}),
      resolveHistoryAdapterBadgeHtml: () => "",
      resolveHistoryAdapterDiagnosticsHtml: () => ""
    },
    CoreHistoryAdapterHostRuntime: {
      resolveHistoryAdapterRecordRenderState: () => ({
        adapterBadgeHtml: "",
        adapterDiagnosticsHtml: ""
      })
    },
    CoreHistoryBoardRuntime: {
      resolveHistoryFinalBoardHtml: () => ""
    },
    CoreHistoryBurnInRuntime: {
      resolveHistoryBurnInSummarySource: () => null,
      resolveHistoryBurnInSummaryState: () => ({}),
      resolveHistoryBurnInMismatchFocusActionState: () => ({}),
      resolveHistoryBurnInPanelHtml: () => ""
    },
    CoreHistoryBurnInHostRuntime: {
      resolveHistoryBurnInPanelRenderState: () => ({
        panelHtml: "",
        shouldBindMismatchAction: false
      }),
      resolveHistoryBurnInMismatchFocusClickState: () => ({
        shouldApply: false,
        nextAdapterParityFilter: "",
        nextSelectValue: "",
        shouldReload: false,
        resetPage: false
      })
    },
    CoreHistoryCanaryViewRuntime: {
      resolveHistoryCanaryViewState: () => ({})
    },
    CoreHistorySummaryRuntime: {
      resolveHistorySummaryText: () => ""
    },
    CoreHistoryStatusRuntime: {
      resolveHistoryStatusDisplayState: () => ({ text: "", color: "" })
    },
    CoreHistoryExportRuntime: {
      resolveHistoryRecordExportFileName: () => "",
      collectHistoryRecordIdsForExport: () => [],
      resolveHistoryExportListRecordsSource: () => ({ items: [], total: 0 }),
      resolveHistoryMismatchExportRecordIds: () => [],
      resolveHistorySingleRecordExportState: () => ({ canExport: false }),
      downloadHistorySingleRecord: () => false,
      downloadHistoryAllRecords: () => false,
      downloadHistoryMismatchRecords: () => ({ downloaded: false, empty: true, count: 0 })
    },
    CoreHistoryQueryRuntime: {
      resolveHistoryFilterState: () => ({}),
      applyHistoryFilterState: () => {},
      resolveHistoryListQuery: () => ({}),
      resolveHistoryListResultSource: () => ({ items: [], total: 0 }),
      resolveHistoryBurnInQuery: () => ({}),
      resolveHistoryPagerState: () => ({ disablePrev: true, disableNext: true })
    },
    CoreHistoryLoadRuntime: {
      resolveHistoryLoadPipeline: () => ({
        listResult: { items: [], total: 0 },
        burnInSummary: null,
        pagerState: { disablePrev: true, disableNext: true }
      })
    },
    CoreHistoryLoadHostRuntime: {
      applyHistoryLoadAndRender: () => ({
        didLoad: true,
        disablePrev: true,
        disableNext: true
      })
    },
    CoreHistoryRecordViewRuntime: {
      resolveHistoryCatalogModeLabel: () => "",
      resolveHistoryModeText: () => "",
      resolveHistoryDurationText: () => "",
      resolveHistoryEndedText: () => "",
      resolveHistoryRecordHeadState: () => ({})
    },
    CoreHistoryRecordItemRuntime: {
      resolveHistoryRecordItemHtml: () => ""
    },
    CoreHistoryImportRuntime: {
      resolveHistoryImportActionState: () => ({ mode: "merge", requiresConfirm: false }),
      resolveHistoryImportMergeFlag: () => true,
      resolveHistoryImportSuccessNotice: () => "",
      resolveHistoryImportErrorNotice: () => "",
      resolveHistoryImportReadErrorNotice: () => "",
      executeHistoryImport: () => ({ ok: true, imported: 0 })
    },
    CoreHistoryImportFileRuntime: {
      resolveHistoryImportSelectedFile: () => null,
      resolveHistoryImportPayloadText: () => "",
      resolveHistoryImportReadEncoding: () => "utf-8",
      resolveHistoryImportInputResetValue: () => ""
    },
    CoreHistoryImportHostRuntime: {
      resolveHistoryImportMergeClickState: () => ({
        nextMode: "merge",
        shouldOpenFilePicker: true
      }),
      resolveHistoryImportReplaceClickState: () => ({
        nextMode: "replace",
        shouldOpenFilePicker: true
      }),
      resolveHistoryImportFileSelectionState: () => ({
        file: null,
        shouldRead: false,
        encoding: "utf-8",
        resetValue: ""
      }),
      applyHistoryImportFromFileReadResult: () => ({
        shouldSetStatus: false,
        statusText: "",
        isError: false,
        shouldReload: false
      }),
      resolveHistoryImportReadFailureState: () => ({
        shouldSetStatus: true,
        statusText: "read error",
        isError: true,
        shouldReload: false
      })
    },
    CoreHistoryRecordActionsRuntime: {
      resolveHistoryReplayHref: () => "",
      resolveHistoryDeleteActionState: () => ({ shouldDelete: false, confirmMessage: "" }),
      resolveHistoryDeleteFailureNotice: () => "",
      resolveHistoryDeleteSuccessNotice: () => "",
      executeHistoryDeleteRecord: () => ({ deleted: false })
    },
    CoreHistoryRecordHostRuntime: {
      resolveHistoryRecordReplayHref: () => "",
      applyHistoryRecordExportAction: () => false,
      applyHistoryRecordDeleteAction: () => ({
        shouldSetStatus: false,
        statusText: "",
        isError: false,
        shouldReload: false
      })
    },
    CoreHistoryCanaryStorageRuntime: {
      readHistoryStorageValue: () => null,
      writeHistoryStorageValue: () => false
    },
    CoreHistoryToolbarRuntime: {
      resolveHistoryExportDateTag: () => "",
      resolveHistoryExportAllFileName: () => "",
      resolveHistoryExportAllNotice: () => "",
      resolveHistoryMismatchExportQuery: () => ({}),
      resolveHistoryMismatchExportEmptyNotice: () => "",
      resolveHistoryMismatchExportFileName: () => "",
      resolveHistoryMismatchExportSuccessNotice: () => "",
      resolveHistoryClearAllActionState: () => ({ requiresConfirm: false, confirmMessage: "" }),
      executeHistoryClearAll: () => ({ cleared: true })
    },
    CoreHistoryToolbarHostRuntime: {
      applyHistoryExportAllAction: () => ({
        shouldSetStatus: false,
        statusText: "",
        isError: false,
        shouldReload: false
      }),
      applyHistoryMismatchExportAction: () => ({
        shouldSetStatus: false,
        statusText: "",
        isError: false,
        shouldReload: false
      }),
      applyHistoryClearAllAction: () => ({
        shouldSetStatus: false,
        statusText: "",
        isError: false,
        shouldReload: false
      })
    },
    CoreHistoryToolbarEventsRuntime: {
      resolveHistoryPrevPageState: () => ({ canGo: false, nextPage: 1 }),
      resolveHistoryNextPageState: () => ({ canGo: false, nextPage: 1 }),
      resolveHistoryFilterReloadControlIds: () => [],
      shouldHistoryKeywordTriggerReload: () => false
    },
    CoreHistoryToolbarEventsHostRuntime: {
      bindHistoryToolbarPagerAndFilterEvents: () => ({
        didBind: true,
        boundControlCount: 0
      })
    },
    CoreHistoryModeFilterRuntime: {
      resolveHistoryModeFilterOptions: () => []
    },
    CoreHistoryStartupHostRuntime: {
      applyHistoryStartup: () => ({
        started: true,
        missingStore: false
      })
    }
  };
}

describe("bootstrap history runtime contract", () => {
  it("returns required runtime contracts when dependencies exist", () => {
    const source = createWindowLike();
    const result = resolveHistoryRuntimeContracts(source);

    expect(result.historyCanaryPolicyRuntime).toBe(source.CoreHistoryCanaryPolicyRuntime);
    expect(result.historyCanaryHostRuntime).toBe(source.CoreHistoryCanaryHostRuntime);
    expect(result.historyBurnInHostRuntime).toBe(source.CoreHistoryBurnInHostRuntime);
    expect(result.historyAdapterHostRuntime).toBe(source.CoreHistoryAdapterHostRuntime);
    expect(result.historyQueryRuntime).toBe(source.CoreHistoryQueryRuntime);
    expect(result.historyLoadRuntime).toBe(source.CoreHistoryLoadRuntime);
    expect(result.historyLoadHostRuntime).toBe(source.CoreHistoryLoadHostRuntime);
    expect(result.historyImportHostRuntime).toBe(source.CoreHistoryImportHostRuntime);
    expect(result.historyRecordHostRuntime).toBe(source.CoreHistoryRecordHostRuntime);
    expect(result.historyToolbarHostRuntime).toBe(source.CoreHistoryToolbarHostRuntime);
    expect(result.historyToolbarEventsHostRuntime).toBe(source.CoreHistoryToolbarEventsHostRuntime);
    expect(result.historyModeFilterRuntime).toBe(source.CoreHistoryModeFilterRuntime);
    expect(result.historyStartupHostRuntime).toBe(source.CoreHistoryStartupHostRuntime);
  });

  it("throws exact error when canary policy runtime is missing", () => {
    const source = createWindowLike();
    source.CoreHistoryCanaryPolicyRuntime = null;

    expect(() => resolveHistoryRuntimeContracts(source)).toThrowError(
      "CoreHistoryCanaryPolicyRuntime is required"
    );
  });

  it("throws exact error when canary host runtime misses required function", () => {
    const source = createWindowLike();
    source.CoreHistoryCanaryHostRuntime = {
      resolveHistoryCanaryPanelRenderState: () => ({ panelHtml: "" })
    };

    expect(() => resolveHistoryRuntimeContracts(source)).toThrowError(
      "CoreHistoryCanaryHostRuntime is required"
    );
  });

  it("throws exact error when burn-in host runtime misses required function", () => {
    const source = createWindowLike();
    source.CoreHistoryBurnInHostRuntime = {
      resolveHistoryBurnInPanelRenderState: () => ({ panelHtml: "" })
    };

    expect(() => resolveHistoryRuntimeContracts(source)).toThrowError(
      "CoreHistoryBurnInHostRuntime is required"
    );
  });

  it("throws exact error when adapter host runtime misses required function", () => {
    const source = createWindowLike();
    source.CoreHistoryAdapterHostRuntime = {};

    expect(() => resolveHistoryRuntimeContracts(source)).toThrowError(
      "CoreHistoryAdapterHostRuntime is required"
    );
  });

  it("throws exact error when query runtime misses required function", () => {
    const source = createWindowLike();
    source.CoreHistoryQueryRuntime = {
      resolveHistoryFilterState: () => ({})
    };

    expect(() => resolveHistoryRuntimeContracts(source)).toThrowError(
      "CoreHistoryQueryRuntime is required"
    );
  });

  it("throws exact error when load runtime is missing required function", () => {
    const source = createWindowLike();
    source.CoreHistoryLoadRuntime = {};

    expect(() => resolveHistoryRuntimeContracts(source)).toThrowError(
      "CoreHistoryLoadRuntime is required"
    );
  });

  it("throws exact error when load host runtime is missing required function", () => {
    const source = createWindowLike();
    source.CoreHistoryLoadHostRuntime = {};

    expect(() => resolveHistoryRuntimeContracts(source)).toThrowError(
      "CoreHistoryLoadHostRuntime is required"
    );
  });

  it("throws exact error when import host runtime misses required function", () => {
    const source = createWindowLike();
    source.CoreHistoryImportHostRuntime = {
      resolveHistoryImportMergeClickState: () => ({})
    };

    expect(() => resolveHistoryRuntimeContracts(source)).toThrowError(
      "CoreHistoryImportHostRuntime is required"
    );
  });

  it("throws exact error when toolbar host runtime is missing required function", () => {
    const source = createWindowLike();
    source.CoreHistoryToolbarHostRuntime = {
      applyHistoryExportAllAction: () => ({})
    };

    expect(() => resolveHistoryRuntimeContracts(source)).toThrowError(
      "CoreHistoryToolbarHostRuntime is required"
    );
  });

  it("throws exact error when record host runtime misses required function", () => {
    const source = createWindowLike();
    source.CoreHistoryRecordHostRuntime = {
      resolveHistoryRecordReplayHref: () => ""
    };

    expect(() => resolveHistoryRuntimeContracts(source)).toThrowError(
      "CoreHistoryRecordHostRuntime is required"
    );
  });

  it("throws exact error when startup host runtime misses required function", () => {
    const source = createWindowLike();
    source.CoreHistoryStartupHostRuntime = {};

    expect(() => resolveHistoryRuntimeContracts(source)).toThrowError(
      "CoreHistoryStartupHostRuntime is required"
    );
  });

  it("throws exact error when toolbar events host runtime misses required function", () => {
    const source = createWindowLike();
    source.CoreHistoryToolbarEventsHostRuntime = {};

    expect(() => resolveHistoryRuntimeContracts(source)).toThrowError(
      "CoreHistoryToolbarEventsHostRuntime is required"
    );
  });
});
