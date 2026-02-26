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

  function hasOwnKeys(value) {
    return Object.keys(value).length > 0;
  }

  function resolveSimplePageDefaults(input) {
    var source = toRecord(input);
    var modeKey =
      typeof source.modeKey === "string" ? source.modeKey : "standard_4x4_pow2_no_undo";
    return {
      modeKey: modeKey,
      fallbackModeKey: typeof source.fallbackModeKey === "string" ? source.fallbackModeKey : modeKey,
      defaultBoardWidth: typeof source.defaultBoardWidth === "number" ? source.defaultBoardWidth : 4,
      disableSessionSync: source.disableSessionSync === true
    };
  }

  function resolveSimplePageRuntimes(input) {
    var source = toRecord(input);
    var windowLike = toRecord(source.windowLike);
    var simpleRuntimeContractRuntime = toRecord(
      source.simpleRuntimeContractRuntime || windowLike.CoreSimpleRuntimeContractRuntime
    );
    var simpleStartupRuntime = toRecord(source.simpleStartupRuntime || windowLike.CoreSimpleStartupRuntime);
    var resolveSimpleBootstrapRuntime = asFunction(
      simpleRuntimeContractRuntime.resolveSimpleBootstrapRuntime
    );
    if (!resolveSimpleBootstrapRuntime) {
      throw new Error("CoreSimpleRuntimeContractRuntime is required");
    }

    var resolveSimpleStartupPayload = asFunction(simpleStartupRuntime.resolveSimpleStartupPayload);
    if (!resolveSimpleStartupPayload) {
      throw new Error("CoreSimpleStartupRuntime is required");
    }

    return {
      bootstrapRuntime: toRecord(resolveSimpleBootstrapRuntime(windowLike)),
      simpleStartupRuntime: {
        resolveSimpleStartupPayload: resolveSimpleStartupPayload
      }
    };
  }

  function applySimplePageBootstrap(input) {
    var source = toRecord(input);
    var windowLike = toRecord(source.windowLike);
    var sourceDefaults = toRecord(source.simplePageDefaults);
    var simplePageDefaults = hasOwnKeys(sourceDefaults)
      ? sourceDefaults
      : resolveSimplePageDefaults();
    var sourceSimpleRuntimes = toRecord(source.simpleRuntimes);
    var simpleRuntimes = hasOwnKeys(sourceSimpleRuntimes)
      ? sourceSimpleRuntimes
      : resolveSimplePageRuntimes({
          windowLike: windowLike,
          simpleRuntimeContractRuntime: source.simpleRuntimeContractRuntime,
          simpleStartupRuntime: source.simpleStartupRuntime
        });

    var bootstrapRuntime = toRecord(simpleRuntimes.bootstrapRuntime);
    var simpleStartupRuntime = toRecord(simpleRuntimes.simpleStartupRuntime);
    var startGameOnAnimationFrame = asFunction(bootstrapRuntime.startGameOnAnimationFrame);
    if (!startGameOnAnimationFrame) {
      return {
        started: false,
        missingBootstrapRuntime: true
      };
    }

    var resolveSimpleStartupPayload = asFunction(simpleStartupRuntime.resolveSimpleStartupPayload);
    if (!resolveSimpleStartupPayload) {
      return {
        started: false,
        missingStartupRuntime: true
      };
    }

    var inputManagerCtor = source.inputManagerCtor || windowLike.KeyboardInputManager;
    var startupPayloadInput = {
      modeKey: simplePageDefaults.modeKey,
      fallbackModeKey: simplePageDefaults.fallbackModeKey,
      inputManagerCtor: inputManagerCtor,
      defaultBoardWidth: simplePageDefaults.defaultBoardWidth
    };
    if (simplePageDefaults.disableSessionSync === true) {
      startupPayloadInput.disableSessionSync = true;
    }

    var startupPayload = resolveSimpleStartupPayload(startupPayloadInput);
    var startupResult = startGameOnAnimationFrame(startupPayload);
    return {
      started: true,
      startupResult: startupResult
    };
  }

  global.CoreSimplePageHostRuntime = global.CoreSimplePageHostRuntime || {};
  global.CoreSimplePageHostRuntime.resolveSimplePageDefaults = resolveSimplePageDefaults;
  global.CoreSimplePageHostRuntime.resolveSimplePageRuntimes = resolveSimplePageRuntimes;
  global.CoreSimplePageHostRuntime.applySimplePageBootstrap = applySimplePageBootstrap;
})(typeof window !== "undefined" ? window : undefined);
