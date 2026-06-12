import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const pagesDir = path.resolve(repoRoot, "src", "pages");

const LEGACY_JS_IMPORT_PREFIX = "../../js/";
const PAGE_LEGACY_IMPORT_ALLOWLIST = {
  "account-page.ts": new Set(["../../js/api_shared_utils.js", "../../js/account_page.js"]),
  "account-settings-page.ts": new Set([
    "../../js/api_shared_utils.js",
    "../../js/account_settings_page.js"
  ]),
  "history-page.ts": new Set([
    "../../js/core_game_settings_storage_runtime.js",
    "../../js/local_history_store.js"
  ]),
  "relay-5x5-page.ts": new Set(["../../js/api_shared_utils.js", "../../js/relay_5x5_page.js"]),
  "palette-page.ts": new Set([
    "../../js/theme_manager.js",
    "../../js/palette_page.js",
    "../../js/core_i18n_runtime.js"
  ]),
  "password-page.ts": new Set(["../../js/api_shared_utils.js", "../../js/password_page.js"]),
  "register-page.ts": new Set(["../../js/api_shared_utils.js", "../../js/register_page.js"]),
  "user-profile-page.ts": new Set([
    "../../js/core_game_settings_storage_runtime.js",
    "../../js/user_profile_page.js"
  ])
};

function fail(message) {
  throw new Error(message);
}

function normalizePortablePath(filePath) {
  return String(filePath || "").replace(/\\/gu, "/");
}

function toProjectRelativePath(filePath) {
  return normalizePortablePath(path.relative(repoRoot, filePath));
}

function extractImportSpecifiers(content) {
  const source = String(content || "");
  const specifiers = [];
  const fromImportPattern = /import\s+[\s\S]*?\s+from\s+["']([^"']+)["']/g;
  const sideEffectImportPattern = /import\s+["']([^"']+)["']/g;
  const dynamicImportPattern = /import\s*\(\s*["']([^"']+)["']\s*\)/g;

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

  match = dynamicImportPattern.exec(source);
  while (match) {
    specifiers.push(match[1]);
    match = dynamicImportPattern.exec(source);
  }

  return specifiers;
}

async function readPageFileRecords() {
  const dirEntries = await readdir(pagesDir, { withFileTypes: true });
  const fileRecords = [];
  for (const entry of dirEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    const filePath = path.resolve(pagesDir, entry.name);
    const content = await readFile(filePath, "utf8");
    fileRecords.push({
      fileName: entry.name,
      filePath,
      projectRelativePath: toProjectRelativePath(filePath),
      content
    });
  }
  fileRecords.sort((left, right) => left.projectRelativePath.localeCompare(right.projectRelativePath));
  return fileRecords;
}

function collectPageLegacyImportRecords(fileRecords) {
  return fileRecords.map((record) => {
    const importSpecifiers = extractImportSpecifiers(record.content);
    const legacyImportSpecifiers = importSpecifiers.filter((specifier) =>
      specifier.startsWith(LEGACY_JS_IMPORT_PREFIX)
    );
    return {
      ...record,
      importSpecifiers,
      legacyImportSpecifiers
    };
  });
}

function ensureNoNewLegacyPageImports(pageImportRecords, allowlist = PAGE_LEGACY_IMPORT_ALLOWLIST) {
  const violations = [];
  for (const record of pageImportRecords) {
    if (!record.legacyImportSpecifiers || record.legacyImportSpecifiers.length === 0) continue;
    const allowed = allowlist[record.fileName] || null;
    if (!allowed) {
      violations.push({
        fileName: record.fileName,
        projectRelativePath: record.projectRelativePath,
        legacyImportSpecifiers: record.legacyImportSpecifiers.slice()
      });
      continue;
    }

    const extraImports = record.legacyImportSpecifiers.filter((specifier) => !allowed.has(specifier));
    if (extraImports.length > 0) {
      violations.push({
        fileName: record.fileName,
        projectRelativePath: record.projectRelativePath,
        legacyImportSpecifiers: extraImports
      });
    }
  }

  if (violations.length === 0) return;

  const detail = violations
    .map((entry) => `${entry.projectRelativePath}:${entry.legacyImportSpecifiers.join(",")}`)
    .join(", ");
  fail(
    `[page-legacy-runtime-boundary-audit] unexpected legacy page imports in src/pages: ${detail}`
  );
}

async function runPageLegacyRuntimeBoundaryAudit() {
  const fileRecords = await readPageFileRecords();
  const pageImportRecords = collectPageLegacyImportRecords(fileRecords);
  ensureNoNewLegacyPageImports(pageImportRecords);

  const legacyImportCount = pageImportRecords.reduce(
    (sum, record) => sum + record.legacyImportSpecifiers.length,
    0
  );
  console.log(
    `[page-legacy-runtime-boundary-audit] PASS: page legacy import boundary is stable (files=${fileRecords.length}, legacyImports=${legacyImportCount})`
  );
}

function isDirectCliExecution() {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);
}

if (isDirectCliExecution()) {
  runPageLegacyRuntimeBoundaryAudit().catch((error) => {
    console.error(
      `[page-legacy-runtime-boundary-audit] FAIL: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exitCode = 1;
  });
}

export {
  LEGACY_JS_IMPORT_PREFIX,
  PAGE_LEGACY_IMPORT_ALLOWLIST,
  collectPageLegacyImportRecords,
  ensureNoNewLegacyPageImports,
  extractImportSpecifiers,
  isDirectCliExecution,
  normalizePortablePath,
  runPageLegacyRuntimeBoundaryAudit,
  toProjectRelativePath
};
