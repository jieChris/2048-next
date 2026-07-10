import {
  resolveHomeUserDisplayName
} from "../bootstrap/home-user-display";
import { achievementIconMarkupFor } from "../services/achievement-icons";
import { createAchievementsService } from "../services/achievements";

type JsonRecord = Record<string, unknown>;
type FilterKey = "all" | "earned" | "locked" | "event" | "milestone" | "speedrun";
type AchievementPageLang = "zh" | "en";

interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  nameI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  iconUrl: string;
  status: string;
  level: number;
  seriesId: string;
  rules: JsonRecord[];
}

interface UserAchievementEntry {
  achievement: AchievementDefinition;
  earnedAt: string;
  source: string;
}

interface AchievementViewModel {
  achievement: AchievementDefinition;
  earned: UserAchievementEntry | null;
  showcase: boolean;
}

let allAchievements: AchievementViewModel[] = [];
let currentFilter: FilterKey = "all";
let selectedAchievementId = "";
let showcaseEditMode = false;
let selectedShowcaseIds: string[] = [];
let achievementToastTimer = 0;

const UI_LANGUAGE_KEY = "ui_language_v1";
const ACHIEVEMENT_TOAST_DURATION_MS = 3600;
const EASTER_EGG_DISCOVERY_ACHIEVEMENT_ID = "easter_egg_breakout_discovered";

const ACHIEVEMENT_COPY: Record<
  AchievementPageLang,
  {
    pageTitle: string;
    title: string;
    subtitle: string;
    navAccount: string;
    navGame: string;
    summaryTitle: string;
    summaryLoading: string;
    showcaseTitle: string;
    showcaseCopy: string;
    editShowcase: string;
    selectingShowcase: string;
    saveShowcase: string;
    cancel: string;
    wallTitle: string;
    wallCopy: string;
    filterLabel: string;
    filters: Record<FilterKey, string>;
    statsEarned: string;
    statsTotal: string;
    statsLatest: string;
    collected: (earned: number, total: number) => string;
    noData: string;
    loading: string;
    loaded: string;
    loadFailed: string;
    emptySlot: (slot: number) => string;
    noMatches: string;
    unlocked: string;
    locked: string;
    noDescription: string;
    earnedAt: string;
    waiting: string;
    detailEmpty: string;
    detailStatus: string;
    detailEarned: string;
    detailNotEarned: string;
    detailEarnedAt: string;
    detailSource: string;
    detailLevel: string;
    showcaseLimit: string;
    showcaseSaved: string;
    showcaseSaveFailed: string;
  }
