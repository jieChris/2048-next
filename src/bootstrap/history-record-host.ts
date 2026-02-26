function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface HistoryRecordHostActionState {
  shouldSetStatus: boolean;
  statusText: string;
  isError: boolean;
  shouldReload: boolean;
}

function createNoopActionState(): HistoryRecordHostActionState {
  return {
    shouldSetStatus: false,
    statusText: "",
    isError: false,
    shouldReload: false
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function toText(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export function resolveHistoryRecordReplayHref(input: {
  historyRecordActionsRuntime?: unknown;
  itemId?: unknown;
}): string {
  const source = isRecord(input) ? input : {};
  const runtime = toRecord(source.historyRecordActionsRuntime);
  const resolveReplayHref = asFunction<(recordId: unknown) => unknown>(
    runtime.resolveHistoryReplayHref
  );
  if (!resolveReplayHref) return "";
  return toText(resolveReplayHref(source.itemId), "");
}

export function applyHistoryRecordExportAction(input: {
  localHistoryStore?: unknown;
  item?: unknown;
  historyExportRuntime?: unknown;
}): boolean {
  const source = isRecord(input) ? input : {};
  if (!source.localHistoryStore) return false;

  const runtime = toRecord(source.historyExportRuntime);
  const downloadHistorySingleRecord = asFunction<(payload: unknown) => unknown>(
    runtime.downloadHistorySingleRecord
  );
  if (!downloadHistorySingleRecord) return false;
  return downloadHistorySingleRecord({
    localHistoryStore: source.localHistoryStore,
    item: source.item
  }) === true;
}

export function applyHistoryRecordDeleteAction(input: {
  historyRecordActionsRuntime?: unknown;
  localHistoryStore?: unknown;
  itemId?: unknown;
  confirmAction?: unknown;
}): HistoryRecordHostActionState {
  const source = isRecord(input) ? input : {};
  if (!source.localHistoryStore) return createNoopActionState();

  const runtime = toRecord(source.historyRecordActionsRuntime);
  const resolveHistoryDeleteActionState = asFunction<(recordId: unknown) => unknown>(
    runtime.resolveHistoryDeleteActionState
  );
  const executeHistoryDeleteRecord = asFunction<(payload: unknown) => unknown>(
    runtime.executeHistoryDeleteRecord
  );
  const resolveHistoryDeleteFailureNotice = asFunction<() => unknown>(
    runtime.resolveHistoryDeleteFailureNotice
  );
  const resolveHistoryDeleteSuccessNotice = asFunction<() => unknown>(
    runtime.resolveHistoryDeleteSuccessNotice
  );
  const confirmAction = asFunction<(message: unknown) => unknown>(source.confirmAction);
  if (!resolveHistoryDeleteActionState || !executeHistoryDeleteRecord) {
    return createNoopActionState();
  }

  const actionState = toRecord(resolveHistoryDeleteActionState(source.itemId));
  const confirmMessage = actionState.confirmMessage;
  if (confirmAction && confirmAction(confirmMessage) !== true) return createNoopActionState();
  if (!confirmAction) return createNoopActionState();

  const deleteState = toRecord(
    executeHistoryDeleteRecord({
      localHistoryStore: source.localHistoryStore,
      recordId: actionState.recordId
    })
  );
  if (deleteState.deleted === true) {
    return {
      shouldSetStatus: true,
      statusText: toText(
        deleteState.notice,
        toText(resolveHistoryDeleteSuccessNotice ? resolveHistoryDeleteSuccessNotice() : "", "")
      ),
      isError: false,
      shouldReload: true
    };
  }

  return {
    shouldSetStatus: true,
    statusText: toText(
      deleteState.notice,
      toText(resolveHistoryDeleteFailureNotice ? resolveHistoryDeleteFailureNotice() : "", "")
    ),
    isError: true,
    shouldReload: false
  };
}
