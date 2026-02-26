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

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function preventDefault(event) {
    var eventLike = toRecord(event);
    var preventDefaultFn = asFunction(eventLike.preventDefault);
    if (preventDefaultFn) {
      preventDefaultFn.call(eventLike);
    }
  }

  function bindClickWithPreventDefault(getElementById, elementId, action) {
    if (!action) return false;
    var element = getElementById(elementId);
    return bindListener(element, "click", function (event) {
      preventDefault(event);
      action();
    });
  }

  function applyTopActionBindings(input) {
    var source = toRecord(input);
    var getElementById = asFunction(source.getElementById);
    if (!getElementById) {
      return {
        didBind: false,
        boundControlCount: 0
      };
    }

    var tryUndo = asFunction(source.tryUndo);
    var exportReplay = asFunction(source.exportReplay);
    var openPracticeBoardFromCurrent = asFunction(source.openPracticeBoardFromCurrent);
    var openSettingsModal = asFunction(source.openSettingsModal);
    var closeSettingsModal = asFunction(source.closeSettingsModal);

    var boundControlCount = 0;
    if (bindClickWithPreventDefault(getElementById, "undo-link", tryUndo)) {
      boundControlCount += 1;
    }
    if (bindClickWithPreventDefault(getElementById, "top-export-replay-btn", exportReplay)) {
      boundControlCount += 1;
    }
    if (bindClickWithPreventDefault(getElementById, "top-practice-btn", openPracticeBoardFromCurrent)) {
      boundControlCount += 1;
    }
    if (bindClickWithPreventDefault(getElementById, "practice-mobile-undo-btn", tryUndo)) {
      boundControlCount += 1;
    }
    if (bindClickWithPreventDefault(getElementById, "top-settings-btn", openSettingsModal)) {
      boundControlCount += 1;
    }
    if (bindClickWithPreventDefault(getElementById, "settings-close-btn", closeSettingsModal)) {
      boundControlCount += 1;
    }

    var settingsModal = getElementById("settings-modal");
    if (
      closeSettingsModal &&
      bindListener(settingsModal, "click", function (event) {
        if (toRecord(event).target === settingsModal) {
          closeSettingsModal();
        }
      })
    ) {
      boundControlCount += 1;
    }

    return {
      didBind: boundControlCount > 0,
      boundControlCount: boundControlCount
    };
  }

  global.CoreTopActionBindingsHostRuntime = global.CoreTopActionBindingsHostRuntime || {};
  global.CoreTopActionBindingsHostRuntime.applyTopActionBindings = applyTopActionBindings;
})(typeof window !== "undefined" ? window : undefined);
