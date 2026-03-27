const COPY_SUCCESS_MESSAGE = "回放代码已复制到剪贴板！";
const COPY_FAILURE_MESSAGE = "自动复制失败，请手动从文本框复制。";

const DOWNLOAD_FAILURE_MESSAGE = "导出文件失败，请稍后重试。";
const DOWNLOAD_BUTTON_ID = "replay-download-btn";
const DOWNLOAD_BUTTON_LABEL = "导出文件";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function toObjectLike(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  return typeof value === "function" ? (value as unknown as Record<string, unknown>) : {};
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

function resolveWindowLike(input: Record<string, unknown>): unknown {
  if (isRecord(input.windowLike)) return input.windowLike;
  if (typeof window !== "undefined") return window;
  return null;
}

function resolveUrlRuntime(input: { windowLike?: unknown }): {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
} | null {
  const windowLike = toRecord(input.windowLike);
  const urlLike = toObjectLike(windowLike.URL);
  const createObjectURL = asFunction<(blob: Blob) => string>(urlLike.createObjectURL);
  const revokeObjectURL = asFunction<(url: string) => void>(urlLike.revokeObjectURL);
  if (!createObjectURL || !revokeObjectURL) return null;
  return {
    createObjectURL: createObjectURL.bind(urlLike),
    revokeObjectURL: revokeObjectURL.bind(urlLike)
  };
}

function triggerReplayFileDownload(input: {
  blob?: unknown;
  filename?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
}): { downloaded: boolean; filename?: string } {
  const source = toRecord(input);
  const blob = source.blob;
  const filename = source.filename == null ? "replay.txt" : String(source.filename);
  const documentLike = toRecord(source.documentLike);
  const createElement = asFunction<(tagName: unknown) => unknown>(documentLike.createElement);
  const body = toRecord(documentLike.body);
  const appendChild = asFunction<(child: unknown) => unknown>(body.appendChild);
  const removeChild = asFunction<(child: unknown) => unknown>(body.removeChild);
  const urlRuntime = resolveUrlRuntime({ windowLike: source.windowLike });

  if (!blob || !createElement || !appendChild || !removeChild || !urlRuntime) {
    return { downloaded: false };
  }

  let href: string | null = null;
  let anchor: Record<string, unknown> | null = null;
  try {
    href = urlRuntime.createObjectURL(blob as Blob);
    anchor = toRecord(createElement.call(documentLike, "a"));
    anchor.href = href;
    anchor.download = filename;
    const style = toRecord(anchor.style);
    style.display = "none";
    appendChild.call(body, anchor);

    const click = asFunction<() => unknown>(anchor.click);
    if (!click) throw new Error("anchor click unavailable");
    click.call(anchor);

    removeChild.call(body, anchor);
    urlRuntime.revokeObjectURL(href);
    return {
      downloaded: true,
      filename
    };
  } catch (_error) {
    if (anchor && removeChild) {
      try {
        removeChild.call(body, anchor);
      } catch (_err) {}
    }
    if (href) {
      try {
        urlRuntime.revokeObjectURL(href);
      } catch (_err) {}
    }
    return { downloaded: false };
  }
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

function resolveReplayDownloadFilename(input: { replay?: unknown }): string {
  const replay = input.replay == null ? "" : String(input.replay);
  if (replay.startsWith("REPLAY_v1RPL_B64_")) return "replay-v1.txt";
  return "replay.txt";
}

function ensureReplayDownloadButton(input: { documentLike?: unknown }): Record<string, unknown> | null {
  const source = toRecord(input);
  const documentLike = toRecord(source.documentLike);
  const getElementById = asFunction<(id: string) => unknown>(documentLike.getElementById);
  if (!getElementById) return null;

  const existing = getElementById.call(documentLike, DOWNLOAD_BUTTON_ID);
  if (existing) return toRecord(existing);

  const modal = getElementById.call(documentLike, "replay-modal");
  if (!modal) return null;

  const modalRecord = toRecord(modal);
  const querySelector = asFunction<(selector: string) => unknown>(modalRecord.querySelector);
  if (!querySelector) return null;
  const actions = querySelector.call(modalRecord, ".replay-modal-actions");
  if (!actions) return null;

  const actionsRecord = toRecord(actions);
  const appendChild = asFunction<(child: unknown) => unknown>(actionsRecord.appendChild);
  const createElement = asFunction<(tagName: string) => unknown>(documentLike.createElement);
  if (!appendChild || !createElement) return null;

  const button = toRecord(createElement.call(documentLike, "button"));
  button.id = DOWNLOAD_BUTTON_ID;
  button.className = "replay-button";
  button.type = "button";
  button.textContent = DOWNLOAD_BUTTON_LABEL;
  const style = toRecord(button.style);
  style.display = "none";
  appendChild.call(actionsRecord, button);
  return button;
}

function configureReplayDownloadButton(input: {
  replay?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  alertLike?: unknown;
}): { configured: boolean } {
  const source = toRecord(input);
  const button = ensureReplayDownloadButton({ documentLike: source.documentLike });
  if (!button) return { configured: false };

  const alertLike = resolveAlert(source);
  button.textContent = DOWNLOAD_BUTTON_LABEL;
  const style = toRecord(button.style);
  style.display = "inline-block";
  button.onclick = function () {
    const replay = source.replay == null ? "" : String(source.replay);
    if (!replay) return { downloaded: false };
    const result = triggerReplayFileDownload({
      blob: new Blob([replay], { type: "text/plain;charset=utf-8" }),
      filename: resolveReplayDownloadFilename({ replay }),
      documentLike: source.documentLike,
      windowLike: source.windowLike
    });
    if (!result.downloaded) {
      alertLike(DOWNLOAD_FAILURE_MESSAGE);
    }
    return result;
  };

  return { configured: true };
}

export function applyReplayExport(input: {
  gameManager?: unknown;
  showReplayModal?: unknown;
  navigatorLike?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
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
  const isV1 = replay.startsWith("REPLAY_v1RPL_B64_");
  const showReplayModal = asFunction<
    (
      title: unknown,
      content: unknown,
      actionName: unknown,
      actionCallback: (text: unknown) => unknown
    ) => unknown
  >(source.showReplayModal);
  if (showReplayModal) {
    showReplayModal(isV1 ? "导出回放 (v1)" : "导出回放", replay, "再次复制", function (text: unknown) {
      return applyReplayClipboardCopy({
        text,
        navigatorLike: source.navigatorLike,
        documentLike: source.documentLike,
        alertLike: source.alertLike,
        consoleLike: source.consoleLike
      });
    });
    configureReplayDownloadButton({
      replay,
      documentLike: source.documentLike,
      windowLike: resolveWindowLike(source),
      alertLike: source.alertLike
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
