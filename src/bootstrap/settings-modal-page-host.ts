import { initOperationFeedbackSettingsUI } from "./operation-feedback-settings";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

const WIN_PROMPT_STORAGE_KEY = "settings_win_prompt_enabled_v1";
const LEGACY_WIN_PROMPT_STORAGE_KEYS = ["settings_win_prompt_enabled", "win_prompt_enabled"];
const UI_LANGUAGE_STORAGE_KEY = "ui_language_v1";


function getElementById(documentLike: unknown, id: string): unknown {
  const getter = asFunction<(value: string) => unknown>(toRecord(documentLike).getElementById);
  if (!getter) return null;
  return (getter as unknown as Function).call(documentLike, id);
}

function querySelector(node: unknown, selector: string): unknown {
  const query = asFunction<(value: string) => unknown>(toRecord(node).querySelector);
  if (!query) return null;
  return (query as unknown as Function).call(node, selector);
}

function appendChild(node: unknown, child: unknown): void {
  const append = asFunction<(value: unknown) => unknown>(toRecord(node).appendChild);
  if (!append) return;
  (append as unknown as Function).call(node, child);
}

function removeNode(node: unknown): void {
  const remove = asFunction<() => unknown>(toRecord(node).remove);
  if (remove) {
    remove.call(node);
    return;
  }
  const parent = toRecord(node).parentNode;
  const removeChild = asFunction<(value: unknown) => unknown>(toRecord(parent).removeChild);
  if (removeChild) {
    (removeChild as unknown as Function).call(parent, node);
  }
}

function bindListener(
  element: unknown,
  eventName: string,
  handler: (...args: never[]) => unknown
): boolean {
  const addEventListener = asFunction<(name: string, cb: (...args: never[]) => unknown) => unknown>(
    toRecord(element).addEventListener
  );
  if (!addEventListener) return false;
  (addEventListener as unknown as Function).call(element, eventName, handler);
  return true;
}

function readWinPromptEnabled(windowLike: unknown): boolean {
  const storage = toRecord(windowLike).localStorage;
  const getItem = asFunction<(key: string) => string | null>(toRecord(storage).getItem);
  if (!getItem) return true;
  try {
    const normalize = (raw: unknown): boolean => {
      if (raw === null || raw === undefined) return true;
      const text = String(raw).trim().toLowerCase();
      if (!text) return true;
      if (text === "0" || text === "false" || text === "off" || text === "no") return false;
      if (text === "1" || text === "true" || text === "on" || text === "yes") return true;
      return true;
    };

    const currentValue = getItem.call(storage, WIN_PROMPT_STORAGE_KEY);
    if (currentValue !== null && currentValue !== undefined && String(currentValue).trim() !== "") {
      return normalize(currentValue);
    }

    for (const legacyKey of LEGACY_WIN_PROMPT_STORAGE_KEYS) {
      const legacyValue = getItem.call(storage, legacyKey);
      if (legacyValue !== null && legacyValue !== undefined && String(legacyValue).trim() !== "") {
        return normalize(legacyValue);
      }
    }

    return true;
  } catch (_err) {
    return true;
  }
}

function writeWinPromptEnabled(windowLike: unknown, enabled: boolean): boolean {
  const storage = toRecord(windowLike).localStorage;
  const setItem = asFunction<(key: string, value: string) => unknown>(toRecord(storage).setItem);
  if (!setItem) return false;
  const nextValue = enabled ? "1" : "0";
  let didWrite = false;
  try {
    setItem.call(storage, WIN_PROMPT_STORAGE_KEY, nextValue);
    didWrite = true;
  } catch (_err) {
    didWrite = false;
  }
  for (const legacyKey of LEGACY_WIN_PROMPT_STORAGE_KEYS) {
    try {
      setItem.call(storage, legacyKey, nextValue);
      didWrite = true;
    } catch (_err) {}
  }
  return didWrite;
}

function resolveWinPromptNoteTextLegacy(enabled: boolean): string {
  return enabled
    ? "合成 2048 时会弹出胜利提示，可选择继续游戏。"
    : "合成 2048 时不弹出胜利提示，将自动继续游戏。";
}

