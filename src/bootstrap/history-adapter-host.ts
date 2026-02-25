function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export interface HistoryAdapterRecordRenderState {
  adapterBadgeHtml: string;
  adapterDiagnosticsHtml: string;
}

export function resolveHistoryAdapterRecordRenderState(input: {
  localHistoryStore?: unknown;
  item?: unknown;
  historyAdapterDiagnosticsRuntime?: unknown;
}): HistoryAdapterRecordRenderState {
  const source = isRecord(input) ? input : {};
  const runtime = toRecord(source.historyAdapterDiagnosticsRuntime);
  const resolveHistoryAdapterParityStatus = asFunction<
    (localHistoryStore: unknown, item: unknown) => unknown
  >(runtime.resolveHistoryAdapterParityStatus);
  const resolveHistoryAdapterBadgeState = asFunction<
    (item: unknown, parityStatus: unknown) => unknown
  >(runtime.resolveHistoryAdapterBadgeState);
  const resolveHistoryAdapterDiagnosticsState = asFunction<(item: unknown) => unknown>(
    runtime.resolveHistoryAdapterDiagnosticsState
  );
  const resolveHistoryAdapterBadgeHtml = asFunction<(state: unknown) => unknown>(
    runtime.resolveHistoryAdapterBadgeHtml
  );
  const resolveHistoryAdapterDiagnosticsHtml = asFunction<(state: unknown) => unknown>(
    runtime.resolveHistoryAdapterDiagnosticsHtml
  );
  if (
    !resolveHistoryAdapterParityStatus ||
    !resolveHistoryAdapterBadgeState ||
    !resolveHistoryAdapterDiagnosticsState ||
    !resolveHistoryAdapterBadgeHtml ||
    !resolveHistoryAdapterDiagnosticsHtml
  ) {
    return {
      adapterBadgeHtml: "",
      adapterDiagnosticsHtml: ""
    };
  }

  const parityStatus = resolveHistoryAdapterParityStatus(source.localHistoryStore, source.item);
  const badgeState = resolveHistoryAdapterBadgeState(source.item, parityStatus);
  const diagnosticsState = resolveHistoryAdapterDiagnosticsState(source.item);
  return {
    adapterBadgeHtml: toText(resolveHistoryAdapterBadgeHtml(badgeState)),
    adapterDiagnosticsHtml: toText(resolveHistoryAdapterDiagnosticsHtml(diagnosticsState))
  };
}
