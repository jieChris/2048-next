import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";

import { createHistoryBoardPreviewNode } from "../../src/features/history/history-board-preview";

describe("history-board-preview", () => {
  it("returns null when board is empty", () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const node = createHistoryBoardPreviewNode([], { documentLike: dom.window.document });
    expect(node).toBeNull();
  });

  it("renders tiles for non-empty board", () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const board = [
      [2, 0],
      [0, 4]
    ];
    const node = createHistoryBoardPreviewNode(board, { documentLike: dom.window.document });
    expect(node).not.toBeNull();
    if (!node) return;
    expect(node.className).toContain("history-mini-board-wrap");
    const tiles = node.querySelectorAll(".tile");
    expect(tiles.length).toBe(2);
  });
});
