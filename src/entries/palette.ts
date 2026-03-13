import "../../js/theme_manager.js";
import "../../js/core_theme_settings_runtime.js";
import "../../js/core_theme_settings_host_runtime.js";
import "../../js/core_theme_settings_page_host_runtime.js";
import "../../js/palette_page.js";
import "../../js/core_i18n_runtime.js";

const globalWindow = window as Window & {
  CoreThemeSettingsHostRuntime?: {
    applyThemeSettingsUi?: (payload: unknown) => unknown;
  };
  CoreThemeSettingsPageHostRuntime?: {
    applyThemeSettingsPageInit?: (payload: unknown) => unknown;
  };
  CoreThemeSettingsRuntime?: Record<string, unknown>;
  ThemeManager?: Record<string, unknown>;
  UII18N?: {
    getLanguage?: () => string;
  };
};

const applyThemeSettingsUi = globalWindow.CoreThemeSettingsHostRuntime?.applyThemeSettingsUi;
const applyThemeSettingsPageInit = globalWindow.CoreThemeSettingsPageHostRuntime?.applyThemeSettingsPageInit;

function applyThemePageCopy(): void {
  const lang = typeof globalWindow.UII18N?.getLanguage === "function"
    ? globalWindow.UII18N.getLanguage()
    : "zh";
  const isEnglish = String(lang || "").toLowerCase().startsWith("en");
  const title = isEnglish ? "Theme Settings" : "主题设置";
  const subtitle = isEnglish
    ? "Manage tile themes and palette colors with import/export and live preview."
    : "统一管理棋子主题与色板配色，支持导入、导出与实时预览。";
  const pillText = isEnglish ? "Theme" : "主题";
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
        kicker: "2048 主题设置",
        navHome: "回首页",
        navPractice: "练习板",
        themeSelectLabel: "选择主题",
        themePreviewLabel: "配色预览",
        paletteList: "色板列表",
        currentPalette: "当前色板",
        create: "新建副本",
        rename: "重命名",
        remove: "删除",
        exportLabel: "导出",
        importLabel: "导入",
        standard16: "标准 16 色",
        fib16: "斐波那契 16 色",
        livePreview: "实时预览",
        standard: "标准",
        fibonacci: "斐波那契",
        timerLegend: "计时图例",
        namePlaceholder: "输入色板名称"
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

if (typeof applyThemeSettingsPageInit === "function") {
  applyThemeSettingsPageInit({
    themeSettingsHostRuntime: globalWindow.CoreThemeSettingsHostRuntime,
    themeSettingsRuntime: globalWindow.CoreThemeSettingsRuntime,
    documentLike: document,
    windowLike: window,
    themeManager: globalWindow.ThemeManager
  });
} else if (typeof applyThemeSettingsUi === "function") {
  applyThemeSettingsUi({
    documentLike: document,
    windowLike: window,
    themeSettingsRuntime: globalWindow.CoreThemeSettingsRuntime,
    themeManager: globalWindow.ThemeManager
  });
}

applyThemePageCopy();
window.addEventListener("uilanguagechange", applyThemePageCopy);
