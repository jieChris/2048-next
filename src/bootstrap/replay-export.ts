import { randomBase36 } from "../utils/crypto-random";

const DOWNLOAD_BUTTON_ID = "replay-download-btn";
const OPEN_PAGE_BUTTON_ID = "replay-open-page-btn";
const REPLAY_PAGE_HANDOFF_STORAGE_PREFIX = "replay_export_payload_v1:";
const REPLAY_PAGE_HANDOFF_QUERY_FLAG = "local_replay=1";
const REPLAY_PAGE_HANDOFF_QUERY_KEY = "handoff";
const REPLAY_LOGIC_VERSION = "v1";
const REPLAY_TRANSIENT_NOTICE_ID = "replay-export-toast";
const REPLAY_TRANSIENT_NOTICE_HIDE_DELAY_MS = 1600;
const UI_LANGUAGE_KEY = "ui_language_v1";

type ReplayExportLang = "en" | "zh";

const REPLAY_EXPORT_COPY: Record<
  ReplayExportLang,
  {
    copySuccess: string;
    copyFailure: string;
    exportFailure: string;
    downloadFailure: string;
    openPageFailure: string;
    downloadButton: string;
    openPageButton: string;
    exportTitle: string;
    exportV1Title: string;
    copyAction: string;
  }
> = {
  zh: {
    copySuccess: "回放代码已复制到剪贴板！",
    copyFailure: "自动复制失败，请手动从文本框复制。",
    exportFailure: "导出回放失败，请刷新页面后重试。",
    downloadFailure: "导出文件失败，请稍后重试。",
    openPageFailure: "打开回放页面失败，请稍后重试。",
    downloadButton: "导出文件",
    openPageButton: "打开回放页",
    exportTitle: "导出回放",
    exportV1Title: "导出回放 (v1)",
    copyAction: "复制回放"
  },
  en: {
    copySuccess: "Replay code copied to clipboard.",
    copyFailure: "Automatic copy failed. Please copy from the text box manually.",
    exportFailure: "Replay export failed. Please refresh the page and try again.",
    downloadFailure: "Export failed. Please try again later.",
    openPageFailure: "Could not open the replay page. Please try again later.",
    downloadButton: "Download File",
    openPageButton: "Open Replay Page",
    exportTitle: "Export Replay",
    exportV1Title: "Export Replay (v1)",
    copyAction: "Copy Replay"
  }
};

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

function normalizeReplayExportLanguage(value: unknown): ReplayExportLang | "" {
  const lang = String(value || "").trim().toLowerCase();
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("zh")) return "zh";
  return "";
}

function resolveReplayExportLanguage(input: Record<string, unknown>): ReplayExportLang {
  const windowLike = toRecord(resolveWindowLike(input));
  try {
    const i18n = toRecord(windowLike.UII18N);
    const getLanguage = asFunction<() => unknown>(i18n.getLanguage);
    if (getLanguage) {
      const fromI18n = normalizeReplayExportLanguage(getLanguage.call(i18n));
      if (fromI18n) return fromI18n;
    }
  } catch (_errorI18n) {}
  try {
    const storageLike = toRecord(windowLike.localStorage);
    const getItem = asFunction<(key: string) => unknown>(storageLike.getItem);
    if (getItem) {
      const fromStorage = normalizeReplayExportLanguage(getItem.call(storageLike, UI_LANGUAGE_KEY));
      if (fromStorage) return fromStorage;
    }
  } catch (_errorStorage) {}
  try {
    const documentLike = toRecord(
      input.documentLike || windowLike.document || (typeof document !== "undefined" ? document : null)
    );
    const root = toRecord(documentLike.documentElement);
    const getAttribute = asFunction<(name: string) => unknown>(root.getAttribute);
    if (getAttribute) {
      const fromDocument = normalizeReplayExportLanguage(
        getAttribute.call(root, "data-ui-lang") || getAttribute.call(root, "lang")
      );
      if (fromDocument) return fromDocument;
    }
  } catch (_errorDocument) {}
  return "zh";
}

function resolveReplayExportCopy(input: Record<string, unknown>) {
  return REPLAY_EXPORT_COPY[resolveReplayExportLanguage(input)];
}

