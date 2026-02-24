(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_HOST_SELECTOR = ".top-action-buttons";
  var DEFAULT_UNDO_BUTTON_ID = "top-mobile-undo-btn";
  var DEFAULT_UNDO_CLASS_NAME = "top-action-btn mobile-undo-top-btn";
  var DEFAULT_UNDO_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>';
  var DEFAULT_HINT_BUTTON_ID = "top-mobile-hint-btn";
  var DEFAULT_HINT_CLASS_NAME = "top-action-btn mobile-hint-toggle-btn";
  var DEFAULT_HINT_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>';
  var DEFAULT_SETTINGS_BUTTON_ID = "top-settings-btn";

  function asParent(node) {
    if (!node || typeof node !== "object") return null;
    if (typeof node.appendChild !== "function" || typeof node.insertBefore !== "function") return null;
    return node;
  }

  function querySelector(doc, selector) {
    if (!doc || typeof doc.querySelector !== "function") return null;
    try {
      return doc.querySelector(selector);
    } catch (_err) {
      return null;
    }
  }

  function appendChild(parent, node) {
    var host = asParent(parent);
    if (!host) return false;
    try {
      host.appendChild(node);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function insertBefore(parent, node, reference) {
    var host = asParent(parent);
    if (!host) return false;
    try {
      host.insertBefore(node, reference);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function resolveString(value, fallback) {
    return typeof value === "string" && value ? value : fallback;
  }

  function ensureAnchorButton(doc, buttonId, buttonClassName, iconSvg) {
    var btn = doc.getElementById(buttonId);
    if (!btn) {
      btn = doc.createElement("a");
      btn.id = buttonId;
      btn.className = buttonClassName;
      btn.href = "#";
      btn.innerHTML = iconSvg;
    }
    return btn;
  }

  function ensureMobileUndoTopButtonDom(options) {
    var opts = options || {};
    if (!opts.isGamePageScope) return null;
    var doc = opts.documentLike || null;
    if (!doc) return null;

    var host = querySelector(doc, resolveString(opts.hostSelector, DEFAULT_HOST_SELECTOR));
    if (!host) return null;

    var btn = ensureAnchorButton(
      doc,
      resolveString(opts.buttonId, DEFAULT_UNDO_BUTTON_ID),
      resolveString(opts.buttonClassName, DEFAULT_UNDO_CLASS_NAME),
      resolveString(opts.iconSvg, DEFAULT_UNDO_ICON_SVG)
    );

    var hostParent = asParent(host);
    if (!hostParent) return null;
    if (btn.parentNode !== host || hostParent.lastElementChild !== btn) {
      appendChild(host, btn);
    }
    return btn;
  }

  function ensureMobileHintToggleButtonDom(options) {
    var opts = options || {};
    if (!opts.isGamePageScope) return null;
    var doc = opts.documentLike || null;
    if (!doc) return null;

    var host = querySelector(doc, resolveString(opts.hostSelector, DEFAULT_HOST_SELECTOR));
    if (!host) return null;

    var btn = ensureAnchorButton(
      doc,
      resolveString(opts.buttonId, DEFAULT_HINT_BUTTON_ID),
      resolveString(opts.buttonClassName, DEFAULT_HINT_CLASS_NAME),
      resolveString(opts.iconSvg, DEFAULT_HINT_ICON_SVG)
    );

    var settingsBtn = doc.getElementById(resolveString(opts.settingsButtonId, DEFAULT_SETTINGS_BUTTON_ID));
    if (settingsBtn && settingsBtn.parentNode === host) {
      if (btn.parentNode !== host || btn.nextSibling !== settingsBtn) {
        insertBefore(host, btn, settingsBtn);
      }
    } else if (btn.parentNode !== host) {
      appendChild(host, btn);
    }
    return btn;
  }

  global.CoreMobileTopButtonsRuntime = global.CoreMobileTopButtonsRuntime || {};
  global.CoreMobileTopButtonsRuntime.ensureMobileUndoTopButtonDom = ensureMobileUndoTopButtonDom;
  global.CoreMobileTopButtonsRuntime.ensureMobileHintToggleButtonDom = ensureMobileHintToggleButtonDom;
})(typeof window !== "undefined" ? window : undefined);
