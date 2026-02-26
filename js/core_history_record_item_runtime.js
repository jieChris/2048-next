(function (global) {
  "use strict";

  if (!global) return;

  function asString(value) {
    return value == null ? "" : String(value);
  }

  function resolveHistoryRecordItemHtml(input) {
    var payload = input && typeof input === "object" ? input : {};
    var modeText = asString(payload.modeText);
    var score = asString(payload.score);
    var bestTile = asString(payload.bestTile);
    var durationText = asString(payload.durationText);
    var endedText = asString(payload.endedText);
    var adapterBadgeHtml = asString(payload.adapterBadgeHtml);
    var adapterDiagnosticsHtml = asString(payload.adapterDiagnosticsHtml);
    var boardHtml = asString(payload.boardHtml);

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

  global.CoreHistoryRecordItemRuntime = global.CoreHistoryRecordItemRuntime || {};
  global.CoreHistoryRecordItemRuntime.resolveHistoryRecordItemHtml = resolveHistoryRecordItemHtml;
})(typeof window !== "undefined" ? window : undefined);
