import { describe, expect, it } from "vitest";

import {
  resolveHistoryFilterReloadControlIds,
  resolveHistoryNextPageState,
  resolveHistoryPrevPageState,
  shouldHistoryKeywordTriggerReload
} from "../../src/bootstrap/history-toolbar-events";

describe("bootstrap history toolbar events", () => {
  it("resolves prev/next page state", () => {
    expect(resolveHistoryPrevPageState(1)).toEqual({ canGo: false, nextPage: 1 });
    expect(resolveHistoryPrevPageState(3)).toEqual({ canGo: true, nextPage: 2 });
    expect(resolveHistoryNextPageState(3)).toEqual({ canGo: true, nextPage: 4 });
  });

  it("returns filter control ids for reload bindings", () => {
    expect(resolveHistoryFilterReloadControlIds()).toEqual([
      "history-mode",
      "history-sort",
      "history-adapter-filter",
      "history-burnin-window",
      "history-sustained-window"
    ]);
  });

  it("accepts enter key for keyword submit", () => {
    expect(shouldHistoryKeywordTriggerReload("Enter")).toBe(true);
    expect(shouldHistoryKeywordTriggerReload("Escape")).toBe(false);
    expect(shouldHistoryKeywordTriggerReload(null)).toBe(false);
  });
});
