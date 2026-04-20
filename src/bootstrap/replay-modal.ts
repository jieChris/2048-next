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

function setDisplayStyle(target: unknown, display: string): void {
  const record = toRecord(target);
  const style = toRecord(record.style);
  style.display = display;
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

  setDisplayStyle(modal, "flex");
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
      setDisplayStyle(actionBtnRecord, "inline-block");
      actionBtnRecord.textContent = actionName;
      actionBtnRecord.onclick = function () {
        if (!actionCallback) return undefined;
        const value = textEl ? toRecord(textEl).value : "";
        return actionCallback(value);
      };
    } else {
      setDisplayStyle(actionBtnRecord, "none");
      actionBtnRecord.onclick = null;
    }
  }

  if (downloadBtn) {
    const downloadBtnRecord = toRecord(downloadBtn);
    setDisplayStyle(downloadBtnRecord, "none");
    downloadBtnRecord.onclick = null;
  }

  if (openPageBtn) {
    const openPageBtnRecord = toRecord(openPageBtn);
    setDisplayStyle(openPageBtnRecord, "none");
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

  setDisplayStyle(modal, "none");
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

  setDisplayStyle(modal, "flex");
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

  setDisplayStyle(modal, "none");
  return {
    closed: true
  };
}
