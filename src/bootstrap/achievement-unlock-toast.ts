import { achievementIconMarkupFor } from "../services/achievement-icons";
import { createBrowserStorageAccess, readStorageValue } from "../storage/browser-storage";

interface AchievementToastWindowLike {
  AchievementUnlockToastRuntime?: AchievementUnlockToastRuntime;
  UII18N?: { getLanguage?: () => string } | null;
  clearTimeout?: (id: number) => unknown;
  localStorage?: Storage | null;
  requestAnimationFrame?: (handler: () => void) => number;
  setTimeout?: (handler: () => void, timeout?: number) => number;
}

interface AchievementToastDocumentLike {
  body?: HTMLElement | null;
  createElement?: (tagName: string) => HTMLElement;
  documentElement?: HTMLElement | null;
}

export interface AchievementUnlockToastRuntime {
  showAchievementUnlockToast: (item: unknown) => void;
  showAchievementUnlockToasts: (items: unknown) => void;
}

const TOAST_GAP_MS = 3800;
const UI_LANGUAGE_KEY = "ui_language_v1";
const EASTER_EGG_DISCOVERY_ACHIEVEMENT_ID = "easter_egg_breakout_discovered";

let queue: Record<string, unknown>[] = [];
let showing = false;
let timer = 0;

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function escapeHtml(value: unknown): string {
  return toText(value)
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#39;");
}

function resolveStorage(windowLike: AchievementToastWindowLike | null): Storage | null {
  return createBrowserStorageAccess({
    windowLike: windowLike as unknown as Record<string, unknown>
  }).local();
}

function normalizeLang(value: unknown): "zh" | "en" | "" {
  const lang = toText(value).trim().toLowerCase();
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("zh")) return "zh";
  return "";
}

function resolveLang(
  windowLike: AchievementToastWindowLike | null,
  documentLike: AchievementToastDocumentLike | null
): "zh" | "en" {
  try {
    const runtimeLang = normalizeLang(windowLike?.UII18N?.getLanguage?.());
    if (runtimeLang) return runtimeLang;
  } catch (_err) {}
  const stored = normalizeLang(readStorageValue(resolveStorage(windowLike), UI_LANGUAGE_KEY));
  if (stored) return stored;
  return normalizeLang(documentLike?.documentElement?.getAttribute("lang")) || "zh";
}

function unwrapAchievement(item: unknown): Record<string, unknown> | null {
  const record = toRecord(item);
  const achievement = toRecord(record.achievement);
  if (toText(achievement.id || achievement.achievement_id)) return achievement;
  const data = toRecord(record.data);
  const dataAchievement = toRecord(data.achievement);
  if (toText(dataAchievement.id || dataAchievement.achievement_id)) return dataAchievement;
  return toText(record.id || record.achievement_id) ? record : null;
}

function localizedText(achievement: Record<string, unknown>, key: string, fallback: unknown, lang: "zh" | "en"): string {
  const i18n = toRecord(achievement[key + "_i18n"]);
  if (lang === "en") return toText(i18n.en || fallback);
  return toText(i18n["zh-CN"] || i18n.zh || fallback);
}

function achievementId(achievement: Record<string, unknown>): string {
  return toText(achievement.id || achievement.achievement_id).trim();
}

function achievementName(achievement: Record<string, unknown>, lang: "zh" | "en"): string {
  return localizedText(achievement, "name", achievement.name || achievementId(achievement), lang);
}

function achievementDescription(achievement: Record<string, unknown>, lang: "zh" | "en"): string {
  return localizedText(achievement, "description", achievement.description, lang);
}

function rules(achievement: Record<string, unknown>): Record<string, unknown>[] {
  return Array.isArray(achievement.rules) ? achievement.rules.map(toRecord) : [];
}

function hasRule(achievement: Record<string, unknown>, type: string): boolean {
  return rules(achievement).some((rule) => toText(rule.type) === type);
}

