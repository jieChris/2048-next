import { achievementIconMarkupFor } from "../services/achievement-icons";
import {
  buildApiBaseCandidates,
  createJsonApiClient,
  readAuthToken,
  type FetchLike
} from "../services/api-client";
import {
  createBrowserStorageAccess,
  readStorageValue,
  writeStorageValue
} from "../storage/browser-storage";

export interface BreakoutEasterEggElementLike {
  className?: string;
  classList?: {
    add?: (value: string) => unknown;
    contains?: (value: string) => boolean;
    remove?: (value: string) => unknown;
  } | null;
  contentWindow?: {
    postMessage?: (message: unknown, targetOrigin: string) => unknown;
  } | null;
  __breakoutEasterEggRestore?: (() => unknown) | null;
  parentNode?: BreakoutEasterEggElementLike | null;
  style?: Record<string, string> | null;
  innerHTML?: string;
  textContent?: string | null;
  addEventListener?: (type: string, listener: (event?: unknown) => void) => unknown;
  removeEventListener?: (type: string, listener: (event?: unknown) => void) => unknown;
  appendChild?: (node: BreakoutEasterEggElementLike) => unknown;
  removeChild?: (node: BreakoutEasterEggElementLike) => unknown;
  querySelector?: (selector: string) => BreakoutEasterEggElementLike | null;
  setAttribute?: (name: string, value: string) => unknown;
  getAttribute?: (name: string) => string | null;
  focus?: () => unknown;
}

export interface BreakoutEasterEggDocumentLike {
  body?: BreakoutEasterEggElementLike | null;
  head?: BreakoutEasterEggElementLike | null;
  documentElement?: BreakoutEasterEggElementLike | null;
  createElement?: (tagName: string) => BreakoutEasterEggElementLike;
  querySelector?: (selector: string) => BreakoutEasterEggElementLike | null;
}

export interface BreakoutEasterEggKeyboardEventLike {
  key?: string;
  preventDefault?: () => unknown;
  stopImmediatePropagation?: () => unknown;
  stopPropagation?: () => unknown;
}

export interface BreakoutEasterEggMessageEventLike {
  data?: unknown;
}

export interface BreakoutEasterEggWindowLike {
  AchievementUnlockToastRuntime?: {
    showAchievementUnlockToast?: (item: unknown) => unknown;
  } | null;
  CoreBreakoutEasterEggRuntime?: BreakoutEasterEggRuntime;
  CoreFlyingClickEffectRuntime?: {
    triggerFlyingClickEffect?: (options?: unknown) => unknown;
  } | null;
  UII18N?: { getLanguage?: () => string } | null;
  addEventListener?: (type: string, listener: (event?: unknown) => void, options?: unknown) => unknown;
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<unknown>;
  localStorage?: {
    getItem?: (key: string) => string | null;
    setItem?: (key: string, value: string) => unknown;
    removeItem?: (key: string) => unknown;
  } | null;
  location?: {
    hostname?: string;
    origin?: string;
    search?: string;
  } | null;
  removeEventListener?: (type: string, listener: (event?: unknown) => void, options?: unknown) => unknown;
  setTimeout?: (handler: () => void, timeout?: number) => number;
}

export interface BreakoutEasterEggOptions {
  documentLike?: BreakoutEasterEggDocumentLike | null | undefined;
  gameUrl?: string | null | undefined;
  enableClickEffect?: boolean | null | undefined;
  logoAlt?: string | null | undefined;
  logoSrc?: string | null | undefined;
  resetTimeoutMs?: number | null | undefined;
  triggerCount?: number | null | undefined;
  windowLike?: BreakoutEasterEggWindowLike | null | undefined;
}

export interface BreakoutEasterEggBinding {
  destroy: () => void;
}

export interface BreakoutEasterEggRuntime {
  bindBreakoutEasterEgg: typeof bindBreakoutEasterEgg;
  openBreakoutEasterEgg: typeof openBreakoutEasterEgg;
}

export interface BreakoutEasterEggRuntimeInstallOptions {
  documentLike?: BreakoutEasterEggDocumentLike | null | undefined;
  windowLike?: BreakoutEasterEggWindowLike | null | undefined;
}

