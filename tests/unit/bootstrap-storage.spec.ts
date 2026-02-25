import { describe, expect, it } from "vitest";

import {
  resolveStorageByName,
  safeReadStorageItem,
  safeSetStorageItem
} from "../../src/bootstrap/storage";

describe("bootstrap storage", () => {
  it("resolves storage object by name from window-like host", () => {
    const storageLike = {
      getItem() {
        return null;
      },
      setItem() {
        return undefined;
      }
    };
    const resolved = resolveStorageByName({
      windowLike: {
        localStorage: storageLike
      },
      storageName: "localStorage"
    });
    expect(resolved).toBe(storageLike);
  });

  it("returns null when storage lookup fails", () => {
    expect(resolveStorageByName({ windowLike: null, storageName: "localStorage" })).toBeNull();
    expect(resolveStorageByName({ windowLike: {}, storageName: "localStorage" })).toBeNull();
    expect(
      resolveStorageByName({
        windowLike: {
          localStorage: {}
        },
        storageName: "localStorage"
      })
    ).toBeNull();

    const host = {
      get localStorage() {
        throw new Error("blocked");
      }
    };
    expect(resolveStorageByName({ windowLike: host, storageName: "localStorage" })).toBeNull();
  });

  it("writes storage value safely", () => {
    const writes: Array<{ key: string; value: string }> = [];
    const ok = safeSetStorageItem({
      storageLike: {
        setItem(key: string, value: string) {
          writes.push({ key, value });
        }
      },
      key: "k",
      value: "v"
    });
    expect(ok).toBe(true);
    expect(writes).toEqual([{ key: "k", value: "v" }]);
    expect(safeSetStorageItem({ storageLike: null, key: "k", value: "v" })).toBe(false);
    expect(safeSetStorageItem({ storageLike: {}, key: "k", value: "v" })).toBe(false);
  });

  it("reads storage value safely", () => {
    expect(
      safeReadStorageItem({
        storageLike: {
          getItem(key: string) {
            return key === "k" ? "v" : null;
          }
        },
        key: "k"
      })
    ).toBe("v");
    expect(safeReadStorageItem({ storageLike: null, key: "k" })).toBeNull();
    expect(safeReadStorageItem({ storageLike: {}, key: "k" })).toBeNull();
  });
});
