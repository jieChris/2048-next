import { describe, expect, it, vi } from "vitest";

import { createAchievementsService } from "../../src/services/achievements";

describe("services: achievements", () => {
  it("reads public achievements through the typed client", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ success: true, data: [] })
    };
    const service = createAchievementsService({ client });

    await expect(service.listAchievements()).resolves.toEqual({ success: true, data: [] });

    expect(client.request).toHaveBeenCalledWith("get", "/achievements");
  });

  it("updates the current user's showcase with at most three achievement ids", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ success: true, data: { achievements: [] } })
    };
    const service = createAchievementsService({ client });

    await expect(service.updateMyShowcase(["a-1", "a-2", "a-3"])).resolves.toEqual({
      success: true,
      data: { achievements: [] }
    });

    expect(client.request).toHaveBeenCalledWith("put", "/user/me/achievement-showcase", {
      body: { achievement_ids: ["a-1", "a-2", "a-3"] }
    });
  });

  it("submits known current-user achievement events", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ success: true, data: { achievement: { id: "easter_egg_breakout_discovered" } } })
    };
    const service = createAchievementsService({ client });

    await expect(service.grantMyAchievementEvent("breakout_easter_egg_discovered")).resolves.toEqual({
      success: true,
      data: { achievement: { id: "easter_egg_breakout_discovered" } }
    });

    expect(client.request).toHaveBeenCalledWith("post", "/user/me/achievement-events", {
      body: { event_id: "breakout_easter_egg_discovered" }
    });
  });

  it("rejects showcase updates with more than three achievement ids before calling the API", async () => {
    const client = {
      request: vi.fn()
    };
    const service = createAchievementsService({ client });

    await expect(service.updateMyShowcase(["a-1", "a-2", "a-3", "a-4"])).resolves.toEqual({
      success: false,
      code: "ACHIEVEMENT_SHOWCASE_LIMIT",
      error: "最多只能展示 3 个成就"
    });

    expect(client.request).not.toHaveBeenCalled();
  });

  it("creates admin achievements through the typed client", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ success: true, data: { id: "first-2048" } })
    };
    const service = createAchievementsService({ client });

    await expect(
      service.createAdminAchievement({
        name: "首次 2048",
        description: "首次合成 2048",
        status: "draft",
        rules: [{ type: "max_tile_reached", params: { tile: 2048 } }]
      })
    ).resolves.toEqual({ success: true, data: { id: "first-2048" } });

    expect(client.request).toHaveBeenCalledWith("post", "/admin/achievements", {
      body: {
        name: "首次 2048",
        description: "首次合成 2048",
        status: "draft",
        rules: [{ type: "max_tile_reached", params: { tile: 2048 } }]
      }
    });
  });

  it("reads the current user's showcase achievements", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ success: true, data: { achievements: [] } })
    };
    const service = createAchievementsService({ client });

    await expect(service.getMyShowcase()).resolves.toEqual({
      success: true,
      data: { achievements: [] }
    });

    expect(client.request).toHaveBeenCalledWith("get", "/user/me/achievement-showcase");
  });

  it("updates admin achievements and their rules through typed paths", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ success: true, data: { id: "first-2048" } })
    };
    const service = createAchievementsService({ client });

    await service.updateAdminAchievement("first-2048", { status: "active" });
    await service.replaceAdminAchievementRules("first-2048", [
      { type: "nth_max_tile_reached", params: { tile: 2048, count: 200 } }
    ]);

    expect(client.request).toHaveBeenNthCalledWith(1, "patch", "/admin/achievements/{achievementId}", {
      path: { achievementId: "first-2048" },
      body: { status: "active" }
    });
    expect(client.request).toHaveBeenNthCalledWith(2, "post", "/admin/achievements/{achievementId}/rules", {
      path: { achievementId: "first-2048" },
      body: { rules: [{ type: "nth_max_tile_reached", params: { tile: 2048, count: 200 } }] }
    });
  });

  it("grants and backfills achievements through admin endpoints", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ success: true })
    };
    const service = createAchievementsService({ client });

    await service.grantAdminAchievement({ user_id: 19, achievement_id: "event-king" });
    await service.backfillAdminAchievements({ achievement_id: "first-2048" });

    expect(client.request).toHaveBeenNthCalledWith(1, "post", "/admin/achievements/grant", {
      body: { user_id: 19, achievement_id: "event-king" }
    });
    expect(client.request).toHaveBeenNthCalledWith(2, "post", "/admin/achievements/backfill", {
      body: { achievement_id: "first-2048" }
    });
  });
});
