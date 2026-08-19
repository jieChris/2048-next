import {
  calculateHistoryBoardSum,
  normalizeHistoryDiagnosticsIndexEntriesLike,
  type HistoryDiagnosticsIndexEntry
} from "../../contracts";

export type { HistoryDiagnosticsIndexEntry } from "../../contracts";

export interface HistoryRecordViewModel {
  id: string;
  mode: string;
  mode_key: string;
  score: number;
  board_sum: number;
  best_tile: number;
  duration_ms: number;
  ended_at: string;
  replay_string: string;
  final_board: unknown;
  owner_type: string;
  owner_user_id: string;
  owner_nickname: string;
  owner_key: string;
  client_record_id: string;
  server_record_id: string;
  sync_status: string;
  upload_attempts: number;
  next_retry_at: string;
  last_upload_attempt_at: string;
  last_error_code: string;
  last_error_message: string;
  diagnostics_index_entries: HistoryDiagnosticsIndexEntry[];
}

export interface HistoryNormalizeRuntime {
  normalizeHistoryRecordFromContext?: (payload: {
    record: Record<string, unknown>;
    nowIso: () => string;
    idFactory: () => string;
  }) => unknown;
  normalizeHistoryDiagnosticsIndexEntriesFromContext?: (payload: {
    entries: unknown;
    maxEntries: number;
    maxPayloadKeys: number;
    maxStringLength: number;
    maxArrayItems: number;
    keyMaxLength: number;
  }) => unknown;
}

export interface HistoryModeCatalog {
  getMode?: (modeKey: string) => {
    label?: string;
    board_width?: unknown;
    board_height?: unknown;
    undo_enabled?: unknown;
  } | null | undefined;
  listModes?: () => Array<{
    key?: unknown;
    label?: unknown;
    board_width?: unknown;
    board_height?: unknown;
    undo_enabled?: unknown;
  } | null | undefined>;
}

