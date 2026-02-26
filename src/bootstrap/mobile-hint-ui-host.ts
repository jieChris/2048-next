function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function querySelector(documentLike: unknown, selector: unknown): unknown {
  const selectorValue = typeof selector === "string" ? selector : "";
  if (!selectorValue) return null;
  const query = asFunction<(value: string) => unknown>(toRecord(documentLike).querySelector);
  if (!query) return null;
  try {
    return query.call(documentLike, selectorValue);
  } catch (_err) {
    return null;
  }
}

function callToggleClass(target: unknown, className: string, enabled: boolean): boolean {
  const classList = toRecord(toRecord(target).classList);
  const toggle = asFunction<(token: string, force?: boolean) => unknown>(classList.toggle);
  if (!toggle) return false;
  try {
    toggle.call(classList, className, enabled);
    return true;
  } catch (_err) {
    return false;
  }
}

function callClassMethod(target: unknown, methodName: "add" | "remove", className: string): boolean {
  const classList = toRecord(toRecord(target).classList);
  const method = asFunction<(token: string) => unknown>(classList[methodName]);
  if (!method) return false;
  try {
    method.call(classList, className);
    return true;
  } catch (_err) {
    return false;
  }
}

function setStyleProperty(target: unknown, key: string, value: string): boolean {
  const style = toRecord(toRecord(target).style);
  if (!style) return false;
  style[key] = value;
  return true;
}

function setAttribute(target: unknown, key: string, value: string): boolean {
  const setter = asFunction<(name: string, content: string) => unknown>(toRecord(target).setAttribute);
  if (!setter) return false;
  try {
    setter.call(target, key, value);
    return true;
  } catch (_err) {
    return false;
  }
}

function resolveString(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

function invoke(callback: unknown): boolean {
  const fn = asFunction<() => unknown>(callback);
  if (!fn) return false;
  fn();
  return true;
}

export interface MobileHintUiSyncResult {
  isScope: boolean;
  hasBody: boolean;
  hasButton: boolean;
  compactViewport: boolean;
  didSyncTextBlock: boolean;
  didToggleIntroVisibility: boolean;
  didApplyCollapsedClass: boolean;
  didApplyButtonDisplay: boolean;
  didConfigureButton: boolean;
  didCloseModal: boolean;
}

export function applyMobileHintUiSync(input: {
  options?: unknown;
  isGamePageScope?: unknown;
  isCompactGameViewport?: unknown;
  ensureMobileHintToggleButton?: unknown;
  closeMobileHintModal?: unknown;
  mobileHintUiRuntime?: unknown;
  documentLike?: unknown;
  collapsedClassName?: unknown;
  introHiddenClassName?: unknown;
  introSelector?: unknown;
  containerSelector?: unknown;
}): MobileHintUiSyncResult {
  const source = toRecord(input);
  const isGamePageScope = asFunction<() => unknown>(source.isGamePageScope);
  const inScope = !!(isGamePageScope && isGamePageScope());
  if (!inScope) {
    return {
      isScope: false,
      hasBody: false,
      hasButton: false,
      compactViewport: false,
      didSyncTextBlock: false,
      didToggleIntroVisibility: false,
      didApplyCollapsedClass: false,
      didApplyButtonDisplay: false,
      didConfigureButton: false,
      didCloseModal: false
    };
  }

  const documentLike = source.documentLike || null;
  const body = toRecord(documentLike).body || null;
  if (!body) {
    return {
      isScope: true,
      hasBody: false,
      hasButton: false,
      compactViewport: false,
      didSyncTextBlock: false,
      didToggleIntroVisibility: false,
      didApplyCollapsedClass: false,
      didApplyButtonDisplay: false,
      didConfigureButton: false,
      didCloseModal: false
    };
  }

  const isCompactGameViewport = asFunction<() => unknown>(source.isCompactGameViewport);
  const compactViewport = !!(isCompactGameViewport && isCompactGameViewport());

  const mobileHintUiRuntime = toRecord(source.mobileHintUiRuntime);
  const syncMobileHintTextBlockVisibility = asFunction<(payload: unknown) => unknown>(
    mobileHintUiRuntime.syncMobileHintTextBlockVisibility
  );
  const resolveMobileHintDisplayModel = asFunction<(compact: boolean) => unknown>(
    mobileHintUiRuntime.resolveMobileHintDisplayModel
  );
  const resolveMobileHintUiState = asFunction<(payload: unknown) => unknown>(
    mobileHintUiRuntime.resolveMobileHintUiState
  );

  const containerSelector = resolveString(source.containerSelector, ".container");
  const didSyncTextBlock = !!(
    syncMobileHintTextBlockVisibility &&
    syncMobileHintTextBlockVisibility({
      isGamePageScope: true,
      containerNode: querySelector(documentLike, containerSelector),
      hidden: compactViewport
    })
  );

  const introSelector = resolveString(source.introSelector, ".above-game .game-intro");
  const introHiddenClassName = resolveString(source.introHiddenClassName, "mobile-hint-hidden");
  const intro = querySelector(documentLike, introSelector);
  const didToggleIntroVisibility = intro
    ? callToggleClass(intro, introHiddenClassName, compactViewport)
    : false;

  const ensureMobileHintToggleButton = asFunction<() => unknown>(source.ensureMobileHintToggleButton);
  const button = ensureMobileHintToggleButton ? ensureMobileHintToggleButton() : null;
  if (!button) {
    return {
      isScope: true,
      hasBody: true,
      hasButton: false,
      compactViewport,
      didSyncTextBlock,
      didToggleIntroVisibility,
      didApplyCollapsedClass: false,
      didApplyButtonDisplay: false,
      didConfigureButton: false,
      didCloseModal: false
    };
  }

  const displayModel = toRecord(
    resolveMobileHintDisplayModel ? resolveMobileHintDisplayModel(compactViewport) : null
  );
  const uiState = toRecord(
    resolveMobileHintUiState
      ? resolveMobileHintUiState({
          displayModel,
          collapsedClassName: resolveString(source.collapsedClassName, "mobile-hint-collapsed-content")
        })
      : null
  );

  const collapsedClassName = resolveString(uiState.collapsedClassName, "mobile-hint-collapsed-content");
  const didApplyCollapsedClass = !!uiState.collapsedContentEnabled
    ? callClassMethod(body, "add", collapsedClassName)
    : callClassMethod(body, "remove", collapsedClassName);

  const didApplyButtonDisplay = setStyleProperty(
    button,
    "display",
    resolveString(uiState.buttonDisplay, "none")
  );

  if (!!uiState.shouldCloseModal) {
    const didCloseModal = invoke(source.closeMobileHintModal);
    return {
      isScope: true,
      hasBody: true,
      hasButton: true,
      compactViewport,
      didSyncTextBlock,
      didToggleIntroVisibility,
      didApplyCollapsedClass,
      didApplyButtonDisplay,
      didConfigureButton: false,
      didCloseModal
    };
  }

  const label = resolveString(uiState.buttonLabel, "查看提示文本");
  const ariaExpanded = resolveString(uiState.buttonAriaExpanded, "false");
  const didConfigureButton =
    setAttribute(button, "aria-label", label) &&
    setAttribute(button, "title", label) &&
    setAttribute(button, "aria-expanded", ariaExpanded);

  return {
    isScope: true,
    hasBody: true,
    hasButton: true,
    compactViewport,
    didSyncTextBlock,
    didToggleIntroVisibility,
    didApplyCollapsedClass,
    didApplyButtonDisplay,
    didConfigureButton,
    didCloseModal: false
  };
}
