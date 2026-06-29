import { describe, expect, it, vi } from "vitest";

import { createTypedApiClient } from "../../src/services/typed-api-client";

describe("services: typed-api-client", () => {
  it("serializes query params and JSON body before delegating to JsonApiClient", async () => {
    const request = vi.fn().mockResolvedValue({ success: true, data: { achievements: [] } });
    const client = createTypedApiClient({
      request
    });

    await expect(
      client.request("put", "/user/me/achievement-showcase", {
        query: { preview: true, empty: "", skip: undefined },
        body: { achievement_ids: ["a-1", "a-2"] }
      })
    ).resolves.toEqual({ success: true, data: { achievements: [] } });

    expect(request).toHaveBeenCalledWith(
      "/user/me/achievement-showcase?preview=true&empty=",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ achievement_ids: ["a-1", "a-2"] })
      })
    );
  });

  it("interpolates OpenAPI path params before delegating to JsonApiClient", async () => {
    const request = vi.fn().mockResolvedValue({ success: true, data: { id: "first-2048" } });
    const client = createTypedApiClient({
      request
    });

    await expect(
      client.request("patch", "/admin/achievements/{achievementId}", {
        path: { achievementId: "first 2048" },
        body: { status: "active" }
      })
    ).resolves.toEqual({ success: true, data: { id: "first-2048" } });

    expect(request).toHaveBeenCalledWith(
      "/admin/achievements/first%202048",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "active" })
      })
    );
  });
});
