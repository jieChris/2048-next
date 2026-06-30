import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const DEFAULT_DIST_DIR = path.resolve(projectRoot, "dist");
const DEFAULT_TOTAL_DIST_BUDGET_BYTES = 24 * 1024 * 1024;

const DEFAULT_RESOURCE_BUDGETS = [
  { pattern: /\.js$/iu, maxBytes: 900 * 1024, label: "JavaScript bundle" },
  { pattern: /\.css$/iu, maxBytes: 200 * 1024, label: "CSS bundle" },
  { pattern: /\.(?:png|jpe?g|webp)$/iu, maxBytes: 900 * 1024, label: "Image asset" },
  { pattern: /\.(?:m4a|ogg)$/iu, maxBytes: 4 * 1024 * 1024, label: "Audio asset" },
  { pattern: /\.ttf$/iu, maxBytes: 300 * 1024, label: "TTF font" },
  { pattern: /\.woff2?$/iu, maxBytes: 100 * 1024, label: "WOFF font" },
  { pattern: /\.svg$/iu, maxBytes: 100 * 1024, label: "SVG asset" },
  { pattern: /\.eot$/iu, maxBytes: 50 * 1024, label: "EOT font (legacy)" }
];

function formatSize(bytes) {
  const safeBytes = Math.max(0, Number(bytes) || 0);
  if (safeBytes < 1024) return `${safeBytes} B`;
  if (safeBytes < 1024 * 1024) return `${(safeBytes / 1024).toFixed(1)} KB`;
  return `${(safeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizeRelative(filePath, rootDir) {
  return path.relative(rootDir, filePath).replace(/\\/gu, "/");
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

function findMatchingBudget(relativePath, budgets) {
  return budgets.find((budget) => budget.pattern.test(relativePath)) || null;
}

function createFileOverBudgetIssue(relativePath, fileSize, budget) {
  return {
    type: "file_over_budget",
    file: relativePath,
    size: fileSize,
    maxBytes: budget.maxBytes,
    label: budget.label
  };
}

async function auditResourceBudget(options = {}) {
  const distDir = path.resolve(options.distDir || DEFAULT_DIST_DIR);
  const budgets = Array.isArray(options.budgets) ? options.budgets : DEFAULT_RESOURCE_BUDGETS;
  const totalMaxBytes = Number.isFinite(options.totalMaxBytes)
    ? Number(options.totalMaxBytes)
    : DEFAULT_TOTAL_DIST_BUDGET_BYTES;
  const issues = [];
  let fileCount = 0;
  let totalBytes = 0;

  try {
    const stats = await stat(distDir);
    if (!stats.isDirectory()) {
      issues.push({ type: "dist_not_directory", file: distDir });
      return { distDir, fileCount, totalBytes, totalMaxBytes, issues };
    }
  } catch {
    issues.push({ type: "dist_missing", file: distDir });
    return { distDir, fileCount, totalBytes, totalMaxBytes, issues };
  }

  const files = await collectFiles(distDir);
  for (const filePath of files) {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) continue;
    const relativePath = normalizeRelative(filePath, distDir);
    const fileSize = fileStats.size;
    fileCount += 1;
    totalBytes += fileSize;

    const budget = findMatchingBudget(relativePath, budgets);
    if (budget && fileSize > budget.maxBytes) {
      issues.push(createFileOverBudgetIssue(relativePath, fileSize, budget));
    }
  }

  if (totalBytes > totalMaxBytes) {
    issues.push({
      type: "total_over_budget",
      file: ".",
      size: totalBytes,
      maxBytes: totalMaxBytes,
      label: "Total dist"
    });
  }

  return { distDir, fileCount, totalBytes, totalMaxBytes, issues };
}

function formatIssue(issue) {
  if (!issue || typeof issue !== "object") return "unknown_issue";
  if (issue.type === "dist_missing" || issue.type === "dist_not_directory") {
    return `${issue.type}:${issue.file}`;
  }
  return `${issue.type}:${issue.file}:${formatSize(issue.size)}>${formatSize(issue.maxBytes)}`;
}

async function runResourceBudgetCheck(options = {}) {
  const result = await auditResourceBudget(options);
  if (result.issues.length > 0) {
    const preview = result.issues.slice(0, 80).map(formatIssue).join("\n");
    const suffix =
      result.issues.length > 80 ? `\n... ${result.issues.length - 80} more issue(s)` : "";
    throw new Error(
      `[resource-budget] failed\n${preview}${suffix}\n\nAction required: split large bundles, compress media, remove duplicate assets, or intentionally raise the reviewed budget.`
    );
  }
  console.log(
    `[resource-budget] PASS: checked ${result.fileCount} file(s), total ${formatSize(result.totalBytes)}`
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
    } else if (arg === "--max-total-mb" && argv[index + 1]) {
      args.totalMaxBytes = Number(argv[index + 1]) * 1024 * 1024;
      index += 1;
    } else if (arg.startsWith("--max-total-mb=")) {
      args.totalMaxBytes = Number(arg.slice("--max-total-mb=".length)) * 1024 * 1024;
    }
  }
  return args;
}

function isDirectCliExecution() {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);
}

if (isDirectCliExecution()) {
  runResourceBudgetCheck(parseCliArgs(process.argv.slice(2))).catch((error) => {
    console.error(error && error.message ? error.message : error);
    process.exitCode = 1;
  });
}

export {
  DEFAULT_RESOURCE_BUDGETS,
  DEFAULT_TOTAL_DIST_BUDGET_BYTES,
  auditResourceBudget,
  formatIssue,
  formatSize,
  isDirectCliExecution,
  parseCliArgs,
  runResourceBudgetCheck
};
