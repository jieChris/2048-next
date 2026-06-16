import { describe, expect, it, vi } from "vitest";

import {
  callWindowMethod,
  callWindowNamespaceMethod,
  canReadFromStorage,
  canWriteToStorage,
  getWebStorageByName,
  getWindowLike,
  requestAnimationFrameByManager,
  resolveManagerDocumentLike,
  resolveManagerElementById,
  resolveWindowMethod,
  resolveWindowNamespaceMethod
} from "../../src/core/game-manager-env-helpers";

describe("game manager env helpers", () => {
  it("returns null when named web storage cannot be accessed", () => {
    const windowLike = {};
    Object.defineProperty(windowLike, "localStorage", {
      get() {
        throw new Error("denied");
      }
    });

    expect(getWebStorageByName("localStorage", windowLike)).toBeNull();
  });

  it("resolves the manager window document before the global document", () => {
    const documentLike = { getElementById: vi.fn() };
    const manager = {
      getWindowLike: () => ({ document: documentLike })
    };

    expect(resolveManagerDocumentLike(manager)).toBe(documentLike);
  });

  it("looks up manager elements only for non-empty string IDs and document APIs", () => {
    const element = { id: "timer2048" };
    const getElementById = vi.fn(() => element);
    const manager = {
      getWindowLike: () => ({ document: { getElementById } })
    };

    expect(resolveManagerElementById(manager, "timer2048")).toBe(element);
    expect(resolveManagerElementById(manager, "")).toBeNull();
    expect(resolveManagerElementById({ getWindowLike: () => ({ document: {} }) }, "timer2048")).toBeNull();
    expect(getElementById).toHaveBeenCalledWith("timer2048");
  });

  it("detects storage read and write capabilities", () => {
    expect(canReadFromStorage({ getItem: vi.fn() })).toBe(true);
    expect(canReadFromStorage({})).toBe(false);
    expect(canWriteToStorage({ setItem: vi.fn() })).toBe(true);
    expect(canWriteToStorage({})).toBe(false);
  });

  it("resolves and calls window methods with the window receiver", () => {
    const windowLike = {
      calls: [] as string[],
      alert(message: string) {
        this.calls.push(message);
      }
    };
    const manager = { getWindowLike: () => windowLike };

    const resolved = resolveWindowMethod(manager, "alert");
    expect(resolved?.windowLike).toBe(windowLike);
    expect(resolved?.method).toBe(windowLike.alert);
    expect(callWindowMethod(manager, "alert", ["ready"])).toBe(true);
    expect(windowLike.calls).toEqual(["ready"]);
    expect(callWindowMethod(manager, "missing", [])).toBe(false);
  });

  it("resolves and calls namespace methods with the namespace receiver", () => {
    const scope = {
      calls: [] as string[],
      track(value: string) {
        this.calls.push(value);
      }
    };
    const windowLike = { analytics: scope };
    const manager = { getWindowLike: () => windowLike };

    const resolved = resolveWindowNamespaceMethod(manager, "analytics", "track");
    expect(resolved?.windowLike).toBe(windowLike);
    expect(resolved?.scope).toBe(scope);
    expect(resolved?.method).toBe(scope.track);
    expect(callWindowNamespaceMethod(manager, "analytics", "track", ["open"])).toBe(true);
    expect(scope.calls).toEqual(["open"]);
    expect(callWindowNamespaceMethod(manager, "analytics", "missing", [])).toBe(false);
  });

  it("uses requestAnimationFrame when available and falls back to immediate callback", () => {
    const callback = vi.fn();
    const requestAnimationFrame = vi.fn();
    const manager = {
      getWindowLike: () => ({ requestAnimationFrame })
    };

    expect(requestAnimationFrameByManager(manager, callback)).toBe(true);
    expect(requestAnimationFrame).toHaveBeenCalledWith(callback);
    expect(callback).not.toHaveBeenCalled();

    const fallbackCallback = vi.fn();
    expect(requestAnimationFrameByManager({ getWindowLike: () => ({}) }, fallbackCallback)).toBe(false);
    expect(fallbackCallback).toHaveBeenCalledTimes(1);
  });
});
