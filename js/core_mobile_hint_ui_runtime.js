(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_COLLAPSED_ATTR = "data-mobile-hint-collapsed";
  var DEFAULT_BUTTON_LABEL = "查看提示文本";

  function asElement(node) {
    if (!node || typeof node !== "object") return null;
    return node;
  }

  function isElementNode(node) {
    var el = asElement(node);
    return !!el && el.nodeType === 1;
  }

  function elementTagName(node) {
    var el = asElement(node);
    return el && typeof el.tagName === "string" ? el.tagName.toLowerCase() : "";
  }

  function hasClass(node, className) {
    var el = asElement(node);
    if (!el || !el.classList || typeof el.classList.contains !== "function") return false;
    try {
      return !!el.classList.contains(className);
    } catch (_err) {
      return false;
    }
  }

  function elementChildren(node) {
    var el = asElement(node);
    if (!el || !el.children) return [];
    var out = [];
    for (var i = 0; i < el.children.length; i++) {
      out.push(el.children[i]);
    }
    return out;
  }

  function getAttribute(node, key) {
    var el = asElement(node);
    if (!el || typeof el.getAttribute !== "function") return null;
    try {
      return el.getAttribute(key);
    } catch (_err) {
      return null;
    }
  }

  function setAttribute(node, key, value) {
    var el = asElement(node);
    if (!el || typeof el.setAttribute !== "function") return;
    try {
      el.setAttribute(key, value);
    } catch (_err) {}
  }

  function removeAttribute(node, key) {
    var el = asElement(node);
    if (!el || typeof el.removeAttribute !== "function") return;
    try {
      el.removeAttribute(key);
    } catch (_err) {}
  }

  function setDisplayNoneImportant(node) {
    var el = asElement(node);
    var style = el && el.style ? el.style : null;
    if (!style || typeof style.setProperty !== "function") return;
    try {
      style.setProperty("display", "none", "important");
    } catch (_err) {}
  }

  function removeDisplayProperty(node) {
    var el = asElement(node);
    var style = el && el.style ? el.style : null;
    if (!style || typeof style.removeProperty !== "function") return;
    try {
      style.removeProperty("display");
    } catch (_err) {}
  }

  function collectMobileHintTextBlockNodes(containerNode) {
    var container = asElement(containerNode);
    if (!container) return [];

    var nodes = [];
    var children = elementChildren(container);
    var afterGameContainer = false;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (!isElementNode(child)) continue;

      if (!afterGameContainer) {
        if (hasClass(child, "game-container")) {
          afterGameContainer = true;
        }
        continue;
      }

      var tag = elementTagName(child);
      if (tag === "p" || tag === "hr") {
        nodes.push(child);
      }
    }

    return nodes;
  }

  function syncMobileHintTextBlockVisibility(options) {
    var opts = options || {};
    if (!opts.isGamePageScope) return 0;

    var collapsedAttrName =
      typeof opts.collapsedAttrName === "string" && opts.collapsedAttrName
        ? opts.collapsedAttrName
        : DEFAULT_COLLAPSED_ATTR;
    var nodes = collectMobileHintTextBlockNodes(opts.containerNode);
    var hidden = !!opts.hidden;

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (hidden) {
        setDisplayNoneImportant(node);
        setAttribute(node, collapsedAttrName, "1");
        continue;
      }
      if (getAttribute(node, collapsedAttrName) === "1") {
        removeDisplayProperty(node);
        removeAttribute(node, collapsedAttrName);
      }
    }

    return nodes.length;
  }

  function resolveMobileHintDisplayModel(isCompactViewport) {
    if (!isCompactViewport) {
      return {
        collapsedContentEnabled: false,
        buttonDisplay: "none",
        buttonLabel: DEFAULT_BUTTON_LABEL
      };
    }

    return {
      collapsedContentEnabled: true,
      buttonDisplay: "inline-flex",
      buttonLabel: DEFAULT_BUTTON_LABEL
    };
  }

  global.CoreMobileHintUiRuntime = global.CoreMobileHintUiRuntime || {};
  global.CoreMobileHintUiRuntime.collectMobileHintTextBlockNodes = collectMobileHintTextBlockNodes;
  global.CoreMobileHintUiRuntime.syncMobileHintTextBlockVisibility = syncMobileHintTextBlockVisibility;
  global.CoreMobileHintUiRuntime.resolveMobileHintDisplayModel = resolveMobileHintDisplayModel;
})(typeof window !== "undefined" ? window : undefined);
