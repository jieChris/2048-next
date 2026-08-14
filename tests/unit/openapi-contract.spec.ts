import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import type { components } from "../../src/services/generated-api/2048next-v1";

const root = process.cwd();
const specPath = resolve(root, "openapi/2048next.v1.yaml");
const packagePath = resolve(root, "package.json");
const generatedTypesPath = resolve(root, "src/services/generated-api/2048next-v1.ts");
const typeCheckScriptPath = resolve(root, "scripts/check-openapi-types.mjs");
const apiDocsHtmlPath = resolve(root, "api-docs.html");
const apiManagementDocPath = resolve(root, "docs/API_MANAGEMENT.zh-CN.md");
const viteConfigPath = resolve(root, "vite.config.ts");

function readSpec(): string {
  return readFileSync(specPath, "utf8");
}

describe("OpenAPI contract", () => {
  it("types the isolated classic 4x4 showcase rows", () => {
    const row: components["schemas"]["LeaderboardShowcaseEntry"] = {
      rank: 1,
      user_id: 42,
      nickname: "TopPlayer",
      score: 120000,
      max_tile: 8192,
      board_sum: 32764,
      duration_ms: 654321
    };

    expect(row).toMatchObject({ rank: 1, score: 120000, max_tile: 8192, board_sum: 32764 });
  });

  it("types the initial insufficient-data rating response", () => {
    const stats: components["schemas"]["UserRecordStats"] = {
      rating: { value: null, status: "insufficient_data" }
    };

    expect(stats.rating).toEqual({ value: null, status: "insufficient_data" });
  });

  it("types ranked attempt capability versions without client-authoritative outcome fields", () => {
    const start: components["schemas"]["RankedSessionStartRequest"] = {
      mode_key: "standard_4x4_pow2_no_undo",
      attempt_schema_version: 1
    };
    const attempt: components["schemas"]["RankedSessionAttemptRequest"] = {
      event: "abandon",
      mode_key: "standard_4x4_pow2_no_undo",
      ranked_session_token: "ranked-token",
      replay_string: "verified-replay",
      reason: "restart",
      attempt_schema_version: 1
    };
    const record: components["schemas"]["GameRecordSubmitRequest"] = {
      score: 0,
      mode_key: "standard_4x4_pow2_no_undo",
      record_schema_version: 1
    };
    const session: components["schemas"]["RankedSession"] = {
      status: "created",
      record_era: "official_v1"
    };

    expect({ start, attempt, record, session }).toMatchObject({
      start: { attempt_schema_version: 1 },
      attempt: { event: "abandon", attempt_schema_version: 1 },
      record: { record_schema_version: 1 },
      session: { status: "created", record_era: "official_v1" }
    });
  });

  it("publishes a versioned OpenAPI contract for core and upcoming achievement APIs", () => {
    const spec = readSpec();

    expect(spec).toContain("openapi: 3.1.0");
    expect(spec).toContain("title: 2048 Next API");
    expect(spec).toContain("version: 1.0.0");

    [
      "/register:",
      "/login:",
      "/user/me:",
      "/user/nickname:",
      "/leaderboard:",
      "/leaderboard/standard-4x4-no-undo:",
      "/records:",
      "/ranked-session/start:",
      "/ranked-session/attempt:",
      "/ranked-checkpoint:",
      "/relay/cases:",
      "/relay/cases/{caseId}/snapshot:",
      "/relay/cases/{caseId}/replay:",
      "/relay/cases/{caseId}/submit:",
      "/rescue-offers/active:",
      "/admin/me:",
      "/admin/rescue-offers:",
      "/achievements:",
      "/user/me/achievements:",
      "/user/me/achievement-showcase:",
      "/user/me/achievement-events:",
      "/admin/achievements:"
    ].forEach((path) => {
      expect(spec, `${path} should be documented`).toContain(path);
    });

    [
      "ApiEnvelope:",
      "User:",
      "LeaderboardEntry:",
      "LeaderboardShowcaseEntry:",
      "GameRecord:",
      "RankedSession:",
      "RankedSessionAttemptRequest:",
      "RankedCheckpoint:",
      "RelayCase:",
      "RescueOffer:",
      "Achievement:",
      "UserAchievement:",
      "AchievementShowcase:"
    ].forEach((schema) => {
      expect(spec, `${schema} schema should be documented`).toContain(schema);
    });
  });

  it("generates TypeScript API types from the versioned contract", () => {
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const generatedTypes = readFileSync(generatedTypesPath, "utf8");

    expect(packageJson.scripts?.["api:types"]).toBe(
      "openapi-typescript openapi/2048next.v1.yaml -o src/services/generated-api/2048next-v1.ts"
    );
    expect(packageJson.devDependencies?.["openapi-typescript"]).toBeDefined();
    expect(generatedTypes).toContain("export interface paths");
    expect(generatedTypes).toContain("export interface components");
    expect(generatedTypes).toContain("\"/admin/achievements\"");
    expect(generatedTypes).toContain("\"/user/me/achievement-events\"");
    expect(generatedTypes).toContain("AchievementShowcase");
    expect(generatedTypes).toContain("AchievementEventRequest");
  });

  it("keeps generated API types under an explicit drift check", () => {
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    const script = readFileSync(typeCheckScriptPath, "utf8");

    expect(packageJson.scripts?.["api:types:check"]).toBe(
      "node scripts/check-openapi-types.mjs"
    );
    expect(packageJson.scripts?.["verify:api"]).toContain("npm run api:types:check");
    expect(packageJson.scripts?.["verify:api"]).toContain("tests/unit/openapi-contract.spec.ts");
    expect(script).toContain("openapi-typescript");
    expect(script).toContain("npm run api:types");
    expect(script).toContain("2048next-v1.ts");
  });

  it("ships a self-hosted API documentation page backed by the same contract", () => {
    const html = readFileSync(apiDocsHtmlPath, "utf8");
    const viteConfig = readFileSync(viteConfigPath, "utf8");

    expect(html).toContain("<title>2048 Next API 文档</title>");
    expect(html).toContain('href="openapi/2048next.v1.yaml"');
    expect(html).toContain('src="./src/entries/api-docs.ts"');
    expect(html).toContain("script-src 'self'");
    expect(html).not.toMatch(/https?:\/\//u);
    expect(viteConfig).toContain("api_docs: resolve(__dirname, \"api-docs.html\")");
    expect(viteConfig).toContain("copyOpenApiContractPlugin");
  });

  it("documents the commercial API management workflow", () => {
    expect(existsSync(apiManagementDocPath)).toBe(true);
    const doc = readFileSync(apiManagementDocPath, "utf8");

    [
      "接口契约源",
      "npm run api:types",
      "npm run api:types:check",
      "npm run verify:api",
      "兼容性要求",
      "上线前检查"
    ].forEach((text) => {
      expect(doc).toContain(text);
    });
  });
});
