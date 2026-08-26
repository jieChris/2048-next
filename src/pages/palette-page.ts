import { installPaletteLegacyRuntime } from "../bootstrap/palette-legacy-runtime";
import { resolveStorageByName, safeReadStorageItem, safeSetStorageItem } from "../bootstrap/storage";
import {
  bindDisplayModeSync,
  DISPLAY_MODE_STORAGE_KEY,
  LEGACY_NIGHT_BACKGROUND_STORAGE_KEY,
  readDisplayModePreference,
  syncDisplayModeAttributes,
  type DisplayMode
} from "../bootstrap/display-mode";
import {
  createAccountPaletteOutbox,
  createIndexedDbPaletteOutboxStore,
  type PaletteOutboxOperation,
} from "../features/palette/account-palette-outbox";
import { createAccountPaletteV2Client } from "../features/palette/account-palette-v2-client";
import { createPaletteUuidV4 } from "../features/palette/account-palette-editor";
import {
  createThemePlazaClient,
  type ThemePlazaCapabilities,
} from "../features/theme-plaza/theme-plaza-client";
import {
  createThemePlazaSubmissionNotice,
  type ThemePlazaSubmissionNotice,
} from "../features/theme-plaza/submission-notice";
import {
  createAccountPalettePageSyncController,
  type PalettePageThemeManager,
} from "../features/palette/account-palette-page-sync";
import { getAuthToken } from "../services/auth-session";
import { getAccountPaletteSessionController } from "../features/palette/account-palette-session";
import { createBrowserStorageAccess, readStorageValue } from "../storage/browser-storage";
import { applyThemeSettingsUi } from "../bootstrap/theme-settings-host";
import { applyThemeSettingsPageInit } from "../bootstrap/theme-settings-page-host";
import * as themeSettingsRuntimeModule from "../bootstrap/theme-settings";
import {
  generateRecommendedSecondaryTimerRuleText,
  parseCustomSecondaryTimerRules,
  readCustomSecondaryTimerRuleText,
  writeCustomSecondaryTimerRuleText,
  type CustomSecondaryTimerFamily,
  type CustomSecondaryTimerRule
} from "../core/custom-secondary-timers";
import { resolveSecondaryTimerLegendFontSize } from "../core/game-manager-base-helpers";
import { getTimerMilestoneValues, getTimerSlotIdsForBoard } from "../core/rules";

// ponytail: recommendation picker intentionally stops at 5x5; raise only if larger-board rules become useful.
const CUSTOM_TIMER_PARENT_VALUES: Record<CustomSecondaryTimerFamily, number[]> = {
  pow2: getTimerSlotIdsForBoard("pow2", 5, 5),
  fibonacci: getTimerMilestoneValues("fibonacci", [], 4, 4)
};
const CUSTOM_TIMER_PREVIEW_STYLE_SLOTS = [
  32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536
];
let customTimerFamily: CustomSecondaryTimerFamily = "pow2";
const SETTINGS_SECTION_IDS = [
  "appearance-settings",
  "timer-settings",
  "contextual-guide-settings",
] as const;
type SettingsSectionId = typeof SETTINGS_SECTION_IDS[number];
const settingsSectionVisibility = new Map<SettingsSectionId, number>();
let settingsCategoryScrollLock: SettingsSectionId | null = null;
let settingsCategoryScrollUnlockTimer: number | undefined;
let settingsCategoryScrollUnlockListener: (() => void) | undefined;

const globalWindow = window as Window & {
  AccountPaletteDraftSaveHandler?: (draftState: Record<string, unknown>) => Promise<unknown>;
  AccountPaletteDuplicateConfirmHandler?: (paletteId: string) => Promise<unknown>;
  AccountPaletteUseExistingHandler?: (
    paletteId: string,
    existingPaletteId: string,
  ) => Promise<unknown>;
  AccountPalettePageLeaveHandler?: () => Promise<boolean>;
  AccountPalettePageSync?: ReturnType<typeof createAccountPalettePageSyncController>;
  GameDialog?: {
    confirm?: (message: string, options?: Record<string, unknown>) => Promise<boolean>;
    prompt?: (message: string, defaultValue?: string, options?: Record<string, unknown>) => Promise<string | null>;
  };
  ThemeManager?: Record<string, unknown>;
  ThemePlazaSubmissionNotice?: ThemePlazaSubmissionNotice;
  UII18N?: {
    getLanguage?: () => string;
    setLanguage?: (language: string) => void;
  };
  CoreThemeSettingsRuntime?: typeof themeSettingsRuntime;
  CoreThemeSettingsHostRuntime?: {
    applyThemeSettingsUi: typeof applyThemeSettingsUi;
  };
  CoreThemeSettingsPageHostRuntime?: {
    applyThemeSettingsPageInit: typeof applyThemeSettingsPageInit;
  };
  CoreNightModeRuntime?: {
    setDisplayMode?: (mode: DisplayMode) => unknown;
  };
};

const themeSettingsRuntime = {
  formatThemePreviewValue: themeSettingsRuntimeModule.formatThemePreviewValue,
  resolveThemePreviewTileValues: themeSettingsRuntimeModule.resolveThemePreviewTileValues,
  resolveThemePreviewLayout: themeSettingsRuntimeModule.resolveThemePreviewLayout,
  resolveThemePreviewCssSelectors: themeSettingsRuntimeModule.resolveThemePreviewCssSelectors,
  resolveThemeOptions: themeSettingsRuntimeModule.resolveThemeOptions,
  resolveThemeSelectLabel: themeSettingsRuntimeModule.resolveThemeSelectLabel,
  resolveThemeDropdownToggleState: themeSettingsRuntimeModule.resolveThemeDropdownToggleState,
  resolveThemeBindingState: themeSettingsRuntimeModule.resolveThemeBindingState,
  resolveThemeOptionValue: themeSettingsRuntimeModule.resolveThemeOptionValue,
  resolveThemeOptionSelectedState: themeSettingsRuntimeModule.resolveThemeOptionSelectedState
};

const themeSettingsHostRuntime = {
  applyThemeSettingsUi
};
const themeSettingsPageHostRuntime = {
  applyThemeSettingsPageInit
};

function ensureThemeSettingsGlobals(): void {
  if (!globalWindow.CoreThemeSettingsRuntime) {
    globalWindow.CoreThemeSettingsRuntime = themeSettingsRuntime;
  }
  if (!globalWindow.CoreThemeSettingsHostRuntime) {
    globalWindow.CoreThemeSettingsHostRuntime = themeSettingsHostRuntime;
  }
  if (!globalWindow.CoreThemeSettingsPageHostRuntime) {
    globalWindow.CoreThemeSettingsPageHostRuntime = themeSettingsPageHostRuntime;
  }
}

function storageWindowLike(): Record<string, unknown> {
  // SAFETY: resolveStorageByName reads only the named Web Storage property from Window.
  return window as unknown as Record<string, unknown>;
}

function isEnglishUi(): boolean {
  const storageLike = resolveStorageByName({
    windowLike: storageWindowLike(),
    storageName: "localStorage"
  });
  const lang = typeof globalWindow.UII18N?.getLanguage === "function"
    ? globalWindow.UII18N.getLanguage()
    : safeReadStorageItem({ storageLike, key: "ui_language_v1" }) || "zh";
  return String(lang || "").toLowerCase().startsWith("en");
}

function localStorageLike(): ReturnType<typeof resolveStorageByName> {
  return resolveStorageByName({
    windowLike: storageWindowLike(),
    storageName: "localStorage"
  });
}

