import {
  OPERATION_FEEDBACK_RESET_EVENT,
  OPERATION_FEEDBACK_RESULT_EVENT,
  type ConfirmedOperationFeedbackResult
} from "../core/game-manager-input-events";
import {
  createBrowserStorageAccess,
  readStorageValue,
  writeStorageValue
} from "../storage/browser-storage";

export type OperationFeedbackPlacement = "timer" | "edge" | "custom";

export interface OperationFeedbackPreferences {
  enabled: boolean;
  placement: OperationFeedbackPlacement;
  customLeft: number;
  customTop: number;
  locked: boolean;
}

type OverlayState = {
  history: ConfirmedOperationFeedbackResult[];
  nodes: Map<string, HTMLElement>;
  idleTimer?: number;
  previewVisible: boolean;
};

const STORAGE_KEY = "settings_operation_feedback_v1";
const OVERLAY_WIDTH = 96;
const OVERLAY_HEIGHT = 520;
const HISTORY_LIMIT = 8;
const IDLE_DELAY_MS = 5000;
const LEAVE_DURATION_MS = 240;
const ENTER_DURATION_MS = 280;
const ARROW_PATH = "M6 16h20M17 7l9 9-9 9";
const ARROW_KEYS = new Set(["arrow-up", "arrow-right", "arrow-down", "arrow-left"]);
const DEFAULT_PREFERENCES: OperationFeedbackPreferences = {
  enabled: false,
  placement: "timer",
  customLeft: 24,
  customTop: 180,
  locked: true
};
const PREVIEW_KEYS = [
  "arrow-left",
  "W",
  "arrow-up",
  "A",
  "backspace",
  "S",
  "arrow-down",
  "arrow-right"
];
const overlayStates = new WeakMap<HTMLElement, OverlayState>();
let backspaceMaskSequence = 0;

function readPreferences(windowLike: Window | null): OperationFeedbackPreferences {
  if (!windowLike) return { ...DEFAULT_PREFERENCES };
  try {
    const storageLike = createBrowserStorageAccess({ windowLike }).local();
    const parsed = JSON.parse(readStorageValue(storageLike, STORAGE_KEY) || "{}") as Partial<OperationFeedbackPreferences>;
    return {
      enabled: parsed.enabled === true,
      placement: ["timer", "edge", "custom"].includes(String(parsed.placement))
        ? (parsed.placement as OperationFeedbackPlacement)
        : DEFAULT_PREFERENCES.placement,
      customLeft: Number.isFinite(parsed.customLeft) ? Number(parsed.customLeft) : DEFAULT_PREFERENCES.customLeft,
      customTop: Number.isFinite(parsed.customTop) ? Number(parsed.customTop) : DEFAULT_PREFERENCES.customTop,
      locked: parsed.locked !== false
    };
  } catch (_error) {
    return { ...DEFAULT_PREFERENCES };
  }
}

function savePreferences(windowLike: Window | null, preferences: OperationFeedbackPreferences): void {
  const storageLike = createBrowserStorageAccess({ windowLike }).local();
  writeStorageValue(storageLike, STORAGE_KEY, JSON.stringify(preferences));
}

function isDesktop(windowLike: Window | null): boolean {
  return !windowLike?.matchMedia || windowLike.matchMedia("(min-width: 981px)").matches;
}

function getOverlayState(overlay: HTMLElement): OverlayState {
  const current = overlayStates.get(overlay);
  if (current) return current;
  const state: OverlayState = { history: [], nodes: new Map(), previewVisible: false };
  overlayStates.set(overlay, state);
  return state;
}

function normalizeConfirmedResult(value: unknown): ConfirmedOperationFeedbackResult | null {
  if (!value || typeof value !== "object") return null;
  const detail = value as Partial<ConfirmedOperationFeedbackResult>;
  if (typeof detail.id !== "string" || !detail.id) return null;
  if (typeof detail.key !== "string") return null;
  if (typeof detail.repeat !== "boolean" || typeof detail.valid !== "boolean") return null;
  const key = detail.key.length === 1 ? detail.key.toUpperCase() : detail.key;
  if (!ARROW_KEYS.has(key) && key !== "backspace" && !/^[A-Z]$/.test(key)) return null;
  return { id: detail.id, key, repeat: detail.repeat, valid: detail.valid };
}

