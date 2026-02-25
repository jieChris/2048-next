import { describe, expect, it } from "vitest";

import {
  resolveHistoryDeleteActionState,
  resolveHistoryDeleteFailureNotice,
  resolveHistoryDeleteSuccessNotice,
  resolveHistoryReplayHref
} from "../../src/bootstrap/history-record-actions";

describe("bootstrap history record actions", () => {
  it("builds replay href with encoded id", () => {
    const href = resolveHistoryReplayHref("id a/b");
    expect(href).toBe("replay.html?local_history_id=id%20a%2Fb");
  });

  it("builds delete action state", () => {
    const state = resolveHistoryDeleteActionState(123);
    expect(state).toEqual({
      recordId: "123",
      confirmMessage: "确认删除这条历史记录？此操作不可撤销。"
    });
  });

  it("returns delete notices", () => {
    expect(resolveHistoryDeleteFailureNotice()).toBe("删除失败：记录不存在或已被删除");
    expect(resolveHistoryDeleteSuccessNotice()).toBe("记录已删除");
  });
});