> = {
  zh: {
    pageTitle: "2048 成就",
    title: "成就",
    subtitle: "查看已获得成就，并选择最多三个展示在个人资料中。",
    navAccount: "排行榜",
    navGame: "返回游戏",
    summaryTitle: "收集进度",
    summaryLoading: "正在读取成就数据。",
    showcaseTitle: "展示成就",
    showcaseCopy: "最多展示三个已获得成就。",
    editShowcase: "编辑展示",
    selectingShowcase: "选择中",
    saveShowcase: "保存展示",
    cancel: "取消",
    wallTitle: "成就勋章墙",
    wallCopy: "已点亮和未点亮的成就会同时展示，已点亮成就排在前方。",
    filterLabel: "成就筛选",
    filters: {
      all: "全部",
      earned: "已获得",
      locked: "未获得",
      event: "活动",
      milestone: "里程碑",
      speedrun: "竞速"
    },
    statsEarned: "已获得",
    statsTotal: "全部成就",
    statsLatest: "最近获得",
    collected: (earned, total) => "已收集 " + earned + " / " + total + " 个成就。",
    noData: "暂无成就数据。",
    loading: "加载中",
    loaded: "已加载",
    loadFailed: "加载失败",
    emptySlot: (slot) => "展示位 " + slot,
    noMatches: "暂无匹配成就。",
    unlocked: "已点亮",
    locked: "未点亮",
    noDescription: "暂无简介",
    earnedAt: "获得于",
    waiting: "等待点亮",
    detailEmpty: "选择一个成就查看详情。",
    detailStatus: "状态",
    detailEarned: "已获得",
    detailNotEarned: "未获得",
    detailEarnedAt: "获得时间",
    detailSource: "来源",
    detailLevel: "等级",
    showcaseLimit: "最多只能展示 3 个成就。",
    showcaseSaved: "展示成就已保存。",
    showcaseSaveFailed: "展示保存失败"
  },
  en: {
    pageTitle: "2048 Achievements",
    title: "Achievements",
    subtitle: "View earned achievements and choose up to three to show on your profile.",
    navAccount: "Leaderboard",
    navGame: "Back to Game",
    summaryTitle: "Collection Progress",
    summaryLoading: "Reading achievement data.",
    showcaseTitle: "Showcase",
    showcaseCopy: "Show up to three earned achievements.",
    editShowcase: "Edit Showcase",
    selectingShowcase: "Selecting",
    saveShowcase: "Save Showcase",
    cancel: "Cancel",
    wallTitle: "Medal Wall",
    wallCopy: "Unlocked and locked achievements are shown together, with unlocked achievements first.",
    filterLabel: "Achievement filters",
    filters: {
      all: "All",
      earned: "Unlocked",
      locked: "Locked",
      event: "Events",
      milestone: "Milestones",
      speedrun: "Speedrun"
    },
    statsEarned: "Unlocked",
    statsTotal: "All Achievements",
    statsLatest: "Latest",
    collected: (earned, total) => "Collected " + earned + " / " + total + " achievements.",
    noData: "No achievement data yet.",
    loading: "Loading",
    loaded: "Loaded",
    loadFailed: "Load Failed",
    emptySlot: (slot) => "Slot " + slot,
    noMatches: "No matching achievements.",
    unlocked: "Unlocked",
    locked: "Locked",
    noDescription: "No description",
    earnedAt: "Earned",
    waiting: "Waiting to unlock",
    detailEmpty: "Select an achievement to view details.",
    detailStatus: "Status",
    detailEarned: "Unlocked",
    detailNotEarned: "Locked",
    detailEarnedAt: "Earned At",
    detailSource: "Source",
    detailLevel: "Level",
    showcaseLimit: "You can showcase up to 3 achievements.",
    showcaseSaved: "Showcase achievements saved.",
    showcaseSaveFailed: "Failed to save showcase"
  }
};

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeAchievementPageLang(value: unknown): AchievementPageLang | "" {
  const lang = String(value || "").trim().toLowerCase();
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("zh")) return "zh";
  return "";
}

function resolveAchievementPageLang(): AchievementPageLang {
  if (typeof window !== "undefined") {
    try {
      const i18n = (window as Window & { UII18N?: { getLanguage?: () => string } }).UII18N;
      const fromI18n = normalizeAchievementPageLang(
        typeof i18n?.getLanguage === "function" ? i18n.getLanguage() : ""
      );
      if (fromI18n) return fromI18n;
    } catch (_error) {}
    try {
      const fromStorage = normalizeAchievementPageLang(window.localStorage?.getItem(UI_LANGUAGE_KEY));
      if (fromStorage) return fromStorage;
    } catch (_error) {}
  }
  if (typeof document !== "undefined") {
    const fromDocument = normalizeAchievementPageLang(
      document.documentElement.getAttribute("data-ui-lang") || document.documentElement.getAttribute("lang")
    );
    if (fromDocument) return fromDocument;
  }
  return "zh";
}

function copy(): (typeof ACHIEVEMENT_COPY)[AchievementPageLang] {
  return ACHIEVEMENT_COPY[resolveAchievementPageLang()];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char));
}