function isHiddenAchievement(achievement: Record<string, unknown>): boolean {
  return rules(achievement).some((rule) => {
    const params = toRecord(rule.params);
    const hidden = params.hidden;
    return hidden === true || toText(hidden).trim().toLowerCase() === "true";
  });
}

function isEasterEgg(achievement: Record<string, unknown>): boolean {
  return achievementId(achievement) === EASTER_EGG_DISCOVERY_ACHIEVEMENT_ID;
}

function isMilestone(achievement: Record<string, unknown>): boolean {
  return toText(achievement.series_id).startsWith("tile-") ||
    hasRule(achievement, "max_tile_reached") ||
    hasRule(achievement, "nth_max_tile_reached");
}

function isSpeedrun(achievement: Record<string, unknown>): boolean {
  return toText(achievement.series_id).startsWith("speed-") || hasRule(achievement, "max_tile_within_duration");
}

function toastTitle(achievement: Record<string, unknown>, lang: "zh" | "en"): string {
  if (isEasterEgg(achievement) || isHiddenAchievement(achievement)) return lang === "en" ? "Secret Found" : "隐藏成就";
  if (isMilestone(achievement)) return lang === "en" ? "Milestone Progress" : "里程碑进度";
  if (isSpeedrun(achievement)) return lang === "en" ? "Achievement Unlocked" : "成就达成";
  return lang === "en" ? "Reward Claimed" : "奖励领取";
}

function renderIcon(achievement: Record<string, unknown>, lang: "zh" | "en"): string {
  const icon = achievementIconMarkupFor(achievement);
  if (icon) return '<span class="achievement-toast-icon-box">' + icon + "</span>";
  const iconUrl = toText(achievement.icon_url || achievement.iconUrl);
  if (iconUrl) return '<span class="achievement-toast-icon-box"><img src="' + escapeHtml(iconUrl) + '" alt=""></span>';
  return '<span class="achievement-toast-icon-box">' +
    escapeHtml(achievementName(achievement, lang).slice(0, 1) || (lang === "en" ? "A" : "成")) +
    "</span>";
}

function host(documentLike: AchievementToastDocumentLike | null): HTMLElement | null {
  if (!documentLike?.body || typeof documentLike.createElement !== "function") return null;
  let node = documentLike.body.querySelector<HTMLElement>("#global-achievement-unlock-toast-host");
  if (!node) {
    node = documentLike.createElement("div");
    node.id = "global-achievement-unlock-toast-host";
    node.className = "achievements-unlock-toast-host unlock-toast-host";
    node.style.position = "fixed";
    node.style.inset = "0";
    node.style.zIndex = "10060";
    node.style.pointerEvents = "none";
    documentLike.body.append(node);
  }
  return node;
}

function placeToastAboveGameBoard(
  node: HTMLElement,
  windowLike: AchievementToastWindowLike | null,
  documentLike: AchievementToastDocumentLike | null
): void {
  const apply = () => {
    const toast = node.querySelector<HTMLElement>(".unlock-toast");
    const game = documentLike?.body?.querySelector<HTMLElement>(".game-container");
    if (!toast || !game) return;
    const toastRect = toast.getBoundingClientRect();
    const toastHeight = Math.max(toast.offsetHeight || 0, toastRect.height);
    const viewportWidth = documentLike?.documentElement?.clientWidth || documentLike?.body?.clientWidth || 0;
    const toastWidth = Math.max(0, Math.min(650, viewportWidth - 34));
    if (documentLike?.body?.querySelector('[data-breakout-easter-egg-overlay="1"]')) {
      node.style.setProperty("--achievement-unlock-toast-left", (viewportWidth / 2).toFixed(2) + "px");
      node.style.setProperty("--achievement-unlock-toast-top", "56px");
      node.style.setProperty("--achievement-unlock-toast-width", toastWidth.toFixed(2) + "px");
      return;
    }
    const gameRect = game.getBoundingClientRect();
    if (toastHeight <= 0 || gameRect.width <= 0 || gameRect.top <= 0) return;
    const toastLeft = gameRect.left + gameRect.width / 2;
    const toastTop = Math.max(12, Math.floor(gameRect.top - toastHeight - 3));
    node.style.setProperty("--achievement-unlock-toast-left", toastLeft.toFixed(2) + "px");
    node.style.setProperty("--achievement-unlock-toast-top", toastTop + "px");
    node.style.setProperty("--achievement-unlock-toast-width", toastWidth.toFixed(2) + "px");
  };
  apply();
  if (typeof windowLike?.requestAnimationFrame === "function") {
    windowLike.requestAnimationFrame(apply);
  } else {
    const setTimer = windowLike?.setTimeout || setTimeout;
    setTimer(apply, 0);
  }
  const setTimer = windowLike?.setTimeout || setTimeout;
  setTimer(apply, 80);
  setTimer(apply, 240);
  setTimer(apply, 600);
}

