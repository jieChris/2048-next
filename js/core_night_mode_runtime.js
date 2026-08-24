(function (global) {
  "use strict";

  if (!global) return;

  var STORAGE_KEY = "settings_night_background_enabled_v1";
  var DISPLAY_MODE_STORAGE_KEY = "settings_display_mode_v2";
  var STORAGE_TRUE_VALUE = "1";
  var STORAGE_FALSE_VALUE = "0";
  var STYLE_ID = "night-background-style";

  var state = {
    enabled: false,
    displayMode: "auto",
    hasToggleBinding: false,
    hasLanguageBinding: false,
    hasStorageBinding: false,
    hasDisplayModeMediaBinding: false
  };

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

  function getElementById(id) {
    var doc = getDocumentLike();
    var getter = asFunction(toRecord(doc).getElementById);
    if (!getter) return null;
    return getter.call(doc, id);
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

  function bindListener(target, eventName, handler, options) {
    var addEventListener = asFunction(toRecord(target).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(target, eventName, handler, options);
    return true;
  }

  function safeReadBooleanFlag(key) {
    if (typeof key !== "string" || !key) return false;
    var runtime = toRecord(global.CoreGameSettingsStorageRuntime);
    var readStorageFlagFromContext = asFunction(runtime.readStorageFlagFromContext);
    if (readStorageFlagFromContext) {
      return !!readStorageFlagFromContext({
        windowLike: global,
        key: key,
        trueValue: STORAGE_TRUE_VALUE
      });
    }

    return false;
  }

  function normalizeDisplayMode(value) {
    var mode = String(value || "").trim().toLowerCase();
    return mode === "auto" || mode === "day" || mode === "night" ? mode : "";
  }

  function readDisplayModePreference() {
    var current = normalizeDisplayMode(safeReadTextValue(DISPLAY_MODE_STORAGE_KEY));
    if (current) return current;
    var legacy = safeReadTextValue(STORAGE_KEY);
    var migrated = legacy === STORAGE_TRUE_VALUE ? "night" : legacy === STORAGE_FALSE_VALUE ? "day" : "auto";
    if (legacy === STORAGE_TRUE_VALUE || legacy === STORAGE_FALSE_VALUE) {
      safeWriteTextValue(DISPLAY_MODE_STORAGE_KEY, migrated);
    }
    return migrated;
  }

  function resolveSystemNight() {
    var matchMedia = asFunction(toRecord(global).matchMedia);
    if (!matchMedia) return false;
    try {
      return !!toRecord(matchMedia.call(global, "(prefers-color-scheme: dark)")).matches;
    } catch (_err) {
      return false;
    }
  }

  function resolveNightForDisplayMode(mode) {
    return mode === "night" || (mode === "auto" && resolveSystemNight());
  }

  function syncDisplayModeStateFromStorage() {
    state.displayMode = readDisplayModePreference();
    state.enabled = !!resolveNightForDisplayMode(state.displayMode);
    return state.enabled;
  }

  function safeWriteBooleanFlag(key, enabled) {
    if (typeof key !== "string" || !key) return false;
    var runtime = toRecord(global.CoreGameSettingsStorageRuntime);
    var writeStorageFlagFromContext = asFunction(runtime.writeStorageFlagFromContext);
    if (writeStorageFlagFromContext) {
      return !!writeStorageFlagFromContext({
        windowLike: global,
        key: key,
        enabled: !!enabled,
        trueValue: STORAGE_TRUE_VALUE,
        falseValue: STORAGE_FALSE_VALUE
      });
    }

    return false;
  }

  function safeWriteStorageFlag(enabled) {
    return safeWriteBooleanFlag(STORAGE_KEY, enabled);
  }

  function safeReadTextValue(key) {
    if (typeof key !== "string" || !key) return "";
    var runtime = toRecord(global.CoreGameSettingsStorageRuntime);
    var readStorageTextFromContext = asFunction(runtime.readStorageTextFromContext);
    return readStorageTextFromContext ? String(readStorageTextFromContext({ windowLike: global, key: key }) || "") : "";
  }

  function safeWriteTextValue(key, value) {
    if (typeof key !== "string" || !key) return false;
    var runtime = toRecord(global.CoreGameSettingsStorageRuntime);
    var writeStorageTextFromContext = asFunction(runtime.writeStorageTextFromContext);
    return writeStorageTextFromContext ? !!writeStorageTextFromContext({ windowLike: global, key: key, value: value }) : false;
  }

  function readUiLanguage() {
    var raw = safeReadTextValue("ui_language_v1").trim().toLowerCase();
    return raw === "en" ? "en" : "zh";
  }

  function buildCopy() {
    var isEn = readUiLanguage() === "en";
    var mode = state.displayMode;
    var modeLabel = mode === "auto" ? (isEn ? "Auto" : "自动") : mode === "night" ? (isEn ? "Night" : "夜晚") : (isEn ? "Day" : "白天");
    if (isEn) {
      return {
        title: "Display Mode",
        desc: "Choose whether the page follows your system, daytime, or nighttime appearance.",
        note: "Current: " + modeLabel + (mode === "auto" ? (state.enabled ? " (night resolved)" : " (day resolved)") : "") + "."
      };
    }
    return {
      title: "\u663e\u793a\u6a21\u5f0f",
      desc: "\u9009\u62e9\u81ea\u52a8\u8ddf\u968f\u7cfb\u7edf\u3001\u767d\u5929\u6216\u591c\u665a\u663e\u793a\u3002",
      note: "\u5f53\u524d\uff1a" + modeLabel + (mode === "auto" ? (state.enabled ? "\uff08\u5f53\u524d\u8ddf\u968f\u4e3a\u591c\u665a\uff09" : "\uff08\u5f53\u524d\u8ddf\u968f\u4e3a\u767d\u5929\uff09") : "") + "\u3002"
    };
  }

  function resolveNightBackgroundCssText() {
    return [
      "html[data-night-background='1']{color-scheme:dark;--night-page-bg:#0a1220;--night-page-bg-deep:#060a12;--night-surface:#182338;--night-surface-alt:#22314a;--night-surface-soft:rgba(255,255,255,0.05);--night-line:rgba(181,198,221,0.16);--night-line-strong:rgba(207,222,241,0.24);--night-ink:#ece2d3;--night-ink-soft:#c8bcaa;--night-ink-dim:#97a7bc;--night-accent:#d5a86a;--night-accent-strong:#edc37b;--night-button:#436282;--night-button-hover:#537598;--night-grid:rgba(176,192,214,0.12);background:radial-gradient(circle at 18% 12%, rgba(95,121,166,0.26), transparent 28%),radial-gradient(circle at 82% 0%, rgba(114,86,153,0.2), transparent 22%),linear-gradient(180deg,#131b2d 0%,#0a1220 46%,#060913 100%) !important;}",
      "html[data-night-background='1'] body{background:transparent !important;color:var(--night-ink) !important;min-height:100vh;}",
      "html[data-night-background='1'] body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:-2;background-image:radial-gradient(2px 2px at 11% 18%, rgba(255,255,255,0.68), transparent 60%),radial-gradient(1.5px 1.5px at 22% 76%, rgba(255,255,255,0.52), transparent 60%),radial-gradient(2px 2px at 39% 32%, rgba(255,242,214,0.58), transparent 60%),radial-gradient(1.5px 1.5px at 56% 16%, rgba(255,255,255,0.64), transparent 60%),radial-gradient(2px 2px at 69% 60%, rgba(255,255,255,0.56), transparent 60%),radial-gradient(1.5px 1.5px at 81% 24%, rgba(255,248,226,0.68), transparent 60%),radial-gradient(2px 2px at 89% 72%, rgba(255,255,255,0.5), transparent 60%);opacity:0.42;}",
      "html[data-night-background='1'] body::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:-1;background:linear-gradient(180deg, rgba(255,255,255,0.04), transparent 26%),radial-gradient(circle at top, rgba(240,199,126,0.1), transparent 32%),radial-gradient(circle at bottom, rgba(4,7,14,0.74), rgba(4,7,14,0.18) 48%, transparent 76%);}",
      "html[data-night-background='1'] hr{border-bottom-color:var(--night-line) !important;}"
    ].join("\n");
  }

  function ensureStyleTag() {
    var doc = getDocumentLike();
    if (!doc) return null;
    var style = getElementById(STYLE_ID);
    if (style) return style;
    var createElement = asFunction(toRecord(doc).createElement);
    if (!createElement) return null;
    style = createElement.call(doc, "style");
    if (!style) return null;
    style.id = STYLE_ID;
    var head = doc.head || querySelector(doc, "head") || doc.documentElement || null;
    var appendChild = asFunction(toRecord(head).appendChild);
    if (!appendChild) return null;
    appendChild.call(head, style);
    return style;
  }

  function applyNightBackground(enabled) {
    var doc = getDocumentLike();
    if (!doc || !doc.documentElement) return false;
    var root = doc.documentElement;
    root.setAttribute("data-display-mode", state.displayMode || "auto");
    if (enabled) {
      root.setAttribute("data-night-background", "1");
      root.style.colorScheme = "dark";
      var style = ensureStyleTag();
      if (style) {
        toRecord(style).textContent = resolveNightBackgroundCssText();
      }
      return true;
    }
    root.removeAttribute("data-night-background");
    root.style.colorScheme = "";
    return true;
  }

  function syncNightModeSettingsUI() {
    var row = getElementById("night-bg-settings-row");
    var toggle = getElementById("night-bg-toggle");
    var title = querySelector(row, ".settings-toggle-title");
    var desc = getElementById("night-bg-toggle-desc");
    var note = getElementById("night-bg-note");
    var shell = querySelector(row, ".settings-switch");
    var copy = buildCopy();

    if (toggle) {
      toRecord(toggle).indeterminate = state.displayMode === "auto";
      toRecord(toggle).checked = state.displayMode === "night";
      var toggleSetAttribute = asFunction(toRecord(toggle).setAttribute);
      if (toggleSetAttribute) {
        toggleSetAttribute.call(toggle, "aria-checked", state.displayMode === "auto" ? "mixed" : state.displayMode === "night" ? "true" : "false");
      }
    }
    if (title) {
      toRecord(title).textContent = copy.title;
    }
    if (desc) {
      toRecord(desc).textContent = copy.desc;
    }
    if (note) {
      toRecord(note).textContent = copy.note;
    }
    if (shell) {
      var setAttribute = asFunction(toRecord(shell).setAttribute);
      if (setAttribute) {
        setAttribute.call(shell, "aria-label", copy.title);
      }
    }
  }

  function setDisplayMode(mode) {
    var normalized = normalizeDisplayMode(mode) || "auto";
    state.displayMode = normalized;
    safeWriteTextValue(DISPLAY_MODE_STORAGE_KEY, normalized);
    state.enabled = !!resolveNightForDisplayMode(normalized);
    // Keep the old flag for pages/bundles that have not yet moved to v2.
    safeWriteStorageFlag(state.enabled);
    applyNightBackground(state.enabled);
    syncNightModeSettingsUI();
    return state.displayMode;
  }

  function setNightBackgroundEnabled(enabled) {
    return setDisplayMode(enabled ? "night" : "day") === "night";
  }

  function syncNightBackgroundStateFromStorage() {
    syncDisplayModeStateFromStorage();
    applyNightBackground(state.enabled);
    syncNightModeSettingsUI();
    return state.enabled;
  }

  function bindToggle() {
    var toggle = getElementById("night-bg-toggle");
    if (!toggle || state.hasToggleBinding) return false;
    bindListener(toggle, "change", function () {
      // Preserve the three explicit choices while retaining the old checkbox DOM.
      if (state.displayMode === "auto") setDisplayMode("night");
      else if (state.displayMode === "night") setDisplayMode("day");
      else setDisplayMode("auto");
    });
    state.hasToggleBinding = true;
    return true;
  }

  function bindLanguageListener() {
    if (state.hasLanguageBinding) return false;
    bindListener(global, "uilanguagechange", function () {
      syncNightModeSettingsUI();
    });
    state.hasLanguageBinding = true;
    return true;
  }

  function bindStorageListener() {
    if (state.hasStorageBinding) return false;
    bindListener(global, "storage", function (eventLike) {
      var eventRecord = toRecord(eventLike);
      var key = typeof eventRecord.key === "string" ? eventRecord.key : "";
      if (
        key &&
        key !== STORAGE_KEY &&
        key !== DISPLAY_MODE_STORAGE_KEY
      ) {
        return;
      }
      // Legacy pages still publish the boolean key. Treat that event as a
      // compatibility update and mirror it into v2 before resolving state.
      if (key === STORAGE_KEY && !normalizeDisplayMode(safeReadTextValue(DISPLAY_MODE_STORAGE_KEY))) {
        var legacy = safeReadTextValue(STORAGE_KEY);
        if (legacy === STORAGE_TRUE_VALUE || legacy === STORAGE_FALSE_VALUE) {
          safeWriteTextValue(DISPLAY_MODE_STORAGE_KEY, legacy === STORAGE_TRUE_VALUE ? "night" : "day");
        }
      }
      syncNightBackgroundStateFromStorage();
    });
    state.hasStorageBinding = true;
    return true;
  }

  function bindDisplayModeMediaListener() {
    if (state.hasDisplayModeMediaBinding) return false;
    var matchMedia = asFunction(toRecord(global).matchMedia);
    if (!matchMedia) return false;
    var media = null;
    try {
      media = matchMedia.call(global, "(prefers-color-scheme: dark)");
    } catch (_err) {
      return false;
    }
    if (!media) return false;
    var listener = function () {
      if (state.displayMode !== "auto") return;
      syncDisplayModeStateFromStorage();
      applyNightBackground(state.enabled);
      syncNightModeSettingsUI();
    };
    var bound = bindListener(media, "change", listener);
    if (!bound) {
      var addListener = asFunction(toRecord(media).addListener);
      if (addListener) {
        addListener.call(media, listener);
        bound = true;
      }
    }
    state.hasDisplayModeMediaBinding = bound;
    return bound;
  }

  function getRuntimeSnapshot() {
    var doc = getDocumentLike();
    var root = doc && doc.documentElement ? doc.documentElement : null;
    return {
      enabled: !!state.enabled,
      displayMode: state.displayMode,
      resolvedNight: !!state.enabled,
      hasStyleTag: !!getElementById(STYLE_ID),
      dataAttribute: root ? String(root.getAttribute("data-night-background") || "") : "",
      togglePresent: !!getElementById("night-bg-toggle")
    };
  }

  function init() {
    syncDisplayModeStateFromStorage();
    applyNightBackground(state.enabled);
    bindToggle();
    bindLanguageListener();
    bindStorageListener();
    bindDisplayModeMediaListener();
    syncNightModeSettingsUI();
  }

  global.CoreNightModeRuntime = global.CoreNightModeRuntime || {};
  global.CoreNightModeRuntime.setNightBackgroundEnabled = setNightBackgroundEnabled;
  global.CoreNightModeRuntime.setDisplayMode = setDisplayMode;
  global.CoreNightModeRuntime.syncNightModeSettingsUI = syncNightModeSettingsUI;
  global.CoreNightModeRuntime.getNightModeRuntimeSnapshot = getRuntimeSnapshot;
  global.syncNightModeSettingsUI = syncNightModeSettingsUI;

  if (toRecord(getDocumentLike()).readyState === "loading") {
    bindListener(getDocumentLike(), "DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);
