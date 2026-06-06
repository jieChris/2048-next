import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("home mobile board CSS fallback", () => {
  it("keeps an explicit mobile board height instead of relying on aspect-ratio", () => {
    const css = readFileSync("style/main.css", "utf8");

    expect(css).toContain('body[data-page="game"] .game-container');
    expect(css).toContain("height: calc(100vw - 10px);");
    expect(css).not.toMatch(
      /@supports\s*\(\s*aspect-ratio\s*:\s*1\s*\/\s*1\s*\)\s*\{[\s\S]*?body\[data-page="game"\]\s+\.game-container\s*\{[\s\S]*?height:\s*auto\s*;/
    );
  });
});
