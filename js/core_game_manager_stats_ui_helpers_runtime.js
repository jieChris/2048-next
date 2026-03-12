function normalizeStatsPanelVisibilityKeyPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveStatsPanelVisibilityKey(manager) {
  var baseKey = GameManager.STATS_PANEL_VISIBLE_KEY;
  if (!manager) return baseKey;

  var documentLike = resolveManagerDocumentLike(manager);
  var body = documentLike && documentLike.body ? documentLike.body : null;
  var pathName = "";
  if (documentLike && documentLike.location && typeof documentLike.location.pathname === "string") {
    pathName = documentLike.location.pathname;
  }
  var pathPart = normalizeStatsPanelVisibilityKeyPart(pathName.split("/").pop());
  var pagePart = normalizeStatsPanelVisibilityKeyPart(body && body.getAttribute ? body.getAttribute("data-page") : "");
  var variantPart = normalizeStatsPanelVisibilityKeyPart(body && body.getAttribute ? body.getAttribute("data-page-variant") : "");
  var modePart = normalizeStatsPanelVisibilityKeyPart(
    manager.modeKey ||
      manager.mode ||
      (body && body.getAttribute ? body.getAttribute("data-mode-id") : "")
  );
  var parts = [];

  if (pathPart) parts.push(pathPart);
  else if (pagePart) parts.push(pagePart);
  if (variantPart && parts.indexOf(variantPart) === -1) parts.push(variantPart);
  if (modePart && parts.indexOf(modePart) === -1) parts.push(modePart);

  return parts.length ? baseKey + ":" + parts.join(":") : baseKey;
}

function createStatsPanelVisibilityPayload(manager, isOpen) {
  return {
    key: resolveStatsPanelVisibilityKey(manager),
    enabled: !!isOpen,
    trueValue: "1",
    falseValue: "0"
  };
}

function writeStatsPanelVisibilityFlagFallback(manager, isOpen) {
  var storage = manager.getWebStorageByName("localStorage");
  if (!canWriteToStorage(storage)) return false;
  try {
    storage.setItem(resolveStatsPanelVisibilityKey(manager), isOpen ? "1" : "0");
    return true;
  } catch (_err) {
    return false;
  }
}

function writeStatsPanelVisibilityFlag(manager, isOpen) {
  if (!manager) return false;
  var coreCallResult = callCoreStorageRuntime(
    manager,
    "writeStorageFlagFromContext",
    createStatsPanelVisibilityPayload(manager, isOpen),
    true
  );
  return manager.resolveCoreBooleanCallOrFallback(coreCallResult, function () {
    return writeStatsPanelVisibilityFlagFallback(manager, isOpen);
  });
}

function hideLegacyStatsSourceElement(el) {
  if (!el) return;
  // Preserve layout while moving display to page corner
  el.style.visibility = "hidden";
}

function resolveOrCreateCornerStatElement(manager, documentLike, elementId) {
  if (!manager || !documentLike || !(typeof elementId === "string" && elementId)) return null;
  var cornerEl = resolveManagerElementById(manager, elementId);
  if (cornerEl) return cornerEl;
  if (typeof documentLike.createElement !== "function") return null;
  cornerEl = documentLike.createElement("div");
  cornerEl.id = elementId;
  if (documentLike.body && typeof documentLike.body.appendChild === "function") {
    documentLike.body.appendChild(cornerEl);
  }
  return cornerEl;
}

function applyCornerStatBaseStyle(cornerEl) {
  if (!cornerEl) return;
  cornerEl.style.position = "fixed";
  cornerEl.style.top = "8px";
  cornerEl.style.zIndex = "1000";
  cornerEl.style.background = "transparent";
  cornerEl.style.color = "#776e65";
  cornerEl.style.fontWeight = "bold";
  cornerEl.style.fontSize = "20px";
  cornerEl.style.pointerEvents = "none";
}