function keyLabel(key: string): string {
  if (key === "backspace") return "退格";
  if (key.startsWith("arrow-")) return key.slice(6);
  return key;
}

function setKeyContent(node: HTMLElement, key: string): void {
  node.classList.remove("direction-up", "direction-right", "direction-down", "direction-left");
  if (ARROW_KEYS.has(key)) {
    node.classList.add(`direction-${key.slice(6)}`);
    node.innerHTML = `<svg class="operation-feedback-arrow" viewBox="0 0 32 32" aria-hidden="true"><path d="${ARROW_PATH}"></path></svg>`;
    return;
  }
  if (key === "backspace") {
    const maskId = `operation-feedback-backspace-mask-${++backspaceMaskSequence}`;
    const shape = "M18 4H47a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H18L3 16 18 4Z";
    node.innerHTML = `<svg class="operation-feedback-backspace" viewBox="0 0 52 32" aria-hidden="true"><defs><mask id="${maskId}"><path d="${shape}" fill="white"></path><path d="m30 11 10 10m0-10L30 21" fill="none" stroke="black" stroke-width="4.5" stroke-linecap="round"></path></mask></defs><path d="${shape}" mask="url(#${maskId})"></path></svg>`;
    return;
  }
  node.textContent = key;
}

function updateKeyNode(node: HTMLElement, entry: ConfirmedOperationFeedbackResult): void {
  if (node.dataset.operationFeedbackKey !== entry.key) {
    node.dataset.operationFeedbackKey = entry.key;
    setKeyContent(node, entry.key);
  }
  node.classList.toggle("is-wide", entry.key === "backspace");
  node.classList.toggle("is-invalid", !entry.valid);
  node.setAttribute("aria-label", `${entry.valid ? "有效" : "无效"}${keyLabel(entry.key)}输入`);
}

function createKeyNode(
  overlay: HTMLElement,
  entry: ConfirmedOperationFeedbackResult,
  entering: boolean
): HTMLElement {
  const node = overlay.ownerDocument.createElement("b");
  node.className = "operation-feedback-key";
  node.dataset.inputId = entry.id;
  updateKeyNode(node, entry);
  if (entering) node.classList.add("is-entering", "is-new");
  return node;
}

function scheduleEnteringTransition(windowLike: Window | null, node: HTMLElement): void {
  const enter = (): void => node.classList.remove("is-entering");
  if (typeof windowLike?.requestAnimationFrame === "function") {
    windowLike.requestAnimationFrame(enter);
  } else {
    windowLike?.setTimeout(enter, 0);
  }
  windowLike?.setTimeout(() => node.classList.remove("is-new"), ENTER_DURATION_MS);
}

function renderPreview(overlay: HTMLElement): void {
  const state = getOverlayState(overlay);
  if (state.previewVisible) return;
  const stack = overlay.querySelector<HTMLElement>(".operation-feedback-key-stack");
  if (!stack) return;
  const preview = PREVIEW_KEYS.map((key, index) => {
    const node = createKeyNode(overlay, {
      id: `preview-${index}`,
      key,
      repeat: false,
      valid: true
    }, false);
    node.removeAttribute("data-input-id");
    node.dataset.previewKey = String(index);
    node.dataset.age = String(PREVIEW_KEYS.length - 1 - index);
    return node;
  });
  stack.replaceChildren(...preview);
  state.previewVisible = true;
}

function renderHistory(overlay: HTMLElement, windowLike: Window | null, enteringId?: string): void {
  const state = getOverlayState(overlay);
  const stack = overlay.querySelector<HTMLElement>(".operation-feedback-key-stack");
  if (!stack) return;
  stack.querySelectorAll<HTMLElement>("[data-preview-key]").forEach((node) => node.remove());
  state.previewVisible = false;
  state.history.forEach((entry, index) => {
    let node = state.nodes.get(entry.id);
    const entering = !node && entry.id === enteringId;
    if (!node) {
      node = createKeyNode(overlay, entry, entering);
      state.nodes.set(entry.id, node);
    } else {
      updateKeyNode(node, entry);
    }
    node.classList.remove("is-leaving");
    node.dataset.age = String(state.history.length - 1 - index);
    if (node.parentElement !== stack) stack.append(node);
    if (entering) scheduleEnteringTransition(windowLike, node);
  });
}

