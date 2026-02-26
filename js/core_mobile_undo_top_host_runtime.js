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

  function invoke(callback) {
    var fn = asFunction(callback);
    if (!fn) return false;
    fn();
    return true;
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function preventDefault(eventLike) {
    var prevent = asFunction(toRecord(eventLike).preventDefault);
    if (!prevent) return;
    prevent.call(eventLike);
  }

  function applyMobileUndoTopInit(input) {
    var source = toRecord(input);
    var isGamePageScope = asFunction(source.isGamePageScope);
    var inScope = !!(isGamePageScope && isGamePageScope());
    if (!inScope) {
      return {
        isScope: false,
        hasButton: false,
        didBindButton: false,
        didRunSync: false
      };
    }

    var ensureButton = asFunction(source.ensureMobileUndoTopButton);
    var button = ensureButton ? ensureButton() : null;
    if (!button) {
      return {
        isScope: true,
        hasButton: false,
        didBindButton: false,
        didRunSync: false
      };
    }

    var tryUndoFromUi = asFunction(source.tryUndoFromUi);

    var buttonRecord = toRecord(button);
    var didBindButton = false;
    if (!buttonRecord.__mobileUndoBound) {
      buttonRecord.__mobileUndoBound = true;
      didBindButton = bindListener(button, "click", function (eventLike) {
        preventDefault(eventLike);
        if (tryUndoFromUi) {
          tryUndoFromUi();
        }
      });
    }

    var didRunSync = invoke(source.syncMobileUndoTopButtonAvailability);

    return {
      isScope: true,
      hasButton: true,
      didBindButton: didBindButton,
      didRunSync: didRunSync
    };
  }

  global.CoreMobileUndoTopHostRuntime = global.CoreMobileUndoTopHostRuntime || {};
  global.CoreMobileUndoTopHostRuntime.applyMobileUndoTopInit = applyMobileUndoTopInit;
})(typeof window !== "undefined" ? window : undefined);
