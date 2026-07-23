import { describe, expect, it, vi } from "vitest";

import {
  AUTH_TOKEN_KEY,
  buildApiBaseCandidates,
  createJsonApiClient,
  readAuthToken
} from "../../src/services/api-client";

describe("services: api-client", () => {
  it("builds API base candidates from same-origin and remote fallback", () => {
    expect(
      buildApiBaseCandidates({
        locationLike: { origin: "https://example.test" },
        remoteApiBase: "https://2048next.cn/api"
      })
    ).toEqual(["https://example.test/api", "https://2048next.cn/api"]);
  });

  it("deduplicates remote base when same-origin already matches", () => {
    expect(
      buildApiBaseCandidates({
        locationLike: { origin: "https://2048next.cn" },
        remoteApiBase: "https://2048next.cn/api"
      })
    ).toEqual(["https://2048next.cn/api"]);
  });

  it("reads auth token through storage owner", () => {
    const storage = {
      getItem(key: string) {
        return key === AUTH_TOKEN_KEY ? "token-1" : null;
      },
      setItem() {},
      removeItem() {}
    };

    expect(AUTH_TOKEN_KEY).toBe("2048_auth_token_v1");
    expect(readAuthToken({ storageLike: storage })).toBe("token-1");
  });

  it("sends JSON request to the first base that returns JSON", async () => {
    const fetchLike = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ success: true })
    });
    const client = createJsonApiClient({
      bases: ["https://api.test"],
      fetchLike,
      token: "token-1"
    });

    await expect(client.request("/admin/me", { method: "GET" })).resolves.toEqual({
      success: true
    });
    expect(fetchLike).toHaveBeenCalledWith(
      "https://api.test/admin/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers)
      })
    );
    const headers = fetchLike.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer token-1");
  });

  it("does not force JSON content type for FormData uploads", async () => {
    const fetchLike = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ success: true })
    });
    const client = createJsonApiClient({
      bases: ["https://api.test"],
      fetchLike,
      token: "token-1"
    });
    const body = new FormData();
    body.append("icon", new Blob(["x"], { type: "image/png" }), "icon.png");

    await client.request("/admin/achievements/a-1/icon", { method: "POST", body });

    const headers = fetchLike.mock.calls[0][1].headers as Headers;
    expect(headers.get("Content-Type")).toBeNull();
  });

  it("returns a stable error object when all bases fail", async () => {
    const fetchLike = vi.fn().mockRejectedValue(new Error("offline"));
    const client = createJsonApiClient({
      bases: ["https://api-a.test", "https://api-b.test"],
      fetchLike
    });

    await expect(client.request("/admin/me", { method: "GET" })).resolves.toEqual({
      success: false,
      error: "offline"
    });
    expect(fetchLike).toHaveBeenCalledTimes(2);
  });

  it("does not fallback authenticated requests to another API base", async () => {
    const fetchLike = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ success: false, error: "api_unavailable" })
    });
    const client = createJsonApiClient({
      bases: ["http://127.0.0.1:5174/api", "https://2048next.cn/api"],
      fetchLike,
      token: "token-1"
    });

    await expect(client.request("/user/me/achievements", { method: "GET" })).resolves.toEqual({
      success: false,
      error: "api_unavailable"
    });
    expect(fetchLike).toHaveBeenCalledTimes(1);
  });

  it("does not fallback write requests to another API base", async () => {
    const fetchLike = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ success: false, error: "api_unavailable" })
    });
    const client = createJsonApiClient({
      bases: ["http://127.0.0.1:5174/api", "https://2048next.cn/api"],
      fetchLike
    });

    await expect(client.request("/records", { method: "POST", body: "{}" })).resolves.toEqual({
      success: false,
      error: "api_unavailable"
    });
    expect(fetchLike).toHaveBeenCalledTimes(1);
  });

  it("falls back when the local proxy reports api_unavailable", async () => {
    const fetchLike = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve({ success: false, error: "api_unavailable" })
      })
      .mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve({ success: true, data: [{ id: "tile_2048_count_1" }] })
      });
    const client = createJsonApiClient({
      bases: ["http://127.0.0.1:5174/api", "https://2048next.cn/api"],
      fetchLike
    });

    await expect(client.request("/achievements")).resolves.toEqual({
      success: true,
      data: [{ id: "tile_2048_count_1" }]
    });
    expect(fetchLike).toHaveBeenCalledTimes(2);
  });

  it("returns a structured successful JSON response", async () => {
    const fetchLike = vi.fn().mockResolvedValue({
      status: 201,
      statusText: "Created",
      json: () => Promise.resolve({ success: true, id: "record-1" })
    });
    const client = createJsonApiClient({ bases: ["https://api.test"], fetchLike });

    await expect(client.requestResult("/records", { method: "POST", body: "{}" }))
      .resolves.toEqual({
        ok: true,
        status: 201,
        body: { success: true, id: "record-1" },
        networkError: null
      });
  });

  it("preserves HTTP status and JSON body for non-2xx responses", async () => {
    const fetchLike = vi.fn().mockResolvedValue({
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ success: false, code: "UNAUTHORIZED" })
    });
    const client = createJsonApiClient({
      bases: ["https://api.test"],
      fetchLike,
      token: "expired-token"
    });

    await expect(client.requestResult("/records", { method: "POST", body: "{}" }))
      .resolves.toEqual({
        ok: false,
        status: 401,
        body: { success: false, code: "UNAUTHORIZED" },
        networkError: null
      });
    await expect(client.request("/records", { method: "POST", body: "{}" })).resolves.toEqual({
      success: false,
      code: "UNAUTHORIZED"
    });
  });

  it("distinguishes a non-JSON HTTP response from a network failure", async () => {
    const fetchLike = vi.fn().mockResolvedValue({
      status: 502,
      statusText: "Bad Gateway",
      json: () => Promise.reject(new SyntaxError("Unexpected token"))
    });
    const client = createJsonApiClient({
      bases: ["https://api.test"],
      fetchLike,
      token: "token-1"
    });

    await expect(client.requestResult("/user/me", { method: "GET" })).resolves.toEqual({
      ok: false,
      status: 502,
      body: null,
      networkError: null
    });
    await expect(client.request("/user/me", { method: "GET" })).resolves.toEqual({
      success: false,
      error: "Bad Gateway"
    });
  });

  it("keeps a successful empty HTTP response successful in the structured contract", async () => {
    const fetchLike = vi.fn().mockResolvedValue({
      status: 204,
      statusText: "No Content",
      json: () => Promise.reject(new SyntaxError("empty body"))
    });
    const client = createJsonApiClient({ bases: ["https://api.test"], fetchLike });

    await expect(client.requestResult("/session", { method: "DELETE" })).resolves.toEqual({
      ok: true,
      status: 204,
      body: null,
      networkError: null
    });
  });

  it("reports network failures without inventing an HTTP status", async () => {
    const fetchLike = vi.fn().mockRejectedValue(new TypeError("offline"));
    const client = createJsonApiClient({
      bases: ["https://api-a.test", "https://api-b.test"],
      fetchLike
    });

    await expect(client.requestResult("/achievements")).resolves.toEqual({
      ok: false,
      status: null,
      body: null,
      networkError: "offline"
    });
    expect(fetchLike).toHaveBeenCalledTimes(2);
  });

  it("uses the same unauthenticated GET fallback for structured requests", async () => {
    const fetchLike = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve({ success: false, error: "api_unavailable" })
      })
      .mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve({ success: true, data: [{ id: "first-2048" }] })
      });
    const client = createJsonApiClient({
      bases: ["http://127.0.0.1:5174/api", "https://2048next.cn/api"],
      fetchLike
    });

    await expect(client.requestResult("/achievements")).resolves.toEqual({
      ok: true,
      status: 200,
      body: { success: true, data: [{ id: "first-2048" }] },
      networkError: null
    });
    expect(fetchLike).toHaveBeenCalledTimes(2);
  });

  it("classifies an aborted request deadline as a timeout", async () => {
    vi.useFakeTimers();
    try {
      const fetchLike = vi.fn((_url: string, init?: RequestInit) =>
        new Promise<never>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted", "AbortError"));
          });
        })
      );
      const client = createJsonApiClient({
        bases: ["https://api.test"],
        fetchLike,
        timeoutMs: 25
      });

      const pending = client.requestResult("/achievements");
      await vi.advanceTimersByTimeAsync(25);

      await expect(pending).resolves.toEqual({
        ok: false,
        status: null,
        body: null,
        networkError: "request_timeout"
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    {
      label: "authenticated GET",
      token: "token-1",
      request: { method: "GET" }
    },
    {
      label: "explicitly authorized GET",
      token: undefined,
      request: { method: "GET", headers: { Authorization: "Bearer token-1" } }
    },
    {
      label: "write request",
      token: undefined,
      request: { method: "POST", body: "{}" }
    }
  ])("does not retry a structured $label across API bases", async ({ token, request }) => {
    const fetchLike = vi.fn().mockRejectedValue(new TypeError("offline"));
    const client = createJsonApiClient({
      bases: ["https://api-a.test", "https://api-b.test"],
      fetchLike,
      token
    });

    await expect(client.requestResult("/records", request)).resolves.toMatchObject({
      ok: false,
      networkError: "offline"
    });
    expect(fetchLike).toHaveBeenCalledTimes(1);
  });
});
