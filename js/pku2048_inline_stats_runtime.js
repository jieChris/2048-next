(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var STORAGE_KEY_INLINE = "pku2048.settings.statsPanelInline";
  var STORAGE_KEY_LOCKED = "pku2048.settings.statsPanelInlineLocked";
  var STORAGE_KEY_POSITION = "pku2048.settings.statsPanelInlinePos";
  var STORAGE_KEY_SIZE = "pku2048.settings.statsPanelInlineSize";
  var STATS_PANEL_VISIBLE_KEY = "stats_panel_visible_v1";
  var RETRY_LIMIT = 20;
  var RETRY_DELAY_MS = 300;

  var PANEL_SIZE_MIN_WIDTH = 170;
  var PANEL_SIZE_MIN_HEIGHT = 180;
  var PANEL_SIZE_MAX_WIDTH = 520;
  var PANEL_SIZE_MAX_HEIGHT = 520;
  var PANEL_BASE_WIDTH = 210;
  var PANEL_BASE_HEIGHT = 220;
  var PANEL_SCALE_MIN = 0.78;
  var PANEL_SCALE_MAX = 1.65;

  function readText(key) {
    try {
      return global.localStorage.getItem(key) || "";
    } catch (_error) {
      return "";
    }
  }

  function writeText(key, value) {
    try {
      global.localStorage.setItem(key, value);
    } catch (_error) {
    }
  }

  function readFlag(key) {
    return readText(key) === "1";
  }

  function writeFlag(key, enabled) {
    writeText(key, enabled ? "1" : "0");
  }

  function readPosition() {
    var raw = readText(STORAGE_KEY_POSITION);
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || !Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
      return { x: parsed.x, y: parsed.y };
    } catch (_error) {
      return null;
    }
  }

  function writePosition(position) {
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return;
    writeText(STORAGE_KEY_POSITION, JSON.stringify({ x: Math.round(position.x), y: Math.round(position.y) }));
  }

  function readSize() {
    var raw = readText(STORAGE_KEY_SIZE);
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || !Number.isFinite(parsed.w) || !Number.isFinite(parsed.h)) return null;
      return { w: parsed.w, h: parsed.h };
    } catch (_error) {
      return null;
    }
  }

  function writeSize(size) {
    if (!size || !Number.isFinite(size.w) || !Number.isFinite(size.h)) return;
    writeText(STORAGE_KEY_SIZE, JSON.stringify({ w: Math.round(size.w), h: Math.round(size.h) }));
  }

  function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  function getViewportSize(documentLike) {
    var docEl = documentLike.documentElement || {};
    var width = Math.max(docEl.clientWidth || 0, global.innerWidth || 0);
    var height = Math.max(docEl.clientHeight || 0, global.innerHeight || 0);
    return { width: width, height: height };
  }

  function getDefaultPosition(documentLike) {
    var viewport = getViewportSize(documentLike);
    if (viewport.width <= 900) return { x: 8, y: 84 };
    return { x: 12, y: 92 };
  }

  function resolveNodes(documentLike) {
    var overlay = documentLike.getElementById("stats-panel-overlay");
    var statsContent = overlay ? overlay.querySelector(".stats-panel-content") : null;
    return {
      body: documentLike.body,
      toggle: documentLike.getElementById("pku2048-inline-stats-toggle"),
      toggleLabel: documentLike.querySelector('label[for="pku2048-inline-stats-toggle"]'),
      toggleDesc: documentLike.querySelector("#pku2048-inline-stats-toggle + span"),
      settingsBtn: documentLike.getElementById("top-settings-btn"),
      statsButton: documentLike.getElementById("stats-panel-toggle"),
      statsOverlay: overlay,
      statsContent: statsContent,
      statsTitle: statsContent ? statsContent.querySelector("h3") : null,
      lockButton: statsContent ? statsContent.querySelector("#pku2048-stats-lock-btn") : null,
      resizeHandle: statsContent ? statsContent.querySelector("#pku2048-stats-resize-handle") : null
    };
  }

  function patchSettingsCopy(nodes) {
    if (nodes.toggleLabel) nodes.toggleLabel.textContent = "统计面板";
    if (nodes.toggleDesc) nodes.toggleDesc.textContent = "直接显示在页面中";
  }

  function ensureOverlayOpen(nodes, state) {
    if (nodes.statsOverlay) {
      nodes.statsOverlay.style.display = "block";
      return;
    }
    if (!nodes.statsButton) return;
    if (state.overlayOpenAttempted) return;
    state.overlayOpenAttempted = true;
    try {
      nodes.statsButton.click();
    } catch (_error) {
    }
  }

  function clampPanelSizeToViewport(documentLike, size) {
    var viewport = getViewportSize(documentLike);
    var gap = 8;
    var maxWidthByViewport = Math.max(PANEL_SIZE_MIN_WIDTH, viewport.width - gap * 2);
    var maxHeightByViewport = Math.max(PANEL_SIZE_MIN_HEIGHT, viewport.height - gap * 2);
    return {
      w: Math.round(clamp(size.w, PANEL_SIZE_MIN_WIDTH, Math.min(PANEL_SIZE_MAX_WIDTH, maxWidthByViewport))),
      h: Math.round(clamp(size.h, PANEL_SIZE_MIN_HEIGHT, Math.min(PANEL_SIZE_MAX_HEIGHT, maxHeightByViewport)))
    };
  }

  function resolvePanelScale(size) {
    var width = size && Number.isFinite(size.w) ? size.w : PANEL_BASE_WIDTH;
    var height = size && Number.isFinite(size.h) ? size.h : PANEL_BASE_HEIGHT;
    var widthScale = width / PANEL_BASE_WIDTH;
    var heightScale = height / PANEL_BASE_HEIGHT;
    // Use blended scaling so width/height changes both affect inner element size.
    var areaScale = Math.sqrt(Math.max(0.01, widthScale * heightScale));
    // Guard against oversizing when width is narrow but height is very large.
    var widthGuardMax = widthScale * 1.12;
    return clamp(Math.min(areaScale, widthGuardMax), PANEL_SCALE_MIN, PANEL_SCALE_MAX);
  }

  function applyPanelScale(panel, size) {
    if (!panel) return;
    var scale = resolvePanelScale(size);
    panel.style.setProperty("--pku-stats-scale", String(scale));
  }

  function applyPanelSize(documentLike, state, requestedSize) {
    var nodes = resolveNodes(documentLike);
    var panel = nodes.statsContent;
    if (!panel) return;

    var size = requestedSize || state.size || readSize();
    if (!size) {
      panel.style.width = "";
      panel.style.maxWidth = "";
      panel.style.height = "";
      state.size = null;
      applyPanelScale(panel, null);
      return;
    }

    var clamped = clampPanelSizeToViewport(documentLike, size);
    panel.style.width = clamped.w + "px";
    panel.style.maxWidth = clamped.w + "px";
    panel.style.height = clamped.h + "px";
    state.size = clamped;
    applyPanelScale(panel, clamped);
  }

  function clampPositionToViewport(documentLike, panel, position) {
    var viewport = getViewportSize(documentLike);
    var gap = 8;
    var rect = panel.getBoundingClientRect();
    var panelWidth = rect.width || panel.offsetWidth || 210;
    var panelHeight = rect.height || panel.offsetHeight || 220;
    var maxX = Math.max(gap, viewport.width - panelWidth - gap);
    var maxY = Math.max(gap, viewport.height - panelHeight - gap);
    return {
      x: Math.round(clamp(position.x, gap, maxX)),
      y: Math.round(clamp(position.y, gap, maxY))
    };
  }

  function applyPanelPosition(documentLike, state, requestedPosition) {
    var nodes = resolveNodes(documentLike);
    var panel = nodes.statsContent;
    if (!panel) return;

    var position = requestedPosition || state.position || readPosition() || getDefaultPosition(documentLike);
    var clamped = clampPositionToViewport(documentLike, panel, position);
    panel.style.left = clamped.x + "px";
    panel.style.top = clamped.y + "px";
    state.position = clamped;
  }

  function getLockedIconSvg() {
    return "<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" +
      "<rect x='5' y='11' width='14' height='10' rx='2' stroke='currentColor' stroke-width='2'/>" +
      "<path d='M8 11V8a4 4 0 0 1 8 0v3' stroke='currentColor' stroke-width='2' stroke-linecap='round'/>" +
      "</svg>";
  }

  function getUnlockedIconSvg() {
    return "<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" +
      "<rect x='5' y='11' width='14' height='10' rx='2' stroke='currentColor' stroke-width='2'/>" +
      "<path d='M8 11V8a4 4 0 0 1 7-2.7' stroke='currentColor' stroke-width='2' stroke-linecap='round'/>" +
      "</svg>";
  }

  function updateLockButtonVisual(button, locked) {
    if (!button) return;
    button.classList.toggle("is-locked", !!locked);
    button.title = locked ? "已锁定，点击解锁" : "未锁定，可拖动";
    button.setAttribute("aria-label", locked ? "解锁统计面板拖动" : "锁定统计面板拖动");
    button.setAttribute("aria-pressed", locked ? "true" : "false");
    button.innerHTML = locked ? getLockedIconSvg() : getUnlockedIconSvg();
  }

  function applyLockState(documentLike, state, locked) {
    state.locked = !!locked;
    writeFlag(STORAGE_KEY_LOCKED, state.locked);

    var nodes = resolveNodes(documentLike);
    if (!nodes.body) return;
    nodes.body.classList.toggle("pku2048-stats-inline-locked", state.locked);
    updateLockButtonVisual(nodes.lockButton, state.locked);

    if (state.locked && state.dragging) {
      state.dragging = null;
      nodes.body.classList.remove("pku2048-stats-inline-dragging");
    }
  }

  function ensureLockButton(documentLike, state) {
    var nodes = resolveNodes(documentLike);
    if (!nodes.statsContent) return;

    var button = nodes.lockButton;
    if (!button && typeof documentLike.createElement === "function") {
      button = documentLike.createElement("button");
      button.id = "pku2048-stats-lock-btn";
      button.type = "button";
      nodes.statsContent.appendChild(button);
    }

    if (!button || button.__pku2048LockBound) return;
    button.__pku2048LockBound = true;
    updateLockButtonVisual(button, state.locked);

    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      applyLockState(documentLike, state, !state.locked);
      if (typeof button.blur === "function") button.blur();
    });
  }

  function ensureResizeHandle(documentLike, state) {
    var nodes = resolveNodes(documentLike);
    if (!nodes.statsContent) return;

    var handle = nodes.resizeHandle;
    if (!handle && typeof documentLike.createElement === "function") {
      handle = documentLike.createElement("button");
      handle.id = "pku2048-stats-resize-handle";
      handle.type = "button";
      handle.setAttribute("aria-label", "拖拽调整统计面板大小");
      handle.title = "拖拽调整大小";
      nodes.statsContent.appendChild(handle);
    }

    if (!handle || handle.__pku2048ResizeBound) return;
    handle.__pku2048ResizeBound = true;

    handle.addEventListener("pointerdown", function (event) {
      var latestNodes = resolveNodes(documentLike);
      if (!latestNodes.body || !latestNodes.statsContent) return;
      if (!latestNodes.body.classList.contains("pku2048-stats-inline-mode")) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      var rect = latestNodes.statsContent.getBoundingClientRect();
      state.resizing = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originW: rect.width,
        originH: rect.height
      };
      latestNodes.body.classList.add("pku2048-stats-inline-resizing");

      if (typeof handle.setPointerCapture === "function") {
        try {
          handle.setPointerCapture(event.pointerId);
        } catch (_error) {
        }
      }
    });
  }

  function bindDragEvents(documentLike, state) {
    var nodes = resolveNodes(documentLike);
    var dragHandle = nodes.statsTitle || nodes.statsContent;
    if (!dragHandle || dragHandle.__pku2048DragBound) return;

    dragHandle.__pku2048DragBound = true;

    dragHandle.addEventListener("pointerdown", function (event) {
      var latestNodes = resolveNodes(documentLike);
      if (!latestNodes.body || !latestNodes.statsContent) return;
      if (!latestNodes.body.classList.contains("pku2048-stats-inline-mode")) return;
      if (state.locked) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      var rect = latestNodes.statsContent.getBoundingClientRect();
      state.dragging = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: rect.left,
        originY: rect.top
      };
      latestNodes.body.classList.add("pku2048-stats-inline-dragging");

      if (typeof dragHandle.setPointerCapture === "function") {
        try {
          dragHandle.setPointerCapture(event.pointerId);
        } catch (_error) {
        }
      }
    });

    if (state.dragRuntimeBound) return;
    state.dragRuntimeBound = true;

    global.addEventListener("pointermove", function (event) {
      var nodesOnMove = resolveNodes(documentLike);
      if (!nodesOnMove.statsContent || !nodesOnMove.body) return;

      if (state.resizing && event.pointerId === state.resizing.pointerId) {
        var nextSize = {
          w: state.resizing.originW + (event.clientX - state.resizing.startX),
          h: state.resizing.originH + (event.clientY - state.resizing.startY)
        };
        applyPanelSize(documentLike, state, nextSize);
        applyPanelPosition(documentLike, state, state.position || readPosition() || getDefaultPosition(documentLike));
        return;
      }

      if (!state.dragging) return;
      if (event.pointerId !== state.dragging.pointerId) return;

      var nextPosition = {
        x: state.dragging.originX + (event.clientX - state.dragging.startX),
        y: state.dragging.originY + (event.clientY - state.dragging.startY)
      };
      var clamped = clampPositionToViewport(documentLike, nodesOnMove.statsContent, nextPosition);
      nodesOnMove.statsContent.style.left = clamped.x + "px";
      nodesOnMove.statsContent.style.top = clamped.y + "px";
      state.position = clamped;
    });

    function finishPointerInteraction(event) {
      var nodesOnEnd = resolveNodes(documentLike);

      if (state.dragging && (!event || event.pointerId === state.dragging.pointerId)) {
        if (nodesOnEnd.body) nodesOnEnd.body.classList.remove("pku2048-stats-inline-dragging");
        if (state.position) writePosition(state.position);
        state.dragging = null;
      }

      if (state.resizing && (!event || event.pointerId === state.resizing.pointerId)) {
        if (nodesOnEnd.body) nodesOnEnd.body.classList.remove("pku2048-stats-inline-resizing");
        applyPanelPosition(documentLike, state, state.position || readPosition() || getDefaultPosition(documentLike));
        if (state.position) writePosition(state.position);
        if (state.size) writeSize(state.size);
        state.resizing = null;
      }
    }

    global.addEventListener("pointerup", finishPointerInteraction);
    global.addEventListener("pointercancel", finishPointerInteraction);

    global.addEventListener("resize", function () {
      if (!state.inlineEnabled) return;
      applyPanelSize(documentLike, state, state.size || readSize());
      applyPanelPosition(documentLike, state, state.position || readPosition() || getDefaultPosition(documentLike));
      if (state.size) writeSize(state.size);
      if (state.position) writePosition(state.position);
    });
  }

  function applyMode(documentLike, enabled, state) {
    var nodes = resolveNodes(documentLike);
    if (!nodes.body) return;

    state.inlineEnabled = !!enabled;
    patchSettingsCopy(nodes);

    if (nodes.toggle) nodes.toggle.checked = state.inlineEnabled;

    nodes.body.classList.toggle("pku2048-stats-inline-mode", state.inlineEnabled);

    if (nodes.statsButton) nodes.statsButton.style.display = state.inlineEnabled ? "none" : "";

    if (state.inlineEnabled) {
      ensureOverlayOpen(nodes, state);
      var latestNodes = resolveNodes(documentLike);
      if (latestNodes.statsOverlay) latestNodes.statsOverlay.style.display = "block";
      ensureLockButton(documentLike, state);
      ensureResizeHandle(documentLike, state);
      bindDragEvents(documentLike, state);
      applyLockState(documentLike, state, state.locked);
      applyPanelSize(documentLike, state, state.size || readSize());
      applyPanelPosition(documentLike, state, state.position || readPosition() || getDefaultPosition(documentLike));
      if (state.size) writeSize(state.size);
      if (state.position) writePosition(state.position);
      writeFlag(STATS_PANEL_VISIBLE_KEY, true);
      return;
    }

    state.dragging = null;
    state.resizing = null;
    nodes.body.classList.remove("pku2048-stats-inline-dragging");
    nodes.body.classList.remove("pku2048-stats-inline-resizing");
    if (nodes.statsOverlay) nodes.statsOverlay.style.display = "none";
    writeFlag(STATS_PANEL_VISIBLE_KEY, false);
  }

  function bindToggle(documentLike, state) {
    var nodes = resolveNodes(documentLike);
    if (!nodes.toggle || nodes.toggle.__pku2048StatsModeBound) return;

    nodes.toggle.__pku2048StatsModeBound = true;
    patchSettingsCopy(nodes);

    nodes.toggle.addEventListener("change", function () {
      var enabled = !!nodes.toggle.checked;
      writeFlag(STORAGE_KEY_INLINE, enabled);
      state.inlineEnabled = enabled;
      applyMode(documentLike, enabled, state);
    });
  }

  function start(documentLike) {
    var body = documentLike.body;
    if (!body || body.getAttribute("data-page-variant") !== "PKU2048") return;

    var state = {
      retryCount: 0,
      overlayOpenAttempted: false,
      inlineEnabled: readFlag(STORAGE_KEY_INLINE),
      locked: readFlag(STORAGE_KEY_LOCKED),
      position: readPosition(),
      size: readSize(),
      dragging: null,
      resizing: null,
      dragRuntimeBound: false
    };

    function sync() {
      state.inlineEnabled = readFlag(STORAGE_KEY_INLINE);
      state.locked = readFlag(STORAGE_KEY_LOCKED);
      state.position = readPosition() || state.position || getDefaultPosition(documentLike);
      state.size = readSize() || state.size;
      bindToggle(documentLike, state);
      applyMode(documentLike, state.inlineEnabled, state);
    }

    function retryUntilReady() {
      sync();
      var nodes = resolveNodes(documentLike);
      var ready = !!nodes.toggle && (!!nodes.statsButton || !!nodes.statsOverlay);
      if (ready) return;
      if (state.retryCount >= RETRY_LIMIT) return;
      state.retryCount += 1;
      global.setTimeout(retryUntilReady, RETRY_DELAY_MS);
    }

    retryUntilReady();

    var nodes = resolveNodes(documentLike);
    if (nodes.settingsBtn && !nodes.settingsBtn.__pku2048StatsSyncBound) {
      nodes.settingsBtn.__pku2048StatsSyncBound = true;
      nodes.settingsBtn.addEventListener("click", function () {
        global.setTimeout(sync, 0);
      });
    }

    global.addEventListener("pageshow", sync);
  }

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", function () {
      start(global.document);
    }, { once: true });
  } else {
    start(global.document);
  }
})(typeof window !== "undefined" ? window : undefined);





