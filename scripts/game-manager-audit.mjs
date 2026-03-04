import { readFile, readdir } from "node:fs/promises";
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
const RUNTIME_CALL_HELPERS_PATH = path.resolve(
  __dirname,
  "..",
  "js",
  "core_game_manager_runtime_call_helpers_runtime.js"
);
const RUNTIME_ACCESSOR_HELPERS_PATH = path.resolve(
  __dirname,
  "..",
  "js",
  "core_game_manager_runtime_accessor_helpers_runtime.js"
);
const MODE_RULES_HELPERS_PATH = path.resolve(
  __dirname,
  "..",
  "js",
  "core_game_manager_mode_rules_helpers_runtime.js"
);
const REPLAY_HELPERS_PATH = path.resolve(
  __dirname,
  "..",
  "js",
  "core_game_manager_replay_helpers_runtime.js"
);
const SAVED_STATE_HELPERS_PATH = path.resolve(
  __dirname,
  "..",
  "js",
  "core_game_manager_saved_state_helpers_runtime.js"
);
const MOVE_INPUT_HELPERS_PATH = path.resolve(
  __dirname,
  "..",
  "js",
  "core_game_manager_move_input_helpers_runtime.js"
);
const GAME_MANAGER_JS_DIR = path.resolve(__dirname, "..", "js");
const MAX_GAME_MANAGER_LINES = 80;
const MAX_COMMON_RUNTIME_LINES = 40;
const MAX_BINDINGS_RUNTIME_LINES = 400;
const MAX_RUNTIME_CALL_HELPERS_LINES = 550;
const MAX_RUNTIME_ACCESSOR_HELPERS_LINES = 320;
const MAX_MODE_RULES_HELPERS_LINES = 1200;
const MAX_SAVED_STATE_HELPERS_LINES = 1350;
const MAX_RUNTIME_HELPER_FUNCTION_LINES = 19;
const PAGE_FILES = [
  "index.html",
  "play.html",
  "replay.html",
  "undo_2048.html",
  "capped_2048.html",
  "Practice_board.html"
];
const EXPECTED_GAME_MANAGER_RUNTIME_SCRIPT_CHAIN = [
  "core_game_manager_base_helpers_runtime.js",
  "core_game_manager_env_helpers_runtime.js",
  "core_game_manager_runtime_call_helpers_runtime.js",
  "core_game_manager_saved_state_helpers_runtime.js",
  "core_game_manager_runtime_accessor_helpers_runtime.js",
  "core_game_manager_stats_ui_helpers_runtime.js",
  "core_game_manager_move_input_helpers_runtime.js",
  "core_game_manager_stats_display_helpers_runtime.js",
  "core_game_manager_panel_timer_helpers_runtime.js",
  "core_game_manager_undo_stats_helpers_runtime.js",
  "core_game_manager_restart_setup_helpers_runtime.js",
  "core_game_manager_setup_timer_ui_helpers_runtime.js",
  "core_game_manager_session_init_helpers_runtime.js",
  "core_game_manager_common_runtime.js",
  "core_game_manager_replay_helpers_runtime.js",
  "core_game_manager_mode_rules_helpers_runtime.js",
  "core_game_manager_static_runtime.js",
  "core_game_manager_bindings_runtime.js",
  "game_manager.js"
];

function fail(message) {
  throw new Error(message);
}

