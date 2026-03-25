// Replay onboarding guide has been removed intentionally.

function showReplayModal(title, content, actionName, actionCallback) {
  var modal = document.getElementById('replay-modal');
  var titleEl = document.getElementById('replay-modal-title');
  var textEl = document.getElementById('replay-textarea');
  var actionBtn = document.getElementById('replay-action-btn');

  if (!modal) return;

  modal.style.display = 'flex';
  titleEl.textContent = title;
  textEl.value = content;
  
  if (actionName) {
    actionBtn.style.display = 'inline-block';
    actionBtn.textContent = actionName;
    actionBtn.onclick = function() {
      actionCallback(textEl.value);
    };
  } else {
    actionBtn.style.display = 'none';
  }
}

window.closeReplayModal = function() {
  var modal = document.getElementById('replay-modal');
  if (modal) {
    modal.style.display = 'none';
  }
};

function importReplayFromTextModal() {
    showReplayModal("导入回放", "", "开始回放", function(text) {
      if (text && window.game_manager) {
          window.game_manager.import(text);
          window.closeReplayModal();
          updateReplayUI();
      }
    });
}

function readReplayFileAsArrayBuffer(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() {
            resolve(reader.result);
        };
        reader.onerror = function() {
            reject(reader.error || new Error("file_read_failed"));
        };
        reader.readAsArrayBuffer(file);
    });
}

function readReplayFileAsText(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() {
            resolve(typeof reader.result === "string" ? reader.result : "");
        };
        reader.onerror = function() {
            reject(reader.error || new Error("file_read_failed"));
        };
        reader.readAsText(file, "utf-8");
    });
}

function shouldUseBinaryReplayImport(file) {
    if (!file || typeof file.name !== "string") return false;
    return file.name.toLowerCase().endsWith(".rpl");
}

async function importReplayFromFile(file) {
    if (!file || !window.game_manager) return;
    var manager = window.game_manager;
    try {
        if (shouldUseBinaryReplayImport(file) && typeof manager.importV9RplBuffer === "function") {
            var buffer = await readReplayFileAsArrayBuffer(file);
            if (!manager.importV9RplBuffer(buffer)) return;
            updateReplayUI();
            return;
        }
        var replayText = await readReplayFileAsText(file);
        if (!replayText) throw new Error("empty_replay_file");
        manager.import(replayText);
        updateReplayUI();
    } catch (error) {
        alert("导入回放文件失败: " + (error && error.message ? error.message : "unknown"));
    }
}

// Replay Specific Functions
window.importReplay = function() {
    var input = document.createElement("input");
    var cleaned = false;
    function cleanupImportInput() {
        if (cleaned) return;
        cleaned = true;
        window.removeEventListener("focus", handlePickerClosed);
        if (input.parentNode) input.parentNode.removeChild(input);
    }
    function handlePickerClosed() {
        setTimeout(function() {
            var files = input.files;
            if (!files || files.length === 0) {
                cleanupImportInput();
            }
        }, 0);
    }
    input.type = "file";
    input.accept = ".rpl,.txt,.json,text/plain,application/octet-stream";
    input.style.display = "none";
    input.addEventListener("change", function() {
        var files = input.files;
        var file = files && files.length > 0 ? files[0] : null;
        if (file) {
            importReplayFromFile(file);
        } else {
            importReplayFromTextModal();
        }
        cleanupImportInput();
    });
    document.body.appendChild(input);
    window.addEventListener("focus", handlePickerClosed);
    input.click();
};

window.importReplayText = importReplayFromTextModal;

var isScrubbing = false;
var replayRelayoutTimer = null;
var replaySeekRafId = 0;
var replayPendingSeekValue = null;
var replayUiRefreshRafId = 0;
var replayUiTickTimer = 0;
var replayUiTickStarted = false;
var REPLAY_UI_ACTIVE_INTERVAL_MS = 220;
var REPLAY_UI_IDLE_INTERVAL_MS = 1000;
var REPLAY_UI_HIDDEN_INTERVAL_MS = 1800;
var CLOUD_REPLAY_STORAGE_KEY = "cloud_replay_payload_v1";

