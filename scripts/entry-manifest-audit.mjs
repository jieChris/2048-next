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

async function main() {
  const playEntry = await readUtf8("src/entries/play.ts");
  const replayEntry = await readUtf8("src/entries/replay.ts");
  const shared = await readUtf8("src/entries/home-family-shared.ts");

  ensureEntryUsesManifest(playEntry, "src/entries/play.ts", "play");
  ensureEntryUsesManifest(replayEntry, "src/entries/replay.ts", "replay");

  ensureCapabilityMapped(shared, "play", "playLegacyScripts");
  ensureCapabilityMapped(shared, "replay", "replayLegacyScripts");

  console.log("[entry-manifest-audit] PASS: play/replay entries are manifest-driven and capability-mapped");
}

main().catch((err) => {
  console.error(`[entry-manifest-audit] FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
