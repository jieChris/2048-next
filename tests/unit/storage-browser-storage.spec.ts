import { describe, expect, it } from "vitest";

import {
  createBrowserStorageAccess,
  readStorageValue,
  removeStorageValue,
  writeStorageValue
} from "../../src/storage/browser-storage";

describe("storage: browser-storage", () => {
  it("resolves local and session storage from a window-like host", () => {
    const localStorage = {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    };
    const sessionStorage = {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    };

    const access = createBrowserStorageAccess({
      windowLike: {
        localStorage,
        sessionStorage
      }
    });

    expect(access.local()).toBe(localStorage);
    expect(access.session()).toBe(sessionStorage);
  });

  it("returns null when storage lookup throws or is missing", () => {
    const access = createBrowserStorageAccess({
      windowLike: {
        get localStorage() {
          throw new Error("blocked");
        }
      }
    });

    expect(access.local()).toBeNull();
    expect(access.session()).toBeNull();
  });

  it("reads, writes, and removes storage values safely", () => {
    const writes: Array<{ key: string; value: string }> = [];
    const removes: string[] = [];
    const storage = {
      getItem(key: string) {
        return key === "token" ? "abc" : null;
      },
      setItem(key: string, value: string) {
        writes.push({ key, value });
      },
      removeItem(key: string) {
        removes.push(key);
      }
    };

    expect(readStorageValue(storage, "token")).toBe("abc");
    expect(writeStorageValue(storage, "token", "def")).toBe(true);
    expect(removeStorageValue(storage, "token")).toBe(true);
    expect(writes).toEqual([{ key: "token", value: "def" }]);
    expect(removes).toEqual(["token"]);
  });

  it("fails safely when storage operations throw", () => {
    const storage = {
      getItem() {
        throw new Error("read blocked");
      },
      setItem() {
        throw new Error("write blocked");
      },
      removeItem() {
        throw new Error("remove blocked");
      }
    };

    expect(readStorageValue(storage, "x")).toBeNull();
    expect(writeStorageValue(storage, "x", "y")).toBe(false);
    expect(removeStorageValue(storage, "x")).toBe(false);
    expect(readStorageValue(null, "x")).toBeNull();
    expect(writeStorageValue(null, "x", "y")).toBe(false);
    expect(removeStorageValue(null, "x")).toBe(false);
  });
});
