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

const STANDALONE_DISPLAY_MODE_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: window-controls-overlay)",
  "(display-mode: fullscreen)",
  "(display-mode: minimal-ui)"
] as const;

function matchesStandaloneDisplayMode(windowLike: Record<string, unknown>): boolean {
  const matchMedia = asFunction<(query: string) => unknown>(windowLike.matchMedia);
  if (!matchMedia) return false;
  for (let i = 0; i < STANDALONE_DISPLAY_MODE_QUERIES.length; i += 1) {
    const query = STANDALONE_DISPLAY_MODE_QUERIES[i];
    try {
      const queryResult = toRecord(matchMedia.call(windowLike, query));
      if (queryResult.matches === true) return true;
    } catch (_err) {
      // Ignore unsupported media queries from host runtime.
    }
  }
  return false;
}

function hasLegacyStandaloneFlag(windowLike: Record<string, unknown>): boolean {
  const navigatorLike = toRecord(windowLike.navigator);
  return navigatorLike.standalone === true;
}

function isStandaloneAppWindow(windowLike: Record<string, unknown>): boolean {
  return hasLegacyStandaloneFlag(windowLike) || matchesStandaloneDisplayMode(windowLike);
}

function navigateCurrentWindow(windowLike: Record<string, unknown>, openUrl: string): boolean {
  const locationLike = toRecord(windowLike.location);
  const assign = asFunction<(url: string) => unknown>(locationLike.assign);
  if (assign) {
    assign.call(locationLike, openUrl);
    return true;
  }
  if ("href" in locationLike) {
    try {
      (locationLike as { href: string }).href = openUrl;
      return true;
    } catch (_err) {
      return false;
    }
  }
  return false;
}

function openInTargetWindow(
  windowLike: Record<string, unknown>,
  openUrl: string,
  target: "_self" | "_blank"
): boolean {
  const openFn = asFunction<(url: unknown, targetName: unknown) => unknown>(windowLike.open);
  if (!openFn) return false;
  openFn.call(windowLike, openUrl, target);
  return true;
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
  const openTarget: "_self" | "_blank" = isStandaloneAppWindow(windowLike) ? "_self" : "_blank";
  if (openTarget === "_self" && navigateCurrentWindow(windowLike, openUrl)) {
    return {
      opened: true,
      reason: "opened",
      openUrl
    };
  }
  if (!openInTargetWindow(windowLike, openUrl, openTarget)) {
    return {
      opened: false,
      reason: "window-open-missing",
      openUrl
    };
  }
  return {
    opened: true,
    reason: "opened",
    openUrl
  };
}