const DEFAULT_GAME_URL = "./easter-eggs/breakout/index.html";
const DEFAULT_LOGO_ALT = "2048";
const DEFAULT_LOGO_SRC = "./favicon.ico";
const DEFAULT_ENABLE_CLICK_EFFECT = false;
const DEFAULT_TRIGGER_COUNT = 19;
const DEFAULT_RESET_TIMEOUT_MS = 1500;
const BREAKOUT_DISCOVERY_EVENT_ID = "breakout_easter_egg_discovered";
const BREAKOUT_DISCOVERY_ACHIEVEMENT_ID = "easter_egg_breakout_discovered";
const BREAKOUT_DISCOVERY_TOAST_SEEN_KEY = "breakout_easter_egg_discovery_toast_seen_v1";
const UI_LANGUAGE_KEY = "ui_language_v1";
const BREAKOUT_DISCOVERY_COPY = {
  zh: {
    title: "隐藏成就",
    name: "发现彩蛋",
    description: "打开排行榜里的弹球彩蛋。"
  },
  en: {
    title: "Secret Found",
    name: "Easter Egg Found",
    description: "Opened the hidden Breakout in the leaderboard."
  }
} as const;
const OVERLAY_SELECTOR = '[data-breakout-easter-egg-overlay="1"]';
const OPEN_CLASS_NAME = "breakout-easter-egg-open";
const TRIGGER_PENDING_CLASS_NAME = "breakout-easter-egg-trigger-pending";
const MINIMIZED_CLASS_NAME = "is-minimized";
const MESSAGE_TYPE = "2048-next-breakout-easter-egg";
const KEYDOWN_CAPTURE_OPTIONS = true;
const TIMER_SELF_RANK_SELECTOR = ".timer-leaderboard-row.is-self .timer-leaderboard-rank-tile";
const TIMER_SELF_RANK_BINDING_KEY = "__timerLeaderboardSelfRankBreakoutEasterEggBinding";

function resolveDocumentLike(
  options: BreakoutEasterEggOptions
): BreakoutEasterEggDocumentLike | null {
  if (options.documentLike) return options.documentLike;
  return typeof document === "undefined" ? null : (document as unknown as BreakoutEasterEggDocumentLike);
}

function resolveWindowLike(options: BreakoutEasterEggOptions): BreakoutEasterEggWindowLike | null {
  if (options.windowLike) return options.windowLike;
  return typeof window === "undefined" ? null : (window as unknown as BreakoutEasterEggWindowLike);
}

function resolveText(value: string | null | undefined, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

function resolveCurrentFaviconHref(
  documentLike: BreakoutEasterEggDocumentLike | null
): string | null {
  if (!documentLike || typeof documentLike.querySelector !== "function") return null;
  try {
    const icon = documentLike.querySelector('link[rel~="icon"][href]');
    const href = icon && typeof icon.getAttribute === "function" ? icon.getAttribute("href") : null;
    return typeof href === "string" && href ? href : null;
  } catch (_err) {
    return null;
  }
}

function resolveLogoSrc(options: BreakoutEasterEggOptions): string {
  const explicitLogoSrc = resolveText(options.logoSrc, "");
  if (explicitLogoSrc) return explicitLogoSrc;
  return resolveCurrentFaviconHref(resolveDocumentLike(options)) || DEFAULT_LOGO_SRC;
}

function readLocalStorageValue(
  windowLike: BreakoutEasterEggWindowLike | null,
  key: string
): string {
  return readStorageValue(resolveLocalStorage(windowLike), key) || "";
}

function writeLocalStorageValue(
  windowLike: BreakoutEasterEggWindowLike | null,
  key: string,
  value: string
): void {
  writeStorageValue(resolveLocalStorage(windowLike), key, value);
}

function resolveLocalStorage(windowLike: BreakoutEasterEggWindowLike | null): Storage | null {
  return createBrowserStorageAccess({
    windowLike: windowLike as unknown as Record<string, unknown>
  }).local();
}

function normalizeUiLang(value: unknown): "zh" | "en" | "" {
  const lang = String(value || "").trim().toLowerCase();
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("zh")) return "zh";
  return "";
}