function resolveLocalStorage() {
    try {
        return window && window["localStorage"] ? window["localStorage"] : null;
    } catch (_error) {
        return null;
    }
}

function resolveSessionStorage() {
    try {
        return window && window["sessionStorage"] ? window["sessionStorage"] : null;
    } catch (_error) {
        return null;
    }
}

function readLocalStorageItem(key) {
    try {
        var storage = resolveLocalStorage();
        return storage ? storage.getItem(key) : null;
    } catch (_error) {
        return null;
    }
}

function readSessionStorageItem(key) {
    try {
        var storage = resolveSessionStorage();
        return storage ? storage.getItem(key) : null;
    } catch (_error) {
        return null;
    }
}

function removeSessionStorageItem(key) {
    try {
        var storage = resolveSessionStorage();
        if (!storage) return;
        storage.removeItem(key);
    } catch (_error) {}
}

function safeReplayText(value) {
    return value == null ? "" : String(value).trim();
}

function readReplayModeCodeFromV4Payload(payloadText) {
    var text = safeReplayText(payloadText);
    var prefix = String((window.GameManager && window.GameManager.REPLAY_V4_PREFIX) || "REPLAY_v4C_");
    if (!text || text.indexOf(prefix) !== 0 || text.length <= prefix.length) return "";
    return text.charAt(prefix.length);
}

function resolveReplayModeKeyFromV4Code(modeCode) {
    var map = (window.GameManager && window.GameManager.REPLAY_V4_MODE_CODE_TO_KEY) || {};
    var code = safeReplayText(modeCode);
    return code && map && map[code] ? String(map[code]) : "";
}

function isV4ReplayPayload(payloadText) {
    return !!readReplayModeCodeFromV4Payload(payloadText);
}

function isV4CompatibleReplayAction(action) {
    if (action === -1) return true;
    if (typeof action === "number") {
        return Number.isInteger(action) && action >= 0 && action <= 3;
    }
    if (!Array.isArray(action) || !action.length) return false;
    var kind = String(action[0]);
    if (kind === "u") return true;
    if (kind === "m") {
        var dir = Number(action[1]);
        return Number.isInteger(dir) && dir >= 0 && dir <= 3;
    }
    if (kind === "p") return true;
    return false;
}

function shouldPreferStructuredReplay(recordLike) {
    var source = recordLike && typeof recordLike === "object" ? recordLike : {};
    var replayObject = source.replay && typeof source.replay === "object" ? source.replay : null;
    if (!replayObject) return false;
    var replayString = safeReplayText(source.replay_string);
    if (!replayString) return true;
    if (!isV4ReplayPayload(replayString)) return false;
    var v4ModeKey = resolveReplayModeKeyFromV4Code(readReplayModeCodeFromV4Payload(replayString));
    var recordModeKey = safeReplayText(source.mode_key || replayObject.mode_key);
    if (recordModeKey && v4ModeKey && recordModeKey !== v4ModeKey) return true;
    var actions = Array.isArray(replayObject.actions) ? replayObject.actions : [];
    for (var i = 0; i < actions.length; i += 1) {
        if (!isV4CompatibleReplayAction(actions[i])) return true;
    }
    return false;
}

function resolveReplayPayloadForImport(recordLike) {
    var source = recordLike && typeof recordLike === "object" ? recordLike : {};
    var replayString = safeReplayText(source.replay_string);
    var replayObject = source.replay && typeof source.replay === "object" ? source.replay : null;
    if (shouldPreferStructuredReplay(source) && replayObject) {
        try { return JSON.stringify(replayObject); } catch (_err) {}
    }
    if (replayString) return replayString;
    if (replayObject) {
        try { return JSON.stringify(replayObject); } catch (_err2) { return ""; }
    }
    return "";
}

function cancelReplayPendingRelayout() {
    if (!replayRelayoutTimer) return;
    clearTimeout(replayRelayoutTimer);
    replayRelayoutTimer = null;
}

