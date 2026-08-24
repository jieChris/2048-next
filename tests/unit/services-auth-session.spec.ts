import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, String(value)); }
}

beforeEach(() => {
  vi.resetModules();
});

describe("durable browser auth session", () => {
  it("does not make real network requests outside a browser unless fetch is injected", async () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    const previousFetch = globalThis.fetch;
    const fetchSpy = vi.fn();
    delete (globalThis as { window?: unknown }).window;
    Object.defineProperty(globalThis, "fetch", { configurable: true, writable: true, value: fetchSpy });
    try {
      const auth = await import("../../src/services/auth-session");
      await expect(auth.restoreAuthSession()).resolves.toEqual({ status: "transient_error", code: "FETCH_UNAVAILABLE" });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(globalThis, "fetch", { configurable: true, writable: true, value: previousFetch });
      if (previousWindow === undefined) delete (globalThis as { window?: unknown }).window;
      else Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: previousWindow });
    }
  });

  it("resyncs legacy account screens after cookie restoration", () => {
    for (const file of ["js/account_page.js", "js/account_settings_page.js"]) {
      const source = readFileSync(file, "utf8");
      expect(source).toMatch(/addEventListener\("auth-session-change"[\s\S]*?syncAuthState\(\);[\s\S]*?refreshUserInfo\(/u);
    }
  });

  it("keeps a local development bearer across page reloads", async () => {
    const storage = new MemoryStorage();
    const previousWindow = (globalThis as { window?: unknown }).window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { hostname: "127.0.0.1" } },
    });
    try {
      const auth = await import("../../src/services/auth-session");
      auth.setAuthSession({ token: "local-token", user: { id: 42, public_profile_id: 9, nickname: "Local" } }, { storageLike: storage });
      expect(storage.getItem("2048_auth_token_v1")).toBe("local-token");
      expect(storage.getItem("2048_public_profile_id_v1")).toBe("9");
    } finally {
      if (previousWindow === undefined) delete (globalThis as { window?: unknown }).window;
      else Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
    }
  });

  it("restores from the HttpOnly cookie and removes the legacy persisted bearer", async () => {
    const storage = new MemoryStorage();
    storage.setItem("2048_auth_token_v1", "legacy-token");
    const fetchLike = vi.fn(async () => new Response(JSON.stringify({
      success: true,
      token: "memory-token",
      expiresAt: 4_000_000_000,
      user: { id: 42, nickname: "PlayerOne" },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const auth = await import("../../src/services/auth-session");

    const result = await auth.restoreAuthSession({
      bases: ["https://local.example/api"],
      fetchLike,
      storageLike: storage,
    });

    expect(result.status).toBe("authenticated");
    expect(auth.getAuthToken({ storageLike: storage })).toBe("memory-token");
    expect(storage.getItem("2048_auth_token_v1")).toBeNull();
    expect(fetchLike).toHaveBeenCalledWith(
      "https://local.example/api/auth/refresh",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("merges concurrent restore requests", async () => {
    const auth = await import("../../src/services/auth-session");
    const fetchLike = vi.fn(async () => new Response(JSON.stringify({
      success: true,
      token: "one-token",
      user: { id: 7, nickname: "One" },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const options = { bases: ["https://local.example/api"], fetchLike, storageLike: new MemoryStorage() };

    const [first, second] = await Promise.all([
      auth.restoreAuthSession(options),
      auth.restoreAuthSession(options),
    ]);

    expect(first.status).toBe("authenticated");
    expect(second.status).toBe("authenticated");
    expect(fetchLike).toHaveBeenCalledTimes(1);
  });

  it("keeps authentication cache and unrelated local records on transient failure", async () => {
    const storage = new MemoryStorage();
    storage.setItem("2048_auth_token_v1", "legacy-token");
    storage.setItem("2048_local_history_v1", "do-not-delete");
    const auth = await import("../../src/services/auth-session");

    const result = await auth.restoreAuthSession({
      bases: ["https://local.example/api"],
      fetchLike: vi.fn(async () => new Response(JSON.stringify({
        success: false,
        code: "AUTH_STATE_UNAVAILABLE",
      }), { status: 503, headers: { "Content-Type": "application/json" } })),
      storageLike: storage,
    });

    expect(result.status).toBe("transient_error");
    expect(storage.getItem("2048_auth_token_v1")).toBe("legacy-token");
    expect(storage.getItem("2048_local_history_v1")).toBe("do-not-delete");
  });

  it("does not clear authentication for an unclassified 401 response", async () => {
    const storage = new MemoryStorage();
    storage.setItem("2048_auth_token_v1", "legacy-token");
    const auth = await import("../../src/services/auth-session");

    const result = await auth.restoreAuthSession({
      bases: ["https://local.example/api"],
      fetchLike: vi.fn(async () => new Response(JSON.stringify({
        success: false,
        code: "RANKED_SESSION_INVALID",
      }), { status: 401, headers: { "Content-Type": "application/json" } })),
      storageLike: storage,
    });

    expect(result).toEqual({ status: "transient_error", code: "RANKED_SESSION_INVALID" });
    expect(storage.getItem("2048_auth_token_v1")).toBe("legacy-token");
  });

  it("clears an expired legacy bearer after cookie recovery is unavailable", async () => {
    const storage = new MemoryStorage();
    storage.setItem("2048_auth_token_v1", "expired-token");
    storage.setItem("2048_local_history_v1", "do-not-delete");
    const auth = await import("../../src/services/auth-session");

    const result = await auth.restoreAuthSession({
      bases: ["https://local.example/api"],
      fetchLike: vi.fn(async () => new Response(JSON.stringify({
        success: false,
        code: "TOKEN_EXPIRED",
      }), { status: 401, headers: { "Content-Type": "application/json" } })),
      storageLike: storage,
    });

    expect(result).toEqual({ status: "unauthenticated", code: "TOKEN_EXPIRED" });
    expect(storage.getItem("2048_auth_token_v1")).toBeNull();
    expect(storage.getItem("2048_local_history_v1")).toBe("do-not-delete");
  });

  it("retries one request after TOKEN_EXPIRED and clears only auth on explicit revocation", async () => {
    const storage = new MemoryStorage();
    storage.setItem("2048_auth_token_v1", "expired-token");
    storage.setItem("online_pending_record_submit_signature_v1", "keep-me");
    const responses = [
      new Response(JSON.stringify({ success: false, code: "TOKEN_EXPIRED" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
      new Response(JSON.stringify({ success: true, token: "fresh-token", user: { id: 9, nickname: "Nine" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      new Response(JSON.stringify({ success: false, code: "SESSION_REVOKED" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    ];
    const fetchLike = vi.fn(async () => responses.shift()!);
    const auth = await import("../../src/services/auth-session");

    const retried = await auth.fetchWithAuth("https://local.example/api/records", {}, {
      bases: ["https://local.example/api"],
      fetchLike,
      storageLike: storage,
    });
    expect(retried.status).toBe(200);
    expect(fetchLike).toHaveBeenCalledTimes(3);

    const revoked = await auth.fetchWithAuth("https://local.example/api/me", {}, {
      bases: ["https://local.example/api"],
      fetchLike,
      storageLike: storage,
    });
    expect(revoked.status).toBe(401);
    expect(auth.getAuthToken({ storageLike: storage })).toBe("");
    expect(storage.getItem("online_pending_record_submit_signature_v1")).toBe("keep-me");
  });
});