function formatDateTime(value: unknown): string {
  const text = toText(value).trim();
  if (!text) return "--";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString(resolveAchievementPageLang() === "en" ? "en-US" : "zh-CN", { hour12: false });
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = toRecord(payload);
  for (const key of ["data", "achievements", "items", "rows"]) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  const data = toRecord(record.data);
  for (const key of ["achievements", "items", "rows"]) {
    const value = data[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeI18nRecord(value: unknown): Record<string, string> {
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw || "{}") as unknown;
    } catch (_error) {
      raw = {};
    }
  }
  const record = toRecord(raw);
  return Object.fromEntries(
    Object.entries(record)
      .map(([key, entry]) => [key.trim(), toText(entry).trim()] as const)
      .filter(([key, entry]) => key && entry)
  );
}

function pickLocalizedText(i18n: Record<string, string>, fallback: string): string {
  const lang = resolveAchievementPageLang();
  const candidates = lang === "en"
    ? ["en", "en-US", "en_US"]
    : ["zh-CN", "zh", "zh-Hans", "zh_CN"];
  for (const key of candidates) {
    const value = toText(i18n[key]).trim();
    if (value) return value;
  }
  return fallback;
}

function achievementName(achievement: AchievementDefinition): string {
  return pickLocalizedText(achievement.nameI18n, achievement.name) || achievement.id;
}

function achievementDescription(achievement: AchievementDefinition): string {
  return pickLocalizedText(achievement.descriptionI18n, achievement.description);
}

function achievementDisplayDescription(achievement: AchievementDefinition): string {
  if (isEasterEggDiscoveryAchievement(achievement)) {
    return resolveAchievementPageLang() === "en"
      ? "Find and open the hidden Breakout easter egg in the leaderboard."
      : "发现并打开隐藏在排行榜里的弹球彩蛋。";
  }
  return achievementDescription(achievement);
}

function normalizeAchievement(value: unknown): AchievementDefinition | null {
  const record = toRecord(value);
  const id = toText(record.id || record.achievement_id).trim();
  if (!id) return null;
  return {
    id,
    name: toText(record.name || record.title || id).trim() || id,
    description: toText(record.description || record.summary).trim(),
    nameI18n: normalizeI18nRecord(record.name_i18n || record.nameI18n),
    descriptionI18n: normalizeI18nRecord(record.description_i18n || record.descriptionI18n),
    iconUrl: toText(record.icon_url || record.iconUrl).trim(),
    status: toText(record.status || "active").trim(),
    level: Math.max(1, Math.floor(toNumber(record.level, 1))),
    seriesId: toText(record.series_id || record.seriesId).trim(),
    rules: Array.isArray(record.rules) ? record.rules.map(toRecord) : []
  };
}

function normalizeUserAchievement(value: unknown): UserAchievementEntry | null {
  const record = toRecord(value);
  const achievement = normalizeAchievement(record.achievement || record);
  if (!achievement) return null;
  return {
    achievement,
    earnedAt: toText(record.earned_at || record.earnedAt),
    source: toText(record.source)
  };
}

function isHiddenAchievement(achievement: AchievementDefinition): boolean {
  return achievement.rules.some((rule) => {
    const params = toRecord(rule.params);
    const hidden = params.hidden;
    return hidden === true || toText(hidden).trim().toLowerCase() === "true";
  });
}

function isEasterEggDiscoveryAchievement(achievement: AchievementDefinition): boolean {
  return achievement.id === EASTER_EGG_DISCOVERY_ACHIEVEMENT_ID;
}

function isNoLevelAchievement(achievement: AchievementDefinition): boolean {
  if (isEasterEggDiscoveryAchievement(achievement)) return true;
  return achievement.rules.some((rule) => {
    const params = toRecord(rule.params);
    const noLevel = params.no_level || params.noLevel;
    return noLevel === true || toText(noLevel).trim().toLowerCase() === "true";
  });
}

