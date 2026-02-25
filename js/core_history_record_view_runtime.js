(function (global) {
  "use strict";

  if (!global) return;

  function normalizeString(value) {
    return typeof value === "string" ? value : "";
  }

  function normalizeFiniteNumber(value, fallback) {
    return Number.isFinite(value) ? Number(value) : fallback;
  }

  function resolveHistoryModeText(input) {
    var source = input && typeof input === "object" ? input : {};
    var catalogLabel = normalizeString(source.catalogLabel).trim();
    if (catalogLabel) return catalogLabel;

    var modeKey = normalizeString(source.modeKey).trim();
    if (modeKey) return modeKey;

    var modeFallback = normalizeString(source.modeFallback).trim();
    if (modeFallback) return modeFallback;

    return "未知";
  }

  function resolveHistoryDurationText(durationMs) {
    var value = Number(durationMs);
    if (!Number.isFinite(value) || value < 0) value = 0;

    var totalSec = Math.floor(value / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;

    if (h > 0) return h + "h " + m + "m " + s + "s";
    if (m > 0) return m + "m " + s + "s";
    return s + "s";
  }

  function resolveHistoryEndedText(endedAt) {
    if (!endedAt) return "-";
    return new Date(endedAt).toLocaleString();
  }

  function resolveHistoryRecordHeadState(input) {
    var source = input && typeof input === "object" ? input : {};
    return {
      modeText: resolveHistoryModeText({
        modeKey: source.modeKey,
        modeFallback: source.modeFallback,
        catalogLabel: source.catalogLabel
      }),
      score: normalizeFiniteNumber(source.score, 0),
      bestTile: normalizeFiniteNumber(source.bestTile, 0),
      durationText: resolveHistoryDurationText(source.durationMs),
      endedText: resolveHistoryEndedText(source.endedAt)
    };
  }

  global.CoreHistoryRecordViewRuntime = global.CoreHistoryRecordViewRuntime || {};
  global.CoreHistoryRecordViewRuntime.resolveHistoryModeText = resolveHistoryModeText;
  global.CoreHistoryRecordViewRuntime.resolveHistoryDurationText = resolveHistoryDurationText;
  global.CoreHistoryRecordViewRuntime.resolveHistoryEndedText = resolveHistoryEndedText;
  global.CoreHistoryRecordViewRuntime.resolveHistoryRecordHeadState = resolveHistoryRecordHeadState;
})(typeof window !== "undefined" ? window : undefined);
