import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { countNonEmptyLines } from "./audit-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const TARGETS = {
  indexUi: 220,
  gameManager: 3800
};
const REFACTOR_GATE_SUMMARY_REL_PATH = "artifacts/refactor-gate-summary.json";
const REFACTOR_PROGRESS_TAIL_HISTORY_REL_PATH = "artifacts/refactor-progress-tail-history.json";
const REFACTOR_PROGRESS_TAIL_HISTORY_LIMIT = 30;
const TAIL_LINES_LOW_THRESHOLD = 80;
const TAIL_LINES_HIGH_THRESHOLD = 180;

function toAbsolute(relativePath) {
  return path.resolve(projectRoot, relativePath);
}

async function readTextOrEmpty(relativePath) {
  try {
    return await readFile(toAbsolute(relativePath), "utf8");
  } catch {
    return "";
  }
}

function describeRatio(current, target, direction = "lte") {
  if (target <= 0) return "n/a";
  if (direction === "lte") {
    if (current <= target) return "达标";
    const overflow = (((current - target) / target) * 100).toFixed(2);
    return `超标 ${overflow}%`;
  }
  if (current >= target) return "达标";
  const deficit = (((target - current) / target) * 100).toFixed(2);
  return `缺口 ${deficit}%`;
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

function resolveTailLinesBand(outputTailLines) {
  const parsed = parsePositiveInteger(outputTailLines);
  if (parsed === null) return "unknown";
  if (parsed < TAIL_LINES_LOW_THRESHOLD) return "low";
  if (parsed > TAIL_LINES_HIGH_THRESHOLD) return "high";
  return "balanced";
}

function toPortablePath(filePath) {
  return String(filePath || "").replace(/\\/g, "/");
}

function appendTailHistoryEntry(history, entry, limit = REFACTOR_PROGRESS_TAIL_HISTORY_LIMIT) {
  const list = Array.isArray(history) ? history : [];
  const next = list.concat(entry);
  if (!Number.isInteger(limit) || limit <= 0) return next;
  if (next.length <= limit) return next;
  return next.slice(next.length - limit);
}

function parseDurationMs(value) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function createTailHistoryEntry(snapshot, generatedAt = new Date().toISOString()) {
  return {
    generatedAt,
    outputTailLines: snapshot.outputTailLines,
    tailLinesBand: snapshot.tailLinesBand,
    failedStep: snapshot.failedStep,
    failedStepDurationMs: snapshot.failedStepDurationMs,
    slowestStep: snapshot.slowestStep,
    slowestStepDurationMs: snapshot.slowestStepDurationMs
  };
}

function deriveRefactorGateSnapshot(summary) {
  const source = summary && typeof summary === "object" ? summary : null;
  if (!source) {
    return {
      available: false
    };
  }

  const outputTailLines = parsePositiveInteger(source.outputTailLines);
  const failedStep =
    typeof source.failedStep === "string" && source.failedStep.trim() ? source.failedStep.trim() : "none";
  const steps = Array.isArray(source.steps) ? source.steps : [];

  let slowestStep = null;
  let slowestStepDurationMs = null;
  for (const step of steps) {
    const name = step && typeof step.name === "string" ? step.name : "";
    const durationMs = parseDurationMs(step && step.durationMs);
    if (!name || durationMs === null) continue;
    if (slowestStepDurationMs === null || durationMs > slowestStepDurationMs) {
      slowestStep = name;
      slowestStepDurationMs = durationMs;
    }
  }

  let failedStepDurationMs = null;
  if (failedStep !== "none") {
    const failedStepEntry = steps.find(
      (step) => step && typeof step.name === "string" && step.name === failedStep
    );
    failedStepDurationMs = parseDurationMs(failedStepEntry && failedStepEntry.durationMs);
  }

  return {
    available: true,
    outputTailLines,
    tailLinesBand: resolveTailLinesBand(outputTailLines),
    failedStep,
    failedStepDurationMs,
    slowestStep,
    slowestStepDurationMs
  };
}

async function loadTailHistory() {
  const raw = await readTextOrEmpty(REFACTOR_PROGRESS_TAIL_HISTORY_REL_PATH);
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendTailHistorySnapshot(snapshot) {
  const entry = createTailHistoryEntry(snapshot);
  const history = await loadTailHistory();
  const nextHistory = appendTailHistoryEntry(history, entry);
  const historyPath = toAbsolute(REFACTOR_PROGRESS_TAIL_HISTORY_REL_PATH);
  await mkdir(path.dirname(historyPath), { recursive: true });
  await writeFile(historyPath, `${JSON.stringify(nextHistory, null, 2)}\n`, "utf8");
  return {
    historySize: nextHistory.length,
    historyRelativePath: toPortablePath(REFACTOR_PROGRESS_TAIL_HISTORY_REL_PATH)
  };
}

async function readRefactorGateSummarySnapshot() {
  const raw = await readTextOrEmpty(REFACTOR_GATE_SUMMARY_REL_PATH);
  if (!raw.trim()) {
    return { available: false };
  }
  try {
    const summary = JSON.parse(raw);
    return deriveRefactorGateSnapshot(summary);
  } catch {
    return { available: false };
  }
}

async function countSmokeFiles() {
  const smokeDir = toAbsolute("tests/smoke");
  const entries = await readdir(smokeDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".spec.ts")).length;
}

async function main() {
  const indexUiLines = countNonEmptyLines(await readTextOrEmpty("js/index_ui.js"));
  const gameManagerLines = countNonEmptyLines(await readTextOrEmpty("js/game_manager.js"));
  const monolithSmokeLines = countNonEmptyLines(await readTextOrEmpty("tests/smoke/pages.smoke.spec.ts"));
  const smokeFileCount = await countSmokeFiles();
  const refactorGateSnapshot = await readRefactorGateSummarySnapshot();

  console.log("[refactor-progress] snapshot");
  console.log(
    `[refactor-progress] index_ui.js: ${indexUiLines} 行 (目标 <= ${TARGETS.indexUi}) -> ${describeRatio(
      indexUiLines,
      TARGETS.indexUi
    )}`
  );
  console.log(
    `[refactor-progress] game_manager.js: ${gameManagerLines} 行 (目标 < ${TARGETS.gameManager}) -> ${describeRatio(
      gameManagerLines,
      TARGETS.gameManager
    )}`
  );

  if (monolithSmokeLines > 0) {
    console.log(
      `[refactor-progress] pages.smoke.spec.ts: ${monolithSmokeLines} 行 (建议拆分后移除该单体文件)`
    );
  } else {
    console.log("[refactor-progress] pages.smoke.spec.ts: 已移除（符合 smoke 拆分方向）");
  }
  console.log(`[refactor-progress] tests/smoke 规格文件数: ${smokeFileCount}`);

  if (!refactorGateSnapshot.available) {
    console.log("[refactor-progress] refactor-gate summary: unavailable");
    return;
  }

  const outputTailLinesText =
    refactorGateSnapshot.outputTailLines === null
      ? "unknown"
      : String(refactorGateSnapshot.outputTailLines);
  const failedStepDurationText =
    refactorGateSnapshot.failedStepDurationMs === null
      ? "unknown"
      : String(refactorGateSnapshot.failedStepDurationMs);
  const slowestStepText = refactorGateSnapshot.slowestStep || "unknown";
  const slowestDurationText =
    refactorGateSnapshot.slowestStepDurationMs === null
      ? "unknown"
      : String(refactorGateSnapshot.slowestStepDurationMs);

  console.log(`[refactor-progress] refactor-gate output_tail_lines: ${outputTailLinesText}`);
  console.log(`[refactor-progress] refactor-gate tail_lines_band: ${refactorGateSnapshot.tailLinesBand}`);
  console.log(`[refactor-progress] refactor-gate failed_step: ${refactorGateSnapshot.failedStep}`);
  console.log(`[refactor-progress] refactor-gate failed_step_duration_ms: ${failedStepDurationText}`);
  console.log(`[refactor-progress] refactor-gate slowest_step: ${slowestStepText}`);
  console.log(`[refactor-progress] refactor-gate slowest_step_duration_ms: ${slowestDurationText}`);

  const historyResult = await appendTailHistorySnapshot(refactorGateSnapshot);
  console.log(
    `[refactor-progress] tail history: ${historyResult.historyRelativePath} (runs kept: ${String(historyResult.historySize)})`
  );
}

function isDirectCliExecution() {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);
}

if (isDirectCliExecution()) {
  main().catch((error) => {
    console.error(
      "[refactor-progress] failed",
      error && error.message ? error.message : String(error)
    );
    process.exitCode = 1;
  });
}

export {
  REFACTOR_PROGRESS_TAIL_HISTORY_LIMIT,
  TAIL_LINES_HIGH_THRESHOLD,
  TAIL_LINES_LOW_THRESHOLD,
  appendTailHistoryEntry,
  createTailHistoryEntry,
  deriveRefactorGateSnapshot,
  isDirectCliExecution,
  parsePositiveInteger,
  resolveTailLinesBand
};
