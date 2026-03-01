import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GAME_MANAGER_PATH = path.resolve(__dirname, "..", "js", "game_manager.js");
const COMMON_RUNTIME_PATH = path.resolve(
  __dirname,
  "..",
  "js",
  "core_game_manager_common_runtime.js"
);
const STATIC_RUNTIME_PATH = path.resolve(
  __dirname,
  "..",
  "js",
  "core_game_manager_static_runtime.js"
);
const BINDINGS_RUNTIME_PATH = path.resolve(
  __dirname,
  "..",
  "js",
  "core_game_manager_bindings_runtime.js"
);
const MAX_GAME_MANAGER_LINES = 80;
const MAX_BINDINGS_RUNTIME_LINES = 1400;
const PAGE_FILES = [
  "index.html",
  "play.html",
  "replay.html",
  "undo_2048.html",
  "capped_2048.html",
  "Practice_board.html"
];

function fail(message) {
  throw new Error(message);
}

function extractPrototypeMethodNames(content) {
  const names = [];
  const pattern = /GameManager\.prototype\.([A-Za-z0-9_]+)\s*=\s*function/g;
  let match = pattern.exec(content);
  while (match) {
    names.push(match[1]);
    match = pattern.exec(content);
  }
  return names;
}

function findDuplicateEntries(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  return [...counts.entries()].filter((entry) => entry[1] > 1).map((entry) => entry[0]);
}

function hasOrderedRuntimeScripts(htmlContent) {
  const orderedPattern =
    /core_game_manager_common_runtime\.js\?v=[^"]*"><\/script>\s*<script src="js\/core_game_manager_static_runtime\.js\?v=[^"]*"><\/script>\s*<script src="js\/core_game_manager_bindings_runtime\.js\?v=[^"]*"><\/script>\s*<script src="js\/game_manager\.js\?v=[^"]*"><\/script>/;
  return orderedPattern.test(htmlContent);
}

async function verifyHtmlScriptOrder(projectRoot) {
  for (const fileName of PAGE_FILES) {
    const filePath = path.resolve(projectRoot, fileName);
    const content = await readFile(filePath, "utf8");
    if (!hasOrderedRuntimeScripts(content)) {
      fail(
        `[game-manager-audit] ${fileName}: missing or unordered runtime script chain ` +
          "(expected common -> static -> bindings -> game_manager)"
      );
    }
  }
}

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const gameManagerContent = await readFile(GAME_MANAGER_PATH, "utf8");
  const commonContent = await readFile(COMMON_RUNTIME_PATH, "utf8");
  const staticContent = await readFile(STATIC_RUNTIME_PATH, "utf8");
  const bindingsContent = await readFile(BINDINGS_RUNTIME_PATH, "utf8");

  const gameManagerLineCount = gameManagerContent.split(/\r?\n/).length;
  if (gameManagerLineCount > MAX_GAME_MANAGER_LINES) {
    fail(
      `[game-manager-audit] game_manager.js too large: ${gameManagerLineCount} lines ` +
        `(max=${MAX_GAME_MANAGER_LINES})`
    );
  }
  const bindingsLineCount = bindingsContent.split(/\r?\n/).length;
  if (bindingsLineCount > MAX_BINDINGS_RUNTIME_LINES) {
    fail(
      `[game-manager-audit] bindings runtime too large: ${bindingsLineCount} lines ` +
        `(max=${MAX_BINDINGS_RUNTIME_LINES})`
    );
  }
  if (!/function\s+GameManager\s*\(/.test(gameManagerContent)) {
    fail("[game-manager-audit] missing GameManager constructor in game_manager.js");
  }
  const shellFunctionMatches = gameManagerContent.match(/function\s+[A-Za-z0-9_]+\s*\(/g) || [];
  if (shellFunctionMatches.length !== 1) {
    fail(
      "[game-manager-audit] game_manager.js must remain constructor-only " +
        `(found ${shellFunctionMatches.length} function declarations)`
    );
  }
  if (/GameManager\.prototype\.[A-Za-z0-9_]+\s*=\s*function/.test(gameManagerContent)) {
    fail(
      "[game-manager-audit] prototype bindings detected in game_manager.js; expected shell-only file"
    );
  }
  if (!/applyGameManagerStaticConfiguration\(\);/.test(gameManagerContent)) {
    fail("[game-manager-audit] missing applyGameManagerStaticConfiguration() call");
  }
  if (!/bindGameManagerPrototypeRuntime\(\);/.test(gameManagerContent)) {
    fail("[game-manager-audit] missing bindGameManagerPrototypeRuntime() call");
  }
  if (/function\s+applyGameManagerStaticConfiguration\s*\(/.test(bindingsContent)) {
    fail(
      "[game-manager-audit] applyGameManagerStaticConfiguration() should not be declared in bindings runtime"
    );
  }
  if (!/function\s+applyGameManagerStaticConfiguration\s*\(/.test(staticContent)) {
    fail(
      "[game-manager-audit] missing applyGameManagerStaticConfiguration() in static runtime"
    );
  }
  if (/GameManager\.prototype\.[A-Za-z0-9_]+\s*=\s*function/.test(staticContent)) {
    fail(
      "[game-manager-audit] prototype bindings detected in static runtime; expected config-only file"
    );
  }
  if (!/function\s+bindGameManagerPrototypeRuntime\s*\(/.test(bindingsContent)) {
    fail(
      "[game-manager-audit] missing bindGameManagerPrototypeRuntime() in bindings runtime"
    );
  }
  if (/function\s+bindGameManagerPrototypeRuntime\s*\(/.test(staticContent)) {
    fail(
      "[game-manager-audit] bindGameManagerPrototypeRuntime() should not be declared in static runtime"
    );
  }
  if (!/registerCoreRuntimeAccessors\(GAME_MANAGER_CORE_RUNTIME_ACCESSOR_DEFS\);/.test(bindingsContent)) {
    fail("[game-manager-audit] missing runtime accessor registration in bindings runtime");
  }
  if (/GameManager\.prototype\.[A-Za-z0-9_]+\s*=\s*function/.test(commonContent)) {
    fail(
      "[game-manager-audit] prototype bindings detected in common runtime; expected logic-only file"
    );
  }
  const duplicatePrototypeNames = findDuplicateEntries(extractPrototypeMethodNames(bindingsContent));
  if (duplicatePrototypeNames.length > 0) {
    fail(
      "[game-manager-audit] duplicate prototype bindings in bindings runtime: " +
        duplicatePrototypeNames.join(", ")
    );
  }

  await verifyHtmlScriptOrder(projectRoot);
  console.log("[game-manager-audit] PASS: shell + common/static/bindings runtime layout verified");
}

main().catch((error) => {
  console.error("[game-manager-audit] unexpected error", error);
  process.exitCode = 1;
});
