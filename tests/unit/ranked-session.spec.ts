import { describe, expect, it, vi } from "vitest";

import {
  bindRankedSessionPrefetchWarmup,
  bindRankedSessionAuthTransitionReload,
  bootstrapRankedSessionForHomeFamilyPage,
  createRankedSessionRuntime
} from "../../src/bootstrap/ranked-session";

const MODE_KEY = "standard_4x4_pow2_no_undo";
const ACTIVE_KEY = `ranked_session_active:v1:${MODE_KEY}`;
const PREFETCH_KEY = `ranked_session_prefetch:v1:${MODE_KEY}`;

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.has(key) ? this.values.get(key) || "" : null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

type ListenerMap = Record<string, Array<(eventLike?: { key?: string }) => void>>;

function createSession(overrides: Record<string, unknown> = {}) {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    mode_key: MODE_KEY,
    challenge_id: "ranked-active",
    seed: 111,
    ranked_session_token: "active-token",
    issued_at: nowSec,
    exp: nowSec + 3600,
    owner_user_id: "7",
    ...overrides
  };
}

function createWindowLike(storage: MemoryStorage, fetchImpl?: typeof fetch) {
  storage.setItem("2048_auth_token_v1", "auth-token");
  storage.setItem("2048_auth_userId_v1", "7");
  return {
    localStorage: storage,
    location: {
      search: "",
      hostname: "2048next.cn",
      origin: "https://2048next.cn"
    },
    fetch: fetchImpl
  } as unknown as Window;
}

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("ranked session runtime", () => {
  it("does not promote a prefetched session that reuses the active ranked seed", async () => {
    const storage = new MemoryStorage();
    const activeSession = createSession();
    storage.setItem(ACTIVE_KEY, JSON.stringify(activeSession));
    storage.setItem(
      PREFETCH_KEY,
      JSON.stringify({
        ...activeSession,
        challenge_id: "ranked-duplicate-seed",
        ranked_session_token: "duplicate-seed-token"
      })
    );
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: createSession({
            challenge_id: "ranked-next",
            seed: 222,
            ranked_session_token: "next-token"
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const runtime = createRankedSessionRuntime(createWindowLike(storage, fetchImpl), "index");

    expect(runtime.promotePrefetchedSession(MODE_KEY)).toBe(false);
    expect(JSON.parse(storage.getItem(ACTIVE_KEY) || "{}").ranked_session_token).toBe(
      "active-token"
    );

    await flushMicrotasks();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.getItem(PREFETCH_KEY) || "{}").ranked_session_token).toBe(
      "next-token"
    );
  });

  it("rejects a freshly requested prefetch when the server reuses the active session", async () => {
    const storage = new MemoryStorage();
    const activeSession = createSession();
    storage.setItem(ACTIVE_KEY, JSON.stringify(activeSession));
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ success: true, data: activeSession }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });
    const runtime = createRankedSessionRuntime(createWindowLike(storage, fetchImpl), "index");

    await expect(runtime.ensurePrefetch(MODE_KEY)).resolves.toBe(false);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(storage.getItem(PREFETCH_KEY)).toBeNull();
  });

  it("rejects a freshly requested prefetch when the server reuses the active seed", async () => {
    const storage = new MemoryStorage();
    const activeSession = createSession();
    storage.setItem(ACTIVE_KEY, JSON.stringify(activeSession));
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: createSession({
            challenge_id: "ranked-same-seed",
            ranked_session_token: "same-seed-token"
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const runtime = createRankedSessionRuntime(createWindowLike(storage, fetchImpl), "index");

    await expect(runtime.ensurePrefetch(MODE_KEY)).resolves.toBe(false);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(storage.getItem(PREFETCH_KEY)).toBeNull();
  });

  it("starts and activates a fresh ranked session on demand when no prefetch exists", async () => {
    const storage = new MemoryStorage();
    const activeSession = createSession();
    const nextSession = createSession({
      challenge_id: "ranked-next",
      seed: 222,
      ranked_session_token: "next-token"
    });
    storage.setItem(ACTIVE_KEY, JSON.stringify(activeSession));
    let requestCount = 0;
    const fetchImpl = vi.fn(async () => {
      requestCount += 1;
      return new Response(
        JSON.stringify({
          success: true,
          data:
            requestCount === 1
              ? nextSession
              : createSession({
                  challenge_id: "ranked-prefetch-after-next",
                  seed: 333,
                  ranked_session_token: "prefetch-after-next-token"
                })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const windowLike = createWindowLike(storage, fetchImpl);
    const runtime = createRankedSessionRuntime(windowLike, "index");

    await expect(runtime.startNextSession(MODE_KEY)).resolves.toBe(true);

    const active = JSON.parse(storage.getItem(ACTIVE_KEY) || "{}");
    expect(active.ranked_session_token).toBe("next-token");
    expect(active.owner_user_id).toBe("7");
    expect((windowLike as Window & { GAME_CHALLENGE_CONTEXT?: unknown }).GAME_CHALLENGE_CONTEXT).toMatchObject({
      ranked_session_token: "next-token",
      seed: 222
    });
    expect(fetchImpl).toHaveBeenCalled();
  });

  it("starts ranked sessions for Fibonacci leaderboard modes", async () => {
    const storage = new MemoryStorage();
    const modeKey = "fib_4x2_undo";
    const activeKey = `ranked_session_active:v1:${modeKey}`;
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: createSession({
            mode_key: modeKey,
            challenge_id: "ranked-fib",
            seed: 444,
            ranked_session_token: "fib-token"
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const runtime = createRankedSessionRuntime(createWindowLike(storage, fetchImpl), "play");

    await expect(runtime.startNextSession(modeKey)).resolves.toBe(true);

    expect(fetchImpl).toHaveBeenCalled();
    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body || "{}"))).toMatchObject({ mode_key: modeKey });
    expect(JSON.parse(storage.getItem(activeKey) || "{}")).toMatchObject({
      mode_key: modeKey,
      ranked_session_token: "fib-token"
    });
  });

  it("does not activate an on-demand ranked session that reuses the active seed", async () => {
    const storage = new MemoryStorage();
    const activeSession = createSession();
    storage.setItem(ACTIVE_KEY, JSON.stringify(activeSession));
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: createSession({
            challenge_id: "ranked-same-seed",
            ranked_session_token: "same-seed-token"
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const runtime = createRankedSessionRuntime(createWindowLike(storage, fetchImpl), "index");

    await expect(runtime.startNextSession(MODE_KEY)).resolves.toBe(false);

    expect(JSON.parse(storage.getItem(ACTIVE_KEY) || "{}").ranked_session_token).toBe(
      "active-token"
    );
  });

  it("clears auth and ranked session state when ranked session creation is unauthorized", async () => {
    const storage = new MemoryStorage();
    storage.setItem(ACTIVE_KEY, JSON.stringify(createSession()));
    storage.setItem(PREFETCH_KEY, JSON.stringify(createSession({ challenge_id: "prefetch" })));
    storage.setItem("2048_auth_nickname_v1", "Jay");
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }), {
        status: 401,
        headers: { "content-type": "application/json" }
      });
    });
    const runtime = createRankedSessionRuntime(createWindowLike(storage, fetchImpl), "index");

    await expect(runtime.startNextSession(MODE_KEY)).resolves.toBe(false);

    expect(runtime.getLastFailureReason()).toBe("unauthorized");
    expect(storage.getItem("2048_auth_token_v1")).toBeNull();
    expect(storage.getItem("2048_auth_userId_v1")).toBeNull();
    expect(storage.getItem("2048_auth_nickname_v1")).toBeNull();
    expect(storage.getItem(ACTIVE_KEY)).toBeNull();
    expect(storage.getItem(PREFETCH_KEY)).toBeNull();
  });

  it("does not reload the current page after runtime-cleared auth from unauthorized session creation", async () => {
    const storage = new MemoryStorage();
    const listeners: ListenerMap = {};
    const reload = vi.fn();
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }), {
        status: 401,
        headers: { "content-type": "application/json" }
      });
    });
    const windowLike = createWindowLike(storage, fetchImpl) as Window & {
      addEventListener: (type: string, listener: (eventLike?: { key?: string }) => void) => void;
      location: Location & { reload: () => void };
    };
    windowLike.location = {
      search: "",
      hostname: "2048next.cn",
      origin: "https://2048next.cn",
      reload
    } as Location & { reload: () => void };
    windowLike.addEventListener = vi.fn((type: string, listener: (eventLike?: { key?: string }) => void) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(listener);
    });
    const runtime = createRankedSessionRuntime(windowLike, "index");
    bindRankedSessionAuthTransitionReload(windowLike, runtime, MODE_KEY);

    await expect(runtime.startNextSession(MODE_KEY)).resolves.toBe(false);
    listeners.focus?.forEach((listener) => listener());

    expect(runtime.getLastFailureReason()).toBe("unauthorized");
    expect(storage.getItem("2048_auth_token_v1")).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it("drops stored ranked sessions that do not belong to the current user", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      ACTIVE_KEY,
      JSON.stringify({
        ...createSession({ ranked_session_token: "orphan-token" }),
        owner_user_id: null
      })
    );
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: createSession({
            challenge_id: "ranked-current-user",
            seed: 333,
            ranked_session_token: "current-user-token",
            owner_user_id: null
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const runtime = createRankedSessionRuntime(createWindowLike(storage, fetchImpl), "index");

    expect(runtime.getCurrentContext(MODE_KEY)).toBeNull();
    expect(storage.getItem(ACTIVE_KEY)).toBeNull();
    await expect(runtime.ensurePrefetch(MODE_KEY)).resolves.toBe(true);

    const prefetched = JSON.parse(storage.getItem(PREFETCH_KEY) || "{}");
    expect(prefetched.ranked_session_token).toBe("current-user-token");
    expect(prefetched.owner_user_id).toBe("7");
  });

  it("reloads a ranked page when auth state changes after the page was restored", () => {
    const storage = new MemoryStorage();
    const listeners: ListenerMap = {};
    const reload = vi.fn();
    const clearModeSession = vi.fn();
    const windowLike = {
      localStorage: storage,
      location: {
        search: "",
        hostname: "2048next.cn",
        origin: "https://2048next.cn",
        reload
      },
      addEventListener: vi.fn((type: string, listener: (eventLike?: { key?: string }) => void) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(listener);
      })
    } as unknown as Window;

    bindRankedSessionAuthTransitionReload(
      windowLike,
      { clearModeSession } as unknown as ReturnType<typeof createRankedSessionRuntime>,
      MODE_KEY
    );

    storage.setItem("2048_auth_token_v1", "logged-in-token");
    storage.setItem("2048_auth_userId_v1", "17");
    listeners.pageshow?.forEach((listener) => listener());

    expect(clearModeSession).toHaveBeenCalledWith(MODE_KEY);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("warms up the next ranked session when the page becomes active again", async () => {
    const storage = new MemoryStorage();
    const listeners: ListenerMap = {};
    const documentListeners: ListenerMap = {};
    const ensurePrefetch = vi.fn(async () => true);
    const documentLike = {
      visibilityState: "visible",
      addEventListener: vi.fn((type: string, listener: (eventLike?: { key?: string }) => void) => {
        documentListeners[type] = documentListeners[type] || [];
        documentListeners[type].push(listener);
      })
    };
    const windowLike = createWindowLike(storage) as Window & {
      document: Document & { visibilityState: DocumentVisibilityState };
      addEventListener: (type: string, listener: (eventLike?: { key?: string }) => void) => void;
      setTimeout: (handler: () => void, timeout?: number) => number;
    };
    windowLike.document = documentLike as Document & { visibilityState: DocumentVisibilityState };
    windowLike.addEventListener = vi.fn((type: string, listener: (eventLike?: { key?: string }) => void) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(listener);
    });
    windowLike.setTimeout = vi.fn((handler: () => void) => {
      handler();
      return 1;
    });

    bindRankedSessionPrefetchWarmup(windowLike, { ensurePrefetch }, MODE_KEY);

    expect(windowLike.addEventListener).toHaveBeenCalledWith("pageshow", expect.any(Function));
    expect(windowLike.addEventListener).toHaveBeenCalledWith("focus", expect.any(Function));
    expect(windowLike.addEventListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(documentLike.addEventListener).toHaveBeenCalledWith("visibilitychange", expect.any(Function));

    listeners.focus?.forEach((listener) => listener());
    await flushMicrotasks();

    expect(ensurePrefetch).toHaveBeenCalledTimes(1);
    expect(ensurePrefetch).toHaveBeenCalledWith(MODE_KEY);

    Object.defineProperty(documentLike, "visibilityState", { value: "hidden", configurable: true });
    documentListeners.visibilitychange?.forEach((listener) => listener());
    await flushMicrotasks();

    expect(ensurePrefetch).toHaveBeenCalledTimes(1);

    Object.defineProperty(documentLike, "visibilityState", { value: "visible", configurable: true });
    documentListeners.visibilitychange?.forEach((listener) => listener());
    await flushMicrotasks();

    expect(ensurePrefetch).toHaveBeenCalledTimes(2);
  });

  it("does not bind ranked prefetch warmup when the player is signed out", () => {
    const storage = new MemoryStorage();
    const ensurePrefetch = vi.fn(async () => true);
    const windowLike = createWindowLike(storage) as Window & {
      addEventListener: (type: string, listener: (eventLike?: { key?: string }) => void) => void;
    };
    storage.removeItem("2048_auth_token_v1");
    windowLike.addEventListener = vi.fn();

    bindRankedSessionPrefetchWarmup(windowLike, { ensurePrefetch }, MODE_KEY);

    expect(windowLike.addEventListener).not.toHaveBeenCalled();
    expect(ensurePrefetch).not.toHaveBeenCalled();
  });

  it("keeps an expired active ranked session during bootstrap when local saved progress exists", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    storage.setItem(
      ACTIVE_KEY,
      JSON.stringify(
        createSession({
          issued_at: nowSec - 7200,
          exp: nowSec - 1
        })
      )
    );
    storage.setItem(
      `savedGameStateByMode:v1:${MODE_KEY}`,
      JSON.stringify({
        v: 1,
        mode_key: MODE_KEY,
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        board: [
          [2, 0, 0, 0],
          [0, 4, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        over: false,
        initial_seed: 111,
        challenge_id: "ranked-active",
        ranked_session_token: "active-token"
      })
    );
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: createSession({
            challenge_id: "ranked-next-after-expiry",
            seed: 222,
            ranked_session_token: "next-after-expiry-token"
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const windowLike = createWindowLike(storage, fetchImpl) as Window & {
      addEventListener: (type: string, listener: (eventLike?: { key?: string }) => void) => void;
      setTimeout: (handler: () => void, timeout?: number) => number;
    };
    windowLike.addEventListener = vi.fn();
    windowLike.setTimeout = vi.fn(() => 1);
    const previousWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = windowLike;

    try {
      await bootstrapRankedSessionForHomeFamilyPage("index");
      await flushMicrotasks();
    } finally {
      (globalThis as { window?: unknown }).window = previousWindow;
    }

    expect(JSON.parse(storage.getItem(ACTIVE_KEY) || "{}")).toMatchObject({
      ranked_session_token: "active-token",
      seed: 111,
      exp: nowSec - 1
    });
    expect(JSON.parse(storage.getItem(PREFETCH_KEY) || "{}")).toMatchObject({
      ranked_session_token: "next-after-expiry-token",
      seed: 222
    });
    expect((windowLike as Window & { GAME_CHALLENGE_CONTEXT?: unknown }).GAME_CHALLENGE_CONTEXT).toMatchObject({
      id: "ranked-active",
      mode_key: MODE_KEY,
      ranked_session_token: "active-token",
      seed: 111
    });
  });

  it("activates a ranked session after login when only guest local progress exists", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      `savedGameStateByMode:v1:${MODE_KEY}`,
      JSON.stringify({
        v: 1,
        mode_key: MODE_KEY,
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        board: [
          [2, 0, 0, 0],
          [0, 4, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        over: false,
        initial_seed: 111
      })
    );
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: createSession({
            challenge_id: "ranked-after-login",
            seed: 2468,
            ranked_session_token: "ranked-after-login-token"
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const windowLike = createWindowLike(storage, fetchImpl) as Window & {
      addEventListener: (type: string, listener: (eventLike?: { key?: string }) => void) => void;
      setTimeout: (handler: () => void, timeout?: number) => number;
    };
    windowLike.addEventListener = vi.fn();
    windowLike.setTimeout = vi.fn(() => 1);
    const previousWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = windowLike;

    try {
      await bootstrapRankedSessionForHomeFamilyPage("index");
      await flushMicrotasks();
    } finally {
      (globalThis as { window?: unknown }).window = previousWindow;
    }

    expect(JSON.parse(storage.getItem(ACTIVE_KEY) || "{}")).toMatchObject({
      ranked_session_token: "ranked-after-login-token",
      seed: 2468
    });
    expect(storage.getItem(PREFETCH_KEY)).toBeNull();
    expect((windowLike as Window & { GAME_CHALLENGE_CONTEXT?: unknown }).GAME_CHALLENGE_CONTEXT).toMatchObject({
      id: "ranked-after-login",
      mode_key: MODE_KEY,
      ranked_session_token: "ranked-after-login-token",
      seed: 2468
    });
  });

  it("resumes a ranked home game that was blocked before the seed bootstrap finished", async () => {
    const storage = new MemoryStorage();
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: createSession({
            challenge_id: "ranked-delayed-home",
            seed: 13579,
            ranked_session_token: "delayed-home-token"
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const windowLike = createWindowLike(storage, fetchImpl) as Window & {
      game_manager: {
        mode: string;
        modeKey: string;
        rankedSetupBlockedUntilSessionReady: boolean;
        setup: ReturnType<typeof vi.fn>;
      };
      addEventListener: (type: string, listener: (eventLike?: { key?: string }) => void) => void;
      setTimeout: (handler: () => void, timeout?: number) => number;
    };
    windowLike.addEventListener = vi.fn();
    windowLike.setTimeout = vi.fn(() => 1);
    windowLike.game_manager = {
      mode: MODE_KEY,
      modeKey: MODE_KEY,
      rankedSetupBlockedUntilSessionReady: true,
      setup: vi.fn(function (this: { rankedSetupBlockedUntilSessionReady: boolean }) {
        this.rankedSetupBlockedUntilSessionReady = false;
      })
    };
    const previousWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = windowLike;

    try {
      await bootstrapRankedSessionForHomeFamilyPage("index");
    } finally {
      (globalThis as { window?: unknown }).window = previousWindow;
    }

    expect(windowLike.game_manager.setup).toHaveBeenCalledTimes(1);
    expect(windowLike.game_manager.rankedSetupBlockedUntilSessionReady).toBe(false);
    expect(windowLike.GAME_CHALLENGE_CONTEXT).toMatchObject({
      id: "ranked-delayed-home",
      mode_key: MODE_KEY,
      ranked_session_token: "delayed-home-token",
      seed: 13579
    });
  });
});
