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

  function applyMobileHintToggleInit(input) {
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

    var ensureButton = asFunction(source.ensureMobileHintToggleButton);
    var button = ensureButton ? ensureButton() : null;
    if (!button) {
      return {
        isScope: true,
        hasButton: false,
        didBindButton: false,
        didRunSync: false
      };
    }

    var openMobileHintModal = asFunction(source.openMobileHintModal);

    var buttonRecord = toRecord(button);
    var didBindButton = false;
    if (!buttonRecord.__mobileHintBound) {
      buttonRecord.__mobileHintBound = true;
      didBindButton = bindListener(button, "click", function (eventLike) {
        preventDefault(eventLike);
        if (openMobileHintModal) {
          openMobileHintModal();
        }
      });
    }

    var didRunSync = invoke(source.syncMobileHintUI);

    return {
      isScope: true,
      hasButton: true,
      didBindButton: didBindButton,
      didRunSync: didRunSync
    };
  }

  global.CoreMobileHintHostRuntime = global.CoreMobileHintHostRuntime || {};
  global.CoreMobileHintHostRuntime.applyMobileHintToggleInit = applyMobileHintToggleInit;
})(typeof window !== "undefined" ? window : undefined);
