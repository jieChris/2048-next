import { describe, expect, it } from "vitest";

import { resolveHistoryRecordItemHtml } from "../../src/bootstrap/history-record-item";

describe("bootstrap history record item", () => {
  it("builds history record item html with actions and board", () => {
    const html = resolveHistoryRecordItemHtml({
      modeText: "标准 4x4",
      score: 1024,
      bestTile: 128,
      durationText: "00:32",
      endedText: "2026-02-25",
      adapterBadgeHtml: "<span class='history-adapter-badge'>match</span>",
      adapterDiagnosticsHtml: "<div class='history-adapter-diagnostics'>diag</div>",
      boardHtml: "<div class='final-board-grid'></div>"
    });

    expect(html).toContain("<strong>标准 4x4</strong>");
    expect(html).toContain("分数: 1024");
    expect(html).toContain("最大块: 128");
    expect(html).toContain("history-replay-btn");
    expect(html).toContain("history-export-btn");
    expect(html).toContain("history-delete-btn");
    expect(html).toContain("history-adapter-diagnostics");
    expect(html).toContain("final-board-grid");
  });

  it("normalizes missing fields to empty strings", () => {
    const html = resolveHistoryRecordItemHtml(null);
    expect(html).toContain("<strong></strong>");
    expect(html).toContain("分数: </span>");
    expect(html).toContain("最大块: </span>");
  });
});
