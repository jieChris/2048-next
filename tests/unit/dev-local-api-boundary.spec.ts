import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("dev-local API boundary", () => {
  it("defaults local API development to 2048-game-api instead of 2048-ranked", () => {
    const script = readFileSync(path.resolve(process.cwd(), "scripts/dev-local.mjs"), "utf8");

    expect(script).toContain('path.resolve(rootDir, "..", "2048-game-api", "2048-game-api")');
    expect(script).toContain('"dev:server"');
    expect(script).toContain("HTTP_PORT");
    expect(script).not.toContain('path.resolve(rootDir, "..", "2048-ranked")');
    expect(script).not.toContain("2048-ranked repo directory");
  });
});
