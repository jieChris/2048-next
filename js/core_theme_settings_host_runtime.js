(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function resolveText(value) {
    return value == null ? "" : String(value);
  }

  function resolveBoolean(value) {
    return !!value;
  }

  function resolveNumber(value, fallback) {
    var parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    return fallback;
  }

  function resolveArray(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    var record = toRecord(value);
    var length = resolveNumber(record.length, 0);
    if (length <= 0) return [];
    var result = [];
    for (var i = 0; i < length; i += 1) {
      result.push(record[i]);
    }
    return result;
  }

  function getElementById(documentLike, id) {
    var getter = asFunction(toRecord(documentLike).getElementById);
    if (!getter) return null;
    return getter.call(documentLike, id);
  }

  function querySelector(node, selector) {
    var query = asFunction(toRecord(node).querySelector);
    if (!query) return null;
    return query.call(node, selector);
  }

  function querySelectorAll(node, selector) {
    var query = asFunction(toRecord(node).querySelectorAll);
    if (!query) return [];
    return resolveArray(query.call(node, selector));
  }

  function createElement(documentLike, tagName) {
    var creator = asFunction(toRecord(documentLike).createElement);
    if (!creator) return null;
    return creator.call(documentLike, tagName);
  }

  function appendChild(node, child) {
    var append = asFunction(toRecord(node).appendChild);
    if (!append) return;
    append.call(node, child);
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function stopPropagation(eventLike) {
    var stop = asFunction(toRecord(eventLike).stopPropagation);
    if (stop) stop.call(eventLike);
  }

  function getChildrenLength(node) {
    var children = toRecord(toRecord(node).children);
    if (typeof children.length === "number" && Number.isFinite(children.length)) {
      return Math.max(0, Math.floor(children.length));
    }
    var childElementCount = resolveNumber(toRecord(node).childElementCount, 0);
    return Math.max(0, childElementCount);
  }

  function classListContains(node, className) {
    var classList = toRecord(toRecord(node).classList);
    var contains = asFunction(classList.contains);
    if (!contains) return false;
    return !!contains.call(classList, className);
  }

  function classListAdd(node, className) {
    var classList = toRecord(toRecord(node).classList);
    var add = asFunction(classList.add);
    if (!add) return;
    add.call(classList, className);
  }

  function classListRemove(node, className) {
    var classList = toRecord(toRecord(node).classList);
    var remove = asFunction(classList.remove);
    if (!remove) return;
    remove.call(classList, className);
  }

  function setThemeOptionDatasetValue(optionLike, value) {
    var optionRecord = toRecord(optionLike);
    if (!isRecord(optionRecord.dataset)) {
      optionRecord.dataset = {
        value: value
      };
      return;
    }
    optionRecord.dataset.value = value;
  }

  function resolveThemeOptionFromEvent(eventLike, fallbackOption) {
    var eventRecord = toRecord(eventLike);
    return eventRecord.currentTarget || fallbackOption;
  }

  function resolveThemeOptionCount(container) {
    return querySelectorAll(container, ".custom-option").length;
  }

  function createEmptyResult() {
    return {
      hasThemeUi: false,
      didInitOptions: false,
      didBindTrigger: false,
      didBindOutside: false,
      didBindLeave: false,
      didBindThemeChange: false,
      didRenderPreview: false,
      didSyncUi: false,
      didApplyPreview: false,
      optionCount: 0
    };
  }

  function applyThemeSettingsUi(input) {
    var source = toRecord(input);
    var documentLike = toRecord(source.documentLike);
    var windowLike = toRecord(source.windowLike);
    var themeSettingsRuntime = toRecord(source.themeSettingsRuntime);
    var themeManager = toRecord(source.themeManager);

    var formatThemePreviewValue = asFunction(themeSettingsRuntime.formatThemePreviewValue);
    var resolveThemePreviewTileValues = asFunction(themeSettingsRuntime.resolveThemePreviewTileValues);
    var resolveThemePreviewLayout = asFunction(themeSettingsRuntime.resolveThemePreviewLayout);
    var resolveThemePreviewCssSelectors = asFunction(
      themeSettingsRuntime.resolveThemePreviewCssSelectors
    );
    var resolveThemeOptions = asFunction(themeSettingsRuntime.resolveThemeOptions);
    var resolveThemeSelectLabel = asFunction(themeSettingsRuntime.resolveThemeSelectLabel);
    var resolveThemeDropdownToggleState = asFunction(
      themeSettingsRuntime.resolveThemeDropdownToggleState
    );
    var resolveThemeBindingState = asFunction(themeSettingsRuntime.resolveThemeBindingState);
    var resolveThemeOptionValue = asFunction(themeSettingsRuntime.resolveThemeOptionValue);
    var resolveThemeOptionSelectedState = asFunction(
      themeSettingsRuntime.resolveThemeOptionSelectedState
    );

    if (
      !formatThemePreviewValue ||
      !resolveThemePreviewTileValues ||
      !resolveThemePreviewLayout ||
      !resolveThemePreviewCssSelectors ||
      !resolveThemeOptions ||
      !resolveThemeSelectLabel ||
      !resolveThemeDropdownToggleState ||
      !resolveThemeBindingState ||
      !resolveThemeOptionValue ||
      !resolveThemeOptionSelectedState
    ) {
      return createEmptyResult();
    }

    var getThemes = asFunction(themeManager.getThemes);
    var getCurrentTheme = asFunction(themeManager.getCurrentTheme);
    var applyTheme = asFunction(themeManager.applyTheme);
    var getPreviewCss = asFunction(themeManager.getPreviewCss);
    var getTileValues = asFunction(themeManager.getTileValues);
    var getTilePalettes = asFunction(themeManager.getTilePalettes);
    var getActiveTilePaletteId = asFunction(themeManager.getActiveTilePaletteId);
    var setActiveTilePalette = asFunction(themeManager.setActiveTilePalette);
    var createTilePalette = asFunction(themeManager.createTilePalette);
    var renameTilePalette = asFunction(themeManager.renameTilePalette);
    var deleteTilePalette = asFunction(themeManager.deleteTilePalette);
    var updateTilePaletteColor = asFunction(themeManager.updateTilePaletteColor);
    var exportTilePalettes = asFunction(themeManager.exportTilePalettes);
    var importTilePalettes = asFunction(themeManager.importTilePalettes);

    if (!getThemes || !getCurrentTheme || !applyTheme) {
      return createEmptyResult();
    }

    var originalSelect = getElementById(documentLike, "theme-select");
    var previewRoot = getElementById(documentLike, "theme-preview-grid");
    var customTrigger = getElementById(documentLike, "theme-select-trigger");
    var customOptionsContainer = getElementById(documentLike, "theme-select-options");
    var customSelect = querySelector(documentLike, ".custom-select");

    if (!originalSelect || !previewRoot || !customTrigger || !customOptionsContainer || !customSelect) {
      return createEmptyResult();
    }

    var themes = resolveArray(
      resolveThemeOptions.call(themeSettingsRuntime, {
        themes: getThemes.call(themeManager)
      })
    );
    var confirmedTheme = resolveText(getCurrentTheme.call(themeManager));
    var previewLayout = toRecord(resolveThemePreviewLayout.call(themeSettingsRuntime));

    var ensurePreviewStyleTag = function () {
      var style = getElementById(documentLike, "theme-preview-style");
      if (style) return style;
      style = createElement(documentLike, "style");
      if (!style) return null;
      toRecord(style).id = "theme-preview-style";
      appendChild(documentLike.head, style);
      return style;
    };

    var ensureDualPreviewGrids = function () {
      var previewRootRecord = toRecord(previewRoot);
      var existingRefs = toRecord(previewRootRecord.__dualPreviewRefs);
      if (existingRefs.pow2 || existingRefs.fib) return existingRefs;

      previewRootRecord.className = resolveText(previewLayout.containerClassName);
      previewRootRecord.innerHTML = resolveText(previewLayout.innerHtml);
      var refs = {
        pow2: getElementById(documentLike, resolveText(previewLayout.pow2GridId)),
        fib: getElementById(documentLike, resolveText(previewLayout.fibonacciGridId))
      };
      previewRootRecord.__dualPreviewRefs = refs;
      return toRecord(previewRootRecord.__dualPreviewRefs);
    };

    var renderPreviewGrid = function (gridEl, values) {
      if (!gridEl) return false;
      var gridRecord = toRecord(gridEl);
      gridRecord.innerHTML = "";
      var valueList = resolveArray(values);
      var renderedCount = 0;
      for (var i = 0; i < valueList.length; i += 1) {
        var value = valueList[i];
        var tile = createElement(documentLike, "div");
        if (!tile) continue;
        var tileRecord = toRecord(tile);
        tileRecord.className = "theme-preview-tile theme-color-" + resolveText(value);
        tileRecord.textContent = resolveText(formatThemePreviewValue.call(themeSettingsRuntime, value));
        appendChild(gridEl, tile);
        renderedCount += 1;
      }
      return renderedCount > 0;
    };

    var getPreviewCssText = function (themeId) {
      if (!getPreviewCss) return "";
      var cssSelectors = toRecord(
        resolveThemePreviewCssSelectors.call(themeSettingsRuntime, {
          previewLayout: previewLayout,
          fallbackPow2Selector: "#theme-preview-grid-pow2",
          fallbackFibonacciSelector: "#theme-preview-grid-fib"
        })
      );
      return resolveText(
        getPreviewCss.call(themeManager, themeId, {
          pow2Selector: resolveText(cssSelectors.pow2Selector),
          fibSelector: resolveText(cssSelectors.fibSelector)
        })
      );
    };

    var applyPreviewTheme = function (themeId) {
      var style = ensurePreviewStyleTag();
      if (!style) return false;
      toRecord(style).textContent = getPreviewCssText(themeId);
      return true;
    };

    var renderDualPreviewGrids = function () {
      var refs = ensureDualPreviewGrids();
      var previewValues = toRecord(
        resolveThemePreviewTileValues.call(themeSettingsRuntime, {
          getTileValues: getTileValues
            ? function (ruleset) {
                return getTileValues.call(themeManager, ruleset);
              }
            : null
        })
      );
      var didRenderPow2 = renderPreviewGrid(refs.pow2, previewValues.pow2Values);
      var didRenderFib = renderPreviewGrid(refs.fib, previewValues.fibonacciValues);
      return didRenderPow2 || didRenderFib;
    };

    var updateCustomSelectUi = function () {
      var currentThemeId = resolveText(getCurrentTheme.call(themeManager));
      var label = resolveText(
        resolveThemeSelectLabel.call(themeSettingsRuntime, {
          themes: themes,
          currentThemeId: currentThemeId,
          fallbackLabel: "选择主题"
        })
      );
      var triggerText = querySelector(customTrigger, "span");
      if (triggerText) {
        toRecord(triggerText).textContent = label;
      }
      var options = querySelectorAll(customOptionsContainer, ".custom-option");
      for (var i = 0; i < options.length; i += 1) {
        var option = options[i];
        var optionValue = resolveText(
          resolveThemeOptionValue.call(themeSettingsRuntime, {
            optionLike: option
          })
        );
        var selected = resolveBoolean(
          resolveThemeOptionSelectedState.call(themeSettingsRuntime, {
            optionValue: optionValue,
            currentThemeId: currentThemeId
          })
        );
        if (selected) {
          classListAdd(option, "selected");
        } else {
          classListRemove(option, "selected");
        }
      }
      return true;
    };

    var syncTilePaletteUi = function () { return false; };

    var initTilePaletteSettingsUi = function () {
      if (
        !getTilePalettes ||
        !getActiveTilePaletteId ||
        !setActiveTilePalette ||
        !createTilePalette ||
        !renameTilePalette ||
        !deleteTilePalette ||
        !updateTilePaletteColor ||
        !exportTilePalettes ||
        !importTilePalettes
      ) {
        return false;
      }

      var paletteSelect = getElementById(documentLike, "tile-palette-select");
      var createBtn = getElementById(documentLike, "tile-palette-create-btn");
      var renameBtn = getElementById(documentLike, "tile-palette-rename-btn");
      var deleteBtn = getElementById(documentLike, "tile-palette-delete-btn");
      var exportBtn = getElementById(documentLike, "tile-palette-export-btn");
      var importBtn = getElementById(documentLike, "tile-palette-import-btn");
      var importInput = getElementById(documentLike, "tile-palette-import-input");
      var nameInput = getElementById(documentLike, "tile-palette-name-input");
      var note = getElementById(documentLike, "tile-palette-note");
      var pow2Editor = getElementById(documentLike, "tile-palette-editor-pow2");
      var fibEditor = getElementById(documentLike, "tile-palette-editor-fibonacci");

      if (
        !paletteSelect ||
        !createBtn ||
        !renameBtn ||
        !deleteBtn ||
        !exportBtn ||
        !importBtn ||
        !importInput ||
        !nameInput ||
        !pow2Editor ||
        !fibEditor
      ) {
        return false;
      }

      var fallbackPow2 = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
      var fallbackFib = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];
      var resolveDisplayValues = function (ruleset, fallback) {
        if (!getTileValues) return fallback.slice();
        var values = resolveArray(getTileValues.call(themeManager, ruleset));
        if (!values.length) return fallback.slice();
        var normalized = [];
        for (var i = 0; i < Math.min(16, values.length); i += 1) {
          normalized.push(values[i]);
        }
        while (normalized.length < 16) {
          normalized.push(fallback[normalized.length] || normalized.length + 1);
        }
        return normalized;
      };
      var pow2DisplayValues = resolveDisplayValues("pow2", fallbackPow2);
      var fibDisplayValues = resolveDisplayValues("fibonacci", fallbackFib);

      var setNote = function (message, isError) {
        if (!note) return;
        var noteRecord = toRecord(note);
        noteRecord.textContent = resolveText(message);
        var noteStyle = toRecord(noteRecord.style);
        noteStyle.color = message ? (isError ? "#c0392b" : "#6b8e23") : "";
        noteRecord.style = noteStyle;
      };

      var getPaletteMap = function () {
        var list = resolveArray(getTilePalettes.call(themeManager));
        var map = {};
        for (var i = 0; i < list.length; i += 1) {
          var item = toRecord(list[i]);
          var id = resolveText(item.id);
          if (!id) continue;
          map[id] = item;
        }
        return {
          list: list,
          map: map
        };
      };

      var renderPaletteSelectOptions = function (list, activeId) {
        var selectRecord = toRecord(paletteSelect);
        selectRecord.innerHTML = "";
        for (var i = 0; i < list.length; i += 1) {
          var palette = toRecord(list[i]);
          var option = createElement(documentLike, "option");
          if (!option) continue;
          var optionRecord = toRecord(option);
          optionRecord.value = resolveText(palette.id);
          optionRecord.textContent = resolveText(palette.name);
          appendChild(paletteSelect, option);
        }
        selectRecord.value = activeId;
      };

      var renderPaletteColorEditor = function (host, palette, ruleset, labels, locked) {
        var hostRecord = toRecord(host);
        hostRecord.innerHTML = "";
        var colors = resolveArray(toRecord(palette)[ruleset]);
        for (var i = 0; i < 16; i += 1) {
          var color = resolveText(colors[i] || "#000000");
          var row = createElement(documentLike, "label");
          if (!row) continue;
          var rowRecord = toRecord(row);
          rowRecord.className = "tile-palette-color-item";

          var picker = createElement(documentLike, "input");
          if (!picker) continue;
          var pickerRecord = toRecord(picker);
          pickerRecord.type = "color";
          pickerRecord.value = color;
          pickerRecord.disabled = locked;

          var label = createElement(documentLike, "span");
          if (label) {
            var labelRecord = toRecord(label);
            labelRecord.className = "tile-palette-color-label";
            labelRecord.textContent = resolveText(labels[i]);
            appendChild(row, label);
          }

          bindListener(picker, "change", function () {
            var currentId = resolveText(toRecord(paletteSelect).value || getActiveTilePaletteId.call(themeManager));
            var changedColor = resolveText(toRecord(this).value);
            var index = resolveNumber(toRecord(this).dataset ? toRecord(this).dataset.index : null, 0);
            var changedRuleset = resolveText(toRecord(this).dataset ? toRecord(this).dataset.ruleset : "pow2");
            var updated = !!updateTilePaletteColor.call(
              themeManager,
              currentId,
              changedRuleset,
              index,
              changedColor
            );
            if (!updated) {
              setNote("当前色板为只读，请先新建副本。", true);
              return;
            }
            setNote("色板颜色已更新。", false);
            refreshPaletteUi();
          });

          var pickerDataset = toRecord(pickerRecord.dataset);
          pickerDataset.index = String(i);
          pickerDataset.ruleset = ruleset;
          if (!pickerRecord.dataset) {
            var setAttribute = asFunction(pickerRecord.setAttribute);
            if (setAttribute) {
              setAttribute.call(picker, "data-index", String(i));
              setAttribute.call(picker, "data-ruleset", ruleset);
            }
          }

          appendChild(row, picker);
          appendChild(host, row);
        }
      };

      var refreshPaletteUi = function () {
        var payload = getPaletteMap();
        var list = payload.list;
        var map = payload.map;
        var activeId = resolveText(getActiveTilePaletteId.call(themeManager));
        if (!map[activeId] && list.length > 0) {
          activeId = resolveText(toRecord(list[0]).id);
        }
        renderPaletteSelectOptions(list, activeId);

        var activePalette = toRecord(map[activeId]);
        var locked = resolveBoolean(activePalette.locked || activePalette.source !== "custom");
        toRecord(nameInput).value = resolveText(activePalette.name);
        toRecord(renameBtn).disabled = locked;
        toRecord(deleteBtn).disabled = locked;

        renderPaletteColorEditor(pow2Editor, activePalette, "pow2", pow2DisplayValues, locked);
        renderPaletteColorEditor(fibEditor, activePalette, "fibonacci", fibDisplayValues, locked);
      };

      if (!toRecord(paletteSelect).__tilePaletteBound) {
        toRecord(paletteSelect).__tilePaletteBound = true;
        bindListener(paletteSelect, "change", function () {
          var selectedId = resolveText(toRecord(paletteSelect).value);
          setActiveTilePalette.call(themeManager, selectedId);
          refreshPaletteUi();
        });
      }

      if (!toRecord(createBtn).__tilePaletteBound) {
        toRecord(createBtn).__tilePaletteBound = true;
        bindListener(createBtn, "click", function () {
          var activeId = resolveText(getActiveTilePaletteId.call(themeManager));
          var inputName = resolveText(toRecord(nameInput).value).trim();
          createTilePalette.call(themeManager, activeId, inputName || "自定义色板");
          refreshPaletteUi();
          setNote("已新建色板。", false);
        });
      }

      if (!toRecord(renameBtn).__tilePaletteBound) {
        toRecord(renameBtn).__tilePaletteBound = true;
        bindListener(renameBtn, "click", function () {
          var activeId = resolveText(getActiveTilePaletteId.call(themeManager));
          var inputName = resolveText(toRecord(nameInput).value).trim();
          if (!inputName) {
            setNote("请输入色板名称。", true);
            return;
          }
          var renamed = renameTilePalette.call(themeManager, activeId, inputName);
          if (!renamed) {
            setNote("当前色板不可重命名。", true);
            return;
          }
          refreshPaletteUi();
          setNote("已重命名色板。", false);
        });
      }

      if (!toRecord(deleteBtn).__tilePaletteBound) {
        toRecord(deleteBtn).__tilePaletteBound = true;
        bindListener(deleteBtn, "click", function () {
          var activeId = resolveText(getActiveTilePaletteId.call(themeManager));
          var confirmFn = asFunction(toRecord(windowLike).confirm);
          if (confirmFn && !confirmFn.call(windowLike, "确认删除当前色板？")) return;
          var deleted = deleteTilePalette.call(themeManager, activeId);
          if (!deleted) {
            setNote("当前色板不可删除。", true);
            return;
          }
          refreshPaletteUi();
          setNote("已删除色板。", false);
        });
      }

      if (!toRecord(exportBtn).__tilePaletteBound) {
        toRecord(exportBtn).__tilePaletteBound = true;
        bindListener(exportBtn, "click", function () {
          var payload = resolveText(exportTilePalettes.call(themeManager));
          var blobCtor = toRecord(windowLike).Blob || (typeof Blob === "function" ? Blob : null);
          var urlApi = toRecord(windowLike).URL || (typeof URL !== "undefined" ? URL : null);
          if (!blobCtor || !urlApi || typeof urlApi.createObjectURL !== "function") {
            setNote("当前环境不支持导出。", true);
            return;
          }
          var blob = new blobCtor([payload], { type: "application/json" });
          var downloadUrl = urlApi.createObjectURL(blob);
          var anchor = createElement(documentLike, "a");
          if (!anchor) {
            if (typeof urlApi.revokeObjectURL === "function") urlApi.revokeObjectURL(downloadUrl);
            setNote("导出失败。", true);
            return;
          }
          var anchorRecord = toRecord(anchor);
          anchorRecord.href = downloadUrl;
          anchorRecord.download = "tile-palettes.json";
          var click = asFunction(anchorRecord.click);
          if (click) click.call(anchorRecord);
          if (typeof urlApi.revokeObjectURL === "function") {
            setTimeout(function () {
              urlApi.revokeObjectURL(downloadUrl);
            }, 0);
          }
          setNote("色板已导出。", false);
        });
      }

      if (!toRecord(importBtn).__tilePaletteBound) {
        toRecord(importBtn).__tilePaletteBound = true;
        bindListener(importBtn, "click", function () {
          var click = asFunction(toRecord(importInput).click);
          if (click) click.call(importInput);
        });
      }

      if (!toRecord(importInput).__tilePaletteBound) {
        toRecord(importInput).__tilePaletteBound = true;
        bindListener(importInput, "change", function () {
          var inputRecord = toRecord(importInput);
          var files = toRecord(inputRecord.files);
          var file = files[0];
          if (!file) return;

          var done = function (textValue) {
            var result = toRecord(importTilePalettes.call(themeManager, textValue));
            refreshPaletteUi();
            var importedCount = resolveNumber(result.importedCount, 0);
            if (importedCount <= 0) {
              setNote("导入失败，请检查 JSON 格式。", true);
              return;
            }
            var renamed = resolveArray(result.renamed);
            if (renamed.length > 0) {
              setNote("已导入 " + importedCount + " 个色板，部分名称已自动重命名。", false);
              return;
            }
            setNote("已导入 " + importedCount + " 个色板。", false);
          };

          if (typeof file.text === "function") {
            file.text().then(function (content) {
              done(resolveText(content));
            }).catch(function () {
              setNote("读取所选文件失败。", true);
            });
            return;
          }

          var fileReaderCtor = toRecord(windowLike).FileReader || (typeof FileReader === "function" ? FileReader : null);
          if (!fileReaderCtor) {
            setNote("当前环境不支持导入。", true);
            return;
          }
          var reader = new fileReaderCtor();
          reader.onload = function () {
            done(resolveText(reader.result));
          };
          reader.onerror = function () {
            setNote("读取所选文件失败。", true);
          };
          reader.readAsText(file);
        });
      }

      refreshPaletteUi();
      syncTilePaletteUi = function () {
        refreshPaletteUi();
        return true;
      };
      return true;
    };

    var closeDropdown = function () {
      classListRemove(customSelect, "open");
      applyPreviewTheme(confirmedTheme);
    };

    var toggleDropdown = function (eventLike) {
      stopPropagation(eventLike);
      var isOpen = classListContains(customSelect, "open");
      var resolveDropdownStateNow = asFunction(
        themeSettingsRuntime.resolveThemeDropdownToggleState
      );
      if (!resolveDropdownStateNow) return;
      var toggleState = toRecord(
        resolveDropdownStateNow.call(themeSettingsRuntime, {
          isOpen: isOpen
        })
      );
      if (!resolveBoolean(toggleState.shouldOpen)) {
        closeDropdown();
        return;
      }
      confirmedTheme = resolveText(getCurrentTheme.call(themeManager));
      classListAdd(customSelect, "open");
      var selected = querySelector(customOptionsContainer, ".custom-option.selected");
      if (!selected) return;
      var selectedOffset = resolveNumber(toRecord(selected).offsetTop, 0);
      var containerOffset = resolveNumber(toRecord(customOptionsContainer).offsetTop, 0);
      toRecord(customOptionsContainer).scrollTop = selectedOffset - containerOffset;
    };

    var didInitOptions = false;
    if (getChildrenLength(customOptionsContainer) === 0) {
      toRecord(customOptionsContainer).innerHTML = "";
      for (var i = 0; i < themes.length; i += 1) {
        var theme = toRecord(themes[i]);
        var option = createElement(documentLike, "div");
        if (!option) continue;
        var optionRecord = toRecord(option);
        optionRecord.className = "custom-option";
        optionRecord.textContent = resolveText(theme.label);
        setThemeOptionDatasetValue(option, resolveText(theme.id));
        bindListener(option, "click", function (eventLike) {
          stopPropagation(eventLike);
          var optionLike = resolveThemeOptionFromEvent(eventLike, option);
          var value = resolveText(
            resolveThemeOptionValue.call(themeSettingsRuntime, {
              optionLike: optionLike
            })
          );
          confirmedTheme = value;
          applyTheme.call(themeManager, value);
          applyPreviewTheme(value);
          closeDropdown();
        });
        bindListener(option, "mouseenter", function (eventLike) {
          var optionLike = resolveThemeOptionFromEvent(eventLike, option);
          var value = resolveText(
            resolveThemeOptionValue.call(themeSettingsRuntime, {
              optionLike: optionLike
            })
          );
          applyPreviewTheme(value);
        });
        appendChild(customOptionsContainer, option);
        didInitOptions = true;
      }
    }

    var didBindTrigger = false;
    var triggerBindingState = toRecord(
      resolveThemeBindingState.call(themeSettingsRuntime, {
        alreadyBound: resolveBoolean(toRecord(customTrigger).__bound)
      })
    );
    if (resolveBoolean(triggerBindingState.shouldBind)) {
      if (bindListener(customTrigger, "click", toggleDropdown)) {
        toRecord(customTrigger).__bound = triggerBindingState.boundValue;
        didBindTrigger = true;
      }
    }

    var didBindOutside = false;
    var outsideBindingState = toRecord(
      resolveThemeBindingState.call(themeSettingsRuntime, {
        alreadyBound: resolveBoolean(windowLike.__clickOutsideBound)
      })
    );
    if (resolveBoolean(outsideBindingState.shouldBind)) {
      if (
        bindListener(documentLike, "click", function (eventLike) {
          var target = toRecord(eventLike).target;
          var contains = asFunction(toRecord(customSelect).contains);
          if (!contains || !contains.call(customSelect, target)) {
            closeDropdown();
          }
        })
      ) {
        windowLike.__clickOutsideBound = outsideBindingState.boundValue;
        didBindOutside = true;
      }
    }

    var didBindLeave = false;
    var leaveBindingState = toRecord(
      resolveThemeBindingState.call(themeSettingsRuntime, {
        alreadyBound: resolveBoolean(toRecord(customSelect).__mouseleaveBound)
      })
    );
    if (resolveBoolean(leaveBindingState.shouldBind)) {
      if (
        bindListener(customSelect, "mouseleave", function () {
          if (classListContains(customSelect, "open")) {
            applyPreviewTheme(confirmedTheme);
          }
        })
      ) {
        toRecord(customSelect).__mouseleaveBound = leaveBindingState.boundValue;
        didBindLeave = true;
      }
    }

    var didRenderPreview = renderDualPreviewGrids();
    var didSyncUi = updateCustomSelectUi();
    var didApplyPreview = applyPreviewTheme(confirmedTheme);
    initTilePaletteSettingsUi();

    var didBindThemeChange = false;
    var changeSyncBindingState = toRecord(
      resolveThemeBindingState.call(themeSettingsRuntime, {
        alreadyBound: resolveBoolean(windowLike.__themeChangeSyncBound)
      })
    );
    if (resolveBoolean(changeSyncBindingState.shouldBind)) {
      if (
        bindListener(windowLike, "themechange", function () {
          confirmedTheme = resolveText(getCurrentTheme.call(themeManager));
          updateCustomSelectUi();
          applyPreviewTheme(confirmedTheme);
          syncTilePaletteUi();
        })
      ) {
        windowLike.__themeChangeSyncBound = changeSyncBindingState.boundValue;
        didBindThemeChange = true;
      }
    }

    return {
      hasThemeUi: true,
      didInitOptions: didInitOptions,
      didBindTrigger: didBindTrigger,
      didBindOutside: didBindOutside,
      didBindLeave: didBindLeave,
      didBindThemeChange: didBindThemeChange,
      didRenderPreview: didRenderPreview,
      didSyncUi: didSyncUi,
      didApplyPreview: didApplyPreview,
      optionCount: resolveThemeOptionCount(customOptionsContainer)
    };
  }

  global.CoreThemeSettingsHostRuntime = global.CoreThemeSettingsHostRuntime || {};
  global.CoreThemeSettingsHostRuntime.applyThemeSettingsUi = applyThemeSettingsUi;
})(typeof window !== "undefined" ? window : undefined);
