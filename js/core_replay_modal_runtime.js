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

  function resolveGetElementById(input) {
    var source = toRecord(input);
    var documentLike = toRecord(source.documentLike);
    var sourceGetElementById = asFunction(source.getElementById);
    if (sourceGetElementById) {
      return sourceGetElementById;
    }

    var documentGetElementById = asFunction(documentLike.getElementById);
    return function (id) {
      return documentGetElementById ? documentGetElementById.call(documentLike, id) : null;
    };
  }

  function setDisplayStyle(target, display) {
    var record = toRecord(target);
    var style = toRecord(record.style);
    style.display = display;
  }

  function applyReplayModalOpen(input) {
    var source = toRecord(input);
    var getElementById = resolveGetElementById(source);
    var modal = toRecord(getElementById("replay-modal"));
    if (!Object.keys(modal).length) {
      return {
        opened: false
      };
    }

    var titleEl = toRecord(getElementById("replay-modal-title"));
    var textEl = toRecord(getElementById("replay-textarea"));
    var actionBtn = toRecord(getElementById("replay-action-btn"));
    var querySelector = asFunction(modal.querySelector);
    var closeBtn = toRecord(
      querySelector ? querySelector.call(modal, ".replay-button:not(#replay-action-btn)") : null
    );

    setDisplayStyle(modal, "flex");
    if (Object.keys(titleEl).length) {
      titleEl.textContent = source.title == null ? "" : String(source.title);
    }
    if (Object.keys(textEl).length) {
      textEl.value = source.content == null ? "" : String(source.content);
    }

    var actionCallback = asFunction(source.actionCallback);
    var actionName = source.actionName == null ? "" : String(source.actionName);
    if (Object.keys(actionBtn).length) {
      if (actionName) {
        setDisplayStyle(actionBtn, "inline-block");
        actionBtn.textContent = actionName;
        actionBtn.onclick = function () {
          if (!actionCallback) return undefined;
          var value = Object.keys(textEl).length ? textEl.value : "";
          return actionCallback(value);
        };
      } else {
        setDisplayStyle(actionBtn, "none");
        actionBtn.onclick = null;
      }
    }

    var closeCallback = asFunction(source.closeCallback);
    if (Object.keys(closeBtn).length && closeCallback) {
      closeBtn.onclick = closeCallback;
    }

    return {
      opened: true,
      hasActionButton: !!actionName
    };
  }

  function applyReplayModalClose(input) {
    var source = toRecord(input);
    var getElementById = resolveGetElementById(source);
    var modal = toRecord(getElementById("replay-modal"));
    if (!Object.keys(modal).length) {
      return {
        closed: false
      };
    }

    setDisplayStyle(modal, "none");
    return {
      closed: true
    };
  }

  function applySettingsModalOpen(input) {
    var source = toRecord(input);
    var getElementById = resolveGetElementById(source);
    var modal = toRecord(getElementById("settings-modal"));
    if (!Object.keys(modal).length) {
      return {
        opened: false
      };
    }

    setDisplayStyle(modal, "flex");
    return {
      opened: true
    };
  }

  function applySettingsModalClose(input) {
    var source = toRecord(input);
    var getElementById = resolveGetElementById(source);
    var modal = toRecord(getElementById("settings-modal"));
    if (!Object.keys(modal).length) {
      return {
        closed: false
      };
    }

    setDisplayStyle(modal, "none");
    return {
      closed: true
    };
  }

  global.CoreReplayModalRuntime = global.CoreReplayModalRuntime || {};
  global.CoreReplayModalRuntime.applyReplayModalOpen = applyReplayModalOpen;
  global.CoreReplayModalRuntime.applyReplayModalClose = applyReplayModalClose;
  global.CoreReplayModalRuntime.applySettingsModalOpen = applySettingsModalOpen;
  global.CoreReplayModalRuntime.applySettingsModalClose = applySettingsModalClose;
})(typeof window !== "undefined" ? window : undefined);
