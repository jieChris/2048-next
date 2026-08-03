import {
  createBrowserStorageAccess,
  readStorageValue,
  removeStorageValue,
  writeStorageValue
} from "../storage/browser-storage";

type Placement = "timer" | "edge" | "custom";

type Preferences = {
  enabled: boolean;
  placement: Placement;
  customLeft: number;
  customTop: number;
};

type InputEntry = {
  label: string;
  valid: boolean;
  undo?: boolean;
  wide?: boolean;
};

const preferenceKey = "operation_feedback_preview_preferences_v1";
const defaults: Preferences = { enabled: false, placement: "timer", customLeft: 880, customTop: 168 };
const storageLike = createBrowserStorageAccess().local();
function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`操作反馈草稿缺少必要元素：${selector}`);
  return element;
}

const stage = requiredElement<HTMLElement>("[data-stage]");
const feedback = requiredElement<HTMLElement>("[data-feedback]");
const stack = requiredElement<HTMLElement>("[data-feedback-stack]");
const enabledInput = requiredElement<HTMLInputElement>("[data-enabled]");
const dragHandle = requiredElement<HTMLElement>("[data-drag-handle]");
const modeToggle = requiredElement<HTMLButtonElement>("[data-mode-toggle]");
const settingsModal = requiredElement<HTMLElement>("[data-settings-modal]");
const settingsOpen = requiredElement<HTMLButtonElement>("[data-settings-open]");
const settingsClose = requiredElement<HTMLButtonElement>("[data-settings-close]");

function readPreferences(): Preferences {
  try {
    const source = JSON.parse(readStorageValue(storageLike, preferenceKey) || "{}") as Partial<Preferences>;
    return {
      enabled: source.enabled === true,
      placement: source.placement === "edge" || source.placement === "custom" ? source.placement : "timer",
      customLeft: Number.isFinite(source.customLeft) ? Number(source.customLeft) : defaults.customLeft,
      customTop: Number.isFinite(source.customTop) ? Number(source.customTop) : defaults.customTop
    };
  } catch {
    return { ...defaults };
  }
}

let preferences = readPreferences();
let entries: InputEntry[] = [];
let visualEntries: InputEntry[] = [];
let validCount = 0;
let invalidCount = 0;
let undoCount = 0;
let hiddenTimer: number | undefined;
let eightDirections = false;
let customLayoutEditing = false;
let dragOffset: { x: number; y: number } | undefined;

function savePreferences(): void {
  writeStorageValue(storageLike, preferenceKey, JSON.stringify(preferences));
}

function openSettings(): void {
  settingsModal.hidden = false;
  settingsOpen.setAttribute("aria-expanded", "true");
  settingsClose.focus();
}

function closeSettings(): void {
  settingsModal.hidden = true;
  settingsOpen.setAttribute("aria-expanded", "false");
  settingsOpen.focus();
}

function clampCustomPosition(): void {
  const stageRect = stage.getBoundingClientRect();
  const panelRect = feedback.getBoundingClientRect();
  preferences.customLeft = Math.min(Math.max(12, preferences.customLeft), Math.max(12, stageRect.width - panelRect.width - 12));
  preferences.customTop = Math.min(Math.max(12, preferences.customTop), Math.max(12, stageRect.height - panelRect.height - 12));
}

function updatePlacement(): void {
  feedback.classList.remove("placement-timer", "placement-edge", "placement-custom");
  feedback.classList.add(`placement-${preferences.placement}`);
  if (preferences.placement === "custom") {
    clampCustomPosition();
    feedback.style.left = `${preferences.customLeft}px`;
    feedback.style.top = `${preferences.customTop}px`;
  } else {
    feedback.style.removeProperty("left");
    feedback.style.removeProperty("top");
  }
  document.querySelectorAll<HTMLButtonElement>("[data-placement]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.placement === preferences.placement);
  });
}

function renderEntries(): void {
  stack.replaceChildren(...visualEntries.map((entry, index) => {
    const key = document.createElement("div");
    const age = visualEntries.length - 1 - index;
    key.className = `feedback-key${entry.valid ? "" : " is-invalid"}${entry.wide ? " is-wide" : ""}`;
    key.dataset.age = String(age);
    key.textContent = entry.label;
    key.setAttribute("aria-label", `${entry.label}：${entry.valid ? "有效输入" : "无效输入"}`);
    return key;
  }));
}

function updateVisibility(): void {
  enabledInput.checked = preferences.enabled;
  feedback.classList.toggle("is-off", !preferences.enabled);
  feedback.classList.toggle("is-layout-editing", preferences.enabled && customLayoutEditing && preferences.placement === "custom");
  feedback.classList.toggle("is-muted", preferences.enabled && preferences.placement !== "custom" && visualEntries.length === 0);
}

function startHideTimer(): void {
  window.clearTimeout(hiddenTimer);
  if (preferences.placement === "custom") return;
  hiddenTimer = window.setTimeout(() => {
    visualEntries = [];
    renderEntries();
    updateVisibility();
  }, 5000);
}

function recordInput(entry: InputEntry, repeated = false): void {
  if (!preferences.enabled || (repeated && !entry.valid)) return;
  entries = [...entries, entry];
  visualEntries = [...visualEntries, entry].slice(-8);
  if (entry.undo) {
    if (entry.valid) undoCount += 1;
  } else if (entry.valid) {
    validCount += 1;
  } else {
    invalidCount += 1;
  }
  renderEntries();
  updateVisibility();
  startHideTimer();
}

