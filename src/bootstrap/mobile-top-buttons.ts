interface ParentLike {
  appendChild(node: unknown): unknown;
  insertBefore(node: unknown, referenceNode: unknown): unknown;
  lastElementChild?: unknown;
}

interface ElementLike {
  id?: string;
  className?: string;
  href?: string;
  innerHTML?: string;
  parentNode?: unknown;
  nextSibling?: unknown;
}

interface DocumentLike {
  getElementById(id: string): ElementLike | null;
  createElement(tagName: string): ElementLike;
  querySelector?(selector: string): ElementLike | null;
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
  return btn;
}
