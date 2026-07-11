import { describe, expect, it, vi } from "vitest";

import {
  acquireSingleModeBrowserLock,
  createSingleModePageLockRuntime,
  ensureSingleModePageLock,
  installSingleModePageLockRuntime,
  releaseSingleModePageLock,
  resolveSingleModePageTabId
} from "../../src/core/single-mode-page-lock";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    dump() {
      return Object.fromEntries(values.entries());
    }
  };
}

function createWindowLike(options: {
  path?: string;
  search?: string;
  localStorage?: ReturnType<typeof createStorage>;
  sessionStorage?: ReturnType<typeof createStorage>;
} = {}) {
  const listeners: Record<string, Array<(event?: unknown) => void>> = {};
  return {
    location: { pathname: options.path ?? "/play.html", search: options.search ?? "" },
    localStorage: options.localStorage ?? createStorage(),
    sessionStorage: options.sessionStorage ?? createStorage(),
    addEventListener: vi.fn((name: string, listener: (event?: unknown) => void) => {
      listeners[name] = listeners[name] || [];
      listeners[name].push(listener);
    }),
    removeEventListener: vi.fn((name: string, listener: (event?: unknown) => void) => {
      listeners[name] = (listeners[name] || []).filter((entry) => entry !== listener);
    }),
    setInterval: vi.fn(() => 44),
    clearInterval: vi.fn(),
    listeners
  };
}

