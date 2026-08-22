import { installUserProfileLegacyRuntime } from "../bootstrap/user-profile-legacy-runtime";
import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";
import { groupAchievementFamilies } from "../services/achievement-families";
import { achievementIconMarkupFor } from "../services/achievement-icons";
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

type UserProfileWindow = Window & { UserProfilePageRuntime?: LegacyProfileRuntime };

const PROFILE_COVERS = new Set(["tide", "sunset", "midnight", "forest", "plum"]);
const VALID_TABS = new Set<ProfileTab>(["overview", "performance", "records", "achievements"]);

let apiClient: JsonApiClient | null = null;
let state: LegacyProfileState = emptyState();
let recentRecords: JsonRecord[] = [];
let earnedAchievements: EarnedAchievement[] = [];
let achievementsUserId = 0;
let editModeEnabled = false;

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

function profileValue(profile: JsonRecord, snake: string, camel: string): unknown {
  return profile[snake] ?? profile[camel];
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
    : `${minutes}:${String(rest).padStart(2, "0")}`;
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
  if (next.targetUserId > 0 && achievementsUserId !== next.targetUserId) void loadAchievements(next.targetUserId);
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
  const edit = byId<HTMLButtonElement>("user-profile-edit");
  const featuredEdit = byId<HTMLButtonElement>("user-featured-edit");
  const wallLink = byId<HTMLAnchorElement>("user-showcase-wall-link");
  // P0a only supports featured-mode editing. Bio, cover, and avatar APIs are
  // intentionally not wired until their review contracts exist.
  if (edit) edit.hidden = true;
  if (featuredEdit) featuredEdit.hidden = !(canEdit && editModeEnabled);
  if (wallLink) wallLink.hidden = true;
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
    detail.textContent = language() === "en"
      ? `Tile ${formatNumber(stats.best_tile)} · Fastest ${formatDuration(stats.fastest_duration_ms)} · ${formatNumber(stats.record_count)} games`
      : `最大方块 ${formatNumber(stats.best_tile)} · 最快 ${formatDuration(stats.fastest_duration_ms)} · ${formatNumber(stats.record_count)} 局`;
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
    host.innerHTML = markup;
    return;
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
  if (!modes.length) {
    emptyMessage(host, language() === "en" ? "Play a mode before featuring it." : "游玩并保存记录后，才能选择代表模式。");
  } else {
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

function applyLanguage(): void {
  const en = language() === "en";
  const copies: Array<[string, string, string]> = [
    ["#user-profile-edit", "编辑主页", "Edit profile"], ["#user-featured-edit", "编辑首页展示", "Edit featured modes"],
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
    ["#user-profile-dialog-title", "编辑主页", "Edit profile"], ["#user-featured-dialog-title", "编辑首页展示", "Edit featured modes"]
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
    const menu = byId("user-nav-edit-mode")?.closest("details");
    if (menu) menu.open = false;
  });
  byId("user-featured-edit")?.addEventListener("click", prepareFeaturedDialog);
  byId<HTMLFormElement>("user-featured-form")?.addEventListener("submit", (event) => void saveFeaturedModes(event));
  window.addEventListener("uilanguagechange", applyLanguage);
  window.addEventListener("storage", (event) => { if (event.key === "ui_language_v1") applyLanguage(); });
  bindProfileCoverMotion();
}

function bootstrapEnhancedProfile(): void {
  const storageLike = resolveStorageByName({
    windowLike: window as unknown as Record<string, unknown>,
    storageName: "localStorage"
  });
  const token = readAuthToken({ storageLike: storageLike as Storage | null });
  apiClient = createJsonApiClient({
    bases: buildApiBaseCandidates({ locationLike: window.location }),
    token,
    timeoutMs: 30_000
  });
  bindEnhancedEvents();
  const hash = location.hash.slice(1) as ProfileTab;
  activateTab(VALID_TABS.has(hash) ? hash : "overview");
  applyLanguage();
  const initial = legacyRuntime().getState?.();
  if (initial) syncLegacyState(initial);
}

export function bootstrapUserProfilePage(): void {
  if (typeof document === "undefined") return;
  installUserProfileLegacyRuntime();
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  document.body?.setAttribute("data-page-family", "profile-history-replay");
  bootstrapEnhancedProfile();
}
