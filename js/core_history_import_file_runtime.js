(function (global) {
  "use strict";

  if (!global) return;

  function isObject(value) {
    return !!value && typeof value === "object";
  }

  function resolveHistoryImportSelectedFile(files) {
    if (Array.isArray(files)) {
      return files.length > 0 ? files[0] || null : null;
    }

    if (!isObject(files)) return null;

    if (typeof files.item === "function") {
      var first = files.item(0);
      return first || null;
    }

    var length = Number(files.length);
    if (!Number.isFinite(length) || length <= 0) return null;
    return files[0] || null;
  }

  function resolveHistoryImportPayloadText(readerResult) {
    return String(readerResult || "");
  }

  function resolveHistoryImportReadEncoding() {
    return "utf-8";
  }

  function resolveHistoryImportInputResetValue() {
    return "";
  }

  global.CoreHistoryImportFileRuntime = global.CoreHistoryImportFileRuntime || {};
  global.CoreHistoryImportFileRuntime.resolveHistoryImportSelectedFile = resolveHistoryImportSelectedFile;
  global.CoreHistoryImportFileRuntime.resolveHistoryImportPayloadText = resolveHistoryImportPayloadText;
  global.CoreHistoryImportFileRuntime.resolveHistoryImportReadEncoding = resolveHistoryImportReadEncoding;
  global.CoreHistoryImportFileRuntime.resolveHistoryImportInputResetValue = resolveHistoryImportInputResetValue;
})(typeof window !== "undefined" ? window : undefined);
