(function (global) {
  "use strict";

  if (!global) return;

  var CUSTOM_SPAWN_MODE_KEYS = {
    spawn_custom_4x4_pow2_no_undo: true,
    spawn_custom_4x4_pow2_undo: true
  };

  function isCustomSpawnModeKey(modeKey) {
    return !!CUSTOM_SPAWN_MODE_KEYS[String(modeKey || "")];
  }

  function sanitizeCustomFourRate(raw) {
    if (raw === null || typeof raw === "undefined") return null;
    var text = String(raw).trim().replace(/%/g, "");
    if (!text) return null;
    var num = Number(text);
    if (!Number.isFinite(num)) return null;
    if (num < 0 || num > 100) return null;
    return Math.round(num * 100) / 100;
  }

  function formatRatePercent(rate) {
    var fixed = Number(rate).toFixed(2);
    return fixed.replace(/\.?0+$/, "");
  }

  function inferFourRateFromSpawnTable(spawnTable) {
    if (!Array.isArray(spawnTable)) return 10;
    var totalWeight = 0;
    var fourWeight = 0;
    for (var i = 0; i < spawnTable.length; i++) {
      var item = spawnTable[i];
      if (!item || !Number.isFinite(item.weight) || Number(item.weight) <= 0) continue;
      totalWeight += Number(item.weight);
      if (Number(item.value) === 4) {
        fourWeight += Number(item.weight);
      }
    }
    if (totalWeight <= 0) return 10;
    return Math.round((fourWeight / totalWeight) * 10000) / 100;
  }

  function cloneModeConfig(modeConfig) {
    try {
      return JSON.parse(JSON.stringify(modeConfig));
    } catch (_err) {
      var out = {};
      for (var key in modeConfig) {
        if (Object.prototype.hasOwnProperty.call(modeConfig, key)) {
          out[key] = modeConfig[key];
        }
      }
      return out;
    }
  }

  function applyCustomFourRateToModeConfig(modeConfig, fourRate) {
    var parsedRate = sanitizeCustomFourRate(fourRate);
    if (parsedRate === null) {
      throw new Error("invalid_custom_four_rate");
    }

    var nextConfig = cloneModeConfig(modeConfig || {});
    var twoRate = Math.round((100 - parsedRate) * 100) / 100;
    var spawnTable = [];
    if (twoRate > 0) spawnTable.push({ value: 2, weight: twoRate });
    if (parsedRate > 0) spawnTable.push({ value: 4, weight: parsedRate });
    if (!spawnTable.length) spawnTable.push({ value: 2, weight: 100 });

    nextConfig.spawn_table = spawnTable;
    nextConfig.special_rules =
      nextConfig.special_rules && typeof nextConfig.special_rules === "object"
        ? nextConfig.special_rules
        : {};
    nextConfig.special_rules.custom_spawn_four_rate = parsedRate;
    nextConfig.label = String(modeConfig && modeConfig.label ? modeConfig.label : "模式") +
      "（4率 " + formatRatePercent(parsedRate) + "%）";
    return nextConfig;
  }

  global.CoreCustomSpawnRuntime = global.CoreCustomSpawnRuntime || {};
  global.CoreCustomSpawnRuntime.CUSTOM_SPAWN_MODE_KEYS = CUSTOM_SPAWN_MODE_KEYS;
  global.CoreCustomSpawnRuntime.isCustomSpawnModeKey = isCustomSpawnModeKey;
  global.CoreCustomSpawnRuntime.sanitizeCustomFourRate = sanitizeCustomFourRate;
  global.CoreCustomSpawnRuntime.formatRatePercent = formatRatePercent;
  global.CoreCustomSpawnRuntime.inferFourRateFromSpawnTable = inferFourRateFromSpawnTable;
  global.CoreCustomSpawnRuntime.applyCustomFourRateToModeConfig = applyCustomFourRateToModeConfig;
})(typeof window !== "undefined" ? window : undefined);
