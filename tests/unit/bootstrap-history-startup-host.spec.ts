import { describe, expect, it, vi } from "vitest";

import { applyHistoryStartup } from "../../src/bootstrap/history-startup-host";

describe("bootstrap history startup host", () => {
  it("starts history page bootstrap flow when store exists", () => {
    const setStatus = vi.fn();
    const initModeFilter = vi.fn();
    const bindToolbarActions = vi.fn();
    const loadHistory = vi.fn();

    const result = applyHistoryStartup({
      localHistoryStore: {},
      setStatus,
      initModeFilter,
      bindToolbarActions,
      loadHistory
    });

    expect(result).toEqual({
      started: true,
      missingStore: false,
      didInitModeFilter: true,
      didBindControls: true
    });
    expect(initModeFilter).toHaveBeenCalledTimes(1);
    expect(bindToolbarActions).toHaveBeenCalledTimes(1);
    expect(loadHistory).toHaveBeenCalledWith(true);
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("delegates mode-init and controls-bind directly to controls host runtime when available", () => {
    const setStatus = vi.fn();
    const loadHistory = vi.fn();
    const applyHistoryModeFilterInitialization = vi.fn();
    const bindHistoryControls = vi.fn();
    const getElementById = vi.fn();

    const result = applyHistoryStartup({
      localHistoryStore: {},
      setStatus,
      loadHistory,
      historyControlsHostRuntime: {
        applyHistoryModeFilterInitialization,
        bindHistoryControls
      },
      getElementById,
      modeElementId: "history-mode",
      modeCatalog: {},
      historyModeFilterRuntime: {},
      historyModeFilterHostRuntime: {},
      documentLike: {},
      state: { page: 1 },
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
      historyToolbarEventsHostRuntime: {},
      confirmAction: () => true,
      createDate: () => new Date(0),
      createFileReader: () => ({})
    });

    expect(result).toEqual({
      started: true,
      missingStore: false,
      didInitModeFilter: true,
      didBindControls: true
    });
    expect(applyHistoryModeFilterInitialization).toHaveBeenCalledTimes(1);
    expect(bindHistoryControls).toHaveBeenCalledTimes(1);
    expect(loadHistory).toHaveBeenCalledWith(true);
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("sets error status when history store is missing", () => {
    const setStatus = vi.fn();
    const initModeFilter = vi.fn();
    const bindToolbarActions = vi.fn();
    const loadHistory = vi.fn();

    const result = applyHistoryStartup({
      setStatus,
      initModeFilter,
      bindToolbarActions,
      loadHistory
    });

    expect(result).toEqual({
      started: false,
      missingStore: true,
      didInitModeFilter: false,
      didBindControls: false
    });
    expect(setStatus).toHaveBeenCalledWith("本地历史模块未加载", true);
    expect(initModeFilter).not.toHaveBeenCalled();
    expect(bindToolbarActions).not.toHaveBeenCalled();
    expect(loadHistory).not.toHaveBeenCalled();
  });
});
