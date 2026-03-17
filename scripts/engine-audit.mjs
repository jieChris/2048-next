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

async function main() {
  const source = await readEngineSource();

  ensureExactlyOne(
    source,
    "createEngineFacade",
    /export\s+function\s+createEngineFacade\s*\(/g
  );
  ensureExactlyOne(
    source,
    "createEngineSession",
    /export\s+function\s+createEngineSession\s*\(/g
  );
  ensureExactlyOne(
    source,
    "UndoSnapshotLike",
    /type\s+UndoSnapshotLike\s*=/g
  );

  console.log("[engine-audit] PASS: engine exports and helper type are single-defined");
}

main().catch((err) => {
  console.error(`[engine-audit] FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