function achievementSourceLabel(item: AchievementViewModel): string {
  if (!item.earned) return "--";
  const lang = resolveAchievementPageLang();
  if (isEasterEggDiscoveryAchievement(item.achievement)) {
    return lang === "en" ? "Leaderboard hidden easter egg" : "排行榜隐藏彩蛋";
  }
  const source = toText(item.earned.source).trim();
  const zh: Record<string, string> = {
    record: "Ranked 对局",
    ranked: "Ranked 对局",
    event: "活动触发",
    manual: "官方发放",
    backfill: "历史补发"
  };
  const en: Record<string, string> = {
    record: "Ranked game",
    ranked: "Ranked game",
    event: "Event",
    manual: "Official grant",
    backfill: "Historical grant"
  };
  return (lang === "en" ? en[source] : zh[source]) || source || "--";
}

function buildViewModels(
  catalogPayload: unknown,
  earnedPayload: unknown,
  showcasePayload: unknown
): AchievementViewModel[] {
  const catalog = extractRows(catalogPayload).map(normalizeAchievement).filter((item): item is AchievementDefinition => !!item);
  const earned = extractRows(earnedPayload).map(normalizeUserAchievement).filter((item): item is UserAchievementEntry => !!item);
  const earnedById = new Map(earned.map((item) => [item.achievement.id, item]));
  const showcaseIds = new Set(
    extractRows(showcasePayload)
      .map(normalizeUserAchievement)
      .filter((item): item is UserAchievementEntry => !!item)
      .map((item) => item.achievement.id)
  );
  selectedShowcaseIds = Array.from(showcaseIds).slice(0, 3);

  const merged = new Map<string, AchievementDefinition>();
  for (const achievement of catalog) merged.set(achievement.id, achievement);
  for (const item of earned) {
    if (!merged.has(item.achievement.id)) merged.set(item.achievement.id, item.achievement);
  }

  return Array.from(merged.values())
    .map((achievement) => ({
      achievement,
      earned: earnedById.get(achievement.id) || null,
      showcase: showcaseIds.has(achievement.id)
    }))
    .filter((item) => !!item.earned || !isHiddenAchievement(item.achievement))
    .sort((a, b) => {
      if (!!a.earned !== !!b.earned) return a.earned ? -1 : 1;
      return a.achievement.level - b.achievement.level ||
        achievementName(a.achievement).localeCompare(achievementName(b.achievement));
    });
}

function renderBadge(achievement: AchievementDefinition, locked = false): string {
  const fallback = escapeHtml(achievementName(achievement).slice(0, 1) || (resolveAchievementPageLang() === "en" ? "A" : "成"));
  const showcaseIcon = achievementIconMarkupFor(achievement);
  const image = showcaseIcon || (achievement.iconUrl
    ? '<img src="' + escapeHtml(achievement.iconUrl) + '" alt="">'
    : fallback);
  return '<span class="achievement-badge' + (locked ? " is-locked" : "") + '">' + image + "</span>";
}

function isMilestoneAchievement(achievement: AchievementDefinition): boolean {
  if (achievement.seriesId.startsWith("tile-")) return true;
  return achievement.rules.some((rule) => ["max_tile_reached", "nth_max_tile_reached"].includes(toText(rule.type)));
}

function isRewardAchievement(achievement: AchievementDefinition): boolean {
  if (achievement.seriesId.startsWith("community-")) return true;
  return achievement.rules.some((rule) => ["event_rank", "manual_grant"].includes(toText(rule.type)));
}

function isSpeedrunAchievement(achievement: AchievementDefinition): boolean {
  if (achievement.seriesId.startsWith("speed-")) return true;
  return achievement.rules.some((rule) => toText(rule.type) === "max_tile_within_duration");
}

function achievementToastTitle(achievement: AchievementDefinition): string {
  const lang = resolveAchievementPageLang();
  if (isEasterEggDiscoveryAchievement(achievement)) return lang === "en" ? "Secret Found" : "隐藏成就";
  if (isMilestoneAchievement(achievement)) return lang === "en" ? "Milestone Progress" : "里程碑进度";
  if (isSpeedrunAchievement(achievement)) return lang === "en" ? "Achievement Unlocked" : "成就达成";
  return lang === "en" ? "Reward Claimed" : "奖励领取";
}

