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

  function collectLines(value) {
    if (!Array.isArray(value)) return [];
    var out = [];
    for (var i = 0; i < value.length; i++) {
      var line = typeof value[i] === "string" ? value[i].trim() : "";
      if (!line) continue;
      out.push(line);
    }
    return out;
  }

  function clearElement(element) {
    var target = toRecord(element);
    if (typeof target.innerHTML === "string") {
      target.innerHTML = "";
      return;
    }
    if (typeof target.textContent === "string") {
      target.textContent = "";
    }
  }

  function createParagraph(documentLike, text) {
    var createElement = asFunction(toRecord(documentLike).createElement);
    if (!createElement) return null;
    var element;
    try {
      element = createElement.call(documentLike, "p");
    } catch (_err) {
      return null;
    }
    var record = toRecord(element);
    record.textContent = text;
    return element;
  }

  function appendChild(parent, child) {
    if (!parent || !child) return false;
    var append = asFunction(toRecord(parent).appendChild);
    if (!append) return false;
    try {
      append.call(parent, child);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function setOverlayDisplay(overlay, value) {
    var style = toRecord(toRecord(overlay).style);
    if (!style) return false;
    style.display = value;
    return true;
  }

  function applyMobileHintModalOpen(input) {
    var source = toRecord(input);

    var isGamePageScope = asFunction(source.isGamePageScope);
    var inScope = !!(isGamePageScope && isGamePageScope());
    if (!inScope) {
      return {
        isScope: false,
        isCompact: false,
        hasDom: false,
        lineCount: 0,
        didRenderLines: false,
        didShowOverlay: false
      };
    }

    var isCompactGameViewport = asFunction(source.isCompactGameViewport);
    var compact = !!(isCompactGameViewport && isCompactGameViewport());
    if (!compact) {
      return {
        isScope: true,
        isCompact: false,
        hasDom: false,
        lineCount: 0,
        didRenderLines: false,
        didShowOverlay: false
      };
    }

    var ensureMobileHintModalDom = asFunction(source.ensureMobileHintModalDom);
    var dom = toRecord(ensureMobileHintModalDom ? ensureMobileHintModalDom() : null);
    var overlay = dom.overlay;
    var body = dom.body;
    if (!overlay || !body) {
      return {
        isScope: true,
        isCompact: true,
        hasDom: false,
        lineCount: 0,
        didRenderLines: false,
        didShowOverlay: false
      };
    }

    var mobileHintRuntime = toRecord(source.mobileHintRuntime);
    var collectMobileHintTexts = asFunction(mobileHintRuntime.collectMobileHintTexts);

    var documentLike = source.documentLike || null;
    var introSelector =
      typeof source.introSelector === "string" && source.introSelector
        ? source.introSelector
        : ".above-game .game-intro";
    var containerSelector =
      typeof source.containerSelector === "string" && source.containerSelector
        ? source.containerSelector
        : ".container";
    var explainSelector =
      typeof source.explainSelector === "string" && source.explainSelector
        ? source.explainSelector
        : ".game-explanation";

    var lines = collectLines(
      collectMobileHintTexts
        ? collectMobileHintTexts({
            isGamePageScope: true,
            introNode: querySelector(documentLike, introSelector),
            containerNode: querySelector(documentLike, containerSelector),
            explainNode: querySelector(documentLike, explainSelector),
            defaultText:
              typeof source.defaultText === "string" && source.defaultText
                ? source.defaultText
                : "合并数字，合成 2048 方块。"
          })
        : []
    );

    clearElement(body);
    var renderedCount = 0;
    for (var i = 0; i < lines.length; i++) {
      var paragraph = createParagraph(documentLike, lines[i]);
      if (!paragraph) continue;
      if (appendChild(body, paragraph)) {
        renderedCount += 1;
      }
    }

    var didShowOverlay = setOverlayDisplay(overlay, "flex");

    return {
      isScope: true,
      isCompact: true,
      hasDom: true,
      lineCount: lines.length,
      didRenderLines: renderedCount > 0,
      didShowOverlay: didShowOverlay
    };
  }

  global.CoreMobileHintOpenHostRuntime = global.CoreMobileHintOpenHostRuntime || {};
  global.CoreMobileHintOpenHostRuntime.applyMobileHintModalOpen = applyMobileHintModalOpen;
})(typeof window !== "undefined" ? window : undefined);
