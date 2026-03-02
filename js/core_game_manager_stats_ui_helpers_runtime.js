function writeStatsPanelVisibilityFlag(manager, isOpen) {
  if (!manager) return false;
  return resolveCoreStorageBooleanCallOrFallback(
    manager,
    "writeStorageFlagFromContext",
    {
      key: GameManager.STATS_PANEL_VISIBLE_KEY,
      enabled: !!isOpen,
      trueValue: "1",
      falseValue: "0"
    },
    function () {
    var storage = manager.getWebStorageByName("localStorage");
    if (!canWriteToStorage(storage)) return false;
    try {
      storage.setItem(GameManager.STATS_PANEL_VISIBLE_KEY, isOpen ? "1" : "0");
      return true;
    } catch (_err) {
      return false;
    }
  });
}

function resolveStatsUiDocumentLike(manager) {
  return resolveManagerDocumentLike(manager);
}

function resolveStatsUiElementById(manager, elementId) {
  return resolveManagerElementById(manager, elementId);
}

function ensureCornerStatsElement(manager, elementId) {
  var documentLike = resolveStatsUiDocumentLike(manager);
  if (!documentLike) return null;
  var element = resolveStatsUiElementById(manager, elementId);
  if (element) return element;
  if (typeof documentLike.createElement !== "function") return null;
  element = documentLike.createElement("div");
  element.id = elementId;
  if (documentLike.body && typeof documentLike.body.appendChild === "function") {
    documentLike.body.appendChild(element);
  }
  return element;
}

function applyBaseCornerStatsElementStyle(element) {
  if (!element) return;
  element.style.position = "fixed";
  element.style.top = "8px";
  element.style.zIndex = "1000";
  element.style.background = "transparent";
  element.style.color = "#776e65";
  element.style.fontWeight = "bold";
  element.style.fontSize = "27px";
  element.style.pointerEvents = "none";
}

function initCornerStatsUi(manager) {
  if (!manager) return;
  var rateEl = resolveStatsUiElementById(manager, "stats-4-rate");
  var ipsEl = resolveStatsUiElementById(manager, "stats-ips");

  if (rateEl) {
    rateEl.style.visibility = "hidden"; // Preserve layout while moving display to page corner
    manager.cornerRateEl = ensureCornerStatsElement(manager, "corner-stats-4-rate");
    applyBaseCornerStatsElementStyle(manager.cornerRateEl);
    manager.cornerRateEl.style.left = "10px";
    manager.cornerRateEl.textContent = "0.00";
  }
  if (ipsEl) {
    ipsEl.style.visibility = "hidden"; // Preserve layout while moving display to page corner
    manager.cornerIpsEl = ensureCornerStatsElement(manager, "corner-stats-ips");
    applyBaseCornerStatsElementStyle(manager.cornerIpsEl);
    manager.cornerIpsEl.style.right = "10px";
    manager.cornerIpsEl.textContent = "IPS: 0";
  }
}

function ensureStatsPanelToggleButtonElement(manager) {
  var documentLike = resolveStatsUiDocumentLike(manager);
  if (!documentLike) return null;
  var btn = resolveStatsUiElementById(manager, "stats-panel-toggle");
  if (!btn) {
    if (typeof documentLike.createElement !== "function") return null;
    btn = documentLike.createElement("a");
    btn.id = "stats-panel-toggle";
  }
  btn.title = "统计";
  btn.setAttribute("aria-label", "统计");
  if (!btn.querySelector("svg")) {
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>';
  }
  btn.className = "top-action-btn stats-panel-toggle";
  return btn;
}

function resolveStatsPanelToggleHostElements(manager) {
  var documentLike = resolveStatsUiDocumentLike(manager);
  if (!documentLike) {
    return {
      exportBtn: null,
      topActionHost: null
    };
  }
  var exportBtn = resolveStatsUiElementById(manager, "top-export-replay-btn");
  var practiceStatsActions = resolveStatsUiElementById(manager, "practice-stats-actions");
  var topActionHost = practiceStatsActions ||
    (exportBtn && exportBtn.parentNode) ||
    (typeof documentLike.querySelector === "function" && documentLike.querySelector(".heading .top-action-buttons")) ||
    (typeof documentLike.querySelector === "function" && documentLike.querySelector(".top-action-buttons"));
  return {
    exportBtn: exportBtn,
    topActionHost: topActionHost
  };
}