function achievementToastDescription(achievement: AchievementDefinition): string {
  if (isEasterEggDiscoveryAchievement(achievement)) {
    return resolveAchievementPageLang() === "en"
      ? "Opened the hidden Breakout in the leaderboard."
      : "打开排行榜里的弹球彩蛋。";
  }
  return achievementDescription(achievement);
}

function showAchievementToast(item: AchievementViewModel): void {
  if (!item.earned) return;
  let host = byId("achievements-unlock-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "achievements-unlock-toast-host";
    host.className = "achievements-unlock-toast-host unlock-toast-host";
    document.body.append(host);
  }
  window.clearTimeout(achievementToastTimer);
  const milestone = isMilestoneAchievement(item.achievement);
  const reward = isRewardAchievement(item.achievement);
  const variantClass = (milestone
    ? "unlock-toast--codepen-milestone"
    : reward
      ? "unlock-toast--codepen-reward"
      : "") + (isEasterEggDiscoveryAchievement(item.achievement) ? " unlock-toast--easter-egg" : "");
  const progress = milestone ? '<span class="unlock-codepen-progress"><span style="width:100%"></span></span>' : "";
  host.innerHTML =
    '<article class="unlock-toast unlock-toast--codepen ' + variantClass + '" role="status" aria-live="polite">' +
      '<div class="unlock-toast-card">' +
        '<span class="unlock-badge achievements-unlock-badge">' + renderBadge(item.achievement, false) + "</span>" +
        '<div class="unlock-toast-content">' +
          '<p class="unlock-toast-title">' + escapeHtml(achievementToastTitle(item.achievement)) + "</p>" +
          '<h2 class="unlock-toast-name">' + escapeHtml(achievementName(item.achievement)) + "</h2>" +
          '<p class="unlock-toast-desc">' + escapeHtml(achievementToastDescription(item.achievement) || copy().noDescription) + "</p>" +
          progress +
        "</div>" +
      "</div>" +
    "</article>";
  achievementToastTimer = window.setTimeout(() => host.replaceChildren(), ACHIEVEMENT_TOAST_DURATION_MS);
}

function syncAchievementUserChip(): void {
  const storageLike = typeof window !== "undefined" ? window.localStorage : null;
  const nameNode = byId("achievements-user-name");
  const name = resolveHomeUserDisplayName({ storageLike });
  if (nameNode) nameNode.textContent = name;
}

function setText(selector: string, text: string): void {
  const node = document.querySelector(selector);
  if (node) node.textContent = text;
}

function applyStaticCopy(): void {
  const currentCopy = copy();
  document.title = currentCopy.pageTitle;
  document.documentElement.lang = resolveAchievementPageLang() === "en" ? "en" : "zh-CN";
  setText(".achievements-header .palette-title", currentCopy.title);
  setText(".achievements-header .palette-subtitle", currentCopy.subtitle);
  setText(".achievements-header .palette-nav a[href='account.html']", currentCopy.navAccount);
  setText(".achievements-header .palette-nav a[href='2048.html']", currentCopy.navGame);
  setText(".achievements-summary-card h2", currentCopy.summaryTitle);
  setText(".achievements-showcase-card h2", currentCopy.showcaseTitle);
  setText(".achievements-showcase-card .panel-head p", currentCopy.showcaseCopy);
  setText(".achievements-wall-head h2", currentCopy.wallTitle);
  setText(".achievements-wall-head p", currentCopy.wallCopy);
  const filterRow = document.querySelector<HTMLElement>(".achievements-filter-row");
  if (filterRow) filterRow.setAttribute("aria-label", currentCopy.filterLabel);
  document.querySelectorAll<HTMLButtonElement>(".achievement-filter").forEach((button) => {
    const filter = (button.dataset.filter || "all") as FilterKey;
    button.textContent = currentCopy.filters[filter] || currentCopy.filters.all;
  });
  const saveButton = byId<HTMLButtonElement>("achievements-save-showcase");
  if (saveButton) saveButton.textContent = currentCopy.saveShowcase;
  const cancelButton = byId<HTMLButtonElement>("achievements-cancel-showcase");
  if (cancelButton) cancelButton.textContent = currentCopy.cancel;
  const editButton = byId<HTMLButtonElement>("achievements-edit-showcase");
  if (editButton) editButton.textContent = showcaseEditMode ? currentCopy.selectingShowcase : currentCopy.editShowcase;
  setText("#achievement-detail .achievement-detail-empty", currentCopy.detailEmpty);
  if (!allAchievements.length) {
    const summary = byId("achievements-summary-copy");
    if (summary) summary.textContent = currentCopy.summaryLoading;
  }
}

