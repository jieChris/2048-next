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

  var STANDALONE_DISPLAY_MODE_QUERIES = [
    "(display-mode: standalone)",
    "(display-mode: window-controls-overlay)",
    "(display-mode: fullscreen)",
    "(display-mode: minimal-ui)"
  ];

  function matchesStandaloneDisplayMode(windowLike) {
    var matchMedia = asFunction(windowLike.matchMedia);
    if (!matchMedia) return false;
    for (var i = 0; i < STANDALONE_DISPLAY_MODE_QUERIES.length; i += 1) {
      var query = STANDALONE_DISPLAY_MODE_QUERIES[i];
      try {
        var queryResult = toRecord(matchMedia.call(windowLike, query));
        if (queryResult.matches === true) return true;
      } catch (_err) {
        // Ignore unsupported media queries from host runtime.
      }
    }
    return false;
  }

  function hasLegacyStandaloneFlag(windowLike) {
    var navigatorLike = toRecord(windowLike.navigator);
    return navigatorLike.standalone === true;
  }

  function isStandaloneAppWindow(windowLike) {
    return hasLegacyStandaloneFlag(windowLike) || matchesStandaloneDisplayMode(windowLike);
  }

  function navigateCurrentWindow(windowLike, openUrl) {
    var locationLike = toRecord(windowLike.location);
    var assign = asFunction(locationLike.assign);
    if (assign) {
      assign.call(locationLike, openUrl);
      return true;
    }
    if ("href" in locationLike) {
      try {
        locationLike.href = openUrl;
        return true;
      } catch (_err) {
        return false;
      }
    }
    return false;
  }

  function openInTargetWindow(windowLike, openUrl, target) {
    var openFn = asFunction(windowLike.open);
    if (!openFn) return false;
    openFn.call(windowLike, openUrl, target);
    return true;
  }

  function resolvePlanFailedMessage(input) {
    return typeof input.planFailedMessage === "string" && input.planFailedMessage
      ? input.planFailedMessage
      : "练习板链接生成失败。";
  }

  function applyPracticeTransferFromCurrent(input) {
    var source = toRecord(input);
    var runtime = toRecord(source.practiceTransferRuntime);
    var resolvePracticeTransferPrecheck = asFunction(runtime.resolvePracticeTransferPrecheck);
    var createPracticeTransferNavigationPlan = asFunction(
      runtime.createPracticeTransferNavigationPlan
    );
    if (!resolvePracticeTransferPrecheck || !createPracticeTransferNavigationPlan) {
      return {
        opened: false,
        reason: "runtime-missing",
        openUrl: null
      };
    }

    var alertLike = asFunction(source.alertLike);
    var precheck = toRecord(resolvePracticeTransferPrecheck.call(runtime, { manager: source.manager || null }));
    var precheckBoard = precheck.board;
    if (!precheck.canOpen || !Array.isArray(precheckBoard)) {
      if (alertLike && precheck.alertMessage) {
        alertLike(precheck.alertMessage);
      }
      return {
        opened: false,
        reason: "precheck-failed",
        openUrl: null
      };
    }

    var plan = toRecord(
      createPracticeTransferNavigationPlan.call(runtime, {
        gameModeConfig:
          source.gameModeConfig && typeof source.gameModeConfig === "object"
            ? source.gameModeConfig
            : null,
        manager: source.manager || null,
        board: precheckBoard,
        localStorageLike: source.localStorageLike || null,
        sessionStorageLike: source.sessionStorageLike || null,
        localStorageKey: source.localStorageKey,
        sessionStorageKey: source.sessionStorageKey
      })
    );
    var openUrl = typeof plan.openUrl === "string" ? plan.openUrl : "";
    if (!openUrl) {
      if (alertLike) {
        alertLike(resolvePlanFailedMessage(source));
      }
      return {
        opened: false,
        reason: "plan-failed",
        openUrl: null
      };
    }

    var windowLike = toRecord(source.windowLike);
    var openTarget = isStandaloneAppWindow(windowLike) ? "_self" : "_blank";
    if (openTarget === "_self" && navigateCurrentWindow(windowLike, openUrl)) {
      return {
        opened: true,
        reason: "opened",
        openUrl: openUrl
      };
    }
    if (!openInTargetWindow(windowLike, openUrl, openTarget)) {
      return {
        opened: false,
        reason: "window-open-missing",
        openUrl: openUrl
      };
    }
    return {
      opened: true,
      reason: "opened",
      openUrl: openUrl
    };
  }

  global.CorePracticeTransferHostRuntime = global.CorePracticeTransferHostRuntime || {};
  global.CorePracticeTransferHostRuntime.applyPracticeTransferFromCurrent =
    applyPracticeTransferFromCurrent;
})(typeof window !== "undefined" ? window : undefined);
