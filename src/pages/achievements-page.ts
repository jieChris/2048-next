import {
  resolveHomeUserDisplayName
} from "../bootstrap/home-user-display";
import { groupAchievementFamilies } from "../services/achievement-families";
import { achievementIconMarkupFor } from "../services/achievement-icons";
import { createAchievementsService } from "../services/achievements";

type JsonRecord = Record<string, unknown>;
type FilterKey = "all" | "earned" | "locked" | "upgrading" | "complete" | "event" | "hidden" | "milestone" | "speedrun";
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
  sortOrder: number;
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

interface AchievementFamilyViewModel {
  key: string;
  seriesId: string;
  isSeries: boolean;
  items: AchievementViewModel[];
  earnedItems: AchievementViewModel[];
  representative: AchievementViewModel;
}

let allAchievements: AchievementViewModel[] = [];
let allAchievementFamilies: AchievementFamilyViewModel[] = [];
let currentFilter: FilterKey = "all";
let selectedFamilyKey = "";
let selectedTierAchievementId = "";
let showcaseEditMode = false;
let selectedShowcaseIds: string[] = [];

const UI_LANGUAGE_KEY = "ui_language_v1";
const EASTER_EGG_DISCOVERY_ACHIEVEMENT_ID = "easter_egg_breakout_discovered";
const LOST_PAGE_ACHIEVEMENT_ID = "lost_page_visited";

const ACHIEVEMENT_COPY: Record<
  AchievementPageLang,
  {
    pageTitle: string;
    title: string;
    subtitle: string;
    navGame: string;
    summaryTitle: string;
    showcaseTitle: string;
    showcaseCopy: string;
    editShowcase: string;
    selectingShowcase: string;
    saveShowcase: string;
    cancel: string;
    wallTitle: string;
    filterLabel: string;
    filters: Record<FilterKey, string>;
    statsTypes: string;
    statsLevels: string;
    statsLatest: string;
    loadFailed: string;
    emptySlot: (slot: number) => string;
    noMatches: string;
    unlocked: string;
    locked: string;
    noDescription: string;
    waiting: string;
    previewEarned: string;
    previewLocked: string;
    detailEmpty: string;
    detailStatus: string;
    detailEarned: string;
    detailNotEarned: string;
    detailEarnedAt: string;
    detailSource: string;
    detailTiers: (earned: number, total: number) => string;
    milestoneFamily: string;
    speedrunFamily: string;
    milestoneScope: string;
    speedrunScope: string;
    closeDetail: string;
    showcaseLimit: string;
    showcaseSaved: string;
    showcaseSaveFailed: string;
  }
