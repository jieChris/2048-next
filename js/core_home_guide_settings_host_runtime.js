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

  function resolveBoolean(value) {
    return !!value;
  }

  function resolveText(value) {
    return value == null ? "" : String(value);
  }

  function querySelector(node, selector) {
    var query = asFunction(toRecord(node).querySelector);
    if (!query) return null;
    return query.call(node, selector);
  }

  function getElementById(documentLike, id) {
    var getter = asFunction(toRecord(documentLike).getElementById);
    if (!getter) return null;
    return getter.call(documentLike, id);
  }

  function createElement(documentLike, tagName) {
    var creator = asFunction(toRecord(documentLike).createElement);
    if (!creator) return null;
    return creator.call(documentLike, tagName);
  }

  function appendChild(node, child) {
    var append = asFunction(toRecord(node).appendChild);
    if (!append) return;
    append.call(node, child);
  }

  function insertBefore(node, child, before) {
    var insert = asFunction(toRecord(node).insertBefore);
    if (!insert) return;
    insert.call(node, child, before);
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function readToggleChecked(toggle) {
    return resolveBoolean(toRecord(toggle).checked);
  }

  function ensureHomeGuideSettingsToggle(input) {
    var source = toRecord(input);
    var documentLike = toRecord(source.documentLike);
    var existingToggle = getElementById(documentLike, "home-guide-toggle");
    if (existingToggle) return existingToggle;

    var modal = getElementById(documentLike, "settings-modal");
    if (!modal) return null;

    var content = querySelector(modal, ".settings-modal-content");
    if (!content) return null;

    var row = createElement(documentLike, "div");
    if (!row) return null;
    var rowRecord = toRecord(row);
    rowRecord.className = "settings-row";

    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var buildRowInnerHtml = asFunction(homeGuideRuntime.buildHomeGuideSettingsRowInnerHtml);
    rowRecord.innerHTML = resolveText(buildRowInnerHtml ? buildRowInnerHtml() : "");

    var actions = querySelector(content, ".replay-modal-actions");
    if (actions && toRecord(actions).parentNode === content) {
      insertBefore(content, row, actions);
    } else {
      appendChild(content, row);
    }

    return getElementById(documentLike, "home-guide-toggle");
  }

  function applyHomeGuideSettingsUi(input) {
    var source = toRecord(input);
    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var resolveHomeGuideSettingsState = asFunction(homeGuideRuntime.resolveHomeGuideSettingsState);
    var resolveHomeGuideBindingState = asFunction(homeGuideRuntime.resolveHomeGuideBindingState);
    var resolveHomeGuideToggleAction = asFunction(homeGuideRuntime.resolveHomeGuideToggleAction);
    if (!resolveHomeGuideSettingsState || !resolveHomeGuideBindingState || !resolveHomeGuideToggleAction) {
      return {
        hasToggle: false,
        didBindToggle: false,
        didAssignSync: false,
        didSync: false
      };
    }

    var toggle = ensureHomeGuideSettingsToggle({
      documentLike: source.documentLike,
      homeGuideRuntime: homeGuideRuntime
    });
    if (!toggle) {
      return {
        hasToggle: false,
        didBindToggle: false,
        didAssignSync: false,
        didSync: false
      };
    }

    var documentLike = toRecord(source.documentLike);
    var note = getElementById(documentLike, "home-guide-note");
    var isHomePage = asFunction(source.isHomePage);
    var closeSettingsModal = asFunction(source.closeSettingsModal);
    var startHomeGuide = asFunction(source.startHomeGuide);
    var homeGuideState = toRecord(source.homeGuideState);

    var didSync = false;
    var sync = function () {
      var uiState = toRecord(resolveHomeGuideSettingsState({
        isHomePage: isHomePage ? !!isHomePage() : false,
        guideActive: resolveBoolean(homeGuideState.active),
        fromSettings: resolveBoolean(homeGuideState.fromSettings)
      }));
      var toggleRecord = toRecord(toggle);
      toggleRecord.disabled = resolveBoolean(uiState.toggleDisabled);
      toggleRecord.checked = resolveBoolean(uiState.toggleChecked);
      if (note) {
        toRecord(note).textContent = resolveText(uiState.noteText);
      }
      didSync = true;
    };

    var didAssignSync = false;
    if (isRecord(source.windowLike)) {
      source.windowLike.syncHomeGuideSettingsUI = sync;
      didAssignSync = true;
    }

    var toggleRecord = toRecord(toggle);
    var toggleBindingState = toRecord(resolveHomeGuideBindingState({
      alreadyBound: resolveBoolean(toggleRecord.__homeGuideBound)
    }));

    var didBindToggle = false;
    if (toggleBindingState.shouldBind) {
      toggleRecord.__homeGuideBound = toggleBindingState.boundValue;
      didBindToggle = bindListener(toggle, "change", function () {
        var toggleAction = toRecord(resolveHomeGuideToggleAction({
          checked: readToggleChecked(toggle),
          isHomePage: isHomePage ? !!isHomePage() : false
        }));
        if (toggleAction.shouldResync) {
          sync();
          return;
        }
        if (toggleAction.shouldStartGuide && startHomeGuide) {
          if (toggleAction.shouldCloseSettings && closeSettingsModal) {
            closeSettingsModal();
          }
          startHomeGuide({
            fromSettings: resolveBoolean(toggleAction.startFromSettings)
          });
        }
      });
    }

    sync();

    return {
      hasToggle: true,
      didBindToggle: didBindToggle,
      didAssignSync: didAssignSync,
      didSync: didSync
    };
  }

  global.CoreHomeGuideSettingsHostRuntime = global.CoreHomeGuideSettingsHostRuntime || {};
  global.CoreHomeGuideSettingsHostRuntime.applyHomeGuideSettingsUi = applyHomeGuideSettingsUi;
})(typeof window !== "undefined" ? window : undefined);
