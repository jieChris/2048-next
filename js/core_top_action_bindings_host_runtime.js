(function (global) {
  "use strict";

  if (!global) return;

  var TOP_ICON_HTML_ATTR = "data-top-btn-icon-html";
  var EXPORT_DURATION_MS = 270;
  var EXPORT_DELAY_MS = 38;
  var PRACTICE_DURATION_MS = 282;
  var PRACTICE_DELAY_MS = 51;
  var RESET_DURATION_MS = 380;
  var RESET_DELAY_MS = 8;

  var ANNOUNCEMENT_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path class="announce-speaker" d="M11 5L6 9H3v6h3l5 4V5z"></path><path class="announce-wave announce-wave-1" d="M16 10.5a2.5 2.5 0 0 1 0 3"></path><path class="announce-wave announce-wave-2" d="M19 9a4 4 0 0 1 0 6"></path></svg>';
  var STATS_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line class="stats-line stats-line-left" x1="6" y1="20" x2="6" y2="14"></line><line class="stats-line stats-line-right" x1="18" y1="20" x2="18" y2="10"></line><line class="stats-line stats-line-mid" x1="12" y1="20" x2="12" y2="4"></line></svg>';
  var EXPORT_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g class="export-base-group"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path></g><path class="export-arrow-trace" d="M12 3L12 15"></path><g class="export-arrow-static"><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></g><g class="export-arrow-mover"><line x1="-5.6" y1="0" x2="0" y2="0"></line><polyline points="-3.2 -3.2 0 0 -3.2 3.2"></polyline></g></svg>';
  var PRACTICE_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path class="practice-arrow-trace" d="M11 13L21 3"></path><g class="practice-arrow-static"><path d="M18 3h3v3"></path><path d="M11 13L21 3"></path></g><g class="practice-arrow-mover"><line x1="-5.6" y1="0" x2="0" y2="0"></line><polyline points="-3.2 -3.2 0 0 -3.2 3.2"></polyline></g><g class="practice-frame-group"><path d="M21 14v7h-7"></path><path d="M3 10v11h11"></path></g></svg>';
  var MODE_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect class="mode-quad mode-quad-tl" x="3" y="3" width="7" height="7"></rect><rect class="mode-quad mode-quad-tr" x="14" y="3" width="7" height="7"></rect><rect class="mode-quad mode-quad-br" x="14" y="14" width="7" height="7"></rect><rect class="mode-quad mode-quad-bl" x="3" y="14" width="7" height="7"></rect></svg>';
  var HISTORY_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line class="history-hand history-hand-long" x1="12" y1="12" x2="12" y2="6"></line><line class="history-hand history-hand-short" x1="12" y1="12" x2="12" y2="7.6"></line></svg>';
  var ADVANCED_REPLAY_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path class="reset-top-trace" d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path><g class="reset-top-static"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></g><g class="reset-top-mover" style="offset-path:path(\'M20.49 15 A9 9 0 1 1 18.37 5.64 L23 10\');"><line x1="-6.5" y1="0" x2="0" y2="0"></line><polyline points="-3.8 -3.8 0 0 -3.8 3.8"></polyline></g><path class="reset-bottom-trace" d="M0 0L0 0" style="display:none;"></path><g class="reset-bottom-static" style="display:none;"></g><g class="reset-bottom-mover" style="display:none;"></g></svg>';
  var RESET_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path class="reset-top-trace" d="M3.51 9A9 9 0 0 1 18.36 5.64L23 10"></path><path class="reset-bottom-trace" d="M20.49 15A9 9 0 0 1 5.64 18.36L1 14"></path><g class="reset-top-static"><polyline points="23 4 23 10 17 10"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path></g><g class="reset-bottom-static"><polyline points="1 20 1 14 7 14"></polyline><path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></g><g class="reset-top-mover"><line x1="-6.5" y1="0" x2="0" y2="0"></line><polyline points="-3.8 -3.8 0 0 -3.8 3.8"></polyline></g><g class="reset-bottom-mover"><line x1="-6.5" y1="0" x2="0" y2="0"></line><polyline points="-3.8 -3.8 0 0 -3.8 3.8"></polyline></g></svg>';

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function querySelector(node, selector) {
    var query = asFunction(toRecord(node).querySelector);
    if (!query) return null;
    try {
      return query.call(node, selector);
    } catch (_err) {
      return null;
    }
  }

  function querySelectorAll(node, selector) {
    var query = asFunction(toRecord(node).querySelectorAll);
    if (!query) return [];
    try {
      return Array.prototype.slice.call(query.call(node, selector) || []);
    } catch (_err) {
      return [];
    }
  }

  function setAttrIfChanged(node, name, value) {
    var record = toRecord(node);
    if (!record.getAttribute || !record.setAttribute) return false;
    var next = String(value || "");
    if (String(record.getAttribute(name) || "") === next) return false;
    record.setAttribute(name, next);
    return true;
  }

  function addClassIfMissing(node, className) {
    var record = toRecord(node);
    var classList = toRecord(record.classList);
    var add = asFunction(classList.add);
    var contains = asFunction(classList.contains);
    if (add && contains) {
      try {
        if (!contains.call(classList, className)) add.call(classList, className);
        return true;
      } catch (_err) {}
    }
    var current = typeof record.className === "string" ? record.className : "";
    if ((" " + current + " ").indexOf(" " + className + " ") >= 0) return false;
    record.className = current ? current + " " + className : className;
    return true;
  }

  function pushUniqueNode(nodes, node) {
    if (!node) return;
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i] === node) return;
    }
    nodes.push(node);
  }

  function collectButtonsByIdAndSelector(documentLike, getElementById, id, selector) {
    var nodes = [];
    if (id) {
      pushUniqueNode(nodes, getElementById.call(documentLike, id));
    }
    if (selector) {
      var matched = querySelectorAll(documentLike, selector);
      for (var i = 0; i < matched.length; i += 1) {
        pushUniqueNode(nodes, matched[i]);
      }
    }
    return nodes;
  }

  function isTextMode(documentLike) {
    var body = toRecord(documentLike).body;
    if (!body || !asFunction(body.getAttribute)) return false;
    return String(body.getAttribute("data-top-button-style") || "") === "text";
  }

  function ensureIconMarkup(button, svgMarkup, textMode) {
    if (!button || !(typeof svgMarkup === "string" && svgMarkup)) return false;
    var changed = false;
    if (setAttrIfChanged(button, TOP_ICON_HTML_ATTR, svgMarkup)) changed = true;
    if (textMode) return changed;
    var record = toRecord(button);
    if (String(record.innerHTML || "") !== svgMarkup) {
      record.innerHTML = svgMarkup;
      changed = true;
    }
    return changed;
  }

  function decorateTopButtonIcons(documentLike) {
    if (!documentLike) return;
    var getElementById = asFunction(toRecord(documentLike).getElementById);
    if (!getElementById) return;
    var textMode = isTextMode(documentLike);

    var announcementBtn = getElementById.call(documentLike, "top-announcement-btn");
    if (announcementBtn) {
      addClassIfMissing(announcementBtn, "announcement-btn");
      ensureIconMarkup(announcementBtn, ANNOUNCEMENT_ICON_SVG, textMode);
    }

    var statsBtn = getElementById.call(documentLike, "stats-panel-toggle");
    if (statsBtn) {
      addClassIfMissing(statsBtn, "stats-btn");
      ensureIconMarkup(statsBtn, STATS_ICON_SVG, textMode);
    }

    var exportBtn = getElementById.call(documentLike, "top-export-replay-btn");
    if (exportBtn) {
      addClassIfMissing(exportBtn, "export-btn");
      ensureIconMarkup(exportBtn, EXPORT_ICON_SVG, textMode);
    }

    var practiceBtn = getElementById.call(documentLike, "top-practice-btn");
    if (practiceBtn) {
      addClassIfMissing(practiceBtn, "practice-btn");
      ensureIconMarkup(practiceBtn, PRACTICE_ICON_SVG, textMode);
    }

    var advancedReplayButtons = collectButtonsByIdAndSelector(
      documentLike,
      getElementById,
      "top-advanced-replay-btn",
      '.top-action-buttons .top-action-btn[href*="replay.html"]'
    );
    for (var ai = 0; ai < advancedReplayButtons.length; ai += 1) {
      var advancedReplayBtn = advancedReplayButtons[ai];
      addClassIfMissing(advancedReplayBtn, "reset-btn");
      ensureIconMarkup(advancedReplayBtn, ADVANCED_REPLAY_ICON_SVG, textMode);
    }

    var modeButtons = collectButtonsByIdAndSelector(
      documentLike,
      getElementById,
      "top-modes-btn",
      '.top-action-buttons .top-action-btn[href*="modes.html"]'
    );
    for (var j = 0; j < modeButtons.length; j += 1) {
      var modeBtn = modeButtons[j];
      addClassIfMissing(modeBtn, "mode-btn");
      ensureIconMarkup(modeBtn, MODE_ICON_SVG, textMode);
    }

    var historyButtons = collectButtonsByIdAndSelector(
      documentLike,
      getElementById,
      "top-history-btn",
      '.top-action-buttons .top-action-btn[href*="history.html"]'
    );
    for (var k = 0; k < historyButtons.length; k += 1) {
      var historyBtn = historyButtons[k];
      addClassIfMissing(historyBtn, "history-btn");
      ensureIconMarkup(historyBtn, HISTORY_ICON_SVG, textMode);
    }

    var settingsBtn = getElementById.call(documentLike, "top-settings-btn");
    if (settingsBtn) {
      addClassIfMissing(settingsBtn, "settings-btn");
    }

    var restartButtons = querySelectorAll(
      documentLike,
      ".above-game .restart-button, .top-action-buttons .restart-button, #top-restart-btn"
    );
    for (var i = 0; i < restartButtons.length; i += 1) {
      var restartButton = restartButtons[i];
      addClassIfMissing(restartButton, "reset-btn");
      ensureIconMarkup(restartButton, RESET_ICON_SVG, textMode);
    }
  }

  function requestAnimationFrameSafe(callback) {
    var raf = asFunction(global.requestAnimationFrame);
    if (raf) return raf.call(global, callback);
    var setTimeoutFn = asFunction(global.setTimeout);
    if (!setTimeoutFn) return 0;
    return setTimeoutFn.call(global, function () {
      callback(Date.now());
    }, 16);
  }

  function cancelAnimationFrameSafe(handle) {
    var caf = asFunction(global.cancelAnimationFrame);
    if (caf) {
      caf.call(global, handle);
      return;
    }
    var clearTimeoutFn = asFunction(global.clearTimeout);
    if (clearTimeoutFn) clearTimeoutFn.call(global, handle);
  }

  function isReducedMotionEnabled(reduceMotionQuery) {
    return !!toRecord(reduceMotionQuery).matches;
  }

  function clamp01(value) {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  function safeGetPathLength(path) {
    var getTotalLength = asFunction(toRecord(path).getTotalLength);
    if (!getTotalLength) return 0;
    try {
      var length = Number(getTotalLength.call(path));
      return Number.isFinite(length) ? length : 0;
    } catch (_err) {
      return 0;
    }
  }

  function bindMediaChangeListener(reduceMotionQuery, handler) {
    if (!reduceMotionQuery || !handler) return;
    var addEventListener = asFunction(reduceMotionQuery.addEventListener);
    if (addEventListener) {
      try {
        addEventListener.call(reduceMotionQuery, "change", handler);
        return;
      } catch (_err) {}
    }
    var addListener = asFunction(reduceMotionQuery.addListener);
    if (addListener) {
      try {
        addListener.call(reduceMotionQuery, handler);
      } catch (_err2) {}
    }
  }

  function setupExportAnimation(button, reduceMotionQuery) {
    if (!button || button.__exportAnimationBound) return;
    button.__exportAnimationBound = true;

    var frameId = 0;
    var startAt = 0;
    var lastTrace = null;
    var traceLength = 0;

    function resolveParts() {
      var svg = querySelector(button, "svg");
      if (!svg) return null;
      var arrowTrace = querySelector(svg, ".export-arrow-trace");
      var arrowMover = querySelector(svg, ".export-arrow-mover");
      var arrowStatic = querySelector(svg, ".export-arrow-static");
      if (!arrowTrace || !arrowMover || !arrowStatic) return null;
      return {
        arrowTrace: arrowTrace,
        arrowMover: arrowMover,
        arrowStatic: arrowStatic
      };
    }

    function ensureTraceLength(trace) {
      if (lastTrace !== trace) {
        lastTrace = trace;
        traceLength = safeGetPathLength(trace);
      }
      return traceLength;
    }

    function setTraceProgress(trace, progress) {
      var length = ensureTraceLength(trace);
      trace.style.strokeDasharray = String(length);
      trace.style.strokeDashoffset = String(length * (1 - progress));
    }

    function setMoverProgress(mover, progress) {
      mover.style.offsetDistance = (progress * 100).toFixed(3) + "%";
    }

    function stopFrame() {
      if (!frameId) return;
      cancelAnimationFrameSafe(frameId);
      frameId = 0;
    }

    function resetIdleState() {
      stopFrame();
      startAt = 0;
      var parts = resolveParts();
      if (!parts) return;
      parts.arrowStatic.style.opacity = "1";
      parts.arrowTrace.style.opacity = "0";
      setTraceProgress(parts.arrowTrace, 0);
      parts.arrowMover.style.opacity = "0";
      setMoverProgress(parts.arrowMover, 0);
    }

    function finishAnimation() {
      var parts = resolveParts();
      if (parts) {
        parts.arrowMover.style.opacity = "0";
        parts.arrowTrace.style.opacity = "0";
        parts.arrowStatic.style.opacity = "1";
      }
      frameId = 0;
      startAt = 0;
    }

    function animateFrame(timestamp) {
      if (!startAt) startAt = timestamp;
      var parts = resolveParts();
      if (!parts) {
        finishAnimation();
        return;
      }

      var elapsed = timestamp - startAt;
      var rawProgress = (elapsed - EXPORT_DELAY_MS) / EXPORT_DURATION_MS;
      var progress = clamp01(rawProgress);

      parts.arrowStatic.style.opacity = "0";
      parts.arrowTrace.style.opacity = "1";
      parts.arrowMover.style.opacity = "1";
      setTraceProgress(parts.arrowTrace, progress);
      setMoverProgress(parts.arrowMover, progress);

      if (progress >= 1) {
        finishAnimation();
        return;
      }

      frameId = requestAnimationFrameSafe(animateFrame);
    }

    function startAnimation() {
      if (isReducedMotionEnabled(reduceMotionQuery)) return;
      stopFrame();
      startAt = 0;
      var parts = resolveParts();
      if (!parts) return;
      parts.arrowStatic.style.opacity = "0";
      parts.arrowTrace.style.opacity = "1";
      parts.arrowMover.style.opacity = "1";
      setTraceProgress(parts.arrowTrace, 0);
      setMoverProgress(parts.arrowMover, 0);
      frameId = requestAnimationFrameSafe(animateFrame);
    }

    resetIdleState();
    bindListener(button, "mouseenter", startAnimation);
    bindListener(button, "focus", startAnimation);
    bindListener(button, "mouseleave", resetIdleState);
    bindListener(button, "blur", resetIdleState);
    bindMediaChangeListener(reduceMotionQuery, resetIdleState);
  }

  function setupPracticeAnimation(button, reduceMotionQuery) {
    if (!button || button.__practiceAnimationBound) return;
    button.__practiceAnimationBound = true;

    var frameId = 0;
    var startAt = 0;
    var lastTrace = null;
    var traceLength = 0;

    function resolveParts() {
      var svg = querySelector(button, "svg");
      if (!svg) return null;
      var arrowTrace = querySelector(svg, ".practice-arrow-trace");
      var arrowMover = querySelector(svg, ".practice-arrow-mover");
      var arrowStatic = querySelector(svg, ".practice-arrow-static");
      if (!arrowTrace || !arrowMover || !arrowStatic) return null;
      return {
        arrowTrace: arrowTrace,
        arrowMover: arrowMover,
        arrowStatic: arrowStatic
      };
    }

    function ensureTraceLength(trace) {
      if (lastTrace !== trace) {
        lastTrace = trace;
        traceLength = safeGetPathLength(trace);
      }
      return traceLength;
    }

    function setTraceProgress(trace, progress) {
      var length = ensureTraceLength(trace);
      trace.style.strokeDasharray = String(length);
      trace.style.strokeDashoffset = String(length * (1 - progress));
    }

    function setMoverProgress(mover, progress) {
      mover.style.offsetDistance = (progress * 100).toFixed(3) + "%";
    }

    function stopFrame() {
      if (!frameId) return;
      cancelAnimationFrameSafe(frameId);
      frameId = 0;
    }

    function resetIdleState() {
      stopFrame();
      startAt = 0;
      var parts = resolveParts();
      if (!parts) return;
      parts.arrowStatic.style.opacity = "1";
      parts.arrowTrace.style.opacity = "0";
      setTraceProgress(parts.arrowTrace, 0);
      parts.arrowMover.style.opacity = "0";
      setMoverProgress(parts.arrowMover, 0);
    }

    function finishAnimation() {
      var parts = resolveParts();
      if (parts) {
        parts.arrowMover.style.opacity = "0";
        parts.arrowTrace.style.opacity = "0";
        parts.arrowStatic.style.opacity = "1";
      }
      frameId = 0;
      startAt = 0;
    }

    function animateFrame(timestamp) {
      if (!startAt) startAt = timestamp;
      var parts = resolveParts();
      if (!parts) {
        finishAnimation();
        return;
      }

      var elapsed = timestamp - startAt;
      var rawProgress = (elapsed - PRACTICE_DELAY_MS) / PRACTICE_DURATION_MS;
      var progress = clamp01(rawProgress);

      parts.arrowStatic.style.opacity = "0";
      parts.arrowTrace.style.opacity = "1";
      parts.arrowMover.style.opacity = "1";
      setTraceProgress(parts.arrowTrace, progress);
      setMoverProgress(parts.arrowMover, progress);

      if (progress >= 1) {
        finishAnimation();
        return;
      }

      frameId = requestAnimationFrameSafe(animateFrame);
    }

    function startAnimation() {
      if (isReducedMotionEnabled(reduceMotionQuery)) return;
      stopFrame();
      startAt = 0;
      var parts = resolveParts();
      if (!parts) return;
      parts.arrowStatic.style.opacity = "0";
      parts.arrowTrace.style.opacity = "1";
      parts.arrowMover.style.opacity = "1";
      setTraceProgress(parts.arrowTrace, 0);
      setMoverProgress(parts.arrowMover, 0);
      frameId = requestAnimationFrameSafe(animateFrame);
    }

    resetIdleState();
    bindListener(button, "mouseenter", startAnimation);
    bindListener(button, "focus", startAnimation);
    bindListener(button, "mouseleave", resetIdleState);
    bindListener(button, "blur", resetIdleState);
    bindMediaChangeListener(reduceMotionQuery, resetIdleState);
  }

  function setupResetAnimation(button, reduceMotionQuery) {
    if (!button || button.__resetAnimationBound) return;
    button.__resetAnimationBound = true;

    var frameId = 0;
    var startAt = 0;
    var lastTopTrace = null;
    var lastBottomTrace = null;
    var topLength = 0;
    var bottomLength = 0;

    function resolveParts() {
      var svg = querySelector(button, "svg");
      if (!svg) return null;
      var topTrace = querySelector(svg, ".reset-top-trace");
      var bottomTrace = querySelector(svg, ".reset-bottom-trace");
      var topMover = querySelector(svg, ".reset-top-mover");
      var bottomMover = querySelector(svg, ".reset-bottom-mover");
      var topStatic = querySelector(svg, ".reset-top-static");
      var bottomStatic = querySelector(svg, ".reset-bottom-static");
      if (!topTrace || !bottomTrace || !topMover || !bottomMover || !topStatic || !bottomStatic) {
        return null;
      }
      return {
        topTrace: topTrace,
        bottomTrace: bottomTrace,
        topMover: topMover,
        bottomMover: bottomMover,
        topStatic: topStatic,
        bottomStatic: bottomStatic
      };
    }

    function ensureLengths(parts) {
      if (lastTopTrace !== parts.topTrace) {
        lastTopTrace = parts.topTrace;
        topLength = safeGetPathLength(parts.topTrace);
      }
      if (lastBottomTrace !== parts.bottomTrace) {
        lastBottomTrace = parts.bottomTrace;
        bottomLength = safeGetPathLength(parts.bottomTrace);
      }
    }

    function setTraceProgress(trace, length, progress) {
      trace.style.strokeDasharray = String(length);
      trace.style.strokeDashoffset = String(length * (1 - progress));
    }

    function setMoverProgress(parts, progress) {
      var pct = (progress * 100).toFixed(3) + "%";
      parts.topMover.style.offsetDistance = pct;
      parts.bottomMover.style.offsetDistance = pct;
    }

    function stopFrame() {
      if (!frameId) return;
      cancelAnimationFrameSafe(frameId);
      frameId = 0;
    }

    function setStaticVisible(parts, visible) {
      var opacity = visible ? "1" : "0";
      parts.topStatic.style.opacity = opacity;
      parts.bottomStatic.style.opacity = opacity;
    }

    function resetIdleState() {
      stopFrame();
      startAt = 0;
      var parts = resolveParts();
      if (!parts) return;
      ensureLengths(parts);
      setStaticVisible(parts, true);
      parts.topTrace.style.opacity = "0";
      parts.bottomTrace.style.opacity = "0";
      setTraceProgress(parts.topTrace, topLength, 0);
      setTraceProgress(parts.bottomTrace, bottomLength, 0);
      parts.topMover.style.opacity = "0";
      parts.bottomMover.style.opacity = "0";
      setMoverProgress(parts, 0);
    }

    function finishAnimation() {
      var parts = resolveParts();
      if (parts) {
        parts.topMover.style.opacity = "0";
        parts.bottomMover.style.opacity = "0";
        parts.topTrace.style.opacity = "0";
        parts.bottomTrace.style.opacity = "0";
        setStaticVisible(parts, true);
      }
      frameId = 0;
      startAt = 0;
    }

    function animateFrame(timestamp) {
      if (!startAt) startAt = timestamp;
      var parts = resolveParts();
      if (!parts) {
        finishAnimation();
        return;
      }
      ensureLengths(parts);

      var elapsed = timestamp - startAt;
      var rawProgress = (elapsed - RESET_DELAY_MS) / RESET_DURATION_MS;
      var progress = clamp01(rawProgress);

      setStaticVisible(parts, false);
      parts.topTrace.style.opacity = "1";
      parts.bottomTrace.style.opacity = "1";
      parts.topMover.style.opacity = "1";
      parts.bottomMover.style.opacity = "1";
      setTraceProgress(parts.topTrace, topLength, progress);
      setTraceProgress(parts.bottomTrace, bottomLength, progress);
      setMoverProgress(parts, progress);

      if (progress >= 1) {
        finishAnimation();
        return;
      }

      frameId = requestAnimationFrameSafe(animateFrame);
    }

    function startAnimation() {
      if (isReducedMotionEnabled(reduceMotionQuery)) return;
      stopFrame();
      startAt = 0;
      var parts = resolveParts();
      if (!parts) return;
      ensureLengths(parts);
      setStaticVisible(parts, false);
      parts.topTrace.style.opacity = "1";
      parts.bottomTrace.style.opacity = "1";
      parts.topMover.style.opacity = "1";
      parts.bottomMover.style.opacity = "1";
      setTraceProgress(parts.topTrace, topLength, 0);
      setTraceProgress(parts.bottomTrace, bottomLength, 0);
      setMoverProgress(parts, 0);
      frameId = requestAnimationFrameSafe(animateFrame);
    }

    resetIdleState();
    bindListener(button, "mouseenter", startAnimation);
    bindListener(button, "focus", startAnimation);
    bindListener(button, "mouseleave", resetIdleState);
    bindListener(button, "blur", resetIdleState);
    bindMediaChangeListener(reduceMotionQuery, resetIdleState);
  }

  function setupTopButtonAnimations(documentLike) {
    if (!documentLike) return;
    decorateTopButtonIcons(documentLike);

    var matchMedia = asFunction(global.matchMedia);
    var reduceMotionQuery = null;
    if (matchMedia) {
      try {
        reduceMotionQuery = matchMedia.call(global, "(prefers-reduced-motion: reduce)");
      } catch (_err) {
        reduceMotionQuery = null;
      }
    }

    var exportButtons = querySelectorAll(documentLike, ".top-action-btn.export-btn");
    for (var i = 0; i < exportButtons.length; i += 1) {
      setupExportAnimation(exportButtons[i], reduceMotionQuery);
    }

    var practiceButtons = querySelectorAll(documentLike, ".top-action-btn.practice-btn");
    for (var j = 0; j < practiceButtons.length; j += 1) {
      setupPracticeAnimation(practiceButtons[j], reduceMotionQuery);
    }

    var resetButtons = querySelectorAll(
      documentLike,
      ".restart-button.reset-btn, .top-action-btn.reset-btn, #top-restart-btn.reset-btn"
    );
    for (var k = 0; k < resetButtons.length; k += 1) {
      setupResetAnimation(resetButtons[k], reduceMotionQuery);
    }
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function preventDefault(event) {
    var eventLike = toRecord(event);
    var preventDefaultFn = asFunction(eventLike.preventDefault);
    if (preventDefaultFn) {
      preventDefaultFn.call(eventLike);
    }
  }

  function bindClickWithPreventDefault(getElementById, elementId, action) {
    if (!action) return false;
    var element = getElementById(elementId);
    return bindListener(element, "click", function (event) {
      preventDefault(event);
      action();
    });
  }

  function applyTopActionBindings(input) {
    var source = toRecord(input);
    var getElementById = asFunction(source.getElementById);
    if (!getElementById) {
      return {
        didBind: false,
        boundControlCount: 0
      };
    }

    var tryUndo = asFunction(source.tryUndo);
    var exportReplay = asFunction(source.exportReplay);
    var openPracticeBoardFromCurrent = asFunction(source.openPracticeBoardFromCurrent);
    var openSettingsModal = asFunction(source.openSettingsModal);
    var closeSettingsModal = asFunction(source.closeSettingsModal);

    var boundControlCount = 0;
    if (bindClickWithPreventDefault(getElementById, "undo-link", tryUndo)) {
      boundControlCount += 1;
    }
    if (bindClickWithPreventDefault(getElementById, "top-export-replay-btn", exportReplay)) {
      boundControlCount += 1;
    }
    if (bindClickWithPreventDefault(getElementById, "top-practice-btn", openPracticeBoardFromCurrent)) {
      boundControlCount += 1;
    }
    if (bindClickWithPreventDefault(getElementById, "practice-mobile-undo-btn", tryUndo)) {
      boundControlCount += 1;
    }
    if (bindClickWithPreventDefault(getElementById, "top-settings-btn", openSettingsModal)) {
      boundControlCount += 1;
    }
    var settingsModal = getElementById("settings-modal");
    if (
      closeSettingsModal &&
      bindListener(settingsModal, "click", function (event) {
        if (toRecord(event).target === settingsModal) {
          closeSettingsModal();
        }
      })
    ) {
      boundControlCount += 1;
    }

    setupTopButtonAnimations(toRecord(global).document);

    return {
      didBind: boundControlCount > 0,
      boundControlCount: boundControlCount
    };
  }

  global.CoreTopActionBindingsHostRuntime = global.CoreTopActionBindingsHostRuntime || {};
  global.CoreTopActionBindingsHostRuntime.applyTopActionBindings = applyTopActionBindings;
})(typeof window !== "undefined" ? window : undefined);
