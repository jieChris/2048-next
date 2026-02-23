import { describe, expect, it } from "vitest";

import {
  buildAdapterMoveResultEventName,
  buildAdapterSnapshotKey,
  emitAdapterMoveResult,
  readAdapterSnapshot,
  writeAdapterSnapshot
} from "../../src/bridge/adapter-io";

describe("bridge adapter io: snapshot key", () => {
  it("builds namespaced key with normalized mode", () => {
    expect(buildAdapterSnapshotKey("standard_4x4_pow2_no_undo")).toBe(
      "engine_adapter_snapshot_v1:standard_4x4_pow2_no_undo"
    );
    expect(buildAdapterSnapshotKey("")).toBe("engine_adapter_snapshot_v1:unknown");
  });
});

describe("bridge adapter io: snapshot read and write", () => {
  it("writes snapshot payload and reads it back", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      }
    };

    const wrote = writeAdapterSnapshot(storage, "classic_4x4_pow2_undo", {
      adapterMode: "legacy-bridge",
      modeKey: "classic_4x4_pow2_undo",
      updatedAt: 123
    });
    expect(wrote).toBe(true);

    expect(readAdapterSnapshot(storage, "classic_4x4_pow2_undo")).toEqual({
      adapterMode: "legacy-bridge",
      modeKey: "classic_4x4_pow2_undo",
      updatedAt: 123
    });
  });

  it("returns null on invalid JSON payload", () => {
    const storage = {
      getItem() {
        return "{invalid";
      },
      setItem() {
        // no-op
      }
    };
    expect(readAdapterSnapshot(storage, "x")).toBeNull();
  });
});

describe("bridge adapter io: move result emit", () => {
  it("emits move result event through target dispatch", () => {
    const events: Array<{ type: string; detail: Record<string, unknown> }> = [];
    const target = {
      dispatchEvent(event: Event) {
        const custom = event as Event & { detail?: Record<string, unknown> };
        events.push({
          type: event.type,
          detail: custom.detail || {}
        });
        return true;
      }
    };

    function FakeEventCtor(this: { type: string; detail: Record<string, unknown> }, type: string, init?: { detail?: Record<string, unknown> }) {
      this.type = type;
      this.detail = (init && init.detail) || {};
    }

    const emitted = emitAdapterMoveResult({
      target,
      modeKey: "standard_4x4_pow2_no_undo",
      detail: { moveIndex: 9, delta: 128 },
      eventCtor: FakeEventCtor as unknown as new (
        type: string,
        eventInitDict?: CustomEventInit<Record<string, unknown>>
      ) => Event
    });

    expect(emitted).toBe(true);
    expect(events).toEqual([
      {
        type: buildAdapterMoveResultEventName("standard_4x4_pow2_no_undo"),
        detail: { moveIndex: 9, delta: 128 }
      }
    ]);
  });

  it("returns false when target is missing", () => {
    const emitted = emitAdapterMoveResult({
      target: null,
      modeKey: "x",
      detail: {}
    });
    expect(emitted).toBe(false);
  });
});
