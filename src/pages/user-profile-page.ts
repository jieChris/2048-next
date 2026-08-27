import { bindDisplayModeSync } from "../bootstrap/display-mode";
import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";
import { groupAchievementFamilies } from "../services/achievement-families";
import { achievementIconMarkupFor } from "../services/achievement-icons";
import { randomId } from "../utils/crypto-random";
import {
  buildApiBaseCandidates,
  createJsonApiClient,
  readAuthToken,
  type JsonApiClient,
  type JsonRecord
} from "../services/api-client";

type ProfileTab = "overview" | "performance" | "records" | "achievements";

interface LegacyProfileRuntime {
  refreshProfile?: () => Promise<boolean>;
  refreshRecords?: (resetPage?: boolean) => Promise<void>;
  getState?: () => unknown;
  formatModeLabel?: (modeKey: string, modeBucket?: string) => string;
  formatDate?: (value: unknown) => string;
  openRecord?: (recordId: string) => void;
}

interface LegacyProfileState {
  targetUserId: number;
  isOwnProfile: boolean;
  profile: JsonRecord;
  records: JsonRecord[];
  stats: {
    totalRecords: number;
    bestScore: number;
    bestTile: number;
    lastActive: string;
    byMode: JsonRecord[];
  };
  filters: JsonRecord;
}

interface EarnedAchievement {
  achievement: JsonRecord & { id: string };
  earnedAt: string;
  showcaseSlot: 1 | 2 | 3 | null;
}

type ProfileValue = string | number | boolean | JsonRecord | JsonRecord[] | null | undefined;

type UserProfileWindow = Window & { UserProfilePageRuntime?: LegacyProfileRuntime };

const PROFILE_COVERS = new Set(["tide", "sunset", "midnight", "forest", "plum"]);
const VALID_TABS = new Set<ProfileTab>(["overview", "performance", "records", "achievements"]);
const ACTIVE_MODERATION_STATUSES = new Set(["submitted", "ai_reviewing", "ai_pass", "manual_review", "failed_retryable"]);
const MODERATION_STATUS_COPY: Record<string, [string, string]> = {
  submitted: ["已提交", "Submitted"],
  ai_reviewing: ["自动审核中", "Automated review in progress"],
  ai_pass: ["自动审核通过，等待发布", "Automated review passed; awaiting publication"],
  ai_reject: ["自动审核未通过", "Automated review did not pass"],
  manual_review: ["等待人工复核", "Awaiting manual review"],
  failed_retryable: ["审核暂时失败，等待重试", "Review temporarily failed; awaiting retry"],
  approved: ["已通过", "Approved"],
  rejected: ["已拒绝", "Rejected"]
};
const SAFE_MODERATION_REASON_COPY: Record<string, [string, string]> = {
  safe: ["内容符合公开要求", "Content meets publication requirements"],
  sexual: ["涉及不适宜的性内容", "Contains inappropriate sexual content"],
  violence: ["涉及暴力内容", "Contains violent content"],
  hate: ["涉及仇恨或歧视内容", "Contains hateful or discriminatory content"],
  illegal: ["涉及违法或受限内容", "Contains illegal or restricted content"],
  self_harm: ["涉及自伤内容", "Contains self-harm content"],
  personal_data: ["包含不应公开的个人信息", "Contains personal information that should not be public"],
  spam: ["疑似垃圾或推广内容", "Appears to be spam or promotional content"],
  other: ["内容需要进一步复核", "Content needs further review"],
  admin_approved: ["人工复核通过", "Approved by manual review"],
  admin_rejected: ["人工复核未通过", "Rejected by manual review"],
  admin_retry: ["已安排重新审核", "A new review has been queued"],
  moderation_sla_exceeded: ["自动审核超时，已转人工复核", "Automated review timed out and was sent to manual review"],
  policy_version_mismatch: ["审核策略已更新，等待人工复核", "The review policy changed; awaiting manual review"],
  provider_disabled: ["自动审核暂不可用，等待人工复核", "Automated review is unavailable; awaiting manual review"],
  provider_unavailable: ["审核服务暂不可用", "The review service is temporarily unavailable"],
  provider_budget_exceeded: ["自动审核繁忙，等待人工复核", "Automated review is busy; awaiting manual review"],
  provider_timeout: ["审核服务响应超时", "The review service timed out"],
  provider_rate_limited: ["审核服务繁忙，等待重试", "The review service is busy; awaiting retry"],
  provider_invalid_response: ["审核结果异常，等待复核", "The review result was invalid; awaiting review"],
  provider_rejected_request: ["审核请求未被服务接受", "The review request was not accepted"]
};

let apiClient: JsonApiClient | null = null;
let state: LegacyProfileState = emptyState();
let recentRecords: JsonRecord[] = [];
let earnedAchievements: EarnedAchievement[] = [];
let achievementsUserId = -1;
let editModeEnabled = false;
let moderationHistory: JsonRecord[] = [];
let moderationHistoryState: "idle" | "loading" | "ready" | "error" = "idle";
let bioBlockedUntil = "";
let bioSaving = false;
let bioNotice: { key: string; value?: string; kind?: "error" | "ok" } | null = null;
let avatarSubmission: JsonRecord | null = null;
let avatarSubmissionState: "idle" | "loading" | "ready" | "error" = "idle";
let avatarNextAllowedAt = "";
let avatarSaving = false;
let avatarPreviewUrl = "";
let avatarNotice: { key: string; value?: string; kind?: "error" | "ok" } | null = null;
let backgroundCatalog: JsonRecord[] = [];
let backgroundCatalogDefaultSceneId = "";
let backgroundCatalogLoaded = false;
let backgroundSaving = false;
let renderedBackgroundKey = "";

function emptyState(): LegacyProfileState {
  return {
    targetUserId: 0,
    isOwnProfile: false,
    profile: {},
    records: [],
    stats: { totalRecords: 0, bestScore: 0, bestTile: 0, lastActive: "", byMode: [] },
    filters: {}
  };
}

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(record).filter((item) => Object.keys(item).length > 0) : [];
}

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function integer(value: unknown): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function language(): "zh" | "en" {
  const storageLike = resolveStorageByName({
    // SAFETY: the helper only reads the named Web Storage property from Window.
    windowLike: window as unknown as Record<string, unknown>,
    storageName: "localStorage"
  });
  return String(safeReadStorageItem({ storageLike, key: "ui_language_v1" }) || "").toLowerCase().startsWith("en") ? "en" : "zh";
}

function localized(source: JsonRecord, key: "name" | "description"): string {
  const localizedValues = record(source[`${key}_i18n`]);
  const lang = language();
  return text(localizedValues[lang]) || text(source[key]);
}

function profileValue(profile: JsonRecord, snake: string, camel: string): ProfileValue {
  return (profile[snake] as ProfileValue | undefined) ?? (profile[camel] as ProfileValue | undefined);
}

function legacyRuntime(): LegacyProfileRuntime {
  return (window as UserProfileWindow).UserProfilePageRuntime || {};
}

function modeLabel(modeKey: unknown, modeBucket?: unknown): string {
  const runtimeLabel = legacyRuntime().formatModeLabel?.(text(modeKey), text(modeBucket));
  return text(runtimeLabel) || text(modeKey) || text(modeBucket) || "--";
}

