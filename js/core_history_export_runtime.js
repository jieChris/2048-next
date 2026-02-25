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

  function resolveHistoryExportDownloadSource(localHistoryStore) {
    var store = isPlainObject(localHistoryStore) ? localHistoryStore : null;
    if (!store || typeof store.download !== "function") return null;
    return store.download.bind(store);
  }

  function resolveHistoryExportRecordsSource(localHistoryStore) {
    var store = isPlainObject(localHistoryStore) ? localHistoryStore : null;
    if (!store || typeof store.exportRecords !== "function") return null;
    return store.exportRecords.bind(store);
  }

  function resolveHistoryExportDateTag(input) {
    var source = isPlainObject(input) ? input : {};
    var resolveDateTag = source.resolveDateTag;
    if (typeof resolveDateTag === "function") {
      var resolved = resolveDateTag(source.dateValue);
      if (typeof resolved === "string" && resolved) return resolved;
    }
    return new Date().toISOString().slice(0, 10);
  }

  function resolveHistoryExportFileName(input) {
    var source = isPlainObject(input) ? input : {};
    var resolveFileName = source.resolveFileName;
    if (typeof resolveFileName === "function") {
      var resolved = resolveFileName(source.dateTag);
      if (typeof resolved === "string" && resolved) return resolved;
    }
    return source.fallbackPrefix + source.dateTag + ".json";
  }

  function downloadHistorySingleRecord(input) {
    try {
      var source = isPlainObject(input) ? input : {};
      var exportState = resolveHistorySingleRecordExportState({
        localHistoryStore: source.localHistoryStore,
        item: source.item
      });
      if (!exportState || exportState.canDownload !== true) return false;
      var download = resolveHistoryExportDownloadSource(source.localHistoryStore);
      if (!download) return false;
      download(exportState.fileName, exportState.payload);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function downloadHistoryAllRecords(input) {
    try {
      var source = isPlainObject(input) ? input : {};
      var exportRecords = resolveHistoryExportRecordsSource(source.localHistoryStore);
      var download = resolveHistoryExportDownloadSource(source.localHistoryStore);
      if (!exportRecords || !download) return false;

      var dateTag = resolveHistoryExportDateTag({
        dateValue: source.dateValue,
        resolveDateTag: source.resolveDateTag
      });
      var fileName = resolveHistoryExportFileName({
        dateTag: dateTag,
        resolveFileName: source.resolveFileName,
        fallbackPrefix: "2048_local_history_"
      });
      var payload = exportRecords();
      download(fileName, payload);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function downloadHistoryMismatchRecords(input) {
    try {
      var source = isPlainObject(input) ? input : {};
      var exportRecords = resolveHistoryExportRecordsSource(source.localHistoryStore);
      var download = resolveHistoryExportDownloadSource(source.localHistoryStore);
      if (!exportRecords || !download) {
        return {
          downloaded: false,
          count: 0,
          empty: false
        };
      }

      var ids = resolveHistoryMismatchExportRecordIds({
        localHistoryStore: source.localHistoryStore,
        queryOptions: source.queryOptions,
        maxPages: source.maxPages,
        pageSize: source.pageSize
      });
      if (!ids.length) {
        return {
          downloaded: false,
          count: 0,
          empty: true
        };
      }

      var dateTag = resolveHistoryExportDateTag({
        dateValue: source.dateValue,
        resolveDateTag: source.resolveDateTag
      });
      var fileName = resolveHistoryExportFileName({
        dateTag: dateTag,
        resolveFileName: source.resolveFileName,
        fallbackPrefix: "2048_local_history_mismatch_"
      });
      var payload = exportRecords(ids);
      download(fileName, payload);
      return {
        downloaded: true,
        count: ids.length,
        empty: false
      };
    } catch (_error) {
      return {
        downloaded: false,
        count: 0,
        empty: false
      };
    }
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
  global.CoreHistoryExportRuntime.downloadHistorySingleRecord = downloadHistorySingleRecord;
  global.CoreHistoryExportRuntime.downloadHistoryAllRecords = downloadHistoryAllRecords;
  global.CoreHistoryExportRuntime.downloadHistoryMismatchRecords = downloadHistoryMismatchRecords;
})(typeof window !== "undefined" ? window : undefined);
