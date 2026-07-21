import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readStyle(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("mobile tablet top action styles", () => {
  it("only exposes the undo control on wide touch tablets", () => {
    const homeActions = readStyle("style/responsive/mobile-home-actions.css");
    const shellGame = readStyle("style/responsive/mobile-shell-game.css");
    const sharedControls = readStyle("style/responsive/mobile-shell-shared-controls.css");
    const wideHiddenControls = readStyle("style/responsive/mobile-wide-hidden-controls.css");

    const tabletQuery =
      "screen and (min-width: 981px) and (max-width: 1366px) and ((hover: none) or (pointer: coarse))";

    expect(wideHiddenControls).toContain(tabletQuery);
    expect(wideHiddenControls).toContain(
      'body[data-page="game"] .top-action-buttons .mobile-undo-top-btn'
    );
    expect(homeActions).not.toContain(tabletQuery);
    expect(shellGame).not.toContain(tabletQuery);
    expect(sharedControls).not.toContain(tabletQuery);
  });

  it("keeps wide viewport controls hidden outside the undo exception", () => {
    const wideHiddenControls = readStyle("style/responsive/mobile-wide-hidden-controls.css");
    const homeActions = readStyle("style/responsive/mobile-home-actions.css");

    expect(wideHiddenControls).toContain("@media screen and (min-width: 981px)");
    expect(homeActions).toContain(
      "@media screen and (min-width: 981px) and (hover: hover) and (pointer: fine)"
    );
    expect(homeActions).not.toContain(
      '@media screen and (min-width: 981px) {\n  body[data-page="game"] .top-action-buttons .mobile-actions-expand-toggle'
    );
  });
});
