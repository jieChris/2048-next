function HTMLActuator() {
  this.tileContainer = document.querySelector(".tile-container");
  this.scoreContainer = document.querySelector(".score-container");
  this.bestContainer = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");
  this.gridContainer = document.querySelector(".grid-container");
  this.gameContainer = document.querySelector(".game-container");

  this.score = 0;
  this.gridMeta = null;
  this.stoneValueSet = {};
  this.lowPerfMode = false;
  this.pendingActuateFrameId = null;
  this.forceSyncActuate = false;
}

HTMLActuator.prototype.cancelPendingActuation = function () {
  if (this.pendingActuateFrameId === null) return;
  if (typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(this.pendingActuateFrameId);
  } else {
    clearTimeout(this.pendingActuateFrameId);
  }
  this.pendingActuateFrameId = null;
};

HTMLActuator.prototype.renderActuationFrame = function (grid, metadata) {
  this.stoneValueSet = {};
  var stoneValues = metadata && Array.isArray(metadata.stoneValues) ? metadata.stoneValues : [];
  for (var i = 0; i < stoneValues.length; i++) {
    this.stoneValueSet[String(Number(stoneValues[i]))] = true;
  }
  this.ensureGridLayout(grid, metadata);
  this.clearContainer(this.tileContainer);

  grid.cells.forEach(function (column) {
    column.forEach(function (cell) {
      if (cell) {
        this.addTile(cell);
      }
    }, this);
  }, this);

  this.updateScore(metadata.score);
  this.updateBestScore(metadata.bestScore);

  if (metadata.terminated) {
    if (metadata.over) {
      this.message(false);
    } else if (metadata.won) {
      this.message(true);
    }
  }
};

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;
  this.cancelPendingActuation();

  if (this.forceSyncActuate === true) {
    this.renderActuationFrame(grid, metadata);
    return;
  }

  this.pendingActuateFrameId = window.requestAnimationFrame(function () {
    self.pendingActuateFrameId = null;
    self.renderActuationFrame(grid, metadata);
  });
};

HTMLActuator.prototype.ensureGridLayout = function (grid, metadata) {
  if (!this.gridContainer || !this.tileContainer) return;

  var cols = grid.width || grid.size || 4;
  var rows = grid.height || grid.size || 4;
  var blockedCells = metadata && Array.isArray(metadata.blockedCells) ? metadata.blockedCells : [];
  var blockedSignature = blockedCells.length ? JSON.stringify(blockedCells) : "";
  var boardSize = 470;
  if (this.gameContainer && this.gameContainer.clientWidth > 80 && typeof window !== "undefined") {
    var styles = window.getComputedStyle(this.gameContainer);
    var padLeft = parseFloat(styles.paddingLeft) || 0;
    var padRight = parseFloat(styles.paddingRight) || 0;
    boardSize = Math.max(120, this.gameContainer.clientWidth - padLeft - padRight);
  }
  var cached = this.gridMeta;
  if (cached && cached.cols === cols && cached.rows === rows && cached.boardSize === boardSize && cached.blockedSignature === blockedSignature) {
    return;
  }

  var desktopLike = boardSize >= 400;
  var baseGap = desktopLike ? 15 : 10;
  var layout = this.getBoardLayout(cols, rows, boardSize, baseGap);
  var cell = layout.cell;
  var gap = layout.gap;
  var gridWidth = layout.gridWidth;
  var gridHeight = layout.gridHeight;
  var offsetX = layout.offsetX;
  var offsetY = layout.offsetY;

  this.applyContainerFrameSize(cols, rows, gridHeight);

  this.gridMeta = {
    cols: cols,
    rows: rows,
    cell: cell,
    gap: gap,
    gridWidth: gridWidth,
    gridHeight: gridHeight,
    offsetX: offsetX,
    offsetY: offsetY,
    boardSize: boardSize,
    blockedSignature: blockedSignature
  };

  var lowPerf = cols * rows >= 64;
  if (this.lowPerfMode !== lowPerf) {
    this.lowPerfMode = lowPerf;
    if (typeof document !== "undefined" && document.body) {
      document.body.classList.toggle("board-low-perf", lowPerf);
    }
  }

  this.gridContainer.style.left = "50%";
  this.gridContainer.style.top = "50%";
  this.gridContainer.style.width = gridWidth + "px";
  this.gridContainer.style.height = gridHeight + "px";
  this.gridContainer.style.transform = "translate(-50%, -50%)";

  this.tileContainer.style.left = "50%";
  this.tileContainer.style.top = "50%";
  this.tileContainer.style.width = gridWidth + "px";
  this.tileContainer.style.height = gridHeight + "px";
  this.tileContainer.style.transform = "translate(-50%, -50%)";

  this.gridContainer.innerHTML = "";
  var blockedMap = {};
  for (var b = 0; b < blockedCells.length; b++) {
    var bc = blockedCells[b];
    if (!bc) continue;
    blockedMap[bc.x + ":" + bc.y] = true;
  }
  for (var y = 0; y < rows; y++) {
    var rowEl = document.createElement("div");
    rowEl.className = "grid-row";
    rowEl.style.marginBottom = (y === rows - 1) ? "0" : (gap + "px");
    for (var x = 0; x < cols; x++) {
      var cellEl = document.createElement("div");
      cellEl.className = "grid-cell";
      cellEl.style.width = cell + "px";
      cellEl.style.height = cell + "px";
      cellEl.style.marginRight = (x === cols - 1) ? "0" : (gap + "px");
      cellEl.setAttribute("data-x", x);
      cellEl.setAttribute("data-y", y);
      if (blockedMap[x + ":" + y]) {
        cellEl.classList.add("grid-cell-obstacle");
      }
      rowEl.appendChild(cellEl);
    }
    this.gridContainer.appendChild(rowEl);
  }
};

