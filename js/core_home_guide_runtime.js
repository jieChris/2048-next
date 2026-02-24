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

  global.CoreHomeGuideRuntime = global.CoreHomeGuideRuntime || {};
  global.CoreHomeGuideRuntime.isHomePagePath = isHomePagePath;
  global.CoreHomeGuideRuntime.buildHomeGuideSteps = buildHomeGuideSteps;
  global.CoreHomeGuideRuntime.readHomeGuideSeenValue = readHomeGuideSeenValue;
  global.CoreHomeGuideRuntime.markHomeGuideSeen = markHomeGuideSeen;
  global.CoreHomeGuideRuntime.shouldAutoStartHomeGuide = shouldAutoStartHomeGuide;
  global.CoreHomeGuideRuntime.resolveHomeGuideAutoStart = resolveHomeGuideAutoStart;
  global.CoreHomeGuideRuntime.resolveHomeGuideSettingsState = resolveHomeGuideSettingsState;
})(typeof window !== "undefined" ? window : undefined);
