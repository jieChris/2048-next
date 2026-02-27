(function (global) {
  "use strict";

  if (!global) return;

  var FIBONACCI_MILESTONES = [13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181];

  function normalizeRuleset(ruleset) {
    return ruleset === "fibonacci" ? "fibonacci" : "pow2";
  }

  function normalizeSpawnTable(spawnTable, ruleset) {
    var normalizedRuleset = normalizeRuleset(ruleset);
    if (Array.isArray(spawnTable) && spawnTable.length > 0) {
      var out = [];
      for (var i = 0; i < spawnTable.length; i++) {
        var item = spawnTable[i];
        if (!item || !Number.isInteger(item.value) || item.value <= 0) continue;
        if (!Number.isFinite(item.weight) || item.weight <= 0) continue;
        out.push({ value: item.value, weight: Number(item.weight) });
      }
      if (out.length > 0) return out;
    }
    if (normalizedRuleset === "fibonacci") {
      return [{ value: 1, weight: 90 }, { value: 2, weight: 10 }];
    }
    return [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
  }

  function getTheoreticalMaxTile(width, height, ruleset) {
    var w = Number(width);
    var h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    var cells = Math.floor(w) * Math.floor(h);
    if (!Number.isInteger(cells) || cells <= 0) return null;

    if (normalizeRuleset(ruleset) === "fibonacci") {
      var targetIndex = cells + 2;
      var a = 1;
      var b = 2;
      if (targetIndex <= 1) return 1;
      if (targetIndex === 2) return 2;
      for (var i = 3; i <= targetIndex; i++) {
        var next = a + b;
        a = b;
        b = next;
      }
      return b;
    }

    return Math.pow(2, cells + 1);
  }

  function pickSpawnValue(spawnTable, random) {
    var table = Array.isArray(spawnTable) ? spawnTable : [];
    if (!table.length) return 2;
    var totalWeight = 0;
    for (var i = 0; i < table.length; i++) {
      totalWeight += Number(table[i].weight) || 0;
    }
    if (totalWeight <= 0) return table[0].value;

    var rng = typeof random === "function" ? random : Math.random;
    var pick = rng() * totalWeight;
    var running = 0;
    for (var j = 0; j < table.length; j++) {
      running += Number(table[j].weight) || 0;
      if (pick <= running) return table[j].value;
    }
    return table[table.length - 1].value;
  }

  function getSpawnStatPair(spawnTable) {
    var table = Array.isArray(spawnTable) ? spawnTable : [];
    var values = [];
    for (var i = 0; i < table.length; i++) {
      var item = table[i];
      var value = Number(item && item.value);
      if (!Number.isInteger(value) || value <= 0) continue;
      if (values.indexOf(value) === -1) values.push(value);
    }
    values.sort(function (a, b) {
      return a - b;
    });
    var primary = values.length > 0 ? values[0] : 2;
    var secondary = values.length > 1 ? values[1] : primary;
    return { primary: primary, secondary: secondary };
  }

  function getSpawnCount(spawnValueCounts, value) {
    if (!spawnValueCounts || typeof spawnValueCounts !== "object") return 0;
    return Number(spawnValueCounts[String(value)]) || 0;
  }

  function getTotalSpawnCount(spawnValueCounts) {
    if (!spawnValueCounts || typeof spawnValueCounts !== "object") return 0;
    var total = 0;
    for (var key in spawnValueCounts) {
      if (!Object.prototype.hasOwnProperty.call(spawnValueCounts, key)) continue;
      total += Number(spawnValueCounts[key]) || 0;
    }
    return total;
  }

  function getActualSecondaryRateText(spawnValueCounts, spawnTable) {
    var pair = getSpawnStatPair(spawnTable);
    var total = getTotalSpawnCount(spawnValueCounts);
    if (total <= 0) return "0.00";
    var secondaryCount = getSpawnCount(spawnValueCounts, pair.secondary);
    return ((secondaryCount / total) * 100).toFixed(2);
  }

  function applySpawnValueCount(spawnValueCounts, value) {
    var nextSpawnValueCounts = {};
    if (spawnValueCounts && typeof spawnValueCounts === "object") {
      for (var key in spawnValueCounts) {
        if (!Object.prototype.hasOwnProperty.call(spawnValueCounts, key)) continue;
        nextSpawnValueCounts[key] = Number(spawnValueCounts[key]) || 0;
      }
    }
    var k = String(value);
    nextSpawnValueCounts[k] = (nextSpawnValueCounts[k] || 0) + 1;
    return {
      nextSpawnValueCounts: nextSpawnValueCounts,
      spawnTwos: nextSpawnValueCounts["2"] || 0,
      spawnFours: nextSpawnValueCounts["4"] || 0
    };
  }

  function nextFibonacci(value) {
    if (value <= 0) return 1;
    if (value === 1) return 2;
    var a = 1;
    var b = 2;
    while (b < value) {
      var n = a + b;
      a = b;
      b = n;
    }
    return b === value ? a + b : null;
  }

  function getMergedValue(a, b, ruleset, maxTile) {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) return null;
    var normalizedRuleset = normalizeRuleset(ruleset);
    var cap = Number.isFinite(maxTile) && maxTile > 0 ? Number(maxTile) : Infinity;

    if (normalizedRuleset !== "fibonacci") {
      if (a !== b) return null;
      var pow2Merged = a * 2;
      if (pow2Merged > cap) return null;
      return pow2Merged;
    }

    if (a === 1 && b === 1) {
      if (2 > cap) return null;
      return 2;
    }

    var low = Math.min(a, b);
    var high = Math.max(a, b);
    var next = nextFibonacci(low);
    if (next !== high) return null;
    var fibMerged = low + high;
    if (fibMerged > cap) return null;
    return fibMerged;
  }

  function getTimerMilestoneValues(ruleset, timerSlotIds) {
    if (normalizeRuleset(ruleset) === "fibonacci") {
      return FIBONACCI_MILESTONES.slice();
    }
    return Array.isArray(timerSlotIds) ? timerSlotIds.slice() : [];
  }

  global.CoreRulesRuntime = global.CoreRulesRuntime || {};
  global.CoreRulesRuntime.normalizeSpawnTable = normalizeSpawnTable;
  global.CoreRulesRuntime.getTheoreticalMaxTile = getTheoreticalMaxTile;
  global.CoreRulesRuntime.pickSpawnValue = pickSpawnValue;
  global.CoreRulesRuntime.getSpawnStatPair = getSpawnStatPair;
  global.CoreRulesRuntime.getSpawnCount = getSpawnCount;
  global.CoreRulesRuntime.getTotalSpawnCount = getTotalSpawnCount;
  global.CoreRulesRuntime.getActualSecondaryRateText = getActualSecondaryRateText;
  global.CoreRulesRuntime.applySpawnValueCount = applySpawnValueCount;
  global.CoreRulesRuntime.nextFibonacci = nextFibonacci;
  global.CoreRulesRuntime.getMergedValue = getMergedValue;
  global.CoreRulesRuntime.getTimerMilestoneValues = getTimerMilestoneValues;
})(typeof window !== "undefined" ? window : undefined);
