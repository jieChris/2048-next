import { describe, expect, it, vi } from "vitest";

import {
  createSavedStateSyncPublishRuntime,
  installSavedStateSyncPublishRuntime,
  publishSavedStateSyncSnapshot,
  type SavedStateSyncPublishRuntime
} from "../../src/core/saved-state-sync-publish";

function createOperations(overrides: Record<string, unknown> = {}) {
  return {
    buildSavedStateSyncEventPayload: vi.fn(() => ({ saved_at: 1234, state: { score: 8 } })),
    canWriteToStorage: vi.fn(() => true),
    rememberSavedStateKnownSavedAt: vi.fn(),
    resolveSavedGameStateSyncStorageKey: vi.fn(() => "sync-key"),
    shouldSkipSavedStateSyncPublishByThrottle: vi.fn(() => false),
    shouldUseSavedGameState: vi.fn(() => true),
    writeStorageJsonPayload: vi.fn(() => true),
    ...overrides
  };
}

describe("core saved state sync publish runtime", () => {
  it("publishes the saved-state sync snapshot and records the write timestamp", () => {
    const storage = { id: "localStorage" };
    const manager = {
      replayMode: false,
      getWebStorageByName: vi.fn(() => storage)
    };
    const operations = createOperations();

    expect(publishSavedStateSyncSnapshot(manager, operations, 50_000)).toBe(true);

    expect(operations.shouldUseSavedGameState).toHaveBeenCalledWith(manager);
    expect(operations.shouldSkipSavedStateSyncPublishByThrottle).toHaveBeenCalledWith(
      manager,
      50_000
    );
    expect(manager.getWebStorageByName).toHaveBeenCalledWith("localStorage");
    expect(operations.canWriteToStorage).toHaveBeenCalledWith(storage);
    expect(operations.resolveSavedGameStateSyncStorageKey).toHaveBeenCalledWith(manager);
    expect(operations.buildSavedStateSyncEventPayload).toHaveBeenCalledWith(manager, 50_000);
    expect(operations.writeStorageJsonPayload).toHaveBeenCalledWith(storage, "sync-key", {
      saved_at: 1234,
      state: { score: 8 }
    });
    expect(manager.lastSavedStateSyncPublishedAt).toBe(50_000);
    expect(operations.rememberSavedStateKnownSavedAt).toHaveBeenCalledWith(manager, 1234);
  });

  it("does not publish while replay mode is active", () => {
    const manager = {
      replayMode: true,
      getWebStorageByName: vi.fn()
    };
    const operations = createOperations();

    expect(publishSavedStateSyncSnapshot(manager, operations, 50_000)).toBe(false);

    expect(manager.getWebStorageByName).not.toHaveBeenCalled();
    expect(operations.writeStorageJsonPayload).not.toHaveBeenCalled();
  });

  it("does not record publish metadata when the storage write fails", () => {
    const manager = {
      replayMode: false,
      getWebStorageByName: vi.fn(() => ({}))
    };
    const operations = createOperations({
      writeStorageJsonPayload: vi.fn(() => false)
    });

    expect(publishSavedStateSyncSnapshot(manager, operations, 50_000)).toBe(false);

    expect(manager.lastSavedStateSyncPublishedAt).toBeUndefined();
    expect(operations.rememberSavedStateKnownSavedAt).not.toHaveBeenCalled();
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSavedStateSyncPublishRuntime();
    expect(runtime.publishSavedStateSyncSnapshot).toBe(publishSavedStateSyncSnapshot);

    const windowLike: { CoreSavedStateSyncPublishRuntime?: SavedStateSyncPublishRuntime } = {};
    expect(installSavedStateSyncPublishRuntime({ windowLike })).toBe(
      windowLike.CoreSavedStateSyncPublishRuntime
    );
    expect(windowLike.CoreSavedStateSyncPublishRuntime?.publishSavedStateSyncSnapshot).toBe(
      publishSavedStateSyncSnapshot
    );

    const existing = { publishSavedStateSyncSnapshot: vi.fn() };
    expect(
      installSavedStateSyncPublishRuntime({
        windowLike: { CoreSavedStateSyncPublishRuntime: existing }
      })
    ).toBe(existing);
  });
});
