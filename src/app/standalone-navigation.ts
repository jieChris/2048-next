const STANDALONE_DISPLAY_MODE_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: window-controls-overlay)",
  "(display-mode: fullscreen)",
  "(display-mode: minimal-ui)"
];

let standaloneNavigationBound = false;

function hasDomWindow(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function matchesStandaloneDisplayMode(): boolean {
  if (!hasDomWindow() || typeof window.matchMedia !== "function") return false;
  for (let i = 0; i < STANDALONE_DISPLAY_MODE_QUERIES.length; i += 1) {
    const query = STANDALONE_DISPLAY_MODE_QUERIES[i];
    try {
      if (window.matchMedia(query).matches) return true;
    } catch (_err) {
      // Ignore unsupported media queries.
    }
  }
  return false;
}

function hasLegacyStandaloneFlag(): boolean {
  if (!hasDomWindow()) return false;
  const maybeNavigator = window.navigator as Navigator & { standalone?: boolean };
  return maybeNavigator.standalone === true;
}

export function isStandaloneAppWindow(): boolean {
  return matchesStandaloneDisplayMode() || hasLegacyStandaloneFlag();
}

function resolveHttpUrl(rawHref: string): URL | null {
  try {
    const url = new URL(rawHref, window.location.href);
    const protocol = String(url.protocol || "").toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return null;
    return url;
  } catch (_err) {
    return null;
  }
}

function isInternalAppUrl(url: URL): boolean {
  return String(url.origin || "") === String(window.location.origin || "");
}

function normalizeStandaloneInternalTargets(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>("a[href][target='_blank']");
  for (let i = 0; i < links.length; i += 1) {
    const link = links[i];
    const href = String(link.getAttribute("href") || "").trim();
    if (!href) continue;
    const url = resolveHttpUrl(href);
    if (!url || !isInternalAppUrl(url)) continue;
    link.setAttribute("target", "_self");
    link.removeAttribute("rel");
  }
}

function hasModifierKey(event: MouseEvent): boolean {
  return !!(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
}

function resolveInternalNavigationUrl(event: MouseEvent): URL | null {
  if (event.defaultPrevented || event.button !== 0 || hasModifierKey(event)) return null;
  const target = event.target as Element | null;
  const link =
    target && typeof target.closest === "function"
      ? (target.closest("a[href]") as HTMLAnchorElement | null)
      : null;
  if (!link || link.hasAttribute("download")) return null;
  // Keep practice transfer flow handled by its dedicated click runtime.
  if (String(link.id || "").trim() === "top-practice-btn") return null;
  const href = String(link.getAttribute("href") || "").trim();
  if (!href || href.startsWith("#")) return null;
  const url = resolveHttpUrl(href);
  if (!url || !isInternalAppUrl(url)) return null;
  return url;
}

export function bindStandaloneInternalNavigation(): void {
  if (!hasDomWindow() || standaloneNavigationBound || !isStandaloneAppWindow()) return;
  standaloneNavigationBound = true;

  normalizeStandaloneInternalTargets();

  document.addEventListener(
    "click",
    (event) => {
      const mouseEvent = event as MouseEvent;
      const targetUrl = resolveInternalNavigationUrl(mouseEvent);
      if (!targetUrl) return;
      mouseEvent.preventDefault();
      window.location.assign(targetUrl.href);
    },
    true
  );
}
