import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function printHelp() {
  console.log(
    [
      "用法:",
      "  node scripts/burnin-seed-json.mjs --count=120 --mismatch-rate=3 --output=artifacts/burnin-seed.json",
      "",
      "参数:",
      "  --count=120                   生成记录数（默认 120）",
      "  --mismatch-rate=3             不一致率百分比（默认 3，范围 0~100）",
      "  --mode-keys=a,b               mode_key 列表，循环分配（默认 standard_4x4_pow2_no_undo）",
      "  --output=artifacts/xxx.json   输出文件路径（默认 artifacts/burnin-seed.json）",
      "  --start-at=2026-03-04T00:00:00Z  最新记录时间点（默认当前时间）",
      "  --interval-ms=15000           相邻记录时间差（默认 15000）",
      "  --session-prefix=pair         sessionId 前缀（默认 pair）",
      "  --dry-run                     只预览摘要，不写文件",
      "  --help                        显示帮助",
      "",
      "说明:",
      "  - 输出内容可直接在 history.html 通过“导入合并”导入。",
      "  - 这是联调样本生成工具，不应用作正式发布证据。"
    ].join("\n")
  );
}

function parsePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function parseNonNegativeNumber(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const opts = {
    count: 120,
    mismatchRate: 3,
    modeKeys: ["standard_4x4_pow2_no_undo"],
    output: "artifacts/burnin-seed.json",
    startAt: new Date().toISOString(),
    intervalMs: 15000,
    sessionPrefix: "pair",
    dryRun: false,
    help: false
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
      continue;
    }
    if (arg === "--dry-run") {
      opts.dryRun = true;
      continue;
    }
    if (arg.startsWith("--count=")) {
      opts.count = parsePositiveInt(arg.slice("--count=".length), opts.count);
      continue;
    }
    if (arg.startsWith("--mismatch-rate=")) {
      opts.mismatchRate = parseNonNegativeNumber(arg.slice("--mismatch-rate=".length), opts.mismatchRate);
      continue;
    }
    if (arg.startsWith("--mode-keys=")) {
      const raw = arg.slice("--mode-keys=".length);
      const list = raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (list.length > 0) opts.modeKeys = list;
      continue;
    }
    if (arg.startsWith("--output=")) {
      const raw = arg.slice("--output=".length).trim();
      if (raw) opts.output = raw;
      continue;
    }
    if (arg.startsWith("--start-at=")) {
      const raw = arg.slice("--start-at=".length).trim();
      if (raw) opts.startAt = raw;
      continue;
    }
    if (arg.startsWith("--interval-ms=")) {
      opts.intervalMs = parsePositiveInt(arg.slice("--interval-ms=".length), opts.intervalMs);
      continue;
    }
    if (arg.startsWith("--session-prefix=")) {
      const raw = arg.slice("--session-prefix=".length).trim();
      if (raw) opts.sessionPrefix = raw;
      continue;
    }
    throw new Error(`不支持的参数: ${arg}`);
  }

  if (opts.mismatchRate > 100) opts.mismatchRate = 100;
  return opts;
}

function resolveStartTimestamp(startAtIso) {
  const ms = Date.parse(startAtIso);
  if (!Number.isFinite(ms)) {
    throw new Error(`start-at 不是合法时间: ${startAtIso}`);
  }
  return ms;
}

function toModeLegacyName(modeKey) {
  if (modeKey === "standard_4x4_pow2_no_undo") return "local";
  return "local";
}

function resolveModeProfile(modeKey) {
  if (String(modeKey || "").startsWith("practice")) {
    return {
      mode: toModeLegacyName(modeKey),
      mode_key: modeKey,
      board_width: 4,
      board_height: 4,
      ruleset: "pow2",
      undo_enabled: true,
      ranked_bucket: "none",
      mode_family: "pow2",
      rank_policy: "unranked"
    };
  }

  return {
    mode: toModeLegacyName(modeKey),
    mode_key: modeKey,
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: false,
    ranked_bucket: "none",
    mode_family: "pow2",
    rank_policy: "ranked"
  };
}

