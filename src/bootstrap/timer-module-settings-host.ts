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

function bindListener(
  element: unknown,
  eventName: string,
  handler: (...args: never[]) => unknown
): boolean {
  const addEventListener = asFunction<(name: string, cb: (...args: never[]) => unknown) => unknown>(
    toRecord(element).addEventListener
  );
  if (!addEventListener) return false;
  (addEventListener as unknown as Function).call(element, eventName, handler);
  return true;
}

function resolveBoolean(value: unknown): boolean {
  return !!value;
}

function resolveText(value: unknown): string {
  return value == null ? "" : String(value);
}

function readToggleChecked(toggle: unknown): boolean {
  return resolveBoolean(toRecord(toggle).checked);
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

export interface TimerModuleSettingsUiHostResult {
  hasToggle: boolean;
  shouldRetry: boolean;
  didScheduleRetry: boolean;
  didAssignSync: boolean;
  didBindToggle: boolean;
  didSync: boolean;
}

export function applyTimerModuleSettingsUi(input: {
  toggle?: unknown;
  noteElement?: unknown;
  windowLike?: unknown;
  timerModuleRuntime?: unknown;
  retryDelayMs?: unknown;
  scheduleRetry?: unknown;
  syncMobileTimerboxUi?: unknown;
}): TimerModuleSettingsUiHostResult {
  const source = toRecord(input);
  const toggle = source.toggle;
  if (!toggle) {
    return {
      hasToggle: false,
      shouldRetry: false,
      didScheduleRetry: false,
      didAssignSync: false,
      didBindToggle: false,
      didSync: false
    };
  }

  const timerModuleRuntime = toRecord(source.timerModuleRuntime);
  const resolveTimerModuleInitRetryState = asFunction<(payload: unknown) => unknown>(
    timerModuleRuntime.resolveTimerModuleInitRetryState
  );
  const resolveTimerModuleCurrentViewMode = asFunction<(payload: unknown) => unknown>(
    timerModuleRuntime.resolveTimerModuleCurrentViewMode
  );
  const resolveTimerModuleSettingsState = asFunction<(payload: unknown) => unknown>(
    timerModuleRuntime.resolveTimerModuleSettingsState
  );
  const resolveTimerModuleBindingState = asFunction<(payload: unknown) => unknown>(
    timerModuleRuntime.resolveTimerModuleBindingState
  );
  const resolveTimerModuleViewMode = asFunction<(payload: unknown) => unknown>(
    timerModuleRuntime.resolveTimerModuleViewMode
  );
  const resolveTimerModuleAppliedViewMode = asFunction<(payload: unknown) => unknown>(
    timerModuleRuntime.resolveTimerModuleAppliedViewMode
  );
  if (
    !resolveTimerModuleInitRetryState ||
    !resolveTimerModuleCurrentViewMode ||
    !resolveTimerModuleSettingsState ||
    !resolveTimerModuleBindingState ||
    !resolveTimerModuleViewMode ||
    !resolveTimerModuleAppliedViewMode
  ) {
    return {
      hasToggle: true,
      shouldRetry: false,
      didScheduleRetry: false,
      didAssignSync: false,
      didBindToggle: false,
      didSync: false
    };
  }

  const windowLike = toRecord(source.windowLike);
  const retryState = toRecord(
    resolveTimerModuleInitRetryState({
      hasToggle: true,
      hasManager: !!windowLike.game_manager,
      retryDelayMs: source.retryDelayMs
    })
  );
  const shouldRetry = resolveBoolean(retryState.shouldRetry);

  let didScheduleRetry = false;
  if (shouldRetry) {
    const scheduleRetry = asFunction<(delayMs: number) => unknown>(source.scheduleRetry);
    if (scheduleRetry) {
      scheduleRetry(
        typeof retryState.retryDelayMs === "number" && retryState.retryDelayMs > 0
          ? retryState.retryDelayMs
          : 60
      );
      didScheduleRetry = true;
    }
    return {
      hasToggle: true,
      shouldRetry: true,
      didScheduleRetry,
      didAssignSync: false,
      didBindToggle: false,
      didSync: false
    };
  }

  const noteElement = source.noteElement;
  const syncMobileTimerboxUi = asFunction<() => unknown>(source.syncMobileTimerboxUi);
  let didSync = false;

  const sync = function (): void {
    if (!windowLike.game_manager) return;
    const manager = toRecord(windowLike.game_manager);
    const viewMode = resolveTimerModuleCurrentViewMode({
      manager,
      fallbackViewMode: "timer"
    });
    const settingsState = toRecord(
      resolveTimerModuleSettingsState({
        viewMode
      })
    );
    const toggleRecord = toRecord(toggle);
    toggleRecord.disabled = resolveBoolean(settingsState.toggleDisabled);
    toggleRecord.checked = resolveBoolean(settingsState.toggleChecked);
    if (noteElement) {
      toRecord(noteElement).textContent = resolveText(settingsState.noteText);
    }
    if (syncMobileTimerboxUi) {
      syncMobileTimerboxUi();
    }
    didSync = true;
  };

  let didAssignSync = false;
  if (isRecord(source.windowLike)) {
    source.windowLike.syncTimerModuleSettingsUI = sync;
    didAssignSync = true;
  }

  const toggleRecord = toRecord(toggle);
  const toggleBindingState = toRecord(
    resolveTimerModuleBindingState({
      alreadyBound: resolveBoolean(toggleRecord.__timerViewBound)
    })
  );

  let didBindToggle = false;
  if (toggleBindingState.shouldBind) {
    toggleRecord.__timerViewBound = toggleBindingState.boundValue;
    didBindToggle = bindListener(toggle, "change", function () {
      const manager = toRecord(windowLike.game_manager);
      if (typeof manager.setTimerModuleViewMode !== "function") return;
      const nextViewMode = resolveTimerModuleViewMode({
        checked: readToggleChecked(toggle)
      });
      const appliedViewMode = resolveTimerModuleAppliedViewMode({
        nextViewMode,
        checked: readToggleChecked(toggle)
      });
      (manager.setTimerModuleViewMode as (viewMode: string) => unknown)(resolveText(appliedViewMode));
      sync();
    });
  }

  sync();

  return {
    hasToggle: true,
    shouldRetry: false,
    didScheduleRetry: false,
    didAssignSync,
    didBindToggle,
    didSync
  };
}
