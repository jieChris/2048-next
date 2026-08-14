import { describe, expect, it, vi } from "vitest";

import {
  createSavedPayloadPersistFallbackRuntime,
  installSavedPayloadPersistFallbackRuntime,
  persistSavedPayloadWithLiteFallback,
  type SavedPayloadPersistFallbackRuntime
} from "../../src/core/saved-payload-persist-fallback";

describe("core saved payload persist fallback", () => {
  it("persists full first and always mirrors the lite payload", () => {
    const persistPayload = vi.fn(() => true);
    const clearSavedState = vi.fn();
    const manager = { modeKey: "practice" };
    const fullPayload = { kind: "full" };
    const litePayload = { kind: "lite" };

    expect(
      persistSavedPayloadWithLiteFallback(
        { manager, key: "full-key", liteKey: "lite-key", fullPayload, litePayload },
        { persistPayload, clearSavedState }
      )
    ).toEqual({ persisted: true, persistedFull: true });

    expect(persistPayload).toHaveBeenNthCalledWith(1, manager, "full-key", fullPayload);
    expect(persistPayload).toHaveBeenNthCalledWith(2, manager, "lite-key", litePayload);
    expect(clearSavedState).not.toHaveBeenCalled();
  });

  it("falls back to lite payload writes after full and lite writes fail", () => {
    const persistPayload = vi.fn((_manager, key: string) => {
      if (key === "full-key") return false;
      return persistPayload.mock.calls.length >= 4;
    });
    const clearSavedState = vi.fn();
    const manager = { modeKey: "standard" };
    const litePayload = { kind: "lite" };

    expect(
      persistSavedPayloadWithLiteFallback(
        { manager, key: "full-key", liteKey: "lite-key", fullPayload: { kind: "full" }, litePayload },
        { persistPayload, clearSavedState }
      )
    ).toEqual({ persisted: true, persistedFull: false });

    expect(clearSavedState).toHaveBeenCalledWith(manager, "standard");
    expect(persistPayload.mock.calls.map((call) => call[1])).toEqual([
      "full-key",
      "full-key",
      "lite-key",
      "full-key",
      "lite-key"
    ]);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSavedPayloadPersistFallbackRuntime();
    expect(runtime.persistSavedPayloadWithLiteFallback).toBe(persistSavedPayloadWithLiteFallback);

    const windowLike: { CoreSavedPayloadPersistFallbackRuntime?: SavedPayloadPersistFallbackRuntime } = {};
    expect(installSavedPayloadPersistFallbackRuntime({ windowLike })).toBe(
      windowLike.CoreSavedPayloadPersistFallbackRuntime
    );
    expect(windowLike.CoreSavedPayloadPersistFallbackRuntime?.persistSavedPayloadWithLiteFallback).toBe(
      persistSavedPayloadWithLiteFallback
    );

    const existing = { persistSavedPayloadWithLiteFallback: vi.fn() };
    expect(
      installSavedPayloadPersistFallbackRuntime({
        windowLike: { CoreSavedPayloadPersistFallbackRuntime: existing }
      })
    ).toBe(existing);
  });
});
