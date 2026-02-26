function toRecordId(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function resolveHistoryReplayHref(recordId: unknown): string {
  return "replay.html?local_history_id=" + encodeURIComponent(toRecordId(recordId));
}

export function resolveHistoryDeleteActionState(recordId: unknown): {
  recordId: string;
  confirmMessage: string;
} {
  return {
    recordId: toRecordId(recordId),
    confirmMessage: "确认删除这条历史记录？此操作不可撤销。"
  };
}

export function resolveHistoryDeleteFailureNotice(): string {
  return "删除失败：记录不存在或已被删除";
}

export function resolveHistoryDeleteSuccessNotice(): string {
  return "记录已删除";
}

export function executeHistoryDeleteRecord(input: {
  localHistoryStore?: unknown;
  recordId?: unknown;
}): {
  deleted: boolean;
  notice: string;
} {
  try {
    const source =
      input && typeof input === "object" ? (input as { localHistoryStore?: unknown; recordId?: unknown }) : {};
    const store =
      source.localHistoryStore && typeof source.localHistoryStore === "object"
        ? (source.localHistoryStore as { deleteById?: unknown })
        : null;
    if (!store || typeof store.deleteById !== "function") {
      return {
        deleted: false,
        notice: resolveHistoryDeleteFailureNotice()
      };
    }
    const actionState = resolveHistoryDeleteActionState(source.recordId);
    if (!actionState.recordId) {
      return {
        deleted: false,
        notice: resolveHistoryDeleteFailureNotice()
      };
    }
    const ok = (store.deleteById as (recordId: string) => unknown).call(store, actionState.recordId);
    if (ok) {
      return {
        deleted: true,
        notice: resolveHistoryDeleteSuccessNotice()
      };
    }
    return {
      deleted: false,
      notice: resolveHistoryDeleteFailureNotice()
    };
  } catch (_error) {
    return {
      deleted: false,
      notice: resolveHistoryDeleteFailureNotice()
    };
  }
}
