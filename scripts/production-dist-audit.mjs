import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const DEFAULT_DIST_DIR = path.resolve(projectRoot, "dist");

const TEXT_FILE_RE = /\.(?:css|html|js|json|mjs|svg|txt|webmanifest|xml)$/u;
const HTML_ATTR_REF_RE = /\b(?:href|src)\s*=\s*["']([^"']+)["']/giu;
const SCRIPT_IMPORT_REF_RE =
  /\bimport\s*(?:\(\s*["']([^"']+)["']\s*\)|[^"'();]*?\bfrom\s*["']([^"']+)["']|["']([^"']+)["'])/giu;
const SCRIPT_NEW_URL_REF_RE =
  /\bnew\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/giu;
const JSON_STRING_REF_RE =
  /["']([^"'\s?#<>]+\.(?:css|eot|gif|html|ico|jpg|jpeg|js|json|mjs|png|svg|ttf|wasm|webmanifest|webp|woff|woff2))(?:[?#][^"']*)?["']/giu;
const CSS_URL_REF_RE = /url\(\s*["']?([^"')]+)["']?\s*\)/giu;
const LOCAL_EXTENSION_RE =
  /\.(?:css|eot|gif|html|ico|jpg|jpeg|js|json|mjs|png|svg|ttf|wasm|webmanifest|webp|woff|woff2)$/iu;
const FORBIDDEN_UNFINISHED_THEME_TOKENS = [
  "liquid-glass",
  "--lg-",
  "visual-theme-select",
  "color-scheme-select",
  "visual_theme_v1",
  "color_scheme_v1",
  "settings-theme-select",
  "readVisualThemeState",
  "writeVisualThemeState",
  "applyVisualThemeRootState"
];

function stripUrlSuffix(value) {
  return String(value || "").split("#")[0].split("?")[0];
}

function isExternalOrEmptyRef(value) {
  const ref = String(value || "").trim();
  return (
    !ref ||
    ref.startsWith("#") ||
    ref.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/iu.test(ref)
  );
}

function isCheckableLocalRef(value) {
  const ref = stripUrlSuffix(value).trim();
  if (isExternalOrEmptyRef(ref)) return false;
  if (ref.endsWith("/")) return false;
  return LOCAL_EXTENSION_RE.test(ref);
}

function normalizeRelative(filePath, rootDir) {
  return path.relative(rootDir, filePath).replace(/\\/gu, "/");
}

function resolveLocalRef(ref, fromFile, rootDir) {
  const cleanRef = stripUrlSuffix(ref).trim();
  const resolved = cleanRef.startsWith("/")
    ? path.resolve(rootDir, `.${cleanRef}`)
    : path.resolve(path.dirname(fromFile), cleanRef);
  const relative = path.relative(rootDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
}

async function collectFiles(dir) {
  const result = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await collectFiles(entryPath)));
      continue;
    }
    if (entry.isFile()) result.push(entryPath);
  }
  return result.sort();
}

function collectMatches(source, regex) {
  const result = [];
  regex.lastIndex = 0;
  for (const match of source.matchAll(regex)) {
    result.push(match[1]);
  }
  return result;
}

function collectFirstMatchedGroups(source, regex) {
  const result = [];
  regex.lastIndex = 0;
  for (const match of source.matchAll(regex)) {
    const ref = match.slice(1).find(Boolean);
    if (ref) result.push(ref);
  }
  return result;
}

function collectReferences(source, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const refs = [];
  if (ext === ".html") refs.push(...collectMatches(source, HTML_ATTR_REF_RE));
  if (ext === ".css") refs.push(...collectMatches(source, CSS_URL_REF_RE));
  if (ext === ".js" || ext === ".mjs") {
    refs.push(...collectFirstMatchedGroups(source, SCRIPT_IMPORT_REF_RE));
    refs.push(...collectMatches(source, SCRIPT_NEW_URL_REF_RE));
  }
  if (ext === ".json" || ext === ".webmanifest") {
    refs.push(...collectMatches(source, JSON_STRING_REF_RE));
  }
  return refs;
}

async function fileExists(filePath) {
  try {
    const stats = await stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function auditProductionDist(options = {}) {
  const distDir = path.resolve(options.distDir || DEFAULT_DIST_DIR);
  const issues = [];
  const seenMissingRefs = new Set();
  let checkedTextFiles = 0;
  let checkedReferences = 0;

  try {
    const stats = await stat(distDir);
    if (!stats.isDirectory()) {
      issues.push(`dist_not_directory:${distDir}`);
      return { checkedTextFiles, checkedReferences, issues };
    }
  } catch {
    issues.push(`dist_missing:${distDir}`);
    return { checkedTextFiles, checkedReferences, issues };
  }

  const files = await collectFiles(distDir);
  for (const filePath of files) {
    if (!TEXT_FILE_RE.test(filePath)) continue;
    checkedTextFiles += 1;
    const source = await readFile(filePath, "utf8");
    const relativePath = normalizeRelative(filePath, distDir);

    for (const token of FORBIDDEN_UNFINISHED_THEME_TOKENS) {
      if (source.includes(token)) {
        issues.push(`forbidden_theme_token:${relativePath}:${token}`);
      }
    }

    for (const ref of collectReferences(source, filePath)) {
      if (!isCheckableLocalRef(ref)) continue;
      checkedReferences += 1;
      const resolved = resolveLocalRef(ref, filePath, distDir);
      if (!resolved) {
        issues.push(`reference_outside_dist:${relativePath}:${ref}`);
        continue;
      }
      if (!(await fileExists(resolved))) {
        const key = `${relativePath}:${ref}`;
        if (!seenMissingRefs.has(key)) {
          seenMissingRefs.add(key);
          issues.push(`missing_reference:${key}`);
        }
      }
    }
  }

  return { checkedTextFiles, checkedReferences, issues };
}

async function runProductionDistAudit(options = {}) {
  const result = await auditProductionDist(options);
  if (result.issues.length > 0) {
    const preview = result.issues.slice(0, 80).join("\n");
    const suffix =
      result.issues.length > 80 ? `\n... ${result.issues.length - 80} more issue(s)` : "";
    throw new Error(`[production-dist-audit] failed\n${preview}${suffix}`);
  }
  console.log(
    `[production-dist-audit] PASS: checked ${result.checkedTextFiles} text file(s), ${result.checkedReferences} local reference(s)`
  );
  return result;
}

function parseCliArgs(argv) {
  const args = { distDir: DEFAULT_DIST_DIR };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dist" && argv[index + 1]) {
      args.distDir = argv[index + 1];
      index += 1;
    } else if (arg.startsWith("--dist=")) {
      args.distDir = arg.slice("--dist=".length);
    }
  }
  return args;
}

function isDirectCliExecution() {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);
}

if (isDirectCliExecution()) {
  runProductionDistAudit(parseCliArgs(process.argv.slice(2))).catch((err) => {
    console.error(err && err.message ? err.message : err);
    process.exitCode = 1;
  });
}

export {
  FORBIDDEN_UNFINISHED_THEME_TOKENS,
  auditProductionDist,
  collectReferences,
  isCheckableLocalRef,
  isDirectCliExecution,
  resolveLocalRef,
  runProductionDistAudit,
  stripUrlSuffix
};
