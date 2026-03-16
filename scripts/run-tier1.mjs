/**
 * Reads tests/tier-1.txt and runs vitest with the listed spec files.
 *
 * This keeps the single source of truth in tier-1.txt instead of
 * duplicating the file list inside package.json.
 */

import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const tier1Path = path.resolve(projectRoot, "tests", "tier-1.txt");

const raw = await readFile(tier1Path, "utf8");

const specFiles = raw
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith("#"));

if (specFiles.length === 0) {
  console.error("[run-tier1] No spec files found in tests/tier-1.txt");
  process.exit(1);
}

const cmd = ["npx", "vitest", "run", ...specFiles].join(" ");

try {
  execSync(cmd, {
    cwd: projectRoot,
    stdio: "inherit"
  });
} catch (error) {
  // vitest already printed its output via stdio: "inherit"
  process.exitCode = error.status || 1;
}