function resolveWinPromptNoteText(enabled: boolean): string {
  return enabled
    ? "合成 2048 时会弹出胜利提示。"
    : "合成 2048 时不弹出胜利提示，会自动继续游戏。";
}

export interface SettingsModalInitResolvers {
  initThemeSettingsUI: () => unknown;
  removeLegacyUndoSettingsUI: () => unknown;
  initTimerModuleSettingsUI: () => unknown;
  initWinPromptSettingsUI: () => unknown;
}

void resolveWinPromptNoteTextLegacy;
void resolveWinPromptNoteText;

function readUiLanguage(windowLike: unknown): "zh" | "en" {
  const storage = toRecord(windowLike).localStorage;
  const getItem = asFunction<(key: string) => string | null>(toRecord(storage).getItem);
  if (!getItem) return "zh";
  try {
    const raw = String(getItem.call(storage, UI_LANGUAGE_STORAGE_KEY) || "").trim().toLowerCase();
    return raw === "en" ? "en" : "zh";
  } catch (_err) {
    return "zh";
  }
}

function resolveLocalizedWinPromptNoteText(enabled: boolean, windowLike?: unknown): string {
  if (readUiLanguage(windowLike) === "en") {
    return enabled
      ? "Show win prompt when reaching 2048, with Keep Going option."
      : "Do not show win prompt after 2048; continue automatically.";
  }
  return enabled
    ? "合成 2048 时会弹出胜利提示，可选择继续游戏。"
    : "合成 2048 时不弹出胜利提示，将自动继续游戏。";
}

