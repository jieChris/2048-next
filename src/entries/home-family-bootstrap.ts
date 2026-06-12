import { createBootstrapPipeline, resolvePageDescriptor } from "../bootstrap/page-bootstrap";
import { registerEngineFacade, type EngineFacadeWindowLike } from "../bootstrap/engine-facade-host";
import { bootstrapRankedSessionForHomeFamilyPage } from "../bootstrap/ranked-session";
import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";
import { bindHomeUserDisplay } from "../bootstrap/home-user-display";
import { installAdminRescueClientServiceBoundary } from "../bootstrap/admin-rescue-client-service-boundary";
import { installTimerIntervalRuntime } from "../bootstrap/timer-interval-runtime";
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
const UI_STARTUP_CAPABILITIES = new Set<RuntimeCapability>([
  "settings-and-panel",
  "top-button-style",
  "index-tail",
  "i18n"
]);
const INDEX_STARTUP_BUNDLE_URL = "./js/home_standard_startup_bundle.js?v=20260609-rescue-sync1";
const INDEX_DEFERRED_BUNDLE_URL = "./js/home_standard_deferred_bundle.js?v=20260609-rescue-sync1";

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
  const uiStartupCapabilities = deferredCapabilities.filter((capability) =>
    UI_STARTUP_CAPABILITIES.has(capability)
  );
  const backgroundCapabilities = deferredCapabilities.filter(
    (capability) => !UI_STARTUP_CAPABILITIES.has(capability)
  );

  await loadLegacyScriptsSequentially(resolveHomeFamilyScriptsByCapabilities(startupCapabilities));
  if (uiStartupCapabilities.length > 0) {
    await loadLegacyScriptsSequentially(resolveHomeFamilyScriptsByCapabilities(uiStartupCapabilities));
  }
  if (backgroundCapabilities.length > 0) {
    void loadLegacyScriptsSequentially(resolveHomeFamilyScriptsByCapabilities(backgroundCapabilities)).catch(
      () => {}
    );
  }
}

function scheduleIndexDeferredRuntimeLoad(): void {
  if (typeof window === "undefined") return;

  const loadDeferredRuntime = () => {
    void loadLegacyScriptsSequentially([
      INDEX_DEFERRED_BUNDLE_URL,
      ...resolveHomeFamilyScriptsByCapabilities(["announcement", "leaderboard"])
    ]).catch(() => {});
  };

  const requestIdleCallback = (
    window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
    }
  ).requestIdleCallback;

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(loadDeferredRuntime, { timeout: 1_000 });
    return;
  }

  window.setTimeout(loadDeferredRuntime, 0);
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
  await bootstrapRankedSessionForHomeFamilyPage(pageId).catch(() => {});
  registerEngineFacade(
    typeof window === "undefined" ? undefined : (window as unknown as EngineFacadeWindowLike)
  );
  installAdminRescueClientServiceBoundary();
  installTimerIntervalRuntime();
  if (pageId === "index") {
    await loadLegacyScriptsSequentially([INDEX_STARTUP_BUNDLE_URL]);
    scheduleIndexDeferredRuntimeLoad();
    return;
  }
  await loadHomeFamilyRuntimeScripts(manifest.capabilities);
}
