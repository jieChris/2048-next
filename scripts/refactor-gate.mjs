import { spawn, spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const ARTIFACTS_DIR = path.resolve(PROJECT_ROOT, "artifacts");
const STEP_LOG_DIR = path.resolve(ARTIFACTS_DIR, "refactor-gate", "steps");
const STEP_LOG_MODE_ENV_KEY = "REFACTOR_GATE_LOG_MODE";
const STEP_OUTPUT_TAIL_LINES_ENV_KEY = "REFACTOR_GATE_OUTPUT_TAIL_LINES";
const SUMMARY_JSON_PATH_ENV_KEY = "REFACTOR_GATE_SUMMARY_PATH";
const SUMMARY_MARKDOWN_PATH_ENV_KEY = "REFACTOR_GATE_SUMMARY_MARKDOWN_PATH";
const DEFAULT_SUMMARY_JSON_REL_PATH = "artifacts/refactor-gate-summary.json";
const DEFAULT_SUMMARY_MARKDOWN_REL_PATH = "artifacts/refactor-gate-summary.md";
const DEFAULT_STEP_OUTPUT_TAIL_LINES = 80;
const MAX_STEP_OUTPUT_TAIL_LINES = 240;

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
const DEFAULT_CHROMIUM_VALIDATE_TIMEOUT_MS = 30_000;
const DEFAULT_STEP_TIMEOUT_MS = 300_000;
const STEP_TIMEOUT_DEFAULT_ENV_KEY = "REFACTOR_GATE_TIMEOUT_DEFAULT_MS";
const STEP_TIMEOUT_BY_NAME_MS = {
  "game-manager-audit": 60_000,
  "entry-manifest-audit": 60_000,
  "page-legacy-runtime-boundary-audit": 60_000,
  "legacy-boundary-audit": 60_000,
  "service-boundary-audit": 60_000,
  "contracts-matrix-audit": 60_000,
  "engine-audit": 60_000,
  unit: 300_000,
  smoke: 300_000,
  build: 180_000
};
const STEP_TIMEOUT_ENV_KEY_BY_NAME = {
  "game-manager-audit": "REFACTOR_GATE_TIMEOUT_GAME_MANAGER_AUDIT_MS",
  "entry-manifest-audit": "REFACTOR_GATE_TIMEOUT_ENTRY_MANIFEST_AUDIT_MS",
  "page-legacy-runtime-boundary-audit":
    "REFACTOR_GATE_TIMEOUT_PAGE_LEGACY_RUNTIME_BOUNDARY_AUDIT_MS",
  "legacy-boundary-audit": "REFACTOR_GATE_TIMEOUT_LEGACY_BOUNDARY_AUDIT_MS",
  "service-boundary-audit": "REFACTOR_GATE_TIMEOUT_SERVICE_BOUNDARY_AUDIT_MS",
  "contracts-matrix-audit": "REFACTOR_GATE_TIMEOUT_CONTRACTS_MATRIX_AUDIT_MS",
  "engine-audit": "REFACTOR_GATE_TIMEOUT_ENGINE_AUDIT_MS",
  unit: "REFACTOR_GATE_TIMEOUT_UNIT_MS",
  smoke: "REFACTOR_GATE_TIMEOUT_SMOKE_MS",
  build: "REFACTOR_GATE_TIMEOUT_BUILD_MS"
};

const STEPS = [
  { name: "game-manager-audit", cmd: "node", args: ["scripts/game-manager-audit.mjs"] },
  { name: "entry-manifest-audit", cmd: "node", args: ["scripts/entry-manifest-audit.mjs"] },
  {
    name: "page-legacy-runtime-boundary-audit",
    cmd: "node",
    args: ["scripts/page-legacy-runtime-boundary-audit.mjs"]
  },
  { name: "legacy-boundary-audit", cmd: "node", args: ["scripts/legacy-boundary-audit.mjs"] },
  { name: "service-boundary-audit", cmd: "node", args: ["scripts/service-boundary-audit.mjs"] },
  { name: "contracts-matrix-audit", cmd: "node", args: ["scripts/contracts-matrix-audit.mjs"] },
  { name: "engine-audit", cmd: "node", args: ["scripts/engine-audit.mjs"] },
  { name: "unit", cmd: "npm", args: ["run", "test:unit"] },
  { name: "smoke", cmd: "npm", args: ["run", smokeScript] },
  { name: "build", cmd: "npm", args: ["run", "build"] }
];

function isSmokeScriptName(name) {
  return typeof name === "string" && name.startsWith("test:smoke");
}

function parsePositiveInteger(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function resolveLogMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "verbose" ? "verbose" : "compact";
}

function resolveStepOutputTailLines(value) {
  const parsed = parsePositiveInteger(value);
  if (parsed === null) return DEFAULT_STEP_OUTPUT_TAIL_LINES;
  return Math.min(parsed, MAX_STEP_OUTPUT_TAIL_LINES);
}

function toPortablePath(filePath) {
  return String(filePath || "").replace(/\\/g, "/");
}

function toProjectRelativePath(filePath) {
  if (!filePath) return null;
  return toPortablePath(path.relative(PROJECT_ROOT, filePath));
}

function resolveSummaryJsonPath() {
  const env = process.env || {};
  const configured = env[SUMMARY_JSON_PATH_ENV_KEY] || DEFAULT_SUMMARY_JSON_REL_PATH;
  return path.resolve(PROJECT_ROOT, configured);
}

function resolveSummaryMarkdownPath() {
  const env = process.env || {};
  const configured = env[SUMMARY_MARKDOWN_PATH_ENV_KEY] || DEFAULT_SUMMARY_MARKDOWN_REL_PATH;
  return path.resolve(PROJECT_ROOT, configured);
}

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeStepLogFileName(stepName) {
  return `${String(stepName || "unknown").replace(/[^A-Za-z0-9_-]/g, "_")}.latest.log`;
}

function createTailState(maxLines = DEFAULT_STEP_OUTPUT_TAIL_LINES) {
  return {
    carry: "",
    lines: [],
    maxLines
  };
}

function appendChunkToTailState(state, chunk) {
  if (!state || !chunk) return;
  const text = state.carry + String(chunk);
  const parts = text.split(/\r?\n/);
  state.carry = parts.pop() || "";
  for (const line of parts) {
    state.lines.push(line);
    if (state.lines.length > state.maxLines) {
      state.lines.shift();
    }
  }
}

function finalizeTailState(state) {
  if (!state) return "";
  if (state.carry) {
    state.lines.push(state.carry);
    if (state.lines.length > state.maxLines) {
      state.lines.splice(0, state.lines.length - state.maxLines);
    }
    state.carry = "";
  }
  return state.lines.join("\n").trim();
}

function formatDuration(ms) {
  const sec = (ms / 1000).toFixed(2);
  return `${sec}s`;
}

function resolveHeadlessShellPathFromChromiumPath(chromiumExecutable) {
  if (typeof chromiumExecutable !== "string" || !chromiumExecutable) return null;
  const match = chromiumExecutable.match(/(.*)\/chromium-(\d+)\/chrome-linux64\/chrome$/);
  if (!match) return null;
  const [, prefix, revision] = match;
  return `${prefix}/chromium_headless_shell-${revision}/chrome-headless-shell-linux64/chrome-headless-shell`;
}

function validateChromiumExecutable(
  executable,
  {
    timeoutMs = DEFAULT_CHROMIUM_VALIDATE_TIMEOUT_MS,
    args = ["--version"]
  } = {}
) {
  const result = spawnSync(executable, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs
  });
  if (result.status === 0) return { ok: true, timedOut: false };
  if (result.error && result.error.code === "ETIMEDOUT") {
    return {
      ok: false,
      timedOut: true,
      reason: `executable validation timed out after ${String(timeoutMs)}ms`
    };
  }

  const errorOutput = String(result.stderr || result.stdout || "").trim();
  return {
    ok: false,
    timedOut: false,
    reason: errorOutput || `chromium validation failed with status=${String(result.status)}`
  };
}

