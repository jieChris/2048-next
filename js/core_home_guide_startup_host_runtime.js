(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function resolveDelayMs(input) {
    var value = Number(input.delayMs);
    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
    return 0;
  }

  function applyHomeGuideAutoStart(input) {
    var source = toRecord(input);
    var runtime = toRecord(source.homeGuideRuntime);
    var resolveHomeGuidePathname = asFunction(runtime.resolveHomeGuidePathname);
    var resolveHomeGuideAutoStart = asFunction(runtime.resolveHomeGuideAutoStart);
    var delayMs = resolveDelayMs(source);
    if (!resolveHomeGuidePathname || !resolveHomeGuideAutoStart) {
      return {
        shouldAutoStart: false,
        scheduled: false,
        delayMs: delayMs
      };
    }

    var pathname = resolveHomeGuidePathname({
      locationLike: source.locationLike || null
    });
    var autoStartState = toRecord(
      resolveHomeGuideAutoStart({
        pathname: pathname,
        storageLike: source.storageLike || null,
        seenKey: source.seenKey
      })
    );
    if (!autoStartState.shouldAutoStart) {
      return {
        shouldAutoStart: false,
        scheduled: false,
        delayMs: delayMs
      };
    }

    var startHomeGuide = asFunction(source.startHomeGuide);
    var setTimeoutLike = asFunction(source.setTimeoutLike);
    if (!startHomeGuide || !setTimeoutLike) {
      return {
        shouldAutoStart: true,
        scheduled: false,
        delayMs: delayMs
      };
    }

    setTimeoutLike(function () {
      startHomeGuide({ fromSettings: false });
    }, delayMs);
    return {
      shouldAutoStart: true,
      scheduled: true,
      delayMs: delayMs
    };
  }

  global.CoreHomeGuideStartupHostRuntime = global.CoreHomeGuideStartupHostRuntime || {};
  global.CoreHomeGuideStartupHostRuntime.applyHomeGuideAutoStart = applyHomeGuideAutoStart;
})(typeof window !== "undefined" ? window : undefined);
