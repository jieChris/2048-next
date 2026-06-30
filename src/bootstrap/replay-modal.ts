function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveGetElementById(input: {
  documentLike?: unknown;
  getElementById?: unknown;
}): (id: unknown) => unknown {
  const source = toRecord(input);
  const documentLike = toRecord(source.documentLike);
  const sourceGetElementById = asFunction<(id: unknown) => unknown>(source.getElementById);
  if (sourceGetElementById) {
    return sourceGetElementById;
  }

  const documentGetElementById = asFunction<(id: unknown) => unknown>(documentLike.getElementById);
  return function (id: unknown) {
    return documentGetElementById ? documentGetElementById.call(documentLike, id) : null;
  };
}

const HIDDEN_CLASS_NAME = "is-hidden";

function hasClassName(target: unknown, className: string): boolean {
  const record = toRecord(target);
  const classList = toRecord(record.classList);
  const contains = asFunction<(value: string) => boolean>(classList.contains);
  if (contains) return !!contains.call(classList, className);
  const current = typeof record.className === "string" ? record.className : "";
  return (" " + current + " ").indexOf(" " + className + " ") >= 0;
}

function addClassName(target: unknown, className: string): boolean {
  const record = toRecord(target);
  const classList = toRecord(record.classList);
  const add = asFunction<(value: string) => unknown>(classList.add);
  if (add) {
    add.call(classList, className);
    return true;
  }
  if (typeof record.className !== "string") return false;
  if (hasClassName(record, className)) return true;
  const current = record.className.trim();
  record.className = current ? current + " " + className : className;
  return true;
}

function removeClassName(target: unknown, className: string): boolean {
  const record = toRecord(target);
  const classList = toRecord(record.classList);
  const remove = asFunction<(value: string) => unknown>(classList.remove);
  if (remove) {
    remove.call(classList, className);
    return true;
  }
  if (typeof record.className !== "string") return false;
  if (!hasClassName(record, className)) return true;
  record.className = record.className
    .split(/\s+/)
    .filter((name) => name && name !== className)
    .join(" ");
  return true;
}

function setHiddenState(target: unknown, hidden: boolean, fallbackVisibleDisplay: string): void {
  const record = toRecord(target);
  const didUpdateClass = hidden
    ? addClassName(record, HIDDEN_CLASS_NAME)
    : removeClassName(record, HIDDEN_CLASS_NAME);
  const style = toRecord(record.style);
  if (didUpdateClass) {
    if (!hidden && style.display === "none") {
      style.display = "";
    }
    return;
  }
  style.display = hidden ? "none" : fallbackVisibleDisplay;
}

function bindModalOverlayClose(modalNode: unknown, closeCallback: (() => unknown) | null): void {
  const modal = toRecord(modalNode);
  if (!closeCallback) {
    modal.onclick = null;
    return;
  }
  modal.onclick = function (eventLike: unknown) {
    const eventRecord = toRecord(eventLike);
    if (eventRecord.target && eventRecord.target !== modalNode) return undefined;
    return closeCallback();
  };
}

export function applyReplayModalOpen(input: {
  documentLike?: unknown;
  getElementById?: unknown;
  title?: unknown;
  content?: unknown;
  actionName?: unknown;
  actionCallback?: unknown;
  closeCallback?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const getElementById = resolveGetElementById(source);
  const modalNode = getElementById("replay-modal");
  if (!modalNode) {
    return {
      opened: false
    };
  }
  const modal = toRecord(modalNode);

  const titleEl = getElementById("replay-modal-title");
  const textEl = getElementById("replay-textarea");
  const actionBtn = getElementById("replay-action-btn");
  const downloadBtn = getElementById("replay-download-btn");
  const openPageBtn = getElementById("replay-open-page-btn");
  const closeBtn = getElementById("replay-close-btn");

  setHiddenState(modal, false, "flex");
  if (titleEl) {
    toRecord(titleEl).textContent = source.title == null ? "" : String(source.title);
  }
  if (textEl) {
    toRecord(textEl).value = source.content == null ? "" : String(source.content);
  }

  const actionCallback = asFunction<(text: unknown) => unknown>(source.actionCallback);
  const actionName = source.actionName == null ? "" : String(source.actionName);
  if (actionBtn) {
    const actionBtnRecord = toRecord(actionBtn);
    if (actionName) {
      setHiddenState(actionBtnRecord, false, "inline-block");
      actionBtnRecord.textContent = actionName;
      actionBtnRecord.onclick = function () {
        if (!actionCallback) return undefined;
        const value = textEl ? toRecord(textEl).value : "";
        return actionCallback(value);
      };
    } else {
      setHiddenState(actionBtnRecord, true, "inline-block");
      actionBtnRecord.onclick = null;
    }
  }

  if (downloadBtn) {
    const downloadBtnRecord = toRecord(downloadBtn);
    setHiddenState(downloadBtnRecord, true, "inline-block");
    downloadBtnRecord.onclick = null;
  }

  if (openPageBtn) {
    const openPageBtnRecord = toRecord(openPageBtn);
    setHiddenState(openPageBtnRecord, true, "inline-block");
    openPageBtnRecord.onclick = null;
  }

  const closeCallback = asFunction<() => unknown>(source.closeCallback);
  bindModalOverlayClose(modalNode, closeCallback);
  if (closeBtn) {
    toRecord(closeBtn).onclick = closeCallback || null;
  }

  return {
    opened: true,
    hasActionButton: !!actionName
  };
}

export function applyReplayModalClose(input: {
  documentLike?: unknown;
  getElementById?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const getElementById = resolveGetElementById(source);
  const modalNode = getElementById("replay-modal");
  if (!modalNode) {
    return {
      closed: false
    };
  }
  const modal = toRecord(modalNode);

  setHiddenState(modal, true, "flex");
  return {
    closed: true
  };
}

export function applySettingsModalOpen(input: {
  documentLike?: unknown;
  getElementById?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const getElementById = resolveGetElementById(source);
  const modalNode = getElementById("settings-modal");
  if (!modalNode) {
    return {
      opened: false
    };
  }
  const modal = toRecord(modalNode);

  setHiddenState(modal, false, "flex");
  return {
    opened: true
  };
}

export function applySettingsModalClose(input: {
  documentLike?: unknown;
  getElementById?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const getElementById = resolveGetElementById(source);
  const modalNode = getElementById("settings-modal");
  if (!modalNode) {
    return {
      closed: false
    };
  }
  const modal = toRecord(modalNode);

  setHiddenState(modal, true, "flex");
  return {
    closed: true
  };
}

export interface ReplayModalRuntime {
  applyReplayModalOpen: typeof applyReplayModalOpen;
  applyReplayModalClose: typeof applyReplayModalClose;
  applySettingsModalOpen: typeof applySettingsModalOpen;
  applySettingsModalClose: typeof applySettingsModalClose;
}

export interface ReplayModalRuntimeWindowLike {
  CoreReplayModalRuntime?: ReplayModalRuntime;
}

export interface ReplayModalRuntimeInstallOptions {
  windowLike?: ReplayModalRuntimeWindowLike | null | undefined;
}

export function createReplayModalRuntime(): ReplayModalRuntime {
  return {
    applyReplayModalOpen,
    applyReplayModalClose,
    applySettingsModalOpen,
    applySettingsModalClose
  };
}

export function installReplayModalRuntime(
  options: ReplayModalRuntimeInstallOptions = {}
): ReplayModalRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as ReplayModalRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayModalRuntime) {
    windowLike.CoreReplayModalRuntime = createReplayModalRuntime();
  }
  return windowLike.CoreReplayModalRuntime || null;
}
