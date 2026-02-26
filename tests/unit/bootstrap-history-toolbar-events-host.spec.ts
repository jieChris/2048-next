import { describe, expect, it, vi } from "vitest";

import { bindHistoryToolbarPagerAndFilterEvents } from "../../src/bootstrap/history-toolbar-events-host";

function createFakeElement() {
  const handlers: Record<string, (event?: unknown) => void> = {};
  return {
    handlers,
    addEventListener: (name: string, cb: (event?: unknown) => void) => {
      handlers[name] = cb;
    }
  };
}

describe("bootstrap history toolbar events host", () => {
  it("binds pager and filter events through runtime decisions", () => {
    const state: Record<string, unknown> = { page: 2 };
    const loadHistory = vi.fn();
    const elements: Record<string, ReturnType<typeof createFakeElement>> = {
      "history-prev-page": createFakeElement(),
      "history-next-page": createFakeElement(),
      "history-mode": createFakeElement(),
      "history-sort": createFakeElement(),
      "history-keyword": createFakeElement()
    };

    const bindState = bindHistoryToolbarPagerAndFilterEvents({
      getElementById: (id: string) => elements[id] || null,
      state,
      loadHistory,
      historyToolbarEventsRuntime: {
        resolveHistoryPrevPageState: (page: number) => ({ canGo: page > 1, nextPage: page - 1 }),
        resolveHistoryNextPageState: (page: number) => ({ canGo: true, nextPage: page + 1 }),
        resolveHistoryFilterReloadControlIds: () => ["history-mode", "history-sort"],
        shouldHistoryKeywordTriggerReload: (key: string) => key === "Enter"
      }
    });

    expect(bindState.didBind).toBe(true);
    expect(bindState.boundControlCount).toBe(5);

    elements["history-prev-page"].handlers.click();
    expect(state.page).toBe(1);
    expect(loadHistory).toHaveBeenLastCalledWith(false);

    elements["history-next-page"].handlers.click();
    expect(state.page).toBe(2);
    expect(loadHistory).toHaveBeenLastCalledWith(false);

    elements["history-mode"].handlers.change();
    expect(loadHistory).toHaveBeenLastCalledWith(true);

    const preventDefault = vi.fn();
    elements["history-keyword"].handlers.keydown({ key: "Escape", preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();

    elements["history-keyword"].handlers.keydown({ key: "Enter", preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(loadHistory).toHaveBeenLastCalledWith(true);
  });

  it("returns noop when binding dependencies are missing", () => {
    expect(bindHistoryToolbarPagerAndFilterEvents({})).toEqual({
      didBind: false,
      boundControlCount: 0
    });
  });
});
