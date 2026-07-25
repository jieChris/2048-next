import type {
  GameDirection,
  GameState,
  GameTransition,
} from "../../../src/contracts";

export interface BoardViewOptions {
  readonly onDirection: (direction: GameDirection) => void;
  readonly isInputLocked: () => boolean;
  readonly reducedMotion?: () => boolean;
  readonly animationDurationMs?: number;
  readonly cellLabel?: (
    value: number,
    position: { x: number; y: number },
  ) => string;
}

export interface BoardView {
  apply(transition: GameTransition): Promise<void>;
  render(state: Pick<GameState, "board">): void;
  cancel(): void;
  destroy(): void;
}

const KEY_DIRECTIONS: Readonly<Record<string, GameDirection>> = {
  ArrowUp: 0,
  ArrowRight: 1,
  ArrowDown: 2,
  ArrowLeft: 3,
};

function cloneBoard(board: readonly (readonly number[])[]): number[][] {
  return board.map((row) => [...row]);
}

function defaultCellLabel(
  value: number,
  position: { x: number; y: number },
): string {
  return value > 0
    ? `row ${String(position.y + 1)}, column ${String(position.x + 1)}, ${String(value)}`
    : `row ${String(position.y + 1)}, column ${String(position.x + 1)}, empty`;
}

function requireSquareBoard(board: readonly (readonly number[])[]): number {
  const size = board.length;
  if (
    !Number.isInteger(size) ||
    size < 2 ||
    board.some(
      (row) =>
        row.length !== size ||
        row.some((value) => !Number.isSafeInteger(value) || value < 0),
    )
  ) {
    throw new Error("mobile_board_invalid_state");
  }
  return size;
}

export function resolveSwipeDirection(
  deltaX: number,
  deltaY: number,
  threshold: number,
): GameDirection | null {
  if (
    !Number.isFinite(deltaX) ||
    !Number.isFinite(deltaY) ||
    !Number.isFinite(threshold) ||
    threshold < 0
  ) {
    return null;
  }
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (Math.max(absX, absY) < threshold || absX === absY) return null;
  if (absX > absY) return deltaX > 0 ? 1 : 3;
  return deltaY > 0 ? 2 : 0;
}

