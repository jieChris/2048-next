(function (global) {
  "use strict";

  if (!global) return;

  function resolveHomeGuidePathname(options) {
    var opts = options || {};
    var locationLike = opts.locationLike || null;
    try {
      var rawPathname = locationLike ? locationLike.pathname : "";
      return typeof rawPathname === "string" ? rawPathname : String(rawPathname || "");
    } catch (_err) {
      return "";
    }
  }

  function isHomePagePath(pathname) {
    var path = typeof pathname === "string" ? pathname : "";
    return path === "/" || /\/index\.html?$/.test(path) || path === "";
  }

  var UI_LANGUAGE_STORAGE_KEY = "ui_language_v1";

  function normalizeUiLang(value) {
    var text = String(value || "").trim().toLowerCase();
    return text.indexOf("en") === 0 ? "en" : "zh";
  }

  function readUiLang() {
    var globalLike = typeof globalThis === "object" && globalThis ? globalThis : {};

    try {
      var i18n = globalLike.UII18N;
      if (i18n && typeof i18n.getLanguage === "function") {
        return normalizeUiLang(i18n.getLanguage());
      }
    } catch (_err) {}

    try {
      var storage = globalLike.localStorage;
      if (storage && typeof storage.getItem === "function") {
        return normalizeUiLang(storage.getItem(UI_LANGUAGE_STORAGE_KEY));
      }
    } catch (_err2) {}

    try {
      var doc = globalLike.document;
      var root = doc && doc.documentElement;
      if (root && typeof root.getAttribute === "function") {
        return normalizeUiLang(root.getAttribute("data-ui-lang") || root.getAttribute("lang"));
      }
    } catch (_err3) {}

    return "zh";
  }

  function resolveLangText(lang, zh, en) {
    return lang === "en" ? en : zh;
  }

  function buildHomeGuideSteps(options) {
    var opts = options || {};
    var lang = readUiLang();
    var steps = [
      {
        selector: "#home-title-link",
        title: resolveLangText(lang, "2048 标题", "2048 Title"),
        desc: resolveLangText(lang, "在任何页面点击该标题，都可以返回主页。", "Click this title on any page to return Home.")
      },
      {
        selector: "#top-announcement-btn",
        title: resolveLangText(lang, "通知按钮", "Announcements"),
        desc: resolveLangText(
          lang,
          "点击按钮可查看版本通知与更新内容，红点表示有未读消息。",
          "Open announcements and updates. The red dot means unread items."
        )
      },
      {
        selector: "#stats-panel-toggle",
        title: resolveLangText(lang, "统计按钮", "Stats"),
        desc: resolveLangText(
          lang,
          "点击后打开统计面板，查看分布、步数与出数信息。",
          "Open the stats panel to view distribution, move counts, and spawn stats."
        )
      },
      {
        selector: "#top-export-replay-btn",
        title: resolveLangText(lang, "导出回放", "Export Replay"),
        desc: resolveLangText(lang, "导出当前对局回放码，便于分享与复盘。", "Export a replay code for sharing and review.")
      },
      {
        selector: "#top-practice-btn",
        title: resolveLangText(lang, "直通练习板", "Practice Board"),
        desc: resolveLangText(
          lang,
          "把当前盘面发送到练习板页面继续演练。",
          "Send the current board to Practice Board and continue training."
        )
      },
      {
        selector: "#top-advanced-replay-btn",
        title: resolveLangText(lang, "高级回放", "Advanced Replay"),
        desc: resolveLangText(
          lang,
          "打开高级回放页面，可导入回放并控制进度。",
          "Open Advanced Replay to import replays and control progress."
        )
      },
      {
        selector: "#top-modes-btn",
        title: resolveLangText(lang, "模式选择", "Modes"),
        desc: resolveLangText(lang, "进入模式页面，切换不同玩法与棋盘规格。", "Open mode selection and switch rules or board sizes.")
      },
      {
        selector: "#top-history-btn",
        title: resolveLangText(lang, "历史记录", "History"),
        desc: resolveLangText(lang, "查看本地历史对局，支持回放、导入和导出。", "View local history records with replay/import/export support.")
      },
      {
        selector: "#top-settings-btn",
        title: resolveLangText(lang, "设置按钮", "Settings"),
        desc: resolveLangText(
          lang,
          "打开设置面板，调整主题、显示选项与指引开关。",
          "Open settings to configure theme, display options, and guide switches."
        )
      },
      {
        selector: "#top-restart-btn",
        title: resolveLangText(lang, "新游戏", "New Game"),
        desc: resolveLangText(lang, "立即开始新的一局并重置当前盘面。", "Start a new game immediately and reset the board.")
      }
    ];
    if (opts.isCompactViewport) {
      steps.splice(9, 0, {
        selector: "#top-mobile-hint-btn",
        title: resolveLangText(lang, "提示文本", "Guide"),
        desc: resolveLangText(lang, "移动端可用此按钮打开提示弹窗，集中查看玩法说明与项目说明。", "On mobile, open this to view gameplay and project tips.")
      });
      steps.splice(10, 0, {
        selector: "#timerbox-toggle-btn",
        title: resolveLangText(lang, "展开计时器", "Toggle Timers"),
        desc: resolveLangText(lang, "移动端点击此按钮可展开或收起计时器面板。", "On mobile, use this button to expand or collapse the timer panel.")
      });
    }
    return steps;
  }

  function buildHomeGuidePanelInnerHtml() {
    var lang = readUiLang();
    return (
      "<div id='home-guide-step' class='home-guide-step'></div>" +
      "<div id='home-guide-title' class='home-guide-title'></div>" +
      "<div id='home-guide-desc' class='home-guide-desc'></div>" +
      "<div class='home-guide-actions'>" +
      "<button id='home-guide-prev' class='replay-button home-guide-btn'>" + resolveLangText(lang, "上一步", "Back") + "</button>" +
      "<button id='home-guide-next' class='replay-button home-guide-btn'>" + resolveLangText(lang, "下一步", "Next") + "</button>" +
      "<button id='home-guide-skip' class='replay-button home-guide-btn'>" + resolveLangText(lang, "跳过", "Skip") + "</button>" +
      "</div>"
    );
  }

  function buildHomeGuideSettingsRowInnerHtmlLegacy() {
    var lang = readUiLang();
    return (
      "<label for='home-guide-toggle'>" +
      resolveLangText(lang, "\u65b0\u624b\u6307\u5f15", "Beginner Guide") +
      "</label>" +
      "<label class='settings-switch-row'>" +
      "<input id='home-guide-toggle' type='checkbox'>" +
      "</label>" +
      "<div id='home-guide-note' class='settings-note'></div>"
    );
  }

  function buildHomeGuideSettingsRowInnerHtml() {
    var lang = readUiLang();
    return (
      "<div class='settings-action-main'>" +
      "<div class='settings-action-copy'>" +
      "<div class='settings-toggle-title'>" +
      resolveLangText(lang, "\u65b0\u624b\u6307\u5f15", "Beginner Guide") +
      "</div>" +
      "</div>" +
      "<button id='home-guide-trigger-btn' type='button' class='settings-inline-action-btn' aria-label='" +
      resolveLangText(lang, "\u65b0\u624b\u6307\u5f15", "Beginner Guide") +
      "'>" +
      resolveLangText(lang, "\u6253\u5f00\u6307\u5f15", "Open Guide") +
      "</button>" +
      "</div>"
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
    var lang = readUiLang();
    return {
      toggleDisabled: !isHome,
      toggleChecked: Boolean(isHome && opts.guideActive && opts.fromSettings),
      noteText: isHome
        ? resolveLangText(
            lang,
            "打开后将立即进入首页新手引导，完成后自动关闭。",
            "Enable to enter the homepage beginner guide immediately; it closes automatically after completion."
          )
        : resolveLangText(lang, "该功能仅在首页可用。", "This feature is only available on Home.")
    };
  }

  function resolveHomeGuideStepUiState(options) {
    var opts = options || {};
    var lang = readUiLang();
    var count = Math.max(0, Math.floor(toFiniteNumber(opts.stepCount, 0)));
    var maxIndex = count > 0 ? count - 1 : 0;
    var rawIndex = Math.floor(toFiniteNumber(opts.stepIndex, 0));
    var index = Math.min(Math.max(rawIndex, 0), maxIndex);
    return {
      stepText: count > 0 ? resolveLangText(lang, "步骤 " + (index + 1) + " / " + count, "Step " + (index + 1) + " / " + count) : resolveLangText(lang, "步骤 0 / 0", "Step 0 / 0"),
      prevDisabled: index <= 0,
      nextText: count > 0 && index >= count - 1 ? resolveLangText(lang, "完成", "Done") : resolveLangText(lang, "下一步", "Next")
    };
  }

  function resolveHomeGuideStepRenderState(options) {
    var opts = options || {};
    var step = opts.step || null;
    var uiState = resolveHomeGuideStepUiState({
      stepIndex: opts.stepIndex,
      stepCount: opts.stepCount
    });
    return {
      stepText: uiState.stepText,
      titleText: step && typeof step.title === "string" ? step.title : "",
      descText: step && typeof step.desc === "string" ? step.desc : "",
      prevDisabled: uiState.prevDisabled,
      nextText: uiState.nextText
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
    var shouldAdvance = !!opts.hasTarget && opts.targetVisible === false;
    return {
      shouldAdvance: shouldAdvance,
      nextIndex: shouldAdvance ? index + 1 : index
    };
  }

  function resolveHomeGuideElevationPlan(options) {
    var opts = options || {};
    var hasTop = !!opts.hasTopActionButtonsAncestor;
    var hasHeading = !!opts.hasHeadingAncestor;
    if (hasTop) {
      return {
        hostSelector: ".top-action-buttons",
        shouldScopeTopActions: true
      };
    }
    if (hasHeading) {
      return {
        hostSelector: ".heading",
        shouldScopeTopActions: false
      };
    }
    return {
      hostSelector: "",
      shouldScopeTopActions: false
    };
  }

  function resolveHomeGuideBindingState(options) {
    var opts = options || {};
    var alreadyBound = !!opts.alreadyBound;
    return {
      shouldBind: !alreadyBound,
      boundValue: true
    };
  }

  function resolveHomeGuideControlAction(options) {
    var opts = options || {};
    var action = typeof opts.action === "string" ? opts.action : "";
    var index = Math.max(0, Math.floor(toFiniteNumber(opts.stepIndex, 0)));
    if (action === "prev") {
      return {
        type: "step",
        nextStepIndex: Math.max(0, index - 1),
        finishReason: ""
      };
    }
    if (action === "next") {
      return {
        type: "step",
        nextStepIndex: index + 1,
        finishReason: ""
      };
    }
    if (action === "skip") {
      return {
        type: "finish",
        nextStepIndex: index,
        finishReason: "skipped"
      };
    }
    return {
      type: "step",
      nextStepIndex: index,
      finishReason: ""
    };
  }

  function resolveHomeGuideToggleAction(options) {
    var opts = options || {};
    var checked = !!opts.checked;
    var isHome = !!opts.isHomePage;
    if (!checked) {
      return {
        shouldStartGuide: false,
        shouldCloseSettings: false,
        shouldResync: false,
        startFromSettings: false
      };
    }
    if (!isHome) {
      return {
        shouldStartGuide: false,
        shouldCloseSettings: false,
        shouldResync: true,
        startFromSettings: false
      };
    }
    return {
      shouldStartGuide: true,
      shouldCloseSettings: true,
      shouldResync: false,
      startFromSettings: true
    };
  }

  function resolveHomeGuideLifecycleState(options) {
    var opts = options || {};
    var action = typeof opts.action === "string" ? opts.action : "";
    if (action === "start") {
      var inputSteps = Array.isArray(opts.steps) ? opts.steps : [];
      return {
        active: true,
        fromSettings: !!opts.fromSettings,
        index: 0,
        steps: inputSteps.map(function (step) {
          return {
            selector: step && typeof step.selector === "string" ? step.selector : "",
            title: step && typeof step.title === "string" ? step.title : "",
            desc: step && typeof step.desc === "string" ? step.desc : ""
          };
        })
      };
    }
    return {
      active: false,
      fromSettings: false,
      index: 0,
      steps: []
    };
  }

  function resolveHomeGuideSessionState(options) {
    var opts = options || {};
    var lifecycleState = opts.lifecycleState || null;
    var inputSteps = lifecycleState && Array.isArray(lifecycleState.steps) ? lifecycleState.steps : [];
    var rawIndex = lifecycleState && typeof lifecycleState.index === "number" ? lifecycleState.index : 0;
    var index = Number.isFinite(rawIndex) ? Math.max(0, Math.floor(rawIndex)) : 0;
    return {
      active: !!(lifecycleState && lifecycleState.active),
      fromSettings: !!(lifecycleState && lifecycleState.fromSettings),
      index: index,
      steps: inputSteps.map(function (step) {
        return {
          selector: step && typeof step.selector === "string" ? step.selector : "",
          title: step && typeof step.title === "string" ? step.title : "",
          desc: step && typeof step.desc === "string" ? step.desc : ""
        };
      })
    };
  }

  function resolveHomeGuideLayerDisplayState(options) {
    var opts = options || {};
    var active = !!opts.active;
    return {
      overlayDisplay: active ? "block" : "none",
      panelDisplay: active ? "block" : "none"
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
    var lang = readUiLang();
    var defaultMessage = resolveLangText(
      lang,
      "指引已完成，可在设置中重新打开新手指引。",
      "Guide completed. You can reopen Beginner Guide in Settings."
    );
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

    var getBoundingClientRect = typeof node.getBoundingClientRect === "function"
      ? node.getBoundingClientRect
      : null;
    if (getBoundingClientRect) {
      var rect = getBoundingClientRect.call(node);
      var width = toFiniteNumber(rect && rect.width, 0);
      var height = toFiniteNumber(rect && rect.height, 0);
      if (width <= 0 || height <= 0) return false;

      var viewportWidth = toFiniteNumber(opts.viewportWidth, 0);
      var viewportHeight = toFiniteNumber(opts.viewportHeight, 0);
      if (viewportWidth > 0 && viewportHeight > 0) {
        var left = toFiniteNumber(rect && rect.left, 0);
        var top = toFiniteNumber(rect && rect.top, 0);
        var right = toFiniteNumber(rect && rect.right, left + width);
        var bottom = toFiniteNumber(rect && rect.bottom, top + height);
        if (right <= 0 || bottom <= 0 || left >= viewportWidth || top >= viewportHeight) {
          return false;
        }
      }
    }
    return true;
  }

  global.CoreHomeGuideRuntime = global.CoreHomeGuideRuntime || {};
  global.CoreHomeGuideRuntime.resolveHomeGuidePathname = resolveHomeGuidePathname;
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
  global.CoreHomeGuideRuntime.resolveHomeGuideStepRenderState = resolveHomeGuideStepRenderState;
  global.CoreHomeGuideRuntime.resolveHomeGuideStepIndexState = resolveHomeGuideStepIndexState;
  global.CoreHomeGuideRuntime.resolveHomeGuideStepTargetState = resolveHomeGuideStepTargetState;
  global.CoreHomeGuideRuntime.resolveHomeGuideElevationPlan = resolveHomeGuideElevationPlan;
  global.CoreHomeGuideRuntime.resolveHomeGuideBindingState = resolveHomeGuideBindingState;
  global.CoreHomeGuideRuntime.resolveHomeGuideControlAction = resolveHomeGuideControlAction;
  global.CoreHomeGuideRuntime.resolveHomeGuideToggleAction = resolveHomeGuideToggleAction;
  global.CoreHomeGuideRuntime.resolveHomeGuideLifecycleState = resolveHomeGuideLifecycleState;
  global.CoreHomeGuideRuntime.resolveHomeGuideSessionState = resolveHomeGuideSessionState;
  global.CoreHomeGuideRuntime.resolveHomeGuideLayerDisplayState = resolveHomeGuideLayerDisplayState;
  global.CoreHomeGuideRuntime.resolveHomeGuideFinishState = resolveHomeGuideFinishState;
  global.CoreHomeGuideRuntime.resolveHomeGuideTargetScrollState = resolveHomeGuideTargetScrollState;
  global.CoreHomeGuideRuntime.resolveHomeGuideDoneNotice = resolveHomeGuideDoneNotice;
  global.CoreHomeGuideRuntime.resolveHomeGuideDoneNoticeStyle = resolveHomeGuideDoneNoticeStyle;
  global.CoreHomeGuideRuntime.resolveHomeGuidePanelLayout = resolveHomeGuidePanelLayout;
  global.CoreHomeGuideRuntime.isHomeGuideTargetVisible = isHomeGuideTargetVisible;
})(typeof window !== "undefined" ? window : undefined);
