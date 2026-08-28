import { describe, expect, it, vi } from "vitest";

import {
  bindGameManagerSavedStatePersistence,
  createGameManagerSavedStatePersistenceBindingRuntime,
  installGameManagerSavedStatePersistenceBindingRuntime,
  type GameManagerSavedStatePersistenceBindingRuntime,
} from "../../src/core/game-manager-saved-state-persistence-binding";

function createWindowLike() {
  const listeners = new Map<string, Array<() => void>>();
  const documentListeners = new Map<string, Array<() => void>>();
  const windowLike = {
    addEventListener: vi.fn((eventName: string, handler: () => void) => {
      listeners.set(eventName, [...(listeners.get(eventName) || []), handler]);
    }),
    document: {
      addEventListener: vi.fn((eventName: string, handler: () => void) => {
        documentListeners.set(eventName, [
          ...(documentListeners.get(eventName) || []),
          handler,
        ]);
      }),
    },
    OnlineLeaderboardRuntime: {
      persistRankedCheckpointOnPageHide: vi.fn(),
    },
    emit(eventName: string) {
      for (const handler of listeners.get(eventName) || []) handler();
    },
    listeners,
    documentListeners,
  };
  return windowLike;
}

describe("core game manager saved state persistence binding", () => {
  it("no-ops when persistence binding preconditions are missing", () => {
    const operations = {
      saveGameState: vi.fn(),
      bindSavedStateSyncStorageListener: vi.fn(),
    };

    bindGameManagerSavedStatePersistence(null, operations);
    bindGameManagerSavedStatePersistence(
      { getWindowLike: () => null },
      operations,
    );
    bindGameManagerSavedStatePersistence(
      { savedGameStateBound: true, getWindowLike: createWindowLike },
      operations,
    );

    expect(operations.saveGameState).not.toHaveBeenCalled();
    expect(operations.bindSavedStateSyncStorageListener).not.toHaveBeenCalled();
  });

  it("binds page lifecycle persistence once and saves forced state on page exit", () => {
    const windowLike = createWindowLike();
    const manager = {
      savedGameStateBound: false,
      getWindowLike: vi.fn(() => windowLike),
    };
    const operations = {
      saveGameState: vi.fn(),
      bindSavedStateSyncStorageListener: vi.fn(),
    };

    bindGameManagerSavedStatePersistence(manager, operations);

    expect(windowLike.addEventListener).toHaveBeenNthCalledWith(
      1,
      "beforeunload",
      expect.any(Function),
    );
    expect(windowLike.addEventListener).toHaveBeenNthCalledWith(
      2,
      "pagehide",
      expect.any(Function),
    );
    expect(operations.bindSavedStateSyncStorageListener).toHaveBeenCalledWith(
      manager,
      windowLike,
    );
    expect(manager.savedGameStateBound).toBe(true);

    const beforeUnloadHandler = windowLike.addEventListener.mock.calls[0][1];
    const pageHideHandler = windowLike.addEventListener.mock.calls[1][1];
    expect(beforeUnloadHandler).toBe(pageHideHandler);

    windowLike.emit("pagehide");

    expect(operations.saveGameState).toHaveBeenCalledWith(manager, {
      force: true,
    });
    expect(
      windowLike.OnlineLeaderboardRuntime.persistRankedCheckpointOnPageHide,
    ).toHaveBeenCalledWith(manager);
  });

  it("also flushes on document visibility changes before iOS suspends the page", () => {
    const windowLike = createWindowLike();
    const manager = {
      savedGameStateBound: false,
      getWindowLike: vi.fn(() => windowLike),
    };
    const operations = {
      saveGameState: vi.fn(),
      bindSavedStateSyncStorageListener: vi.fn(),
    };

    bindGameManagerSavedStatePersistence(manager, operations);
    const visibilityHandler =
      windowLike.document.addEventListener.mock.calls.find(
        ([eventName]) => eventName === "visibilitychange",
      )?.[1];

    expect(visibilityHandler).toEqual(expect.any(Function));
    visibilityHandler?.();
    expect(operations.saveGameState).toHaveBeenCalledWith(manager, {
      force: true,
    });
  });

  it("swallows ranked checkpoint persistence errors during page exit save", () => {
    const windowLike = createWindowLike();
    windowLike.OnlineLeaderboardRuntime.persistRankedCheckpointOnPageHide.mockImplementation(
      () => {
        throw new Error("checkpoint failed");
      },
    );
    const manager = {
      savedGameStateBound: false,
      getWindowLike: vi.fn(() => windowLike),
    };
    const operations = {
      saveGameState: vi.fn(),
      bindSavedStateSyncStorageListener: vi.fn(),
    };

    bindGameManagerSavedStatePersistence(manager, operations);

    expect(() => windowLike.emit("beforeunload")).not.toThrow();
    expect(operations.saveGameState).toHaveBeenCalledWith(manager, {
      force: true,
    });
  });

  it("does not overwrite saved state when setup was rejected by the single-mode lock", () => {
    const windowLike = createWindowLike();
    const manager = {
      savedGameStateBound: false,
      singleModePageLockRejected: true,
      getWindowLike: vi.fn(() => windowLike),
    };
    const operations = {
      saveGameState: vi.fn(),
      bindSavedStateSyncStorageListener: vi.fn(),
    };

    bindGameManagerSavedStatePersistence(manager, operations);
    windowLike.emit("pagehide");

    expect(operations.saveGameState).not.toHaveBeenCalled();
    expect(
      windowLike.OnlineLeaderboardRuntime.persistRankedCheckpointOnPageHide,
    ).not.toHaveBeenCalled();
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerSavedStatePersistenceBindingRuntime();
    expect(runtime.bindGameManagerSavedStatePersistence).toBe(
      bindGameManagerSavedStatePersistence,
    );

    const windowLike: {
      CoreGameManagerSavedStatePersistenceBindingRuntime?: GameManagerSavedStatePersistenceBindingRuntime;
    } = {};
    expect(
      installGameManagerSavedStatePersistenceBindingRuntime({ windowLike }),
    ).toBe(windowLike.CoreGameManagerSavedStatePersistenceBindingRuntime);
    expect(
      windowLike.CoreGameManagerSavedStatePersistenceBindingRuntime
        ?.bindGameManagerSavedStatePersistence,
    ).toBe(bindGameManagerSavedStatePersistence);

    const existing = { bindGameManagerSavedStatePersistence: vi.fn() };
    expect(
      installGameManagerSavedStatePersistenceBindingRuntime({
        windowLike: {
          CoreGameManagerSavedStatePersistenceBindingRuntime: existing,
        },
      }),
    ).toBe(existing);
  });
});