function rerenderAchievementsPage(): void {
  applyStaticCopy();
  syncAchievementUserChip();
  renderStats();
  renderShowcase();
  renderList();
  const detail = byId("achievement-detail");
  if (selectedAchievementId) selectAchievement(selectedAchievementId);
  else if (detail) detail.innerHTML = '<div class="achievement-detail-empty">' + escapeHtml(copy().detailEmpty) + "</div>";
}

function setTip(message: string, state: "ok" | "err" | "idle" = "idle"): void {
  const node = byId("achievements-tip");
  if (!node) return;
  node.textContent = message;
  if (state === "idle") node.removeAttribute("data-state");
  else node.setAttribute("data-state", state);
}

function setStatus(message: string, ok = true): void {
  const node = byId("achievements-status");
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("admin-state-ok", ok);
  node.classList.toggle("admin-state-err", !ok);
}

function isFailurePayload(payload: unknown): boolean {
  return toRecord(payload).success === false;
}

function payloadErrorMessage(payload: unknown): string {
  const record = toRecord(payload);
  return toText(record.error || record.message || record.code || copy().loadFailed);
}

function isAuthFailurePayload(payload: unknown): boolean {
  if (!isFailurePayload(payload)) return false;
  const record = toRecord(payload);
  const text = toText(record.code || record.error || record.message).toLowerCase();
  return ["unauthorized", "auth_required", "login_required", "missing_token", "invalid_token"].some((needle) =>
    text.includes(needle)
  );
}

function normalizeOptionalUserPayload(payload: unknown): unknown {
  if (!isFailurePayload(payload)) return payload;
  if (isAuthFailurePayload(payload)) return { success: true, data: [] };
  throw new Error(payloadErrorMessage(payload));
}

function renderStats(): void {
  const currentCopy = copy();
  const mount = byId("achievements-stats");
  const summary = byId("achievements-summary-copy");
  if (!mount) return;
  const total = allAchievements.length;
  const earned = allAchievements.filter((item) => item.earned).length;
  const latest = allAchievements
    .map((item) => item.earned?.earnedAt || "")
    .filter(Boolean)
    .sort()
    .pop();
  mount.innerHTML = [
    [currentCopy.statsEarned, String(earned)],
    [currentCopy.statsTotal, String(total)],
    [currentCopy.statsLatest, latest ? formatDateTime(latest) : "--"]
  ].map(([label, value]) =>
    '<div class="achievements-stat"><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(label) + "</span></div>"
  ).join("");
  if (summary) summary.textContent = total ? currentCopy.collected(earned, total) : currentCopy.noData;
}

function renderShowcase(): void {
  const currentCopy = copy();
  const mount = byId("achievements-showcase");
  if (!mount) return;
  const picked = selectedShowcaseIds
    .map((id) => allAchievements.find((item) => item.achievement.id === id))
    .filter((item): item is AchievementViewModel => !!item);
  const slots = [0, 1, 2].map((index) => {
    const item = picked[index];
    if (!item) return '<div class="achievement-showcase-slot is-empty">' + escapeHtml(currentCopy.emptySlot(index + 1)) + "</div>";
    return '<div class="achievement-showcase-slot">' +
      renderBadge(item.achievement, false) +
      '<div class="achievement-name">' + escapeHtml(achievementName(item.achievement)) + "</div>" +
      '<p class="achievement-meta">' + escapeHtml(formatDateTime(item.earned?.earnedAt)) + "</p>" +
    "</div>";
  });
  mount.innerHTML = slots.join("");
}