function escapeRegexLiteral(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractBoundPrototypeMethodNames(bindingsContent) {
  const names = [];
  const directBindPatterns = [
    /bindGameManagerPrototypeMethod\(\s*"([A-Za-z0-9_]+)"\s*,/g,
    /bindGameManagerPrototypeForward\(\s*"([A-Za-z0-9_]+)"\s*,/g,
    /bindGameManagerPrototypeManagerForward\(\s*"([A-Za-z0-9_]+)"\s*,/g,
    /bindGameManagerPrototypeCappedStateFieldGetter\(\s*"([A-Za-z0-9_]+)"\s*,/g,
    /bindGameManagerPrototypeElementByIdResolver\(\s*"([A-Za-z0-9_]+)"\s*,/g
  ];
  for (const pattern of directBindPatterns) {
    let match = pattern.exec(bindingsContent);
    while (match) {
      names.push(match[1]);
      match = pattern.exec(bindingsContent);
    }
  }
  const batchBindingPattern = /\[\s*"([A-Za-z0-9_]+)"\s*,\s*[A-Za-z0-9_]+\s*\]/g;
  let batchMatch = batchBindingPattern.exec(bindingsContent);
  while (batchMatch) {
    names.push(batchMatch[1]);
    batchMatch = batchBindingPattern.exec(bindingsContent);
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
  const orderedPatternSource = EXPECTED_GAME_MANAGER_RUNTIME_SCRIPT_CHAIN
    .map(
      (fileName) =>
        `<script src="js/${escapeRegexLiteral(fileName)}\\?v=[^"]*"><\\/script>`
    )
    .join("\\s*");
  const orderedPattern = new RegExp(orderedPatternSource);
  return orderedPattern.test(htmlContent);
}

function extractFunctionDeclarations(content) {
  const out = [];
  const pattern = /function\s+([A-Za-z0-9_]+)\s*\(/g;
  let match = pattern.exec(content);
  while (match) {
    out.push({
      name: match[1],
      index: match.index
    });
    match = pattern.exec(content);
  }
  return out;
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

function resolveLineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function findRegexMatchLineNumbers(content, regex) {
  const lines = [];
  if (!(regex instanceof RegExp)) return lines;
  const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
  const globalRegex = new RegExp(regex.source, flags);
  let match = globalRegex.exec(content);
  while (match) {
    lines.push(resolveLineNumber(content, match.index));
    match = globalRegex.exec(content);
  }
  return lines;
}

function findOwnerFunctionName(functionDecls, callIndex) {
  let owner = null;
  for (const fn of functionDecls) {
    if (fn.index > callIndex) break;
    owner = fn.name;
  }
  return owner;
}

function isCommonRuntimeHelperFunctionName(name) {
  return (
    typeof name === "string" &&
    (name.startsWith("callCore") ||
      name.startsWith("resolveCore") ||
      name.startsWith("tryHandleCore"))
  );
}

function verifyCommonRuntimeCoreCallBoundaries(commonContent) {
  const functionDecls = extractFunctionDeclarations(commonContent);
  const callPattern = /manager\.callCore[A-Za-z0-9_]+Runtime\s*\(/g;
  const violations = [];
  let match = callPattern.exec(commonContent);
  while (match) {
    const callIndex = match.index;
    const owner = findOwnerFunctionName(functionDecls, callIndex);
    if (!isCommonRuntimeHelperFunctionName(owner)) {
      violations.push({
        owner: owner || "<global>",
        line: resolveLineNumber(commonContent, callIndex),
        snippet: match[0]
      });
    }
    match = callPattern.exec(commonContent);
  }
  if (violations.length > 0) {
    const details = violations
      .map((item) => `${item.owner}@L${item.line}`)
      .join(", ");
    fail(
      "[game-manager-audit] common runtime business functions must not call manager.callCore*Runtime directly; " +
        `violations: ${details}`
    );
  }
}

function verifyCommonRuntimeNoDirectManagerCoreCalls(commonContent) {
  const directCallLines = findRegexMatchLineNumbers(
    commonContent,
    /manager\.callCore[A-Za-z0-9_]+Runtime\s*\(/g
  );
  if (directCallLines.length > 0) {
    fail(
      "[game-manager-audit] common runtime must not directly use manager.callCore*Runtime(); " +
        `found at lines: ${directCallLines.join(", ")}`
    );
  }
}

async function resolveCoreGameManagerRuntimeFilePaths() {
  const entries = await readdir(GAME_MANAGER_JS_DIR, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const fileName = entry.name;
    if (!fileName.endsWith(".js")) continue;
    if (!fileName.startsWith("core_game_manager")) continue;
    out.push(path.resolve(GAME_MANAGER_JS_DIR, fileName));
  }
  return out;
}

function verifyNoDirectDocumentMethodCalls(filePath, content) {
  const violations = [];
  const patterns = [
    /document\.getElementById\s*\(/g,
    /document\.querySelector\s*\(/g,
    /document\.querySelectorAll\s*\(/g,
    /document\.createElement\s*\(/g,
    /document\.body\b/g
  ];
  for (const pattern of patterns) {
    const lines = findRegexMatchLineNumbers(content, pattern);
    for (const line of lines) {
      violations.push(line);
    }
  }
  if (violations.length <= 0) return;
  violations.sort((a, b) => a - b);
  fail(
    `[game-manager-audit] direct document.* call is not allowed in ${path.basename(filePath)}; ` +
      `use manager.getWindowLike().document resolver helpers instead (lines: ${violations.join(", ")})`
  );
}

function verifyNoInlineWindowDocumentFallback(filePath, content) {
  if (path.basename(filePath) === "core_game_manager_env_helpers_runtime.js") return;
  const violations = findRegexMatchLineNumbers(content, /windowLike && windowLike\.document/g);
  if (violations.length <= 0) return;
  fail(
    `[game-manager-audit] inline windowLike.document fallback is not allowed in ${path.basename(filePath)}; ` +
      `use resolveManagerDocumentLike() from env helpers (lines: ${violations.join(", ")})`
  );
}

function verifyNoDocumentLikeElementByIdInScopedHelpers(filePath, content) {
  if (path.basename(filePath) === "core_game_manager_env_helpers_runtime.js") return;
  const violations = findRegexMatchLineNumbers(content, /documentLike\.getElementById\s*\(/g);
  if (violations.length <= 0) return;
  fail(
    "[game-manager-audit] runtime helper must not use documentLike.getElementById(); " +
      `use resolveManagerElementById() wrapper in ${path.basename(filePath)} ` +
      `(lines: ${violations.join(", ")})`
  );
}

function verifyBindingsNoDirectPrototypeAssignments(bindingsContent) {
  const directBindingPattern = /GameManager\.prototype\.[A-Za-z0-9_]+\s*=\s*function/g;
  const directBindingLines = findRegexMatchLineNumbers(bindingsContent, directBindingPattern);
  if (directBindingLines.length <= 0) return;
  fail(
    "[game-manager-audit] direct prototype assignment is not allowed in bindings runtime; " +
      "use bindGameManagerPrototype* helper wrappers " +
      `(lines: ${directBindingLines.join(", ")})`
  );
}

function verifyRuntimeHelperFunctionHotspots(fileLabel, content) {
  const hotspots = collectFunctionRanges(content)
    .filter((range) => range.lineCount > MAX_RUNTIME_HELPER_FUNCTION_LINES)
    .sort((a, b) => b.lineCount - a.lineCount || a.startLine - b.startLine);
  if (hotspots.length <= 0) return;
  const summary = hotspots
    .slice(0, 10)
    .map((hotspot) => `${hotspot.name}@L${hotspot.startLine}(${hotspot.lineCount})`)
    .join(", ");
  fail(
    `[game-manager-audit] ${fileLabel} has ${hotspots.length} function hotspots > ${MAX_RUNTIME_HELPER_FUNCTION_LINES} lines: ${summary}`
  );
}

async function verifyHtmlScriptOrder(projectRoot) {
  const expectedScriptChainText = EXPECTED_GAME_MANAGER_RUNTIME_SCRIPT_CHAIN
    .map((fileName) => fileName.replace(/_runtime\.js$/, ""))
    .join(" -> ");
  for (const fileName of PAGE_FILES) {
    const filePath = path.resolve(projectRoot, fileName);
    const content = await readFile(filePath, "utf8");
    if (!hasOrderedRuntimeScripts(content)) {
      fail(
        `[game-manager-audit] ${fileName}: missing or unordered runtime script chain ` +
          `(expected ${expectedScriptChainText})`
      );
    }
  }
}

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const coreGameManagerRuntimePaths = await resolveCoreGameManagerRuntimeFilePaths();
  const gameManagerContent = await readFile(GAME_MANAGER_PATH, "utf8");
  const commonContent = await readFile(COMMON_RUNTIME_PATH, "utf8");
  const staticContent = await readFile(STATIC_RUNTIME_PATH, "utf8");
  const bindingsContent = await readFile(BINDINGS_RUNTIME_PATH, "utf8");
  const runtimeCallHelpersContent = await readFile(RUNTIME_CALL_HELPERS_PATH, "utf8");
  const runtimeAccessorHelpersContent = await readFile(RUNTIME_ACCESSOR_HELPERS_PATH, "utf8");
  const modeRulesHelpersContent = await readFile(MODE_RULES_HELPERS_PATH, "utf8");
  const replayHelpersContent = await readFile(REPLAY_HELPERS_PATH, "utf8");
  const savedStateHelpersContent = await readFile(SAVED_STATE_HELPERS_PATH, "utf8");
  const moveInputHelpersContent = await readFile(MOVE_INPUT_HELPERS_PATH, "utf8");

  const gameManagerLineCount = gameManagerContent.split(/\r?\n/).length;
  if (gameManagerLineCount > MAX_GAME_MANAGER_LINES) {
    fail(
      `[game-manager-audit] game_manager.js too large: ${gameManagerLineCount} lines ` +
        `(max=${MAX_GAME_MANAGER_LINES})`
    );
  }
  const commonLineCount = commonContent.split(/\r?\n/).length;
  if (commonLineCount > MAX_COMMON_RUNTIME_LINES) {
    fail(
      `[game-manager-audit] common runtime too large: ${commonLineCount} lines ` +
        `(max=${MAX_COMMON_RUNTIME_LINES})`
    );
  }
  const commonFunctionMatches = commonContent.match(/function\s+[A-Za-z0-9_]+\s*\(/g) || [];
  if (commonFunctionMatches.length > 0) {
    fail(
      "[game-manager-audit] common runtime must remain shell-only " +
        `(found ${commonFunctionMatches.length} function declarations)`
    );
  }
  const bindingsLineCount = bindingsContent.split(/\r?\n/).length;
  if (bindingsLineCount > MAX_BINDINGS_RUNTIME_LINES) {
    fail(
      `[game-manager-audit] bindings runtime too large: ${bindingsLineCount} lines ` +
        `(max=${MAX_BINDINGS_RUNTIME_LINES})`
    );
  }
  const runtimeCallHelpersLineCount = runtimeCallHelpersContent.split(/\r?\n/).length;
  if (runtimeCallHelpersLineCount > MAX_RUNTIME_CALL_HELPERS_LINES) {
    fail(
      `[game-manager-audit] runtime call helpers too large: ${runtimeCallHelpersLineCount} lines ` +
        `(max=${MAX_RUNTIME_CALL_HELPERS_LINES})`
    );
  }
  const runtimeAccessorHelpersLineCount = runtimeAccessorHelpersContent.split(/\r?\n/).length;
  if (runtimeAccessorHelpersLineCount > MAX_RUNTIME_ACCESSOR_HELPERS_LINES) {
    fail(
      `[game-manager-audit] runtime accessor helpers too large: ${runtimeAccessorHelpersLineCount} lines ` +
        `(max=${MAX_RUNTIME_ACCESSOR_HELPERS_LINES})`
    );
  }
  const modeRulesHelpersLineCount = modeRulesHelpersContent.split(/\r?\n/).length;
  if (modeRulesHelpersLineCount > MAX_MODE_RULES_HELPERS_LINES) {
    fail(
      `[game-manager-audit] mode rules helpers too large: ${modeRulesHelpersLineCount} lines ` +
        `(max=${MAX_MODE_RULES_HELPERS_LINES})`
    );
  }
  verifyRuntimeHelperFunctionHotspots("replay helpers", replayHelpersContent);
  const savedStateHelpersLineCount = savedStateHelpersContent.split(/\r?\n/).length;
  if (savedStateHelpersLineCount > MAX_SAVED_STATE_HELPERS_LINES) {
    fail(
      `[game-manager-audit] saved-state helpers too large: ${savedStateHelpersLineCount} lines ` +
        `(max=${MAX_SAVED_STATE_HELPERS_LINES})`
    );
  }
  verifyRuntimeHelperFunctionHotspots("move-input helpers", moveInputHelpersContent);
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
  verifyBindingsNoDirectPrototypeAssignments(bindingsContent);
  if (/GameManager\.prototype\.[A-Za-z0-9_]+\s*=\s*function/.test(commonContent)) {
    fail(
      "[game-manager-audit] prototype bindings detected in common runtime; expected logic-only file"
    );
  }
  if (/GameManager\.prototype\.[A-Za-z0-9_]+\s*=\s*function/.test(runtimeCallHelpersContent)) {
    fail(
      "[game-manager-audit] prototype bindings detected in runtime call helpers; expected helper-only file"
    );
  }
  verifyCommonRuntimeNoDirectManagerCoreCalls(commonContent);
  verifyCommonRuntimeCoreCallBoundaries(commonContent);
  for (const runtimeFilePath of coreGameManagerRuntimePaths) {
    const runtimeContent = await readFile(runtimeFilePath, "utf8");
    verifyNoDirectDocumentMethodCalls(runtimeFilePath, runtimeContent);
    verifyNoInlineWindowDocumentFallback(runtimeFilePath, runtimeContent);
    verifyNoDocumentLikeElementByIdInScopedHelpers(runtimeFilePath, runtimeContent);
  }
  const duplicatePrototypeNames = findDuplicateEntries(
    extractBoundPrototypeMethodNames(bindingsContent)
  );
  if (duplicatePrototypeNames.length > 0) {
    fail(
      "[game-manager-audit] duplicate prototype bindings in bindings runtime: " +
        duplicatePrototypeNames.join(", ")
    );
  }

  await verifyHtmlScriptOrder(projectRoot);
  console.log(
    "[game-manager-audit] PASS: shell + common/static/bindings + runtime helpers layout verified"
  );
}

main().catch((error) => {
  console.error("[game-manager-audit] unexpected error", error);
  process.exitCode = 1;
});