function shouldSkipExecutableValidationOnCurrentPlatform() {
  const env = process.env || {};
  const forcePrecheck = String(env.REFACTOR_GATE_FORCE_SMOKE_PRECHECK || "")
    .trim()
    .toLowerCase();
  if (forcePrecheck === "1" || forcePrecheck === "true") return false;
  return process.platform === "win32";
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

    if (shouldSkipExecutableValidationOnCurrentPlatform()) {
      return { ok: true, executable: chromiumExecutable };
    }

    const validation = validateChromiumExecutable(chromiumExecutable);
    if (!validation.ok) {
      return {
        ok: false,
        executable: chromiumExecutable,
        reason: validation.reason || "Playwright chromium executable is not runnable"
      };
    }

    const headlessShellPath = resolveHeadlessShellPathFromChromiumPath(chromiumExecutable);
    if (headlessShellPath) {
      if (!fs.existsSync(headlessShellPath)) {
        return {
          ok: false,
          executable: headlessShellPath,
          reason: "Playwright chromium headless shell executable is missing"
        };
      }
      const headlessValidation = validateChromiumExecutable(headlessShellPath);
      if (!headlessValidation.ok) {
        return {
          ok: false,
          executable: headlessShellPath,
          reason:
            headlessValidation.reason ||
            "Playwright chromium headless shell executable is not runnable"
        };
      }
    }

    return { ok: true, executable: chromiumExecutable };
  } catch (err) {
    return { ok: false, executable: null, reason: err instanceof Error ? err.message : String(err) };
  }
}

