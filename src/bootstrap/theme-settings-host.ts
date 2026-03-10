function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveText(value: unknown): string {
  return value == null ? "" : String(value);
}

function resolveBoolean(value: unknown): boolean {
  return !!value;
}

function resolveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  return fallback;
}

function resolveArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const record = toRecord(value);
  const length = resolveNumber(record.length, 0);
  if (length <= 0) return [];
  const result: unknown[] = [];
  for (let i = 0; i < length; i += 1) {
    result.push(record[i]);
  }
  return result;
}

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

function querySelectorAll(node: unknown, selector: string): unknown[] {
  const query = asFunction<(value: string) => unknown>(toRecord(node).querySelectorAll);
  if (!query) return [];
  return resolveArray((query as unknown as Function).call(node, selector));
}

function createElement(documentLike: unknown, tagName: string): unknown {
  const creator = asFunction<(value: string) => unknown>(toRecord(documentLike).createElement);
  if (!creator) return null;
  return (creator as unknown as Function).call(documentLike, tagName);
}

function appendChild(node: unknown, child: unknown): void {
  const append = asFunction<(value: unknown) => unknown>(toRecord(node).appendChild);
  if (!append) return;
  (append as unknown as Function).call(node, child);
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

function stopPropagation(eventLike: unknown): void {
  const stop = asFunction<() => unknown>(toRecord(eventLike).stopPropagation);
  if (stop) stop.call(eventLike);
}

function getChildrenLength(node: unknown): number {
  const children = toRecord(toRecord(node).children);
  if (typeof children.length === "number" && Number.isFinite(children.length)) {
    return Math.max(0, Math.floor(children.length));
  }
  const childElementCount = resolveNumber(toRecord(node).childElementCount, 0);
  return Math.max(0, childElementCount);
}

function classListContains(node: unknown, className: string): boolean {
  const classList = toRecord(toRecord(node).classList);
  const contains = asFunction<(value: string) => unknown>(classList.contains);
  if (!contains) return false;
  return !!contains.call(classList, className);
}

function classListAdd(node: unknown, className: string): void {
  const classList = toRecord(toRecord(node).classList);
  const add = asFunction<(value: string) => unknown>(classList.add);
  if (!add) return;
  add.call(classList, className);
}

function classListRemove(node: unknown, className: string): void {
  const classList = toRecord(toRecord(node).classList);
  const remove = asFunction<(value: string) => unknown>(classList.remove);
  if (!remove) return;
  remove.call(classList, className);
}

function setThemeOptionDatasetValue(optionLike: unknown, value: string): void {
  const optionRecord = toRecord(optionLike);
  if (!isRecord(optionRecord.dataset)) {
    optionRecord.dataset = {
      value
    };
    return;
  }
  optionRecord.dataset.value = value;
}

function resolveThemeOptionFromEvent(eventLike: unknown, fallbackOption: unknown): unknown {
  const eventRecord = toRecord(eventLike);
  return eventRecord.currentTarget || fallbackOption;
}

function resolveThemeOptionCount(container: unknown): number {
  return querySelectorAll(container, ".custom-option").length;
}

export interface ThemeSettingsHostResult {
  hasThemeUi: boolean;
  didInitOptions: boolean;
  didBindTrigger: boolean;
  didBindOutside: boolean;
  didBindLeave: boolean;
  didBindThemeChange: boolean;
  didRenderPreview: boolean;
  didSyncUi: boolean;
  didApplyPreview: boolean;
  optionCount: number;
}

function createEmptyResult(): ThemeSettingsHostResult {
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

export function applyThemeSettingsUi(input: {
  documentLike?: unknown;
  windowLike?: unknown;
  themeSettingsRuntime?: unknown;
  themeManager?: unknown;
}): ThemeSettingsHostResult {
  const source = toRecord(input);
  const documentLike = toRecord(source.documentLike);
  const windowLike = toRecord(source.windowLike);
  const themeSettingsRuntime = toRecord(source.themeSettingsRuntime);
  const themeManager = toRecord(source.themeManager);

  const formatThemePreviewValue = asFunction<(value: unknown) => unknown>(
    themeSettingsRuntime.formatThemePreviewValue
  );
  const resolveThemePreviewTileValues = asFunction<(payload: unknown) => unknown>(
    themeSettingsRuntime.resolveThemePreviewTileValues
  );
  const resolveThemePreviewLayout = asFunction<() => unknown>(themeSettingsRuntime.resolveThemePreviewLayout);
  const resolveThemePreviewCssSelectors = asFunction<(payload: unknown) => unknown>(
    themeSettingsRuntime.resolveThemePreviewCssSelectors
  );
  const resolveThemeOptions = asFunction<(payload: unknown) => unknown>(themeSettingsRuntime.resolveThemeOptions);
  const resolveThemeSelectLabel = asFunction<(payload: unknown) => unknown>(
    themeSettingsRuntime.resolveThemeSelectLabel
  );
  const resolveThemeDropdownToggleState = asFunction<(payload: unknown) => unknown>(
    themeSettingsRuntime.resolveThemeDropdownToggleState
  );
  const resolveThemeBindingState = asFunction<(payload: unknown) => unknown>(
    themeSettingsRuntime.resolveThemeBindingState
  );
  const resolveThemeOptionValue = asFunction<(payload: unknown) => unknown>(
    themeSettingsRuntime.resolveThemeOptionValue
  );
  const resolveThemeOptionSelectedState = asFunction<(payload: unknown) => unknown>(
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

  const getThemes = asFunction<() => unknown>(themeManager.getThemes);
  const getCurrentTheme = asFunction<() => unknown>(themeManager.getCurrentTheme);
  const applyTheme = asFunction<(themeId: string) => unknown>(themeManager.applyTheme);
  const getPreviewCss = asFunction<(themeId: string, selectors: unknown) => unknown>(themeManager.getPreviewCss);
  const getTileValues = asFunction<(ruleset: "pow2" | "fibonacci") => unknown>(themeManager.getTileValues);
  const getTilePalettes = asFunction<() => unknown>(themeManager.getTilePalettes);
  const getActiveTilePaletteId = asFunction<() => unknown>(themeManager.getActiveTilePaletteId);
  const setActiveTilePalette = asFunction<(id: string) => unknown>(themeManager.setActiveTilePalette);
  const createTilePalette = asFunction<(baseId: string, name: string) => unknown>(themeManager.createTilePalette);
  const renameTilePalette = asFunction<(id: string, name: string) => unknown>(themeManager.renameTilePalette);
  const deleteTilePalette = asFunction<(id: string) => unknown>(themeManager.deleteTilePalette);
  const updateTilePaletteColor = asFunction<(
    id: string,
    ruleset: "pow2" | "fibonacci",
    index: number,
    color: string
  ) => unknown>(themeManager.updateTilePaletteColor);
  const exportTilePalettes = asFunction<() => unknown>(themeManager.exportTilePalettes);
  const importTilePalettes = asFunction<(payload: unknown) => unknown>(themeManager.importTilePalettes);

  if (!getThemes || !getCurrentTheme || !applyTheme) {
    return createEmptyResult();
  }

  const originalSelect = getElementById(documentLike, "theme-select");
  const previewRoot = getElementById(documentLike, "theme-preview-grid");
  const customTrigger = getElementById(documentLike, "theme-select-trigger");
  const customOptionsContainer = getElementById(documentLike, "theme-select-options");
  const customSelect = querySelector(documentLike, ".custom-select");

  if (!originalSelect || !previewRoot || !customTrigger || !customOptionsContainer || !customSelect) {
    return createEmptyResult();
  }

  const themes = resolveArray(
    resolveThemeOptions.call(themeSettingsRuntime, {
      themes: getThemes.call(themeManager)
    })
  );
  let confirmedTheme = resolveText(getCurrentTheme.call(themeManager));
  const previewLayout = toRecord(resolveThemePreviewLayout.call(themeSettingsRuntime));

  const ensurePreviewStyleTag = function (): unknown {
    let style = getElementById(documentLike, "theme-preview-style");
    if (style) return style;
    style = createElement(documentLike, "style");
    if (!style) return null;
    toRecord(style).id = "theme-preview-style";
    appendChild(documentLike.head, style);
    return style;
  };

  const ensureDualPreviewGrids = function (): Record<string, unknown> {
    const previewRootRecord = toRecord(previewRoot);
    const existingRefs = toRecord(previewRootRecord.__dualPreviewRefs);
    if (existingRefs.pow2 || existingRefs.fib) return existingRefs;

    previewRootRecord.className = resolveText(previewLayout.containerClassName);
    previewRootRecord.innerHTML = resolveText(previewLayout.innerHtml);
    const refs = {
      pow2: getElementById(documentLike, resolveText(previewLayout.pow2GridId)),
      fib: getElementById(documentLike, resolveText(previewLayout.fibonacciGridId))
    };
    previewRootRecord.__dualPreviewRefs = refs;
    return toRecord(previewRootRecord.__dualPreviewRefs);
  };

  const renderPreviewGrid = function (gridEl: unknown, values: unknown): boolean {
    if (!gridEl) return false;
    const gridRecord = toRecord(gridEl);
    gridRecord.innerHTML = "";
    const valueList = resolveArray(values);
    let renderedCount = 0;
    for (let i = 0; i < valueList.length; i += 1) {
      const value = valueList[i];
      const tile = createElement(documentLike, "div");
      if (!tile) continue;
      const tileRecord = toRecord(tile);
      tileRecord.className = "theme-preview-tile theme-color-" + resolveText(value);
      tileRecord.textContent = resolveText(formatThemePreviewValue.call(themeSettingsRuntime, value));
      appendChild(gridEl, tile);
      renderedCount += 1;
    }
    return renderedCount > 0;
  };

  const getPreviewCssText = function (themeId: string): string {
    if (!getPreviewCss) return "";
    const cssSelectors = toRecord(
      resolveThemePreviewCssSelectors.call(themeSettingsRuntime, {
        previewLayout,
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

  const applyPreviewTheme = function (themeId: string): boolean {
    const style = ensurePreviewStyleTag();
    if (!style) return false;
    toRecord(style).textContent = getPreviewCssText(themeId);
    return true;
  };

  const renderDualPreviewGrids = function (): boolean {
    const refs = ensureDualPreviewGrids();
    const previewValues = toRecord(
      resolveThemePreviewTileValues.call(themeSettingsRuntime, {
        getTileValues: getTileValues
          ? function (ruleset: "pow2" | "fibonacci") {
              return getTileValues.call(themeManager, ruleset);
            }
          : null
      })
    );
    const didRenderPow2 = renderPreviewGrid(refs.pow2, previewValues.pow2Values);
    const didRenderFib = renderPreviewGrid(refs.fib, previewValues.fibonacciValues);
    return didRenderPow2 || didRenderFib;
  };

  const updateCustomSelectUi = function (): boolean {
    const currentThemeId = resolveText(getCurrentTheme.call(themeManager));
    const label = resolveText(
      resolveThemeSelectLabel.call(themeSettingsRuntime, {
        themes,
        currentThemeId,
        fallbackLabel: "选择主题"
      })
    );
    const triggerText = querySelector(customTrigger, "span");
    if (triggerText) {
      toRecord(triggerText).textContent = label;
    }
    const options = querySelectorAll(customOptionsContainer, ".custom-option");
    for (let i = 0; i < options.length; i += 1) {
      const option = options[i];
      const optionValue = resolveText(
        resolveThemeOptionValue.call(themeSettingsRuntime, {
          optionLike: option
        })
      );
      const selected = resolveBoolean(
        resolveThemeOptionSelectedState.call(themeSettingsRuntime, {
          optionValue,
          currentThemeId
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

  let syncTilePaletteUi = function (): boolean {
    return false;
  };

  const initTilePaletteSettingsUi = function (): boolean {
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

    const paletteSelect = getElementById(documentLike, "tile-palette-select");
    const createBtn = getElementById(documentLike, "tile-palette-create-btn");
    const renameBtn = getElementById(documentLike, "tile-palette-rename-btn");
    const deleteBtn = getElementById(documentLike, "tile-palette-delete-btn");
    const exportBtn = getElementById(documentLike, "tile-palette-export-btn");
    const importBtn = getElementById(documentLike, "tile-palette-import-btn");
    const importInput = getElementById(documentLike, "tile-palette-import-input");
    const nameInput = getElementById(documentLike, "tile-palette-name-input");
    const note = getElementById(documentLike, "tile-palette-note");
    const pow2Editor = getElementById(documentLike, "tile-palette-editor-pow2");
    const fibEditor = getElementById(documentLike, "tile-palette-editor-fibonacci");

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

    const fallbackPow2 = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
    const fallbackFib = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

    const resolveDisplayValues = function (ruleset: "pow2" | "fibonacci", fallback: number[]): unknown[] {
      if (!getTileValues) return fallback.slice();
      const values = resolveArray(getTileValues.call(themeManager, ruleset));
      if (!values.length) return fallback.slice();
      const normalized: unknown[] = [];
      for (let i = 0; i < Math.min(16, values.length); i += 1) {
        normalized.push(values[i]);
      }
      while (normalized.length < 16) {
        normalized.push(fallback[normalized.length] || normalized.length + 1);
      }
      return normalized;
    };

    const pow2DisplayValues = resolveDisplayValues("pow2", fallbackPow2);
    const fibDisplayValues = resolveDisplayValues("fibonacci", fallbackFib);

    const setNote = function (message: unknown, isError: boolean): void {
      if (!note) return;
      const noteRecord = toRecord(note);
      noteRecord.textContent = resolveText(message);
      const noteStyle = toRecord(noteRecord.style);
      noteStyle.color = noteRecord.textContent ? (isError ? "#c0392b" : "#6b8e23") : "";
      noteRecord.style = noteStyle;
    };

    const getPaletteMap = function (): { list: unknown[]; map: Record<string, unknown> } {
      const list = resolveArray(getTilePalettes.call(themeManager));
      const map: Record<string, unknown> = {};
      for (let i = 0; i < list.length; i += 1) {
        const item = toRecord(list[i]);
        const id = resolveText(item.id);
        if (!id) continue;
        map[id] = item;
      }
      return { list, map };
    };

    const renderPaletteSelectOptions = function (list: unknown[], activeId: string): void {
      const selectRecord = toRecord(paletteSelect);
      selectRecord.innerHTML = "";
      for (let i = 0; i < list.length; i += 1) {
        const palette = toRecord(list[i]);
        const option = createElement(documentLike, "option");
        if (!option) continue;
        const optionRecord = toRecord(option);
        optionRecord.value = resolveText(palette.id);
        optionRecord.textContent = resolveText(palette.name);
        appendChild(paletteSelect, option);
      }
      selectRecord.value = activeId;
    };

    const renderPaletteColorEditor = function (
      host: unknown,
      palette: Record<string, unknown>,
      ruleset: "pow2" | "fibonacci",
      labels: unknown[],
      locked: boolean
    ): void {
      const hostRecord = toRecord(host);
      hostRecord.innerHTML = "";
      const colors = resolveArray(palette[ruleset]);
      for (let i = 0; i < 16; i += 1) {
        const color = resolveText(colors[i] || "#000000");
        const row = createElement(documentLike, "label");
        if (!row) continue;
        const rowRecord = toRecord(row);
        rowRecord.className = "tile-palette-color-item";

        const picker = createElement(documentLike, "input");
        if (!picker) continue;
        const pickerRecord = toRecord(picker);
        pickerRecord.type = "color";
        pickerRecord.value = color;
        pickerRecord.disabled = locked;

        const label = createElement(documentLike, "span");
        if (label) {
          const labelRecord = toRecord(label);
          labelRecord.className = "tile-palette-color-label";
          labelRecord.textContent = resolveText(labels[i]);
          appendChild(row, label);
        }

        bindListener(picker, "change", function () {
          const currentId = resolveText(toRecord(paletteSelect).value || getActiveTilePaletteId.call(themeManager));
          const pickerRef = toRecord(this as unknown);
          const changedColor = resolveText(pickerRef.value);
          const index = resolveNumber(toRecord(pickerRef.dataset).index, 0);
          const changedRuleset = resolveText(toRecord(pickerRef.dataset).ruleset) === "fibonacci" ? "fibonacci" : "pow2";
          const updated = !!updateTilePaletteColor.call(
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

        const pickerDataset = toRecord(pickerRecord.dataset);
        pickerDataset.index = String(i);
        pickerDataset.ruleset = ruleset;
        if (!pickerRecord.dataset) {
          const setAttribute = asFunction<(name: string, value: string) => unknown>(pickerRecord.setAttribute);
          if (setAttribute) {
            setAttribute.call(picker, "data-index", String(i));
            setAttribute.call(picker, "data-ruleset", ruleset);
          }
        }

        appendChild(row, picker);
        appendChild(host, row);
      }
    };

    const refreshPaletteUi = function (): void {
      const payload = getPaletteMap();
      const list = payload.list;
      const map = payload.map;
      let activeId = resolveText(getActiveTilePaletteId.call(themeManager));
      if (!map[activeId] && list.length > 0) {
        activeId = resolveText(toRecord(list[0]).id);
      }
      renderPaletteSelectOptions(list, activeId);

      const activePalette = toRecord(map[activeId]);
      const locked = resolveBoolean(activePalette.locked || activePalette.source !== "custom");
      toRecord(nameInput).value = resolveText(activePalette.name);
      toRecord(renameBtn).disabled = locked;
      toRecord(deleteBtn).disabled = locked;

      renderPaletteColorEditor(pow2Editor, activePalette, "pow2", pow2DisplayValues, locked);
      renderPaletteColorEditor(fibEditor, activePalette, "fibonacci", fibDisplayValues, locked);
    };

    if (!toRecord(paletteSelect).__tilePaletteBound) {
      toRecord(paletteSelect).__tilePaletteBound = true;
      bindListener(paletteSelect, "change", function () {
        const selectedId = resolveText(toRecord(paletteSelect).value);
        setActiveTilePalette.call(themeManager, selectedId);
        refreshPaletteUi();
      });
    }

    if (!toRecord(createBtn).__tilePaletteBound) {
      toRecord(createBtn).__tilePaletteBound = true;
      bindListener(createBtn, "click", function () {
        const activeId = resolveText(getActiveTilePaletteId.call(themeManager));
        const inputName = resolveText(toRecord(nameInput).value).trim();
        createTilePalette.call(themeManager, activeId, inputName || "自定义色板");
        refreshPaletteUi();
        setNote("已新建色板。", false);
      });
    }

    if (!toRecord(renameBtn).__tilePaletteBound) {
      toRecord(renameBtn).__tilePaletteBound = true;
      bindListener(renameBtn, "click", function () {
        const activeId = resolveText(getActiveTilePaletteId.call(themeManager));
        const inputName = resolveText(toRecord(nameInput).value).trim();
        if (!inputName) {
          setNote("请输入色板名称。", true);
          return;
        }
        const renamed = renameTilePalette.call(themeManager, activeId, inputName);
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
        const activeId = resolveText(getActiveTilePaletteId.call(themeManager));
        const confirmFn = asFunction<(message: string) => unknown>(toRecord(windowLike).confirm);
        if (confirmFn && !confirmFn.call(windowLike, "确认删除当前色板？")) return;
        const deleted = deleteTilePalette.call(themeManager, activeId);
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
        const payload = resolveText(exportTilePalettes.call(themeManager));
        const blobCtor = toRecord(windowLike).Blob || (typeof Blob === "function" ? Blob : null);
        const urlApi = toRecord(windowLike).URL || (typeof URL !== "undefined" ? URL : null);
        if (!blobCtor || !urlApi || typeof toRecord(urlApi).createObjectURL !== "function") {
          setNote("当前环境不支持导出。", true);
          return;
        }
        const blob = new (blobCtor as any)([payload], { type: "application/json" });
        const downloadUrl = (toRecord(urlApi).createObjectURL as Function).call(urlApi, blob);
        const anchor = createElement(documentLike, "a");
        if (!anchor) {
          if (typeof toRecord(urlApi).revokeObjectURL === "function") {
            (toRecord(urlApi).revokeObjectURL as Function).call(urlApi, downloadUrl);
          }
          setNote("导出失败。", true);
          return;
        }
        const anchorRecord = toRecord(anchor);
        anchorRecord.href = downloadUrl;
        anchorRecord.download = "tile-palettes.json";
        const click = asFunction<() => unknown>(anchorRecord.click);
        if (click) click.call(anchorRecord);
        if (typeof toRecord(urlApi).revokeObjectURL === "function") {
          setTimeout(function () {
            (toRecord(urlApi).revokeObjectURL as Function).call(urlApi, downloadUrl);
          }, 0);
        }
        setNote("色板已导出。", false);
      });
    }

    if (!toRecord(importBtn).__tilePaletteBound) {
      toRecord(importBtn).__tilePaletteBound = true;
      bindListener(importBtn, "click", function () {
        const click = asFunction<() => unknown>(toRecord(importInput).click);
        if (click) click.call(importInput);
      });
    }

    if (!toRecord(importInput).__tilePaletteBound) {
      toRecord(importInput).__tilePaletteBound = true;
      bindListener(importInput, "change", function () {
        const inputRecord = toRecord(importInput);
        const files = toRecord(inputRecord.files);
        const file = files[0];
        if (!file) return;

        const done = function (textValue: unknown) {
          const result = toRecord(importTilePalettes.call(themeManager, textValue));
          refreshPaletteUi();
          const importedCount = resolveNumber(result.importedCount, 0);
          if (importedCount <= 0) {
            setNote("导入失败，请检查 JSON 格式。", true);
            return;
          }
          const renamed = resolveArray(result.renamed);
          if (renamed.length > 0) {
            setNote("已导入 " + importedCount + " 个色板，部分名称已自动重命名。", false);
            return;
          }
          setNote("已导入 " + importedCount + " 个色板。", false);
        };

        if (typeof (file as any).text === "function") {
          (file as any)
            .text()
            .then(function (content: unknown) {
              done(resolveText(content));
            })
            .catch(function () {
              setNote("读取所选文件失败。", true);
            });
          return;
        }

        const fileReaderCtor = toRecord(windowLike).FileReader || (typeof FileReader === "function" ? FileReader : null);
        if (!fileReaderCtor) {
          setNote("当前环境不支持导入。", true);
          return;
        }
        const reader = new (fileReaderCtor as any)();
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
    syncTilePaletteUi = function (): boolean {
      refreshPaletteUi();
      return true;
    };
    return true;
  };

  const closeDropdown = function (): void {
    classListRemove(customSelect, "open");
    applyPreviewTheme(confirmedTheme);
  };

  const toggleDropdown = function (eventLike: unknown): void {
    stopPropagation(eventLike);
    const isOpen = classListContains(customSelect, "open");
    const resolveDropdownStateNow = asFunction<(payload: unknown) => unknown>(
      themeSettingsRuntime.resolveThemeDropdownToggleState
    );
    if (!resolveDropdownStateNow) return;
    const toggleState = toRecord(
      resolveDropdownStateNow.call(themeSettingsRuntime, {
        isOpen
      })
    );
    if (!resolveBoolean(toggleState.shouldOpen)) {
      closeDropdown();
      return;
    }
    confirmedTheme = resolveText(getCurrentTheme.call(themeManager));
    classListAdd(customSelect, "open");
    const selected = querySelector(customOptionsContainer, ".custom-option.selected");
    if (!selected) return;
    const selectedOffset = resolveNumber(toRecord(selected).offsetTop, 0);
    const containerOffset = resolveNumber(toRecord(customOptionsContainer).offsetTop, 0);
    toRecord(customOptionsContainer).scrollTop = selectedOffset - containerOffset;
  };

  let didInitOptions = false;
  if (getChildrenLength(customOptionsContainer) === 0) {
    toRecord(customOptionsContainer).innerHTML = "";
    for (let i = 0; i < themes.length; i += 1) {
      const theme = toRecord(themes[i]);
      const option = createElement(documentLike, "div");
      if (!option) continue;
      const optionRecord = toRecord(option);
      optionRecord.className = "custom-option";
      optionRecord.textContent = resolveText(theme.label);
      setThemeOptionDatasetValue(option, resolveText(theme.id));
      bindListener(option, "click", function (eventLike: unknown) {
        stopPropagation(eventLike);
        const optionLike = resolveThemeOptionFromEvent(eventLike, option);
        const value = resolveText(
          resolveThemeOptionValue.call(themeSettingsRuntime, {
            optionLike
          })
        );
        confirmedTheme = value;
        applyTheme.call(themeManager, value);
        applyPreviewTheme(value);
        closeDropdown();
      });
      bindListener(option, "mouseenter", function (eventLike: unknown) {
        const optionLike = resolveThemeOptionFromEvent(eventLike, option);
        const value = resolveText(
          resolveThemeOptionValue.call(themeSettingsRuntime, {
            optionLike
          })
        );
        applyPreviewTheme(value);
      });
      appendChild(customOptionsContainer, option);
      didInitOptions = true;
    }
  }

  let didBindTrigger = false;
  const triggerBindingState = toRecord(
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

  let didBindOutside = false;
  const outsideBindingState = toRecord(
    resolveThemeBindingState.call(themeSettingsRuntime, {
      alreadyBound: resolveBoolean(windowLike.__clickOutsideBound)
    })
  );
  if (resolveBoolean(outsideBindingState.shouldBind)) {
    if (
      bindListener(documentLike, "click", function (eventLike: unknown) {
        const target = toRecord(eventLike).target;
        const contains = asFunction<(node: unknown) => unknown>(toRecord(customSelect).contains);
        if (!contains || !contains.call(customSelect, target)) {
          closeDropdown();
        }
      })
    ) {
      windowLike.__clickOutsideBound = outsideBindingState.boundValue;
      didBindOutside = true;
    }
  }

  let didBindLeave = false;
  const leaveBindingState = toRecord(
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

  const didRenderPreview = renderDualPreviewGrids();
  const didSyncUi = updateCustomSelectUi();
  const didApplyPreview = applyPreviewTheme(confirmedTheme);
  initTilePaletteSettingsUi();

  let didBindThemeChange = false;
  const changeSyncBindingState = toRecord(
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
    didInitOptions,
    didBindTrigger,
    didBindOutside,
    didBindLeave,
    didBindThemeChange,
    didRenderPreview,
    didSyncUi,
    didApplyPreview,
    optionCount: resolveThemeOptionCount(customOptionsContainer)
  };
}