function flushReplayUiRefresh() {
    replayUiRefreshRafId = 0;
    updateReplayUI();
}

function scheduleReplayUiRefresh() {
    if (replayUiRefreshRafId) return;
    replayUiRefreshRafId = window.requestAnimationFrame(flushReplayUiRefresh);
}

function replayUiPauseReplay() {
    if(window.game_manager && window.game_manager.pause) {
        window.game_manager.pause();
    }
    scheduleReplayUiRefresh();
    scheduleReplayUiTick(true);
}

function replayUiToggleReplayPause() {
    if(window.game_manager) {
        if(window.game_manager.isPaused) window.game_manager.resume();
        else window.game_manager.pause();
        scheduleReplayUiRefresh();
        scheduleReplayUiTick(true);
    }
}

function replayUiStepReplay(delta) {
    if(window.game_manager) {
        cancelReplayPendingRelayout();
        window.game_manager.step(delta);
        scheduleReplayUiRefresh();
        scheduleReplayUiTick(true);
    }
}

function replayUiSetReplaySpeed(val) {
    var multiplier = Number(val);
    if (!Number.isFinite(multiplier) || multiplier <= 0) return;
    if(window.game_manager && window.game_manager.setSpeed) {
        window.game_manager.setSpeed(multiplier);
    }
    scheduleReplayUiTick(true);
}

function resolveReplaySeekIndexFromPercent(value) {
    var numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return null;
    if (numericValue < 0) numericValue = 0;
    if (numericValue > 100) numericValue = 100;
    var gameManager = window.game_manager;
    var total = gameManager && gameManager.replayMoves ? gameManager.replayMoves.length : 0;
    return Math.floor((numericValue / 100) * total);
}

function flushReplayUiSeek() {
    replaySeekRafId = 0;
    var nextValue = replayPendingSeekValue;
    replayPendingSeekValue = null;
    if (!window.game_manager) return;
    var index = resolveReplaySeekIndexFromPercent(nextValue);
    if (index === null) return;
    cancelReplayPendingRelayout();
    window.game_manager.seek(index);
    scheduleReplayUiRefresh();
    scheduleReplayUiTick(true);
}

function replayUiSeekReplay(value) {
    replayPendingSeekValue = value;
    if (replaySeekRafId) return;
    replaySeekRafId = window.requestAnimationFrame(flushReplayUiSeek);
}

function handleReplayScrubStart() {
    isScrubbing = true;
    var gameManager = window.game_manager;
    if (gameManager && !gameManager.isPaused && gameManager.pause) {
        gameManager.pause();
    }
    scheduleReplayUiTick(true);
}

function handleReplayScrubEnd() {
    isScrubbing = false;
    scheduleReplayUiRefresh();
    scheduleReplayUiTick(true);
}

window.toggleReplayPause = replayUiToggleReplayPause;
window.pauseReplay = replayUiPauseReplay;
window.stepReplay = replayUiStepReplay;
window.setReplaySpeed = replayUiSetReplaySpeed;
window.seekReplay = replayUiSeekReplay;
window.replayUiPauseReplay = replayUiPauseReplay;
window.replayUiStepReplay = replayUiStepReplay;
window.replayUiSetReplaySpeed = replayUiSetReplaySpeed;
window.replayUiSeekReplay = replayUiSeekReplay;