function matchFilter(item: AchievementViewModel): boolean {
  if (currentFilter === "earned") return !!item.earned;
  if (currentFilter === "locked") return !item.earned;
  if (currentFilter === "event") return isRewardAchievement(item.achievement);
  if (currentFilter === "milestone") return isMilestoneAchievement(item.achievement);
  if (currentFilter === "speedrun") return isSpeedrunAchievement(item.achievement);
  return true;
}

function renderList(): void {
  const currentCopy = copy();
  const mount = byId("achievements-list");
  if (!mount) return;
  const items = allAchievements.filter(matchFilter);
  if (!items.length) {
    mount.innerHTML = '<div class="achievement-detail-empty">' + escapeHtml(currentCopy.noMatches) + "</div>";
    return;
  }
  mount.innerHTML = items.map((item) => {
    const locked = !item.earned;
    const picked = selectedShowcaseIds.includes(item.achievement.id);
    return '<button class="achievement-card' +
      (locked ? " is-locked" : "") +
      (selectedAchievementId === item.achievement.id ? " is-selected" : "") +
      (picked ? " is-showcase-picked" : "") +
      '" type="button" data-achievement-id="' + escapeHtml(item.achievement.id) + '"' +
      (showcaseEditMode && locked ? " disabled" : "") + ">" +
      '<span class="achievement-light-state">' + (item.earned ? currentCopy.unlocked : currentCopy.locked) + "</span>" +
      '<span class="achievement-medal-face">' + renderBadge(item.achievement, locked) + "</span>" +
      '<span class="achievement-name">' + escapeHtml(achievementName(item.achievement)) + "</span>" +
      '<span class="achievement-desc">' + escapeHtml(achievementDisplayDescription(item.achievement) || currentCopy.noDescription) + "</span>" +
      '<span class="achievement-meta">' + (item.earned ? currentCopy.earnedAt + " " + escapeHtml(formatDateTime(item.earned.earnedAt)) : currentCopy.waiting) + "</span>" +
    "</button>";
  }).join("");

  mount.querySelectorAll<HTMLButtonElement>(".achievement-card").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.achievementId || "";
      if (showcaseEditMode) {
        toggleShowcaseSelection(id);
        return;
      }
      const selectedItem = allAchievements.find((entry) => entry.achievement.id === id);
      if (selectedItem) showAchievementToast(selectedItem);
      selectAchievement(id);
    });
  });
}

function selectAchievement(id: string): void {
  const currentCopy = copy();
  selectedAchievementId = id;
  const item = allAchievements.find((entry) => entry.achievement.id === id);
  const detail = byId("achievement-detail");
  if (!detail || !item) return;
  const detailLines = [
    [currentCopy.detailStatus, item.earned ? currentCopy.detailEarned : currentCopy.detailNotEarned],
    [currentCopy.detailEarnedAt, item.earned ? formatDateTime(item.earned.earnedAt) : "--"],
    [currentCopy.detailSource, achievementSourceLabel(item)]
  ];
  if (!isNoLevelAchievement(item.achievement)) {
    detailLines.push([currentCopy.detailLevel, String(item.achievement.level)]);
  }
  detail.innerHTML =
    renderBadge(item.achievement, !item.earned) +
    "<h2>" + escapeHtml(achievementName(item.achievement)) + "</h2>" +
    "<p>" + escapeHtml(achievementDisplayDescription(item.achievement) || currentCopy.noDescription) + "</p>" +
    '<div class="achievement-detail-list">' +
      detailLines.map(([label, value]) =>
        '<div class="achievement-detail-line"><span>' + label + "</span><strong>" + escapeHtml(value) + "</strong></div>"
      ).join("") +
    "</div>";
  renderList();
}

