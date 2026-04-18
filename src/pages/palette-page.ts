import "../../js/theme_manager.js";
import "../../js/palette_page.js";
import "../../js/core_i18n_runtime.js";
import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";
import { applyThemeSettingsUi } from "../bootstrap/theme-settings-host";
import { applyThemeSettingsPageInit } from "../bootstrap/theme-settings-page-host";
import * as themeSettingsRuntimeModule from "../bootstrap/theme-settings";

const NIGHT_BACKGROUND_STORAGE_KEY = "settings_night_background_enabled_v1";

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

function applyThemePageCopy(): void {
  const lang = typeof globalWindow.UII18N?.getLanguage === "function"
    ? globalWindow.UII18N.getLanguage()
    : "zh";
  const isEnglish = String(lang || "").toLowerCase().startsWith("en");
  const title = isEnglish ? "Palette Center" : "\u8272\u677f\u4e2d\u5fc3";
  const subtitle = isEnglish
    ? "Manage board palettes by board type and color dimensions with live preview."
    : "\u6309\u68cb\u76d8\u7c7b\u578b\u4e0e\u914d\u8272\u7ef4\u5ea6\u7edf\u4e00\u7ba1\u7406\u989c\u8272\uff0c\u652f\u6301\u5bfc\u5165\u5bfc\u51fa\u4e0e\u5b9e\u65f6\u9884\u89c8\u3002";
  const pillText = isEnglish ? "Theme" : "\u4e3b\u9898";
  const copy = isEnglish
    ? {
        kicker: "2048 Palette Center",
        navHome: "Home",
        navPractice: "Practice Board",
        themeSelectLabel: "Select Theme",
        themePreviewLabel: "Theme Preview",
        boardSelectLabel: "Board Select",
        board2048: "2048",
        boardFib: "Fibonacci",
        themeModesTitle: "Theme & Modes",
        paletteList: "Palette List",
        currentPalette: "Current Palette",
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
        kicker: "2048 \u8272\u677f\u4e2d\u5fc3",
        navHome: "\u56de\u9996\u9875",
        navPractice: "\u7ec3\u4e60\u677f",
        themeSelectLabel: "\u9009\u62e9\u4e3b\u9898",
        themePreviewLabel: "\u914d\u8272\u9884\u89c8",
        boardSelectLabel: "\u68cb\u76d8\u9009\u62e9",
        board2048: "2048",
        boardFib: "\u6590\u6ce2\u90a3\u5951",
        themeModesTitle: "\u4e3b\u9898\u4e0e\u6a21\u5f0f",
        paletteList: "\u8272\u677f\u5217\u8868",
        currentPalette: "\u5f53\u524d\u8272\u677f",
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
  const themeCardTitle = document.querySelector(".palette-theme-card .panel-head h2");
  const panelPill = document.querySelector(".palette-theme-card .panel-pill");
  const navLinks = document.querySelectorAll(".palette-nav .palette-nav-btn");
  const themeSelectLabel = document.querySelector(".theme-selection-col > label");
  const themePreviewLabel = document.querySelector(".theme-preview-col > label");
  const boardSelectLabel = document.querySelector(".board-selection-col > label");
  const boardButtons = document.querySelectorAll(".palette-board-btn");
  const listTitle = document.querySelector(".palette-sidebar .panel-head h2");
  const currentPalette = document.getElementById("palette-current-name");
  const createButton = document.getElementById("palette-create-btn");
  const renameButton = document.getElementById("palette-rename-btn");
  const deleteButton = document.getElementById("palette-delete-btn");
  const exportButton = document.getElementById("palette-export-btn");
  const importButton = document.getElementById("palette-import-btn");
  const nameInput = document.getElementById("palette-name-input");
  const editorPanelHead = document.getElementById("palette-editor-panel-head");
  const previewPanelHead = document.getElementById("palette-preview-panel-head");
  const dimensionTabs = document.querySelectorAll(".palette-dimension-tab");

  if (kicker) kicker.textContent = copy.kicker;
  if (pageTitle) pageTitle.textContent = title;
  if (pageSubtitle) pageSubtitle.textContent = subtitle;
  if (themeCardTitle) themeCardTitle.textContent = copy.themeModesTitle;
  if (panelPill) panelPill.textContent = pillText;
  if (navLinks[0]) navLinks[0].textContent = copy.navHome;
  if (navLinks[1]) navLinks[1].textContent = copy.navPractice;
  if (themeSelectLabel) themeSelectLabel.textContent = copy.themeSelectLabel;
  if (themePreviewLabel) themePreviewLabel.textContent = copy.themePreviewLabel;
  if (boardSelectLabel) boardSelectLabel.textContent = copy.boardSelectLabel;
  if (boardButtons[0]) boardButtons[0].textContent = copy.board2048;
  if (boardButtons[1]) boardButtons[1].textContent = copy.boardFib;
  if (listTitle) listTitle.textContent = copy.paletteList;
  if (currentPalette && currentPalette.getAttribute("data-palette-name-bound") !== "1") {
    currentPalette.textContent = copy.currentPalette;
  }
  if (createButton) createButton.textContent = copy.create;
  if (renameButton) renameButton.textContent = copy.rename;
  if (deleteButton) deleteButton.textContent = copy.remove;
  if (exportButton) exportButton.textContent = copy.exportLabel;
  if (importButton) importButton.textContent = copy.importLabel;
  if (nameInput) nameInput.setAttribute("placeholder", copy.namePlaceholder);
  if (editorPanelHead) editorPanelHead.textContent = copy.editorPanel;
  if (previewPanelHead) previewPanelHead.textContent = copy.boardPreview;
  if (dimensionTabs[0]) dimensionTabs[0].textContent = copy.background;
  if (dimensionTabs[1]) dimensionTabs[1].textContent = copy.text;
  if (dimensionTabs[2]) dimensionTabs[2].textContent = copy.border;
  if (dimensionTabs[3]) dimensionTabs[3].textContent = copy.glow;
}

export function bootstrapPalettePage(): void {
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

  applyThemePageCopy();
  window.addEventListener("uilanguagechange", applyThemePageCopy);
}
