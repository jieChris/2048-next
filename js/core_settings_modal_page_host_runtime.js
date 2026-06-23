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

  var WIN_PROMPT_STORAGE_KEY = "settings_win_prompt_enabled_v1";
  var LEGACY_WIN_PROMPT_STORAGE_KEYS = ["settings_win_prompt_enabled", "win_prompt_enabled"];
  var UI_LANGUAGE_STORAGE_KEY = "ui_language_v1";

  function resolvePositiveNumber(value, fallback) {
    return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
  }

  function getElementById(documentLike, id) {
    var getter = asFunction(toRecord(documentLike).getElementById);
    if (!getter) return null;
    return getter.call(documentLike, id);
  }

  function querySelector(node, selector) {
    var query = asFunction(toRecord(node).querySelector);
    if (!query) return null;
    return query.call(node, selector);
  }

  function appendChild(node, child) {
    var append = asFunction(toRecord(node).appendChild);
    if (!append) return;
    append.call(node, child);
  }

  function insertBefore(node, child, anchor) {
    var insert = asFunction(toRecord(node).insertBefore);
    if (!insert) return;
    insert.call(node, child, anchor);
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function readWinPromptEnabled(windowLike) {
    var storage = toRecord(windowLike).localStorage;
    var getItem = asFunction(toRecord(storage).getItem);
    if (!getItem) return true;
    try {
      var normalize = function (raw) {
        if (raw === null || raw === undefined) return true;
        var text = String(raw).trim().toLowerCase();
        if (!text) return true;
        if (text === "0" || text === "false" || text === "off" || text === "no") return false;
        if (text === "1" || text === "true" || text === "on" || text === "yes") return true;
        return true;
      };

      var currentValue = getItem.call(storage, WIN_PROMPT_STORAGE_KEY);
      if (currentValue !== null && currentValue !== undefined && String(currentValue).trim() !== "") {
        return normalize(currentValue);
      }

      for (var i = 0; i < LEGACY_WIN_PROMPT_STORAGE_KEYS.length; i++) {
        var legacyValue = getItem.call(storage, LEGACY_WIN_PROMPT_STORAGE_KEYS[i]);
        if (legacyValue !== null && legacyValue !== undefined && String(legacyValue).trim() !== "") {
          return normalize(legacyValue);
        }
      }

      return true;
    } catch (_err) {
      return true;
    }
  }

  function writeWinPromptEnabled(windowLike, enabled) {
    var storage = toRecord(windowLike).localStorage;
    var setItem = asFunction(toRecord(storage).setItem);
    if (!setItem) return false;
    var nextValue = enabled ? "1" : "0";
    var didWrite = false;
    try {
      setItem.call(storage, WIN_PROMPT_STORAGE_KEY, nextValue);
      didWrite = true;
    } catch (_err) {
      didWrite = false;
    }
    for (var i = 0; i < LEGACY_WIN_PROMPT_STORAGE_KEYS.length; i++) {
      try {
        setItem.call(storage, LEGACY_WIN_PROMPT_STORAGE_KEYS[i], nextValue);
        didWrite = true;
      } catch (_err2) {}
    }
    return didWrite;
  }

  function readUiLanguage(windowLike) {
    var storage = toRecord(windowLike).localStorage;
    var getItem = asFunction(toRecord(storage).getItem);
    if (!getItem) return "zh";
    try {
      var raw = String(getItem.call(storage, UI_LANGUAGE_STORAGE_KEY) || "").trim().toLowerCase();
      return raw === "en" ? "en" : "zh";
    } catch (_err) {
      return "zh";
    }
  }

  function resolveLocalizedWinPromptNoteText(enabled, windowLike) {
    if (readUiLanguage(windowLike) === "en") {
      return enabled
        ? "Show win prompt when reaching 2048, with Keep Going option."
        : "Do not show win prompt after 2048; continue automatically.";
    }
    return enabled
      ? "合成 2048 时会弹出胜利提示，可选择继续游戏。"
      : "合成 2048 时不弹出胜利提示，将自动继续游戏。";
  }

  function resolveWinPromptNoteText(enabled) {
    return enabled
      ? "合成 2048 时会弹出胜利提示，可选择继续游戏。"
      : "合成 2048 时不弹出胜利提示，将自动继续游戏。";
  }

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function buildSettingsToggleRowHtml(options) {
    var rowId = options.rowId ? ' id="' + escapeAttribute(options.rowId) + '"' : "";
    var desc = options.desc
      ? "<div" +
        (options.descId ? ' id="' + escapeAttribute(options.descId) + '"' : "") +
        ' class="settings-toggle-desc">' +
        options.desc +
        "</div>"
      : "";
    var note = options.noteId
      ? '<div id="' +
        escapeAttribute(options.noteId) +
        '" class="settings-note">' +
        (options.note || "") +
        "</div>"
      : "";
    return (
      "<div" +
      rowId +
      ' class="settings-row settings-toggle-row">' +
      '<div class="settings-toggle-main">' +
      '<div class="settings-toggle-copy">' +
      '<label for="' +
      escapeAttribute(options.inputId) +
      '" class="settings-toggle-title">' +
      options.title +
      "</label>" +
      desc +
      "</div>" +
      '<label class="settings-switch" for="' +
      escapeAttribute(options.inputId) +
      '" aria-label="' +
      escapeAttribute(options.title) +
      '">' +
      '<input id="' +
      escapeAttribute(options.inputId) +
      '" type="checkbox">' +
      '<span class="settings-switch-slider">' +
      (options.sliderInnerHtml || "") +
      "</span>" +
      "</label>" +
      "</div>" +
      note +
      "</div>"
    );
  }

  function buildToolkitEntryRowHtml(lang) {
    return (
      '<div id="toolkit-entry-row" class="settings-row toolkit-entry-row">' +
      '<div class="toolkit-entry-actions">' +
      '<a id="toolkit-palette-link" class="replay-button" href="palette.html">' +
      (lang === "en" ? "Theme Settings" : "主题设置") +
      "</a>" +
      '<a id="toolkit-account-link" class="replay-button" href="account.html">' +
      (lang === "en" ? "Account Center" : "账号中心") +
      "</a>" +
      "</div>" +
      "</div>"
    );
  }

  function buildCanonicalSettingsModalInnerHtml(options) {
    var lang = options.lang === "en" ? "en" : "zh";
    var isEn = lang === "en";
    var rows = [
      "<h3>" + (isEn ? "Settings" : "设置") + "</h3>",
      buildSettingsToggleRowHtml({
        inputId: "win-prompt-toggle",
        title: isEn ? "Win Prompt" : "胜利提示",
        desc: isEn ? "Show a win prompt after reaching 2048" : "合成 2048 后弹出胜利提示",
        noteId: "win-prompt-note"
      }),
      buildSettingsToggleRowHtml({
        rowId: "bgm-settings-row",
        inputId: "bgm-toggle",
        title: isEn ? "Background Music" : "背景音乐",
        descId: "bgm-toggle-desc",
        desc: isEn ? "Loop background music on this page after enabling" : "开启后在当前页面循环播放背景音乐",
        noteId: "bgm-note",
        note: isEn
          ? "Audio is not requested until enabled, keeping the page fast."
          : "默认不加载音频，开启后才会开始请求，避免拖慢页面。"
      }),
      buildSettingsToggleRowHtml({
        rowId: "night-bg-settings-row",
        inputId: "night-bg-toggle",
        title: isEn ? "Night Mode" : "夜间模式",
        descId: "night-bg-toggle-desc",
        desc: isEn ? "Use a softer night background" : "为页面切换成柔和的夜间模式",
        noteId: "night-bg-note",
        note: isEn
          ? "This setting is shared across pages with settings dialogs."
          : "开启后会在所有带设置弹窗的页面同步生效。"
      })
    ];

    if (options.hasInlineStats) {
      rows.push(
        buildSettingsToggleRowHtml({
          inputId: "pku2048-inline-stats-toggle",
          title: isEn ? "Stats Panel" : "统计面板",
          descId: "pku2048-inline-stats-desc",
          desc: isEn ? "Show inline on page." : "直接显示在页面中",
          sliderInnerHtml:
            '<span class="settings-inline-desc-sr" style="display:none;">' +
            (isEn ? "Show inline on page." : "直接显示在页面中") +
            "</span>"
        })
      );
    }

    rows.push(buildToolkitEntryRowHtml(lang));
    return rows.join("");
  }

  var CANONICAL_SETTINGS_ROW_IDS = [
    "win-prompt-toggle",
    "bgm-settings-row",
    "night-bg-settings-row",
    "pku2048-inline-stats-toggle",
    "timer-module-view-toggle",
    "top-button-style-settings-row",
    "ui-language-settings-row",
    "home-guide-trigger-btn",
    "toolkit-entry-row"
  ];

  var DYNAMIC_SETTINGS_ROW_IDS = [
    "timer-module-view-toggle",
    "top-button-style-settings-row",
    "ui-language-settings-row",
    "home-guide-trigger-btn"
  ];

  function arrayIncludes(list, value) {
    return list.indexOf(value) >= 0;
  }

  function getSettingsRowId(row) {
    var rowId = String(toRecord(row).id || "");
    if (rowId) return rowId;
    var input = querySelector(row, "input");
    return String(toRecord(input).id || "");
  }

  function reorderSettingsRows(content) {
    var ownerDocument = toRecord(content).ownerDocument;
    for (var i = 0; i < CANONICAL_SETTINGS_ROW_IDS.length; i++) {
      var rowId = CANONICAL_SETTINGS_ROW_IDS[i];
      var row = rowId === "toolkit-entry-row" || rowId.indexOf("-row") === rowId.length - 4
        ? getElementById(ownerDocument, rowId)
        : null;
      var targetRow = row;
      if (!targetRow) {
        var control = getElementById(ownerDocument, rowId);
        var closest = asFunction(toRecord(control).closest);
        targetRow = closest && control ? closest.call(control, ".settings-row") : null;
      }
      if (targetRow && toRecord(targetRow).parentNode === content) {
        appendChild(content, targetRow);
      }
    }
  }

  function normalizeSettingsModalContent(input) {
    var source = toRecord(input);
    var documentLike = source.documentLike;
    var modal = getElementById(documentLike, "settings-modal");
    if (!modal) {
      return {
        hasModal: false,
        didNormalize: false,
        hasInlineStats: false
      };
    }

    var content = querySelector(modal, ".settings-modal-content");
    if (!content) {
      return {
        hasModal: true,
        didNormalize: false,
        hasInlineStats: false
      };
    }

    var existingRows = [];
    var children = toRecord(toRecord(content).children);
    var childrenLength = typeof children.length === "number" ? Math.max(0, Math.floor(children.length)) : 0;
    for (var i = 0; i < childrenLength; i++) {
      var child = children[i];
      var rowId = getSettingsRowId(child);
      if (arrayIncludes(DYNAMIC_SETTINGS_ROW_IDS, rowId)) {
        existingRows.push(child);
      }
    }

    var hasInlineStats =
      !!getElementById(documentLike, "pku2048-inline-stats-toggle") ||
      existingRows.some(function (row) {
        return getSettingsRowId(row) === "pku2048-inline-stats-toggle";
      });
    var hasCanonicalBase =
      !!getElementById(documentLike, "win-prompt-toggle") &&
      !!getElementById(documentLike, "bgm-toggle") &&
      !!getElementById(documentLike, "night-bg-toggle") &&
      !!getElementById(documentLike, "toolkit-entry-row");

    if (!hasCanonicalBase) {
      toRecord(content).innerHTML = buildCanonicalSettingsModalInnerHtml({
        lang: readUiLanguage(source.windowLike),
        hasInlineStats: hasInlineStats
      });
      for (var j = 0; j < existingRows.length; j++) {
        var toolkitEntry = getElementById(documentLike, "toolkit-entry-row");
        if (toolkitEntry && toRecord(toolkitEntry).parentNode === content) {
          insertBefore(content, existingRows[j], toolkitEntry);
        } else {
          appendChild(content, existingRows[j]);
        }
      }
    }

    reorderSettingsRows(content);

    return {
      hasModal: true,
      didNormalize: true,
      hasInlineStats: hasInlineStats
    };
  }

  function resolveSyncMobileTimerboxUi(source) {
    var direct = asFunction(source.syncMobileTimerboxUi);
    if (direct) return direct;

    var resolver = asFunction(source.resolveSyncMobileTimerboxUi);
    if (resolver) {
      var resolved = resolver();
      var callback = asFunction(resolved);
      if (callback) return callback;
    }

    var windowLike = source.windowLike || null;
    var syncFromWindow = asFunction(toRecord(windowLike).syncMobileTimerboxUI);
    if (!syncFromWindow) return null;
    return function () {
      return syncFromWindow.call(windowLike);
    };
  }

  function createSettingsModalInitResolvers(input) {
    var source = toRecord(input);
    var windowLike = source.windowLike || null;
    var retryDelayMs = resolvePositiveNumber(source.retryDelayMs, 60);
    var setTimeoutLike = asFunction(source.setTimeoutLike);
    var themePageHostRuntime = toRecord(source.themeSettingsPageHostRuntime);
    var timerSettingsHostRuntime = toRecord(source.timerModuleSettingsHostRuntime);
    var timerSettingsPageHostRuntime = toRecord(source.timerModuleSettingsPageHostRuntime);
    var applyThemeSettingsPageInit = asFunction(themePageHostRuntime.applyThemeSettingsPageInit);
    var applyLegacyUndoSettingsCleanup = asFunction(
      timerSettingsHostRuntime.applyLegacyUndoSettingsCleanup
    );
    var applyTimerModuleSettingsPageInit = asFunction(
      timerSettingsPageHostRuntime.applyTimerModuleSettingsPageInit
    );

    function initThemeSettingsUI() {
      if (!applyThemeSettingsPageInit) return null;
      return applyThemeSettingsPageInit({
        themeSettingsHostRuntime: source.themeSettingsHostRuntime,
        themeSettingsRuntime: source.themeSettingsRuntime,
        documentLike: source.documentLike,
        windowLike: windowLike
      });
    }

    function removeLegacyUndoSettingsUI() {
      if (!applyLegacyUndoSettingsCleanup) return null;
      return applyLegacyUndoSettingsCleanup({
        documentLike: source.documentLike
      });
    }

    function initTimerModuleSettingsUI() {
      if (!applyTimerModuleSettingsPageInit) {
        return {
          hasPageHostApi: false,
          didInit: false
        };
      }

      var syncMobileTimerboxUi = resolveSyncMobileTimerboxUi(source);
      var initResult = applyTimerModuleSettingsPageInit({
        timerModuleSettingsHostRuntime: timerSettingsHostRuntime,
        timerModuleRuntime: source.timerModuleRuntime,
        documentLike: source.documentLike,
        windowLike: windowLike,
        retryDelayMs: retryDelayMs,
        setTimeoutLike: setTimeoutLike,
        syncMobileTimerboxUi: syncMobileTimerboxUi,
        reinvokeInit: initTimerModuleSettingsUI
      });

      return {
        hasPageHostApi: true,
        didInit: true,
        result: initResult || null
      };
    }

    function initWinPromptSettingsUI() {
      var toggle = getElementById(source.documentLike, "win-prompt-toggle");
      if (!toggle) {
        return {
          hasToggle: false,
          didBindToggle: false,
          didSync: false
        };
      }

      var note = getElementById(source.documentLike, "win-prompt-note");
      var toggleRecord = toRecord(toggle);
      var sync = function () {
        var enabled = readWinPromptEnabled(windowLike);
        toggleRecord.checked = enabled;
        if (note) {
          toRecord(note).textContent = resolveLocalizedWinPromptNoteText(enabled, windowLike);
        }
      };

      var didBindToggle = false;
      if (!toggleRecord.__winPromptBound) {
        toggleRecord.__winPromptBound = true;
        didBindToggle = bindListener(toggle, "change", function () {
          var enabled = !!toRecord(toggle).checked;
          writeWinPromptEnabled(windowLike, enabled);
          sync();
        });
      }

      sync();
      bindListener(windowLike, "uilanguagechange", sync);

      return {
        hasToggle: true,
        didBindToggle: didBindToggle,
        didSync: true
      };
    }

    return {
      initThemeSettingsUI: initThemeSettingsUI,
      removeLegacyUndoSettingsUI: removeLegacyUndoSettingsUI,
      initTimerModuleSettingsUI: initTimerModuleSettingsUI,
      initWinPromptSettingsUI: initWinPromptSettingsUI
    };
  }

  function createSettingsModalActionResolvers(input) {
    var source = toRecord(input);
    var pageHostRuntime = toRecord(source.settingsModalPageHostRuntime);

    function openSettingsModal() {
      var applyOpen = asFunction(pageHostRuntime.applySettingsModalPageOpen);
      if (applyOpen) {
        return applyOpen({
          settingsModalHostRuntime: source.settingsModalHostRuntime,
          replayModalRuntime: source.replayModalRuntime,
          documentLike: source.documentLike,
          windowLike: source.windowLike,
          removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
          initThemeSettingsUI: source.initThemeSettingsUI,
          initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
          initWinPromptSettingsUI: source.initWinPromptSettingsUI,
          initHomeGuideSettingsUI: source.initHomeGuideSettingsUI
        });
      }
      return applySettingsModalPageOpen({
        settingsModalHostRuntime: source.settingsModalHostRuntime,
        replayModalRuntime: source.replayModalRuntime,
        documentLike: source.documentLike,
        windowLike: source.windowLike,
        removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
        initThemeSettingsUI: source.initThemeSettingsUI,
        initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
        initWinPromptSettingsUI: source.initWinPromptSettingsUI,
        initHomeGuideSettingsUI: source.initHomeGuideSettingsUI
      });
    }

    function closeSettingsModal() {
      var applyClose = asFunction(pageHostRuntime.applySettingsModalPageClose);
      if (applyClose) {
        return applyClose({
          settingsModalHostRuntime: source.settingsModalHostRuntime,
          replayModalRuntime: source.replayModalRuntime,
          documentLike: source.documentLike
        });
      }
      return applySettingsModalPageClose({
        settingsModalHostRuntime: source.settingsModalHostRuntime,
        replayModalRuntime: source.replayModalRuntime,
        documentLike: source.documentLike
      });
    }

    return {
      openSettingsModal: openSettingsModal,
      closeSettingsModal: closeSettingsModal
    };
  }

  function applySettingsModalPageOpen(input) {
    var source = toRecord(input);
    var hostRuntime = toRecord(source.settingsModalHostRuntime);
    var applyOpen = asFunction(hostRuntime.applySettingsModalOpenOrchestration);
    if (!applyOpen) {
      return {
        hasApplyOpenApi: false,
        didApply: false
      };
    }

    normalizeSettingsModalContent({
      documentLike: source.documentLike,
      windowLike: source.windowLike
    });

    applyOpen({
      replayModalRuntime: source.replayModalRuntime,
      documentLike: source.documentLike,
      removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
      initThemeSettingsUI: source.initThemeSettingsUI,
      initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
      initWinPromptSettingsUI: source.initWinPromptSettingsUI,
      initHomeGuideSettingsUI: source.initHomeGuideSettingsUI
    });

    return {
      hasApplyOpenApi: true,
      didApply: true
    };
  }

  function applySettingsModalPageClose(input) {
    var source = toRecord(input);
    var hostRuntime = toRecord(source.settingsModalHostRuntime);
    var applyClose = asFunction(hostRuntime.applySettingsModalCloseOrchestration);
    if (!applyClose) {
      return {
        hasApplyCloseApi: false,
        didApply: false
      };
    }

    applyClose({
      replayModalRuntime: source.replayModalRuntime,
      documentLike: source.documentLike
    });

    return {
      hasApplyCloseApi: true,
      didApply: true
    };
  }

  global.CoreSettingsModalPageHostRuntime = global.CoreSettingsModalPageHostRuntime || {};
  global.CoreSettingsModalPageHostRuntime.createSettingsModalActionResolvers =
    createSettingsModalActionResolvers;
  global.CoreSettingsModalPageHostRuntime.createSettingsModalInitResolvers =
    createSettingsModalInitResolvers;
  global.CoreSettingsModalPageHostRuntime.normalizeSettingsModalContent =
    normalizeSettingsModalContent;
  global.CoreSettingsModalPageHostRuntime.applySettingsModalPageOpen = applySettingsModalPageOpen;
  global.CoreSettingsModalPageHostRuntime.applySettingsModalPageClose = applySettingsModalPageClose;
})(typeof window !== "undefined" ? window : undefined);
