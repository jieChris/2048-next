import { createBootstrapPipeline, resolvePageDescriptor } from "../bootstrap/page-bootstrap";
import { registerEngineFacade, type EngineFacadeWindowLike } from "../bootstrap/engine-facade-host";
import { bootstrapRankedSessionForHomeFamilyPage } from "../bootstrap/ranked-session";
import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";
import { bindHomeUserDisplay } from "../bootstrap/home-user-display";
import { loadLegacyScriptsSequentially } from "./legacy-loader";
import { getPageManifest, type RuntimeCapability } from "./runtime-manifest";
import { resolveHomeFamilyScriptsByCapabilities } from "./home-family-shared";

const NIGHT_BACKGROUND_STORAGE_KEY = "settings_night_background_enabled_v1";
const GAME_STARTUP_CAPABILITIES = new Set<RuntimeCapability>([
  "core",
  "capped-core",
  "standard-startup",
  "capped-startup"
]);

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

function bindNightBackgroundSync(): void {
  if (typeof window === "undefined") {
    return;
  }
  const typedWindow = window as Window & { __nightBackgroundSyncBound?: boolean };
  if (typedWindow.__nightBackgroundSyncBound) {
    syncNightBackgroundAttribute();
    return;
  }
  typedWindow.__nightBackgroundSyncBound = true;
  syncNightBackgroundAttribute();
  window.addEventListener("storage", (event) => {
    if (!event || !event.key || event.key === NIGHT_BACKGROUND_STORAGE_KEY) {
      syncNightBackgroundAttribute();
    }
  });
}

async function runBootstrapPipeline(pageId: string): Promise<void> {
  const descriptor = resolvePageDescriptor(pageId);
  const hooks = createBootstrapPipeline(descriptor);
  for (const hook of hooks) {
    await hook.run();
  }
}

async function loadHomeFamilyRuntimeScripts(capabilities: readonly RuntimeCapability[]): Promise<void> {
  const startupCapabilities = capabilities.filter((capability) =>
    GAME_STARTUP_CAPABILITIES.has(capability)
  );
  if (startupCapabilities.length === 0 || startupCapabilities.length === capabilities.length) {
    await loadLegacyScriptsSequentially(resolveHomeFamilyScriptsByCapabilities(capabilities));
    return;
  }

  const deferredCapabilities = capabilities.filter(
    (capability) => !GAME_STARTUP_CAPABILITIES.has(capability)
  );
  await loadLegacyScriptsSequentially(resolveHomeFamilyScriptsByCapabilities(startupCapabilities));
  void loadLegacyScriptsSequentially(resolveHomeFamilyScriptsByCapabilities(deferredCapabilities)).catch(
    () => {}
  );
}

export async function bootstrapHomeFamilyPage(pageId: string): Promise<void> {
  const manifest = getPageManifest(pageId);
  if (!manifest) {
    throw new Error(`Unknown page manifest: ${pageId}`);
  }

  bindNightBackgroundSync();
  if (pageId === "index" && typeof window !== "undefined" && typeof document !== "undefined") {
    bindHomeUserDisplay({
      documentLike: document,
      windowLike: window,
      storageLike: window.localStorage
    });
  }
  await runBootstrapPipeline(pageId);
  void bootstrapRankedSessionForHomeFamilyPage(pageId).catch(() => {});
  registerEngineFacade(
    typeof window === "undefined" ? undefined : (window as unknown as EngineFacadeWindowLike)
  );
  await loadHomeFamilyRuntimeScripts(manifest.capabilities);
}
