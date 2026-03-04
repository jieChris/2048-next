import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const docsDir = path.resolve(projectRoot, "docs");

const DAILY_SECTION_HEADING = "## A. 日常观测记录";
const HEADER_ROW = "| 日期 | 会话量 | 可比较样本 | 不一致率 | 连续窗口通过率 | Top 不一致模式 | Readiness | 备注 |";
const SEPARATOR_ROW = "|---|---:|---:|---:|---:|---|---|---|";
const READYNESS_SET = new Set(["可切换", "观察中", "阻塞"]);

function printHelp() {
  console.log(
    [
      "用法:",
      "  node scripts/burnin-log-daily.mjs --sessions=1200 --comparable=980 --mismatch=0.41% --sustained=3/3(100%) --top='classic(2/500)' --readiness=可切换 --note='连续第4天达标'",
      "",
      "参数:",
      "  --date=YYYY-MM-DD          记录日期，默认今天",
      "  --sessions=...             会话量（必填）",
      "  --comparable=...           可比较样本（必填）",
      "  --mismatch=...             不一致率（必填）",
      "  --sustained=...            连续窗口通过率（必填）",
      "  --top=...                  Top 不一致模式（必填）",
      "  --readiness=可切换|观察中|阻塞  readiness（必填）",
      "  --note=...                 备注（可选，默认 -）",
      "  --dry-run                  仅预览，不写文件",
      "  --help                     显示帮助",
      "",
      "说明:",
      "  - 会自动定位并写入 docs/BURNIN_EXECUTION_LOG_YYYY-MM.zh-CN.md",
      "  - 若当天已存在记录则更新，否则新增"
    ].join("\n")
  );
}

function todayIsoDate() {
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const options = {
    date: todayIsoDate(),
    sessions: "",
    comparable: "",
    mismatch: "",
    sustained: "",
    top: "",
    readiness: "",
    note: "-",
    dryRun: false,
    help: false
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg.startsWith("--date=")) {
      options.date = arg.slice("--date=".length).trim();
      continue;
    }
    if (arg.startsWith("--sessions=")) {
      options.sessions = arg.slice("--sessions=".length).trim();
      continue;
    }
    if (arg.startsWith("--comparable=")) {
      options.comparable = arg.slice("--comparable=".length).trim();
      continue;
    }
    if (arg.startsWith("--mismatch=")) {
      options.mismatch = arg.slice("--mismatch=".length).trim();
      continue;
    }
    if (arg.startsWith("--sustained=")) {
      options.sustained = arg.slice("--sustained=".length).trim();
      continue;
    }
    if (arg.startsWith("--top=")) {
      options.top = arg.slice("--top=".length).trim();
      continue;
    }
    if (arg.startsWith("--readiness=")) {
      options.readiness = arg.slice("--readiness=".length).trim();
      continue;
    }
    if (arg.startsWith("--note=")) {
      const raw = arg.slice("--note=".length).trim();
      options.note = raw || "-";
      continue;
    }
    throw new Error(`不支持的参数: ${arg}`);
  }

  return options;
}

function validateDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`date 格式错误: ${value}（应为 YYYY-MM-DD）`);
  }
}

function requireNonEmpty(value, field) {
  if (!value || !String(value).trim()) {
    throw new Error(`缺少必填参数: --${field}=...`);
  }
}

function sanitizeCell(value) {
  const text = String(value == null ? "" : value).trim();
  const safe = text.replace(/\|/g, "｜");
  return safe || "-";
}

function buildDailyRow(input) {
  return (
    `| ${sanitizeCell(input.date)} | ${sanitizeCell(input.sessions)} | ${sanitizeCell(input.comparable)} | ` +
    `${sanitizeCell(input.mismatch)} | ${sanitizeCell(input.sustained)} | ${sanitizeCell(input.top)} | ` +
    `${sanitizeCell(input.readiness)} | ${sanitizeCell(input.note)} |`
  );
}

