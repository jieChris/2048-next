function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveScopeValue(value: unknown): boolean {
  if (typeof value === "function") {
    const fn = value as () => unknown;
    return !!fn();
  }
  return !!value;
}

export interface GameTopActionsPlacementHostResult {
  isScope: boolean;
  hasState: boolean;
  didCreateState: boolean;
  didSync: boolean;
  mobileTopActionsState: unknown;
}

export interface PracticeTopActionsPlacementHostResult {
  isScope: boolean;
  hasState: boolean;
  didCreateState: boolean;
  didSync: boolean;
  practiceTopActionsState: unknown;
}

export function applyGameTopActionsPlacementSync(input: {
  topActionsRuntime?: unknown;
  mobileTopActionsState?: unknown;
  isGamePageScope?: unknown;
  compactViewport?: unknown;
  querySelector?: unknown;
  getElementById?: unknown;
  createComment?: unknown;
}): GameTopActionsPlacementHostResult {
  const source = toRecord(input);
  const inScope = resolveScopeValue(source.isGamePageScope);
  let state = source.mobileTopActionsState || null;

  if (!inScope) {
    return {
      isScope: false,
      hasState: !!state,
      didCreateState: false,
      didSync: false,
      mobileTopActionsState: state
    };
  }

  const runtime = toRecord(source.topActionsRuntime);
  const createState = asFunction<(opts: unknown) => unknown>(
    runtime.createGameTopActionsPlacementState
  );
  const syncState = asFunction<(opts: unknown) => unknown>(runtime.syncGameTopActionsPlacement);
  const querySelector = asFunction<(selector: string) => unknown>(source.querySelector);
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const createComment = asFunction<(text: string) => unknown>(source.createComment);

  let didCreateState = false;
  if (!state && createState && querySelector && getElementById && createComment) {
    state =
      createState({
        enabled: true,
        topActionButtons: querySelector(".top-action-buttons"),
        restartBtn: querySelector(".above-game .restart-button"),
        timerToggleBtn: getElementById("timerbox-toggle-btn"),
        createComment
      }) || null;
    didCreateState = !!state;
  }

  let didSync = false;
  if (state && syncState) {
    didSync = !!syncState({
      state,
      compactViewport: !!source.compactViewport
    });
  }

  return {
    isScope: true,
    hasState: !!state,
    didCreateState,
    didSync,
    mobileTopActionsState: state
  };
}

export function applyPracticeTopActionsPlacementSync(input: {
  topActionsRuntime?: unknown;
  practiceTopActionsState?: unknown;
  isPracticePageScope?: unknown;
  compactViewport?: unknown;
  querySelector?: unknown;
  getElementById?: unknown;
  createComment?: unknown;
}): PracticeTopActionsPlacementHostResult {
  const source = toRecord(input);
  const inScope = resolveScopeValue(source.isPracticePageScope);
  let state = source.practiceTopActionsState || null;

  if (!inScope) {
    return {
      isScope: false,
      hasState: !!state,
      didCreateState: false,
      didSync: false,
      practiceTopActionsState: state
    };
  }

  const runtime = toRecord(source.topActionsRuntime);
  const createState = asFunction<(opts: unknown) => unknown>(
    runtime.createPracticeTopActionsPlacementState
  );
  const syncState = asFunction<(opts: unknown) => unknown>(runtime.syncPracticeTopActionsPlacement);
  const querySelector = asFunction<(selector: string) => unknown>(source.querySelector);
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const createComment = asFunction<(text: string) => unknown>(source.createComment);

  let didCreateState = false;
  if (!state && createState && querySelector && getElementById && createComment) {
    state =
      createState({
        enabled: true,
        topActionButtons: getElementById("practice-stats-actions"),
        restartBtn: querySelector(".above-game .restart-button"),
        createComment
      }) || null;
    didCreateState = !!state;
  }

  let didSync = false;
  if (state && syncState) {
    didSync = !!syncState({
      state,
      compactViewport: !!source.compactViewport
    });
  }

  return {
    isScope: true,
    hasState: !!state,
    didCreateState,
    didSync,
    practiceTopActionsState: state
  };
}