function resolveStepTimeoutMs(stepName) {
  const env = process.env || {};
  const stepEnvKey = STEP_TIMEOUT_ENV_KEY_BY_NAME[stepName];
  if (stepEnvKey) {
    const parsedStepTimeout = parsePositiveInteger(env[stepEnvKey]);
    if (parsedStepTimeout !== null) {
      return parsedStepTimeout;
    }
  }
  const parsedDefaultTimeout = parsePositiveInteger(env[STEP_TIMEOUT_DEFAULT_ENV_KEY]);
  if (parsedDefaultTimeout !== null) {
    return parsedDefaultTimeout;
  }
  return STEP_TIMEOUT_BY_NAME_MS[stepName] || DEFAULT_STEP_TIMEOUT_MS;
}

function runStep(
  step,
  {
    logMode = "compact",
    stepLogDir = STEP_LOG_DIR,
    tailLines = DEFAULT_STEP_OUTPUT_TAIL_LINES
  } = {}
) {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    let settled = false;
    ensureDirectory(stepLogDir);
    const stepLogPath = path.resolve(stepLogDir, sanitizeStepLogFileName(step.name));
    const logStream = fs.createWriteStream(stepLogPath, { flags: "w" });
    const outputTailState = createTailState(tailLines);
    const child = spawn(step.cmd, step.args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32"
    });
    const timeoutMs = resolveStepTimeoutMs(step.name);

    function finalize(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      const durationMs = Math.round(performance.now() - startedAt);
      logStream.end();
      resolve({
        ...result,
        name: step.name,
        timeoutMs,
        durationMs,
        logPath: stepLogPath,
        outputTail: finalizeTailState(outputTailState)
      });
    }

    const timeoutHandle = setTimeout(() => {
      const killed = child.kill();
      if (!killed) {
        child.kill("SIGKILL");
      }
      finalize({
        ok: false,
        code: null,
        signal: "TIMEOUT"
      });
    }, timeoutMs);

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        logStream.write(chunk);
        appendChunkToTailState(outputTailState, chunk);
        if (logMode === "verbose") {
          process.stdout.write(chunk);
        }
      });
    }
    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        logStream.write(chunk);
        appendChunkToTailState(outputTailState, chunk);
        if (logMode === "verbose") {
          process.stderr.write(chunk);
        }
      });
    }

    child.on("error", (err) => {
      const message = err instanceof Error ? err.message : String(err);
      logStream.write(`\n[verify:refactor] spawn error: ${message}\n`);
      appendChunkToTailState(outputTailState, message);
      finalize({
        ok: false,
        code: null,
        signal: "SPAWN_ERROR"
      });
    });

    child.on("close", (code, signal) => {
      finalize({
        ok: code === 0,
        code: typeof code === "number" ? code : null,
        signal: signal || null
      });
    });
  });
}

function printStepOutputTail(stepResult) {
  if (!stepResult || !stepResult.outputTail) return;
  console.error("[verify:refactor] output tail:");
  for (const line of stepResult.outputTail.split(/\r?\n/)) {
    console.error(`[verify:refactor]   ${line}`);
  }
}

