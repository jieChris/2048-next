import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const TARGETS = {
  indexUi: 220,
  gameManager: 3800
};

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

function countNonEmptyLines(content) {
  if (!content) return 0;
  return content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean).length;
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
}

main().catch((error) => {
  console.error(
    "[refactor-progress] failed",
    error && error.message ? error.message : String(error)
  );
  process.exitCode = 1;
});
