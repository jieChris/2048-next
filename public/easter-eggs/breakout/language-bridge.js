(function () {
  "use strict";

  var CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
  var pairs = [
    ["从 Cockpit Tools 提取出的弹球彩蛋。方向键或 A/D 移动，空格发球/暂停。", "A Breakout easter egg extracted from Cockpit Tools. Use arrow keys or A/D to move, and Space to serve or pause."],
    ["打开游戏", "Open Game"],
    ["恢复游戏", "Restore Game"],
    ["结束本局？", "End this run?"],
    ["关闭后本局将结束，进度不会保留。", "Closing ends this run and progress will not be saved."],
    ["继续游戏", "Keep Playing"],
    ["最小化保留", "Minimize And Keep"],
    ["结束并关闭", "End And Close"],
    ["点击开始按钮或按空格", "Click Start or press Space"],
    ["历史排名", "History Ranking"],
    ["历史", "History"],
    ["按空格开始发球", "Press Space to serve"],
    ["移动端控制", "Mobile controls"],
    ["向左移动", "Move left"],
    ["向右移动", "Move right"],
    ["关卡完成", "Level Cleared"],
    ["本关分数", "Level Score"],
    ["本局结束", "Run Over"],
    ["手动退出", "Manual Exit"],
    ["开始游戏", "Start Game"],
    ["重新开始", "Restart"],
    ["下一关", "Next Level"],
    ["最小化", "Minimize"],
    ["已暂停", "Paused"],
    ["继续", "Resume"],
    ["暂停", "Pause"],
    ["关闭", "Close"],
    ["当前", "Current"],
    ["发球", "Serve"],
    ["开始", "Start"],
    ["清空", "Clear"]
  ].sort(function (a, b) { return b[0].length - a[0].length; });

  function isEnglish() {
    try {
      return String(window.localStorage.getItem("ui_language_v1") || "").toLowerCase().indexOf("en") === 0;
    } catch (_err) {
      return false;
    }
  }

  function translate(text) {
    var out = String(text || "");
    if (!CJK_RE.test(out)) return out;
    for (var i = 0; i < pairs.length; i += 1) {
      out = out.split(pairs[i][0]).join(pairs[i][1]);
    }
    out = out
      .replace(/关卡\s*(\d+)/gu, "Level $1")
      .replace(/分\s*(\d+)/gu, "Score $1")
      .replace(/关\s*(\d+)/gu, "Level $1")
      .replace(/时长\s*/gu, "Duration ")
      .replace(/第\s*(\d+)\s*名/gu, "Rank $1")
      .replace(/（/gu, " (")
      .replace(/）/gu, ")")
      .replace(/，/gu, ", ")
      .replace(/。/gu, ".")
      .trim();
    return out;
  }

  function skip(node) {
    var parent = node && node.parentElement;
    return !parent || !!parent.closest("script,style,canvas");
  }

  function apply(root) {
    if (!isEnglish()) return;
    document.documentElement.lang = "en";
    var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (skip(node)) return NodeFilter.FILTER_REJECT;
        return CJK_RE.test(node.textContent || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      node.textContent = translate(node.textContent || "");
    });
    document.querySelectorAll("[title],[aria-label]").forEach(function (node) {
      ["title", "aria-label"].forEach(function (attr) {
        var value = node.getAttribute(attr);
        if (value && CJK_RE.test(value)) node.setAttribute(attr, translate(value));
      });
    });
  }

  function boot() {
    if (!isEnglish()) return;
    apply(document.body);
    var passCount = 0;
    var interval = window.setInterval(function () {
      passCount += 1;
      apply(document.body);
      if (passCount >= 16) window.clearInterval(interval);
    }, 250);
    var timer = 0;
    function scheduleApply() {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        timer = 0;
        apply(document.body);
      }, 80);
    }
    ["click", "keydown", "pointerup", "touchend"].forEach(function (name) {
      window.addEventListener(name, scheduleApply, true);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
