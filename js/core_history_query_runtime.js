(function (global) {
  "use strict";

  if (!global) return;

  function normalizeString(value, fallback) {
    if (typeof value !== "string") return fallback;
    var trimmed = value.trim();
    return trimmed || fallback;
  }

  function normalizePositiveInteger(value, fallback) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
  }

  function resolveHistoryFilterState(input) {
    var source = input && typeof input === "object" ? input : {};
    return {
      modeKey: normalizeString(source.modeKeyRaw, ""),
      keyword: normalizeString(source.keywordRaw, ""),
      sortBy: normalizeString(source.sortByRaw, "ended_desc"),
      adapterParityFilter: normalizeString(source.adapterParityFilterRaw, "all"),
      burnInWindow: normalizeString(source.burnInWindowRaw, "200"),
      sustainedWindows: normalizeString(source.sustainedWindowsRaw, "3")
    };
  }

  function asMutableHistoryFilterTarget(value) {
    if (!value || typeof value !== "object") return null;
    return value;
  }

  function applyHistoryFilterState(targetState, input) {
    var target = asMutableHistoryFilterTarget(targetState);
    if (!target) return false;
    var next = resolveHistoryFilterState(input);
    target.modeKey = next.modeKey;
    target.keyword = next.keyword;
    target.sortBy = next.sortBy;
    target.adapterParityFilter = next.adapterParityFilter;
    target.burnInWindow = next.burnInWindow;
    target.sustainedWindows = next.sustainedWindows;
    return true;
  }

  function resolveHistoryListQuery(input) {
    var source = input && typeof input === "object" ? input : {};
    return {
      mode_key: normalizeString(source.modeKey, ""),
      keyword: normalizeString(source.keyword, ""),
      sort_by: normalizeString(source.sortBy, "ended_desc"),
      adapter_parity_filter: normalizeString(source.adapterParityFilter, "all"),
      page: normalizePositiveInteger(source.page, 1),
      page_size: normalizePositiveInteger(source.pageSize, 30)
    };
  }

  function resolveHistoryBurnInQuery(input) {
    var source = input && typeof input === "object" ? input : {};
    return {
      mode_key: normalizeString(source.modeKey, ""),
      keyword: normalizeString(source.keyword, ""),
      sort_by: normalizeString(source.sortBy, "ended_desc"),
      sample_limit: normalizeString(source.sampleLimit, "200"),
      sustained_windows: normalizeString(source.sustainedWindows, "3"),
      min_comparable: normalizePositiveInteger(source.minComparable, 50),
      max_mismatch_rate: normalizePositiveInteger(source.maxMismatchRate, 1)
    };
  }

  function resolveHistoryPagerState(input) {
    var source = input && typeof input === "object" ? input : {};
    var page = normalizePositiveInteger(source.page, 1);
    var pageSize = normalizePositiveInteger(source.pageSize, 30);
    var totalRaw = Number(source.total);
    var total = Number.isFinite(totalRaw) && totalRaw > 0 ? Math.floor(totalRaw) : 0;
    var maxPage = Math.max(1, Math.ceil(total / pageSize));
    return {
      maxPage: maxPage,
      disablePrev: page <= 1,
      disableNext: page >= maxPage
    };
  }

  global.CoreHistoryQueryRuntime = global.CoreHistoryQueryRuntime || {};
  global.CoreHistoryQueryRuntime.resolveHistoryFilterState = resolveHistoryFilterState;
  global.CoreHistoryQueryRuntime.applyHistoryFilterState = applyHistoryFilterState;
  global.CoreHistoryQueryRuntime.resolveHistoryListQuery = resolveHistoryListQuery;
  global.CoreHistoryQueryRuntime.resolveHistoryBurnInQuery = resolveHistoryBurnInQuery;
  global.CoreHistoryQueryRuntime.resolveHistoryPagerState = resolveHistoryPagerState;
})(typeof window !== "undefined" ? window : undefined);
