import { describe, expect, it, vi } from "vitest";

import {
  applyHistoryPageLoad,
  applyHistoryPageStartup,
  applyHistoryPageStatus,
  resolveHistoryPageDefaults,
  resolveHistoryPageEnvironment,
  resolveHistoryPageLoadEntryInput,
  resolveHistoryPageStartupInput,
  resolveHistoryPageStatusInput
} from "../../src/bootstrap/history-page-host";

describe("bootstrap history page host", () => {
  it("resolves history page defaults with baseline values", () => {
    const defaults = resolveHistoryPageDefaults();

    expect(defaults.state).toEqual({
      page: 1,
      pageSize: 30,
      modeKey: "",
      keyword: "",
      sortBy: "ended_desc",
      adapterParityFilter: "all",
      burnInWindow: "200",
      sustainedWindows: "3"
    });
    expect(defaults.burnInMinComparable).toBe(50);
    expect(defaults.burnInMaxMismatchRate).toBe(1);
    expect(defaults.adapterModeStorageKey).toBe("engine_adapter_mode");
    expect(defaults.defaultModeStorageKey).toBe("engine_adapter_default_mode");
    expect(defaults.forceLegacyStorageKey).toBe("engine_adapter_force_legacy");
    expect(defaults.statusElementId).toBe("history-status");
    expect(defaults.summaryElementId).toBe("history-summary");
    expect(defaults.prevButtonId).toBe("history-prev-page");
    expect(defaults.nextButtonId).toBe("history-next-page");
    expect(defaults.listElementId).toBe("history-list");
    expect(defaults.modeElementId).toBe("history-mode");
    expect(defaults.burnInPanelElementId).toBe("history-burnin-summary");
    expect(defaults.adapterFilterElementId).toBe("history-adapter-filter");
    expect(defaults.canaryPanelElementId).toBe("history-canary-policy");
  });

  it("supports overriding history page defaults", () => {
    const defaults = resolveHistoryPageDefaults({
      burnInMinComparable: 80,
      burnInMaxMismatchRate: 0.3,
      statusElementId: "status",
      modeElementId: "mode",
      adapterModeStorageKey: "adapter"
    });

    expect(defaults.burnInMinComparable).toBe(80);
    expect(defaults.burnInMaxMismatchRate).toBe(0.3);
    expect(defaults.statusElementId).toBe("status");
    expect(defaults.modeElementId).toBe("mode");
    expect(defaults.adapterModeStorageKey).toBe("adapter");
  });

  it("resolves history page environment from window-like source", () => {
    const confirmAction = vi.fn(() => true);
    const fileReaderCtor = vi.fn(function FileReaderMock(this: Record<string, unknown>) {
      this.ok = true;
    });
    const windowLike = {
      LocalHistoryStore: { ok: true },
      ModeCatalog: { modes: [] },
      LegacyAdapterRuntime: { runtime: true },
      confirm: confirmAction,
      FileReader: fileReaderCtor,
      location: { href: "" },
      document: { body: {} }
    };

    const environment = resolveHistoryPageEnvironment({
      windowLike
    });
    (environment.navigateToHref as (href: string) => void)("/history.html");

    expect(environment.localHistoryStore).toBe(windowLike.LocalHistoryStore);
    expect(environment.modeCatalog).toBe(windowLike.ModeCatalog);
    expect(environment.runtime).toBe(windowLike.LegacyAdapterRuntime);
    expect((environment.confirmAction as (message: string) => boolean)("x")).toBe(true);
    expect(windowLike.location.href).toBe("/history.html");
    expect((environment.createFileReader as () => Record<string, unknown>)().ok).toBe(true);
  });

  it("supports overriding history page environment values", () => {
    const customNavigate = vi.fn();
    const customCreateDate = vi.fn(() => new Date(0));
    const customCreateFileReader = vi.fn(() => ({ custom: true }));

    const environment = resolveHistoryPageEnvironment({
      windowLike: {
        location: { href: "" }
      },
      localHistoryStore: { store: true },
      modeCatalog: { mode: true },
      runtime: { adapter: true },
      confirmAction: () => false,
      navigateToHref: customNavigate,
      createDate: customCreateDate,
      createFileReader: customCreateFileReader
    });

    (environment.navigateToHref as (href: string) => void)("/custom");
    (environment.createDate as () => Date)();
    (environment.createFileReader as () => { custom: boolean })();

    expect(environment.localHistoryStore).toEqual({ store: true });
    expect(environment.modeCatalog).toEqual({ mode: true });
    expect(environment.runtime).toEqual({ adapter: true });
    expect(customNavigate).toHaveBeenCalledWith("/custom");
    expect(customCreateDate).toHaveBeenCalledTimes(1);
    expect(customCreateFileReader).toHaveBeenCalledTimes(1);
  });

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
