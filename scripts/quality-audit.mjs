import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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
const QUALITY_AUDIT_HISTORY_LIMIT = 50;
const QUALITY_AUDIT_HISTORY_PATH = path.resolve(projectRoot, "artifacts", "quality-audit-history.json");
const QUALITY_AUDIT_RISE_STREAK_WARN_THRESHOLD = 3;
const QUALITY_AUDIT_FILE_DIFF_MAX_ITEMS = 12;
const QUALITY_AUDIT_DEFAULT_MARKDOWN_REPORT_PATH = path.resolve(projectRoot, "artifacts", "quality-audit-summary.md");

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

function countIssuesByType(issues, type) {
  return issues.filter((issue) => issue.type === type).length;
}

function formatDelta(currentValue, previousValue) {
  if (typeof previousValue !== "number") return "n/a";
  const delta = currentValue - previousValue;
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta}` : String(delta);
}

function toPosixPath(filePath) {
  return String(filePath || "").replace(/\\/g, "/");
}

function resolveOutputPathFromProject(pathValue) {
  if (!pathValue || typeof pathValue !== "string") return null;
  const trimmed = pathValue.trim();
  if (!trimmed) return null;
  if (path.isAbsolute(trimmed)) return path.normalize(trimmed);
  return path.resolve(projectRoot, trimmed);
}

function parseQualityAuditCliOptions(argv) {
  const options = {
    markdownReportPath: null
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--report-markdown") {
      const nextArg = argv[index + 1];
      if (nextArg && !nextArg.startsWith("--")) {
        options.markdownReportPath = resolveOutputPathFromProject(nextArg);
        index += 1;
      } else {
        options.markdownReportPath = QUALITY_AUDIT_DEFAULT_MARKDOWN_REPORT_PATH;
      }
      continue;
    }
    if (arg.startsWith("--report-markdown=")) {
      const inlinePath = arg.slice("--report-markdown=".length);
      options.markdownReportPath = resolveOutputPathFromProject(inlinePath) || QUALITY_AUDIT_DEFAULT_MARKDOWN_REPORT_PATH;
    }
  }

  return options;
}

async function loadQualityAuditHistory() {
  try {
    const raw = await readFile(QUALITY_AUDIT_HISTORY_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    if (error instanceof SyntaxError) {
      console.warn("[quality-audit] WARN: history file parse failed, continuing with empty history");
      return [];
    }
    throw error;
  }
}

async function appendQualityAuditHistorySnapshot(snapshot) {
  const history = await loadQualityAuditHistory();
  const previous = history.length ? history[history.length - 1] : null;
  const nextHistory = history.concat(snapshot).slice(-QUALITY_AUDIT_HISTORY_LIMIT);

  await mkdir(path.dirname(QUALITY_AUDIT_HISTORY_PATH), { recursive: true });
  await writeFile(QUALITY_AUDIT_HISTORY_PATH, `${JSON.stringify(nextHistory, null, 2)}\n`, "utf8");

  return {
    previous,
    historySize: nextHistory.length,
    history: nextHistory
  };
}

function printQualityAuditTrendSnapshot(snapshot, previousSnapshot, historySize) {
  const currentTotals = snapshot.totals;
  const previousTotals = previousSnapshot && previousSnapshot.totals ? previousSnapshot.totals : null;

  console.log("");
  console.log(`[quality-audit] Trend snapshot (${historySize} runs kept):`);
  console.log(
    `  issues=${currentTotals.issueCount} (Δ ${formatDelta(currentTotals.issueCount, previousTotals && previousTotals.issueCount)})`
  );
  console.log(
    `  complexity=${currentTotals.complexityIssues} (Δ ${formatDelta(currentTotals.complexityIssues, previousTotals && previousTotals.complexityIssues)})`
  );
  console.log(
    `  coupling=${currentTotals.couplingIssues} (Δ ${formatDelta(currentTotals.couplingIssues, previousTotals && previousTotals.couplingIssues)})`
  );
  console.log(
    `  duplicateAdvisoryFiles=${currentTotals.duplicateAdvisoryFiles} (Δ ${formatDelta(currentTotals.duplicateAdvisoryFiles, previousTotals && previousTotals.duplicateAdvisoryFiles)})`
  );
  console.log(
    `  duplicateAdvisoryBlocks=${currentTotals.duplicateAdvisoryBlocks} (Δ ${formatDelta(currentTotals.duplicateAdvisoryBlocks, previousTotals && previousTotals.duplicateAdvisoryBlocks)})`
  );
  console.log("  history=artifacts/quality-audit-history.json");
}

function normalizeSnapshotFileMetricRecord(record) {
  if (!record || typeof record !== "object") return null;
  if (typeof record.file !== "string" || !record.file) return null;
  return {
    file: record.file,
    complexityIssues: Number(record.complexityIssues) || 0,
    couplingIssues: Number(record.couplingIssues) || 0,
    duplicateBlocks: Number(record.duplicateBlocks) || 0
  };
}

function buildSnapshotFileMetricMap(snapshot) {
  const map = {};
  if (!(snapshot && Array.isArray(snapshot.files))) return map;
  for (const record of snapshot.files) {
    const normalized = normalizeSnapshotFileMetricRecord(record);
    if (!normalized) continue;
    map[normalized.file] = normalized;
  }
  return map;
}

function hasSnapshotFileMetricChanged(currentRecord, previousRecord) {
  return (
    currentRecord.complexityIssues !== previousRecord.complexityIssues ||
    currentRecord.couplingIssues !== previousRecord.couplingIssues ||
    currentRecord.duplicateBlocks !== previousRecord.duplicateBlocks
  );
}

function createZeroSnapshotFileMetric(fileName) {
  return {
    file: fileName,
    complexityIssues: 0,
    couplingIssues: 0,
    duplicateBlocks: 0
  };
}

function collectChangedSnapshotFileMetrics(snapshot, previousSnapshot) {
  if (!previousSnapshot) return [];
  const currentMap = buildSnapshotFileMetricMap(snapshot);
  const previousMap = buildSnapshotFileMetricMap(previousSnapshot);
  const fileSet = new Set(Object.keys(currentMap).concat(Object.keys(previousMap)));
  const changed = [];

  for (const fileName of Array.from(fileSet).sort()) {
    const currentRecord = currentMap[fileName] || createZeroSnapshotFileMetric(fileName);
    const previousRecord = previousMap[fileName] || createZeroSnapshotFileMetric(fileName);
    if (!hasSnapshotFileMetricChanged(currentRecord, previousRecord)) continue;
    changed.push({
      file: fileName,
      current: currentRecord,
      previous: previousRecord
    });
  }

  changed.sort(compareChangedSnapshotFileMetric);
  return changed;
}

function calculateSnapshotFileMetricDeltaMagnitude(item) {
  return (
    Math.abs(item.current.complexityIssues - item.previous.complexityIssues) +
    Math.abs(item.current.couplingIssues - item.previous.couplingIssues) +
    Math.abs(item.current.duplicateBlocks - item.previous.duplicateBlocks)
  );
}

function compareChangedSnapshotFileMetric(a, b) {
  const magnitudeDelta = calculateSnapshotFileMetricDeltaMagnitude(b) - calculateSnapshotFileMetricDeltaMagnitude(a);
  if (magnitudeDelta !== 0) return magnitudeDelta;
  return a.file.localeCompare(b.file);
}

function summarizeChangedSnapshotFileMetrics(changed) {
  const summary = {
    risingFiles: 0,
    fallingFiles: 0,
    mixedFiles: 0
  };

  for (const item of changed) {
    const complexityDelta = item.current.complexityIssues - item.previous.complexityIssues;
    const couplingDelta = item.current.couplingIssues - item.previous.couplingIssues;
    const duplicateDelta = item.current.duplicateBlocks - item.previous.duplicateBlocks;
    const hasRise = complexityDelta > 0 || couplingDelta > 0 || duplicateDelta > 0;
    const hasFall = complexityDelta < 0 || couplingDelta < 0 || duplicateDelta < 0;

    if (hasRise && hasFall) {
      summary.mixedFiles += 1;
    } else if (hasRise) {
      summary.risingFiles += 1;
    } else if (hasFall) {
      summary.fallingFiles += 1;
    }
  }

  return summary;
}

function printChangedSnapshotFileMetrics(snapshot, previousSnapshot) {
  const changed = collectChangedSnapshotFileMetrics(snapshot, previousSnapshot);
  console.log("");
  if (!previousSnapshot) {
    console.log("[quality-audit] File metric diff: n/a (no previous snapshot)");
    return;
  }
  if (!changed.length) {
    console.log("[quality-audit] File metric diff: no changed files");
    return;
  }
  const summary = summarizeChangedSnapshotFileMetrics(changed);
  console.log(
    `[quality-audit] File metric diff: ${changed.length} changed file(s), ` +
    `rising=${summary.risingFiles}, falling=${summary.fallingFiles}, mixed=${summary.mixedFiles}`
  );
  for (const item of changed.slice(0, QUALITY_AUDIT_FILE_DIFF_MAX_ITEMS)) {
    console.log(
      `  [file] ${item.file} | ` +
      `complexity ${item.previous.complexityIssues}->${item.current.complexityIssues} ` +
      `(Δ ${formatDelta(item.current.complexityIssues, item.previous.complexityIssues)}), ` +
      `coupling ${item.previous.couplingIssues}->${item.current.couplingIssues} ` +
      `(Δ ${formatDelta(item.current.couplingIssues, item.previous.couplingIssues)}), ` +
      `dupBlocks ${item.previous.duplicateBlocks}->${item.current.duplicateBlocks} ` +
      `(Δ ${formatDelta(item.current.duplicateBlocks, item.previous.duplicateBlocks)})`
    );
  }
  if (changed.length > QUALITY_AUDIT_FILE_DIFF_MAX_ITEMS) {
    console.log(`  ... ${changed.length - QUALITY_AUDIT_FILE_DIFF_MAX_ITEMS} more changed file(s) omitted`);
  }
}

function readTrendMetricValue(snapshot, metricName) {
  if (!(snapshot && snapshot.totals)) return null;
  const value = snapshot.totals[metricName];
  return typeof value === "number" ? value : null;
}

function computeTrendIncreaseStreak(history, metricName) {
  const snapshots = Array.isArray(history) ? history : [];
  if (snapshots.length < 2) return 0;
  let streak = 0;
  for (let index = snapshots.length - 1; index > 0; index--) {
    const currentValue = readTrendMetricValue(snapshots[index], metricName);
    const previousValue = readTrendMetricValue(snapshots[index - 1], metricName);
    if (currentValue === null || previousValue === null) break;
    if (currentValue <= previousValue) break;
    streak += 1;
  }
  return streak;
}

function collectTrendRiseWarnings(history) {
  const metrics = [
    { key: "issueCount", label: "issues" },
    { key: "complexityIssues", label: "complexity" },
    { key: "couplingIssues", label: "coupling" },
    { key: "duplicateAdvisoryFiles", label: "duplicateAdvisoryFiles" },
    { key: "duplicateAdvisoryBlocks", label: "duplicateAdvisoryBlocks" }
  ];
  const snapshots = Array.isArray(history) ? history : [];
  const latest = snapshots.length ? snapshots[snapshots.length - 1] : null;
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const warnings = [];

  for (const metric of metrics) {
    const riseStreak = computeTrendIncreaseStreak(snapshots, metric.key);
    if (riseStreak < QUALITY_AUDIT_RISE_STREAK_WARN_THRESHOLD) continue;
    const latestValue = readTrendMetricValue(latest, metric.key);
    const previousValue = readTrendMetricValue(previous, metric.key);
    if (latestValue === null || previousValue === null) continue;
    warnings.push({
      label: metric.label,
      riseStreak,
      latestValue,
      delta: latestValue - previousValue
    });
  }

  return warnings;
}

function printTrendRiseWarnings(warnings) {
  if (!warnings.length) return;
  console.log("");
  console.warn(
    `[quality-audit] Trend warnings (${QUALITY_AUDIT_RISE_STREAK_WARN_THRESHOLD}+ consecutive rises):`
  );
  for (const warning of warnings) {
    console.warn(
      `  [trend] ${warning.label} has risen ${warning.riseStreak} runs in a row ` +
      `(latest=${warning.latestValue}, Δ ${warning.delta > 0 ? `+${warning.delta}` : warning.delta})`
    );
  }
}

function buildQualityAuditMarkdownReport(snapshot, previousSnapshot, historySize, changedFileMetrics, trendWarnings) {
  const previousTotals = previousSnapshot && previousSnapshot.totals ? previousSnapshot.totals : null;
  const metrics = [
    { key: "issueCount", label: "issues" },
    { key: "complexityIssues", label: "complexity" },
    { key: "couplingIssues", label: "coupling" },
    { key: "duplicateAdvisoryFiles", label: "duplicateAdvisoryFiles" },
    { key: "duplicateAdvisoryBlocks", label: "duplicateAdvisoryBlocks" }
  ];
  const lines = [];

  lines.push("# Quality Audit Trend Summary");
  lines.push("");
  lines.push(`- generatedAt: ${snapshot.timestamp}`);
  lines.push(`- historyRunsKept: ${historySize}`);
  lines.push(`- historyFile: \`${toPosixPath(path.relative(projectRoot, QUALITY_AUDIT_HISTORY_PATH))}\``);
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push("| Metric | Current | Previous | Delta |");
  lines.push("| --- | ---: | ---: | ---: |");
  for (const metric of metrics) {
    const currentValue = snapshot.totals[metric.key];
    const previousValue = previousTotals ? previousTotals[metric.key] : null;
    lines.push(`| ${metric.label} | ${currentValue} | ${typeof previousValue === "number" ? previousValue : "n/a"} | ${formatDelta(currentValue, previousValue)} |`);
  }

  lines.push("");
  lines.push("## File Metric Diff");
  lines.push("");
  if (!previousSnapshot) {
    lines.push("- n/a (no previous snapshot)");
  } else if (!changedFileMetrics.length) {
    lines.push("- no changed files");
  } else {
    const changedSummary = summarizeChangedSnapshotFileMetrics(changedFileMetrics);
    lines.push(
      `- changedFiles: ${changedFileMetrics.length} ` +
      `(rising=${changedSummary.risingFiles}, falling=${changedSummary.fallingFiles}, mixed=${changedSummary.mixedFiles})`
    );
    lines.push("");
    lines.push("| File | Complexity | Coupling | Duplicate Blocks |");
    lines.push("| --- | --- | --- | --- |");
    for (const item of changedFileMetrics.slice(0, QUALITY_AUDIT_FILE_DIFF_MAX_ITEMS)) {
      lines.push(
        `| \`${item.file}\` | ` +
        `${item.previous.complexityIssues}->${item.current.complexityIssues} (Δ ${formatDelta(item.current.complexityIssues, item.previous.complexityIssues)}) | ` +
        `${item.previous.couplingIssues}->${item.current.couplingIssues} (Δ ${formatDelta(item.current.couplingIssues, item.previous.couplingIssues)}) | ` +
        `${item.previous.duplicateBlocks}->${item.current.duplicateBlocks} (Δ ${formatDelta(item.current.duplicateBlocks, item.previous.duplicateBlocks)}) |`
      );
    }
    if (changedFileMetrics.length > QUALITY_AUDIT_FILE_DIFF_MAX_ITEMS) {
      lines.push("");
      lines.push(`- omittedFiles: ${changedFileMetrics.length - QUALITY_AUDIT_FILE_DIFF_MAX_ITEMS}`);
    }
  }

  lines.push("");
  lines.push("## Trend Warnings");
  lines.push("");
  if (!trendWarnings.length) {
    lines.push("- none");
  } else {
    for (const warning of trendWarnings) {
      lines.push(
        `- ${warning.label}: risen ${warning.riseStreak} runs in a row ` +
        `(latest=${warning.latestValue}, Δ ${warning.delta > 0 ? `+${warning.delta}` : warning.delta})`
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

async function writeQualityAuditMarkdownReport(reportPath, reportContent) {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, reportContent, "utf8");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const cliOptions = parseQualityAuditCliOptions(process.argv.slice(2));
  const jsDir = path.resolve(projectRoot, "js");
  const entries = await readdir(jsDir, { withFileTypes: true });
  const runtimeFiles = entries
    .filter((e) => e.isFile() && /^core_game_manager_.*_runtime\.js$/u.test(e.name))
    .map((e) => e.name)
    .sort();

  const issues = [];
  const suggestions = [];
  const fileMetrics = [];

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

    fileMetrics.push({
      file: fileName,
      complexityIssues: highComplexity.length,
      couplingIssues: importCount > MAX_FILE_COUPLING ? 1 : 0,
      duplicateBlocks: duplicates.length,
      duplicateAdvisory: duplicates.length > 3
    });
  }

  const duplicateAdvisoryFiles = fileMetrics.filter((metric) => metric.duplicateAdvisory).length;
  const duplicateAdvisoryBlocks = fileMetrics
    .filter((metric) => metric.duplicateAdvisory)
    .reduce((sum, metric) => sum + metric.duplicateBlocks, 0);

  const snapshot = {
    timestamp: new Date().toISOString(),
    totals: {
      issueCount: issues.length,
      complexityIssues: countIssuesByType(issues, "complexity"),
      couplingIssues: countIssuesByType(issues, "coupling"),
      duplicateAdvisoryFiles,
      duplicateAdvisoryBlocks
    },
    files: fileMetrics
      .filter((metric) => metric.complexityIssues || metric.couplingIssues || metric.duplicateAdvisory)
      .map((metric) => ({
        file: metric.file,
        complexityIssues: metric.complexityIssues,
        couplingIssues: metric.couplingIssues,
        duplicateBlocks: metric.duplicateBlocks
      }))
  };

  const historyState = await appendQualityAuditHistorySnapshot(snapshot);

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

  printQualityAuditTrendSnapshot(snapshot, historyState.previous, historyState.historySize);
  printChangedSnapshotFileMetrics(snapshot, historyState.previous);
  const trendWarnings = collectTrendRiseWarnings(historyState.history);
  printTrendRiseWarnings(trendWarnings);

  if (cliOptions.markdownReportPath) {
    const changedFileMetrics = collectChangedSnapshotFileMetrics(snapshot, historyState.previous);
    const markdownReport = buildQualityAuditMarkdownReport(
      snapshot,
      historyState.previous,
      historyState.historySize,
      changedFileMetrics,
      trendWarnings
    );
    await writeQualityAuditMarkdownReport(cliOptions.markdownReportPath, markdownReport);
    console.log(`[quality-audit] Markdown report: ${toPosixPath(path.relative(projectRoot, cliOptions.markdownReportPath))}`);
  }

  console.log("");
  console.log("[quality-audit] Summary: complexity + coupling + duplication checks complete");
}

main().catch((error) => {
  console.error("[quality-audit] unexpected error", error);
  process.exitCode = 1;
});
