import { describe, expect, it } from "vitest";

import {
  assertIsolatedHealth,
  normalizeBackendReadyBase,
  parseBackendReadyArgs,
} from "../../scripts/verify-backend-ready.mjs";

describe("backend-ready verifier safety", () => {
  it("requires fixed API and root Web bases", () => {
    expect(parseBackendReadyArgs([
      "--api-base=http://127.0.0.1:3100/api",
      "--web-base=http://127.0.0.1:4173",
    ])).toMatchObject({
      apiBase: "http://127.0.0.1:3100/api",
      webBase: "http://127.0.0.1:4173",
    });
    expect(() => normalizeBackendReadyBase("http://127.0.0.1:3100", "api-base")).toThrow("exactly /api");
    expect(() => normalizeBackendReadyBase("http://127.0.0.1:4173/site", "web-base")).toThrow("site root");
  });

  it("refuses production health before creating the test account", () => {
    expect(() => assertIsolatedHealth({
      success: true,
      service: "2048-game-data-api",
      database: "ok",
      env: "production",
      version: "abc123",
    })).toThrow("production environment");
  });
});
