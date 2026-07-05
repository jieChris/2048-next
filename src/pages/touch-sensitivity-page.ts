import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";

export const TOUCH_THRESHOLD_STORAGE_KEY = "touch_swipe_threshold_px_v1";
export const TOUCH_THRESHOLD_MIN = 4;
export const TOUCH_THRESHOLD_MAX = 28;
export const TOUCH_THRESHOLD_DEFAULT = 10;

type Direction = 0 | 1 | 2 | 3;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
}

const COPY = {
  zh: {
    title: "触屏灵敏度",
    documentTitle: "2048 触屏灵敏度",
    kicker: "2048 触屏设置",
    subtitle: "调好后直接回到游戏，正式棋盘会使用同一个触发距离。",
    palette: "色板中心",
    home: "回首页",
    sliderHeading: "触发距离",
    hint: "数值越小越灵敏；数值越大越不容易误触。",
    boardHeading: "测试棋盘",
    reset: "重置",
    boardLabel: "3x3 测试棋盘",
    idle: "在棋盘上滑动，测试当前触发距离。",
    tooShort: "未触发：滑动距离小于当前阈值。",
    moved: "已识别：",
    blocked: "方向已识别，但棋盘没有可移动方块。",
    directions: ["上", "右", "下", "左"]
  },
  en: {
    title: "Touch Sensitivity",
    documentTitle: "2048 Touch Sensitivity",
    kicker: "2048 Touch Settings",
    subtitle: "Return to the game after tuning. The real board uses the same trigger distance.",
    palette: "Palette Center",
    home: "Home",
    sliderHeading: "Trigger Distance",
    hint: "Lower values are more sensitive; higher values reduce accidental moves.",
    boardHeading: "Test Board",
    reset: "Reset",
    boardLabel: "3x3 test board",
    idle: "Swipe on the board to test the current trigger distance.",
    tooShort: "Not triggered: swipe distance is below the current threshold.",
    moved: "Detected: ",
    blocked: "Direction detected, but no tile can move.",
    directions: ["Up", "Right", "Down", "Left"]
  }
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeTouchThreshold(value: unknown): number {
  if (value == null || value === "") return TOUCH_THRESHOLD_DEFAULT;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return TOUCH_THRESHOLD_DEFAULT;
  return clamp(Math.round(numeric), TOUCH_THRESHOLD_MIN, TOUCH_THRESHOLD_MAX);
}

export function readTouchThreshold(storageLike?: StorageLike | null): number {
  try {
    return normalizeTouchThreshold(storageLike?.getItem(TOUCH_THRESHOLD_STORAGE_KEY));
  } catch (_err) {
    return TOUCH_THRESHOLD_DEFAULT;
  }
}

export function writeTouchThreshold(storageLike: StorageLike | null | undefined, value: number): number {
  const normalized = normalizeTouchThreshold(value);
  try {
    storageLike?.setItem(TOUCH_THRESHOLD_STORAGE_KEY, String(normalized));
  } catch (_err) {
    // Local storage can be unavailable in private modes; the live slider still works.
  }
  return normalized;
}

export function resolveMoveDirectionFromDelta(dx: number, dy: number, threshold: number): Direction | null {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (Math.max(absDx, absDy) <= normalizeTouchThreshold(threshold)) return null;
  return absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
}

function createInitialBoard(): number[] {
  return [2, 0, 0, 0, 2, 0, 0, 0, 4];
}

function lineIndexes(direction: Direction, line: number): number[] {
  if (direction === 0) return [line, line + 3, line + 6];
  if (direction === 2) return [line + 6, line + 3, line];
  if (direction === 1) return [line * 3 + 2, line * 3 + 1, line * 3];
  return [line * 3, line * 3 + 1, line * 3 + 2];
}

function mergeLine(values: number[]): number[] {
  const source = values.filter((value) => value > 0);
  const merged: number[] = [];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === source[i + 1]) {
      merged.push(source[i] * 2);
      i += 1;
    } else {
      merged.push(source[i]);
    }
  }
  while (merged.length < 3) merged.push(0);
  return merged;
}