function syncDisplayModeControls(): void {
  const isEn = isEnglishUi();
  const mode = readDisplayModePreference(window);
  const labels: Record<DisplayMode, [string, string]> = {
    auto: ["系统", "System"],
    day: ["浅色", "Light"],
    night: ["深色", "Dark"]
  };
  const group = document.querySelector<HTMLElement>(".palette-display-mode-switch");
  const trigger = document.querySelector<HTMLElement>(".palette-display-mode-trigger");
  const modeLabel = labels[mode]?.[isEn ? 1 : 0] || mode;
  group?.setAttribute("aria-label", isEn ? "Display mode" : "显示模式");
  trigger?.setAttribute("aria-label", isEn ? `Display mode: ${modeLabel}` : `显示模式：${modeLabel}`);
  trigger?.setAttribute("title", isEn ? `Display mode: ${modeLabel}` : `显示模式：${modeLabel}`);
  trigger?.setAttribute("data-current-display-mode", mode);
  const eyebrow = trigger?.querySelector<HTMLElement>(".palette-display-mode-eyebrow");
  const current = trigger?.querySelector<HTMLElement>(".palette-display-mode-current");
  if (eyebrow) eyebrow.textContent = isEn ? "Appearance" : "外观";
  if (current) current.textContent = modeLabel;
  document.querySelectorAll<HTMLButtonElement>("button[data-display-mode]").forEach((button) => {
    const value = button.dataset.displayMode as DisplayMode;
    const active = value === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-checked", String(active));
    const label = button.querySelector<HTMLElement>(".palette-menu-option-label");
    if (label) label.textContent = labels[value]?.[isEn ? 1 : 0] || value;
  });
}

function bindDisplayModeControls(): void {
  const storageLike = resolveStorageByName({
    windowLike: storageWindowLike(),
    storageName: "localStorage"
  });
  document.querySelectorAll<HTMLButtonElement>("button[data-display-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.displayMode as DisplayMode;
      if (mode !== "auto" && mode !== "day" && mode !== "night") return;
      const runtime = globalWindow.CoreNightModeRuntime;
      if (typeof runtime?.setDisplayMode === "function") {
        runtime.setDisplayMode(mode);
      } else {
        safeSetStorageItem({ storageLike, key: DISPLAY_MODE_STORAGE_KEY, value: mode });
        syncDisplayModeAttributes(document, window);
      }
      const resolved = syncDisplayModeAttributes(document, window);
      syncDisplayModeControls();
      window.dispatchEvent(new CustomEvent("displaymodechange", { detail: resolved }));
      button.closest<HTMLDetailsElement>(".palette-settings-menu")?.removeAttribute("open");
    });
  });
  syncDisplayModeControls();
}

function resolveCustomTimerPreviewStyleSlot(parent: number): number {
  const index = CUSTOM_TIMER_PARENT_VALUES[customTimerFamily].indexOf(parent);
  return CUSTOM_TIMER_PREVIEW_STYLE_SLOTS[Math.min(Math.max(index, 0), CUSTOM_TIMER_PREVIEW_STYLE_SLOTS.length - 1)];
}

function createCustomTimerPreviewLegend(value: number, styleSlot: number): HTMLDivElement {
  const legend = document.createElement("div");
  legend.className = `timertile custom-secondary-timer-preview-legend timer-legend-${styleSlot}`;
  legend.textContent = String(value);
  legend.style.fontSize = resolveSecondaryTimerLegendFontSize(value);
  return legend;
}

function createCustomTimerPreviewTime(text: string): HTMLDivElement {
  const timer = document.createElement("div");
  timer.className = "timertile custom-secondary-timer-preview-time";
  timer.textContent = text;
  return timer;
}

function renderCustomTimerPreview(savedText: string): void {
  const list = document.getElementById("custom-secondary-timer-preview-list");
  const empty = document.getElementById("custom-secondary-timer-preview-empty");
  const title = document.getElementById("custom-secondary-timer-preview-title");
  const hint = document.querySelector(".custom-secondary-timer-preview-head small");
  if (!list || !empty) return;
  const isEnglish = isEnglishUi();
  if (title) title.textContent = isEnglish ? "Saved rules preview" : "已保存规则预览";
  if (hint) hint.textContent = isEnglish ? "Select a parent to expand" : "点击母计时器展开";
  empty.textContent = isEnglish
    ? "Save rules to preview their expanded hierarchy here."
    : "保存规则后，可在这里预览展开层级。";
  list.replaceChildren();

  const parsed = parseCustomSecondaryTimerRules({
    text: savedText,
    family: customTimerFamily,
    parentValues: CUSTOM_TIMER_PARENT_VALUES[customTimerFamily]
  });
  const groups = new Map<number, CustomSecondaryTimerRule[]>();
  for (const rule of parsed.rules) {
    const rules = groups.get(rule.parent) || [];
    rules.push(rule);
    groups.set(rule.parent, rules);
  }
  empty.hidden = groups.size > 0;

  for (const [parent, rules] of groups) {
    const group = document.createElement("section");
    group.className = "custom-secondary-timer-preview-group";
    const childrenId = `custom-secondary-timer-preview-children-${customTimerFamily}-${parent}`;
    const styleSlot = resolveCustomTimerPreviewStyleSlot(parent);
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "custom-secondary-timer-preview-parent";
    trigger.dataset.timerPreviewParent = String(parent);
    trigger.setAttribute("aria-controls", childrenId);
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", isEnglish ? `Expand ${parent} sub-timers` : `展开 ${parent} 子计时器`);
    trigger.append(createCustomTimerPreviewLegend(parent, styleSlot), createCustomTimerPreviewTime("00:00.000"));

    const children = document.createElement("div");
    children.id = childrenId;
    children.hidden = true;
    for (const rule of rules) {
      const level = Math.max(1, rule.values.length - 1);
      const row = document.createElement("div");
      row.className = "custom-secondary-timer-preview-child";
      row.dataset.timerPreviewChild = String(parent);
      row.dataset.timerPreviewLevel = String(level);
      row.dataset.timerPreviewRule = rule.expression;
      row.style.setProperty("--timer-preview-level", String(level));
      row.append(
        createCustomTimerPreviewLegend(rule.values[rule.values.length - 1] || parent, styleSlot),
        createCustomTimerPreviewTime("—")
      );
      row.setAttribute("title", rule.expression);
      children.append(row);
    }
    trigger.addEventListener("click", () => {
      const expanded = trigger.getAttribute("aria-expanded") !== "true";
      trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
      children.hidden = !expanded;
    });
    group.append(trigger, children);
    list.append(group);
  }

  const syncTimerLegendStyles = globalWindow.ThemeManager?.syncTimerLegendStyles;
  if (typeof syncTimerLegendStyles === "function") syncTimerLegendStyles.call(globalWindow.ThemeManager);
}

function syncCustomTimerGenerator(resetRange: boolean): void {
  const startSelect = document.getElementById("custom-secondary-timer-range-start") as HTMLSelectElement | null;
  const endSelect = document.getElementById("custom-secondary-timer-range-end") as HTMLSelectElement | null;
  if (!startSelect || !endSelect) return;
  const values = CUSTOM_TIMER_PARENT_VALUES[customTimerFamily];
  const previousStart = resetRange ? "" : startSelect.value;
  const previousEnd = resetRange ? "" : endSelect.value;
  startSelect.replaceChildren();
  endSelect.replaceChildren();
  for (const value of values) {
    const startOption = document.createElement("option");
    startOption.value = String(value);
    startOption.textContent = String(value);
    startSelect.append(startOption);
    endSelect.append(startOption.cloneNode(true));
  }
  const fallback = String(values[0] || "");
  startSelect.value = values.includes(Number(previousStart)) ? previousStart : fallback;
  endSelect.value = values.includes(Number(previousEnd)) ? previousEnd : startSelect.value;
}

