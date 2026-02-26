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

  function resolveHomePageDefaults(input) {
    var source = toRecord(input);
    return {
      defaultModeKey:
        typeof source.defaultModeKey === "string"
          ? source.defaultModeKey
          : "standard_4x4_pow2_no_undo",
      defaultBoardWidth: typeof source.defaultBoardWidth === "number" ? source.defaultBoardWidth : 4
    };
  }

  function resolveHomePageRuntimes(input) {
    var source = toRecord(input);
    var windowLike = toRecord(source.windowLike);
    var homeRuntimeContractRuntime = toRecord(
      source.homeRuntimeContractRuntime || windowLike.CoreHomeRuntimeContractRuntime
    );
    var resolveHomeRuntimeContracts = asFunction(
      homeRuntimeContractRuntime.resolveHomeRuntimeContracts
    );
    if (!resolveHomeRuntimeContracts) {
      throw new Error("CoreHomeRuntimeContractRuntime is required");
    }

    var homeStartupHostRuntime = toRecord(
      source.homeStartupHostRuntime || windowLike.CoreHomeStartupHostRuntime
    );
    var resolveHomeStartupFromContext = asFunction(
      homeStartupHostRuntime.resolveHomeStartupFromContext
    );
    if (!resolveHomeStartupFromContext) {
      throw new Error("CoreHomeStartupHostRuntime is required");
    }

    var runtimeContracts = toRecord(resolveHomeRuntimeContracts(windowLike));
    return {
      homeModeRuntime: toRecord(runtimeContracts.homeModeRuntime),
      undoActionRuntime: toRecord(runtimeContracts.undoActionRuntime),
      bootstrapRuntime: toRecord(runtimeContracts.bootstrapRuntime),
      homeStartupHostRuntime: {
        resolveHomeStartupFromContext: resolveHomeStartupFromContext
      }
    };
  }

  function applyHomePageBootstrap(input) {
    var source = toRecord(input);
    var windowLike = toRecord(source.windowLike);
    var documentLike = source.documentLike || windowLike.document;
    var sourceDefaults = toRecord(source.homePageDefaults);
    var homePageDefaults = hasOwnKeys(sourceDefaults) ? sourceDefaults : resolveHomePageDefaults();
    var sourceHomeRuntimes = toRecord(source.homeRuntimes);
    var homeRuntimes = hasOwnKeys(sourceHomeRuntimes)
      ? sourceHomeRuntimes
      : resolveHomePageRuntimes({
          windowLike: windowLike,
          homeRuntimeContractRuntime: source.homeRuntimeContractRuntime,
          homeStartupHostRuntime: source.homeStartupHostRuntime
        });

    var bootstrapRuntime = toRecord(homeRuntimes.bootstrapRuntime);
    var homeModeRuntime = toRecord(homeRuntimes.homeModeRuntime);
    var homeStartupHostRuntime = toRecord(homeRuntimes.homeStartupHostRuntime);

    var startGameOnAnimationFrame = asFunction(bootstrapRuntime.startGameOnAnimationFrame);
    if (!startGameOnAnimationFrame) {
      return {
        started: false,
        missingBootstrapRuntime: true
      };
    }

    var resolveHomeStartupFromContext = asFunction(
      homeStartupHostRuntime.resolveHomeStartupFromContext
    );
    if (!resolveHomeStartupFromContext) {
      return {
        started: false,
        missingStartupRuntime: true
      };
    }

    var inputManagerCtor = source.inputManagerCtor || windowLike.KeyboardInputManager;
    var startupResult = startGameOnAnimationFrame(function () {
      return resolveHomeStartupFromContext({
        windowLike: windowLike,
        documentLike: documentLike,
        defaultModeKey: homePageDefaults.defaultModeKey,
        defaultBoardWidth: homePageDefaults.defaultBoardWidth,
        inputManagerCtor: inputManagerCtor,
        resolveHomeModeSelectionFromContext: homeModeRuntime.resolveHomeModeSelectionFromContext
      });
    });

    return {
      started: true,
      startupResult: startupResult
    };
  }

  function applyHomePageUndo(input) {
    var source = toRecord(input);
    var windowLike = toRecord(source.windowLike);
    var undoActionRuntime = toRecord(toRecord(source.homeRuntimes).undoActionRuntime);
    if (!hasOwnKeys(undoActionRuntime)) {
      var homeRuntimeContractRuntime = toRecord(
        source.homeRuntimeContractRuntime || windowLike.CoreHomeRuntimeContractRuntime
      );
      var resolveHomeRuntimeContracts = asFunction(
        homeRuntimeContractRuntime.resolveHomeRuntimeContracts
      );
      if (!resolveHomeRuntimeContracts) {
        return {
          didUndo: false,
          missingRuntime: true
        };
      }
      var runtimeContracts = toRecord(resolveHomeRuntimeContracts(windowLike));
      undoActionRuntime = toRecord(runtimeContracts.undoActionRuntime);
    }

    var tryTriggerUndo = asFunction(undoActionRuntime.tryTriggerUndo);
    if (!tryTriggerUndo) {
      return {
        didUndo: false,
        missingUndoRuntime: true
      };
    }

    var gameManager = source.gameManager || windowLike.game_manager;
    var result = tryTriggerUndo(gameManager, -1);
    return {
      didUndo: true,
      result: result
    };
  }

  global.CoreHomePageHostRuntime = global.CoreHomePageHostRuntime || {};
  global.CoreHomePageHostRuntime.resolveHomePageDefaults = resolveHomePageDefaults;
  global.CoreHomePageHostRuntime.resolveHomePageRuntimes = resolveHomePageRuntimes;
  global.CoreHomePageHostRuntime.applyHomePageBootstrap = applyHomePageBootstrap;
  global.CoreHomePageHostRuntime.applyHomePageUndo = applyHomePageUndo;
})(typeof window !== "undefined" ? window : undefined);