export function mountBoard(
  root: HTMLElement,
  initialState: Pick<GameState, "board">,
  options: BoardViewOptions,
): BoardView {
  const size = requireSquareBoard(initialState.board);
  const durationMs = Math.max(
    0,
    Math.floor(options.animationDurationMs ?? 118),
  );
  const reducedMotion =
    options.reducedMotion ??
    (() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const cellLabel = options.cellLabel ?? defaultCellLabel;
  const background = document.createElement("div");
  const tileLayer = document.createElement("div");
  background.className = "game-board__background";
  tileLayer.className = "game-board__tiles";
  background.setAttribute("aria-hidden", "true");
  root.classList.add("game-board");
  root.dataset.size = String(size);
  root.setAttribute("role", "grid");
  root.setAttribute("aria-rowcount", String(size));
  root.setAttribute("aria-colcount", String(size));
  root.tabIndex = 0;

  const tiles: HTMLDivElement[] = [];
  for (let index = 0; index < size * size; index += 1) {
    const x = index % size;
    const y = Math.floor(index / size);
    const cell = document.createElement("div");
    cell.className = "game-board__cell";
    cell.dataset.boardCell = String(index);
    cell.style.gridColumn = String(x + 1);
    cell.style.gridRow = String(y + 1);
    background.append(cell);

    const tile = document.createElement("div");
    tile.className = "game-board__tile";
    tile.dataset.boardTile = String(index);
    tile.style.gridColumn = String(x + 1);
    tile.style.gridRow = String(y + 1);
    tile.setAttribute("role", "gridcell");
    tileLayer.append(tile);
    tiles.push(tile);
  }
  root.replaceChildren(background, tileLayer);

  let currentBoard = cloneBoard(initialState.board);
  let pendingBoard: number[][] | null = null;
  let movingTiles: HTMLDivElement[] = [];
  let animationFrame: number | null = null;
  let animationTimer: number | null = null;
  let settleAnimation: (() => void) | null = null;
  let animationEpoch = 0;
  let destroyed = false;
  let pointerId: number | null = null;
  let pointerStartX = 0;
  let pointerStartY = 0;

  const renderBoard = (board: readonly (readonly number[])[]): void => {
    if (requireSquareBoard(board) !== size) {
      throw new Error("mobile_board_size_changed");
    }
    currentBoard = cloneBoard(board);
    for (let index = 0; index < tiles.length; index += 1) {
      const x = index % size;
      const y = Math.floor(index / size);
      const value = board[y]?.[x] ?? 0;
      const tile = tiles[index];
      tile.dataset.value = String(value);
      tile.dataset.digits = String(value).length > 5 ? "long" : "normal";
      tile.dataset.tier =
        value >= 131_072 ? "ultra" : value >= 4_096 ? "high" : "standard";
      tile.setAttribute("aria-label", cellLabel(value, { x, y }));
      if (value === 0) {
        tile.hidden = true;
        tile.textContent = "";
      } else {
        tile.hidden = false;
        tile.textContent = String(value);
      }
    }
  };

  const decorateFinalEffects = (transition: GameTransition): void => {
    const pulseIndexes = new Set<number>();
    for (const merge of transition.merges) {
      pulseIndexes.add(merge.to.y * size + merge.to.x);
    }
    if (transition.spawn) {
      const spawnIndex = transition.spawn.y * size + transition.spawn.x;
      const spawnTile = tiles[spawnIndex];
      spawnTile.classList.remove("game-board__tile--spawn");
      void spawnTile.offsetWidth;
      spawnTile.classList.add("game-board__tile--spawn");
    }
    for (const index of pulseIndexes) {
      const tile = tiles[index];
      tile.classList.remove("game-board__tile--merge");
      void tile.offsetWidth;
      tile.classList.add("game-board__tile--merge");
    }
  };

  const cancel = (): void => {
    animationEpoch += 1;
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    if (animationTimer !== null) window.clearTimeout(animationTimer);
    animationFrame = null;
    animationTimer = null;
    for (const tile of movingTiles) {
      tile.style.removeProperty("transition");
      tile.style.removeProperty("transform");
      tile.style.removeProperty("will-change");
    }
    movingTiles = [];
    const settle = settleAnimation;
    settleAnimation = null;
    settle?.();
    if (pendingBoard) {
      const finalBoard = pendingBoard;
      pendingBoard = null;
      renderBoard(finalBoard);
    }
  };

  const apply = async (transition: GameTransition): Promise<void> => {
    if (destroyed) return;
    cancel();
    pendingBoard = cloneBoard(transition.state.board);
    const canAnimate =
      !reducedMotion() &&
      durationMs > 0 &&
      transition.motions.length > 0;
    if (!canAnimate) {
      const finalBoard = pendingBoard;
      pendingBoard = null;
      renderBoard(finalBoard);
      decorateFinalEffects(transition);
      return;
    }

    const epoch = ++animationEpoch;
    const rootRect = root.getBoundingClientRect();
    const computedGap = Number.parseFloat(
      getComputedStyle(root).getPropertyValue("--board-gap"),
    );
    const gap = Number.isFinite(computedGap) ? computedGap : 8;
    const cellSize = Math.max(0, (rootRect.width - gap * (size - 1)) / size);
    const motionBatch = transition.motions.flatMap((motion) => {
      const sourceIndex = motion.from.y * size + motion.from.x;
      const source = tiles[sourceIndex];
      if (!source || currentBoard[motion.from.y]?.[motion.from.x] === 0) {
        return [];
      }
      const deltaX = (motion.to.x - motion.from.x) * (cellSize + gap);
      const deltaY = (motion.to.y - motion.from.y) * (cellSize + gap);
      return [{
        tile: source,
        transform: `translate3d(${String(deltaX)}px, ${String(deltaY)}px, 0)`,
      }];
    });
    movingTiles = motionBatch.map(({ tile }) => tile);
    for (const { tile } of motionBatch) {
      tile.style.transition = "none";
      tile.style.transform = "translate3d(0, 0, 0)";
      tile.style.willChange = "transform";
    }
    void root.offsetWidth;
    await new Promise<void>((resolve) => {
      settleAnimation = resolve;
      animationFrame = requestAnimationFrame(() => {
        animationFrame = null;
        if (destroyed || epoch !== animationEpoch) {
          const settle = settleAnimation;
          settleAnimation = null;
          settle?.();
          return;
        }
        for (const { tile, transform } of motionBatch) {
          tile.style.transition = `transform ${String(durationMs)}ms cubic-bezier(0.22, 0.75, 0.22, 1)`;
          tile.style.transform = transform;
        }
        animationTimer = window.setTimeout(() => {
          animationTimer = null;
          const settle = settleAnimation;
          settleAnimation = null;
          settle?.();
        }, durationMs);
      });
    });
    if (destroyed || epoch !== animationEpoch || !pendingBoard) return;
    for (const tile of movingTiles) {
      tile.style.removeProperty("transition");
      tile.style.removeProperty("transform");
      tile.style.removeProperty("will-change");
    }
    const finalBoard = pendingBoard;
    pendingBoard = null;
    movingTiles = [];
    renderBoard(finalBoard);
    decorateFinalEffects(transition);
  };

  const resetPointer = (event?: PointerEvent): void => {
    if (
      event &&
      pointerId !== null &&
      typeof root.releasePointerCapture === "function"
    ) {
      try {
        root.releasePointerCapture(pointerId);
      } catch {
        // A cancelled native gesture may already have released capture.
      }
    }
    pointerId = null;
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (
      destroyed ||
      options.isInputLocked() ||
      event.isPrimary === false ||
      event.button !== 0 ||
      pointerId !== null
    ) {
      return;
    }
    pointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    if (typeof root.setPointerCapture === "function") {
      root.setPointerCapture(event.pointerId);
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    const deltaX = event.clientX - pointerStartX;
    const deltaY = event.clientY - pointerStartY;
    resetPointer(event);
    if (destroyed || options.isInputLocked()) return;
    const threshold = Math.max(16, root.clientWidth * 0.05);
    const direction = resolveSwipeDirection(deltaX, deltaY, threshold);
    if (direction !== null) options.onDirection(direction);
  };

  const onPointerCancel = (event: PointerEvent): void => {
    if (pointerId === event.pointerId) resetPointer(event);
  };

  const onLostPointerCapture = (event: PointerEvent): void => {
    if (pointerId === event.pointerId) pointerId = null;
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const direction = KEY_DIRECTIONS[event.key];
    if (direction === undefined || destroyed || options.isInputLocked()) {
      return;
    }
    event.preventDefault();
    options.onDirection(direction);
  };

  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointerup", onPointerUp);
  root.addEventListener("pointercancel", onPointerCancel);
  root.addEventListener("lostpointercapture", onLostPointerCapture);
  root.addEventListener("keydown", onKeyDown);
  renderBoard(initialState.board);

  return {
    apply,
    render: (state) => renderBoard(state.board),
    cancel,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancel();
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerCancel);
      root.removeEventListener("lostpointercapture", onLostPointerCapture);
      root.removeEventListener("keydown", onKeyDown);
    },
  };
}
