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

  function resolveText(value) {
    return value == null ? "" : String(value);
  }

  function resolveBoolean(value) {
    return !!value;
  }

  function resolveNumber(value, fallback) {
    var parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    return fallback;
  }

  function resolveArray(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    var record = toRecord(value);
    var length = resolveNumber(record.length, 0);
    if (length <= 0) return [];
    var result = [];
    for (var i = 0; i < length; i += 1) {
      result.push(record[i]);
    }
    return result;
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

  function querySelectorAll(node, selector) {
    var query = asFunction(toRecord(node).querySelectorAll);
    if (!query) return [];
    return resolveArray(query.call(node, selector));
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

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function stopPropagation(eventLike) {
    var stop = asFunction(toRecord(eventLike).stopPropagation);
    if (stop) stop.call(eventLike);
  }

  function getChildrenLength(node) {
    var children = toRecord(toRecord(node).children);
    if (typeof children.length === "number" && Number.isFinite(children.length)) {
      return Math.max(0, Math.floor(children.length));
    }
    var childElementCount = resolveNumber(toRecord(node).childElementCount, 0);
    return Math.max(0, childElementCount);
  }

  function classListContains(node, className) {
    var classList = toRecord(toRecord(node).classList);
    var contains = asFunction(classList.contains);
    if (!contains) return false;
    return !!contains.call(classList, className);
  }

  function classListAdd(node, className) {
    var classList = toRecord(toRecord(node).classList);
    var add = asFunction(classList.add);
    if (!add) return;
    add.call(classList, className);
  }

  function classListRemove(node, className) {
    var classList = toRecord(toRecord(node).classList);
    var remove = asFunction(classList.remove);
    if (!remove) return;
    remove.call(classList, className);
  }

  function setThemeOptionDatasetValue(optionLike, value) {
    var optionRecord = toRecord(optionLike);
    if (!isRecord(optionRecord.dataset)) {
      optionRecord.dataset = {
        value: value
      };
      return;
    }
    optionRecord.dataset.value = value;
  }

  function resolveThemeOptionFromEvent(eventLike, fallbackOption) {
    var eventRecord = toRecord(eventLike);
    return eventRecord.currentTarget || fallbackOption;
  }

  function resolveThemeOptionCount(container) {
    return querySelectorAll(container, ".custom-option").length;
  }

  function createEmptyResult() {
    return {
      hasThemeUi: false,
      didInitOptions: false,
      didBindTrigger: false,
      didBindOutside: false,
      didBindLeave: false,
      didBindThemeChange: false,
      didRenderPreview: false,
      didSyncUi: false,
      didApplyPreview: false,
      optionCount: 0
    };
  }

  function applyThemeSettingsUi(input) {
    var source = toRecord(input);
    var documentLike = toRecord(source.documentLike);
    var windowLike = toRecord(source.windowLike);
    var themeSettingsRuntime = toRecord(source.themeSettingsRuntime);
    var themeManager = toRecord(source.themeManager);

    var formatThemePreviewValue = asFunction(themeSettingsRuntime.formatThemePreviewValue);
    var resolveThemePreviewTileValues = asFunction(themeSettingsRuntime.resolveThemePreviewTileValues);
    var resolveThemePreviewLayout = asFunction(themeSettingsRuntime.resolveThemePreviewLayout);
    var resolveThemePreviewCssSelectors = asFunction(
      themeSettingsRuntime.resolveThemePreviewCssSelectors
    );
    var resolveThemeOptions = asFunction(themeSettingsRuntime.resolveThemeOptions);
    var resolveThemeSelectLabel = asFunction(themeSettingsRuntime.resolveThemeSelectLabel);
    var resolveThemeDropdownToggleState = asFunction(
      themeSettingsRuntime.resolveThemeDropdownToggleState
    );
    var resolveThemeBindingState = asFunction(themeSettingsRuntime.resolveThemeBindingState);
    var resolveThemeOptionValue = asFunction(themeSettingsRuntime.resolveThemeOptionValue);
    var resolveThemeOptionSelectedState = asFunction(
      themeSettingsRuntime.resolveThemeOptionSelectedState
    );

    if (
      !formatThemePreviewValue ||
      !resolveThemePreviewTileValues ||
      !resolveThemePreviewLayout ||
      !resolveThemePreviewCssSelectors ||
      !resolveThemeOptions ||
      !resolveThemeSelectLabel ||
      !resolveThemeDropdownToggleState ||
      !resolveThemeBindingState ||
      !resolveThemeOptionValue ||
      !resolveThemeOptionSelectedState
    ) {
      return createEmptyResult();
    }

    var getThemes = asFunction(themeManager.getThemes);
    var getCurrentTheme = asFunction(themeManager.getCurrentTheme);
    var applyTheme = asFunction(themeManager.applyTheme);
    var getPreviewCss = asFunction(themeManager.getPreviewCss);
    var getTileValues = asFunction(themeManager.getTileValues);

    if (!getThemes || !getCurrentTheme || !applyTheme) {
      return createEmptyResult();
    }

    var originalSelect = getElementById(documentLike, "theme-select");
    var previewRoot = getElementById(documentLike, "theme-preview-grid");
    var customTrigger = getElementById(documentLike, "theme-select-trigger");
    var customOptionsContainer = getElementById(documentLike, "theme-select-options");
    var customSelect = querySelector(documentLike, ".custom-select");

    if (!originalSelect || !previewRoot || !customTrigger || !customOptionsContainer || !customSelect) {
      return createEmptyResult();
    }

    var themes = resolveArray(
      resolveThemeOptions.call(themeSettingsRuntime, {
        themes: getThemes.call(themeManager)
      })
    );
    var confirmedTheme = resolveText(getCurrentTheme.call(themeManager));
    var previewLayout = toRecord(resolveThemePreviewLayout.call(themeSettingsRuntime));

    var ensurePreviewStyleTag = function () {
      var style = getElementById(documentLike, "theme-preview-style");
      if (style) return style;
      style = createElement(documentLike, "style");
      if (!style) return null;
      toRecord(style).id = "theme-preview-style";
      appendChild(documentLike.head, style);
      return style;
    };

    var ensureDualPreviewGrids = function () {
      var previewRootRecord = toRecord(previewRoot);
      var existingRefs = toRecord(previewRootRecord.__dualPreviewRefs);
      if (existingRefs.pow2 || existingRefs.fib) return existingRefs;

      previewRootRecord.className = resolveText(previewLayout.containerClassName);
      previewRootRecord.innerHTML = resolveText(previewLayout.innerHtml);
      var refs = {
        pow2: getElementById(documentLike, resolveText(previewLayout.pow2GridId)),
        fib: getElementById(documentLike, resolveText(previewLayout.fibonacciGridId))
      };
      previewRootRecord.__dualPreviewRefs = refs;
      return toRecord(previewRootRecord.__dualPreviewRefs);
    };

    var renderPreviewGrid = function (gridEl, values) {
      if (!gridEl) return false;
      var gridRecord = toRecord(gridEl);
      gridRecord.innerHTML = "";
      var valueList = resolveArray(values);
      var renderedCount = 0;
      for (var i = 0; i < valueList.length; i += 1) {
        var value = valueList[i];
        var tile = createElement(documentLike, "div");
        if (!tile) continue;
        var tileRecord = toRecord(tile);
        tileRecord.className = "theme-preview-tile theme-color-" + resolveText(value);
        tileRecord.textContent = resolveText(formatThemePreviewValue.call(themeSettingsRuntime, value));
        appendChild(gridEl, tile);
        renderedCount += 1;
      }
      return renderedCount > 0;
    };

    var getPreviewCssText = function (themeId) {
      if (!getPreviewCss) return "";
      var cssSelectors = toRecord(
        resolveThemePreviewCssSelectors.call(themeSettingsRuntime, {
          previewLayout: previewLayout,
          fallbackPow2Selector: "#theme-preview-grid-pow2",
          fallbackFibonacciSelector: "#theme-preview-grid-fib"
        })
      );
      return resolveText(
        getPreviewCss.call(themeManager, themeId, {
          pow2Selector: resolveText(cssSelectors.pow2Selector),
          fibSelector: resolveText(cssSelectors.fibSelector)
        })
      );
    };

    var applyPreviewTheme = function (themeId) {
      var style = ensurePreviewStyleTag();
      if (!style) return false;
      toRecord(style).textContent = getPreviewCssText(themeId);
      return true;
    };

    var renderDualPreviewGrids = function () {
      var refs = ensureDualPreviewGrids();
      var previewValues = toRecord(
        resolveThemePreviewTileValues.call(themeSettingsRuntime, {
          getTileValues: getTileValues
            ? function (ruleset) {
                return getTileValues.call(themeManager, ruleset);
              }
            : null
        })
      );
      var didRenderPow2 = renderPreviewGrid(refs.pow2, previewValues.pow2Values);
      var didRenderFib = renderPreviewGrid(refs.fib, previewValues.fibonacciValues);
      return didRenderPow2 || didRenderFib;
    };

    var updateCustomSelectUi = function () {
      var currentThemeId = resolveText(getCurrentTheme.call(themeManager));
      var label = resolveText(
        resolveThemeSelectLabel.call(themeSettingsRuntime, {
          themes: themes,
          currentThemeId: currentThemeId,
          fallbackLabel: "选择主题"
        })
      );
      var triggerText = querySelector(customTrigger, "span");
      if (triggerText) {
        toRecord(triggerText).textContent = label;
      }
      var options = querySelectorAll(customOptionsContainer, ".custom-option");
      for (var i = 0; i < options.length; i += 1) {
        var option = options[i];
        var optionValue = resolveText(
          resolveThemeOptionValue.call(themeSettingsRuntime, {
            optionLike: option
          })
        );
        var selected = resolveBoolean(
          resolveThemeOptionSelectedState.call(themeSettingsRuntime, {
            optionValue: optionValue,
            currentThemeId: currentThemeId
          })
        );
        if (selected) {
          classListAdd(option, "selected");
        } else {
          classListRemove(option, "selected");
        }
      }
      return true;
    };

    var closeDropdown = function () {
      classListRemove(customSelect, "open");
      applyPreviewTheme(confirmedTheme);
    };

    var toggleDropdown = function (eventLike) {
      stopPropagation(eventLike);
      var isOpen = classListContains(customSelect, "open");
      var resolveDropdownStateNow = asFunction(
        themeSettingsRuntime.resolveThemeDropdownToggleState
      );
      if (!resolveDropdownStateNow) return;
      var toggleState = toRecord(
        resolveDropdownStateNow.call(themeSettingsRuntime, {
          isOpen: isOpen
        })
      );
      if (!resolveBoolean(toggleState.shouldOpen)) {
        closeDropdown();
        return;
      }
      confirmedTheme = resolveText(getCurrentTheme.call(themeManager));
      classListAdd(customSelect, "open");
      var selected = querySelector(customOptionsContainer, ".custom-option.selected");
      if (!selected) return;
      var selectedOffset = resolveNumber(toRecord(selected).offsetTop, 0);
      var containerOffset = resolveNumber(toRecord(customOptionsContainer).offsetTop, 0);
      toRecord(customOptionsContainer).scrollTop = selectedOffset - containerOffset;
    };

    var didInitOptions = false;
    if (getChildrenLength(customOptionsContainer) === 0) {
      toRecord(customOptionsContainer).innerHTML = "";
      for (var i = 0; i < themes.length; i += 1) {
        var theme = toRecord(themes[i]);
        var option = createElement(documentLike, "div");
        if (!option) continue;
        var optionRecord = toRecord(option);
        optionRecord.className = "custom-option";
        optionRecord.textContent = resolveText(theme.label);
        setThemeOptionDatasetValue(option, resolveText(theme.id));
        bindListener(option, "click", function (eventLike) {
          stopPropagation(eventLike);
          var optionLike = resolveThemeOptionFromEvent(eventLike, option);
          var value = resolveText(
            resolveThemeOptionValue.call(themeSettingsRuntime, {
              optionLike: optionLike
            })
          );
          confirmedTheme = value;
          applyTheme.call(themeManager, value);
          applyPreviewTheme(value);
          closeDropdown();
        });
        bindListener(option, "mouseenter", function (eventLike) {
          var optionLike = resolveThemeOptionFromEvent(eventLike, option);
          var value = resolveText(
            resolveThemeOptionValue.call(themeSettingsRuntime, {
              optionLike: optionLike
            })
          );
          applyPreviewTheme(value);
        });
        appendChild(customOptionsContainer, option);
        didInitOptions = true;
      }
    }

    var didBindTrigger = false;
    var triggerBindingState = toRecord(
      resolveThemeBindingState.call(themeSettingsRuntime, {
        alreadyBound: resolveBoolean(toRecord(customTrigger).__bound)
      })
    );
    if (resolveBoolean(triggerBindingState.shouldBind)) {
      if (bindListener(customTrigger, "click", toggleDropdown)) {
        toRecord(customTrigger).__bound = triggerBindingState.boundValue;
        didBindTrigger = true;
      }
    }

    var didBindOutside = false;
    var outsideBindingState = toRecord(
      resolveThemeBindingState.call(themeSettingsRuntime, {
        alreadyBound: resolveBoolean(windowLike.__clickOutsideBound)
      })
    );
    if (resolveBoolean(outsideBindingState.shouldBind)) {
      if (
        bindListener(documentLike, "click", function (eventLike) {
          var target = toRecord(eventLike).target;
          var contains = asFunction(toRecord(customSelect).contains);
          if (!contains || !contains.call(customSelect, target)) {
            closeDropdown();
          }
        })
      ) {
        windowLike.__clickOutsideBound = outsideBindingState.boundValue;
        didBindOutside = true;
      }
    }

    var didBindLeave = false;
    var leaveBindingState = toRecord(
      resolveThemeBindingState.call(themeSettingsRuntime, {
        alreadyBound: resolveBoolean(toRecord(customSelect).__mouseleaveBound)
      })
    );
    if (resolveBoolean(leaveBindingState.shouldBind)) {
      if (
        bindListener(customSelect, "mouseleave", function () {
          if (classListContains(customSelect, "open")) {
            applyPreviewTheme(confirmedTheme);
          }
        })
      ) {
        toRecord(customSelect).__mouseleaveBound = leaveBindingState.boundValue;
        didBindLeave = true;
      }
    }

    var didRenderPreview = renderDualPreviewGrids();
    var didSyncUi = updateCustomSelectUi();
    var didApplyPreview = applyPreviewTheme(confirmedTheme);

    var didBindThemeChange = false;
    var changeSyncBindingState = toRecord(
      resolveThemeBindingState.call(themeSettingsRuntime, {
        alreadyBound: resolveBoolean(windowLike.__themeChangeSyncBound)
      })
    );
    if (resolveBoolean(changeSyncBindingState.shouldBind)) {
      if (
        bindListener(windowLike, "themechange", function () {
          confirmedTheme = resolveText(getCurrentTheme.call(themeManager));
          updateCustomSelectUi();
          applyPreviewTheme(confirmedTheme);
        })
      ) {
        windowLike.__themeChangeSyncBound = changeSyncBindingState.boundValue;
        didBindThemeChange = true;
      }
    }

    return {
      hasThemeUi: true,
      didInitOptions: didInitOptions,
      didBindTrigger: didBindTrigger,
      didBindOutside: didBindOutside,
      didBindLeave: didBindLeave,
      didBindThemeChange: didBindThemeChange,
      didRenderPreview: didRenderPreview,
      didSyncUi: didSyncUi,
      didApplyPreview: didApplyPreview,
      optionCount: resolveThemeOptionCount(customOptionsContainer)
    };
  }

  global.CoreThemeSettingsHostRuntime = global.CoreThemeSettingsHostRuntime || {};
  global.CoreThemeSettingsHostRuntime.applyThemeSettingsUi = applyThemeSettingsUi;
})(typeof window !== "undefined" ? window : undefined);
