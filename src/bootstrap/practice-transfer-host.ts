function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function readCookie(documentLike: unknown): string {
  const doc = toRecord(documentLike);
  try {
    return typeof doc.cookie === "string" ? doc.cookie : "";
  } catch (_err) {
    return "";
  }
}

function readWindowName(windowLike: unknown): string {
  const win = toRecord(windowLike);
  try {
    return typeof win.name === "string" ? win.name : "";
  } catch (_err) {
    return "";
  }
}

function resolvePlanFailedMessage(input: Record<string, unknown>): string {
  return typeof input.planFailedMessage === "string" && input.planFailedMessage
    ? input.planFailedMessage
    : "练习板链接生成失败。";
}

export interface ApplyPracticeTransferFromCurrentResult {
  opened: boolean;
  reason: "runtime-missing" | "precheck-failed" | "plan-failed" | "window-open-missing" | "opened";
  openUrl: string | null;
}

export function applyPracticeTransferFromCurrent(input: {
  manager?: unknown;
  gameModeConfig?: unknown;
  practiceTransferRuntime?: unknown;
  localStorageLike?: unknown;
  sessionStorageLike?: unknown;
  guideShownKey?: unknown;
  guideSeenFlag?: unknown;
  localStorageKey?: unknown;
  sessionStorageKey?: unknown;
  planFailedMessage?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  alertLike?: unknown;
}): ApplyPracticeTransferFromCurrentResult {
  const source = toRecord(input);
  const runtime = toRecord(source.practiceTransferRuntime);
  const resolvePracticeTransferPrecheck = asFunction<(payload: unknown) => unknown>(
    runtime.resolvePracticeTransferPrecheck
  );
  const createPracticeTransferNavigationPlan = asFunction<(payload: unknown) => unknown>(
    runtime.createPracticeTransferNavigationPlan
  );
  if (!resolvePracticeTransferPrecheck || !createPracticeTransferNavigationPlan) {
    return {
      opened: false,
      reason: "runtime-missing",
      openUrl: null
    };
  }

  const alertLike = asFunction<(message: unknown) => unknown>(source.alertLike);
  const precheck = toRecord(resolvePracticeTransferPrecheck.call(runtime, { manager: source.manager || null }));
  const precheckBoard = precheck.board;
  if (!precheck.canOpen || !Array.isArray(precheckBoard)) {
    if (alertLike && precheck.alertMessage) {
      alertLike(precheck.alertMessage);
    }
    return {
      opened: false,
      reason: "precheck-failed",
      openUrl: null
    };
  }

  const plan = toRecord(
    createPracticeTransferNavigationPlan.call(runtime, {
      gameModeConfig:
        source.gameModeConfig && typeof source.gameModeConfig === "object" ? source.gameModeConfig : null,
      manager: source.manager || null,
      board: precheckBoard,
      localStorageLike: source.localStorageLike || null,
      sessionStorageLike: source.sessionStorageLike || null,
      guideShownKey: source.guideShownKey,
      guideSeenFlag: source.guideSeenFlag,
      cookie: readCookie(source.documentLike),
      windowName: readWindowName(source.windowLike),
      localStorageKey: source.localStorageKey,
      sessionStorageKey: source.sessionStorageKey
    })
  );
  const openUrl = typeof plan.openUrl === "string" ? plan.openUrl : "";
  if (!openUrl) {
    if (alertLike) {
      alertLike(resolvePlanFailedMessage(source));
    }
    return {
      opened: false,
      reason: "plan-failed",
      openUrl: null
    };
  }

  const windowLike = toRecord(source.windowLike);
  const openFn = asFunction<(url: unknown, target: unknown) => unknown>(windowLike.open);
  if (!openFn) {
    return {
      opened: false,
      reason: "window-open-missing",
      openUrl
    };
  }

  openFn.call(windowLike, openUrl, "_blank");
  return {
    opened: true,
    reason: "opened",
    openUrl
  };
}
