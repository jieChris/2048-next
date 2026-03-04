import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BATCHES } from "./commit-batch-defs.mjs";

const execFileAsync = promisify(execFile);

async function getChangedFiles() {
  const { stdout } = await execFileAsync("git", [
    "status",
    "--porcelain",
    "--untracked-files=all"
  ]);
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.replace(/\r$/u, ""))
    .filter(Boolean)
    .map((line) => line.slice(3))
    .filter(Boolean);
}

async function main() {
  const files = await getChangedFiles();
  const grouped = new Map(BATCHES.map((batch) => [batch.name, []]));
  const unmatched = [];
  const overlaps = [];

  for (const file of files) {
    const matched = BATCHES.filter((batch) => batch.match(file));
    if (matched.length === 0) {
      unmatched.push(file);
      continue;
    }
    if (matched.length > 1) {
      overlaps.push({ file, batches: matched.map((batch) => batch.name) });
      continue;
    }
    grouped.get(matched[0].name).push(file);
  }

  console.log("[commit-split-check] changed files:", files.length);
  for (const batch of BATCHES) {
    const batchFiles = grouped.get(batch.name);
    console.log(`[commit-split-check] ${batch.name}: ${batchFiles.length}`);
  }

  if (overlaps.length > 0) {
    console.log("[commit-split-check] overlap files:");
    for (const item of overlaps) {
      console.log(`  - ${item.file} -> ${item.batches.join(", ")}`);
    }
    process.exitCode = 1;
    return;
  }

  if (unmatched.length > 0) {
    console.log("[commit-split-check] unmatched files:");
    for (const file of unmatched) {
      console.log(`  - ${file}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("[commit-split-check] PASS: all changed files are covered by split plan");
}

main().catch((error) => {
  console.error(
    "[commit-split-check] failed",
    error && error.message ? error.message : String(error)
  );
  process.exitCode = 1;
});