function createSummaryPayload({ results, totalMs, smokeScriptName, logMode, outputTailLines }) {
  const failed = results.find((result) => !result.ok) || null;
  return {
    generatedAt: new Date().toISOString(),
    status: failed ? "failed" : "passed",
    smokeScript: smokeScriptName,
    logMode,
    outputTailLines,
    totalMs,
    totalDuration: formatDuration(totalMs),
    failedStep: failed ? failed.name : null,
    steps: results.map((result) => ({
      name: result.name,
      status: result.ok ? "PASS" : "FAIL",
      code: result.code,
      signal: result.signal,
      timeoutMs: result.timeoutMs,
      durationMs: result.durationMs,
      duration: formatDuration(result.durationMs),
      logPath: toProjectRelativePath(result.logPath)
    }))
  };
}

function renderSummaryMarkdown(summary) {
  const lines = [
    "# Refactor Gate Summary",
    "",
    `- GeneratedAt: ${summary.generatedAt}`,
    `- Status: ${summary.status.toUpperCase()}`,
    `- SmokeScript: ${summary.smokeScript}`,
    `- LogMode: ${summary.logMode}`,
    `- OutputTailLines: ${String(summary.outputTailLines)}`,
    `- Total: ${summary.totalDuration}`
  ];
  if (summary.failedStep) {
    lines.push(`- FailedStep: ${summary.failedStep}`);
  }
  lines.push("", "| Step | Status | Duration | Code | Signal | Log |", "| --- | --- | --- | --- | --- | --- |");
  for (const step of summary.steps) {
    lines.push(
      `| ${step.name} | ${step.status} | ${step.duration} | ${String(step.code)} | ${String(step.signal)} | ${step.logPath || "-"} |`
    );
  }
  lines.push("");
  return lines.join("\n");
}

function writeSummaryArtifacts(summary) {
  const jsonPath = resolveSummaryJsonPath();
  const markdownPath = resolveSummaryMarkdownPath();
  ensureParentDirectory(jsonPath);
  ensureParentDirectory(markdownPath);
  fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownPath, `${renderSummaryMarkdown(summary)}\n`, "utf8");
  return {
    jsonPath,
    markdownPath,
    jsonRelativePath: toProjectRelativePath(jsonPath),
    markdownRelativePath: toProjectRelativePath(markdownPath)
  };
}

function printFailureTriageHint(failedStepName) {
  if (failedStepName === "smoke") {
    console.error("[verify:refactor] triage priority:");
    console.error("[verify:refactor]   1) inspect Playwright outputs first (playwright-report + test-results)");
    console.error("[verify:refactor]   2) if needed, re-run smoke subset for failing suite");
    return;
  }
  if (
    failedStepName === "game-manager-audit" ||
    failedStepName === "entry-manifest-audit" ||
    failedStepName === "page-legacy-runtime-boundary-audit" ||
    failedStepName === "legacy-boundary-audit" ||
    failedStepName === "engine-audit"
  ) {
    console.error("[verify:refactor] triage priority:");
    console.error("[verify:refactor]   1) fix audit contract violation from the failing audit step");
    console.error("[verify:refactor]   2) re-run verify:refactor after audit passes");
    return;
  }
  if (failedStepName === "unit") {
    console.error("[verify:refactor] triage priority:");
    console.error("[verify:refactor]   1) fix failing unit tests");
    console.error("[verify:refactor]   2) re-run unit and then full verify:refactor");
    return;
  }
  if (failedStepName === "build") {
    console.error("[verify:refactor] triage priority:");
    console.error("[verify:refactor]   1) fix compile/bundle error");
    console.error("[verify:refactor]   2) re-run build and then full verify:refactor");
  }
}

