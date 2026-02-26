import { describe, expect, it, vi } from "vitest";

import {
  applyReplayExportPageAction,
  applyReplayModalPageClose,
  applyReplayModalPageOpen
} from "../../src/bootstrap/replay-page-host";

describe("bootstrap replay page host", () => {
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
});
