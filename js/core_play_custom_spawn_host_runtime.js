(function (global) {
  "use strict";

  if (!global) return;

  var PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY = "custom_spawn_4x4_four_rate_v1";

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
          return windowLike.prompt("请输入 4 率（0-100，可输入小数）", String(defaultValueText));
        }
        return null;
      },
      alertInvalidInput: function () {
        if (windowLike && typeof windowLike.alert === "function") {
          windowLike.alert("输入无效，请输入 0 到 100 的数字。");
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
