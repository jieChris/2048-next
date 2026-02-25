import { describe, expect, it } from "vitest";

import { resolveHistoryFinalBoardHtml } from "../../src/bootstrap/history-board";

describe("bootstrap history board", () => {
  it("returns empty string for invalid board input", () => {
    expect(resolveHistoryFinalBoardHtml(null, 4, 4)).toBe("");
    expect(resolveHistoryFinalBoardHtml([], 4, 4)).toBe("");
  });

  it("renders board grid with inferred size", () => {
    const html = resolveHistoryFinalBoardHtml(
      [
        [2, 4],
        [0, 8]
      ],
      null,
      null
    );
    expect(html).toContain("grid-template-columns: repeat(2, 48px)");
    expect(html).toContain("final-board-cell-v-2");
    expect(html).toContain("final-board-cell-empty");
  });

  it("marks super tile style when value is greater than 2048", () => {
    const html = resolveHistoryFinalBoardHtml([[4096]], 1, 1);
    expect(html).toContain("final-board-cell-super");
    expect(html).toContain(">4096<");
  });
});
