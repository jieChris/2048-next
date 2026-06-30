import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  auditProductionDist,
  collectReferences,
  isCheckableLocalRef,
  runProductionDistAudit
} from "../../scripts/production-dist-audit.mjs";

const tempDirs: string[] = [];

async function createTempDist(): Promise<string> {
  const distDir = await mkdtemp(path.join(os.tmpdir(), "production-dist-audit-"));
  tempDirs.push(distDir);
  return distDir;
}

async function writeDistFile(distDir: string, relativePath: string, content: string): Promise<void> {
  const filePath = path.join(distDir, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe("production dist audit", () => {
  it("passes when local references resolve and external/data/hash references are ignored", async () => {
    const distDir = await createTempDist();
    await writeDistFile(
      distDir,
      "index.html",
      [
        '<link rel="stylesheet" href="assets/app.css?v=1">',
        '<script src="/assets/app.js#entry"></script>',
        '<a href="#main">skip hash</a>',
        '<img src="https://example.com/logo.png" alt="">'
      ].join("\n")
    );
    await writeDistFile(
      distDir,
      "assets/app.css",
      [
        "@font-face { src: url('../fonts/app.woff2?v=1'); }",
        ".logo { background-image: url('/meta/logo.png#icon'); }",
        ".inline { background-image: url(data:image/svg+xml,%3Csvg%3E%3C/svg%3E); }"
      ].join("\n")
    );
    await writeDistFile(
      distDir,
      "assets/app.js",
      "const imageUrl = new URL('./image.png', import.meta.url).href; const page = 'beta-login.html';"
    );
    await writeDistFile(
      distDir,
      "site.webmanifest",
      JSON.stringify({
        icons: [
          { src: "./meta/icon-192.png?v=1", sizes: "192x192" },
          { src: "meta/icon-512.png", sizes: "512x512" },
          { src: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E" }
        ],
        start_url: "./2048.html"
      })
    );
    await writeDistFile(distDir, "2048.html", "<h1>2048</h1>");
    await writeDistFile(distDir, "assets/app.js.map", "{}");
    await writeDistFile(distDir, "assets/image.png", "png");
    await writeDistFile(distDir, "fonts/app.woff2", "font");
    await writeDistFile(distDir, "meta/logo.png", "png");
    await writeDistFile(distDir, "meta/icon-192.png", "png");
    await writeDistFile(distDir, "meta/icon-512.png", "png");

    const result = await runProductionDistAudit({ distDir });

    expect(result.issues).toEqual([]);
    expect(result.checkedReferences).toBeGreaterThanOrEqual(8);
  });

  it("reports missing local references", async () => {
    const distDir = await createTempDist();
    await writeDistFile(
      distDir,
      "index.html",
      '<link rel="stylesheet" href="assets/missing.css?v=1">'
    );

    const result = await auditProductionDist({ distDir });

    expect(result.issues).toContain("missing_reference:index.html:assets/missing.css?v=1");
  });

  it("reports forbidden unfinished visual-theme tokens", async () => {
    const distDir = await createTempDist();
    await writeDistFile(distDir, "assets/app.css", ".x { color: var(--lg-surface); }");

    await expect(runProductionDistAudit({ distDir })).rejects.toThrow(
      /forbidden_theme_token:assets\/app\.css:--lg-/
    );
  });

  it("reports references that escape the dist directory", async () => {
    const distDir = await createTempDist();
    await writeDistFile(distDir, "assets/app.css", ".x { background: url('../../outside.png'); }");

    const result = await auditProductionDist({ distDir });

    expect(result.issues).toContain("reference_outside_dist:assets/app.css:../../outside.png");
  });

  it("collects references from html, css, js, json, and webmanifest text", () => {
    expect(collectReferences('<script src="/assets/app.js?v=1"></script>', "index.html")).toEqual([
      "/assets/app.js?v=1"
    ]);
    expect(collectReferences(".x{background:url('../img/logo.png')}", "assets/app.css")).toEqual([
      "../img/logo.png"
    ]);
    expect(collectReferences("const x = './chunk.js';", "assets/app.js")).toEqual([]);
    expect(collectReferences("import('./chunk.js');", "assets/app.js")).toEqual(["./chunk.js"]);
    expect(
      collectReferences("const x = new URL('./image.png', import.meta.url).href;", "assets/app.js")
    ).toEqual(["./image.png"]);
    expect(collectReferences('{"src":"meta/icon-192.png"}', "site.webmanifest")).toEqual([
      "meta/icon-192.png"
    ]);
    expect(isCheckableLocalRef("data:image/svg+xml,%3Csvg%3E")).toBe(false);
    expect(isCheckableLocalRef("https://example.com/app.css")).toBe(false);
    expect(isCheckableLocalRef("#app")).toBe(false);
  });
});
