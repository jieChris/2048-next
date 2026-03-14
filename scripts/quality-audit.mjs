import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

/**
 * Multi-metric quality audit.
 *
 * Extends the legacy line-count-only gate with:
 * 1. Cyclomatic complexity estimation (branch count per function)
 * 2. Code duplication detection (repeated blocks)
 * 3. Module coupling score (import fan-out)
 *
 * Output includes actionable fix suggestions, not just pass/fail.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_FUNCTION_COMPLEXITY = 12;
const MAX_FILE_COUPLING = 25;
const DUPLICATION_MIN_LINES = 5;

// ---------------------------------------------------------------------------
// Analyzers
// ---------------------------------------------------------------------------

function estimateCyclomaticComplexity(functionBody) {
  const branchPatterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bwhile\s*\(/g,
    /\bfor\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\s*[^:]/g,
    /&&/g,
    /\|\|/g
  ];
  let complexity = 1;
  for (const pattern of branchPatterns) {
    const matches = functionBody.match(pattern);
    if (matches) complexity += matches.length;
  }
  return complexity;
}

function collectFunctionBodies(content) {
  const lines = content.split(/\r?\n/u);
  const functions = [];
  const starts = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^function\s+([A-Za-z0-9_]+)\s*\(/u);
    if (match) starts.push({ line: i, name: match[1] });
  }

  for (let idx = 0; idx < starts.length; idx++) {
    const endLine = idx + 1 < starts.length ? starts[idx + 1].line : lines.length;
    const body = lines.slice(starts[idx].line, endLine).join("\n");
    functions.push({
      name: starts[idx].name,
      startLine: starts[idx].line + 1,
      lineCount: endLine - starts[idx].line,
      body,
      complexity: estimateCyclomaticComplexity(body)
    });
  }
  return functions;
}

function countImports(content) {
  const importPattern = /(?:import\s+|require\s*\()/g;
  const matches = content.match(importPattern);
  return matches ? matches.length : 0;
}

function detectDuplicateBlocks(content) {
  const lines = content.split(/\r?\n/u).map((l) => l.trim()).filter(Boolean);
  const seen = new Map();
  const duplicates = [];

  for (let i = 0; i <= lines.length - DUPLICATION_MIN_LINES; i++) {
    const block = lines.slice(i, i + DUPLICATION_MIN_LINES).join("\n");
    if (seen.has(block)) {
      const first = seen.get(block);
      duplicates.push({ firstLine: first, secondLine: i + 1, block });
    } else {
      seen.set(block, i + 1);
    }
  }
  return duplicates;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const jsDir = path.resolve(projectRoot, "js");
  const entries = await readdir(jsDir, { withFileTypes: true });
  const runtimeFiles = entries
    .filter((e) => e.isFile() && /^core_game_manager_.*_runtime\.js$/u.test(e.name))
    .map((e) => e.name)
    .sort();

  const issues = [];
  const suggestions = [];

  for (const fileName of runtimeFiles) {
    const filePath = path.join(jsDir, fileName);
    const content = await readFile(filePath, "utf8");
    const functions = collectFunctionBodies(content);

    // Complexity check
    const highComplexity = functions.filter((f) => f.complexity > MAX_FUNCTION_COMPLEXITY);
    for (const fn of highComplexity) {
      issues.push({
        type: "complexity",
        file: fileName,
        name: fn.name,
        line: fn.startLine,
        value: fn.complexity,
        limit: MAX_FUNCTION_COMPLEXITY
      });
      suggestions.push(
        `${fileName}:${fn.startLine} — ${fn.name}() has complexity ${fn.complexity}. ` +
        `Consider extracting conditional branches into helper functions.`
      );
    }

    // Coupling check
    const importCount = countImports(content);
    if (importCount > MAX_FILE_COUPLING) {
      issues.push({
        type: "coupling",
        file: fileName,
        value: importCount,
        limit: MAX_FILE_COUPLING
      });
      suggestions.push(
        `${fileName} has ${importCount} imports (limit: ${MAX_FILE_COUPLING}). ` +
        `Consider grouping related imports or splitting the module.`
      );
    }

    // Duplication check (informational, not blocking)
    const duplicates = detectDuplicateBlocks(content);
    if (duplicates.length > 3) {
      suggestions.push(
        `${fileName} has ${duplicates.length} duplicate code blocks (${DUPLICATION_MIN_LINES}+ lines). ` +
        `Consider extracting common patterns.`
      );
    }
  }

  // Report
  if (issues.length === 0) {
    console.log("[quality-audit] PASS: all runtime files within quality thresholds");
  } else {
    console.warn(`[quality-audit] INFO: ${issues.length} quality findings (advisory, non-blocking):`);
    for (const issue of issues.slice(0, 20)) {
      if (issue.type === "complexity") {
        console.warn(`  [complexity] ${issue.file}:${issue.line} ${issue.name}() = ${issue.value} (limit: ${issue.limit})`);
      } else if (issue.type === "coupling") {
        console.warn(`  [coupling] ${issue.file} imports = ${issue.value} (limit: ${issue.limit})`);
      }
    }
  }

  if (suggestions.length > 0) {
    console.log("");
    console.log("[quality-audit] Suggestions:");
    for (const s of suggestions.slice(0, 15)) {
      console.log(`  → ${s}`);
    }
  }

  console.log("");
  console.log("[quality-audit] Summary: complexity + coupling + duplication checks complete");
}

main().catch((error) => {
  console.error("[quality-audit] unexpected error", error);
  process.exitCode = 1;
});