function render(
  achievement: Record<string, unknown>,
  windowLike: AchievementToastWindowLike | null,
  documentLike: AchievementToastDocumentLike | null
): void {
  const lang = resolveLang(windowLike, documentLike);
  const node = host(documentLike);
  if (!node) return;
  const milestone = isMilestone(achievement);
  const reward = !milestone && !isSpeedrun(achievement);
  const variant = (milestone ? " unlock-toast--codepen-milestone" : reward ? " unlock-toast--codepen-reward" : "") +
    (isEasterEgg(achievement) ? " unlock-toast--easter-egg" : "");
  const progress = milestone ? '<span class="unlock-codepen-progress"><span style="width:100%"></span></span>' : "";
  node.innerHTML =
    '<article class="unlock-toast unlock-toast--codepen' + variant + '" role="status" aria-live="polite">' +
      '<div class="unlock-toast-card">' +
        '<span class="unlock-badge achievements-unlock-badge">' + renderIcon(achievement, lang) + "</span>" +
        '<div class="unlock-toast-content">' +
          '<p class="unlock-toast-title">' + escapeHtml(toastTitle(achievement, lang)) + "</p>" +
          '<h2 class="unlock-toast-name">' + escapeHtml(achievementName(achievement, lang)) + "</h2>" +
          '<p class="unlock-toast-desc">' + escapeHtml(achievementDescription(achievement, lang)) + "</p>" +
          progress +
        "</div>" +
      "</div>" +
    "</article>";
  placeToastAboveGameBoard(node, windowLike, documentLike);
}

function showNext(windowLike: AchievementToastWindowLike | null, documentLike: AchievementToastDocumentLike | null): void {
  const achievement = queue.shift();
  if (!achievement) {
    showing = false;
    return;
  }
  showing = true;
  render(achievement, windowLike, documentLike);
  const setTimer = windowLike?.setTimeout || setTimeout;
  timer = setTimer(() => {
    const node = host(documentLike);
    if (node) node.innerHTML = "";
    showNext(windowLike, documentLike);
  }, TOAST_GAP_MS);
}

export function installAchievementUnlockToastRuntime(options: {
  documentLike?: AchievementToastDocumentLike | null;
  windowLike?: AchievementToastWindowLike | null;
} = {}): AchievementUnlockToastRuntime | null {
  const windowLike = options.windowLike || (typeof window === "undefined" ? null : window as AchievementToastWindowLike);
  const documentLike = options.documentLike || (typeof document === "undefined" ? null : document as AchievementToastDocumentLike);
  if (!windowLike) return null;
  windowLike.AchievementUnlockToastRuntime = {
    showAchievementUnlockToast(item) {
      this.showAchievementUnlockToasts([item]);
    },
    showAchievementUnlockToasts(items) {
      const raw = Array.isArray(items) ? items : [items];
      const achievements = raw.map(unwrapAchievement).filter((item): item is Record<string, unknown> => !!item);
      if (achievements.length <= 0) return;
      const clearTimer = windowLike.clearTimeout || clearTimeout;
      if (!showing && timer) clearTimer(timer);
      queue = queue.concat(achievements).slice(-10);
      if (!showing) showNext(windowLike, documentLike);
    }
  };
  return windowLike.AchievementUnlockToastRuntime || null;
}