> = {
  zh: {
    pageTitle: "2048 成就",
    title: "成就",
    subtitle: "查看已获得成就，并选择最多三个展示在个人资料中。",
    navGame: "返回游戏",
    summaryTitle: "收集进度",
    showcaseTitle: "展示成就",
    showcaseCopy: "最多展示三个已获得成就。",
    editShowcase: "编辑",
    selectingShowcase: "选择中",
    saveShowcase: "保存展示",
    cancel: "取消",
    wallTitle: "成就勋章墙",
    filterLabel: "成就筛选",
    filters: {
      all: "全部",
      earned: "已获得",
      locked: "未获得",
      upgrading: "可升级",
      complete: "已集齐",
      event: "活动",
      hidden: "隐藏",
      milestone: "里程碑",
      speedrun: "竞速"
    },
    statsTypes: "已获得类型",
    statsLevels: "已点亮等级",
    statsLatest: "最近获得",
    loadFailed: "加载失败",
    emptySlot: (slot) => "展示位 " + slot,
    noMatches: "暂无匹配成就。",
    unlocked: "已点亮",
    locked: "未点亮",
    noDescription: "暂无简介",
    waiting: "等待点亮",
    previewEarned: "已达成",
    previewLocked: "未达成",
    detailEmpty: "选择一个成就查看详情。",
    detailStatus: "状态",
    detailEarned: "已获得",
    detailNotEarned: "未获得",
    detailEarnedAt: "获得时间",
    detailSource: "来源",
    detailTiers: (earned, total) => "已完成" + earned + "/" + total,
    milestoneFamily: "里程碑",
    speedrunFamily: "竞速",
    milestoneScope: "在标准 4×4 无撤回的有效排位对局中，累计达到目标方块。",
    speedrunScope: "在标准 4×4 无撤回的有效排位对局中，按目标时间达到指定方块。",
    closeDetail: "关闭详情",
    showcaseLimit: "最多只能展示 3 个成就。",
    showcaseSaved: "展示成就已保存。",
    showcaseSaveFailed: "展示保存失败"
  },
  en: {
    pageTitle: "2048 Achievements",
    title: "Achievements",
    subtitle: "View earned achievements and choose up to three to show on your profile.",
    navGame: "Back to Game",
    summaryTitle: "Collection Progress",
    showcaseTitle: "Showcase",
    showcaseCopy: "Show up to three earned achievements.",
    editShowcase: "Edit",
    selectingShowcase: "Selecting",
    saveShowcase: "Save Showcase",
    cancel: "Cancel",
    wallTitle: "Medal Wall",
    filterLabel: "Achievement filters",
    filters: {
      all: "All",
      earned: "Unlocked",
      locked: "Locked",
      upgrading: "Upgradeable",
      complete: "Complete",
      event: "Events",
      hidden: "Hidden",
      milestone: "Milestones",
      speedrun: "Speedrun"
    },
    statsTypes: "Unlocked Types",
    statsLevels: "Unlocked Tiers",
    statsLatest: "Latest",
    loadFailed: "Load Failed",
    emptySlot: (slot) => "Slot " + slot,
    noMatches: "No matching achievements.",
    unlocked: "Unlocked",
    locked: "Locked",
    noDescription: "No description",
    waiting: "Waiting to unlock",
    previewEarned: "Completed",
    previewLocked: "Not completed",
    detailEmpty: "Select an achievement to view details.",
    detailStatus: "Status",
    detailEarned: "Unlocked",
    detailNotEarned: "Locked",
    detailEarnedAt: "Earned At",
    detailSource: "Source",
    detailTiers: (earned, total) => "Completed " + earned + "/" + total,
    milestoneFamily: "Milestone",
    speedrunFamily: "Speedrun",
    milestoneScope: "Reach the target tile across valid ranked Standard 4×4 No Undo games.",
    speedrunScope: "Reach the target tile within each threshold in valid ranked Standard 4×4 No Undo games.",
    closeDetail: "Close details",
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
  return date.toLocaleString(resolveAchievementPageLang() === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function formatStatDate(value: unknown): string {
  const text = toText(value).trim();
  if (!text) return "--";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  if (resolveAchievementPageLang() === "en") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return (date.getMonth() + 1) + "月" + date.getDate() + "日";
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
    sortOrder: Math.max(0, Math.floor(toNumber(record.sort_order || record.sortOrder, 0))),
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

function achievementSourceLabel(item: AchievementViewModel): string {
  if (!item.earned) return "--";
  const lang = resolveAchievementPageLang();
  if (isEasterEggDiscoveryAchievement(item.achievement)) {
    return lang === "en" ? "Leaderboard hidden easter egg" : "排行榜隐藏彩蛋";
  }
  if (item.achievement.id === LOST_PAGE_ACHIEVEMENT_ID) {
    return lang === "en" ? "Lost page visit" : "迷路页面访问";
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

function rebuildAchievementFamilies(): void {
  const grouped = groupAchievementFamilies(allAchievements.map((item) => ({
    ...item,
    id: item.achievement.id,
    seriesId: item.achievement.seriesId,
    level: item.achievement.level,
    sortOrder: item.achievement.sortOrder
  })));
  allAchievementFamilies = grouped.map((family) => {
    const items = family.items.map((item) => ({
      achievement: item.achievement,
      earned: item.earned,
      showcase: item.showcase
    }));
    const earnedItems = items.filter((item) => !!item.earned);
    return {
      key: family.key,
      seriesId: family.seriesId,
      isSeries: family.isSeries,
      items,
      earnedItems,
      representative: earnedItems.at(-1) || items[0]!
    };
  }).sort((left, right) => {
    if (!!left.earnedItems.length !== !!right.earnedItems.length) return left.earnedItems.length ? -1 : 1;
    return left.representative.achievement.sortOrder - right.representative.achievement.sortOrder ||
      familyName(left).localeCompare(familyName(right));
  });
  normalizeShowcaseSelection();
}

function findAchievementFamilyById(achievementId: string): AchievementFamilyViewModel | undefined {
  return allAchievementFamilies.find((family) =>
    family.items.some((item) => item.achievement.id === achievementId)
  );
}

function normalizeShowcaseSelection(): void {
  const familyKeys = new Set<string>();
  const normalized: string[] = [];
  for (const achievementId of selectedShowcaseIds) {
    const family = findAchievementFamilyById(achievementId);
    if (!family?.representative.earned || familyKeys.has(family.key)) continue;
    familyKeys.add(family.key);
    normalized.push(family.representative.achievement.id);
    if (normalized.length === 3) break;
  }
  selectedShowcaseIds = normalized;
  const selectedIds = new Set(normalized);
  allAchievements = allAchievements.map((item) => ({
    ...item,
    showcase: selectedIds.has(item.achievement.id)
  }));
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
  if (isHiddenAchievement(achievement)) return false;
  if (achievement.seriesId.startsWith("community-")) return true;
  return achievement.rules.some((rule) => ["event_rank", "manual_grant"].includes(toText(rule.type)));
}

function isSpeedrunAchievement(achievement: AchievementDefinition): boolean {
  if (achievement.seriesId.startsWith("speed-")) return true;
  return achievement.rules.some((rule) => toText(rule.type) === "max_tile_within_duration");
}

function familyName(family: AchievementFamilyViewModel): string {
  const currentCopy = copy();
  const target = family.seriesId.replace(/^(?:tile|speed)-/u, "");
  if (family.isSeries && isMilestoneAchievement(family.items[0]!.achievement)) {
    return target + " " + currentCopy.milestoneFamily;
  }
  if (family.isSeries && isSpeedrunAchievement(family.items[0]!.achievement)) {
    return target + " " + currentCopy.speedrunFamily;
  }
  return achievementName(family.representative.achievement);
}

function familyScope(family: AchievementFamilyViewModel): string {
  const currentCopy = copy();
  if (isMilestoneAchievement(family.items[0]!.achievement)) return currentCopy.milestoneScope;
  if (isSpeedrunAchievement(family.items[0]!.achievement)) return currentCopy.speedrunScope;
  return achievementDisplayDescription(family.representative.achievement) || currentCopy.noDescription;
}

function familyCardScope(family: AchievementFamilyViewModel): string {
  const lang = resolveAchievementPageLang();
  if (isMilestoneAchievement(family.items[0]!.achievement)) {
    return lang === "en" ? "Standard 4×4 No Undo ranked games." : "标准4×4无撤回排位，累计合成目标方块。";
  }
  if (isSpeedrunAchievement(family.items[0]!.achievement)) {
    return lang === "en" ? "Timed Standard 4×4 No Undo ranked games." : "标准4×4无撤回排位，限时合成目标方块。";
  }
  return familyScope(family);
}

function isFamilyReward(family: AchievementFamilyViewModel): boolean {
  return family.items.some((item) => isRewardAchievement(item.achievement));
}

function isFamilyMilestone(family: AchievementFamilyViewModel): boolean {
  return family.items.some((item) => isMilestoneAchievement(item.achievement));
}

function isFamilySpeedrun(family: AchievementFamilyViewModel): boolean {
  return family.items.some((item) => isSpeedrunAchievement(item.achievement));
}

function isFamilyHidden(family: AchievementFamilyViewModel): boolean {
  return family.items.some((item) => isHiddenAchievement(item.achievement));
}

function familyProgress(family: AchievementFamilyViewModel): string {
  const currentCopy = copy();
  if (!family.isSeries) return family.representative.earned ? currentCopy.unlocked : currentCopy.locked;
  return currentCopy.detailTiers(family.earnedItems.length, family.items.length);
}

function isShowcaseSelected(family: AchievementFamilyViewModel): boolean {
  return selectedShowcaseIds.some((id) => findAchievementFamilyById(id)?.key === family.key);
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
  setText(".achievements-header .palette-nav a[href='/']", currentCopy.navGame);
  setText(".achievements-summary-card h2", currentCopy.summaryTitle);
  setText(".achievements-showcase-card h2", currentCopy.showcaseTitle);
  setText(".achievements-showcase-card .panel-head p", currentCopy.showcaseCopy);
  setText(".achievements-wall-head h2", currentCopy.wallTitle);
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
  byId<HTMLButtonElement>("achievement-family-dialog-close")?.setAttribute("aria-label", currentCopy.closeDetail);
}

function rerenderAchievementsPage(): void {
  applyStaticCopy();
  syncAchievementUserChip();
  renderStats();
  renderShowcase();
  renderList();
  if (selectedFamilyKey) renderFamilyDialog();
}

function setTip(message: string, state: "ok" | "err" | "idle" = "idle"): void {
  const node = byId("achievements-tip");
  if (!node) return;
  node.textContent = message;
  if (state === "idle") node.removeAttribute("data-state");
  else node.setAttribute("data-state", state);
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
  if (!mount) return;
  const totalTypes = allAchievementFamilies.length;
  const earnedTypes = allAchievementFamilies.filter((family) => family.earnedItems.length > 0).length;
  const totalLevels = allAchievements.length;
  const earnedLevels = allAchievements.filter((item) => item.earned).length;
  const latest = allAchievements
    .map((item) => item.earned?.earnedAt || "")
    .filter(Boolean)
    .sort()
    .pop();
  mount.innerHTML = [
    [currentCopy.statsTypes, earnedTypes + "/" + totalTypes],
    [currentCopy.statsLevels, earnedLevels + "/" + totalLevels],
    [currentCopy.statsLatest, latest ? formatStatDate(latest) : "--"]
  ].map(([label, value]) =>
    '<div class="achievements-stat"><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(label) + "</span></div>"
  ).join("");
}

function renderShowcase(): void {
  const currentCopy = copy();
  const mount = byId("achievements-showcase");
  if (!mount) return;
  const picked = selectedShowcaseIds
    .map(findAchievementFamilyById)
    .filter((item): item is AchievementFamilyViewModel => !!item);
  const slots = [0, 1, 2].map((index) => {
    const family = picked[index];
    if (!family) return '<div class="achievement-showcase-slot is-empty">' + escapeHtml(currentCopy.emptySlot(index + 1)) + "</div>";
    const item = family.representative;
    return '<div class="achievement-showcase-slot">' +
      renderBadge(item.achievement, false) +
      '<div class="achievement-name">' + escapeHtml(familyName(family)) + "</div>" +
      '<p class="achievement-meta">' + escapeHtml(family.isSeries ? familyProgress(family) : formatDateTime(item.earned?.earnedAt)) + "</p>" +
    "</div>";
  });
  mount.innerHTML = slots.join("");
}

function hasEarnedHiddenAchievement(): boolean {
  return allAchievementFamilies.some((family) => family.earnedItems.length > 0 && isFamilyHidden(family));
}

function syncFilterButtons(): void {
  const hasHidden = hasEarnedHiddenAchievement();
  if (!hasHidden && currentFilter === "hidden") currentFilter = "all";
  document.querySelectorAll<HTMLButtonElement>(".achievement-filter").forEach((button) => {
    const filter = (button.dataset.filter || "all") as FilterKey;
    button.hidden = filter === "hidden" && !hasHidden;
    button.classList.toggle("is-active", filter === currentFilter);
  });
}

function matchFilter(family: AchievementFamilyViewModel): boolean {
  if (currentFilter === "earned") return family.earnedItems.length > 0;
  if (currentFilter === "locked") return family.earnedItems.length === 0;
  if (currentFilter === "upgrading") return family.isSeries && family.earnedItems.length > 0 && family.earnedItems.length < family.items.length;
  if (currentFilter === "complete") return family.isSeries && family.earnedItems.length === family.items.length;
  if (currentFilter === "event") return isFamilyReward(family);
  if (currentFilter === "hidden") return family.earnedItems.length > 0 && isFamilyHidden(family);
  if (currentFilter === "milestone") return isFamilyMilestone(family);
  if (currentFilter === "speedrun") return isFamilySpeedrun(family);
  return true;
}

function renderList(): void {
  const currentCopy = copy();
  const mount = byId("achievements-list");
  if (!mount) return;
  syncFilterButtons();
  const families = allAchievementFamilies.filter(matchFilter);
  if (!families.length) {
    mount.innerHTML = '<div class="achievement-detail-empty">' + escapeHtml(currentCopy.noMatches) + "</div>";
    return;
  }
  mount.innerHTML = families.map((family) => {
    const item = family.representative;
    const locked = !item.earned;
    const picked = isShowcaseSelected(family);
    return '<button class="achievement-family-card' +
      (locked ? " is-locked" : "") +
      (selectedFamilyKey === family.key ? " is-selected" : "") +
      (picked ? " is-showcase-picked" : "") +
      '" type="button" data-family-key="' + escapeHtml(family.key) + '" aria-haspopup="dialog"' +
      (showcaseEditMode && locked ? " disabled" : "") + ">" +
      '<span class="achievement-light-state">' + escapeHtml(familyProgress(family)) + "</span>" +
      '<span class="achievement-medal-face">' + renderBadge(item.achievement, locked) + "</span>" +
      '<span class="achievement-name">' + escapeHtml(familyName(family)) + "</span>" +
      '<span class="achievement-desc">' + escapeHtml(familyCardScope(family)) + "</span>" +
      '<span class="achievement-meta">' + (item.earned ? escapeHtml(formatDateTime(item.earned.earnedAt)) : currentCopy.waiting) + "</span>" +
    "</button>";
  }).join("");

  mount.querySelectorAll<HTMLButtonElement>(".achievement-family-card").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.familyKey || "";
      if (showcaseEditMode) {
        toggleShowcaseSelection(key);
        return;
      }
      selectAchievementFamily(key);
    });
  });
}

function renderTierTrack(family: AchievementFamilyViewModel): string {
  const currentCopy = copy();
  if (!family.isSeries) return "";
  return '<ol class="achievement-family-track" aria-label="' + escapeHtml(familyName(family)) + '">' + family.items.map((item) => {
    const earned = !!item.earned;
    const previewing = selectedTierAchievementId === item.achievement.id;
    const status = earned ? currentCopy.previewEarned : currentCopy.previewLocked;
    return '<li class="achievement-tier-item' + (earned ? " is-earned" : " is-locked") + '">' +
      '<button class="achievement-tier' + (earned ? " is-earned" : " is-locked") + (previewing ? " is-previewing" : "") +
      '" type="button" data-achievement-id="' + escapeHtml(item.achievement.id) + '" aria-label="' +
        escapeHtml(achievementName(item.achievement) + " · " + status) + '" aria-pressed="' + String(previewing) + '">' +
        '<span class="achievement-tier-icon">' + renderBadge(item.achievement, !earned) + "</span>" +
      "</button>" +
    "</li>";
  }).join("") + "</ol>";
}

function renderFamilyDialog(): void {
  const family = allAchievementFamilies.find((item) => item.key === selectedFamilyKey);
  const mount = byId("achievement-family-dialog-content");
  if (!family || !mount) return;
  const currentCopy = copy();
  const preview = family.items.find((item) => item.achievement.id === selectedTierAchievementId) || family.representative;
  const previewStatus = preview.earned ? currentCopy.previewEarned : currentCopy.previewLocked;
  mount.innerHTML =
    '<section class="achievement-fullscreen-preview">' +
      '<span class="achievement-family-hero-badge">' + renderBadge(preview.achievement, !preview.earned) + "</span>" +
      '<h2 id="achievement-family-dialog-title">' + escapeHtml(achievementName(preview.achievement)) + "</h2>" +
      '<p class="achievement-preview-status">' + escapeHtml(previewStatus) + "</p>" +
    "</section>" +
    '<section class="achievement-fullscreen-details">' +
      '<p>' + escapeHtml(achievementDisplayDescription(preview.achievement) || currentCopy.noDescription) + "</p>" +
      (!family.isSeries && preview.earned ? '<span>' + escapeHtml(currentCopy.detailSource + " · " + achievementSourceLabel(preview)) + "</span>" : "") +
    "</section>" +
    (family.isSeries ? '<section class="achievement-fullscreen-tiers">' + renderTierTrack(family) + "</section>" : "");
  mount.querySelectorAll<HTMLButtonElement>(".achievement-tier").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTierAchievementId = button.dataset.achievementId || "";
      renderFamilyDialog();
    });
  });
}

