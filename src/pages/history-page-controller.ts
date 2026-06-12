import { resolveStorageByName } from "../bootstrap/storage";
import {
  HISTORY_FILTER_STORAGE_KEY,
  readHistoryFilterState,
  persistHistoryFilterState,
  type HistoryFilterState,
  type HistoryFilterStateDefaults
} from "../features/history/history-filter-state";
import {
  normalizeHistoryRecordForView,
  resolveModeLabel,
  resolveReplayCode,
  type HistoryModeCatalog,
  type HistoryRecordViewModel
} from "../features/history/history-record-normalize";
import { createHistoryBoardPreviewNode } from "../features/history/history-board-preview";

export interface HistoryPageControllerDeps {
  windowLike?: Window | null | undefined;
  documentLike?: Document | null | undefined;
  modeCatalog?: HistoryModeCatalog | null | undefined;
}

export interface HistoryPageController {
  storageKey: string;
  readFilterState: (defaults: HistoryFilterStateDefaults) => HistoryFilterState;
  persistFilterState: (state: HistoryFilterState, defaults: HistoryFilterStateDefaults) => void;
  normalizeRecord: (record: unknown) => HistoryRecordViewModel;
  resolveModeLabel: (modeKey: string, fallback: string, lang?: string) => string;
  listModes: () => ReturnType<NonNullable<HistoryModeCatalog["listModes"]>>;
  resolveReplayCode: (value: unknown) => string;
  createBoardPreview: (board: unknown) => HTMLElement | null;
}

export function createHistoryPageController(options?: HistoryPageControllerDeps): HistoryPageController {
  const windowLike = options?.windowLike || (typeof window !== "undefined" ? window : null);
  const documentLike = options?.documentLike || (typeof document !== "undefined" ? document : null);
  const storageLike = resolveStorageByName({
    windowLike: windowLike ? (windowLike as unknown as Record<string, unknown>) : undefined,
    storageName: "localStorage"
  });
  const runtime = windowLike ? (windowLike as any).CoreGameSettingsStorageRuntime : null;
  const modeCatalog = options?.modeCatalog || (windowLike ? (windowLike as any).ModeCatalog : null);

  return {
    storageKey: HISTORY_FILTER_STORAGE_KEY,
    readFilterState: (defaults: HistoryFilterStateDefaults) =>
      readHistoryFilterState({
        storageLike,
        defaults
      }),
    persistFilterState: (state: HistoryFilterState, defaults: HistoryFilterStateDefaults) =>
      persistHistoryFilterState({
        storageLike,
        state,
        defaults
      }),
    normalizeRecord: (record: unknown) =>
      normalizeHistoryRecordForView(record, {
        runtime
      }),
    resolveModeLabel: (modeKey: string, fallback: string, lang?: string) =>
      resolveModeLabel(modeKey, fallback, {
        modeCatalog,
        lang
      }),
    listModes: () => {
      if (!modeCatalog || typeof modeCatalog.listModes !== "function") return [];
      try {
        const modes = modeCatalog.listModes();
        return Array.isArray(modes) ? modes : [];
      } catch (_err) {
        return [];
      }
    },
    resolveReplayCode,
    createBoardPreview: (board: unknown) =>
      createHistoryBoardPreviewNode(board, {
        documentLike: documentLike || undefined
      })
  };
}
