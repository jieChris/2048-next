(function (global) {
  "use strict";

  if (!global) return;

  var DOWNLOAD_BUTTON_ID = "replay-download-btn";
  var OPEN_PAGE_BUTTON_ID = "replay-open-page-btn";
  var REPLAY_PAGE_HANDOFF_STORAGE_PREFIX = "replay_export_payload_v1:";
  var REPLAY_PAGE_HANDOFF_QUERY_FLAG = "local_replay=1";
  var REPLAY_PAGE_HANDOFF_QUERY_KEY = "handoff";
  var REPLAY_LOGIC_VERSION = "v1";
  var REPLAY_TRANSIENT_NOTICE_ID = "replay-export-toast";
  var REPLAY_TRANSIENT_NOTICE_HIDE_DELAY_MS = 1600;
  var UI_LANGUAGE_KEY = "ui_language_v1";
  var REPLAY_EXPORT_COPY = {
    zh: {
      copySuccess: "回放代码已复制到剪贴板！",
      copyFailure: "自动复制失败，请手动从文本框复制。",
      exportFailure: "\u5bfc\u51fa\u56de\u653e\u5931\u8d25\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u540e\u91cd\u8bd5\u3002",
      downloadFailure: "导出文件失败，请稍后重试。",
      openPageFailure: "\u6253\u5f00\u56de\u653e\u9875\u9762\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002",
      downloadButton: "导出文件",
      openPageButton: "\u6253\u5f00\u56de\u653e\u9875",
      exportTitle: "导出回放",
      exportV1Title: "导出回放 (v1)",
      copyAction: "复制回放"
    },
    en: {
      copySuccess: "Replay code copied to clipboard.",
      copyFailure: "Automatic copy failed. Please copy from the text box manually.",
      exportFailure: "Replay export failed. Please refresh the page and try again.",
      downloadFailure: "Export failed. Please try again later.",
      openPageFailure: "Could not open the replay page. Please try again later.",
      downloadButton: "Download File",
      openPageButton: "Open Replay Page",
      exportTitle: "Export Replay",
      exportV1Title: "Export Replay (v1)",
      copyAction: "Copy Replay"
    }
  };


  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function toObjectLike(value) {
    if (isRecord(value)) return value;
    return typeof value === "function" ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function normalizeReplayExportLanguage(value) {
    var lang = String(value || "").trim().toLowerCase();
    if (lang.indexOf("en") === 0) return "en";
    if (lang.indexOf("zh") === 0) return "zh";
    return "";
  }

  function resolveReplayExportLanguage(input) {
    var windowLike = toRecord(resolveWindowLike(input));
    try {
      var i18n = toRecord(windowLike.UII18N);
      var getLanguage = asFunction(i18n.getLanguage);
      if (getLanguage) {
        var fromI18n = normalizeReplayExportLanguage(getLanguage.call(i18n));
        if (fromI18n) return fromI18n;
      }
    } catch (_errorI18n) {}
    try {
      var storageLike = toRecord(windowLike.localStorage);
      var getItem = asFunction(storageLike.getItem);
      if (getItem) {
        var fromStorage = normalizeReplayExportLanguage(getItem.call(storageLike, UI_LANGUAGE_KEY));
        if (fromStorage) return fromStorage;
      }
    } catch (_errorStorage) {}
    try {
      var documentLike = toRecord(input.documentLike || windowLike.document || (typeof document !== "undefined" ? document : null));
      var root = toRecord(documentLike.documentElement);
      var getAttribute = asFunction(root.getAttribute);
      if (getAttribute) {
        var fromDocument = normalizeReplayExportLanguage(
          getAttribute.call(root, "data-ui-lang") || getAttribute.call(root, "lang")
        );
        if (fromDocument) return fromDocument;
      }
    } catch (_errorDocument) {}
    return "zh";
  }

  function resolveReplayExportCopy(input) {
    return REPLAY_EXPORT_COPY[resolveReplayExportLanguage(input)];
  }

  function resolveFallbackReplayString(manager) {
    var rescueReplayString = manager.rescueReplayString;
    var replay = rescueReplayString == null ? "" : String(rescueReplayString).trim();
    return replay;
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

  function resolveTimeoutLike(input) {
    var windowLike = toRecord(resolveWindowLike(input));
    return asFunction(windowLike.setTimeout) ||
      (typeof setTimeout === "function" ? setTimeout : null);
  }

  function resolveClearTimeoutLike(input) {
    var windowLike = toRecord(resolveWindowLike(input));
    return asFunction(windowLike.clearTimeout) ||
      (typeof clearTimeout === "function" ? clearTimeout : null);
  }

  function applyReplayTransientNoticeStyle(style) {
    style.position = "fixed";
    style.left = "50%";
    style.top = "48px";
    style.transform = "translateX(-50%)";
    style.maxWidth = "min(calc(100vw - 32px), 360px)";
    style.padding = "10px 16px";
    style.borderRadius = "999px";
    style.background = "#ffffff";
    style.color = "#3c3024";
    style.fontSize = "14px";
    style.lineHeight = "1.4";
    style.boxShadow = "0 10px 24px rgba(0, 0, 0, 0.18)";
    style.zIndex = "4000";
    style.pointerEvents = "none";
    style.opacity = "0";
    style.transition = "opacity 180ms ease";
    style.textAlign = "center";
  }

  function resolveReplayTransientNotice(input) {
    var documentLike = toRecord(input.documentLike);
    var getElementById = asFunction(documentLike.getElementById);
    var createElement = asFunction(documentLike.createElement);
    var body = toRecord(documentLike.body);
    var appendChild = asFunction(body.appendChild);

    if (getElementById) {
      var existing = getElementById.call(documentLike, REPLAY_TRANSIENT_NOTICE_ID);
      if (existing) return toRecord(existing);
    }
    if (!createElement || !appendChild) return null;

    var toast = toRecord(createElement.call(documentLike, "div"));
    toast.id = REPLAY_TRANSIENT_NOTICE_ID;
    if (typeof toast.setAttribute === "function") {
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
    }
    applyReplayTransientNoticeStyle(toRecord(toast.style));
    appendChild.call(body, toast);
    return toast;
  }

  function showReplayTransientNotice(input, message) {
    var toast = resolveReplayTransientNotice(input);
    var setTimeoutLike = resolveTimeoutLike(input);
    var clearTimeoutLike = resolveClearTimeoutLike(input);
    if (!toast || !setTimeoutLike) return false;

    toast.textContent = message;
    toRecord(toast.style).opacity = "1";

    var previousTimer = toast.__hideTimer;
    if (previousTimer && clearTimeoutLike) {
      clearTimeoutLike(previousTimer);
    }

    toast.__hideTimer = setTimeoutLike(function () {
      toRecord(toast.style).opacity = "0";
    }, REPLAY_TRANSIENT_NOTICE_HIDE_DELAY_MS);

    return true;
  }

  function notifyReplayCopySuccess(input) {
    var copy = resolveReplayExportCopy(input);
    if (showReplayTransientNotice(input, copy.copySuccess)) return;
    resolveAlert(input)(copy.copySuccess);
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

  function resolveStorageLike(input) {
    var source = toRecord(input);
    var storageName = source.storageName == null ? "" : String(source.storageName);
    if (!storageName) return null;

    var windowLike = toRecord(resolveWindowLike(source));
    try {
      var storage = windowLike[storageName];
      var storageRecord = toObjectLike(storage);
      var setItem = asFunction(storageRecord.setItem);
      var removeItem = asFunction(storageRecord.removeItem);
      if (!setItem || !removeItem) return null;
      return storageRecord;
    } catch (_error) {
      return null;
    }
  }

  function safeWriteStorageItem(input) {
    var source = toRecord(input);
    var storageLike = toRecord(source.storageLike);
    var key = source.key == null ? "" : String(source.key);
    var value = source.value == null ? "" : String(source.value);
    var setItem = asFunction(storageLike.setItem);
    if (!setItem || !key) return false;
    try {
      setItem.call(storageLike, key, value);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function safeRemoveStorageItem(input) {
    var source = toRecord(input);
    var storageLike = toRecord(source.storageLike);
    var key = source.key == null ? "" : String(source.key);
    var removeItem = asFunction(storageLike.removeItem);
    if (!removeItem || !key) return;
    try {
      removeItem.call(storageLike, key);
    } catch (_error) {}
  }

  function createReplayPageHandoffId() {
    if (
      global.CoreCryptoRandomRuntime &&
      typeof global.CoreCryptoRandomRuntime.randomBase36 === "function"
    ) {
      return String(Date.now()) + "-" + global.CoreCryptoRandomRuntime.randomBase36(8);
    }
    return String(Date.now()) + "-00000000";
  }

  function resolveUrlRuntime(windowLike) {
    var windowRecord = toRecord(windowLike);
    var urlRecord = toObjectLike(windowRecord.URL);
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
      notifyReplayCopySuccess(input);
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
      resolveAlert(input)(resolveReplayExportCopy(input).copyFailure);
      return {
        copied: false,
        method: "fallback-error"
      };
    }
  }

  function applyReplayClipboardCopy(input) {
    var source = toRecord(input);
    var text = source.text == null ? "" : String(source.text);
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
          notifyReplayCopySuccess(source);
        });
        var chainedRecord = toRecord(chained);
        var catchFn = asFunction(chainedRecord.catch);
        if (catchFn) {
          catchFn.call(chained, function (_reason) {
            applyFallbackCopy(source, text);
          });
        }
      } else {
        notifyReplayCopySuccess(source);
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

  function resolveReplayDownloadFilename(input) {
    var source = toRecord(input);
    var replay = source.replay == null ? "" : String(source.replay);
    if (replay.indexOf("REPLAY_v1RPL_B64_") === 0) return "replay-v1.txt";
    return "replay.txt";
  }

  function resolveReplayModalButton(input) {
    var source = toRecord(input);
    var buttonId = source.buttonId == null ? "" : String(source.buttonId);
    if (!buttonId) return null;
    var documentLike = toRecord(source.documentLike);
    var getElementById = asFunction(documentLike.getElementById);
    if (!getElementById) return null;
    return getElementById.call(documentLike, buttonId);
  }

  function configureReplayDownloadButton(input) {
    var source = toRecord(input);
    var button = resolveReplayModalButton({
      documentLike: source.documentLike,
      buttonId: DOWNLOAD_BUTTON_ID
    });
    if (!button) return { configured: false };

    var alertLike = resolveAlert(source);
    var copy = resolveReplayExportCopy(source);
    button.style.display = "inline-block";
    button.textContent = copy.downloadButton;
    button.onclick = function () {
      var replay = source.replay == null ? "" : String(source.replay);
      if (!replay) return { downloaded: false };
      var result = triggerReplayFileDownload({
        blob: new Blob([replay], { type: "text/plain;charset=utf-8" }),
        filename: resolveReplayDownloadFilename({ replay: replay }),
        documentLike: source.documentLike,
        windowLike: source.windowLike
      });
      if (!result.downloaded) {
        alertLike(copy.downloadFailure);
      }
      return result;
    };

    return { configured: true };
  }

  function openReplayPageFromExport(input) {
    var source = toRecord(input);
    var replay = source.replay == null ? "" : String(source.replay).trim();
    var windowLike = toRecord(resolveWindowLike(source));
    var localStorageLike = resolveStorageLike({
      windowLike: windowLike,
      storageName: "localStorage"
    });
    var openFn = asFunction(windowLike.open);

    if (!replay || !localStorageLike || !openFn) {
      return { opened: false };
    }

    var handoffId = createReplayPageHandoffId();
    var storageKey = REPLAY_PAGE_HANDOFF_STORAGE_PREFIX + handoffId;
    var payload = JSON.stringify({
      replay_string: replay,
      replay_logic_version: REPLAY_LOGIC_VERSION,
      source: "export_modal"
    });
    if (!safeWriteStorageItem({
      storageLike: localStorageLike,
      key: storageKey,
      value: payload
    })) {
      return { opened: false };
    }

    var url =
      "replay.html?" +
      REPLAY_PAGE_HANDOFF_QUERY_FLAG +
      "&" +
      REPLAY_PAGE_HANDOFF_QUERY_KEY +
      "=" +
      encodeURIComponent(handoffId);

  try {
    openFn.call(windowLike, url, "_blank", "noopener");
    return {
      opened: true,
      url: url
      };
    } catch (_error) {
      safeRemoveStorageItem({
        storageLike: localStorageLike,
        key: storageKey
      });
      return { opened: false };
    }
  }

  function configureReplayOpenPageButton(input) {
    var source = toRecord(input);
    var button = resolveReplayModalButton({
      documentLike: source.documentLike,
      buttonId: OPEN_PAGE_BUTTON_ID
    });
    if (!button) return { configured: false };

    var alertLike = resolveAlert(source);
    var copy = resolveReplayExportCopy(source);
    button.textContent = copy.openPageButton;
    button.style.display = "inline-block";
    button.onclick = function () {
      var result = openReplayPageFromExport({
        replay: source.replay,
        windowLike: source.windowLike
      });
      if (!result.opened) {
        alertLike(copy.openPageFailure);
      }
      return result;
    };

    return { configured: true };
  }

  function applyReplayExport(input) {
    var source = toRecord(input);
    var manager = toRecord(source.gameManager);
    var serialize = asFunction(manager.serialize);
    if (!serialize) {
      return {
        exported: false
      };
    }

    var replay = "";
    try {
      replay = String(serialize.call(manager));
    } catch (error) {
      replay = resolveFallbackReplayString(manager);
      if (!replay) {
        var failureCopy = resolveReplayExportCopy(source);
        resolveConsoleError(source)("Replay export failed", error);
        resolveAlert(source)(failureCopy.exportFailure);
        return {
          exported: false,
          error: true
        };
      }
    }
    var isV1 = replay.indexOf("REPLAY_v1RPL_B64_") === 0;
    var showReplayModal = asFunction(source.showReplayModal);
    if (showReplayModal) {
      var copy = resolveReplayExportCopy(source);
      showReplayModal(isV1 ? copy.exportV1Title : copy.exportTitle, replay, copy.copyAction, function (text) {
        return applyReplayClipboardCopy({
          text: text,
          navigatorLike: source.navigatorLike,
          documentLike: source.documentLike,
          windowLike: source.windowLike,
          alertLike: source.alertLike,
          consoleLike: source.consoleLike
        });
      });
      configureReplayDownloadButton({
        replay: replay,
        documentLike: source.documentLike,
        windowLike: resolveWindowLike(source),
        alertLike: source.alertLike
      });
      configureReplayOpenPageButton({
        replay: replay,
        documentLike: source.documentLike,
        windowLike: resolveWindowLike(source),
        alertLike: source.alertLike
      });
    }

    return {
      exported: true,
      format: isV1 ? "v1-rpl-base64" : "text",
      replay: replay
    };
  }

  global.CoreReplayExportRuntime = global.CoreReplayExportRuntime || {};
  global.CoreReplayExportRuntime.applyReplayClipboardCopy = applyReplayClipboardCopy;
  global.CoreReplayExportRuntime.applyReplayExport = applyReplayExport;
})(typeof window !== "undefined" ? window : undefined);
