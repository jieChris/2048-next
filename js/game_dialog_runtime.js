(function (global) {
  "use strict";

  if (!global || !global.document) return;
  if (global.GameDialog) return;

  var OVERLAY_ID = "game-dialog-overlay";
  var PANEL_ID = "game-dialog-panel";
  var TITLE_ID = "game-dialog-title";
  var MESSAGE_ID = "game-dialog-message";
  var INPUT_WRAP_ID = "game-dialog-input-wrap";
  var CONFIRM_ID = "game-dialog-confirm";
  var CANCEL_ID = "game-dialog-cancel";
  var activeState = null;
  var previousFocus = null;

  function toText(value) {
    return value == null ? "" : String(value);
  }

  function isEnglishDocument() {
    var lang = toText(global.document.documentElement && global.document.documentElement.lang).toLowerCase();
    return lang.indexOf("en") === 0;
  }

  function defaultTitle(kind) {
    var en = isEnglishDocument();
    if (kind === "danger") return en ? "Confirm Action" : "确认操作";
    if (kind === "prompt") return en ? "Input" : "输入";
    if (kind === "confirm") return en ? "Confirm" : "确认";
    return en ? "Notice" : "提示";
  }

  function defaultConfirmText(mode) {
    if (mode === "confirm") return isEnglishDocument() ? "Confirm" : "确认";
    return isEnglishDocument() ? "OK" : "确定";
  }

  function defaultCancelText() {
    return isEnglishDocument() ? "Cancel" : "取消";
  }

  function createButton(id, className) {
    var button = global.document.createElement("button");
    button.id = id;
    button.type = "button";
    button.className = className;
    return button;
  }

  function ensureDom() {
    var document = global.document;
    if (!document.body) return null;
    var overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = OVERLAY_ID;
      overlay.className = "game-dialog-overlay";
      overlay.style.display = "none";

      var panel = document.createElement("div");
      panel.id = PANEL_ID;
      panel.className = "game-dialog-panel";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-labelledby", TITLE_ID);
      panel.setAttribute("aria-describedby", MESSAGE_ID);

      var title = document.createElement("h3");
      title.id = TITLE_ID;
      title.className = "game-dialog-title";

      var message = document.createElement("div");
      message.id = MESSAGE_ID;
      message.className = "game-dialog-message";

      var inputWrap = document.createElement("div");
      inputWrap.id = INPUT_WRAP_ID;
      inputWrap.className = "game-dialog-input-wrap";

      var actions = document.createElement("div");
      actions.id = "game-dialog-actions";
      actions.className = "game-dialog-actions";

      var cancelButton = createButton(CANCEL_ID, "game-dialog-button game-dialog-button-secondary");
      var confirmButton = createButton(CONFIRM_ID, "game-dialog-button game-dialog-button-primary");

      actions.appendChild(cancelButton);
      actions.appendChild(confirmButton);
      panel.appendChild(title);
      panel.appendChild(message);
      panel.appendChild(inputWrap);
      panel.appendChild(actions);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
    }

    var dom = {
      overlay: overlay,
      title: document.getElementById(TITLE_ID),
      message: document.getElementById(MESSAGE_ID),
      inputWrap: document.getElementById(INPUT_WRAP_ID),
      confirmButton: document.getElementById(CONFIRM_ID),
      cancelButton: document.getElementById(CANCEL_ID)
    };
    if (!dom.title || !dom.message || !dom.inputWrap || !dom.confirmButton || !dom.cancelButton) return null;
    return dom;
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function setMessageText(node, message) {
    var text = toText(message);
    var parts = text.split(/\r?\n/);
    clearChildren(node);
    for (var i = 0; i < parts.length; i += 1) {
      if (i > 0) node.appendChild(global.document.createElement("br"));
      node.appendChild(global.document.createTextNode(parts[i]));
    }
  }

  function close(value) {
    var dom = ensureDom();
    var state = activeState;
    activeState = null;
    if (dom) {
      dom.overlay.style.display = "none";
      dom.overlay.classList.remove("is-open", "is-danger", "is-prompt", "is-confirm", "is-info");
    }
    if (previousFocus && typeof previousFocus.focus === "function") {
      try {
        previousFocus.focus();
      } catch (_err) {}
    }
    previousFocus = null;
    if (state && typeof state.resolve === "function") state.resolve(value);
  }

  function normalizeKind(mode, kindLike) {
    var kind = toText(kindLike).trim() || (mode === "prompt" ? "prompt" : mode);
    if (kind === "danger" || kind === "prompt" || kind === "confirm" || kind === "info") return kind;
    return "info";
  }

  function open(mode, message, defaultValue, options) {
    var dom = ensureDom();
    if (!dom) {
      return Promise.resolve(mode === "confirm" ? false : mode === "prompt" ? null : undefined);
    }
    var opts = options && typeof options === "object" ? options : {};
    var kind = normalizeKind(mode, opts.kind);
    previousFocus = global.document.activeElement;
    dom.title.textContent = toText(opts.title).trim() || defaultTitle(kind);
    setMessageText(dom.message, message);
    clearChildren(dom.inputWrap);
    dom.inputWrap.style.display = mode === "prompt" ? "block" : "none";
    var input = null;
    if (mode === "prompt") {
      input = opts.multiline ? global.document.createElement("textarea") : global.document.createElement("input");
      input.className = "game-dialog-input";
      input.value = toText(defaultValue);
      input.setAttribute("placeholder", toText(opts.placeholder || ""));
      dom.inputWrap.appendChild(input);
    }
    dom.cancelButton.style.display = mode === "alert" ? "none" : "";
    dom.confirmButton.textContent = toText(opts.confirmText).trim() || defaultConfirmText(mode);
    dom.cancelButton.textContent = toText(opts.cancelText).trim() || defaultCancelText();
    dom.confirmButton.className = kind === "danger"
      ? "game-dialog-button game-dialog-button-danger"
      : "game-dialog-button game-dialog-button-primary";
    dom.overlay.className = "game-dialog-overlay is-open is-" + kind;
    dom.overlay.style.display = "flex";

    return new Promise(function (resolve) {
      activeState = { resolve: resolve, mode: mode, input: input };
      global.setTimeout(function () {
        try {
          (input || dom.confirmButton).focus();
        } catch (_err) {}
      }, 0);
    });
  }

  var runtime = {
    alert: function (message, options) {
      return open("alert", message, "", options).then(function () {});
    },
    confirm: function (message, options) {
      return open("confirm", message, "", options).then(function (value) {
        return value === true;
      });
    },
    prompt: function (message, defaultValue, options) {
      return open("prompt", message, defaultValue, options).then(function (value) {
        return typeof value === "string" ? value : null;
      });
    }
  };

  var dom = ensureDom();
  if (dom) {
    dom.confirmButton.addEventListener("click", function () {
      if (!activeState) return;
      if (activeState.mode === "prompt") {
        close(activeState.input ? activeState.input.value : "");
        return;
      }
      close(true);
    });
    dom.cancelButton.addEventListener("click", function () {
      close(activeState && activeState.mode === "confirm" ? false : null);
    });
    dom.overlay.addEventListener("click", function (event) {
      if (event.target !== dom.overlay || !activeState || activeState.mode === "alert") return;
      close(activeState.mode === "confirm" ? false : null);
    });
    dom.overlay.addEventListener("keydown", function (event) {
      if (!activeState) return;
      if (event.key === "Escape" && activeState.mode !== "alert") {
        event.preventDefault();
        close(activeState.mode === "confirm" ? false : null);
      }
      if (event.key === "Enter" && activeState.mode !== "prompt") {
        event.preventDefault();
        close(true);
      }
    });
  }

  global.GameDialog = runtime;
})(typeof window !== "undefined" ? window : undefined);
