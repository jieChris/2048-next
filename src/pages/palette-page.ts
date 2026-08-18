import { installPaletteLegacyRuntime } from "../bootstrap/palette-legacy-runtime";
import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";
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

const NIGHT_BACKGROUND_STORAGE_KEY = "settings_night_background_enabled_v1";
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
  "timer-settings",
  "appearance-settings",
  "language-settings",
  "contextual-guide-settings",
] as const;
type SettingsSectionId = typeof SETTINGS_SECTION_IDS[number];
const settingsSectionVisibility = new Map<SettingsSectionId, number>();

const globalWindow = window as Window & {
  ThemeManager?: Record<string, unknown>;
  UII18N?: {
    getLanguage?: () => string;
  };
  CoreThemeSettingsRuntime?: typeof themeSettingsRuntime;
  CoreThemeSettingsHostRuntime?: {
    applyThemeSettingsUi: typeof applyThemeSettingsUi;
  };
  CoreThemeSettingsPageHostRuntime?: {
    applyThemeSettingsPageInit: typeof applyThemeSettingsPageInit;
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

function readNightBackgroundPreference(): boolean {
  const storageLike = resolveStorageByName({
    windowLike: window as unknown as Record<string, unknown>,
    storageName: "localStorage"
  });
  return (
    safeReadStorageItem({
      storageLike,
      key: NIGHT_BACKGROUND_STORAGE_KEY
    }) === "1"
  );
}

function syncNightBackgroundAttribute(): void {
  if (readNightBackgroundPreference()) {
    document.documentElement.setAttribute("data-night-background", "1");
    return;
  }
  document.documentElement.removeAttribute("data-night-background");
}

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

function isEnglishUi(): boolean {
  const storageLike = resolveStorageByName({
    windowLike: window as unknown as Record<string, unknown>,
    storageName: "localStorage"
  });
  const lang = typeof globalWindow.UII18N?.getLanguage === "function"
    ? globalWindow.UII18N.getLanguage()
    : safeReadStorageItem({ storageLike, key: "ui_language_v1" }) || "zh";
  return String(lang || "").toLowerCase().startsWith("en");
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
    input.value = readCustomSecondaryTimerRuleText(window.localStorage, customTimerFamily);
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
  renderCustomTimerPreview(readCustomSecondaryTimerRuleText(window.localStorage, customTimerFamily));
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
  const saved = writeCustomSecondaryTimerRuleText(window.localStorage, customTimerFamily, input.value);
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

function applyThemePageCopy(): void {
  const isEnglish = isEnglishUi();
  const title = isEnglish ? "Settings" : "\u8bbe\u7f6e";
  const subtitle = isEnglish
    ? "Manage timers, language, themes, and palettes in clearly grouped sections."
    : "\u96c6\u4e2d\u7ba1\u7406\u8ba1\u65f6\u5668\u3001\u754c\u9762\u8bed\u8a00\u3001\u4e3b\u9898\u4e0e\u8272\u677f\uff0c\u76f8\u5173\u9009\u9879\u6309\u7c7b\u522b\u6536\u7eb3\u3002";
  const copy = isEnglish
    ? {
        kicker: "2048 Settings",
        navHome: "Home",
        navPractice: "Practice Board",
        navTouch: "Touch Sensitivity",
        appearanceDisclosureTitle: "Appearance & Palette",
        appearanceDisclosureDesc: "Theme, palettes, and board preview",
        themeSelectLabel: "Select Theme",
        timerCategory: "Timer",
        appearanceCategory: "Appearance & Palette",
        languageCategory: "Language",
        languageDisclosureTitle: "Interface Language",
        languageDisclosureDesc: "Switch the website display language",
        customTimerTitle: "Timer",
        customTimerDesc: "Custom sub-timer rules",
        expandSettings: "Expand settings",
        collapseSettings: "Collapse settings",
        rulesLabel: "Rule text",
        saveRules: "Save rules",
        clearRules: "Clear",
        rangeStart: "Start parent timer",
        rangeEnd: "End parent timer",
        generateRules: "Generate recommended rules",
        generatorHint: "Generated rules replace the editor and remain unsaved until you click Save rules.",
        paletteList: "Palettes",
        paletteMappingNote: "Palette colors map to other board variants by tile level.",
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
        navPractice: "\u7ec3\u4e60\u677f",
        navTouch: "\u89e6\u5c4f\u7075\u654f\u5ea6",
        appearanceDisclosureTitle: "\u5916\u89c2\u4e0e\u914d\u8272",
        appearanceDisclosureDesc: "\u4e3b\u9898\u3001\u8272\u677f\u4e0e\u68cb\u76d8\u9884\u89c8",
        themeSelectLabel: "\u9009\u62e9\u4e3b\u9898",
        timerCategory: "\u8ba1\u65f6\u5668",
        appearanceCategory: "\u5916\u89c2\u4e0e\u914d\u8272",
        languageCategory: "\u754c\u9762\u8bed\u8a00",
        languageDisclosureTitle: "\u754c\u9762\u8bed\u8a00",
        languageDisclosureDesc: "\u5207\u6362\u7f51\u7ad9\u663e\u793a\u8bed\u8a00",
        customTimerTitle: "\u8ba1\u65f6\u5668",
        customTimerDesc: "\u81ea\u5b9a\u4e49\u5b50\u8ba1\u65f6\u5668\u89c4\u5219",
        expandSettings: "\u5c55\u5f00\u8bbe\u7f6e",
        collapseSettings: "\u6536\u8d77\u8bbe\u7f6e",
        rulesLabel: "\u89c4\u5219\u5185\u5bb9",
        saveRules: "\u4fdd\u5b58\u89c4\u5219",
        clearRules: "\u6e05\u7a7a",
        rangeStart: "\u8d77\u59cb\u6bcd\u8ba1\u65f6\u5668",
        rangeEnd: "\u7ed3\u675f\u6bcd\u8ba1\u65f6\u5668",
        generateRules: "\u751f\u6210\u63a8\u8350\u89c4\u5219",
        generatorHint: "\u751f\u6210\u7ed3\u679c\u4f1a\u66ff\u6362\u89c4\u5219\u5185\u5bb9\uff1b\u70b9\u51fb\u4fdd\u5b58\u524d\u4e0d\u4f1a\u751f\u6548\u3002",
        paletteList: "\u8272\u677f",
        paletteMappingNote: "\u8272\u677f\u989c\u8272\u4f1a\u6309\u65b9\u5757\u7b49\u7ea7\u6620\u5c04\u5230\u5176\u4ed6\u68cb\u76d8\u53d8\u4f53\u3002",
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
  const guideEntry = document.querySelector<HTMLAnchorElement>(".palette-guide-entry");
  const appearanceDisclosureTitle = document.querySelector(".appearance-settings-disclosure-copy strong");
  const appearanceDisclosureDesc = document.querySelector(".appearance-settings-disclosure-copy small");
  const languageDisclosureTitle = document.querySelector(".language-settings-disclosure-copy strong");
  const languageDisclosureDesc = document.querySelector(".language-settings-disclosure-copy small");
  const themeSelectLabel = document.querySelector(".theme-selection-col > label");
  const listTitle = document.querySelector(".palette-sidebar .panel-head h2");
  const paletteMappingNote = document.querySelector(".palette-variant-note");
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
  const categoryLinks = document.querySelectorAll(".settings-category-link");
  const customTimerTitle = document.querySelector(".settings-disclosure-copy strong");
  const customTimerDesc = document.querySelector(".settings-disclosure-copy small");
  const expandSettings = document.querySelector(".settings-disclosure-open");
  const collapseSettings = document.querySelector(".settings-disclosure-close");
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
  if (navLinks[1]) navLinks[1].textContent = copy.navPractice;
  if (navLinks[2]) navLinks[2].textContent = copy.navTouch;
  if (guideEntry) {
    guideEntry.textContent = isEnglish ? "Beginner guides" : "新手指引";
    guideEntry.setAttribute("aria-label", isEnglish ? "Open beginner guides" : "打开新手指引");
  }
  if (appearanceDisclosureTitle) appearanceDisclosureTitle.textContent = copy.appearanceDisclosureTitle;
  if (appearanceDisclosureDesc) appearanceDisclosureDesc.textContent = copy.appearanceDisclosureDesc;
  if (languageDisclosureTitle) languageDisclosureTitle.textContent = copy.languageDisclosureTitle;
  if (languageDisclosureDesc) languageDisclosureDesc.textContent = copy.languageDisclosureDesc;
  if (themeSelectLabel) themeSelectLabel.textContent = copy.themeSelectLabel;
  if (listTitle) listTitle.textContent = copy.paletteList;
  if (paletteMappingNote) paletteMappingNote.textContent = copy.paletteMappingNote;
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
  if (categoryLinks[0]) {
    const titleNode = categoryLinks[0].querySelector("strong");
    if (titleNode) titleNode.textContent = copy.timerCategory;
  }
  if (categoryLinks[1]) {
    const titleNode = categoryLinks[1].querySelector("strong");
    if (titleNode) titleNode.textContent = copy.appearanceCategory;
  }
  if (categoryLinks[2]) {
    const titleNode = categoryLinks[2].querySelector("strong");
    if (titleNode) titleNode.textContent = copy.languageCategory;
  }
  document.querySelector(".settings-category-nav")?.setAttribute("aria-label", isEnglish ? "Settings categories" : "\u8bbe\u7f6e\u5206\u7c7b");
  document.querySelector(".custom-secondary-timer-family-tabs")?.setAttribute(
    "aria-label",
    isEnglish ? "Sub-timer ruleset" : "\u5b50\u8ba1\u65f6\u5668\u89c4\u5219\u4f53\u7cfb"
  );
  if (customTimerTitle) customTimerTitle.textContent = copy.customTimerTitle;
  if (customTimerDesc) customTimerDesc.textContent = copy.customTimerDesc;
  if (expandSettings) expandSettings.textContent = copy.expandSettings;
  if (collapseSettings) collapseSettings.textContent = copy.collapseSettings;
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

export function syncSettingsCategory(): void {
  const targetId = SETTINGS_SECTION_IDS.find((id) => window.location.hash === `#${id}`);
  const activeId = targetId ?? "timer-settings";
  setActiveSettingsCategory(activeId);

  if (!targetId) return;
  openAndScrollSettingsCategory(targetId);
}

export function bindSettingsCategoryNavigation(): void {
  for (const id of SETTINGS_SECTION_IDS) {
    document.querySelector<HTMLAnchorElement>(`.settings-category-link[href="#${id}"]`)?.addEventListener("click", () => {
      setActiveSettingsCategory(id);
      openAndScrollSettingsCategory(id);
    });
  }
}

export function syncSettingsCategoryFromEntries(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    const id = entry.target.id as SettingsSectionId;
    if (SETTINGS_SECTION_IDS.includes(id)) {
      settingsSectionVisibility.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
    }
  }

  const currentId = SETTINGS_SECTION_IDS.find((id) =>
    document.querySelector(`.settings-category-link[href="#${id}"]`)?.classList.contains("is-active")
  ) ?? "timer-settings";
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

export function bootstrapPalettePage(): void {
  installPaletteLegacyRuntime();
  syncNightBackgroundAttribute();
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "palette");
  }
  window.addEventListener("storage", (event) => {
    if (!event || !event.key || event.key === NIGHT_BACKGROUND_STORAGE_KEY) {
      syncNightBackgroundAttribute();
    }
  });

  ensureThemeSettingsGlobals();

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
  bindSettingsCategoryNavigation();
  syncSettingsCategory();
  observeSettingsCategories();
  applyThemePageCopy();
  window.addEventListener("hashchange", () => syncSettingsCategory());
  window.addEventListener("resize", syncSettingsBookmarkPosition);
  window.addEventListener("uilanguagechange", applyThemePageCopy);
}
