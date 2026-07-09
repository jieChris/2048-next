import { describe, expect, it } from "vitest";

import { achievementIconMarkupFor } from "../../src/services/achievement-icons";

describe("achievement icon markup", () => {
  it("uses a cracked egg icon for the breakout easter egg achievement", () => {
    const markup = achievementIconMarkupFor({
      id: "easter_egg_breakout_discovered",
      name: "发现彩蛋",
      series_id: "community-easter-egg"
    });

    expect(markup).toContain("egg-yolk-easter_egg_breakout_discovered");
    expect(markup).toContain("achievement-easter-egg-full");
    expect(markup).toContain("achievement-easter-egg-top");
    expect(markup).toContain('width="96" height="96"');
    expect(markup).toContain("rotate(-10 20 49)");
    expect(markup).toContain("#edc22e");
    expect(markup).toContain("#3db3d8");
  });
});
