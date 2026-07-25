import { App } from "@capacitor/app";

import "./styles/app-shell.css";

import {
  createAppController,
  type AppController,
  type AppNetworkMode,
} from "./app/app-controller";
import { MOBILE_BUILD_FLAGS } from "./app/build-flags";
import {
  bootstrapGuestAppRuntime,
  createHttpRankedSessionGateway,
  type GuestAppRuntime,
} from "./app/app-runtime";
import { renderAppTemplate } from "./app/templates";
import type { MobileAuthService } from "./auth/auth-service";
import type { AccountSessionV1 } from "./auth/account-session";
import {
  clearAccountDeletionReceipt,
  loadAccountDeletionReceipt,
  type AccountDeletionReceipt,
} from "./auth/account-deletion-receipt";
import { AppDatabase } from "./data/app-database";
import { ClientDiagnostics } from "./diagnostics/client-diagnostics";
import { createTranslator, resolveSystemLocale } from "./i18n";
import { bindAndroidAppLifecycle } from "./platform/app-lifecycle";
import { saveDiagnosticExport } from "./platform/diagnostic-export";
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

const AUTO_DIAGNOSTICS_STORAGE_KEY =
  "2048-next.app.auto-diagnostics-v1";

async function diagnosticPlatformInfo() {
  const info = await App.getInfo().catch(() => null);
  const userAgent = window.navigator.userAgent;
  return {
    appVersion: info?.version || "unknown",
    buildNumber: info?.build || "unknown",
    androidVersion: /Android\s+([^;)]+)/u.exec(userAgent)?.[1] ?? null,
    webViewVersion: /(?:Chrome|CriOS)\/([0-9.]+)/u.exec(userAgent)?.[1] ?? null,
  };
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
let currentNetworkMode = initialNetworkMode;
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
    const secureStorage = createPlatformSecureStorage();
    const database = new AppDatabase();
    let diagnosticsEnabled = safeRead(AUTO_DIAGNOSTICS_STORAGE_KEY) !== "false";
    let deletionReceipt: AccountDeletionReceipt | null = null;
    try {
      deletionReceipt = loadAccountDeletionReceipt(window.localStorage);
    } catch {
      deletionReceipt = null;
    }
    let activeRuntime: GuestAppRuntime | null = null;
    let diagnosticsAccountSession: AccountSessionV1 | null = null;
    const diagnostics = new ClientDiagnostics({
      database,
      apiBase: MOBILE_BUILD_FLAGS.apiBase,
      currentOwnerKey: () =>
        diagnosticsAccountSession
          ? `user:${diagnosticsAccountSession.user.id}`
          : "guest",
      visibleOwnerKeys: () =>
        diagnosticsAccountSession
          ? ["guest", `user:${diagnosticsAccountSession.user.id}`]
          : ["guest"],
      networkAllowed: () => currentNetworkMode === "online",
      autoEnabled: () => diagnosticsEnabled,
      isOnline: () => window.navigator.onLine,
      platformInfo: diagnosticPlatformInfo,
    });
    let authServicePromise: Promise<MobileAuthService> | null = null;
    const getAuthService = (): Promise<MobileAuthService> => {
      if (authServicePromise) return authServicePromise;
      authServicePromise = import("./auth/auth-service").then(
        ({ createMobileAuthService }) => {
          const privacy = parsePreviewPrivacyRecord(
            safeRead(PREVIEW_PRIVACY_STORAGE_KEY),
          );
          return createMobileAuthService({
            privacy:
              privacy ?? createPreviewPrivacyRecord("offline", Date.now()),
            secureStorage,
            timeoutMs: 8_000,
            onAuthenticatedSession(_session, _reason, notice) {
              diagnosticsAccountSession = _session;
              if (notice.accountDeletionCancelled) {
                try {
                  clearAccountDeletionReceipt(window.localStorage);
                } catch {
                  // The server cancellation remains authoritative.
                }
                window.setTimeout(
                  () => controller?.notifyAccountDeletionCancelled(),
                  0,
                );
              }
              void activeRuntime
                ?.flushAccountRecordOutbox()
                .catch(() => undefined);
              void diagnostics.flush().catch(() => undefined);
            },
          });
        },
      );
      void authServicePromise.catch(() => {
        authServicePromise = null;
      });
      return authServicePromise;
    };
    const runtime = await bootstrapGuestAppRuntime({
      database,
      secureStorage,
      recordSync: {
        enabled: () => currentNetworkMode === "online",
        getAuthService,
      },
      forceAccountClearAtStartup: deletionReceipt !== null,
    });
    activeRuntime = runtime;
    diagnosticsAccountSession = runtime.accountSession;
    if (
      deletionReceipt &&
      Date.parse(deletionReceipt.dueAt) <= Date.now() &&
      runtime.accountSession === null
    ) {
      clearAccountDeletionReceipt(window.localStorage);
    }
    controller = createAppController({
      root: appRoot,
      runtime,
      t,
      locale,
      networkMode: initialNetworkMode,
      initialAccountSession: runtime.accountSession,
      authServiceFactory: getAuthService,
      async enterAuthenticatedMode(modeKey, session) {
        const online = currentNetworkMode === "online";
        const opened = await runtime.enterAuthenticatedMode(modeKey, session, {
          online,
          ...(online
            ? {
                gateway: createHttpRankedSessionGateway({
                  apiBase: MOBILE_BUILD_FLAGS.apiBase,
                  timeoutMs: 8_000,
                }),
                refreshSession: async () => (await getAuthService()).refresh(),
              }
            : {}),
        });
        return opened.status === "ready"
          ? { status: "entered" }
          : { status: "unavailable" };
      },
      onNetworkModeChange(mode) {
        currentNetworkMode = mode;
        safeWrite(
          PREVIEW_PRIVACY_STORAGE_KEY,
          JSON.stringify(createPreviewPrivacyRecord(mode, Date.now())),
        );
        if (mode === "online") {
          void runtime.flushAccountRecordOutbox().catch(() => undefined);
          void diagnostics.flush().catch(() => undefined);
        }
      },
      diagnosticsEnabled,
      onDiagnosticsEnabledChange(enabled) {
        diagnosticsEnabled = enabled;
        safeWrite(AUTO_DIAGNOSTICS_STORAGE_KEY, String(enabled));
        if (enabled) void diagnostics.flush().catch(() => undefined);
      },
      async onExportDiagnostics() {
        await saveDiagnosticExport(await diagnostics.buildExport());
      },
      onAccountSessionChange(session) {
        diagnosticsAccountSession = session;
      },
    });
    appRoot.removeAttribute("aria-busy");

    const flushAccountRecords = (): void => {
      if (currentNetworkMode !== "online") return;
      void runtime.flushAccountRecordOutbox().catch(() => undefined);
      void diagnostics.flush().catch(() => undefined);
    };
    window.addEventListener("online", flushAccountRecords);
    flushAccountRecords();

    await bindAndroidAppLifecycle({
      async onPause() {
        await controller?.pause();
      },
      onResume() {
        controller?.resume();
        flushAccountRecords();
      },
      async onBackButton() {
        if (!(await controller?.handleBack())) await App.exitApp();
      },
      onError({ error }) {
        void diagnostics
          .record(error, "lifecycle_error", "critical")
          .catch(() => undefined);
        controller?.showFatal(error);
      },
    });

    window.addEventListener("error", (event) => {
      void diagnostics
        .record(event.error ?? event.message, "uncaught_error", "critical")
        .catch(() => undefined);
    });
    window.addEventListener("unhandledrejection", (event) => {
      void diagnostics
        .record(event.reason, "unhandled_rejection", "critical")
        .catch(() => undefined);
    });
  } catch (error) {
    appRoot.removeAttribute("aria-busy");
    showBootstrapFailure(error);
  }
}

void start();