function updateReplayUI() {
    var game_manager = window.game_manager;
    if(!game_manager) return;
    
    var btn = document.getElementById('replay-pause-btn');
    if(btn) {
        var lang = "zh";
        try {
            if (window.UII18N && typeof window.UII18N.getLanguage === "function") {
                var uiLang = String(window.UII18N.getLanguage() || "").toLowerCase();
                if (uiLang.indexOf("en") === 0) lang = "en";
            } else {
                var storedLang = String(readLocalStorageItem("ui_language_v1") || "").toLowerCase();
                if (storedLang.indexOf("en") === 0) lang = "en";
            }
        } catch (_err) {}
        var nextText;
        if (game_manager.isPaused) {
            nextText = lang === "en" ? "▶ Play" : "▶ 播放";
        } else {
            nextText = lang === "en" ? "⏯ Pause" : "⏯ 暂停";
        }
        if (btn.textContent !== nextText) {
            btn.textContent = nextText;
        }
    }
    
    var progress = document.getElementById('replay-progress');
    if(progress && game_manager.replayMoves && !isScrubbing) {
        var total = game_manager.replayMoves.length;
        var current = game_manager.replayIndex;
        var percent = total > 0 ? (current / total) * 100 : 0;
        progress.value = percent;
    }
}

function resolveReplayUiTickIntervalMs() {
    if (document.hidden) return REPLAY_UI_HIDDEN_INTERVAL_MS;
    var manager = window.game_manager;
    if (!manager || manager.isPaused || isScrubbing) return REPLAY_UI_IDLE_INTERVAL_MS;
    return REPLAY_UI_ACTIVE_INTERVAL_MS;
}

function clearReplayUiTickTimer() {
    if (!replayUiTickTimer) return;
    clearTimeout(replayUiTickTimer);
    replayUiTickTimer = 0;
}

function scheduleReplayUiTick(immediate) {
    clearReplayUiTickTimer();
    replayUiTickTimer = setTimeout(runReplayUiTick, immediate ? 0 : resolveReplayUiTickIntervalMs());
}

function runReplayUiTick() {
    replayUiTickTimer = 0;
    updateReplayUI();
    scheduleReplayUiTick(false);
}

function startReplayUiTicker() {
    if (replayUiTickStarted) return;
    replayUiTickStarted = true;
    document.addEventListener("visibilitychange", function () {
        scheduleReplayUiTick(true);
    });
    window.addEventListener("focus", function () {
        scheduleReplayUiTick(true);
    });
    scheduleReplayUiTick(true);
}

function requestReplayRelayout() {
    cancelReplayPendingRelayout();
    replayRelayoutTimer = setTimeout(function () {
        replayRelayoutTimer = null;
        var gm = window.game_manager;
        if (!gm) return;
        if (gm.actuator && typeof gm.actuator.invalidateLayoutCache === "function") {
            gm.actuator.invalidateLayoutCache();
        }
        if (typeof gm.clearTransientTileVisualState === "function") {
            gm.clearTransientTileVisualState();
        }
        if (typeof gm.actuate === "function") {
            gm.actuate();
        }
    }, 120);
}

function resolveReplayDiagnosticsElement(id) {
    return document.getElementById(id);
}

function clearReplayDiagnosticsPanel() {
    var panel = resolveReplayDiagnosticsElement("replay-diagnostics-panel");
    var summary = resolveReplayDiagnosticsElement("replay-diagnostics-summary");
    var samples = resolveReplayDiagnosticsElement("replay-diagnostics-samples");
    if (summary) summary.textContent = "";
    if (samples) samples.textContent = "";
    if (panel) panel.style.display = "none";
}

function normalizeReplayDiagnosticsEntry(rawEntry) {
    if (!(rawEntry && typeof rawEntry === "object" && !Array.isArray(rawEntry))) return null;
    var key = typeof rawEntry.key === "string" ? rawEntry.key : "";
    var schemaVersion = Number(rawEntry.schemaVersion);
    var payload = rawEntry.payload;
    if (!key) return null;
    if (!Number.isInteger(schemaVersion) || schemaVersion < 1) return null;
    if (!(payload && typeof payload === "object" && !Array.isArray(payload))) return null;
    return {
        key: key,
        schemaVersion: schemaVersion,
        payload: payload
    };
}

function resolveReplaySecondaryPlacementDiagnosticsEntry(record) {
    var entries = Array.isArray(record && record.diagnostics_index_entries)
        ? record.diagnostics_index_entries
        : [];
    for (var i = 0; i < entries.length; i++) {
        var entry = normalizeReplayDiagnosticsEntry(entries[i]);
        if (!(entry && entry.key === "secondaryTimerPlacement")) continue;
        return entry;
    }
    return null;
}

