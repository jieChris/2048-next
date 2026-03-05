(function (global) {
  "use strict";

  if (!global) return;

  var STORAGE_KEY = "settings_top_button_style_v1";
  var MODE_ICON = "icon";
  var MODE_TEXT = "text";
  var MODE_ATTR = "data-top-btn-mode";
  var ICON_HTML_ATTR = "data-top-btn-icon-html";
  var MOBILE_BREAKPOINT_QUERY = "(max-width: 980px)";
  var RESTART_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>';
  var TIMER_TOGGLE_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

  var SETTINGS_MODAL_ID = "settings-modal";
  var SETTINGS_CONTENT_SELECTOR = ".settings-modal-content";
  var SETTINGS_ACTIONS_SELECTOR = ".replay-modal-actions";
  var SETTINGS_ROW_ID = "top-button-style-settings-row";
  var SETTINGS_TOGGLE_ID = "top-button-style-toggle";
  var SETTINGS_LEGACY_SELECT_ID = "top-button-style-select";
  var SETTINGS_VALUE_NOTE_ID = "top-button-style-note";

  var ID_LABEL_MAP = {
    "top-announcement-btn": "\u516c\u544a",
    "stats-panel-toggle": "\u7edf\u8ba1",
    "top-export-replay-btn": "\u5bfc\u51fa",
    "top-practice-btn": "\u7ec3\u4e60",
    "top-advanced-replay-btn": "\u56de\u653e",
    "top-modes-btn": "\u6a21\u5f0f",
    "top-history-btn": "\u5386\u53f2",
    "top-settings-btn": "\u8bbe\u7f6e",
    "top-restart-btn": "\u65b0\u5c40",
    "top-mode-intro-btn": "\u63d0\u793a",
    "top-mobile-hint-btn": "\u63d0\u793a",
    "top-mobile-undo-btn": "\u64a4\u56de"
  };

  var isApplying = false;
  var hasBoundResize = false;
  var topButtonsObserver = null;
  var topButtonsObserverHost = null;
  var topButtonsObserverConfig = null;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function getDocumentLike() {
    var doc = global.document;
    return doc && typeof doc === "object" ? doc : null;
  }

  function getBody(documentLike) {
    var doc = documentLike || getDocumentLike();
    return doc && doc.body ? doc.body : null;
  }

  function isGamePage(documentLike) {
    var body = getBody(documentLike);
    if (!body) return false;
    return String(body.getAttribute("data-page") || "") === "game";
  }

  function querySelector(node, selector) {
    var query = asFunction(toRecord(node).querySelector);
    if (!query) return null;
    try {
      return query.call(node, selector);
    } catch (_err) {
      return null;
    }
  }

  function querySelectorAll(node, selector) {
    var query = asFunction(toRecord(node).querySelectorAll);
    if (!query) return [];
    try {
      return Array.prototype.slice.call(query.call(node, selector) || []);
    } catch (_err) {
      return [];
    }
  }

  function resolveMode(raw) {
    var text = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    return text === MODE_TEXT ? MODE_TEXT : MODE_ICON;
  }

  function readStoredMode() {
    var storage = toRecord(global).localStorage;
    var getItem = asFunction(toRecord(storage).getItem);
    if (!getItem) return MODE_ICON;
    try {
      return resolveMode(getItem.call(storage, STORAGE_KEY));
    } catch (_err) {
      return MODE_ICON;
    }
  }

  function writeStoredMode(mode) {
    var storage = toRecord(global).localStorage;
    var setItem = asFunction(toRecord(storage).setItem);
    if (!setItem) return false;
    try {
      setItem.call(storage, STORAGE_KEY, resolveMode(mode));
      return true;
    } catch (_err) {
      return false;
    }
  }

  function isMobileViewport() {
    var matchMediaLike = asFunction(global.matchMedia);
    if (matchMediaLike) {
      try {
        return !!toRecord(matchMediaLike.call(global, MOBILE_BREAKPOINT_QUERY)).matches;
      } catch (_err) {}
    }
    var width = Number(global.innerWidth);
    return Number.isFinite(width) ? width <= 980 : false;
  }

  function compactLabel(labelLike) {
    var text = typeof labelLike === "string" ? labelLike.replace(/\s+/g, "").trim() : "";
    if (!text) return "";

    if (text.indexOf("\u8ba1\u65f6") >= 0) return "\u8ba1\u65f6";
    if (text.indexOf("\u5bfc") >= 0 && text.indexOf("\u56de\u653e") >= 0) return "\u5bfc\u51fa";
    if (text.indexOf("\u56de\u653e") >= 0) return "\u56de\u653e";
    if (text.indexOf("\u9996\u9875") >= 0) return "\u9996\u9875";
    if (text.indexOf("\u6a21\u5f0f") >= 0) return "\u6a21\u5f0f";
    if (text.indexOf("\u8bbe\u7f6e") >= 0) return "\u8bbe\u7f6e";
    if (text.indexOf("\u7edf\u8ba1") >= 0) return "\u7edf\u8ba1";
    if (text.indexOf("\u516c\u544a") >= 0) return "\u516c\u544a";
    if (text.indexOf("\u64a4\u56de") >= 0) return "\u64a4\u56de";
    if (text.indexOf("\u63d0\u793a") >= 0 || text.indexOf("\u73a9\u6cd5") >= 0) return "\u63d0\u793a";
    if (text.indexOf("\u7ec3\u4e60") >= 0) return "\u7ec3\u4e60";
    if (text.indexOf("\u5386\u53f2") >= 0) return "\u5386\u53f2";
    if (text.indexOf("\u65b0") >= 0 && (text.indexOf("\u5c40") >= 0 || text.indexOf("\u6e38\u620f") >= 0)) return "\u65b0\u5c40";

    return text.length > 3 ? text.slice(0, 3) : text;
  }

  function resolveButtonLabel(button) {
    var record = toRecord(button);
    var id = typeof record.id === "string" ? record.id : "";
    if (id && ID_LABEL_MAP[id]) return ID_LABEL_MAP[id];

    var className = typeof record.className === "string" ? record.className : "";
    if (className.indexOf("mobile-home-btn") >= 0) return "\u9996\u9875";
    if (className.indexOf("mobile-hint-toggle-btn") >= 0) return "\u63d0\u793a";
    if (className.indexOf("mobile-undo-top-btn") >= 0) return "\u64a4\u56de";
    if (className.indexOf("timerbox-toggle-btn") >= 0) return "\u8ba1\u65f6";
    if (className.indexOf("restart-button") >= 0) return "\u65b0\u5c40";

    var title = record.getAttribute ? record.getAttribute("title") : "";
    if (typeof title === "string" && title.trim()) return compactLabel(title);

    var aria = record.getAttribute ? record.getAttribute("aria-label") : "";
    if (typeof aria === "string" && aria.trim()) return compactLabel(aria);

    return "";
  }

  function hasInlineSvg(button) {
    return !!querySelector(button, "svg");
  }

  function stashIconMarkup(button) {
    var record = toRecord(button);
    var current = typeof record.innerHTML === "string" ? record.innerHTML : "";
    if (record.getAttribute && record.getAttribute(ICON_HTML_ATTR)) return;
    if (current.indexOf("<svg") < 0) return;

    if (record.setAttribute) {
      record.setAttribute(ICON_HTML_ATTR, current);
      return;
    }

    var dataset = toRecord(record.dataset);
    dataset.topBtnIconHtml = current;
  }

  function resolveStoredIconHtml(button) {
    var record = toRecord(button);
    if (record.getAttribute) {
      var byAttr = String(record.getAttribute(ICON_HTML_ATTR) || "");
      if (byAttr) return byAttr;
    }
    var dataset = toRecord(record.dataset);
    return typeof dataset.topBtnIconHtml === "string" ? dataset.topBtnIconHtml : "";
  }

  function restoreIconMarkup(button) {
    var record = toRecord(button);
    var html = resolveStoredIconHtml(button);
    if (!html) return false;
    if (String(record.innerHTML || "") === html) return false;
    record.innerHTML = html;
    return true;
  }

  function resolveFallbackIconHtml(button) {
    var record = toRecord(button);
    var id = typeof record.id === "string" ? record.id : "";
    var className = typeof record.className === "string" ? record.className : "";

    if (id === "top-restart-btn" || className.indexOf("restart-button") >= 0) {
      return RESTART_ICON_SVG;
    }
    if (id === "timerbox-toggle-btn" || className.indexOf("timerbox-toggle-btn") >= 0) {
      return TIMER_TOGGLE_ICON_SVG;
    }
    return "";
  }

  function applyFallbackIconMarkup(button) {
    var record = toRecord(button);
    if (hasInlineSvg(button)) return false;
    var html = resolveFallbackIconHtml(button);
    if (!html) return false;
    if (String(record.innerHTML || "") === html) return false;
    record.innerHTML = html;
    if (record.setAttribute) {
      record.setAttribute(ICON_HTML_ATTR, html);
    }
    return true;
  }

  function setAttrIfChanged(node, name, value) {
    var record = toRecord(node);
    if (!record.getAttribute || !record.setAttribute) return false;
    var next = String(value || "");
    if (String(record.getAttribute(name) || "") === next) return false;
    record.setAttribute(name, next);
    return true;
  }

  function setTextModeContent(button) {
    var record = toRecord(button);
    var label = resolveButtonLabel(button);
    if (!label) return false;

    var mutated = false;
    var currentText = String(record.textContent || "").trim();
    if (hasInlineSvg(button) || currentText !== label) {
      record.textContent = label;
      mutated = true;
    }

    if (setAttrIfChanged(button, "title", label)) mutated = true;
    if (setAttrIfChanged(button, "aria-label", label)) mutated = true;

    return mutated;
  }

  function applyButtonMode(button, mode) {
    if (!button) return false;

    var mutated = false;
    stashIconMarkup(button);

    if (mode === MODE_TEXT) {
      mutated = setTextModeContent(button) || mutated;
    } else {
      mutated = restoreIconMarkup(button) || mutated;
      mutated = applyFallbackIconMarkup(button) || mutated;
    }

    if (setAttrIfChanged(button, MODE_ATTR, mode)) mutated = true;
    return mutated;
  }

  function getTopActionButtons(documentLike) {
    return querySelectorAll(
      documentLike,
      'body[data-page="game"] .top-action-buttons .top-action-btn, body[data-page="game"] .top-action-buttons .restart-button, body[data-page="game"] .top-action-buttons #top-restart-btn, body[data-page="game"] .above-game .restart-button, body[data-page="game"] #timerbox-toggle-btn'
    );
  }

  function syncMobileHomeButtonVisibility(documentLike) {
    if (!isGamePage(documentLike)) return;

    var homeButtons = querySelectorAll(documentLike, 'body[data-page="game"] .mobile-home-btn');
    var show = isMobileViewport();
    var displayValue = show ? "inline-flex" : "none";

    for (var i = 0; i < homeButtons.length; i++) {
      var btn = homeButtons[i];
      if (!btn || !btn.style) continue;
      if (btn.style.display !== displayValue) {
        btn.style.display = displayValue;
      }
    }
  }

  function findSettingsControl(documentLike) {
    if (!documentLike) return null;
    return (
      documentLike.getElementById(SETTINGS_TOGGLE_ID) ||
      documentLike.getElementById(SETTINGS_LEGACY_SELECT_ID)
    );
  }

  function ensureSettingsRow(documentLike) {
    if (!documentLike) return null;

    var existing = findSettingsControl(documentLike);
    if (existing) return existing;

    var modal = documentLike.getElementById(SETTINGS_MODAL_ID);
    if (!modal) return null;

    var content = querySelector(modal, SETTINGS_CONTENT_SELECTOR);
    if (!content) return null;

    var row = documentLike.createElement("div");
    if (!row) return null;
    row.id = SETTINGS_ROW_ID;
    row.className = "settings-row";
    row.innerHTML =
      '<div style="font-weight:700; margin-bottom: 6px;">\u6309\u94ae\u6837\u5f0f</div>' +
      '<label class="settings-switch-row" for="' +
      SETTINGS_TOGGLE_ID +
      '">' +
      '<span>\u6587\u5b57\u6309\u94ae\u6a21\u5f0f</span>' +
      '<input id="' +
      SETTINGS_TOGGLE_ID +
      '" type="checkbox">' +
      "</label>" +
      '<div id="' +
      SETTINGS_VALUE_NOTE_ID +
      '" class="settings-note">\u79fb\u52a8\u7aef\u9876\u90e8\u6309\u94ae\u663e\u793a\u98ce\u683c\u3002</div>';

    var actions = querySelector(content, SETTINGS_ACTIONS_SELECTOR);
    if (actions && actions.parentNode === content && content.insertBefore) {
      content.insertBefore(row, actions);
    } else if (content.appendChild) {
      content.appendChild(row);
    }

    return findSettingsControl(documentLike);
  }

  function updateSettingsNote(documentLike, mode) {
    var note = documentLike ? documentLike.getElementById(SETTINGS_VALUE_NOTE_ID) : null;
    if (!note) return;
    note.textContent =
      mode === MODE_TEXT
        ? "\u5f53\u524d\u4e3a\u6587\u5b57\u6309\u94ae\uff0c\u53ef\u8bfb\u6027\u66f4\u5f3a\u3002"
        : "\u5f53\u524d\u4e3a\u56fe\u6807\u6309\u94ae\uff0c\u89c6\u89c9\u66f4\u7b80\u6d01\u3002";
  }

  function syncSettingsControl(documentLike, mode) {
    var control = findSettingsControl(documentLike);
    if (!control) return null;

    var tagName = String(toRecord(control).tagName || "").toUpperCase();
    if (tagName === "SELECT") {
      if (control.value !== mode) {
        control.value = mode;
      }
    } else {
      toRecord(control).checked = mode === MODE_TEXT;
    }

    updateSettingsNote(documentLike, mode);
    return control;
  }

  function bindSettingsControl(control, documentLike) {
    if (!control) return false;

    var record = toRecord(control);
    if (record.__topBtnStyleBound) return false;
    if (!record.addEventListener) return false;

    record.__topBtnStyleBound = true;
    record.addEventListener("change", function () {
      var tagName = String(toRecord(control).tagName || "").toUpperCase();
      var nextMode = MODE_ICON;

      if (tagName === "SELECT") {
        nextMode = resolveMode(record.value);
      } else {
        nextMode = record.checked ? MODE_TEXT : MODE_ICON;
      }

      writeStoredMode(nextMode);
      applyTopButtonStyle(nextMode, documentLike);
    });

    return true;
  }

  function initSettingsUi(documentLike, mode) {
    if (!documentLike || !isGamePage(documentLike)) return null;

    var control = ensureSettingsRow(documentLike);
    if (!control) return null;

    bindSettingsControl(control, documentLike);
    syncSettingsControl(documentLike, resolveMode(mode));
    return control;
  }

  function pauseObserver() {
    if (!topButtonsObserver) return false;
    try {
      topButtonsObserver.disconnect();
      return true;
    } catch (_err) {
      return false;
    }
  }

  function resumeObserver() {
    if (!topButtonsObserver || !topButtonsObserverHost || !topButtonsObserverConfig) return false;
    try {
      topButtonsObserver.observe(topButtonsObserverHost, topButtonsObserverConfig);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function applyTopButtonStyle(mode, documentLike) {
    var doc = documentLike || getDocumentLike();
    if (!doc || !isGamePage(doc)) return;

    var resolvedMode = resolveMode(mode);
    var body = getBody(doc);
    if (body && body.getAttribute && body.setAttribute) {
      if (String(body.getAttribute("data-top-button-style") || "") !== resolvedMode) {
        body.setAttribute("data-top-button-style", resolvedMode);
      }
    }

    var observerWasPaused = pauseObserver();

    isApplying = true;
    try {
      var buttons = getTopActionButtons(doc);
      for (var i = 0; i < buttons.length; i++) {
        applyButtonMode(buttons[i], resolvedMode);
      }
      syncMobileHomeButtonVisibility(doc);
      initSettingsUi(doc, resolvedMode);
    } finally {
      isApplying = false;
      if (observerWasPaused) {
        resumeObserver();
      }
    }
  }

  function shouldReapplyTextMode(mutations) {
    if (!mutations || !mutations.length) return false;
    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];
      if (!mutation) continue;
      if (mutation.type === "childList") {
        if (
          (mutation.addedNodes && mutation.addedNodes.length > 0) ||
          (mutation.removedNodes && mutation.removedNodes.length > 0)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  function observeTopButtons(documentLike) {
    if (!documentLike || !global.MutationObserver) return false;

    var host = querySelector(documentLike, 'body[data-page="game"] .top-action-buttons');
    if (!host) return false;

    if (!topButtonsObserver) {
      topButtonsObserver = new global.MutationObserver(function (mutations) {
        if (isApplying) return;

        var mode = readStoredMode();
        if (mode === MODE_TEXT) {
          if (!shouldReapplyTextMode(mutations)) return;
          applyTopButtonStyle(MODE_TEXT, documentLike);
        } else {
          syncMobileHomeButtonVisibility(documentLike);
        }
      });
    }

    topButtonsObserverHost = host;
    topButtonsObserverConfig = {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: false,
      attributeFilter: ["title", "aria-label", "class", "style"]
    };

    return resumeObserver();
  }

  function bindResizeSync(documentLike) {
    if (hasBoundResize) return;

    var addEventListener = asFunction(global.addEventListener);
    if (!addEventListener) return;

    hasBoundResize = true;
    addEventListener.call(global, "resize", function () {
      var mode = readStoredMode();
      if (mode === MODE_TEXT) {
        applyTopButtonStyle(MODE_TEXT, documentLike);
      } else {
        syncMobileHomeButtonVisibility(documentLike);
      }
    });
  }

  function boot() {
    var doc = getDocumentLike();
    if (!doc || !isGamePage(doc)) return;

    var mode = readStoredMode();
    applyTopButtonStyle(mode, doc);
    observeTopButtons(doc);
    bindResizeSync(doc);
  }

  if (toRecord(global.document).readyState === "loading") {
    var addEventListener = asFunction(global.addEventListener);
    if (addEventListener) {
      addEventListener.call(global, "DOMContentLoaded", boot);
    }
  } else {
    boot();
  }

  global.CoreTopButtonStyleRuntime = global.CoreTopButtonStyleRuntime || {};
  global.CoreTopButtonStyleRuntime.applyTopButtonStyle = function (mode) {
    applyTopButtonStyle(mode, getDocumentLike());
  };
  global.CoreTopButtonStyleRuntime.readStoredMode = readStoredMode;
})(typeof window !== "undefined" ? window : undefined);