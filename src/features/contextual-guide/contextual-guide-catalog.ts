import {
  getContextualGuideCatalog,
  openRegisteredContextualGuide,
  type ContextualGuideContext,
  type ContextualGuideDefinition,
} from "./contextual-guide";

interface CatalogInitInput {
  documentLike?: Document | null;
  windowLike?: Window | null;
}

function resolvePageId(pathname: string): string {
  const file = pathname.split("/").pop()?.toLowerCase() || "2048.html";
  const pages: Record<string, string> = {
    "2048.html": "index",
    "undo_2048.html": "undo",
    "capped_2048.html": "capped",
    "practice_board.html": "practice",
    "play.html": "play",
    "replay.html": "replay",
    "modes.html": "modes",
    "palette.html": "palette",
    "relay_5x5.html": "relay-5x5",
    "history.html": "history",
  };
  return pages[file] || "";
}

function isCompact(windowLike: Window): boolean {
  try {
    return windowLike.matchMedia?.("(max-width: 980px)").matches === true;
  } catch (_error) {
    return windowLike.innerWidth <= 980;
  }
}

function resolveContext(windowLike: Window): ContextualGuideContext {
  const params = new URLSearchParams(windowLike.location.search);
  const config = (windowLike as Window & { GAME_MODE_CONFIG?: Record<string, unknown> })
    .GAME_MODE_CONFIG;
  const modeKey =
    (typeof config?.key === "string" && config.key) ||
    params.get("mode_key") ||
    params.get("practice_mode_key") ||
    "";
  const ruleset =
    (typeof config?.ruleset === "string" && config.ruleset) ||
    params.get("practice_ruleset") ||
    "";
  return {
    pageId: resolvePageId(windowLike.location.pathname),
    modeKey,
    modeConfig: config || null,
    ruleset,
    compact: isCompact(windowLike),
    currentUrl: `${windowLike.location.pathname}${windowLike.location.search}${windowLike.location.hash}`,
  };
}

function isCurrentPage(
  definition: ContextualGuideDefinition,
  context: ContextualGuideContext,
): boolean {
  return definition.pageId === context.pageId;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function localize(value: { zh: string; en: string }, english: boolean): string {
  return english ? value.en : value.zh;
}

function closeSettingsModal(windowLike: Window, documentLike: Document): void {
  const runtime = (windowLike as Window & {
    CoreReplayModalRuntime?: {
      applySettingsModalClose?: (input: { documentLike: Document }) => unknown;
    };
  }).CoreReplayModalRuntime;
  if (typeof runtime?.applySettingsModalClose === "function") {
    runtime.applySettingsModalClose({ documentLike });
    return;
  }
  const modal = documentLike.getElementById("settings-modal") as HTMLElement | null;
  if (modal) modal.style.display = "none";
}

function renderCatalog(
  row: HTMLElement,
  windowLike: Window,
  documentLike: Document,
): HTMLAnchorElement[] {
  const english = documentLike.documentElement.lang.toLowerCase().startsWith("en");
  const context = resolveContext(windowLike);
  row.innerHTML = `
    <details class="contextual-guide-catalog" id="contextual-guide-catalog">
      <summary>
        <span class="contextual-guide-catalog-copy">
          <strong>${english ? "Beginner Guides" : "新手指引"}</strong>
          <small>${english ? "Reopen a guide for any page" : "随时重新查看各页面指引"}</small>
        </span>
        <span class="contextual-guide-catalog-action" aria-hidden="true">${english ? "Browse" : "查看"}</span>
      </summary>
      <div class="contextual-guide-catalog-list" role="list"></div>
    </details>`;
  const list = row.querySelector<HTMLElement>(".contextual-guide-catalog-list");
  if (!list) return [];
  const links: HTMLAnchorElement[] = [];
  for (const definition of getContextualGuideCatalog()) {
    const item = documentLike.createElement("a");
    item.className = "contextual-guide-catalog-item";
    item.dataset.contextualGuideId = definition.id;
    item.href = definition.buildTargetUrl(context);
    item.innerHTML =
      `<span class="contextual-guide-catalog-item-copy">` +
      `<strong>${escapeHtml(localize(definition.title, english))}</strong>` +
      `<small>${escapeHtml(localize(definition.description, english))}</small>` +
      `</span><span class="contextual-guide-catalog-arrow" aria-hidden="true">→</span>`;
    list.appendChild(item);
    links.push(item);
  }
  return links;
}

function resetCatalogScroll(row: HTMLElement, windowLike: Window): void {
  if (windowLike.location.hash !== "#contextual-guide-settings") return;
  const list = row.querySelector<HTMLElement>(".contextual-guide-catalog-list");
  if (list) list.scrollTop = 0;
}

export interface ContextualGuideCatalogInitResult {
  didBind: boolean;
  linkCount: number;
}

export function initContextualGuideCatalogUI(
  input: CatalogInitInput = {},
): ContextualGuideCatalogInitResult {
  const documentLike = input.documentLike || (typeof document === "undefined" ? null : document);
  const windowLike = input.windowLike || (typeof window === "undefined" ? null : window);
  if (!documentLike || !windowLike) return { didBind: false, linkCount: 0 };
  const row = documentLike.getElementById("contextual-guide-catalog-row") as HTMLElement | null;
  if (!row) return { didBind: false, linkCount: 0 };

  const bind = (): void => {
    const links = renderCatalog(row, windowLike, documentLike);
    resetCatalogScroll(row, windowLike);
    for (const link of links) {
      const definition = getContextualGuideCatalog().find(
        (item) => item.id === link.dataset.contextualGuideId,
      );
      if (!definition) continue;
      link.addEventListener("click", (event) => {
        const context = resolveContext(windowLike);
        if (!isCurrentPage(definition, context) || (definition.matches && !definition.matches(context))) {
          return;
        }
        event.preventDefault();
        closeSettingsModal(windowLike, documentLike);
        openRegisteredContextualGuide(definition.id, context);
      });
    }
  };

  const rowRecord = row as HTMLElement & { __contextualGuideCatalogBound?: boolean };
  if (!rowRecord.__contextualGuideCatalogBound) {
    rowRecord.__contextualGuideCatalogBound = true;
    bind();
    windowLike.addEventListener("uilanguagechange", bind);
    windowLike.addEventListener("hashchange", () => resetCatalogScroll(row, windowLike));
    return { didBind: true, linkCount: row.querySelectorAll("[data-contextual-guide-id]").length };
  }
  bind();
  return { didBind: false, linkCount: row.querySelectorAll("[data-contextual-guide-id]").length };
}
