(function (global) {
  "use strict";

  if (!global) return;

  function toAnnouncementRecords(value) {
    if (!Array.isArray(value)) return [];
    return value;
  }

  function compareAnnouncementRecords(a, b) {
    var ad = String((a && a.date) || "");
    var bd = String((b && b.date) || "");
    if (ad === bd) {
      var aid = String((a && a.id) || "");
      var bid = String((b && b.id) || "");
      if (aid < bid) return 1;
      if (aid > bid) return -1;
      return 0;
    }
    return ad < bd ? 1 : -1;
  }

  function resolveAnnouncementRecords(options) {
    var opts = options || {};
    var records = toAnnouncementRecords(opts.records);
    return records.slice().sort(compareAnnouncementRecords);
  }

  function resolveLatestAnnouncementId(options) {
    var records = resolveAnnouncementRecords({
      records: options && options.records
    });
    if (!records.length) return "";
    return records[0] && records[0].id ? String(records[0].id) : "";
  }

  function resolveLocalStorage(windowLike) {
    if (!windowLike) return null;
    return windowLike.localStorage || null;
  }

  function readAnnouncementSeenFromContext(options) {
    var opts = options || {};
    var key = typeof opts.key === "string" ? opts.key : "";
    if (!key) return null;
    var storage = resolveLocalStorage(opts.windowLike);
    if (!storage || typeof storage.getItem !== "function") return null;
    try {
      var value = storage.getItem(key);
      return typeof value === "string" ? value : null;
    } catch (_err) {
      return null;
    }
  }

  function hasUnreadAnnouncementFromContext(options) {
    var opts = options || {};
    var latestId = resolveLatestAnnouncementId({
      records: opts.records
    });
    if (!latestId) return false;
    var stored = readAnnouncementSeenFromContext({
      windowLike: opts.windowLike,
      key: opts.key
    });
    return stored !== latestId;
  }

  function markAnnouncementSeenFromContext(options) {
    var opts = options || {};
    var key = typeof opts.key === "string" ? opts.key : "";
    if (!key) return false;
    var latestId =
      typeof opts.latestId === "string"
        ? opts.latestId
        : resolveLatestAnnouncementId({
            records: opts.records
          });
    if (!latestId) return false;
    var storage = resolveLocalStorage(opts.windowLike);
    if (!storage || typeof storage.setItem !== "function") return false;
    try {
      storage.setItem(key, latestId);
      return true;
    } catch (_err) {
      return false;
    }
  }

  global.CoreAnnouncementRuntime = global.CoreAnnouncementRuntime || {};
  global.CoreAnnouncementRuntime.resolveAnnouncementRecords = resolveAnnouncementRecords;
  global.CoreAnnouncementRuntime.resolveLatestAnnouncementId = resolveLatestAnnouncementId;
  global.CoreAnnouncementRuntime.readAnnouncementSeenFromContext = readAnnouncementSeenFromContext;
  global.CoreAnnouncementRuntime.hasUnreadAnnouncementFromContext = hasUnreadAnnouncementFromContext;
  global.CoreAnnouncementRuntime.markAnnouncementSeenFromContext = markAnnouncementSeenFromContext;
})(typeof window !== "undefined" ? window : undefined);
