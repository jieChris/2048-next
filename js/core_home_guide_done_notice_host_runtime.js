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

  function resolveText(value) {
    return value == null ? "" : String(value);
  }

  function resolveDelayMs(value) {
    var parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
    return 1200;
  }

  function getElementById(documentLike, id) {
    var getter = asFunction(toRecord(documentLike).getElementById);
    if (!getter) return null;
    return getter.call(documentLike, id);
  }

  function createElement(documentLike, tagName) {
    var creator = asFunction(toRecord(documentLike).createElement);
    if (!creator) return null;
    return creator.call(documentLike, tagName);
  }

  function appendChild(node, child) {
    var append = asFunction(toRecord(node).appendChild);
    if (!append) return;
    append.call(node, child);
  }

  function applyHomeGuideDoneNotice(input) {
    var source = toRecord(input);
    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var resolveHomeGuideDoneNotice = asFunction(homeGuideRuntime.resolveHomeGuideDoneNotice);
    var resolveHomeGuideDoneNoticeStyle = asFunction(homeGuideRuntime.resolveHomeGuideDoneNoticeStyle);
    var setTimeoutLike = asFunction(source.setTimeoutLike);
    var clearTimeoutLike = asFunction(source.clearTimeoutLike);

    if (!resolveHomeGuideDoneNotice || !resolveHomeGuideDoneNoticeStyle || !setTimeoutLike) {
      return {
        shown: false,
        created: false,
        hideDelayMs: 1200
      };
    }

    var documentLike = toRecord(source.documentLike);
    var toast = getElementById(documentLike, "home-guide-done-toast");
    var created = false;
    if (!toast) {
      toast = createElement(documentLike, "div");
      if (!toast) {
        return {
          shown: false,
          created: false,
          hideDelayMs: 1200
        };
      }
      var toastRecord_1 = toRecord(toast);
      toastRecord_1.id = "home-guide-done-toast";

      var toastStyle = toRecord(resolveHomeGuideDoneNoticeStyle());
      var inlineStyle_1 = toRecord(toastRecord_1.style);
      for (var key in toastStyle) {
        if (!Object.prototype.hasOwnProperty.call(toastStyle, key)) continue;
        inlineStyle_1[key] = toastStyle[key];
      }
      toastRecord_1.style = inlineStyle_1;
      appendChild(documentLike.body, toast);
      created = true;
    }

    var toastRecord = toRecord(toast);
    var doneNotice = toRecord(resolveHomeGuideDoneNotice({}));
    toastRecord.textContent = resolveText(doneNotice.message);
    var inlineStyle = toRecord(toastRecord.style);
    inlineStyle.opacity = "1";
    toastRecord.style = inlineStyle;

    var previousTimer = toastRecord.__hideTimer;
    if (previousTimer && clearTimeoutLike) {
      clearTimeoutLike(previousTimer);
    }

    var hideDelayMs = resolveDelayMs(doneNotice.hideDelayMs);
    var hideTimer = setTimeoutLike(function () {
      var style = toRecord(toRecord(toast).style);
      style.opacity = "0";
      toRecord(toast).style = style;
    }, hideDelayMs);
    toastRecord.__hideTimer = hideTimer;

    return {
      shown: true,
      created: created,
      hideDelayMs: hideDelayMs
    };
  }

  global.CoreHomeGuideDoneNoticeHostRuntime = global.CoreHomeGuideDoneNoticeHostRuntime || {};
  global.CoreHomeGuideDoneNoticeHostRuntime.applyHomeGuideDoneNotice = applyHomeGuideDoneNotice;
})(typeof window !== "undefined" ? window : undefined);
