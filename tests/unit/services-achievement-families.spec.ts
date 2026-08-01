import { describe, expect, it } from "vitest";

import {
  groupAchievementFamilies,
  highestAchievementPerFamily
} from "../../src/services/achievement-families";

const achievements = [
  { id: "tile_2048_count_1", seriesId: "tile-2048", level: 1, sortOrder: 100 },
  { id: "tile_2048_count_10", seriesId: "tile-2048", level: 2, sortOrder: 101 },
  { id: "tile_2048_count_100", seriesId: "tile-2048", level: 3, sortOrder: 102 },
  { id: "speed_2048_under_300s", seriesId: "speed-2048", level: 1, sortOrder: 1100 },
  { id: "speed_2048_under_240s", seriesId: "speed-2048", level: 2, sortOrder: 1101 },
  { id: "speed_2048_under_180s", seriesId: "speed-2048", level: 3, sortOrder: 1102 },
  { id: "speed_2048_under_120s", seriesId: "speed-2048", level: 4, sortOrder: 1103 },
  { id: "speed_2048_under_60s", seriesId: "speed-2048", level: 5, sortOrder: 1104 },
  { id: "beta_pioneer", seriesId: "community-beta", level: 1, sortOrder: 2000 }
];

describe("services: achievement families", () => {
  it("groups multi-level series while leaving one-off achievements independent", () => {
    const families = groupAchievementFamilies(achievements);

    expect(families.map((family) => [family.seriesId, family.isSeries, family.items.length])).toEqual([
      ["tile-2048", true, 3],
      ["speed-2048", true, 5],
      ["community-beta", false, 1]
    ]);
    expect(families[1]?.items.map((item) => item.level)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps only the highest tier from each family for an unlock queue", () => {
    const newest = highestAchievementPerFamily([
      achievements[0],
      achievements[2],
      achievements[3],
      achievements[6],
      achievements[7]
    ]);

    expect(newest.map((item) => item.id)).toEqual([
      "tile_2048_count_100",
      "speed_2048_under_60s"
    ]);
  });
});