function resolveFallbackReplayString(manager: Record<string, unknown>): string {
  const rescueReplayString = manager.rescueReplayString;
  const replay = rescueReplayString == null ? "" : String(rescueReplayString).trim();
  return replay;
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

function resolveTimeoutLike(
  input: Record<string, unknown>
): ((handler: () => unknown, ms: number) => unknown) | null {
  const windowLike = toRecord(resolveWindowLike(input));
  return (
    asFunction<(handler: () => unknown, ms: number) => unknown>(windowLike.setTimeout) ||
    (typeof setTimeout === "function" ? setTimeout : null)
  );
}

function resolveClearTimeoutLike(input: Record<string, unknown>): ((handle: unknown) => void) | null {
  const windowLike = toRecord(resolveWindowLike(input));
  const directClearTimeout = asFunction<(handle: unknown) => unknown>(windowLike.clearTimeout);
  if (directClearTimeout) {
    return function (handle: unknown) {
      directClearTimeout(handle);
    };
  }
  if (typeof clearTimeout === "function") {
    return function (handle: unknown) {
      clearTimeout(handle as never);
    };
  }
  return null;
}

function applyReplayTransientNoticeStyle(style: Record<string, unknown>): void {
  style.position = "fixed";
  style.left = "50%";
  style.top = "48px";
  style.transform = "translateX(-50%)";
  style.maxWidth = "min(calc(100vw - 32px), 360px)";
  style.padding = "10px 16px";
  style.borderRadius = "999px";
  style.background = "#ffffff";
  style.color = "#3c3024";
  style.fontSize = "14px";
  style.lineHeight = "1.4";
  style.boxShadow = "0 10px 24px rgba(0, 0, 0, 0.18)";
  style.zIndex = "4000";
  style.pointerEvents = "none";
  style.opacity = "0";
  style.transition = "opacity 180ms ease";
  style.textAlign = "center";
}

function resolveReplayTransientNotice(input: Record<string, unknown>): Record<string, unknown> | null {
  const documentLike = toRecord(input.documentLike);
  const getElementById = asFunction<(id: string) => unknown>(documentLike.getElementById);
  const createElement = asFunction<(tagName: string) => unknown>(documentLike.createElement);
  const body = toRecord(documentLike.body);
  const appendChild = asFunction<(child: unknown) => unknown>(body.appendChild);

  if (getElementById) {
    const existing = getElementById.call(documentLike, REPLAY_TRANSIENT_NOTICE_ID);
    if (existing) return toRecord(existing);
  }
  if (!createElement || !appendChild) return null;

  const toast = toRecord(createElement.call(documentLike, "div"));
  toast.id = REPLAY_TRANSIENT_NOTICE_ID;
  if (typeof toast.setAttribute === "function") {
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
  }
  applyReplayTransientNoticeStyle(toRecord(toast.style));
  appendChild.call(body, toast);
  return toast;
}

function showReplayTransientNotice(input: Record<string, unknown>, message: string): boolean {
  const toast = resolveReplayTransientNotice(input);
  const setTimeoutLike = resolveTimeoutLike(input);
  const clearTimeoutLike = resolveClearTimeoutLike(input);
  if (!toast || !setTimeoutLike) return false;

  toast.textContent = message;
  toRecord(toast.style).opacity = "1";

  const previousTimer = toast.__hideTimer;
  if (previousTimer && clearTimeoutLike) {
    clearTimeoutLike(previousTimer);
  }

  toast.__hideTimer = setTimeoutLike(function () {
    toRecord(toast.style).opacity = "0";
  }, REPLAY_TRANSIENT_NOTICE_HIDE_DELAY_MS);

  return true;
}

function notifyReplayCopySuccess(input: Record<string, unknown>): void {
  const copy = resolveReplayExportCopy(input);
  if (showReplayTransientNotice(input, copy.copySuccess)) return;
  resolveAlert(input)(copy.copySuccess);
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

function resolveStorageLike(input: {
  windowLike?: unknown;
  storageName?: unknown;
}): Record<string, unknown> | null {
  const source = toRecord(input);
  const storageName = source.storageName == null ? "" : String(source.storageName);
  if (!storageName) return null;

  const windowLike = toRecord(resolveWindowLike(source));
  try {
    const storage = windowLike[storageName];
    const storageRecord = toObjectLike(storage);
    const setItem = asFunction<(key: string, value: string) => unknown>(storageRecord.setItem);
    const removeItem = asFunction<(key: string) => unknown>(storageRecord.removeItem);
    if (!setItem || !removeItem) return null;
    return storageRecord;
  } catch (_error) {
    return null;
  }
}

function safeWriteStorageItem(input: {
  storageLike?: unknown;
  key?: unknown;
  value?: unknown;
}): boolean {
  const source = toRecord(input);
  const storageLike = toRecord(source.storageLike);
  const key = source.key == null ? "" : String(source.key);
  const value = source.value == null ? "" : String(source.value);
  const setItem = asFunction<(key: string, value: string) => unknown>(storageLike.setItem);
  if (!setItem || !key) return false;
  try {
    setItem.call(storageLike, key, value);
    return true;
  } catch (_error) {
    return false;
  }
}

function safeRemoveStorageItem(input: {
  storageLike?: unknown;
  key?: unknown;
}): void {
  const source = toRecord(input);
  const storageLike = toRecord(source.storageLike);
  const key = source.key == null ? "" : String(source.key);
  const removeItem = asFunction<(key: string) => unknown>(storageLike.removeItem);
  if (!removeItem || !key) return;
  try {
    removeItem.call(storageLike, key);
  } catch (_error) {}
}

function createReplayPageHandoffId(): string {
  return String(Date.now()) + "-" + randomBase36(8);
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
    notifyReplayCopySuccess(input);
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
    resolveAlert(input)(resolveReplayExportCopy(input).copyFailure);
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
  windowLike?: unknown;
  alertLike?: unknown;
  consoleLike?: unknown;
}): {
  attempted: boolean;
  method: "clipboard" | "fallback" | "fallback-error";
} {
  const source = toRecord(input);
  const text = source.text == null ? "" : String(source.text);
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
        notifyReplayCopySuccess(source);
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
      notifyReplayCopySuccess(source);
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

function resolveReplayModalButton(input: {
  documentLike?: unknown;
  buttonId?: unknown;
}): Record<string, unknown> | null {
  const source = toRecord(input);
  const buttonId = source.buttonId == null ? "" : String(source.buttonId);
  if (!buttonId) return null;
  const documentLike = toRecord(source.documentLike);
  const getElementById = asFunction<(id: string) => unknown>(documentLike.getElementById);
  if (!getElementById) return null;
  const button = getElementById.call(documentLike, buttonId);
  return button ? toRecord(button) : null;
}

function configureReplayDownloadButton(input: {
  replay?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  alertLike?: unknown;
}): { configured: boolean } {
  const source = toRecord(input);
  const button = resolveReplayModalButton({
    documentLike: source.documentLike,
    buttonId: DOWNLOAD_BUTTON_ID
  });
  if (!button) return { configured: false };

  const alertLike = resolveAlert(source);
  const copy = resolveReplayExportCopy(source);
  button.textContent = copy.downloadButton;
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
      alertLike(copy.downloadFailure);
    }
    return result;
  };

  return { configured: true };
}

