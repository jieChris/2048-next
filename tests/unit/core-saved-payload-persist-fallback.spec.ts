import { describe, expect, it, vi } from "vitest";

import {
  createSavedPayloadPersistFallbackRuntime,
  installSavedPayloadPersistFallbackRuntime,
  persistSavedPayloadWithLiteFallback,
  type SavedPayloadPersistFallbackRuntime
} from "../../src/core/saved-payload-persist-fallback";

describe("core saved payload persist fallback", () => {
  it("keeps only the full payload after a successful full write", () => {
    const persistPayload = vi.fn(() => true);
    const removePayload = vi.fn();
    const manager = { modeKey: "practice" };
    const fullPayload = { kind: "full" };
    const litePayload = { kind: "lite" };

    expect(
      persistSavedPayloadWithLiteFallback(
        { manager, key: "full-key", liteKey: "lite-key", fullPayload, litePayload },
        { persistPayload, removePayload }
      )
    ).toEqual({ persisted: true, persistedFull: true });

    expect(persistPayload).toHaveBeenCalledOnce();
    expect(persistPayload).toHaveBeenCalledWith(manager, "full-key", fullPayload);
    expect(removePayload).toHaveBeenCalledWith(manager, "lite-key");
  });

  it("writes only the lite key when the full write fails", () => {
    const persistPayload = vi.fn((_manager, key: string) => key === "lite-key");
    const removePayload = vi.fn();
    const manager = { modeKey: "standard" };
    const fullPayload = { kind: "full" };
    const litePayload = { kind: "lite" };

    expect(
      persistSavedPayloadWithLiteFallback(
        { manager, key: "full-key", liteKey: "lite-key", fullPayload, litePayload },
        { persistPayload, removePayload }
      )
    ).toEqual({ persisted: true, persistedFull: false });

    expect(persistPayload.mock.calls).toEqual([
      [manager, "full-key", fullPayload],
      [manager, "lite-key", litePayload]
    ]);
    expect(removePayload).not.toHaveBeenCalled();
  });

  it("preserves the existing full payload when all new writes fail", () => {
    const persistPayload = vi.fn(() => false);
    const removePayload = vi.fn();
    const manager = { modeKey: "standard" };
    const fullPayload = { kind: "full" };
    const litePayload = { kind: "lite" };

    expect(
      persistSavedPayloadWithLiteFallback(
        { manager, key: "full-key", liteKey: "lite-key", fullPayload, litePayload },
        { persistPayload, removePayload }
      )
    ).toEqual({ persisted: false, persistedFull: false });

    expect(persistPayload.mock.calls).toEqual([
      [manager, "full-key", fullPayload],
      [manager, "lite-key", litePayload]
    ]);
    expect(removePayload).not.toHaveBeenCalled();
  });

  it("updates the lite payload when a throttled save has no full payload", () => {
    const persistPayload = vi.fn(() => true);
    const removePayload = vi.fn();
    const manager = { modeKey: "standard" };
    const litePayload = { kind: "lite" };

    expect(
      persistSavedPayloadWithLiteFallback(
        { manager, key: "full-key", liteKey: "lite-key", litePayload },
        { persistPayload, removePayload }
      )
    ).toEqual({ persisted: true, persistedFull: false });

    expect(persistPayload).toHaveBeenCalledOnce();
    expect(persistPayload).toHaveBeenCalledWith(manager, "lite-key", litePayload);
    expect(removePayload).not.toHaveBeenCalled();
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
