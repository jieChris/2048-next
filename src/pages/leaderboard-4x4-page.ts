import {
  AUTH_TOKEN_KEY,
  buildApiBaseCandidates,
  createJsonApiClient
} from "../services/api-client";
import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";

export const LEADERBOARD_4X4_API_PATH = "/leaderboard/standard-4x4-no-undo";
const AUTH_USER_ID_STORAGE_KEY = "2048_auth_userId_v1";

export interface LeaderboardShowcaseRow {
  rank: number;
  userId: number | null;
  nickname: string;
  score: number;
  maxTile: number;
  boardSum: number;
  durationMs: number;
}

export interface LeaderboardShowcaseSummary {
  totalRecords: number;
  totalPlayers: number;
  reached16384: number;
  reached32768: number;
}

export interface LeaderboardTrendPoint {
  date: string;
  bestScore: number;
}

export interface LeaderboardAchievementFocus {
  completedAll: boolean;
  achievementId: string;
  name: string;
  current: number;
  target: number;
  progressPercent: number;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function toNonNegativeInteger(value: unknown, fallback = 0): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toUserId(value: unknown): number | null {
  const parsed = Math.floor(Number(value));
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function normalizeLeaderboardShowcase(value: unknown): LeaderboardShowcaseRow[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((rawRow, index) => {
    const row = toRecord(rawRow);
    const nickname = String(row.nickname || "").trim() || `玩家 ${index + 1}`;
    return {
      rank: Math.min(10, Math.max(1, toNonNegativeInteger(row.rank, index + 1))),
      userId: toUserId(row.user_id),
      nickname,
      score: toNonNegativeInteger(row.score),
      maxTile: toNonNegativeInteger(row.max_tile ?? row.best_tile),
      boardSum: toNonNegativeInteger(row.board_sum),
      durationMs: toNonNegativeInteger(row.duration_ms)
    };
  });
}

export function normalizeLeaderboardShowcaseSummary(value: unknown): LeaderboardShowcaseSummary {
  const summary = toRecord(value);
  return {
    totalRecords: toNonNegativeInteger(summary.total_records),
    totalPlayers: toNonNegativeInteger(summary.total_players),
    reached16384: toNonNegativeInteger(summary.reached_16384),
    reached32768: toNonNegativeInteger(summary.reached_32768)
  };
}

export function normalizeLeaderboardTrend(value: unknown): LeaderboardTrendPoint[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 7).flatMap((rawPoint) => {
    const point = toRecord(rawPoint);
    const date = String(point.date || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? [{ date, bestScore: toNonNegativeInteger(point.best_score) }]
      : [];
  });
}

export function normalizeLeaderboardAchievementFocus(value: unknown): LeaderboardAchievementFocus | null {
  const focus = toRecord(value);
  if (focus.completed_all === true) {
    return {
      completedAll: true,
      achievementId: "",
      name: "",
      current: 0,
      target: 0,
      progressPercent: 100
    };
  }
  const achievementId = String(focus.achievement_id || "").trim();
  const name = String(focus.name || "").trim();
  const target = toNonNegativeInteger(focus.target);
  if (!achievementId || !name || target <= 0) return null;
  return {
    completedAll: false,
    achievementId,
    name,
    current: Math.min(target, toNonNegativeInteger(focus.current)),
    target,
    progressPercent: Math.min(99, toNonNegativeInteger(focus.progress_percent))
  };
}

export function formatLeaderboardRate(value: number, total: number): string {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : "0%";
}

export function formatLeaderboardDuration(value: unknown): string {
  const totalMs = toNonNegativeInteger(value);
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const milliseconds = totalMs % 1000;
  const minuteLabel = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const body = `${minuteLabel}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
  return hours > 0 ? `${hours}:${body}` : body;
}

export function buildLeaderboardProfileUrl(userId: number | null, nickname: string): string {
  if (userId == null) return "";
  const query = new URLSearchParams({ id: String(userId) });
  if (nickname.trim()) query.set("nickname", nickname.trim());
  return `user.html?${query.toString()}`;
}

function formatExactNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(value);
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function nicknameInitial(nickname: string): string {
  return Array.from(nickname.trim())[0]?.toLocaleUpperCase("zh-CN") || "?";
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className = "",
  textContent = ""
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (textContent) node.textContent = textContent;
  return node;
}

function createSvgElement(
  tagName: string,
  attributes: Record<string, string | number> = {},
  textContent = ""
): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
  if (textContent) node.textContent = textContent;
  return node;
}

function createProfileElement(row: LeaderboardShowcaseRow, className: string): HTMLElement {
  const href = buildLeaderboardProfileUrl(row.userId, row.nickname);
  const node = createElement(href ? "a" : "span", className, row.nickname);
  if (href && node instanceof HTMLAnchorElement) node.href = href;
  node.title = row.nickname;
  return node;
}

function createAvatar(row: LeaderboardShowcaseRow): HTMLElement {
  const href = buildLeaderboardProfileUrl(row.userId, row.nickname);
  const node = createElement(href ? "a" : "span", "showcase-avatar", nicknameInitial(row.nickname));
  if (href && node instanceof HTMLAnchorElement) node.href = href;
  node.setAttribute("aria-label", `${row.nickname} 的个人主页`);
  node.setAttribute("data-avatar-placeholder", "initial");
  return node;
}

function renderRankingRow(row: LeaderboardShowcaseRow, currentUserId: number | null): HTMLElement {
  const item = createElement("article", "showcase-ranking-row");
  item.setAttribute("role", "listitem");
  item.setAttribute("data-rank", String(row.rank));
  item.setAttribute("aria-label", `第 ${row.rank} 名，${row.nickname}，${formatExactNumber(row.score)} 分`);
  if (row.rank <= 3) item.classList.add(`is-rank-top${row.rank}`);
  if (currentUserId != null && row.userId === currentUserId) item.classList.add("is-self");

  const rank = createElement("span", "showcase-rank", String(row.rank).padStart(2, "0"));
  const identity = createElement("div", "showcase-ranking-identity");
  const identityCopy = createElement("div", "showcase-ranking-copy");
  const metrics = createElement("div", "showcase-ranking-metrics");
  metrics.append(
    createElement("span", "", `最大 ${formatExactNumber(row.maxTile)}`),
    createElement("span", "", `盘面和 ${formatExactNumber(row.boardSum)}`),
    createElement("span", "", formatLeaderboardDuration(row.durationMs))
  );
  identityCopy.append(createProfileElement(row, "showcase-player-name"), metrics);
  identity.append(createAvatar(row), identityCopy);

  const score = createElement("div", "showcase-score-wrap");
  score.append(
    createElement("strong", "showcase-ranking-score", formatExactNumber(row.score)),
    createElement("small", "", "PTS")
  );
  item.append(rank, identity, score);
  return item;
}

function readCurrentUserId(): number | null {
  const storageLike = resolveStorageByName({
    windowLike: window as unknown as Record<string, unknown>,
    storageName: "localStorage"
  });
  return toUserId(safeReadStorageItem({ storageLike, key: AUTH_USER_ID_STORAGE_KEY }));
}

function setPageState(state: "loading" | "ready" | "empty" | "error", message: string): void {
  document.body?.setAttribute("data-leaderboard-state", state);
  const status = document.getElementById("leaderboard-4x4-status");
  if (status) status.textContent = message;
  const refresh = document.getElementById("leaderboard-4x4-refresh") as HTMLButtonElement | null;
  if (refresh) {
    refresh.disabled = state === "loading";
    refresh.classList.toggle("is-loading", state === "loading");
    refresh.textContent = state === "loading" ? "载入中" : "刷新榜单";
  }
}

function renderShowcase(rows: LeaderboardShowcaseRow[]): void {
  const rankingHost = document.getElementById("leaderboard-4x4-list");
  if (!rankingHost) return;
  rankingHost.replaceChildren();

  if (rows.length === 0) {
    rankingHost.append(createElement("div", "showcase-empty", "还没有正式上榜记录"));
    return;
  }

  const currentUserId = readCurrentUserId();
  rows.forEach((row) => rankingHost.append(renderRankingRow(row, currentUserId)));
}

function renderRail(
  summary: LeaderboardShowcaseSummary,
  rows: LeaderboardShowcaseRow[],
  achievementFocus: LeaderboardAchievementFocus | null
): void {
  const podium = document.getElementById("leaderboard-4x4-podium");
  if (podium) {
    podium.replaceChildren();
    [rows[1], rows[0], rows[2]]
      .filter((row): row is LeaderboardShowcaseRow => Boolean(row))
      .forEach((row) => {
        const item = createElement("article", `showcase-podium-player is-rank-${row.rank}`);
        const copy = createElement("div", "showcase-podium-copy");
        copy.append(
          createProfileElement(row, "showcase-podium-name"),
          createElement("small", "", formatCompactNumber(row.score))
        );
        item.append(
          createAvatar(row),
          copy,
          createElement("div", "showcase-podium-step", String(row.rank))
        );
        podium.append(item);
      });
  }

  const globalRate = summary.totalRecords > 0
    ? Math.round((summary.reached32768 / summary.totalRecords) * 100)
    : 0;
  const rate = achievementFocus?.progressPercent ?? globalRate;
  const titleNode = document.getElementById("leaderboard-4x4-progress-title");
  const rateNode = document.getElementById("leaderboard-4x4-progress-rate");
  const countNode = document.getElementById("leaderboard-4x4-progress-count");
  const progress = document.getElementById("leaderboard-4x4-progress") as HTMLProgressElement | null;
  if (titleNode) {
    titleNode.textContent = achievementFocus?.completedAll
      ? "经典成就已全部完成"
      : achievementFocus?.name || "32768 全局达成率";
  }
  if (rateNode) rateNode.textContent = `${rate}%`;
  if (countNode) {
    countNode.textContent = achievementFocus?.completedAll
      ? "里程碑成就 100%"
      : achievementFocus
        ? `成就进度 ${formatExactNumber(achievementFocus.current)} / ${formatExactNumber(achievementFocus.target)}`
        : `${formatExactNumber(summary.reached32768)} / ${formatExactNumber(summary.totalRecords)} 局`;
  }
  if (progress) progress.value = rate;
}

function renderTrendChart(points: LeaderboardTrendPoint[], rows: LeaderboardShowcaseRow[]): void {
  const host = document.getElementById("leaderboard-4x4-trend");
  if (!host) return;
  host.replaceChildren();
  if (points.length === 0) {
    host.append(createElement("p", "showcase-trend-empty", "暂无近 7 天数据"));
    return;
  }

  const width = 520;
  const height = 190;
  const left = 42;
  const right = 14;
  const top = 24;
  const bottom = 31;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const leaderScore = rows[0]?.score || 0;
  const tenthScore = rows[9]?.score || 0;
  const maxValue = Math.max(leaderScore, ...points.map((point) => point.bestScore), 1);
  const xFor = (index: number) => left + (points.length === 1 ? plotWidth / 2 : (plotWidth * index) / (points.length - 1));
  const yFor = (value: number) => top + plotHeight * (1 - Math.min(value, maxValue) / maxValue);
  const svg = createSvgElement("svg", {
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: "xMidYMid meet",
    "aria-hidden": "true"
  });

  for (let index = 0; index < 4; index += 1) {
    const y = top + (plotHeight * index) / 3;
    const value = Math.round(maxValue * (1 - index / 3));
    svg.append(
      createSvgElement("line", { class: "showcase-trend-grid", x1: left, x2: width - right, y1: y, y2: y }),
      createSvgElement("text", { class: "showcase-trend-axis", x: left - 7, y: y + 3, "text-anchor": "end" }, formatCompactNumber(value))
    );
  }

  const references = [
    { label: "榜首", value: leaderScore, className: "is-leader" },
    { label: "第 10 名", value: tenthScore, className: "is-threshold" }
  ].filter((reference) => reference.value > 0);
  references.forEach((reference) => {
    const y = yFor(reference.value);
    svg.append(
      createSvgElement("line", {
        class: `showcase-trend-reference ${reference.className}`,
        x1: left,
        x2: width - right,
        y1: y,
        y2: y
      }),
      createSvgElement("text", {
        class: `showcase-trend-reference-label ${reference.className}`,
        x: width - right,
        y: Math.max(11, y - 5),
        "text-anchor": "end"
      }, `${reference.label} ${formatCompactNumber(reference.value)}`)
    );
  });

  const pathData = points.map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(point.bestScore)}`).join(" ");
  svg.append(createSvgElement("path", { class: "showcase-trend-line", d: pathData }));
  points.forEach((point, index) => {
    const x = xFor(index);
    const y = yFor(point.bestScore);
    const circle = createSvgElement("circle", { class: "showcase-trend-point", cx: x, cy: y, r: 3.4 });
    circle.append(createSvgElement("title", {}, `${point.date}：${formatExactNumber(point.bestScore)} 分`));
    svg.append(
      circle,
      createSvgElement("text", { class: "showcase-trend-date", x, y: height - 10, "text-anchor": "middle" }, point.date.slice(5).replace("-", "/"))
    );
  });
  host.setAttribute("aria-label", `最近 7 天每日最高分：${points.map((point) => `${point.date} ${formatExactNumber(point.bestScore)} 分`).join("；")}`);
  host.append(svg);
}

function renderOverview(
  summary: LeaderboardShowcaseSummary,
  trend: LeaderboardTrendPoint[],
  rows: LeaderboardShowcaseRow[]
): void {
  const values: Record<string, string> = {
    "leaderboard-4x4-total-records": formatExactNumber(summary.totalRecords),
    "leaderboard-4x4-total-players": formatExactNumber(summary.totalPlayers),
    "leaderboard-4x4-reached-16384": formatExactNumber(summary.reached16384),
    "leaderboard-4x4-rate-16384": formatLeaderboardRate(summary.reached16384, summary.totalRecords),
    "leaderboard-4x4-reached-32768": formatExactNumber(summary.reached32768),
    "leaderboard-4x4-rate-32768": formatLeaderboardRate(summary.reached32768, summary.totalRecords)
  };
  Object.entries(values).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
  renderTrendChart(trend, rows);
}

function syncRefreshedAt(): void {
  const refreshed = document.getElementById("leaderboard-4x4-refreshed");
  if (refreshed) {
    refreshed.textContent = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date());
  }
}

