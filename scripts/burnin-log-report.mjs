import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const docsDir = path.resolve(projectRoot, "docs");

const LOG_FILE_PATTERN = /^BURNIN_EXECUTION_LOG_(\d{4}-\d{2})\.zh-CN\.md$/;
const DATE_ROW_PATTERN = /^\|\s*\d{4}-\d{2}-\d{2}\s*\|/;
const PENDING_PATTERN = /(待补|待执行|TBD|todo)/i;
const FAIL_PATTERN = /\|\s*失败\s*\|/;

function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const result = {
    requireReady: false,
    minDailyRows: 7,
    minRollbackRows: 2
  };
  for (const arg of args) {
    if (arg === "--require-ready") {
      result.requireReady = true;
      continue;
    }
    if (arg.startsWith("--min-daily=")) {
      const value = Number(arg.slice("--min-daily=".length));
      if (Number.isFinite(value) && value >= 0) result.minDailyRows = Math.floor(value);
      continue;
    }
    if (arg.startsWith("--min-rollback=")) {
      const value = Number(arg.slice("--min-rollback=".length));
      if (Number.isFinite(value) && value >= 0) result.minRollbackRows = Math.floor(value);
      continue;
    }
  }
  return result;
}

async function resolveLatestBurnInLog() {
  const names = await readdir(docsDir);
  const matches = names
    .map((name) => {
      const matched = LOG_FILE_PATTERN.exec(name);
      if (!matched) return null;
      return { name, month: matched[1] };
    })
    .filter(Boolean)
    .sort((a, b) => a.month.localeCompare(b.month));

  if (matches.length === 0) {
    throw new Error("未找到 burn-in 执行日志文件（docs/BURNIN_EXECUTION_LOG_YYYY-MM.zh-CN.md）");
  }
  return matches[matches.length - 1];
}

function extractSectionLines(content, sectionTitle) {
  const lines = String(content || "").split(/\r?\n/);
  const heading = `## ${sectionTitle}`;
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) return [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end);
}

function summarizeRows(lines) {
  const dataRows = lines.filter((line) => DATE_ROW_PATTERN.test(line.trim()));
  const pendingRows = dataRows.filter((row) => PENDING_PATTERN.test(row));
  const failedRows = dataRows.filter((row) => FAIL_PATTERN.test(row));
  const passedRows = dataRows.filter((row) => /\|\s*通过\s*\|/.test(row));
  return {
    rowCount: dataRows.length,
    pendingCount: pendingRows.length,
    failedCount: failedRows.length,
    passedCount: passedRows.length
  };
}

function printSummary(tag, summary) {
  console.log(
    `[burnin-log] ${tag}: rows=${summary.rowCount}, pending=${summary.pendingCount}, failed=${summary.failedCount}, passed=${summary.passedCount}`
  );
}

function resolveReadiness(summary, options) {
  const dailyOk =
    summary.daily.rowCount >= options.minDailyRows &&
    summary.daily.pendingCount === 0 &&
    summary.daily.failedCount === 0;
  const rollbackOk =
    summary.rollback.rowCount >= options.minRollbackRows &&
    summary.rollback.pendingCount === 0 &&
    summary.rollback.failedCount === 0;
  const gateOk =
    summary.gates.rowCount >= 3 &&
    summary.gates.pendingCount === 0 &&
    summary.gates.failedCount === 0;

  return {
    dailyOk,
    rollbackOk,
    gateOk,
    ready: dailyOk && rollbackOk && gateOk
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const latest = await resolveLatestBurnInLog();
  const filePath = path.resolve(docsDir, latest.name);
  const content = await readFile(filePath, "utf8");

  const daily = summarizeRows(extractSectionLines(content, "A. 日常观测记录"));
  const rollback = summarizeRows(extractSectionLines(content, "B. 回滚演练记录"));
  const gates = summarizeRows(extractSectionLines(content, "C. 提交前门禁记录"));

  console.log(`[burnin-log] file=${path.relative(projectRoot, filePath)} (month=${latest.month})`);
  printSummary("daily", daily);
  printSummary("rollback", rollback);
  printSummary("gates", gates);

  const readiness = resolveReadiness({ daily, rollback, gates }, options);
  console.log(
    `[burnin-log] readiness: daily=${readiness.dailyOk ? "PASS" : "NOT_READY"}, rollback=${readiness.rollbackOk ? "PASS" : "NOT_READY"}, gates=${readiness.gateOk ? "PASS" : "NOT_READY"}`
  );
  console.log(`[burnin-log] overall: ${readiness.ready ? "READY" : "NOT_READY"}`);

  if (options.requireReady && !readiness.ready) {
    throw new Error("burn-in 日志未达到发布就绪要求");
  }
}

main().catch((err) => {
  console.error("[burnin-log] failed", err && err.message ? err.message : err);
  process.exitCode = 1;
});

