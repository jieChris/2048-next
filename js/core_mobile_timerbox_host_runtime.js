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

  function invoke(callback) {
    var fn = asFunction(callback);
    if (!fn) return false;
    fn();
    return true;
  }

  function getElementById(getter, id) {
    var fn = asFunction(getter);
    if (!fn) return null;
    return fn(id);
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function preventDefault(eventLike) {
    var prevent = asFunction(toRecord(eventLike).preventDefault);
    if (!prevent) return;
    prevent.call(eventLike);
  }

  function hasClass(element, className) {
    var classList = toRecord(toRecord(element).classList);
    var contains = asFunction(classList.contains);
    return contains ? !!contains.call(classList, className) : false;
  }

  function removeClass(element, className) {
    var classList = toRecord(toRecord(element).classList);
    var remove = asFunction(classList.remove);
    if (!remove) return false;
    remove.call(classList, className);
    return true;
  }

  function toggleClass(element, className, enabled) {
    var classList = toRecord(toRecord(element).classList);
    var toggle = asFunction(classList.toggle);
    if (!toggle) return false;
    toggle.call(classList, className, !!enabled);
    return true;
  }

  function setStyleDisplay(element, value) {
    var style = toRecord(toRecord(element).style);
    if (!style) return false;
    style.display = value;
    return true;
  }

  function setAttribute(element, name, value) {
    var target = toRecord(element);
    var setAttr = asFunction(target.setAttribute);
    if (setAttr) {
      setAttr.call(element, name, value);
      return true;
    }
    target[name] = value;
    return true;
  }

  function setInnerHtml(element, html) {
    var target = toRecord(element);
    target.innerHTML = html;
    return true;
  }

  function callRuntime(runtime, methodName, payload) {
    var runtimeRecord = toRecord(runtime);
    var method = asFunction(runtimeRecord[methodName]);
    if (!method) return null;
    return method.call(runtime, payload);
  }

  function callBooleanReader(reader) {
    var fn = asFunction(reader);
    if (!fn) return null;
    return !!fn();
  }

  function callBooleanWriter(writer, value) {
    var fn = asFunction(writer);
    if (!fn) return false;
    fn(value);
    return true;
  }

  function callIconResolver(resolver, collapsed) {
    var fn = asFunction(resolver);
    if (!fn) return "";
    var icon = fn(!!collapsed);
    return typeof icon === "string" ? icon : "";
  }

  function toDisplayValue(value, fallback) {
    return value === "inline-flex" ? "inline-flex" : fallback;
  }

  function toAriaExpandedValue(value, fallback) {
    return value === "true" ? "true" : value === "false" ? "false" : fallback;
  }

  function toStringValue(value, fallback) {
    return typeof value === "string" && value ? value : fallback;
  }

  function toBooleanValue(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
  }

  function readAppliedModel(applied, fallback) {
    var model = toRecord(applied);
    return {
      toggleDisplay: toDisplayValue(model.toggleDisplay, fallback.toggleDisplay),
      ariaExpanded: toAriaExpandedValue(model.ariaExpanded, fallback.ariaExpanded),
      label: toStringValue(model.label, fallback.label),
      iconSvg: toStringValue(model.iconSvg, fallback.iconSvg),
      expanded: toBooleanValue(model.expanded, fallback.expanded)
    };
  }

  function applyMobileTimerboxToggleInit(input) {
    var source = toRecord(input);
    var isScopeFn = asFunction(source.isTimerboxMobileScope);
    var isScope = !!(isScopeFn && isScopeFn());
    if (!isScope) {
      return {
        isScope: false,
        hasToggle: false,
        hasTimerbox: false,
        didBindToggle: false,
        didRunSync: false
      };
    }

    var getById = source.getElementById;
    var toggleBtn = getElementById(getById, "timerbox-toggle-btn");
    var timerBox = getElementById(getById, "timerbox");
    if (!toggleBtn || !timerBox) {
      return {
        isScope: true,
        hasToggle: !!toggleBtn,
        hasTimerbox: !!timerBox,
        didBindToggle: false,
        didRunSync: false
      };
    }

    var syncMobileTimerboxUi = asFunction(source.syncMobileTimerboxUI);
    var requestResponsiveGameRelayout = asFunction(source.requestResponsiveGameRelayout);

    var toggleRecord = toRecord(toggleBtn);
    var didBindToggle = false;
    if (!toggleRecord.__mobileTimerboxBound) {
      toggleRecord.__mobileTimerboxBound = true;
      didBindToggle = bindListener(toggleBtn, "click", function (eventLike) {
        preventDefault(eventLike);
        if (syncMobileTimerboxUi) {
          syncMobileTimerboxUi({
            collapsed: hasClass(timerBox, "is-mobile-expanded"),
            persist: true
          });
        }
        if (requestResponsiveGameRelayout) {
          requestResponsiveGameRelayout();
        }
      });
    }

    invoke(source.syncMobileTopActionsPlacement);
    invoke(source.syncPracticeTopActionsPlacement);
    invoke(source.syncMobileUndoTopButtonAvailability);

    var didRunSync = false;
    if (syncMobileTimerboxUi) {
      syncMobileTimerboxUi();
      didRunSync = true;
    }

    return {
      isScope: true,
      hasToggle: true,
      hasTimerbox: true,
      didBindToggle: didBindToggle,
      didRunSync: didRunSync
    };
  }

  function applyMobileTimerboxUiSync(input) {
    var source = toRecord(input);
    var isScopeFn = asFunction(source.isTimerboxMobileScope);
    var isScope = !!(isScopeFn && isScopeFn());
    if (!isScope) {
      return {
        isScope: false,
        hasTimerbox: false,
        hasToggle: false,
        didApply: false,
        didPersist: false,
        collapsible: false,
        timerModuleHidden: false
      };
    }

    var timerBox = getElementById(source.getElementById, "timerbox");
    var toggleBtn = getElementById(source.getElementById, "timerbox-toggle-btn");
    if (!timerBox || !toggleBtn) {
      return {
        isScope: true,
        hasTimerbox: !!timerBox,
        hasToggle: !!toggleBtn,
        didApply: false,
        didPersist: false,
        collapsible: false,
        timerModuleHidden: false
      };
    }

    var options = toRecord(source.options);
    var hiddenClassName = toStringValue(source.hiddenClassName, "timerbox-hidden-mode");
    var expandedClassName = toStringValue(source.expandedClassName, "is-mobile-expanded");
    var defaultCollapsed = toBooleanValue(source.defaultCollapsed, true);
    var fallbackHiddenToggleDisplay = toDisplayValue(source.fallbackHiddenToggleDisplay, "none");
    var fallbackVisibleToggleDisplay = toDisplayValue(
      source.fallbackVisibleToggleDisplay,
      "inline-flex"
    );
    var fallbackHiddenAriaExpanded = toAriaExpandedValue(source.fallbackHiddenAriaExpanded, "false");
    var fallbackExpandLabel = toStringValue(source.fallbackExpandLabel, "展开计时器");
    var fallbackCollapseLabel = toStringValue(source.fallbackCollapseLabel, "收起计时器");

    var isCollapseViewportFn = asFunction(source.isTimerboxCollapseViewport);
    var collapsible = !!(isCollapseViewportFn && isCollapseViewportFn());
    var timerModuleHidden = hasClass(timerBox, hiddenClassName);

    if (!collapsible || timerModuleHidden) {
      var hiddenModel = callRuntime(source.mobileTimerboxRuntime, "resolveMobileTimerboxDisplayModel", {
        collapsible: false,
        timerModuleHidden: timerModuleHidden,
        collapsed: true
      });
      var hiddenFallbackIcon = callIconResolver(source.getTimerboxToggleIconSvg, true);
      var hiddenApplied = callRuntime(source.mobileTimerboxRuntime, "resolveMobileTimerboxAppliedModel", {
        displayModel: hiddenModel,
        collapsed: true,
        fallbackToggleDisplay: fallbackHiddenToggleDisplay,
        fallbackAriaExpanded: fallbackHiddenAriaExpanded,
        fallbackLabel: fallbackExpandLabel,
        fallbackIconSvg: hiddenFallbackIcon
      });
      var hiddenAppliedModel = readAppliedModel(hiddenApplied, {
        toggleDisplay: fallbackHiddenToggleDisplay,
        ariaExpanded: fallbackHiddenAriaExpanded,
        label: fallbackExpandLabel,
        iconSvg: hiddenFallbackIcon,
        expanded: false
      });
      setStyleDisplay(toggleBtn, hiddenAppliedModel.toggleDisplay);
      setAttribute(toggleBtn, "aria-expanded", hiddenAppliedModel.ariaExpanded);
      removeClass(timerBox, expandedClassName);
      return {
        isScope: true,
        hasTimerbox: true,
        hasToggle: true,
        didApply: true,
        didPersist: false,
        collapsible: collapsible,
        timerModuleHidden: timerModuleHidden
      };
    }

    var collapsedOption = typeof options.collapsed === "boolean" ? options.collapsed : null;
    var storedCollapsed = callBooleanReader(source.readMobileTimerboxCollapsed);
    var collapsedResolved = callRuntime(
      source.mobileTimerboxRuntime,
      "resolveMobileTimerboxCollapsedValue",
      {
        collapsedOption: collapsedOption,
        storedCollapsed: storedCollapsed,
        defaultCollapsed: defaultCollapsed
      }
    );
    var collapsed = toBooleanValue(collapsedResolved, defaultCollapsed);
    var displayModel = callRuntime(source.mobileTimerboxRuntime, "resolveMobileTimerboxDisplayModel", {
      collapsible: true,
      timerModuleHidden: false,
      collapsed: collapsed
    });
    var fallbackLabel = collapsed ? fallbackExpandLabel : fallbackCollapseLabel;
    var fallbackIcon = callIconResolver(source.getTimerboxToggleIconSvg, collapsed);
    var applied = callRuntime(source.mobileTimerboxRuntime, "resolveMobileTimerboxAppliedModel", {
      displayModel: displayModel,
      collapsed: collapsed,
      fallbackToggleDisplay: fallbackVisibleToggleDisplay,
      fallbackAriaExpanded: collapsed ? "false" : "true",
      fallbackLabel: fallbackLabel,
      fallbackIconSvg: fallbackIcon
    });
    var appliedModel = readAppliedModel(applied, {
      toggleDisplay: fallbackVisibleToggleDisplay,
      ariaExpanded: collapsed ? "false" : "true",
      label: fallbackLabel,
      iconSvg: fallbackIcon,
      expanded: !collapsed
    });
    setStyleDisplay(toggleBtn, appliedModel.toggleDisplay);
    toggleClass(timerBox, expandedClassName, appliedModel.expanded);
    setAttribute(toggleBtn, "aria-expanded", appliedModel.ariaExpanded);
    setAttribute(toggleBtn, "aria-label", appliedModel.label);
    setAttribute(toggleBtn, "title", appliedModel.label);
    setInnerHtml(toggleBtn, appliedModel.iconSvg);

    var persist = !!options.persist;
    var didPersist = persist ? callBooleanWriter(source.writeMobileTimerboxCollapsed, collapsed) : false;
    return {
      isScope: true,
      hasTimerbox: true,
      hasToggle: true,
      didApply: true,
      didPersist: didPersist,
      collapsible: true,
      timerModuleHidden: false
    };
  }

  global.CoreMobileTimerboxHostRuntime = global.CoreMobileTimerboxHostRuntime || {};
  global.CoreMobileTimerboxHostRuntime.applyMobileTimerboxToggleInit =
    applyMobileTimerboxToggleInit;
  global.CoreMobileTimerboxHostRuntime.applyMobileTimerboxUiSync =
    applyMobileTimerboxUiSync;
})(typeof window !== "undefined" ? window : undefined);
