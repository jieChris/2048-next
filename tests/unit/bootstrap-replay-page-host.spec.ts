import { describe, expect, it, vi } from "vitest";

import {
  createReplayPageActionResolvers,
  applyReplayExportPageAction,
  applyReplayExportPageActionFromContext,
  applyReplayModalPageClose,
  applyReplayModalPageOpen
} from "../../src/bootstrap/replay-page-host";

describe("bootstrap replay page host", () => {
  it("creates replay page action resolvers with safe fallbacks", () => {
    const resolvers = createReplayPageActionResolvers({});
    expect(typeof resolvers.showReplayModal).toBe("function");
    expect(typeof resolvers.closeReplayModal).toBe("function");
    expect(typeof resolvers.exportReplay).toBe("function");
    expect(resolvers.showReplayModal()).toEqual({
      hasApplyOpenApi: false,
      didApply: false
    });
    expect(resolvers.closeReplayModal()).toEqual({
      hasApplyCloseApi: false,
      didApply: false
    });
    expect(resolvers.exportReplay()).toEqual({
      didInvokeExport: false,
      managerResolved: false,
      exportResult: {
        hasApplyExportApi: false,
        didApply: false
      }
    });
  });

  it("delegates replay page actions through page host runtime methods", () => {
    const applyReplayModalPageOpen = vi.fn();
    const applyReplayModalPageClose = vi.fn();
    const applyReplayExportPageActionFromContext = vi.fn();
    const actionCallback = vi.fn();
    const replayModalRuntime = { id: "modal-runtime" };
    const replayExportRuntime = { id: "export-runtime" };
    const documentLike = { id: "document" };
    const windowLike = { id: "window" };
    const navigatorLike = { id: "navigator" };
    const alertLike = vi.fn();
    const consoleLike = { warn: vi.fn() };

    const resolvers = createReplayPageActionResolvers({
      replayPageHostRuntime: {
        applyReplayModalPageOpen,
        applyReplayModalPageClose,
        applyReplayExportPageActionFromContext
      },
      replayModalRuntime,
      replayExportRuntime,
      documentLike,
      windowLike,
      navigatorLike,
      alertLike,
      consoleLike
    });

    resolvers.showReplayModal("title", "content", "action", actionCallback);
    resolvers.closeReplayModal();
    resolvers.exportReplay();

    expect(applyReplayModalPageOpen).toHaveBeenCalledWith({
      replayModalRuntime,
      documentLike,
      title: "title",
      content: "content",
      actionName: "action",
      actionCallback,
      closeCallback: expect.any(Function)
    });
    expect(applyReplayModalPageClose).toHaveBeenCalledWith({
      replayModalRuntime,
      documentLike
    });
    expect(applyReplayExportPageActionFromContext).toHaveBeenCalledWith({
      replayExportRuntime,
      windowLike,
      showReplayModal: expect.any(Function),
      navigatorLike,
      documentLike,
      alertLike,
      consoleLike
    });
  });

  it("returns false result when replay modal open api is missing", () => {
    const result = applyReplayModalPageOpen({ replayModalRuntime: {} });

    expect(result).toEqual({
      hasApplyOpenApi: false,
      didApply: false
    });
  });

  it("delegates replay modal open orchestration", () => {
    const applyReplayModalOpen = vi.fn();
    const documentLike = { id: "document" };
    const closeCallback = vi.fn();
    const actionCallback = vi.fn();

    const result = applyReplayModalPageOpen({
      replayModalRuntime: {
        applyReplayModalOpen
      },
      documentLike,
      title: "title",
      content: "content",
      actionName: "action",
      actionCallback,
      closeCallback
    });

    expect(applyReplayModalOpen).toHaveBeenCalledWith({
      documentLike,
      title: "title",
      content: "content",
      actionName: "action",
      actionCallback,
      closeCallback
    });
    expect(result).toEqual({
      hasApplyOpenApi: true,
      didApply: true
    });
  });

  it("delegates replay modal close orchestration", () => {
    const applyReplayModalClose = vi.fn();
    const documentLike = { id: "document" };

    const result = applyReplayModalPageClose({
      replayModalRuntime: {
        applyReplayModalClose
      },
      documentLike
    });

    expect(applyReplayModalClose).toHaveBeenCalledWith({
      documentLike
    });
    expect(result).toEqual({
      hasApplyCloseApi: true,
      didApply: true
    });
  });

  it("delegates replay export orchestration", () => {
    const applyReplayExport = vi.fn();
    const showReplayModal = vi.fn();
    const gameManager = { id: "manager" };
    const navigatorLike = { id: "navigator" };
    const documentLike = { id: "document" };
    const alertLike = vi.fn();
    const consoleLike = { warn: vi.fn() };

    const result = applyReplayExportPageAction({
      replayExportRuntime: {
        applyReplayExport
      },
      gameManager,
      showReplayModal,
      navigatorLike,
      documentLike,
      alertLike,
      consoleLike
    });

    expect(applyReplayExport).toHaveBeenCalledWith({
      gameManager,
      showReplayModal,
      navigatorLike,
      documentLike,
      alertLike,
      consoleLike
    });
    expect(result).toEqual({
      hasApplyExportApi: true,
      didApply: true
    });
  });

  it("resolves manager from window context and delegates replay export orchestration", () => {
    const applyReplayExport = vi.fn();
    const showReplayModal = vi.fn();
    const gameManager = { id: "manager" };
    const navigatorLike = { id: "navigator" };
    const documentLike = { id: "document" };
    const alertLike = vi.fn();
    const consoleLike = { warn: vi.fn() };

    const result = applyReplayExportPageActionFromContext({
      replayExportRuntime: {
        applyReplayExport
      },
      windowLike: {
        game_manager: gameManager
      },
      showReplayModal,
      navigatorLike,
      documentLike,
      alertLike,
      consoleLike
    });

    expect(applyReplayExport).toHaveBeenCalledWith({
      gameManager,
      showReplayModal,
      navigatorLike,
      documentLike,
      alertLike,
      consoleLike
    });
    expect(result).toEqual({
      didInvokeExport: true,
      managerResolved: true,
      exportResult: {
        hasApplyExportApi: true,
        didApply: true
      }
    });
  });
});
