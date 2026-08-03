function normalizeStatsPanelVisibilityKeyPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveStatsPanelBodyAttribute(body, attrName) {
  if (!(body && body.getAttribute)) return "";
  return body.getAttribute(attrName) || "";
}

function resolveStatsPanelPathName(documentLike) {
  if (!(documentLike && documentLike.location)) return "";
  return typeof documentLike.location.pathname === "string" ? documentLike.location.pathname : "";
}

function normalizeStatsPanelLanguage(value) {
  var lang = String(value || "").trim().toLowerCase();
  if (lang.indexOf("en") === 0) return "en";
  if (lang.indexOf("zh") === 0) return "zh";
  return "";
}
var STATS_PANEL_COPY_EN = {
  button: "Stats", title: "Stats Summary", totalSteps: "Total Actions", moveSteps: "Effective Moves",
  undoSteps: "Undo Count", validInputs: "Valid Inputs", invalidInputs: "Invalid Inputs",
  primarySpawns: "2 Spawns", secondarySpawns: "4 Spawns",
  secondaryRate: "Actual 4-Rate", close: "Close"
};
var STATS_PANEL_COPY_ZH = {
  button: "\u7edf\u8ba1", title: "\u7edf\u8ba1\u6c47\u603b", totalSteps: "\u603b\u64cd\u4f5c\u6570",
  moveSteps: "\u6709\u6548\u79fb\u52a8\u6570", undoSteps: "\u64a4\u56de\u6b21\u6570",
  validInputs: "\u6709\u6548\u8f93\u5165\u6570", invalidInputs: "\u65e0\u6548\u8f93\u5165\u6570",
  primarySpawns: "\u51fa2\u6570\u91cf", secondarySpawns: "\u51fa4\u6570\u91cf",
  secondaryRate: "\u5b9e\u9645\u51fa4\u7387", close: "\u5173\u95ed"
};

function resolveStatsPanelWindowLike(manager, documentLike) {
  if (manager && typeof manager.getWindowLike === "function") {
    try {
      var managerWindow = manager.getWindowLike();
      if (managerWindow) return managerWindow;
    } catch (_errManagerWindow) {}
  }
  if (documentLike && documentLike.defaultView) return documentLike.defaultView;
  if (typeof window !== "undefined") return window;
  return null;
}
function resolveCoreStatsPanelCopyRuntime() {
  if (typeof CoreStatsPanelCopyRuntime !== "undefined" && CoreStatsPanelCopyRuntime) return CoreStatsPanelCopyRuntime;
  if (typeof window !== "undefined" && window && window.CoreStatsPanelCopyRuntime) return window.CoreStatsPanelCopyRuntime;
  return null;
}
function readStatsPanelI18nLanguage(windowLike) {
  try {
    var i18n = windowLike && windowLike.UII18N;
    return i18n && typeof i18n.getLanguage === "function" ? i18n.getLanguage() : "";
  } catch (_errI18n) {}
  return "";
}
function readStatsPanelStorageLanguage(windowLike) {
  try {
    var storage = windowLike && windowLike.localStorage ? windowLike.localStorage : null;
    return storage && typeof storage.getItem === "function" ? storage.getItem("ui_language_v1") : "";
  } catch (_errStorage) {}
  return "";
}
function readStatsPanelDocumentLanguage(documentLike) {
  try {
    var root = documentLike && documentLike.documentElement ? documentLike.documentElement : null;
    if (root && typeof root.getAttribute === "function") {
      return root.getAttribute("data-ui-lang") || root.getAttribute("lang");
    }
  } catch (_errDocument) {}
  return "";
}
function createStatsPanelLanguageSources(manager, documentLike) {
  var windowLike = resolveStatsPanelWindowLike(manager, documentLike);
  return {
    i18nLanguage: readStatsPanelI18nLanguage(windowLike),
    storageLanguage: readStatsPanelStorageLanguage(windowLike),
    documentLanguage: readStatsPanelDocumentLanguage(documentLike)
  };
}
function resolveStatsPanelLanguageFallback(sources) {
  return normalizeStatsPanelLanguage(sources.i18nLanguage) ||
    normalizeStatsPanelLanguage(sources.storageLanguage) ||
    normalizeStatsPanelLanguage(sources.documentLanguage) || "zh";
}
function resolveStatsPanelLanguage(manager, documentLike) {
  var sources = createStatsPanelLanguageSources(manager, documentLike);
  var runtime = resolveCoreStatsPanelCopyRuntime();
  if (runtime && typeof runtime.resolveStatsPanelLanguage === "function") {
    return runtime.resolveStatsPanelLanguage(sources);
  }
  return resolveStatsPanelLanguageFallback(sources);
}
function resolveStatsPanelCopyFallback(lang) {
  return Object.assign({}, lang === "en" ? STATS_PANEL_COPY_EN : STATS_PANEL_COPY_ZH);
}
function resolveStatsPanelCopy(lang) {
  var runtime = resolveCoreStatsPanelCopyRuntime();
  if (runtime && typeof runtime.resolveStatsPanelCopy === "function") {
    return runtime.resolveStatsPanelCopy(lang);
  }
  return resolveStatsPanelCopyFallback(lang);
}

