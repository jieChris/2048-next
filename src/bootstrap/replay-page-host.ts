function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveManagerFromWindow(windowLike: unknown): unknown {
  const windowRecord = toRecord(windowLike);
  return windowRecord.game_manager || null;
}

export interface ReplayPageActionResolvers {
  showReplayModal: (
    title?: unknown,
    content?: unknown,
    actionName?: unknown,
    actionCallback?: unknown
  ) => unknown;
  closeReplayModal: () => unknown;
  exportReplay: () => unknown;
}

export function createReplayPageActionResolvers(input: {
  replayPageHostRuntime?: unknown;
  replayModalRuntime?: unknown;
  replayExportRuntime?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  navigatorLike?: unknown;
  alertLike?: unknown;
  consoleLike?: unknown;
}): ReplayPageActionResolvers {
  const source = toRecord(input);
  const pageHostRuntime = toRecord(source.replayPageHostRuntime);
  const windowLike = source.windowLike || null;

  function closeReplayModal(): unknown {
    const applyClose = asFunction<(payload: unknown) => unknown>(
      pageHostRuntime.applyReplayModalPageClose
    );
    if (applyClose) {
      return applyClose({
        replayModalRuntime: source.replayModalRuntime,
        documentLike: source.documentLike
      });
    }
    return applyReplayModalPageClose({
      replayModalRuntime: source.replayModalRuntime,
      documentLike: source.documentLike
    });
  }

  function showReplayModal(
    title?: unknown,
    content?: unknown,
    actionName?: unknown,
    actionCallback?: unknown
  ): unknown {
    const applyOpen = asFunction<(payload: unknown) => unknown>(
      pageHostRuntime.applyReplayModalPageOpen
    );
    if (applyOpen) {
      return applyOpen({
        replayModalRuntime: source.replayModalRuntime,
        documentLike: source.documentLike,
        title,
        content,
        actionName,
        actionCallback,
        closeCallback: closeReplayModal
      });
    }
    return applyReplayModalPageOpen({
      replayModalRuntime: source.replayModalRuntime,
      documentLike: source.documentLike,
      title,
      content,
      actionName,
      actionCallback,
      closeCallback: closeReplayModal
    });
  }

  function exportReplay(): unknown {
    const applyExportFromContext = asFunction<(payload: unknown) => unknown>(
      pageHostRuntime.applyReplayExportPageActionFromContext
    );
    if (applyExportFromContext) {
      return applyExportFromContext({
        replayExportRuntime: source.replayExportRuntime,
        windowLike,
        showReplayModal,
        navigatorLike: source.navigatorLike,
        documentLike: source.documentLike,
        alertLike: source.alertLike,
        consoleLike: source.consoleLike
      });
    }
    return applyReplayExportPageActionFromContext({
      replayExportRuntime: source.replayExportRuntime,
      windowLike,
      showReplayModal,
      navigatorLike: source.navigatorLike,
      documentLike: source.documentLike,
      alertLike: source.alertLike,
      consoleLike: source.consoleLike
    });
  }

  return {
    showReplayModal,
    closeReplayModal,
    exportReplay
  };
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

export interface ReplayExportPageFromContextResult {
  didInvokeExport: boolean;
  managerResolved: boolean;
  exportResult: ReplayExportPageResult;
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

export function applyReplayExportPageActionFromContext(input: {
  replayExportRuntime?: unknown;
  windowLike?: unknown;
  showReplayModal?: unknown;
  navigatorLike?: unknown;
  documentLike?: unknown;
  alertLike?: unknown;
  consoleLike?: unknown;
}): ReplayExportPageFromContextResult {
  const source = toRecord(input);
  const gameManager = resolveManagerFromWindow(source.windowLike);
  const exportResult = applyReplayExportPageAction({
    replayExportRuntime: source.replayExportRuntime,
    gameManager,
    showReplayModal: source.showReplayModal,
    navigatorLike: source.navigatorLike,
    documentLike: source.documentLike,
    alertLike: source.alertLike,
    consoleLike: source.consoleLike
  });

  return {
    didInvokeExport: exportResult.didApply,
    managerResolved: !!gameManager,
    exportResult
  };
}
