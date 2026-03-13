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

  function removeChild(node, child) {
    var remove = asFunction(toRecord(node).removeChild);
    if (!remove) return false;
    remove.call(node, child);
    return true;
  }

  function createElement(documentLike, tag) {
    var creator = asFunction(toRecord(documentLike).createElement);
    if (!creator) return null;
    return creator.call(documentLike, tag);
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function resolveBoolean(value) {
    return !!value;
  }

  function resolveText(value) {
    return value == null ? "" : String(value);
  }

  function readToggleChecked(toggle) {
    return resolveBoolean(toRecord(toggle).checked);
  }

  function readUiLang(windowLike) {
    var storage = toRecord(windowLike).localStorage;
    var getter = asFunction(toRecord(storage).getItem);
    if (!getter) return "zh";
    try {
      var raw = resolveText(getter.call(storage, "ui_language_v1")).toLowerCase();
      return raw === "en" ? "en" : "zh";
    } catch (_err) {
      return "zh";
    }
  }

  function resolveLeaderboardSupport(windowLike, manager, documentLike) {
    var onlineRuntime = toRecord(toRecord(windowLike).OnlineLeaderboardRuntime);
    var isModeSupported = asFunction(onlineRuntime.isLeaderboardModeSupported);
    if (!isModeSupported) return false;

    var candidates = [];
    function pushCandidate(value) {
      var text = resolveText(value).trim();
      if (!text) return;
      if (candidates.indexOf(text) >= 0) return;
      candidates.push(text);
    }

    pushCandidate(manager && manager.modeKey);
    pushCandidate(manager && manager.mode);

    var bodyLike = toRecord(documentLike).body;
    var getAttribute = asFunction(toRecord(bodyLike).getAttribute);
    if (getAttribute) {
      pushCandidate(getAttribute.call(bodyLike, "data-mode-id"));
    }

    pushCandidate(toRecord(toRecord(windowLike).GAME_MODE_CONFIG).key);

    if (candidates.length <= 0) return true;
    for (var i = 0; i < candidates.length; i++) {
      if (resolveBoolean(isModeSupported(candidates[i]))) return true;
    }
    return false;
  }

  function resolveUiLang(windowLike) {
    try {
      var storage = toRecord(windowLike).localStorage;
      var getter = asFunction(toRecord(storage).getItem);
      var raw = getter ? resolveText(getter.call(storage, "ui_language_v1")).toLowerCase() : "";
      return raw === "en" ? "en" : "zh";
    } catch (_err) {
      return "zh";
    }
  }

  function applyLegacyUndoSettingsCleanup(input) {
    var source = toRecord(input);
    var toggle = getElementById(source.documentLike, "undo-enabled-toggle");
    if (!toggle) {
      return {
        hadToggle: false,
        didRemoveRow: false,
        didHideToggle: false
      };
    }

    var closest = asFunction(toRecord(toggle).closest);
    var row = closest ? closest.call(toggle, ".settings-row") : null;
    var parentNode = toRecord(row).parentNode;
    var didRemoveRow = !!(row && parentNode && removeChild(parentNode, row));
    if (!didRemoveRow) {
      var style = toRecord(toRecord(toggle).style);
      style.display = "none";
      toRecord(toggle).style = style;
    }

    return {
      hadToggle: true,
      didRemoveRow: didRemoveRow,
      didHideToggle: !didRemoveRow
    };
  }

  function ensureTimerModuleSettingsToggle(input) {
    var source = toRecord(input);
    var documentLike = source.documentLike;
    var timerModuleRuntime = toRecord(source.timerModuleRuntime);
    var buildSettingsRow = asFunction(timerModuleRuntime.buildTimerModuleSettingsRowInnerHtml);
    var existingToggle = getElementById(documentLike, "timer-module-view-toggle");
    var existingClosest = asFunction(toRecord(existingToggle).closest);
    var existingRow = existingClosest && existingToggle
      ? existingClosest.call(existingToggle, ".settings-row")
      : null;
    if (existingRow) {
      toRecord(existingRow).innerHTML = buildSettingsRow ? String(buildSettingsRow()) : "";
      return getElementById(documentLike, "timer-module-view-toggle");
    }

    var modal = getElementById(documentLike, "settings-modal");
    if (!modal) return null;
    var content = querySelector(modal, ".settings-modal-content");
    if (!content) return null;

    var row = createElement(documentLike, "div");
    if (!row) return null;
    var rowRecord = toRecord(row);
    rowRecord.className = "settings-row settings-toggle-row";
    rowRecord.innerHTML = buildSettingsRow ? String(buildSettingsRow()) : "";

    var actions = querySelector(content, ".replay-modal-actions");
    if (actions && toRecord(actions).parentNode === content) {
      insertBefore(content, row, actions);
    } else {
      appendChild(content, row);
    }

    return getElementById(documentLike, "timer-module-view-toggle");
  }

  function applyTimerModuleSettingsUi(input) {
    var source = toRecord(input);
    var toggle = source.toggle;
    if (!toggle) {
      return {
        hasToggle: false,
        shouldRetry: false,
        didScheduleRetry: false,
        didAssignSync: false,
        didBindToggle: false,
        didSync: false
      };
    }

    var timerModuleRuntime = toRecord(source.timerModuleRuntime);
    var resolveTimerModuleInitRetryState = asFunction(
      timerModuleRuntime.resolveTimerModuleInitRetryState
    );
    var resolveTimerModuleCurrentViewMode = asFunction(
      timerModuleRuntime.resolveTimerModuleCurrentViewMode
    );
    var resolveTimerModuleSettingsState = asFunction(
      timerModuleRuntime.resolveTimerModuleSettingsState
    );
    var resolveTimerModuleBindingState = asFunction(
      timerModuleRuntime.resolveTimerModuleBindingState
    );
    var resolveTimerModuleViewMode = asFunction(timerModuleRuntime.resolveTimerModuleViewMode);
    var resolveTimerModuleAppliedViewMode = asFunction(
      timerModuleRuntime.resolveTimerModuleAppliedViewMode
    );
    if (
      !resolveTimerModuleInitRetryState ||
      !resolveTimerModuleCurrentViewMode ||
      !resolveTimerModuleSettingsState ||
      !resolveTimerModuleBindingState ||
      !resolveTimerModuleViewMode ||
      !resolveTimerModuleAppliedViewMode
    ) {
      return {
        hasToggle: true,
        shouldRetry: false,
        didScheduleRetry: false,
        didAssignSync: false,
        didBindToggle: false,
        didSync: false
      };
    }

    var windowLike = toRecord(source.windowLike);
    var retryState = toRecord(
      resolveTimerModuleInitRetryState({
        hasToggle: true,
        hasManager: !!windowLike.game_manager,
        retryDelayMs: source.retryDelayMs
      })
    );
    var shouldRetry = resolveBoolean(retryState.shouldRetry);

    var didScheduleRetry = false;
    if (shouldRetry) {
      var scheduleRetry = asFunction(source.scheduleRetry);
      if (scheduleRetry) {
        scheduleRetry(
          typeof retryState.retryDelayMs === "number" && retryState.retryDelayMs > 0
            ? retryState.retryDelayMs
            : 60
        );
        didScheduleRetry = true;
      }
      return {
        hasToggle: true,
        shouldRetry: true,
        didScheduleRetry: didScheduleRetry,
        didAssignSync: false,
        didBindToggle: false,
        didSync: false
      };
    }

    var noteElement = source.noteElement;
    var syncMobileTimerboxUi = asFunction(source.syncMobileTimerboxUi);
    var didSync = false;

    var sync = function () {
      if (!windowLike.game_manager) return;
      var manager = toRecord(windowLike.game_manager);
      var viewMode = resolveTimerModuleCurrentViewMode({
        manager: manager,
        fallbackViewMode: "timer"
      });
      var hasLeaderboard = resolveLeaderboardSupport(
        windowLike,
        manager,
        source.documentLike
      );
      var settingsState = toRecord(
        resolveTimerModuleSettingsState({
          viewMode: viewMode,
          hasLeaderboard: hasLeaderboard,
          lang: readUiLang(windowLike)
        })
      );
      var lang = readUiLang(windowLike);
      var toggleRecord = toRecord(toggle);
      toggleRecord.disabled = resolveBoolean(settingsState.toggleDisabled);
      toggleRecord.checked = resolveBoolean(settingsState.toggleChecked);

      var titleElement = querySelector(
        source.documentLike,
        "label[for='timer-module-view-toggle'].settings-toggle-title"
      );
      if (titleElement) {
        toRecord(titleElement).textContent = resolveText(
          settingsState.toggleTitleText || (lang === "en" ? "Timer Mode" : "计时器模式")
        );
      }

      var switchLabel = querySelector(
        source.documentLike,
        "label.settings-switch[for='timer-module-view-toggle']"
      );
      if (switchLabel) {
        var setAttribute = asFunction(toRecord(switchLabel).setAttribute);
        if (setAttribute) {
          setAttribute.call(
            switchLabel,
            "aria-label",
            resolveText(settingsState.toggleTitleText || (lang === "en" ? "Timer Mode" : "计时器模式"))
          );
        }
      }

      var toggleLabel = getElementById(source.documentLike, "timer-module-view-label");
      if (toggleLabel) {
        toRecord(toggleLabel).textContent = resolveText(settingsState.toggleLabelText);
      }

      var closest = asFunction(toggleRecord.closest);
      var row = closest ? closest.call(toggle, ".settings-row") : null;
      if (row) {
        toRecord(toRecord(row).style).display = settingsState.rowVisible === false ? "none" : "";
      }

      if (noteElement) {
        toRecord(noteElement).textContent = resolveText(settingsState.noteText);
      }
      if (syncMobileTimerboxUi) {
        syncMobileTimerboxUi();
      }
      var onlineRuntime = toRecord(windowLike).OnlineLeaderboardRuntime;
      var refreshTimerLeaderboardPanel = asFunction(
        toRecord(onlineRuntime).refreshTimerLeaderboardPanel
      );
      if (refreshTimerLeaderboardPanel) {
        try {
          refreshTimerLeaderboardPanel(true);
        } catch (_errRefresh) {}
      }
      didSync = true;
    };

    var didAssignSync = false;
    if (isRecord(source.windowLike)) {
      source.windowLike.syncTimerModuleSettingsUI = sync;
      didAssignSync = true;
    }

    var toggleRecord = toRecord(toggle);
    var toggleBindingState = toRecord(
      resolveTimerModuleBindingState({
        alreadyBound: resolveBoolean(toggleRecord.__timerViewBound)
      })
    );

    var didBindToggle = false;
    if (toggleBindingState.shouldBind) {
      toggleRecord.__timerViewBound = toggleBindingState.boundValue;
      didBindToggle = bindListener(toggle, "change", function () {
        var manager = toRecord(windowLike.game_manager);
        if (typeof manager.setTimerModuleViewMode !== "function") return;
        var nextViewMode = resolveTimerModuleViewMode({
          checked: readToggleChecked(toggle)
        });
        var appliedViewMode = resolveTimerModuleAppliedViewMode({
          nextViewMode: nextViewMode,
          checked: readToggleChecked(toggle)
        });
        manager.setTimerModuleViewMode(resolveText(appliedViewMode));
        sync();
      });
    }

    sync();
    if (!toggleRecord.__timerViewLangBound) {
      toggleRecord.__timerViewLangBound = true;
      bindListener(windowLike, "uilanguagechange", function () {
        sync();
        var schedule = asFunction(toRecord(windowLike).setTimeout);
        if (schedule) {
          schedule(sync, 0);
        }
      });
    }

    return {
      hasToggle: true,
      shouldRetry: false,
      didScheduleRetry: false,
      didAssignSync: didAssignSync,
      didBindToggle: didBindToggle,
      didSync: didSync
    };
  }

  global.CoreTimerModuleSettingsHostRuntime = global.CoreTimerModuleSettingsHostRuntime || {};
  global.CoreTimerModuleSettingsHostRuntime.applyLegacyUndoSettingsCleanup =
    applyLegacyUndoSettingsCleanup;
  global.CoreTimerModuleSettingsHostRuntime.ensureTimerModuleSettingsToggle =
    ensureTimerModuleSettingsToggle;
  global.CoreTimerModuleSettingsHostRuntime.applyTimerModuleSettingsUi =
    applyTimerModuleSettingsUi;
})(typeof window !== "undefined" ? window : undefined);