function clearIdleTimer(windowLike: Window | null, state: OverlayState): void {
  if (state.idleTimer !== undefined) windowLike?.clearTimeout(state.idleTimer);
  state.idleTimer = undefined;
}

function scheduleIdle(overlay: HTMLElement, windowLike: Window | null): void {
  const state = getOverlayState(overlay);
  clearIdleTimer(windowLike, state);
  overlay.classList.remove("is-idle");
  if (!overlay.classList.contains("is-locked") || state.history.length === 0) return;
  state.idleTimer = windowLike?.setTimeout(() => {
    state.idleTimer = undefined;
    if (overlay.classList.contains("is-locked")) overlay.classList.add("is-idle");
  }, IDLE_DELAY_MS);
}

function retireKeyNode(overlay: HTMLElement, windowLike: Window | null, id: string): void {
  const state = getOverlayState(overlay);
  const node = state.nodes.get(id);
  if (!node) return;
  if (node.parentElement && overlay.classList.contains("is-locked") && !state.previewVisible) {
    node.dataset.age = String(HISTORY_LIMIT);
    node.classList.add("is-leaving");
    windowLike?.setTimeout(() => {
      if (state.history.some((entry) => entry.id === id)) return;
      node.remove();
      if (state.nodes.get(id) === node) state.nodes.delete(id);
    }, LEAVE_DURATION_MS);
    return;
  }
  node.remove();
  state.nodes.delete(id);
}

function handleConfirmedResult(
  overlay: HTMLElement,
  windowLike: Window | null,
  detail: unknown
): void {
  const preferences = readPreferences(windowLike);
  if (!preferences.enabled || !isDesktop(windowLike)) return;
  const entry = normalizeConfirmedResult(detail);
  if (!entry) return;
  const state = getOverlayState(overlay);
  const previousIds = state.history.map((item) => item.id);
  state.history = [...state.history.filter((item) => item.id !== entry.id), entry].slice(-HISTORY_LIMIT);
  const currentIds = new Set(state.history.map((item) => item.id));
  previousIds.filter((id) => !currentIds.has(id)).forEach((id) => retireKeyNode(overlay, windowLike, id));

  overlay.classList.remove("is-idle");
  if (overlay.classList.contains("is-editing")) {
    clearIdleTimer(windowLike, state);
    return;
  }
  renderHistory(overlay, windowLike, entry.id);
  scheduleIdle(overlay, windowLike);
}

function clearHistory(overlay: HTMLElement, windowLike: Window | null): void {
  const state = getOverlayState(overlay);
  clearIdleTimer(windowLike, state);
  state.history = [];
  state.nodes.forEach((node) => node.remove());
  state.nodes.clear();
  overlay.querySelectorAll<HTMLElement>(".operation-feedback-key-stack > *").forEach((node) => node.remove());
  state.previewVisible = false;
}

function clampPosition(
  windowLike: Window | null,
  left: number,
  top: number
): { left: number; top: number } {
  const viewportWidth = windowLike?.innerWidth || 1024;
  const viewportHeight = windowLike?.innerHeight || 720;
  return {
    left: Math.min(Math.max(8, left), Math.max(8, viewportWidth - OVERLAY_WIDTH - 8)),
    top: Math.min(Math.max(8, top), Math.max(8, viewportHeight - OVERLAY_HEIGHT - 8))
  };
}

