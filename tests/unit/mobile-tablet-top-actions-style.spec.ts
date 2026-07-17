import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readStyle(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("mobile tablet top action styles", () => {
  it("applies game top action layout on wide touch tablets", () => {
    const homeActions = readStyle("style/responsive/mobile-home-actions.css");
    const shellGame = readStyle("style/responsive/mobile-shell-game.css");
    const sharedControls = readStyle("style/responsive/mobile-shell-shared-controls.css");

    const tabletQuery =
      "screen and (min-width: 981px) and (max-width: 1366px) and ((hover: none) or (pointer: coarse))";

    expect(homeActions).toContain(tabletQuery);
    expect(shellGame).toContain(tabletQuery);
    expect(sharedControls).toContain(tabletQuery);
  });

  it("keeps desktop-only hiding away from touch tablet controls", () => {
    const wideHiddenControls = readStyle("style/responsive/mobile-wide-hidden-controls.css");
    const homeActions = readStyle("style/responsive/mobile-home-actions.css");

    expect(wideHiddenControls).toContain(
      "@media screen and (min-width: 981px) and (hover: hover) and (pointer: fine)"
    );
    expect(homeActions).toContain(
      "@media screen and (min-width: 981px) and (hover: hover) and (pointer: fine)"
    );
    expect(wideHiddenControls).not.toContain("@media screen and (min-width: 981px) {");
    expect(homeActions).not.toContain("@media screen and (min-width: 981px) {");
  });
});
