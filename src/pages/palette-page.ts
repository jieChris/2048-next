import "../../js/theme_manager.js";
import "../../js/palette_page.js";
import "../../js/core_i18n_runtime.js";
import { applyThemeSettingsUi } from "../bootstrap/theme-settings-host";
import { applyThemeSettingsPageInit } from "../bootstrap/theme-settings-page-host";
import * as themeSettingsRuntimeModule from "../bootstrap/theme-settings";

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
  const title = isEnglish ? "Theme Settings" : "\u4e3b\u9898\u8bbe\u7f6e";
  const subtitle = isEnglish
    ? "Manage tile themes and palette colors with import/export and live preview."
    : "\u7edf\u4e00\u7ba1\u7406\u68cb\u5b50\u4e3b\u9898\u4e0e\u8272\u677f\u914d\u8272\uff0c\u652f\u6301\u5bfc\u5165\u3001\u5bfc\u51fa\u4e0e\u5b9e\u65f6\u9884\u89c8\u3002";
  const pillText = isEnglish ? "Theme" : "\u4e3b\u9898";
  const copy = isEnglish
    ? {
        kicker: "2048 Theme Settings",
        navHome: "Home",
        navPractice: "Practice Board",
        themeSelectLabel: "Select Theme",
        themePreviewLabel: "Theme Preview",
        paletteList: "Palette List",
        currentPalette: "Current Palette",
        create: "New Copy",
        rename: "Rename",
        remove: "Delete",
        exportLabel: "Export",
        importLabel: "Import",
        standard16: "Standard 16 Colors",
        fib16: "Fibonacci 16 Colors",
        livePreview: "Live Preview",
        standard: "Standard",
        fibonacci: "Fibonacci",
        timerLegend: "Timer Legend",
        namePlaceholder: "Palette name"
      }
    : {
        kicker: "2048 \u4e3b\u9898\u8bbe\u7f6e",
        navHome: "\u56de\u9996\u9875",
        navPractice: "\u7ec3\u4e60\u677f",
        themeSelectLabel: "\u9009\u62e9\u4e3b\u9898",
        themePreviewLabel: "\u914d\u8272\u9884\u89c8",
        paletteList: "\u8272\u677f\u5217\u8868",
        currentPalette: "\u5f53\u524d\u8272\u677f",
        create: "\u65b0\u5efa\u526f\u672c",
        rename: "\u91cd\u547d\u540d",
        remove: "\u5220\u9664",
        exportLabel: "\u5bfc\u51fa",
        importLabel: "\u5bfc\u5165",
        standard16: "\u6807\u51c6 16 \u8272",
        fib16: "\u6590\u6ce2\u90a3\u5951 16 \u8272",
        livePreview: "\u5b9e\u65f6\u9884\u89c8",
        standard: "\u6807\u51c6",
        fibonacci: "\u6590\u6ce2\u90a3\u5951",
        timerLegend: "\u8ba1\u65f6\u56fe\u4f8b",
        namePlaceholder: "\u8f93\u5165\u8272\u677f\u540d\u79f0"
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
  const listTitle = document.querySelector(".palette-sidebar .panel-head h2");
  const currentPalette = document.getElementById("palette-current-name");
  const createButton = document.getElementById("palette-create-btn");
  const renameButton = document.getElementById("palette-rename-btn");
  const deleteButton = document.getElementById("palette-delete-btn");
  const exportButton = document.getElementById("palette-export-btn");
  const importButton = document.getElementById("palette-import-btn");
  const nameInput = document.getElementById("palette-name-input");
  const colorPanelHeads = document.querySelectorAll(".color-panel-head");
  const previewTitles = document.querySelectorAll(".preview-group h3");

  if (kicker) kicker.textContent = copy.kicker;
  if (pageTitle) pageTitle.textContent = title;
  if (pageSubtitle) pageSubtitle.textContent = subtitle;
  if (themeCardTitle) themeCardTitle.textContent = title;
  if (panelPill) panelPill.textContent = pillText;
  if (navLinks[0]) navLinks[0].textContent = copy.navHome;
  if (navLinks[1]) navLinks[1].textContent = copy.navPractice;
  if (themeSelectLabel) themeSelectLabel.textContent = copy.themeSelectLabel;
  if (themePreviewLabel) themePreviewLabel.textContent = copy.themePreviewLabel;
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
  if (colorPanelHeads[0]) colorPanelHeads[0].textContent = copy.standard16;
  if (colorPanelHeads[1]) colorPanelHeads[1].textContent = copy.fib16;
  if (colorPanelHeads[2]) colorPanelHeads[2].textContent = copy.livePreview;
  if (previewTitles[0]) previewTitles[0].textContent = copy.standard;
  if (previewTitles[1]) previewTitles[1].textContent = copy.fibonacci;
  if (previewTitles[2]) previewTitles[2].textContent = copy.timerLegend;
}

export function bootstrapPalettePage(): void {
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "palette");
  }

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