export async function bootstrapLeaderboard4x4Page(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  document.body?.setAttribute("data-page-family", "account");

  const client = createJsonApiClient({
    bases: buildApiBaseCandidates({ locationLike: window.location }),
    token: safeReadStorageItem({
      storageLike: resolveStorageByName({
        windowLike: window as unknown as Record<string, unknown>,
        storageName: "localStorage"
      }),
      key: AUTH_TOKEN_KEY
    }) || "",
    timeoutMs: 10_000
  });

  const load = async () => {
    setPageState("loading", "正在读取正式排行榜…");
    const payload = await client.request(LEADERBOARD_4X4_API_PATH, { method: "GET" });
    if (payload.success !== true) {
      renderShowcase([]);
      setPageState("error", "排行榜暂时无法载入，请稍后重试");
      return;
    }
    const rows = normalizeLeaderboardShowcase(payload.data);
    const summary = normalizeLeaderboardShowcaseSummary(payload.summary);
    const trend = normalizeLeaderboardTrend(payload.trend);
    const achievementFocus = normalizeLeaderboardAchievementFocus(payload.achievement_focus);
    renderShowcase(rows);
    renderOverview(summary, trend, rows);
    renderRail(summary, rows, achievementFocus);
    syncRefreshedAt();
    setPageState(rows.length > 0 ? "ready" : "empty", rows.length > 0 ? "已载入正式总榜" : "暂无正式上榜记录");
  };

  document.getElementById("leaderboard-4x4-refresh")?.addEventListener("click", () => {
    void load();
  });
  await load();
}
