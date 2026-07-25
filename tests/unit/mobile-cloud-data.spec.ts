import { describe, expect, it, vi } from "vitest";

import {
  MobileCloudData,
  type MobileCloudCacheDatabase,
} from "../../mobile/src/data/mobile-cloud-data";
import type {
  CacheOwnerKey,
  StoredCacheEntry,
} from "../../mobile/src/data/app-database";

function cacheDatabase() {
  const rows = new Map<string, StoredCacheEntry>();
  const key = (ownerKey: CacheOwnerKey, cacheKey: string) =>
    `${ownerKey}\0${cacheKey}`;
  const database: MobileCloudCacheDatabase = {
    getCache: vi.fn(async (cacheKey, ownerKey) =>
      structuredClone(rows.get(key(ownerKey, cacheKey)) ?? null),
    ),
    putCache: vi.fn(async (entry) => {
      rows.set(key(entry.ownerKey, entry.cacheKey), structuredClone(entry));
    }),
    deleteCache: vi.fn(async (cacheKey, ownerKey) =>
      rows.delete(key(ownerKey, cacheKey)),
    ),
  };
  return { database, rows };
}

function service(options: {
  accountBody?:
    | Record<string, unknown>
    | ((path: string) => Record<string, unknown>);
  publicBody?: Record<string, unknown>;
}) {
  const cache = cacheDatabase();
  const accountRequests: Array<{ path: string; init: RequestInit }> = [];
  const publicRequests: string[] = [];
  const cloud = new MobileCloudData({
    database: cache.database,
    apiBase: "https://api.example.test/api",
    getAuthService: async () => ({
      requestAccount: async (path, init) => {
        accountRequests.push({ path, init });
        return typeof options.accountBody === "function"
          ? options.accountBody(path)
          : options.accountBody ?? { success: true };
      },
    }),
    fetchLike: vi.fn(async (url) => {
      publicRequests.push(String(url));
      return new Response(JSON.stringify(options.publicBody ?? { success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
    now: () => 1_775_000_000_000,
  });
  return { ...cache, cloud, accountRequests, publicRequests };
}

describe("mobile cloud data", () => {
  it("refreshes and caches the authenticated active history page", async () => {
    const harness = service({
      accountBody: {
        success: true,
        data: [
          {
            id: "rec-1",
            client_record_id: "client-1",
            mode_key: "standard_4x4_pow2_no_undo",
            source: "ranked",
            score: 4096,
            board_sum: 8192,
            duration_ms: 1234,
            steps: 42,
            best_tile: 2048,
            ended_at: "2026-07-25T00:00:00.000Z",
            deleted_at: null,
          },
        ],
        page: 1,
        total_pages: 1,
        has_next: false,
      },
    });

    const refreshed = await harness.cloud.refreshHistory({
      userId: 42,
      status: "active",
      sort: "score",
    });

    expect(harness.accountRequests[0]?.path).toContain(
      "/user/42/records?",
    );
    expect(harness.accountRequests[0]?.path).toContain("status=active");
    expect(harness.accountRequests[0]?.path).toContain("sort_by=score");
    expect(refreshed.value.rows[0]).toMatchObject({
      id: "rec-1",
      clientRecordId: "client-1",
      score: 4096,
      replayAvailable: true,
    });
    await expect(
      harness.cloud.readHistoryCache({
        userId: 42,
        status: "active",
        sort: "score",
      }),
    ).resolves.toMatchObject({ value: refreshed.value, fetchedAt: 1_775_000_000_000 });
  });

  it("keeps the backend absolute leaderboard rank when caching a selected scope", async () => {
    const harness = service({
      publicBody: {
        success: true,
        data: [
          {
            rank: 47,
            user_id: 9,
            nickname: "Player Nine",
            score: 65536,
            canonical_ended_at: "2026-07-25T00:00:00.000Z",
          },
        ],
        page: 2,
        has_next: true,
      },
    });

    const refreshed = await harness.cloud.refreshLeaderboard({
      modeKey: "standard_4x4_pow2_no_undo",
      metric: "score",
      period: "week",
      page: 2,
    });

    expect(harness.publicRequests[0]).toContain("metric=score");
    expect(harness.publicRequests[0]).toContain("period=week");
    expect(refreshed.value.rows[0]?.rank).toBe(47);
    expect(refreshed.value.page).toBe(2);
  });

  it("constructs and caches an RPL1 replay from the cloud replay envelope", async () => {
    const harness = service({
      publicBody: {
        success: true,
        data: {
          mode_key: "standard_4x4_pow2_no_undo",
          replay_string: "REPLAY_v1RPL_B64_ZmFrZQ==",
        },
      },
    });

    await expect(
      harness.cloud.refreshReplay({ userId: 42, recordId: "rec-1" }),
    ).resolves.toMatchObject({
      value: {
        kind: "rpl1",
        modeKey: "standard_4x4_pow2_no_undo",
        replayString: "REPLAY_v1RPL_B64_ZmFrZQ==",
      },
    });
    await expect(
      harness.cloud.readReplayCache({ userId: 42, recordId: "rec-1" }),
    ).resolves.toMatchObject({ value: { kind: "rpl1" } });
  });

  it("caches every earned achievement and only Android-completable app challenges", async () => {
    const definition = (
      id: string,
      clients: string[],
      modes: string[],
      name = id,
    ) => ({
      id,
      name,
      description: `${name} description`,
      name_i18n: { "zh-CN": `${name} 中文`, en: `${name} English` },
      description_i18n: {
        "zh-CN": `${name} 中文说明`,
        en: `${name} English description`,
      },
      icon_url: "data:image/svg+xml,%3Csvg/%3E",
      status: "active",
      completable_clients: clients,
      required_mode_keys: modes,
      rules: [],
    });
    const earnedHidden = definition(
      "earned-web-secret",
      ["web"],
      ["unported_mode"],
      "Secret",
    );
    const available = definition(
      "android-standard",
      ["web", "android"],
      ["standard_4x4_pow2_no_undo"],
      "Standard",
    );
    const harness = service({
      accountBody: (path) =>
        path === "/achievements"
          ? {
              success: true,
              data: [
                available,
                definition("web-only", ["web"], []),
                definition("unported", ["android"], ["future_mode"]),
              ],
            }
          : {
              success: true,
              data: [
                {
                  achievement: earnedHidden,
                  earned_at: "2026-07-25T00:00:00.000Z",
                  source: "event",
                },
              ],
            },
    });

    const refreshed = await harness.cloud.refreshAchievements({ userId: 42 });

    expect(harness.accountRequests.map((request) => request.path)).toEqual([
      "/achievements",
      "/user/me/achievements",
    ]);
    expect(refreshed.value.earned).toEqual([
      expect.objectContaining({
        id: "earned-web-secret",
        name: { zhCn: "Secret 中文", en: "Secret English" },
        source: "event",
        requiredModeKeys: ["unported_mode"],
      }),
    ]);
    expect(refreshed.value.available).toEqual([
      expect.objectContaining({
        id: "android-standard",
        name: { zhCn: "Standard 中文", en: "Standard English" },
        earnedAt: null,
        source: null,
      }),
    ]);
    await expect(harness.cloud.readAchievementsCache(42)).resolves.toMatchObject({
      value: refreshed.value,
      fetchedAt: 1_775_000_000_000,
    });
  });

  it("invalidates all first-page history views after delete or restore", async () => {
    const harness = service({ accountBody: { success: true } });

    await harness.cloud.deleteRecord({ userId: 42, recordId: "rec-1" });
    await harness.cloud.restoreRecord({ userId: 42, recordId: "rec-1" });

    expect(harness.accountRequests.map((item) => [item.path, item.init.method]))
      .toEqual([
        ["/records/rec-1", "DELETE"],
        ["/records/rec-1/restore", "POST"],
      ]);
    expect(harness.database.deleteCache).toHaveBeenCalledTimes(18);
  });
});
