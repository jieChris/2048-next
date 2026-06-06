import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

interface ApiSharedWindowLike {
  ApiSharedUtils?: {
    buildApiBaseCandidates: () => string[];
  };
  GAME_API_ALLOW_CROSS_ORIGIN_FALLBACK?: string;
  GAME_API_BASE_URL?: string;
  GAME_API_FALLBACK_BASE_URL?: string;
  location: {
    hostname: string;
    origin: string;
  };
}

function loadApiSharedUtils(windowLike: ApiSharedWindowLike): ApiSharedWindowLike["ApiSharedUtils"] {
  const scriptPath = path.resolve(process.cwd(), "js/api_shared_utils.js");
  const script = readFileSync(scriptPath, "utf8");
  vm.runInNewContext(script, { window: windowLike, globalThis: windowLike, console });
  return windowLike.ApiSharedUtils;
}

describe("api shared utils API base candidates", () => {
  it("prefers same-origin API before remote fallback on 2048next.cn", () => {
    const api = loadApiSharedUtils({
      location: {
        hostname: "2048next.cn",
        origin: "https://2048next.cn"
      }
    });

    expect(api?.buildApiBaseCandidates()).toEqual([
      "https://2048next.cn/api"
    ]);
  });

  it("keeps explicit API base override first", () => {
    const api = loadApiSharedUtils({
      GAME_API_BASE_URL: "https://staging.example.com/api/",
      location: {
        hostname: "2048next.cn",
        origin: "https://2048next.cn"
      }
    });

    expect(api?.buildApiBaseCandidates()).toEqual([
      "https://staging.example.com/api",
      "https://2048next.cn/api"
    ]);
  });

  it("uses 2048next.cn instead of the deprecated taihe.fun backend", () => {
    const api = loadApiSharedUtils({
      location: {
        hostname: "taihe.fun",
        origin: "https://2048next.cn"
      }
    });

    expect(api?.buildApiBaseCandidates()).toEqual(["https://2048next.cn/api"]);
  });

  it("does not add production fallback for local development unless enabled", () => {
    const api = loadApiSharedUtils({
      location: {
        hostname: "localhost",
        origin: "http://localhost:5173"
      }
    });

    expect(api?.buildApiBaseCandidates()).toEqual(["http://localhost:5173/api"]);
  });

  it("uses configured fallback API after same-origin for public deployments", () => {
    const api = loadApiSharedUtils({
      GAME_API_FALLBACK_BASE_URL: "https://api.example.com/api/",
      location: {
        hostname: "play.example.com",
        origin: "https://play.example.com"
      }
    });

    expect(api?.buildApiBaseCandidates()).toEqual([
      "https://play.example.com/api",
      "https://api.example.com/api"
    ]);
  });
});
