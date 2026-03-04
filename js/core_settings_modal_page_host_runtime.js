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

  function resolvePositiveNumber(value, fallback) {
    return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
  }

  function getElementById(documentLike, id) {
    var getter = asFunction(toRecord(documentLike).getElementById);
    if (!getter) return null;
    return getter.call(documentLike, id);
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

  function resolveWinPromptNoteText(enabled) {
    return enabled
      ? "合成 2048 时会弹出胜利提示，可选择继续游戏。"
      : "合成 2048 时不弹出胜利提示，将自动继续游戏。";
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
      if (!applyTimerModuleSettingsPageInit) return null;
      return applyTimerModuleSettingsPageInit({
        timerModuleSettingsHostRuntime: source.timerModuleSettingsHostRuntime,
        timerModuleRuntime: source.timerModuleRuntime,
        documentLike: source.documentLike,
        windowLike: windowLike,
        retryDelayMs: retryDelayMs,
        setTimeoutLike: setTimeoutLike,
        reinvokeInit: initTimerModuleSettingsUI,
        syncMobileTimerboxUi: resolveSyncMobileTimerboxUi(source)
      });
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
          toRecord(note).textContent = resolveWinPromptNoteText(enabled);
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
  global.CoreSettingsModalPageHostRuntime.applySettingsModalPageOpen = applySettingsModalPageOpen;
  global.CoreSettingsModalPageHostRuntime.applySettingsModalPageClose = applySettingsModalPageClose;
})(typeof window !== "undefined" ? window : undefined);
