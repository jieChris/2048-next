(function (global) {
  "use strict";

  if (!global) return;

  var PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY = "custom_spawn_4x4_four_rate_v1";

  function normalizePlayCustomSpawnLanguage(value) {
    var lang = String(value || "").trim().toLowerCase();
    if (lang.indexOf("en") === 0) return "en";
    if (lang.indexOf("zh") === 0) return "zh";
    return "";
  }

  function resolvePlayCustomSpawnLanguage(windowLike) {
    try {
      var i18n = windowLike && windowLike.UII18N;
      if (i18n && typeof i18n.getLanguage === "function") {
        var fromI18n = normalizePlayCustomSpawnLanguage(i18n.getLanguage());
        if (fromI18n) return fromI18n;
      }
    } catch (_errI18n) {}
    try {
      var storage = windowLike && windowLike.localStorage;
      if (storage && typeof storage.getItem === "function") {
        var fromStorage = normalizePlayCustomSpawnLanguage(storage.getItem("ui_language_v1"));
        if (fromStorage) return fromStorage;
      }
    } catch (_errStorage) {}
    try {
      var root = windowLike && windowLike.document
        ? windowLike.document.documentElement
        : global.document && global.document.documentElement;
      if (root && typeof root.getAttribute === "function") {
        var fromDocument = normalizePlayCustomSpawnLanguage(
          root.getAttribute("data-ui-lang") || root.getAttribute("lang")
        );
        if (fromDocument) return fromDocument;
      }
    } catch (_errDocument) {}
    return "zh";
  }

  function resolvePlayCustomSpawnCopy(windowLike) {
    return resolvePlayCustomSpawnLanguage(windowLike) === "en"
      ? {
          prompt: "Enter 4 spawn rate (0-100, decimals allowed)",
          invalid: "Invalid input. Enter a number from 0 to 100."
        }
      : {
          prompt: "请输入 4 率（0-100，可输入小数）",
          invalid: "输入无效，请输入 0 到 100 的数字。"
        };
  }

  function resolvePlayCustomSpawnModeConfigFromContext(options) {
    var opts = options || {};
    var storageRuntime = opts.storageRuntimeLike;
    var playCustomSpawnRuntime = opts.playCustomSpawnRuntimeLike;
    var windowLike = opts.windowLike || null;
    var storageKey = String(opts.storageKey || PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY);

    function resolveLocalStorage() {
      return storageRuntime.resolveStorageByName({
        windowLike: windowLike,
        storageName: "localStorage"
      });
    }

    var result = playCustomSpawnRuntime.resolvePlayCustomSpawnModeConfig({
      modeKey: String(opts.modeKey || ""),
      modeConfig: opts.modeConfig,
      searchLike: String(opts.searchLike || ""),
      pathname: String(opts.pathname || ""),
      hash: String(opts.hash || ""),
      readStoredRate: function () {
        return storageRuntime.safeReadStorageItem({
          storageLike: resolveLocalStorage(),
          key: storageKey
        });
      },
      writeStoredRate: function (rateText) {
        storageRuntime.safeSetStorageItem({
          storageLike: resolveLocalStorage(),
          key: storageKey,
          value: String(rateText)
        });
      },
      promptRate: function (defaultValueText) {
        if (windowLike && typeof windowLike.prompt === "function") {
          return windowLike.prompt(resolvePlayCustomSpawnCopy(windowLike).prompt, String(defaultValueText));
        }
        return null;
      },
      alertInvalidInput: function () {
        if (windowLike && typeof windowLike.alert === "function") {
          windowLike.alert(resolvePlayCustomSpawnCopy(windowLike).invalid);
        }
      },
      replaceUrl: function (nextUrl) {
        if (
          windowLike &&
          windowLike.history &&
          typeof windowLike.history.replaceState === "function"
        ) {
          try {
            windowLike.history.replaceState(null, "", nextUrl);
          } catch (_err) {}
        }
      }
    });

    return result && Object.prototype.hasOwnProperty.call(result, "modeConfig")
      ? result.modeConfig
      : null;
  }

  global.CorePlayCustomSpawnHostRuntime = global.CorePlayCustomSpawnHostRuntime || {};
  global.CorePlayCustomSpawnHostRuntime.PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY =
    PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY;
  global.CorePlayCustomSpawnHostRuntime.resolvePlayCustomSpawnModeConfigFromContext =
    resolvePlayCustomSpawnModeConfigFromContext;
})(typeof window !== "undefined" ? window : undefined);
