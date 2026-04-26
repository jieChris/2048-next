import { describe, expect, it } from "vitest";

import { buildRankedSessionApiBaseCandidates } from "../../src/bootstrap/ranked-session";

describe("ranked session API base candidates", () => {
  it("prefers same-origin API before remote fallback on mirror domains", () => {
    expect(
      buildRankedSessionApiBaseCandidates({
        location: {
          hostname: "www.2048next.cn",
          origin: "https://www.2048next.cn"
        }
      } as Window)
    ).toEqual(["https://www.2048next.cn/api", "https://taihe.fun/api"]);
  });

  it("keeps local development on same-origin unless cross-origin fallback is enabled", () => {
    expect(
      buildRankedSessionApiBaseCandidates({
        location: {
          hostname: "127.0.0.1",
          origin: "http://127.0.0.1:5173"
        }
      } as Window)
    ).toEqual(["http://127.0.0.1:5173/api"]);
  });

  it("preserves explicit override before same-origin and configured fallback", () => {
    expect(
      buildRankedSessionApiBaseCandidates({
        GAME_API_BASE_URL: "https://staging.example.com/api/",
        GAME_API_FALLBACK_BASE_URL: "https://api.example.com/api/",
        location: {
          hostname: "play.example.com",
          origin: "https://play.example.com"
        }
      } as Window)
    ).toEqual([
      "https://staging.example.com/api",
      "https://play.example.com/api",
      "https://api.example.com/api"
    ]);
  });
});