function resolveBreakoutDiscoveryLang(
  windowLike: BreakoutEasterEggWindowLike | null,
  documentLike: BreakoutEasterEggDocumentLike | null
): "zh" | "en" {
  try {
    const lang = normalizeUiLang(windowLike?.UII18N?.getLanguage?.());
    if (lang) return lang;
  } catch (_err) {}
  const stored = normalizeUiLang(readLocalStorageValue(windowLike, UI_LANGUAGE_KEY));
  if (stored) return stored;
  return normalizeUiLang(documentLike?.documentElement?.getAttribute?.("lang")) || "zh";
}

function breakoutDiscoveryToastIconMarkup(lang: "zh" | "en"): string {
  const icon = achievementIconMarkupFor({
    id: BREAKOUT_DISCOVERY_ACHIEVEMENT_ID,
    name: BREAKOUT_DISCOVERY_COPY[lang].name,
    series_id: "community-easter-egg"
  });
  return icon
    ? icon.replace("<svg ", '<svg style="display:block;width:96px;height:96px;" ')
    : "2048?";
}

function breakoutDiscoveryAchievementPayload(): Record<string, unknown> {
  return {
    id: BREAKOUT_DISCOVERY_ACHIEVEMENT_ID,
    name: BREAKOUT_DISCOVERY_COPY.zh.name,
    description: BREAKOUT_DISCOVERY_COPY.zh.description,
    name_i18n: {
      "zh-CN": BREAKOUT_DISCOVERY_COPY.zh.name,
      en: BREAKOUT_DISCOVERY_COPY.en.name
    },
    description_i18n: {
      "zh-CN": BREAKOUT_DISCOVERY_COPY.zh.description,
      en: BREAKOUT_DISCOVERY_COPY.en.description
    },
    rules: [{ type: "achievement_event", params: { event_id: BREAKOUT_DISCOVERY_EVENT_ID } }],
    series_id: "community-easter-egg"
  };
}

function showBreakoutDiscoveryToast(
  documentLike: BreakoutEasterEggDocumentLike | null,
  windowLike: BreakoutEasterEggWindowLike | null
): void {
  if (!documentLike?.body || typeof documentLike.createElement !== "function") return;
  const runtime = windowLike?.AchievementUnlockToastRuntime;
  if (typeof runtime?.showAchievementUnlockToast === "function") {
    runtime.showAchievementUnlockToast(breakoutDiscoveryAchievementPayload());
    return;
  }
  const lang = resolveBreakoutDiscoveryLang(windowLike, documentLike);
  const toastCopy = BREAKOUT_DISCOVERY_COPY[lang];
  let host = documentLike.querySelector?.("#breakout-achievement-toast-host") || null;
  if (!host) {
    host = documentLike.createElement("div");
    setAttribute(host, "id", "breakout-achievement-toast-host");
    host.className = "achievements-unlock-toast-host unlock-toast-host";
    if (host.style) {
      host.style.position = "fixed";
      host.style.inset = "112px 0 auto 0";
      host.style.zIndex = "10060";
      host.style.pointerEvents = "none";
    }
    appendChild(documentLike.body, host);
  }
  host.innerHTML =
    '<article class="unlock-toast unlock-toast--codepen unlock-toast--codepen-reward unlock-toast--easter-egg" role="status" aria-live="polite">' +
      '<div class="unlock-toast-card">' +
        '<span class="unlock-badge achievements-unlock-badge" style="background:transparent;box-shadow:none;">' +
          '<span class="achievement-toast-icon-box">' + breakoutDiscoveryToastIconMarkup(lang) + "</span>" +
        "</span>" +
        '<div class="unlock-toast-content">' +
          '<p class="unlock-toast-title">' + toastCopy.title + "</p>" +
          '<h2 class="unlock-toast-name">' + toastCopy.name + "</h2>" +
          '<p class="unlock-toast-desc">' + toastCopy.description + "</p>" +
        "</div>" +
      "</div>" +
    "</article>";
  setTimeout(() => {
    if (host) host.innerHTML = "";
  }, 3600);
}

function isSuccessPayload(value: unknown): boolean {
  return !!value && typeof value === "object" && (value as { success?: unknown }).success === true;
}

