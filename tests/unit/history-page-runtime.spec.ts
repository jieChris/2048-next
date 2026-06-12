import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import { bootstrapHistoryPageRuntime } from "../../src/pages/history-page-runtime";

function createHistoryDocument() {
  return new JSDOM(
    [
      "<!doctype html>",
      "<html><body>",
      '<select id="history-mode"><option value="">全部模式</option></select>',
      '<select id="history-owner"><option value="">全部归属</option></select>',
      '<input id="history-keyword" />',
      '<select id="history-sort"><option value="ended_desc">按时间</option></select>',
      '<button id="history-load-btn"></button>',
      '<button id="history-export-all-btn"></button>',
      '<button id="history-import-btn"></button>',
      '<button id="history-import-replace-btn"></button>',
      '<button id="history-clear-all-btn"></button>',
      '<button id="history-prev-page"></button>',
      '<button id="history-next-page"></button>',
      '<input id="history-import-file" type="file" />',
      '<div id="history-status"></div>',
      '<div id="history-summary"></div>',
      '<div id="history-list"></div>',
      "</body></html>"
    ].join("")
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
        listModes: () => [{ key: "practice", label: "练习板（直通）" }],
        getMode: () => ({ label: "练习板（直通）", board_width: 4, board_height: 4 })
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const options = Array.from(dom.window.document.querySelectorAll("#history-mode option")).map((option) => ({
      value: option.getAttribute("value"),
      text: option.textContent
    }));
    expect(options).toEqual([
      { value: "", text: "全部模式" },
      { value: "practice", text: "练习板（直通）" }
    ]);
  });
});
