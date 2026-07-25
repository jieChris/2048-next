import {
  APP_GAME_CONTRACT_VERSION,
  isAppModeKey,
  isReplayRecordLike,
  type AppModeKey,
  type ReplayRecord,
} from "../../../src/contracts";
import {
  createJsonApiClient,
  type FetchLike,
  type JsonRecord,
} from "../../../src/services/api-client";
import type { MobileAuthService } from "../auth/auth-service";
import {
  APP_DATABASE_SCHEMA_VERSION,
  type AchievementsCacheValue,
  type CachedAchievementRow,
  type CachedHistoryRow,
  type CacheOwnerKey,
  type CloudHistoryCacheValue,
  type LeaderboardCacheValue,
  type StoredCacheEntry,
} from "./app-database";

export type CloudHistoryStatus = "active" | "deleted" | "all";
export type CloudHistorySort = "time" | "score" | "board_sum";
export type LeaderboardMetric = "score" | "speed";
export type LeaderboardPeriod = "all" | "day" | "week" | "month";

export interface MobileCloudCacheDatabase {
  getCache(
    cacheKey: string,
    ownerKey: CacheOwnerKey,
    accessedAt: number,
  ): Promise<StoredCacheEntry | null>;
  putCache(entry: StoredCacheEntry): Promise<void>;
  deleteCache(cacheKey: string, ownerKey: CacheOwnerKey): Promise<boolean>;
}

export interface MobileCloudDataOptions {
  database: MobileCloudCacheDatabase;
  apiBase: string;
  getAuthService: () => Promise<Pick<MobileAuthService, "requestAccount">>;
  fetchLike?: FetchLike;
  timeoutMs?: number;
  now?: () => number;
}

export interface CloudHistoryQuery {
  userId: number;
  status: CloudHistoryStatus;
  sort: CloudHistorySort;
}

export interface LeaderboardQuery {
  modeKey: AppModeKey;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  targetTile?: number;
  page?: number;
}

function object(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function requiredText(value: unknown, maxLength = 512): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error("invalid_cloud_response");
  }
  return value.trim();
}

function nonNegativeInteger(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("invalid_cloud_response");
  }
  return parsed;
}

function positiveInteger(value: unknown): number {
  const parsed = nonNegativeInteger(value);
  if (parsed < 1) throw new Error("invalid_cloud_response");
  return parsed;
}

function nullableDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const text = requiredText(value, 64);
  if (!Number.isFinite(Date.parse(text))) throw new Error("invalid_cloud_response");
  return new Date(text).toISOString();
}

function date(value: unknown): string {
  const parsed = nullableDate(value);
  if (!parsed) throw new Error("invalid_cloud_response");
  return parsed;
}

function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function cacheEntry(
  ownerKey: CacheOwnerKey,
  cacheKey: string,
  cacheKind: StoredCacheEntry["cacheKind"],
  value: StoredCacheEntry["value"],
  now: number,
): StoredCacheEntry {
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    ownerKey,
    cacheKey,
    kind: "data",
    cacheKind,
    value,
    fetchedAt: now,
    lastAccessedAt: now,
    sizeBytes: jsonBytes(value),
  } as StoredCacheEntry;
}

function historyKey(query: CloudHistoryQuery): string {
  return `history:${query.status}:${query.sort}:page:1`;
}

function leaderboardKey(query: LeaderboardQuery): string {
  return [
    "leaderboard",
    query.modeKey,
    query.metric,
    query.period,
    query.metric === "speed" ? query.targetTile ?? 2048 : "score",
    `page:${query.page ?? 1}`,
  ].join(":");
}

function replayKey(recordId: string): string {
  return `replay:${recordId}`;
}

const achievementsKey = "achievements";

function accountOwner(userId: number): `user:${string}` {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("invalid_user_id");
  }
  return `user:${userId}`;
}

