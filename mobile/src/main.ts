import { App } from "@capacitor/app";

import "./styles/app-shell.css";

import {
  createAppController,
  type AppController,
  type AppNetworkMode,
} from "./app/app-controller";
import { bootstrapGuestAppRuntime } from "./app/app-runtime";
import { renderAppTemplate } from "./app/templates";
import { AppDatabase } from "./data/app-database";
import { createTranslator, resolveSystemLocale } from "./i18n";
import { bindAndroidAppLifecycle } from "./platform/app-lifecycle";
import { createPlatformSecureStorage } from "./platform/secure-storage";
import {
  createPreviewPrivacyRecord,
  parsePreviewPrivacyRecord,
  PREVIEW_PRIVACY_STORAGE_KEY,
} from "./privacy";
import {
  resolveTheme,
  resolveThemePreference,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
} from "./theme";

function requireAppRoot(): HTMLDivElement {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) throw new Error("Missing #app mount point");
  return root;
}

function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The in-memory choice still applies when storage is unavailable.
  }
}

function resolveNetworkMode(value: string | null): AppNetworkMode {
  return value === "offline" || value === "online" ? value : "undecided";
}

function themeColor(theme: ResolvedTheme): string {
  return theme === "dark" ? "#0e2025" : "#f3ede1";
}

const appRoot = requireAppRoot();
const themePreference = resolveThemePreference(safeRead(THEME_STORAGE_KEY));
const darkMedia = window.matchMedia("(prefers-color-scheme: dark)");

function syncTheme(): void {
  const theme = resolveTheme(themePreference, darkMedia.matches);
  document.documentElement.dataset.theme = theme;
  document
    .querySelector<HTMLMetaElement>("[data-app-theme-color]")
    ?.setAttribute("content", themeColor(theme));
}

syncTheme();
darkMedia.addEventListener("change", syncTheme);

const locale = resolveSystemLocale(window.navigator.languages);
const t = createTranslator(locale);
const initialNetworkMode = resolveNetworkMode(
  parsePreviewPrivacyRecord(safeRead(PREVIEW_PRIVACY_STORAGE_KEY))?.choice ??
    null,
);
document.documentElement.lang = locale;
appRoot.innerHTML = renderAppTemplate(t);
appRoot.setAttribute("aria-busy", "true");

function showBootView(route: "privacy" | "home"): void {
  for (const view of appRoot.querySelectorAll<HTMLElement>("[data-app-view]")) {
    view.hidden = view.dataset.appView !== route;
  }
  const shell = appRoot.querySelector<HTMLElement>("[data-app-shell]");
  if (shell) {
    shell.dataset.networkMode = initialNetworkMode;
    shell.dataset.appRoute = route;
  }
}

showBootView(initialNetworkMode === "undecided" ? "privacy" : "home");

let controller: AppController | null = null;

function showBootstrapFailure(error: unknown): void {
  const status = appRoot.querySelector<HTMLElement>("[data-app-status]");
  if (!status) return;
  status.hidden = false;
  status.dataset.tone = "error";
  status.dataset.errorCode =
    error instanceof Error ? error.message.slice(0, 128) : "app_boot_failed";
  status.textContent = t("status.storageError");
}

async function start(): Promise<void> {
  try {
    const runtime = await bootstrapGuestAppRuntime({
      database: new AppDatabase(),
      secureStorage: createPlatformSecureStorage(),
    });
    controller = createAppController({
      root: appRoot,
      runtime,
      t,
      locale,
      networkMode: initialNetworkMode,
      onNetworkModeChange(mode) {
        safeWrite(
          PREVIEW_PRIVACY_STORAGE_KEY,
          JSON.stringify(createPreviewPrivacyRecord(mode, Date.now())),
        );
      },
    });
    appRoot.removeAttribute("aria-busy");

    await bindAndroidAppLifecycle({
      async onPause() {
        await controller?.pause();
      },
      onResume() {
        controller?.resume();
      },
      async onBackButton() {
        if (!(await controller?.handleBack())) await App.exitApp();
      },
      onError({ error }) {
        controller?.showFatal(error);
      },
    });
  } catch (error) {
    appRoot.removeAttribute("aria-busy");
    showBootstrapFailure(error);
  }
}

void start();
