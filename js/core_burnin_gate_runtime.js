(function (global) {
  "use strict";

  if (!global) return;

  function toFiniteNumberOrNull(value) {
    var num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function toPositiveIntegerOrNull(value) {
    var num = Number(value);
    if (!Number.isFinite(num)) return null;
    num = Math.floor(num);
    return num > 0 ? num : null;
  }

  function normalizeStatus(raw) {
    if (raw === "match") return "match";
    if (raw === "mismatch") return "mismatch";
    return "incomplete";
  }

  function normalizeMinComparable(raw) {
    var normalized = toPositiveIntegerOrNull(raw);
    return normalized === null ? 50 : normalized;
  }

  function normalizeMaxMismatchRate(raw) {
    var normalized = toFiniteNumberOrNull(raw);
    if (normalized === null || normalized < 0) return 1;
    return normalized;
  }

  function normalizeSustainedWindows(raw) {
    var normalized = toPositiveIntegerOrNull(raw);
    return normalized === null ? 3 : normalized;
  }

  function normalizeWindowSize(raw) {
    var normalized = toPositiveIntegerOrNull(raw);
    return normalized === null ? 0 : normalized;
  }

  function buildBurnInGateDecision(input) {
    var opts = input || {};
    var comparable = toPositiveIntegerOrNull(opts.comparable) || 0;
    var mismatchRate = toFiniteNumberOrNull(opts.mismatchRate);
    var minComparable = normalizeMinComparable(opts.minComparable);
    var maxMismatchRate = normalizeMaxMismatchRate(opts.maxMismatchRate);

    if (comparable < minComparable || mismatchRate === null) {
      return {
        gateStatus: "insufficient_sample",
        passGate: null
      };
    }

    if (mismatchRate <= maxMismatchRate) {
      return {
        gateStatus: "pass",
        passGate: true
      };
    }

    return {
      gateStatus: "fail",
      passGate: false
    };
  }

  function summarizeBurnInWindow(records, input) {
    var list = Array.isArray(records) ? records : [];
    var opts = input || {};
    var minComparable = normalizeMinComparable(opts.minComparable);
    var maxMismatchRate = normalizeMaxMismatchRate(opts.maxMismatchRate);

    var withDiagnostics = 0;
    var comparable = 0;
    var match = 0;
    var mismatch = 0;
    var incomplete = 0;
    for (var i = 0; i < list.length; i++) {
      var item = list[i] || {};
      if (item.hasDiagnostics === true) withDiagnostics += 1;
      var status = normalizeStatus(item.status);
      if (status === "match") {
        comparable += 1;
        match += 1;
      } else if (status === "mismatch") {
        comparable += 1;
        mismatch += 1;
      } else {
        incomplete += 1;
      }
    }

    var mismatchRate = comparable > 0 ? (mismatch * 100) / comparable : null;
    var gate = buildBurnInGateDecision({
      comparable: comparable,
      mismatchRate: mismatchRate,
      minComparable: minComparable,
      maxMismatchRate: maxMismatchRate
    });

    return {
      recordCount: list.length,
      withDiagnostics: withDiagnostics,
      comparable: comparable,
      match: match,
      mismatch: mismatch,
      incomplete: incomplete,
      mismatchRate: mismatchRate,
      gateStatus: gate.gateStatus,
      passGate: gate.passGate
    };
  }

  function summarizeSustainedBurnIn(records, input) {
    var list = Array.isArray(records) ? records : [];
    var opts = input || {};
    var minComparable = normalizeMinComparable(opts.minComparable);
    var maxMismatchRate = normalizeMaxMismatchRate(opts.maxMismatchRate);
    var sustainedWindows = normalizeSustainedWindows(opts.sustainedWindows);
    var windowSize = normalizeWindowSize(opts.windowSize);

    var details = [];
    if (windowSize > 0) {
      for (var i = 0; i < sustainedWindows; i++) {
        var start = i * windowSize;
        if (start >= list.length) break;
        var recordsInWindow = list.slice(start, start + windowSize);
        var summary = summarizeBurnInWindow(recordsInWindow, {
          minComparable: minComparable,
          maxMismatchRate: maxMismatchRate
        });
        summary.windowIndex = i + 1;
        details.push(summary);
      }
    }

    var sustainedConsecutivePass = 0;
    for (var j = 0; j < details.length; j++) {
      if (details[j].passGate === true) sustainedConsecutivePass += 1;
      else break;
    }

    var sustainedGateStatus = "insufficient_window";
    var sustainedPassGate = null;
    if (details.length >= sustainedWindows) {
      if (sustainedConsecutivePass >= sustainedWindows) {
        sustainedGateStatus = "pass";
        sustainedPassGate = true;
      } else {
        var hasSampleInsufficient = false;
        for (var k = 0; k < sustainedWindows; k++) {
          if (details[k].gateStatus === "insufficient_sample") {
            hasSampleInsufficient = true;
            break;
          }
        }
        if (hasSampleInsufficient) {
          sustainedGateStatus = "insufficient_sample";
          sustainedPassGate = null;
        } else {
          sustainedGateStatus = "fail";
          sustainedPassGate = false;
        }
      }
    }

    return {
      sustainedWindows: sustainedWindows,
      sustainedWindowSize: windowSize,
      sustainedEvaluatedWindows: details.length,
      sustainedConsecutivePass: sustainedConsecutivePass,
      sustainedGateStatus: sustainedGateStatus,
      sustainedPassGate: sustainedPassGate,
      sustainedWindowDetails: details
    };
  }

  global.CoreBurnInGateRuntime = global.CoreBurnInGateRuntime || {};
  global.CoreBurnInGateRuntime.buildBurnInGateDecision = buildBurnInGateDecision;
  global.CoreBurnInGateRuntime.summarizeBurnInWindow = summarizeBurnInWindow;
  global.CoreBurnInGateRuntime.summarizeSustainedBurnIn = summarizeSustainedBurnIn;
})(typeof window !== "undefined" ? window : undefined);
