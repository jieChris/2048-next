import { installAccountSettingsLegacyRuntime } from "../bootstrap/account-settings-legacy-runtime";
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

export function bootstrapAccountSettingsPage(): void {
  if (typeof document === "undefined") {
    return;
  }

  installAccountSettingsLegacyRuntime();
  syncNightBackgroundAttribute();
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "account-settings");
  }

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (!event || !event.key || event.key === NIGHT_BACKGROUND_STORAGE_KEY) {
        syncNightBackgroundAttribute();
      }
    });
  }
}
