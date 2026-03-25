interface ParentLike {
  appendChild(node: unknown): unknown;
  insertBefore(node: unknown, referenceNode: unknown): unknown;
  lastElementChild?: unknown;
  children?: unknown;
}

interface ElementLike {
  id?: string;
  className?: string;
  href?: string;
  innerHTML?: string;
  textContent?: string | null;
  parentNode?: unknown;
  nextSibling?: unknown;
  style?: { display?: string } | null;
  getAttribute?(name: string): string | null;
  setAttribute?(name: string, value: string): unknown;
  addEventListener?(type: string, listener: (event?: unknown) => void): unknown;
  __mobileActionsToggleBound?: boolean;
  __mobileActionsLangBound?: boolean;
}

interface DocumentLike {
  getElementById(id: string): ElementLike | null;
  createElement(tagName: string): ElementLike;
  querySelector?(selector: string): ElementLike | null;
  documentElement?: ElementLike | null;
  body?: ElementLike | null;
}

export interface EnsureMobileTopButtonOptions {
  isGamePageScope?: boolean | null | undefined;
  documentLike?: DocumentLike | null | undefined;
  hostSelector?: string | null | undefined;
  buttonId?: string | null | undefined;
  buttonClassName?: string | null | undefined;
  iconSvg?: string | null | undefined;
}

export interface EnsureMobileHintToggleButtonOptions extends EnsureMobileTopButtonOptions {
  settingsButtonId?: string | null | undefined;
}

const DEFAULT_HOST_SELECTOR = ".top-action-buttons";
const DEFAULT_UNDO_BUTTON_ID = "top-mobile-undo-btn";
const DEFAULT_UNDO_CLASS_NAME = "top-action-btn mobile-undo-top-btn";
const DEFAULT_UNDO_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>';
const DEFAULT_HINT_BUTTON_ID = "top-mobile-hint-btn";
const DEFAULT_HINT_CLASS_NAME = "top-action-btn mobile-hint-toggle-btn";
const DEFAULT_HINT_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>';
const DEFAULT_SETTINGS_BUTTON_ID = "top-settings-btn";
const DEFAULT_EXPAND_BUTTON_ID = "top-actions-expand-toggle";
const DEFAULT_EXPAND_CLASS_NAME = "top-action-btn mobile-actions-expand-toggle";
const MOBILE_BREAKPOINT_QUERY = "(max-width: 980px)";
const MOBILE_EXPANDED_ATTR = "data-mobile-actions-expanded";
const TOP_BUTTON_STYLE_ATTR = "data-top-button-style";
const MODE_ID_ATTR = "data-mode-id";
const MODE_TEXT = "text";
const EXPAND_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>';
const COLLAPSE_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M8 12h8"></path></svg>';
const TOP_ICON_HTML_ATTR = "data-top-btn-icon-html";

const PRIMARY_BUTTON_ID_SET: Record<string, boolean> = {
  "stats-panel-toggle": true,
  "top-practice-btn": true,
  "top-settings-btn": true,
  "top-restart-btn": true,
  "timerbox-toggle-btn": true,
  "top-actions-expand-toggle": true
};

function asParent(node: unknown): ParentLike | null {
  if (!node || typeof node !== "object") return null;
  const parent = node as ParentLike;
  if (typeof parent.appendChild !== "function" || typeof parent.insertBefore !== "function") return null;
  return parent;
}

function querySelector(doc: DocumentLike, selector: string): ElementLike | null {
  if (!doc || typeof doc.querySelector !== "function") return null;
  try {
    return doc.querySelector(selector);
  } catch (_err) {
    return null;
  }
}

function appendChild(parent: unknown, node: unknown): boolean {
  const host = asParent(parent);
  if (!host) return false;
  try {
    host.appendChild(node);
    return true;
  } catch (_err) {
    return false;
  }
}

function insertBefore(parent: unknown, node: unknown, reference: unknown): boolean {
  const host = asParent(parent);
  if (!host) return false;
  try {
    host.insertBefore(node, reference);
    return true;
  } catch (_err) {
    return false;
  }
}

