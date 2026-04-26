import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const PRODUCTION_DIRS = ["js", "src"];
const SOURCE_EXTENSIONS = new Set([".js", ".ts"]);
const ALLOWED_FILES = new Set([path.normalize("js/seedrandom.js")]);

function collectProductionSourceFiles(dir: string): string[] {
  const absoluteDir = path.join(ROOT, dir);
  if (!existsSync(absoluteDir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectProductionSourceFiles(path.join(dir, entry.name)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
    const relativePath = path.normalize(path.relative(ROOT, absolutePath));
    if (ALLOWED_FILES.has(relativePath)) continue;
    out.push(absolutePath);
  }
  return out;
}

describe("production random source audit", () => {
  it("does not use Math.random in production code", () => {
    const offenders = collectProductionSourceFiles("js")
      .concat(collectProductionSourceFiles("src"))
      .flatMap((file) => {
        const relativePath = path.relative(ROOT, file);
        return readFileSync(file, "utf8")
          .split(/\r?\n/)
          .map((line, index) => ({ relativePath, line, lineNumber: index + 1 }))
          .filter((match) => /Math\.random/.test(match.line))
          .map((match) => `${match.relativePath}:${match.lineNumber}:${match.line.trim()}`);
      });

    expect(offenders).toEqual([]);
  });
});
