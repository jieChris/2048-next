import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";

import { bootstrapHistoryPageRuntime } from "../../src/pages/history-page-runtime";

function createHistoryDocument() {
  return new JSDOM(
    [
      "<!doctype html>",
      "<html><body>",
      '<select id="history-undo"><option value="no_undo">无撤回</option><option value="undo">可撤回</option></select>',
      '<select id="history-mode"></select>',
      '<select id="history-owner"><option value="">全部归属</option></select>',
      '<input id="history-keyword" />',
      '<select id="history-sort"><option value="ended_desc">按时间</option><option value="board_sum_desc">按盘面和</option></select>',
      '<button id="history-load-btn"></button>',
      '<button id="history-export-all-btn"></button>',
      '<button id="history-retry-all-btn"></button>',
      '<button id="history-clear-all-btn"></button>',
      '<button id="history-prev-page"></button>',
      '<button id="history-next-page"></button>',
      '<div id="history-status"></div>',
      '<div id="history-summary"></div>',
      '<div id="history-list"></div>',
      "</body></html>"
    ].join(""),
    { url: "https://local.test/history.html" }
  );
}

describe("history page runtime", () => {
  it("fills the mode filter from an injected catalog without a global legacy ModeCatalog", async () => {
    const dom = createHistoryDocument();
    const windowLike = dom.window as unknown as Window & {
      LocalHistoryStore: Record<string, unknown>;
      ModeCatalog?: unknown;
    };
    delete windowLike.ModeCatalog;
    windowLike.LocalHistoryStore = {
      getAll: () => [],
      listRecords: () => ({ items: [], total: 0, page: 1, page_size: 30 })
    };

    bootstrapHistoryPageRuntime({
      windowLike,
      documentLike: dom.window.document,
      modeCatalog: {
        listModes: () => [{ key: "practice", label: "练习板（直通）", undo_enabled: false }],
        getMode: () => ({ label: "练习板（直通）", board_width: 4, board_height: 4 })
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const options = Array.from(dom.window.document.querySelectorAll("#history-mode option")).map((option) => ({
      value: option.getAttribute("value"),
      text: option.textContent
    }));
    expect(options).toEqual([{ value: "practice", text: "练习板（直通）" }]);
  });

  it("filters concise mode labels by undo type", async () => {
    const dom = createHistoryDocument();
    const windowLike = dom.window as unknown as Window & {
      LocalHistoryStore: Record<string, unknown>;
    };
    windowLike.LocalHistoryStore = {
      getAll: () => [],
      listRecords: () => ({ items: [], total: 0, page: 1, page_size: 30 })
    };

    bootstrapHistoryPageRuntime({
      windowLike,
      documentLike: dom.window.document,
      modeCatalog: {
        listModes: () => [
          { key: "standard_4x4_pow2_no_undo", label: "普通无撤回", board_width: 4, board_height: 4, undo_enabled: false },
          { key: "classic_4x4_pow2_undo", label: "经典版 4x4（可撤回）", board_width: 4, board_height: 4, undo_enabled: true }
        ],
        getMode: (modeKey) =>
          modeKey === "classic_4x4_pow2_undo"
            ? { label: "经典版 4x4（可撤回）", board_width: 4, board_height: 4 }
            : { label: "普通无撤回", board_width: 4, board_height: 4 }
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const options = Array.from(dom.window.document.querySelectorAll("#history-mode option")).map((option) => ({
      value: option.getAttribute("value"),
      text: option.textContent
    }));
    expect(options).toEqual([{ value: "standard_4x4_pow2_no_undo", text: "4x4" }]);

    const undoSelect = dom.window.document.getElementById("history-undo") as HTMLSelectElement;
    undoSelect.value = "undo";
    undoSelect.dispatchEvent(new dom.window.Event("change"));

    const undoOptions = Array.from(dom.window.document.querySelectorAll("#history-mode option")).map((option) => ({
      value: option.getAttribute("value"),
      text: option.textContent
    }));
    expect(undoOptions).toEqual([{ value: "classic_4x4_pow2_undo", text: "4x4" }]);
  });

  it("loads history through an injected store without a global legacy LocalHistoryStore", async () => {
    const dom = createHistoryDocument();
    const windowLike = dom.window as unknown as Window & {
      LocalHistoryStore?: unknown;
    };
    delete windowLike.LocalHistoryStore;
    let listCalls = 0;

    bootstrapHistoryPageRuntime({
      windowLike,
      documentLike: dom.window.document,
      modeCatalog: {
        listModes: () => [],
        getMode: () => null
      },
      historyStore: {
        getAll: () => [],
        listRecords: () => {
          listCalls += 1;
          return { items: [], total: 0, page: 1, page_size: 30 };
        }
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listCalls).toBe(1);
    expect(dom.window.document.getElementById("history-status")?.textContent).toBe("");
  });

  it("removes a deleted local record without reloading the history list", async () => {
    const dom = createHistoryDocument();
    const windowLike = dom.window as unknown as Window & {
      LocalHistoryStore?: unknown;
    };
    windowLike.confirm = () => true;
    let listCalls = 0;
    const deleteById = vi.fn(async () => true);

    bootstrapHistoryPageRuntime({
      windowLike,
      documentLike: dom.window.document,
      modeCatalog: {
        listModes: () => [],
        getMode: () => ({ label: "经典4x4", board_width: 4, board_height: 4 })
      },
      historyStore: {
        getAll: () => [],
        deleteById,
        listRecords: () => {
          listCalls += 1;
          return {
            items: [
              {
                id: "local-rec-1",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 128,
                best_tile: 64,
                duration_ms: 1000,
                ended_at: "2026-07-08T12:00:00.000Z",
                final_board: [[2, 4, 8, 16]]
              }
            ],
            total: 1,
            page: 1,
            page_size: 30
          };
        }
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.querySelectorAll(".history-item")).toHaveLength(1);
    expect(dom.window.document.querySelector(".history-item-head")?.textContent).toContain("分数: 128盘面和: 30");

    (dom.window.document.querySelector(".history-delete-btn") as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(deleteById).toHaveBeenCalledWith("local-rec-1");
    expect(listCalls).toBe(1);
    expect(dom.window.document.getElementById("history-list")?.textContent).toContain("暂无历史记录");
  });

  it("shows delivery state and retries one local record", async () => {
    const dom = createHistoryDocument();
    const windowLike = dom.window as unknown as Window & {
      OnlineLeaderboardRuntime: Record<string, unknown>;
    };
    windowLike.localStorage.setItem("2048_auth_userId_v1", "7");
    let synced = false;
    const retryLocalHistoryRecord = vi.fn(async () => {
      synced = true;
      return { success: true, id: "server-1" };
    });
    windowLike.OnlineLeaderboardRuntime = {
      retryLocalHistoryRecord,
      retryAllLocalHistoryRecords: vi.fn(async () => null)
    };

    bootstrapHistoryPageRuntime({
      windowLike,
      documentLike: dom.window.document,
      modeCatalog: {
        listModes: () => [],
        getMode: () => ({ label: "经典4x4", board_width: 4, board_height: 4 })
      },
      historyStore: {
        getAll: () => [],
        listRecords: () => ({
          items: [{
            id: "local-1",
            mode_key: "standard_4x4_pow2_no_undo",
            replay_string: "RPL",
            owner_type: "user",
            owner_user_id: "7",
            owner_key: "user:7",
            sync_status: synced ? "synced" : "pending",
            server_record_id: synced ? "server-1" : null
          }],
          total: 1,
          page: 1,
          page_size: 30
        })
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.querySelector(".history-sync-badge")?.textContent).toBe("待上传");

    (dom.window.document.querySelector(".history-upload-btn") as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(retryLocalHistoryRecord).toHaveBeenCalledWith("local-1");
    expect(dom.window.document.querySelector(".history-sync-badge")?.textContent).toBe("已同步");
    expect(dom.window.document.querySelector(".history-sync-detail")?.textContent).toContain("server-1");
  });

  it("checks and retries all records from the history toolbar", async () => {
    const dom = createHistoryDocument();
    const retryAllLocalHistoryRecords = vi.fn(async () => ({ success: true }));
    const windowLike = dom.window as unknown as Window & {
      OnlineLeaderboardRuntime: Record<string, unknown>;
    };
    windowLike.localStorage.setItem("2048_auth_userId_v1", "7");
    windowLike.OnlineLeaderboardRuntime = {
      retryLocalHistoryRecord: vi.fn(async () => null),
      retryAllLocalHistoryRecords
    };

    bootstrapHistoryPageRuntime({
      windowLike,
      documentLike: dom.window.document,
      modeCatalog: { listModes: () => [], getMode: () => null },
      historyStore: {
        getAll: () => [],
        listRecords: () => ({ items: [], total: 0, page: 1, page_size: 30 })
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    (dom.window.document.getElementById("history-retry-all-btn") as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(retryAllLocalHistoryRecords).toHaveBeenCalledTimes(1);
    expect(dom.window.document.getElementById("history-status")?.textContent).toBe("检查完成，已刷新同步状态");
  });
});
