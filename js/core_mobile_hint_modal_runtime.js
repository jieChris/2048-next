(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_OVERLAY_ID = "mobile-hint-overlay";
  var DEFAULT_BODY_ID = "mobile-hint-body";
  var DEFAULT_CLOSE_BUTTON_ID = "mobile-hint-close";
  var DEFAULT_OVERLAY_CLASS_NAME = "replay-modal-overlay mobile-hint-overlay";
  var DEFAULT_CONTENT_CLASS_NAME = "replay-modal-content mobile-hint-modal-content";
  var DEFAULT_BODY_CLASS_NAME = "mobile-hint-body";
  var DEFAULT_TITLE_TEXT = "玩法提示";
  var DEFAULT_CLOSE_BUTTON_TEXT = "关闭";

  function resolveString(value, fallback) {
    return typeof value === "string" && value ? value : fallback;
  }

  function appendChild(parent, child) {
    if (!parent || !child || typeof parent.appendChild !== "function") return;
    try {
      parent.appendChild(child);
    } catch (_err) {}
  }

  function ensureStyle(element) {
    if (!element.style) {
      element.style = {};
    }
    return element.style;
  }

  function createModalTree(doc, overlay, options) {
    var content = doc.createElement("div");
    content.className = options.contentClassName;

    var title = doc.createElement("h3");
    title.textContent = options.titleText;
    appendChild(content, title);

    var body = doc.createElement("div");
    body.id = options.bodyId;
    body.className = options.bodyClassName;
    appendChild(content, body);

    var actions = doc.createElement("div");
    actions.className = "replay-modal-actions";
    appendChild(content, actions);

    var closeButton = doc.createElement("button");
    closeButton.id = options.closeButtonId;
    closeButton.className = "replay-button";
    closeButton.textContent = options.closeButtonText;
    appendChild(actions, closeButton);

    appendChild(overlay, content);
    return { overlay: overlay, body: body, closeButton: closeButton };
  }

  function bindCloseBehavior(overlay, closeButton) {
    if (!overlay.__mobileHintBound && typeof overlay.addEventListener === "function") {
      overlay.__mobileHintBound = true;
      overlay.addEventListener("click", function (event) {
        if (event && event.target === overlay) {
          ensureStyle(overlay).display = "none";
        }
      });
    }

    if (!closeButton.__mobileHintBound && typeof closeButton.addEventListener === "function") {
      closeButton.__mobileHintBound = true;
      closeButton.addEventListener("click", function () {
        ensureStyle(overlay).display = "none";
      });
    }
  }

  function ensureMobileHintModalDom(options) {
    var opts = options || {};
    if (!opts.isGamePageScope) return null;
    var doc = opts.documentLike || null;
    if (!doc || !doc.body) return null;

    var overlayId = resolveString(opts.overlayId, DEFAULT_OVERLAY_ID);
    var bodyId = resolveString(opts.bodyId, DEFAULT_BODY_ID);
    var closeButtonId = resolveString(opts.closeButtonId, DEFAULT_CLOSE_BUTTON_ID);
    var overlayClassName = resolveString(opts.overlayClassName, DEFAULT_OVERLAY_CLASS_NAME);
    var contentClassName = resolveString(opts.contentClassName, DEFAULT_CONTENT_CLASS_NAME);
    var bodyClassName = resolveString(opts.bodyClassName, DEFAULT_BODY_CLASS_NAME);
    var titleText = resolveString(opts.titleText, DEFAULT_TITLE_TEXT);
    var closeButtonText = resolveString(opts.closeButtonText, DEFAULT_CLOSE_BUTTON_TEXT);

    var overlay = doc.getElementById(overlayId);
    if (!overlay) {
      overlay = doc.createElement("div");
      overlay.id = overlayId;
      overlay.className = overlayClassName;
      ensureStyle(overlay).display = "none";
      appendChild(doc.body, overlay);
    }

    var body = doc.getElementById(bodyId);
    var closeButton = doc.getElementById(closeButtonId);
    if (!body || !closeButton) {
      var created = createModalTree(doc, overlay, {
        bodyId: bodyId,
        closeButtonId: closeButtonId,
        contentClassName: contentClassName,
        bodyClassName: bodyClassName,
        titleText: titleText,
        closeButtonText: closeButtonText
      });
      body = created.body;
      closeButton = created.closeButton;
    }

    bindCloseBehavior(overlay, closeButton);
    return { overlay: overlay, body: body, closeButton: closeButton };
  }

  global.CoreMobileHintModalRuntime = global.CoreMobileHintModalRuntime || {};
  global.CoreMobileHintModalRuntime.ensureMobileHintModalDom = ensureMobileHintModalDom;
})(typeof window !== "undefined" ? window : undefined);
