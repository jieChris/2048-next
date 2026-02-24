export interface MobileHintTextBlockVisibilityOptions {
  isGamePageScope?: boolean;
  containerNode?: unknown;
  hidden?: boolean;
  collapsedAttrName?: string | null | undefined;
}

export interface MobileHintDisplayModel {
  collapsedContentEnabled: boolean;
  buttonDisplay: "inline-flex" | "none";
  buttonLabel: string;
}

export interface ResolveMobileHintUiStateOptions {
  displayModel?: MobileHintDisplayModel | null | undefined;
  collapsedClassName?: string | null | undefined;
}

export interface ResolveMobileHintUiStateResult {
  collapsedContentEnabled: boolean;
  collapsedClassName: string;
  buttonDisplay: "inline-flex" | "none";
  shouldCloseModal: boolean;
  shouldConfigureButton: boolean;
  buttonLabel: string;
  buttonAriaExpanded: string;
}

interface ClassListLike {
  contains?(token: string): boolean;
}

interface StyleLike {
  setProperty?(property: string, value: string, priority?: string): void;
  removeProperty?(property: string): void;
}

interface ElementLike {
  nodeType?: number;
  tagName?: string;
  children?: ArrayLike<unknown>;
  classList?: ClassListLike | null;
  style?: StyleLike | null;
  getAttribute?(name: string): string | null;
  setAttribute?(name: string, value: string): void;
  removeAttribute?(name: string): void;
}

const DEFAULT_COLLAPSED_ATTR = "data-mobile-hint-collapsed";
const DEFAULT_BUTTON_LABEL = "查看提示文本";
const DEFAULT_COLLAPSED_CLASS_NAME = "mobile-hint-collapsed-content";

function asElement(node: unknown): ElementLike | null {
  if (!node || typeof node !== "object") return null;
  return node as ElementLike;
}

function isElementNode(node: unknown): node is ElementLike {
  const el = asElement(node);
  return !!el && el.nodeType === 1;
}

function elementTagName(node: unknown): string {
  const el = asElement(node);
  return el && typeof el.tagName === "string" ? el.tagName.toLowerCase() : "";
}

function hasClass(node: unknown, className: string): boolean {
  const el = asElement(node);
  if (!el || !el.classList || typeof el.classList.contains !== "function") return false;
  try {
    return !!el.classList.contains(className);
  } catch (_err) {
    return false;
  }
}

function elementChildren(node: unknown): unknown[] {
  const el = asElement(node);
  if (!el || !el.children) return [];
  const out: unknown[] = [];
  for (let i = 0; i < el.children.length; i++) {
    out.push(el.children[i]);
  }
  return out;
}

function getAttribute(node: unknown, key: string): string | null {
  const el = asElement(node);
  if (!el || typeof el.getAttribute !== "function") return null;
  try {
    return el.getAttribute(key);
  } catch (_err) {
    return null;
  }
}

function setAttribute(node: unknown, key: string, value: string): void {
  const el = asElement(node);
  if (!el || typeof el.setAttribute !== "function") return;
  try {
    el.setAttribute(key, value);
  } catch (_err) {}
}

function removeAttribute(node: unknown, key: string): void {
  const el = asElement(node);
  if (!el || typeof el.removeAttribute !== "function") return;
  try {
    el.removeAttribute(key);
  } catch (_err) {}
}

function setDisplayNoneImportant(node: unknown): void {
  const el = asElement(node);
  const style = el && el.style ? el.style : null;
  if (!style || typeof style.setProperty !== "function") return;
  try {
    style.setProperty("display", "none", "important");
  } catch (_err) {}
}

function removeDisplayProperty(node: unknown): void {
  const el = asElement(node);
  const style = el && el.style ? el.style : null;
  if (!style || typeof style.removeProperty !== "function") return;
  try {
    style.removeProperty("display");
  } catch (_err) {}
}

export function collectMobileHintTextBlockNodes(containerNode: unknown): unknown[] {
  const container = asElement(containerNode);
  if (!container) return [];

  const nodes: unknown[] = [];
  const children = elementChildren(container);
  let afterGameContainer = false;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!isElementNode(child)) continue;

    if (!afterGameContainer) {
      if (hasClass(child, "game-container")) {
        afterGameContainer = true;
      }
      continue;
    }

    const tag = elementTagName(child);
    if (tag === "p" || tag === "hr") {
      nodes.push(child);
    }
  }

  return nodes;
}

export function syncMobileHintTextBlockVisibility(
  options: MobileHintTextBlockVisibilityOptions
): number {
  const opts = options || {};
  if (!opts.isGamePageScope) return 0;

  const collapsedAttrName =
    typeof opts.collapsedAttrName === "string" && opts.collapsedAttrName
      ? opts.collapsedAttrName
      : DEFAULT_COLLAPSED_ATTR;
  const nodes = collectMobileHintTextBlockNodes(opts.containerNode);
  const hidden = !!opts.hidden;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (hidden) {
      setDisplayNoneImportant(node);
      setAttribute(node, collapsedAttrName, "1");
      continue;
    }
    if (getAttribute(node, collapsedAttrName) === "1") {
      removeDisplayProperty(node);
      removeAttribute(node, collapsedAttrName);
    }
  }

  return nodes.length;
}

export function resolveMobileHintDisplayModel(isCompactViewport: boolean): MobileHintDisplayModel {
  if (!isCompactViewport) {
    return {
      collapsedContentEnabled: false,
      buttonDisplay: "none",
      buttonLabel: DEFAULT_BUTTON_LABEL
    };
  }

  return {
    collapsedContentEnabled: true,
    buttonDisplay: "inline-flex",
    buttonLabel: DEFAULT_BUTTON_LABEL
  };
}

export function resolveMobileHintUiState(
  options: ResolveMobileHintUiStateOptions
): ResolveMobileHintUiStateResult {
  const opts = options || {};
  const displayModel = opts.displayModel || null;
  const collapsedContentEnabled = !!(displayModel && displayModel.collapsedContentEnabled);
  const collapsedClassName =
    typeof opts.collapsedClassName === "string" && opts.collapsedClassName
      ? opts.collapsedClassName
      : DEFAULT_COLLAPSED_CLASS_NAME;
  const buttonDisplay =
    displayModel && displayModel.buttonDisplay === "inline-flex" ? "inline-flex" : "none";
  const buttonLabel =
    displayModel && typeof displayModel.buttonLabel === "string" && displayModel.buttonLabel
      ? displayModel.buttonLabel
      : DEFAULT_BUTTON_LABEL;
  return {
    collapsedContentEnabled,
    collapsedClassName,
    buttonDisplay,
    shouldCloseModal: !collapsedContentEnabled,
    shouldConfigureButton: collapsedContentEnabled,
    buttonLabel,
    buttonAriaExpanded: "false"
  };
}
