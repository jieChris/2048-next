import "../../js/theme_manager.js";
import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";

const NIGHT_BACKGROUND_STORAGE_KEY = "settings_night_background_enabled_v1";

function readNightBackgroundPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const storageLike = resolveStorageByName({
    windowLike: window as unknown as Record<string, unknown>,
    storageName: "localStorage"
  });
  return safeReadStorageItem({
    storageLike,
    key: NIGHT_BACKGROUND_STORAGE_KEY
  }) === "1";
}

function syncNightBackgroundAttribute(): void {
  if (typeof document === "undefined" || !document.documentElement) {
    return;
  }
  if (readNightBackgroundPreference()) {
    document.documentElement.setAttribute("data-night-background", "1");
    return;
  }
  document.documentElement.removeAttribute("data-night-background");
}

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

  syncNightBackgroundAttribute();
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

  window.addEventListener("storage", (event) => {
    if (event.key === NIGHT_BACKGROUND_STORAGE_KEY) {
      syncNightBackgroundAttribute();
    }
  });
}
