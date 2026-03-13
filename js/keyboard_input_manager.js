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
    88: 6, // X (down-left)
    81: 7, // Q (up-left)
    105: 4, // Numpad 9
    99: 5, // Numpad 3
    97: 6, // Numpad 1
    103: 7, // Numpad 7
    85:-1, // U (undo)
    8:-1,  // Backspace (undo)
  };
  var itemMap = {
    49: "hammer", // 1
    50: "freeze", // 2
    51: "boost4"  // 3
  };

  document.addEventListener("keydown", function (event) {
    var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                    event.shiftKey;
    var mapped    = map[event.which];

    if (!modifiers) {
      if (event.which === 90) {
        var manager = typeof window !== "undefined" ? window.game_manager : null;
        var useDiagonalZ = false;
        if (manager && typeof manager.isDirectionAllowed === "function") {
          useDiagonalZ = !!manager.isDirectionAllowed(6);
        } else if (manager && Array.isArray(manager.allowedDirections)) {
          useDiagonalZ = manager.allowedDirections.indexOf(6) !== -1;
        } else {
          var rules = manager && manager.modeConfig && manager.modeConfig.special_rules;
          if (rules && rules.allow_diagonal_moves === true) {
            useDiagonalZ = true;
          } else if (rules && Array.isArray(rules.movement_directions)) {
            useDiagonalZ = rules.movement_directions.indexOf(6) !== -1;
          }
        }
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
  var gameContainer = document.getElementsByClassName("game-container")[0];

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

    if (Math.max(absDx, absDy) > 10) {
      if (
        absDx > 10 &&
        absDy > 10 &&
        Math.abs(absDx - absDy) / Math.max(absDx, absDy) < 0.35
      ) {
        if (dx > 0 && dy < 0) self.emit("move", 4); // up-right
        else if (dx > 0 && dy > 0) self.emit("move", 5); // down-right
        else if (dx < 0 && dy > 0) self.emit("move", 6); // down-left
        else self.emit("move", 7); // up-left
        return;
      }
      self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    }
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
