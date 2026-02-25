interface MobileHintStyleLike {
  display?: string;
}

interface MobileHintEventLike {
  target?: unknown;
}

interface MobileHintElementLike {
  id?: string;
  className?: string;
  textContent?: string | null;
  style?: MobileHintStyleLike | null;
  __mobileHintBound?: boolean;
  appendChild?(child: MobileHintElementLike): unknown;
  addEventListener?(
    type: string,
    listener: (event: MobileHintEventLike) => void
  ): void;
}

export interface MobileHintDocumentLike {
  body?: MobileHintElementLike | null;
  getElementById(id: string): MobileHintElementLike | null;
  createElement(tagName: string): MobileHintElementLike;
}

export interface EnsureMobileHintModalDomOptions {
  isGamePageScope?: boolean;
  documentLike?: MobileHintDocumentLike | null | undefined;
  overlayId?: string | null | undefined;
  bodyId?: string | null | undefined;
  closeButtonId?: string | null | undefined;
  overlayClassName?: string | null | undefined;
  contentClassName?: string | null | undefined;
  bodyClassName?: string | null | undefined;
  titleText?: string | null | undefined;
  closeButtonText?: string | null | undefined;
}

export interface EnsureMobileHintModalDomResult {
  overlay: MobileHintElementLike;
  body: MobileHintElementLike;
  closeButton: MobileHintElementLike;
}

const DEFAULT_OVERLAY_ID = "mobile-hint-overlay";
const DEFAULT_BODY_ID = "mobile-hint-body";
const DEFAULT_CLOSE_BUTTON_ID = "mobile-hint-close";
const DEFAULT_OVERLAY_CLASS_NAME = "replay-modal-overlay mobile-hint-overlay";
const DEFAULT_CONTENT_CLASS_NAME = "replay-modal-content mobile-hint-modal-content";
const DEFAULT_BODY_CLASS_NAME = "mobile-hint-body";
const DEFAULT_TITLE_TEXT = "玩法提示";
const DEFAULT_CLOSE_BUTTON_TEXT = "关闭";

function resolveString(value: string | null | undefined, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

function appendChild(parent: MobileHintElementLike | null, child: MobileHintElementLike | null): void {
  if (!parent || !child || typeof parent.appendChild !== "function") return;
  try {
    parent.appendChild(child);
  } catch (_err) {}
}

function ensureStyle(element: MobileHintElementLike): MobileHintStyleLike {
  if (!element.style) {
    element.style = {};
  }
  return element.style;
}

function createModalTree(
  doc: MobileHintDocumentLike,
  overlay: MobileHintElementLike,
  options: {
    bodyId: string;
    closeButtonId: string;
    contentClassName: string;
    bodyClassName: string;
    titleText: string;
    closeButtonText: string;
  }
): EnsureMobileHintModalDomResult {
  const content = doc.createElement("div");
  content.className = options.contentClassName;

  const title = doc.createElement("h3");
  title.textContent = options.titleText;
  appendChild(content, title);

  const body = doc.createElement("div");
  body.id = options.bodyId;
  body.className = options.bodyClassName;
  appendChild(content, body);

  const actions = doc.createElement("div");
  actions.className = "replay-modal-actions";
  appendChild(content, actions);

  const closeButton = doc.createElement("button");
  closeButton.id = options.closeButtonId;
  closeButton.className = "replay-button";
  closeButton.textContent = options.closeButtonText;
  appendChild(actions, closeButton);

  appendChild(overlay, content);
  return { overlay, body, closeButton };
}

function bindCloseBehavior(overlay: MobileHintElementLike, closeButton: MobileHintElementLike): void {
  if (!overlay.__mobileHintBound && typeof overlay.addEventListener === "function") {
    overlay.__mobileHintBound = true;
    overlay.addEventListener("click", (event) => {
      if (event && event.target === overlay) {
        ensureStyle(overlay).display = "none";
      }
    });
  }

  if (!closeButton.__mobileHintBound && typeof closeButton.addEventListener === "function") {
    closeButton.__mobileHintBound = true;
    closeButton.addEventListener("click", () => {
      ensureStyle(overlay).display = "none";
    });
  }
}

export function ensureMobileHintModalDom(
  options: EnsureMobileHintModalDomOptions
): EnsureMobileHintModalDomResult | null {
  const opts = options || {};
  if (!opts.isGamePageScope) return null;
  const doc = opts.documentLike || null;
  if (!doc || !doc.body) return null;

  const overlayId = resolveString(opts.overlayId, DEFAULT_OVERLAY_ID);
  const bodyId = resolveString(opts.bodyId, DEFAULT_BODY_ID);
  const closeButtonId = resolveString(opts.closeButtonId, DEFAULT_CLOSE_BUTTON_ID);
  const overlayClassName = resolveString(opts.overlayClassName, DEFAULT_OVERLAY_CLASS_NAME);
  const contentClassName = resolveString(opts.contentClassName, DEFAULT_CONTENT_CLASS_NAME);
  const bodyClassName = resolveString(opts.bodyClassName, DEFAULT_BODY_CLASS_NAME);
  const titleText = resolveString(opts.titleText, DEFAULT_TITLE_TEXT);
  const closeButtonText = resolveString(opts.closeButtonText, DEFAULT_CLOSE_BUTTON_TEXT);

  let overlay = doc.getElementById(overlayId);
  if (!overlay) {
    overlay = doc.createElement("div");
    overlay.id = overlayId;
    overlay.className = overlayClassName;
    ensureStyle(overlay).display = "none";
    appendChild(doc.body, overlay);
  }

  let body = doc.getElementById(bodyId);
  let closeButton = doc.getElementById(closeButtonId);

  if (!body || !closeButton) {
    const created = createModalTree(doc, overlay, {
      bodyId,
      closeButtonId,
      contentClassName,
      bodyClassName,
      titleText,
      closeButtonText
    });
    body = created.body;
    closeButton = created.closeButton;
  }

  bindCloseBehavior(overlay, closeButton);
  return { overlay, body, closeButton };
}