function parseHistory(body: JsonRecord, status: CloudHistoryStatus): CloudHistoryCacheValue {
  if (body.success !== true || !Array.isArray(body.data)) {
    throw new Error("invalid_cloud_response");
  }
  const rows = body.data.map((value): CachedHistoryRow => {
    const row = object(value);
    if (!row) throw new Error("invalid_cloud_response");
    const modeKey = row.mode_key;
    const source = row.source;
    if (
      !isAppModeKey(modeKey) ||
      (source !== "normal" &&
        source !== "ranked" &&
        source !== "migration" &&
        source !== "admin")
    ) {
      throw new Error("invalid_cloud_response");
    }
    const deletedAt = nullableDate(row.deleted_at);
    return {
      id: requiredText(row.id, 160),
      clientRecordId:
        row.client_record_id == null
          ? null
          : requiredText(row.client_record_id, 160),
      modeKey,
      source,
      score: nonNegativeInteger(row.score),
      boardSum: nonNegativeInteger(row.board_sum),
      durationMs: nonNegativeInteger(row.duration_ms),
      steps: nonNegativeInteger(row.steps),
      bestTile: nonNegativeInteger(row.best_tile),
      endedAt: date(row.ended_at),
      deletedAt,
      restoreUntil: deletedAt
        ? new Date(Date.parse(deletedAt) + 3 * 24 * 60 * 60 * 1000).toISOString()
        : null,
      replayAvailable: true,
    };
  });
  const page = positiveInteger(body.page ?? 1);
  const totalPages = nonNegativeInteger(body.total_pages ?? body.totalPages ?? 0);
  return {
    rows,
    page,
    totalPages,
    hasNext: body.has_next === true || body.hasNext === true,
    status,
  };
}

function parseLeaderboard(body: JsonRecord): LeaderboardCacheValue {
  if (body.success !== true || !Array.isArray(body.data)) {
    throw new Error("invalid_cloud_response");
  }
  return {
    rows: body.data.map((value) => {
      const row = object(value);
      if (!row) throw new Error("invalid_cloud_response");
      return {
        rank: positiveInteger(row.rank),
        userId: String(row.user_id ?? row.userId ?? ""),
        nickname: requiredText(row.nickname, 128),
        score: row.score == null ? null : nonNegativeInteger(row.score),
        speedMs: row.speed_ms == null ? null : nonNegativeInteger(row.speed_ms),
        achievedAt: date(row.canonical_ended_at ?? row.game_date),
      };
    }),
    page: positiveInteger(body.page ?? 1),
    hasNext: body.has_next === true || body.hasNext === true,
  };
}

function parseReplay(body: JsonRecord): ReplayRecord {
  if (body.success !== true) throw new Error("invalid_cloud_response");
  const data = object(body.data);
  if (!data) throw new Error("invalid_cloud_response");
  if (isReplayRecordLike(data.replay)) return data.replay;
  const modeKey = data.mode_key;
  const replayString = data.replay_string;
  if (
    !isAppModeKey(modeKey) ||
    typeof replayString !== "string" ||
    !replayString.startsWith("REPLAY_v1RPL_B64_")
  ) {
    throw new Error("invalid_cloud_response");
  }
  return {
    version: APP_GAME_CONTRACT_VERSION,
    kind: "rpl1",
    modeKey,
    replayString,
  };
}

function textList(value: unknown, maxItems = 16): string[] {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new Error("invalid_cloud_response");
  }
  return Array.from(
    new Set(value.map((item) => requiredText(item, 160))),
  );
}

function localizedText(
  value: unknown,
  fallback: string,
  maxLength: number,
): { zhCn: string; en: string } {
  const translations = object(value);
  const read = (key: string): string | null => {
    const candidate = translations?.[key];
    return typeof candidate === "string" && candidate.trim()
      ? requiredText(candidate, maxLength)
      : null;
  };
  return {
    zhCn: read("zh-CN") ?? read("zh") ?? fallback,
    en: read("en") ?? fallback,
  };
}

