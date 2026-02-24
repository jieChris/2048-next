interface ParentLike {
  insertBefore(node: unknown, referenceNode: unknown): unknown;
  appendChild(node: unknown): unknown;
}

interface NodeLike {
  parentNode?: ParentLike | null;
}

interface CommentFactory {
  (text: string): unknown;
}

export interface GameTopActionsPlacementState {
  topActionButtons: unknown;
  restartBtn: unknown;
  timerToggleBtn: unknown;
  restartAnchor: unknown;
  timerToggleAnchor: unknown;
}

export interface PracticeTopActionsPlacementState {
  topActionButtons: unknown;
  restartBtn: unknown;
  restartAnchor: unknown;
}

export interface CreateGameTopActionsPlacementStateOptions {
  enabled?: boolean | null | undefined;
  topActionButtons?: unknown;
  restartBtn?: unknown;
  timerToggleBtn?: unknown;
  createComment?: CommentFactory | null | undefined;
  restartAnchorText?: string | null | undefined;
  timerToggleAnchorText?: string | null | undefined;
}

export interface CreatePracticeTopActionsPlacementStateOptions {
  enabled?: boolean | null | undefined;
  topActionButtons?: unknown;
  restartBtn?: unknown;
  createComment?: CommentFactory | null | undefined;
  restartAnchorText?: string | null | undefined;
}

export interface SyncGameTopActionsPlacementOptions {
  state?: GameTopActionsPlacementState | null | undefined;
  compactViewport?: boolean | null | undefined;
}

export interface SyncPracticeTopActionsPlacementOptions {
  state?: PracticeTopActionsPlacementState | null | undefined;
  compactViewport?: boolean | null | undefined;
}

const DEFAULT_RESTART_ANCHOR_TEXT = "mobile-restart-anchor";
const DEFAULT_TIMER_ANCHOR_TEXT = "mobile-timer-toggle-anchor";
const DEFAULT_PRACTICE_RESTART_ANCHOR_TEXT = "practice-restart-anchor";

function asNode(value: unknown): NodeLike | null {
  if (!value || typeof value !== "object") return null;
  return value as NodeLike;
}

function asParent(value: unknown): ParentLike | null {
  if (!value || typeof value !== "object") return null;
  return value as ParentLike;
}

function hasInsertBefore(parent: unknown): parent is ParentLike {
  const obj = asParent(parent);
  return !!obj && typeof obj.insertBefore === "function";
}

function hasAppendChild(parent: unknown): parent is ParentLike {
  const obj = asParent(parent);
  return !!obj && typeof obj.appendChild === "function";
}

function insertBefore(parent: unknown, node: unknown, referenceNode: unknown): boolean {
  if (!hasInsertBefore(parent)) return false;
  try {
    parent.insertBefore(node, referenceNode);
    return true;
  } catch (_err) {
    return false;
  }
}

function appendChild(parent: unknown, node: unknown): boolean {
  if (!hasAppendChild(parent)) return false;
  try {
    parent.appendChild(node);
    return true;
  } catch (_err) {
    return false;
  }
}

function restoreNodeAfterAnchor(node: unknown, anchor: unknown): boolean {
  const anchorNode = asNode(anchor);
  if (!asNode(node) || !anchorNode || !anchorNode.parentNode) return false;
  return insertBefore(anchorNode.parentNode, node, (anchor as any).nextSibling || null);
}

function resolveAnchorText(value: string | null | undefined, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

export function createGameTopActionsPlacementState(
  options: CreateGameTopActionsPlacementStateOptions
): GameTopActionsPlacementState | null {
  const opts = options || {};
  if (!opts.enabled) return null;
  if (typeof opts.createComment !== "function") return null;

  const topActionButtons = opts.topActionButtons || null;
  const restartBtn = opts.restartBtn || null;
  const timerToggleBtn = opts.timerToggleBtn || null;
  const restartNode = asNode(restartBtn);
  const timerNode = asNode(timerToggleBtn);
  if (!topActionButtons || !restartNode || !timerNode) return null;
  if (!restartNode.parentNode || !timerNode.parentNode) return null;

  const restartAnchor = opts.createComment(
    resolveAnchorText(opts.restartAnchorText, DEFAULT_RESTART_ANCHOR_TEXT)
  );
  const timerToggleAnchor = opts.createComment(
    resolveAnchorText(opts.timerToggleAnchorText, DEFAULT_TIMER_ANCHOR_TEXT)
  );

  if (!insertBefore(restartNode.parentNode, restartAnchor, restartBtn)) return null;
  if (!insertBefore(timerNode.parentNode, timerToggleAnchor, timerToggleBtn)) return null;

  return {
    topActionButtons,
    restartBtn,
    timerToggleBtn,
    restartAnchor,
    timerToggleAnchor
  };
}

export function createPracticeTopActionsPlacementState(
  options: CreatePracticeTopActionsPlacementStateOptions
): PracticeTopActionsPlacementState | null {
  const opts = options || {};
  if (!opts.enabled) return null;
  if (typeof opts.createComment !== "function") return null;

  const topActionButtons = opts.topActionButtons || null;
  const restartBtn = opts.restartBtn || null;
  const restartNode = asNode(restartBtn);
  if (!topActionButtons || !restartNode || !restartNode.parentNode) return null;

  const restartAnchor = opts.createComment(
    resolveAnchorText(opts.restartAnchorText, DEFAULT_PRACTICE_RESTART_ANCHOR_TEXT)
  );
  if (!insertBefore(restartNode.parentNode, restartAnchor, restartBtn)) return null;

  return {
    topActionButtons,
    restartBtn,
    restartAnchor
  };
}

export function syncGameTopActionsPlacement(options: SyncGameTopActionsPlacementOptions): boolean {
  const opts = options || {};
  const state = opts.state || null;
  if (!state) return false;

  const compact = !!opts.compactViewport;
  if (compact) {
    appendChild(state.topActionButtons, state.restartBtn);
    appendChild(state.topActionButtons, state.timerToggleBtn);
    return true;
  }

  restoreNodeAfterAnchor(state.restartBtn, state.restartAnchor);
  restoreNodeAfterAnchor(state.timerToggleBtn, state.timerToggleAnchor);
  return true;
}

export function syncPracticeTopActionsPlacement(
  options: SyncPracticeTopActionsPlacementOptions
): boolean {
  const opts = options || {};
  const state = opts.state || null;
  if (!state) return false;

  const compact = !!opts.compactViewport;
  if (compact) {
    appendChild(state.topActionButtons, state.restartBtn);
    return true;
  }

  restoreNodeAfterAnchor(state.restartBtn, state.restartAnchor);
  return true;
}
