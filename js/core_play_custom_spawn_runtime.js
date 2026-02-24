(function (global) {
  "use strict";

  if (!global) return;

  var customSpawnRuntime = global.CoreCustomSpawnRuntime;
  if (
    !customSpawnRuntime ||
    typeof customSpawnRuntime.isCustomSpawnModeKey !== "function" ||
    typeof customSpawnRuntime.sanitizeCustomFourRate !== "function" ||
    typeof customSpawnRuntime.formatRatePercent !== "function" ||
    typeof customSpawnRuntime.inferFourRateFromSpawnTable !== "function" ||
    typeof customSpawnRuntime.applyCustomFourRateToModeConfig !== "function"
  ) {
    throw new Error("CoreCustomSpawnRuntime is required");
  }

  var PLAY_CUSTOM_FOUR_RATE_PARAM = "four_rate";
  var PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY = "custom_spawn_4x4_four_rate_v1";

  function toSearchParams(searchLike) {
    if (searchLike && typeof searchLike.get === "function") {
      return searchLike;
    }
    try {
      return new URLSearchParams(searchLike || "");
    } catch (_err) {
      return new URLSearchParams();
    }
  }

  function promptCustomFourRate(defaultRate, promptRate, alertInvalidInput) {
    var defaultText = customSpawnRuntime.formatRatePercent(defaultRate);
    while (true) {
      var raw = promptRate(defaultText);
      if (raw === null) return null;
      var parsed = customSpawnRuntime.sanitizeCustomFourRate(raw);
      if (parsed !== null) return parsed;
      if (typeof alertInvalidInput === "function") alertInvalidInput();
    }
  }

  function resolvePlayCustomSpawnModeConfig(options) {
    var modeKey = String(options && options.modeKey ? options.modeKey : "");
    var modeConfig = options && options.modeConfig ? options.modeConfig : null;
    if (!modeConfig || !customSpawnRuntime.isCustomSpawnModeKey(modeKey)) {
      return {
        modeConfig: modeConfig,
        parsedFourRate: null,
        promptedRate: false
      };
    }

    var rateParamName =
      options && options.rateParamName ? options.rateParamName : PLAY_CUSTOM_FOUR_RATE_PARAM;
    var params = toSearchParams(options ? options.searchLike : "");
    var parsedRate = customSpawnRuntime.sanitizeCustomFourRate(params.get(rateParamName));
    var promptedRate = false;

    if (parsedRate === null) {
      var rememberedRate = null;
      try {
        rememberedRate = customSpawnRuntime.sanitizeCustomFourRate(
          options && typeof options.readStoredRate === "function"
            ? options.readStoredRate()
            : null
        );
      } catch (_err) {
        rememberedRate = null;
      }
      var defaultRate = rememberedRate !== null
        ? rememberedRate
        : customSpawnRuntime.inferFourRateFromSpawnTable(
          modeConfig && Array.isArray(modeConfig.spawn_table) ? modeConfig.spawn_table : null
        );
      parsedRate = promptCustomFourRate(
        defaultRate,
        options.promptRate,
        options.alertInvalidInput
      );
      if (parsedRate === null) {
        return {
          modeConfig: null,
          parsedFourRate: null,
          promptedRate: true
        };
      }

      params.set("mode_key", modeKey);
      params.set(rateParamName, customSpawnRuntime.formatRatePercent(parsedRate));
      var nextUrl =
        String(options && options.pathname ? options.pathname : "") +
        "?" +
        params.toString() +
        String(options && options.hash ? options.hash : "");
      if (typeof options.replaceUrl === "function") {
        try {
          options.replaceUrl(nextUrl);
        } catch (_err) {}
      }
      promptedRate = true;
    }

    try {
      options.writeStoredRate(customSpawnRuntime.formatRatePercent(parsedRate));
    } catch (_err) {}

    try {
      return {
        modeConfig: customSpawnRuntime.applyCustomFourRateToModeConfig(modeConfig, parsedRate),
        parsedFourRate: parsedRate,
        promptedRate: promptedRate
      };
    } catch (_err) {
      return {
        modeConfig: null,
        parsedFourRate: parsedRate,
        promptedRate: promptedRate
      };
    }
  }

  global.CorePlayCustomSpawnRuntime = global.CorePlayCustomSpawnRuntime || {};
  global.CorePlayCustomSpawnRuntime.PLAY_CUSTOM_FOUR_RATE_PARAM = PLAY_CUSTOM_FOUR_RATE_PARAM;
  global.CorePlayCustomSpawnRuntime.PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY =
    PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY;
  global.CorePlayCustomSpawnRuntime.promptCustomFourRate = promptCustomFourRate;
  global.CorePlayCustomSpawnRuntime.resolvePlayCustomSpawnModeConfig =
    resolvePlayCustomSpawnModeConfig;
})(typeof window !== "undefined" ? window : undefined);