function parseAchievementDefinition(value: unknown): {
  row: CachedAchievementRow;
  completableClients: Array<"web" | "android">;
} {
  const definition = object(value);
  if (!definition) throw new Error("invalid_cloud_response");
  const name = requiredText(definition.name, 160);
  const description = requiredText(definition.description, 1_000);
  const completableClients = textList(definition.completable_clients, 2);
  if (
    completableClients.some(
      (client) => client !== "web" && client !== "android",
    )
  ) {
    throw new Error("invalid_cloud_response");
  }
  return {
    row: {
      id: requiredText(definition.id, 160),
      name: localizedText(definition.name_i18n, name, 160),
      description: localizedText(
        definition.description_i18n,
        description,
        1_000,
      ),
      earnedAt: null,
      source: null,
      requiredModeKeys: textList(definition.required_mode_keys),
    },
    completableClients: completableClients as Array<"web" | "android">,
  };
}

function parseAchievements(
  catalogBody: JsonRecord,
  earnedBody: JsonRecord,
): AchievementsCacheValue {
  if (
    catalogBody.success !== true ||
    !Array.isArray(catalogBody.data) ||
    earnedBody.success !== true ||
    !Array.isArray(earnedBody.data)
  ) {
    throw new Error("invalid_cloud_response");
  }
  const earned: CachedAchievementRow[] = [];
  const earnedIds = new Set<string>();
  for (const value of earnedBody.data) {
    const item = object(value);
    if (!item) throw new Error("invalid_cloud_response");
    const parsed = parseAchievementDefinition(item.achievement);
    const source = item.source;
    if (
      source !== "record" &&
      source !== "event" &&
      source !== "manual" &&
      source !== "backfill"
    ) {
      throw new Error("invalid_cloud_response");
    }
    if (earnedIds.has(parsed.row.id)) continue;
    earnedIds.add(parsed.row.id);
    earned.push({
      ...parsed.row,
      earnedAt: date(item.earned_at),
      source,
    });
  }
  const available: CachedAchievementRow[] = [];
  const availableIds = new Set<string>();
  for (const value of catalogBody.data) {
    const parsed = parseAchievementDefinition(value);
    if (
      earnedIds.has(parsed.row.id) ||
      availableIds.has(parsed.row.id) ||
      !parsed.completableClients.includes("android") ||
      !parsed.row.requiredModeKeys.every(isAppModeKey)
    ) {
      continue;
    }
    availableIds.add(parsed.row.id);
    available.push(parsed.row);
  }
  return { earned, available };
}

export class MobileCloudData {
  readonly #options: MobileCloudDataOptions;
  readonly #publicClient: ReturnType<typeof createJsonApiClient>;

