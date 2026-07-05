function KeyboardInputManager() {
  this.events = {};

  this.listen();
}

KeyboardInputManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

KeyboardInputManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

KeyboardInputManager.prototype.listen = function () {
  var self = this;

  var map = {
    38: 0, // Up
    39: 1, // Right
    40: 2, // Down
    37: 3, // Left
    75: 0, // vim keybindings
    76: 1,
    74: 2,
    72: 3,
    87: 0, // W
    68: 1, // D
    83: 2, // S
    65: 3, // A
    69: 4, // E (up-right)
    67: 5, // C (down-right)
    81: 7, // Q (up-left)
    105: 4, // Numpad 9
    99: 5, // Numpad 3
    97: 6, // Numpad 1
    103: 7, // Numpad 7
    85:-1, // U (undo)
    89:-2, // Y (redo undo, practice page only)
    8:-1,  // Backspace (undo)
  };
  var itemMap = {
    49: "hammer", // 1
    50: "freeze", // 2
    51: "boost4"  // 3
  };

  function isDiagonalModeEnabled() {
    var body = document.body;
    var modeId = body && body.getAttribute ? body.getAttribute("data-mode-id") : "";
    if (typeof modeId === "string" && modeId.indexOf("diag_") === 0) return true;

    var manager = typeof window !== "undefined" ? window.game_manager : null;
    if (!manager) return false;
    if (typeof manager.isDirectionAllowed === "function") {
      return !!(manager.isDirectionAllowed(4) && manager.isDirectionAllowed(7));
    }
    if (Array.isArray(manager.allowedDirections)) {
      return manager.allowedDirections.indexOf(4) !== -1 &&
        manager.allowedDirections.indexOf(7) !== -1;
    }
    var rules = manager.modeConfig && manager.modeConfig.special_rules;
    if (!rules) return false;
    if (rules.allow_diagonal_moves === true) return true;
    if (Array.isArray(rules.movement_directions)) {
      return rules.movement_directions.indexOf(4) !== -1 &&
        rules.movement_directions.indexOf(7) !== -1;
    }
    return false;
  }

  function isCompactViewport() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return !!window.matchMedia("(max-width: 980px)").matches;
  }

  function isMobileTouchDevice() {
    if (typeof window === "undefined") return false;
    if ("ontouchstart" in window) return true;
    if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) return true;
    if (typeof window.matchMedia === "function") {
      return !!window.matchMedia("(pointer: coarse)").matches;
    }
    return isCompactViewport();
  }

  function isZhLocale() {
    var htmlLang = document.documentElement && document.documentElement.lang;
    if (typeof htmlLang === "string" && htmlLang.toLowerCase().indexOf("zh") === 0) {
      return true;
    }
    var i18n = typeof window !== "undefined" ? window.UII18N : null;
    if (i18n && typeof i18n.getLanguage === "function") {
      return i18n.getLanguage() === "zh";
    }
    return false;
  }

  function isEditableTarget(target) {
    if (!target) return false;
    var el = target.nodeType === 1 ? target : target.parentElement;
    if (!el) return false;
    if (el.isContentEditable) return true;
    if (el.closest) {
      var editable = el.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']");
      if (editable) return true;
    }
    var tag = String(el.tagName || "").toUpperCase();
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  function isPracticeCodeModalOpen() {
    return !!(
      document &&
      document.body &&
      document.body.classList &&
      document.body.classList.contains("practice-board-code-open")
    );
  }

  document.addEventListener("keydown", function (event) {
    if (isEditableTarget(event.target) || isPracticeCodeModalOpen()) {
      return;
    }

    var systemModifiers = event.altKey || event.ctrlKey || event.metaKey;
    var isRedoKey =
      event.which === 89 ||
      event.code === "KeyY" ||
      event.key === "y" ||
      event.key === "Y";
    if (!systemModifiers && isRedoKey) {
      event.preventDefault();
      self.emit("move", -2);
      return;
    }

    var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                    event.shiftKey;
    var mapped    = map[event.which];

    if (!modifiers) {
      if (event.which === 90) {
        var useDiagonalZ = isDiagonalModeEnabled();
        event.preventDefault();
        self.emit("move", useDiagonalZ ? 6 : -1);
        return;
      }
      if (mapped !== undefined) {
        event.preventDefault();
        self.emit("move", mapped);
      }
      var mappedItem = itemMap[event.which];
      if (mappedItem !== undefined) {
        event.preventDefault();
        self.emit("item", mappedItem);
      }

      if (event.which === 32) self.restart.bind(self)(event);
      if (event.key === 'r' || event.key === 'R' || event.code === 'KeyR' || event.which === 82) self.restart.bind(self)(event);
    }
  });

  var retry = document.querySelector(".retry-button");
  retry.addEventListener("click", this.restart.bind(this));
  retry.addEventListener("touchend", this.restart.bind(this));

  var restart = document.querySelector(".restart-button");
  if (restart) {
    restart.addEventListener("click", this.restart.bind(this));
    restart.addEventListener("touchend", this.restart.bind(this));
  }

  var keepPlaying = document.querySelector(".keep-playing-button");
  keepPlaying.addEventListener("click", this.keepPlaying.bind(this));
  keepPlaying.addEventListener("touchend", this.keepPlaying.bind(this));

  // Listen to swipe events
  var touchStartClientX, touchStartClientY;
  var touchStartPointerId = null;
  var diagonalAssistActive = false;
  var diagonalAssistTouchId = null;
  var gameContainer = document.getElementsByClassName("game-container")[0];
  var diagonalAssistButton = null;
  var TOUCH_THRESHOLD_STORAGE_KEY = "touch_swipe_threshold_px_v1";

  function resolveTouchMoveThreshold() {
    var fallback = 10;
    try {
      var value = window.localStorage && window.localStorage.getItem(TOUCH_THRESHOLD_STORAGE_KEY);
      if (value == null || value === "") return fallback;
      var threshold = Number(value);
      if (!Number.isFinite(threshold)) return fallback;
      return Math.min(28, Math.max(4, Math.round(threshold)));
    } catch (_err) {
      return fallback;
    }
  }

  function setDiagonalAssistActive(active) {
    var nextActive = !!active && isDiagonalModeEnabled();
    diagonalAssistActive = nextActive;
    if (!nextActive) {
      diagonalAssistTouchId = null;
    }
    if (diagonalAssistButton) {
      diagonalAssistButton.classList.toggle("is-active", nextActive);
      diagonalAssistButton.setAttribute("aria-pressed", nextActive ? "true" : "false");
    }
  }

  function resolveDiagonalDirectionByDelta(dx, dy, threshold) {
    var absDx = Math.abs(dx);
    var absDy = Math.abs(dy);
    if (absDx <= threshold || absDy <= threshold) return null;
    var ratio = absDx / absDy;
    if (ratio < 0.5 || ratio > 2) return null;
    if (dx > 0 && dy < 0) return 4; // up-right
    if (dx > 0 && dy > 0) return 5; // down-right
    if (dx < 0 && dy > 0) return 6; // down-left
    return 7; // up-left
  }

  function resolveNearestDiagonalDirection(dx, dy, threshold) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) <= threshold) return null;
    var angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    var options = [
      { angle: 315, dir: 4 }, // up-right
      { angle: 45, dir: 5 },  // down-right
      { angle: 135, dir: 6 }, // down-left
      { angle: 225, dir: 7 }  // up-left
    ];
    var best = options[0];
    var bestDistance = 360;
    for (var i = 0; i < options.length; i += 1) {
      var distance = Math.abs(angle - options[i].angle);
      distance = Math.min(distance, 360 - distance);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = options[i];
      }
    }
    return best.dir;
  }

  function resolveGestureTouch(touchList) {
    if (!touchList || touchList.length === 0) return null;
    if (!diagonalAssistActive || diagonalAssistTouchId == null) {
      return touchList[0];
    }
    for (var i = 0; i < touchList.length; i += 1) {
      if (touchList[i].identifier !== diagonalAssistTouchId) {
        return touchList[i];
      }
    }
    return null;
  }

  function resolveChangedTouch(changedTouches) {
    if (!changedTouches || changedTouches.length === 0) return null;
    if (touchStartPointerId == null) return changedTouches[0];
    for (var i = 0; i < changedTouches.length; i += 1) {
      if (changedTouches[i].identifier === touchStartPointerId) {
        return changedTouches[i];
      }
    }
    return changedTouches[0];
  }

  function syncDiagonalAssistButtonLayout() {
    if (!diagonalAssistButton || !gameContainer) return;
    var rect = gameContainer.getBoundingClientRect();
    var width = Math.max(0, Math.round(rect.width));
    if (width <= 0) return;
    diagonalAssistButton.style.left = Math.round(rect.left) + "px";
    diagonalAssistButton.style.top = Math.round(rect.bottom + 8) + "px";
    diagonalAssistButton.style.width = width + "px";
  }

  function syncDiagonalAssistVisibility() {
    if (!diagonalAssistButton) return;
    var visible = isDiagonalModeEnabled() && (isMobileTouchDevice() || isCompactViewport());
    diagonalAssistButton.style.display = visible ? "inline-flex" : "none";
    if (visible) {
      syncDiagonalAssistButtonLayout();
    }
    if (!visible) setDiagonalAssistActive(false);
  }

  function ensureDiagonalAssistUi() {
    if (!gameContainer || !isMobileTouchDevice()) return;
    if (!diagonalAssistButton) {
      var zhLocale = isZhLocale();
      diagonalAssistButton = document.createElement("button");
      diagonalAssistButton.type = "button";
      diagonalAssistButton.className = "diagonal-assist-touch-btn";
      diagonalAssistButton.setAttribute("aria-label", zhLocale ? "\u6309\u4f4f\u659c\u5411\u8f85\u52a9" : "Hold for diagonal assist");
      diagonalAssistButton.setAttribute("aria-pressed", "false");
      diagonalAssistButton.textContent = "";
      document.body.appendChild(diagonalAssistButton);

      var pressStart = function (event) {
        if (event && typeof event.preventDefault === "function") event.preventDefault();
        if (event && event.touches && event.touches.length > 0) {
          diagonalAssistTouchId = event.touches[0].identifier;
        }
        setDiagonalAssistActive(true);
      };
      var pressEnd = function (event) {
        if (event && event.touches && diagonalAssistTouchId != null) {
          for (var i = 0; i < event.touches.length; i += 1) {
            if (event.touches[i].identifier === diagonalAssistTouchId) {
              return;
            }
          }
        }
        setDiagonalAssistActive(false);
      };
      diagonalAssistButton.addEventListener("touchstart", pressStart, { passive: false });
      diagonalAssistButton.addEventListener("touchend", pressEnd, { passive: true });
      diagonalAssistButton.addEventListener("touchcancel", pressEnd, { passive: true });
      diagonalAssistButton.addEventListener("mousedown", pressStart);
      diagonalAssistButton.addEventListener("mouseup", pressEnd);
      diagonalAssistButton.addEventListener("mouseleave", pressEnd);
      document.addEventListener("touchend", pressEnd, { passive: true });
      document.addEventListener("touchcancel", pressEnd, { passive: true });
      document.addEventListener("mouseup", pressEnd);
    }
    syncDiagonalAssistVisibility();

    if (typeof window !== "undefined") {
      window.addEventListener("resize", syncDiagonalAssistVisibility);
      window.addEventListener("orientationchange", syncDiagonalAssistVisibility);
      window.addEventListener("scroll", syncDiagonalAssistButtonLayout, { passive: true });
      window.setTimeout(syncDiagonalAssistVisibility, 0);
      window.setTimeout(syncDiagonalAssistVisibility, 120);
      window.setTimeout(syncDiagonalAssistVisibility, 480);
    }
    if (document && document.body && typeof MutationObserver !== "undefined") {
      var modeObserver = new MutationObserver(function () {
        syncDiagonalAssistVisibility();
      });
      modeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ["data-mode-id"]
      });
    }
  }

  if (!gameContainer) return;
  ensureDiagonalAssistUi();

  gameContainer.addEventListener("touchstart", function (event) {
    if (!event.touches || event.touches.length === 0) return;
    if (!diagonalAssistActive && event.touches.length > 1) return;

    syncDiagonalAssistVisibility();
    var touchPoint = resolveGestureTouch(event.touches);
    if (!touchPoint) return;
    touchStartPointerId = touchPoint.identifier;
    touchStartClientX = touchPoint.clientX;
    touchStartClientY = touchPoint.clientY;
    event.preventDefault();
  });

  gameContainer.addEventListener("touchmove", function (event) {
    event.preventDefault();
  });

  gameContainer.addEventListener("touchend", function (event) {
    var changedTouch = resolveChangedTouch(event.changedTouches);
    if (!changedTouch) return;

    var dx = changedTouch.clientX - touchStartClientX;
    var absDx = Math.abs(dx);

    var dy = changedTouch.clientY - touchStartClientY;
    var absDy = Math.abs(dy);

    var touchMoveThreshold = resolveTouchMoveThreshold();
    if (Math.max(absDx, absDy) > touchMoveThreshold) {
      var diagonalModeEnabled = isDiagonalModeEnabled();
      if (diagonalAssistActive && diagonalModeEnabled) {
        var forcedDiagonalDirection = resolveNearestDiagonalDirection(dx, dy, touchMoveThreshold);
        if (forcedDiagonalDirection != null) {
          self.emit("move", forcedDiagonalDirection);
        }
        touchStartPointerId = null;
        return;
      }
      if (diagonalModeEnabled) {
        var diagonalDirection = resolveDiagonalDirectionByDelta(dx, dy, touchMoveThreshold);
        if (diagonalDirection != null) {
          self.emit("move", diagonalDirection);
          touchStartPointerId = null;
          return;
        }
      }
      self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    }
    touchStartPointerId = null;
  });
};

KeyboardInputManager.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};

KeyboardInputManager.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};
