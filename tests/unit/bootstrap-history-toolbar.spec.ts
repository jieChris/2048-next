import { describe, expect, it } from "vitest";

import {
  resolveHistoryClearAllActionState,
  resolveHistoryExportAllFileName,
  resolveHistoryExportAllNotice,
  resolveHistoryExportDateTag,
  resolveHistoryMismatchExportEmptyNotice,
  resolveHistoryMismatchExportFileName,
  resolveHistoryMismatchExportQuery,
  resolveHistoryMismatchExportSuccessNotice
} from "../../src/bootstrap/history-toolbar";

describe("bootstrap history toolbar", () => {
  it("resolves export file names and notices", () => {
    expect(resolveHistoryExportDateTag("2026-02-25T08:00:00.000Z")).toBe("2026-02-25");
    expect(resolveHistoryExportAllFileName("2026-02-25")).toBe("2048_local_history_2026-02-25.json");
    expect(resolveHistoryMismatchExportFileName("2026-02-25")).toBe(
      "2048_local_history_mismatch_2026-02-25.json"
    );
    expect(resolveHistoryExportAllNotice()).toBe("已导出全部历史记录");
  });

  it("resolves mismatch export query and status text", () => {
    expect(
      resolveHistoryMismatchExportQuery({
        modeKey: "standard_4x4_pow2_no_undo",
        keyword: "core",
        sortBy: "ended_desc"
      })
    ).toEqual({
      mode_key: "standard_4x4_pow2_no_undo",
      keyword: "core",
      sort_by: "ended_desc",
      adapter_parity_filter: "mismatch"
    });
    expect(resolveHistoryMismatchExportEmptyNotice()).toBe("没有可导出的 A/B 不一致记录");
    expect(resolveHistoryMismatchExportSuccessNotice(3)).toBe("已导出 A/B 不一致记录 3 条");
  });

  it("resolves clear-all confirm plan", () => {
    expect(resolveHistoryClearAllActionState()).toEqual({
      requiresConfirm: true,
      confirmMessage: "确认清空全部本地历史记录？此操作不可撤销。",
      successNotice: "已清空全部历史记录"
    });
  });
});
