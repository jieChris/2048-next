import { describe, expect, it, vi } from "vitest";

import {
  applyHistoryClearAllAction,
  applyHistoryExportAllAction,
  applyHistoryMismatchExportAction
} from "../../src/bootstrap/history-toolbar-host";

describe("bootstrap history toolbar host", () => {
  it("applies export-all flow and returns status notice when download succeeds", () => {
    const resolveHistoryExportDateTag = vi.fn(() => "20260225");
    const resolveHistoryExportAllFileName = vi.fn(() => "all.json");
    const resolveHistoryExportAllNotice = vi.fn(() => "导出完成");
    const downloadHistoryAllRecords = vi.fn(() => true);

    const result = applyHistoryExportAllAction({
      localHistoryStore: { id: "store" },
      dateValue: new Date("2026-02-25T00:00:00.000Z"),
      historyExportRuntime: {
        downloadHistoryAllRecords
      },
      historyToolbarRuntime: {
        resolveHistoryExportDateTag,
        resolveHistoryExportAllFileName,
        resolveHistoryExportAllNotice
      }
    });

    expect(downloadHistoryAllRecords).toHaveBeenCalledTimes(1);
    expect(resolveHistoryExportAllNotice).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      shouldSetStatus: true,
      statusText: "导出完成",
      isError: false,
      shouldReload: false
    });
  });

  it("applies mismatch export flow and returns empty notice", () => {
    const resolveHistoryMismatchExportQuery = vi.fn(() => ({ modeKey: "a" }));
    const resolveHistoryMismatchExportEmptyNotice = vi.fn(() => "无不一致记录");
    const downloadHistoryMismatchRecords = vi.fn(() => ({ empty: true }));

    const result = applyHistoryMismatchExportAction({
      localHistoryStore: { id: "store" },
      modeKey: "a",
      keyword: "",
      sortBy: "ended_desc",
      dateValue: new Date("2026-02-25T00:00:00.000Z"),
      historyExportRuntime: {
        downloadHistoryMismatchRecords
      },
      historyToolbarRuntime: {
        resolveHistoryMismatchExportQuery,
        resolveHistoryMismatchExportEmptyNotice
      }
    });

    expect(resolveHistoryMismatchExportQuery).toHaveBeenCalledWith({
      modeKey: "a",
      keyword: "",
      sortBy: "ended_desc"
    });
    expect(result).toEqual({
      shouldSetStatus: true,
      statusText: "无不一致记录",
      isError: false,
      shouldReload: false
    });
  });

  it("applies clear-all flow with confirm and triggers reload on success", () => {
    const resolveHistoryClearAllActionState = vi.fn(() => ({
      requiresConfirm: true,
      confirmMessage: "确定清空？",
      successNotice: "已清空"
    }));
    const executeHistoryClearAll = vi.fn(() => ({ cleared: true }));
    const confirmAction = vi.fn(() => true);

    const result = applyHistoryClearAllAction({
      localHistoryStore: { id: "store" },
      historyToolbarRuntime: {
        resolveHistoryClearAllActionState,
        executeHistoryClearAll
      },
      confirmAction
    });

    expect(confirmAction).toHaveBeenCalledWith("确定清空？");
    expect(executeHistoryClearAll).toHaveBeenCalledWith({
      localHistoryStore: { id: "store" }
    });
    expect(result).toEqual({
      shouldSetStatus: true,
      statusText: "已清空",
      isError: false,
      shouldReload: true
    });
  });

  it("returns noop when clear-all confirm is rejected", () => {
    const result = applyHistoryClearAllAction({
      localHistoryStore: { id: "store" },
      historyToolbarRuntime: {
        resolveHistoryClearAllActionState: () => ({
          requiresConfirm: true,
          confirmMessage: "确定清空？",
          successNotice: "已清空"
        }),
        executeHistoryClearAll: () => ({ cleared: true })
      },
      confirmAction: () => false
    });

    expect(result).toEqual({
      shouldSetStatus: false,
      statusText: "",
      isError: false,
      shouldReload: false
    });
  });
});
