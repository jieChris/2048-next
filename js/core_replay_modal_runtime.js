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
    var modalNode = getElementById("replay-modal");
    if (!modalNode) {
      return {
        opened: false
      };
    }
    var modal = toRecord(modalNode);

    var titleEl = getElementById("replay-modal-title");
    var textEl = getElementById("replay-textarea");
    var actionBtn = getElementById("replay-action-btn");
    var querySelector = asFunction(modal.querySelector);
    var closeBtn = (
      querySelector ? querySelector.call(modal, ".replay-button:not(#replay-action-btn)") : null
    );

    setDisplayStyle(modal, "flex");
    if (titleEl) {
      toRecord(titleEl).textContent = source.title == null ? "" : String(source.title);
    }
    if (textEl) {
      toRecord(textEl).value = source.content == null ? "" : String(source.content);
    }

    var actionCallback = asFunction(source.actionCallback);
    var actionName = source.actionName == null ? "" : String(source.actionName);
    if (actionBtn) {
      var actionBtnRecord = toRecord(actionBtn);
      if (actionName) {
        setDisplayStyle(actionBtnRecord, "inline-block");
        actionBtnRecord.textContent = actionName;
        actionBtnRecord.onclick = function () {
          if (!actionCallback) return undefined;
          var value = textEl ? toRecord(textEl).value : "";
          return actionCallback(value);
        };
      } else {
        setDisplayStyle(actionBtnRecord, "none");
        actionBtnRecord.onclick = null;
      }
    }

    var closeCallback = asFunction(source.closeCallback);
    if (closeBtn && closeCallback) {
      toRecord(closeBtn).onclick = closeCallback;
    }

    return {
      opened: true,
      hasActionButton: !!actionName
    };
  }

  function applyReplayModalClose(input) {
    var source = toRecord(input);
    var getElementById = resolveGetElementById(source);
    var modalNode = getElementById("replay-modal");
    if (!modalNode) {
      return {
        closed: false
      };
    }
    var modal = toRecord(modalNode);

    setDisplayStyle(modal, "none");
    return {
      closed: true
    };
  }

  function applySettingsModalOpen(input) {
    var source = toRecord(input);
    var getElementById = resolveGetElementById(source);
    var modalNode = getElementById("settings-modal");
    if (!modalNode) {
      return {
        opened: false
      };
    }
    var modal = toRecord(modalNode);

    setDisplayStyle(modal, "flex");
    return {
      opened: true
    };
  }

  function applySettingsModalClose(input) {
    var source = toRecord(input);
    var getElementById = resolveGetElementById(source);
    var modalNode = getElementById("settings-modal");
    if (!modalNode) {
      return {
        closed: false
      };
    }
    var modal = toRecord(modalNode);

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
