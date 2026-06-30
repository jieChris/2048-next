import { describe, expect, it } from "vitest";
import { readCssEntry } from "./css-test-utils";

describe("home mobile board CSS fallback", () => {
  it("keeps an explicit mobile board height instead of relying on aspect-ratio", () => {
    const css = readCssEntry("style/main.css");

    expect(css).toContain('body[data-page="game"] .game-container');
    expect(css).toContain("height: calc(100vw - 10px);");
    expect(css).not.toMatch(
      /@supports\s*\(\s*aspect-ratio\s*:\s*1\s*\/\s*1\s*\)\s*\{[\s\S]*?body\[data-page="game"\]\s+\.game-container\s*\{[\s\S]*?height:\s*auto\s*;/
    );
  });
});
