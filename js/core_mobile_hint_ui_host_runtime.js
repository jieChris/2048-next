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

  function querySelector(documentLike, selector) {
    var selectorValue = typeof selector === "string" ? selector : "";
    if (!selectorValue) return null;
    var query = asFunction(toRecord(documentLike).querySelector);
    if (!query) return null;
    try {
      return query.call(documentLike, selectorValue);
    } catch (_err) {
      return null;
    }
  }

  function callToggleClass(target, className, enabled) {
    var classList = toRecord(toRecord(target).classList);
    var toggle = asFunction(classList.toggle);
    if (!toggle) return false;
    try {
      toggle.call(classList, className, enabled);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function callClassMethod(target, methodName, className) {
    var classList = toRecord(toRecord(target).classList);
    var method = asFunction(classList[methodName]);
    if (!method) return false;
    try {
      method.call(classList, className);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function setStyleProperty(target, key, value) {
    var style = toRecord(toRecord(target).style);
    if (!style) return false;
    style[key] = value;
    return true;
  }

  function setAttribute(target, key, value) {
    var setter = asFunction(toRecord(target).setAttribute);
    if (!setter) return false;
    try {
      setter.call(target, key, value);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function resolveString(value, fallback) {
    return typeof value === "string" && value ? value : fallback;
  }

  function invoke(callback) {
    var fn = asFunction(callback);
    if (!fn) return false;
    fn();
    return true;
  }

  function applyMobileHintUiSync(input) {
    var source = toRecord(input);
    var isGamePageScope = asFunction(source.isGamePageScope);
    var inScope = !!(isGamePageScope && isGamePageScope());
    if (!inScope) {
      return {
        isScope: false,
        hasBody: false,
        hasButton: false,
        compactViewport: false,
        didSyncTextBlock: false,
        didToggleIntroVisibility: false,
        didApplyCollapsedClass: false,
        didApplyButtonDisplay: false,
        didConfigureButton: false,
        didCloseModal: false
      };
    }

    var documentLike = source.documentLike || null;
    var body = toRecord(documentLike).body || null;
    if (!body) {
      return {
        isScope: true,
        hasBody: false,
        hasButton: false,
        compactViewport: false,
        didSyncTextBlock: false,
        didToggleIntroVisibility: false,
        didApplyCollapsedClass: false,
        didApplyButtonDisplay: false,
        didConfigureButton: false,
        didCloseModal: false
      };
    }

    var isCompactGameViewport = asFunction(source.isCompactGameViewport);
    var compactViewport = !!(isCompactGameViewport && isCompactGameViewport());

    var mobileHintUiRuntime = toRecord(source.mobileHintUiRuntime);
    var syncMobileHintTextBlockVisibility = asFunction(
      mobileHintUiRuntime.syncMobileHintTextBlockVisibility
    );
    var resolveMobileHintDisplayModel = asFunction(
      mobileHintUiRuntime.resolveMobileHintDisplayModel
    );
    var resolveMobileHintUiState = asFunction(mobileHintUiRuntime.resolveMobileHintUiState);

    var containerSelector = resolveString(source.containerSelector, ".container");
    var didSyncTextBlock = !!(
      syncMobileHintTextBlockVisibility &&
      syncMobileHintTextBlockVisibility({
        isGamePageScope: true,
        containerNode: querySelector(documentLike, containerSelector),
        hidden: compactViewport
      })
    );

    var introSelector = resolveString(source.introSelector, ".above-game .game-intro");
    var introHiddenClassName = resolveString(source.introHiddenClassName, "mobile-hint-hidden");
    var intro = querySelector(documentLike, introSelector);
    var didToggleIntroVisibility = intro
      ? callToggleClass(intro, introHiddenClassName, compactViewport)
      : false;

    var ensureMobileHintToggleButton = asFunction(source.ensureMobileHintToggleButton);
    var button = ensureMobileHintToggleButton ? ensureMobileHintToggleButton() : null;
    if (!button) {
      return {
        isScope: true,
        hasBody: true,
        hasButton: false,
        compactViewport: compactViewport,
        didSyncTextBlock: didSyncTextBlock,
        didToggleIntroVisibility: didToggleIntroVisibility,
        didApplyCollapsedClass: false,
        didApplyButtonDisplay: false,
        didConfigureButton: false,
        didCloseModal: false
      };
    }

    var displayModel = toRecord(
      resolveMobileHintDisplayModel ? resolveMobileHintDisplayModel(compactViewport) : null
    );
    var uiState = toRecord(
      resolveMobileHintUiState
        ? resolveMobileHintUiState({
            displayModel: displayModel,
            collapsedClassName: resolveString(source.collapsedClassName, "mobile-hint-collapsed-content")
          })
        : null
    );

    var collapsedClassName = resolveString(uiState.collapsedClassName, "mobile-hint-collapsed-content");
    var didApplyCollapsedClass = !!uiState.collapsedContentEnabled
      ? callClassMethod(body, "add", collapsedClassName)
      : callClassMethod(body, "remove", collapsedClassName);

    var didApplyButtonDisplay = setStyleProperty(
      button,
      "display",
      resolveString(uiState.buttonDisplay, "none")
    );

    if (!!uiState.shouldCloseModal) {
      var didCloseModal = invoke(source.closeMobileHintModal);
      return {
        isScope: true,
        hasBody: true,
        hasButton: true,
        compactViewport: compactViewport,
        didSyncTextBlock: didSyncTextBlock,
        didToggleIntroVisibility: didToggleIntroVisibility,
        didApplyCollapsedClass: didApplyCollapsedClass,
        didApplyButtonDisplay: didApplyButtonDisplay,
        didConfigureButton: false,
        didCloseModal: didCloseModal
      };
    }

    var label = resolveString(uiState.buttonLabel, "查看提示文本");
    var ariaExpanded = resolveString(uiState.buttonAriaExpanded, "false");
    var didConfigureButton =
      setAttribute(button, "aria-label", label) &&
      setAttribute(button, "title", label) &&
      setAttribute(button, "aria-expanded", ariaExpanded);

    return {
      isScope: true,
      hasBody: true,
      hasButton: true,
      compactViewport: compactViewport,
      didSyncTextBlock: didSyncTextBlock,
      didToggleIntroVisibility: didToggleIntroVisibility,
      didApplyCollapsedClass: didApplyCollapsedClass,
      didApplyButtonDisplay: didApplyButtonDisplay,
      didConfigureButton: didConfigureButton,
      didCloseModal: false
    };
  }

  global.CoreMobileHintUiHostRuntime = global.CoreMobileHintUiHostRuntime || {};
  global.CoreMobileHintUiHostRuntime.applyMobileHintUiSync = applyMobileHintUiSync;
})(typeof window !== "undefined" ? window : undefined);
