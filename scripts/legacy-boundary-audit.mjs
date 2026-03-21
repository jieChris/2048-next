import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const entriesDir = path.resolve(projectRoot, "src", "entries");

const LEGACY_LOADER_MODULE = "./legacy-loader";
const LEGACY_LOADER_SYMBOL = "loadLegacyScriptsSequentially";
const ALLOWED_LEGACY_LOADER_FILES = new Set(["home-family-bootstrap.ts"]);

function fail(message) {
  throw new Error(message);
}

function extractImportSpecifiers(content) {
  const source = String(content || "");
  const specifiers = [];
  const fromImportPattern = /import\s+[\s\S]*?\s+from\s+["']([^"']+)["']/g;
  const sideEffectImportPattern = /import\s+["']([^"']+)["']/g;

  let match = fromImportPattern.exec(source);
  while (match) {
    specifiers.push(match[1]);
    match = fromImportPattern.exec(source);
  }

  match = sideEffectImportPattern.exec(source);
  while (match) {
    specifiers.push(match[1]);
    match = sideEffectImportPattern.exec(source);
  }

  return specifiers;
}

function collectLegacyLoaderImporters(fileRecords) {
  const importers = [];
  for (const record of fileRecords) {
    const imports = extractImportSpecifiers(record.content);
    if (!imports.includes(LEGACY_LOADER_MODULE)) continue;
    importers.push(record.fileName);
  }
  return importers;
}

function collectLegacyLoaderCallSites(fileRecords) {
  const callSites = [];
  const pattern = new RegExp(`\\b${LEGACY_LOADER_SYMBOL}\\s*\\(`, "g");
  for (const record of fileRecords) {
    let match = pattern.exec(record.content);
    while (match) {
      const line = record.content.slice(0, match.index).split(/\r?\n/).length;
      const lineText = record.content.split(/\r?\n/)[line - 1] || "";
      const isFunctionDeclaration = new RegExp(
        `^\\s*(?:export\\s+)?function\\s+${LEGACY_LOADER_SYMBOL}\\s*\\(`
      ).test(lineText);
      if (!isFunctionDeclaration) {
        callSites.push({ fileName: record.fileName, line });
      }
      match = pattern.exec(record.content);
    }
  }
  return callSites;
}

function ensureNoForbiddenLegacyLoaderImporters(importers) {
  const forbidden = importers.filter((fileName) => !ALLOWED_LEGACY_LOADER_FILES.has(fileName));
  if (forbidden.length > 0) {
    fail(
      "[legacy-boundary-audit] forbidden legacy-loader imports in entries: " +
        forbidden.join(", ")
    );
  }
}

function ensureNoForbiddenLegacyLoaderCallSites(callSites) {
  const forbidden = callSites.filter((site) => !ALLOWED_LEGACY_LOADER_FILES.has(site.fileName));
  if (forbidden.length > 0) {
    const detail = forbidden.map((site) => `${site.fileName}:L${site.line}`).join(", ");
    fail(
      "[legacy-boundary-audit] forbidden loadLegacyScriptsSequentially call sites in entries: " +
        detail
    );
  }
}

function ensureLegacyLoaderImporterBudget(importers, maxAllowed = 1) {
  if (importers.length <= maxAllowed) return;
  fail(
    "[legacy-boundary-audit] legacy-loader importer budget exceeded: " +
      `${importers.length} (max=${maxAllowed})`
  );
}

async function readEntryFileRecords() {
  const dirEntries = await readdir(entriesDir, { withFileTypes: true });
  const fileRecords = [];
  for (const entry of dirEntries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".ts")) continue;
    const filePath = path.resolve(entriesDir, entry.name);
    const content = await readFile(filePath, "utf8");
    fileRecords.push({ fileName: entry.name, filePath, content });
  }
  return fileRecords;
}

async function runLegacyBoundaryAudit() {
  const fileRecords = await readEntryFileRecords();
  const importers = collectLegacyLoaderImporters(fileRecords);
  const callSites = collectLegacyLoaderCallSites(fileRecords);

  ensureLegacyLoaderImporterBudget(importers, 1);
  ensureNoForbiddenLegacyLoaderImporters(importers);
  ensureNoForbiddenLegacyLoaderCallSites(callSites);

  console.log(
    `[legacy-boundary-audit] PASS: legacy loader boundary is stable (importers=${importers.length}, callsites=${callSites.length})`
  );
}

function isDirectCliExecution() {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);
}

if (isDirectCliExecution()) {
  runLegacyBoundaryAudit().catch((error) => {
    console.error(
      `[legacy-boundary-audit] FAIL: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  });
}

export {
  ALLOWED_LEGACY_LOADER_FILES,
  LEGACY_LOADER_MODULE,
  LEGACY_LOADER_SYMBOL,
  collectLegacyLoaderCallSites,
  collectLegacyLoaderImporters,
  ensureLegacyLoaderImporterBudget,
  ensureNoForbiddenLegacyLoaderCallSites,
  ensureNoForbiddenLegacyLoaderImporters,
  extractImportSpecifiers,
  isDirectCliExecution,
  runLegacyBoundaryAudit
};
