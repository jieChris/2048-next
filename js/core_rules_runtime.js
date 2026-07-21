(function (global) {
  "use strict";

  if (!global) return;

  var FIBONACCI_MILESTONES = [13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181];
  var FIRST_TIMER_SLOT_VALUE = 32;
  var MAX_SAFE_TIMER_SLOT_VALUE = 4503599627370496;

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

  function resolveTimerMaxTile(width, height, ruleset, maxTileOverride) {
    var theoreticalMax = getTheoreticalMaxTile(width, height, ruleset);
    var override = Number(maxTileOverride);
    if (!Number.isFinite(override) || override <= 0) return theoreticalMax;
    return theoreticalMax === null ? Math.floor(override) : Math.min(theoreticalMax, Math.floor(override));
  }

  function normalizePositiveIntegerList(values) {
    var out = [];
    var seen = {};
    var list = Array.isArray(values) ? values : [];
    for (var i = 0; i < list.length; i++) {
      var value = Number(list[i]);
      if (!Number.isInteger(value) || value <= 0 || seen[String(value)]) continue;
      seen[String(value)] = true;
      out.push(value);
    }
    out.sort(function (left, right) { return left - right; });
    return out;
  }

  function getFibonacciMilestonesUpTo(maxTile) {
    if (!Number.isFinite(maxTile) || Number(maxTile) <= 0) return FIBONACCI_MILESTONES.slice();
    var out = [];
    var previous = 1;
    var current = 2;
    while (current <= Number(maxTile)) {
      if (current >= 13) out.push(current);
      var next = previous + current;
      previous = current;
      current = next;
    }
    return out;
  }

  function getPow2TimerSlotsUpTo(maxTile) {
    if (!Number.isFinite(maxTile) || Number(maxTile) < FIRST_TIMER_SLOT_VALUE) return [];
    var out = [];
    var value = FIRST_TIMER_SLOT_VALUE;
    var limit = Math.min(Math.floor(Number(maxTile)), MAX_SAFE_TIMER_SLOT_VALUE);
    while (value <= limit) {
      out.push(value);
      value *= 2;
    }
    return out;
  }

  function getTimerSlotIdsForBoard(ruleset, width, height, fallbackTimerSlotIds, maxTileOverride) {
    var normalizedRuleset = normalizeRuleset(ruleset);
    var maxTile = resolveTimerMaxTile(width, height, normalizedRuleset, maxTileOverride);
    if (maxTile === null) return normalizePositiveIntegerList(fallbackTimerSlotIds);
    if (normalizedRuleset !== "fibonacci") return getPow2TimerSlotsUpTo(maxTile);

    var count = getFibonacciMilestonesUpTo(maxTile).length;
    var slots = getPow2TimerSlotsUpTo(Math.pow(2, count + 4));
    return slots.slice(0, count);
  }

  function resolveRulesRandomUnitFloat() {
    if (
      global.CoreCryptoRandomRuntime &&
      typeof global.CoreCryptoRandomRuntime.randomUnitFloat === "function"
    ) {
      return global.CoreCryptoRandomRuntime.randomUnitFloat();
    }
    return 0;
  }

  function pickSpawnValue(spawnTable, random) {
    var table = Array.isArray(spawnTable) ? spawnTable : [];
    if (!table.length) return 2;
    var totalWeight = 0;
    for (var i = 0; i < table.length; i++) {
      totalWeight += Number(table[i].weight) || 0;
    }
    if (totalWeight <= 0) return table[0].value;

    var rng = typeof random === "function" ? random : resolveRulesRandomUnitFloat;
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

  function getTimerMilestoneValues(ruleset, timerSlotIds, width, height, maxTileOverride) {
    var normalizedRuleset = normalizeRuleset(ruleset);
    var hasBoardSize =
      typeof width === "number" &&
      typeof height === "number" &&
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0;
    var maxTile = hasBoardSize
      ? resolveTimerMaxTile(width, height, normalizedRuleset, maxTileOverride)
      : null;
    if (normalizedRuleset === "fibonacci") {
      return hasBoardSize ? getFibonacciMilestonesUpTo(maxTile) : FIBONACCI_MILESTONES.slice();
    }
    var slots = normalizePositiveIntegerList(timerSlotIds);
    if (!hasBoardSize || maxTile === null) return slots;
    return slots.filter(function (value) { return value <= maxTile; });
  }

  function getTimerMilestoneSlotByValue(timerMilestones, timerSlotIds) {
    var milestones = Array.isArray(timerMilestones) ? timerMilestones : [];
    var slotIds = Array.isArray(timerSlotIds) ? timerSlotIds : [];
    var slotMap = {};
    for (var i = 0; i < slotIds.length; i++) {
      var milestone = Number(milestones[i]);
      if (!Number.isInteger(milestone) || milestone <= 0) continue;
      slotMap[String(milestone)] = String(slotIds[i]);
    }
    return slotMap;
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
  global.CoreRulesRuntime.getTimerSlotIdsForBoard = getTimerSlotIdsForBoard;
  global.CoreRulesRuntime.getTimerMilestoneValues = getTimerMilestoneValues;
  global.CoreRulesRuntime.getTimerMilestoneSlotByValue = getTimerMilestoneSlotByValue;
})(typeof window !== "undefined" ? window : undefined);