export function moveTestBoard(board: number[], direction: Direction): { board: number[]; moved: boolean } {
  const next = board.slice(0, 9);
  let moved = false;
  for (let line = 0; line < 3; line += 1) {
    const indexes = lineIndexes(direction, line);
    const before = indexes.map((index) => next[index]);
    const after = mergeLine(before);
    for (let i = 0; i < indexes.length; i += 1) {
      if (next[indexes[i]] !== after[i]) moved = true;
      next[indexes[i]] = after[i];
    }
  }
  return { board: next, moved };
}

function addTestTile(board: number[]): number[] {
  const next = board.slice(0, 9);
  const index = next.findIndex((value) => value === 0);
  if (index >= 0) next[index] = 2;
  return next;
}

function getLanguage(): "zh" | "en" {
  const storageLike = resolveStorageByName({
    windowLike: window as unknown as Record<string, unknown>,
    storageName: "localStorage"
  });
  const value = safeReadStorageItem({ storageLike, key: "ui_language_v1" }) || document.documentElement.lang || "";
  return value.toLowerCase().startsWith("en") ? "en" : "zh";
}

function setText(id: string, text: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

function renderBoard(boardElement: HTMLElement, board: number[]): void {
  boardElement.innerHTML = "";
  for (const value of board) {
    const cell = document.createElement("div");
    cell.className = "touch-test-cell";
    if (value > 0) {
      cell.dataset.value = String(value);
      cell.textContent = String(value);
    }
    boardElement.appendChild(cell);
  }
}

export function bootstrapTouchSensitivityPage(): void {
  const lang = getLanguage();
  const copy = COPY[lang];
  const storage = typeof window === "undefined" ? null : window.localStorage;
  const slider = document.getElementById("touch-threshold-slider") as HTMLInputElement | null;
  const valueOutput = document.getElementById("touch-threshold-value") as HTMLOutputElement | null;
  const boardElement = document.getElementById("touch-test-board") as HTMLElement | null;
  const feedback = document.getElementById("touch-test-feedback");
  const resetButton = document.getElementById("touch-test-reset");
  if (!slider || !valueOutput || !boardElement || !feedback || !resetButton) return;
  const sliderEl = slider;
  const valueOutputEl = valueOutput;
  const boardEl = boardElement;
  const feedbackEl = feedback;
  const resetButtonEl = resetButton;

  document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  document.title = copy.documentTitle;
  setText("touch-kicker", copy.kicker);
  setText("touch-title", copy.title);
  setText("touch-subtitle", copy.subtitle);
  setText("touch-back-palette", copy.palette);
  setText("touch-back-game", copy.home);
  setText("touch-slider-heading", copy.sliderHeading);
  setText("touch-threshold-hint", copy.hint);
  setText("touch-board-heading", copy.boardHeading);
  setText("touch-test-reset", copy.reset);
  feedbackEl.textContent = copy.idle;
  boardEl.setAttribute("aria-label", copy.boardLabel);

  let threshold = readTouchThreshold(storage);
  let board = createInitialBoard();
  let startPoint: { x: number; y: number; pointerId: number } | null = null;

  function syncSlider(nextValue: number): void {
    threshold = writeTouchThreshold(storage, nextValue);
    sliderEl.value = String(threshold);
    valueOutputEl.textContent = `${threshold} px`;
  }

  function resetBoard(): void {
    board = createInitialBoard();
    renderBoard(boardEl, board);
    feedbackEl.textContent = copy.idle;
  }

  sliderEl.addEventListener("input", () => {
    syncSlider(Number(sliderEl.value));
  });

  boardEl.addEventListener("pointerdown", (event) => {
    startPoint = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    boardEl.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  boardEl.addEventListener("pointerup", (event) => {
    if (!startPoint) return;
    const direction = resolveMoveDirectionFromDelta(event.clientX - startPoint.x, event.clientY - startPoint.y, threshold);
    startPoint = null;
    event.preventDefault();
    if (direction === null) {
      feedbackEl.textContent = copy.tooShort;
      return;
    }
    const result = moveTestBoard(board, direction);
    if (!result.moved) {
      feedbackEl.textContent = copy.blocked;
      return;
    }
    board = addTestTile(result.board);
    renderBoard(boardEl, board);
    feedbackEl.textContent = copy.moved + copy.directions[direction];
  });

  boardEl.addEventListener("pointercancel", () => {
    startPoint = null;
  });
  resetButtonEl.addEventListener("click", resetBoard);

  syncSlider(threshold);
  resetBoard();
}
