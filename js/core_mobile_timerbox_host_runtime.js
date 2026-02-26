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

  function getElementById(getter, id) {
    var fn = asFunction(getter);
    if (!fn) return null;
    return fn(id);
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

  function hasClass(element, className) {
    var classList = toRecord(toRecord(element).classList);
    var contains = asFunction(classList.contains);
    return contains ? !!contains.call(classList, className) : false;
  }

  function applyMobileTimerboxToggleInit(input) {
    var source = toRecord(input);
    var isScopeFn = asFunction(source.isTimerboxMobileScope);
    var isScope = !!(isScopeFn && isScopeFn());
    if (!isScope) {
      return {
        isScope: false,
        hasToggle: false,
        hasTimerbox: false,
        didBindToggle: false,
        didRunSync: false
      };
    }

    var getById = source.getElementById;
    var toggleBtn = getElementById(getById, "timerbox-toggle-btn");
    var timerBox = getElementById(getById, "timerbox");
    if (!toggleBtn || !timerBox) {
      return {
        isScope: true,
        hasToggle: !!toggleBtn,
        hasTimerbox: !!timerBox,
        didBindToggle: false,
        didRunSync: false
      };
    }

    var syncMobileTimerboxUi = asFunction(source.syncMobileTimerboxUI);
    var requestResponsiveGameRelayout = asFunction(source.requestResponsiveGameRelayout);

    var toggleRecord = toRecord(toggleBtn);
    var didBindToggle = false;
    if (!toggleRecord.__mobileTimerboxBound) {
      toggleRecord.__mobileTimerboxBound = true;
      didBindToggle = bindListener(toggleBtn, "click", function (eventLike) {
        preventDefault(eventLike);
        if (syncMobileTimerboxUi) {
          syncMobileTimerboxUi({
            collapsed: hasClass(timerBox, "is-mobile-expanded"),
            persist: true
          });
        }
        if (requestResponsiveGameRelayout) {
          requestResponsiveGameRelayout();
        }
      });
    }

    invoke(source.syncMobileTopActionsPlacement);
    invoke(source.syncPracticeTopActionsPlacement);
    invoke(source.syncMobileUndoTopButtonAvailability);

    var didRunSync = false;
    if (syncMobileTimerboxUi) {
      syncMobileTimerboxUi();
      didRunSync = true;
    }

    return {
      isScope: true,
      hasToggle: true,
      hasTimerbox: true,
      didBindToggle: didBindToggle,
      didRunSync: didRunSync
    };
  }

  global.CoreMobileTimerboxHostRuntime = global.CoreMobileTimerboxHostRuntime || {};
  global.CoreMobileTimerboxHostRuntime.applyMobileTimerboxToggleInit =
    applyMobileTimerboxToggleInit;
})(typeof window !== "undefined" ? window : undefined);
