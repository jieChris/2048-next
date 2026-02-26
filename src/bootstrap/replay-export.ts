const COPY_SUCCESS_MESSAGE = "回放代码已复制到剪贴板！";
const COPY_FAILURE_MESSAGE = "自动复制失败，请手动从文本框复制。";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveAlert(input: Record<string, unknown>): (message: string) => void {
  const directAlert = asFunction<(message: unknown) => unknown>(input.alertLike);
  if (directAlert) {
    return function (message: string) {
      directAlert(message);
    };
  }
  return function (_message: string) {};
}

function resolveConsoleError(
  input: Record<string, unknown>
): (message: string, reason: unknown) => void {
  const consoleLike = toRecord(input.consoleLike);
  const errorFn = asFunction<(message: unknown, reason: unknown) => unknown>(consoleLike.error);
  if (errorFn) {
    return function (message: string, reason: unknown) {
      errorFn.call(consoleLike, message, reason);
    };
  }
  return function (_message: string, _reason: unknown) {};
}

function applyFallbackCopy(input: Record<string, unknown>, text: string): {
  copied: boolean;
  method: "fallback" | "fallback-error";
} {
  const alertLike = resolveAlert(input);
  const logError = resolveConsoleError(input);
  const documentLike = toRecord(input.documentLike);
  const createElement = asFunction<(tagName: unknown) => unknown>(documentLike.createElement);
  const execCommand = asFunction<(command: unknown) => unknown>(documentLike.execCommand);
  const body = toRecord(documentLike.body);
  const appendChild = asFunction<(child: unknown) => unknown>(body.appendChild);
  const removeChild = asFunction<(child: unknown) => unknown>(body.removeChild);
  let textArea: Record<string, unknown> | null = null;

  try {
    if (!createElement || !appendChild || !removeChild || !execCommand) {
      throw new Error("fallback copy unavailable");
    }

    textArea = toRecord(createElement.call(documentLike, "textarea"));
    textArea.value = text;
    const style = toRecord(textArea.style);
    style.position = "fixed";

    appendChild.call(body, textArea);
    const focus = asFunction<() => unknown>(textArea.focus);
    const select = asFunction<() => unknown>(textArea.select);
    if (focus) focus.call(textArea);
    if (select) select.call(textArea);

    execCommand.call(documentLike, "copy");
    removeChild.call(body, textArea);
    alertLike(COPY_SUCCESS_MESSAGE);
    return {
      copied: true,
      method: "fallback"
    };
  } catch (error) {
    if (textArea && removeChild) {
      try {
        removeChild.call(body, textArea);
      } catch (_err) {}
    }
    logError("Fallback copy failed", error);
    alertLike(COPY_FAILURE_MESSAGE);
    return {
      copied: false,
      method: "fallback-error"
    };
  }
}

export function applyReplayClipboardCopy(input: {
  text?: unknown;
  navigatorLike?: unknown;
  documentLike?: unknown;
  alertLike?: unknown;
  consoleLike?: unknown;
}): {
  attempted: boolean;
  method: "clipboard" | "fallback" | "fallback-error";
} {
  const source = toRecord(input);
  const text = source.text == null ? "" : String(source.text);
  const alertLike = resolveAlert(source);
  const navigatorLike = toRecord(source.navigatorLike);
  const clipboard = toRecord(navigatorLike.clipboard);
  const writeText = asFunction<(value: unknown) => unknown>(clipboard.writeText);

  if (!writeText) {
    const fallback = applyFallbackCopy(source, text);
    return {
      attempted: true,
      method: fallback.method
    };
  }

  try {
    const writeResult = writeText.call(clipboard, text);
    const writeResultRecord = toRecord(writeResult);
    const thenFn = asFunction<(onFulfilled: () => unknown) => unknown>(writeResultRecord.then);
    if (thenFn) {
      const chained = thenFn.call(writeResult, function () {
        alertLike(COPY_SUCCESS_MESSAGE);
      });
      const chainedRecord = toRecord(chained);
      const catchFn = asFunction<(onRejected: (reason: unknown) => unknown) => unknown>(
        chainedRecord.catch
      );
      if (catchFn) {
        catchFn.call(chained, function (_reason: unknown) {
          applyFallbackCopy(source, text);
        });
      }
    } else {
      alertLike(COPY_SUCCESS_MESSAGE);
    }
    return {
      attempted: true,
      method: "clipboard"
    };
  } catch (_error) {
    const fallback = applyFallbackCopy(source, text);
    return {
      attempted: true,
      method: fallback.method
    };
  }
}

export function applyReplayExport(input: {
  gameManager?: unknown;
  showReplayModal?: unknown;
  navigatorLike?: unknown;
  documentLike?: unknown;
  alertLike?: unknown;
  consoleLike?: unknown;
}): {
  exported: boolean;
  replay?: string;
} {
  const source = toRecord(input);
  const manager = toRecord(source.gameManager);
  const serialize = asFunction<() => unknown>(manager.serialize);
  if (!serialize) {
    return {
      exported: false
    };
  }

  const replay = String(serialize.call(manager));
  const showReplayModal = asFunction<
    (
      title: unknown,
      content: unknown,
      actionName: unknown,
      actionCallback: (text: unknown) => unknown
    ) => unknown
  >(source.showReplayModal);
  if (showReplayModal) {
    showReplayModal("导出回放", replay, "再次复制", function (text: unknown) {
      return applyReplayClipboardCopy({
        text,
        navigatorLike: source.navigatorLike,
        documentLike: source.documentLike,
        alertLike: source.alertLike,
        consoleLike: source.consoleLike
      });
    });
  }

  applyReplayClipboardCopy({
    text: replay,
    navigatorLike: source.navigatorLike,
    documentLike: source.documentLike,
    alertLike: source.alertLike,
    consoleLike: source.consoleLike
  });

  return {
    exported: true,
    replay
  };
}
