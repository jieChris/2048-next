function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function getElementById(documentLike: unknown, id: string): unknown {
  const getter = asFunction<(value: string) => unknown>(toRecord(documentLike).getElementById);
  if (!getter) return null;
  return (getter as unknown as Function).call(documentLike, id);
}

function querySelector(node: unknown, selector: string): unknown {
  const query = asFunction<(value: string) => unknown>(toRecord(node).querySelector);
  if (!query) return null;
  return (query as unknown as Function).call(node, selector);
}

function appendChild(node: unknown, child: unknown): void {
  const append = asFunction<(value: unknown) => unknown>(toRecord(node).appendChild);
  if (!append) return;
  (append as unknown as Function).call(node, child);
}

function insertBefore(node: unknown, child: unknown, anchor: unknown): void {
  const insert = asFunction<(value: unknown, before: unknown) => unknown>(toRecord(node).insertBefore);
  if (!insert) return;
  (insert as unknown as Function).call(node, child, anchor);
}

function removeChild(node: unknown, child: unknown): boolean {
  const remove = asFunction<(value: unknown) => unknown>(toRecord(node).removeChild);
  if (!remove) return false;
  (remove as unknown as Function).call(node, child);
  return true;
}

function createElement(documentLike: unknown, tag: string): unknown {
  const creator = asFunction<(value: string) => unknown>(toRecord(documentLike).createElement);
  if (!creator) return null;
  return (creator as unknown as Function).call(documentLike, tag);
}

export interface LegacyUndoSettingsCleanupResult {
  hadToggle: boolean;
  didRemoveRow: boolean;
  didHideToggle: boolean;
}

export function applyLegacyUndoSettingsCleanup(input: {
  documentLike?: unknown;
}): LegacyUndoSettingsCleanupResult {
  const source = toRecord(input);
  const toggle = getElementById(source.documentLike, "undo-enabled-toggle");
  if (!toggle) {
    return {
      hadToggle: false,
      didRemoveRow: false,
      didHideToggle: false
    };
  }

  const closest = asFunction<(selector: string) => unknown>(toRecord(toggle).closest);
  const row = closest ? (closest as unknown as Function).call(toggle, ".settings-row") : null;
  const parentNode = toRecord(row).parentNode;
  const didRemoveRow = !!(row && parentNode && removeChild(parentNode, row));
  if (!didRemoveRow) {
    const style = toRecord(toRecord(toggle).style);
    style.display = "none";
    toRecord(toggle).style = style;
  }

  return {
    hadToggle: true,
    didRemoveRow,
    didHideToggle: !didRemoveRow
  };
}

export interface TimerModuleSettingsToggleResult {
  hasToggle: boolean;
  didCreateRow: boolean;
}

export function ensureTimerModuleSettingsToggle(input: {
  documentLike?: unknown;
  timerModuleRuntime?: unknown;
}): unknown {
  const source = toRecord(input);
  const documentLike = source.documentLike;
  const existingToggle = getElementById(documentLike, "timer-module-view-toggle");
  if (existingToggle) return existingToggle;

  const modal = getElementById(documentLike, "settings-modal");
  if (!modal) return null;
  const content = querySelector(modal, ".settings-modal-content");
  if (!content) return null;

  const row = createElement(documentLike, "div");
  if (!row) return null;
  const rowRecord = toRecord(row);
  rowRecord.className = "settings-row";

  const timerModuleRuntime = toRecord(source.timerModuleRuntime);
  const buildSettingsRow = asFunction<() => unknown>(
    timerModuleRuntime.buildTimerModuleSettingsRowInnerHtml
  );
  rowRecord.innerHTML = buildSettingsRow ? String(buildSettingsRow()) : "";

  const actions = querySelector(content, ".replay-modal-actions");
  if (actions && toRecord(actions).parentNode === content) {
    insertBefore(content, row, actions);
  } else {
    appendChild(content, row);
  }

  return getElementById(documentLike, "timer-module-view-toggle");
}
