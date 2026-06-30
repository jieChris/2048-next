import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  auditResourceBudget,
  formatSize,
  runResourceBudgetCheck
} from "../../scripts/resource-budget-check.mjs";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "resource-budget-check-"));
  tempDirs.push(dir);
  return dir;
}

async function writeSizedFile(rootDir: string, relativePath: string, bytes: number): Promise<void> {
  const filePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.alloc(bytes, 1));
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe("resource budget check", () => {
  it("formats byte sizes for reports", () => {
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(1024)).toBe("1.0 KB");
    expect(formatSize(1024 * 1024)).toBe("1.00 MB");
  });

  it("reports a missing dist directory as a release-blocking issue", async () => {
    const rootDir = await createTempDir();
    const result = await auditResourceBudget({ distDir: path.join(rootDir, "missing") });

    expect(result.issues).toContainEqual(expect.objectContaining({ type: "dist_missing" }));
  });

  it("passes when files stay inside per-type and total budgets", async () => {
    const distDir = await createTempDir();
    await writeSizedFile(distDir, "assets/app.js", 120 * 1024);
    await writeSizedFile(distDir, "assets/main.css", 80 * 1024);
    await writeSizedFile(distDir, "meta/icon-192.png", 120 * 1024);
    await writeSizedFile(distDir, "audio/bgm.ogg", 300 * 1024);
    await writeSizedFile(distDir, "index.html", 8 * 1024);

    const result = await runResourceBudgetCheck({ distDir });

    expect(result.issues).toEqual([]);
    expect(result.fileCount).toBe(5);
    expect(result.totalBytes).toBeGreaterThan(0);
  });

  it("flags oversized files and total dist growth", async () => {
    const distDir = await createTempDir();
    await writeSizedFile(distDir, "assets/large.js", 901 * 1024);
    await writeSizedFile(distDir, "assets/large.css", 201 * 1024);
    await writeSizedFile(distDir, "meta/large.png", 901 * 1024);
    await writeSizedFile(distDir, "audio/large.ogg", 5 * 1024 * 1024);

    const result = await auditResourceBudget({
      distDir,
      totalMaxBytes: 1024 * 1024
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "file_over_budget", file: "assets/large.js" }),
        expect.objectContaining({ type: "file_over_budget", file: "assets/large.css" }),
        expect.objectContaining({ type: "file_over_budget", file: "meta/large.png" }),
        expect.objectContaining({ type: "file_over_budget", file: "audio/large.ogg" }),
        expect.objectContaining({ type: "total_over_budget" })
      ])
    );
  });

  it("throws with actionable issue output when budgets fail", async () => {
    const distDir = await createTempDir();
    await writeSizedFile(distDir, "assets/large.js", 901 * 1024);

    await expect(runResourceBudgetCheck({ distDir })).rejects.toThrow(
      /file_over_budget:assets\/large\.js/
    );
  });
});