describe("core single mode page lock", () => {
  it("uses a browser-owned lock that releases with the page lifecycle", async () => {
    let requestFinished = false;
    const request = vi.fn((
      _name: string,
      _options: { mode: "exclusive"; ifAvailable: true },
      callback: (lock: object | null) => Promise<void> | void
    ) => Promise.resolve(callback({})).then(() => {
      requestFinished = true;
    }));
    const windowLike = createWindowLike() as ReturnType<typeof createWindowLike> & {
      navigator: { locks: { request: typeof request } };
      __playSinglePageBrowserLockModeKey?: string;
    };
    windowLike.navigator = { locks: { request } };

    const acquired = await acquireSingleModeBrowserLock(windowLike, "standard_4x4_pow2_no_undo");

    expect(acquired).toBe(true);
    expect(windowLike.__playSinglePageBrowserLockModeKey).toBe(
      "standard_4x4_pow2_no_undo"
    );
    expect(windowLike.listeners.pagehide).toHaveLength(1);
    windowLike.listeners.pagehide[0]();
    expect(windowLike.__playSinglePageBrowserLockModeKey).toBeUndefined();
    await vi.waitFor(() => expect(requestFinished).toBe(true));
  });

  it("reports a live duplicate when the browser lock is unavailable", async () => {
    const windowLike = createWindowLike() as ReturnType<typeof createWindowLike> & {
      navigator: { locks: { request: ReturnType<typeof vi.fn> } };
    };
    windowLike.navigator = {
      locks: {
        request: vi.fn(async (_name, _options, callback) => callback(null))
      }
    };

    await expect(
      acquireSingleModeBrowserLock(windowLike, "standard_4x4_pow2_no_undo")
    ).resolves.toBe(false);
  });

  it("installs the runtime namespace consumed by the legacy setup shell", () => {
    const windowLike = {};
    const runtime = installSingleModePageLockRuntime({ windowLike });

    expect(runtime).toBe((windowLike as any).CoreSingleModePageLockRuntime);
    expect(runtime?.acquireSingleModeBrowserLock).toBe(acquireSingleModeBrowserLock);
    expect(runtime?.ensureSingleModePageLock).toBe(ensureSingleModePageLock);
    expect(runtime?.resolveSingleModePageTabId).toBe(resolveSingleModePageTabId);
    expect(createSingleModePageLockRuntime().releaseSingleModePageLock).toBe(releaseSingleModePageLock);
  });

  it("resolves and caches a tab id through session storage", () => {
    const windowLike = createWindowLike();

    expect(
      resolveSingleModePageTabId(windowLike, {
        createId: (prefix) => `${prefix}-id`,
        tabIdSessionKey: "tab-key"
      })
    ).toBe("tab-id");
    expect(windowLike.sessionStorage.dump()).toEqual({ "tab-key": "tab-id" });
    expect((windowLike as any).__playSinglePageTabId).toBe("tab-id");
  });

  it("creates a lock record and manager state for a playable page", () => {
    const windowLike = createWindowLike();
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      getWindowLike: () => windowLike
    };

    expect(ensureSingleModePageLock(manager, { nowMs: 1000, createId: (prefix) => `${prefix}-id` })).toBe(true);

    const lockKey = "playModeSinglePageLock:v1:standard_4x4_pow2_no_undo";
    expect(windowLike.localStorage.dump()[lockKey]).toBeTruthy();
    expect(manager.singleModePageLockState).toMatchObject({
      lockKey,
      modeKey: "standard_4x4_pow2_no_undo",
      heartbeatId: 44
    });
    expect(windowLike.addEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    expect(windowLike.addEventListener).toHaveBeenCalledWith("pagehide", expect.any(Function));
    expect(windowLike.addEventListener).toHaveBeenCalledWith("storage", expect.any(Function));
  });

  it("rejects a fresh lock owned by another window instance", () => {
    const lockKey = "playModeSinglePageLock:v1:standard_4x4_pow2_no_undo";
    const localStorage = createStorage({
      [lockKey]: JSON.stringify({
        tab_id: "other-tab",
        token: "other-token",
        mode_key: "standard_4x4_pow2_no_undo",
        instance_id: "other-window",
        updated_at: 1000
      })
    });
    const windowLike = createWindowLike({ localStorage });
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      getWindowLike: () => windowLike
    };

    expect(ensureSingleModePageLock(manager, { nowMs: 2000, createId: (prefix) => `${prefix}-id` })).toBe(false);
    expect(manager.singleModePageLockState).toBeUndefined();
  });

  it("reclaims a fresh lock left by the same restored browser tab", () => {
    const lockKey = "playModeSinglePageLock:v1:standard_4x4_pow2_no_undo";
    const localStorage = createStorage({
      [lockKey]: JSON.stringify({
        tab_id: "restored-tab",
        token: "stale-token",
        mode_key: "standard_4x4_pow2_no_undo",
        instance_id: "crashed-window",
        updated_at: 1000
      })
    });
    const windowLike = createWindowLike({
      localStorage,
      sessionStorage: createStorage({
        "playModeSinglePageTabId:v1": "restored-tab"
      })
    });
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      getWindowLike: () => windowLike
    };

    expect(ensureSingleModePageLock(manager, { nowMs: 2000, createId: (prefix) => `${prefix}-new` })).toBe(true);
    expect(JSON.parse(windowLike.localStorage.dump()[lockKey])).toMatchObject({
      tab_id: "restored-tab",
      token: "lock-new",
      instance_id: "win-new"
    });
  });

  it("skips the single-mode lock inside the read-only visual preview", () => {
    const windowLike = createWindowLike({ search: "?visual_preview=1" });
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      getWindowLike: () => windowLike
    };

    expect(ensureSingleModePageLock(manager, { nowMs: 1000, createId: (prefix) => `${prefix}-id` })).toBe(true);
    expect(windowLike.localStorage.dump()).toEqual({});
    expect(manager.singleModePageLockState).toBeUndefined();
  });

  it("releases an owned lock record and unregisters handlers", () => {
    const windowLike = createWindowLike();
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      getWindowLike: () => windowLike
    };

    ensureSingleModePageLock(manager, { nowMs: 1000, createId: (prefix) => `${prefix}-id` });
    releaseSingleModePageLock(manager);

    expect(windowLike.clearInterval).toHaveBeenCalledWith(44);
    expect(windowLike.removeEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    expect(windowLike.removeEventListener).toHaveBeenCalledWith("pagehide", expect.any(Function));
    expect(windowLike.removeEventListener).toHaveBeenCalledWith("storage", expect.any(Function));
    expect(windowLike.localStorage.dump()).toEqual({});
    expect(manager.singleModePageLockState).toBeNull();
  });
});