function mountStatsPanelToggleButton(manager, btn, hostElements) {
  if (!btn) return;
  var documentLike = resolveStatsUiDocumentLike(manager);
  var body = documentLike && documentLike.body ? documentLike.body : null;
  var hostState = hostElements && typeof hostElements === "object" ? hostElements : {};
  var topActionHost = hostState.topActionHost || null;
  var exportBtn = hostState.exportBtn || null;
  if (topActionHost) {
    btn.classList.remove("is-floating");
    if (exportBtn && exportBtn.parentNode === topActionHost) {
      if (btn.parentNode !== topActionHost || btn.nextSibling !== exportBtn) {
        topActionHost.insertBefore(btn, exportBtn);
      }
    } else if (btn.parentNode !== topActionHost) {
      topActionHost.insertBefore(btn, topActionHost.firstChild);
    }
    return;
  }
  if (!body || typeof body.appendChild !== "function") return;
  if (btn.parentNode !== body) {
    body.appendChild(btn);
  }
  btn.classList.add("is-floating");
}

function ensureStatsPanelOverlayElement(manager) {
  var documentLike = resolveStatsUiDocumentLike(manager);
  if (!documentLike) return null;
  var overlay = resolveStatsUiElementById(manager, "stats-panel-overlay");
  if (overlay) return overlay;
  if (typeof documentLike.createElement !== "function") return null;
  overlay = documentLike.createElement("div");
  overlay.id = "stats-panel-overlay";
  overlay.className = "replay-modal-overlay";
  overlay.style.display = "none";
  overlay.innerHTML =
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
    "</div>";
  if (documentLike.body && typeof documentLike.body.appendChild === "function") {
    documentLike.body.appendChild(overlay);
  }
  return overlay;
}

function bindStatsPanelToggleButton(btn, manager) {
  if (!btn || !manager) return;
  if (btn.__statsBound) return;
  btn.__statsBound = true;
  btn.addEventListener("click", function (event) {
    event.preventDefault();
    manager.openStatsPanel();
  });
}

function bindStatsPanelCloseButton(manager) {
  if (!manager) return;
  var closeBtn = resolveStatsUiElementById(manager, "stats-panel-close");
  if (!closeBtn || closeBtn.__statsBound) return;
  closeBtn.__statsBound = true;
  closeBtn.addEventListener("click", function () {
    manager.closeStatsPanel();
  });
}

function bindStatsPanelOverlayDismiss(overlay, manager) {
  if (!overlay || !manager) return;
  if (overlay.__statsBound) return;
  overlay.__statsBound = true;
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) manager.closeStatsPanel();
  });
}

function resolveStatsPanelInitialOpenFlag(manager) {
  if (!manager) return false;
  return resolveCoreStorageBooleanCallOrFallback(
    manager,
    "readStorageFlagFromContext",
    {
      key: GameManager.STATS_PANEL_VISIBLE_KEY,
      trueValue: "1"
    },
    function () {
    var storage = manager.getWebStorageByName("localStorage");
    if (!canReadFromStorage(storage)) return false;
    try {
      return storage.getItem(GameManager.STATS_PANEL_VISIBLE_KEY) === "1";
    } catch (_err) {
      return false;
    }
  });
}

function applyStatsPanelInitialVisibility(overlay, isOpen) {
  if (!overlay) return;
  overlay.style.display = isOpen ? "flex" : "none";
}

function initStatsPanelUi(manager) {
  if (!manager) return;
  var documentLike = resolveStatsUiDocumentLike(manager);
  if (!documentLike || !documentLike.body) return;
  var btn = ensureStatsPanelToggleButtonElement(manager);
  var hostElements = resolveStatsPanelToggleHostElements(manager);
  mountStatsPanelToggleButton(manager, btn, hostElements);
  var overlay = ensureStatsPanelOverlayElement(manager);
  bindStatsPanelToggleButton(btn, manager);
  bindStatsPanelCloseButton(manager);
  bindStatsPanelOverlayDismiss(overlay, manager);
  var isOpen = resolveStatsPanelInitialOpenFlag(manager);
  applyStatsPanelInitialVisibility(overlay, isOpen);
}