function submitBreakoutDiscovery(
  windowLike: BreakoutEasterEggWindowLike | null,
  documentLike: BreakoutEasterEggDocumentLike | null
): void {
  const storageLike = resolveLocalStorage(windowLike);
  const token = readAuthToken({ storageLike });
  if (!token) return;
  const fetchLike = typeof windowLike?.fetch === "function"
    ? (windowLike.fetch.bind(windowLike) as FetchLike)
    : undefined;
  const client = createJsonApiClient({
    bases: buildApiBaseCandidates({ locationLike: windowLike?.location }),
    fetchLike,
    token
  });
  try {
    void client.request("/user/me/achievement-events", {
      method: "POST",
      body: JSON.stringify({ event_id: BREAKOUT_DISCOVERY_EVENT_ID })
    })
      .then((payload) => {
        if (!isSuccessPayload(payload)) return;
        const newlyGranted = (payload as { newly_granted?: unknown }).newly_granted;
        if (newlyGranted === false) return;
        writeLocalStorageValue(windowLike, BREAKOUT_DISCOVERY_TOAST_SEEN_KEY, "1");
        showBreakoutDiscoveryToast(documentLike, windowLike);
      })
      .catch(() => undefined);
  } catch (_err) {}
}

function resolvePositiveInteger(value: number | null | undefined, fallback: number): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function addClass(node: BreakoutEasterEggElementLike | null | undefined, className: string): void {
  if (!node || !className) return;
  try {
    if (node.classList && typeof node.classList.add === "function") {
      node.classList.add(className);
      return;
    }
  } catch (_err) {}
  const current = typeof node.className === "string" ? node.className.trim() : "";
  const padded = " " + current + " ";
  if (padded.indexOf(" " + className + " ") >= 0) return;
  node.className = current ? current + " " + className : className;
}

function removeClass(node: BreakoutEasterEggElementLike | null | undefined, className: string): void {
  if (!node || !className) return;
  try {
    if (node.classList && typeof node.classList.remove === "function") {
      node.classList.remove(className);
      return;
    }
  } catch (_err) {}
  if (typeof node.className !== "string") return;
  node.className = node.className
    .split(/\s+/)
    .filter((entry) => entry && entry !== className)
    .join(" ");
}

function hasClass(node: BreakoutEasterEggElementLike | null | undefined, className: string): boolean {
  if (!node || !className) return false;
  try {
    if (node.classList && typeof node.classList.contains === "function") {
      return !!node.classList.contains(className);
    }
  } catch (_err) {}
  if (typeof node.className !== "string") return false;
  return (" " + node.className.trim() + " ").indexOf(" " + className + " ") >= 0;
}

function setAttribute(
  node: BreakoutEasterEggElementLike | null | undefined,
  name: string,
  value: string
): void {
  if (!node || typeof node.setAttribute !== "function") return;
  try {
    node.setAttribute(name, value);
  } catch (_err) {}
}

function appendChild(
  parent: BreakoutEasterEggElementLike | null | undefined,
  child: BreakoutEasterEggElementLike
): boolean {
  if (!parent || typeof parent.appendChild !== "function") return false;
  try {
    parent.appendChild(child);
    return true;
  } catch (_err) {
    return false;
  }
}

function removeNode(node: BreakoutEasterEggElementLike | null | undefined): void {
  const parent = node && node.parentNode;
  if (!parent || typeof parent.removeChild !== "function" || !node) return;
  try {
    parent.removeChild(node);
  } catch (_err) {}
}

function queryExistingOverlay(
  documentLike: BreakoutEasterEggDocumentLike
): BreakoutEasterEggElementLike | null {
  if (typeof documentLike.querySelector === "function") {
    try {
      const found = documentLike.querySelector(OVERLAY_SELECTOR);
      if (found) return found;
    } catch (_err) {}
  }
  if (documentLike.body && typeof documentLike.body.querySelector === "function") {
    try {
      return documentLike.body.querySelector(OVERLAY_SELECTOR);
    } catch (_err) {}
  }
  return null;
}

function stopParentPageKeyHandling(event: BreakoutEasterEggKeyboardEventLike): void {
  if (event && event.key !== "Escape" && typeof event.preventDefault === "function") {
    event.preventDefault();
  }
  if (event && typeof event.stopImmediatePropagation === "function") {
    event.stopImmediatePropagation();
    return;
  }
  if (event && typeof event.stopPropagation === "function") {
    event.stopPropagation();
  }
}