  constructor(options: MobileCloudDataOptions) {
    this.#options = options;
    this.#publicClient = createJsonApiClient({
      bases: [options.apiBase],
      ...(options.fetchLike ? { fetchLike: options.fetchLike } : {}),
      timeoutMs: options.timeoutMs ?? 8_000,
    });
  }

  #now(): number {
    return Math.max(0, Math.floor((this.#options.now ?? Date.now)()));
  }

  async #public(path: string): Promise<JsonRecord> {
    const result = await this.#publicClient.requestResult(path, { method: "GET" });
    if (result.networkError || !result.ok || result.body?.success !== true) {
      throw new Error("cloud_request_failed");
    }
    return result.body;
  }

  async readHistoryCache(query: CloudHistoryQuery) {
    const cached = await this.#options.database.getCache(
      historyKey(query),
      accountOwner(query.userId),
      this.#now(),
    );
    return cached?.cacheKind === "cloud_history"
      ? { value: cached.value, fetchedAt: cached.fetchedAt }
      : null;
  }

  async refreshHistory(query: CloudHistoryQuery) {
    const params = new URLSearchParams({
      page: "1",
      limit: "50",
      status: query.status,
      sort_by: query.sort,
      order: "desc",
    });
    const auth = await this.#options.getAuthService();
    const body = await auth.requestAccount(
      `/user/${query.userId}/records?${params}`,
      { method: "GET" },
    );
    const value = parseHistory(body, query.status);
    const fetchedAt = this.#now();
    await this.#options.database.putCache(
      cacheEntry(
        accountOwner(query.userId),
        historyKey(query),
        "cloud_history",
        value,
        fetchedAt,
      ),
    );
    return { value, fetchedAt };
  }

  async #invalidateHistory(userId: number): Promise<void> {
    const ownerKey = accountOwner(userId);
    await Promise.all(
      (["active", "deleted", "all"] as const).flatMap((status) =>
        (["time", "score", "board_sum"] as const).map((sort) =>
          this.#options.database.deleteCache(
            historyKey({ userId, status, sort }),
            ownerKey,
          ),
        ),
      ),
    );
  }

  async deleteRecord(input: { userId: number; recordId: string }): Promise<void> {
    const auth = await this.#options.getAuthService();
    await auth.requestAccount(`/records/${encodeURIComponent(input.recordId)}`, {
      method: "DELETE",
    });
    await this.#invalidateHistory(input.userId);
  }

  async restoreRecord(input: { userId: number; recordId: string }): Promise<void> {
    const auth = await this.#options.getAuthService();
    await auth.requestAccount(
      `/records/${encodeURIComponent(input.recordId)}/restore`,
      { method: "POST" },
    );
    await this.#invalidateHistory(input.userId);
  }

  async readLeaderboardCache(query: LeaderboardQuery) {
    const cached = await this.#options.database.getCache(
      leaderboardKey(query),
      "public",
      this.#now(),
    );
    return cached?.cacheKind === "leaderboard"
      ? { value: cached.value, fetchedAt: cached.fetchedAt }
      : null;
  }

  async refreshLeaderboard(query: LeaderboardQuery) {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      limit: "100",
      mode_key: query.modeKey,
      metric: query.metric,
      period: query.period,
    });
    if (query.metric === "speed") {
      params.set("target_tile", String(query.targetTile ?? 2048));
    }
    const value = parseLeaderboard(await this.#public(`/leaderboard?${params}`));
    const fetchedAt = this.#now();
    await this.#options.database.putCache(
      cacheEntry(
        "public",
        leaderboardKey(query),
        "leaderboard",
        value,
        fetchedAt,
      ),
    );
    return { value, fetchedAt };
  }

  async readAchievementsCache(userId: number) {
    const cached = await this.#options.database.getCache(
      achievementsKey,
      accountOwner(userId),
      this.#now(),
    );
    return cached?.cacheKind === "achievements"
      ? { value: cached.value, fetchedAt: cached.fetchedAt }
      : null;
  }

  async refreshAchievements(input: { userId: number }) {
    const auth = await this.#options.getAuthService();
    const [catalog, earned] = await Promise.all([
      auth.requestAccount("/achievements", { method: "GET" }),
      auth.requestAccount("/user/me/achievements", { method: "GET" }),
    ]);
    const value = parseAchievements(catalog, earned);
    const fetchedAt = this.#now();
    await this.#options.database.putCache(
      cacheEntry(
        accountOwner(input.userId),
        achievementsKey,
        "achievements",
        value,
        fetchedAt,
      ),
    );
    return { value, fetchedAt };
  }

  async readReplayCache(input: { userId: number; recordId: string }) {
    const cached = await this.#options.database.getCache(
      replayKey(input.recordId),
      accountOwner(input.userId),
      this.#now(),
    );
    return cached?.cacheKind === "replay"
      ? { value: cached.value, fetchedAt: cached.fetchedAt }
      : null;
  }

  async refreshReplay(input: { userId: number; recordId: string }) {
    const value = parseReplay(
      await this.#public(`/records/${encodeURIComponent(input.recordId)}/replay`),
    );
    const fetchedAt = this.#now();
    await this.#options.database.putCache(
      cacheEntry(
        accountOwner(input.userId),
        replayKey(input.recordId),
        "replay",
        value,
        fetchedAt,
      ),
    );
    return { value, fetchedAt };
  }
}
