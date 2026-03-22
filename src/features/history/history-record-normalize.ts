import {
  normalizeHistoryDiagnosticsIndexEntriesLike,
  type HistoryDiagnosticsIndexEntry
} from "../../contracts";

export type { HistoryDiagnosticsIndexEntry } from "../../contracts";

export interface HistoryRecordViewModel {
  id: string;
  mode: string;
  mode_key: string;
  score: number;
  best_tile: number;
  duration_ms: number;
  ended_at: string;
  replay_string: string;
  final_board: unknown;
  owner_type: string;
  owner_user_id: string;
  owner_nickname: string;
  owner_key: string;
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
  getMode?: (modeKey: string) => { label?: string } | null | undefined;
}

export interface HistoryNormalizeOptions {
  runtime?: HistoryNormalizeRuntime | null | undefined;
  modeCatalog?: HistoryModeCatalog | null | undefined;
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

export function resolveReplayCode(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function resolveModeLabel(
  modeKey: string,
  fallback: string,
  options?: HistoryNormalizeOptions
): string {
  const catalog = options?.modeCatalog || null;
  if (catalog && typeof catalog.getMode === "function") {
    const mode = catalog.getMode(modeKey);
    if (mode && typeof mode.label === "string" && mode.label) {
      return mode.label;
    }
  }
  return modeKey || fallback || "\u672a\u77e5";
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
  return {
    id: toText((base as Record<string, unknown>).id || item.id).trim(),
    mode: toText((base as Record<string, unknown>).mode || item.mode).trim(),
    mode_key: toText((base as Record<string, unknown>).mode_key || item.mode_key).trim(),
    score: Math.floor(Number((base as Record<string, unknown>).score != null ? (base as Record<string, unknown>).score : item.score) || 0),
    best_tile: Math.floor(Number((base as Record<string, unknown>).best_tile != null ? (base as Record<string, unknown>).best_tile : item.best_tile) || 0),
    duration_ms: Math.floor(Number((base as Record<string, unknown>).duration_ms != null ? (base as Record<string, unknown>).duration_ms : item.duration_ms) || 0),
    ended_at: toText((base as Record<string, unknown>).ended_at || item.ended_at).trim(),
    replay_string: replayString,
    final_board: (base as Record<string, unknown>).final_board != null ? (base as Record<string, unknown>).final_board : item.final_board,
    owner_type: toText((base as Record<string, unknown>).owner_type != null ? (base as Record<string, unknown>).owner_type : item.owner_type).trim().toLowerCase(),
    owner_user_id: toText((base as Record<string, unknown>).owner_user_id != null ? (base as Record<string, unknown>).owner_user_id : item.owner_user_id).trim(),
    owner_nickname: toText((base as Record<string, unknown>).owner_nickname != null ? (base as Record<string, unknown>).owner_nickname : item.owner_nickname).trim(),
    owner_key: toText((base as Record<string, unknown>).owner_key != null ? (base as Record<string, unknown>).owner_key : item.owner_key).trim(),
    diagnostics_index_entries: diagnosticsEntries
  };
}
