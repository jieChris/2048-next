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
  const modal = toRecord(getElementById("replay-modal"));
  if (!Object.keys(modal).length) {
    return {
      opened: false
    };
  }

  const titleEl = toRecord(getElementById("replay-modal-title"));
  const textEl = toRecord(getElementById("replay-textarea"));
  const actionBtn = toRecord(getElementById("replay-action-btn"));
  const querySelector = asFunction<(selector: unknown) => unknown>(modal.querySelector);
  const closeBtn = toRecord(
    querySelector ? querySelector.call(modal, ".replay-button:not(#replay-action-btn)") : null
  );

  setDisplayStyle(modal, "flex");
  if (Object.keys(titleEl).length) {
    titleEl.textContent = source.title == null ? "" : String(source.title);
  }
  if (Object.keys(textEl).length) {
    textEl.value = source.content == null ? "" : String(source.content);
  }

  const actionCallback = asFunction<(text: unknown) => unknown>(source.actionCallback);
  const actionName = source.actionName == null ? "" : String(source.actionName);
  if (Object.keys(actionBtn).length) {
    if (actionName) {
      setDisplayStyle(actionBtn, "inline-block");
      actionBtn.textContent = actionName;
      actionBtn.onclick = function () {
        if (!actionCallback) return undefined;
        const value = Object.keys(textEl).length ? textEl.value : "";
        return actionCallback(value);
      };
    } else {
      setDisplayStyle(actionBtn, "none");
      actionBtn.onclick = null;
    }
  }

  const closeCallback = asFunction<() => unknown>(source.closeCallback);
  if (Object.keys(closeBtn).length && closeCallback) {
    closeBtn.onclick = closeCallback;
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
  const modal = toRecord(getElementById("replay-modal"));
  if (!Object.keys(modal).length) {
    return {
      closed: false
    };
  }

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
  const modal = toRecord(getElementById("settings-modal"));
  if (!Object.keys(modal).length) {
    return {
      opened: false
    };
  }

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
  const modal = toRecord(getElementById("settings-modal"));
  if (!Object.keys(modal).length) {
    return {
      closed: false
    };
  }

  setDisplayStyle(modal, "none");
  return {
    closed: true
  };
}