function selectAchievementFamily(key: string): void {
  const family = allAchievementFamilies.find((item) => item.key === key);
  if (!family) return;
  if (selectedFamilyKey !== key) selectedTierAchievementId = family.representative.achievement.id;
  selectedFamilyKey = key;
  renderFamilyDialog();
  const dialog = byId<HTMLDialogElement>("achievement-family-dialog");
  if (dialog && !dialog.open) dialog.showModal();
  renderList();
}

function toggleShowcaseSelection(key: string): void {
  const family = allAchievementFamilies.find((item) => item.key === key);
  if (!family?.representative.earned) return;
  if (isShowcaseSelected(family)) {
    selectedShowcaseIds = selectedShowcaseIds.filter((id) => findAchievementFamilyById(id)?.key !== key);
  } else if (selectedShowcaseIds.length < 3) {
    selectedShowcaseIds = [...selectedShowcaseIds, family.representative.achievement.id];
  } else {
    setTip(copy().showcaseLimit, "err");
  }
  normalizeShowcaseSelection();
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
  rebuildAchievementFamilies();
  setShowcaseEditMode(false);
  setTip(copy().showcaseSaved, "ok");
}

async function loadAchievements(): Promise<void> {
  const service = createAchievementsService();
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
    rebuildAchievementFamilies();
    selectedFamilyKey = "";
    renderStats();
    renderShowcase();
    renderList();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
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
    normalizeShowcaseSelection();
    setShowcaseEditMode(false);
    renderShowcase();
  });
  byId("achievements-save-showcase")?.addEventListener("click", () => {
    void saveShowcase();
  });
  byId("achievement-family-dialog-close")?.addEventListener("click", () => {
    byId<HTMLDialogElement>("achievement-family-dialog")?.close();
  });
  byId<HTMLDialogElement>("achievement-family-dialog")?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element) || target.closest("button, a, .achievement-family-hero-badge, h2, p, span")) return;
    (event.currentTarget as HTMLDialogElement).close();
  });
  byId<HTMLDialogElement>("achievement-family-dialog")?.addEventListener("close", () => {
    selectedFamilyKey = "";
    selectedTierAchievementId = "";
    renderList();
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
