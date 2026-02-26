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

  function applyOverlayShape(overlay) {
    overlay.id = "home-guide-overlay";
    overlay.className = "home-guide-overlay";
    var style = toRecord(overlay.style);
    style.display = "none";
    overlay.style = style;
  }

  function applyPanelShape(panel, panelInnerHtml) {
    panel.id = "home-guide-panel";
    panel.className = "home-guide-panel";
    var style = toRecord(panel.style);
    style.display = "none";
    panel.style = style;
    panel.innerHTML = panelInnerHtml;
  }

  function applyHomeGuideDomEnsure(input) {
    var source = toRecord(input);
    var documentLike = toRecord(source.documentLike);
    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var homeGuideState = toRecord(source.homeGuideState);

    var overlay = getElementById(documentLike, "home-guide-overlay");
    var panel = getElementById(documentLike, "home-guide-panel");

    var createdOverlay = false;
    var createdPanel = false;

    var body = toRecord(documentLike.body);
    var buildHomeGuidePanelInnerHtml = asFunction(homeGuideRuntime.buildHomeGuidePanelInnerHtml);
    var panelInnerHtml = resolveText(
      buildHomeGuidePanelInnerHtml ? buildHomeGuidePanelInnerHtml.call(homeGuideRuntime) : ""
    );

    if (!overlay) {
      var nextOverlay = createElement(documentLike, "div");
      if (nextOverlay) {
        applyOverlayShape(toRecord(nextOverlay));
        if (body) {
          appendChild(body, nextOverlay);
        }
        overlay = nextOverlay;
        createdOverlay = true;
      }
    }

    if (!panel) {
      var nextPanel = createElement(documentLike, "div");
      if (nextPanel) {
        applyPanelShape(toRecord(nextPanel), panelInnerHtml);
        if (body) {
          appendChild(body, nextPanel);
        }
        panel = nextPanel;
        createdPanel = true;
      }
    }

    homeGuideState.overlay = overlay || null;
    homeGuideState.panel = panel || null;

    return {
      overlay: overlay || null,
      panel: panel || null,
      createdOverlay: createdOverlay,
      createdPanel: createdPanel
    };
  }

  global.CoreHomeGuideDomHostRuntime = global.CoreHomeGuideDomHostRuntime || {};
  global.CoreHomeGuideDomHostRuntime.applyHomeGuideDomEnsure = applyHomeGuideDomEnsure;
})(typeof window !== "undefined" ? window : undefined);
