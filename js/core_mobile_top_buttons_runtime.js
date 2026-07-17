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
  var DEFAULT_EXPAND_BUTTON_ID = "top-actions-expand-toggle";
  var DEFAULT_EXPAND_CLASS_NAME = "top-action-btn mobile-actions-expand-toggle";
  var MOBILE_BREAKPOINT_QUERY = "(max-width: 980px)";
  var MOBILE_TABLET_MAX_WIDTH = 1366;
  var MOBILE_EXPANDED_ATTR = "data-mobile-actions-expanded";
  var TOP_BUTTON_STYLE_ATTR = "data-top-button-style";
  var MODE_ID_ATTR = "data-mode-id";
  var MODE_TEXT = "text";
  var EXPAND_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>';
  var COLLAPSE_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M8 12h8"></path></svg>';
  var TOP_ICON_HTML_ATTR = "data-top-btn-icon-html";

  var PRIMARY_BUTTON_ID_SET = {
    "stats-panel-toggle": true,
    "top-practice-btn": true,
    "top-settings-btn": true,
    "top-restart-btn": true,
    "timerbox-toggle-btn": true,
    "top-actions-expand-toggle": true
  };

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

  function isCompactViewport() {
    var matchMedia = global.matchMedia;
    if (typeof matchMedia === "function") {
      try {
        if ((matchMedia.call(global, MOBILE_BREAKPOINT_QUERY) || {}).matches) return true;
      } catch (_err) {}
    }
    var width = Number(global.innerWidth);
    if (!Number.isFinite(width)) return false;
    if (width <= 980) return true;
    if (width > MOBILE_TABLET_MAX_WIDTH) return false;
    if (typeof matchMedia !== "function") return false;
    try {
      return !!(
        (matchMedia.call(global, "(pointer: coarse)") || {}).matches ||
        (matchMedia.call(global, "(hover: none)") || {}).matches
      );
    } catch (_err2) {
      return false;
    }
  }

  function getBody(doc) {
    if (!doc || !doc.body) return null;
    return doc.body;
  }

  function readExpandedState(doc) {
    var body = getBody(doc);
    if (!body || typeof body.getAttribute !== "function") return false;
    return String(body.getAttribute(MOBILE_EXPANDED_ATTR) || "") === "1";
  }

  function setExpandedState(doc, expanded) {
    var body = getBody(doc);
    if (!body || typeof body.setAttribute !== "function") return;
    body.setAttribute(MOBILE_EXPANDED_ATTR, expanded ? "1" : "0");
  }

  function hasClass(node, className) {
    if (!node) return false;
    var current = typeof node.className === "string" ? node.className : "";
    return (" " + current + " ").indexOf(" " + className + " ") >= 0;
  }

  function addClass(node, className) {
    if (!node || hasClass(node, className)) return;
    var current = typeof node.className === "string" ? node.className.trim() : "";
    node.className = current ? current + " " + className : className;
  }

  function removeClass(node, className) {
    if (!node || !hasClass(node, className)) return;
    var current = typeof node.className === "string" ? node.className : "";
    var names = current.split(/\s+/);
    var kept = [];
    for (var i = 0; i < names.length; i += 1) {
      if (names[i] && names[i] !== className) kept.push(names[i]);
    }
    node.className = kept.join(" ");
  }

  function resolveUiLanguage(doc) {
    try {
      var root = doc && doc.documentElement ? doc.documentElement : null;
      if (root && typeof root.getAttribute === "function") {
        var byData = String(root.getAttribute("data-ui-lang") || "").trim().toLowerCase();
        if (byData.indexOf("en") === 0) return "en";
        var byLang = String(root.getAttribute("lang") || "").trim().toLowerCase();
        if (byLang.indexOf("en") === 0) return "en";
      }
    } catch (_err) {}
    return "zh";
  }

  function resolveTopButtonStyleMode(doc) {
    var body = getBody(doc);
    if (!body || typeof body.getAttribute !== "function") return "icon";
    var mode = String(body.getAttribute(TOP_BUTTON_STYLE_ATTR) || "").trim().toLowerCase();
    return mode === MODE_TEXT ? "text" : "icon";
  }

  function resolveModeId(doc) {
    var body = getBody(doc);
    if (!body || typeof body.getAttribute !== "function") return "";
    return String(body.getAttribute(MODE_ID_ATTR) || "").trim().toLowerCase();
  }

  function isUndoPreferredPrimaryMode(doc) {
    var modeId = resolveModeId(doc);
    if (!modeId) return false;
    if (modeId.indexOf("no_undo") >= 0 || modeId.indexOf("no-undo") >= 0) return false;
    if (modeId.indexOf("capped") >= 0) return false;
    return modeId.indexOf("undo") >= 0;
  }

  function resolveExpandButtonLabel(doc, expanded) {
    var lang = resolveUiLanguage(doc);
    if (lang === "en") return expanded ? "Collapse" : "Expand";
    return expanded ? "\u6536\u8d77" : "\u5c55\u5f00";
  }

  function applyExpandButtonText(btn, doc) {
    if (!btn) return;
    var expanded = readExpandedState(doc);
    var label = resolveExpandButtonLabel(doc, expanded);
    var mode = resolveTopButtonStyleMode(doc);
    if (mode === "text") {
      btn.textContent = label;
    } else {
      var icon = expanded ? COLLAPSE_ICON_SVG : EXPAND_ICON_SVG;
      if (typeof btn.innerHTML !== "string" || btn.innerHTML !== icon) {
        btn.innerHTML = icon;
      }
      if (typeof btn.setAttribute === "function") {
        btn.setAttribute(TOP_ICON_HTML_ATTR, icon);
      }
    }
    if (typeof btn.setAttribute === "function") {
      btn.setAttribute("title", label);
      btn.setAttribute("aria-label", label);
      btn.setAttribute("aria-expanded", expanded ? "true" : "false");
    }
  }

  function collectHostButtons(host) {
    var parent = asParent(host);
    var children = parent && parent.children;
    if (!parent || !children || typeof children.length !== "number") return [];
    var result = [];
    for (var i = 0; i < children.length; i += 1) {
      var child = children[i];
      if (!child || typeof child !== "object") continue;
      result.push(child);
    }
    return result;
  }

  function isPrimaryTopButton(node, doc) {
    if (!node) return false;
    var id = typeof node.id === "string" ? node.id : "";
    if (id === "timerbox-toggle-btn") return !isUndoPreferredPrimaryMode(doc);
    if (id === "top-mobile-undo-btn") return isUndoPreferredPrimaryMode(doc);
    if (id && PRIMARY_BUTTON_ID_SET[id]) return true;
    var className = typeof node.className === "string" ? node.className : "";
    if (className.indexOf("mobile-undo-top-btn") >= 0) return isUndoPreferredPrimaryMode(doc);
    if (className.indexOf("timerbox-toggle-btn") >= 0) return !isUndoPreferredPrimaryMode(doc);
    if (className.indexOf("restart-button") >= 0) return true;
    return false;
  }

  function syncMobileActionButtonClasses(host, doc) {
    var buttons = collectHostButtons(host);
    for (var i = 0; i < buttons.length; i += 1) {
      var button = buttons[i];
      if (button.id === "top-mode-intro-btn" && button.style && button.style.display === "none") {
        removeClass(button, "mobile-actions-primary");
        removeClass(button, "mobile-actions-collapse-target");
        continue;
      }
      if (isPrimaryTopButton(button, doc)) {
        addClass(button, "mobile-actions-primary");
        removeClass(button, "mobile-actions-collapse-target");
      } else {
        addClass(button, "mobile-actions-collapse-target");
        removeClass(button, "mobile-actions-primary");
      }
    }
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

  function ensureMobileExpandToggleButtonDom(options) {
    var opts = options || {};
    if (!opts.isGamePageScope) return null;
    var doc = opts.documentLike || null;
    if (!doc) return null;

    var host = querySelector(doc, resolveString(opts.hostSelector, DEFAULT_HOST_SELECTOR));
    if (!host) return null;

    if (!isCompactViewport()) {
      setExpandedState(doc, false);
      var existingDesktopBtn = doc.getElementById(DEFAULT_EXPAND_BUTTON_ID);
      if (existingDesktopBtn && existingDesktopBtn.style) {
        existingDesktopBtn.style.display = "none";
      }
      if (existingDesktopBtn && typeof existingDesktopBtn.setAttribute === "function") {
        existingDesktopBtn.setAttribute("aria-hidden", "true");
      }
      syncMobileActionButtonClasses(host, doc);
      return null;
    }

    var btn = ensureAnchorButton(
      doc,
      DEFAULT_EXPAND_BUTTON_ID,
      DEFAULT_EXPAND_CLASS_NAME,
      ""
    );
    if (btn.style) btn.style.display = "";
    if (typeof btn.setAttribute === "function") {
      btn.setAttribute("aria-hidden", "false");
    }
    if (btn.parentNode !== host) appendChild(host, btn);

    if (!btn.__mobileActionsToggleBound && typeof btn.addEventListener === "function") {
      btn.__mobileActionsToggleBound = true;
      btn.addEventListener("click", function (event) {
        if (event && typeof event.preventDefault === "function") event.preventDefault();
        var nextExpanded = !readExpandedState(doc);
        setExpandedState(doc, nextExpanded);
        applyExpandButtonText(btn, doc);
      });
    }

    if (!btn.__mobileActionsLangBound && typeof global.addEventListener === "function") {
      btn.__mobileActionsLangBound = true;
      global.addEventListener("uilanguagechange", function () {
        applyExpandButtonText(btn, doc);
      });
    }

    syncMobileActionButtonClasses(host, doc);
    applyExpandButtonText(btn, doc);
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
    ensureMobileExpandToggleButtonDom(options);
    syncMobileActionButtonClasses(host, doc);
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
    ensureMobileExpandToggleButtonDom(options);
    syncMobileActionButtonClasses(host, doc);
    return btn;
  }

  global.CoreMobileTopButtonsRuntime = global.CoreMobileTopButtonsRuntime || {};
  global.CoreMobileTopButtonsRuntime.ensureMobileUndoTopButtonDom = ensureMobileUndoTopButtonDom;
  global.CoreMobileTopButtonsRuntime.ensureMobileHintToggleButtonDom = ensureMobileHintToggleButtonDom;
  global.CoreMobileTopButtonsRuntime.ensureMobileExpandToggleButtonDom =
    ensureMobileExpandToggleButtonDom;
})(typeof window !== "undefined" ? window : undefined);
