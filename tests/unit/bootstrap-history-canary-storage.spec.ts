import { describe, expect, it } from "vitest";

import {
  readHistoryStorageValue,
  writeHistoryStorageValue
} from "../../src/bootstrap/history-canary-storage";

describe("bootstrap history canary storage", () => {
  it("reads storage value when storage is available", () => {
    const storage = {
      getItem(key: string) {
        return key === "engine_adapter_default_mode" ? "core-adapter" : null;
      }
    };
    expect(readHistoryStorageValue(storage, "engine_adapter_default_mode")).toBe("core-adapter");
  });

  it("writes and removes storage values", () => {
    const records: Array<{ type: string; key: string; value?: string }> = [];
    const storage = {
      setItem(key: string, value: string) {
        records.push({ type: "set", key, value });
      },
      removeItem(key: string) {
        records.push({ type: "remove", key });
      }
    };

    expect(writeHistoryStorageValue(storage, "engine_adapter_default_mode", "legacy-bridge")).toBe(true);
    expect(writeHistoryStorageValue(storage, "engine_adapter_force_legacy", "")).toBe(true);
    expect(records).toEqual([
      { type: "set", key: "engine_adapter_default_mode", value: "legacy-bridge" },
      { type: "remove", key: "engine_adapter_force_legacy" }
    ]);
  });

  it("fails safely when storage API throws", () => {
    const storage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      }
    };
    expect(readHistoryStorageValue(storage, "k")).toBeNull();
    expect(writeHistoryStorageValue(storage, "k", "v")).toBe(false);
  });
});