function buildMonthlyFileTemplate(month) {
  return (
    `# Burn-in 执行记录（${month}）\n\n` +
    "## 记录说明\n" +
    "- 每天至少 1 条日常观测记录。\n" +
    "- 回滚演练当天，额外补 1 条演练记录。\n" +
    `- 本文件按 ${month} 月度维护。\n\n` +
    "## A. 日常观测记录\n" +
    `${HEADER_ROW}\n` +
    `${SEPARATOR_ROW}\n\n` +
    "## B. 回滚演练记录\n" +
    "| 日期 | 操作 | 预期 | 实际 | 结果 |\n" +
    "|---|---|---|---|---|\n\n" +
    "## C. 提交前门禁记录\n" +
    "| 日期 | 命令 | 结果 | 耗时 | 备注 |\n" +
    "|---|---|---|---|---|\n"
  );
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseRowDate(line) {
  const matched = /^\|\s*(\d{4}-\d{2}-\d{2})\s*\|/.exec(line.trim());
  return matched ? matched[1] : null;
}

function ensureDailySectionTable(lines, sectionStart, sectionEnd) {
  let headerIndex = -1;
  let separatorIndex = -1;
  for (let i = sectionStart + 1; i < sectionEnd; i++) {
    if (lines[i].trim() === HEADER_ROW) headerIndex = i;
    if (lines[i].trim() === SEPARATOR_ROW) separatorIndex = i;
  }
  if (headerIndex < 0 || separatorIndex < 0 || separatorIndex !== headerIndex + 1) {
    throw new Error("A. 日常观测记录表格结构不符合预期，无法自动写入");
  }
  return separatorIndex + 1;
}

function resolveInsertOrUpdateIndex(lines, start, end, targetDate) {
  for (let i = start; i < end; i++) {
    const rowDate = parseRowDate(lines[i]);
    if (!rowDate) continue;
    if (rowDate === targetDate) return { index: i, update: true };
  }

  for (let i = start; i < end; i++) {
    const rowDate = parseRowDate(lines[i]);
    if (!rowDate) continue;
    if (targetDate > rowDate) return { index: i, update: false };
  }

  return { index: end, update: false };
}

function findSectionRange(lines, heading) {
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) {
    throw new Error(`未找到章节: ${heading}`);
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return { start, end };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  validateDate(options.date);
  requireNonEmpty(options.sessions, "sessions");
  requireNonEmpty(options.comparable, "comparable");
  requireNonEmpty(options.mismatch, "mismatch");
  requireNonEmpty(options.sustained, "sustained");
  requireNonEmpty(options.top, "top");
  requireNonEmpty(options.readiness, "readiness");
  if (!READYNESS_SET.has(options.readiness)) {
    throw new Error(`readiness 必须是: 可切换 / 观察中 / 阻塞（当前: ${options.readiness}）`);
  }

  const month = options.date.slice(0, 7);
  const relativePath = path.join("docs", `BURNIN_EXECUTION_LOG_${month}.zh-CN.md`);
  const filePath = path.resolve(projectRoot, relativePath);

  let content = "";
  if (await fileExists(filePath)) {
    content = await readFile(filePath, "utf8");
  } else {
    content = buildMonthlyFileTemplate(month);
  }

  const lines = String(content || "").split(/\r?\n/);
  const section = findSectionRange(lines, DAILY_SECTION_HEADING);
  const dataStart = ensureDailySectionTable(lines, section.start, section.end);
  const row = buildDailyRow(options);

  const position = resolveInsertOrUpdateIndex(lines, dataStart, section.end, options.date);
  if (position.update) {
    lines[position.index] = row;
  } else {
    lines.splice(position.index, 0, row);
  }

  const output = `${lines.join("\n").replace(/\s+$/u, "")}\n`;
  if (options.dryRun) {
    console.log(`[burnin-log-daily] dry-run: ${relativePath}`);
    console.log(row);
    console.log(`[burnin-log-daily] action: ${position.update ? "update" : "insert"}`);
    return;
  }

  await writeFile(filePath, output, "utf8");
  console.log(`[burnin-log-daily] wrote ${relativePath}`);
  console.log(`[burnin-log-daily] action: ${position.update ? "update" : "insert"}`);
  console.log(`[burnin-log-daily] row: ${row}`);
}

main().catch((error) => {
  console.error(
    "[burnin-log-daily] failed",
    error && error.message ? error.message : String(error)
  );
  process.exitCode = 1;
});