function isBreakoutMessage(rawEvent: unknown): rawEvent is BreakoutEasterEggMessageEventLike {
  const event = (rawEvent || {}) as BreakoutEasterEggMessageEventLike;
  const data = event.data as { type?: unknown; action?: unknown } | null | undefined;
  return !!data && data.type === MESSAGE_TYPE;
}

function resolveBreakoutMessageAction(rawEvent: unknown): string {
  if (!isBreakoutMessage(rawEvent)) return "";
  const data = rawEvent.data as { action?: unknown };
  return typeof data.action === "string" ? data.action : "";
}

function postFrameAction(
  frame: BreakoutEasterEggElementLike | null | undefined,
  action: string
): void {
  if (!frame || !frame.contentWindow || typeof frame.contentWindow.postMessage !== "function") {
    return;
  }
  try {
    frame.contentWindow.postMessage({ type: MESSAGE_TYPE, action }, "*");
  } catch (_err) {}
}

function lockParentPage(
  documentLike: BreakoutEasterEggDocumentLike,
  overlay: BreakoutEasterEggElementLike
): void {
  removeClass(overlay, MINIMIZED_CLASS_NAME);
  addClass(documentLike.body, OPEN_CLASS_NAME);
  addClass(documentLike.documentElement, OPEN_CLASS_NAME);
}

function unlockParentPage(documentLike: BreakoutEasterEggDocumentLike): void {
  removeClass(documentLike.body, OPEN_CLASS_NAME);
  removeClass(documentLike.documentElement, OPEN_CLASS_NAME);
}

function restoreExistingOverlay(
  overlay: BreakoutEasterEggElementLike,
  documentLike: BreakoutEasterEggDocumentLike
): boolean {
  if (!hasClass(overlay, MINIMIZED_CLASS_NAME)) return false;
  if (typeof overlay.__breakoutEasterEggRestore === "function") {
    try {
      overlay.__breakoutEasterEggRestore();
      return true;
    } catch (_err) {}
  }
  lockParentPage(documentLike, overlay);
  const frame = overlay.querySelector?.(".breakout-easter-egg-frame") || null;
  postFrameAction(frame, "restore");
  if (frame && typeof frame.focus === "function") {
    try {
      frame.focus();
    } catch (_err) {}
  }
  return true;
}

function restoreMinimizedBreakoutEasterEgg(
  documentLike: BreakoutEasterEggDocumentLike
): boolean {
  const existing = queryExistingOverlay(documentLike);
  if (!existing || !hasClass(existing, MINIMIZED_CLASS_NAME)) return false;
  restoreExistingOverlay(existing, documentLike);
  return true;
}

function bindExistingTimerSelfRankTile(
  documentLike: BreakoutEasterEggDocumentLike | null,
  windowLike: BreakoutEasterEggWindowLike | null
): void {
  if (!documentLike || typeof documentLike.querySelector !== "function") return;
  let rankTile: BreakoutEasterEggElementLike | null = null;
  try {
    rankTile = documentLike.querySelector(TIMER_SELF_RANK_SELECTOR);
  } catch (_err) {
    rankTile = null;
  }
  if (!rankTile) return;
  const bindingHost = rankTile as BreakoutEasterEggElementLike & Record<string, unknown>;
  if (bindingHost[TIMER_SELF_RANK_BINDING_KEY]) return;
  try {
    bindingHost[TIMER_SELF_RANK_BINDING_KEY] =
      bindBreakoutEasterEgg(rankTile, {
        documentLike,
        windowLike,
        gameUrl: DEFAULT_GAME_URL,
        enableClickEffect: true,
        logoAlt: DEFAULT_LOGO_ALT,
        triggerCount: DEFAULT_TRIGGER_COUNT
      }) || true;
  } catch (_err) {}
}

function scheduleExistingTimerSelfRankTileBinding(
  documentLike: BreakoutEasterEggDocumentLike | null,
  windowLike: BreakoutEasterEggWindowLike | null
): void {
  bindExistingTimerSelfRankTile(documentLike, windowLike);
  const setTimer = windowLike?.setTimeout || (typeof setTimeout === "function" ? setTimeout : null);
  if (!setTimer) return;
  for (const delay of [0, 300, 1000]) {
    try {
      setTimer(() => bindExistingTimerSelfRankTile(documentLike, windowLike), delay);
    } catch (_err) {}
  }
}

