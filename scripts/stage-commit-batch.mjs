import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BATCH_DEFS } from "./commit-batch-defs.mjs";

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const args = {
    batch:
      process.env.npm_config_batch ||
      process.env.BATCH ||
      "",
    stage:
      process.env.npm_config_stage === "true" ||
      process.env.STAGE === "true",
    help: false
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg.startsWith("--batch=")) {
      args.batch = arg.slice("--batch=".length);
      continue;
    }
    if (arg === "--batch" || arg === "-b") {
      const next = argv[i + 1];
      if (next) {
        args.batch = next;
        i += 1;
      }
      continue;
    }
    if (arg === "--stage" || arg === "-s") {
      args.stage = true;
      continue;
    }
    if (/^[1-4]$/u.test(arg) && !args.batch) {
      args.batch = arg;
    }
  }
  return args;
}

function printUsage() {
  console.log("usage: node scripts/stage-commit-batch.mjs --batch=<1|2|3|4> [--stage]");
  console.log("also supports: --batch 1 / -b 1 / npm_config_batch=1");
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
  if (args.help) {
    printUsage();
    return;
  }
  if (!args.batch || !Object.prototype.hasOwnProperty.call(BATCH_DEFS, args.batch)) {
    printUsage();
    fail("invalid or missing --batch");
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