function formatNumber(value: unknown): string {
  const formatted = new Intl.NumberFormat(language() === "en" ? "en-US" : "zh-CN").format(integer(value));
  return language() === "zh" ? formatted.replace(/,/g, " ") : formatted;
}

function formatDate(value: unknown): string {
  return legacyRuntime().formatDate?.(value) || text(value) || "--";
}

function formatDuration(value: unknown): string {
  const ms = integer(value);
  if (!ms) return "--";
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function initials(nickname: string): string {
  return Array.from(nickname || "--").slice(0, 2).join("");
}

function setAvatar(host: HTMLElement | null, avatarUrl: string, nickname: string): void {
  if (!host) return;
  host.replaceChildren();
  if (!avatarUrl) {
    host.textContent = initials(nickname);
    return;
  }
  const image = document.createElement("img");
  image.src = avatarUrl;
  image.alt = language() === "en" ? `${nickname}'s avatar` : `${nickname}的头像`;
  image.addEventListener("error", () => {
    host.replaceChildren();
    host.textContent = initials(nickname);
  }, { once: true });
  host.appendChild(image);
}

function joinedText(createdAt: unknown): string {
  const timestamp = Date.parse(text(createdAt));
  if (!Number.isFinite(timestamp)) return language() === "en" ? "Joined 2048 Next" : "加入 2048 Next";
  const days = Math.max(1, Math.floor((Date.now() - timestamp) / 86_400_000) + 1);
  return language() === "en" ? `Day ${days} on 2048 Next` : `加入 2048 Next 第 ${days} 天`;
}

function normalizeState(value: unknown): LegacyProfileState {
  const source = record(value);
  const stats = record(source.stats);
  return {
    targetUserId: integer(source.targetUserId),
    isOwnProfile: source.isOwnProfile === true,
    profile: record(source.profile),
    records: records(source.records),
    stats: {
      totalRecords: integer(stats.totalRecords),
      bestScore: integer(stats.bestScore),
      bestTile: integer(stats.bestTile),
      lastActive: text(stats.lastActive),
      byMode: records(stats.byMode)
    },
    filters: record(source.filters)
  };
}

function filtersAreOverviewDefault(filters: JsonRecord): boolean {
  return text(filters.modeKey || "all") === "all"
    && text(filters.modeFamily || "all") === "all"
    && text(filters.undo || "all") === "all"
    && text(filters.status || "active") === "active"
    && text(filters.sortBy || "time") === "time"
    && text(filters.order || "desc") === "desc";
}

function syncLegacyState(raw: unknown): void {
  const next = normalizeState(raw);
  state = next;
  if (filtersAreOverviewDefault(next.filters)) recentRecords = next.records.slice(0, 3);
  renderProfile();
  renderStatsContent();
  if (next.targetUserId >= 0 && achievementsUserId !== next.targetUserId) void loadAchievements(next.targetUserId);
}

function syncEditModeUi(): void {
  if (!state.isOwnProfile) editModeEnabled = false;
  const en = language() === "en";
  const editModeButton = byId<HTMLButtonElement>("user-nav-edit-mode");
  const canEdit = state.isOwnProfile;
  if (editModeButton) {
    editModeButton.hidden = !canEdit;
    editModeButton.setAttribute("aria-pressed", editModeEnabled ? "true" : "false");
    editModeButton.textContent = editModeEnabled
      ? (en ? "Exit edit mode" : "退出编辑模式")
      : (en ? "Enter edit mode" : "进入编辑模式");
  }
  document.body?.toggleAttribute("data-user-edit-mode", editModeEnabled && canEdit);
  const featuredEdit = byId<HTMLButtonElement>("user-featured-edit");
  const wallLink = byId<HTMLAnchorElement>("user-showcase-wall-link");
  const avatarEditor = byId<HTMLElement>("user-profile-avatar-editor");
  const bioEditor = byId<HTMLElement>("user-profile-bio-editor");
  const backgroundEditor = byId<HTMLElement>("user-profile-background-editor");
  if (featuredEdit) featuredEdit.hidden = !(canEdit && editModeEnabled);
  if (wallLink) wallLink.hidden = true;
  if (avatarEditor) avatarEditor.hidden = !(canEdit && editModeEnabled);
  if (bioEditor) bioEditor.hidden = !(canEdit && editModeEnabled);
  if (backgroundEditor) backgroundEditor.hidden = !(canEdit && editModeEnabled);
}

function backgroundVariant(): "day" | "night" {
  return document.documentElement.getAttribute("data-night-background") === "1" ? "night" : "day";
}

function backgroundUrl(value: unknown): string {
  const url = text(value);
  return url.startsWith("/api/") || url.startsWith("/images/") ? url : "";
}

const PROFILE_BACKGROUND_IMAGE_PROPERTIES = [
  "--profile-cover-sky-image",
  "--profile-cover-city-image",
  "--profile-cover-foreground-image"
] as const;

function resetProfileBackgroundLayers(cover = byId<HTMLElement>("user-profile-cover")): void {
  PROFILE_BACKGROUND_IMAGE_PROPERTIES.forEach((name) => cover?.style.removeProperty(name));
  cover?.removeAttribute("data-background-assets-ready");
}

function preloadProfileBackground(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    const timer = window.setTimeout(() => resolve(false), 10_000);
    const finish = (loaded: boolean) => {
      window.clearTimeout(timer);
      resolve(loaded);
    };
    image.addEventListener("load", () => finish(true), { once: true });
    image.addEventListener("error", () => finish(false), { once: true });
    image.src = url;
  });
}

async function loadProfileBackgroundLayers(sceneId: string): Promise<void> {
  if (!apiClient) return;
  const variant = backgroundVariant();
  const key = `${sceneId || "default"}:${variant}`;
  if (key === renderedBackgroundKey) return;
  renderedBackgroundKey = key;
  resetProfileBackgroundLayers();
  const result = await apiClient.request(`/profile-backgrounds/${encodeURIComponent(sceneId || "default")}/layers?variant=${variant}`);
  if (renderedBackgroundKey !== key) return;
  if (!result.success) {
    resetProfileBackgroundLayers();
    renderedBackgroundKey = "";
    return;
  }
  const layers = record(record(result.data).layers);
  const cover = byId<HTMLElement>("user-profile-cover");
  const values: Array<[string, string]> = [
    ["--profile-cover-sky-image", backgroundUrl(layers.sky)],
    ["--profile-cover-city-image", backgroundUrl(layers.city)],
    ["--profile-cover-foreground-image", backgroundUrl(layers.foreground)]
  ];
  if (!cover || values.some(([, value]) => !value)) {
    resetProfileBackgroundLayers(cover);
    renderedBackgroundKey = "";
    return;
  }
  const loaded = await Promise.all(values.map(([, value]) => preloadProfileBackground(value)));
  if (renderedBackgroundKey !== key) return;
  if (loaded.some((ready) => !ready)) {
    resetProfileBackgroundLayers(cover);
    renderedBackgroundKey = "";
    return;
  }
  values.forEach(([name, value]) => cover.style.setProperty(name, `url(${JSON.stringify(value)})`));
  cover.setAttribute("data-background-assets-ready", "1");
}

