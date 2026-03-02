import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BATCH_DEFS } from "./commit-batch-defs.mjs";

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const args = { batch: "", stage: false };
  for (const arg of argv) {
    if (arg.startsWith("--batch=")) {
      args.batch = arg.slice("--batch=".length);
      continue;
    }
    if (arg === "--stage") {
      args.stage = true;
    }
  }
  return args;
}

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

function fail(message) {
  throw new Error(message);
}

async function stageFiles(files) {
  if (files.length === 0) return;
  await execFileAsync("git", ["add", "--", ...files]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.batch || !Object.prototype.hasOwnProperty.call(BATCH_DEFS, args.batch)) {
    fail("usage: node scripts/stage-commit-batch.mjs --batch=<1|2|3|4> [--stage]");
  }

  const batch = BATCH_DEFS[args.batch];
  const files = (await getChangedFiles()).filter((file) => batch.match(file));

  console.log(`[stage-commit-batch] ${batch.name}`);
  console.log(`[stage-commit-batch] matched files: ${files.length}`);
  for (const file of files) {
    console.log(`  - ${file}`);
  }

  if (!args.stage) {
    console.log("[stage-commit-batch] dry-run only (add --stage to actually git add)");
    return;
  }

  await stageFiles(files);
  console.log("[stage-commit-batch] staged");
}

main().catch((error) => {
  console.error(
    "[stage-commit-batch] failed",
    error && error.message ? error.message : String(error)
  );
  process.exitCode = 1;
});