function resolveReplayDiagnosticsNumber(payload, field) {
    if (!payload || typeof payload !== "object") return 0;
    return Number(payload[field]) || 0;
}

function buildReplayDiagnosticsSummaryText(entry) {
    var payload = entry ? entry.payload : null;
    return "诊断 secondaryTimerPlacement(v" + String(entry.schemaVersion) + ")" +
        " · 有效 " + String(resolveReplayDiagnosticsNumber(payload, "validPlacementDescriptors")) +
        " · 放置 " + String(resolveReplayDiagnosticsNumber(payload, "placed")) +
        " · 去重跳过 " + String(resolveReplayDiagnosticsNumber(payload, "skippedDuplicate")) +
        " · 锚点缺失 " + String(resolveReplayDiagnosticsNumber(payload, "skippedMissingAnchor")) +
        " · 去重键类 " + String(resolveReplayDiagnosticsNumber(payload, "dedupeKeyKinds"));
}

function buildReplayDiagnosticsSampleText(entry) {
    var payload = entry ? entry.payload : null;
    var source = payload && Array.isArray(payload.dedupeKeySamples)
        ? payload.dedupeKeySamples
        : [];
    var samples = [];
    for (var i = 0; i < source.length; i++) {
        var sample = typeof source[i] === "string" ? source[i].trim() : "";
        if (!sample) continue;
        samples.push(sample);
        if (samples.length >= 3) break;
    }
    if (!samples.length) return "";
    return "样本: " + samples.join(" | ");
}

function renderReplayDiagnosticsPanelFromRecord(record) {
    var panel = resolveReplayDiagnosticsElement("replay-diagnostics-panel");
    var summary = resolveReplayDiagnosticsElement("replay-diagnostics-summary");
    var samples = resolveReplayDiagnosticsElement("replay-diagnostics-samples");
    if (!(panel && summary && samples)) return;
    var entry = resolveReplaySecondaryPlacementDiagnosticsEntry(record);
    if (!entry) {
        clearReplayDiagnosticsPanel();
        return;
    }
    summary.textContent = buildReplayDiagnosticsSummaryText(entry);
    samples.textContent = buildReplayDiagnosticsSampleText(entry);
    panel.style.display = "block";
}

