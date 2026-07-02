(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var POW2_VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
  var FIB_VALUES = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];
  var LEGEND_VALUES = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
  var DIMENSIONS = [
    { key: "background", tabLabelZh: "\u80cc\u666f", tabLabelEn: "Background", panelLabelZh: "\u80cc\u666f\u989c\u8272", panelLabelEn: "Background Color" },
    { key: "text", tabLabelZh: "\u6587\u5b57", tabLabelEn: "Text", panelLabelZh: "\u6587\u5b57\u989c\u8272", panelLabelEn: "Text Color" },
    { key: "border", tabLabelZh: "\u8fb9\u6846", tabLabelEn: "Border", panelLabelZh: "\u8fb9\u6846\u989c\u8272", panelLabelEn: "Border Color" },
    { key: "glow", tabLabelZh: "\u53d1\u5149", tabLabelEn: "Glow", panelLabelZh: "\u53d1\u5149\u989c\u8272", panelLabelEn: "Glow Color" }
  ];
  var BOARD_LABELS = {
    pow2: { zh: "2048", en: "2048" },
    fibonacci: { zh: "\u6590\u6ce2\u90a3\u5951", en: "Fibonacci" }
  };
  var REQUIRED_THEME_API_NAMES = [
    "getTilePalettes",
    "getActiveTilePaletteId",
    "setActiveTilePalette",
    "createTilePalette",
    "renameTilePalette",
    "deleteTilePalette",
    "updateTilePaletteColor",
    "exportTilePalettes",
    "importTilePalettes"
  ];
  var MAX_RUNTIME_RETRY = 25;
  var runtimeRetryCount = 0;
  var bootCompleted = false;
  var state = {
    selectedBoard: "pow2",
    selectedDimension: "background",
    activeColorIndex: 0,
    swatchOpen: false
  };
  var bodyScrollLockState = {
    active: false,
    scrollY: 0,
    bodyStyles: null,
    htmlOverflow: ""
  };

  function toRecord(value) {
    return value && typeof value === "object" ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function resolveText(value) {
    return value == null ? "" : String(value);
  }

  function resolveArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function byId(id) {
    return global.document.getElementById(id);
  }

  function confirmWithGameDialog(message, options) {
    if (global.GameDialog && typeof global.GameDialog.confirm === "function") {
      return global.GameDialog.confirm(message, options || {});
    }
    return Promise.resolve(global.confirm ? global.confirm(message) : true);
  }

  function lockBodyScroll() {
    if (bodyScrollLockState.active) return;
    var body = global.document.body;
    var html = global.document.documentElement;
    if (!body || !html) return;
    bodyScrollLockState.active = true;
    bodyScrollLockState.scrollY = global.scrollY || global.pageYOffset || 0;
    bodyScrollLockState.bodyStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      touchAction: body.style.touchAction
    };
    bodyScrollLockState.htmlOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    body.classList.add("palette-swatch-open");
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = "-" + String(bodyScrollLockState.scrollY) + "px";
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.touchAction = "none";
  }

  function unlockBodyScroll() {
    if (!bodyScrollLockState.active) return;
    var body = global.document.body;
    var html = global.document.documentElement;
    var snapshot = bodyScrollLockState.bodyStyles || {};
    if (body) {
      body.classList.remove("palette-swatch-open");
      body.style.overflow = snapshot.overflow || "";
      body.style.position = snapshot.position || "";
      body.style.top = snapshot.top || "";
      body.style.left = snapshot.left || "";
      body.style.right = snapshot.right || "";
      body.style.width = snapshot.width || "";
      body.style.touchAction = snapshot.touchAction || "";
    }
    if (html) {
      html.style.overflow = bodyScrollLockState.htmlOverflow || "";
    }
    bodyScrollLockState.active = false;
    bodyScrollLockState.bodyStyles = null;
    bodyScrollLockState.htmlOverflow = "";
    if (bodyScrollLockState.scrollY) {
      global.scrollTo(0, bodyScrollLockState.scrollY);
    }
    bodyScrollLockState.scrollY = 0;
  }

  function createEl(tag, className, text) {
    var el = global.document.createElement(tag);
    if (className) el.className = className;
    if (typeof text === "string") el.textContent = text;
    return el;
  }

  function normalizeHexColor(value, fallback) {
    var input = resolveText(value).trim();
    var safe = resolveText(fallback || "#000000");
    if (/^#[0-9a-fA-F]{6}$/.test(input)) return input.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(input)) {
      return (
        "#" +
        input.charAt(1) + input.charAt(1) +
        input.charAt(2) + input.charAt(2) +
        input.charAt(3) + input.charAt(3)
      ).toLowerCase();
    }
    return /^#[0-9a-fA-F]{6}$/.test(safe) ? safe.toLowerCase() : "#000000";
  }

  function hexToRgb(hex) {
    var clean = normalizeHexColor(hex, "#000000").slice(1);
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }

  function rgbToHex(r, g, b) {
    function p(v) {
      var clamped = Math.max(0, Math.min(255, Math.round(v)));
      var s = clamped.toString(16);
      return s.length === 1 ? "0" + s : s;
    }
    return "#" + p(r) + p(g) + p(b);
  }

  function mixHex(colorA, colorB, ratio) {
    var a = hexToRgb(colorA);
    var b = hexToRgb(colorB);
    var t = Math.max(0, Math.min(1, Number(ratio) || 0));
    return rgbToHex(
      a.r + (b.r - a.r) * t,
      a.g + (b.g - a.g) * t,
      a.b + (b.b - a.b) * t
    );
  }

  function rgba(hex, alpha) {
    var rgb = hexToRgb(hex);
    var a = Math.max(0, Math.min(1, Number(alpha) || 0));
    return "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + a + ")";
  }

  function clamp01(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 0;
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
  }

  function clampChannel(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(255, Math.round(n)));
  }

  function rgbToHsv(rgb) {
    var r = clampChannel(rgb.r) / 255;
    var g = clampChannel(rgb.g) / 255;
    var b = clampChannel(rgb.b) / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var delta = max - min;
    var h = 0;
    if (delta > 0) {
      if (max === r) {
        h = 60 * (((g - b) / delta) % 6);
      } else if (max === g) {
        h = 60 * ((b - r) / delta + 2);
      } else {
        h = 60 * ((r - g) / delta + 4);
      }
    }
    if (h < 0) h += 360;
    var s = max === 0 ? 0 : delta / max;
    var v = max;
    return { h: h, s: s, v: v };
  }

  function hsvToRgb(h, s, v) {
    var hue = ((Number(h) || 0) % 360 + 360) % 360;
    var sat = clamp01(s);
    var val = clamp01(v);
    var c = val * sat;
    var x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    var m = val - c;
    var rp = 0;
    var gp = 0;
    var bp = 0;
    if (hue < 60) {
      rp = c; gp = x; bp = 0;
    } else if (hue < 120) {
      rp = x; gp = c; bp = 0;
    } else if (hue < 180) {
      rp = 0; gp = c; bp = x;
    } else if (hue < 240) {
      rp = 0; gp = x; bp = c;
    } else if (hue < 300) {
      rp = x; gp = 0; bp = c;
    } else {
      rp = c; gp = 0; bp = x;
    }
    return {
      r: clampChannel((rp + m) * 255),
      g: clampChannel((gp + m) * 255),
      b: clampChannel((bp + m) * 255)
    };
  }

  function valueText(value, ruleset) {
    var num = Number(value) || 0;
    if (ruleset === "pow2" && num >= 1024 && num % 1024 === 0) {
      return String(num / 1024) + "K";
    }
    return String(num);
  }

  function boardValues(ruleset) {
    return ruleset === "fibonacci" ? FIB_VALUES : POW2_VALUES;
  }

  function dimensionKey(ruleset, dimension) {
    var base = ruleset === "fibonacci" ? "fibonacci" : "pow2";
    if (dimension === "text") return base + "Text";
    if (dimension === "border") return base + "Border";
    if (dimension === "glow") return base + "Glow";
    return base;
  }

  function defaultBackgrounds(ruleset) {
    if (ruleset === "fibonacci") {
      return [
        "#f5efe6", "#ede2d0", "#e2d0b8", "#d4bb9b",
        "#c6a67f", "#b9956b", "#ac8358", "#9f724a",
        "#92633f", "#855638", "#784931", "#6b3d2b",
        "#5e3124", "#50261d", "#401a15", "#2f100d"
      ];
    }
    return [
      "#eee4da", "#ede0c8", "#f2b179", "#f59563",
      "#f67c5f", "#f65e3b", "#edcf72", "#edcc61",
      "#edc850", "#edc53f", "#edc22e", "#b77cf4",
      "#9e6bdf", "#8359bf", "#6b478f", "#51315f"
    ];
  }

  function normalize16(input, fallback) {
    var source = resolveArray(input);
    var out = resolveArray(fallback).slice(0, 16);
    while (out.length < 16) out.push("#000000");
    for (var i = 0; i < 16; i += 1) {
      out[i] = normalizeHexColor(source[i], out[i]);
    }
    return out;
  }

  function deriveTextColors(background) {
    var list = normalize16(background, defaultBackgrounds("pow2"));
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      var rgb = hexToRgb(list[i]);
      var luminance = (0.299 * rgb.r) + (0.587 * rgb.g) + (0.114 * rgb.b);
      out.push(luminance >= 170 ? "#55473a" : "#f9f6f2");
    }
    return out;
  }

  function deriveBorderColors(background) {
    var list = normalize16(background, defaultBackgrounds("pow2"));
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      out.push(mixHex(list[i], "#ffffff", 0.24));
    }
    return out;
  }

  function deriveGlowColors(background) {
    var list = normalize16(background, defaultBackgrounds("pow2"));
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      out.push(mixHex(list[i], "#ffffff", 0.12));
    }
    return out;
  }

  function getDimensionColors(palette, ruleset, dimension) {
    var bgKey = dimensionKey(ruleset, "background");
    var bgColors = normalize16(toRecord(palette)[bgKey], defaultBackgrounds(ruleset));
    if (dimension === "background") return bgColors;
    if (dimension === "text") return normalize16(toRecord(palette)[dimensionKey(ruleset, "text")], deriveTextColors(bgColors));
    if (dimension === "border") return normalize16(toRecord(palette)[dimensionKey(ruleset, "border")], deriveBorderColors(bgColors));
    return normalize16(toRecord(palette)[dimensionKey(ruleset, "glow")], deriveGlowColors(bgColors));
  }

  function getPaletteStyleBundle(palette, ruleset) {
    return {
      background: getDimensionColors(palette, ruleset, "background"),
      text: getDimensionColors(palette, ruleset, "text"),
      border: getDimensionColors(palette, ruleset, "border"),
      glow: getDimensionColors(palette, ruleset, "glow")
    };
  }

  function resolvePreviewVisualRuleset(ruleset) {
    return ruleset === "fibonacci" ? "pow2" : ruleset;
  }

  function isLockedPalette(palette) {
    var source = resolveText(toRecord(palette).source);
    return !!toRecord(palette).locked || source !== "custom";
  }

  function missingThemeApiNames(themeManager) {
    var list = [];
    var source = toRecord(themeManager);
    for (var i = 0; i < REQUIRED_THEME_API_NAMES.length; i += 1) {
      var key = REQUIRED_THEME_API_NAMES[i];
      if (!asFunction(source[key])) list.push(key);
    }
    return list;
  }

  function collectMissingDomIds(items) {
    var missing = [];
    for (var i = 0; i < items.length; i += 1) {
      if (!items[i].node) missing.push(items[i].id);
    }
    return missing;
  }

  function bootPalettePage() {
    if (bootCompleted) return;
    var themeManager = toRecord(global.ThemeManager);
    var missingApiNames = missingThemeApiNames(themeManager);
    var getTilePalettes = asFunction(themeManager.getTilePalettes);
    var getActiveTilePaletteId = asFunction(themeManager.getActiveTilePaletteId);
    var setActiveTilePalette = asFunction(themeManager.setActiveTilePalette);
    var createTilePalette = asFunction(themeManager.createTilePalette);
    var renameTilePalette = asFunction(themeManager.renameTilePalette);
    var deleteTilePalette = asFunction(themeManager.deleteTilePalette);
    var updateTilePaletteColor = asFunction(themeManager.updateTilePaletteColor);
    var exportTilePalettes = asFunction(themeManager.exportTilePalettes);
    var importTilePalettes = asFunction(themeManager.importTilePalettes);
    var syncTimerLegendStyles = asFunction(themeManager.syncTimerLegendStyles);

    var requiredReady = missingApiNames.length === 0;

    var paletteListEl = byId("palette-list");
    var paletteCountEl = byId("palette-count");
    var currentNameEl = byId("palette-current-name");
    var currentTagEl = byId("palette-current-tag");
    var nameInputEl = byId("palette-name-input");
    var createBtn = byId("palette-create-btn");
    var renameBtn = byId("palette-rename-btn");
    var deleteBtn = byId("palette-delete-btn");
    var exportBtn = byId("palette-export-btn");
    var importBtn = byId("palette-import-btn");
    var importInput = byId("palette-import-input");
    var dimensionTabsEl = byId("palette-dimension-tabs");
    var boardSwitchEl = byId("palette-board-switch");
    var editorPanelHeadEl = byId("palette-editor-panel-head");
    var editorHostEl = byId("palette-editor-current");
    var editorWorkspaceEl = editorHostEl ? editorHostEl.closest(".editor-workspace") : null;
    var swatchPopoverEl = byId("palette-swatch-popover");
    var swatchGridEl = byId("palette-swatch-grid");
    var swatchTileEl = byId("palette-swatch-tile");
    var swatchValueEl = byId("palette-swatch-value");
    var pickerSvEl = byId("palette-picker-sv");
    var pickerCursorEl = byId("palette-picker-cursor");
    var pickerHueEl = byId("palette-picker-hue");
    var pickerCurrentEl = byId("palette-picker-current");
    var pickerRInputEl = byId("palette-picker-r");
    var pickerGInputEl = byId("palette-picker-g");
    var pickerBInputEl = byId("palette-picker-b");
    var previewBoardEl = byId("palette-preview-board");
    var legendPreviewEl = byId("palette-preview-legend");
    var themeModePreviewEl = byId("theme-preview-grid");
    var themeSelectionColEl = global.document.querySelector(".theme-selection-col");
    var themePreviewColEl = global.document.querySelector(".theme-preview-col");
    var legacyPow2EditorEl = byId("palette-editor-pow2");
    var legacyFibEditorEl = byId("palette-editor-fib");
    var legacyPow2PreviewEl = byId("palette-preview-pow2");
    var legacyFibPreviewEl = byId("palette-preview-fib");
    var noteEl = byId("palette-note");

    function setNote(message, type) {
      if (!noteEl) return;
      noteEl.textContent = resolveText(message);
      noteEl.classList.remove("ok");
      noteEl.classList.remove("err");
      if (!message) return;
      if (type === "ok") noteEl.classList.add("ok");
      if (type === "err") noteEl.classList.add("err");
    }

    function isEnglishUi() {
      var i18n = toRecord(global.UII18N);
      var getLanguage = asFunction(i18n.getLanguage);
      var lang = getLanguage ? resolveText(getLanguage.call(i18n)) : "";
      if (!lang) {
        try {
          lang = resolveText(global.localStorage && global.localStorage.getItem("ui_language_v1"));
        } catch (_err) {
          lang = "";
        }
      }
      return lang.toLowerCase().indexOf("en") === 0;
    }

    function lockedPaletteMessage() {
      return isEnglishUi()
        ? "Built-in palettes are read-only. Create a copy before editing colors."
        : "\u5185\u7f6e\u4e3b\u9898\u4e0d\u53ef\u76f4\u63a5\u4fee\u6539\u989c\u8272\uff0c\u8bf7\u5148\u65b0\u5efa\u526f\u672c\u540e\u518d\u7f16\u8f91\u3002";
    }

    function dimensionText(dimension, field) {
      var isEn = isEnglishUi();
      for (var i = 0; i < DIMENSIONS.length; i += 1) {
        if (DIMENSIONS[i].key === dimension) {
          if (field === "panel") return isEn ? DIMENSIONS[i].panelLabelEn : DIMENSIONS[i].panelLabelZh;
          return isEn ? DIMENSIONS[i].tabLabelEn : DIMENSIONS[i].tabLabelZh;
        }
      }
      return isEn ? "Background" : "\u80cc\u666f";
    }

    function boardText(board) {
      var item = BOARD_LABELS[board] || BOARD_LABELS.pow2;
      return isEnglishUi() ? item.en : item.zh;
    }

    var missingDomIds = collectMissingDomIds([
      { id: "palette-list", node: paletteListEl },
      { id: "palette-count", node: paletteCountEl },
      { id: "palette-current-name", node: currentNameEl },
      { id: "palette-current-tag", node: currentTagEl },
      { id: "palette-name-input", node: nameInputEl },
      { id: "palette-create-btn", node: createBtn },
      { id: "palette-rename-btn", node: renameBtn },
      { id: "palette-delete-btn", node: deleteBtn },
      { id: "palette-export-btn", node: exportBtn },
      { id: "palette-import-btn", node: importBtn },
      { id: "palette-import-input", node: importInput },
      { id: "palette-dimension-tabs", node: dimensionTabsEl },
      { id: "palette-board-switch", node: boardSwitchEl },
      { id: "palette-editor-panel-head", node: editorPanelHeadEl },
      { id: "palette-editor-current", node: editorHostEl },
      { id: "palette-swatch-popover", node: swatchPopoverEl },
      { id: "palette-swatch-grid", node: swatchGridEl },
      { id: "palette-swatch-tile", node: swatchTileEl },
      { id: "palette-swatch-value", node: swatchValueEl },
      { id: "palette-picker-sv", node: pickerSvEl },
      { id: "palette-picker-cursor", node: pickerCursorEl },
      { id: "palette-picker-hue", node: pickerHueEl },
      { id: "palette-picker-current", node: pickerCurrentEl },
      { id: "palette-picker-r", node: pickerRInputEl },
      { id: "palette-picker-g", node: pickerGInputEl },
      { id: "palette-picker-b", node: pickerBInputEl },
      { id: "palette-preview-board", node: previewBoardEl },
      { id: "palette-note", node: noteEl }
    ]);

    if (!requiredReady || missingDomIds.length > 0) {
      if (!requiredReady && missingDomIds.length === 0 && runtimeRetryCount < MAX_RUNTIME_RETRY) {
        runtimeRetryCount += 1;
        global.setTimeout(bootPalettePage, 120);
        return;
      }
      var problems = [];
      if (missingApiNames.length > 0) problems.push((isEnglishUi() ? "Missing API: " : "\u7f3a\u5c11 API: ") + missingApiNames.join(", "));
      if (missingDomIds.length > 0) problems.push((isEnglishUi() ? "Missing DOM: " : "\u7f3a\u5c11 DOM: ") + missingDomIds.join(", "));
      setNote((isEnglishUi() ? "Palette center initialization failed. " : "\u8272\u677f\u4e2d\u5fc3\u521d\u59cb\u5316\u5931\u8d25\uff1a") + problems.join("; "), "err");
      return;
    }
    bootCompleted = true;

    function getPaletteMap(list) {
      var map = {};
      for (var i = 0; i < list.length; i += 1) {
        var palette = toRecord(list[i]);
        var id = resolveText(palette.id);
        if (!id) continue;
        map[id] = palette;
      }
      return map;
    }

    function renderPaletteList(list, activeId) {
      paletteListEl.innerHTML = "";
      paletteCountEl.textContent = String(list.length);
      for (var i = 0; i < list.length; i += 1) {
        var palette = toRecord(list[i]);
        var id = resolveText(palette.id);
        var name = resolveText(palette.name || id);
        var source = resolveText(palette.source || "custom");

        var item = createEl("button", "palette-item", "");
        item.type = "button";
        item.setAttribute("data-palette-id", id);
        if (id === activeId) item.classList.add("is-active");

        var title = createEl("div", "palette-item-title", name);
        var meta = createEl("div", "palette-item-meta", "");
        var sourceChip = createEl(
          "span",
          "palette-chip " + (source === "custom" ? "custom" : ""),
          source === "custom" ? (isEnglishUi() ? "Custom" : "\u81ea\u5b9a\u4e49") : (isEnglishUi() ? "Built-in" : "\u5185\u7f6e")
        );
        meta.appendChild(sourceChip);
        if (id === activeId) {
          meta.appendChild(createEl("span", "palette-chip current", isEnglishUi() ? "Current" : "\u5f53\u524d"));
        }

        item.appendChild(title);
        item.appendChild(meta);
        paletteListEl.appendChild(item);
      }
    }

    function renderDimensionTabs() {
      dimensionTabsEl.setAttribute("aria-label", isEnglishUi() ? "Color Dimensions" : "\u989c\u8272\u7ef4\u5ea6");
      var buttons = dimensionTabsEl.querySelectorAll(".palette-dimension-tab");
      for (var i = 0; i < buttons.length; i += 1) {
        var button = buttons[i];
        var key = resolveText(button.getAttribute("data-dimension"));
        button.textContent = dimensionText(key, "tab");
        if (key === state.selectedDimension) {
          button.classList.add("is-active");
        } else {
          button.classList.remove("is-active");
        }
      }
      for (var j = 0; j < DIMENSIONS.length; j += 1) {
        if (DIMENSIONS[j].key === state.selectedDimension) {
          editorPanelHeadEl.textContent = dimensionText(DIMENSIONS[j].key, "panel");
          break;
        }
      }
    }

    function renderBoardSwitch() {
      var buttons = boardSwitchEl.querySelectorAll(".palette-board-btn");
      for (var i = 0; i < buttons.length; i += 1) {
        var button = buttons[i];
        var key = resolveText(button.getAttribute("data-board"));
        if (key === state.selectedBoard) {
          button.classList.add("is-active");
        } else {
          button.classList.remove("is-active");
        }
      }
    }

    function buildSwatchPaletteColors(baseColors, dimension) {
      var builtIn = [
        "#ffffff", "#f9f6f2", "#eee4da", "#edcf72", "#edc22e", "#f59563",
        "#f65e3b", "#d14f3f", "#b77cf4", "#8359bf", "#4d3a2f", "#1f1a17",
        "#000000", "#5f4e3f", "#8f7a66", "#bbada0", "#86b8e6", "#57c78e",
        "#ffd166", "#ef476f", "#06d6a0", "#118ab2", "#073b4c", "#9c6644"
      ];
      var source = resolveArray(baseColors);
      var result = [];
      function pushUnique(color) {
        var normalized = normalizeHexColor(color, "#000000");
        if (result.indexOf(normalized) === -1) result.push(normalized);
      }
      for (var i = 0; i < source.length; i += 1) pushUnique(source[i]);
      for (var j = 0; j < builtIn.length; j += 1) pushUnique(builtIn[j]);
      if (dimension === "text") {
        pushUnique("#f9f6f2");
        pushUnique("#55473a");
      }
      return result.slice(0, 36);
    }

    function positionSwatchPopover() {
      if (!swatchPopoverEl || !editorWorkspaceEl || !state.swatchOpen) return;
      var anchor = editorHostEl.querySelector('.color-target[data-index="' + String(state.activeColorIndex) + '"]');
      if (!anchor) return;
      var workspaceRect = editorWorkspaceEl.getBoundingClientRect();
      var anchorRect = anchor.getBoundingClientRect();
      var popoverWidth = swatchPopoverEl.offsetWidth || 290;
      var popoverHeight = swatchPopoverEl.offsetHeight || 220;
      var top = (anchorRect.top - workspaceRect.top) + (anchorRect.height / 2) - (popoverHeight / 2);
      var left = (anchorRect.right - workspaceRect.left) + 10;
      if (left + popoverWidth > editorWorkspaceEl.clientWidth - 6) {
        left = (anchorRect.left - workspaceRect.left) - popoverWidth - 10;
      }
      if (left < 0) left = 0;
      if (top < 0) top = 0;
      if (top + popoverHeight > editorWorkspaceEl.clientHeight - 2) {
        top = Math.max(0, editorWorkspaceEl.clientHeight - popoverHeight - 2);
      }
      swatchPopoverEl.style.left = String(Math.round(left)) + "px";
      swatchPopoverEl.style.top = String(Math.round(top)) + "px";
    }

    function syncSwatchPopoverVisibility() {
      if (!swatchPopoverEl) return;
      if (state.swatchOpen) {
        swatchPopoverEl.classList.add("is-open");
        lockBodyScroll();
        positionSwatchPopover();
      } else {
        swatchPopoverEl.classList.remove("is-open");
        unlockBodyScroll();
      }
    }

    function isEventFromPaletteEditor(eventLike) {
      if (!eventLike) return false;
      if (typeof eventLike.composedPath === "function") {
        var path = eventLike.composedPath();
        for (var i = 0; i < path.length; i += 1) {
          var node = path[i];
          if (node === editorHostEl || node === swatchPopoverEl) return true;
        }
      }
      var target = eventLike && eventLike.target ? eventLike.target : null;
      if (!target || !target.closest) return false;
      if (target.closest("#palette-editor-current")) return true;
      if (target.closest("#palette-swatch-popover")) return true;
      return false;
    }

    function renderSwatchPalette(paletteId, palette, ruleset, dimension, locked) {
      var currentColors = getDimensionColors(palette, ruleset, dimension);
      var selectedIndex = Math.max(0, Math.min(15, Number(state.activeColorIndex) || 0));
      var selectedColor = normalizeHexColor(currentColors[selectedIndex], "#000000");
      var selectedValue = valueText(boardValues(ruleset)[selectedIndex], ruleset);
      var swatches = buildSwatchPaletteColors(currentColors, dimension);
      var hsv = rgbToHsv(hexToRgb(selectedColor));
      var hue = hsv.h;
      var saturation = hsv.s;
      var value = hsv.v;

      swatchGridEl.innerHTML = "";

      function applySelectedColor(nextColor) {
        var normalizedColor = normalizeHexColor(nextColor, selectedColor);
        var updated = !!updateTilePaletteColor.call(
          themeManager,
          paletteId,
          ruleset,
          dimension,
          selectedIndex,
          normalizedColor
        );
        if (!updated) {
          setNote(lockedPaletteMessage(), "err");
          return;
        }
        setNote(isEnglishUi() ? "Color updated." : "\u5df2\u66f4\u65b0\u989c\u8272\u3002", "ok");
        refresh();
      }

      function syncPickerByHsv() {
        var hueColor = hsvToRgb(hue, 1, 1);
        if (pickerSvEl) {
          pickerSvEl.style.background =
            "linear-gradient(to top, #000, rgba(0, 0, 0, 0)), " +
            "linear-gradient(to right, #fff, " + rgbToHex(hueColor.r, hueColor.g, hueColor.b) + ")";
        }
        if (pickerCursorEl && pickerSvEl) {
          pickerCursorEl.style.left = String(Math.round(saturation * 100)) + "%";
          pickerCursorEl.style.top = String(Math.round((1 - value) * 100)) + "%";
        }
        var rgb = hsvToRgb(hue, saturation, value);
        var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        if (pickerCurrentEl) pickerCurrentEl.style.background = hex;
        if (pickerHueEl) pickerHueEl.value = String(Math.round(hue));
        if (pickerRInputEl) pickerRInputEl.value = String(rgb.r);
        if (pickerGInputEl) pickerGInputEl.value = String(rgb.g);
        if (pickerBInputEl) pickerBInputEl.value = String(rgb.b);
      }

      function applyCurrentHsvColor() {
        var rgb = hsvToRgb(hue, saturation, value);
        applySelectedColor(rgbToHex(rgb.r, rgb.g, rgb.b));
      }

      function pickSvFromEvent(eventLike) {
        if (!pickerSvEl) return;
        var rect = pickerSvEl.getBoundingClientRect();
        var clientX = Number(eventLike && eventLike.clientX);
        var clientY = Number(eventLike && eventLike.clientY);
        if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
        saturation = clamp01((clientX - rect.left) / Math.max(1, rect.width));
        value = 1 - clamp01((clientY - rect.top) / Math.max(1, rect.height));
        syncPickerByHsv();
        applyCurrentHsvColor();
      }

      function bindSvDrag(startEvent) {
        if (!pickerSvEl || locked) return;
        if (startEvent && typeof startEvent.preventDefault === "function") startEvent.preventDefault();
        pickSvFromEvent(startEvent);
        var onMove = function (moveEvent) {
          pickSvFromEvent(moveEvent);
        };
        var onStop = function () {
          global.removeEventListener("pointermove", onMove);
          global.removeEventListener("pointerup", onStop);
          global.removeEventListener("pointercancel", onStop);
        };
        global.addEventListener("pointermove", onMove);
        global.addEventListener("pointerup", onStop);
        global.addEventListener("pointercancel", onStop);
      }

      if (swatchTileEl) swatchTileEl.style.background = selectedColor;
      if (swatchValueEl) swatchValueEl.textContent = selectedValue;
      syncPickerByHsv();

      var presetColors = swatches.slice(0, 10);
      for (var i = 0; i < presetColors.length; i += 1) {
        var color = presetColors[i];
        var chip = createEl("button", "swatch-chip", "");
        chip.type = "button";
        chip.style.background = color;
        chip.setAttribute("data-color", color);
        if (color === selectedColor) chip.classList.add("is-active-swatch");
        if (locked) chip.disabled = true;
        (function bindChip(colorValue) {
          chip.addEventListener("click", function (eventLike) {
            if (eventLike && typeof eventLike.stopPropagation === "function") {
              eventLike.stopPropagation();
            }
            if (locked) return;
            applySelectedColor(colorValue);
          });
        })(color);
        swatchGridEl.appendChild(chip);
      }

      if (pickerSvEl) {
        pickerSvEl.onpointerdown = bindSvDrag;
      }

      if (pickerHueEl) {
        pickerHueEl.disabled = !!locked;
        pickerHueEl.oninput = function () {
          if (locked) return;
          hue = Number(pickerHueEl.value) || 0;
          syncPickerByHsv();
          applyCurrentHsvColor();
        };
      }

      function bindRgbInput(inputEl) {
        if (!inputEl) return;
        inputEl.disabled = !!locked;
        inputEl.oninput = function () {
          if (locked) return;
          var r = clampChannel(pickerRInputEl ? pickerRInputEl.value : 0);
          var g = clampChannel(pickerGInputEl ? pickerGInputEl.value : 0);
          var b = clampChannel(pickerBInputEl ? pickerBInputEl.value : 0);
          var nextHsv = rgbToHsv({ r: r, g: g, b: b });
          hue = nextHsv.h;
          saturation = nextHsv.s;
          value = nextHsv.v;
          syncPickerByHsv();
          applySelectedColor(rgbToHex(r, g, b));
        };
      }

      bindRgbInput(pickerRInputEl);
      bindRgbInput(pickerGInputEl);
      bindRgbInput(pickerBInputEl);
      syncSwatchPopoverVisibility();
    }

    function renderColorEditor(paletteId, palette, ruleset, dimension, locked) {
      var values = boardValues(ruleset);
      var colors = getDimensionColors(palette, ruleset, dimension);
      editorHostEl.innerHTML = "";
      for (var i = 0; i < 16; i += 1) {
        var item = createEl("button", "color-target", "");
        item.type = "button";
        item.setAttribute("data-index", String(i));
        if (i === state.activeColorIndex) item.classList.add("is-active-target");

        var chip = createEl("span", "color-target-chip", "");
        chip.style.background = colors[i];
        var text = createEl("span", "color-target-label", valueText(values[i], ruleset));
        text.style.color = deriveTextColors([colors[i]])[0];
        item.appendChild(chip);
        item.appendChild(text);
        editorHostEl.appendChild(item);

        (function bindTarget(index) {
          item.addEventListener("click", function (eventLike) {
            if (eventLike && typeof eventLike.stopPropagation === "function") {
              eventLike.stopPropagation();
            }
            if (locked) {
              state.swatchOpen = false;
              setNote(lockedPaletteMessage(), "err");
              syncSwatchPopoverVisibility();
              return;
            }
            state.activeColorIndex = index;
            state.swatchOpen = true;
            refresh();
          });
        })(i);
      }
      renderSwatchPalette(paletteId, palette, ruleset, dimension, locked);
    }

    function renderBoardPreview(palette, ruleset) {
      var valueRuleset = ruleset === "fibonacci" ? "fibonacci" : "pow2";
      var visualRuleset = resolvePreviewVisualRuleset(valueRuleset);
      var values = boardValues(valueRuleset);
      var styleBundle = getPaletteStyleBundle(palette, visualRuleset);
      previewBoardEl.classList.toggle("is-fibonacci", visualRuleset === "fibonacci");
      previewBoardEl.classList.toggle("is-pow2", visualRuleset !== "fibonacci");
      previewBoardEl.innerHTML = "";
      for (var i = 0; i < 16; i += 1) {
        var tile = createEl("div", "preview-tile", valueText(values[i], valueRuleset));
        var background = styleBundle.background[i];
        var text = styleBundle.text[i];
        var border = styleBundle.border[i];
        var glow = styleBundle.glow[i];
        tile.style.background = background;
        tile.style.color = text;
        tile.style.borderColor = border;
        tile.style.boxShadow = "0 0 14px 1px " + rgba(glow, 0.38) + ", inset 0 0 0 1px " + rgba(border, 0.44);
        previewBoardEl.appendChild(tile);
      }
    }

    function resolveLegendValues(ruleset) {
      var values = boardValues(ruleset);
      return values.slice(4, 16);
    }

    function renderLegendRow() {
      if (!legendPreviewEl) return;
      legendPreviewEl.innerHTML = "";
    }

    function renderLegacyHooks(palette) {
      if (legacyPow2EditorEl) legacyPow2EditorEl.innerHTML = "";
      if (legacyFibEditorEl) legacyFibEditorEl.innerHTML = "";
      if (legacyPow2PreviewEl) legacyPow2PreviewEl.innerHTML = "";
      if (legacyFibPreviewEl) legacyFibPreviewEl.innerHTML = "";
      if (legacyPow2PreviewEl) {
        var rowPow2 = getDimensionColors(palette, "pow2", "background");
        for (var i = 0; i < 4; i += 1) {
          var tilePow2 = createEl("div", "preview-tile", valueText(POW2_VALUES[i], "pow2"));
          tilePow2.style.background = rowPow2[i];
          tilePow2.style.color = deriveTextColors([rowPow2[i]])[0];
          legacyPow2PreviewEl.appendChild(tilePow2);
        }
      }
      if (legacyFibPreviewEl) {
        var rowFib = getDimensionColors(palette, resolvePreviewVisualRuleset("fibonacci"), "background");
        for (var j = 0; j < 4; j += 1) {
          var tileFib = createEl("div", "preview-tile", valueText(FIB_VALUES[j], "fibonacci"));
          tileFib.style.background = rowFib[j];
          tileFib.style.color = deriveTextColors([rowFib[j]])[0];
          legacyFibPreviewEl.appendChild(tileFib);
        }
      }
    }

    function syncTopPanelHeight() {
      if (!themeSelectionColEl || !themePreviewColEl) return;
      themeSelectionColEl.style.height = "";
      var previewHeight = Math.ceil(themePreviewColEl.getBoundingClientRect().height || 0);
      if (previewHeight > 0) {
        themeSelectionColEl.style.height = String(previewHeight) + "px";
      }
    }

    function syncPreviewLegendSize() {
      if (!previewBoardEl || !legendPreviewEl) return;
      legendPreviewEl.style.width = "";
    }

    function syncThemeModePreviewBoard() {
      if (!themeModePreviewEl) return;
      themeModePreviewEl.setAttribute("data-board", state.selectedBoard === "fibonacci" ? "fibonacci" : "pow2");
    }

    function refresh() {
      var list = resolveArray(getTilePalettes.call(themeManager));
      var map = getPaletteMap(list);
      var activeId = resolveText(getActiveTilePaletteId.call(themeManager));
      if (!map[activeId] && list.length > 0) {
        activeId = resolveText(toRecord(list[0]).id);
        setActiveTilePalette.call(themeManager, activeId);
      }
      var activePalette = toRecord(map[activeId]);
      var activeName = resolveText(activePalette.name || activeId || "--");
      var locked = isLockedPalette(activePalette);
      state.activeColorIndex = Math.max(0, Math.min(15, Number(state.activeColorIndex) || 0));
      var boardLabel = boardText(state.selectedBoard);
      var dimensionLabel = dimensionText(state.selectedDimension, "tab");

      currentNameEl.textContent = activeName;
      currentNameEl.setAttribute("data-palette-name-bound", "1");
      currentTagEl.textContent = (locked ? (isEnglishUi() ? "Read-only" : "\u53ea\u8bfb") : (isEnglishUi() ? "Editable" : "\u53ef\u7f16\u8f91")) + " \u00b7 " + boardLabel + " \u00b7 " + dimensionLabel;
      nameInputEl.value = activeName;
      renameBtn.disabled = locked;
      deleteBtn.disabled = locked;
      if (editorHostEl && editorHostEl.classList) {
        editorHostEl.classList.toggle("is-readonly", locked);
      }
      if (locked) state.swatchOpen = false;

      renderPaletteList(list, activeId);
      renderBoardSwitch();
      syncThemeModePreviewBoard();
      renderDimensionTabs();
      renderColorEditor(activeId, activePalette, state.selectedBoard, state.selectedDimension, locked);
      renderBoardPreview(activePalette, state.selectedBoard);
      syncPreviewLegendSize();
      renderLegacyHooks(activePalette);
      syncTopPanelHeight();
      if (locked) {
        setNote(lockedPaletteMessage(), "err");
      }
    }

    paletteListEl.addEventListener("click", function (eventLike) {
      var target = eventLike && eventLike.target ? eventLike.target : null;
      var button = target ? target.closest(".palette-item") : null;
      if (!button) return;
      var nextId = resolveText(button.getAttribute("data-palette-id"));
      if (!nextId) return;
      state.swatchOpen = false;
      setActiveTilePalette.call(themeManager, nextId);
      setNote("", "");
      refresh();
    });

    dimensionTabsEl.addEventListener("click", function (eventLike) {
      var target = eventLike && eventLike.target ? eventLike.target : null;
      var button = target ? target.closest(".palette-dimension-tab") : null;
      if (!button) return;
      var nextDimension = resolveText(button.getAttribute("data-dimension"));
      if (!nextDimension) return;
      state.selectedDimension = nextDimension;
      state.swatchOpen = false;
      refresh();
    });

    boardSwitchEl.addEventListener("click", function (eventLike) {
      var target = eventLike && eventLike.target ? eventLike.target : null;
      var button = target ? target.closest(".palette-board-btn") : null;
      if (!button) return;
      var nextBoard = resolveText(button.getAttribute("data-board"));
      if (nextBoard !== "pow2" && nextBoard !== "fibonacci") return;
      state.selectedBoard = nextBoard;
      state.swatchOpen = false;
      refresh();
    });

    createBtn.addEventListener("click", function () {
      var activeId = resolveText(getActiveTilePaletteId.call(themeManager));
      var desiredName = resolveText(nameInputEl.value).trim() || (isEnglishUi() ? "Custom Palette" : "\u81ea\u5b9a\u4e49\u8272\u677f");
      createTilePalette.call(themeManager, activeId, desiredName);
      setNote(isEnglishUi() ? "Palette copy created." : "\u5df2\u65b0\u5efa\u8272\u677f\u526f\u672c\u3002", "ok");
      refresh();
    });

    renameBtn.addEventListener("click", function () {
      var activeId = resolveText(getActiveTilePaletteId.call(themeManager));
      var desiredName = resolveText(nameInputEl.value).trim();
      if (!desiredName) {
        setNote(isEnglishUi() ? "Please enter a palette name." : "\u8bf7\u8f93\u5165\u8272\u677f\u540d\u79f0\u3002", "err");
        return;
      }
      var renamed = !!renameTilePalette.call(themeManager, activeId, desiredName);
      if (!renamed) {
        setNote(isEnglishUi() ? "Current palette cannot be renamed." : "\u5f53\u524d\u8272\u677f\u4e0d\u53ef\u91cd\u547d\u540d\u3002", "err");
        return;
      }
      setNote(isEnglishUi() ? "Palette renamed." : "\u8272\u677f\u5df2\u91cd\u547d\u540d\u3002", "ok");
      refresh();
    });

    deleteBtn.addEventListener("click", async function () {
      var activeId = resolveText(getActiveTilePaletteId.call(themeManager));
      if (!activeId) return;
      if (!(await confirmWithGameDialog(isEnglishUi() ? "Delete current palette?" : "\u786e\u8ba4\u5220\u9664\u5f53\u524d\u8272\u677f\uff1f", {
        kind: "danger"
      }))) return;
      var deleted = !!deleteTilePalette.call(themeManager, activeId);
      if (!deleted) {
        setNote(isEnglishUi() ? "Current palette cannot be deleted." : "\u5f53\u524d\u8272\u677f\u4e0d\u53ef\u5220\u9664\u3002", "err");
        return;
      }
      setNote(isEnglishUi() ? "Palette deleted." : "\u8272\u677f\u5df2\u5220\u9664\u3002", "ok");
      refresh();
    });

    exportBtn.addEventListener("click", function () {
      var payload = resolveText(exportTilePalettes.call(themeManager));
      if (!payload) {
        setNote(isEnglishUi() ? "Export failed." : "\u5bfc\u51fa\u5931\u8d25\u3002", "err");
        return;
      }
      if (!global.Blob || !global.URL || typeof global.URL.createObjectURL !== "function") {
        setNote(isEnglishUi() ? "Export is not supported in this environment." : "\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u5bfc\u51fa\u3002", "err");
        return;
      }
      var blob = new global.Blob([payload], { type: "application/json" });
      var url = global.URL.createObjectURL(blob);
      var anchor = createEl("a", "", "");
      anchor.href = url;
      anchor.download = "tile-palettes.json";
      anchor.click();
      if (typeof global.URL.revokeObjectURL === "function") {
        global.setTimeout(function () {
          global.URL.revokeObjectURL(url);
        }, 0);
      }
      setNote(isEnglishUi() ? "Palette exported." : "\u8272\u677f\u5df2\u5bfc\u51fa\u3002", "ok");
    });

    importBtn.addEventListener("click", function () {
      if (importInput && typeof importInput.click === "function") importInput.click();
    });

    importInput.addEventListener("change", function () {
      var file = toRecord(importInput.files)[0];
      if (!file) return;

      var handleText = function (textValue) {
        var result = toRecord(importTilePalettes.call(themeManager, resolveText(textValue)));
        var count = Number(result.importedCount) || 0;
        if (count <= 0) {
          setNote(isEnglishUi() ? "Import failed. Please check JSON format." : "\u5bfc\u5165\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5 JSON \u683c\u5f0f\u3002", "err");
          return;
        }
        setNote((isEnglishUi() ? "Imported " : "\u5df2\u5bfc\u5165 ") + count + (isEnglishUi() ? " palette(s)." : " \u4e2a\u8272\u677f\u3002"), "ok");
        refresh();
      };

      if (typeof file.text === "function") {
        file.text().then(handleText).catch(function () {
          setNote(isEnglishUi() ? "Failed to read file." : "\u8bfb\u53d6\u6587\u4ef6\u5931\u8d25\u3002", "err");
        });
        return;
      }

      if (!global.FileReader) {
        setNote(isEnglishUi() ? "Import is not supported in this environment." : "\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u5bfc\u5165\u3002", "err");
        return;
      }
      var reader = new global.FileReader();
      reader.onload = function () {
        handleText(resolveText(reader.result));
      };
      reader.onerror = function () {
        setNote(isEnglishUi() ? "Failed to read file." : "\u8bfb\u53d6\u6587\u4ef6\u5931\u8d25\u3002", "err");
      };
      reader.readAsText(file);
    });

    global.document.addEventListener("click", function (eventLike) {
      if (!state.swatchOpen) return;
      if (isEventFromPaletteEditor(eventLike)) {
        return;
      }
      state.swatchOpen = false;
      syncSwatchPopoverVisibility();
    });

    global.addEventListener("resize", function () {
      if (!state.swatchOpen) return;
      positionSwatchPopover();
    });

    global.addEventListener("resize", function () {
      syncTopPanelHeight();
      syncPreviewLegendSize();
    });

    global.addEventListener("themechange", function () {
      refresh();
    });

    global.setTimeout(syncTopPanelHeight, 0);
    global.setTimeout(syncPreviewLegendSize, 0);

    setNote(isEnglishUi() ? "Palette center loaded." : "\u5df2\u52a0\u8f7d\u8272\u677f\u4e2d\u5fc3\u3002", "ok");
    refresh();
  }

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", bootPalettePage);
  } else {
    bootPalettePage();
  }
})(typeof window !== "undefined" ? window : undefined);
