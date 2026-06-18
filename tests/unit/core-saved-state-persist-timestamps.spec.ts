import { describe, expect, it, vi } from "vitest";

import {
  applySavedStatePersistTimestamps,
  createSavedStatePersistTimestampsRuntime,
  installSavedStatePersistTimestampsRuntime,
  type SavedStatePersistTimestampsRuntime
} from "../../src/core/saved-state-persist-timestamps";

describe("core saved-state persist timestamps", () => {
  it("updates saved-state timestamps after successful lite persistence", () => {
    const manager: Record<string, unknown> = {
      lastSavedGameStateFullAt: 10
    };

    applySavedStatePersistTimestamps(manager, {
      now: 42.8,
      hasFullPayload: false,
      persistedFull: false
    });

    expect(manager.lastSavedGameStateAt).toBe(42);
    expect(manager.lastSavedGameStateFullAttemptAt).toBeUndefined();
    expect(manager.lastSavedGameStateFullAt).toBe(10);
  });

  it("updates full attempt and full persisted timestamps when a full payload is involved", () => {
    const manager: Record<string, unknown> = {};

    applySavedStatePersistTimestamps(manager, {
      now: 99,
      hasFullPayload: true,
      persistedFull: true
    });

    expect(manager.lastSavedGameStateAt).toBe(99);
    expect(manager.lastSavedGameStateFullAttemptAt).toBe(99);
    expect(manager.lastSavedGameStateFullAt).toBe(99);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSavedStatePersistTimestampsRuntime();
    expect(runtime.applySavedStatePersistTimestamps).toBe(applySavedStatePersistTimestamps);

    const windowLike: { CoreSavedStatePersistTimestampsRuntime?: SavedStatePersistTimestampsRuntime } = {};
    expect(installSavedStatePersistTimestampsRuntime({ windowLike })).toBe(
      windowLike.CoreSavedStatePersistTimestampsRuntime
    );
    expect(windowLike.CoreSavedStatePersistTimestampsRuntime?.applySavedStatePersistTimestamps).toBe(
      applySavedStatePersistTimestamps
    );

    const existing = { applySavedStatePersistTimestamps: vi.fn() };
    expect(
      installSavedStatePersistTimestampsRuntime({
        windowLike: { CoreSavedStatePersistTimestampsRuntime: existing }
      })
    ).toBe(existing);
  });
});
