import { describe, expect, it, vi } from "vitest";

import {
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
        return key === "2048_auth_token_v1" ? "token-1" : null;
      },
      setItem() {},
      removeItem() {}
    };

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

  it("returns a stable error object when all bases fail", async () => {
    const fetchLike = vi.fn().mockRejectedValue(new Error("offline"));
    const client = createJsonApiClient({
      bases: ["https://api-a.test", "https://api-b.test"],
      fetchLike,
      token: "token-1"
    });

    await expect(client.request("/admin/me", { method: "GET" })).resolves.toEqual({
      success: false,
      error: "offline"
    });
    expect(fetchLike).toHaveBeenCalledTimes(2);
  });
});