function syncCustomTimerEditor(reloadText: boolean): void {
  const input = document.getElementById("custom-secondary-timer-rules") as HTMLTextAreaElement | null;
  const note = document.getElementById("custom-secondary-timer-note");
  const familyNote = document.getElementById("custom-secondary-timer-family");
  if (!input) return;
  if (reloadText) {
    input.value = readCustomSecondaryTimerRuleText(localStorageLike(), customTimerFamily);
    input.removeAttribute("aria-invalid");
    if (note) {
      note.textContent = "";
      note.classList.remove("ok", "err");
    }
  }
  const isEnglish = isEnglishUi();
  input.placeholder = customTimerFamily === "fibonacci" ? "13\n13+1\n13+2" : "32\n32+2\n32+4";
  if (familyNote) {
    familyNote.textContent = customTimerFamily === "fibonacci"
      ? (isEnglish ? "Shared by Fibonacci modes; one complete rule per line." : "Fibonacci 模式共享；每行一条完整规则。")
      : (isEnglish ? "Shared by power-of-two modes; one complete rule per line." : "2 的幂模式共享；每行一条完整规则。");
  }
  document.querySelectorAll<HTMLButtonElement>("[data-timer-family]").forEach((button) => {
    const active = button.dataset.timerFamily === customTimerFamily;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
    button.tabIndex = active ? 0 : -1;
  });
  syncCustomTimerGenerator(reloadText);
  renderCustomTimerPreview(readCustomSecondaryTimerRuleText(localStorageLike(), customTimerFamily));
}

function generateCustomTimerRules(): void {
  const input = document.getElementById("custom-secondary-timer-rules") as HTMLTextAreaElement | null;
  const startSelect = document.getElementById("custom-secondary-timer-range-start") as HTMLSelectElement | null;
  const endSelect = document.getElementById("custom-secondary-timer-range-end") as HTMLSelectElement | null;
  const note = document.getElementById("custom-secondary-timer-note");
  if (!input || !startSelect || !endSelect) return;
  input.value = generateRecommendedSecondaryTimerRuleText({
    family: customTimerFamily,
    parentValues: CUSTOM_TIMER_PARENT_VALUES[customTimerFamily],
    startParent: startSelect.value,
    endParent: endSelect.value
  });
  input.removeAttribute("aria-invalid");
  if (note) {
    note.textContent = isEnglishUi()
      ? "Recommended rules generated. Review them, then click Save rules."
      : "已生成推荐规则，请检查后点击保存规则。";
    note.classList.remove("ok", "err");
  }
}

function saveCustomTimerRules(): void {
  const input = document.getElementById("custom-secondary-timer-rules") as HTMLTextAreaElement | null;
  const note = document.getElementById("custom-secondary-timer-note");
  if (!input) return;
  const parsed = parseCustomSecondaryTimerRules({
    text: input.value,
    family: customTimerFamily,
    parentValues: CUSTOM_TIMER_PARENT_VALUES[customTimerFamily]
  });
  const isEnglish = isEnglishUi();
  if (parsed.errors.length > 0) {
    input.setAttribute("aria-invalid", "true");
    if (note) {
      note.textContent = parsed.errors.map((error) => (
        isEnglish ? `Line ${error.line}: ${error.message}` : `第 ${error.line} 行：${error.message}`
      )).join("\n");
      note.classList.remove("ok");
      note.classList.add("err");
    }
    return;
  }
  input.removeAttribute("aria-invalid");
  const saved = writeCustomSecondaryTimerRuleText(localStorageLike(), customTimerFamily, input.value);
  if (saved) renderCustomTimerPreview(input.value);
  if (note) {
    note.textContent = saved
      ? (isEnglish ? "Saved. Applies from the next game." : "已保存，将从下一局开始生效。")
      : (isEnglish ? "Unable to save rules." : "规则保存失败。");
    note.classList.toggle("ok", saved);
    note.classList.toggle("err", !saved);
  }
}

function initCustomTimerEditor(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-timer-family]").forEach((button) => {
    button.addEventListener("click", () => {
      customTimerFamily = button.dataset.timerFamily === "fibonacci" ? "fibonacci" : "pow2";
      syncCustomTimerEditor(true);
    });
  });
  document.getElementById("custom-secondary-timer-save")?.addEventListener("click", saveCustomTimerRules);
  document.getElementById("custom-secondary-timer-generate")?.addEventListener("click", generateCustomTimerRules);
  document.getElementById("custom-secondary-timer-range-start")?.addEventListener("change", () => {
    const startSelect = document.getElementById("custom-secondary-timer-range-start") as HTMLSelectElement | null;
    const endSelect = document.getElementById("custom-secondary-timer-range-end") as HTMLSelectElement | null;
    if (startSelect && endSelect && Number(endSelect.value) < Number(startSelect.value)) endSelect.value = startSelect.value;
  });
  document.getElementById("custom-secondary-timer-range-end")?.addEventListener("change", () => {
    const startSelect = document.getElementById("custom-secondary-timer-range-start") as HTMLSelectElement | null;
    const endSelect = document.getElementById("custom-secondary-timer-range-end") as HTMLSelectElement | null;
    if (startSelect && endSelect && Number(endSelect.value) < Number(startSelect.value)) startSelect.value = endSelect.value;
  });
  document.getElementById("custom-secondary-timer-clear")?.addEventListener("click", () => {
    const input = document.getElementById("custom-secondary-timer-rules") as HTMLTextAreaElement | null;
    if (input) input.value = "";
    saveCustomTimerRules();
  });
  syncCustomTimerEditor(true);
}

