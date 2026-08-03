import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerActuatePersistenceRuntime,
  finalizeActuatePersistence,
  installGameManagerActuatePersistenceRuntime,
  type GameManagerActuatePersistenceRuntime
} from "../../src/core/game-manager-actuate-persistence";

describe("core game manager actuate persistence", () => {
  it("publishes a snapshot and saves active non-terminal games", () => {
    const manager = {
      modeKey: "standard",
      over: false,
      clearSavedGameState: vi.fn(),
      tryAutoSubmitOnGameOver: vi.fn()
    };
    const operations = {
      publishSavedStateSyncSnapshot: vi.fn(),
      saveGameState: vi.fn(),
      isTerminalSessionForPersistence: vi.fn(() => false)
    };

    finalizeActuatePersistence(manager, operations);

    expect(operations.publishSavedStateSyncSnapshot).toHaveBeenCalledWith(manager);
    expect(operations.saveGameState).toHaveBeenCalledWith(manager);
    expect(manager.clearSavedGameState).not.toHaveBeenCalled();
    expect(manager.tryAutoSubmitOnGameOver).not.toHaveBeenCalled();
  });

  it("keeps the recovery state while terminal persistence is still in flight", () => {
    const manager = {
      modeKey: "ranked",
      over: false,
      clearSavedGameState: vi.fn(),
      tryAutoSubmitOnGameOver: vi.fn()
    };
    const operations = {
      publishSavedStateSyncSnapshot: vi.fn(),
      saveGameState: vi.fn(),
      isTerminalSessionForPersistence: vi.fn(() => true)
    };

    finalizeActuatePersistence(manager, operations);

    expect(operations.publishSavedStateSyncSnapshot).toHaveBeenCalledWith(manager);
    expect(manager.clearSavedGameState).not.toHaveBeenCalled();
    expect(manager.tryAutoSubmitOnGameOver).toHaveBeenCalledTimes(1);
    expect(operations.saveGameState).not.toHaveBeenCalled();
  });

  it("skips all persistence work when the skip flag is consumed", () => {
    const manager = {
      modeKey: "standard",
      over: true,
      clearSavedGameState: vi.fn(),
      tryAutoSubmitOnGameOver: vi.fn()
    };
    const operations = {
      consumeSkipActuatePersistenceOnce: vi.fn(() => true),
      publishSavedStateSyncSnapshot: vi.fn(),
      saveGameState: vi.fn(),
      isTerminalSessionForPersistence: vi.fn(() => true)
    };

    finalizeActuatePersistence(manager, operations);

    expect(operations.publishSavedStateSyncSnapshot).not.toHaveBeenCalled();
    expect(operations.saveGameState).not.toHaveBeenCalled();
    expect(manager.clearSavedGameState).not.toHaveBeenCalled();
    expect(manager.tryAutoSubmitOnGameOver).not.toHaveBeenCalled();
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerActuatePersistenceRuntime();
    expect(runtime.finalizeActuatePersistence).toBe(finalizeActuatePersistence);

    const windowLike: { CoreGameManagerActuatePersistenceRuntime?: GameManagerActuatePersistenceRuntime } = {};
    expect(installGameManagerActuatePersistenceRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerActuatePersistenceRuntime
    );
    expect(windowLike.CoreGameManagerActuatePersistenceRuntime?.finalizeActuatePersistence).toBe(
      finalizeActuatePersistence
    );

    const existing = { finalizeActuatePersistence: vi.fn() };
    expect(
      installGameManagerActuatePersistenceRuntime({
        windowLike: { CoreGameManagerActuatePersistenceRuntime: existing }
      })
    ).toBe(existing);
  });
});