HTMLActuator.prototype.invalidateLayoutCache = function () {
  this.gridMeta = null;
};

HTMLActuator.prototype.applyContainerFrameSize = function (cols, rows, gridHeight) {
  if (!this.gameContainer || typeof window === "undefined") return;

  var styles = window.getComputedStyle(this.gameContainer);
  var padTop = parseFloat(styles.paddingTop) || 0;
  var padBottom = parseFloat(styles.paddingBottom) || 0;

  if (cols === 4 && rows < 4) {
    this.gameContainer.style.height = (gridHeight + padTop + padBottom) + "px";
  } else {
    this.gameContainer.style.height = "";
  }
};

HTMLActuator.prototype.getBoardLayout = function (cols, rows, boardSize, baseGap) {
  if (cols === 4 && rows === 4) {
    var cell44 = (boardSize - baseGap * (cols - 1)) / cols;
    return {
      gap: baseGap,
      cell: cell44,
      gridWidth: cols * cell44 + (cols - 1) * baseGap,
      gridHeight: rows * cell44 + (rows - 1) * baseGap,
      offsetX: 0,
      offsetY: 0
    };
  }

  // 非 4x4 单独布局：按“仅内部间距”计算，再居中。
  var cellByRows = (boardSize - baseGap * (rows - 1)) / rows;
  var cellByCols = (boardSize - baseGap * (cols - 1)) / cols;
  var cell = Math.min(cellByRows, cellByCols);
  if (rows === 3 && cols === 3) {
    cell = cellByCols; // 3x3 允许更饱满展示
  }
  if (!isFinite(cell) || cell < 10) {
    cell = 10;
  }

  var gridWidth = cols * cell + (cols - 1) * baseGap;
  var gridHeight = rows * cell + (rows - 1) * baseGap;
  var offsetX = Math.max(0, (boardSize - gridWidth) / 2);
  var offsetY = Math.max(0, (boardSize - gridHeight) / 2);

  return {
    gap: baseGap,
    cell: cell,
    gridWidth: gridWidth,
    gridHeight: gridHeight,
    offsetX: offsetX,
    offsetY: offsetY
  };
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continue = function () {
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.isMobileTileViewport = function () {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function") {
    if (window.matchMedia("(max-width: 980px)").matches) return true;
    if (window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(hover: none)").matches) return true;
  }
  return window.innerWidth <= 980;
};

HTMLActuator.prototype.computeTileFontSize = function (value) {
  var meta = this.gridMeta || { cell: 107, cols: 4, rows: 4 };
  var cell = Number(meta.cell);
  if (!isFinite(cell) || cell <= 0) cell = 107;

  var cols = Number(meta.cols) || 4;
  var rows = Number(meta.rows) || 4;
  var maxDim = Math.max(cols, rows);

  var digits = String(Math.max(0, Math.floor(Math.abs(Number(value) || 0)))).length;
  var boardScale = 1;
  if (maxDim >= 7) {
    boardScale = 0.74;
  } else if (maxDim >= 6) {
    boardScale = 0.81;
  } else if (maxDim >= 5) {
    boardScale = 0.9;
  }

  var digitScale = 1;
  if (digits === 3) digitScale = 0.84;
  if (digits === 4) digitScale = 0.72;
  if (digits >= 5) digitScale = 0.6;

  var mobileBoost = 1;
  if (this.isMobileTileViewport()) {
    if (digits === 3) mobileBoost = 1.1;
    if (digits >= 4) mobileBoost = 1.03;
  }

  var raw = cell * 0.48 * boardScale * digitScale * mobileBoost;
  var minSize = Math.max(11, Math.floor(cell * 0.22));
  var maxSize = Math.max(minSize, Math.floor(cell * 0.62));
  var size = Math.round(raw);
  return Math.max(minSize, Math.min(maxSize, size));
};
HTMLActuator.prototype.applyTileStyle = function (wrapper, inner, position, value) {
  var meta = this.gridMeta || { cell: 107, gap: 15 };
  var x = position.x * (meta.cell + meta.gap);
  var y = position.y * (meta.cell + meta.gap);
  var fontSize = this.computeTileFontSize(value);

  wrapper.style.width = meta.cell + "px";
  wrapper.style.height = meta.cell + "px";
  wrapper.style.transform = "translate(" + x + "px, " + y + "px)";

  inner.style.width = meta.cell + "px";
  inner.style.height = meta.cell + "px";
  inner.style.lineHeight = meta.cell + "px";
  inner.style.fontSize = fontSize + "px";
};

HTMLActuator.prototype.addTile = function (tile, isMergedInner) {
  var self = this;

  var wrapper = document.createElement("div");
  var inner = document.createElement("div");
  var position = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);
  var isStone = !!(tile && tile.isStone === true) || this.stoneValueSet[String(Number(tile.value))] === true;

  var classes = ["tile", "tile-" + tile.value, positionClass];
  if (isStone) classes.push("tile-stone");
  else if (tile.value > 2048) classes.push("tile-super");

  if (isMergedInner) {
    classes.push("tile-tobe-merged");
  }

  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  inner.textContent = isStone ? "" : tile.value;
  this.applyTileStyle(wrapper, inner, position, tile.value);

  if (tile.previousPosition) {
    if (this.lowPerfMode) {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes);
      self.applyTileStyle(wrapper, inner, { x: tile.x, y: tile.y }, tile.value);
    } else {
      window.requestAnimationFrame(function () {
        classes[2] = self.positionClass({ x: tile.x, y: tile.y });
        self.applyClasses(wrapper, classes);
        self.applyTileStyle(wrapper, inner, { x: tile.x, y: tile.y }, tile.value);
      });
    }
  } else if (tile.mergedFrom) {
    if (!this.lowPerfMode) {
      classes.push("tile-merged");
      this.applyClasses(wrapper, classes);

      tile.mergedFrom.forEach(function (merged) {
        self.addTile(merged, true);
      });
    }
  } else {
    if (!this.lowPerfMode) {
      classes.push("tile-new");
    }
    this.applyClasses(wrapper, classes);
  }

  wrapper.appendChild(inner);
  this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainer.appendChild(addition);
  }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.shouldShowWinPrompt = function () {
  if (typeof window === "undefined" || !window.localStorage) return true;
  try {
    var normalize = function (raw) {
      if (raw === null || raw === undefined) return true;
      var text = String(raw).trim().toLowerCase();
      if (!text) return true;
      if (text === "0" || text === "false" || text === "off" || text === "no") return false;
      if (text === "1" || text === "true" || text === "on" || text === "yes") return true;
      return true;
    };
    var storage = window.localStorage;
    var value = storage.getItem("settings_win_prompt_enabled_v1");
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return normalize(value);
    }
    var legacyKeys = ["settings_win_prompt_enabled", "win_prompt_enabled"];
    for (var i = 0; i < legacyKeys.length; i++) {
      var legacyValue = storage.getItem(legacyKeys[i]);
      if (legacyValue !== null && legacyValue !== undefined && String(legacyValue).trim() !== "") {
        return normalize(legacyValue);
      }
    }
    return true;
  } catch (_err) {
    return true;
  }
};

HTMLActuator.prototype.message = function (won) {
  if (won && !this.shouldShowWinPrompt()) {
    if (this.tryAutoContinueWithoutPrompt()) {
      return;
    }
  }

  var type = won ? "game-won" : "game-over";
  var message = won ? "你赢了！" : "游戏结束！";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.tryAutoContinueWithoutPrompt = function () {
  var manager = typeof window !== "undefined" ? window.game_manager : null;
  if (!manager) return false;

  if (typeof manager.keepPlaying === "function") {
    try {
      manager.keepPlaying();
      return true;
    } catch (_err) {}
  }

  // keepPlaying 在当前实现中通常是布尔状态字段（而不是方法）。
  try {
    manager.keepPlaying = true;
  } catch (_err2) {
    return false;
  }

  if (manager.actuator && typeof manager.actuator.continue === "function") {
    try {
      manager.actuator.continue();
    } catch (_err3) {}
  }
  return true;
};

HTMLActuator.prototype.clearMessage = function () {
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
