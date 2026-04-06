import "../../js/theme_manager.js";

const MODE_WINDOW_PREFIX = "mode-singleton-";

function isEnglishUi(): boolean {
  if (typeof document === "undefined") return false;
  const uiLang = String(
    document.documentElement.getAttribute("data-ui-lang") ||
      document.documentElement.getAttribute("lang") ||
      ""
  )
    .trim()
    .toLowerCase();
  return uiLang.startsWith("en");
}

function resolveRelayLinkLabel(): string {
  return isEnglishUi() ? "5x5 Relay Mode (MVP)" : "5x5 接力模式（MVP）";
}

function ensureRelayModeEntry(): void {
  if (typeof document === "undefined") return;
  const existing = document.querySelector("a[data-mode-relay='5x5']");
  if (existing) return;
  const actionRow = document.querySelector(".mode-key-actions");
  if (!actionRow) return;
  const link = document.createElement("a");
  link.className = "mode-hub-btn";
  link.href = "relay_5x5.html";
  link.setAttribute("data-mode-relay", "5x5");
  link.textContent = resolveRelayLinkLabel();
  actionRow.appendChild(link);
}

function normalizeModeWindowKey(rawKey: string): string {
  return rawKey.trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function resolveModeWindowKeyFromHref(href: string): string {
  try {
    const url = new URL(href, window.location.href);
    const pathname = String(url.pathname || "").toLowerCase();
    const fileName = pathname.split("/").pop() || "";
    if (fileName === "play.html") {
      const modeKey = String(url.searchParams.get("mode_key") || "").trim();
      if (modeKey) return normalizeModeWindowKey(modeKey);
      return "play_default";
    }
    if (fileName === "2048.html") return "standard_4x4_pow2_no_undo";
    if (fileName === "undo_2048.html") return "classic_4x4_pow2_undo";
    if (fileName === "capped_2048.html") return "capped_4x4_pow2_no_undo";
    if (fileName === "relay_5x5.html") return "relay_5x5";
    return "";
  } catch (_err) {
    return "";
  }
}

function collectModeLinks(): HTMLAnchorElement[] {
  const links = document.querySelectorAll<HTMLAnchorElement>(
    ".mode-priority-card[href], .mode-hub-btn[href]"
  );
  return Array.from(links || []);
}

function openModeInSingletonWindow(link: HTMLAnchorElement): void {
  const targetName = String(link.target || "").trim();
  if (!targetName) {
    window.location.href = link.href;
    return;
  }
  const opened = window.open(link.href, targetName);
  if (opened && typeof opened.focus === "function") {
    opened.focus();
  }
}

function applySingleInstanceModeTargets(): void {
  const links = collectModeLinks();
  for (let i = 0; i < links.length; i += 1) {
    const link = links[i];
    const modeWindowKey = resolveModeWindowKeyFromHref(link.href);
    if (!modeWindowKey) continue;
    link.setAttribute("data-mode-single-instance", "1");
    link.setAttribute("data-mode-window", modeWindowKey);
    link.target = MODE_WINDOW_PREFIX + modeWindowKey;
    link.removeAttribute("rel");
  }
}

function bindSingleInstanceModeClicks(): void {
  document.addEventListener("click", (event) => {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.defaultPrevented || mouseEvent.button !== 0) return;
    const element = mouseEvent.target as Element | null;
    const link =
      element && typeof element.closest === "function"
        ? (element.closest("a[data-mode-single-instance='1']") as HTMLAnchorElement | null)
        : null;
    if (!link) return;
    mouseEvent.preventDefault();
    openModeInSingletonWindow(link);
  });

  document.addEventListener("auxclick", (event) => {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.defaultPrevented || mouseEvent.button !== 1) return;
    const element = mouseEvent.target as Element | null;
    const link =
      element && typeof element.closest === "function"
        ? (element.closest("a[data-mode-single-instance='1']") as HTMLAnchorElement | null)
        : null;
    if (!link) return;
    mouseEvent.preventDefault();
    openModeInSingletonWindow(link);
  });

  document.addEventListener("keydown", (event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.defaultPrevented || keyboardEvent.key !== "Enter") return;
    const element = keyboardEvent.target as Element | null;
    const link =
      element && typeof element.closest === "function"
        ? (element.closest("a[data-mode-single-instance='1']") as HTMLAnchorElement | null)
        : null;
    if (!link) return;
    keyboardEvent.preventDefault();
    openModeInSingletonWindow(link);
  });
}

export function bootstrapModesPage(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "modes");
  }
  ensureRelayModeEntry();
  applySingleInstanceModeTargets();
  bindSingleInstanceModeClicks();

  window.addEventListener("uilanguagechange", () => {
    const link = document.querySelector("a[data-mode-relay='5x5']");
    if (link) {
      link.textContent = resolveRelayLinkLabel();
    }
  });
}
