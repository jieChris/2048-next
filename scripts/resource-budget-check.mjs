import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_ASSETS = path.resolve(__dirname, "..", "dist", "assets");

/**
 * Resource budget definitions.
 * Any file matching the pattern must be under the size limit.
 */
const BUDGETS = [
  { pattern: /\.ttf$/i, maxBytes: 300 * 1024, label: "TTF font" },
  { pattern: /\.woff2?$/i, maxBytes: 100 * 1024, label: "WOFF font" },
  { pattern: /\.svg$/i, maxBytes: 100 * 1024, label: "SVG asset" },
  { pattern: /\.eot$/i, maxBytes: 50 * 1024, label: "EOT font (legacy)" }
];

const TOTAL_DIST_BUDGET_MB = 5;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  const violations = [];

  let entries;
  try {
    entries = await readdir(DIST_ASSETS, { withFileTypes: true });
  } catch {
    console.log("[resource-budget] dist/assets not found — run build first");
    return;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filePath = path.join(DIST_ASSETS, entry.name);
    const fileStat = await stat(filePath);

    for (const budget of BUDGETS) {
      if (budget.pattern.test(entry.name) && fileStat.size > budget.maxBytes) {
        violations.push({
          file: entry.name,
          size: fileStat.size,
          budget: budget.maxBytes,
          label: budget.label
        });
      }
    }
  }

  if (violations.length > 0) {
    console.error("[resource-budget] FAIL: assets over budget:");
    for (const v of violations) {
      console.error(
        `  ${v.label}: ${v.file} = ${formatSize(v.size)} (budget: ${formatSize(v.budget)})`
      );
    }
    console.error("");
    console.error("Action required: subset fonts, compress SVGs, or remove legacy formats.");
    process.exitCode = 1;
  } else {
    console.log("[resource-budget] PASS: all assets within budget");
  }
}

main().catch((error) => {
  console.error("[resource-budget] unexpected error", error);
  process.exitCode = 1;
});