export function openBreakoutEasterEgg(
  options: BreakoutEasterEggOptions = {}
): BreakoutEasterEggElementLike | null {
  const documentLike = resolveDocumentLike(options);
  if (!documentLike || !documentLike.body || typeof documentLike.createElement !== "function") {
    return null;
  }

  const existing = queryExistingOverlay(documentLike);
  if (existing) {
    restoreExistingOverlay(existing, documentLike);
    return existing;
  }

  const windowLike = resolveWindowLike(options);
  const lang = resolveBreakoutDiscoveryLang(windowLike, documentLike);
  const frameLabel = lang === "en" ? "Breakout Easter Egg" : "弹球彩蛋";
  const overlay = documentLike.createElement("div");
  const panel = documentLike.createElement("div");
  const closeButton = documentLike.createElement("button");
  const frame = documentLike.createElement("iframe");
  if (!overlay || !panel || !closeButton || !frame) return null;

  addClass(overlay, "breakout-easter-egg-overlay");
  setAttribute(overlay, "data-breakout-easter-egg-overlay", "1");
  setAttribute(overlay, "role", "dialog");
  setAttribute(overlay, "aria-modal", "true");
  setAttribute(overlay, "aria-label", frameLabel);

  addClass(panel, "breakout-easter-egg-panel");
  addClass(closeButton, "breakout-easter-egg-close");
  setAttribute(closeButton, "type", "button");
  setAttribute(closeButton, "aria-label", lang === "en" ? "Close game" : "关闭小游戏");
  closeButton.textContent = "×";

  addClass(frame, "breakout-easter-egg-frame");
  setAttribute(frame, "title", frameLabel);
  setAttribute(frame, "src", resolveText(options.gameUrl, DEFAULT_GAME_URL));
  setAttribute(frame, "sandbox", "allow-scripts allow-same-origin");
  setAttribute(frame, "allowtransparency", "true");

  let keydownAttached = false;
  let messageAttached = false;
  const keydownListener = (rawEvent?: unknown): void => {
    const event = (rawEvent || {}) as BreakoutEasterEggKeyboardEventLike;
    if (event.key === "Escape") {
      close();
    }
    stopParentPageKeyHandling(event);
  };
  const attachKeydown = (): void => {
    if (keydownAttached || !windowLike || typeof windowLike.addEventListener !== "function") return;
    try {
      windowLike.addEventListener("keydown", keydownListener, KEYDOWN_CAPTURE_OPTIONS);
      keydownAttached = true;
    } catch (_err) {}
  };
  const detachKeydown = (): void => {
    if (!keydownAttached || !windowLike || typeof windowLike.removeEventListener !== "function") return;
    try {
      windowLike.removeEventListener("keydown", keydownListener, KEYDOWN_CAPTURE_OPTIONS);
    } catch (_err) {}
    keydownAttached = false;
  };
  const close = (): void => {
    removeNode(overlay);
    unlockParentPage(documentLike);
    detachKeydown();
    if (messageAttached && windowLike && typeof windowLike.removeEventListener === "function") {
      try {
        windowLike.removeEventListener("message", messageListener);
      } catch (_err) {}
      messageAttached = false;
    }
  };
  const minimize = (): void => {
    addClass(overlay, MINIMIZED_CLASS_NAME);
    unlockParentPage(documentLike);
    detachKeydown();
  };
  const restore = (): void => {
    lockParentPage(documentLike, overlay);
    attachKeydown();
    postFrameAction(frame, "restore");
    if (typeof frame.focus === "function") {
      try {
        frame.focus();
      } catch (_err) {}
    }
  };
  const messageListener = (rawEvent?: unknown): void => {
    const action = resolveBreakoutMessageAction(rawEvent);
    if (action === "close") {
      close();
      return;
    }
    if (action === "minimize") {
      minimize();
    }
  };

  if (typeof closeButton.addEventListener === "function") {
    try {
      closeButton.addEventListener("click", close);
    } catch (_err) {}
  }
  if (windowLike && typeof windowLike.addEventListener === "function") {
    try {
      windowLike.addEventListener("message", messageListener);
      messageAttached = true;
    } catch (_err) {}
  }

  appendChild(panel, closeButton);
  appendChild(panel, frame);
  appendChild(overlay, panel);
  if (!appendChild(documentLike.body, overlay)) return null;
  overlay.__breakoutEasterEggRestore = restore;
  lockParentPage(documentLike, overlay);
  attachKeydown();

  if (typeof frame.focus === "function") {
    try {
      frame.focus();
    } catch (_err) {}
  }

  return overlay;
}