function resolveString(value: string | null | undefined, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

function isCompactViewport(): boolean {
  const matchMedia = (globalThis as any)?.matchMedia;
  if (typeof matchMedia === "function") {
    try {
      return !!matchMedia.call(globalThis, MOBILE_BREAKPOINT_QUERY)?.matches;
    } catch (_err) {}
  }
  const width = Number((globalThis as any)?.innerWidth);
  return Number.isFinite(width) ? width <= 980 : false;
}

function getBody(doc: DocumentLike | null): ElementLike | null {
  if (!doc || !doc.body) return null;
  return doc.body;
}

function readExpandedState(doc: DocumentLike | null): boolean {
  const body = getBody(doc);
  if (!body || typeof body.getAttribute !== "function") return false;
  return String(body.getAttribute(MOBILE_EXPANDED_ATTR) || "") === "1";
}

function setExpandedState(doc: DocumentLike | null, expanded: boolean): void {
  const body = getBody(doc);
  if (!body || typeof body.setAttribute !== "function") return;
  body.setAttribute(MOBILE_EXPANDED_ATTR, expanded ? "1" : "0");
}

function hasClass(node: ElementLike | null, className: string): boolean {
  if (!node) return false;
  const current = typeof node.className === "string" ? node.className : "";
  return (" " + current + " ").indexOf(" " + className + " ") >= 0;
}

function addClass(node: ElementLike | null, className: string): void {
  if (!node || hasClass(node, className)) return;
  const current = typeof node.className === "string" ? node.className.trim() : "";
  node.className = current ? current + " " + className : className;
}

function removeClass(node: ElementLike | null, className: string): void {
  if (!node || !hasClass(node, className)) return;
  const current = typeof node.className === "string" ? node.className : "";
  node.className = current
    .split(/\s+/)
    .filter((name) => name && name !== className)
    .join(" ");
}

function resolveUiLanguage(doc: DocumentLike | null): "zh" | "en" {
  try {
    const root = doc?.documentElement;
    if (root && typeof root.getAttribute === "function") {
      const byData = String(root.getAttribute("data-ui-lang") || "").trim().toLowerCase();
      if (byData.indexOf("en") === 0) return "en";
      const byLang = String(root.getAttribute("lang") || "").trim().toLowerCase();
      if (byLang.indexOf("en") === 0) return "en";
    }
  } catch (_err) {}
  return "zh";
}

function resolveTopButtonStyleMode(doc: DocumentLike | null): "text" | "icon" {
  const body = getBody(doc);
  if (!body || typeof body.getAttribute !== "function") return "icon";
  const mode = String(body.getAttribute(TOP_BUTTON_STYLE_ATTR) || "").trim().toLowerCase();
  return mode === MODE_TEXT ? "text" : "icon";
}

function resolveModeId(doc: DocumentLike | null): string {
  const body = getBody(doc);
  if (!body || typeof body.getAttribute !== "function") return "";
  return String(body.getAttribute(MODE_ID_ATTR) || "").trim().toLowerCase();
}

function isUndoPreferredPrimaryMode(doc: DocumentLike | null): boolean {
  const modeId = resolveModeId(doc);
  if (!modeId) return false;
  if (modeId.indexOf("no_undo") >= 0 || modeId.indexOf("no-undo") >= 0) return false;
  if (modeId.indexOf("capped") >= 0) return false;
  return modeId.indexOf("undo") >= 0;
}

function resolveExpandButtonLabel(doc: DocumentLike | null, expanded: boolean): string {
  const lang = resolveUiLanguage(doc);
  if (lang === "en") return expanded ? "Collapse" : "Expand";
  return expanded ? "\u6536\u8d77" : "\u5c55\u5f00";
}

function applyExpandButtonText(btn: ElementLike | null, doc: DocumentLike | null): void {
  if (!btn) return;
  const expanded = readExpandedState(doc);
  const label = resolveExpandButtonLabel(doc, expanded);
  const mode = resolveTopButtonStyleMode(doc);
  if (mode === "text") {
    btn.textContent = label;
  } else {
    const icon = expanded ? COLLAPSE_ICON_SVG : EXPAND_ICON_SVG;
    if (typeof btn.innerHTML !== "string" || btn.innerHTML !== icon) {
      btn.innerHTML = icon;
    }
    if (typeof btn.setAttribute === "function") {
      btn.setAttribute(TOP_ICON_HTML_ATTR, icon);
    }
  }
  if (typeof btn.setAttribute === "function") {
    btn.setAttribute("title", label);
    btn.setAttribute("aria-label", label);
    btn.setAttribute("aria-expanded", expanded ? "true" : "false");
  }
}

function collectHostButtons(host: ElementLike | null): ElementLike[] {
  const parent = asParent(host);
  const children = parent && (parent as any).children;
  if (!parent || !children || typeof (children as any).length !== "number") return [];
  const result: ElementLike[] = [];
  for (let i = 0; i < (children as any).length; i += 1) {
    const child = (children as any)[i] as ElementLike | null;
    if (!child || typeof child !== "object") continue;
    result.push(child);
  }
  return result;
}

function isPrimaryTopButton(node: ElementLike | null, doc: DocumentLike | null): boolean {
  if (!node) return false;
  const id = typeof node.id === "string" ? node.id : "";
  if (id === "timerbox-toggle-btn") return !isUndoPreferredPrimaryMode(doc);
  if (id === "top-mobile-undo-btn") return isUndoPreferredPrimaryMode(doc);
  if (id && PRIMARY_BUTTON_ID_SET[id]) return true;
  const className = typeof node.className === "string" ? node.className : "";
  if (className.indexOf("mobile-undo-top-btn") >= 0) return isUndoPreferredPrimaryMode(doc);
  if (className.indexOf("timerbox-toggle-btn") >= 0) return !isUndoPreferredPrimaryMode(doc);
  if (className.indexOf("restart-button") >= 0) return true;
  return false;
}

function syncMobileActionButtonClasses(host: ElementLike | null, doc: DocumentLike | null): void {
  const buttons = collectHostButtons(host);
  for (let i = 0; i < buttons.length; i += 1) {
    const button = buttons[i];
    if (button.id === "top-mode-intro-btn" && button.style?.display === "none") {
      removeClass(button, "mobile-actions-primary");
      removeClass(button, "mobile-actions-collapse-target");
      continue;
    }
    if (isPrimaryTopButton(button, doc)) {
      addClass(button, "mobile-actions-primary");
      removeClass(button, "mobile-actions-collapse-target");
    } else {
      addClass(button, "mobile-actions-collapse-target");
      removeClass(button, "mobile-actions-primary");
    }
  }
}

function ensureAnchorButton(
  doc: DocumentLike,
  buttonId: string,
  buttonClassName: string,
  iconSvg: string
): ElementLike {
  let btn = doc.getElementById(buttonId);
  if (!btn) {
    btn = doc.createElement("a");
    btn.id = buttonId;
    btn.className = buttonClassName;
    btn.href = "#";
    btn.innerHTML = iconSvg;
  }
  return btn;
}

export function ensureMobileExpandToggleButtonDom(
  options: EnsureMobileTopButtonOptions
): ElementLike | null {
  const opts = options || {};
  if (!opts.isGamePageScope) return null;
  const doc = opts.documentLike || null;
  if (!doc) return null;

  const host = querySelector(doc, resolveString(opts.hostSelector, DEFAULT_HOST_SELECTOR));
  if (!host) return null;

  if (!isCompactViewport()) {
    setExpandedState(doc, false);
    syncMobileActionButtonClasses(host, doc);
    return null;
  }

  const btn = ensureAnchorButton(
    doc,
    DEFAULT_EXPAND_BUTTON_ID,
    DEFAULT_EXPAND_CLASS_NAME,
    ""
  );
  if ((btn as any).parentNode !== host) {
    appendChild(host, btn);
  }

  if (!btn.__mobileActionsToggleBound && typeof btn.addEventListener === "function") {
    btn.__mobileActionsToggleBound = true;
    btn.addEventListener("click", (event?: unknown) => {
      const eventLike = (event || {}) as { preventDefault?: () => void };
      if (typeof eventLike.preventDefault === "function") eventLike.preventDefault();
      const nextExpanded = !readExpandedState(doc);
      setExpandedState(doc, nextExpanded);
      applyExpandButtonText(btn, doc);
    });
  }

  if (!btn.__mobileActionsLangBound && typeof (globalThis as any)?.addEventListener === "function") {
    btn.__mobileActionsLangBound = true;
    (globalThis as any).addEventListener("uilanguagechange", () => {
      applyExpandButtonText(btn, doc);
    });
  }

  syncMobileActionButtonClasses(host, doc);
  applyExpandButtonText(btn, doc);
  return btn;
}

export function ensureMobileUndoTopButtonDom(
  options: EnsureMobileTopButtonOptions
): ElementLike | null {
  const opts = options || {};
  if (!opts.isGamePageScope) return null;
  const doc = opts.documentLike || null;
  if (!doc) return null;

  const host = querySelector(doc, resolveString(opts.hostSelector, DEFAULT_HOST_SELECTOR));
  if (!host) return null;

  const btn = ensureAnchorButton(
    doc,
    resolveString(opts.buttonId, DEFAULT_UNDO_BUTTON_ID),
    resolveString(opts.buttonClassName, DEFAULT_UNDO_CLASS_NAME),
    resolveString(opts.iconSvg, DEFAULT_UNDO_ICON_SVG)
  );

  const hostParent = asParent(host);
  if (!hostParent) return null;
  if ((btn as any).parentNode !== host || hostParent.lastElementChild !== btn) {
    appendChild(host, btn);
  }
  ensureMobileExpandToggleButtonDom(options);
  syncMobileActionButtonClasses(host, doc);
  return btn;
}

export function ensureMobileHintToggleButtonDom(
  options: EnsureMobileHintToggleButtonOptions
): ElementLike | null {
  const opts = options || {};
  if (!opts.isGamePageScope) return null;
  const doc = opts.documentLike || null;
  if (!doc) return null;

  const host = querySelector(doc, resolveString(opts.hostSelector, DEFAULT_HOST_SELECTOR));
  if (!host) return null;

  const btn = ensureAnchorButton(
    doc,
    resolveString(opts.buttonId, DEFAULT_HINT_BUTTON_ID),
    resolveString(opts.buttonClassName, DEFAULT_HINT_CLASS_NAME),
    resolveString(opts.iconSvg, DEFAULT_HINT_ICON_SVG)
  );

  const settingsBtn = doc.getElementById(resolveString(opts.settingsButtonId, DEFAULT_SETTINGS_BUTTON_ID));
  if (settingsBtn && (settingsBtn as any).parentNode === host) {
    if ((btn as any).parentNode !== host || (btn as any).nextSibling !== settingsBtn) {
      insertBefore(host, btn, settingsBtn);
    }
  } else if ((btn as any).parentNode !== host) {
    appendChild(host, btn);
  }
  ensureMobileExpandToggleButtonDom(options);
  syncMobileActionButtonClasses(host, doc);
  return btn;
}

