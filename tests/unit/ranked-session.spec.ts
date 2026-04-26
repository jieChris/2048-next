import { describe, expect, it, vi } from "vitest";

import { createRankedSessionRuntime } from "../../src/bootstrap/ranked-session";

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
});
