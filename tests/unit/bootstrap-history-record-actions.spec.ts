import { describe, expect, it } from "vitest";

import {
  executeHistoryDeleteRecord,
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

  it("executes delete action with local history store", () => {
    const calls: string[] = [];
    const state = executeHistoryDeleteRecord({
      localHistoryStore: {
        deleteById(recordId: string) {
          calls.push(recordId);
          return true;
        }
      },
      recordId: "abc-1"
    });

    expect(calls).toEqual(["abc-1"]);
    expect(state).toEqual({
      deleted: true,
      notice: "记录已删除"
    });
  });

  it("returns failure notice when delete action cannot run", () => {
    expect(
      executeHistoryDeleteRecord({
        localHistoryStore: null,
        recordId: "abc-2"
      })
    ).toEqual({
      deleted: false,
      notice: "删除失败：记录不存在或已被删除"
    });
  });
});
