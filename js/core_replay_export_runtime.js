(function (global) {
  "use strict";

  if (!global) return;

  var COPY_SUCCESS_MESSAGE = "回放代码已复制到剪贴板！";
  var COPY_FAILURE_MESSAGE = "自动复制失败，请手动从文本框复制。";
  var VERSE_DOWNLOAD_SUCCESS_MESSAGE = "v9 文本回放文件已导出。";

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function resolveAlert(input) {
    var directAlert = asFunction(input.alertLike);
    if (directAlert) {
      return function (message) {
        directAlert(message);
      };
    }
    return function (_message) {};
  }

  function resolveConsoleError(input) {
    var consoleLike = toRecord(input.consoleLike);
    var errorFn = asFunction(consoleLike.error);
    if (errorFn) {
      return function (message, reason) {
        errorFn.call(consoleLike, message, reason);
      };
    }
    return function (_message, _reason) {};
  }

  function resolveWindowLike(input) {
    if (isRecord(input.windowLike)) return input.windowLike;
    return global;
  }

  function resolveUrlRuntime(windowLike) {
    var windowRecord = toRecord(windowLike);
    var urlRecord = toRecord(windowRecord.URL);
    var createObjectURL = asFunction(urlRecord.createObjectURL);
    var revokeObjectURL = asFunction(urlRecord.revokeObjectURL);
    if (!createObjectURL || !revokeObjectURL) return null;
    return {
      createObjectURL: createObjectURL,
      revokeObjectURL: revokeObjectURL,
      scope: urlRecord
    };
  }

  function triggerReplayFileDownload(input) {
    var source = toRecord(input);
    var blob = source.blob;
    var filename = source.filename == null ? "replay.txt" : String(source.filename);
    var documentLike = toRecord(source.documentLike);
    var createElement = asFunction(documentLike.createElement);
    var body = toRecord(documentLike.body);
    var appendChild = asFunction(body.appendChild);
    var removeChild = asFunction(body.removeChild);
    var urlRuntime = resolveUrlRuntime(source.windowLike);
    if (!blob || !createElement || !appendChild || !removeChild || !urlRuntime) {
      return { downloaded: false };
    }
    var anchor = null;
    var href = null;
    try {
      href = urlRuntime.createObjectURL.call(urlRuntime.scope, blob);
      anchor = createElement.call(documentLike, "a");
      anchor.href = href;
      anchor.download = filename;
      anchor.style.display = "none";
      appendChild.call(body, anchor);
      var click = asFunction(anchor.click);
      if (!click) throw new Error("anchor click unavailable");
      click.call(anchor);
      removeChild.call(body, anchor);
      urlRuntime.revokeObjectURL.call(urlRuntime.scope, href);
      return {
        downloaded: true,
        filename: filename
      };
    } catch (_error) {
      if (anchor && removeChild) {
        try { removeChild.call(body, anchor); } catch (_errRemove) {}
      }
      if (href) {
        try { urlRuntime.revokeObjectURL.call(urlRuntime.scope, href); } catch (_errRevoke) {}
      }
      return { downloaded: false };
    }
  }

  function applyFallbackCopy(input, text) {
    var alertLike = resolveAlert(input);
    var logError = resolveConsoleError(input);
    var documentLike = toRecord(input.documentLike);
    var createElement = asFunction(documentLike.createElement);
    var execCommand = asFunction(documentLike.execCommand);
    var body = toRecord(documentLike.body);
    var appendChild = asFunction(body.appendChild);
    var removeChild = asFunction(body.removeChild);
    var textArea = null;

    try {
      if (!createElement || !appendChild || !removeChild || !execCommand) {
        throw new Error("fallback copy unavailable");
      }

      textArea = toRecord(createElement.call(documentLike, "textarea"));
      textArea.value = text;
      var style = toRecord(textArea.style);
      style.position = "fixed";

      appendChild.call(body, textArea);
      var focus = asFunction(textArea.focus);
      var select = asFunction(textArea.select);
      if (focus) focus.call(textArea);
      if (select) select.call(textArea);

      execCommand.call(documentLike, "copy");
      removeChild.call(body, textArea);
      alertLike(COPY_SUCCESS_MESSAGE);
      return {
        copied: true,
        method: "fallback"
      };
    } catch (error) {
      if (textArea && removeChild) {
        try {
          removeChild.call(body, textArea);
        } catch (_err) {}
      }
      logError("Fallback copy failed", error);
      alertLike(COPY_FAILURE_MESSAGE);
      return {
        copied: false,
        method: "fallback-error"
      };
    }
  }

  function applyReplayClipboardCopy(input) {
    var source = toRecord(input);
    var text = source.text == null ? "" : String(source.text);
    var alertLike = resolveAlert(source);
    var navigatorLike = toRecord(source.navigatorLike);
    var clipboard = toRecord(navigatorLike.clipboard);
    var writeText = asFunction(clipboard.writeText);

    if (!writeText) {
      var fallback = applyFallbackCopy(source, text);
      return {
        attempted: true,
        method: fallback.method
      };
    }

    try {
      var writeResult = writeText.call(clipboard, text);
      var writeResultRecord = toRecord(writeResult);
      var thenFn = asFunction(writeResultRecord.then);
      if (thenFn) {
        var chained = thenFn.call(writeResult, function () {
          alertLike(COPY_SUCCESS_MESSAGE);
        });
        var chainedRecord = toRecord(chained);
        var catchFn = asFunction(chainedRecord.catch);
        if (catchFn) {
          catchFn.call(chained, function (_reason) {
            applyFallbackCopy(source, text);
          });
        }
      } else {
        alertLike(COPY_SUCCESS_MESSAGE);
      }
      return {
        attempted: true,
        method: "clipboard"
      };
    } catch (_error) {
      var errorFallback = applyFallbackCopy(source, text);
      return {
        attempted: true,
        method: errorFallback.method
      };
    }
  }

  function applyReplayExport(input) {
    var source = toRecord(input);
    var manager = toRecord(source.gameManager);
    var alertLike = resolveAlert(source);
    var logError = resolveConsoleError(source);
    var exportV9VerseBlob = asFunction(manager.exportV9VerseBlob);
    if (exportV9VerseBlob) {
      try {
        var verseExportPayload = toRecord(exportV9VerseBlob.call(manager));
        var verseFileDownloadResult = triggerReplayFileDownload({
          windowLike: resolveWindowLike(source),
          documentLike: source.documentLike,
          blob: verseExportPayload.blob,
          filename: verseExportPayload.filename
        });
        if (verseFileDownloadResult.downloaded) {
          alertLike(VERSE_DOWNLOAD_SUCCESS_MESSAGE);
          return {
            exported: true,
            format: "v9-verse",
            filename: verseFileDownloadResult.filename
          };
        }
      } catch (verseExportError) {
        logError("v9 verse export failed", verseExportError);
      }
    }

    var serializeV9Verse = asFunction(manager.serializeV9Verse);
    if (serializeV9Verse) {
      try {
        var verseReplay = String(serializeV9Verse.call(manager));
        var showReplayModalVerse = asFunction(source.showReplayModal);
        if (showReplayModalVerse) {
          showReplayModalVerse("导出 v9 回放", verseReplay, "再次复制", function (text) {
            return applyReplayClipboardCopy({
              text: text,
              navigatorLike: source.navigatorLike,
              documentLike: source.documentLike,
              alertLike: source.alertLike,
              consoleLike: source.consoleLike
            });
          });
        }
        applyReplayClipboardCopy({
          text: verseReplay,
          navigatorLike: source.navigatorLike,
          documentLike: source.documentLike,
          alertLike: source.alertLike,
          consoleLike: source.consoleLike
        });
        return {
          exported: true,
          format: "v9-verse",
          replay: verseReplay
        };
      } catch (v9VerseExportError) {
        logError("v9 verse text export failed", v9VerseExportError);
      }
    }

    var serializeV9RplBase64 = asFunction(manager.serializeV9RplBase64);
    if (serializeV9RplBase64) {
      try {
        var v9ReplayBase64 = String(serializeV9RplBase64.call(manager));
        var showReplayModalV9 = asFunction(source.showReplayModal);
        if (showReplayModalV9) {
          showReplayModalV9("导出 v9 回放（Base64）", v9ReplayBase64, "再次复制", function (text) {
            return applyReplayClipboardCopy({
              text: text,
              navigatorLike: source.navigatorLike,
              documentLike: source.documentLike,
              alertLike: source.alertLike,
              consoleLike: source.consoleLike
            });
          });
        }
        applyReplayClipboardCopy({
          text: v9ReplayBase64,
          navigatorLike: source.navigatorLike,
          documentLike: source.documentLike,
          alertLike: source.alertLike,
          consoleLike: source.consoleLike
        });
        return {
          exported: true,
          format: "v9-base64",
          replay: v9ReplayBase64
        };
      } catch (v9ReplayBase64Error) {
        logError("v9 base64 replay export failed", v9ReplayBase64Error);
      }
    }

    var serialize = asFunction(manager.serialize);
    if (!serialize) {
      return {
        exported: false
      };
    }

    var replay = String(serialize.call(manager));
    var showReplayModal = asFunction(source.showReplayModal);
    if (showReplayModal) {
      showReplayModal("导出回放", replay, "再次复制", function (text) {
        return applyReplayClipboardCopy({
          text: text,
          navigatorLike: source.navigatorLike,
          documentLike: source.documentLike,
          alertLike: source.alertLike,
          consoleLike: source.consoleLike
        });
      });
    }

    applyReplayClipboardCopy({
      text: replay,
      navigatorLike: source.navigatorLike,
      documentLike: source.documentLike,
      alertLike: source.alertLike,
      consoleLike: source.consoleLike
    });

    return {
      exported: true,
      format: "text",
      replay: replay
    };
  }

  global.CoreReplayExportRuntime = global.CoreReplayExportRuntime || {};
  global.CoreReplayExportRuntime.applyReplayClipboardCopy = applyReplayClipboardCopy;
  global.CoreReplayExportRuntime.applyReplayExport = applyReplayExport;
})(typeof window !== "undefined" ? window : undefined);