function pushUniqueStatsPanelKeyPart(parts, value) {
  if (!(value && parts.indexOf(value) === -1)) return;
  parts.push(value);
}

function resolveStatsPanelVisibilityKeyParts(manager, documentLike, body) {
  var pathPart = normalizeStatsPanelVisibilityKeyPart(resolveStatsPanelPathName(documentLike).split("/").pop());
  var pagePart = normalizeStatsPanelVisibilityKeyPart(resolveStatsPanelBodyAttribute(body, "data-page"));
  var variantPart = normalizeStatsPanelVisibilityKeyPart(resolveStatsPanelBodyAttribute(body, "data-page-variant"));
  var modePart = normalizeStatsPanelVisibilityKeyPart(
    manager.modeKey || manager.mode || resolveStatsPanelBodyAttribute(body, "data-mode-id")
  );
  var parts = [];

  if (pathPart) parts.push(pathPart);
  else pushUniqueStatsPanelKeyPart(parts, pagePart);
  pushUniqueStatsPanelKeyPart(parts, variantPart);
  pushUniqueStatsPanelKeyPart(parts, modePart);

  return parts;
}

function resolveStatsPanelVisibilityKey(manager) {
  var baseKey = GameManager.STATS_PANEL_VISIBLE_KEY;
  if (!manager) return baseKey;

  var documentLike = resolveManagerDocumentLike(manager);
  var body = documentLike && documentLike.body ? documentLike.body : null;
  var parts = resolveStatsPanelVisibilityKeyParts(manager, documentLike, body);

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

function configureStatsPanelToggleButton(btn, lang) {
  if (!btn) return;
  var copy = resolveStatsPanelCopy(lang);
  btn.title = copy.button;
  btn.setAttribute("aria-label", copy.button);
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

function mountStatsPanelToggleBeforeExport(btn, topActionHost, exportBtn) {
  if (btn.parentNode !== topActionHost || btn.nextSibling !== exportBtn) {
    topActionHost.insertBefore(btn, exportBtn);
  }
}

function resolveRestartButtonInTopActionHost(topActionHost) {
  if (!(topActionHost && typeof topActionHost.querySelector === "function")) return null;
  return topActionHost.querySelector("#top-restart-btn") ||
    topActionHost.querySelector(".restart-button");
}

function mountStatsPanelToggleBeforeRestart(btn, topActionHost, restartBtn) {
  if (!restartBtn || restartBtn.parentNode !== topActionHost) return false;
  if (btn.parentNode === topActionHost && btn.nextSibling === restartBtn) return true;
  topActionHost.insertBefore(btn, restartBtn);
  return true;
}

function mountStatsPanelToggleAtTopActionStart(btn, topActionHost) {
  if (btn.parentNode !== topActionHost) {
    topActionHost.insertBefore(btn, topActionHost.firstChild);
  }
}

function mountStatsPanelToggleIntoTopActions(btn, topActionHost, exportBtn) {
  if (!topActionHost) return false;
  btn.classList.remove("is-floating");
  var restartBtn = resolveRestartButtonInTopActionHost(topActionHost);
  if (mountStatsPanelToggleBeforeRestart(btn, topActionHost, restartBtn)) {
    return true;
  }
  if (exportBtn && exportBtn.parentNode === topActionHost) {
    mountStatsPanelToggleBeforeExport(btn, topActionHost, exportBtn);
    return true;
  }
  mountStatsPanelToggleAtTopActionStart(btn, topActionHost);
  return true;
}

function mountStatsPanelToggleAsFloating(documentLike, btn) {
  var body = documentLike.body;
  if (!(body && typeof body.appendChild === "function")) return;
  if (btn.parentNode !== body) body.appendChild(btn);
  btn.classList.add("is-floating");
}

function mountStatsPanelToggleButton(documentLike, btn, topActionHost, exportBtn) {
  if (!documentLike || !btn) return;
  if (mountStatsPanelToggleIntoTopActions(btn, topActionHost, exportBtn)) return;
  mountStatsPanelToggleAsFloating(documentLike, btn);
}

function createStatsPanelOverlayHtml(lang) {
  var copy = resolveStatsPanelCopy(lang);
  return (
    "<div class='replay-modal-content stats-panel-content'>" +
    "<h3 id='stats-panel-title'>" + copy.title + "</h3>" +
    "<div class='stats-panel-row'><span id='stats-panel-total-label'>" + copy.totalSteps + "</span><span id='stats-panel-total'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-moves-label'>" + copy.moveSteps + "</span><span id='stats-panel-moves'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-undo-label'>" + copy.undoSteps + "</span><span id='stats-panel-undo'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-valid-inputs-label'>" + copy.validInputs + "</span><span id='stats-panel-valid-inputs'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-invalid-inputs-label'>" + copy.invalidInputs + "</span><span id='stats-panel-invalid-inputs'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-two-label'>" + copy.primarySpawns + "</span><span id='stats-panel-two'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-four-label'>" + copy.secondarySpawns + "</span><span id='stats-panel-four'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-four-rate-label'>" + copy.secondaryRate + "</span><span id='stats-panel-four-rate'>0.00</span></div>" +
    "<div class='replay-modal-actions'>" +
    "<button id='stats-panel-close' class='replay-button'>" + copy.close + "</button>" +
    "</div>" +
    "</div>"
  );
}

function appendStatsPanelOverlayToDocumentBody(documentLike, overlay) {
  if (!(documentLike && documentLike.body && typeof documentLike.body.appendChild === "function")) return;
  documentLike.body.appendChild(overlay);
}

function resolveOrCreateStatsPanelOverlay(manager, documentLike, lang) {
  if (!manager || !documentLike) return null;
  var overlay = resolveManagerElementById(manager, "stats-panel-overlay");
  if (overlay) return overlay;
  if (typeof documentLike.createElement !== "function") return null;
  overlay = documentLike.createElement("div");
  overlay.id = "stats-panel-overlay";
  overlay.className = "replay-modal-overlay";
  overlay.style.display = "none";
  overlay.innerHTML = createStatsPanelOverlayHtml(lang);
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
  var lang = resolveStatsPanelLanguage(manager, documentLike);
  var btn = resolveOrCreateStatsPanelToggleButton(manager, documentLike);
  configureStatsPanelToggleButton(btn, lang);
  var exportBtn = resolveManagerElementById(manager, "top-export-replay-btn");
  var practiceStatsActions = resolveManagerElementById(manager, "practice-stats-actions");
  var topActionHost = resolveStatsPanelTopActionHost(documentLike, exportBtn, practiceStatsActions);
  mountStatsPanelToggleButton(documentLike, btn, topActionHost, exportBtn);
  var overlay = resolveOrCreateStatsPanelOverlay(manager, documentLike, lang);
  bindStatsPanelUiEvents(manager, btn, overlay);
  var isOpen = resolveStatsPanelInitialOpenState(manager);
  applyStatsPanelOverlayDisplay(overlay, isOpen);
}
