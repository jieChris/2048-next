import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";

function parseSmokeScriptArg(argv) {
  for (const arg of argv) {
    if (typeof arg !== "string") continue;
    if (!arg.startsWith("--smoke-script=")) continue;
    const value = arg.slice("--smoke-script=".length).trim();
    if (value) return value;
  }
  return null;
}

const smokeScriptArg = parseSmokeScriptArg(process.argv.slice(2));
const smokeScript = smokeScriptArg || "test:smoke";

const STEPS = [
  { name: "game-manager-audit", cmd: "node", args: ["scripts/game-manager-audit.mjs"] },
  { name: "unit", cmd: "npm", args: ["run", "test:unit"] },
  { name: "smoke", cmd: "npm", args: ["run", smokeScript] },
  { name: "build", cmd: "npm", args: ["run", "build"] }
];

function runStep(step) {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const child = spawn(step.cmd, step.args, {
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("close", (code, signal) => {
      const durationMs = Math.round(performance.now() - startedAt);
      resolve({
        name: step.name,
        ok: code === 0,
        code: typeof code === "number" ? code : null,
        signal: signal || null,
        durationMs
      });
    });
  });
}

function formatDuration(ms) {
  const sec = (ms / 1000).toFixed(2);
  return `${sec}s`;
}

async function main() {
  const suiteStartedAt = performance.now();
  const results = [];

  console.log("[verify:refactor] start");
  console.log(`[verify:refactor] smoke script: ${smokeScript}`);
  for (const step of STEPS) {
    console.log(`[verify:refactor] running ${step.name}...`);
    const result = await runStep(step);
    results.push(result);
    if (!result.ok) {
      console.error(
        `[verify:refactor] ${result.name} failed ` +
          `(code=${String(result.code)}, signal=${String(result.signal)}) ` +
          `after ${formatDuration(result.durationMs)}`
      );
      break;
    }
    console.log(
      `[verify:refactor] ${result.name} passed in ${formatDuration(result.durationMs)}`
    );
  }

  const totalMs = Math.round(performance.now() - suiteStartedAt);
  const failed = results.find((r) => !r.ok) || null;

  console.log("[verify:refactor] summary");
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    console.log(
      `  - ${status} ${result.name} (${formatDuration(result.durationMs)})`
    );
  }
  console.log(`  - TOTAL ${formatDuration(totalMs)}`);

  if (failed) {
    process.exitCode = 1;
    return;
  }
  console.log("[verify:refactor] all gates passed");
}

main().catch((err) => {
  console.error("[verify:refactor] unexpected error", err);
  process.exitCode = 1;
});
