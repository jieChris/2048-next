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

  function resolveString(value, fallback) {
    return typeof value === "string" && value ? value : fallback;
  }

  function createMobileHintPageResolvers(input) {
    var source = toRecord(input);
    var documentLike = source.documentLike || null;
    var overlayId = resolveString(source.overlayId, "mobile-hint-overlay");
    var defaultText = resolveString(source.defaultText, "合并数字，合成 2048 方块。");
    var collapsedClassName = resolveString(
      source.collapsedClassName,
      "mobile-hint-collapsed-content"
    );
    var introHiddenClassName = resolveString(source.introHiddenClassName, "mobile-hint-hidden");
    var introSelector = resolveString(source.introSelector, ".above-game .game-intro");
    var containerSelector = resolveString(source.containerSelector, ".container");

    function ensureMobileHintModalDom() {
      var modalRuntime = toRecord(source.mobileHintModalRuntime);
      var ensureModal = asFunction(modalRuntime.ensureMobileHintModalDom);
      if (!ensureModal) return null;
      var isGamePageScope = asFunction(source.isGamePageScope);
      return ensureModal({
        isGamePageScope: isGamePageScope ? !!isGamePageScope() : false,
        documentLike: documentLike
      });
    }

    function openMobileHintModal() {
      var openHostRuntime = toRecord(source.mobileHintOpenHostRuntime);
      var applyOpen = asFunction(openHostRuntime.applyMobileHintModalOpen);
      if (!applyOpen) return null;
      return applyOpen({
        isGamePageScope: source.isGamePageScope,
        isCompactGameViewport: source.isCompactGameViewport,
        ensureMobileHintModalDom: ensureMobileHintModalDom,
        mobileHintRuntime: source.mobileHintRuntime,
        documentLike: documentLike,
        defaultText: defaultText
      });
    }

    function closeMobileHintModal() {
      var getElementById = asFunction(toRecord(documentLike).getElementById);
      if (!getElementById) return;
      var overlay = null;
      try {
        overlay = getElementById.call(documentLike, overlayId);
      } catch (_err) {
        overlay = null;
      }
      var style = toRecord(toRecord(overlay).style);
      if (!style) return;
      style.display = "none";
    }

    function syncMobileHintUI(options) {
      var uiHostRuntime = toRecord(source.mobileHintUiHostRuntime);
      var applyUiSync = asFunction(uiHostRuntime.applyMobileHintUiSync);
      if (!applyUiSync) return null;
      return applyUiSync({
        options: options || {},
        isGamePageScope: source.isGamePageScope,
        isCompactGameViewport: source.isCompactGameViewport,
        ensureMobileHintToggleButton: source.ensureMobileHintToggleButton,
        closeMobileHintModal: closeMobileHintModal,
        mobileHintUiRuntime: source.mobileHintUiRuntime,
        documentLike: documentLike,
        collapsedClassName: collapsedClassName,
        introHiddenClassName: introHiddenClassName,
        introSelector: introSelector,
        containerSelector: containerSelector
      });
    }

    function initMobileHintToggle() {
      var hintHostRuntime = toRecord(source.mobileHintHostRuntime);
      var applyInit = asFunction(hintHostRuntime.applyMobileHintToggleInit);
      if (!applyInit) return null;
      return applyInit({
        isGamePageScope: source.isGamePageScope,
        ensureMobileHintToggleButton: source.ensureMobileHintToggleButton,
        openMobileHintModal: openMobileHintModal,
        syncMobileHintUI: syncMobileHintUI
      });
    }

    return {
      ensureMobileHintModalDom: ensureMobileHintModalDom,
      openMobileHintModal: openMobileHintModal,
      closeMobileHintModal: closeMobileHintModal,
      syncMobileHintUI: syncMobileHintUI,
      initMobileHintToggle: initMobileHintToggle
    };
  }

  global.CoreMobileHintPageHostRuntime = global.CoreMobileHintPageHostRuntime || {};
  global.CoreMobileHintPageHostRuntime.createMobileHintPageResolvers =
    createMobileHintPageResolvers;
})(typeof window !== "undefined" ? window : undefined);
