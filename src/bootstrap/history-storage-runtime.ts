import {
  normalizeHistoryDiagnosticsIndexEntriesFromContext,
  normalizeHistoryRecordFromContext
} from "../core/game-settings-storage";
import type { HistoryNormalizeRuntime } from "../features/history/history-record-normalize";

export function createHistoryStorageRuntime(): HistoryNormalizeRuntime {
  return {
    normalizeHistoryRecordFromContext,
    normalizeHistoryDiagnosticsIndexEntriesFromContext
  };
}