function applyPlacement(
  documentLike: Document,
  windowLike: Window | null,
  overlay: HTMLElement,
  preferences: OperationFeedbackPreferences
): void {
  overlay.classList.remove("placement-timer", "placement-edge", "placement-custom");
  overlay.classList.add(`placement-${preferences.placement}`);

  let left = preferences.customLeft;
  let top = preferences.customTop;
  if (preferences.placement === "timer") {
    const timerBounds = documentLike.getElementById("timerbox")?.getBoundingClientRect();
    if (timerBounds && (timerBounds.width > 0 || timerBounds.height > 0)) {
      left = timerBounds.right + 14;
      top = timerBounds.top;
    } else {
      left = (windowLike?.innerWidth || 1024) - OVERLAY_WIDTH - 156;
      top = 132;
    }
  } else if (preferences.placement === "edge") {
    left = (windowLike?.innerWidth || 1024) - OVERLAY_WIDTH - 18;
    top = ((windowLike?.innerHeight || 720) - OVERLAY_HEIGHT) / 2;
  }

  const clamped = clampPosition(windowLike, left, top);
  overlay.style.left = `${clamped.left}px`;
  overlay.style.top = `${clamped.top}px`;
}

function syncOverlay(
  documentLike: Document,
  windowLike: Window | null,
  overlay: HTMLElement,
  preferences: OperationFeedbackPreferences
): void {
  const state = getOverlayState(overlay);
  overlay.hidden = !preferences.enabled || !isDesktop(windowLike);
  overlay.classList.toggle("is-editing", !preferences.locked);
  overlay.classList.toggle("is-locked", preferences.locked);
  overlay.setAttribute("aria-label", preferences.locked ? "操作反馈" : "调整操作反馈位置");
  const lock = overlay.querySelector<HTMLButtonElement>("[data-operation-feedback-lock]");
  if (lock) {
    const label = preferences.locked ? "解锁并调整操作反馈位置" : "锁定操作反馈位置";
    lock.setAttribute("aria-label", label);
    lock.title = preferences.locked ? "解锁并调整" : "锁定位置";
  }
  overlay.querySelectorAll<HTMLButtonElement>("[data-operation-feedback-placement]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.operationFeedbackPlacement === preferences.placement);
  });

  if (preferences.locked) {
    renderHistory(overlay, windowLike);
    if (state.history.length === 0) {
      overlay.classList.add("is-idle");
    } else if (state.idleTimer === undefined && !overlay.classList.contains("is-idle")) {
      scheduleIdle(overlay, windowLike);
    }
  } else {
    clearIdleTimer(windowLike, state);
    overlay.classList.remove("is-idle");
    renderPreview(overlay);
  }
  if (!overlay.hidden) applyPlacement(documentLike, windowLike, overlay, preferences);
}

