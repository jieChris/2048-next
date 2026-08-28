export interface GameManagerInputEventsInputManagerLike {
  on?: (eventName: string, callback: (payload?: unknown) => void) => void;
}

export interface OperationFeedbackInputMetadata {
  id: string;
  key: string;
  repeat: boolean;
}

export interface GameMoveInputAttempt {
  direction: unknown;
  feedback: OperationFeedbackInputMetadata | null;
}

export interface ConfirmedOperationFeedbackResult
  extends OperationFeedbackInputMetadata {
  valid: boolean;
}

export const OPERATION_FEEDBACK_RESULT_EVENT = "operation-feedback-result";
export const OPERATION_FEEDBACK_RESET_EVENT = "operation-feedback-reset";

export interface GameManagerInputEventsManagerLike {
  inputManager?: GameManagerInputEventsInputManagerLike | null;
  useItem?: (itemKey: unknown) => void;
  restart?: () => void;
  updateStatsPanel?: () => void;
  keepPlaying?: unknown;
  validInputCount?: unknown;
  invalidInputCount?: unknown;
  getWindowLike?: () => { document?: unknown } | null | undefined;
  actuator?: {
    continue?: () => void;
  } | null;
}

export interface GameManagerInputEventsOperations {
  handleMoveInput?: (
    manager: GameManagerInputEventsManagerLike,
    payload: unknown,
  ) => void;
}

export interface GameManagerInputEventsRuntime {
  bindGameManagerInputEvents: typeof bindGameManagerInputEvents;
  normalizeGameMoveInputAttempt: typeof normalizeGameMoveInputAttempt;
  publishConfirmedOperationFeedback: typeof publishConfirmedOperationFeedback;
  publishOperationFeedbackReset: typeof publishOperationFeedbackReset;
}

export interface GameManagerInputEventsRuntimeWindowLike {
  CoreGameManagerInputEventsRuntime?: GameManagerInputEventsRuntime;
}

export interface GameManagerInputEventsRuntimeInstallOptions {
  windowLike?: GameManagerInputEventsRuntimeWindowLike | null;
}

function resolvePrototypeKeepPlayingHandler(
  manager: GameManagerInputEventsManagerLike,
): ((this: GameManagerInputEventsManagerLike) => void) | null {
  try {
    const handler = Object.getPrototypeOf(manager)?.keepPlaying;
    return typeof handler === "function" ? handler : null;
  } catch (_err) {
    return null;
  }
}

function handleKeepPlaying(manager: GameManagerInputEventsManagerLike): void {
  const keepPlayingHandler = resolvePrototypeKeepPlayingHandler(manager);
  if (keepPlayingHandler) {
    keepPlayingHandler.call(manager);
    return;
  }
  manager.keepPlaying = true;
  manager.actuator?.continue?.();
}

function normalizeOperationFeedbackMetadata(
  value: unknown,
): OperationFeedbackInputMetadata | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<OperationFeedbackInputMetadata>;
  if (typeof source.id !== "string" || !source.id) return null;
  if (typeof source.key !== "string" || !source.key) return null;
  if (typeof source.repeat !== "boolean") return null;
  return { id: source.id, key: source.key, repeat: source.repeat };
}

export function normalizeGameMoveInputAttempt(
  payload: unknown,
): GameMoveInputAttempt {
  if (!payload || typeof payload !== "object" || !("direction" in payload)) {
    return { direction: payload, feedback: null };
  }
  const source = payload as { direction?: unknown; feedback?: unknown };
  return {
    direction: source.direction,
    feedback: normalizeOperationFeedbackMetadata(source.feedback),
  };
}

function incrementInputCount(
  manager: GameManagerInputEventsManagerLike,
  field: "validInputCount" | "invalidInputCount",
): void {
  const current = Number(manager[field]);
  manager[field] =
    (Number.isFinite(current) && current >= 0 ? Math.floor(current) : 0) + 1;
}

function resolveManagerDocument(
  manager: GameManagerInputEventsManagerLike,
): Document | null {
  try {
    const documentLike = manager.getWindowLike?.()?.document;
    if (
      documentLike &&
      typeof (documentLike as Document).dispatchEvent === "function"
    ) {
      return documentLike as Document;
    }
  } catch (_err) {
    return null;
  }
  return typeof document === "undefined" ? null : document;
}

export function publishConfirmedOperationFeedback(
  manager: GameManagerInputEventsManagerLike,
  attempt: GameMoveInputAttempt,
  valid: boolean,
): boolean {
  const feedback = attempt.feedback;
  if (!feedback) return false;
  incrementInputCount(manager, valid ? "validInputCount" : "invalidInputCount");
  manager.updateStatsPanel?.();
  const documentLike = resolveManagerDocument(manager);
  const CustomEventConstructor = documentLike?.defaultView?.CustomEvent;
  if (documentLike && CustomEventConstructor) {
    const detail: ConfirmedOperationFeedbackResult = { ...feedback, valid };
    documentLike.dispatchEvent(
      new CustomEventConstructor(OPERATION_FEEDBACK_RESULT_EVENT, { detail }),
    );
  }
  return true;
}

export function publishOperationFeedbackReset(
  manager: GameManagerInputEventsManagerLike,
): boolean {
  const documentLike = resolveManagerDocument(manager);
  const EventConstructor = documentLike?.defaultView?.Event;
  if (!documentLike || !EventConstructor) return false;
  documentLike.dispatchEvent(
    new EventConstructor(OPERATION_FEEDBACK_RESET_EVENT),
  );
  return true;
}

export function bindGameManagerInputEvents(
  manager: GameManagerInputEventsManagerLike | null | undefined,
  operations: GameManagerInputEventsOperations = {},
): void {
  if (
    !manager ||
    !manager.inputManager ||
    typeof manager.inputManager.on !== "function"
  )
    return;
  manager.inputManager.on("move", (payload) => {
    operations.handleMoveInput?.(manager, payload);
  });
  manager.inputManager.on("item", (itemKey) => {
    manager.useItem?.(itemKey);
  });
  manager.inputManager.on("restart", () => {
    manager.restart?.();
  });
  manager.inputManager.on("keepPlaying", () => {
    handleKeepPlaying(manager);
  });
}

export function createGameManagerInputEventsRuntime(): GameManagerInputEventsRuntime {
  return {
    bindGameManagerInputEvents,
    normalizeGameMoveInputAttempt,
    publishConfirmedOperationFeedback,
    publishOperationFeedbackReset,
  };
}

export function installGameManagerInputEventsRuntime(
  options: GameManagerInputEventsRuntimeInstallOptions = {},
): GameManagerInputEventsRuntime | null {
  let target = options.windowLike;
  if (target === undefined) {
    if (typeof window === "undefined") return null;
    // SAFETY: this runtime is installed only on the browser Window namespace.
    target = window as unknown as GameManagerInputEventsRuntimeWindowLike;
  }
  if (!target) return null;
  if (!target.CoreGameManagerInputEventsRuntime) {
    target.CoreGameManagerInputEventsRuntime =
      createGameManagerInputEventsRuntime();
  }
  return target.CoreGameManagerInputEventsRuntime;
}