export function applyThemePageCopy(): void {
  const isEnglish = isEnglishUi();
  const title = isEnglish ? "Settings" : "\u8bbe\u7f6e";
  const subtitle = isEnglish
    ? "Manage timers, language, themes, and palettes in clearly grouped sections."
    : "\u96c6\u4e2d\u7ba1\u7406\u8ba1\u65f6\u5668\u3001\u754c\u9762\u8bed\u8a00\u3001\u4e3b\u9898\u4e0e\u8272\u677f\uff0c\u76f8\u5173\u9009\u9879\u6309\u7c7b\u522b\u6536\u7eb3\u3002";
  const copy = isEnglish
    ? {
        kicker: "2048 Settings",
        navHome: "Home",
        navTouch: "Touch Sensitivity",
        appearanceDisclosureTitle: "Appearance & Palette",
        appearanceDisclosureDesc: "Theme, palettes, and board preview",
        themeSelectLabel: "Select Theme",
        timerCategory: "Timer",
        appearanceCategory: "Appearance & Palette",
        guideCategory: "Beginner guides",
        customTimerTitle: "Timer",
        customTimerDesc: "Custom sub-timer rules",
        rulesLabel: "Rule text",
        saveRules: "Save rules",
        clearRules: "Clear",
        rangeStart: "Start parent timer",
        rangeEnd: "End parent timer",
        generateRules: "Generate recommended rules",
        generatorHint: "Generated rules replace the editor and remain unsaved until you click Save rules.",
        paletteList: "Palettes",
        paletteMappingNote: "Palette colors map to other board variants by tile level.",
        themePlaza: "Theme Plaza",
        create: "Create",
        rename: "Rename",
        remove: "Delete",
        exportLabel: "Export",
        importLabel: "Import",
        background: "Background",
        text: "Text",
        border: "Border",
        glow: "Glow",
        namePlaceholder: "Palette name",
        editorPanel: "Background Color",
        boardPreview: "Color Preview"
      }
    : {
        kicker: "2048 \u8bbe\u7f6e",
        navHome: "\u56de\u9996\u9875",
        navTouch: "\u89e6\u5c4f\u7075\u654f\u5ea6",
        appearanceDisclosureTitle: "\u5916\u89c2\u4e0e\u914d\u8272",
        appearanceDisclosureDesc: "\u4e3b\u9898\u3001\u8272\u677f\u4e0e\u68cb\u76d8\u9884\u89c8",
        themeSelectLabel: "\u9009\u62e9\u4e3b\u9898",
        timerCategory: "\u8ba1\u65f6\u5668",
        appearanceCategory: "\u5916\u89c2\u4e0e\u914d\u8272",
        guideCategory: "\u65b0\u624b\u6307\u5f15",
        customTimerTitle: "\u8ba1\u65f6\u5668",
        customTimerDesc: "\u81ea\u5b9a\u4e49\u5b50\u8ba1\u65f6\u5668\u89c4\u5219",
        rulesLabel: "\u89c4\u5219\u5185\u5bb9",
        saveRules: "\u4fdd\u5b58\u89c4\u5219",
        clearRules: "\u6e05\u7a7a",
        rangeStart: "\u8d77\u59cb\u6bcd\u8ba1\u65f6\u5668",
        rangeEnd: "\u7ed3\u675f\u6bcd\u8ba1\u65f6\u5668",
        generateRules: "\u751f\u6210\u63a8\u8350\u89c4\u5219",
        generatorHint: "\u751f\u6210\u7ed3\u679c\u4f1a\u66ff\u6362\u89c4\u5219\u5185\u5bb9\uff1b\u70b9\u51fb\u4fdd\u5b58\u524d\u4e0d\u4f1a\u751f\u6548\u3002",
        paletteList: "\u8272\u677f",
        paletteMappingNote: "\u8272\u677f\u989c\u8272\u4f1a\u6309\u65b9\u5757\u7b49\u7ea7\u6620\u5c04\u5230\u5176\u4ed6\u68cb\u76d8\u53d8\u4f53\u3002",
        themePlaza: "\u4e3b\u9898\u5e7f\u573a",
        create: "\u65b0\u5efa",
        rename: "\u91cd\u547d\u540d",
        remove: "\u5220\u9664",
        exportLabel: "\u5bfc\u51fa",
        importLabel: "\u5bfc\u5165",
        background: "\u80cc\u666f",
        text: "\u6587\u5b57",
        border: "\u8fb9\u6846",
        glow: "\u53d1\u5149",
        namePlaceholder: "\u8f93\u5165\u5f53\u524d\u4e3b\u9898\u540d\u79f0\uff08\u53ef\u7f16\u8f91\uff09",
        editorPanel: "\u80cc\u666f\u989c\u8272",
        boardPreview: "\u989c\u8272\u9884\u89c8"
      };

  document.title = `2048 ${title}`;

  const kicker = document.querySelector(".palette-kicker");
  const pageTitle = document.querySelector(".palette-title");
  const pageSubtitle = document.querySelector(".palette-subtitle");
  const navLinks = document.querySelectorAll(".palette-nav .palette-nav-btn");
  const appearanceDisclosureTitle = document.querySelector(".appearance-settings-disclosure-copy strong");
  const appearanceDisclosureDesc = document.querySelector(".appearance-settings-disclosure-copy small");
  const themeSelectLabel = document.querySelector(".theme-selection-col > label");
  const listTitle = document.querySelector(".palette-sidebar .panel-head h2");
  const paletteMappingNote = document.querySelector(".palette-variant-note");
  const themePlazaLink = document.getElementById("palette-theme-plaza-link");
  const createButton = document.getElementById("palette-create-btn");
  const renameButton = document.getElementById("palette-rename-btn");
  const deleteButton = document.getElementById("palette-delete-btn");
  const exportButton = document.getElementById("palette-export-btn");
  const importButton = document.getElementById("palette-import-btn");
  const nameInput = document.getElementById("palette-name-input");
  const editorPanelHead = document.getElementById("palette-editor-panel-head");
  const previewPanelHead = document.getElementById("palette-preview-panel-head");
  const dimensionTabs = document.querySelectorAll(".palette-dimension-tab");
  const dimensionTabList = document.getElementById("palette-dimension-tabs");
  const appearanceCategoryTitle = document.querySelector('.settings-category-link[href="#appearance-settings"] strong');
  const timerCategoryTitle = document.querySelector('.settings-category-link[href="#timer-settings"] strong');
  const guideCategoryTitle = document.querySelector('.settings-category-link[href="#contextual-guide-settings"] strong');
  const customTimerTitle = document.querySelector(".settings-disclosure-copy strong");
  const customTimerDesc = document.querySelector(".settings-disclosure-copy small");
  const rulesLabel = document.querySelector(".custom-secondary-timer-label");
  const saveRules = document.getElementById("custom-secondary-timer-save");
  const clearRules = document.getElementById("custom-secondary-timer-clear");
  const rangeStart = document.querySelector(".custom-secondary-timer-range-start-label");
  const rangeEnd = document.querySelector(".custom-secondary-timer-range-end-label");
  const generateRules = document.getElementById("custom-secondary-timer-generate");
  const generatorHint = document.querySelector(".custom-secondary-timer-generator-hint");

  if (kicker) kicker.textContent = copy.kicker;
  if (pageTitle) pageTitle.textContent = title;
  if (pageSubtitle) pageSubtitle.textContent = subtitle;
  if (navLinks[0]) navLinks[0].textContent = copy.navHome;
  if (navLinks[1]) navLinks[1].textContent = copy.navTouch;
  if (appearanceDisclosureTitle) appearanceDisclosureTitle.textContent = copy.appearanceDisclosureTitle;
  if (appearanceDisclosureDesc) appearanceDisclosureDesc.textContent = copy.appearanceDisclosureDesc;
  if (themeSelectLabel) themeSelectLabel.textContent = copy.themeSelectLabel;
  if (listTitle) listTitle.textContent = copy.paletteList;
  if (paletteMappingNote) paletteMappingNote.textContent = copy.paletteMappingNote;
  if (themePlazaLink) themePlazaLink.textContent = copy.themePlaza;
  if (createButton) createButton.textContent = copy.create;
  if (renameButton) renameButton.textContent = copy.rename;
  if (deleteButton) deleteButton.textContent = copy.remove;
  if (exportButton) exportButton.textContent = copy.exportLabel;
  if (importButton) importButton.textContent = copy.importLabel;
  if (nameInput) nameInput.setAttribute("placeholder", copy.namePlaceholder);
  if (editorPanelHead) editorPanelHead.textContent = copy.editorPanel;
  if (previewPanelHead) previewPanelHead.textContent = copy.boardPreview;
  if (dimensionTabList) dimensionTabList.setAttribute("aria-label", isEnglish ? "Color Dimensions" : "\u989c\u8272\u7ef4\u5ea6");
  if (dimensionTabs[0]) dimensionTabs[0].textContent = copy.background;
  if (dimensionTabs[1]) dimensionTabs[1].textContent = copy.text;
  if (dimensionTabs[2]) dimensionTabs[2].textContent = copy.border;
  if (dimensionTabs[3]) dimensionTabs[3].textContent = copy.glow;
  if (appearanceCategoryTitle) appearanceCategoryTitle.textContent = copy.appearanceCategory;
  if (timerCategoryTitle) timerCategoryTitle.textContent = copy.timerCategory;
  if (guideCategoryTitle) guideCategoryTitle.textContent = copy.guideCategory;
  document.querySelector(".settings-category-nav")?.setAttribute("aria-label", isEnglish ? "Settings categories" : "\u8bbe\u7f6e\u5206\u7c7b");
  document.querySelector(".custom-secondary-timer-family-tabs")?.setAttribute(
    "aria-label",
    isEnglish ? "Sub-timer ruleset" : "\u5b50\u8ba1\u65f6\u5668\u89c4\u5219\u4f53\u7cfb"
  );
  if (customTimerTitle) customTimerTitle.textContent = copy.customTimerTitle;
  if (customTimerDesc) customTimerDesc.textContent = copy.customTimerDesc;
  if (rulesLabel) rulesLabel.textContent = copy.rulesLabel;
  if (saveRules) saveRules.textContent = copy.saveRules;
  if (clearRules) clearRules.textContent = copy.clearRules;
  if (rangeStart) rangeStart.textContent = copy.rangeStart;
  if (rangeEnd) rangeEnd.textContent = copy.rangeEnd;
  if (generateRules) generateRules.textContent = copy.generateRules;
  if (generatorHint) generatorHint.textContent = copy.generatorHint;
  syncCustomTimerEditor(false);
}

