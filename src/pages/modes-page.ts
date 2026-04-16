import "../../js/theme_manager.js";

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

export function bootstrapModesPage(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "modes");
  }
  ensureRelayModeEntry();

  window.addEventListener("uilanguagechange", () => {
    const link = document.querySelector("a[data-mode-relay='5x5']");
    if (link) {
      link.textContent = resolveRelayLinkLabel();
    }
  });
}
