(function (global) {
  "use strict";

  if (!global) return;

  var STORAGE_KEY = "settings_night_background_enabled_v1";
  var AUTO_THEME_APPLIED_KEY = "settings_night_theme_auto_applied_v1";
  var AUTO_THEME_PENDING_KEY = "settings_night_theme_pending_v1";
  var AUTO_THEME_ID = "midnight_nebula";
  var STORAGE_TRUE_VALUE = "1";
  var STORAGE_FALSE_VALUE = "0";
  var STYLE_ID = "night-background-style";

  var state = {
    enabled: false,
    hasToggleBinding: false,
    hasLanguageBinding: false
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

    var storage = toRecord(global).localStorage;
    var getItem = asFunction(toRecord(storage).getItem);
    if (!getItem) return false;
    try {
      return getItem.call(storage, key) === STORAGE_TRUE_VALUE;
    } catch (_err) {
      return false;
    }
  }

  function safeReadStorageFlag() {
    return safeReadBooleanFlag(STORAGE_KEY);
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

    var storage = toRecord(global).localStorage;
    var setItem = asFunction(toRecord(storage).setItem);
    if (!setItem) return false;
    try {
      setItem.call(storage, key, enabled ? STORAGE_TRUE_VALUE : STORAGE_FALSE_VALUE);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function safeWriteStorageFlag(enabled) {
    return safeWriteBooleanFlag(STORAGE_KEY, enabled);
  }

  function readUiLanguage() {
    var storage = toRecord(global).localStorage;
    var getItem = asFunction(toRecord(storage).getItem);
    if (!getItem) return "zh";
    try {
      var raw = String(getItem.call(storage, "ui_language_v1") || "").trim().toLowerCase();
      return raw === "en" ? "en" : "zh";
    } catch (_err) {
      return "zh";
    }
  }

  function buildCopy() {
    var isEn = readUiLanguage() === "en";
    if (isEn) {
      if (!state.enabled) {
        return {
          title: "Night Mode",
          desc: "Switch supported pages to a softer nighttime look.",
          note: "Disabled. The page keeps its current background."
        };
      }
      return {
        title: "Night Mode",
        desc: "Switch supported pages to a softer nighttime look.",
        note: "Enabled. All pages with settings will follow this background."
      };
    }

    if (!state.enabled) {
      return {
        title: "\u591c\u95f4\u6a21\u5f0f",
        desc: "\u4e3a\u9875\u9762\u5207\u6362\u6210\u67d4\u548c\u7684\u591c\u95f4\u6a21\u5f0f\u3002",
        note: "\u672a\u5f00\u542f\uff0c\u5f53\u524d\u4fdd\u6301\u539f\u6709\u9875\u9762\u80cc\u666f\u3002"
      };
    }
    return {
      title: "\u591c\u95f4\u6a21\u5f0f",
      desc: "\u4e3a\u9875\u9762\u5207\u6362\u6210\u67d4\u548c\u7684\u591c\u95f4\u6a21\u5f0f\u3002",
      note: "\u5df2\u5f00\u542f\uff0c\u6240\u6709\u5e26\u8bbe\u7f6e\u5f39\u7a97\u7684\u9875\u9762\u90fd\u4f1a\u540c\u6b65\u4f7f\u7528\u8fd9\u4e2a\u80cc\u666f\u3002"
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
      toRecord(toggle).checked = !!state.enabled;
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

  function markNightThemeAutoApplied() {
    safeWriteBooleanFlag(AUTO_THEME_APPLIED_KEY, true);
    safeWriteBooleanFlag(AUTO_THEME_PENDING_KEY, false);
    return true;
  }

  function tryApplyNightThemePreset() {
    if (!state.enabled) return false;
    if (safeReadBooleanFlag(AUTO_THEME_APPLIED_KEY)) {
      safeWriteBooleanFlag(AUTO_THEME_PENDING_KEY, false);
      return false;
    }

    var themeManager = toRecord(global.ThemeManager);
    var applyTheme = asFunction(themeManager.applyTheme);
    if (!applyTheme) return false;

    var getCurrentTheme = asFunction(themeManager.getCurrentTheme);
    var currentThemeId = getCurrentTheme ? String(getCurrentTheme.call(themeManager) || "") : "";
    try {
      if (currentThemeId !== AUTO_THEME_ID) {
        applyTheme.call(themeManager, AUTO_THEME_ID);
      }
      markNightThemeAutoApplied();
      return true;
    } catch (_err) {
      return false;
    }
  }

  function setNightBackgroundEnabled(enabled) {
    var wasEnabled = !!state.enabled;
    state.enabled = !!enabled;
    safeWriteStorageFlag(state.enabled);
    applyNightBackground(state.enabled);
    if (state.enabled && !wasEnabled) {
      if (!safeReadBooleanFlag(AUTO_THEME_APPLIED_KEY)) {
        safeWriteBooleanFlag(AUTO_THEME_PENDING_KEY, true);
        tryApplyNightThemePreset();
      } else if (safeReadBooleanFlag(AUTO_THEME_PENDING_KEY)) {
        safeWriteBooleanFlag(AUTO_THEME_PENDING_KEY, false);
      }
    }
    syncNightModeSettingsUI();
    return state.enabled;
  }

  function bindToggle() {
    var toggle = getElementById("night-bg-toggle");
    if (!toggle || state.hasToggleBinding) return false;
    bindListener(toggle, "change", function () {
      setNightBackgroundEnabled(!!toRecord(toggle).checked);
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

  function getRuntimeSnapshot() {
    var doc = getDocumentLike();
    var root = doc && doc.documentElement ? doc.documentElement : null;
    return {
      enabled: !!state.enabled,
      hasStyleTag: !!getElementById(STYLE_ID),
      dataAttribute: root ? String(root.getAttribute("data-night-background") || "") : "",
      togglePresent: !!getElementById("night-bg-toggle"),
      autoThemeApplied: safeReadBooleanFlag(AUTO_THEME_APPLIED_KEY),
      autoThemePending: safeReadBooleanFlag(AUTO_THEME_PENDING_KEY)
    };
  }

  function init() {
    state.enabled = safeReadStorageFlag();
    applyNightBackground(state.enabled);
    if (state.enabled) {
      if (!safeReadBooleanFlag(AUTO_THEME_APPLIED_KEY)) {
        if (safeReadBooleanFlag(AUTO_THEME_PENDING_KEY)) {
          tryApplyNightThemePreset();
        } else {
          // Preserve existing users who already had night mode enabled before this auto-theme behavior shipped.
          markNightThemeAutoApplied();
        }
      } else if (safeReadBooleanFlag(AUTO_THEME_PENDING_KEY)) {
        safeWriteBooleanFlag(AUTO_THEME_PENDING_KEY, false);
      }
    }
    bindToggle();
    bindLanguageListener();
    syncNightModeSettingsUI();
  }

  global.CoreNightModeRuntime = global.CoreNightModeRuntime || {};
  global.CoreNightModeRuntime.setNightBackgroundEnabled = setNightBackgroundEnabled;
  global.CoreNightModeRuntime.syncNightModeSettingsUI = syncNightModeSettingsUI;
  global.CoreNightModeRuntime.getNightModeRuntimeSnapshot = getRuntimeSnapshot;
  global.syncNightModeSettingsUI = syncNightModeSettingsUI;

  if (toRecord(getDocumentLike()).readyState === "loading") {
    bindListener(getDocumentLike(), "DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);
