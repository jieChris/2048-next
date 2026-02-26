import { describe, expect, it, vi } from "vitest";

import { bindHistoryToolbarActionButtons } from "../../src/bootstrap/history-toolbar-bind-host";

function createFakeElement() {
  const handlers: Record<string, (event?: unknown) => void> = {};
  return {
    handlers,
    addEventListener: (name: string, cb: (event?: unknown) => void) => {
      handlers[name] = cb;
    }
  };
}

describe("bootstrap history toolbar bind host", () => {
  it("binds toolbar action buttons and delegates action execution", () => {
    const state = {
      modeKey: "mode-a",
      keyword: "kw",
      sortBy: "ended_desc"
    };
    const loadHistory = vi.fn();
    const setStatus = vi.fn();
    const readFilters = vi.fn();
    const createDate = vi.fn(() => new Date("2026-02-26T00:00:00.000Z"));

    const elements: Record<string, ReturnType<typeof createFakeElement>> = {
      "history-load-btn": createFakeElement(),
      "history-export-all-btn": createFakeElement(),
      "history-export-mismatch-btn": createFakeElement(),
      "history-clear-all-btn": createFakeElement()
    };

    const result = bindHistoryToolbarActionButtons({
      getElementById: (id: string) => elements[id] || null,
      localHistoryStore: {},
      state,
      readFilters,
      setStatus,
      loadHistory,
      historyExportRuntime: {},
      historyToolbarRuntime: {},
      historyToolbarHostRuntime: {
        applyHistoryExportAllAction: () => ({
          shouldSetStatus: true,
          statusText: "export all",
          isError: false
        }),
        applyHistoryMismatchExportAction: (input: unknown) => {
          const payload = input as { modeKey: string; keyword: string; sortBy: string };
          return {
            shouldSetStatus: true,
            statusText: `${payload.modeKey}|${payload.keyword}|${payload.sortBy}`,
            isError: false
          };
        },
        applyHistoryClearAllAction: () => ({
          shouldSetStatus: true,
          statusText: "cleared",
          isError: false,
          shouldReload: true
        })
      },
      confirmAction: () => true,
      createDate
    });

    expect(result.didBind).toBe(true);
    expect(result.boundControlCount).toBe(4);

    elements["history-load-btn"].handlers.click();
    expect(loadHistory).toHaveBeenLastCalledWith(true);

    elements["history-export-all-btn"].handlers.click();
    expect(setStatus).toHaveBeenLastCalledWith("export all", false);
    expect(createDate).toHaveBeenCalled();

    elements["history-export-mismatch-btn"].handlers.click();
    expect(readFilters).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenLastCalledWith("mode-a|kw|ended_desc", false);

    elements["history-clear-all-btn"].handlers.click();
    expect(setStatus).toHaveBeenLastCalledWith("cleared", false);
    expect(loadHistory).toHaveBeenLastCalledWith(true);
  });

  it("returns noop when required binding dependencies are missing", () => {
    expect(bindHistoryToolbarActionButtons({})).toEqual({
      didBind: false,
      boundControlCount: 0
    });
  });
});