function buildOverlay(documentLike: Document, windowLike: Window | null): HTMLElement {
  const overlay = documentLike.createElement("section");
  overlay.id = "operation-feedback-overlay";
  overlay.className = "operation-feedback-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <button type="button" class="operation-feedback-lock" data-operation-feedback-lock aria-label="锁定操作反馈位置" title="锁定位置">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>
    </button>
    <div class="operation-feedback-surface">
      <div class="operation-feedback-key-stack" aria-label="最近操作"></div>
      <aside class="operation-feedback-editor-tools" aria-label="操作反馈位置">
        <button type="button" data-operation-feedback-placement="timer">贴近计时器</button>
        <button type="button" data-operation-feedback-placement="edge">屏幕右侧</button>
        <button type="button" data-operation-feedback-reset>恢复默认</button>
      </aside>
    </div>`;
  documentLike.body.appendChild(overlay);
  getOverlayState(overlay);

  documentLike.addEventListener(OPERATION_FEEDBACK_RESULT_EVENT, (event) => {
    handleConfirmedResult(overlay, windowLike, (event as CustomEvent<unknown>).detail);
  });
  documentLike.addEventListener(OPERATION_FEEDBACK_RESET_EVENT, () => {
    clearHistory(overlay, windowLike);
    if (overlay.classList.contains("is-editing")) {
      renderPreview(overlay);
    } else {
      overlay.classList.add("is-idle");
    }
  });

  overlay.querySelector<HTMLButtonElement>("[data-operation-feedback-lock]")?.addEventListener("click", () => {
    const preferences = readPreferences(windowLike);
    preferences.locked = !preferences.locked;
    savePreferences(windowLike, preferences);
    syncOverlay(documentLike, windowLike, overlay, preferences);
  });

  overlay.querySelectorAll<HTMLButtonElement>("[data-operation-feedback-placement]").forEach((button) => {
    button.addEventListener("click", () => {
      const preferences = readPreferences(windowLike);
      preferences.placement = button.dataset.operationFeedbackPlacement as OperationFeedbackPlacement;
      preferences.locked = false;
      savePreferences(windowLike, preferences);
      syncOverlay(documentLike, windowLike, overlay, preferences);
    });
  });

  overlay.querySelector<HTMLButtonElement>("[data-operation-feedback-reset]")?.addEventListener("click", () => {
    const current = readPreferences(windowLike);
    const preferences = { ...DEFAULT_PREFERENCES, enabled: current.enabled, locked: false };
    savePreferences(windowLike, preferences);
    syncOverlay(documentLike, windowLike, overlay, preferences);
  });

  let drag: { x: number; y: number; preferences: OperationFeedbackPreferences } | null = null;
  overlay.addEventListener("pointerdown", (event) => {
    const target = event.target as Element | null;
    if (!overlay.classList.contains("is-editing") || target?.closest?.("button")) return;
    const bounds = overlay.getBoundingClientRect();
    drag = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      preferences: readPreferences(windowLike)
    };
    overlay.classList.add("is-dragging");
    overlay.setPointerCapture?.(event.pointerId);
  });
  overlay.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const position = clampPosition(windowLike, event.clientX - drag.x, event.clientY - drag.y);
    drag.preferences.placement = "custom";
    drag.preferences.customLeft = position.left;
    drag.preferences.customTop = position.top;
    overlay.classList.remove("placement-timer", "placement-edge");
    overlay.classList.add("placement-custom");
    overlay.style.left = `${position.left}px`;
    overlay.style.top = `${position.top}px`;
  });
  const finishDrag = (): void => {
    if (!drag) return;
    savePreferences(windowLike, drag.preferences);
    drag = null;
    overlay.classList.remove("is-dragging");
  };
  overlay.addEventListener("pointerup", finishDrag);
  overlay.addEventListener("pointercancel", finishDrag);
  windowLike?.addEventListener("resize", () => {
    syncOverlay(documentLike, windowLike, overlay, readPreferences(windowLike));
  });
  return overlay;
}

function ensureOverlay(documentLike: Document, windowLike: Window | null): HTMLElement {
  return documentLike.getElementById("operation-feedback-overlay") || buildOverlay(documentLike, windowLike);
}

export function initOperationFeedbackSettingsUI(input: {
  documentLike?: unknown;
  windowLike?: unknown;
}): { hasToggle: boolean; didBind: boolean } {
  const documentLike = input.documentLike && typeof (input.documentLike as Document).getElementById === "function"
    ? (input.documentLike as Document)
    : null;
  const windowLike = input.windowLike && typeof (input.windowLike as Window).addEventListener === "function"
    ? (input.windowLike as Window)
    : null;
  if (!documentLike || !isDesktop(windowLike)) return { hasToggle: false, didBind: false };

  const preferences = readPreferences(windowLike);
  const toggle = documentLike.getElementById("operation-feedback-toggle") as HTMLInputElement | null;
  const row = documentLike.getElementById("operation-feedback-settings-row");
  if (preferences.enabled) syncOverlay(documentLike, windowLike, ensureOverlay(documentLike, windowLike), preferences);
  if (!toggle || !row) return { hasToggle: !!toggle, didBind: false };

  toggle.checked = preferences.enabled;
  if (row.dataset.operationFeedbackBound === "1") return { hasToggle: true, didBind: false };
  row.dataset.operationFeedbackBound = "1";

  toggle.addEventListener("change", () => {
    const next = readPreferences(windowLike);
    next.enabled = toggle.checked;
    if (!next.enabled) next.locked = true;
    savePreferences(windowLike, next);
    if (next.enabled) {
      syncOverlay(documentLike, windowLike, ensureOverlay(documentLike, windowLike), next);
      return;
    }
    const overlay = documentLike.getElementById("operation-feedback-overlay");
    if (overlay) {
      clearHistory(overlay, windowLike);
      overlay.hidden = true;
    }
  });

  return { hasToggle: true, didBind: true };
}
