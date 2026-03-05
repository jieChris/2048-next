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

  function resolveNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function setStyleImportant(node, propertyName, value) {
    var style = toRecord(toRecord(node).style);
    var setProperty = asFunction(style.setProperty);
    if (setProperty) {
      setProperty.call(style, propertyName, value, "important");
      return;
    }
    style[propertyName] = value;
  }

  function applyGuideTextVisibilityStyles(input) {
    var source = toRecord(input);
    if (source.panel) {
      setStyleImportant(source.panel, "display", "block");
      setStyleImportant(source.panel, "opacity", "1");
      setStyleImportant(source.panel, "visibility", "visible");
      setStyleImportant(source.panel, "z-index", "3300");
      setStyleImportant(source.panel, "background", "#fffdf8");
      setStyleImportant(source.panel, "border", "1px solid #d8d4d0");
    }
    if (source.stepEl) {
      setStyleImportant(source.stepEl, "display", "block");
      setStyleImportant(source.stepEl, "color", "#8a8178");
    }
    if (source.titleEl) {
      setStyleImportant(source.titleEl, "display", "block");
      setStyleImportant(source.titleEl, "color", "#5f544a");
    }
    if (source.descEl) {
      setStyleImportant(source.descEl, "display", "block");
      setStyleImportant(source.descEl, "color", "#776e65");
    }
  }

  function ensureGuideMessageBanner(documentLike) {
    var existing = getElementById(documentLike, "home-guide-message-banner");
    if (existing) return existing;
    var banner = createElement(documentLike, "div");
    if (!banner) return null;
    var bannerRecord = toRecord(banner);
    bannerRecord.id = "home-guide-message-banner";
    var body = toRecord(toRecord(documentLike).body);
    if (!body) return null;
    appendChild(body, banner);
    return banner;
  }

  function applyGuideMessageBanner(input) {
    var source = toRecord(input);
    var banner = ensureGuideMessageBanner(source.documentLike);
    if (!banner) return;
    var stepText = resolveText(source.stepText).trim();
    var titleText = resolveText(source.titleText).trim();
    var descText = resolveText(source.descText).trim();
    var message = stepText
      ? stepText + " · " + titleText + "： " + descText
      : titleText + "： " + descText;
    toRecord(banner).textContent = message;
    var windowLike = toRecord(source.windowLike);
    var viewportWidth = resolveNumber(windowLike.innerWidth, 0);
    var viewportHeight = resolveNumber(windowLike.innerHeight, 0);
    var defaultWidth = viewportWidth > 0 ? Math.min(520, Math.max(300, viewportWidth - 24)) : 460;
    var minGap = 10;
    setStyleImportant(banner, "position", "fixed");
    setStyleImportant(banner, "left", "12px");
    setStyleImportant(banner, "top", "12px");
    setStyleImportant(banner, "transform", "none");
    setStyleImportant(banner, "display", "block");
    setStyleImportant(banner, "visibility", "visible");
    setStyleImportant(banner, "opacity", "1");
    setStyleImportant(banner, "z-index", "3401");
    setStyleImportant(banner, "max-width", defaultWidth + "px");
    setStyleImportant(banner, "width", defaultWidth + "px");
    setStyleImportant(banner, "padding", "10px 12px");
    setStyleImportant(banner, "border-radius", "8px");
    setStyleImportant(banner, "background", "rgba(40, 34, 28, 0.94)");
    setStyleImportant(banner, "color", "#f9f6f2");
    setStyleImportant(banner, "font-size", "18px");
    setStyleImportant(banner, "font-weight", "600");
    setStyleImportant(banner, "line-height", "1.55");
    setStyleImportant(banner, "text-align", "left");
    setStyleImportant(banner, "box-shadow", "0 8px 22px rgba(0,0,0,0.35)");
    setStyleImportant(banner, "pointer-events", "none");
    setStyleImportant(banner, "white-space", "normal");

    var step = toRecord(source.step);
    var selector = typeof step.selector === "string" ? step.selector : "";
    var target = selector ? querySelector(source.documentLike, selector) : null;
    var getRect = asFunction(toRecord(target).getBoundingClientRect);
    if (!getRect || !viewportWidth || !viewportHeight) return;
    var rect = toRecord(getRect.call(target));
    var targetWidth = resolveNumber(rect.width, 0);
    var targetHeight = resolveNumber(rect.height, 0);
    if (targetWidth <= 0 || targetHeight <= 0) return;

    var bannerWidth = Math.min(defaultWidth, resolveNumber(toRecord(banner).offsetWidth, defaultWidth));
    var bannerHeight = Math.max(64, resolveNumber(toRecord(banner).offsetHeight, 84));
    var targetLeft = resolveNumber(rect.left, 0);
    var targetTop = resolveNumber(rect.top, 0);
    var targetRight = resolveNumber(rect.right, targetLeft + targetWidth);
    var targetBottom = resolveNumber(rect.bottom, targetTop + targetHeight);
    var left = targetLeft + targetWidth / 2 - bannerWidth / 2;
    if (left < minGap) left = minGap;
    if (left + bannerWidth > viewportWidth - minGap) {
      left = viewportWidth - bannerWidth - minGap;
    }
    var top = targetTop - bannerHeight - 14;
    if (top < minGap) {
      top = targetBottom + 14;
    }
    if (top + bannerHeight > viewportHeight - minGap) {
      top = Math.max(minGap, targetTop - bannerHeight - 14);
    }
    if (targetRight <= 0 || targetLeft >= viewportWidth) return;
    setStyleImportant(banner, "left", Math.round(left) + "px");
    setStyleImportant(banner, "top", Math.round(top) + "px");
  }

  function ensureStepPanelStructure(documentLike, homeGuideRuntime) {
    var panel = getElementById(documentLike, "home-guide-panel");
    if (!panel) return;
    var hasRequiredNodes =
      !!querySelector(panel, "#home-guide-step") &&
      !!querySelector(panel, "#home-guide-title") &&
      !!querySelector(panel, "#home-guide-desc") &&
      !!querySelector(panel, "#home-guide-prev") &&
      !!querySelector(panel, "#home-guide-next") &&
      !!querySelector(panel, "#home-guide-skip");
    if (hasRequiredNodes) return;
    var buildPanelHtml = asFunction(toRecord(homeGuideRuntime).buildHomeGuidePanelInnerHtml);
    if (!buildPanelHtml) return;
    toRecord(panel).innerHTML = resolveText(buildPanelHtml.call(homeGuideRuntime));
  }

  function applyHomeGuideStepView(input) {
    var source = toRecord(input);
    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var resolveHomeGuideStepRenderState = asFunction(homeGuideRuntime.resolveHomeGuideStepRenderState);
    if (!resolveHomeGuideStepRenderState) {
      return {
        didRender: false,
        didSchedulePanel: false
      };
    }

    var stepRenderState = toRecord(
      resolveHomeGuideStepRenderState({
        step: source.step || null,
        stepIndex: source.stepIndex,
        stepCount: source.stepCount
      })
    );

    ensureStepPanelStructure(source.documentLike, source.homeGuideRuntime);

    var panel = getElementById(source.documentLike, "home-guide-panel");
    var stepEl = getElementById(source.documentLike, "home-guide-step");
    var titleEl = getElementById(source.documentLike, "home-guide-title");
    var descEl = getElementById(source.documentLike, "home-guide-desc");
    var prevBtn = getElementById(source.documentLike, "home-guide-prev");
    var nextBtn = getElementById(source.documentLike, "home-guide-next");

    applyGuideTextVisibilityStyles({
      panel: panel,
      stepEl: stepEl,
      titleEl: titleEl,
      descEl: descEl
    });

    if (stepEl) toRecord(stepEl).textContent = resolveText(stepRenderState.stepText);
    if (titleEl) toRecord(titleEl).textContent = resolveText(stepRenderState.titleText);
    if (descEl) toRecord(descEl).textContent = resolveText(stepRenderState.descText);
    if (prevBtn) toRecord(prevBtn).disabled = resolveBoolean(stepRenderState.prevDisabled);
    if (nextBtn) toRecord(nextBtn).textContent = resolveText(stepRenderState.nextText);

    applyGuideMessageBanner({
      documentLike: source.documentLike,
      windowLike: source.windowLike,
      step: source.step,
      stepText: stepRenderState.stepText,
      titleText: stepRenderState.titleText,
      descText: stepRenderState.descText
    });

    var didSchedulePanel = false;
    var requestAnimationFrame = asFunction(toRecord(source.windowLike).requestAnimationFrame);
    var positionHomeGuidePanel = asFunction(source.positionHomeGuidePanel);
    if (requestAnimationFrame && positionHomeGuidePanel) {
      requestAnimationFrame(positionHomeGuidePanel);
      didSchedulePanel = true;
    }

    return {
      didRender: true,
      didSchedulePanel: didSchedulePanel
    };
  }

  global.CoreHomeGuideStepViewHostRuntime = global.CoreHomeGuideStepViewHostRuntime || {};
  global.CoreHomeGuideStepViewHostRuntime.applyHomeGuideStepView = applyHomeGuideStepView;
})(typeof window !== "undefined" ? window : undefined);
