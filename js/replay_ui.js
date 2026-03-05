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
}

function replayUiToggleReplayPause() {
    if(window.game_manager) {
        if(window.game_manager.isPaused) window.game_manager.resume();
        else window.game_manager.pause();
        scheduleReplayUiRefresh();
    }
}

function replayUiStepReplay(delta) {
    if(window.game_manager) {
        cancelReplayPendingRelayout();
        window.game_manager.step(delta);
        scheduleReplayUiRefresh();
    }
}

function replayUiSetReplaySpeed(val) {
    var multiplier = Number(val);
    if (!Number.isFinite(multiplier) || multiplier <= 0) return;
    if(window.game_manager && window.game_manager.setSpeed) {
        window.game_manager.setSpeed(multiplier);
    }
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
}

function handleReplayScrubEnd() {
    isScrubbing = false;
    scheduleReplayUiRefresh();
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
        btn.textContent = game_manager.isPaused ? "▶ 播放" : "⏯ 暂停";
    }
    
    var progress = document.getElementById('replay-progress');
    if(progress && game_manager.replayMoves && !isScrubbing) {
        var total = game_manager.replayMoves.length;
        var current = game_manager.replayIndex;
        var percent = total > 0 ? (current / total) * 100 : 0;
        progress.value = percent;
    }
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

async function loadReplayFromSessionId() {
    var params = new URLSearchParams(window.location.search);
    var localHistoryId = params.get("local_history_id");
    if (!localHistoryId) {
        localHistoryId = params.get("id");
    }
    var sessionId = params.get("session_id");
    if (!localHistoryId && !sessionId) return;
    if (!window.game_manager) {
        setTimeout(loadReplayFromSessionId, 60);
        return;
    }

    if (localHistoryId) {
        try {
            if (!window.LocalHistoryStore || typeof window.LocalHistoryStore.getById !== "function") {
                throw new Error("local_history_store_missing");
            }
            var record = window.LocalHistoryStore.getById(localHistoryId);
            if (!record) throw new Error("record_not_found");

            var replayPayload = record.replay_string
              ? record.replay_string
              : (record.replay ? JSON.stringify(record.replay) : "");
            if (!replayPayload) throw new Error("replay_missing");

            window.game_manager.import(replayPayload);
            var titleLocal = document.querySelector(".heading .title");
            if (titleLocal) {
                titleLocal.innerHTML = "<a href='index.html' style='text-decoration: none; color: inherit; cursor: pointer;'>2048</a> 回放 - 本地记录";
            }
            updateReplayUI();
        } catch (errorLocal) {
            alert("加载本地回放失败: " + (errorLocal.message || "unknown"));
        }
        return;
    }

    if (sessionId) {
        alert("在线回放已移除。请从本地历史页面打开回放。");
    }
}

// Periodic UI update
setInterval(updateReplayUI, 200);

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', function() {
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
