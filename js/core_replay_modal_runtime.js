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

  var HIDDEN_CLASS_NAME = "is-hidden";

  function hasClassName(target, className) {
    var record = toRecord(target);
    var classList = toRecord(record.classList);
    var contains = asFunction(classList.contains);
    if (contains) return !!contains.call(classList, className);
    var current = typeof record.className === "string" ? record.className : "";
    return (" " + current + " ").indexOf(" " + className + " ") >= 0;
  }

  function addClassName(target, className) {
    var record = toRecord(target);
    var classList = toRecord(record.classList);
    var add = asFunction(classList.add);
    if (add) {
      add.call(classList, className);
      return true;
    }
    if (typeof record.className !== "string") return false;
    if (hasClassName(record, className)) return true;
    var current = record.className.trim();
    record.className = current ? current + " " + className : className;
    return true;
  }

  function removeClassName(target, className) {
    var record = toRecord(target);
    var classList = toRecord(record.classList);
    var remove = asFunction(classList.remove);
    if (remove) {
      remove.call(classList, className);
      return true;
    }
    if (typeof record.className !== "string") return false;
    if (!hasClassName(record, className)) return true;
    record.className = record.className
      .split(/\s+/)
      .filter(function (name) {
        return name && name !== className;
      })
      .join(" ");
    return true;
  }

  function setHiddenState(target, hidden, fallbackVisibleDisplay) {
    var record = toRecord(target);
    var didUpdateClass = hidden
      ? addClassName(record, HIDDEN_CLASS_NAME)
      : removeClassName(record, HIDDEN_CLASS_NAME);
    var style = toRecord(record.style);
    if (didUpdateClass) {
      if (!hidden && style.display === "none") {
        style.display = "";
      }
      return;
    }
    style.display = hidden ? "none" : fallbackVisibleDisplay;
  }

  function bindModalOverlayClose(modalNode, closeCallback) {
    var modal = toRecord(modalNode);
    if (!closeCallback) {
      modal.onclick = null;
      return;
    }
    modal.onclick = function (eventLike) {
      var eventRecord = toRecord(eventLike);
      if (eventRecord.target && eventRecord.target !== modalNode) return undefined;
      return closeCallback();
    };
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
    var downloadBtn = getElementById("replay-download-btn");
    var openPageBtn = getElementById("replay-open-page-btn");
    var closeBtn = getElementById("replay-close-btn");

    setHiddenState(modal, false, "flex");
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
        setHiddenState(actionBtnRecord, false, "inline-block");
        actionBtnRecord.textContent = actionName;
        actionBtnRecord.onclick = function () {
          if (!actionCallback) return undefined;
          var value = textEl ? toRecord(textEl).value : "";
          return actionCallback(value);
        };
      } else {
        setHiddenState(actionBtnRecord, true, "inline-block");
        actionBtnRecord.onclick = null;
      }
    }

    if (downloadBtn) {
      var downloadBtnRecord = toRecord(downloadBtn);
      setHiddenState(downloadBtnRecord, true, "inline-block");
      downloadBtnRecord.onclick = null;
    }

    if (openPageBtn) {
      var openPageBtnRecord = toRecord(openPageBtn);
      setHiddenState(openPageBtnRecord, true, "inline-block");
      openPageBtnRecord.onclick = null;
    }

    var closeCallback = asFunction(source.closeCallback);
    bindModalOverlayClose(modalNode, closeCallback);
    if (closeBtn) {
      toRecord(closeBtn).onclick = closeCallback || null;
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

    setHiddenState(modal, true, "flex");
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

    setHiddenState(modal, false, "flex");
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

    setHiddenState(modal, true, "flex");
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