function syncSettingsBookmarkPosition(): void {
  const navigation = document.querySelector<HTMLElement>(".settings-category-nav");
  const activeLink = document.querySelector<HTMLAnchorElement>(".settings-category-link.is-active");

  if (!navigation || !activeLink) return;

  const bookmarkHeight = 10;
  const offset = activeLink.offsetTop + ((activeLink.offsetHeight - bookmarkHeight) / 2);
  navigation.style.setProperty("--settings-bookmark-y", `${offset}px`);
}

function setActiveSettingsCategory(activeId: SettingsSectionId): void {
  for (const id of SETTINGS_SECTION_IDS) {
    const active = id === activeId;
    const link = document.querySelector<HTMLAnchorElement>(`.settings-category-link[href="#${id}"]`);
    if (link) {
      link.classList.toggle("is-active", active);
      link.setAttribute("aria-current", active ? "location" : "false");
    }
  }

  syncSettingsBookmarkPosition();
}

function openAndScrollSettingsCategory(targetId: SettingsSectionId): void {
  const section = document.getElementById(targetId);
  const disclosure = section?.querySelector<HTMLDetailsElement>("details");
  if (disclosure) disclosure.open = true;
  section?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindSettingsDisclosureLock(): void {
  document.querySelectorAll<HTMLDetailsElement>(".settings-disclosure").forEach((disclosure) => {
    disclosure.open = true;
    disclosure.querySelector("summary")?.addEventListener("click", (event) => event.preventDefault());
  });
}

function bindPaletteLanguageButtons(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-ui-language]");
  const switchGroup = document.querySelector<HTMLElement>(".palette-language-switch");
  const trigger = document.querySelector<HTMLElement>(".palette-language-trigger");
  const sync = (): void => {
    const activeLanguage = isEnglishUi() ? "en" : "zh";
    const languageLabel = activeLanguage === "en" ? "English" : "中文";
    switchGroup?.setAttribute(
      "aria-label",
      activeLanguage === "en" ? "Language" : "界面语言"
    );
    trigger?.setAttribute(
      "aria-label",
      activeLanguage === "en" ? `Language: ${languageLabel}` : `界面语言：${languageLabel}`
    );
    trigger?.setAttribute(
      "title",
      activeLanguage === "en" ? `Language: ${languageLabel}` : `界面语言：${languageLabel}`
    );
    trigger?.setAttribute("data-current-language", activeLanguage);
    const badge = trigger?.querySelector<HTMLElement>(".palette-language-badge");
    const eyebrow = trigger?.querySelector<HTMLElement>(".palette-language-eyebrow");
    const current = trigger?.querySelector<HTMLElement>(".palette-language-current");
    if (badge) badge.textContent = activeLanguage === "en" ? "EN" : "中";
    if (eyebrow) eyebrow.textContent = activeLanguage === "en" ? "Language" : "语言";
    if (current) current.textContent = languageLabel;
    buttons.forEach((button) => {
      const active = button.dataset.uiLanguage === activeLanguage;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-checked", active ? "true" : "false");
      button.setAttribute(
        "aria-label",
        activeLanguage === "en"
          ? (button.dataset.uiLanguage === "en" ? "Current language: English" : "Switch to Chinese")
          : (button.dataset.uiLanguage === "zh" ? "当前语言：中文" : "切换到英文")
      );
    });
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const language = button.dataset.uiLanguage === "en" ? "en" : "zh";
      globalWindow.UII18N?.setLanguage?.(language);
      sync();
      button.closest<HTMLDetailsElement>(".palette-settings-menu")?.removeAttribute("open");
    });
  });
  window.addEventListener("uilanguagechange", sync);
  sync();
}

