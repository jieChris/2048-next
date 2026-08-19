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

  it("clears terminal state only after the local record is durably saved", async () => {
    let finishLocalSave: (() => void) | null = null;
    const localSave = new Promise<void>((resolve) => {
      finishLocalSave = resolve;
    });
    const manager = {
      modeKey: "ranked",
      over: false,
      clearSavedGameState: vi.fn(),
      tryAutoSubmitOnGameOver: vi.fn(() => localSave)
    };
    const operations = {
      publishSavedStateSyncSnapshot: vi.fn(),
      saveGameState: vi.fn(),
      isTerminalSessionForPersistence: vi.fn(() => true)
    };

    const finalized = finalizeActuatePersistence(manager, operations);

    expect(operations.publishSavedStateSyncSnapshot).toHaveBeenCalledWith(manager);
    expect(manager.clearSavedGameState).not.toHaveBeenCalled();
    expect(manager.tryAutoSubmitOnGameOver).toHaveBeenCalledTimes(1);
    expect(operations.saveGameState).not.toHaveBeenCalled();

    finishLocalSave?.();
    await finalized;

    expect(manager.clearSavedGameState).toHaveBeenCalledWith("ranked");
  });

  it("keeps terminal state recoverable when durable local persistence fails", async () => {
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      over: true,
      clearSavedGameState: vi.fn(),
      tryAutoSubmitOnGameOver: vi.fn(() => Promise.reject(new Error("idb_write_failed")))
    };

    await expect(finalizeActuatePersistence(manager, {})).resolves.toBe(false);
    expect(manager.clearSavedGameState).not.toHaveBeenCalled();
  });

  it("keeps terminal state when the durable history store is unavailable", () => {
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      over: true,
      clearSavedGameState: vi.fn(),
      tryAutoSubmitOnGameOver: vi.fn(() => null)
    };

    expect(finalizeActuatePersistence(manager, {})).toBe(false);
    expect(manager.clearSavedGameState).not.toHaveBeenCalled();
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
