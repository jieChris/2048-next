import "./styles/app-shell.css";

import { createTranslator, resolveSystemLocale } from "./i18n";
import {
  createPreviewPrivacyRecord,
  parsePreviewPrivacyRecord,
  PREVIEW_PRIVACY_STORAGE_KEY
} from "./privacy";
import {
  resolveTheme,
  resolveThemePreference,
  THEME_STORAGE_KEY,
  type ResolvedTheme
} from "./theme";

type NetworkMode = "undecided" | "offline" | "online";

function requireAppRoot(): HTMLDivElement {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) throw new Error("Missing #app mount point");
  return root;
}

const appRoot = requireAppRoot();

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

function resolveNetworkMode(value: string | null): NetworkMode {
  return value === "offline" || value === "online" ? value : "undecided";
}

function themeColor(theme: ResolvedTheme): string {
  return theme === "dark" ? "#0e2025" : "#f3ede1";
}

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
let networkMode = resolveNetworkMode(
  parsePreviewPrivacyRecord(safeRead(PREVIEW_PRIVACY_STORAGE_KEY))?.choice ?? null
);

document.documentElement.lang = locale;

function brandBoard(): string {
  return `
    <div class="brand-board" aria-hidden="true">
      <span>2</span><span>0</span><span>4</span><span>8</span>
    </div>
  `;
}

function renderPrivacy(): string {
  return `
    <section class="app-view privacy-view" data-app-view="privacy" aria-labelledby="privacy-title">
      <div class="brand-lockup">
        ${brandBoard()}
        <div>
          <p class="eyebrow">${t("privacy.eyebrow")}</p>
          <h1 id="privacy-title">${t("privacy.title")}</h1>
        </div>
      </div>
      <p class="preview-badge" role="note">${t("privacy.previewBadge")}</p>
      <p class="privacy-copy">${t("privacy.body")}</p>
      <aside class="privacy-notice">
        <strong>${t("privacy.noticeTitle")}</strong>
        <p>${t("privacy.noticeBody")}</p>
      </aside>
      <div class="privacy-actions">
        <button class="action-button action-button--primary" type="button" data-consent="online">
          ${t("privacy.onlineAction")}
        </button>
        <button class="action-button action-button--secondary" type="button" data-consent="offline">
          ${t("privacy.offlineAction")}
        </button>
      </div>
    </section>
  `;
}

function renderHome(): string {
  const networkLabel =
    networkMode === "offline" ? t("home.offlineState") : t("home.onlineState");
  return `
    <section class="app-view home-view" data-app-view="home" aria-labelledby="home-title">
      <main class="home-main">
        <header class="home-header">
          <div>
            <p class="eyebrow">${t("home.eyebrow")}</p>
            <h1 id="home-title">${t("home.title")}</h1>
          </div>
          <span class="network-chip">${networkLabel}</span>
        </header>
        <section class="empty-home" aria-labelledby="empty-home-title">
          <div class="empty-board" aria-hidden="true">
            <span>2</span><span>4</span><span>8</span><span>16</span>
          </div>
          <p class="eyebrow">${t("home.emptyLabel")}</p>
          <h2 id="empty-home-title">${t("home.emptyTitle")}</h2>
          <p>${t("home.emptyBody")}</p>
        </section>
      </main>
      <nav class="bottom-nav" data-app-bottom-nav aria-label="${t("app.name")}">
        <button type="button" aria-current="page">${t("nav.home")}</button>
        <button type="button" disabled>${t("nav.modes")}</button>
        <button type="button" disabled>${t("nav.records")}</button>
        <button type="button" disabled>${t("nav.me")}</button>
      </nav>
    </section>
  `;
}

function render(): void {
  appRoot.innerHTML = `
    <div class="app-shell" data-app-shell data-network-mode="${networkMode}">
      ${networkMode === "undecided" ? renderPrivacy() : renderHome()}
    </div>
  `;

  appRoot.querySelectorAll<HTMLButtonElement>("[data-consent]").forEach((button) => {
    button.addEventListener("click", () => {
      const selection = button.dataset.consent;
      if (selection !== "offline" && selection !== "online") return;
      networkMode = selection;
      safeWrite(
        PREVIEW_PRIVACY_STORAGE_KEY,
        JSON.stringify(createPreviewPrivacyRecord(selection, Date.now()))
      );
      render();
    });
  });
}

render();
