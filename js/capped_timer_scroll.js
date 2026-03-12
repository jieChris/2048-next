(function () {
  var timerScrollOffset = 0;
  var TIMER_MAX_VISIBLE = 11;
  var cappedTimerScrollRuntime = window.CoreCappedTimerScrollRuntime;
  var timerScrollInitialized = false;
  var timerScrollObserver = null;
  var observedTimerBox = null;
  var suppressObserverDepth = 0;
  var immediateUpdateQueued = false;

  function setScrollButtonVisual(button, dir) {
    if (!button) return;
    var isUp = String(dir) === "-1";
    var label = isUp ? "\u4E0A\u79FB" : "\u4E0B\u79FB";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.innerHTML = isUp
      ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 15L12 9L18 15"></path></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9L12 15L18 9"></path></svg>';
  }

  function isTimerScrollEnabledMode() {
    if (
      cappedTimerScrollRuntime &&
      typeof cappedTimerScrollRuntime.resolveTimerScrollModeFromContext === "function"
    ) {
      var modeState = cappedTimerScrollRuntime.resolveTimerScrollModeFromContext({
        bodyLike: typeof document !== "undefined" ? document.body : null,
        windowLike: typeof window !== "undefined" ? window : null
      });
      if (modeState && modeState.enabled === true) return true;
    }

    if (typeof document === "undefined" || !document.body) return false;
    var page = String(document.body.getAttribute("data-page") || "").toLowerCase();
    if (page === "replay" || page === "history" || page === "modes" || page === "palette" || page === "account") {
      return false;
    }
    if (document.getElementById("timerbox")) return true;

    var modeId = String(document.body.getAttribute("data-mode-id") || "");
    if (modeId.indexOf("capped") !== -1 || modeId.indexOf("practice") !== -1) return true;
    if (window.GAME_MODE_CONFIG && typeof window.GAME_MODE_CONFIG.key === "string") {
      var key = window.GAME_MODE_CONFIG.key;
      return key.indexOf("capped") !== -1 || key.indexOf("practice") !== -1;
    }
    return false;
  }

  function getTimerBox() {
    return document.getElementById("timerbox");
  }

  function ensureScrollControls() {
    var timerBox = getTimerBox();
    if (!timerBox || typeof document === "undefined") return null;
    var controls = document.getElementById("timer-scroll-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.id = "timer-scroll-controls";

      var upBtn = document.createElement("a");
      upBtn.className = "timer-scroll-btn";
      upBtn.setAttribute("data-scroll-dir", "-1");
      setScrollButtonVisual(upBtn, "-1");

      var downBtn = document.createElement("a");
      downBtn.className = "timer-scroll-btn";
      downBtn.setAttribute("data-scroll-dir", "1");
      setScrollButtonVisual(downBtn, "1");

      controls.appendChild(upBtn);
      controls.appendChild(downBtn);
      timerBox.appendChild(controls);
    } else if (controls.parentNode !== timerBox) {
      timerBox.appendChild(controls);
    }
    var syncButtons = controls.querySelectorAll(".timer-scroll-btn[data-scroll-dir]");
    for (var i = 0; i < syncButtons.length; i++) {
      var syncBtn = syncButtons[i];
      var dir = String(syncBtn.getAttribute("data-scroll-dir") || "");
      if (dir === "-1") {
        setScrollButtonVisual(syncBtn, "-1");
      }
      if (dir === "1") {
        setScrollButtonVisual(syncBtn, "1");
      }
    }
    observeTimerBoxMutations();
    return controls;
  }

  function getAllTimerRows() {
    var timerBox = getTimerBox();
    if (!timerBox) return [];

    // Collect rows in real DOM order to keep scroll window aligned
    // with what users actually see on screen.
    var rows = [];
    var seen = [];
    var all = timerBox.querySelectorAll("[id^='timer-row-'], #capped-timer-container .timer-row-item, #capped-timer-overflow-container .timer-row-item");
    for (var i = 0; i < all.length; i++) {
      var row = all[i];
      if (seen.indexOf(row) !== -1) continue;
      seen.push(row);
      rows.push(row);
    }
    return rows;
  }

  function isScrollManagedHidden(row) {
    return !!(row && row.getAttribute && row.getAttribute("data-scroll-hidden") === "1");
  }

  function shouldAlwaysKeepRow32Active() {
    if (typeof document === "undefined" || !document.body || typeof document.body.getAttribute !== "function") {
      return false;
    }
    var modeId = String(document.body.getAttribute("data-mode-id") || "").toLowerCase();
    if (modeId === "capped_4x4_pow2_64_no_undo") return false;
    return true;
  }

  function clearScrollManagedHiddenRows(rows) {
    var list = Array.isArray(rows) ? rows : [];
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      if (!isScrollManagedHidden(row)) continue;
      row.style.display = "";
      if (row && typeof row.removeAttribute === "function") {
        row.removeAttribute("data-scroll-hidden");
      }
    }
  }

  function isBusinessHiddenRow(row) {
    return !!(row && row.getAttribute && row.getAttribute("data-secondary-hidden") === "1");
  }

  function isExpandedSecondaryRow(row) {
    if (!row || !row.getAttribute) return false;
    return !!(row.getAttribute("data-secondary-parent") && row.getAttribute("data-secondary-hidden") !== "1");
  }

  function shouldPreserveHiddenRow(row) {
    if (!row) return false;
    if (isScrollManagedHidden(row)) return false;
    if (isBusinessHiddenRow(row)) return true;
    return false;
  }

  function isRowActive(row) {
    if (!row) return false;
    if (row.id === "timer-row-32" && shouldAlwaysKeepRow32Active()) {
      return true;
    }
    var computed = window.getComputedStyle ? window.getComputedStyle(row) : null;
    var display = (row.style && row.style.display) || (computed ? computed.display : "");
    if (display === "none") {
      if (isBusinessHiddenRow(row)) return false;
      return isScrollManagedHidden(row);
    }
    var visibility = (row.style && row.style.visibility) || (computed ? computed.visibility : "");
    return visibility !== "hidden";
  }

  function getRowLabelText(row) {
    if (!row) return "";
    var label = row.querySelector(".timertile");
    if (!label) return "";
    return String(label.textContent || "").trim().toLowerCase();
  }

  function getRowSortKey(row, fallbackIndex) {
    var manualOrder = row && row.getAttribute ? parseFloat(row.getAttribute("data-timer-order")) : NaN;
    if (Number.isFinite(manualOrder)) return manualOrder;

    var repeatAttr = row && row.getAttribute ? parseInt(row.getAttribute("data-capped-repeat"), 10) : NaN;
    if (Number.isFinite(repeatAttr) && repeatAttr >= 2) {
      return 100000 + repeatAttr;
    }

    if (row && row.id) {
      var rowIdMatch = row.id.match(/^timer-row-(\d+)$/);
      if (rowIdMatch) {
        var rowValue = parseInt(rowIdMatch[1], 10);
        if (Number.isFinite(rowValue)) return rowValue;
      }
    }

    var text = getRowLabelText(row);
    var repeat = text.match(/^x(\d+)$/);
    if (repeat) {
      return 100000 + Number(repeat[1] || 0);
    }
    var numeric = parseInt(text, 10);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
    return 200000 + fallbackIndex;
  }

  function updateTimerScroll() {
    suppressObserverDepth += 1;
    try {
    var rows = getAllTimerRows();
    var controls = ensureScrollControls();
    if (!isTimerScrollEnabledMode() || rows.length === 0) {
      clearScrollManagedHiddenRows(rows);
      if (controls) controls.style.display = "none";
      return;
    }

    var activeRows = [];
    var i;
    for (i = 0; i < rows.length; i++) {
      if (isRowActive(rows[i])) activeRows.push(rows[i]);
    }

    activeRows.sort(function (a, b) {
      var ai = rows.indexOf(a);
      var bi = rows.indexOf(b);
      if (ai < 0) ai = 0;
      if (bi < 0) bi = 0;
      var ka = getRowSortKey(a, ai);
      var kb = getRowSortKey(b, bi);
      if (ka !== kb) return ka - kb;
      return ai - bi;
    });

    var total = activeRows.length;
    var maxOffset = Math.max(0, total - TIMER_MAX_VISIBLE);
    if (timerScrollOffset > maxOffset) timerScrollOffset = maxOffset;
    if (timerScrollOffset < 0) timerScrollOffset = 0;

    for (i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!isRowActive(row)) {
        if (row && typeof row.removeAttribute === "function") {
          row.removeAttribute("data-scroll-hidden");
        }
        continue;
      }
      var idx = activeRows.indexOf(row);
      if (idx >= timerScrollOffset && idx < timerScrollOffset + TIMER_MAX_VISIBLE) {
        row.style.display = "";
        row.style.visibility = "";
        row.style.pointerEvents = "";
        if (row && typeof row.removeAttribute === "function") {
          row.removeAttribute("data-scroll-hidden");
        }
      } else {
        row.style.display = "none";
        row.style.visibility = "";
        row.style.pointerEvents = "";
        if (row && typeof row.setAttribute === "function") {
          row.setAttribute("data-scroll-hidden", "1");
        }
      }
    }

    if (controls) {
      controls.style.display = "flex";
    }
    if (total < TIMER_MAX_VISIBLE) {
      clearScrollManagedHiddenRows(rows);
    }
    } finally {
      suppressObserverDepth -= 1;
      if (suppressObserverDepth < 0) suppressObserverDepth = 0;
    }
  }

  function cappedTimerScroll(dir) {
    timerScrollOffset += Number(dir) || 0;
    updateTimerScroll();
  }

  function cappedTimerAutoScroll() {
    var rows = getAllTimerRows();
    if (!isTimerScrollEnabledMode() || rows.length === 0) return;
    var total = 0;
    for (var i = 0; i < rows.length; i++) {
      if (isRowActive(rows[i])) total += 1;
    }
    if (total > TIMER_MAX_VISIBLE) {
      timerScrollOffset = total - TIMER_MAX_VISIBLE;
    }
    updateTimerScroll();
  }

  function cappedTimerReset() {
    timerScrollOffset = 0;
    updateTimerScroll();
  }

  function queueImmediateTimerScrollUpdate() {
    if (immediateUpdateQueued) return;
    immediateUpdateQueued = true;
    var onFrame = function () {
      immediateUpdateQueued = false;
      updateTimerScroll();
    };
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(onFrame);
      return;
    }
    setTimeout(onFrame, 0);
  }

  function observeTimerBoxMutations() {
    var timerBox = getTimerBox();
    if (!timerBox || typeof MutationObserver === "undefined") return;
    if (timerScrollObserver && observedTimerBox === timerBox) return;

    if (timerScrollObserver && typeof timerScrollObserver.disconnect === "function") {
      timerScrollObserver.disconnect();
    }

    observedTimerBox = timerBox;
    timerScrollObserver = new MutationObserver(function (mutations) {
      if (suppressObserverDepth > 0) return;
      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        if (!mutation) continue;
        if (mutation.type === "childList") {
          queueImmediateTimerScrollUpdate();
          return;
        }
        if (mutation.type === "attributes") {
          var target = mutation.target;
          if (target && target.id === "timer-scroll-controls") continue;
          queueImmediateTimerScrollUpdate();
          return;
        }
      }
    });

    timerScrollObserver.observe(timerBox, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "data-secondary-hidden", "data-scroll-hidden"]
    });
  }

  function scheduleBootRefreshes() {
    setTimeout(queueImmediateTimerScrollUpdate, 60);
    setTimeout(queueImmediateTimerScrollUpdate, 180);
    setTimeout(queueImmediateTimerScrollUpdate, 360);
  }

  function initTimerScroll() {
    if (timerScrollInitialized) return;
    timerScrollInitialized = true;
    bindScrollControlEvents();
    observeTimerBoxMutations();
    updateTimerScroll();
    cappedTimerReset();
    scheduleBootRefreshes();
  }

  function bindScrollControlEvents() {
    var controls = ensureScrollControls();
    if (!controls) return;
    if (controls.getAttribute("data-scroll-delegate-bound") === "1") return;
    controls.setAttribute("data-scroll-delegate-bound", "1");

    function resolveScrollButtonFromTarget(target) {
      var node = target || null;
      while (node && node !== controls) {
        if (node.getAttribute) {
          var dir = node.getAttribute("data-scroll-dir");
          var className = String(node.className || "");
          if (
            (dir === "-1" || dir === "1") &&
            className.indexOf("timer-scroll-btn") !== -1
          ) {
            return node;
          }
        }
        node = node.parentNode || null;
      }
      return null;
    }

    controls.addEventListener("click", function (event) {
      var target = event && event.target ? event.target : null;
      var btn = resolveScrollButtonFromTarget(target);
      if (!btn) return;
      event.preventDefault();
      var rawDir = btn.getAttribute("data-scroll-dir");
      var dir = Number(rawDir);
      cappedTimerScroll(Number.isFinite(dir) ? dir : 0);
    });
  }

  window.updateTimerScroll = updateTimerScroll;
  window.cappedTimerScroll = cappedTimerScroll;
  window.cappedTimerAutoScroll = cappedTimerAutoScroll;
  window.cappedTimerReset = cappedTimerReset;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTimerScroll);
  } else {
    initTimerScroll();
  }
  window.addEventListener("resize", queueImmediateTimerScrollUpdate);
})();
