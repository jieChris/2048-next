import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_MOBILE_DIR = path.resolve(projectRoot, "mobile");
const DEFAULT_DIST_DIR = path.resolve(projectRoot, "dist-app");

const FORBIDDEN_MARKERS = Object.freeze([
  "playLegacyScripts",
  "legacy-loader",
  "home_standard_startup_bundle.js",
  "home_standard_deferred_bundle.js",
  "js/game_manager.js",
]);

const ALLOWED_SHARED_ASSET_PATHS = Object.freeze([
  "style/fonts/ClearSans-Regular-webfont.woff",
  "style/fonts/ClearSans-Bold-webfont.woff",
]);

const RELEASE_CANDIDATE_FORBIDDEN_MARKERS = Object.freeze(["unapproved-draft"]);

function normalizePortablePath(filePath) {
  return String(filePath || "").replace(/\\/gu, "/");
}

function normalizeComparableText(value) {
  return normalizePortablePath(value).toLowerCase();
}

function extractImportSpecifiers(content) {
  const source = String(content || "");
  const matches = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?[^"'`;]*?\bfrom\s*(["'])([^"']+)\1/gu,
    /\bimport\s*(["'])([^"']+)\1/gu,
    /\bimport\s*\(\s*(["'`])([^"'`]+)\1/gu,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(source);
    while (match) {
      matches.push({ index: match.index, specifier: match[2] });
      match = pattern.exec(source);
    }
  }

  return matches
    .sort((left, right) => left.index - right.index)
    .map((entry) => entry.specifier);
}

function extractAssetSpecifiers(content) {
  const source = String(content || "");
  const matches = [];
  const patterns = [
    /\burl\(\s*(["']?)([^"'()]+)\1\s*\)/giu,
    /\b(?:src|href|poster)\s*=\s*(["'])([^"']+)\1/giu,
    /\bnew\s+URL\s*\(\s*(["'])([^"']+)\1\s*,\s*import\.meta\.url\s*\)/gu,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(source);
    while (match) {
      matches.push({ index: match.index, specifier: match[2].trim() });
      match = pattern.exec(source);
    }
  }

  return matches
    .sort((left, right) => left.index - right.index)
    .map((entry) => entry.specifier);
}

function findForbiddenMarkers(value) {
  const comparableValue = normalizeComparableText(value);
  return FORBIDDEN_MARKERS.filter((marker) =>
    comparableValue.includes(normalizeComparableText(marker)),
  );
}

function classifySourceImport(specifier) {
  const normalizedSpecifier = normalizePortablePath(specifier).split(
    /[?#]/u,
    1,
  )[0];
  const comparableSpecifier = normalizedSpecifier.toLowerCase();

  if (/(?:^|\/)js\//u.test(comparableSpecifier)) {
    return "legacy-js-import";
  }

  const marker = findForbiddenMarkers(normalizedSpecifier)[0];
  if (marker) return marker;

  if (comparableSpecifier.endsWith(".html")) {
    return "web-html-import";
  }

  return null;
}

function isCssSource(relativePath) {
  return /\.(?:css|less|sass|scss|styl)$/iu.test(relativePath);
}

function resolveRepositoryRelativeReference(
  sourceRelativePath,
  specifier,
  { bareIsLocal = false } = {},
) {
  const normalizedSpecifier = normalizePortablePath(specifier).trim();
  if (
    !normalizedSpecifier ||
    /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/iu.test(normalizedSpecifier) ||
    normalizedSpecifier.startsWith("var(")
  ) {
    return null;
  }

  const pathOnly = normalizedSpecifier.split(/[?#]/u, 1)[0];
  if (!pathOnly) return null;
  if (!bareIsLocal && !pathOnly.startsWith(".") && !pathOnly.startsWith("/")) {
    return null;
  }

  const sourcePath = path.posix.join(
    "mobile",
    normalizePortablePath(sourceRelativePath),
  );
  const resolvedPath = pathOnly.startsWith("/")
    ? path.posix.join("mobile", pathOnly.slice(1))
    : path.posix.join(path.posix.dirname(sourcePath), pathOnly);
  return path.posix.normalize(resolvedPath);
}

function classifyRepositoryReference({
  sourceRelativePath,
  specifier,
  referenceKind,
}) {
  const assetReference = referenceKind === "asset";
  const resolvedPath = resolveRepositoryRelativeReference(
    sourceRelativePath,
    specifier,
    { bareIsLocal: assetReference },
  );
  if (!resolvedPath) return null;

  if (resolvedPath === "mobile" || resolvedPath.startsWith("mobile/")) {
    if (
      resolvedPath.toLowerCase().endsWith(".html") &&
      resolvedPath !== "mobile/index.html"
    ) {
      return "web-html-reference";
    }
    return null;
  }

  if (
    assetReference &&
    isCssSource(sourceRelativePath) &&
    ALLOWED_SHARED_ASSET_PATHS.includes(resolvedPath)
  ) {
    return null;
  }

  if (
    !assetReference &&
    (resolvedPath === "src" || resolvedPath.startsWith("src/"))
  ) {
    return null;
  }

  return assetReference ? "web-asset-reference" : "cross-boundary-import";
}

function collectTextViolations(records, scope) {
  const violations = [];
  for (const record of records) {
    for (const marker of findForbiddenMarkers(record.content)) {
      violations.push({
        scope,
        kind: "forbidden-text",
        marker,
        relativePath: normalizePortablePath(record.relativePath),
      });
    }
  }
  return violations;
}

function collectSourceViolations(records) {
  const violations = [];
  for (const record of records) {
    for (const specifier of extractImportSpecifiers(record.content)) {
      const marker =
        classifySourceImport(specifier) ||
        classifyRepositoryReference({
          sourceRelativePath: record.relativePath,
          specifier,
          referenceKind: isCssSource(record.relativePath) ? "asset" : "import",
        });
      if (!marker) continue;
      violations.push({
        scope: "mobile-source",
        kind: "forbidden-import",
        marker,
        relativePath: normalizePortablePath(record.relativePath),
        specifier: normalizePortablePath(specifier),
      });
    }

    for (const specifier of extractAssetSpecifiers(record.content)) {
      const marker = classifyRepositoryReference({
        sourceRelativePath: record.relativePath,
        specifier,
        referenceKind: "asset",
      });
      if (!marker) continue;
      violations.push({
        scope: "mobile-source",
        kind: "forbidden-reference",
        marker,
        relativePath: normalizePortablePath(record.relativePath),
        specifier: normalizePortablePath(specifier),
      });
    }
  }

  return [...violations, ...collectTextViolations(records, "mobile-source")];
}

function collectDistViolations(records) {
  const violations = [];
  for (const record of records) {
    const relativePath = normalizePortablePath(record.relativePath);
    const pathMarkers = findForbiddenMarkers(relativePath);
    for (const marker of pathMarkers) {
      violations.push({
        scope: "dist-app",
        kind: "forbidden-path",
        marker,
        relativePath,
      });
    }

    if (
      pathMarkers.length === 0 &&
      /(?:^|\/)js\//u.test(relativePath.toLowerCase())
    ) {
      violations.push({
        scope: "dist-app",
        kind: "forbidden-path",
        marker: "legacy-js-path",
        relativePath,
      });
    }
  }

  return [...violations, ...collectTextViolations(records, "dist-app")];
}

function collectReleaseCandidateViolations(records, scope) {
  const violations = [];
  for (const record of records) {
    const relativePath = normalizePortablePath(record.relativePath);
    for (const marker of RELEASE_CANDIDATE_FORBIDDEN_MARKERS) {
      const comparableMarker = normalizeComparableText(marker);
      if (normalizeComparableText(relativePath).includes(comparableMarker)) {
        violations.push({
          scope,
          kind: "forbidden-path",
          marker,
          relativePath,
        });
      }
      if (normalizeComparableText(record.content).includes(comparableMarker)) {
        violations.push({
          scope,
          kind: "forbidden-text",
          marker,
          relativePath,
        });
      }
    }
  }
  return violations;
}

function ensureNoBoundaryViolations(violations) {
  if (!Array.isArray(violations) || violations.length === 0) return;

  const detail = violations
    .map((violation) => {
      const importDetail = violation.specifier ? `:${violation.specifier}` : "";
      return `${violation.scope}:${violation.kind}:${violation.marker}:${violation.relativePath}${importDetail}`;
    })
    .join(", ");
  throw new Error(
    `[mobile-boundary-audit] forbidden mobile boundary references: ${detail}`,
  );
}

function ensureNoReleaseCandidateViolations(violations) {
  if (!Array.isArray(violations) || violations.length === 0) return;

  const detail = violations
    .map(
      (violation) =>
        `${violation.scope}:${violation.kind}:${violation.marker}:${violation.relativePath}`,
    )
    .join(", ");
  throw new Error(
    `[mobile-boundary-audit] release-candidate forbidden markers: ${detail}`,
  );
}

function ensureSingleDistIndexHtml(records) {
  const htmlFiles = records
    .map((record) => normalizePortablePath(record.relativePath))
    .filter((relativePath) => relativePath.toLowerCase().endsWith(".html"))
    .sort((left, right) => left.localeCompare(right));

  if (htmlFiles.length !== 1 || htmlFiles[0] !== "index.html") {
    const found = htmlFiles.length > 0 ? htmlFiles.join(", ") : "(none)";
    throw new Error(
      `[mobile-boundary-audit] dist-app must contain exactly one root index.html; found: ${found}`,
    );
  }

  return htmlFiles;
}

async function readTreeRecords(rootDir) {
  const records = [];

  async function visit(directory, relativeDirectory = "") {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absolutePath = path.resolve(directory, entry.name);
      const relativePath = normalizePortablePath(
        path.join(relativeDirectory, entry.name),
      );
      if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
        continue;
      }
      if (!entry.isFile()) continue;

      const content = await readFile(absolutePath);
      records.push({
        absolutePath,
        relativePath,
        content: content.toString("utf8"),
      });
    }
  }

  await visit(path.resolve(rootDir));
  return records;
}

async function auditMobileBoundary({
  mobileDir = DEFAULT_MOBILE_DIR,
  distDir = DEFAULT_DIST_DIR,
  releaseCandidate = false,
} = {}) {
  const [sourceRecords, distRecords] = await Promise.all([
    readTreeRecords(mobileDir),
    readTreeRecords(distDir),
  ]);

  ensureNoBoundaryViolations(collectSourceViolations(sourceRecords));
  ensureNoBoundaryViolations(collectDistViolations(distRecords));
  const distHtmlFiles = ensureSingleDistIndexHtml(distRecords);

  if (releaseCandidate) {
    ensureNoReleaseCandidateViolations([
      ...collectReleaseCandidateViolations(sourceRecords, "mobile-source"),
      ...collectReleaseCandidateViolations(distRecords, "dist-app"),
    ]);
  }

  return {
    sourceFileCount: sourceRecords.length,
    distFileCount: distRecords.length,
    distHtmlFiles,
  };
}

async function runMobileBoundaryAudit(options = {}) {
  const result = await auditMobileBoundary(options);
  console.log(
    `[mobile-boundary-audit] PASS: mobile source and dist-app are isolated (sourceFiles=${result.sourceFileCount}, distFiles=${result.distFileCount}, html=${result.distHtmlFiles[0]})`,
  );
  return result;
}

function parseCliOptions(args = []) {
  let releaseCandidate = false;
  for (const argument of args) {
    if (argument === "--release-candidate") {
      releaseCandidate = true;
      continue;
    }
    throw new Error(`[mobile-boundary-audit] unknown argument: ${argument}`);
  }
  return { releaseCandidate };
}

function isDirectCliExecution() {
  return Boolean(
    process.argv[1] && path.resolve(process.argv[1]) === __filename,
  );
}

if (isDirectCliExecution()) {
  Promise.resolve()
    .then(() => runMobileBoundaryAudit(parseCliOptions(process.argv.slice(2))))
    .catch((error) => {
      console.error(
        `[mobile-boundary-audit] FAIL: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
    });
}

export {
  ALLOWED_SHARED_ASSET_PATHS,
  DEFAULT_DIST_DIR,
  DEFAULT_MOBILE_DIR,
  FORBIDDEN_MARKERS,
  RELEASE_CANDIDATE_FORBIDDEN_MARKERS,
  auditMobileBoundary,
  classifySourceImport,
  classifyRepositoryReference,
  collectDistViolations,
  collectReleaseCandidateViolations,
  collectSourceViolations,
  ensureNoBoundaryViolations,
  ensureNoReleaseCandidateViolations,
  ensureSingleDistIndexHtml,
  extractAssetSpecifiers,
  extractImportSpecifiers,
  findForbiddenMarkers,
  isDirectCliExecution,
  normalizePortablePath,
  parseCliOptions,
  readTreeRecords,
  resolveRepositoryRelativeReference,
  runMobileBoundaryAudit,
};
