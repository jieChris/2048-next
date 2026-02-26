function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveBoolean(value: unknown): boolean {
  return !!value;
}

function resolveText(value: unknown): string {
  return value == null ? "" : String(value);
}

function querySelector(node: unknown, selector: string): unknown {
  const query = asFunction<(query: string) => unknown>(toRecord(node).querySelector);
  if (!query) return null;
  return (query as unknown as Function).call(node, selector);
}

function getElementById(documentLike: unknown, id: string): unknown {
  const getter = asFunction<(value: string) => unknown>(toRecord(documentLike).getElementById);
  if (!getter) return null;
  return (getter as unknown as Function).call(documentLike, id);
}

function createElement(documentLike: unknown, tagName: string): unknown {
  const creator = asFunction<(value: string) => unknown>(toRecord(documentLike).createElement);
  if (!creator) return null;
  return (creator as unknown as Function).call(documentLike, tagName);
}

function appendChild(node: unknown, child: unknown): void {
  const append = asFunction<(value: unknown) => unknown>(toRecord(node).appendChild);
  if (!append) return;
  (append as unknown as Function).call(node, child);
}

function insertBefore(node: unknown, child: unknown, before: unknown): void {
  const insert = asFunction<(value: unknown, before: unknown) => unknown>(toRecord(node).insertBefore);
  if (!insert) return;
  (insert as unknown as Function).call(node, child, before);
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

function readToggleChecked(toggle: unknown): boolean {
  return resolveBoolean(toRecord(toggle).checked);
}

function ensureHomeGuideSettingsToggle(input: {
  documentLike?: unknown;
  homeGuideRuntime?: unknown;
}): unknown {
  const source = toRecord(input);
  const documentLike = toRecord(source.documentLike);
  const existingToggle = getElementById(documentLike, "home-guide-toggle");
  if (existingToggle) return existingToggle;

  const modal = getElementById(documentLike, "settings-modal");
  if (!modal) return null;

  const content = querySelector(modal, ".settings-modal-content");
  if (!content) return null;

  const row = createElement(documentLike, "div");
  if (!row) return null;
  const rowRecord = toRecord(row);
  rowRecord.className = "settings-row";

  const homeGuideRuntime = toRecord(source.homeGuideRuntime);
  const buildRowInnerHtml = asFunction<() => unknown>(
    homeGuideRuntime.buildHomeGuideSettingsRowInnerHtml
  );
  rowRecord.innerHTML = resolveText(buildRowInnerHtml ? buildRowInnerHtml() : "");

  const actions = querySelector(content, ".replay-modal-actions");
  if (actions && toRecord(actions).parentNode === content) {
    insertBefore(content, row, actions);
  } else {
    appendChild(content, row);
  }

  return getElementById(documentLike, "home-guide-toggle");
}

export interface HomeGuideSettingsHostResult {
  hasToggle: boolean;
  didBindToggle: boolean;
  didAssignSync: boolean;
  didSync: boolean;
}

export function applyHomeGuideSettingsUi(input: {
  documentLike?: unknown;
  windowLike?: unknown;
  homeGuideRuntime?: unknown;
  homeGuideState?: unknown;
  isHomePage?: unknown;
  closeSettingsModal?: unknown;
  startHomeGuide?: unknown;
}): HomeGuideSettingsHostResult {
  const source = toRecord(input);
  const homeGuideRuntime = toRecord(source.homeGuideRuntime);
  const resolveHomeGuideSettingsState = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideSettingsState
  );
  const resolveHomeGuideBindingState = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideBindingState
  );
  const resolveHomeGuideToggleAction = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideToggleAction
  );
  if (
    !resolveHomeGuideSettingsState ||
    !resolveHomeGuideBindingState ||
    !resolveHomeGuideToggleAction
  ) {
    return {
      hasToggle: false,
      didBindToggle: false,
      didAssignSync: false,
      didSync: false
    };
  }

  const toggle = ensureHomeGuideSettingsToggle({
    documentLike: source.documentLike,
    homeGuideRuntime
  });
  if (!toggle) {
    return {
      hasToggle: false,
      didBindToggle: false,
      didAssignSync: false,
      didSync: false
    };
  }

  const documentLike = toRecord(source.documentLike);
  const note = getElementById(documentLike, "home-guide-note");
  const isHomePage = asFunction<() => unknown>(source.isHomePage);
  const closeSettingsModal = asFunction<() => unknown>(source.closeSettingsModal);
  const startHomeGuide = asFunction<(payload: unknown) => unknown>(source.startHomeGuide);
  const homeGuideState = toRecord(source.homeGuideState);

  let didSync = false;
  const sync = function (): void {
    const uiState = toRecord(
      resolveHomeGuideSettingsState({
        isHomePage: isHomePage ? !!isHomePage() : false,
        guideActive: resolveBoolean(homeGuideState.active),
        fromSettings: resolveBoolean(homeGuideState.fromSettings)
      })
    );
    const toggleRecord = toRecord(toggle);
    toggleRecord.disabled = resolveBoolean(uiState.toggleDisabled);
    toggleRecord.checked = resolveBoolean(uiState.toggleChecked);
    if (note) {
      toRecord(note).textContent = resolveText(uiState.noteText);
    }
    didSync = true;
  };

  let didAssignSync = false;
  if (isRecord(source.windowLike)) {
    source.windowLike.syncHomeGuideSettingsUI = sync;
    didAssignSync = true;
  }

  const toggleRecord = toRecord(toggle);
  const toggleBindingState = toRecord(
    resolveHomeGuideBindingState({
      alreadyBound: resolveBoolean(toggleRecord.__homeGuideBound)
    })
  );

  let didBindToggle = false;
  if (toggleBindingState.shouldBind) {
    toggleRecord.__homeGuideBound = toggleBindingState.boundValue;
    didBindToggle = bindListener(toggle, "change", function () {
      const toggleAction = toRecord(
        resolveHomeGuideToggleAction({
          checked: readToggleChecked(toggle),
          isHomePage: isHomePage ? !!isHomePage() : false
        })
      );
      if (toggleAction.shouldResync) {
        sync();
        return;
      }
      if (toggleAction.shouldStartGuide && startHomeGuide) {
        if (toggleAction.shouldCloseSettings && closeSettingsModal) {
          closeSettingsModal();
        }
        startHomeGuide({
          fromSettings: resolveBoolean(toggleAction.startFromSettings)
        });
      }
    });
  }

  sync();

  return {
    hasToggle: true,
    didBindToggle,
    didAssignSync,
    didSync
  };
}