export function bindPaletteSettingsMenuDismissal(): void {
  const menus = [...document.querySelectorAll<HTMLDetailsElement>(".palette-settings-menu")];
  menus.forEach((menu) => {
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      menus.forEach((other) => {
        if (other !== menu) other.removeAttribute("open");
      });
    });
  });
  document.addEventListener("click", (event) => {
    const target = event.target as Node | null;
    menus.forEach((menu) => {
      if (menu.open && target && !menu.contains(target)) menu.removeAttribute("open");
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openMenu = menus.find((menu) => menu.open);
    if (!openMenu) return;
    openMenu.removeAttribute("open");
    openMenu.querySelector<HTMLElement>("summary")?.focus();
  });
}

function releaseSettingsCategoryScrollLock(): void {
  settingsCategoryScrollLock = null;
  if (settingsCategoryScrollUnlockTimer !== undefined) {
    window.clearTimeout(settingsCategoryScrollUnlockTimer);
    settingsCategoryScrollUnlockTimer = undefined;
  }
  if (settingsCategoryScrollUnlockListener) {
    window.removeEventListener("scrollend", settingsCategoryScrollUnlockListener);
    settingsCategoryScrollUnlockListener = undefined;
  }
}

function lockSettingsCategoryDuringScroll(activeId: SettingsSectionId): void {
  releaseSettingsCategoryScrollLock();
  settingsCategoryScrollLock = activeId;
  settingsCategoryScrollUnlockListener = releaseSettingsCategoryScrollLock;
  window.addEventListener("scrollend", settingsCategoryScrollUnlockListener, { once: true });
  settingsCategoryScrollUnlockTimer = window.setTimeout(releaseSettingsCategoryScrollLock, 700);
}

export function syncSettingsCategory(): void {
  const targetId = SETTINGS_SECTION_IDS.find((id) => window.location.hash === `#${id}`);
  const activeId = targetId ?? "appearance-settings";
  setActiveSettingsCategory(activeId);

  if (!targetId) return;
  openAndScrollSettingsCategory(targetId);
}

export function bindSettingsCategoryNavigation(): void {
  for (const id of SETTINGS_SECTION_IDS) {
    document.querySelector<HTMLAnchorElement>(`.settings-category-link[href="#${id}"]`)?.addEventListener("click", (event) => {
      event.preventDefault();
      if (window.location.hash !== `#${id}`) window.history.pushState(null, "", `#${id}`);
      lockSettingsCategoryDuringScroll(id);
      setActiveSettingsCategory(id);
      openAndScrollSettingsCategory(id);
    });
  }
}

export function syncSettingsCategoryFromEntries(entries: IntersectionObserverEntry[]): void {
  if (settingsCategoryScrollLock) {
    setActiveSettingsCategory(settingsCategoryScrollLock);
    return;
  }
  for (const entry of entries) {
    const id = entry.target.id as SettingsSectionId;
    if (SETTINGS_SECTION_IDS.includes(id)) {
      settingsSectionVisibility.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
    }
  }

  const currentId = SETTINGS_SECTION_IDS.find((id) =>
    document.querySelector(`.settings-category-link[href="#${id}"]`)?.classList.contains("is-active")
  ) ?? "appearance-settings";
  let activeId = currentId;
  let activeRatio = settingsSectionVisibility.get(currentId) ?? 0;

  for (const id of SETTINGS_SECTION_IDS) {
    const ratio = settingsSectionVisibility.get(id) ?? 0;
    if (ratio > activeRatio) {
      activeId = id;
      activeRatio = ratio;
    }
  }

  setActiveSettingsCategory(activeId);
}

function observeSettingsCategories(): void {
  if (typeof window.IntersectionObserver !== "function") return;

  const observer = new window.IntersectionObserver(syncSettingsCategoryFromEntries, {
    threshold: [0, 0.25, 0.5, 0.75, 1]
  });
  for (const id of SETTINGS_SECTION_IDS) {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  }
}

function resolvePaletteOwnerKey(
  storageLike: Storage,
): "guest" | `user:${number}` {
  const userId = Number(readStorageValue(storageLike, "2048_auth_userId_v1"));
  return getAuthToken({ storageLike }) &&
    Number.isSafeInteger(userId) &&
    userId >= 0
    ? `user:${userId}`
    : "guest";
}

function resolvePaletteAccountId(storageLike: Storage): number | null {
  const ownerKey = resolvePaletteOwnerKey(storageLike);
  if (!ownerKey.startsWith("user:")) return null;
  const accountId = Number(ownerKey.slice("user:".length));
  return Number.isSafeInteger(accountId) && accountId >= 0 ? accountId : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function bindAccountPaletteSync(): void {
  const themeManager = globalWindow.ThemeManager as PalettePageThemeManager;
  const storageLike = createBrowserStorageAccess().local();
  if (!globalWindow.ThemeManager || !storageLike) return;
  const accountStorage = storageLike;

  const session = getAccountPaletteSessionController();
  const client = createAccountPaletteV2Client({ storageLike: accountStorage });
  const plazaClient = createThemePlazaClient();
  let shareCapabilities: ThemePlazaCapabilities | null = null;
  const submissionNotice = createThemePlazaSubmissionNotice({
    language: () => (isEnglishUi() ? "en" : "zh"),
  });
  globalWindow.ThemePlazaSubmissionNotice = submissionNotice;
  const shareButton = document.getElementById(
    "palette-share-btn",
  ) as HTMLButtonElement | null;
  if (shareButton) {
    shareButton.disabled = true;
    shareButton.textContent = isEnglishUi()
      ? "Checking share availability…"
      : "正在检查分享资格…";
  }

  let outbox: ReturnType<typeof createAccountPaletteOutbox> | null = null;
  let pageSync: ReturnType<
    typeof createAccountPalettePageSyncController
  > | null = null;
  let outboxStore: ReturnType<typeof createIndexedDbPaletteOutboxStore> | null =
    null;

  try {
    outboxStore = createIndexedDbPaletteOutboxStore();
    outbox = createAccountPaletteOutbox({
      store: outboxStore,
      ownerId: `palette-page-${createPaletteUuidV4()}`,
      windowLike: window,
      sender: (operation) => client.send(operation),
    });
  } catch {
    outbox = null;
    outboxStore = null;
  }

  function setShareButtonState(
    enabled: boolean,
    zh: string,
    en: string,
    title = "",
  ): void {
    if (!shareButton) return;
    shareButton.disabled = !enabled;
    shareButton.textContent = isEnglishUi() ? en : zh;
    shareButton.title = title;
  }

  async function syncShareAvailability(
    refreshCapabilities = false,
  ): Promise<void> {
    if (!shareButton) return;
    shareButton.disabled = true;
    try {
      if (refreshCapabilities || !shareCapabilities)
        shareCapabilities = await plazaClient.capabilities();
      const capabilities = shareCapabilities;
      if (!capabilities.shareEnabled) {
        setShareButtonState(
          false,
          "分享功能准备中",
          "Sharing coming soon",
        );
        return;
      }
      if (!pageSync) {
        setShareButtonState(false, "登录后分享", "Sign in to share");
        return;
      }
      const eligibility = await pageSync.themePlazaEligibility();
      const states: Record<string, [string, string]> = {
        guest: ["登录后分享", "Sign in to share"],
        not_custom: ["请先创建副本后分享", "Create a copy to share"],
        dirty: ["请先保存当前色板", "Save this palette first"],
        pending_write: ["当前色板等待同步", "This palette is waiting to sync"],
        paused_account: ["账号同步已暂停", "Account sync is paused"],
        duplicate_existing: ["请先处理当前重复色板", "Resolve this duplicate first"],
        capacity_full: ["当前色板尚未上传", "This palette is not uploaded"],
        base_revision_expired: ["当前色板需要重新同步", "This palette needs a fresh sync"],
        expired_operation: ["当前色板需要重新对账", "This palette needs reconciliation"],
        local_only: ["当前色板仅保存在设备", "This palette is device-only"],
        deleted: ["当前色板已删除", "This palette was deleted"],
      };
      if (!eligibility.eligible) {
        const label = states[eligibility.status] || ["当前色板不可分享", "This palette cannot be shared"];
        setShareButtonState(false, label[0], label[1]);
        return;
      }
      setShareButtonState(true, "分享到主题广场", "Share to Theme Plaza");
    } catch {
      setShareButtonState(false, "分享状态不可用", "Share status unavailable");
    }
  }

  async function submitActivePalette(): Promise<void> {
    if (!shareButton || !pageSync) return;
    const eligibility = await pageSync.themePlazaEligibility();
    if (
      !eligibility.eligible ||
      !eligibility.paletteId ||
      eligibility.revision == null
    ) {
      await syncShareAvailability();
      return;
    }
    const palettes = themeManager.getCustomTilePalettes?.call(themeManager);
    const active = Array.isArray(palettes)
      ? palettes.find((item) => record(item)?.id === eligibility.paletteId)
      : null;
    const prompt = globalWindow.GameDialog?.prompt;
    const title =
      typeof prompt === "function"
        ? await prompt(
            isEnglishUi()
              ? "Public title (2–20 characters)"
              : "公开标题（2～20 个字符）",
            String(record(active)?.name || ""),
            { kind: "prompt" },
          )
        : null;
    if (!title) return;
    shareButton.disabled = true;
    try {
      await plazaClient.submit({
        paletteId: eligibility.paletteId,
        title,
        revision: eligibility.revision,
      });
      submissionNotice.show();
    } catch (error) {
      const note = document.getElementById("palette-note");
      if (note)
        note.textContent =
          error instanceof Error ? error.message : String(error);
    } finally {
      await syncShareAvailability();
    }
  }

  shareButton?.addEventListener("click", () => void submitActivePalette());

  function emitSyncState(
    outcome: { status?: string; code?: string; message?: string } | null,
  ): void {
    window.dispatchEvent(
      new CustomEvent("account-palette-sync-state", {
        detail: outcome || {},
      }),
    );
  }

  function isPaletteContentOperation(
    operation: PaletteOutboxOperation,
  ): boolean {
    return (
      operation.kind === "create" ||
      operation.kind === "save" ||
      operation.kind === "delete"
    );
  }

  function operationComesAfter(
    candidate: PaletteOutboxOperation,
    reference: PaletteOutboxOperation,
  ): boolean {
    return (
      candidate.createdAt > reference.createdAt ||
      (candidate.createdAt === reference.createdAt &&
        candidate.key.localeCompare(reference.key) > 0)
    );
  }

  function hasNewerPaletteIntent(
    operation: PaletteOutboxOperation,
    operations: PaletteOutboxOperation[],
  ): boolean {
    if (!isPaletteContentOperation(operation)) return false;
    return operations.some(
      (candidate) =>
        candidate.accountId === operation.accountId &&
        candidate.paletteId === operation.paletteId &&
        isPaletteContentOperation(candidate) &&
        operationComesAfter(candidate, operation),
    );
  }

  function latestOutboxOperations(
    operations: PaletteOutboxOperation[],
  ): PaletteOutboxOperation[] {
    const latest = new Map<string, PaletteOutboxOperation>();
    for (const operation of operations) {
      const key = isPaletteContentOperation(operation)
        ? `palette:${operation.paletteId}`
        : operation.kind;
      const previous = latest.get(key);
      if (!previous || operationComesAfter(operation, previous)) {
        latest.set(key, operation);
      }
    }
    return Array.from(latest.values());
  }

  function reconcileOutboxSnapshot(
    operations: PaletteOutboxOperation[],
  ): boolean {
    let rekeyed = false;
    for (const operation of operations) {
      const result = pageSync?.reconcileOperation(operation, {
        applyLocal: !hasNewerPaletteIntent(operation, operations),
      });
      if (result?.rekeyedPaletteId) rekeyed = true;
    }
    return rekeyed;
  }

  function emitOperationState(operation: PaletteOutboxOperation): void {
    if (operation.status === "pending" || operation.status === "retry_wait") {
      emitSyncState({
        status: "queued",
        code: operation.lastError || "PALETTE_SAVED_TO_DEVICE",
      });
    } else if (operation.status === "paused_account") {
      emitSyncState({
        status: "paused_account",
        code: operation.lastError || operation.pauseReason || "ACCOUNT_PAUSED",
      });
    } else if (
      operation.status === "duplicate_existing" ||
      operation.status === "capacity_full" ||
      operation.status === "base_revision_expired" ||
      operation.status === "expired_operation"
    ) {
      emitSyncState({
        status: operation.status,
        code:
          operation.result?.code || operation.lastError || operation.status,
      });
    } else if (
      operation.status === "saved" ||
      operation.status === "merged" ||
      operation.status === "unchanged" ||
      operation.status === "conflict_copy" ||
      operation.status === "deleted"
    ) {
      emitSyncState({ status: operation.status, code: operation.status });
    }
  }

  if (outbox) {
    outbox.subscribe((change) => {
      const activeAccountId = resolvePaletteAccountId(accountStorage);
      if (change.operation.accountId !== activeAccountId) return;
      void outbox
        ?.list(change.operation.accountId)
        .then((operations) => {
          if (
            change.operation.accountId !==
            resolvePaletteAccountId(accountStorage)
          )
            return;
          const superseded = hasNewerPaletteIntent(
            change.operation,
            operations,
          );
          pageSync?.reconcileOperation(change.operation, {
            applyLocal: !superseded,
          });
          if (!superseded) emitOperationState(change.operation);
          void syncShareAvailability();
        })
        .catch(() => {
          emitSyncState({
            status: "failed",
            code: "PALETTE_OUTBOX_RECONCILE_FAILED",
          });
        });
    });
  }

  function installPageSync(accountId: number | null): void {
    pageSync?.dispose();

    const installLeaveHandler = (): void => {
      globalWindow.AccountPalettePageLeaveHandler = async () => {
        const draftState = record(
          themeManager.getTilePaletteDraftState?.call(themeManager),
        );
        const syncState = pageSync?.status();
        const retryRequired = syncState?.status === "failed";
        if (draftState?.dirty !== true && !retryRequired) return true;
        const confirm = globalWindow.GameDialog?.confirm;
        if (typeof confirm !== "function") return false;
        const save = await confirm(
          isEnglishUi()
            ? "Save palette changes before leaving?"
            : "离开前保存色板修改吗？",
          {
            kind: "confirm",
            confirmText: isEnglishUi() ? "Save and continue" : "保存并继续",
            cancelText: isEnglishUi() ? "Discard changes" : "放弃修改",
          },
        );
        if (save) {
          const result =
            await globalWindow.AccountPaletteDraftSaveHandler?.(draftState || {});
          const resultRecord = record(result);
          return (
            !!resultRecord &&
            ![
              "failed",
              "needs_action",
              "duplicate_existing",
              "capacity_full",
              "base_revision_expired",
              "expired_operation",
            ].includes(String(resultRecord.status || ""))
          );
        }
        const discard = await confirm(
          isEnglishUi()
            ? "Discard this palette draft and leave?"
            : "放弃当前色板草稿并离开吗？",
          {
            kind: "danger",
            confirmText: isEnglishUi() ? "Discard changes" : "放弃修改",
            cancelText: isEnglishUi() ? "Cancel" : "取消",
          },
        );
        if (!discard) return false;
        themeManager.discardTilePaletteDraft?.call(themeManager);
        return true;
      };
    };

    if (!outbox || accountId == null) {
      pageSync = null;
      globalWindow.AccountPalettePageSync = undefined;
      globalWindow.AccountPaletteDuplicateConfirmHandler = async () => ({
        status: "failed",
        code: "PALETTE_ACCOUNT_REQUIRED",
      });
      globalWindow.AccountPaletteUseExistingHandler = async () => ({
        status: "failed",
        code: "PALETTE_ACCOUNT_REQUIRED",
      });
      globalWindow.AccountPaletteDraftSaveHandler = async () => {
        if (typeof themeManager.saveTilePaletteDraft === "function") {
          const saved =
            themeManager.saveTilePaletteDraft.call(themeManager) !== false;
          if (saved) themeManager.beginTilePaletteDraft?.call(themeManager);
          let outcome: { status: string; code?: string };
          if (!saved) {
            outcome = { status: "failed", code: "LOCAL_PERSIST_FAILED" };
          } else if (accountId == null) {
            outcome = { status: "local_only" };
          } else {
            outcome = {
              status: "failed",
              code: "PALETTE_OUTBOX_UNAVAILABLE",
            };
          }
          emitSyncState(outcome);
          return outcome;
        }
        const outcome = { status: "failed", code: "LOCAL_PERSIST_FAILED" };
        emitSyncState(outcome);
        return outcome;
      };
      installLeaveHandler();
      return;
    }
    pageSync = createAccountPalettePageSyncController({
      accountId,
      themeManager,
      outbox,
      sessionSnapshot: () => session.snapshot(),
      onStateChange: (outcome) => emitSyncState(outcome),
    });
    globalWindow.AccountPalettePageSync = pageSync;
    globalWindow.AccountPaletteDuplicateConfirmHandler = async (paletteId) =>
      pageSync?.confirmDuplicate(paletteId);
    globalWindow.AccountPaletteUseExistingHandler = async (
      paletteId,
      existingPaletteId,
    ) => pageSync?.useExistingPalette(paletteId, existingPaletteId);
    globalWindow.AccountPaletteDraftSaveHandler = async () =>
      pageSync?.saveDraft();
    installLeaveHandler();
  }

  if (!document.documentElement.dataset.paletteLeaveGuardBound) {
    document.documentElement.dataset.paletteLeaveGuardBound = "1";
    document.addEventListener(
      "click",
      (event) => {
        const mouseEvent = event as MouseEvent;
        if (
          mouseEvent.defaultPrevented ||
          mouseEvent.button !== 0 ||
          mouseEvent.metaKey ||
          mouseEvent.ctrlKey ||
          mouseEvent.shiftKey ||
          mouseEvent.altKey
        )
          return;
        const target = mouseEvent.target as Element | null;
        const anchor = target?.closest<HTMLAnchorElement>("a[href]");
        if (
          !anchor ||
          anchor.target === "_blank" ||
          anchor.hasAttribute("download")
        )
          return;
        const href = anchor.href;
        if (!href) return;
        let destination: URL;
        try {
          destination = new URL(href, window.location.href);
        } catch {
          return;
        }
        if (
          destination.origin === window.location.origin &&
          destination.pathname === window.location.pathname &&
          destination.search === window.location.search &&
          destination.hash
        )
          return;
        const draftState = record(
          themeManager.getTilePaletteDraftState?.call(themeManager),
        );
        const syncState = pageSync?.status();
        if (draftState?.dirty !== true && syncState?.status !== "failed")
          return;
        const leave = globalWindow.AccountPalettePageLeaveHandler;
        if (typeof leave !== "function") return;
        mouseEvent.preventDefault();
        void leave().then((allowed) => {
          if (allowed) window.location.assign(href);
        });
      },
      true,
    );
  }

  function localPaletteIdentityPresent(paletteId: string): boolean {
    const getCustom = themeManager.getCustomTilePalettes;
    const current =
      typeof getCustom === "function" ? getCustom.call(themeManager) : null;
    return (
      Array.isArray(current) &&
      current.some((item) => record(item)?.id === paletteId)
    );
  }

  function blocksCloudApply(operation: PaletteOutboxOperation): boolean {
    if (
      (operation.kind === "create" || operation.kind === "save") &&
      (operation.status === "duplicate_existing" ||
        operation.status === "capacity_full" ||
        operation.status === "base_revision_expired" ||
        operation.status === "expired_operation")
    ) {
      return localPaletteIdentityPresent(operation.paletteId);
    }
    return ![
      "saved",
      "merged",
      "unchanged",
      "conflict_copy",
      "deleted",
    ].includes(operation.status);
  }

  async function drainPendingOutbox(
    accountId: number,
  ): Promise<"none" | "blocked" | "drained"> {
    if (!outbox) return "none";
    let before = await outbox.list(accountId);
    const rekeyed = reconcileOutboxSnapshot(before);
    if (rekeyed) {
      await pageSync?.saveDraft();
      before = await outbox.list(accountId);
      reconcileOutboxSnapshot(before);
    }
    const effectiveBefore = latestOutboxOperations(before);
    if (!effectiveBefore.some((operation) => blocksCloudApply(operation)))
      return "none";
    await outbox.drain({ force: true });
    const after = await outbox.list(accountId);
    reconcileOutboxSnapshot(after);
    const blocked = latestOutboxOperations(after).filter((operation) =>
      blocksCloudApply(operation),
    );
    if (blocked.length === 0) return "drained";
    const latest = blocked.sort(
      (left, right) => right.updatedAt - left.updatedAt,
    )[0];
    emitSyncState({
      status:
        latest.status === "retry_wait" ||
        latest.status === "pending" ||
        latest.status === "sending"
          ? "queued"
          : latest.status,
      code: latest.lastError || latest.result?.code || latest.status,
    });
    return "blocked";
  }
  function resetDraftBaselineIfSafe(): void {
    const draftState = record(
      themeManager.getTilePaletteDraftState?.call(themeManager),
    );
    if (draftState?.dirty === true) return;
    pageSync?.syncBaseline({ resetDraft: true });
  }

  async function bootstrapPaletteSync(): Promise<void> {
    const accountId = resolvePaletteAccountId(accountStorage);
    installPageSync(accountId);
    if (accountId == null) {
      await syncShareAvailability(true);
      return;
    }
    const pendingState = await drainPendingOutbox(accountId);
    if (pendingState === "blocked") {
      await syncShareAvailability(true);
      return;
    }
    if (pendingState === "drained") session.reset();
    const result = await session.bootstrap();
    if (result.status === "failed") {
      emitSyncState({
        status: "failed",
        code: result.code || "ACCOUNT_PALETTE_BOOTSTRAP_FAILED",
      });
      return;
    }
    await session.loadLibrary();
    resetDraftBaselineIfSafe();
    if (outbox) void outbox.drain();
    await syncShareAvailability(true);
  }

  void bootstrapPaletteSync().catch((error) => {
    emitSyncState({
      status: "failed",
      code:
        error instanceof Error
          ? error.message
          : "ACCOUNT_PALETTE_BOOTSTRAP_FAILED",
    });
  });

  window.addEventListener("auth-session-change", () => {
    void bootstrapPaletteSync().catch((error) => {
      emitSyncState({
        status: "failed",
        code:
          error instanceof Error
            ? error.message
            : "ACCOUNT_PALETTE_BOOTSTRAP_FAILED",
      });
    });
  });

  window.addEventListener("tile-palette-document-change", () => {
    void syncShareAvailability();
  });
  window.addEventListener("uilanguagechange", () => {
    void syncShareAvailability();
  });

  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;
    pageSync?.dispose();
    outbox?.dispose();
  });
}
export function bootstrapPalettePage(): void {
  installPaletteLegacyRuntime();
  bindDisplayModeSync({ documentLike: document, windowLike: window });
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "palette");
  }
  ensureThemeSettingsGlobals();
  bindAccountPaletteSync();

  if (typeof applyThemeSettingsPageInit === "function") {
    applyThemeSettingsPageInit({
      themeSettingsHostRuntime,
      themeSettingsRuntime,
      documentLike: document,
      windowLike: window
    });
  } else {
    applyThemeSettingsUi({
      documentLike: document,
      windowLike: window,
      themeSettingsRuntime,
      themeManager: globalWindow.ThemeManager
    });
  }

  initCustomTimerEditor();
  bindSettingsDisclosureLock();
  bindPaletteSettingsMenuDismissal();
  bindPaletteLanguageButtons();
  bindDisplayModeControls();
  bindSettingsCategoryNavigation();
  syncSettingsCategory();
  window.setTimeout(observeSettingsCategories, 1000);
  applyThemePageCopy();
  window.setTimeout(() => {
    if (!window.location.hash && window.scrollY <= 8) setActiveSettingsCategory("appearance-settings");
  }, 0);
  window.addEventListener("hashchange", () => syncSettingsCategory());
  window.addEventListener("resize", syncSettingsBookmarkPosition);
  window.addEventListener("uilanguagechange", applyThemePageCopy);
  window.addEventListener("uilanguagechange", syncDisplayModeControls);
  window.addEventListener("storage", (event) => {
    if (!event.key || event.key === DISPLAY_MODE_STORAGE_KEY || event.key === LEGACY_NIGHT_BACKGROUND_STORAGE_KEY) {
      syncDisplayModeAttributes(document, window);
      syncDisplayModeControls();
    }
  });
}
