(function (global) {
  "use strict";

  if (!global) return;

  function nodeTagName(node) {
    return node && typeof node.tagName === "string" ? node.tagName.toLowerCase() : "";
  }

  function nodeTypeOf(node) {
    return node && typeof node.nodeType === "number" ? node.nodeType : 0;
  }

  function childNodesOf(node) {
    if (!node || !node.childNodes) return [];
    var out = [];
    for (var i = 0; i < node.childNodes.length; i++) {
      out.push(node.childNodes[i]);
    }
    return out;
  }

  function elementClosest(node, selector) {
    if (!node || typeof node.closest !== "function") return null;
    try {
      return node.closest(selector);
    } catch (_err) {
      return null;
    }
  }

  function elementQuerySelectorAll(node, selector) {
    if (!node || typeof node.querySelectorAll !== "function") return [];
    var list = null;
    try {
      list = node.querySelectorAll(selector);
    } catch (_err) {
      list = null;
    }
    if (!list) return [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      out.push(list[i]);
    }
    return out;
  }

  function elementQuerySelector(node, selector) {
    if (!node || typeof node.querySelector !== "function") return null;
    try {
      return node.querySelector(selector);
    } catch (_err) {
      return null;
    }
  }

  function nodeTextContent(node) {
    return node && typeof node.textContent === "string" ? node.textContent : "";
  }

  function elementInnerText(node) {
    if (!node) return "";
    if (typeof node.innerText === "string") return node.innerText;
    if (typeof node.textContent === "string") return node.textContent;
    return "";
  }

  function nodeParent(node) {
    return node ? node.parentNode : null;
  }

  function nextElementSibling(node) {
    return node ? node.nextElementSibling : null;
  }

  function elementAttribute(node, key) {
    if (!node || typeof node.getAttribute !== "function") return "";
    try {
      return String(node.getAttribute(key) || "");
    } catch (_err) {
      return "";
    }
  }

  function normalizeHintParagraphText(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function readHintTextForModalElement(node) {
    var raw = elementInnerText(node);
    return String(raw || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function extractHintNodeText(node) {
    if (!node) return "";
    var nodeType = nodeTypeOf(node);
    if (nodeType === 3) {
      return nodeTextContent(node);
    }
    if (nodeType !== 1) return "";

    var tag = nodeTagName(node);
    if (tag === "br") return "\n";
    if (tag === "a") {
      var anchorText = "";
      var anchorChildren = childNodesOf(node);
      for (var i = 0; i < anchorChildren.length; i++) {
        anchorText += extractHintNodeText(anchorChildren[i]);
      }
      anchorText = String(anchorText || "").replace(/\s+/g, " ").trim();
      var href = String(elementAttribute(node, "href") || "").trim();
      if (!href) return anchorText;
      if (!anchorText) return href;
      return anchorText + "（" + href + "）";
    }

    var out = "";
    var childNodes = childNodesOf(node);
    for (var j = 0; j < childNodes.length; j++) {
      out += extractHintNodeText(childNodes[j]);
    }
    return out;
  }

  function collectHintParagraphText(node) {
    if (!node || nodeTypeOf(node) !== 1) return "";
    return normalizeHintParagraphText(extractHintNodeText(node));
  }

  function collectHintTextsFromMainContainer(options) {
    var opts = options || {};
    if (!opts.isGamePageScope) return [];
    var container = opts.containerNode || null;
    if (!container) return [];

    var lines = [];
    var paragraphs = elementQuerySelectorAll(container, "p");
    for (var i = 0; i < paragraphs.length; i++) {
      var p = paragraphs[i];
      if (!p || nodeTypeOf(p) !== 1) continue;
      if (elementClosest(p, ".above-game")) continue;
      if (elementClosest(p, ".game-container")) continue;
      var text = collectHintParagraphText(p);
      if (text) lines.push(text);
    }

    if (!lines.length) {
      var gameContainer = elementQuerySelector(container, ".game-container");
      if (!gameContainer || nodeParent(gameContainer) !== container) return [];
      var cursor = nextElementSibling(gameContainer);
      while (cursor) {
        if (nodeTagName(cursor) === "p") {
          var fallbackText = collectHintParagraphText(cursor);
          if (fallbackText) lines.push(fallbackText);
        }
        cursor = nextElementSibling(cursor);
      }
    }

    return lines;
  }

  function dedupeHintLines(lines) {
    var out = [];
    var seen = {};
    for (var i = 0; i < lines.length; i++) {
      var line = normalizeHintParagraphText(lines[i]);
      if (!line) continue;
      if (Object.prototype.hasOwnProperty.call(seen, line)) continue;
      seen[line] = 1;
      out.push(line);
    }
    return out;
  }

  function collectMobileHintTexts(options) {
    var opts = options || {};
    if (!opts.isGamePageScope) return [];

    var introText = collectHintParagraphText(opts.introNode || null);
    if (!introText) {
      introText = readHintTextForModalElement(opts.introNode || null);
    }
    var mainLines = collectHintTextsFromMainContainer({
      isGamePageScope: true,
      containerNode: opts.containerNode || null
    });

    var lines = [];
    if (introText) lines.push(introText);
    for (var i = 0; i < mainLines.length; i++) {
      lines.push(mainLines[i]);
    }
    if (!lines.length) {
      var explainText = readHintTextForModalElement(opts.explainNode || null);
      if (explainText) lines.push(explainText);
    }
    if (!lines.length) {
      lines.push(
        typeof opts.defaultText === "string" && opts.defaultText
          ? opts.defaultText
          : "合并数字，合成 2048 方块。"
      );
    }
    return dedupeHintLines(lines);
  }

  global.CoreMobileHintRuntime = global.CoreMobileHintRuntime || {};
  global.CoreMobileHintRuntime.normalizeHintParagraphText = normalizeHintParagraphText;
  global.CoreMobileHintRuntime.readHintTextForModalElement = readHintTextForModalElement;
  global.CoreMobileHintRuntime.extractHintNodeText = extractHintNodeText;
  global.CoreMobileHintRuntime.collectHintParagraphText = collectHintParagraphText;
  global.CoreMobileHintRuntime.collectHintTextsFromMainContainer = collectHintTextsFromMainContainer;
  global.CoreMobileHintRuntime.dedupeHintLines = dedupeHintLines;
  global.CoreMobileHintRuntime.collectMobileHintTexts = collectMobileHintTexts;
})(typeof window !== "undefined" ? window : undefined);
