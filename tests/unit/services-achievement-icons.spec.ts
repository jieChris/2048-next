import { describe, expect, it } from "vitest";

import { achievementIconMarkupFor } from "../../src/services/achievement-icons";

describe("achievement icon markup", () => {
  it("uses stars instead of count labels for milestone tiers", () => {
    const markup = achievementIconMarkupFor({
      id: "tile_2048_count_100",
      name: "第 100 次 2048",
      level: 3,
      series_id: "tile-2048"
    });

    expect(markup?.match(/achievement-tier-star/g)).toHaveLength(3);
    expect(markup).not.toContain("x100");
  });

  it("uses the light enamel stopwatch with a right-side progress gap", () => {
    const markup = achievementIconMarkupFor({
      id: "speed_2048_under_60s",
      name: "1 分钟内 2048",
      level: 5,
      series_id: "speed-2048"
    });

    expect(markup).toContain("achievement-speedrun-progress");
    expect(markup).toContain('stroke-dasharray="88 12"');
    expect(markup).toContain(">1m</text>");
    expect(markup).not.toContain('r="45.5"');
    expect(markup).not.toContain("S+");
  });

  it("uses the vector pioneer badge instead of the legacy image", () => {
    const markup = achievementIconMarkupFor({ id: "beta_pioneer", name: "内测先锋" });

    expect(markup).toContain("pioneer-sun-beta_pioneer");
    expect(markup).not.toContain("beta_pioneer_badge_transparent.png");
  });

  it("uses a cracked egg icon for the breakout easter egg achievement", () => {
    const markup = achievementIconMarkupFor({
      id: "easter_egg_breakout_discovered",
      name: "发现彩蛋",
      series_id: "community-easter-egg"
    });

    expect(markup).toContain("egg-shell-easter_egg_breakout_discovered");
    expect(markup).toContain("achievement-easter-egg-full");
    expect(markup).toContain("achievement-easter-egg-top");
    expect(markup).toContain('class="achievement-easter-egg-shells" transform="translate(8.64 8.64) scale(.82)"');
    expect(markup).toContain('width="96" height="96"');
    expect(markup).toContain("rotate(-15 19 47)");
    expect(markup).toContain("M48 16c-14 0-25 14-29 31");
    expect(markup).not.toContain("egg-yolk");
    expect(markup).not.toContain(">?</text>");
    expect(markup).toContain("#e9c55c");
    expect(markup).toContain("#3db3d8");
  });

  it("uses a lost path icon for the hidden lost-page achievement", () => {
    const markup = achievementIconMarkupFor({
      id: "lost_page_visited",
      name: "你也曾迷路",
      series_id: "community-lost-page"
    });

    expect(markup).toContain("achievement-lost-page-path");
    expect(markup).toContain("achievement-lost-page-pin");
    expect(markup).toContain('width="96" height="96"');
    expect(markup).toContain("#edc22e");
    expect(markup).toContain("#3db3d8");
  });
});
