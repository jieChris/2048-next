import { spawn, spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import fs from "node:fs";

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
  { name: "entry-manifest-audit", cmd: "node", args: ["scripts/entry-manifest-audit.mjs"] },
  { name: "unit", cmd: "npm", args: ["run", "test:unit"] },
  { name: "smoke", cmd: "npm", args: ["run", smokeScript] },
  { name: "build", cmd: "npm", args: ["run", "build"] }
];

function isSmokeScriptName(name) {
  return typeof name === "string" && name.startsWith("test:smoke");
}

function validateChromiumExecutable(executable) {
  const result = spawnSync(executable, ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status === 0) return { ok: true };

  const errorOutput = String(result.stderr || result.stdout || "").trim();
  return {
    ok: false,
    reason: errorOutput || `chromium validation failed with status=${String(result.status)}`
  };
}

async function checkSmokePrecondition() {
  try {
    const playwright = await import("@playwright/test");
    const chromiumExecutable = playwright.chromium.executablePath();
    if (!chromiumExecutable || !fs.existsSync(chromiumExecutable)) {
      return {
        ok: false,
        executable: chromiumExecutable || null,
        reason: "Playwright chromium executable is missing"
      };
    }

    const validation = validateChromiumExecutable(chromiumExecutable);
    if (!validation.ok) {
      return {
        ok: false,
        executable: chromiumExecutable,
        reason: validation.reason || "Playwright chromium executable is not runnable"
      };
    }

    return { ok: true, executable: chromiumExecutable };
  } catch (err) {
    return { ok: false, executable: null, reason: err instanceof Error ? err.message : String(err) };
  }
}

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
    if (step.name === "smoke" && isSmokeScriptName(smokeScript)) {
      const precondition = await checkSmokePrecondition();
      if (!precondition.ok) {
        console.error("[verify:refactor] smoke precondition check failed");
        if (precondition.executable) {
          console.error(`[verify:refactor] chromium path: ${precondition.executable}`);
        }
        if (precondition.reason) {
          console.error(`[verify:refactor] reason: ${precondition.reason}`);
        }
        console.error("[verify:refactor] fix:");
        console.error("[verify:refactor]   npx playwright install chromium");
        console.error("[verify:refactor]   npx playwright install-deps chromium");
        results.push({ name: "smoke", ok: false, code: 1, signal: null, durationMs: 0 });
        break;
      }
    }

    console.log(`[verify:refactor] running ${step.name}...`);
    const result = await runStep(step);
    results.push(result);
    if (!result.ok) {
      console.error(
        `[verify:refactor] ${result.name} failed ` +
          `(code=${String(result.code)}, signal=${String(result.signal)}) ` +
          `after ${formatDuration(result.durationMs)}`
      );
      if (result.name === "smoke") {
        console.error("[verify:refactor] smoke hint: ensure browser binary and Linux deps are installed:");
        console.error("[verify:refactor]   npx playwright install chromium");
        console.error("[verify:refactor]   npx playwright install-deps chromium");
      }
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
    console.log(`  - ${status} ${result.name} (${formatDuration(result.durationMs)})`);
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