export function bindBreakoutEasterEgg(
  target: BreakoutEasterEggElementLike | null | undefined,
  options: BreakoutEasterEggOptions = {}
): BreakoutEasterEggBinding {
  let clickCount = 0;
  let lastClickAt: number | null = null;
  let opening = false;
  const triggerCount = resolvePositiveInteger(options.triggerCount, DEFAULT_TRIGGER_COUNT);
  const resetTimeoutMs = resolvePositiveInteger(options.resetTimeoutMs, DEFAULT_RESET_TIMEOUT_MS);
  const listener = (): void => {
    if (opening) return;
    const documentLike = resolveDocumentLike(options);
    const windowLike = resolveWindowLike(options);
    if (documentLike && restoreMinimizedBreakoutEasterEgg(documentLike)) {
      clickCount = 0;
      lastClickAt = null;
      return;
    }
    const now = Date.now();
    if (lastClickAt !== null && now - lastClickAt >= resetTimeoutMs) {
      clickCount = 0;
    }
    lastClickAt = now;
    clickCount += 1;
    const flyingRuntime = windowLike && windowLike.CoreFlyingClickEffectRuntime;
    const clickEffectEnabled =
      options.enableClickEffect === null || options.enableClickEffect === undefined
        ? DEFAULT_ENABLE_CLICK_EFFECT
        : !!options.enableClickEffect;
    if (clickCount < triggerCount) {
      if (
        clickEffectEnabled &&
        flyingRuntime &&
        typeof flyingRuntime.triggerFlyingClickEffect === "function"
      ) {
        try {
          flyingRuntime.triggerFlyingClickEffect({
            root: target || null
          });
        } catch (_err) {}
      }
      return;
    }
    clickCount = 0;
    lastClickAt = null;
    opening = true;
    addClass(target, TRIGGER_PENDING_CLASS_NAME);
    const openAfterLogoBurst = (): void => {
      if (!opening) return;
      opening = false;
      removeClass(target, TRIGGER_PENDING_CLASS_NAME);
      const overlay = openBreakoutEasterEgg(options);
      if (overlay) submitBreakoutDiscovery(resolveWindowLike(options), resolveDocumentLike(options));
    };
    if (flyingRuntime && typeof flyingRuntime.triggerFlyingClickEffect === "function") {
      try {
        const particle = flyingRuntime.triggerFlyingClickEffect({
          root: target || null,
          particleKind: "image",
          imageSrc: resolveLogoSrc(options),
          imageAlt: resolveText(options.logoAlt, DEFAULT_LOGO_ALT),
          imageBurst: true,
          cleanupTimeoutMs: 1200,
          onComplete: openAfterLogoBurst
        });
        if (!particle) openAfterLogoBurst();
        return;
      } catch (_err) {}
    }
    openAfterLogoBurst();
  };
  if (target && typeof target.addEventListener === "function") {
    try {
      target.addEventListener("click", listener);
    } catch (_err) {}
  }
  return {
    destroy() {
      if (!target || typeof target.removeEventListener !== "function") return;
      try {
        target.removeEventListener("click", listener);
      } catch (_err) {}
    }
  };
}

export function createBreakoutEasterEggRuntime(): BreakoutEasterEggRuntime {
  return {
    bindBreakoutEasterEgg,
    openBreakoutEasterEgg
  };
}

export function installBreakoutEasterEggRuntime(
  options: BreakoutEasterEggRuntimeInstallOptions = {}
): BreakoutEasterEggRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as BreakoutEasterEggWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreBreakoutEasterEggRuntime) {
    windowLike.CoreBreakoutEasterEggRuntime = createBreakoutEasterEggRuntime();
  }
  const documentLike =
    options.documentLike ||
    (typeof document === "undefined" ? null : (document as unknown as BreakoutEasterEggDocumentLike));
  scheduleExistingTimerSelfRankTileBinding(documentLike, windowLike);
  return windowLike.CoreBreakoutEasterEggRuntime || null;
}
