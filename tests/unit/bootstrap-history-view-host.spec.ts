import { describe, expect, it, vi } from "vitest";

import { applyHistoryStatus, applyHistorySummary } from "../../src/bootstrap/history-view-host";

describe("bootstrap history view host", () => {
  it("applies status display through runtime state", () => {
    const statusElement = { textContent: "", style: { color: "" } };
    const getElementById = vi.fn(() => statusElement);

    const result = applyHistoryStatus({
      getElementById,
      statusElementId: "history-status",
      text: "导入成功",
      isError: false,
      historyStatusRuntime: {
        resolveHistoryStatusDisplayState: ({ text, isError }: { text: string; isError: boolean }) => ({
          text,
          color: isError ? "#c0392b" : "#4a4a4a"
        })
      }
    });

    expect(result).toEqual({
      didApply: true,
      text: "导入成功",
      color: "#4a4a4a"
    });
    expect(statusElement.textContent).toBe("导入成功");
    expect(statusElement.style.color).toBe("#4a4a4a");
    expect(getElementById).toHaveBeenCalledWith("history-status");
  });

  it("returns no-op status result when runtime is missing", () => {
    const result = applyHistoryStatus({});
    expect(result).toEqual({
      didApply: false,
      text: "",
      color: ""
    });
  });

  it("applies summary text through runtime state", () => {
    const summaryElement = { textContent: "" };
    const getElementById = vi.fn(() => summaryElement);
    const resolveHistorySummaryText = vi.fn(() => "共 1 条记录 · 当前第 1 页 · 每页 30 条 · 诊断筛选: 全部");

    const result = applyHistorySummary({
      getElementById,
      summaryElementId: "history-summary",
      result: { total: 1 },
      state: { page: 1, pageSize: 30, adapterParityFilter: "all" },
      historySummaryRuntime: {
        resolveHistorySummaryText
      }
    });

    expect(result).toEqual({
      didApply: true,
      text: "共 1 条记录 · 当前第 1 页 · 每页 30 条 · 诊断筛选: 全部"
    });
    expect(summaryElement.textContent).toBe(
      "共 1 条记录 · 当前第 1 页 · 每页 30 条 · 诊断筛选: 全部"
    );
    expect(resolveHistorySummaryText).toHaveBeenCalledWith({
      total: 1,
      page: 1,
      pageSize: 30,
      adapterParityFilter: "all"
    });
    expect(getElementById).toHaveBeenCalledWith("history-summary");
  });
});
