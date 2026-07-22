(function (global) {
  "use strict";

  if (!global) return;

  var STORAGE_KEY = "settings_night_background_enabled_v1";
  var AUTO_THEME_APPLIED_KEY = "settings_night_theme_auto_applied_v1";
  var AUTO_THEME_PENDING_KEY = "settings_night_theme_pending_v1";
  var AUTO_THEME_ID = "midnight_nebula";
  var THEME_PROFILE_KEY = "theme_profile_v1";
  var TILE_PALETTE_ACTIVE_KEY = "tile_palette_active_v1";
  var DAY_THEME_KEY = "settings_day_theme_profile_v1";
  var NIGHT_THEME_KEY = "settings_night_theme_profile_v1";
  var DAY_TILE_PALETTE_KEY = "settings_day_tile_palette_v1";
  var NIGHT_TILE_PALETTE_KEY = "settings_night_tile_palette_v1";
  var DEFAULT_DAY_THEME_ID = "mist_cyan";
  var DEFAULT_DAY_TILE_PALETTE_ID = "cold-cyan-steps";
  var DEFAULT_NIGHT_TILE_PALETTE_ID = "follow-theme";
  var STORAGE_TRUE_VALUE = "1";
  var STORAGE_FALSE_VALUE = "0";
  var STYLE_ID = "night-background-style";

  var state = {
    enabled: false,
    hasToggleBinding: false,
    hasLanguageBinding: false,
    hasStorageBinding: false,
    hasThemeChangeBinding: false
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

  function safeReadTextValue(key) {
    if (typeof key !== "string" || !key) return "";
    var storage = toRecord(global).localStorage;
    var getItem = asFunction(toRecord(storage).getItem);
    if (!getItem) return "";
    try {
      return String(getItem.call(storage, key) || "");
    } catch (_err) {
      return "";
    }
  }

  function safeWriteTextValue(key, value) {
    if (typeof key !== "string" || !key) return false;
    var storage = toRecord(global).localStorage;
    var setItem = asFunction(toRecord(storage).setItem);
    if (!setItem) return false;
    try {
      setItem.call(storage, key, String(value || ""));
      return true;
    } catch (_err) {
      return false;
    }
  }

  function getModeThemeStorageKey(isNight) {
    return isNight ? NIGHT_THEME_KEY : DAY_THEME_KEY;
  }

  function getModeTilePaletteStorageKey(isNight) {
    return isNight ? NIGHT_TILE_PALETTE_KEY : DAY_TILE_PALETTE_KEY;
  }

  function getModeDefaultTilePaletteId(isNight) {
    return isNight ? DEFAULT_NIGHT_TILE_PALETTE_ID : DEFAULT_DAY_TILE_PALETTE_ID;
  }

  function readModeAppearance(isNight) {
    return {
      themeId:
        safeReadTextValue(getModeThemeStorageKey(isNight)) ||
        (isNight ? AUTO_THEME_ID : DEFAULT_DAY_THEME_ID),
      tilePaletteId:
        safeReadTextValue(getModeTilePaletteStorageKey(isNight)) ||
        getModeDefaultTilePaletteId(isNight)
    };
  }

  function writeModeAppearance(isNight, appearance) {
    var payload = toRecord(appearance);
    var didWrite = false;
    var themeId = typeof payload.themeId === "string" ? payload.themeId : "";
    var tilePaletteId = typeof payload.tilePaletteId === "string" ? payload.tilePaletteId : "";
    if (themeId) {
      didWrite = safeWriteTextValue(getModeThemeStorageKey(isNight), themeId) || didWrite;
    }
    if (tilePaletteId) {
      didWrite =
        safeWriteTextValue(getModeTilePaletteStorageKey(isNight), tilePaletteId) || didWrite;
    }
    return didWrite;
  }

  function getThemeManager() {
    return toRecord(global.ThemeManager);
  }

  function readCurrentThemeId() {
    var themeManager = getThemeManager();
    var getCurrentTheme = asFunction(themeManager.getCurrentTheme);
    if (getCurrentTheme) {
      try {
        var themeId = String(getCurrentTheme.call(themeManager) || "");
        if (themeId) return themeId;
      } catch (_err) {}
    }
    return safeReadTextValue(THEME_PROFILE_KEY) || DEFAULT_DAY_THEME_ID;
  }

  function readCurrentTilePaletteId() {
    var themeManager = getThemeManager();
    var getActiveTilePaletteId = asFunction(themeManager.getActiveTilePaletteId);
    if (getActiveTilePaletteId) {
      try {
        var paletteId = String(getActiveTilePaletteId.call(themeManager) || "");
        if (paletteId) return paletteId;
      } catch (_err) {}
    }
    return safeReadTextValue(TILE_PALETTE_ACTIVE_KEY) || getModeDefaultTilePaletteId(state.enabled);
  }

  function syncCurrentAppearanceToMode(isNight) {
    return writeModeAppearance(isNight, {
      themeId: readCurrentThemeId(),
      tilePaletteId: readCurrentTilePaletteId()
    });
  }

  function ensureCurrentModeAppearanceSeeded() {
    if (state.enabled) {
      var hasNightTheme = !!safeReadTextValue(NIGHT_THEME_KEY);
      var hasNightPalette = !!safeReadTextValue(NIGHT_TILE_PALETTE_KEY);
      if (!hasNightTheme) {
        if (!safeReadBooleanFlag(AUTO_THEME_APPLIED_KEY) && !safeReadBooleanFlag(AUTO_THEME_PENDING_KEY)) {
          // Preserve legacy users who already had night mode enabled before per-mode tile sync shipped.
          safeWriteTextValue(NIGHT_THEME_KEY, readCurrentThemeId() || AUTO_THEME_ID);
          markNightThemeAutoApplied();
        } else if (safeReadBooleanFlag(AUTO_THEME_PENDING_KEY)) {
          safeWriteTextValue(NIGHT_THEME_KEY, AUTO_THEME_ID);
        } else {
          safeWriteTextValue(NIGHT_THEME_KEY, readCurrentThemeId() || AUTO_THEME_ID);
        }
      }
      if (!hasNightPalette) {
        safeWriteTextValue(NIGHT_TILE_PALETTE_KEY, readCurrentTilePaletteId() || DEFAULT_NIGHT_TILE_PALETTE_ID);
      }
      return true;
    }

    if (!safeReadTextValue(DAY_THEME_KEY)) {
      safeWriteTextValue(DAY_THEME_KEY, readCurrentThemeId() || DEFAULT_DAY_THEME_ID);
    }
    if (!safeReadTextValue(DAY_TILE_PALETTE_KEY)) {
      safeWriteTextValue(DAY_TILE_PALETTE_KEY, readCurrentTilePaletteId() || DEFAULT_DAY_TILE_PALETTE_ID);
    }
    return true;
  }

  function applyModeAppearance(isNight) {
    var appearance = readModeAppearance(isNight);
    var themeManager = getThemeManager();
    var applyTheme = asFunction(themeManager.applyTheme);
    var setActiveTilePalette = asFunction(themeManager.setActiveTilePalette);
    var currentThemeId = readCurrentThemeId();
    var currentTilePaletteId = readCurrentTilePaletteId();

    safeWriteTextValue(THEME_PROFILE_KEY, appearance.themeId);
    safeWriteTextValue(TILE_PALETTE_ACTIVE_KEY, appearance.tilePaletteId);

    var didApply = false;
    if (applyTheme && appearance.themeId && currentThemeId !== appearance.themeId) {
      try {
        applyTheme.call(themeManager, appearance.themeId);
        didApply = true;
      } catch (_err) {}
    }
    if (
      setActiveTilePalette &&
      appearance.tilePaletteId &&
      currentTilePaletteId !== appearance.tilePaletteId
    ) {
      try {
        setActiveTilePalette.call(themeManager, appearance.tilePaletteId);
        didApply = true;
      } catch (_err) {}
    }
    return didApply;
  }

  function syncAppearanceForCurrentState() {
    ensureCurrentModeAppearanceSeeded();
    var applied = applyModeAppearance(state.enabled);
    if (state.enabled && safeReadBooleanFlag(AUTO_THEME_PENDING_KEY) && applied) {
      markNightThemeAutoApplied();
    }
    return applied;
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
    return syncAppearanceForCurrentState();
  }

  function setNightBackgroundEnabled(enabled) {
    var wasEnabled = !!state.enabled;
    if (wasEnabled && !enabled) {
      syncCurrentAppearanceToMode(true);
    } else if (!wasEnabled && enabled) {
      syncCurrentAppearanceToMode(false);
    }
    state.enabled = !!enabled;
    safeWriteStorageFlag(state.enabled);
    applyNightBackground(state.enabled);
    if (state.enabled && !wasEnabled) {
      if (!safeReadTextValue(NIGHT_THEME_KEY)) {
        safeWriteTextValue(
          NIGHT_THEME_KEY,
          safeReadBooleanFlag(AUTO_THEME_APPLIED_KEY) ? readCurrentThemeId() || AUTO_THEME_ID : AUTO_THEME_ID
        );
      }
      if (!safeReadTextValue(NIGHT_TILE_PALETTE_KEY)) {
        safeWriteTextValue(NIGHT_TILE_PALETTE_KEY, DEFAULT_NIGHT_TILE_PALETTE_ID);
      }
      if (!safeReadBooleanFlag(AUTO_THEME_APPLIED_KEY)) {
        safeWriteBooleanFlag(AUTO_THEME_PENDING_KEY, true);
      } else if (safeReadBooleanFlag(AUTO_THEME_PENDING_KEY)) {
        safeWriteBooleanFlag(AUTO_THEME_PENDING_KEY, false);
      }
      syncAppearanceForCurrentState();
    } else if (!state.enabled && wasEnabled) {
      if (!safeReadTextValue(DAY_THEME_KEY)) {
        safeWriteTextValue(DAY_THEME_KEY, DEFAULT_DAY_THEME_ID);
      }
      if (!safeReadTextValue(DAY_TILE_PALETTE_KEY)) {
        safeWriteTextValue(DAY_TILE_PALETTE_KEY, DEFAULT_DAY_TILE_PALETTE_ID);
      }
      syncAppearanceForCurrentState();
      if (safeReadBooleanFlag(AUTO_THEME_PENDING_KEY)) {
        safeWriteBooleanFlag(AUTO_THEME_PENDING_KEY, false);
      }
    } else {
      syncAppearanceForCurrentState();
    }
    syncNightModeSettingsUI();
    return state.enabled;
  }

  function syncNightBackgroundStateFromStorage() {
    state.enabled = safeReadStorageFlag();
    applyNightBackground(state.enabled);
    syncAppearanceForCurrentState();
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

  function bindStorageListener() {
    if (state.hasStorageBinding) return false;
    bindListener(global, "storage", function (eventLike) {
      var eventRecord = toRecord(eventLike);
      var key = typeof eventRecord.key === "string" ? eventRecord.key : "";
      if (
        key &&
        key !== STORAGE_KEY &&
        key !== DAY_THEME_KEY &&
        key !== NIGHT_THEME_KEY &&
        key !== DAY_TILE_PALETTE_KEY &&
        key !== NIGHT_TILE_PALETTE_KEY &&
        key !== AUTO_THEME_APPLIED_KEY &&
        key !== AUTO_THEME_PENDING_KEY
      ) {
        return;
      }
      syncNightBackgroundStateFromStorage();
    });
    state.hasStorageBinding = true;
    return true;
  }

  function bindThemeChangeListener() {
    if (state.hasThemeChangeBinding) return false;
    bindListener(global, "themechange", function () {
      syncCurrentAppearanceToMode(state.enabled);
      if (state.enabled && safeReadBooleanFlag(AUTO_THEME_PENDING_KEY)) {
        markNightThemeAutoApplied();
      }
    });
    state.hasThemeChangeBinding = true;
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
      autoThemePending: safeReadBooleanFlag(AUTO_THEME_PENDING_KEY),
      dayThemeId: safeReadTextValue(DAY_THEME_KEY),
      nightThemeId: safeReadTextValue(NIGHT_THEME_KEY),
      dayTilePaletteId: safeReadTextValue(DAY_TILE_PALETTE_KEY),
      nightTilePaletteId: safeReadTextValue(NIGHT_TILE_PALETTE_KEY)
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
          ensureCurrentModeAppearanceSeeded();
        }
      } else if (safeReadBooleanFlag(AUTO_THEME_PENDING_KEY)) {
        tryApplyNightThemePreset();
      }
    }
    syncAppearanceForCurrentState();
    bindToggle();
    bindLanguageListener();
    bindStorageListener();
    bindThemeChangeListener();
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
