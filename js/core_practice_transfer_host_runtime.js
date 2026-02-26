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

  function readCookie(documentLike) {
    var doc = toRecord(documentLike);
    try {
      return typeof doc.cookie === "string" ? doc.cookie : "";
    } catch (_err) {
      return "";
    }
  }

  function readWindowName(windowLike) {
    var win = toRecord(windowLike);
    try {
      return typeof win.name === "string" ? win.name : "";
    } catch (_err) {
      return "";
    }
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
        guideShownKey: source.guideShownKey,
        guideSeenFlag: source.guideSeenFlag,
        cookie: readCookie(source.documentLike),
        windowName: readWindowName(source.windowLike),
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
    var openFn = asFunction(windowLike.open);
    if (!openFn) {
      return {
        opened: false,
        reason: "window-open-missing",
        openUrl: openUrl
      };
    }

    openFn.call(windowLike, openUrl, "_blank");
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
