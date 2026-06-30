import { createBootstrapPipeline, resolvePageDescriptor } from "../bootstrap/page-bootstrap";
import { runBetaAccessGate, shouldRunBetaAccessGate } from "../bootstrap/access-gate";
import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";
import { bindHomeUserDisplay } from "../bootstrap/home-user-display";
import { loadLegacyScriptsSequentially } from "./legacy-loader";
import { getPageManifest, type RuntimeCapability } from "./runtime-manifest";
import { resolveHomeFamilyScriptsByCapabilities } from "./home-family-shared";

const NIGHT_BACKGROUND_STORAGE_KEY = "settings_night_background_enabled_v1";
const LEGACY_REPLAY_HELPERS_RUNTIME_URL = "./js/core_game_manager_replay_helpers_runtime.js?v=20260617-replay-compat";
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
const INDEX_STARTUP_BUNDLE_URL = __HOME_STANDARD_STARTUP_BUNDLE_URL__;
const INDEX_DEFERRED_BUNDLE_URL = __HOME_STANDARD_DEFERRED_BUNDLE_URL__;

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

function scheduleRankedSessionBootstrap(pageId: string): void {
  void import("../bootstrap/ranked-session")
    .then(({ bootstrapRankedSessionForHomeFamilyPage }) => {
      void bootstrapRankedSessionForHomeFamilyPage(pageId).catch(() => {});
    })
    .catch(() => {});
}

async function loadHomeFamilyRuntimeInstallers(): Promise<void> {
  const runtimeInstallers = await import("./home-family-runtime-installers");
  runtimeInstallers.installHomeFamilyRuntimeGlobals();
}

async function loadHomeFamilyRuntimeScripts(capabilities: readonly RuntimeCapability[]): Promise<void> {
  await loadLegacyScriptsSequentially([LEGACY_REPLAY_HELPERS_RUNTIME_URL]);
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
  if (shouldRunBetaAccessGate(pageId)) {
    const access = await runBetaAccessGate(pageId);
    if (!access.allowed) return;
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    bindHomeUserDisplay({
      documentLike: document,
      pageId,
      windowLike: window,
      storageLike: window.localStorage
    });
  }
  await runBootstrapPipeline(pageId);
  scheduleRankedSessionBootstrap(pageId);
  await loadHomeFamilyRuntimeInstallers();
  if (pageId === "index") {
    await loadLegacyScriptsSequentially([LEGACY_REPLAY_HELPERS_RUNTIME_URL]);
    await loadLegacyScriptsSequentially([INDEX_STARTUP_BUNDLE_URL]);
    scheduleIndexDeferredRuntimeLoad();
    return;
  }
  await loadHomeFamilyRuntimeScripts(manifest.capabilities);
}
