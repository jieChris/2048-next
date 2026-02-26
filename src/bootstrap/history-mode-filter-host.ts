function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

export interface HistoryModeFilterHostApplyResult {
  didRender: boolean;
  renderedOptionCount: number;
}

export function applyHistoryModeFilterOptionsRender(input: {
  selectElement?: unknown;
  modeCatalog?: unknown;
  historyModeFilterRuntime?: unknown;
  documentLike?: unknown;
}): HistoryModeFilterHostApplyResult {
  const source = toRecord(input);
  const selectElement = toRecord(source.selectElement);
  const appendChild = asFunction<(node: unknown) => unknown>(selectElement.appendChild);
  if (!appendChild) {
    return {
      didRender: false,
      renderedOptionCount: 0
    };
  }

  const modeCatalog = toRecord(source.modeCatalog);
  const listModes = asFunction<() => unknown>(modeCatalog.listModes);
  const modeFilterRuntime = toRecord(source.historyModeFilterRuntime);
  const resolveHistoryModeFilterOptions = asFunction<(modes: unknown) => unknown>(
    modeFilterRuntime.resolveHistoryModeFilterOptions
  );
  const documentLike = toRecord(source.documentLike);
  const createElement = asFunction<(tagName: string) => unknown>(documentLike.createElement);
  if (!listModes || !resolveHistoryModeFilterOptions || !createElement) {
    return {
      didRender: false,
      renderedOptionCount: 0
    };
  }

  const options = toArray(resolveHistoryModeFilterOptions(listModes()));
  let renderedOptionCount = 0;
  for (let i = 0; i < options.length; i += 1) {
    const item = toRecord(options[i]);
    const option = toRecord((createElement as unknown as Function).call(documentLike, "option"));
    option.value = toText(item.value);
    option.textContent = toText(item.label);
    (appendChild as unknown as Function).call(selectElement, option);
    renderedOptionCount += 1;
  }

  return {
    didRender: true,
    renderedOptionCount
  };
}