export interface NormalizeSettingsModalContentResult {
  hasModal: boolean;
  didNormalize: boolean;
  hasInlineStats: boolean;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildSettingsToggleRowHtml(options: {
  rowId?: string;
  inputId: string;
  title: string;
  desc?: string;
  descId?: string;
  noteId?: string;
  note?: string;
  sliderInnerHtml?: string;
}): string {
  const rowId = options.rowId ? ` id="${escapeAttribute(options.rowId)}"` : "";
  const desc = options.desc
    ? `<div${options.descId ? ` id="${escapeAttribute(options.descId)}"` : ""} class="settings-toggle-desc">${options.desc}</div>`
    : "";
  const note = options.noteId
    ? `<div id="${escapeAttribute(options.noteId)}" class="settings-note">${options.note || ""}</div>`
    : "";
  return (
    `<div${rowId} class="settings-row settings-toggle-row">` +
    `<div class="settings-toggle-main">` +
    `<div class="settings-toggle-copy">` +
    `<label for="${escapeAttribute(options.inputId)}" class="settings-toggle-title">${options.title}</label>` +
    desc +
    `</div>` +
    `<label class="settings-switch" for="${escapeAttribute(options.inputId)}" aria-label="${escapeAttribute(options.title)}">` +
    `<input id="${escapeAttribute(options.inputId)}" type="checkbox">` +
    `<span class="settings-switch-slider">${options.sliderInnerHtml || ""}</span>` +
    `</label>` +
    `</div>` +
    note +
    `</div>`
  );
}

function buildCanonicalSettingsModalInnerHtml(options: {
  lang: "zh" | "en";
  hasInlineStats: boolean;
}): string {
  const lang = options.lang;
  const isEn = lang === "en";
  const rows = [
    `<h3>${isEn ? "Settings" : "设置"}</h3>`,
    buildSettingsToggleRowHtml({
      inputId: "win-prompt-toggle",
      title: isEn ? "Win Prompt" : "胜利提示",
      desc: isEn ? "Show a win prompt after reaching 2048" : "合成 2048 后弹出胜利提示",
      noteId: "win-prompt-note"
    }),
    buildSettingsToggleRowHtml({
      rowId: "bgm-settings-row",
      inputId: "bgm-toggle",
      title: isEn ? "Background Music" : "背景音乐",
      descId: "bgm-toggle-desc",
      desc: isEn
        ? "Loop background music on this page after enabling"
        : "开启后在当前页面循环播放背景音乐",
      noteId: "bgm-note",
      note: isEn
        ? "Audio is not requested until enabled, keeping the page fast."
        : "默认不加载音频，开启后才会开始请求，避免拖慢页面。"
    }),
    buildSettingsToggleRowHtml({
      rowId: "night-bg-settings-row",
      inputId: "night-bg-toggle",
      title: isEn ? "Night Mode" : "夜间模式",
      descId: "night-bg-toggle-desc",
      desc: isEn ? "Use a softer night background" : "为页面切换成柔和的夜间模式",
      noteId: "night-bg-note",
      note: isEn
        ? "This setting is shared across pages with settings dialogs."
        : "开启后会在所有带设置弹窗的页面同步生效。"
    })
  ];

  rows.push(
    `<div id="operation-feedback-settings-row" class="settings-row settings-toggle-row operation-feedback-settings-row">` +
      `<div class="settings-toggle-main">` +
      `<div class="settings-toggle-copy">` +
      `<label for="operation-feedback-toggle" class="settings-toggle-title">${
        isEn ? "Operation Feedback" : "操作反馈"
      }</label>` +
      `<div class="settings-toggle-desc">${
        isEn ? "Show recent input and valid / invalid feedback in this game" : "显示本局最近操作及有效／无效反馈"
      }</div>` +
      `</div>` +
      `<label class="settings-switch" for="operation-feedback-toggle" aria-label="${
        isEn ? "Operation Feedback" : "操作反馈"
      }">` +
      `<input id="operation-feedback-toggle" type="checkbox">` +
      `<span class="settings-switch-slider"></span>` +
      `</label>` +
      `</div>` +
      `<button type="button" class="settings-inline-action-btn" data-operation-feedback-layout-open>${
        isEn ? "Layout Debugger" : "布局调试"
      }</button>` +
      `</div>`
  );

  if (options.hasInlineStats) {
    rows.push(
      buildSettingsToggleRowHtml({
        inputId: "pku2048-inline-stats-toggle",
        title: isEn ? "Stats Panel" : "统计面板",
        descId: "pku2048-inline-stats-desc",
        desc: isEn ? "Show inline on page." : "直接显示在页面中",
        sliderInnerHtml: `<span class="settings-inline-desc-sr" style="display:none;">${
          isEn ? "Show inline on page." : "直接显示在页面中"
        }</span>`
      })
    );
  }

  return rows.join("");
}

function getSettingsRowId(row: unknown): string {
  const rowRecord = toRecord(row);
  const rowId = String(rowRecord.id || "");
  if (rowId) return rowId;
  const input = querySelector(row, "input");
  return String(toRecord(input).id || "");
}

const CANONICAL_SETTINGS_ROW_IDS = [
  "win-prompt-toggle",
  "bgm-settings-row",
  "night-bg-settings-row",
  "operation-feedback-settings-row",
  "pku2048-inline-stats-toggle",
  "timer-module-view-toggle",
  "top-button-style-settings-row",
  "ui-language-settings-row"
] as const;

const DYNAMIC_SETTINGS_ROW_IDS = [
  "timer-module-view-toggle",
  "top-button-style-settings-row",
  "ui-language-settings-row"
] as const;

function reorderSettingsRows(content: unknown): void {
  for (const rowId of CANONICAL_SETTINGS_ROW_IDS) {
    const row =
      rowId.endsWith("-row")
        ? getElementById(toRecord(content).ownerDocument, rowId)
        : null;
    const targetRow =
      row ||
      (() => {
        const control = getElementById(toRecord(content).ownerDocument, rowId);
        const closest = asFunction<(selector: string) => unknown>(toRecord(control).closest);
        return closest && control ? (closest as unknown as Function).call(control, ".settings-row") : null;
      })();
    if (targetRow && toRecord(targetRow).parentNode === content) {
      appendChild(content, targetRow);
    }
  }
}

export function normalizeSettingsModalContent(input: {
  documentLike?: unknown;
  windowLike?: unknown;
}): NormalizeSettingsModalContentResult {
  const source = toRecord(input);
  const documentLike = source.documentLike;
  const modal = getElementById(documentLike, "settings-modal");
  if (!modal) {
    return {
      hasModal: false,
      didNormalize: false,
      hasInlineStats: false
    };
  }

  const content = querySelector(modal, ".settings-modal-content");
  if (!content) {
    return {
      hasModal: true,
      didNormalize: false,
      hasInlineStats: false
    };
  }
  removeNode(getElementById(documentLike, "toolkit-entry-row"));

  const existingRows: unknown[] = [];
  const children = toRecord(toRecord(content).children);
  const childrenLength = typeof children.length === "number" ? Math.max(0, Math.floor(children.length)) : 0;
  for (let i = 0; i < childrenLength; i += 1) {
    const child = children[i];
    const rowId = getSettingsRowId(child);
    if (DYNAMIC_SETTINGS_ROW_IDS.includes(rowId as (typeof DYNAMIC_SETTINGS_ROW_IDS)[number])) {
      existingRows.push(child);
    }
  }

  const hasInlineStats =
    !!getElementById(documentLike, "pku2048-inline-stats-toggle") ||
    existingRows.some((row) => getSettingsRowId(row) === "pku2048-inline-stats-toggle");
  const hasCanonicalBase =
    !!getElementById(documentLike, "win-prompt-toggle") &&
    !!getElementById(documentLike, "bgm-toggle") &&
    !!getElementById(documentLike, "night-bg-toggle") &&
    !!getElementById(documentLike, "operation-feedback-toggle");

  if (!hasCanonicalBase) {
    toRecord(content).innerHTML = buildCanonicalSettingsModalInnerHtml({
      lang: readUiLanguage(source.windowLike),
      hasInlineStats
    });
    for (const row of existingRows) {
      appendChild(content, row);
    }
  }

  reorderSettingsRows(content);

  return {
    hasModal: true,
    didNormalize: true,
    hasInlineStats
  };
}

export interface SettingsModalActionResolvers {
  openSettingsModal: () => unknown;
  closeSettingsModal: () => unknown;
}

export function createSettingsModalInitResolvers(input: {
  themeSettingsPageHostRuntime?: unknown;
  themeSettingsHostRuntime?: unknown;
  themeSettingsRuntime?: unknown;
  timerModuleSettingsHostRuntime?: unknown;
  timerModuleSettingsPageHostRuntime?: unknown;
  timerModuleRuntime?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  retryDelayMs?: unknown;
  setTimeoutLike?: unknown;
  syncMobileTimerboxUi?: unknown;
  resolveSyncMobileTimerboxUi?: unknown;
}): SettingsModalInitResolvers {
  const source = toRecord(input);
  const windowLike = source.windowLike || null;
  const themePageHostRuntime = toRecord(source.themeSettingsPageHostRuntime);
  const timerPageHostRuntime = toRecord(source.timerModuleSettingsPageHostRuntime);
  const timerSettingsHostRuntime = toRecord(source.timerModuleSettingsHostRuntime);
  const applyThemeSettingsPageInit = asFunction<(payload: unknown) => unknown>(
    themePageHostRuntime.applyThemeSettingsPageInit
  );
  const applyTimerModuleSettingsPageInit = asFunction<(payload: unknown) => unknown>(
    timerPageHostRuntime.applyTimerModuleSettingsPageInit
  );
  const applyLegacyUndoSettingsCleanup = asFunction<(payload: unknown) => unknown>(
    timerSettingsHostRuntime.applyLegacyUndoSettingsCleanup
  );
  function initThemeSettingsUI(): unknown {
    if (!applyThemeSettingsPageInit) return null;
    return applyThemeSettingsPageInit({
      themeSettingsHostRuntime: source.themeSettingsHostRuntime,
      themeSettingsRuntime: source.themeSettingsRuntime,
      documentLike: source.documentLike,
      windowLike
    });
  }

  function removeLegacyUndoSettingsUI(): unknown {
    if (!applyLegacyUndoSettingsCleanup) return null;
    return applyLegacyUndoSettingsCleanup({
      documentLike: source.documentLike
    });
  }

  function initTimerModuleSettingsUI(): unknown {
    if (!applyTimerModuleSettingsPageInit) return null;
    return applyTimerModuleSettingsPageInit({
      timerModuleSettingsHostRuntime: source.timerModuleSettingsHostRuntime,
      timerModuleRuntime: source.timerModuleRuntime,
      documentLike: source.documentLike,
      windowLike,
      retryDelayMs: source.retryDelayMs,
      setTimeoutLike: source.setTimeoutLike,
      reinvokeInit: initTimerModuleSettingsUI,
      syncMobileTimerboxUi: source.syncMobileTimerboxUi
    });
  }

  function initWinPromptSettingsUI(): unknown {
    const toggle = getElementById(source.documentLike, "win-prompt-toggle");
    if (!toggle) {
      return {
        hasToggle: false,
        didBindToggle: false,
        didSync: false
      };
    }

    const note = getElementById(source.documentLike, "win-prompt-note");
    const toggleRecord = toRecord(toggle);
    const sync = function (): void {
      const enabled = readWinPromptEnabled(windowLike);
      toggleRecord.checked = enabled;
      if (note) {
        toRecord(note).textContent = resolveLocalizedWinPromptNoteText(enabled, windowLike);
      }
    };

    let didBindToggle = false;
    if (!toggleRecord.__winPromptBound) {
      toggleRecord.__winPromptBound = true;
      didBindToggle = bindListener(toggle, "change", function () {
        const enabled = !!toRecord(toggle).checked;
        writeWinPromptEnabled(windowLike, enabled);
        sync();
      });
    }

    sync();
    bindListener(windowLike, "uilanguagechange", sync);

    return {
      hasToggle: true,
      didBindToggle,
      didSync: true
    };
  }

  return {
    initThemeSettingsUI,
    removeLegacyUndoSettingsUI,
    initTimerModuleSettingsUI,
    initWinPromptSettingsUI
  };
}

export function createSettingsModalActionResolvers(input: {
  settingsModalPageHostRuntime?: unknown;
  settingsModalHostRuntime?: unknown;
  replayModalRuntime?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  removeLegacyUndoSettingsUI?: unknown;
  initThemeSettingsUI?: unknown;
  initTimerModuleSettingsUI?: unknown;
  initWinPromptSettingsUI?: unknown;
}): SettingsModalActionResolvers {
  const source = toRecord(input);
  const pageHostRuntime = toRecord(source.settingsModalPageHostRuntime);

  function openSettingsModal(): unknown {
    const applyOpen = asFunction<(payload: unknown) => unknown>(
      pageHostRuntime.applySettingsModalPageOpen
    );
    if (applyOpen) {
      return applyOpen({
        settingsModalHostRuntime: source.settingsModalHostRuntime,
        replayModalRuntime: source.replayModalRuntime,
        documentLike: source.documentLike,
        windowLike: source.windowLike,
        removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
        initThemeSettingsUI: source.initThemeSettingsUI,
        initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
        initWinPromptSettingsUI: source.initWinPromptSettingsUI
      });
    }
    return applySettingsModalPageOpen({
      settingsModalHostRuntime: source.settingsModalHostRuntime,
      replayModalRuntime: source.replayModalRuntime,
      documentLike: source.documentLike,
      windowLike: source.windowLike,
      removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
      initThemeSettingsUI: source.initThemeSettingsUI,
      initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
      initWinPromptSettingsUI: source.initWinPromptSettingsUI
    });
  }

  function closeSettingsModal(): unknown {
    const applyClose = asFunction<(payload: unknown) => unknown>(
      pageHostRuntime.applySettingsModalPageClose
    );
    if (applyClose) {
      return applyClose({
        settingsModalHostRuntime: source.settingsModalHostRuntime,
        replayModalRuntime: source.replayModalRuntime,
        documentLike: source.documentLike
      });
    }
    return applySettingsModalPageClose({
      settingsModalHostRuntime: source.settingsModalHostRuntime,
      replayModalRuntime: source.replayModalRuntime,
      documentLike: source.documentLike
    });
  }

  return {
    openSettingsModal,
    closeSettingsModal
  };
}

export interface SettingsModalPageOpenResult {
  hasApplyOpenApi: boolean;
  didApply: boolean;
}

export function applySettingsModalPageOpen(input: {
  settingsModalHostRuntime?: unknown;
  replayModalRuntime?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  removeLegacyUndoSettingsUI?: unknown;
  initThemeSettingsUI?: unknown;
  initTimerModuleSettingsUI?: unknown;
  initWinPromptSettingsUI?: unknown;
}): SettingsModalPageOpenResult {
  const source = toRecord(input);
  const hostRuntime = toRecord(source.settingsModalHostRuntime);
  const applyOpen = asFunction<(payload: unknown) => unknown>(
    hostRuntime.applySettingsModalOpenOrchestration
  );
  if (!applyOpen) {
    return {
      hasApplyOpenApi: false,
      didApply: false
    };
  }

  normalizeSettingsModalContent({
    documentLike: source.documentLike,
    windowLike: source.windowLike
  });
  initOperationFeedbackSettingsUI({
    documentLike: source.documentLike,
    windowLike: source.windowLike
  });

  applyOpen({
    replayModalRuntime: source.replayModalRuntime,
    documentLike: source.documentLike,
    removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
    initThemeSettingsUI: source.initThemeSettingsUI,
    initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
    initWinPromptSettingsUI: source.initWinPromptSettingsUI
  });

  return {
    hasApplyOpenApi: true,
    didApply: true
  };
}

export interface SettingsModalPageCloseResult {
  hasApplyCloseApi: boolean;
  didApply: boolean;
}

export function applySettingsModalPageClose(input: {
  settingsModalHostRuntime?: unknown;
  replayModalRuntime?: unknown;
  documentLike?: unknown;
}): SettingsModalPageCloseResult {
  const source = toRecord(input);
  const hostRuntime = toRecord(source.settingsModalHostRuntime);
  const applyClose = asFunction<(payload: unknown) => unknown>(
    hostRuntime.applySettingsModalCloseOrchestration
  );
  if (!applyClose) {
    return {
      hasApplyCloseApi: false,
      didApply: false
    };
  }

  applyClose({
    replayModalRuntime: source.replayModalRuntime,
    documentLike: source.documentLike
  });

  return {
    hasApplyCloseApi: true,
    didApply: true
  };
}

export interface SettingsModalPageHostRuntime {
  createSettingsModalActionResolvers: typeof createSettingsModalActionResolvers;
  createSettingsModalInitResolvers: typeof createSettingsModalInitResolvers;
  normalizeSettingsModalContent: typeof normalizeSettingsModalContent;
  applySettingsModalPageOpen: typeof applySettingsModalPageOpen;
  applySettingsModalPageClose: typeof applySettingsModalPageClose;
}

export interface SettingsModalPageHostRuntimeWindowLike {
  CoreSettingsModalPageHostRuntime?: SettingsModalPageHostRuntime;
}

export interface SettingsModalPageHostRuntimeInstallOptions {
  windowLike?: SettingsModalPageHostRuntimeWindowLike | null | undefined;
}

export function createSettingsModalPageHostRuntime(): SettingsModalPageHostRuntime {
  return {
    createSettingsModalActionResolvers,
    createSettingsModalInitResolvers,
    normalizeSettingsModalContent,
    applySettingsModalPageOpen,
    applySettingsModalPageClose
  };
}

export function installSettingsModalPageHostRuntime(
  options: SettingsModalPageHostRuntimeInstallOptions = {}
): SettingsModalPageHostRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as SettingsModalPageHostRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreSettingsModalPageHostRuntime) {
    windowLike.CoreSettingsModalPageHostRuntime = createSettingsModalPageHostRuntime();
  }
  return windowLike.CoreSettingsModalPageHostRuntime || null;
}

export { resolveWinPromptNoteTextLegacy };
