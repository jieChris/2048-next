import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

const DEFAULT_TIMEOUT_ENV_KEY = "REFACTOR_GATE_TIMEOUT_DEFAULT_MS";

const STEP_TIMEOUT_ENV_KEY_BY_NAME = {
  "game-manager-audit": "REFACTOR_GATE_TIMEOUT_GAME_MANAGER_AUDIT_MS",
  "entry-manifest-audit": "REFACTOR_GATE_TIMEOUT_ENTRY_MANIFEST_AUDIT_MS",
  "engine-audit": "REFACTOR_GATE_TIMEOUT_ENGINE_AUDIT_MS",
  unit: "REFACTOR_GATE_TIMEOUT_UNIT_MS",
  smoke: "REFACTOR_GATE_TIMEOUT_SMOKE_MS",
  build: "REFACTOR_GATE_TIMEOUT_BUILD_MS"
};

function normalizeTimeoutSteps(stepsInput) {
  if (Array.isArray(stepsInput)) {
    return stepsInput
      .map((item) => String(item || "").trim())
      .filter((item) => item.length > 0);
  }
  const raw = String(stepsInput || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0);
}

function resolveTimeoutBudgetEnvKeys(stepsInput, { includeDefaultFallback = true } = {}) {
  const steps = normalizeTimeoutSteps(stepsInput);
  const keys = [];
  const seen = new Set();
  for (const step of steps) {
    const key = STEP_TIMEOUT_ENV_KEY_BY_NAME[step] || DEFAULT_TIMEOUT_ENV_KEY;
    if (seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  if (keys.length === 0 && includeDefaultFallback) {
    keys.push(DEFAULT_TIMEOUT_ENV_KEY);
  }
  return keys;
}

function parseCliArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  let steps = "";
  for (const arg of args) {
    if (typeof arg !== "string") continue;
    if (!arg.startsWith("--steps=")) continue;
    steps = arg.slice("--steps=".length);
  }
  return { steps };
}

function runCli(argv) {
  const { steps } = parseCliArgs(argv);
  const keys = resolveTimeoutBudgetEnvKeys(steps);
  process.stdout.write(`${keys.join("\n")}\n`);
}

function isDirectCliExecution() {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);
}

if (isDirectCliExecution()) {
  runCli(process.argv.slice(2));
}

export {
  DEFAULT_TIMEOUT_ENV_KEY,
  STEP_TIMEOUT_ENV_KEY_BY_NAME,
  isDirectCliExecution,
  normalizeTimeoutSteps,
  parseCliArgs,
  resolveTimeoutBudgetEnvKeys,
  runCli
};
