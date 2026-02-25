import { describe, expect, it } from "vitest";

import {
  resolveHistoryImportActionState,
  resolveHistoryImportErrorNotice,
  resolveHistoryImportMergeFlag,
  resolveHistoryImportReadErrorNotice,
  resolveHistoryImportSuccessNotice
} from "../../src/bootstrap/history-import";

describe("bootstrap history import", () => {
  it("resolves merge and replace action states", () => {
    expect(resolveHistoryImportActionState("merge")).toEqual({
      mode: "merge",
      requiresConfirm: false,
      confirmMessage: ""
    });

    expect(resolveHistoryImportActionState("replace")).toEqual({
      mode: "replace",
      requiresConfirm: true,
      confirmMessage: "导入并替换会清空当前本地历史后再导入，是否继续？"
    });
  });

  it("resolves merge flag from import mode", () => {
    expect(resolveHistoryImportMergeFlag("merge")).toBe(true);
    expect(resolveHistoryImportMergeFlag("replace")).toBe(false);
    expect(resolveHistoryImportMergeFlag("bad")).toBe(true);
  });

  it("builds import status notices", () => {
    expect(resolveHistoryImportSuccessNotice({ imported: 5, replaced: 2 })).toBe(
      "导入成功：新增 5 条，覆盖 2 条。"
    );
    expect(resolveHistoryImportErrorNotice(new Error("parse failed"))).toBe(
      "导入失败: parse failed"
    );
    expect(resolveHistoryImportReadErrorNotice()).toBe("读取文件失败");
  });
});