function resetPreview(): void {
  window.clearTimeout(hiddenTimer);
  removeStorageValue(storageLike, preferenceKey);
  preferences = { ...defaults };
  entries = [];
  visualEntries = [];
  validCount = 0;
  invalidCount = 0;
  undoCount = 0;
  customLayoutEditing = false;
  renderEntries();
  updatePlacement();
  updateVisibility();
}

function setModeLabel(): void {
  modeToggle.textContent = eightDirections ? "切换标准方向" : "切换八方向";
}

function arrowForKey(key: string): string | undefined {
  const arrows: Record<string, string> = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };
  return arrows[key];
}

function directionKeyForEightDirections(key: string): string | undefined {
  const labels: Record<string, string> = { q: "Q", w: "W", e: "E", a: "A", s: "S", d: "D", z: "Z", x: "X", c: "C" };
  return labels[key.toLowerCase()];
}

enabledInput.addEventListener("change", () => {
  preferences.enabled = enabledInput.checked;
  savePreferences();
  if (!preferences.enabled) visualEntries = [];
  if (!preferences.enabled) customLayoutEditing = false;
  renderEntries();
  updateVisibility();
  if (preferences.enabled) startHideTimer();
});

settingsOpen.addEventListener("click", openSettings);
settingsClose.addEventListener("click", closeSettings);
settingsModal.addEventListener("click", (event) => {
  if (event.target === settingsModal) closeSettings();
});

document.querySelectorAll<HTMLButtonElement>("[data-placement]").forEach((button) => {
  button.addEventListener("click", () => {
    const next = button.dataset.placement;
    if (next !== "timer" && next !== "edge" && next !== "custom") return;
    window.clearTimeout(hiddenTimer);
    preferences.placement = next;
    customLayoutEditing = next === "custom";
    savePreferences();
    updatePlacement();
    updateVisibility();
    if (next === "custom") closeSettings();
    if (next !== "custom" && visualEntries.length > 0) startHideTimer();
  });
});

document.querySelector<HTMLButtonElement>("[data-reset-position]")?.addEventListener("click", () => {
  preferences.placement = defaults.placement;
  preferences.customLeft = defaults.customLeft;
  preferences.customTop = defaults.customTop;
  customLayoutEditing = false;
  savePreferences();
  updatePlacement();
  updateVisibility();
});

document.querySelector<HTMLButtonElement>("[data-reset-preview]")?.addEventListener("click", resetPreview);

document.querySelectorAll<HTMLButtonElement>("[data-simulate]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.simulate;
    if (action === "valid") recordInput({ label: "↑", valid: true });
    if (action === "invalid") recordInput({ label: "←", valid: false });
    if (action === "hold") ["→", "→", "→"].forEach((label) => recordInput({ label, valid: true }, true));
    if (action === "undo") recordInput({ label: "Z", valid: true, undo: true });
    if (action === "backspace") recordInput({ label: "⌫", valid: true, undo: true, wide: true });
    if (action === "undo-fail") recordInput({ label: "⌫", valid: false, undo: true, wide: true });
  });
});

modeToggle.addEventListener("click", () => {
  eightDirections = !eightDirections;
  setModeLabel();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !settingsModal.hidden) {
    closeSettings();
    return;
  }
  if (event.metaKey || event.ctrlKey || event.altKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
  const arrow = arrowForKey(event.key);
  if (arrow) {
    event.preventDefault();
    recordInput({ label: arrow, valid: true }, event.repeat);
    return;
  }
  if (event.key === "Backspace") {
    event.preventDefault();
    if (!event.repeat) recordInput({ label: "⌫", valid: true, undo: true, wide: true });
    return;
  }
  const directionKey = eightDirections ? directionKeyForEightDirections(event.key) : undefined;
  if (directionKey) {
    event.preventDefault();
    recordInput({ label: directionKey, valid: true }, event.repeat);
    return;
  }
  if (!eightDirections && event.key.toLowerCase() === "z" && !event.repeat) {
    event.preventDefault();
    recordInput({ label: "Z", valid: true, undo: true });
  }
});

dragHandle.addEventListener("pointerdown", (event) => {
  if (preferences.placement !== "custom" || !customLayoutEditing) return;
  const panelRect = feedback.getBoundingClientRect();
  dragOffset = { x: event.clientX - panelRect.left, y: event.clientY - panelRect.top };
  dragHandle.setPointerCapture(event.pointerId);
});

dragHandle.addEventListener("pointermove", (event) => {
  if (!dragOffset || preferences.placement !== "custom") return;
  const stageRect = stage.getBoundingClientRect();
  preferences.customLeft = event.clientX - stageRect.left - dragOffset.x;
  preferences.customTop = event.clientY - stageRect.top - dragOffset.y;
  clampCustomPosition();
  feedback.style.left = `${preferences.customLeft}px`;
  feedback.style.top = `${preferences.customTop}px`;
});

function finishCustomLayoutEditing(event: PointerEvent): void {
  if (!dragOffset) return;
  dragOffset = undefined;
  if (dragHandle.hasPointerCapture(event.pointerId)) dragHandle.releasePointerCapture(event.pointerId);
  customLayoutEditing = false;
  savePreferences();
  updateVisibility();
}

dragHandle.addEventListener("pointerup", finishCustomLayoutEditing);
dragHandle.addEventListener("pointercancel", finishCustomLayoutEditing);

window.addEventListener("resize", () => {
  if (preferences.placement !== "custom") return;
  clampCustomPosition();
  feedback.style.left = `${preferences.customLeft}px`;
  feedback.style.top = `${preferences.customTop}px`;
});

updatePlacement();
updateVisibility();
setModeLabel();
