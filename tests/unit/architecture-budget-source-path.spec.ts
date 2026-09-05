import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { collectProjectSourceMetrics } from "../../scripts/architecture-budget-check.mjs";

function git(cwd: string, args: string[]) {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

describe("architecture budget raw Git source paths", () => {
  it("preserves NUL-delimited spaces and unicode while rejecting an untracked backslash path", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "architecture-raw-path-"));
    const supportedPath = "src/normal space-棋.ts";
    const unsupportedPath = String.raw`src/giant\owner.ts`;
    try {
      await mkdir(path.join(root, "src"), { recursive: true });
      await writeFile(
        path.join(root, supportedPath),
        "export const ok = true;\n",
      );
      await writeFile(
        path.join(root, unsupportedPath),
        "export const unsupported = true;\n",
      );
      git(root, ["init", "-q"]);

      const result = await collectProjectSourceMetrics(
        {
          roots: ["src"],
          extensions: [".ts"],
        },
        root,
        { configPath: "config/architecture-budgets.json" },
      );

      expect(result.files.map((file) => file.path)).toEqual([supportedPath]);
      expect(result.violations).toEqual([
        expect.objectContaining({
          code: "unsupported-source-path",
          path: unsupportedPath,
          configPath: "config/architecture-budgets.json",
          suggestedAction: expect.any(String),
          exceptionStatus: "not-applicable",
        }),
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
