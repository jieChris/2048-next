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
});
