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
