import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function fail(message) {
  throw new Error(message);
}

async function readUtf8(relativePath) {
  const fullPath = path.resolve(repoRoot, relativePath);
  return readFile(fullPath, "utf8");
}

function ensureEntryUsesManifest(entryContent, entryName, pageId) {
  if (!entryContent.includes('bootstrapHomeFamilyPage')) {
    fail(`${entryName}: missing bootstrapHomeFamilyPage import/call`);
  }
  if (!entryContent.includes(`bootstrapHomeFamilyPage("${pageId}")`)) {
    fail(`${entryName}: must call bootstrapHomeFamilyPage("${pageId}")`);
  }
  if (entryContent.includes("loadLegacyScriptsSequentially")) {
    fail(`${entryName}: should not directly call loadLegacyScriptsSequentially`);
  }
}

function ensureCapabilityMapped(sharedContent, capability, symbolName) {
  const bindingPattern = new RegExp(`\\b${capability}\\s*:\\s*${symbolName}\\b`);
  if (!bindingPattern.test(sharedContent)) {
    fail(`home-family-shared: capability \"${capability}\" is not mapped to ${symbolName}`);
  }
}

function ensureEntryHasNoLegacyImports(entryContent, entryName) {
  const lines = entryContent.split(/\r?\n/);
  const nonBootstrapImports = lines.filter(
    (line) => line.startsWith("import ") && !line.includes('"./home-family-bootstrap"')
  );
  if (nonBootstrapImports.length > 0) {
    fail(`${entryName}: should not import runtime scripts directly`);
  }
}

function extractScriptImportOrder(moduleContent, exportName, moduleName) {
  const importMatches = Array.from(
    moduleContent.matchAll(/import\s+([A-Za-z0-9_]+)\s+from\s+"[^"]+\?url";/g)
  );
  const importOrder = importMatches.map((match) => match[1]);

  const exportPattern = new RegExp(
    `export const ${exportName} = \\[([\\s\\S]*?)\\] as const;`,
    "m"
  );
  const exportMatch = moduleContent.match(exportPattern);
  if (!exportMatch) {
    fail(`${moduleName}: unable to locate export array ${exportName}`);
  }
  const exportedOrder = exportMatch[1]
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/,$/, ""))
    .filter(Boolean);

  return { importOrder, exportedOrder };
}

function ensureScriptOrderConstraints(order, moduleName, constraints) {
  for (const { before, after } of constraints) {
    const beforeIndex = order.indexOf(before);
    const afterIndex = order.indexOf(after);
    if (beforeIndex < 0 || afterIndex < 0) {
      fail(`${moduleName}: missing order anchor (${before} -> ${after})`);
    }
    if (beforeIndex >= afterIndex) {
      fail(`${moduleName}: invalid order (${before} must be before ${after})`);
    }
  }
}

function ensureImportAndExportOrderAligned(importOrder, exportedOrder, moduleName) {
  if (importOrder.length !== exportedOrder.length) {
    fail(`${moduleName}: import/export script count mismatch`);
  }
  for (let index = 0; index < importOrder.length; index += 1) {
    if (importOrder[index] !== exportedOrder[index]) {
      fail(
        `${moduleName}: exported script order drift at index ${index} (${importOrder[index]} != ${exportedOrder[index]})`
      );
    }
  }
}

async function runEntryManifestAudit() {
  const playEntry = await readUtf8("src/entries/play.ts");
  const replayEntry = await readUtf8("src/entries/replay.ts");
  const shared = await readUtf8("src/entries/home-family-shared.ts");
  const playRuntimeScripts = await readUtf8("src/entries/play-runtime-scripts.ts");
  const replayRuntimeScripts = await readUtf8("src/entries/replay-runtime-scripts.ts");

  ensureEntryUsesManifest(playEntry, "src/entries/play.ts", "play");
  ensureEntryUsesManifest(replayEntry, "src/entries/replay.ts", "replay");
  ensureEntryHasNoLegacyImports(playEntry, "src/entries/play.ts");
  ensureEntryHasNoLegacyImports(replayEntry, "src/entries/replay.ts");

  ensureCapabilityMapped(shared, "play", "playLegacyScripts");
  ensureCapabilityMapped(shared, "replay", "replayLegacyScripts");

  const playOrder = extractScriptImportOrder(
    playRuntimeScripts,
    "playLegacyScripts",
    "src/entries/play-runtime-scripts.ts"
  );
  const replayOrder = extractScriptImportOrder(
    replayRuntimeScripts,
    "replayLegacyScripts",
    "src/entries/replay-runtime-scripts.ts"
  );

  ensureImportAndExportOrderAligned(
    playOrder.importOrder,
    playOrder.exportedOrder,
    "src/entries/play-runtime-scripts.ts"
  );
  ensureImportAndExportOrderAligned(
    replayOrder.importOrder,
    replayOrder.exportedOrder,
    "src/entries/replay-runtime-scripts.ts"
  );

  ensureScriptOrderConstraints(playOrder.exportedOrder, "src/entries/play-runtime-scripts.ts", [
    { before: "coreGameManagerBindingsRuntimeUrl", after: "gameManagerUrl" },
    { before: "coreBootstrapRuntimeUrl", after: "gameManagerUrl" },
    { before: "corePlayPageHostRuntimeUrl", after: "playApplicationUrl" },
    { before: "playApplicationUrl", after: "coreI18nRuntimeUrl" }
  ]);
  ensureScriptOrderConstraints(replayOrder.exportedOrder, "src/entries/replay-runtime-scripts.ts", [
    { before: "coreGameManagerBindingsRuntimeUrl", after: "gameManagerUrl" },
    { before: "gameManagerUrl", after: "coreBootstrapRuntimeUrl" },
    { before: "coreSimplePageHostRuntimeUrl", after: "replayApplicationUrl" },
    { before: "replayApplicationUrl", after: "replayUiUrl" }
  ]);

  console.log(
    "[entry-manifest-audit] PASS: play/replay entries are manifest-driven, capability-mapped and order-guarded"
  );
}

function isDirectCliExecution() {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);
}

if (isDirectCliExecution()) {
  runEntryManifestAudit().catch((err) => {
    console.error(
      `[entry-manifest-audit] FAIL: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exitCode = 1;
  });
}

export {
  ensureCapabilityMapped,
  ensureEntryHasNoLegacyImports,
  ensureEntryUsesManifest,
  ensureImportAndExportOrderAligned,
  ensureScriptOrderConstraints,
  extractScriptImportOrder,
  isDirectCliExecution,
  runEntryManifestAudit
};
