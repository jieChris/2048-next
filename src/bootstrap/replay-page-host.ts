function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface ReplayModalPageOpenResult {
  hasApplyOpenApi: boolean;
  didApply: boolean;
}

export function applyReplayModalPageOpen(input: {
  replayModalRuntime?: unknown;
  documentLike?: unknown;
  title?: unknown;
  content?: unknown;
  actionName?: unknown;
  actionCallback?: unknown;
  closeCallback?: unknown;
}): ReplayModalPageOpenResult {
  const source = toRecord(input);
  const modalRuntime = toRecord(source.replayModalRuntime);
  const applyOpen = asFunction<(payload: unknown) => unknown>(modalRuntime.applyReplayModalOpen);
  if (!applyOpen) {
    return {
      hasApplyOpenApi: false,
      didApply: false
    };
  }

  applyOpen({
    documentLike: source.documentLike,
    title: source.title,
    content: source.content,
    actionName: source.actionName,
    actionCallback: source.actionCallback,
    closeCallback: source.closeCallback
  });

  return {
    hasApplyOpenApi: true,
    didApply: true
  };
}

export interface ReplayModalPageCloseResult {
  hasApplyCloseApi: boolean;
  didApply: boolean;
}

export function applyReplayModalPageClose(input: {
  replayModalRuntime?: unknown;
  documentLike?: unknown;
}): ReplayModalPageCloseResult {
  const source = toRecord(input);
  const modalRuntime = toRecord(source.replayModalRuntime);
  const applyClose = asFunction<(payload: unknown) => unknown>(modalRuntime.applyReplayModalClose);
  if (!applyClose) {
    return {
      hasApplyCloseApi: false,
      didApply: false
    };
  }

  applyClose({
    documentLike: source.documentLike
  });

  return {
    hasApplyCloseApi: true,
    didApply: true
  };
}

export interface ReplayExportPageResult {
  hasApplyExportApi: boolean;
  didApply: boolean;
}

export function applyReplayExportPageAction(input: {
  replayExportRuntime?: unknown;
  gameManager?: unknown;
  showReplayModal?: unknown;
  navigatorLike?: unknown;
  documentLike?: unknown;
  alertLike?: unknown;
  consoleLike?: unknown;
}): ReplayExportPageResult {
  const source = toRecord(input);
  const exportRuntime = toRecord(source.replayExportRuntime);
  const applyExport = asFunction<(payload: unknown) => unknown>(exportRuntime.applyReplayExport);
  if (!applyExport) {
    return {
      hasApplyExportApi: false,
      didApply: false
    };
  }

  applyExport({
    gameManager: source.gameManager,
    showReplayModal: source.showReplayModal,
    navigatorLike: source.navigatorLike,
    documentLike: source.documentLike,
    alertLike: source.alertLike,
    consoleLike: source.consoleLike
  });

  return {
    hasApplyExportApi: true,
    didApply: true
  };
}