async function loadReplayFromSessionId() {
    var params = new URLSearchParams(window.location.search);
    var cloudReplay = params.get("cloud_replay");
    var localHistoryId = params.get("local_history_id");
    if (!localHistoryId) {
        localHistoryId = params.get("id");
    }
    var sessionId = params.get("session_id");
    if (!cloudReplay && !localHistoryId && !sessionId) {
        clearReplayDiagnosticsPanel();
        return;
    }
    if (!window.game_manager) {
        setTimeout(loadReplayFromSessionId, 60);
        return;
    }

    if (cloudReplay === "1") {
        try {
            var cloudReplayPayloadRaw = String(readSessionStorageItem(CLOUD_REPLAY_STORAGE_KEY) || "");
            if (!cloudReplayPayloadRaw) throw new Error("cloud_replay_payload_missing");
            var cloudReplayPayload = JSON.parse(cloudReplayPayloadRaw);
            var replayPayload = resolveReplayPayloadForImport(cloudReplayPayload);
            if (!replayPayload) throw new Error("cloud_replay_missing");
            window.game_manager.import(replayPayload);
            var titleCloud = document.querySelector(".heading .title");
            if (titleCloud) {
      titleCloud.innerHTML = "<a href='2048.html' style='text-decoration: none; color: inherit; cursor: pointer;'>2048</a> 回放 - 云端记录";
            }
            removeSessionStorageItem(CLOUD_REPLAY_STORAGE_KEY);
            clearReplayDiagnosticsPanel();
            updateReplayUI();
        } catch (cloudReplayError) {
            clearReplayDiagnosticsPanel();
            alert("加载云端回放失败: " + (cloudReplayError.message || "unknown"));
        }
        return;
    }

    if (localHistoryId) {
        try {
            if (!window.LocalHistoryStore || typeof window.LocalHistoryStore.getById !== "function") {
                throw new Error("local_history_store_missing");
            }
            var record = await window.LocalHistoryStore.getById(localHistoryId);
            if (!record) throw new Error("record_not_found");

            var replayPayload = resolveReplayPayloadForImport(record);
            if (!replayPayload) throw new Error("replay_missing");

            window.game_manager.import(replayPayload);
            var titleLocal = document.querySelector(".heading .title");
            if (titleLocal) {
      titleLocal.innerHTML = "<a href='2048.html' style='text-decoration: none; color: inherit; cursor: pointer;'>2048</a> 回放 - 本地记录";
            }
            renderReplayDiagnosticsPanelFromRecord(record);
            updateReplayUI();
        } catch (errorLocal) {
            clearReplayDiagnosticsPanel();
            alert("加载本地回放失败: " + (errorLocal.message || "unknown"));
        }
        return;
    }

    if (sessionId) {
        clearReplayDiagnosticsPanel();
        alert("在线回放已移除。请从本地历史页面打开回放。");
    }
}

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    startReplayUiTicker();
    clearReplayDiagnosticsPanel();
    // Scrubbing events
    var progressEl = document.getElementById('replay-progress');
    if(progressEl) {
        progressEl.addEventListener('pointerdown', handleReplayScrubStart);
        progressEl.addEventListener('pointerup', handleReplayScrubEnd);
        progressEl.addEventListener('pointercancel', handleReplayScrubEnd);
        progressEl.addEventListener('mousedown', handleReplayScrubStart);
        progressEl.addEventListener('mouseup', handleReplayScrubEnd);
        progressEl.addEventListener('touchstart', handleReplayScrubStart);
        progressEl.addEventListener('touchend', handleReplayScrubEnd);
        progressEl.addEventListener('change', handleReplayScrubEnd);
        progressEl.addEventListener('input', function() { replayUiSeekReplay(this.value); });
    }

    var btnRewind10 = document.getElementById('btn-rewind-10');
    if(btnRewind10) btnRewind10.addEventListener('click', function() { replayUiStepReplay(-10); });

    var btnRewind1 = document.getElementById('btn-rewind-1');
    if(btnRewind1) btnRewind1.addEventListener('click', function() { replayUiStepReplay(-1); });

    var btnPause = document.getElementById('replay-pause-btn');
    if(btnPause) btnPause.addEventListener('click', replayUiToggleReplayPause);

    var btnForward1 = document.getElementById('btn-forward-1');
    if(btnForward1) btnForward1.addEventListener('click', function() { replayUiStepReplay(1); });

    var btnForward10 = document.getElementById('btn-forward-10');
    if(btnForward10) btnForward10.addEventListener('click', function() { replayUiStepReplay(10); });
    
    var speedSelect = document.getElementById('replay-speed');
    if(speedSelect) speedSelect.addEventListener('change', function() { replayUiSetReplaySpeed(this.value); });
    
    var importFileBtn = document.getElementById('import-replay-file-btn') || document.querySelector('.import-replay-button');
    if(importFileBtn) importFileBtn.addEventListener('click', importReplay);

    var importTextBtn = document.getElementById('import-replay-text-btn');
    if(importTextBtn) importTextBtn.addEventListener('click', importReplayFromTextModal);
    
    var modalActionBtn = document.getElementById('replay-action-btn');
    // This is handled in showReplayModal but we can also bind closing there.
    
    var modalCloseBtn = document.querySelector('#replay-modal .replay-modal-actions button:last-child');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeReplayModal);

    loadReplayFromSessionId();

    if (!window.__replayRelayoutBound) {
        window.__replayRelayoutBound = true;
        window.addEventListener("resize", requestReplayRelayout);
        window.addEventListener("orientationchange", requestReplayRelayout);
    }
    requestReplayRelayout();
});
