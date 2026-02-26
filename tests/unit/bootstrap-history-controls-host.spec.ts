import { describe, expect, it, vi } from "vitest";

import {
  applyHistoryModeFilterInitialization,
  bindHistoryControls
} from "../../src/bootstrap/history-controls-host";

describe("bootstrap history controls host", () => {
  it("delegates mode filter initialization to mode-filter host runtime", () => {
    const applyHistoryModeFilterOptionsRender = vi.fn();
    const modeElement = { value: "" };
    const getElementById = vi.fn(() => modeElement);

    const result = applyHistoryModeFilterInitialization({
      getElementById,
      historyModeFilterHostRuntime: {
        applyHistoryModeFilterOptionsRender
      },
      historyModeFilterRuntime: {},
      modeCatalog: {},
      documentLike: {}
    });

    expect(result).toEqual({ didInit: true });
    expect(applyHistoryModeFilterOptionsRender).toHaveBeenCalledWith({
      selectElement: modeElement,
      modeCatalog: {},
      historyModeFilterRuntime: {},
      documentLike: {}
    });
  });

  it("returns noop when mode filter host runtime is missing", () => {
    expect(applyHistoryModeFilterInitialization({})).toEqual({
      didInit: false
    });
  });

  it("delegates toolbar/import/pager bindings to host runtimes", () => {
    const bindHistoryToolbarActionButtons = vi.fn();
    const bindHistoryImportControls = vi.fn();
    const bindHistoryToolbarPagerAndFilterEvents = vi.fn();
    const getElementById = vi.fn();

    const result = bindHistoryControls({
      getElementById,
      localHistoryStore: {},
      state: { page: 1 },
      readFilters: () => undefined,
      setStatus: () => undefined,
      loadHistory: () => undefined,
      historyExportRuntime: {},
      historyToolbarRuntime: {},
      historyToolbarHostRuntime: {},
      historyToolbarBindHostRuntime: {
        bindHistoryToolbarActionButtons
      },
      historyImportRuntime: {},
      historyImportFileRuntime: {},
      historyImportHostRuntime: {},
      historyImportBindHostRuntime: {
        bindHistoryImportControls
      },
      historyToolbarEventsRuntime: {},
      historyToolbarEventsHostRuntime: {
        bindHistoryToolbarPagerAndFilterEvents
      },
      confirmAction: () => true,
      createDate: () => new Date(0),
      createFileReader: () => ({})
    });

    expect(result).toEqual({ didBind: true });
    expect(bindHistoryToolbarActionButtons).toHaveBeenCalledTimes(1);
    expect(bindHistoryImportControls).toHaveBeenCalledTimes(1);
    expect(bindHistoryToolbarPagerAndFilterEvents).toHaveBeenCalledTimes(1);
  });

  it("returns noop when any required binder is missing", () => {
    expect(
      bindHistoryControls({
        historyToolbarBindHostRuntime: {
          bindHistoryToolbarActionButtons: () => undefined
        },
        historyImportBindHostRuntime: {},
        historyToolbarEventsHostRuntime: {
          bindHistoryToolbarPagerAndFilterEvents: () => undefined
        }
      })
    ).toEqual({
      didBind: false
    });
  });
});