function renderProfile(): void {
  const profile = state.profile;
  if (!Object.keys(profile).length) return;
  const nickname = text(profile.nickname) || "--";
  const bio = text(profileValue(profile, "profile_bio", "profileBio"));
  const sceneId = text(profileValue(profile, "background_scene_id", "backgroundSceneId"));
  const cover = text(profileValue(profile, "profile_cover", "profileCover")) || (sceneId === "default" ? "tide" : sceneId);
  const avatarUrl = text(profileValue(profile, "avatar_url", "avatarUrl"));
  const createdAt = profileValue(profile, "created_at", "createdAt");
  byId("user-profile-cover")?.setAttribute("data-cover", PROFILE_COVERS.has(cover) ? cover : "tide");
  void loadProfileBackgroundLayers(sceneId || "default");
  byId("user-value-name")!.textContent = nickname;
  byId("user-profile-bio")!.textContent = bio || (language() === "en" ? "This player has not added a bio yet." : "这个玩家还没有填写简介。");
  byId("user-profile-about")!.textContent = bio || (language() === "en" ? "This player has not added a bio yet." : "这个玩家还没有填写简介。");
  byId("user-profile-joined")!.textContent = joinedText(createdAt);
  setAvatar(byId("user-profile-avatar"), avatarUrl, nickname);
  syncEditModeUi();
  renderFeaturedModes();
}

function featuredModeKeys(): string[] {
  const raw = profileValue(state.profile, "featured_mode_keys", "featuredModeKeys");
  return Array.isArray(raw) ? raw.map(text).filter(Boolean).slice(0, 3) : [];
}

function statForMode(modeKey: string): JsonRecord {
  return state.stats.byMode.find((item) => text(item.mode_key) === modeKey) || {};
}

function emptyMessage(host: HTMLElement | null, message: string): void {
  if (!host) return;
  const empty = document.createElement("div");
  empty.className = "user-profile-empty";
  empty.textContent = message;
  host.replaceChildren(empty);
}

function renderFeaturedModes(): void {
  const host = byId("user-featured-modes");
  if (!host) return;
  const keys = featuredModeKeys();
  if (!keys.length) {
    emptyMessage(host, language() === "en" ? "No featured modes selected." : "尚未设置代表模式。");
    return;
  }
  host.replaceChildren(...keys.map((modeKey) => {
    const stats = statForMode(modeKey);
    const card = document.createElement("article");
    card.className = "user-featured-card";
    const title = document.createElement("h3");
    title.textContent = modeLabel(modeKey, stats.mode_bucket);
    const games = document.createElement("strong");
    games.textContent = formatNumber(stats.record_count);
    const gamesLabel = document.createElement("span");
    gamesLabel.textContent = language() === "en" ? "games" : "局游戏";
    const metrics = document.createElement("div");
    metrics.className = "user-featured-metrics";
    metrics.append(metric(language() === "en" ? "Best score" : "最高分", stats.best_score), metric(language() === "en" ? "Best tile" : "最大方块", stats.best_tile));
    card.append(title, games, gamesLabel, metrics);
    return card;
  }));
}

function metric(label: string, value: unknown): HTMLElement {
  const host = document.createElement("span");
  host.textContent = label;
  const strong = document.createElement("b");
  strong.textContent = formatNumber(value);
  host.appendChild(strong);
  return host;
}

function renderStatsContent(): void {
  byId("user-profile-mode-count")!.textContent = formatNumber(state.stats.byMode.length);
  renderPerformance();
  renderRecentRecords();
  renderFeaturedModes();
}

function renderPerformance(): void {
  const host = byId("user-performance-grid");
  if (!host) return;
  const modes = state.stats.byMode.slice().sort((left, right) => integer(right.record_count) - integer(left.record_count));
  if (!modes.length) {
    emptyMessage(host, language() === "en" ? "No mode results yet." : "暂无模式成绩。");
    return;
  }
  host.replaceChildren(...modes.map((stats) => {
    const card = document.createElement("article");
    card.className = "user-performance-card";
    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = modeLabel(stats.mode_key, stats.mode_bucket);
    const detail = document.createElement("p");
    const fastest2048 = formatDuration(stats.fastest_2048_ms);
    detail.textContent = language() === "en"
      ? `Best tile ${formatNumber(stats.best_tile)} · Fastest 2048 merge: ${fastest2048} · ${formatNumber(stats.record_count)} games`
      : `最大方块 ${formatNumber(stats.best_tile)} · 合成2048最快时间：${fastest2048} · ${formatNumber(stats.record_count)} 局`;
    copy.append(title, detail);
    const highlight = document.createElement("div");
    highlight.className = "user-performance-highlight";
    const highlightLabel = document.createElement("span");
    highlightLabel.textContent = language() === "en" ? "Best score" : "最高分";
    const bestScore = document.createElement("strong");
    bestScore.textContent = formatNumber(stats.best_score);
    highlight.append(highlightLabel, bestScore);
    card.append(copy, highlight);
    return card;
  }));
}

