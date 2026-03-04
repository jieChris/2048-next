import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const MAX_RUNTIME_FUNCTION_LINES = 19;
const INDEX_UI_TARGET = 220;
const GAME_MANAGER_TARGET = 3800;

function toAbsolute(relativePath) {
  return path.resolve(projectRoot, relativePath);
}

async function readText(relativePath) {
  return readFile(toAbsolute(relativePath), "utf8");
}

function countNonEmptyLines(content) {
  return content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function collectFunctionRanges(content) {
  const lines = content.split(/\r?\n/u);
  const starts = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^function\s+([A-Za-z0-9_]+)\s*\(/u);
    if (!match) continue;
    starts.push({ line: index + 1, name: match[1] });
  }
  return starts.map((entry, index) => {
    const next = starts[index + 1];
    const endLine = next ? next.line - 1 : lines.length;
    return {
      name: entry.name,
      startLine: entry.line,
      endLine,
      lineCount: endLine - entry.line + 1
    };
  });
}

async function getRuntimeHelperFiles() {
  const jsDir = toAbsolute("js");
  const entries = await readdir(jsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^core_game_manager_.*_runtime\.js$/u.test(entry.name))
    .map((entry) => path.posix.join("js", entry.name))
    .sort();
}

async function auditRuntimeFunctionHotspots(runtimeFiles) {
  const hotspots = [];
  const nameToFiles = new Map();
  for (const relativePath of runtimeFiles) {
    const content = await readText(relativePath);
    const ranges = collectFunctionRanges(content);
    for (const range of ranges) {
      if (range.lineCount > MAX_RUNTIME_FUNCTION_LINES) {
        hotspots.push({
          file: relativePath,
          ...range
        });
      }
      const fileSet = nameToFiles.get(range.name) || new Set();
      fileSet.add(relativePath);
      nameToFiles.set(range.name, fileSet);
    }
  }
  const duplicates = [];
  for (const [name, fileSet] of nameToFiles.entries()) {
    if (fileSet.size <= 1) continue;
    duplicates.push({
      name,
      files: Array.from(fileSet).sort()
    });
  }
  duplicates.sort((a, b) => a.name.localeCompare(b.name));
  hotspots.sort((a, b) => b.lineCount - a.lineCount || a.file.localeCompare(b.file));
  return { hotspots, duplicates };
}

async function auditProgressTargets() {
  const indexUiLines = countNonEmptyLines(await readText("js/index_ui.js"));
  const gameManagerLines = countNonEmptyLines(await readText("js/game_manager.js"));
  let monolithSmokeLines = 0;
  try {
    monolithSmokeLines = countNonEmptyLines(await readText("tests/smoke/pages.smoke.spec.ts"));
  } catch {
    monolithSmokeLines = 0;
  }
  return {
    indexUiLines,
    gameManagerLines,
    monolithSmokeLines
  };
}

function printHotspots(hotspots) {
  if (hotspots.length === 0) {
    console.log("[refactor-closure-audit] runtime hotspot check: PASS");
    return true;
  }
  console.error(
    `[refactor-closure-audit] runtime hotspot check: FAIL (${hotspots.length} functions > ${MAX_RUNTIME_FUNCTION_LINES} lines)`
  );
  for (const hotspot of hotspots.slice(0, 20)) {
    console.error(
      `  - ${hotspot.file}:${hotspot.startLine} ${hotspot.name} (${hotspot.lineCount} lines)`
    );
  }
  return false;
}

function printDuplicateNames(duplicates) {
  if (duplicates.length === 0) {
    console.log("[refactor-closure-audit] duplicate function-name check: PASS");
    return true;
  }
  console.error(
    `[refactor-closure-audit] duplicate function-name check: FAIL (${duplicates.length} names)`
  );
  for (const duplicate of duplicates.slice(0, 20)) {
    console.error(`  - ${duplicate.name} -> ${duplicate.files.join(", ")}`);
  }
  return false;
}

function printTargetCheck(targets) {
  const indexUiOk = targets.indexUiLines <= INDEX_UI_TARGET;
  const gameManagerOk = targets.gameManagerLines < GAME_MANAGER_TARGET;
  const monolithSmokeOk = targets.monolithSmokeLines === 0;

  console.log(
    `[refactor-closure-audit] index_ui.js lines: ${targets.indexUiLines} (target <= ${INDEX_UI_TARGET}) -> ${indexUiOk ? "PASS" : "FAIL"}`
  );
  console.log(
    `[refactor-closure-audit] game_manager.js lines: ${targets.gameManagerLines} (target < ${GAME_MANAGER_TARGET}) -> ${gameManagerOk ? "PASS" : "FAIL"}`
  );
  console.log(
    `[refactor-closure-audit] pages.smoke.spec.ts removed: ${monolithSmokeOk ? "PASS" : "FAIL"}`
  );

  return indexUiOk && gameManagerOk && monolithSmokeOk;
}

async function main() {
  const runtimeFiles = await getRuntimeHelperFiles();
  const runtimeAudit = await auditRuntimeFunctionHotspots(runtimeFiles);
  const targets = await auditProgressTargets();

  const okHotspots = printHotspots(runtimeAudit.hotspots);
  const okDuplicates = printDuplicateNames(runtimeAudit.duplicates);
  const okTargets = printTargetCheck(targets);

  if (!(okHotspots && okDuplicates && okTargets)) {
    process.exitCode = 1;
    return;
  }
  console.log("[refactor-closure-audit] all checks passed");
}

main().catch((error) => {
  console.error(
    "[refactor-closure-audit] failed",
    error && error.message ? error.message : String(error)
  );
  process.exitCode = 1;
});
