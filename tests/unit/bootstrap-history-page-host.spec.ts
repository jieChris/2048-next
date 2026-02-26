import { describe, expect, it, vi } from "vitest";

import {
  applyHistoryPageLoad,
  applyHistoryPageStartup,
  applyHistoryPageStatus,
  resolveHistoryPageLoadEntryInput,
  resolveHistoryPageStartupInput,
  resolveHistoryPageStatusInput
} from "../../src/bootstrap/history-page-host";

describe("bootstrap history page host", () => {
  it("resolves status input with default status id", () => {
    const getElementById = vi.fn();
    const historyStatusRuntime = {};

    const result = resolveHistoryPageStatusInput({
      getElementById,
      text: "ok",
      isError: false,
      historyRuntimes: {
        historyStatusRuntime
      }
    });

    expect(result).toEqual({
      getElementById,
      statusElementId: "history-status",
      text: "ok",
      isError: false,
      historyStatusRuntime
    });
  });

  it("resolves load entry payload via page-level runtime aggregation", () => {
    const historyPanelContext = { panel: true };
    const resolveHistoryLoadPanelContext = vi.fn(() => historyPanelContext);
    const readHistoryStorageValue = vi.fn();
    const writeHistoryStorageValue = vi.fn();
    const runtimes = {
      historyFilterHostRuntime: {},
      historyQueryRuntime: {},
      historyLoadHostRuntime: {},
      historyLoadRuntime: {},
      historyBurnInRuntime: {},
      historyViewHostRuntime: {},
      historyStatusRuntime: {},
      historySummaryRuntime: {},
      historyPanelHostRuntime: {},
      historyAdapterHostRuntime: {},
      historyAdapterDiagnosticsRuntime: {},
      historyRecordViewRuntime: {},
      historyRecordItemRuntime: {},
      historyRecordActionsRuntime: {},
      historyRecordHostRuntime: {},
      historyExportRuntime: {},
      historyRecordListHostRuntime: {},
      historyBoardRuntime: {},
      historyBurnInHostRuntime: {},
      historyCanarySourceRuntime: {},
      historyCanaryPolicyRuntime: {},
      historyCanaryViewRuntime: {},
      historyCanaryPanelRuntime: {},
      historyCanaryActionRuntime: {},
      historyCanaryHostRuntime: {},
      historyCanaryStorageRuntime: {
        readHistoryStorageValue,
        writeHistoryStorageValue
      },
      historyLoadContextHostRuntime: {
        resolveHistoryLoadPanelContext
      }
    };

    const result = resolveHistoryPageLoadEntryInput({
      resetPage: true,
      localHistoryStore: {},
      state: { page: 1 },
      getElementById: () => null,
      historyRuntimes: runtimes,
      burnInMinComparable: 50,
      burnInMaxMismatchRate: 1,
      loadHistory: () => undefined,
      setStatus: () => undefined,
      modeCatalog: {},
      adapterModeStorageKey: "adapter_mode",
      defaultModeStorageKey: "default_mode",
      forceLegacyStorageKey: "force_legacy"
    });

    expect(result.historyFilterHostRuntime).toBe(runtimes.historyFilterHostRuntime);
    expect(result.historyLoadHostRuntime).toBe(runtimes.historyLoadHostRuntime);
    expect(result.historyStatusRuntime).toBe(runtimes.historyStatusRuntime);
    expect(result.historyPanelContext).toBe(historyPanelContext);
    expect(resolveHistoryLoadPanelContext).toHaveBeenCalledTimes(1);
    expect(resolveHistoryLoadPanelContext).toHaveBeenCalledWith(
      expect.objectContaining({
        historyAdapterHostRuntime: runtimes.historyAdapterHostRuntime,
        historyCanaryActionRuntime: runtimes.historyCanaryActionRuntime,
        readStorageValue: readHistoryStorageValue,
        writeStorageValue: writeHistoryStorageValue
      })
    );
  });

  it("resolves startup input using aggregated history runtimes", () => {
    const runtimes = {
      historyControlsHostRuntime: {},
      historyModeFilterRuntime: {},
      historyModeFilterHostRuntime: {},
      historyFilterHostRuntime: {},
      historyQueryRuntime: {},
      historyExportRuntime: {},
      historyToolbarRuntime: {},
      historyToolbarHostRuntime: {},
      historyToolbarBindHostRuntime: {},
      historyImportRuntime: {},
      historyImportFileRuntime: {},
      historyImportHostRuntime: {},
      historyImportBindHostRuntime: {},
      historyToolbarEventsRuntime: {},
      historyToolbarEventsHostRuntime: {}
    };

    const result = resolveHistoryPageStartupInput({
      localHistoryStore: {},
      setStatus: () => undefined,
      loadHistory: () => undefined,
      historyRuntimes: runtimes,
      getElementById: () => null,
      modeCatalog: {},
      documentLike: {},
      state: { page: 1 },
      confirmAction: () => true,
      createDate: () => new Date(0),
      createFileReader: () => ({})
    });

    expect(result.historyControlsHostRuntime).toBe(runtimes.historyControlsHostRuntime);
    expect(result.historyToolbarEventsHostRuntime).toBe(runtimes.historyToolbarEventsHostRuntime);
    expect(result.modeElementId).toBe("history-mode");
  });

  it("applies status via history view host runtime", () => {
    const applyHistoryStatus = vi.fn(() => ({ didApply: true }));

    const result = applyHistoryPageStatus({
      getElementById: () => null,
      text: "ok",
      isError: false,
      historyRuntimes: {
        historyViewHostRuntime: {
          applyHistoryStatus
        },
        historyStatusRuntime: {}
      }
    });

    expect(result.didApply).toBe(true);
    expect(applyHistoryStatus).toHaveBeenCalledTimes(1);
  });

  it("applies load via load-entry host runtime", () => {
    const applyHistoryLoadEntry = vi.fn(() => ({ didLoad: true, missingStore: false }));
    const resolveHistoryLoadPanelContext = vi.fn(() => ({}));

    const result = applyHistoryPageLoad({
      localHistoryStore: {},
      state: { page: 1 },
      getElementById: () => null,
      historyRuntimes: {
        historyLoadEntryHostRuntime: {
          applyHistoryLoadEntry
        },
        historyLoadContextHostRuntime: {
          resolveHistoryLoadPanelContext
        },
        historyCanaryStorageRuntime: {
          readHistoryStorageValue: () => null,
          writeHistoryStorageValue: () => true
        }
      }
    });

    expect(result).toEqual({ didLoad: true, missingStore: false });
    expect(applyHistoryLoadEntry).toHaveBeenCalledTimes(1);
  });

  it("applies startup via startup host runtime", () => {
    const applyHistoryStartup = vi.fn(() => ({ started: true, missingStore: false }));

    const result = applyHistoryPageStartup({
      localHistoryStore: {},
      setStatus: () => undefined,
      loadHistory: () => undefined,
      historyRuntimes: {
        historyStartupHostRuntime: {
          applyHistoryStartup
        }
      }
    });

    expect(result).toEqual({ started: true, missingStore: false });
    expect(applyHistoryStartup).toHaveBeenCalledTimes(1);
  });
});
