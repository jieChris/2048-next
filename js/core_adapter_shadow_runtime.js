(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_REASON = "move";
  var stateByMode = {};
  var bindingByMode = {};

  function normalizeModeKey(modeKey) {
    return typeof modeKey === "string" && modeKey ? modeKey : "unknown";
  }

  function normalizeDirection(direction) {
    return Number.isInteger(direction) ? Number(direction) : null;
  }

  function toFiniteNumber(value, fallback) {
    return Number.isFinite(value) ? Number(value) : fallback;
  }

  function toFiniteNumberOrNull(value) {
    var num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeAdapterMode(adapterMode) {
    return adapterMode === "core-adapter" ? "core-adapter" : "legacy-bridge";
  }

  function normalizeReport(report, expectedAdapterMode) {
    if (!report || typeof report !== "object") return null;
    if (report.adapterMode !== expectedAdapterMode) return null;
    return report;
  }

  function toDelta(legacyValue, coreValue) {
    var left = toFiniteNumberOrNull(legacyValue);
    var right = toFiniteNumberOrNull(coreValue);
    if (left === null || right === null) return null;
    return right - left;
  }

  function cloneCounters(counters) {
    return {
      totalEvents: counters.totalEvents,
      moveEvents: counters.moveEvents,
      undoEvents: counters.undoEvents,
      movedEvents: counters.movedEvents,
      overEvents: counters.overEvents,
      wonEvents: counters.wonEvents
    };
  }

  function cloneState(state) {
    if (!state || typeof state !== "object") return null;
    return {
      modeKey: state.modeKey,
      lastReason: state.lastReason,
      lastDirection: state.lastDirection,
      lastScore: state.lastScore,
      lastOver: !!state.lastOver,
      lastWon: !!state.lastWon,
      lastEventAt: state.lastEventAt,
      counters: cloneCounters(state.counters)
    };
  }

  function createInitialAdapterParityState(modeKey) {
    return {
      modeKey: normalizeModeKey(modeKey),
      lastReason: DEFAULT_REASON,
      lastDirection: null,
      lastScore: 0,
      lastOver: false,
      lastWon: false,
      lastEventAt: 0,
      counters: {
        totalEvents: 0,
        moveEvents: 0,
        undoEvents: 0,
        movedEvents: 0,
        overEvents: 0,
        wonEvents: 0
      }
    };
  }

  function applyAdapterMoveResultToParityState(previousState, detail) {
    var state = previousState || createInitialAdapterParityState(detail && detail.modeKey);
    var input = detail || {};
    var reason = typeof input.reason === "string" && input.reason ? input.reason : DEFAULT_REASON;
    var modeKey = typeof input.modeKey === "string" && input.modeKey ? input.modeKey : state.modeKey;
    var counters = cloneCounters(state.counters);
    counters.totalEvents += 1;
    if (reason === "undo") {
      counters.undoEvents += 1;
    } else {
      counters.moveEvents += 1;
    }
    if (input.moved === true) counters.movedEvents += 1;
    if (input.over === true) counters.overEvents += 1;
    if (input.won === true) counters.wonEvents += 1;

    return {
      modeKey: normalizeModeKey(modeKey),
      lastReason: reason,
      lastDirection: normalizeDirection(input.direction),
      lastScore: toFiniteNumber(input.score, state.lastScore),
      lastOver: input.over === true,
      lastWon: input.won === true,
      lastEventAt: toFiniteNumber(input.at, Date.now()),
      counters: counters
    };
  }

  function buildMoveResultEventName(modeKey) {
    var ioApi = global.LegacyAdapterIoRuntime;
    if (ioApi && typeof ioApi.buildAdapterMoveResultEventName === "function") {
      return ioApi.buildAdapterMoveResultEventName(modeKey);
    }
    return "engine-adapter:move-result:" + normalizeModeKey(modeKey);
  }

  function detachAdapterMoveResultShadow(modeKey) {
    var key = normalizeModeKey(modeKey);
    var binding = bindingByMode[key];
    if (!binding || typeof binding.detach !== "function") return false;
    binding.detach();
    delete bindingByMode[key];
    return true;
  }

  function attachAdapterMoveResultShadow(input) {
    var opts = input || {};
    var target = opts.target;
    if (
      !target ||
      typeof target.addEventListener !== "function" ||
      typeof target.removeEventListener !== "function"
    ) {
      return null;
    }

    var modeKey = normalizeModeKey(opts.modeKey);
    detachAdapterMoveResultShadow(modeKey);

    var eventName = typeof opts.eventName === "string" && opts.eventName
      ? opts.eventName
      : buildMoveResultEventName(modeKey);
    var state = stateByMode[modeKey] || createInitialAdapterParityState(modeKey);
    stateByMode[modeKey] = state;

    var onStateChange = typeof opts.onStateChange === "function" ? opts.onStateChange : null;
    if (onStateChange) {
      try {
        onStateChange(cloneState(state));
      } catch (_err) {
        // Keep shadow path non-invasive.
      }
    }

    var listener = function (event) {
      state = applyAdapterMoveResultToParityState(state, event && event.detail ? event.detail : {});
      stateByMode[modeKey] = state;
      if (onStateChange) {
        try {
          onStateChange(cloneState(state));
        } catch (_err) {
          // Keep shadow path non-invasive.
        }
      }
    };

    target.addEventListener(eventName, listener);
    var binding = {
      modeKey: modeKey,
      eventName: eventName,
      detach: function () {
        target.removeEventListener(eventName, listener);
      }
    };
    bindingByMode[modeKey] = binding;
    return binding;
  }

  function getAdapterParityState(modeKey) {
    return cloneState(stateByMode[normalizeModeKey(modeKey)]);
  }

  function buildAdapterSessionParityReport(input) {
    var opts = input || {};
    var parity = opts.parityState || null;
    var snapshot = isPlainObject(opts.snapshot) ? opts.snapshot : null;
    var snapshotLastMove = snapshot && isPlainObject(snapshot.lastMoveResult)
      ? snapshot.lastMoveResult
      : null;
    var parityScore = parity ? toFiniteNumberOrNull(parity.lastScore) : null;
    var snapshotScore = snapshotLastMove ? toFiniteNumberOrNull(snapshotLastMove.score) : null;
    var scoreDelta = parityScore !== null && snapshotScore !== null ? parityScore - snapshotScore : null;
    var isScoreAligned = scoreDelta !== null ? scoreDelta === 0 : null;

    var counters = parity
      ? cloneCounters(parity.counters || {})
      : {
          totalEvents: 0,
          moveEvents: 0,
          undoEvents: 0,
          movedEvents: 0,
          overEvents: 0,
          wonEvents: 0
        };
    counters.totalEvents = Number.isFinite(counters.totalEvents) ? Number(counters.totalEvents) : 0;
    counters.moveEvents = Number.isFinite(counters.moveEvents) ? Number(counters.moveEvents) : 0;
    counters.undoEvents = Number.isFinite(counters.undoEvents) ? Number(counters.undoEvents) : 0;
    counters.movedEvents = Number.isFinite(counters.movedEvents) ? Number(counters.movedEvents) : 0;
    counters.overEvents = Number.isFinite(counters.overEvents) ? Number(counters.overEvents) : 0;
    counters.wonEvents = Number.isFinite(counters.wonEvents) ? Number(counters.wonEvents) : 0;

    var modeKey = normalizeModeKey(
      (snapshot && typeof snapshot.modeKey === "string" ? snapshot.modeKey : null) ||
        (parity && typeof parity.modeKey === "string" ? parity.modeKey : null) ||
        opts.modeKey
    );
    var adapterMode = normalizeAdapterMode(
      (snapshot && typeof snapshot.adapterMode === "string" ? snapshot.adapterMode : null) ||
        opts.adapterMode
    );

    return {
      schemaVersion: 2,
      modeKey: modeKey,
      adapterMode: adapterMode,
      hasParityState: !!parity,
      hasSnapshot: !!snapshot,
      counters: cloneCounters(counters),
      lastReason: parity && typeof parity.lastReason === "string" && parity.lastReason
        ? parity.lastReason
        : DEFAULT_REASON,
      lastDirection: parity ? normalizeDirection(parity.lastDirection) : null,
      lastEventAt: parity && Number.isFinite(parity.lastEventAt) ? Number(parity.lastEventAt) : 0,
      lastScoreFromParity: parityScore,
      lastScoreFromSnapshot: snapshotScore,
      scoreDelta: scoreDelta,
      isScoreAligned: isScoreAligned,
      undoEvents: counters.undoEvents,
      undoUsedFromSnapshot: snapshotLastMove ? toFiniteNumberOrNull(snapshotLastMove.undoUsed) : null,
      wonEvents: counters.wonEvents,
      overEvents: counters.overEvents,
      snapshotUpdatedAt: snapshot ? toFiniteNumberOrNull(snapshot.updatedAt) : null
    };
  }

  function buildAdapterParityABDiffSummary(input) {
    var opts = input || {};
    var legacyReport = normalizeReport(opts.legacyBridgeReport, "legacy-bridge");
    var coreReport = normalizeReport(opts.coreAdapterReport, "core-adapter");
    var modeKey = normalizeModeKey(
      opts.modeKey ||
      (coreReport && coreReport.modeKey) ||
      (legacyReport && legacyReport.modeKey)
    );
    var comparable = !!legacyReport &&
      !!coreReport &&
      normalizeModeKey(legacyReport.modeKey) === normalizeModeKey(coreReport.modeKey) &&
      normalizeModeKey(legacyReport.modeKey) === modeKey;
    var scoreDelta = comparable
      ? toDelta(legacyReport && legacyReport.lastScoreFromSnapshot, coreReport && coreReport.lastScoreFromSnapshot)
      : null;
    var isScoreMatch = scoreDelta === null ? null : scoreDelta === 0;
    var bothScoreAligned = comparable &&
      legacyReport &&
      legacyReport.isScoreAligned === true &&
      coreReport &&
      coreReport.isScoreAligned === true &&
      isScoreMatch === true;

    return {
      schemaVersion: 2,
      modeKey: modeKey,
      hasLegacyReport: !!legacyReport,
      hasCoreReport: !!coreReport,
      comparable: comparable,
      comparedAt: Date.now(),
      legacyScore: legacyReport ? legacyReport.lastScoreFromSnapshot : null,
      coreScore: coreReport ? coreReport.lastScoreFromSnapshot : null,
      scoreDelta: scoreDelta,
      isScoreMatch: isScoreMatch,
      legacyUndoUsed: legacyReport ? legacyReport.undoUsedFromSnapshot : null,
      coreUndoUsed: coreReport ? coreReport.undoUsedFromSnapshot : null,
      undoUsedDelta: comparable
        ? toDelta(legacyReport && legacyReport.undoUsedFromSnapshot, coreReport && coreReport.undoUsedFromSnapshot)
        : null,
      legacyUndoEvents: legacyReport ? legacyReport.undoEvents : null,
      coreUndoEvents: coreReport ? coreReport.undoEvents : null,
      undoEventsDelta: comparable
        ? toDelta(legacyReport && legacyReport.undoEvents, coreReport && coreReport.undoEvents)
        : null,
      legacyWonEvents: legacyReport ? legacyReport.wonEvents : null,
      coreWonEvents: coreReport ? coreReport.wonEvents : null,
      wonEventsDelta: comparable
        ? toDelta(legacyReport && legacyReport.wonEvents, coreReport && coreReport.wonEvents)
        : null,
      legacyOverEvents: legacyReport ? legacyReport.overEvents : null,
      coreOverEvents: coreReport ? coreReport.overEvents : null,
      overEventsDelta: comparable
        ? toDelta(legacyReport && legacyReport.overEvents, coreReport && coreReport.overEvents)
        : null,
      bothScoreAligned: comparable ? bothScoreAligned : null
    };
  }

  global.CoreAdapterShadowRuntime = global.CoreAdapterShadowRuntime || {};
  global.CoreAdapterShadowRuntime.createInitialAdapterParityState = createInitialAdapterParityState;
  global.CoreAdapterShadowRuntime.applyAdapterMoveResultToParityState = applyAdapterMoveResultToParityState;
  global.CoreAdapterShadowRuntime.attachAdapterMoveResultShadow = attachAdapterMoveResultShadow;
  global.CoreAdapterShadowRuntime.detachAdapterMoveResultShadow = detachAdapterMoveResultShadow;
  global.CoreAdapterShadowRuntime.getAdapterParityState = getAdapterParityState;
  global.CoreAdapterShadowRuntime.buildAdapterSessionParityReport = buildAdapterSessionParityReport;
  global.CoreAdapterShadowRuntime.buildAdapterParityABDiffSummary = buildAdapterParityABDiffSummary;
})(typeof window !== "undefined" ? window : undefined);
