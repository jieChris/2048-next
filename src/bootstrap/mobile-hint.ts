export interface MobileHintCollectOptions {
  isGamePageScope?: boolean;
  introNode?: unknown;
  containerNode?: unknown;
  explainNode?: unknown;
  defaultText?: string | null | undefined;
}

function nodeTagName(node: unknown): string {
  const value = node as { tagName?: string | null } | null;
  return value && typeof value.tagName === "string" ? value.tagName.toLowerCase() : "";
}

function nodeTypeOf(node: unknown): number {
  const value = node as { nodeType?: number } | null;
  return value && typeof value.nodeType === "number" ? value.nodeType : 0;
}

function childNodesOf(node: unknown): unknown[] {
  const value = node as { childNodes?: ArrayLike<unknown> } | null;
  if (!value || !value.childNodes) return [];
  const out: unknown[] = [];
  for (let i = 0; i < value.childNodes.length; i++) {
    out.push(value.childNodes[i]);
  }
  return out;
}

function elementClosest(node: unknown, selector: string): unknown {
  const value = node as { closest?: ((selector: string) => unknown) | null } | null;
  if (!value || typeof value.closest !== "function") return null;
  try {
    return value.closest(selector);
  } catch (_err) {
    return null;
  }
}

function elementQuerySelectorAll(node: unknown, selector: string): unknown[] {
  const value = node as { querySelectorAll?: ((selector: string) => ArrayLike<unknown>) | null } | null;
  if (!value || typeof value.querySelectorAll !== "function") return [];
  let list: ArrayLike<unknown> | null = null;
  try {
    list = value.querySelectorAll(selector);
  } catch (_err) {
    list = null;
  }
  if (!list) return [];
  const out: unknown[] = [];
  for (let i = 0; i < list.length; i++) {
    out.push(list[i]);
  }
  return out;
}

function elementQuerySelector(node: unknown, selector: string): unknown {
  const value = node as { querySelector?: ((selector: string) => unknown) | null } | null;
  if (!value || typeof value.querySelector !== "function") return null;
  try {
    return value.querySelector(selector);
  } catch (_err) {
    return null;
  }
}

function nodeTextContent(node: unknown): string {
  const value = node as { textContent?: string | null } | null;
  return value && typeof value.textContent === "string" ? value.textContent : "";
}

function elementInnerText(node: unknown): string {
  const value = node as { innerText?: string | null; textContent?: string | null } | null;
  if (!value) return "";
  if (typeof value.innerText === "string") return value.innerText;
  if (typeof value.textContent === "string") return value.textContent;
  return "";
}

function nodeParent(node: unknown): unknown {
  const value = node as { parentNode?: unknown } | null;
  return value ? value.parentNode : null;
}

function nextElementSibling(node: unknown): unknown {
  const value = node as { nextElementSibling?: unknown } | null;
  return value ? value.nextElementSibling : null;
}

function elementAttribute(node: unknown, key: string): string {
  const value = node as { getAttribute?: ((key: string) => string | null) | null } | null;
  if (!value || typeof value.getAttribute !== "function") return "";
  try {
    return String(value.getAttribute(key) || "");
  } catch (_err) {
    return "";
  }
}

export function normalizeHintParagraphText(text: string | null | undefined): string {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function readHintTextForModalElement(node: unknown): string {
  const raw = elementInnerText(node);
  return String(raw || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractHintNodeText(node: unknown): string {
  if (!node) return "";
  const nodeType = nodeTypeOf(node);
  if (nodeType === 3) {
    return nodeTextContent(node);
  }
  if (nodeType !== 1) return "";

  const tag = nodeTagName(node);
  if (tag === "br") return "\n";
  if (tag === "a") {
    let anchorText = "";
    const childNodes = childNodesOf(node);
    for (let i = 0; i < childNodes.length; i++) {
      anchorText += extractHintNodeText(childNodes[i]);
    }
    anchorText = String(anchorText || "").replace(/\s+/g, " ").trim();
    const href = String(elementAttribute(node, "href") || "").trim();
    if (!href) return anchorText;
    if (!anchorText) return href;
    return anchorText + "（" + href + "）";
  }

  let out = "";
  const childNodes = childNodesOf(node);
  for (let i = 0; i < childNodes.length; i++) {
    out += extractHintNodeText(childNodes[i]);
  }
  return out;
}

export function collectHintParagraphText(node: unknown): string {
  if (!node || nodeTypeOf(node) !== 1) return "";
  return normalizeHintParagraphText(extractHintNodeText(node));
}

export function collectHintTextsFromMainContainer(options: {
  isGamePageScope?: boolean;
  containerNode?: unknown;
}): string[] {
  const opts = options || {};
  if (!opts.isGamePageScope) return [];
  const container = opts.containerNode || null;
  if (!container) return [];

  const lines: string[] = [];
  const paragraphs = elementQuerySelectorAll(container, "p");
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (!p || nodeTypeOf(p) !== 1) continue;
    if (elementClosest(p, ".above-game")) continue;
    if (elementClosest(p, ".game-container")) continue;
    const text = collectHintParagraphText(p);
    if (text) lines.push(text);
  }

  if (!lines.length) {
    const gameContainer = elementQuerySelector(container, ".game-container");
    if (!gameContainer || nodeParent(gameContainer) !== container) return [];
    let cursor = nextElementSibling(gameContainer);
    while (cursor) {
      if (nodeTagName(cursor) === "p") {
        const fallbackText = collectHintParagraphText(cursor);
        if (fallbackText) lines.push(fallbackText);
      }
      cursor = nextElementSibling(cursor);
    }
  }
  return lines;
}

export function dedupeHintLines(lines: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen: Record<string, 1> = {};
  for (let i = 0; i < lines.length; i++) {
    const line = normalizeHintParagraphText(lines[i]);
    if (!line) continue;
    if (Object.prototype.hasOwnProperty.call(seen, line)) continue;
    seen[line] = 1;
    out.push(line);
  }
  return out;
}

export function collectMobileHintTexts(options: MobileHintCollectOptions): string[] {
  const opts = options || {};
  if (!opts.isGamePageScope) return [];

  let introText = collectHintParagraphText(opts.introNode || null);
  if (!introText) {
    introText = readHintTextForModalElement(opts.introNode || null);
  }
  const mainLines = collectHintTextsFromMainContainer({
    isGamePageScope: true,
    containerNode: opts.containerNode || null
  });

  const lines: string[] = [];
  if (introText) lines.push(introText);
  for (let i = 0; i < mainLines.length; i++) {
    lines.push(mainLines[i]);
  }
  if (!lines.length) {
    const explainText = readHintTextForModalElement(opts.explainNode || null);
    if (explainText) lines.push(explainText);
  }
  if (!lines.length) {
    lines.push(
      typeof opts.defaultText === "string" && opts.defaultText
        ? opts.defaultText
        : "合并数字，合成 2048 方块。"
    );
  }
  return dedupeHintLines(lines);
}
