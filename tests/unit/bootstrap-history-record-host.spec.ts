import { describe, expect, it, vi } from "vitest";

import {
  applyHistoryRecordDeleteAction,
  applyHistoryRecordExportAction,
  resolveHistoryRecordReplayHref
} from "../../src/bootstrap/history-record-host";

describe("bootstrap history record host", () => {
  it("resolves replay href from record action runtime", () => {
    const href = resolveHistoryRecordReplayHref({
      itemId: "record-1",
      historyRecordActionsRuntime: {
        resolveHistoryReplayHref: (recordId: unknown) => "/replay.html?id=" + String(recordId)
      }
    });

    expect(href).toBe("/replay.html?id=record-1");
  });

  it("applies export action through export runtime", () => {
    const downloadHistorySingleRecord = vi.fn(() => true);
    const ok = applyHistoryRecordExportAction({
      localHistoryStore: { id: "store" },
      item: { id: "record-1" },
      historyExportRuntime: {
        downloadHistorySingleRecord
      }
    });

    expect(ok).toBe(true);
    expect(downloadHistorySingleRecord).toHaveBeenCalledWith({
      localHistoryStore: { id: "store" },
      item: { id: "record-1" }
    });
  });

  it("applies delete action and returns success status state", () => {
    const confirmAction = vi.fn(() => true);
    const result = applyHistoryRecordDeleteAction({
      localHistoryStore: { id: "store" },
      itemId: "record-1",
      confirmAction,
      historyRecordActionsRuntime: {
        resolveHistoryDeleteActionState: () => ({
          recordId: "record-1",
          confirmMessage: "确定删除?"
        }),
        executeHistoryDeleteRecord: () => ({
          deleted: true,
          notice: "已删除"
        }),
        resolveHistoryDeleteFailureNotice: () => "删除失败",
        resolveHistoryDeleteSuccessNotice: () => "删除成功"
      }
    });

    expect(confirmAction).toHaveBeenCalledWith("确定删除?");
    expect(result).toEqual({
      shouldSetStatus: true,
      statusText: "已删除",
      isError: false,
      shouldReload: true
    });
  });

  it("returns noop when delete confirm is rejected", () => {
    const result = applyHistoryRecordDeleteAction({
      localHistoryStore: { id: "store" },
      itemId: "record-1",
      confirmAction: () => false,
      historyRecordActionsRuntime: {
        resolveHistoryDeleteActionState: () => ({
          recordId: "record-1",
          confirmMessage: "确定删除?"
        }),
        executeHistoryDeleteRecord: () => ({
          deleted: true,
          notice: "已删除"
        })
      }
    });

    expect(result).toEqual({
      shouldSetStatus: false,
      statusText: "",
      isError: false,
      shouldReload: false
    });
  });
});
