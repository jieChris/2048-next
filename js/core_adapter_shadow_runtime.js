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

  global.CoreAdapterShadowRuntime = global.CoreAdapterShadowRuntime || {};
  global.CoreAdapterShadowRuntime.createInitialAdapterParityState = createInitialAdapterParityState;
  global.CoreAdapterShadowRuntime.applyAdapterMoveResultToParityState = applyAdapterMoveResultToParityState;
  global.CoreAdapterShadowRuntime.attachAdapterMoveResultShadow = attachAdapterMoveResultShadow;
  global.CoreAdapterShadowRuntime.detachAdapterMoveResultShadow = detachAdapterMoveResultShadow;
  global.CoreAdapterShadowRuntime.getAdapterParityState = getAdapterParityState;
})(typeof window !== "undefined" ? window : undefined);
