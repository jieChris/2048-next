import { describe, expect, it } from "vitest";

import { readCssEntry } from "./css-test-utils";

describe("timerbox CSS cascade", () => {
  it("keeps timer progress cells wider than the base timer tile", () => {
    const css = readCssEntry("style/main.css");
    const baseTileIndex = css.indexOf(".timertile {");
    const progressCellIndex = css.indexOf(".timer-progress-cell {");

    expect(baseTileIndex).toBeGreaterThan(-1);
    expect(progressCellIndex).toBeGreaterThan(baseTileIndex);
    expect(css.slice(progressCellIndex, progressCellIndex + 140)).toContain(
      "width: var(--timerbox-main-tile-width);"
    );
  });
});
