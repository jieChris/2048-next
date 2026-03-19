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

function countMatches(source, regex) {
  return Array.from(source.matchAll(regex)).length;
}

function ensureExactlyOne(source, label, regex) {
  const count = countMatches(source, regex);
  if (count !== 1) {
    fail(`${label} declaration count expected 1 but got ${String(count)}`);
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
    label: "UndoSnapshotLike",
    regex: /type\s+UndoSnapshotLike\s*=/g
  }
];

function validateEngineSource(source, rules = ENGINE_AUDIT_RULES) {
  for (const { label, regex } of rules) {
    ensureExactlyOne(source, label, regex);
  }
}

async function runEngineAudit() {
  const source = await readEngineSource();
  validateEngineSource(source);

  console.log("[engine-audit] PASS: engine exports and helper type are single-defined");
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
  countMatches,
  ensureExactlyOne,
  isDirectCliExecution,
  runEngineAudit,
  validateEngineSource
};
