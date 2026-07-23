import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function fail(message) {
  throw new Error(message);
}

async function readEngineSource() {
  const filePath = path.resolve(repoRoot, "src/core/engine.ts");
  return readFile(filePath, "utf8");
}

async function readLegacyMoveSource() {
  const filePath = path.resolve(repoRoot, "js/core_game_manager_move_input_helpers_runtime.js");
  return readFile(filePath, "utf8");
}

function countMatches(source, regex) {
  return Array.from(source.matchAll(regex)).length;
}

function ensureExactlyOne(source, label, regex) {
  const count = countMatches(source, regex);
  if (count !== 1) {
    fail(`${label} declaration count expected 1 but got ${String(count)}`);
  }
}

function ensureNoMatches(source, label, regex) {
  const count = countMatches(source, regex);
  if (count !== 0) {
    fail(`${label} forbidden match count expected 0 but got ${String(count)}`);
  }
}

const ENGINE_AUDIT_RULES = [
  {
    label: "createEngineFacade",
    regex: /export\s+function\s+createEngineFacade\s*\(/g
  },
  {
    label: "createEngineSession",
    regex: /export\s+function\s+createEngineSession\s*\(/g
  },
  {
    label: "APP_MODE_SPECS",
    regex: /const\s+APP_MODE_SPECS\s*:/g
  }
];

const ENGINE_FORBIDDEN_PATTERNS = [
  { label: "precomputed score input", regex: /input\.scoreAfterMerge/g },
  { label: "precomputed moves-available input", regex: /input\.hasMovesAvailable/g },
  { label: "wall-clock read", regex: /Date\.now\s*\(/g },
  { label: "DOM or browser storage dependency", regex: /\b(?:window|document|localStorage|sessionStorage)\b/g }
];

const LEGACY_MOVE_AUDIT_RULES = [
  {
    label: "shared Game Session compatibility seam",
    regex: /function\s+tryMoveWithSharedGameSession\s*\(/g
  },
  {
    label: "shared Game Session live-move gateway",
    regex: /if\s*\(tryMoveWithSharedGameSession\(manager,\s*direction,\s*Date\.now\(\)\)\)\s*return;/g
  }
];

function validateEngineSource(
  source,
  rules = ENGINE_AUDIT_RULES,
  forbiddenPatterns = ENGINE_FORBIDDEN_PATTERNS
) {
  for (const { label, regex } of rules) {
    ensureExactlyOne(source, label, regex);
  }
  for (const { label, regex } of forbiddenPatterns) {
    ensureNoMatches(source, label, regex);
  }
}

function validateLegacyMoveSource(source, rules = LEGACY_MOVE_AUDIT_RULES) {
  for (const { label, regex } of rules) {
    ensureExactlyOne(source, label, regex);
  }
}

async function runEngineAudit() {
  const [source, legacyMoveSource] = await Promise.all([
    readEngineSource(),
    readLegacyMoveSource()
  ]);
  validateEngineSource(source);
  validateLegacyMoveSource(legacyMoveSource);

  console.log("[engine-audit] PASS: single Game Session owns rules without DOM or precomputed move inputs");
}

function isDirectCliExecution() {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);
}

if (isDirectCliExecution()) {
  runEngineAudit().catch((err) => {
    console.error(`[engine-audit] FAIL: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  });
}

export {
  ENGINE_AUDIT_RULES,
  ENGINE_FORBIDDEN_PATTERNS,
  LEGACY_MOVE_AUDIT_RULES,
  countMatches,
  ensureExactlyOne,
  ensureNoMatches,
  isDirectCliExecution,
  runEngineAudit,
  validateEngineSource,
  validateLegacyMoveSource
};
