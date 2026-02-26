function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function invoke(callback: unknown): boolean {
  const fn = asFunction<() => unknown>(callback);
  if (!fn) return false;
  fn();
  return true;
}

function getElementById(getter: unknown, id: string): unknown {
  const fn = asFunction<(value: string) => unknown>(getter);
  if (!fn) return null;
  return fn(id);
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

function preventDefault(eventLike: unknown): void {
  const prevent = asFunction<() => unknown>(toRecord(eventLike).preventDefault);
  if (!prevent) return;
  prevent.call(eventLike);
}

function hasClass(element: unknown, className: string): boolean {
  const classList = toRecord(toRecord(element).classList);
  const contains = asFunction<(value: string) => unknown>(classList.contains);
  return contains ? !!contains.call(classList, className) : false;
}

function removeClass(element: unknown, className: string): boolean {
  const classList = toRecord(toRecord(element).classList);
  const remove = asFunction<(value: string) => unknown>(classList.remove);
  if (!remove) return false;
  remove.call(classList, className);
  return true;
}

function toggleClass(element: unknown, className: string, enabled: boolean): boolean {
  const classList = toRecord(toRecord(element).classList);
  const toggle = asFunction<(value: string, force?: boolean) => unknown>(classList.toggle);
  if (!toggle) return false;
  toggle.call(classList, className, !!enabled);
  return true;
}

function setStyleDisplay(element: unknown, value: string): boolean {
  const style = toRecord(toRecord(element).style);
  if (!style) return false;
  style.display = value;
  return true;
}

function setAttribute(element: unknown, name: string, value: string): boolean {
  const target = toRecord(element);
  const setAttr = asFunction<(key: string, nextValue: string) => unknown>(target.setAttribute);
  if (setAttr) {
    setAttr.call(element, name, value);
    return true;
  }
  target[name] = value;
  return true;
}

function setInnerHtml(element: unknown, html: string): boolean {
  const target = toRecord(element);
  target.innerHTML = html;
  return true;
}

function callRuntime(
  runtime: unknown,
  methodName: string,
  payload: unknown
): unknown {
  const runtimeRecord = toRecord(runtime);
  const method = asFunction<(opts: unknown) => unknown>(runtimeRecord[methodName]);
  if (!method) return null;
  return method.call(runtime, payload);
}

function callBooleanReader(reader: unknown): boolean | null {
  const fn = asFunction<() => unknown>(reader);
  if (!fn) return null;
  return !!fn();
}

function callBooleanWriter(writer: unknown, value: boolean): boolean {
  const fn = asFunction<(nextValue: boolean) => unknown>(writer);
  if (!fn) return false;
  fn(value);
  return true;
}

function callIconResolver(resolver: unknown, collapsed: boolean): string {
  const fn = asFunction<(value: boolean) => unknown>(resolver);
  if (!fn) return "";
  const icon = fn(!!collapsed);
  return typeof icon === "string" ? icon : "";
}

function toDisplayValue(value: unknown, fallback: "inline-flex" | "none"): "inline-flex" | "none" {
  return value === "inline-flex" ? "inline-flex" : fallback;
}

function toAriaExpandedValue(value: unknown, fallback: "true" | "false"): "true" | "false" {
  return value === "true" ? "true" : value === "false" ? "false" : fallback;
}

function toStringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

function toBooleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readAppliedModel(applied: unknown, fallback: {
  toggleDisplay: "inline-flex" | "none";
  ariaExpanded: "true" | "false";
  label: string;
  iconSvg: string;
  expanded: boolean;
}): {
  toggleDisplay: "inline-flex" | "none";
  ariaExpanded: "true" | "false";
  label: string;
  iconSvg: string;
  expanded: boolean;
} {
  const model = toRecord(applied);
  return {
    toggleDisplay: toDisplayValue(model.toggleDisplay, fallback.toggleDisplay),
    ariaExpanded: toAriaExpandedValue(model.ariaExpanded, fallback.ariaExpanded),
    label: toStringValue(model.label, fallback.label),
    iconSvg: toStringValue(model.iconSvg, fallback.iconSvg),
    expanded: toBooleanValue(model.expanded, fallback.expanded)
  };
}

export interface MobileTimerboxToggleInitResult {
  isScope: boolean;
  hasToggle: boolean;
  hasTimerbox: boolean;
  didBindToggle: boolean;
  didRunSync: boolean;
}

export interface MobileTimerboxUiSyncResult {
  isScope: boolean;
  hasTimerbox: boolean;
  hasToggle: boolean;
  didApply: boolean;
  didPersist: boolean;
  collapsible: boolean;
  timerModuleHidden: boolean;
}

export function applyMobileTimerboxToggleInit(input: {
  isTimerboxMobileScope?: unknown;
  getElementById?: unknown;
  syncMobileTimerboxUI?: unknown;
  requestResponsiveGameRelayout?: unknown;
  syncMobileTopActionsPlacement?: unknown;
  syncPracticeTopActionsPlacement?: unknown;
  syncMobileUndoTopButtonAvailability?: unknown;
}): MobileTimerboxToggleInitResult {
  const source = toRecord(input);
  const isScopeFn = asFunction<() => unknown>(source.isTimerboxMobileScope);
  const isScope = !!(isScopeFn && isScopeFn());
  if (!isScope) {
    return {
      isScope: false,
      hasToggle: false,
      hasTimerbox: false,
      didBindToggle: false,
      didRunSync: false
    };
  }

  const getById = source.getElementById;
  const toggleBtn = getElementById(getById, "timerbox-toggle-btn");
  const timerBox = getElementById(getById, "timerbox");
  if (!toggleBtn || !timerBox) {
    return {
      isScope: true,
      hasToggle: !!toggleBtn,
      hasTimerbox: !!timerBox,
      didBindToggle: false,
      didRunSync: false
    };
  }

  const syncMobileTimerboxUi = asFunction<(payload?: unknown) => unknown>(source.syncMobileTimerboxUI);
  const requestResponsiveGameRelayout = asFunction<() => unknown>(source.requestResponsiveGameRelayout);

  const toggleRecord = toRecord(toggleBtn);
  let didBindToggle = false;
  if (!toggleRecord.__mobileTimerboxBound) {
    toggleRecord.__mobileTimerboxBound = true;
    didBindToggle = bindListener(toggleBtn, "click", function (eventLike) {
      preventDefault(eventLike);
      if (syncMobileTimerboxUi) {
        syncMobileTimerboxUi({
          collapsed: hasClass(timerBox, "is-mobile-expanded"),
          persist: true
        });
      }
      if (requestResponsiveGameRelayout) {
        requestResponsiveGameRelayout();
      }
    });
  }

  invoke(source.syncMobileTopActionsPlacement);
  invoke(source.syncPracticeTopActionsPlacement);
  invoke(source.syncMobileUndoTopButtonAvailability);

  let didRunSync = false;
  if (syncMobileTimerboxUi) {
    syncMobileTimerboxUi();
    didRunSync = true;
  }

  return {
    isScope: true,
    hasToggle: true,
    hasTimerbox: true,
    didBindToggle,
    didRunSync
  };
}

export function applyMobileTimerboxUiSync(input: {
  options?: unknown;
  isTimerboxMobileScope?: unknown;
  isTimerboxCollapseViewport?: unknown;
  getElementById?: unknown;
  readMobileTimerboxCollapsed?: unknown;
  writeMobileTimerboxCollapsed?: unknown;
  mobileTimerboxRuntime?: unknown;
  getTimerboxToggleIconSvg?: unknown;
  hiddenClassName?: unknown;
  expandedClassName?: unknown;
  defaultCollapsed?: unknown;
  fallbackHiddenToggleDisplay?: unknown;
  fallbackVisibleToggleDisplay?: unknown;
  fallbackHiddenAriaExpanded?: unknown;
  fallbackExpandLabel?: unknown;
  fallbackCollapseLabel?: unknown;
}): MobileTimerboxUiSyncResult {
  const source = toRecord(input);
  const isScopeFn = asFunction<() => unknown>(source.isTimerboxMobileScope);
  const isScope = !!(isScopeFn && isScopeFn());
  if (!isScope) {
    return {
      isScope: false,
      hasTimerbox: false,
      hasToggle: false,
      didApply: false,
      didPersist: false,
      collapsible: false,
      timerModuleHidden: false
    };
  }

  const timerBox = getElementById(source.getElementById, "timerbox");
  const toggleBtn = getElementById(source.getElementById, "timerbox-toggle-btn");
  if (!timerBox || !toggleBtn) {
    return {
      isScope: true,
      hasTimerbox: !!timerBox,
      hasToggle: !!toggleBtn,
      didApply: false,
      didPersist: false,
      collapsible: false,
      timerModuleHidden: false
    };
  }

  const options = toRecord(source.options);
  const hiddenClassName = toStringValue(source.hiddenClassName, "timerbox-hidden-mode");
  const expandedClassName = toStringValue(source.expandedClassName, "is-mobile-expanded");
  const defaultCollapsed = toBooleanValue(source.defaultCollapsed, true);
  const fallbackHiddenToggleDisplay = toDisplayValue(source.fallbackHiddenToggleDisplay, "none");
  const fallbackVisibleToggleDisplay = toDisplayValue(
    source.fallbackVisibleToggleDisplay,
    "inline-flex"
  );
  const fallbackHiddenAriaExpanded = toAriaExpandedValue(source.fallbackHiddenAriaExpanded, "false");
  const fallbackExpandLabel = toStringValue(source.fallbackExpandLabel, "展开计时器");
  const fallbackCollapseLabel = toStringValue(source.fallbackCollapseLabel, "收起计时器");

  const isCollapseViewportFn = asFunction<() => unknown>(source.isTimerboxCollapseViewport);
  const collapsible = !!(isCollapseViewportFn && isCollapseViewportFn());
  const timerModuleHidden = hasClass(timerBox, hiddenClassName);

  if (!collapsible || timerModuleHidden) {
    const hiddenModel = callRuntime(source.mobileTimerboxRuntime, "resolveMobileTimerboxDisplayModel", {
      collapsible: false,
      timerModuleHidden,
      collapsed: true
    });
    const hiddenFallbackIcon = callIconResolver(source.getTimerboxToggleIconSvg, true);
    const hiddenApplied = callRuntime(source.mobileTimerboxRuntime, "resolveMobileTimerboxAppliedModel", {
      displayModel: hiddenModel,
      collapsed: true,
      fallbackToggleDisplay: fallbackHiddenToggleDisplay,
      fallbackAriaExpanded: fallbackHiddenAriaExpanded,
      fallbackLabel: fallbackExpandLabel,
      fallbackIconSvg: hiddenFallbackIcon
    });
    const hiddenAppliedModel = readAppliedModel(hiddenApplied, {
      toggleDisplay: fallbackHiddenToggleDisplay,
      ariaExpanded: fallbackHiddenAriaExpanded,
      label: fallbackExpandLabel,
      iconSvg: hiddenFallbackIcon,
      expanded: false
    });
    setStyleDisplay(toggleBtn, hiddenAppliedModel.toggleDisplay);
    setAttribute(toggleBtn, "aria-expanded", hiddenAppliedModel.ariaExpanded);
    removeClass(timerBox, expandedClassName);
    return {
      isScope: true,
      hasTimerbox: true,
      hasToggle: true,
      didApply: true,
      didPersist: false,
      collapsible,
      timerModuleHidden
    };
  }

  const collapsedOption = typeof options.collapsed === "boolean" ? options.collapsed : null;
  const storedCollapsed = callBooleanReader(source.readMobileTimerboxCollapsed);
  const collapsedResolved = callRuntime(
    source.mobileTimerboxRuntime,
    "resolveMobileTimerboxCollapsedValue",
    {
      collapsedOption,
      storedCollapsed,
      defaultCollapsed
    }
  );
  const collapsed = toBooleanValue(collapsedResolved, defaultCollapsed);
  const displayModel = callRuntime(source.mobileTimerboxRuntime, "resolveMobileTimerboxDisplayModel", {
    collapsible: true,
    timerModuleHidden: false,
    collapsed
  });
  const fallbackLabel = collapsed ? fallbackExpandLabel : fallbackCollapseLabel;
  const fallbackIcon = callIconResolver(source.getTimerboxToggleIconSvg, collapsed);
  const applied = callRuntime(source.mobileTimerboxRuntime, "resolveMobileTimerboxAppliedModel", {
    displayModel,
    collapsed,
    fallbackToggleDisplay: fallbackVisibleToggleDisplay,
    fallbackAriaExpanded: collapsed ? "false" : "true",
    fallbackLabel,
    fallbackIconSvg: fallbackIcon
  });
  const appliedModel = readAppliedModel(applied, {
    toggleDisplay: fallbackVisibleToggleDisplay,
    ariaExpanded: collapsed ? "false" : "true",
    label: fallbackLabel,
    iconSvg: fallbackIcon,
    expanded: !collapsed
  });
  setStyleDisplay(toggleBtn, appliedModel.toggleDisplay);
  toggleClass(timerBox, expandedClassName, appliedModel.expanded);
  setAttribute(toggleBtn, "aria-expanded", appliedModel.ariaExpanded);
  setAttribute(toggleBtn, "aria-label", appliedModel.label);
  setAttribute(toggleBtn, "title", appliedModel.label);
  setInnerHtml(toggleBtn, appliedModel.iconSvg);

  const persist = !!options.persist;
  const didPersist = persist ? callBooleanWriter(source.writeMobileTimerboxCollapsed, collapsed) : false;
  return {
    isScope: true,
    hasTimerbox: true,
    hasToggle: true,
    didApply: true,
    didPersist,
    collapsible: true,
    timerModuleHidden: false
  };
}