function toggleShowcaseSelection(id: string): void {
  const item = allAchievements.find((entry) => entry.achievement.id === id);
  if (!item?.earned) return;
  if (selectedShowcaseIds.includes(id)) {
    selectedShowcaseIds = selectedShowcaseIds.filter((itemId) => itemId !== id);
  } else if (selectedShowcaseIds.length < 3) {
    selectedShowcaseIds = [...selectedShowcaseIds, id];
  } else {
    setTip(copy().showcaseLimit, "err");
  }
  renderShowcase();
  renderList();
}

function setShowcaseEditMode(enabled: boolean): void {
  showcaseEditMode = enabled;
  byId("achievements-showcase-actions")?.toggleAttribute("hidden", !enabled);
  const editButton = byId<HTMLButtonElement>("achievements-edit-showcase");
  const currentCopy = copy();
  if (editButton) editButton.textContent = enabled ? currentCopy.selectingShowcase : currentCopy.editShowcase;
  renderList();
}

async function saveShowcase(): Promise<void> {
  const service = createAchievementsService();
  const result = await service.updateMyShowcase(selectedShowcaseIds);
  if (result.success === false) {
    setTip(toText(result.error || result.message || copy().showcaseSaveFailed), "err");
    return;
  }
  allAchievements = allAchievements.map((item) => ({
    ...item,
    showcase: selectedShowcaseIds.includes(item.achievement.id)
  }));
  setShowcaseEditMode(false);
  setTip(copy().showcaseSaved, "ok");
}

async function loadAchievements(): Promise<void> {
  const service = createAchievementsService();
  setStatus(copy().loading, true);
  setTip("");
  try {
    const [catalog, earned, showcase] = await Promise.all([
      service.listAchievements(),
      service.listMyAchievements(),
      service.getMyShowcase()
    ]);
    if (isFailurePayload(catalog)) throw new Error(payloadErrorMessage(catalog));
    allAchievements = buildViewModels(
      catalog,
      normalizeOptionalUserPayload(earned),
      normalizeOptionalUserPayload(showcase)
    );
    selectedAchievementId = allAchievements[0]?.achievement.id || "";
    renderStats();
    renderShowcase();
    renderList();
    if (selectedAchievementId) selectAchievement(selectedAchievementId);
    setStatus(copy().loaded, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(copy().loadFailed, false);
    setTip(message, "err");
    renderStats();
    renderShowcase();
    renderList();
  }
}

function bindFilters(): void {
  document.querySelectorAll<HTMLButtonElement>(".achievement-filter").forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = (button.dataset.filter || "all") as FilterKey;
      document.querySelectorAll(".achievement-filter").forEach((node) => node.classList.remove("is-active"));
      button.classList.add("is-active");
      renderList();
    });
  });
}

export function bootstrapAchievementsPage(): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  applyStaticCopy();
  syncAchievementUserChip();
  bindFilters();
  byId("achievements-edit-showcase")?.addEventListener("click", () => setShowcaseEditMode(true));
  byId("achievements-cancel-showcase")?.addEventListener("click", () => {
    selectedShowcaseIds = allAchievements.filter((item) => item.showcase).map((item) => item.achievement.id).slice(0, 3);
    setShowcaseEditMode(false);
    renderShowcase();
  });
  byId("achievements-save-showcase")?.addEventListener("click", () => {
    void saveShowcase();
  });
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (!event.key || event.key === "2048_auth_nickname_v1" || event.key === "2048_auth_userId_v1") {
        syncAchievementUserChip();
      }
      if (!event.key || event.key === UI_LANGUAGE_KEY) {
        rerenderAchievementsPage();
      }
    });
    window.addEventListener("uilanguagechange", rerenderAchievementsPage);
  }
  void loadAchievements();
}