function openReplayPageFromExport(input: {
  replay?: unknown;
  windowLike?: unknown;
  alertLike?: unknown;
}): { opened: boolean; url?: string } {
  const source = toRecord(input);
  const replay = source.replay == null ? "" : String(source.replay).trim();
  const windowLike = toRecord(resolveWindowLike(source));
  const localStorageLike = resolveStorageLike({
    windowLike,
    storageName: "localStorage"
  });
  const openFn = asFunction<(url: string, target?: string, features?: string) => unknown>(windowLike.open);

  if (!replay || !localStorageLike || !openFn) {
    return { opened: false };
  }

  const handoffId = createReplayPageHandoffId();
  const storageKey = REPLAY_PAGE_HANDOFF_STORAGE_PREFIX + handoffId;
  const payload = JSON.stringify({
    replay_string: replay,
    replay_logic_version: REPLAY_LOGIC_VERSION,
    source: "export_modal"
  });
  if (
    !safeWriteStorageItem({
      storageLike: localStorageLike,
      key: storageKey,
      value: payload
    })
  ) {
    return { opened: false };
  }

  const url =
    "replay.html?" +
    REPLAY_PAGE_HANDOFF_QUERY_FLAG +
    "&" +
    REPLAY_PAGE_HANDOFF_QUERY_KEY +
    "=" +
    encodeURIComponent(handoffId);

  try {
    // Some browsers return null for successful noopener tab opens.
    openFn.call(windowLike, url, "_blank", "noopener");
    return {
      opened: true,
      url
    };
  } catch (_error) {
    safeRemoveStorageItem({
      storageLike: localStorageLike,
      key: storageKey
    });
    return { opened: false };
  }
}

function configureReplayOpenPageButton(input: {
  replay?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  alertLike?: unknown;
}): { configured: boolean } {
  const source = toRecord(input);
  const button = resolveReplayModalButton({
    documentLike: source.documentLike,
    buttonId: OPEN_PAGE_BUTTON_ID
  });
  if (!button) return { configured: false };

  const alertLike = resolveAlert(source);
  const copy = resolveReplayExportCopy(source);
  button.textContent = copy.openPageButton;
  const style = toRecord(button.style);
  style.display = "inline-block";
  button.onclick = function () {
    const result = openReplayPageFromExport({
      replay: source.replay,
      windowLike: source.windowLike,
      alertLike: source.alertLike
    });
    if (!result.opened) {
      alertLike(copy.openPageFailure);
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
  error?: boolean;
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

  let replay = "";
  try {
    replay = String(serialize.call(manager));
  } catch (error) {
    replay = resolveFallbackReplayString(manager);
    if (!replay) {
      const copy = resolveReplayExportCopy(source);
      resolveConsoleError(source)("Replay export failed", error);
      resolveAlert(source)(copy.exportFailure);
      return {
        exported: false,
        error: true
      };
    }
  }
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
    const copy = resolveReplayExportCopy(source);
    showReplayModal(isV1 ? copy.exportV1Title : copy.exportTitle, replay, copy.copyAction, function (text: unknown) {
      return applyReplayClipboardCopy({
        text,
        navigatorLike: source.navigatorLike,
        documentLike: source.documentLike,
        windowLike: source.windowLike,
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
    configureReplayOpenPageButton({
      replay,
      documentLike: source.documentLike,
      windowLike: resolveWindowLike(source),
      alertLike: source.alertLike
    });
  }

  return {
    exported: true,
    replay
  };
}
