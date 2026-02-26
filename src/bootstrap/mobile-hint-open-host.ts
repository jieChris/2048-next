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

function collectLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const line = typeof value[i] === "string" ? value[i].trim() : "";
    if (!line) continue;
    out.push(line);
  }
  return out;
}

function clearElement(element: unknown): void {
  const target = toRecord(element);
  if (typeof target.innerHTML === "string") {
    target.innerHTML = "";
    return;
  }
  if (typeof target.textContent === "string") {
    target.textContent = "";
  }
}

function createParagraph(documentLike: unknown, text: string): unknown {
  const createElement = asFunction<(tagName: string) => unknown>(toRecord(documentLike).createElement);
  if (!createElement) return null;
  let element: unknown;
  try {
    element = createElement.call(documentLike, "p");
  } catch (_err) {
    return null;
  }
  const record = toRecord(element);
  record.textContent = text;
  return element;
}

function appendChild(parent: unknown, child: unknown): boolean {
  if (!parent || !child) return false;
  const append = asFunction<(value: unknown) => unknown>(toRecord(parent).appendChild);
  if (!append) return false;
  try {
    append.call(parent, child);
    return true;
  } catch (_err) {
    return false;
  }
}

function setOverlayDisplay(overlay: unknown, value: string): boolean {
  const style = toRecord(toRecord(overlay).style);
  if (!style) return false;
  style.display = value;
  return true;
}

export interface MobileHintModalOpenResult {
  isScope: boolean;
  isCompact: boolean;
  hasDom: boolean;
  lineCount: number;
  didRenderLines: boolean;
  didShowOverlay: boolean;
}

export function applyMobileHintModalOpen(input: {
  isGamePageScope?: unknown;
  isCompactGameViewport?: unknown;
  ensureMobileHintModalDom?: unknown;
  mobileHintRuntime?: unknown;
  documentLike?: unknown;
  introSelector?: unknown;
  containerSelector?: unknown;
  explainSelector?: unknown;
  defaultText?: unknown;
}): MobileHintModalOpenResult {
  const source = toRecord(input);

  const isGamePageScope = asFunction<() => unknown>(source.isGamePageScope);
  const inScope = !!(isGamePageScope && isGamePageScope());
  if (!inScope) {
    return {
      isScope: false,
      isCompact: false,
      hasDom: false,
      lineCount: 0,
      didRenderLines: false,
      didShowOverlay: false
    };
  }

  const isCompactGameViewport = asFunction<() => unknown>(source.isCompactGameViewport);
  const compact = !!(isCompactGameViewport && isCompactGameViewport());
  if (!compact) {
    return {
      isScope: true,
      isCompact: false,
      hasDom: false,
      lineCount: 0,
      didRenderLines: false,
      didShowOverlay: false
    };
  }

  const ensureMobileHintModalDom = asFunction<() => unknown>(source.ensureMobileHintModalDom);
  const dom = toRecord(ensureMobileHintModalDom ? ensureMobileHintModalDom() : null);
  const overlay = dom.overlay;
  const body = dom.body;
  if (!overlay || !body) {
    return {
      isScope: true,
      isCompact: true,
      hasDom: false,
      lineCount: 0,
      didRenderLines: false,
      didShowOverlay: false
    };
  }

  const mobileHintRuntime = toRecord(source.mobileHintRuntime);
  const collectMobileHintTexts = asFunction<(options: unknown) => unknown>(
    mobileHintRuntime.collectMobileHintTexts
  );

  const documentLike = source.documentLike || null;
  const introSelector =
    typeof source.introSelector === "string" && source.introSelector
      ? source.introSelector
      : ".above-game .game-intro";
  const containerSelector =
    typeof source.containerSelector === "string" && source.containerSelector
      ? source.containerSelector
      : ".container";
  const explainSelector =
    typeof source.explainSelector === "string" && source.explainSelector
      ? source.explainSelector
      : ".game-explanation";

  const lines = collectLines(
    collectMobileHintTexts
      ? collectMobileHintTexts({
          isGamePageScope: true,
          introNode: querySelector(documentLike, introSelector),
          containerNode: querySelector(documentLike, containerSelector),
          explainNode: querySelector(documentLike, explainSelector),
          defaultText:
            typeof source.defaultText === "string" && source.defaultText
              ? source.defaultText
              : "合并数字，合成 2048 方块。"
        })
      : []
  );

  clearElement(body);
  let renderedCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const paragraph = createParagraph(documentLike, lines[i]);
    if (!paragraph) continue;
    if (appendChild(body, paragraph)) {
      renderedCount += 1;
    }
  }

  const didShowOverlay = setOverlayDisplay(overlay, "flex");

  return {
    isScope: true,
    isCompact: true,
    hasDom: true,
    lineCount: lines.length,
    didRenderLines: renderedCount > 0,
    didShowOverlay
  };
}
