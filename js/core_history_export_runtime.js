(function (global) {
  "use strict";

  if (!global) return;

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

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

  function toSafeModeKey(modeKey) {
    var raw = typeof modeKey === "string" && modeKey ? modeKey : "mode";
    return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  function resolveHistoryRecordExportFileName(input) {
    var source = isPlainObject(input) ? input : {};
    var safeMode = toSafeModeKey(source.modeKey);
    var idText = String(source.id == null ? "" : source.id);
    return "history_" + safeMode + "_" + idText + ".json";
  }

  function collectHistoryRecordIdsForExport(input) {
    var source = isPlainObject(input) ? input : {};
    var listRecords = source.listRecords;
    if (typeof listRecords !== "function") return [];

    var queryOptions = isPlainObject(source.queryOptions) ? source.queryOptions : {};
    var modeKey = normalizeString(queryOptions.mode_key, "");
    var keyword = normalizeString(queryOptions.keyword, "");
    var sortBy = normalizeString(queryOptions.sort_by, "ended_desc");
    var adapterParityFilter = normalizeString(queryOptions.adapter_parity_filter, "all");
    var maxPages = normalizePositiveInteger(source.maxPages, 100);
    var pageSize = normalizePositiveInteger(source.pageSize, 500);

    var ids = [];
    for (var page = 1; page <= maxPages; page += 1) {
      var result = listRecords({
        mode_key: modeKey,
        keyword: keyword,
        sort_by: sortBy,
        adapter_parity_filter: adapterParityFilter,
        page: page,
        page_size: pageSize
      });

      var resultRecord = isPlainObject(result) ? result : {};
      var rawItems = Array.isArray(resultRecord.items) ? resultRecord.items : [];
      if (!rawItems.length) break;

      for (var i = 0; i < rawItems.length; i += 1) {
        var item = rawItems[i];
        if (!isPlainObject(item)) continue;
        var id = item.id;
        if (id === null || id === undefined || id === "") continue;
        ids.push(String(id));
      }

      var total = normalizePositiveInteger(resultRecord.total, 0);
      if (total > 0 && ids.length >= total) break;
    }

    return ids;
  }

  function resolveHistoryExportListRecordsSource(localHistoryStore) {
    var store = isPlainObject(localHistoryStore) ? localHistoryStore : null;
    var listRecords = store && typeof store.listRecords === "function" ? store.listRecords : null;
    return listRecords ? listRecords.bind(store) : null;
  }

  function resolveHistoryMismatchExportRecordIds(input) {
    var source = isPlainObject(input) ? input : {};
    return collectHistoryRecordIdsForExport({
      listRecords: resolveHistoryExportListRecordsSource(source.localHistoryStore),
      queryOptions: source.queryOptions,
      maxPages: source.maxPages,
      pageSize: source.pageSize
    });
  }

  function resolveHistorySingleRecordExportState(input) {
    var source = isPlainObject(input) ? input : {};
    var store = isPlainObject(source.localHistoryStore) ? source.localHistoryStore : null;
    var item = isPlainObject(source.item) ? source.item : null;
    var id = item && item.id;
    if (!store || id === null || id === undefined || id === "") {
      return {
        canDownload: false,
        fileName: "",
        payload: ""
      };
    }

    var exportRecords = store.exportRecords;
    var payload = exportRecords.call(store, [id]);
    var fileName = resolveHistoryRecordExportFileName({
      modeKey: item.mode_key,
      id: id
    });
    return {
      canDownload: true,
      fileName: fileName,
      payload: payload
    };
  }

  global.CoreHistoryExportRuntime = global.CoreHistoryExportRuntime || {};
  global.CoreHistoryExportRuntime.resolveHistoryRecordExportFileName =
    resolveHistoryRecordExportFileName;
  global.CoreHistoryExportRuntime.collectHistoryRecordIdsForExport =
    collectHistoryRecordIdsForExport;
  global.CoreHistoryExportRuntime.resolveHistoryExportListRecordsSource =
    resolveHistoryExportListRecordsSource;
  global.CoreHistoryExportRuntime.resolveHistoryMismatchExportRecordIds =
    resolveHistoryMismatchExportRecordIds;
  global.CoreHistoryExportRuntime.resolveHistorySingleRecordExportState =
    resolveHistorySingleRecordExportState;
})(typeof window !== "undefined" ? window : undefined);