function renderRecentRecords(): void {
  const host = byId("user-recent-records");
  if (!host) return;
  if (!recentRecords.length) {
    emptyMessage(host, language() === "en" ? "No game records yet." : "暂无游戏记录。");
    return;
  }
  host.replaceChildren(...recentRecords.map((item) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "user-recent-record";
    const mode = document.createElement("strong");
    mode.textContent = modeLabel(item.mode_key, item.mode_bucket);
    const score = document.createElement("span");
    score.textContent = language() === "en" ? `${formatNumber(item.score)} pts` : `${formatNumber(item.score)} 分`;
    const tile = document.createElement("span");
    tile.textContent = language() === "en" ? `Tile ${formatNumber(item.best_tile)}` : `方块 ${formatNumber(item.best_tile)}`;
    const date = document.createElement("span");
    date.textContent = formatDate(item.ended_at || item.created_at);
    const action = document.createElement("em");
    action.textContent = language() === "en" ? "Replay →" : "查看回放 →";
    row.append(mode, score, tile, date, action);
    row.addEventListener("click", () => {
      activateTab("records");
      legacyRuntime().openRecord?.(text(item.id));
      byId("user-record-list")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return row;
  }));
}

function normalizeAchievements(value: unknown): EarnedAchievement[] {
  return records(value).map((item) => {
    const achievement = record(item.achievement) as JsonRecord & { id: string };
    achievement.id = text(achievement.id);
    const rawSlot = integer(item.showcase_slot);
    return {
      achievement,
      earnedAt: text(item.earned_at),
      showcaseSlot: rawSlot >= 1 && rawSlot <= 3 ? rawSlot as 1 | 2 | 3 : null
    };
  }).filter((item) => Boolean(item.achievement.id));
}

async function loadAchievements(userId: number): Promise<void> {
  achievementsUserId = userId;
  const result = await apiClient?.request(`/user/${encodeURIComponent(String(userId))}/achievements`, { method: "GET" });
  if (achievementsUserId !== userId) return;
  if (!result?.success || !Array.isArray(result.data)) {
    earnedAchievements = [];
    renderAchievements(language() === "en" ? "Achievements could not be loaded." : "成就加载失败。");
    return;
  }
  earnedAchievements = normalizeAchievements(result.data);
  renderAchievements();
}

function renderAchievementIcon(host: HTMLElement, achievement: JsonRecord): void {
  const markup = achievementIconMarkupFor(achievement);
  if (markup) {
    // SAFETY: achievementIconMarkupFor returns allowlisted static SVG markup; parse it as XML before attaching it.
    const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
    const svg = parsed.documentElement;
    if (svg?.localName === "svg") {
      host.replaceChildren(document.importNode(svg, true));
      return;
    }
  }
  const fallback = document.createElement("span");
  fallback.className = "user-showcase-empty";
  fallback.textContent = initials(localized(achievement, "name"));
  host.appendChild(fallback);
}

function renderAchievements(errorMessage = ""): void {
  const count = byId("user-profile-achievement-count");
  if (count) count.textContent = errorMessage ? "--" : formatNumber(earnedAchievements.length);
  const wall = byId("user-achievement-grid");
  if (wall) {
    if (errorMessage || !earnedAchievements.length) {
      emptyMessage(wall, errorMessage || (language() === "en" ? "No achievements earned yet." : "暂未获得成就。"));
    } else {
      const sortable = earnedAchievements.map((entry) => ({ ...entry.achievement, entry }));
      const ordered = groupAchievementFamilies(sortable).flatMap((family) => family.items).map((item) => item.entry);
      wall.replaceChildren(...ordered.map((entry) => {
        const card = document.createElement("article");
        card.className = "user-achievement-card";
        renderAchievementIcon(card, entry.achievement);
        const title = document.createElement("h3");
        title.textContent = localized(entry.achievement, "name");
        const description = document.createElement("p");
        description.textContent = localized(entry.achievement, "description");
        const earnedAt = document.createElement("time");
        earnedAt.dateTime = entry.earnedAt;
        earnedAt.textContent = language() === "en" ? `Earned ${formatDate(entry.earnedAt)}` : `获得于 ${formatDate(entry.earnedAt)}`;
        card.append(title, description, earnedAt);
        return card;
      }));
    }
  }
  const showcase = byId("user-profile-showcase");
  if (!showcase) return;
  const bySlot = new Map(earnedAchievements.filter((item) => item.showcaseSlot).map((item) => [item.showcaseSlot, item]));
  showcase.replaceChildren(...([1, 2, 3] as const).map((slot) => {
    const entry = bySlot.get(slot);
    if (!entry) {
      const empty = document.createElement("span");
      empty.className = "user-showcase-empty";
      empty.textContent = language() === "en" ? `Slot ${slot}` : `展示位 ${slot}`;
      return empty;
    }
    const medal = document.createElement("span");
    medal.className = "user-showcase-medal";
    medal.title = `${language() === "en" ? "Slot" : "展示位"} ${slot}：${localized(entry.achievement, "name")}`;
    medal.dataset.achievementId = entry.achievement.id;
    renderAchievementIcon(medal, entry.achievement);
    return medal;
  }));
}

function activateTab(tab: ProfileTab): void {
  document.querySelectorAll<HTMLButtonElement>("[data-user-tab]").forEach((button) => {
    const active = button.dataset.userTab === tab;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll<HTMLElement>("[data-user-panel]").forEach((panel) => {
    const active = panel.dataset.userPanel === tab;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
  history.replaceState(null, "", `${location.pathname}${location.search}#${tab}`);
}

function openDialog(id: string): void {
  const dialog = byId<HTMLDialogElement>(id);
  if (dialog && !dialog.open) dialog.showModal();
}

function closeDialog(id: string): void {
  byId<HTMLDialogElement>(id)?.close();
}

function bindProfileCoverMotion(): void {
  const cover = byId<HTMLElement>("user-profile-cover");
  if (!cover || cover.dataset.motionBound === "1") return;
  cover.dataset.motionBound = "1";

  const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let pendingX = 0;
  let pendingY = 0;

  const flush = (): void => {
    frame = 0;
    const x = pendingX;
    const y = pendingY;
    cover.style.setProperty("--profile-cover-sky-x", `${(-x * 1.4).toFixed(2)}px`);
    cover.style.setProperty("--profile-cover-sky-y", `${(-y * 1.1).toFixed(2)}px`);
    cover.style.setProperty("--profile-cover-glow-x", `${(x * 3).toFixed(2)}px`);
    cover.style.setProperty("--profile-cover-glow-y", `${(y * 1.8).toFixed(2)}px`);
    cover.style.setProperty("--profile-cover-city-x", `${(x * 2.2).toFixed(2)}px`);
    cover.style.setProperty("--profile-cover-city-y", `${(y * 0.8).toFixed(2)}px`);
    cover.style.setProperty("--profile-cover-foreground-x", `${(x * 4.2).toFixed(2)}px`);
    cover.style.setProperty("--profile-cover-foreground-y", `${(y * 1.8).toFixed(2)}px`);
    cover.style.setProperty("--profile-cover-light-x", `${(-x * 0.55).toFixed(2)}px`);
    cover.style.setProperty("--profile-cover-light-y", `${(-y * 0.45).toFixed(2)}px`);
  };

  const schedule = (): void => {
    if (!frame) frame = window.requestAnimationFrame(flush);
  };

  const reset = (): void => {
    pendingX = 0;
    pendingY = 0;
    schedule();
  };

  cover.addEventListener("pointermove", (event) => {
    if (!hoverQuery.matches || reducedMotionQuery.matches || (event.pointerType && event.pointerType !== "mouse")) {
      reset();
      return;
    }
    const rect = cover.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const normalizedX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
    const normalizedY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
    pendingX = normalizedX * 6;
    pendingY = normalizedY * 4;
    schedule();
  });
  cover.addEventListener("pointerleave", reset);
  cover.addEventListener("pointercancel", reset);
}

function setDialogStatus(id: string, message: string, kind: "" | "error" | "ok" = ""): void {
  const host = byId(id);
  if (!host) return;
  host.textContent = message;
  host.classList.toggle("is-error", kind === "error");
  host.classList.toggle("is-ok", kind === "ok");
}

function statusCopy(status: string): string {
  const copy = MODERATION_STATUS_COPY[status];
  return copy ? copy[language() === "en" ? 1 : 0] : (language() === "en" ? "Status unavailable" : "状态暂不可用");
}

function reasonCopy(reasonCode: unknown): string {
  const copy = SAFE_MODERATION_REASON_COPY[text(reasonCode)];
  return copy ? copy[language() === "en" ? 1 : 0] : "";
}

function bioNoticeCopy(): string {
  if (!bioNotice) return "";
  const en = language() === "en";
  const value = bioNotice.value || "";
  const copies: Record<string, [string, string]> = {
    too_long: ["简介不能超过 150 个字符。", "Bio must be at most 150 characters."],
    saving: ["正在提交审核…", "Submitting for review…"],
    submitted: ["已提交审核。当前公开简介保持不变，审核通过后刷新页面即可看到。", "Submitted for review. Your public bio stays unchanged; refresh after approval to see it."],
    queued: ["已提交审核，正在排队中。当前公开简介保持不变。", "Submitted for review and queued. Your public bio stays unchanged."],
    pending: ["已有简介正在审核，请等待完成后再提交。", "Another bio is being reviewed. Please wait for it to finish."],
    rate_limited: [`提交次数已达上限，可在 ${value} 后重试。`, `Submission limit reached. Try again after ${value}.`],
    blocked: [`简介编辑暂时禁用至 ${value}。`, `Bio editing is disabled until ${value}.`],
    conflict: ["主页已在其他位置更新，请刷新页面后重试。", "The profile changed elsewhere. Refresh the page and try again."],
    unavailable: ["审核服务暂不可用，当前公开简介未更改，请稍后重试。", "The review service is unavailable. Your public bio was not changed; try again later."],
    validation: ["简介无法提交，请检查长度后重试。", "The bio could not be submitted. Check its length and try again."],
    unauthorized: ["登录状态已失效，请重新登录后再试。", "Your session expired. Sign in and try again."],
    network: ["网络请求失败，当前公开简介未更改，请稍后重试。", "The network request failed. Your public bio was not changed; try again later."]
  };
  return (copies[bioNotice.key] || copies.network)[en ? 1 : 0];
}

function renderBioNotice(): void {
  setDialogStatus("user-profile-bio-status", bioNoticeCopy(), bioNotice?.kind || "");
}

function hasActiveModeration(): boolean {
  return moderationHistory.some((item) => ACTIVE_MODERATION_STATUSES.has(text(item.status)));
}

function isBioBlocked(): boolean {
  const timestamp = Date.parse(bioBlockedUntil);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function syncBioInputState(): void {
  const input = byId<HTMLTextAreaElement>("user-profile-bio-input");
  const button = byId<HTMLButtonElement>("user-profile-bio-save");
  if (!input || !button) return;
  const profileBio = input.value.trim();
  const count = Array.from(profileBio).length;
  const counter = byId("user-profile-bio-count");
  if (counter) counter.textContent = `${count} / 150`;
  button.disabled = bioSaving || moderationHistoryState === "loading" || count > 150 || isBioBlocked() || hasActiveModeration();
}

function renderModerationHistory(): void {
  const host = byId("user-profile-moderation-history");
  const blocked = byId("user-profile-bio-blocked");
  if (!host || !blocked) return;
  blocked.hidden = !isBioBlocked();
  blocked.textContent = isBioBlocked()
    ? (language() === "en" ? `Bio editing is disabled until ${formatDate(bioBlockedUntil)}.` : `简介编辑暂时禁用至 ${formatDate(bioBlockedUntil)}。`)
    : "";
  if (moderationHistoryState === "loading") {
    emptyMessage(host, language() === "en" ? "Loading review history…" : "正在读取审核记录…");
  } else if (moderationHistoryState === "error") {
    emptyMessage(host, language() === "en" ? "Review history could not be loaded." : "审核记录加载失败，请稍后重试。");
  } else if (moderationHistory.length) {
    host.replaceChildren(...moderationHistory.map((item) => {
      const row = document.createElement("article");
      row.className = "user-profile-moderation-item";
      const heading = document.createElement("div");
      const status = document.createElement("strong");
      status.textContent = statusCopy(text(item.status));
      const time = document.createElement("time");
      const submittedAt = text(item.submitted_at);
      time.dateTime = submittedAt;
      time.textContent = formatDate(submittedAt);
      heading.append(status, time);
      row.appendChild(heading);
      const safeReason = reasonCopy(profileValue(item, "reason_code", "reasonCode"));
      if (safeReason) {
        const reason = document.createElement("p");
        reason.textContent = safeReason;
        row.appendChild(reason);
      }
      return row;
    }));
  } else {
    emptyMessage(host, language() === "en" ? "No bio review submissions yet." : "还没有简介审核记录。");
  }
  syncBioInputState();
}

async function loadModerationHistory(): Promise<void> {
  if (!apiClient || !state.isOwnProfile) return;
  moderationHistoryState = "loading";
  renderModerationHistory();
  const result = await apiClient.request("/user/me/moderation-submissions?limit=20", { method: "GET" });
  if (!state.isOwnProfile) return;
  if (!result.success || !Array.isArray(result.data)) {
    moderationHistoryState = "error";
  } else {
    moderationHistory = records(result.data);
    bioBlockedUntil = text(result.bio_blocked_until);
    moderationHistoryState = "ready";
  }
  renderModerationHistory();
}

function prepareBioEditor(): void {
  const input = byId<HTMLTextAreaElement>("user-profile-bio-input");
  if (!input) return;
  input.value = text(profileValue(state.profile, "profile_bio", "profileBio"));
  bioNotice = null;
  renderBioNotice();
  syncBioInputState();
  void loadModerationHistory();
}

function avatarNoticeCopy(): string {
  if (!avatarNotice) return "";
  const en = language() === "en";
  const value = avatarNotice.value || "";
  const copies: Record<string, [string, string]> = {
    invalid_type: ["请选择 JPEG、PNG 或 WebP 图片。", "Choose a JPEG, PNG, or WebP image."],
    too_large: ["头像文件不能超过 200 KB。", "The avatar file must not exceed 200 KB."],
    saving: ["正在处理并提交头像…", "Processing and submitting the avatar…"],
    submitted: ["头像已提交审核。审核通过前继续显示当前头像。", "Avatar submitted for review. Your current avatar remains visible until approval."],
    pending: ["已有头像正在审核，请等待完成。", "Another avatar is already under review."],
    rate_limited: [`每 7 天最多上传一次，可在 ${value} 后重试。`, `You can upload once every 7 days. Try again after ${value}.`],
    conflict: ["头像状态已变化，请刷新页面后重试。", "The avatar state changed. Refresh and try again."],
    unavailable: ["头像审核暂不可用，当前头像未更改。", "Avatar review is unavailable. Your current avatar was not changed."],
    validation: ["头像未通过文件校验，请检查格式、尺寸和内容。", "The avatar failed file validation. Check its format, dimensions, and content."],
    unauthorized: ["登录状态已失效，请重新登录后再试。", "Your session expired. Sign in and try again."],
    network: ["头像上传失败，当前头像未更改，请稍后重试。", "Avatar upload failed. Your current avatar was not changed; try again later."]
  };
  return (copies[avatarNotice.key] || copies.network)[en ? 1 : 0];
}

function avatarIsActive(): boolean {
  return ACTIVE_MODERATION_STATUSES.has(text(profileValue(avatarSubmission || {}, "moderation_status", "moderationStatus")));
}

function avatarQuotaActive(): boolean {
  const timestamp = Date.parse(avatarNextAllowedAt);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function clearAvatarPreview(): void {
  if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
  avatarPreviewUrl = "";
  const preview = byId<HTMLImageElement>("user-profile-avatar-preview");
  if (!preview) return;
  preview.removeAttribute("src");
  preview.hidden = true;
}

function selectedAvatarFile(): File | null {
  return byId<HTMLInputElement>("user-profile-avatar-input")?.files?.[0] || null;
}

function avatarFileProblem(file: File | null): "invalid_type" | "too_large" | "" {
  if (!file) return "";
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) return "invalid_type";
  return file.size > 200 * 1024 ? "too_large" : "";
}

function syncAvatarInputState(): void {
  const input = byId<HTMLInputElement>("user-profile-avatar-input");
  const button = byId<HTMLButtonElement>("user-profile-avatar-save");
  if (!input || !button) return;
  const file = selectedAvatarFile();
  const problem = avatarFileProblem(file);
  const locked = avatarSaving || avatarSubmissionState === "loading" || avatarIsActive() || avatarQuotaActive();
  input.disabled = locked;
  button.disabled = locked || !file || Boolean(problem);
}

function renderAvatarSubmission(): void {
  const host = byId("user-profile-avatar-review");
  if (!host) return;
  if (avatarSubmissionState === "loading") {
    emptyMessage(host, language() === "en" ? "Loading avatar review…" : "正在读取头像审核状态…");
  } else if (avatarSubmissionState === "error") {
    emptyMessage(host, language() === "en" ? "Avatar review state could not be loaded." : "头像审核状态加载失败。");
  } else if (avatarSubmission) {
    const row = document.createElement("article");
    row.className = "user-profile-moderation-item";
    const heading = document.createElement("div");
    const status = document.createElement("strong");
    status.textContent = statusCopy(text(profileValue(avatarSubmission, "moderation_status", "moderationStatus")));
    const time = document.createElement("time");
    const submittedAt = text(profileValue(avatarSubmission, "submitted_at", "submittedAt"));
    time.dateTime = submittedAt;
    time.textContent = formatDate(submittedAt);
    heading.append(status, time);
    row.appendChild(heading);
    const safeReason = reasonCopy(profileValue(avatarSubmission, "reason_code", "reasonCode"));
    if (safeReason) {
      const reason = document.createElement("p");
      reason.textContent = safeReason;
      row.appendChild(reason);
    }
    host.replaceChildren(row);
  } else {
    emptyMessage(host, language() === "en" ? "No avatar submissions yet." : "还没有头像审核记录。");
  }
  if (avatarQuotaActive()) {
    const quota = document.createElement("p");
    quota.className = "user-profile-avatar-quota";
    quota.textContent = language() === "en"
      ? `Next upload available after ${formatDate(avatarNextAllowedAt)}.`
      : `下次可上传时间：${formatDate(avatarNextAllowedAt)}。`;
    host.appendChild(quota);
  }
  setDialogStatus("user-profile-avatar-status", avatarNoticeCopy(), avatarNotice?.kind || "");
  syncAvatarInputState();
}

async function loadAvatarSubmission(): Promise<void> {
  if (!apiClient || !state.isOwnProfile) return;
  avatarSubmissionState = "loading";
  renderAvatarSubmission();
  const result = await apiClient.request("/user/me/avatar-submission", { method: "GET" });
  if (!state.isOwnProfile) return;
  if (result.success) {
    avatarSubmission = Object.keys(record(result.data)).length ? record(result.data) : null;
    avatarNextAllowedAt = text(result.next_allowed_at);
    avatarSubmissionState = "ready";
  } else {
    avatarSubmissionState = "error";
  }
  renderAvatarSubmission();
}

function prepareAvatarEditor(): void {
  byId<HTMLFormElement>("user-profile-avatar-form")?.reset();
  clearAvatarPreview();
  avatarNotice = null;
  renderAvatarSubmission();
  void loadAvatarSubmission();
}

function previewAvatarInput(): void {
  clearAvatarPreview();
  const file = selectedAvatarFile();
  const problem = avatarFileProblem(file);
  avatarNotice = problem ? { key: problem, kind: "error" } : null;
  if (file && !problem) {
    const preview = byId<HTMLImageElement>("user-profile-avatar-preview");
    if (preview) {
      avatarPreviewUrl = URL.createObjectURL(file);
      preview.src = avatarPreviewUrl;
      preview.hidden = false;
    }
  }
  renderAvatarSubmission();
}

async function uploadProfileAvatar(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (avatarSaving || !apiClient || !state.isOwnProfile || !editModeEnabled) return;
  const file = selectedAvatarFile();
  const problem = avatarFileProblem(file);
  if (!file || problem) {
    avatarNotice = { key: problem || "invalid_type", kind: "error" };
    renderAvatarSubmission();
    return;
  }
  avatarSaving = true;
  avatarNotice = { key: "saving" };
  renderAvatarSubmission();
  const form = new FormData();
  form.set("avatar", file);
  const result = await apiClient.request("/user/me/avatar-submission", {
    method: "POST",
    headers: { "Idempotency-Key": randomId("profile-avatar", 16) },
    body: form
  });
  avatarSaving = false;
  if (!result.success) {
    const code = text(result.code);
    const reasonCode = text(result.reason_code);
    const nextAllowedAt = text(record(result.data).next_allowed_at);
    if (code === "CONTENT_REVIEW_PENDING" || reasonCode === "content_review_pending") {
      avatarNotice = { key: "pending", kind: "error" };
    } else if (reasonCode === "rate_limited") {
      avatarNextAllowedAt = nextAllowedAt;
      avatarNotice = { key: "rate_limited", value: formatDate(nextAllowedAt), kind: "error" };
    } else if (reasonCode === "revision_conflict" || reasonCode === "idempotency_conflict" || reasonCode === "not_found") {
      avatarNotice = { key: "conflict", kind: "error" };
    } else if (reasonCode === "provider_unavailable") {
      avatarNotice = { key: "unavailable", kind: "error" };
    } else if (reasonCode === "validation_error") {
      avatarNotice = { key: "validation", kind: "error" };
    } else if (reasonCode === "unauthorized" || code === "UNAUTHORIZED") {
      avatarNotice = { key: "unauthorized", kind: "error" };
    } else {
      avatarNotice = { key: "network", kind: "error" };
    }
    renderAvatarSubmission();
    return;
  }
  byId<HTMLFormElement>("user-profile-avatar-form")?.reset();
  clearAvatarPreview();
  avatarNotice = { key: "submitted", kind: "ok" };
  await loadAvatarSubmission();
  renderAvatarSubmission();
}

function availableFeaturedModes(): JsonRecord[] {
  const selected = new Set(featuredModeKeys());
  return state.stats.byMode.filter((item) => integer(item.record_count) > 0 || selected.has(text(item.mode_key)));
}

function syncFeaturedChoiceLimit(): void {
  const choices = Array.from(document.querySelectorAll<HTMLInputElement>("#user-featured-choices input"));
  const selected = choices.filter((input) => input.checked);
  choices.forEach((input) => { input.disabled = !input.checked && selected.length >= 3; });
  const count = byId("user-featured-count");
  if (count) count.textContent = language() === "en" ? `${selected.length} / 3 selected` : `已选 ${selected.length} / 3`;
}

function prepareFeaturedDialog(): void {
  const host = byId("user-featured-choices");
  if (!host) return;
  const selected = new Set(featuredModeKeys());
  const modes = availableFeaturedModes();
  if (modes.length) {
    host.replaceChildren(...modes.map((item) => {
      const label = document.createElement("label");
      label.className = "user-featured-choice";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = text(item.mode_key);
      input.checked = selected.has(input.value);
      input.addEventListener("change", syncFeaturedChoiceLimit);
      const copy = document.createElement("span");
      copy.textContent = modeLabel(item.mode_key, item.mode_bucket);
      label.append(input, copy);
      return label;
    }));
  } else {
    emptyMessage(host, language() === "en" ? "Play a mode before featuring it." : "游玩并保存记录后，才能选择代表模式。");
  }
  setDialogStatus("user-featured-save-status", "");
  syncFeaturedChoiceLimit();
  openDialog("user-featured-dialog");
}

async function saveFeaturedModes(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!apiClient) return;
  const selected = Array.from(document.querySelectorAll<HTMLInputElement>("#user-featured-choices input:checked")).map((input) => input.value);
  const button = byId<HTMLButtonElement>("user-featured-save");
  if (!button) return;
  button.disabled = true;
  const revision = integer(profileValue(state.profile, "revision", "revision"));
  const result = await apiClient.request("/user/me/profile", {
    method: "PATCH",
    headers: { "Idempotency-Key": randomId("profile", 16) },
    body: JSON.stringify({ featured_mode_keys: selected, revision })
  });
  button.disabled = false;
  if (!result.success) {
    setDialogStatus("user-featured-save-status", text(result.error) || (language() === "en" ? "Save failed" : "保存失败"), "error");
    return;
  }
  const returnedProfile = record(result.data);
  state.profile = {
    ...state.profile,
    ...returnedProfile,
    featured_mode_keys: selected,
    featuredModeKeys: selected
  };
  renderFeaturedModes();
  await legacyRuntime().refreshProfile?.();
  closeDialog("user-featured-dialog");
}

async function saveProfileBio(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (bioSaving) return;
  const input = byId<HTMLTextAreaElement>("user-profile-bio-input");
  if (!apiClient || !input || !state.isOwnProfile || !editModeEnabled) return;
  const profileBio = input.value.trim();
  if (Array.from(profileBio).length > 150) {
    bioNotice = { key: "too_long", kind: "error" };
    renderBioNotice();
    syncBioInputState();
    return;
  }
  bioSaving = true;
  bioNotice = { key: "saving" };
  renderBioNotice();
  syncBioInputState();
  const revision = integer(profileValue(state.profile, "revision", "revision"));
  const result = await apiClient.request("/user/me/profile", {
    method: "PATCH",
    headers: { "Idempotency-Key": randomId("profile-bio", 16) },
    body: JSON.stringify({ profile_bio: profileBio, revision })
  });
  bioSaving = false;
  if (!result.success) {
    const code = text(result.code);
    const reasonCode = text(result.reason_code);
    const nextAllowedAt = text(record(result.data).next_allowed_at);
    if (code === "CONTENT_REVIEW_PENDING" || reasonCode === "content_review_pending") {
      bioNotice = { key: "pending", kind: "error" };
      await loadModerationHistory();
    } else if (reasonCode === "rate_limited") {
      bioNotice = { key: "rate_limited", value: formatDate(nextAllowedAt), kind: "error" };
    } else if (reasonCode === "bio_temporarily_blocked") {
      bioBlockedUntil = nextAllowedAt;
      bioNotice = { key: "blocked", value: formatDate(nextAllowedAt), kind: "error" };
    } else if (reasonCode === "revision_conflict" || reasonCode === "idempotency_conflict" || reasonCode === "not_found") {
      bioNotice = { key: "conflict", kind: "error" };
    } else if (reasonCode === "provider_unavailable") {
      bioNotice = { key: "unavailable", kind: "error" };
    } else if (reasonCode === "validation_error") {
      bioNotice = { key: "validation", kind: "error" };
    } else if (reasonCode === "unauthorized" || code === "UNAUTHORIZED") {
      bioNotice = { key: "unauthorized", kind: "error" };
    } else {
      bioNotice = { key: "network", kind: "error" };
    }
    renderBioNotice();
    renderModerationHistory();
    syncBioInputState();
    return;
  }
  const returned = record(result.data);
  state.profile.revision = integer(returned.revision);
  const queue = record(returned.moderation_queue);
  bioNotice = { key: text(queue.status) === "queued" ? "queued" : "submitted", kind: "ok" };
  await loadModerationHistory();
  renderBioNotice();
}

function renderBackgroundCatalog(): void {
  const host = byId("user-profile-background-choices");
  if (!host) return;
  if (!backgroundCatalog.length) {
    host.textContent = language() === "en" ? "No published backgrounds are available." : "暂无已发布背景。";
    return;
  }
  const current = text(profileValue(state.profile, "background_scene_id", "backgroundSceneId")) || backgroundCatalogDefaultSceneId;
  host.replaceChildren(...backgroundCatalog.map((scene) => {
    const id = text(scene.id ?? scene.scene_id ?? scene.sceneId);
    const label = document.createElement("label");
    label.className = "user-profile-background-choice";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "background_scene_id";
    input.value = id;
    input.checked = id === current;
    const image = document.createElement("img");
    image.src = backgroundUrl(scene.preview_url ?? scene.previewUrl);
    image.alt = text(scene.name) || id;
    const title = document.createElement("strong");
    title.textContent = text(scene.name) || id;
    label.append(input, image, title);
    return label;
  }));
}

async function loadBackgroundCatalog(): Promise<void> {
  if (!apiClient || backgroundCatalogLoaded) return;
  const status = byId("user-profile-background-status");
  if (status) status.textContent = language() === "en" ? "Loading…" : "正在加载…";
  const result = await apiClient.request("/profile-backgrounds");
  const catalog = record(result.data);
  backgroundCatalog = result.success ? records(catalog.scenes) : [];
  backgroundCatalogDefaultSceneId = result.success ? text(catalog.default_scene_id) : "";
  backgroundCatalogLoaded = result.success === true;
  renderBackgroundCatalog();
  if (status) status.textContent = result.success ? "" : (language() === "en" ? "Backgrounds could not be loaded." : "背景目录加载失败。");
}

async function saveProfileBackground(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!apiClient || backgroundSaving || !state.isOwnProfile || !editModeEnabled) return;
  const selectedSceneId = document.querySelector<HTMLInputElement>('#user-profile-background-choices input[name="background_scene_id"]:checked')?.value || "";
  if (!selectedSceneId) return;
  backgroundSaving = true;
  const status = byId("user-profile-background-status");
  if (status) status.textContent = language() === "en" ? "Saving…" : "正在保存…";
  const revision = integer(profileValue(state.profile, "revision", "revision"));
  const result = await apiClient.request("/user/me/profile", {
    method: "PATCH",
    headers: { "Idempotency-Key": randomId("profile-background", 16) },
    body: JSON.stringify({ background_scene_id: selectedSceneId, revision })
  });
  backgroundSaving = false;
  if (!result.success) {
    if (status) status.textContent = text(result.error || result.code) || (language() === "en" ? "Save failed." : "保存失败。");
    return;
  }
  const returned = record(result.data);
  state.profile.background_scene_id = selectedSceneId;
  state.profile.backgroundSceneId = selectedSceneId;
  state.profile.revision = integer(returned.revision);
  renderedBackgroundKey = "";
  void loadProfileBackgroundLayers(selectedSceneId);
  if (status) status.textContent = language() === "en" ? "Background saved." : "背景已保存。";
}

function applyLanguage(): void {
  const en = language() === "en";
  const copies: Array<[string, string, string]> = [
    ["#user-featured-edit", "编辑首页展示", "Edit featured modes"],
    ["#user-nav-edit-mode", "进入编辑模式", "Enter edit mode"],
    [".user-profile-sidebar .user-profile-panel:nth-child(1) h2", "关于我", "About"], [".user-profile-sidebar .user-profile-panel:nth-child(2) h2", "展示成就", "Showcase"],
    [".user-profile-sidebar .user-profile-panel:nth-child(3) h2", "主页信息", "Profile"], [".user-profile-facts div:nth-child(1) dt", "参与模式", "Modes played"],
    [".user-profile-facts div:nth-child(2) dt", "成就数量", "Achievements"], ["#user-tab-overview", "概览", "Overview"],
    ["#user-tab-performance", "模式成绩", "Mode results"], ["#user-tab-records", "游戏记录", "Game records"], ["#user-tab-achievements", "成就", "Achievements"],
    ["#user-panel-overview .user-profile-section:nth-child(1) h2", "代表模式", "Featured modes"], ["#user-panel-overview .user-profile-section:nth-child(2) h2", "最近游戏", "Recent games"],
    ["[data-user-jump='records']", "查看全部记录", "View all records"], ["#user-panel-performance h2", "按模式汇总的个人成绩", "Results by mode"],
    ["#user-panel-achievements h2", "已获得成就", "Earned achievements"], ["[data-user-mode-family='all']", "全部", "All"],
    ["[data-user-mode-family='pow2']", "2 的幂", "Power of two"], ["[data-user-mode-family='fibonacci']", "斐波那契", "Fibonacci"],
    ["[data-user-mode-family='diagonal']", "八方向", "8-Direction"], ["[data-user-mode-family='special']", "特殊模式", "Special"],
    ["#user-featured-dialog-title", "编辑首页展示", "Edit featured modes"],
    ["#user-profile-avatar-editor-title", "更换头像", "Change avatar"], ["#user-profile-avatar-label", "选择头像", "Choose avatar"],
    ["#user-profile-avatar-help", "支持 JPEG、PNG、WebP，文件不超过 200 KB；每 7 天最多上传一次，审核通过前继续显示当前头像。", "JPEG, PNG, or WebP up to 200 KB. You can upload once every 7 days; your current avatar remains until approval."],
    ["#user-profile-avatar-review-title", "最新头像审核", "Latest avatar review"], ["#user-profile-avatar-save", "提交头像审核", "Submit avatar for review"],
    ["#user-profile-bio-editor-title", "编辑主页简介", "Edit profile bio"], [".user-profile-bio-label-row label", "主页简介", "Profile bio"],
    ["#user-profile-bio-help", "简介会发送给 DeepSeek 自动审核；审核通过前继续显示当前公开简介。留空保存表示清空简介。", "Your bio is sent to DeepSeek for automated review. The current public bio remains until approval; submit an empty bio to clear it."],
    ["#user-profile-bio-save", "提交审核", "Submit for review"], ["#user-profile-moderation-title", "简介审核记录", "Bio review history"]
    , ["#user-profile-background-editor-title", "编辑主页背景", "Edit profile background"],
    ["#user-profile-background-help", "只显示白天预览；页面会按自动、白天或夜晚状态切换同一场景。", "Only day previews are shown. The same scene switches automatically for auto, day, or night mode."],
    ["#user-profile-background-save", "保存背景", "Save background"]
  ];
  copies.forEach(([selector, zh, english]) => {
    const node = document.querySelector<HTMLElement>(selector);
    if (node) node.textContent = en ? english : zh;
  });
  const ariaCopies: Array<[string, string, string]> = [
    [".user-page-nav .palette-nav", "用户主页导航", "User profile navigation"],
    [".user-profile-tabs", "个人主页内容", "Profile content"]
  ];
  ariaCopies.forEach(([selector, zh, english]) => {
    const node = document.querySelector<HTMLElement>(selector);
    if (node) node.setAttribute("aria-label", en ? english : zh);
  });
  renderProfile();
  renderStatsContent();
  renderAchievements();
  renderAvatarSubmission();
  renderModerationHistory();
  renderBioNotice();
  renderBackgroundCatalog();
}

function bindEnhancedEvents(): void {
  window.addEventListener("userprofilestatechange", (event) => syncLegacyState((event as CustomEvent<unknown>).detail));
  document.querySelectorAll<HTMLButtonElement>("[data-user-tab]").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.userTab as ProfileTab));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-user-jump]").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.userJump as ProfileTab));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-user-dialog-close]").forEach((button) => {
    button.addEventListener("click", () => closeDialog(button.dataset.userDialogClose || ""));
  });
  byId("user-nav-edit-mode")?.addEventListener("click", () => {
    editModeEnabled = !editModeEnabled;
    syncEditModeUi();
    if (editModeEnabled && state.isOwnProfile) prepareAvatarEditor();
    if (editModeEnabled && state.isOwnProfile) prepareBioEditor();
    if (editModeEnabled && state.isOwnProfile) void loadBackgroundCatalog();
    const menu = byId("user-nav-edit-mode")?.closest("details");
    if (menu) menu.open = false;
  });
  byId("user-featured-edit")?.addEventListener("click", prepareFeaturedDialog);
  byId<HTMLFormElement>("user-featured-form")?.addEventListener("submit", (event) => void saveFeaturedModes(event));
  byId<HTMLInputElement>("user-profile-avatar-input")?.addEventListener("change", previewAvatarInput);
  byId<HTMLFormElement>("user-profile-avatar-form")?.addEventListener("submit", (event) => void uploadProfileAvatar(event));
  byId<HTMLTextAreaElement>("user-profile-bio-input")?.addEventListener("input", syncBioInputState);
  byId<HTMLFormElement>("user-profile-bio-form")?.addEventListener("submit", (event) => void saveProfileBio(event));
  byId<HTMLFormElement>("user-profile-background-form")?.addEventListener("submit", (event) => void saveProfileBackground(event));
  window.addEventListener("uilanguagechange", applyLanguage);
  window.addEventListener("storage", (event) => { if (event.key === "ui_language_v1") applyLanguage(); });
  new MutationObserver(() => {
    renderedBackgroundKey = "";
    const sceneId = text(profileValue(state.profile, "background_scene_id", "backgroundSceneId")) || "default";
    void loadProfileBackgroundLayers(sceneId);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-night-background"] });
  bindProfileCoverMotion();
}

function bootstrapEnhancedProfile(): void {
  const storageLike = resolveStorageByName({
    // SAFETY: the helper only reads the named Web Storage property from Window.
    windowLike: window as unknown as Record<string, unknown>,
    storageName: "localStorage"
  });
  const token = readAuthToken({ storageLike: storageLike as Storage | null });
  apiClient = createJsonApiClient({
    bases: buildApiBaseCandidates({ locationLike: window.location }),
    token,
    timeoutMs: 30_000
  });
  bindDisplayModeSync({ documentLike: document, windowLike: window });
  bindEnhancedEvents();
  const hash = location.hash.slice(1) as ProfileTab;
  activateTab(VALID_TABS.has(hash) ? hash : "overview");
  applyLanguage();
  const initial = legacyRuntime().getState?.();
  if (initial) syncLegacyState(initial);
}

export async function bootstrapUserProfilePage(): Promise<void> {
  if (typeof document === "undefined") return;
  const { installUserProfileLegacyRuntime } = await import("../bootstrap/user-profile-legacy-runtime");
  await installUserProfileLegacyRuntime();
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  document.body?.setAttribute("data-page-family", "profile-history-replay");
  bootstrapEnhancedProfile();
}