export interface HistoryNormalizeOptions {
  runtime?: HistoryNormalizeRuntime | null | undefined;
  modeCatalog?: HistoryModeCatalog | null | undefined;
  lang?: string | null | undefined;
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

export function resolveReplayCode(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeModeLabelLang(value: unknown): "en" | "zh" | "" {
  const lang = toText(value).trim().toLowerCase();
  if (lang.indexOf("en") === 0) return "en";
  if (lang.indexOf("zh") === 0) return "zh";
  return "";
}

function hasCjkText(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

function resolveSizeTextFromMode(mode: unknown): string {
  const source = mode && typeof mode === "object" ? (mode as Record<string, unknown>) : {};
  const width = Number(source.board_width);
  const height = Number(source.board_height);
  if (!Number.isFinite(width) || width <= 0) return "";
  const normalizedWidth = Math.floor(width);
  const normalizedHeight = Number.isFinite(height) && height > 0 ? Math.floor(height) : normalizedWidth;
  return String(normalizedWidth) + "x" + String(normalizedHeight);
}

function resolveSizeTextFromText(value: string): string {
  const match = toText(value).match(/(\d{1,2})x(\d{1,2})/i);
  if (!match) return "";
  return String(Number(match[1])) + "x" + String(Number(match[2]));
}

function resolveHistoryModeSizeText(modeKey: string, fallback: string, mode: unknown): string {
  return (
    resolveSizeTextFromMode(mode) ||
    resolveSizeTextFromText(fallback) ||
    resolveSizeTextFromText(modeKey) ||
    "4x4"
  );
}

function resolveKnownEnglishModeLabel(modeKey: string, fallback: string, mode: unknown): string {
  const key = toText(modeKey).trim().toLowerCase();
  const sizeText = resolveHistoryModeSizeText(key, fallback, mode);

  if (key === "standard_4x4_pow2_no_undo") return "Standard 4x4 (No Undo)";
  if (key === "classic_4x4_pow2_undo") return "Classic 4x4 (Undo)";
  if (key === "capped_4x4_pow2_no_undo") return "Capped 4x4 (2048, No Undo)";
  if (key === "capped_4x4_pow2_64_no_undo") return "Capped 4x4 (64, No Undo)";
  if (key === "capped_4x4_pow2_1024_no_undo") return "Capped 4x4 (1024, No Undo)";
  if (key === "capped_4x4_pow2_4096_no_undo") return "Capped 4x4 (4096, No Undo)";
  if (key.indexOf("board_") === 0 && key.indexOf("_pow2") !== -1) return sizeText;
  if (key.indexOf("fib_") === 0) return "Fibonacci " + sizeText;
  if (key.indexOf("spawn_custom_") === 0) return sizeText + " Custom 4-Rate";
  if (key === "spawn50_3x3_pow2_no_undo") return "3x3 Spawn 50/50 (No Undo)";
  if (key.indexOf("nox_") === 0) return "NO X " + sizeText + " (No Undo)";
  if (key.indexOf("limit3_") === 0) return "Limited Undo " + sizeText + " (3)";
  if (key.indexOf("limit5_") === 0) return "Limited Undo " + sizeText + " (5)";
  if (key.indexOf("combo_") === 0) return "Combo Scoring " + sizeText;
  if (key.indexOf("dirlock") === 0) return "Direction Lock " + sizeText;
  if (key.indexOf("obstacle_") === 0) return "Obstacle " + sizeText + " (No Undo)";
  if (key.indexOf("diag_") === 0) return "Diagonal " + sizeText;
  if (key.indexOf("item_") === 0) return "Item Mode " + sizeText;
  if (key.indexOf("stone_") === 0) return "Stone Mode " + sizeText;
  if (key.indexOf("timed5s_") === 0) return "Timed 5s " + sizeText;
  if (key === "practice") return "Practice Board (Direct)";

  return "";
}

function translateLegacyChineseModeLabel(fallback: string, modeKey: string): string {
  const text = toText(fallback);
  if (!text || !hasCjkText(text)) return "";
  const sizeText = resolveHistoryModeSizeText(modeKey, text, null);
  if (text.indexOf("\u6807\u51c6") !== -1) return "Standard " + sizeText + " (No Undo)";
  if (text.indexOf("\u7ecf\u5178") !== -1) return "Classic " + sizeText + " (Undo)";
  if (text.indexOf("\u5c01\u9876") !== -1) {
    const capMatch = text.match(/(64|1024|2048|4096)/);
    return "Capped " + sizeText + " (" + (capMatch ? capMatch[1] : "2048") + ", No Undo)";
  }
  if (text.indexOf("\u6590\u6ce2\u90a3\u5951") !== -1) return "Fibonacci " + sizeText;
  if (text.indexOf("\u81ea\u5b9a\u4e494\u7387") !== -1) return sizeText + " Custom 4-Rate";
  if (text.indexOf("\u9650\u6b21\u64a4\u56de") !== -1) {
    const count = text.indexOf("5") !== -1 ? "5" : "3";
    return "Limited Undo " + sizeText + " (" + count + ")";
  }
  if (text.indexOf("\u8fde\u51fb") !== -1) return "Combo Scoring " + sizeText;
  if (text.indexOf("\u65b9\u5411\u9501") !== -1) return "Direction Lock " + sizeText;
  if (text.indexOf("\u969c\u788d") !== -1) return "Obstacle " + sizeText + " (No Undo)";
  if (text.indexOf("\u659c\u5411") !== -1) return "Diagonal " + sizeText;
  if (text.indexOf("\u9053\u5177") !== -1) return "Item Mode " + sizeText;
  if (text.indexOf("\u77f3\u5934") !== -1) return "Stone Mode " + sizeText;
  if (text.indexOf("\u9650\u65f6") !== -1) return "Timed 5s " + sizeText;
  if (text.indexOf("\u7ec3\u4e60") !== -1) return "Practice Board (Direct)";
  return "";
}

function resolveKnownChineseHistoryModeLabel(modeKey: string): string {
  const key = toText(modeKey).trim().toLowerCase();
  if (key === "standard_4x4_pow2_no_undo" || key === "classic_no_undo") return "经典4x4";
  if (key === "classic_4x4_pow2_undo") return "4x4可撤回";
  return "";
}

export function resolveModeLabel(
  modeKey: string,
  fallback: string,
  options?: HistoryNormalizeOptions
): string {
  const catalog = options?.modeCatalog || null;
  const lang = normalizeModeLabelLang(options?.lang);
  if (lang !== "en") {
    const knownChineseLabel = resolveKnownChineseHistoryModeLabel(modeKey);
    if (knownChineseLabel) return knownChineseLabel;
  }
  if (catalog && typeof catalog.getMode === "function") {
    try {
      const mode = catalog.getMode(modeKey);
      if (mode && typeof mode.label === "string" && mode.label) {
        if (lang === "en" && hasCjkText(mode.label)) {
          const knownLabel = resolveKnownEnglishModeLabel(modeKey, fallback, mode);
          if (knownLabel) return knownLabel;
          const legacyLabel = translateLegacyChineseModeLabel(mode.label, modeKey);
          if (legacyLabel) return legacyLabel;
        }
        return mode.label;
      }
    } catch (_err) {}
  }
  if (lang === "en") {
    const knownLabel = resolveKnownEnglishModeLabel(modeKey, fallback, null);
    if (knownLabel) return knownLabel;
    const legacyLabel = translateLegacyChineseModeLabel(fallback, modeKey);
    if (legacyLabel) return legacyLabel;
  }
  return fallback || modeKey || "\u672a\u77e5";
}

function normalizeHistoryRecordViaRuntime(
  raw: unknown,
  runtime: HistoryNormalizeRuntime | null | undefined
): Record<string, unknown> | null {
  if (!runtime || typeof runtime.normalizeHistoryRecordFromContext !== "function") return null;
  try {
    return runtime.normalizeHistoryRecordFromContext({
      record: raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {},
      nowIso: function () { return ""; },
      idFactory: function () { return ""; }
    }) as Record<string, unknown>;
  } catch (_err) {
    return null;
  }
}

export function normalizeHistoryDiagnosticsIndexEntry(
  rawEntry: unknown
): HistoryDiagnosticsIndexEntry | null {
  const entries = normalizeHistoryDiagnosticsIndexEntriesLike([rawEntry], {
    maxEntries: 1,
    maxPayloadKeys: 24,
    maxStringLength: 160,
    maxArrayItems: 8,
    keyMaxLength: 64
  });
  return entries.length > 0 ? entries[0] : null;
}

export function normalizeHistoryDiagnosticsIndexEntries(
  rawEntries: unknown,
  runtime?: HistoryNormalizeRuntime | null | undefined
): HistoryDiagnosticsIndexEntry[] {
  if (runtime && typeof runtime.normalizeHistoryDiagnosticsIndexEntriesFromContext === "function") {
    try {
      const normalizedByRuntime = runtime.normalizeHistoryDiagnosticsIndexEntriesFromContext({
        entries: rawEntries,
        maxEntries: 6,
        maxPayloadKeys: 24,
        maxStringLength: 160,
        maxArrayItems: 8,
        keyMaxLength: 64
      });
      if (Array.isArray(normalizedByRuntime)) return normalizedByRuntime as HistoryDiagnosticsIndexEntry[];
    } catch (_err) {
      // fall through to local normalization
    }
  }
  return normalizeHistoryDiagnosticsIndexEntriesLike(rawEntries, {
    maxEntries: 6,
    maxPayloadKeys: 24,
    maxStringLength: 160,
    maxArrayItems: 8,
    keyMaxLength: 64
  });
}

export function normalizeHistoryRecordForView(
  raw: unknown,
  options?: HistoryNormalizeOptions
): HistoryRecordViewModel {
  const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const runtime = options?.runtime || null;
  const normalized = normalizeHistoryRecordViaRuntime(item, runtime);
  const base = normalized && typeof normalized === "object" ? normalized : item;
  const diagnosticsSource =
    base && (base as Record<string, unknown>).diagnostics_index_entries != null
      ? (base as Record<string, unknown>).diagnostics_index_entries
      : item.diagnostics_index_entries;
  const diagnosticsEntries = normalizeHistoryDiagnosticsIndexEntries(diagnosticsSource, runtime);
  let replayString = toText((base as Record<string, unknown>).replay_string || item.replay_string).trim();
  if (!replayString && base && (base as Record<string, unknown>).replay != null) {
    try {
      replayString = JSON.stringify((base as Record<string, unknown>).replay);
    } catch (_err) {
      replayString = "";
    }
  }
  const finalBoard =
    (base as Record<string, unknown>).final_board != null
      ? (base as Record<string, unknown>).final_board
      : item.final_board;
  const hasBoardCells =
    Array.isArray(finalBoard) && finalBoard.some((row) => Array.isArray(row) && row.length > 0);
  const boardSumSource =
    (base as Record<string, unknown>).board_sum != null
      ? (base as Record<string, unknown>).board_sum
      : item.board_sum;
  return {
    id: toText((base as Record<string, unknown>).id || item.id).trim(),
    mode: toText((base as Record<string, unknown>).mode || item.mode).trim(),
    mode_key: toText((base as Record<string, unknown>).mode_key || item.mode_key).trim(),
    score: Math.floor(Number((base as Record<string, unknown>).score != null ? (base as Record<string, unknown>).score : item.score) || 0),
    board_sum: hasBoardCells
      ? calculateHistoryBoardSum(finalBoard)
      : Math.max(0, Math.floor(Number(boardSumSource) || 0)),
    best_tile: Math.floor(Number((base as Record<string, unknown>).best_tile != null ? (base as Record<string, unknown>).best_tile : item.best_tile) || 0),
    duration_ms: Math.floor(Number((base as Record<string, unknown>).duration_ms != null ? (base as Record<string, unknown>).duration_ms : item.duration_ms) || 0),
    ended_at: toText((base as Record<string, unknown>).ended_at || item.ended_at).trim(),
    replay_string: replayString,
    final_board: finalBoard,
    owner_type: toText((base as Record<string, unknown>).owner_type != null ? (base as Record<string, unknown>).owner_type : item.owner_type).trim().toLowerCase(),
    owner_user_id: toText((base as Record<string, unknown>).owner_user_id != null ? (base as Record<string, unknown>).owner_user_id : item.owner_user_id).trim(),
    owner_nickname: toText((base as Record<string, unknown>).owner_nickname != null ? (base as Record<string, unknown>).owner_nickname : item.owner_nickname).trim(),
    owner_key: toText((base as Record<string, unknown>).owner_key != null ? (base as Record<string, unknown>).owner_key : item.owner_key).trim(),
    client_record_id: toText((base as Record<string, unknown>).client_record_id != null ? (base as Record<string, unknown>).client_record_id : item.client_record_id).trim(),
    server_record_id: toText((base as Record<string, unknown>).server_record_id != null ? (base as Record<string, unknown>).server_record_id : item.server_record_id).trim(),
    sync_status: toText((base as Record<string, unknown>).sync_status != null ? (base as Record<string, unknown>).sync_status : item.sync_status).trim(),
    upload_attempts: Math.max(0, Math.floor(Number((base as Record<string, unknown>).upload_attempts != null ? (base as Record<string, unknown>).upload_attempts : item.upload_attempts) || 0)),
    next_retry_at: toText((base as Record<string, unknown>).next_retry_at != null ? (base as Record<string, unknown>).next_retry_at : item.next_retry_at).trim(),
    last_upload_attempt_at: toText((base as Record<string, unknown>).last_upload_attempt_at != null ? (base as Record<string, unknown>).last_upload_attempt_at : item.last_upload_attempt_at).trim(),
    last_error_code: toText((base as Record<string, unknown>).last_error_code != null ? (base as Record<string, unknown>).last_error_code : item.last_error_code).trim(),
    last_error_message: toText((base as Record<string, unknown>).last_error_message != null ? (base as Record<string, unknown>).last_error_message : item.last_error_message).trim(),
    diagnostics_index_entries: diagnosticsEntries
  };
}
