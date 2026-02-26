export interface HistoryRecordItemHtmlInput {
  modeText?: unknown;
  score?: unknown;
  bestTile?: unknown;
  durationText?: unknown;
  endedText?: unknown;
  adapterBadgeHtml?: unknown;
  adapterDiagnosticsHtml?: unknown;
  boardHtml?: unknown;
}

function asString(value: unknown): string {
  return value == null ? "" : String(value);
}

export function resolveHistoryRecordItemHtml(input: unknown): string {
  const payload = input && typeof input === "object" ? (input as HistoryRecordItemHtmlInput) : {};
  const modeText = asString(payload.modeText);
  const score = asString(payload.score);
  const bestTile = asString(payload.bestTile);
  const durationText = asString(payload.durationText);
  const endedText = asString(payload.endedText);
  const adapterBadgeHtml = asString(payload.adapterBadgeHtml);
  const adapterDiagnosticsHtml = asString(payload.adapterDiagnosticsHtml);
  const boardHtml = asString(payload.boardHtml);

  return (
    "<div class='history-item-head'>" +
      "<strong>" + modeText + "</strong>" +
      adapterBadgeHtml +
      "<span>分数: " + score + "</span>" +
      "<span>最大块: " + bestTile + "</span>" +
      "<span>时长: " + durationText + "</span>" +
      "<span>结束: " + endedText + "</span>" +
    "</div>" +
    "<div class='history-item-actions'>" +
      "<button class='replay-button history-replay-btn'>回放</button>" +
      "<button class='replay-button history-export-btn'>导出</button>" +
      "<button class='replay-button history-delete-btn'>删除</button>" +
    "</div>" +
    adapterDiagnosticsHtml +
    boardHtml
  );
}
