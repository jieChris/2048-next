(function (global) {
  "use strict";

  if (!global) return;

  var FILTER_LABELS = {
    all: "全部",
    mismatch: "仅不一致",
    match: "仅一致",
    incomplete: "样本不足"
  };

  function normalizePositiveInteger(value, fallback) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
  }

  function normalizeNonNegativeInteger(value) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.floor(parsed);
  }

  function normalizeFilter(value) {
    if (value === "mismatch") return "mismatch";
    if (value === "match") return "match";
    if (value === "incomplete") return "incomplete";
    return "all";
  }

  function resolveHistorySummaryText(input) {
    var source = input && typeof input === "object" ? input : {};
    var total = normalizeNonNegativeInteger(source.total);
    var page = normalizePositiveInteger(source.page, 1);
    var pageSize = normalizePositiveInteger(source.pageSize, 30);
    var filter = normalizeFilter(source.adapterParityFilter);

    return (
      "共 " +
      total +
      " 条记录" +
      " · 当前第 " +
      page +
      " 页" +
      " · 每页 " +
      pageSize +
      " 条" +
      " · 诊断筛选: " +
      FILTER_LABELS[filter]
    );
  }

  global.CoreHistorySummaryRuntime = global.CoreHistorySummaryRuntime || {};
  global.CoreHistorySummaryRuntime.resolveHistorySummaryText = resolveHistorySummaryText;
})(typeof window !== "undefined" ? window : undefined);
