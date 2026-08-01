import { describe, expect, it, vi } from "vitest";

import {
  clampPercent,
  hasMergePair,
  initialTiles,
  mergeAndSpawnTiles,
  mergeTiles,
  overlapRatio,
  randomSpawnPoint,
  submitLostPageAchievement,
  spawnPositionsOverlap,
} from "../../src/pages/not-found-playground-page";

describe("404 tile playground", () => {
  it("generates five random pairs at non-overlapping positions", () => {
    const low = initialTiles(() => 0);
    const high = initialTiles(() => 0.999);
    expect(low).toHaveLength(10);
    expect(low.every((tile) => tile.value === 2)).toBe(true);
    expect(high.every((tile) => tile.value === 64)).toBe(true);
    for (let index = 0; index < low.length; index += 2)
      expect(low[index].value).toBe(low[index + 1].value);
    expect(
      low.some((tile, index) =>
        low.slice(index + 1).some((other) => spawnPositionsOverlap(tile, other)),
      ),
    ).toBe(false);
    expect(low.map(({ x, y }) => ({ x, y }))).not.toEqual(
      high.map(({ x, y }) => ({ x, y })),
    );
    for (let seed = 1; seed <= 100; seed += 1) {
      let state = seed;
      const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32);
      expect(initialTiles(random)).toHaveLength(10);
    }
  });

  it("clamps tile centers inside the playground", () => {
    expect(clampPercent(-20, 8)).toBe(8);
    expect(clampPercent(50, 8)).toBe(50);
    expect(clampPercent(120, 8)).toBe(92);
  });

  it("calculates overlap relative to the smaller tile", () => {
    const first = {
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
    };
    const second = {
      left: 50,
      top: 0,
      right: 150,
      bottom: 100,
      width: 100,
      height: 100,
    };
    expect(overlapRatio(first, second)).toBe(0.5);
  });

  it("merges equal tiles and ignores unequal tiles", () => {
    const tiles = initialTiles(() => 0);
    const merged = mergeTiles(tiles, 1, 2);
    expect(merged).toHaveLength(9);
    expect(merged.find((tile) => tile.id === 2)).toMatchObject({
      value: 4,
      tilt: 0,
    });
    const unequal = tiles.map((tile) =>
      tile.id === 3 ? { ...tile, value: 4 } : tile,
    );
    expect(mergeTiles(unequal, 1, 3)).toBe(unequal);
  });

  it("randomizes capped drops without overlapping existing tiles", () => {
    const tiles = initialTiles(() => 0);
    const low = mergeAndSpawnTiles(tiles, 1, 2, 11, () => 0);
    const high = mergeAndSpawnTiles(tiles, 1, 2, 11, () => 0.999);
    const spawned = high.find((tile) => tile.id === 11)!;
    expect(low.find((tile) => tile.id === 11)?.value).toBe(2);
    expect(spawned.value).toBe(64);
    expect(high).toHaveLength(10);
    expect(hasMergePair(high)).toBe(true);
    expect(
      high
        .filter((tile) => tile.id !== spawned.id)
        .some((tile) => spawnPositionsOverlap(tile, spawned)),
    ).toBe(false);
    expect(randomSpawnPoint([], () => 0.123)).toEqual({ x: 19.84, y: 19.84 });
  });

  it("matches an existing low tile when a merge would leave no pair", () => {
    const tiles = [
      { id: 1, value: 128, x: 10, y: 10, tilt: 0 },
      { id: 2, value: 128, x: 30, y: 10, tilt: 0 },
      { id: 3, value: 2, x: 50, y: 10, tilt: 0 },
      { id: 4, value: 1024, x: 70, y: 10, tilt: 0 },
    ];
    const next = mergeAndSpawnTiles(tiles, 1, 2, 5, () => 0.5);
    expect(next.find((tile) => tile.id === 5)?.value).toBe(2);
    expect(hasMergePair(next)).toBe(true);
  });

  it("adds a low pair and recycles one old high tile at the 12-tile cap", () => {
    const values = [
      64, 64, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536,
      131072,
    ];
    const tiles = values.map((value, index) => ({
      id: index + 1,
      value,
      x: 10 + (index % 5) * 20,
      y: 10 + Math.floor(index / 5) * 20,
      tilt: 0,
    }));
    const next = mergeAndSpawnTiles(tiles, 1, 2, 13, () => 0.5);
    const spawned = next.filter((tile) => tile.id >= 13);
    expect(next).toHaveLength(12);
    expect(spawned.map((tile) => tile.value)).toEqual([16, 16]);
    expect(next.some((tile) => tile.id === 3)).toBe(false);
    expect(hasMergePair(next)).toBe(true);
    expect(
      spawned.some((tile, index) =>
        next.some(
          (other) =>
            other.id !== tile.id &&
            (other.id < 13 || other.id < spawned[index].id) &&
            spawnPositionsOverlap(tile, other),
        ),
      ),
    ).toBe(false);
  });

  it("submits the lost-page achievement only for signed-in users", async () => {
    const service = { grantMyAchievementEvent: vi.fn() };
    await submitLostPageAchievement({
      service,
      storageLike: {
        getItem: () => null,
      } as never,
    });
    expect(service.grantMyAchievementEvent).not.toHaveBeenCalled();

    const showAchievementUnlockToast = vi.fn();
    const achievementPayload = {
      success: true,
      newly_granted: true,
      data: {
        achievement: {
          id: "lost_page_visited",
          name: "你也曾迷路",
        },
      },
    };
    service.grantMyAchievementEvent.mockResolvedValue(achievementPayload);
    await submitLostPageAchievement({
      runtime: { showAchievementUnlockToast } as never,
      service,
      storageLike: {
        getItem: () => "token",
      } as never,
    });

    expect(service.grantMyAchievementEvent).toHaveBeenCalledWith("lost_page_visited");
    expect(showAchievementUnlockToast).toHaveBeenCalledWith(achievementPayload);
  });
});
