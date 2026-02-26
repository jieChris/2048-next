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

  function bindListener(element, eventName, handler, options) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler, options);
    return true;
  }

  function preventDefault(event) {
    var eventLike = toRecord(event);
    var preventDefaultFn = asFunction(eventLike.preventDefault);
    if (preventDefaultFn) {
      preventDefaultFn.call(eventLike);
    }
  }

  function resolveNowMs(input) {
    var customNow = asFunction(input.nowMs);
    if (customNow) {
      return function () {
        var value = Number(customNow());
        return Number.isFinite(value) ? value : 0;
      };
    }
    return function () {
      return Date.now();
    };
  }

  function resolveTouchGuardWindowMs(input) {
    var raw = Number(input.touchGuardWindowMs);
    if (Number.isFinite(raw) && raw >= 0) {
      return raw;
    }
    return 450;
  }

  function bindGameOverUndoControl(input) {
    var source = toRecord(input);
    var getElementById = asFunction(source.getElementById);
    var tryUndo = asFunction(source.tryUndo);
    if (!getElementById || !tryUndo) {
      return {
        didBind: false,
        boundControlCount: 0
      };
    }

    var control = getElementById("undo-btn-gameover");
    if (!control) {
      return {
        didBind: false,
        boundControlCount: 0
      };
    }

    var nowMs = resolveNowMs(source);
    var touchGuardWindowMs = resolveTouchGuardWindowMs(source);
    var lastUndoTouchAt = 0;

    function handleGameOverUndo(event, fromTouch) {
      preventDefault(event);
      var now = nowMs();
      if (!fromTouch && now - lastUndoTouchAt < touchGuardWindowMs) return;
      if (fromTouch) {
        lastUndoTouchAt = now;
      }
      tryUndo();
    }

    var boundControlCount = 0;
    if (
      bindListener(control, "click", function (event) {
        handleGameOverUndo(event, false);
      })
    ) {
      boundControlCount += 1;
    }
    if (
      bindListener(
        control,
        "touchend",
        function (event) {
          handleGameOverUndo(event, true);
        },
        { passive: false }
      )
    ) {
      boundControlCount += 1;
    }

    return {
      didBind: boundControlCount > 0,
      boundControlCount: boundControlCount
    };
  }

  global.CoreGameOverUndoHostRuntime = global.CoreGameOverUndoHostRuntime || {};
  global.CoreGameOverUndoHostRuntime.bindGameOverUndoControl = bindGameOverUndoControl;
})(typeof window !== "undefined" ? window : undefined);
