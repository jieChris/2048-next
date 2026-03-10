(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var POW2_VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
  var FIB_VALUES = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];
  var LEGEND_VALUES = [16, 32, 64, 128, 256, 512, 1024, 2048];

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

  function textColorForBg(hex) {
    var color = normalizeHexColor(hex, "#000000");
    var r = parseInt(color.slice(1, 3), 16);
    var g = parseInt(color.slice(3, 5), 16);
    var b = parseInt(color.slice(5, 7), 16);
    var luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
    return luminance > 165 ? "#55473a" : "#f9f6f2";
  }

  function isLockedPalette(palette) {
    var source = resolveText(toRecord(palette).source);
    return !!toRecord(palette).locked || source !== "custom";
  }

  function bootPalettePage() {
    var themeManager = toRecord(global.ThemeManager);
    var getTilePalettes = asFunction(themeManager.getTilePalettes);
    var getActiveTilePaletteId = asFunction(themeManager.getActiveTilePaletteId);
    var setActiveTilePalette = asFunction(themeManager.setActiveTilePalette);
    var createTilePalette = asFunction(themeManager.createTilePalette);
    var renameTilePalette = asFunction(themeManager.renameTilePalette);
    var deleteTilePalette = asFunction(themeManager.deleteTilePalette);
    var updateTilePaletteColor = asFunction(themeManager.updateTilePaletteColor);
    var exportTilePalettes = asFunction(themeManager.exportTilePalettes);
    var importTilePalettes = asFunction(themeManager.importTilePalettes);

    var requiredReady =
      getTilePalettes &&
      getActiveTilePaletteId &&
      setActiveTilePalette &&
      createTilePalette &&
      renameTilePalette &&
      deleteTilePalette &&
      updateTilePaletteColor &&
      exportTilePalettes &&
      importTilePalettes;

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
    var pow2EditorEl = byId("palette-editor-pow2");
    var fibEditorEl = byId("palette-editor-fib");
    var pow2PreviewEl = byId("palette-preview-pow2");
    var fibPreviewEl = byId("palette-preview-fib");
    var legendPreviewEl = byId("palette-preview-legend");
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

    if (
      !requiredReady ||
      !paletteListEl ||
      !paletteCountEl ||
      !currentNameEl ||
      !currentTagEl ||
      !nameInputEl ||
      !createBtn ||
      !renameBtn ||
      !deleteBtn ||
      !exportBtn ||
      !importBtn ||
      !importInput ||
      !pow2EditorEl ||
      !fibEditorEl ||
      !pow2PreviewEl ||
      !fibPreviewEl ||
      !legendPreviewEl
    ) {
      setNote("色板页面初始化失败：缺少必要运行时或 DOM 节点。", "err");
      return;
    }

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

    function normalizePaletteColors(rawColors, fallbackValues) {
      var source = resolveArray(rawColors);
      var colors = [];
      for (var i = 0; i < 16; i += 1) {
        var fallback = i < fallbackValues.length ? fallbackValues[i] : "#000000";
        colors.push(normalizeHexColor(source[i], fallback));
      }
      return colors;
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
          source === "custom" ? "自定义" : "内置"
        );
        meta.appendChild(sourceChip);
        if (id === activeId) {
          meta.appendChild(createEl("span", "palette-chip current", "当前"));
        }

        item.appendChild(title);
        item.appendChild(meta);
        paletteListEl.appendChild(item);
      }
    }

    function renderColorEditor(host, paletteId, ruleset, values, colors, locked) {
      host.innerHTML = "";
      for (var i = 0; i < 16; i += 1) {
        var item = createEl("label", "color-item", "");
        var picker = createEl("input", "", "");
        picker.type = "color";
        picker.value = normalizeHexColor(colors[i], "#000000");
        picker.disabled = locked;
        picker.setAttribute("data-index", String(i));
        picker.setAttribute("data-ruleset", ruleset);
        picker.addEventListener("change", function () {
          var idx = Number(this.getAttribute("data-index"));
          var nextRuleset = this.getAttribute("data-ruleset") === "fibonacci" ? "fibonacci" : "pow2";
          var nextColor = normalizeHexColor(this.value, "#000000");
          var updated = !!updateTilePaletteColor.call(themeManager, paletteId, nextRuleset, idx, nextColor);
          if (!updated) {
            setNote("当前色板为只读，请先新建副本。", "err");
            return;
          }
          setNote("色板颜色已更新。", "ok");
          refresh();
        });

        var text = createEl("span", "", resolveText(values[i]));
        item.appendChild(picker);
        item.appendChild(text);
        host.appendChild(item);
      }
    }

    function renderPreviewRow(host, values, colors) {
      host.innerHTML = "";
      for (var i = 0; i < values.length; i += 1) {
        var color = normalizeHexColor(colors[i], "#000000");
        var tile = createEl("div", "preview-tile", resolveText(values[i]));
        tile.style.background = color;
        tile.style.color = textColorForBg(color);
        host.appendChild(tile);
      }
    }

    function renderLegendRow(host, colors) {
      host.innerHTML = "";
      for (var i = 0; i < LEGEND_VALUES.length; i += 1) {
        var color = normalizeHexColor(colors[Math.min(i + 3, colors.length - 1)], "#000000");
        var item = createEl("div", "legend-pill", resolveText(LEGEND_VALUES[i]));
        item.style.background = color;
        item.style.color = textColorForBg(color);
        host.appendChild(item);
      }
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
      var source = resolveText(activePalette.source || "custom");
      var locked = isLockedPalette(activePalette);
      var pow2Colors = normalizePaletteColors(activePalette.pow2, [
        "#eee4da", "#ede0c8", "#f2b179", "#f59563", "#f67c5f", "#f65e3b", "#edcf72", "#edcc61",
        "#edc850", "#edc53f", "#edc22e", "#b77cf4", "#9e6bdf", "#8359bf", "#6b478f", "#51315f"
      ]);
      var fibColors = normalizePaletteColors(activePalette.fibonacci, [
        "#f5efe6", "#ede2d0", "#e2d0b8", "#d4bb9b", "#c6a67f", "#b9956b", "#ac8358", "#9f724a",
        "#92633f", "#855638", "#784931", "#6b3d2b", "#5e3124", "#50261d", "#401a15", "#2f100d"
      ]);

      currentNameEl.textContent = activeName;
      currentTagEl.textContent = locked ? "只读" : "可编辑";
      nameInputEl.value = activeName;
      renameBtn.disabled = locked;
      deleteBtn.disabled = locked;

      renderPaletteList(list, activeId);
      renderColorEditor(pow2EditorEl, activeId, "pow2", POW2_VALUES, pow2Colors, locked);
      renderColorEditor(fibEditorEl, activeId, "fibonacci", FIB_VALUES, fibColors, locked);
      renderPreviewRow(pow2PreviewEl, POW2_VALUES.slice(0, 15), pow2Colors.slice(0, 15));
      renderPreviewRow(fibPreviewEl, FIB_VALUES.slice(0, 15), fibColors.slice(0, 15));
      renderLegendRow(legendPreviewEl, pow2Colors);
    }

    paletteListEl.addEventListener("click", function (eventLike) {
      var target = eventLike && eventLike.target ? eventLike.target : null;
      var button = target ? target.closest(".palette-item") : null;
      if (!button) return;
      var nextId = resolveText(button.getAttribute("data-palette-id"));
      if (!nextId) return;
      setActiveTilePalette.call(themeManager, nextId);
      setNote("", "");
      refresh();
    });

    createBtn.addEventListener("click", function () {
      var activeId = resolveText(getActiveTilePaletteId.call(themeManager));
      var desiredName = resolveText(nameInputEl.value).trim() || "自定义色板";
      createTilePalette.call(themeManager, activeId, desiredName);
      setNote("已新建色板副本。", "ok");
      refresh();
    });

    renameBtn.addEventListener("click", function () {
      var activeId = resolveText(getActiveTilePaletteId.call(themeManager));
      var desiredName = resolveText(nameInputEl.value).trim();
      if (!desiredName) {
        setNote("请输入色板名称。", "err");
        return;
      }
      var renamed = !!renameTilePalette.call(themeManager, activeId, desiredName);
      if (!renamed) {
        setNote("当前色板不可重命名。", "err");
        return;
      }
      setNote("色板已重命名。", "ok");
      refresh();
    });

    deleteBtn.addEventListener("click", function () {
      var activeId = resolveText(getActiveTilePaletteId.call(themeManager));
      if (!activeId) return;
      if (global.confirm && !global.confirm("确认删除当前色板？")) return;
      var deleted = !!deleteTilePalette.call(themeManager, activeId);
      if (!deleted) {
        setNote("当前色板不可删除。", "err");
        return;
      }
      setNote("色板已删除。", "ok");
      refresh();
    });

    exportBtn.addEventListener("click", function () {
      var payload = resolveText(exportTilePalettes.call(themeManager));
      if (!payload) {
        setNote("导出失败。", "err");
        return;
      }
      if (!global.Blob || !global.URL || typeof global.URL.createObjectURL !== "function") {
        setNote("当前环境不支持导出。", "err");
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
      setNote("色板已导出。", "ok");
    });

    importBtn.addEventListener("click", function () {
      if (importInput && typeof importInput.click === "function") {
        importInput.click();
      }
    });

    importInput.addEventListener("change", function () {
      var file = toRecord(importInput.files)[0];
      if (!file) return;

      var handleText = function (textValue) {
        var result = toRecord(importTilePalettes.call(themeManager, resolveText(textValue)));
        var count = Number(result.importedCount) || 0;
        if (count <= 0) {
          setNote("导入失败，请检查 JSON 格式。", "err");
          return;
        }
        var renamed = resolveArray(result.renamed);
        if (renamed.length > 0) {
          setNote("已导入 " + count + " 个色板，部分名称已自动重命名。", "ok");
        } else {
          setNote("已导入 " + count + " 个色板。", "ok");
        }
        refresh();
      };

      if (typeof file.text === "function") {
        file.text()
          .then(handleText)
          .catch(function () {
            setNote("读取所选文件失败。", "err");
          });
        return;
      }

      if (!global.FileReader) {
        setNote("当前环境不支持导入。", "err");
        return;
      }
      var reader = new global.FileReader();
      reader.onload = function () {
        handleText(resolveText(reader.result));
      };
      reader.onerror = function () {
        setNote("读取所选文件失败。", "err");
      };
      reader.readAsText(file);
    });

    global.addEventListener("themechange", function () {
      refresh();
    });

    setNote("已加载色板中心。", "ok");
    refresh();
  }

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", bootPalettePage);
  } else {
    bootPalettePage();
  }
})(typeof window !== "undefined" ? window : undefined);
