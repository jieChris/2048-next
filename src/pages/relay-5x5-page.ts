import "../../js/api_shared_utils.js";
import "../../js/relay_5x5_page.js";
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
  return (
    safeReadStorageItem({
      storageLike,
      key: NIGHT_BACKGROUND_STORAGE_KEY
    }) === "1"
  );
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

export function bootstrapRelay5x5Page(): void {
  if (typeof document === "undefined") {
    return;
  }
  syncNightBackgroundAttribute();
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "relay-5x5");
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (!event || !event.key || event.key === NIGHT_BACKGROUND_STORAGE_KEY) {
        syncNightBackgroundAttribute();
      }
    });
  }
}
