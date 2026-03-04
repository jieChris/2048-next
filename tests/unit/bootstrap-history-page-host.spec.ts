import { describe, expect, it, vi } from "vitest";

import {
  applyHistoryPageBootstrap,
  applyHistoryPageApp,
  applyHistoryPageLoad,
  applyHistoryPageStartup,
  applyHistoryPageStatus,
  resolveHistoryPageDefaults,
  resolveHistoryPageEnvironment,
  resolveHistoryPageLoadEntryInput,
  resolveHistoryPageRuntimes,
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
      sustainedWindows: "3",
      burnInMinComparable: "50",
      burnInMaxMismatchRate: "1"
    });
    expect(defaults.burnInMinComparable).toBe(50);
    expect(defaults.burnInMaxMismatchRate).toBe(1);
    expect(defaults.adapterModeStorageKey).toBe("engine_adapter_mode");
    expect(defaults.defaultModeStorageKey).toBe("engine_adapter_default_mode");
    expect(defaults.forceLegacyStorageKey).toBe("engine_adapter_force_legacy");
    expect(defaults.historyFilterStateStorageKey).toBe("history_filter_state_v1");
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
    expect(defaults.state).toMatchObject({
      burnInMinComparable: "80",
      burnInMaxMismatchRate: "0.3"
    });
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
      localStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
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
    expect(environment.localStorage).toBe(windowLike.localStorage);
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

  it("resolves history page runtimes via runtime contract runtime", () => {
    const resolveHistoryRuntimeContracts = vi.fn(() => ({ historyStartupHostRuntime: {} }));
    const windowLike = {
      CoreHistoryRuntimeContractRuntime: {
        resolveHistoryRuntimeContracts
      }
    };

    const result = resolveHistoryPageRuntimes({
      windowLike
    });

    expect(resolveHistoryRuntimeContracts).toHaveBeenCalledTimes(1);
    expect(resolveHistoryRuntimeContracts).toHaveBeenCalledWith(windowLike);
    expect(result).toEqual({ historyStartupHostRuntime: {} });
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
      persistHistoryFilterState: () => true,
      modeCatalog: {},
      adapterModeStorageKey: "adapter_mode",
      defaultModeStorageKey: "default_mode",
      forceLegacyStorageKey: "force_legacy"
    });

    expect(result.historyFilterHostRuntime).toBe(runtimes.historyFilterHostRuntime);
    expect(result.historyLoadHostRuntime).toBe(runtimes.historyLoadHostRuntime);
    expect(result.historyStatusRuntime).toBe(runtimes.historyStatusRuntime);
    expect(result.historyPanelContext).toBe(historyPanelContext);
    expect(typeof result.persistHistoryFilterState).toBe("function");
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
    const loadPayload = applyHistoryLoadEntry.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(loadPayload).toBeTruthy();
    expect(loadPayload.persistHistoryFilterState).toBeUndefined();
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

  it("applies page app through startup->load delegation chain", () => {
    const applyHistoryStatus = vi.fn(() => ({ didApply: true }));
    const applyHistoryLoadEntry = vi.fn((payload: Record<string, unknown>) => {
      const persistHistoryFilterState = payload.persistHistoryFilterState as (() => unknown) | undefined;
      if (persistHistoryFilterState) persistHistoryFilterState();
      return { didLoad: true, missingStore: false };
    });
    const applyHistoryStartup = vi.fn(({ loadHistory }: { loadHistory: (resetPage: boolean) => void }) => {
      loadHistory(true);
      return { started: true, missingStore: false };
    });
    const readHistoryStorageValue = vi.fn(() =>
      JSON.stringify({
        schemaVersion: 1,
        filter: {
          modeKey: "from-storage",
          keyword: "kw",
          sortBy: "score_desc",
          adapterParityFilter: "mismatch",
          burnInWindow: "500",
          sustainedWindows: "4",
          burnInMinComparable: "40",
          burnInMaxMismatchRate: "0.5"
        }
      })
    );
    const writeHistoryStorageValue = vi.fn(() => true);
    const applyHistoryFilterState = vi.fn((targetState: Record<string, unknown>, input: Record<string, unknown>) => {
      targetState.modeKey = input.modeKeyRaw;
      targetState.keyword = input.keywordRaw;
      targetState.sortBy = input.sortByRaw;
      targetState.adapterParityFilter = input.adapterParityFilterRaw;
      targetState.burnInWindow = input.burnInWindowRaw;
      targetState.sustainedWindows = input.sustainedWindowsRaw;
      targetState.burnInMinComparable = input.minComparableRaw;
      targetState.burnInMaxMismatchRate = input.maxMismatchRateRaw;
      return true;
    });

    const result = applyHistoryPageApp({
      historyPageDefaults: resolveHistoryPageDefaults(),
      historyPageEnvironment: resolveHistoryPageEnvironment({
        windowLike: {
          LocalHistoryStore: {},
          localStorage: {},
          ModeCatalog: {},
          LegacyAdapterRuntime: {},
          confirm: () => true,
          location: { href: "" },
          document: {}
        }
      }),
      historyRuntimes: {
        historyQueryRuntime: {
          applyHistoryFilterState
        },
        historyViewHostRuntime: {
          applyHistoryStatus
        },
        historyStatusRuntime: {},
        historyLoadEntryHostRuntime: {
          applyHistoryLoadEntry
        },
        historyLoadContextHostRuntime: {
          resolveHistoryLoadPanelContext: () => ({})
        },
        historyCanaryStorageRuntime: {
          readHistoryStorageValue,
          writeHistoryStorageValue
        },
        historyStartupHostRuntime: {
          applyHistoryStartup
        }
      },
      getElementById: () => null
    });

    expect(result).toEqual({ started: true, missingStore: false });
    expect(applyHistoryStartup).toHaveBeenCalledTimes(1);
    expect(applyHistoryLoadEntry).toHaveBeenCalledTimes(1);
    expect(readHistoryStorageValue).toHaveBeenCalledWith({}, "history_filter_state_v1");
    expect(applyHistoryStartup).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          modeKey: "from-storage",
          burnInMinComparable: "40",
          burnInMaxMismatchRate: "0.5"
        })
      })
    );
    const writePayload = writeHistoryStorageValue.mock.calls[0]?.[2];
    expect(writeHistoryStorageValue).toHaveBeenCalledWith(
      {},
      "history_filter_state_v1",
      expect.any(String)
    );
    expect(JSON.parse(String(writePayload))).toMatchObject({
      schemaVersion: 1,
      filter: {
        modeKey: "from-storage",
        burnInMinComparable: "40",
        burnInMaxMismatchRate: "0.5"
      }
    });
  });

  it("syncs restored persisted filter state back to dom controls before first load", () => {
    const elements: Record<string, { value: string }> = {
      "history-mode": { value: "" },
      "history-keyword": { value: "" },
      "history-sort": { value: "ended_desc" },
      "history-adapter-filter": { value: "all" },
      "history-burnin-window": { value: "200" },
      "history-sustained-window": { value: "3" },
      "history-burnin-min-comparable": { value: "50" },
      "history-burnin-max-mismatch-rate": { value: "1" }
    };
    const getElementById = (id: string) => elements[id] || null;

    const applyHistoryLoadEntry = vi.fn(() => ({ didLoad: true, missingStore: false }));
    const applyHistoryStartup = vi.fn(({ loadHistory }: { loadHistory: (resetPage: boolean) => void }) => {
      loadHistory(true);
      return { started: true, missingStore: false };
    });
    const readHistoryStorageValue = vi.fn(() =>
      JSON.stringify({
        keyword: "restored-keyword",
        sortBy: "score_desc",
        adapterParityFilter: "mismatch",
        burnInWindow: "500",
        sustainedWindows: "4",
        burnInMinComparable: "44",
        burnInMaxMismatchRate: "0.4"
      })
    );

    applyHistoryPageApp({
      historyPageDefaults: resolveHistoryPageDefaults(),
      historyPageEnvironment: resolveHistoryPageEnvironment({
        windowLike: {
          LocalHistoryStore: {},
          localStorage: {},
          ModeCatalog: {},
          LegacyAdapterRuntime: {},
          confirm: () => true,
          location: { href: "" },
          document: {}
        }
      }),
      historyRuntimes: {
        historyQueryRuntime: {
          applyHistoryFilterState: vi.fn(
            (targetState: Record<string, unknown>, input: Record<string, unknown>) => {
              targetState.modeKey = input.modeKeyRaw;
              targetState.keyword = input.keywordRaw;
              targetState.sortBy = input.sortByRaw;
              targetState.adapterParityFilter = input.adapterParityFilterRaw;
              targetState.burnInWindow = input.burnInWindowRaw;
              targetState.sustainedWindows = input.sustainedWindowsRaw;
              targetState.burnInMinComparable = input.minComparableRaw;
              targetState.burnInMaxMismatchRate = input.maxMismatchRateRaw;
              return true;
            }
          )
        },
        historyLoadEntryHostRuntime: {
          applyHistoryLoadEntry
        },
        historyLoadContextHostRuntime: {
          resolveHistoryLoadPanelContext: () => ({})
        },
        historyCanaryStorageRuntime: {
          readHistoryStorageValue,
          writeHistoryStorageValue: vi.fn(() => true)
        },
        historyStartupHostRuntime: {
          applyHistoryStartup
        }
      },
      getElementById
    });

    expect(elements["history-keyword"].value).toBe("restored-keyword");
    expect(elements["history-sort"].value).toBe("score_desc");
    expect(elements["history-adapter-filter"].value).toBe("mismatch");
    expect(elements["history-burnin-window"].value).toBe("500");
    expect(elements["history-sustained-window"].value).toBe("4");
    expect(elements["history-burnin-min-comparable"].value).toBe("44");
    expect(elements["history-burnin-max-mismatch-rate"].value).toBe("0.4");
  });

  it("clears persisted filter snapshot when filter state matches defaults", () => {
    const applyHistoryLoadEntry = vi.fn((payload: Record<string, unknown>) => {
      const persistHistoryFilterState = payload.persistHistoryFilterState as (() => unknown) | undefined;
      if (persistHistoryFilterState) persistHistoryFilterState();
      return { didLoad: true, missingStore: false };
    });
    const applyHistoryStartup = vi.fn(({ loadHistory }: { loadHistory: (resetPage: boolean) => void }) => {
      loadHistory(true);
      return { started: true, missingStore: false };
    });
    const writeHistoryStorageValue = vi.fn(() => true);

    applyHistoryPageApp({
      historyPageDefaults: resolveHistoryPageDefaults(),
      historyPageEnvironment: resolveHistoryPageEnvironment({
        windowLike: {
          LocalHistoryStore: {},
          localStorage: {},
          ModeCatalog: {},
          LegacyAdapterRuntime: {},
          confirm: () => true,
          location: { href: "" },
          document: {}
        }
      }),
      historyRuntimes: {
        historyQueryRuntime: {
          applyHistoryFilterState: vi.fn()
        },
        historyLoadEntryHostRuntime: {
          applyHistoryLoadEntry
        },
        historyLoadContextHostRuntime: {
          resolveHistoryLoadPanelContext: () => ({})
        },
        historyCanaryStorageRuntime: {
          readHistoryStorageValue: vi.fn(() => null),
          writeHistoryStorageValue
        },
        historyStartupHostRuntime: {
          applyHistoryStartup
        }
      },
      getElementById: () => null
    });

    expect(applyHistoryStartup).toHaveBeenCalledTimes(1);
    expect(applyHistoryLoadEntry).toHaveBeenCalledTimes(1);
    expect(writeHistoryStorageValue).toHaveBeenCalledWith({}, "history_filter_state_v1", "");
  });

  it("keeps default filter state when persisted snapshot schema is unsupported", () => {
    const applyHistoryLoadEntry = vi.fn(() => ({ didLoad: true, missingStore: false }));
    const applyHistoryStartup = vi.fn(({ loadHistory }: { loadHistory: (resetPage: boolean) => void }) => {
      loadHistory(true);
      return { started: true, missingStore: false };
    });
    const readHistoryStorageValue = vi.fn(() =>
      JSON.stringify({
        schemaVersion: 999,
        filter: {
          modeKey: "unsupported"
        }
      })
    );

    applyHistoryPageApp({
      historyPageDefaults: resolveHistoryPageDefaults(),
      historyPageEnvironment: resolveHistoryPageEnvironment({
        windowLike: {
          LocalHistoryStore: {},
          localStorage: {},
          ModeCatalog: {},
          LegacyAdapterRuntime: {},
          confirm: () => true,
          location: { href: "" },
          document: {}
        }
      }),
      historyRuntimes: {
        historyQueryRuntime: {
          applyHistoryFilterState: vi.fn()
        },
        historyLoadEntryHostRuntime: {
          applyHistoryLoadEntry
        },
        historyLoadContextHostRuntime: {
          resolveHistoryLoadPanelContext: () => ({})
        },
        historyCanaryStorageRuntime: {
          readHistoryStorageValue,
          writeHistoryStorageValue: vi.fn(() => true)
        },
        historyStartupHostRuntime: {
          applyHistoryStartup
        }
      },
      getElementById: () => null
    });

    expect(applyHistoryStartup).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          modeKey: "",
          burnInMinComparable: "50",
          burnInMaxMismatchRate: "1"
        })
      })
    );
    expect(applyHistoryLoadEntry).toHaveBeenCalledTimes(1);
  });

  it("keeps default filter state when persisted snapshot json is malformed", () => {
    const applyHistoryLoadEntry = vi.fn(() => ({ didLoad: true, missingStore: false }));
    const applyHistoryStartup = vi.fn(({ loadHistory }: { loadHistory: (resetPage: boolean) => void }) => {
      loadHistory(true);
      return { started: true, missingStore: false };
    });
    const readHistoryStorageValue = vi.fn(() => "{bad-json");

    applyHistoryPageApp({
      historyPageDefaults: resolveHistoryPageDefaults(),
      historyPageEnvironment: resolveHistoryPageEnvironment({
        windowLike: {
          LocalHistoryStore: {},
          localStorage: {},
          ModeCatalog: {},
          LegacyAdapterRuntime: {},
          confirm: () => true,
          location: { href: "" },
          document: {}
        }
      }),
      historyRuntimes: {
        historyQueryRuntime: {
          applyHistoryFilterState: vi.fn()
        },
        historyLoadEntryHostRuntime: {
          applyHistoryLoadEntry
        },
        historyLoadContextHostRuntime: {
          resolveHistoryLoadPanelContext: () => ({})
        },
        historyCanaryStorageRuntime: {
          readHistoryStorageValue,
          writeHistoryStorageValue: vi.fn(() => true)
        },
        historyStartupHostRuntime: {
          applyHistoryStartup
        }
      },
      getElementById: () => null
    });

    expect(applyHistoryStartup).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          modeKey: "",
          keyword: "",
          sortBy: "ended_desc",
          burnInWindow: "200",
          sustainedWindows: "3",
          burnInMinComparable: "50",
          burnInMaxMismatchRate: "1"
        })
      })
    );
    expect(applyHistoryLoadEntry).toHaveBeenCalledTimes(1);
  });

  it("defers page bootstrap until domcontentloaded when event api exists", () => {
    const applyHistoryStartup = vi.fn(() => ({ started: true, missingStore: false }));
    const documentLike = {
      readyState: "loading",
      getElementById: vi.fn(() => null),
      addEventListener: vi.fn()
    };
    let domReadyHandler: (() => Record<string, unknown>) | null = null;
    documentLike.addEventListener.mockImplementation((eventName: string, handler: () => Record<string, unknown>) => {
      if (eventName === "DOMContentLoaded") {
        domReadyHandler = handler;
      }
    });

    const result = applyHistoryPageBootstrap({
      windowLike: {
        document: documentLike
      },
      documentLike,
      historyPageDefaults: resolveHistoryPageDefaults(),
      historyPageEnvironment: resolveHistoryPageEnvironment({
        windowLike: {
          LocalHistoryStore: {},
          ModeCatalog: {},
          LegacyAdapterRuntime: {},
          confirm: () => true,
          location: { href: "" },
          document: documentLike
        },
        documentLike
      }),
      historyRuntimes: {
        historyStartupHostRuntime: {
          applyHistoryStartup
        }
      }
    });

    expect(result).toEqual({ deferred: true, started: false });
    expect(documentLike.addEventListener).toHaveBeenCalledWith("DOMContentLoaded", expect.any(Function));
    expect(applyHistoryStartup).not.toHaveBeenCalled();
    expect(domReadyHandler).not.toBeNull();
    domReadyHandler?.();
    expect(applyHistoryStartup).toHaveBeenCalledTimes(1);
  });

  it("starts page bootstrap immediately when dom is already ready", () => {
    const applyHistoryStartup = vi.fn(() => ({ started: true, missingStore: false }));
    const documentLike = {
      readyState: "complete",
      getElementById: () => null,
      addEventListener: vi.fn()
    };

    const result = applyHistoryPageBootstrap({
      documentLike,
      historyPageDefaults: resolveHistoryPageDefaults(),
      historyPageEnvironment: resolveHistoryPageEnvironment({
        windowLike: {
          LocalHistoryStore: {},
          ModeCatalog: {},
          LegacyAdapterRuntime: {},
          confirm: () => true,
          location: { href: "" },
          document: {}
        },
        documentLike: {}
      }),
      historyRuntimes: {
        historyStartupHostRuntime: {
          applyHistoryStartup
        }
      }
    });

    expect(result.deferred).toBe(false);
    expect(result.started).toBe(true);
    expect(applyHistoryStartup).toHaveBeenCalledTimes(1);
    expect(documentLike.addEventListener).not.toHaveBeenCalled();
  });
});