function initCornerRateDisplay(manager, documentLike, rateEl) {
  if (!manager || !rateEl) return;
  hideLegacyStatsSourceElement(rateEl);
  var cornerRateEl = resolveOrCreateCornerStatElement(manager, documentLike, "corner-stats-4-rate");
  manager.cornerRateEl = cornerRateEl;
  if (!manager.cornerRateEl) return;
  applyCornerStatBaseStyle(manager.cornerRateEl);
  manager.cornerRateEl.style.left = "10px";
  manager.cornerRateEl.textContent = "0.00";
}

function initCornerIpsDisplay(manager, documentLike, ipsEl) {
  if (!manager || !ipsEl) return;
  hideLegacyStatsSourceElement(ipsEl);
  var cornerIpsEl = resolveOrCreateCornerStatElement(manager, documentLike, "corner-stats-ips");
  manager.cornerIpsEl = cornerIpsEl;
  if (!manager.cornerIpsEl) return;
  applyCornerStatBaseStyle(manager.cornerIpsEl);
  manager.cornerIpsEl.style.right = "10px";
  manager.cornerIpsEl.textContent = "IPS: 0";
}

function initCornerStatsUi(manager) {
  if (!manager) return;
  var rateEl = resolveManagerElementById(manager, "stats-4-rate");
  var ipsEl = resolveManagerElementById(manager, "stats-ips");
  var documentLike = resolveManagerDocumentLike(manager);
  initCornerRateDisplay(manager, documentLike, rateEl);
  initCornerIpsDisplay(manager, documentLike, ipsEl);
}

function resolveOrCreateStatsPanelToggleButton(manager, documentLike) {
  if (!manager || !documentLike) return null;
  var btn = resolveManagerElementById(manager, "stats-panel-toggle");
  if (btn) return btn;
  if (typeof documentLike.createElement !== "function") return null;
  btn = documentLike.createElement("a");
  btn.id = "stats-panel-toggle";
  return btn;
}

function configureStatsPanelToggleButton(btn) {
  if (!btn) return;
  btn.title = "统计";
  btn.setAttribute("aria-label", "统计");
  if (!btn.querySelector("svg")) {
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>';
  }
  btn.className = "top-action-btn stats-panel-toggle";
}

function resolveStatsPanelTopActionHost(documentLike, exportBtn, practiceStatsActions) {
  if (practiceStatsActions) return practiceStatsActions;
  if (exportBtn && exportBtn.parentNode) return exportBtn.parentNode;
  if (documentLike && typeof documentLike.querySelector === "function") {
    return documentLike.querySelector(".heading .top-action-buttons") ||
      documentLike.querySelector(".top-action-buttons");
  }
  return null;
}

function mountStatsPanelToggleButton(documentLike, btn, topActionHost, exportBtn) {
  if (!documentLike || !btn) return;
  var body = documentLike.body;
  if (topActionHost) {
    btn.classList.remove("is-floating");
    if (exportBtn && exportBtn.parentNode === topActionHost) {
      if (btn.parentNode !== topActionHost || btn.nextSibling !== exportBtn) topActionHost.insertBefore(btn, exportBtn);
    } else if (btn.parentNode !== topActionHost) {
      topActionHost.insertBefore(btn, topActionHost.firstChild);
    }
    return;
  }
  if (body && typeof body.appendChild === "function") {
    if (btn.parentNode !== body) body.appendChild(btn);
    btn.classList.add("is-floating");
  }
}

function createStatsPanelOverlayHtml() {
  return (
    "<div class='replay-modal-content stats-panel-content'>" +
    "<h3>统计汇总</h3>" +
    "<div class='stats-panel-row'><span>总步数</span><span id='stats-panel-total'>0</span></div>" +
    "<div class='stats-panel-row'><span>移动步数</span><span id='stats-panel-moves'>0</span></div>" +
    "<div class='stats-panel-row'><span>撤回步数</span><span id='stats-panel-undo'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-two-label'>出2数量</span><span id='stats-panel-two'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-four-label'>出4数量</span><span id='stats-panel-four'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-four-rate-label'>实际出4率</span><span id='stats-panel-four-rate'>0.00</span></div>" +
    "<div class='replay-modal-actions'>" +
    "<button id='stats-panel-close' class='replay-button'>关闭</button>" +
    "</div>" +
    "</div>"
  );
}

