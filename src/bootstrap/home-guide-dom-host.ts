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

function getElementById(documentLike: unknown, id: string): unknown {
  const getter = asFunction<(value: string) => unknown>(toRecord(documentLike).getElementById);
  if (!getter) return null;
  return (getter as unknown as Function).call(documentLike, id);
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

function applyOverlayShape(overlay: Record<string, unknown>): void {
  overlay.id = "home-guide-overlay";
  overlay.className = "home-guide-overlay";
  const style = toRecord(overlay.style);
  style.display = "none";
}

function applyPanelShape(panel: Record<string, unknown>, panelInnerHtml: string): void {
  panel.id = "home-guide-panel";
  panel.className = "home-guide-panel";
  const style = toRecord(panel.style);
  style.display = "none";
  panel.innerHTML = panelInnerHtml;
}

export interface HomeGuideDomHostResult {
  overlay: unknown;
  panel: unknown;
  createdOverlay: boolean;
  createdPanel: boolean;
}

export function applyHomeGuideDomEnsure(input: {
  documentLike?: unknown;
  homeGuideRuntime?: unknown;
  homeGuideState?: unknown;
}): HomeGuideDomHostResult {
  const source = toRecord(input);
  const documentLike = toRecord(source.documentLike);
  const homeGuideRuntime = toRecord(source.homeGuideRuntime);
  const homeGuideState = toRecord(source.homeGuideState);

  let overlay = getElementById(documentLike, "home-guide-overlay");
  let panel = getElementById(documentLike, "home-guide-panel");

  let createdOverlay = false;
  let createdPanel = false;

  const body = toRecord(documentLike.body);
  const panelInnerHtml = resolveText(
    asFunction<() => unknown>(homeGuideRuntime.buildHomeGuidePanelInnerHtml)?.call(homeGuideRuntime)
  );

  if (!overlay) {
    const nextOverlay = createElement(documentLike, "div");
    if (nextOverlay) {
      applyOverlayShape(toRecord(nextOverlay));
      if (body) {
        appendChild(body, nextOverlay);
      }
      overlay = nextOverlay;
      createdOverlay = true;
    }
  }

  if (!panel) {
    const nextPanel = createElement(documentLike, "div");
    if (nextPanel) {
      applyPanelShape(toRecord(nextPanel), panelInnerHtml);
      if (body) {
        appendChild(body, nextPanel);
      }
      panel = nextPanel;
      createdPanel = true;
    }
  }

  homeGuideState.overlay = overlay || null;
  homeGuideState.panel = panel || null;

  return {
    overlay: overlay || null,
    panel: panel || null,
    createdOverlay,
    createdPanel
  };
}
