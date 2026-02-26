import { describe, expect, it } from "vitest";

import { resolveHistorySummaryText } from "../../src/bootstrap/history-summary";

describe("bootstrap history summary", () => {
  it("builds summary text for mismatch filter", () => {
    const text = resolveHistorySummaryText({
      total: 12,
      page: 2,
      pageSize: 30,
      adapterParityFilter: "mismatch"
    });

    expect(text).toBe("共 12 条记录 · 当前第 2 页 · 每页 30 条 · 诊断筛选: 仅不一致");
  });

  it("normalizes invalid numeric inputs", () => {
    const text = resolveHistorySummaryText({
      total: -5,
      page: 0,
      pageSize: "bad",
      adapterParityFilter: "match"
    });

    expect(text).toBe("共 0 条记录 · 当前第 1 页 · 每页 30 条 · 诊断筛选: 仅一致");
  });

  it("falls back to all filter when unknown", () => {
    const text = resolveHistorySummaryText({
      total: 3,
      page: 1,
      pageSize: 10,
      adapterParityFilter: "unknown"
    });

    expect(text).toBe("共 3 条记录 · 当前第 1 页 · 每页 10 条 · 诊断筛选: 全部");
  });
});
