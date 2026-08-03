// Input manager for capped 2048 mode (no undo)
var nextCappedOperationFeedbackInputId = 0;

function CappedInputManager() {
  this.events = {};
  this.listen();
}

CappedInputManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

CappedInputManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

CappedInputManager.prototype.listen = function () {
  var self = this;

  function isEditableTarget(target) {
    if (!target) return false;
    var el = target.nodeType === 1 ? target : target.parentElement;
    if (!el) return false;
    if (el.isContentEditable) return true;
    if (el.closest && el.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")) return true;
    var tag = String(el.tagName || "").toUpperCase();
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  function createKeyboardMoveAttempt(direction, event) {
    var arrowKeys = { 38: "arrow-up", 39: "arrow-right", 40: "arrow-down", 37: "arrow-left" };
    var physicalKeys = {
      ArrowUp: "arrow-up", ArrowRight: "arrow-right", ArrowDown: "arrow-down", ArrowLeft: "arrow-left"
    };
    var code = String(event.code || "");
    var key = physicalKeys[code] || (code.length === 4 && code.indexOf("Key") === 0
      ? code.slice(3)
      : String(event.key || "").toUpperCase());
    return {
      direction: direction,
      feedback: {
        id: "capped-" + (++nextCappedOperationFeedbackInputId),
        key: arrowKeys[event.which] || key,
        repeat: event.repeat === true
      }
    };
  }

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
    65: 3  // A
    // No Z key (undo) mapping
  };

  document.addEventListener("keydown", function (event) {
    if (isEditableTarget(event.target)) return;
    var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                    event.shiftKey;
    var mapped    = map[event.which];

    if (!modifiers) {
      if (mapped !== undefined) {
        event.preventDefault();
        self.emit("move", createKeyboardMoveAttempt(mapped, event));
      }

      if (event.key === 'r' || event.key === 'R' || event.code === 'KeyR' || event.which === 82) self.restart.bind(self)(event);
    }
  });

  var retry = document.querySelector(".retry-button");
  if (retry) {
    retry.addEventListener("click", this.restart.bind(this));
    retry.addEventListener("touchend", this.restart.bind(this));
  }

  var restart = document.querySelector(".restart-button");
  if (restart) {
    restart.addEventListener("click", this.restart.bind(this));
    restart.addEventListener("touchend", this.restart.bind(this));
  }

  var keepPlaying = document.querySelector(".keep-playing-button");
  if (keepPlaying) {
    keepPlaying.addEventListener("click", this.keepPlaying.bind(this));
    keepPlaying.addEventListener("touchend", this.keepPlaying.bind(this));
  }

  // Listen to swipe events
  var touchStartClientX, touchStartClientY;
  var gameContainer = document.getElementsByClassName("game-container")[0];
  var TOUCH_THRESHOLD_STORAGE_KEY = "touch_swipe_threshold_px_v1";

  function resolveTouchMoveThreshold() {
    var fallback = 10;
    try {
      var runtime = window.CoreStorageRuntime || null;
      var storage = runtime && runtime.resolveStorageByName
        ? runtime.resolveStorageByName({ windowLike: window, storageName: "localStorage" })
        : null;
      var value = runtime && runtime.safeReadStorageItem
        ? runtime.safeReadStorageItem({ storageLike: storage, key: TOUCH_THRESHOLD_STORAGE_KEY })
        : null;
      if (value == null || value === "") return fallback;
      var threshold = Number(value);
      if (!Number.isFinite(threshold)) return fallback;
      return Math.min(28, Math.max(4, Math.round(threshold)));
    } catch (_err) {
      return fallback;
    }
  }

  gameContainer.addEventListener("touchstart", function (event) {
    if (event.touches.length > 1) return;

    touchStartClientX = event.touches[0].clientX;
    touchStartClientY = event.touches[0].clientY;
    event.preventDefault();
  });

  gameContainer.addEventListener("touchmove", function (event) {
    event.preventDefault();
  });

  gameContainer.addEventListener("touchend", function (event) {
    if (event.touches.length > 0) return;

    var dx = event.changedTouches[0].clientX - touchStartClientX;
    var absDx = Math.abs(dx);

    var dy = event.changedTouches[0].clientY - touchStartClientY;
    var absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > resolveTouchMoveThreshold()) {
      // (right : left) : (down : up)
      self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    }
  });
};

CappedInputManager.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};

CappedInputManager.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};
