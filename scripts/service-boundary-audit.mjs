import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const AUDIT_TARGETS = [
  { rootDir: path.resolve(projectRoot, "src"), relativePrefix: "src" },
  { rootDir: path.resolve(projectRoot, "js"), relativePrefix: "js" }
];

const DEFAULT_ALLOWED_FILE_SUFFIXES = new Set([".js", ".ts"]);
const DIRECT_STORAGE_PATTERN = /\b(?:localStorage|sessionStorage)\s*\./gu;
const DIRECT_FETCH_PATTERN = /\bfetch\s*\(/gu;
const DIRECT_SERVICE_USAGE_ALLOWLIST = new Set();

function fail(message) {
  throw new Error(message);
}

function normalizePortablePath(filePath) {
  return String(filePath || "").replace(/\\/gu, "/");
}

function toProjectRelativePath(filePath) {
  const normalizedPath = normalizePortablePath(filePath);
  const normalizedRoot = normalizePortablePath(projectRoot);
  const rootName = path.basename(projectRoot);
  const marker = `/${rootName}/`;
  let relativePath = normalizedPath;
  if (normalizedRoot && normalizedPath.startsWith(`${normalizedRoot}/`)) {
    relativePath = normalizedPath.slice(normalizedRoot.length + 1);
  } else {
    relativePath = normalizePortablePath(path.relative(projectRoot, filePath));
  }
  if (/^[A-Za-z]:\//u.test(relativePath)) {
    const embeddedIndex = relativePath.lastIndexOf(marker);
    if (embeddedIndex !== -1) {
      return relativePath.slice(embeddedIndex + marker.length);
    }
    const sourceRootMatch = relativePath.match(/\/(?:src|js)\//u);
    if (sourceRootMatch && typeof sourceRootMatch.index === "number") {
      return relativePath.slice(sourceRootMatch.index + 1);
    }
  }
  const markerIndex = relativePath.lastIndexOf(marker);
  if (markerIndex !== -1) {
    return relativePath.slice(markerIndex + marker.length);
  }
  return relativePath;
}

function shouldAuditFile(filePath, allowedFileSuffixes = DEFAULT_ALLOWED_FILE_SUFFIXES) {
  const ext = path.extname(filePath || "");
  return allowedFileSuffixes.has(ext);
}

function collectPatternMatches(content, pattern, label) {
  const source = String(content || "");
  const matches = [];
  let match = pattern.exec(source);
  while (match) {
    const line = source.slice(0, match.index).split(/\r?\n/gu).length;
    matches.push({
      label,
      token: match[0],
      line
    });
    match = pattern.exec(source);
  }
  pattern.lastIndex = 0;
  return matches;
}

function collectBoundaryViolations(filePath, content) {
  if (DIRECT_SERVICE_USAGE_ALLOWLIST.has(toProjectRelativePath(filePath))) return [];
  return [
    ...collectPatternMatches(content, DIRECT_STORAGE_PATTERN, "storage"),
    ...collectPatternMatches(content, DIRECT_FETCH_PATTERN, "fetch")
  ].map((entry) => ({
    filePath,
    projectRelativePath: toProjectRelativePath(filePath),
    ...entry
  }));
}

async function walkDirectory(dirPath, visitor) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walkDirectory(entryPath, visitor);
      continue;
    }
    if (entry.isFile()) {
      await visitor(entryPath);
    }
  }
}

async function collectAuditFileRecords() {
  const records = [];
  for (const target of AUDIT_TARGETS) {
    await walkDirectory(target.rootDir, async (filePath) => {
      if (!shouldAuditFile(filePath)) return;
      const content = await readFile(filePath, "utf8");
      records.push({
        filePath,
        projectRelativePath: toProjectRelativePath(filePath),
        content
      });
    });
  }
  records.sort((left, right) => left.projectRelativePath.localeCompare(right.projectRelativePath));
  return records;
}

function ensureNoBoundaryViolations(violations) {
  if (!Array.isArray(violations) || violations.length === 0) return;
  const detail = violations
    .map((entry) => `${entry.projectRelativePath}:L${entry.line}:${entry.label}`)
    .join(", ");
  fail(`[service-boundary-audit] forbidden direct storage/fetch usage: ${detail}`);
}

async function runServiceBoundaryAudit() {
  const records = await collectAuditFileRecords();
  const violations = records.flatMap((record) =>
    collectBoundaryViolations(record.filePath, record.content)
  );
  ensureNoBoundaryViolations(violations);
  console.log(
    `[service-boundary-audit] PASS: service boundary is stable (files=${records.length}, violations=${violations.length})`
  );
}

function isDirectCliExecution() {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);
}

if (isDirectCliExecution()) {
  runServiceBoundaryAudit().catch((error) => {
    console.error(
      `[service-boundary-audit] FAIL: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  });
}

export {
  AUDIT_TARGETS,
  DEFAULT_ALLOWED_FILE_SUFFIXES,
  DIRECT_FETCH_PATTERN,
  DIRECT_STORAGE_PATTERN,
  DIRECT_SERVICE_USAGE_ALLOWLIST,
  collectBoundaryViolations,
  collectPatternMatches,
  collectAuditFileRecords,
  ensureNoBoundaryViolations,
  isDirectCliExecution,
  normalizePortablePath,
  runServiceBoundaryAudit,
  shouldAuditFile,
  toProjectRelativePath
};