function createFinalBoard(index, mismatch) {
  const v = mismatch ? 128 : 64;
  const base = 2 + (index % 4) * 2;
  return [
    [2, base, 8, 16],
    [v, 32, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
}

function createRecord(input) {
  const {
    index,
    modeKey,
    mismatch,
    endedAtIso,
    savedAtIso,
    sessionPrefix
  } = input;
  const profile = resolveModeProfile(modeKey);
  const sessionId = `${sessionPrefix}_${String(index + 1).padStart(4, "0")}`;
  const scoreBase = 1024 + index * 8;
  const scoreDelta = mismatch ? 4 : 0;

  const diff = {
    schemaVersion: 2,
    modeKey: modeKey,
    hasLegacyReport: true,
    hasCoreReport: true,
    legacySessionId: sessionId,
    coreSessionId: sessionId,
    isSessionMatch: true,
    comparable: true,
    comparedAt: Date.parse(savedAtIso),
    legacyScore: scoreBase - scoreDelta,
    coreScore: scoreBase,
    scoreDelta: scoreDelta,
    isScoreMatch: !mismatch,
    legacyUndoUsed: 0,
    coreUndoUsed: 0,
    undoUsedDelta: 0,
    legacyUndoEvents: 0,
    coreUndoEvents: 0,
    undoEventsDelta: 0,
    legacyWonEvents: 0,
    coreWonEvents: 0,
    wonEventsDelta: 0,
    legacyOverEvents: 0,
    coreOverEvents: 0,
    overEventsDelta: 0,
    bothScoreAligned: !mismatch
  };

  const report = {
    schemaVersion: 2,
    modeKey: modeKey,
    adapterMode: "core-adapter",
    sessionId: sessionId,
    hasParityState: true,
    hasSnapshot: true,
    counters: {
      totalEvents: 1,
      moveEvents: 1,
      undoEvents: 0,
      movedEvents: 1,
      overEvents: 0,
      wonEvents: 0
    },
    lastReason: "move",
    lastDirection: index % 4,
    lastEventAt: Date.parse(savedAtIso),
    lastScoreFromParity: scoreBase,
    lastScoreFromSnapshot: scoreBase,
    scoreDelta: 0,
    isScoreAligned: true,
    undoEvents: 0,
    undoUsedFromSnapshot: 0,
    wonEvents: 0,
    overEvents: 0,
    snapshotUpdatedAt: Date.parse(savedAtIso)
  };

  return {
    id: `seed_${sessionId}`,
    ...profile,
    special_rules_snapshot: {},
    challenge_id: null,
    score: scoreBase,
    best_tile: mismatch ? 128 : 64,
    duration_ms: 12000 + (index % 500),
    final_board: createFinalBoard(index, mismatch),
    ended_at: endedAtIso,
    saved_at: savedAtIso,
    end_reason: "game_over",
    client_version: "1.8",
    replay: null,
    replay_string: "",
    adapter_parity_report_v2: report,
    adapter_parity_ab_diff_v2: diff,
    adapter_parity_report_v1: report,
    adapter_parity_ab_diff_v1: diff
  };
}

function buildRecords(opts) {
  const startMs = resolveStartTimestamp(opts.startAt);
  const mismatchCount = Math.round((opts.count * opts.mismatchRate) / 100);
  const mismatchIndexSet = new Set();
  if (mismatchCount > 0) {
    const step = opts.count / mismatchCount;
    for (let i = 0; i < mismatchCount; i++) {
      const pos = Math.min(opts.count - 1, Math.floor(i * step));
      mismatchIndexSet.add(pos);
    }
  }

  const records = [];
  const modeStat = Object.create(null);
  let mismatchTotal = 0;

  for (let i = 0; i < opts.count; i++) {
    const modeKey = opts.modeKeys[i % opts.modeKeys.length];
    const mismatch = mismatchIndexSet.has(i);
    if (mismatch) mismatchTotal += 1;
    modeStat[modeKey] = (modeStat[modeKey] || 0) + 1;

    const endedAt = new Date(startMs - i * opts.intervalMs);
    const savedAt = new Date(startMs - i * opts.intervalMs + 1500);
    records.push(
      createRecord({
        index: i,
        modeKey,
        mismatch,
        endedAtIso: endedAt.toISOString(),
        savedAtIso: savedAt.toISOString(),
        sessionPrefix: opts.sessionPrefix
      })
    );
  }

  return {
    records,
    stats: {
      total: records.length,
      mismatch: mismatchTotal,
      mismatchRate: records.length > 0 ? (mismatchTotal * 100) / records.length : 0,
      modeStat
    }
  };
}

async function writeOutput(outputPath, payload) {
  const absPath = path.resolve(projectRoot, outputPath);
  const dir = path.dirname(absPath);
  await mkdir(dir, { recursive: true });
  await writeFile(absPath, JSON.stringify(payload, null, 2), "utf8");
  return absPath;
}

function printStats(stats, outputPath, dryRun) {
  console.log(`[burnin-seed] total=${stats.total}`);
  console.log(`[burnin-seed] mismatch=${stats.mismatch} (${stats.mismatchRate.toFixed(2)}%)`);
  const modeKeys = Object.keys(stats.modeStat).sort();
  for (const modeKey of modeKeys) {
    console.log(`[burnin-seed] mode ${modeKey}: ${stats.modeStat[modeKey]}`);
  }
  if (dryRun) {
    console.log(`[burnin-seed] dry-run output=${outputPath}`);
  } else {
    console.log(`[burnin-seed] wrote ${outputPath}`);
    console.log("[burnin-seed] 接下来在 history.html 使用“导入合并”导入该 JSON。");
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const out = buildRecords(opts);
  const payload = {
    v: 1,
    exported_at: new Date().toISOString(),
    count: out.records.length,
    records: out.records
  };

  if (opts.dryRun) {
    printStats(out.stats, opts.output, true);
    return;
  }

  const absPath = await writeOutput(opts.output, payload);
  printStats(out.stats, path.relative(projectRoot, absPath), false);
}

main().catch((error) => {
  console.error(
    "[burnin-seed] failed",
    error && error.message ? error.message : String(error)
  );
  process.exitCode = 1;
});
