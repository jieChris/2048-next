(function (global) {
  "use strict";

  if (!global) return;

  function isHomePagePath(pathname) {
    var path = typeof pathname === "string" ? pathname : "";
    return path === "/" || /\/index\.html?$/.test(path) || path === "";
  }

  function buildHomeGuideSteps(options) {
    var opts = options || {};
    var steps = [
      { selector: "#home-title-link", title: "首页标题", desc: "点击 2048 标题可回到首页。" },
      { selector: "#top-announcement-btn", title: "版本公告", desc: "查看版本更新内容，红点表示有未读公告。" },
      { selector: "#stats-panel-toggle", title: "统计", desc: "打开统计汇总面板，查看步数和出数数据。" },
      { selector: "#top-export-replay-btn", title: "导出回放", desc: "导出当前对局回放字符串，便于保存和复盘。" },
      { selector: "#top-practice-btn", title: "直通练习板", desc: "把当前盘面复制到练习板，并在新页继续调试。" },
      { selector: "#top-advanced-replay-btn", title: "高级回放", desc: "进入高级回放页，导入并控制回放进度。" },
      { selector: "#top-modes-btn", title: "模式选择", desc: "进入模式页面，切换不同棋盘和玩法。" },
      { selector: "#top-history-btn", title: "历史记录", desc: "查看本地历史记录，支持删除/导入/导出。" },
      { selector: "#top-settings-btn", title: "设置", desc: "打开设置，调整主题、计时器显示与指引开关。" },
      { selector: "#top-restart-btn", title: "新游戏", desc: "开始新的一局，会重置当前局面。" }
    ];
    if (opts.isCompactViewport) {
      steps.splice(9, 0, {
        selector: "#top-mobile-hint-btn",
        title: "提示文本",
        desc: "移动端可用此按钮打开提示弹窗，集中查看玩法说明与项目说明。"
      });
    }
    return steps;
  }

  function buildHomeGuidePanelInnerHtml() {
    return (
      "<div id='home-guide-step' class='home-guide-step'></div>" +
      "<div id='home-guide-title' class='home-guide-title'></div>" +
      "<div id='home-guide-desc' class='home-guide-desc'></div>" +
      "<div class='home-guide-actions'>" +
      "<button id='home-guide-prev' class='replay-button home-guide-btn'>上一步</button>" +
      "<button id='home-guide-next' class='replay-button home-guide-btn'>下一步</button>" +
      "<button id='home-guide-skip' class='replay-button home-guide-btn'>跳过</button>" +
      "</div>"
    );
  }

  function buildHomeGuideSettingsRowInnerHtml() {
    return (
      "<label for='home-guide-toggle'>新手指引</label>" +
      "<label class='settings-switch-row'>" +
      "<input id='home-guide-toggle' type='checkbox'>" +
      "<span>重新播放首页功能指引</span>" +
      "</label>" +
      "<div id='home-guide-note' class='settings-note'></div>"
    );
  }

  function resolveSeenKey(value) {
    return typeof value === "string" && value ? value : "home_guide_seen_v1";
  }

  function readHomeGuideSeenValue(options) {
    var opts = options || {};
    var storage = opts.storageLike || null;
    var seenKey = resolveSeenKey(opts.seenKey);
    if (!storage || typeof storage.getItem !== "function") return "0";
    try {
      return storage.getItem(seenKey) === "1" ? "1" : "0";
    } catch (_err) {
      return "0";
    }
  }

  function markHomeGuideSeen(options) {
    var opts = options || {};
    var storage = opts.storageLike || null;
    var seenKey = resolveSeenKey(opts.seenKey);
    if (!storage || typeof storage.setItem !== "function") return false;
    try {
      storage.setItem(seenKey, "1");
      return true;
    } catch (_err) {
      return false;
    }
  }

  function shouldAutoStartHomeGuide(options) {
    var opts = options || {};
    if (!isHomePagePath(opts.pathname)) return false;
    return String(opts.seenValue || "0") !== "1";
  }

  function resolveHomeGuideAutoStart(options) {
    var opts = options || {};
    var seenValue = readHomeGuideSeenValue({
      storageLike: opts.storageLike || null,
      seenKey: opts.seenKey
    });
    return {
      seenValue: seenValue,
      shouldAutoStart: shouldAutoStartHomeGuide({
        pathname: opts.pathname,
        seenValue: seenValue
      })
    };
  }

  function resolveHomeGuideSettingsState(options) {
    var opts = options || {};
    var isHome = !!opts.isHomePage;
    return {
      toggleDisabled: !isHome,
      toggleChecked: Boolean(isHome && opts.guideActive && opts.fromSettings),
      noteText: isHome
        ? "打开后将立即进入首页新手引导，完成后自动关闭。"
        : "该功能仅在首页可用。"
    };
  }

  function resolveHomeGuideStepUiState(options) {
    var opts = options || {};
    var count = Math.max(0, Math.floor(toFiniteNumber(opts.stepCount, 0)));
    var maxIndex = count > 0 ? count - 1 : 0;
    var rawIndex = Math.floor(toFiniteNumber(opts.stepIndex, 0));
    var index = Math.min(Math.max(rawIndex, 0), maxIndex);
    return {
      stepText: count > 0 ? "步骤 " + (index + 1) + " / " + count : "步骤 0 / 0",
      prevDisabled: index <= 0,
      nextText: count > 0 && index >= count - 1 ? "完成" : "下一步"
    };
  }

  function resolveHomeGuideStepIndexState(options) {
    var opts = options || {};
    var count = Math.max(0, Math.floor(toFiniteNumber(opts.stepCount, 0)));
    var rawIndex = Math.floor(toFiniteNumber(opts.stepIndex, 0));
    var resolvedIndex = Math.max(0, rawIndex);
    if (!opts.isActive || count <= 0) {
      return {
        shouldAbort: true,
        shouldFinish: false,
        resolvedIndex: 0
      };
    }
    if (resolvedIndex >= count) {
      return {
        shouldAbort: false,
        shouldFinish: true,
        resolvedIndex: resolvedIndex
      };
    }
    return {
      shouldAbort: false,
      shouldFinish: false,
      resolvedIndex: resolvedIndex
    };
  }

  function resolveHomeGuideStepTargetState(options) {
    var opts = options || {};
    var index = Math.max(0, Math.floor(toFiniteNumber(opts.stepIndex, 0)));
    var shouldAdvance = !opts.hasTarget || !opts.targetVisible;
    return {
      shouldAdvance: shouldAdvance,
      nextIndex: shouldAdvance ? index + 1 : index
    };
  }

  function resolveHomeGuideFinishState(options) {
    var opts = options || {};
    var reason = typeof opts.reason === "string" ? opts.reason : "";
    return {
      markSeen: true,
      showDoneNotice: reason === "completed"
    };
  }

  function resolveHomeGuideTargetScrollState(options) {
    var opts = options || {};
    return {
      shouldScroll: !!opts.isCompactViewport && !!opts.canScrollIntoView,
      block: "center",
      inline: "nearest",
      behavior: "smooth"
    };
  }

  function resolveHomeGuideDoneNotice(options) {
    var opts = options || {};
    var defaultMessage = "指引已完成，可在设置中重新打开新手指引。";
    var rawMessage = typeof opts.message === "string" ? opts.message.trim() : "";
    var hideDelayMs = Math.max(0, Math.floor(toFiniteNumber(opts.hideDelayMs, 2600)));
    return {
      message: rawMessage || defaultMessage,
      hideDelayMs: hideDelayMs
    };
  }

  function resolveHomeGuideDoneNoticeStyle() {
    return {
      position: "fixed",
      left: "50%",
      bottom: "26px",
      transform: "translateX(-50%)",
      background: "rgba(46, 40, 34, 0.94)",
      color: "#f9f6f2",
      padding: "10px 14px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "bold",
      zIndex: "3400",
      boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
      opacity: "0",
      transition: "opacity 160ms ease"
    };
  }

  function toFiniteNumber(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }

  function resolveHomeGuidePanelLayout(options) {
    var opts = options || {};
    var rect = opts.targetRect || {};
    var margin = toFiniteNumber(opts.margin, 12);
    var viewportWidth = toFiniteNumber(opts.viewportWidth, 0);
    var viewportHeight = toFiniteNumber(opts.viewportHeight, 0);
    var mobileLayout = !!opts.mobileLayout;
    var mobilePanelMinWidth = toFiniteNumber(opts.mobilePanelMinWidth, 240);
    var mobilePanelMaxWidth = toFiniteNumber(opts.mobilePanelMaxWidth, 380);
    var desktopPanelMinWidth = toFiniteNumber(opts.desktopPanelMinWidth, 280);
    var desktopPanelMaxWidth = toFiniteNumber(opts.desktopPanelMaxWidth, 430);
    var panelHeight = toFiniteNumber(opts.panelHeight, 160);
    var rectLeft = toFiniteNumber(rect.left, 0);
    var rectTop = toFiniteNumber(rect.top, 0);
    var rectBottom = toFiniteNumber(rect.bottom, rectTop);
    var rectWidth = toFiniteNumber(rect.width, 0);

    var panelWidth;
    if (mobileLayout) {
      panelWidth = Math.min(mobilePanelMaxWidth, Math.max(mobilePanelMinWidth, viewportWidth - margin * 2));
    } else {
      panelWidth = Math.min(
        desktopPanelMaxWidth,
        Math.max(desktopPanelMinWidth, viewportWidth - margin * 2)
      );
    }

    var top;
    if (mobileLayout) {
      top = viewportHeight - panelHeight - margin;
    } else {
      top = rectBottom + margin;
      if (top + panelHeight > viewportHeight - margin) {
        top = rectTop - panelHeight - margin;
      }
    }
    if (top < margin) top = margin;

    var left = rectLeft + rectWidth / 2 - panelWidth / 2;
    if (left < margin) left = margin;
    if (left + panelWidth > viewportWidth - margin) {
      left = viewportWidth - panelWidth - margin;
    }

    return {
      panelWidth: Math.round(panelWidth),
      top: Math.round(top),
      left: Math.round(left)
    };
  }

  function isHomeGuideTargetVisible(options) {
    var opts = options || {};
    var node = opts.nodeLike || null;
    if (!node) return false;

    if (typeof node.getClientRects === "function") {
      var rects = node.getClientRects();
      if (!rects || rects.length === 0) return false;
    }

    var style = null;
    try {
      if (typeof opts.getComputedStyle === "function") {
        style = opts.getComputedStyle(node);
      }
    } catch (_err) {
      style = null;
    }
    if (
      style &&
      (style.display === "none" || style.visibility === "hidden" || style.opacity === "0")
    ) {
      return false;
    }
    return true;
  }

  global.CoreHomeGuideRuntime = global.CoreHomeGuideRuntime || {};
  global.CoreHomeGuideRuntime.isHomePagePath = isHomePagePath;
  global.CoreHomeGuideRuntime.buildHomeGuideSteps = buildHomeGuideSteps;
  global.CoreHomeGuideRuntime.buildHomeGuidePanelInnerHtml = buildHomeGuidePanelInnerHtml;
  global.CoreHomeGuideRuntime.buildHomeGuideSettingsRowInnerHtml = buildHomeGuideSettingsRowInnerHtml;
  global.CoreHomeGuideRuntime.readHomeGuideSeenValue = readHomeGuideSeenValue;
  global.CoreHomeGuideRuntime.markHomeGuideSeen = markHomeGuideSeen;
  global.CoreHomeGuideRuntime.shouldAutoStartHomeGuide = shouldAutoStartHomeGuide;
  global.CoreHomeGuideRuntime.resolveHomeGuideAutoStart = resolveHomeGuideAutoStart;
  global.CoreHomeGuideRuntime.resolveHomeGuideSettingsState = resolveHomeGuideSettingsState;
  global.CoreHomeGuideRuntime.resolveHomeGuideStepUiState = resolveHomeGuideStepUiState;
  global.CoreHomeGuideRuntime.resolveHomeGuideStepIndexState = resolveHomeGuideStepIndexState;
  global.CoreHomeGuideRuntime.resolveHomeGuideStepTargetState = resolveHomeGuideStepTargetState;
  global.CoreHomeGuideRuntime.resolveHomeGuideFinishState = resolveHomeGuideFinishState;
  global.CoreHomeGuideRuntime.resolveHomeGuideTargetScrollState = resolveHomeGuideTargetScrollState;
  global.CoreHomeGuideRuntime.resolveHomeGuideDoneNotice = resolveHomeGuideDoneNotice;
  global.CoreHomeGuideRuntime.resolveHomeGuideDoneNoticeStyle = resolveHomeGuideDoneNoticeStyle;
  global.CoreHomeGuideRuntime.resolveHomeGuidePanelLayout = resolveHomeGuidePanelLayout;
  global.CoreHomeGuideRuntime.isHomeGuideTargetVisible = isHomeGuideTargetVisible;
})(typeof window !== "undefined" ? window : undefined);