function appendStatsPanelOverlayToDocumentBody(documentLike, overlay) {
  if (!(documentLike && documentLike.body && typeof documentLike.body.appendChild === "function")) return;
  documentLike.body.appendChild(overlay);
}

function resolveOrCreateStatsPanelOverlay(manager, documentLike) {
  if (!manager || !documentLike) return null;
  var overlay = resolveManagerElementById(manager, "stats-panel-overlay");
  if (overlay) return overlay;
  if (typeof documentLike.createElement !== "function") return null;
  overlay = documentLike.createElement("div");
  overlay.id = "stats-panel-overlay";
  overlay.className = "replay-modal-overlay";
  overlay.style.display = "none";
  overlay.innerHTML = createStatsPanelOverlayHtml();
  appendStatsPanelOverlayToDocumentBody(documentLike, overlay);
  return overlay;
}

function bindStatsPanelToggleButtonEvent(manager, btn) {
  if (!(manager && btn) || btn.__statsBound) return;
  btn.__statsBound = true;
  btn.addEventListener("click", function (event) {
    event.preventDefault();
    manager.openStatsPanel();
  });
}

function bindStatsPanelCloseButtonEvent(manager, closeBtn) {
  if (!(manager && closeBtn) || closeBtn.__statsBound) return;
  closeBtn.__statsBound = true;
  closeBtn.addEventListener("click", function () {
    manager.closeStatsPanel();
  });
}

function bindStatsPanelOverlayClickEvent(manager, overlay) {
  if (!(manager && overlay) || overlay.__statsBound) return;
  overlay.__statsBound = true;
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) manager.closeStatsPanel();
  });
}

function bindStatsPanelUiEvents(manager, btn, overlay) {
  if (!manager) return;
  bindStatsPanelToggleButtonEvent(manager, btn);
  var closeBtn = resolveManagerElementById(manager, "stats-panel-close");
  bindStatsPanelCloseButtonEvent(manager, closeBtn);
  bindStatsPanelOverlayClickEvent(manager, overlay);
}

function resolveStatsPanelInitialOpenState(manager) {
  if (!manager) return false;
  var key = resolveStatsPanelVisibilityKey(manager);
  var coreCallResult = callCoreStorageRuntime(manager, "readStorageFlagFromContext", { key: key, trueValue: "1" }, true);
  var isOpen = manager.resolveCoreBooleanCallOrFallback(coreCallResult, function () {
    var storage = manager.getWebStorageByName("localStorage");
    if (!canReadFromStorage(storage)) return false;
    try {
      return storage.getItem(key) === "1";
    } catch (_err) {
      return false;
    }
  });
  return isOpen;
}

function applyStatsPanelOverlayDisplay(overlay, isOpen) {
  if (!overlay) return;
  overlay.style.display = isOpen ? "flex" : "none";
}

function initStatsPanelUi(manager) {
  if (!manager) return;
  var documentLike = resolveManagerDocumentLike(manager);
  if (!documentLike || !documentLike.body) return;
  var btn = resolveOrCreateStatsPanelToggleButton(manager, documentLike);
  configureStatsPanelToggleButton(btn);
  var exportBtn = resolveManagerElementById(manager, "top-export-replay-btn");
  var practiceStatsActions = resolveManagerElementById(manager, "practice-stats-actions");
  var topActionHost = resolveStatsPanelTopActionHost(documentLike, exportBtn, practiceStatsActions);
  mountStatsPanelToggleButton(documentLike, btn, topActionHost, exportBtn);
  var overlay = resolveOrCreateStatsPanelOverlay(manager, documentLike);
  bindStatsPanelUiEvents(manager, btn, overlay);
  var isOpen = resolveStatsPanelInitialOpenState(manager);
  applyStatsPanelOverlayDisplay(overlay, isOpen);
}