async function main() {
  const suiteStartedAt = performance.now();
  const results = [];
  const env = process.env || {};
  const logMode = resolveLogMode(env[STEP_LOG_MODE_ENV_KEY]);
  const outputTailLines = resolveStepOutputTailLines(env[STEP_OUTPUT_TAIL_LINES_ENV_KEY]);

  console.log("[verify:refactor] start");
  console.log(`[verify:refactor] smoke script: ${smokeScript}`);
  console.log(`[verify:refactor] log mode: ${logMode}`);

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
        console.error("[verify:refactor]   npx playwright install chromium chromium-headless-shell");
        console.error("[verify:refactor]   npx playwright install-deps chromium");
        results.push({
          name: "smoke",
          ok: false,
          code: 1,
          signal: null,
          timeoutMs: resolveStepTimeoutMs("smoke"),
          durationMs: 0,
          logPath: null
        });
        break;
      }
    }

    const timeoutMs = resolveStepTimeoutMs(step.name);
    console.log(`[verify:refactor] running ${step.name} (timeout=${String(timeoutMs)}ms)...`);
    const result = await runStep(step, { logMode, tailLines: outputTailLines });
    results.push(result);
    if (!result.ok) {
      console.error(
        `[verify:refactor] ${result.name} failed ` +
          `(code=${String(result.code)}, signal=${String(result.signal)}) ` +
          `after ${formatDuration(result.durationMs)}`
      );
      if (result.logPath) {
        console.error(`[verify:refactor] ${result.name} log: ${toProjectRelativePath(result.logPath)}`);
      }
      printStepOutputTail(result);
      if (result.signal === "TIMEOUT") {
        console.error(
          `[verify:refactor] ${result.name} timeout hint: exceeded ${String(result.timeoutMs)}ms step budget`
        );
      }
      if (result.name === "smoke") {
        console.error("[verify:refactor] smoke hint: ensure browser binary and Linux deps are installed:");
        console.error("[verify:refactor]   npx playwright install chromium chromium-headless-shell");
        console.error("[verify:refactor]   npx playwright install-deps chromium");
      }
      break;
    }
    const logPath = toProjectRelativePath(result.logPath) || "<none>";
    console.log(
      `[verify:refactor] ${result.name} passed in ${formatDuration(result.durationMs)} (log: ${logPath})`
    );
  }

  const totalMs = Math.round(performance.now() - suiteStartedAt);
  const failed = results.find((r) => !r.ok) || null;
  const summary = createSummaryPayload({
    results,
    totalMs,
    smokeScriptName: smokeScript,
    logMode,
    outputTailLines
  });
  const summaryArtifacts = writeSummaryArtifacts(summary);

  console.log("[verify:refactor] summary");
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    console.log(`  - ${status} ${result.name} (${formatDuration(result.durationMs)})`);
  }
  console.log(`  - TOTAL ${formatDuration(totalMs)}`);
  console.log(`[verify:refactor] summary json: ${summaryArtifacts.jsonRelativePath}`);
  console.log(`[verify:refactor] summary md: ${summaryArtifacts.markdownRelativePath}`);

  if (failed) {
    printFailureTriageHint(failed.name);
    process.exitCode = 1;
    return;
  }
  console.log("[verify:refactor] all gates passed");
}

function isDirectCliExecution() {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);
}

if (isDirectCliExecution()) {
  main().catch((err) => {
    console.error("[verify:refactor] unexpected error", err);
    process.exitCode = 1;
  });
}

export {
  DEFAULT_CHROMIUM_VALIDATE_TIMEOUT_MS,
  MAX_STEP_OUTPUT_TAIL_LINES,
  DEFAULT_STEP_OUTPUT_TAIL_LINES,
  DEFAULT_STEP_TIMEOUT_MS,
  STEP_LOG_MODE_ENV_KEY,
  STEP_OUTPUT_TAIL_LINES_ENV_KEY,
  STEP_TIMEOUT_BY_NAME_MS,
  STEP_TIMEOUT_DEFAULT_ENV_KEY,
  STEP_TIMEOUT_ENV_KEY_BY_NAME,
  SUMMARY_JSON_PATH_ENV_KEY,
  SUMMARY_MARKDOWN_PATH_ENV_KEY,
  createSummaryPayload,
  isDirectCliExecution,
  isSmokeScriptName,
  parsePositiveInteger,
  parseSmokeScriptArg,
  renderSummaryMarkdown,
  resolveHeadlessShellPathFromChromiumPath,
  resolveLogMode,
  resolveStepOutputTailLines,
  resolveStepTimeoutMs,
  sanitizeStepLogFileName,
  validateChromiumExecutable
};
