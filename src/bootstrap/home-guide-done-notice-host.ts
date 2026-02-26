function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveText(value: unknown): string {
  return value == null ? "" : String(value);
}

function resolveDelayMs(value: unknown): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return 1200;
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

export interface HomeGuideDoneNoticeHostResult {
  shown: boolean;
  created: boolean;
  hideDelayMs: number;
}

export function applyHomeGuideDoneNotice(input: {
  documentLike?: unknown;
  homeGuideRuntime?: unknown;
  setTimeoutLike?: unknown;
  clearTimeoutLike?: unknown;
}): HomeGuideDoneNoticeHostResult {
  const source = toRecord(input);
  const homeGuideRuntime = toRecord(source.homeGuideRuntime);
  const resolveHomeGuideDoneNotice = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideDoneNotice
  );
  const resolveHomeGuideDoneNoticeStyle = asFunction<() => unknown>(
    homeGuideRuntime.resolveHomeGuideDoneNoticeStyle
  );
  const setTimeoutLike = asFunction<(handler: () => unknown, ms: number) => unknown>(
    source.setTimeoutLike
  );
  const clearTimeoutLike = asFunction<(value: unknown) => unknown>(source.clearTimeoutLike);

  if (!resolveHomeGuideDoneNotice || !resolveHomeGuideDoneNoticeStyle || !setTimeoutLike) {
    return {
      shown: false,
      created: false,
      hideDelayMs: 1200
    };
  }

  const documentLike = toRecord(source.documentLike);
  let toast = getElementById(documentLike, "home-guide-done-toast");
  let created = false;
  if (!toast) {
    toast = createElement(documentLike, "div");
    if (!toast) {
      return {
        shown: false,
        created: false,
        hideDelayMs: 1200
      };
    }
    const toastRecord = toRecord(toast);
    toastRecord.id = "home-guide-done-toast";

    const toastStyle = toRecord(resolveHomeGuideDoneNoticeStyle());
    const inlineStyle = toRecord(toastRecord.style);
    for (const key in toastStyle) {
      if (!Object.prototype.hasOwnProperty.call(toastStyle, key)) continue;
      inlineStyle[key] = toastStyle[key];
    }
    toastRecord.style = inlineStyle;
    appendChild(documentLike.body, toast);
    created = true;
  }

  const toastRecord = toRecord(toast);
  const doneNotice = toRecord(resolveHomeGuideDoneNotice({}));
  toastRecord.textContent = resolveText(doneNotice.message);
  const inlineStyle = toRecord(toastRecord.style);
  inlineStyle.opacity = "1";
  toastRecord.style = inlineStyle;

  const previousTimer = toastRecord.__hideTimer;
  if (previousTimer && clearTimeoutLike) {
    clearTimeoutLike(previousTimer);
  }

  const hideDelayMs = resolveDelayMs(doneNotice.hideDelayMs);
  const hideTimer = setTimeoutLike(function () {
    const style = toRecord(toRecord(toast).style);
    style.opacity = "0";
    toRecord(toast).style = style;
  }, hideDelayMs);
  toastRecord.__hideTimer = hideTimer;

  return {
    shown: true,
    created,
    hideDelayMs
  };
}
