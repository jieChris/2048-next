import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

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

function readGeneratedTypes(): string {
  return readFileSync(generatedTypesPath, "utf8");
}

function readPathItem(source: string, path: string): string {
  const marker = `  ${path}:\n`;
  const start = source.indexOf(marker);
  expect(start, `${path} should be documented`).toBeGreaterThanOrEqual(0);
  const followingPathOffset = source.slice(start + marker.length).search(/\n  \/[^\n]+:\n/u);
  const end = followingPathOffset < 0
    ? source.length
    : start + marker.length + followingPathOffset;
  return source.slice(start, end);
}

function readGeneratedPathItem(source: string, path: string): string {
  const marker = `    "${path}": {\n`;
  const start = source.indexOf(marker);
  expect(start, `${path} should have generated types`).toBeGreaterThanOrEqual(0);
  const followingPathOffset = source.slice(start + marker.length).search(/\n    "\/[^\n]+": \{/u);
  const end = followingPathOffset < 0
    ? source.length
    : start + marker.length + followingPathOffset;
  return source.slice(start, end);
}

function readSchema(source: string, schema: string): string {
  const marker = `    ${schema}:\n`;
  const start = source.indexOf(marker);
  expect(start, `${schema} schema should be documented`).toBeGreaterThanOrEqual(0);
  const followingSchemaOffset = source.slice(start + marker.length).search(/\n    [A-Za-z][A-Za-z0-9]*:\n/u);
  const end = followingSchemaOffset < 0
    ? source.length
    : start + marker.length + followingSchemaOffset;
  return source.slice(start, end);
}

describe("OpenAPI contract", () => {
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
      "/records:",
      "/ranked-session/start:",
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
      "GameRecord:",
      "RankedSession:",
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

  it("documents the existing token refresh contract without inventing a refresh-token route", () => {
    const spec = readSpec();
    const generatedTypes = readGeneratedTypes();
    const refreshPath = readPathItem(spec, "/auth/refresh");
    const generatedRefreshPath = readGeneratedPathItem(generatedTypes, "/auth/refresh");
    const refreshRequest = readSchema(spec, "AuthRefreshRequest");
    const refreshResponse = readSchema(spec, "AuthRefreshResponse");
    const refreshError = readSchema(spec, "AuthRefreshError");

    expect(refreshPath).toContain("- bearerAuth: []");
    expect(refreshPath).toContain("- {}");
    expect(refreshPath).toContain('$ref: "#/components/schemas/AuthRefreshRequest"');
    expect(refreshPath).toContain('$ref: "#/components/schemas/AuthRefreshResponse"');
    expect(refreshPath).toContain('$ref: "#/components/schemas/AuthRefreshError"');
    expect(refreshRequest).toMatch(/\n        token:\n          type: string\n/u);
    expect(refreshRequest).not.toContain("required: [token]");
    expect(refreshResponse).toContain("required: [success, token, expiresAt, ttl, user]");
    expect(refreshResponse).toMatch(/expiresAt:\n\s+type: integer\n\s+format: int64/u);
    expect(refreshResponse).toMatch(/ttl:\n\s+type: integer/u);
    expect(refreshError).toContain("enum: [INVALID_TOKEN, TOKEN_REVOKED, UNAUTHORIZED]");
    expect(generatedRefreshPath).toContain('components["schemas"]["AuthRefreshRequest"]');
    expect(generatedRefreshPath).toContain('components["schemas"]["AuthRefreshResponse"]');
    expect(generatedTypes).not.toContain('"/auth/refresh-token"');
  });

  it("uses the Node leaderboard period vocabulary in the contract and generated types", () => {
    const leaderboardPath = readPathItem(readSpec(), "/leaderboard");
    const generatedLeaderboardPath = readGeneratedPathItem(readGeneratedTypes(), "/leaderboard");

    expect(leaderboardPath).toContain("enum: [all, day, week, month]");
    expect(leaderboardPath).not.toMatch(/\b(?:daily|weekly|monthly)\b/u);
    expect(generatedLeaderboardPath).toContain('period?: "all" | "day" | "week" | "month";');
  });

  it("documents public active history and owner-only deleted history with the actual response shape", () => {
    const recordsPath = readPathItem(readSpec(), "/user/{userId}/records");
    const generatedRecordsPath = readGeneratedPathItem(readGeneratedTypes(), "/user/{userId}/records");

    expect(recordsPath).toContain("Active records are public");
    expect(recordsPath).toContain("deleted or all requires Bearer authentication for the same user ID");
    expect(recordsPath).toContain("- bearerAuth: []");
    expect(recordsPath).toContain("- {}");
    expect(recordsPath).toMatch(/- name: status[\s\S]*?enum: \[active, deleted, all\][\s\S]*?default: active/u);
    expect(recordsPath).toContain("- name: mode_key");
    expect(recordsPath).not.toContain("- name: visibility");
    expect(recordsPath).toContain('"401":');
    expect(recordsPath).toContain('"403":');
    expect(recordsPath).toContain("required: [data, page, limit, total, total_pages, has_prev, has_next, pagination, status, sort_by, order]");
    expect(recordsPath).toContain("data:");
    expect(recordsPath).toContain("records:");
    expect(recordsPath).toContain("pagination:");
    expect(recordsPath).toContain("total_pages:");
    expect(recordsPath).toContain("has_prev:");
    expect(recordsPath).toContain("has_next:");

    expect(generatedRecordsPath).toContain('status?: "active" | "deleted" | "all";');
    expect(generatedRecordsPath).toContain("mode_key?: string;");
    expect(generatedRecordsPath).not.toContain("visibility?:");
    expect(generatedRecordsPath).toContain('data: components["schemas"]["GameRecord"][];');
    expect(generatedRecordsPath).toContain("total_pages: number;");
    expect(generatedRecordsPath).toContain("has_prev: boolean;");
    expect(generatedRecordsPath).toContain("has_next: boolean;");
  });

  it("includes the actual Node history fields in generated record types", () => {
    const gameRecord = readSchema(readSpec(), "GameRecord");
    const generatedTypes = readGeneratedTypes();

    expect(gameRecord).toMatch(/source:\n\s+type: string\n\s+enum: \[normal, ranked, migration, admin\]/u);
    expect(gameRecord).toMatch(/steps:\n\s+type: integer\n\s+minimum: 0/u);
    expect(gameRecord).toMatch(/client_record_id:\n\s+type:\n\s+- string\n\s+- "null"/u);
    expect(gameRecord).toMatch(/best_tile:\n\s+type: integer\n\s+minimum: 0/u);
    expect(gameRecord).toMatch(/ended_at:\n\s+type: string\n\s+format: date-time/u);
    expect(gameRecord).toMatch(/end_reason:\n\s+type: string/u);
    expect(generatedTypes).toContain('source?: "normal" | "ranked" | "migration" | "admin";');
    expect(generatedTypes).toContain("steps?: number;");
    expect(generatedTypes).toContain("client_record_id?: string | null;");
    expect(generatedTypes).toContain("best_tile?: number;");
    expect(generatedTypes).toContain("ended_at?: string;");
    expect(generatedTypes).toContain("end_reason?: string;");
  });

  it("freezes the idempotent ranked session start and clock-anchor contract", () => {
    const spec = readSpec();
    const rankedStartPath = readPathItem(spec, "/ranked-session/start");
    const request = readSchema(spec, "RankedSessionStartRequest");
    const session = readSchema(spec, "RankedSession");
    const generatedPath = readGeneratedPathItem(readGeneratedTypes(), "/ranked-session/start");
    const generated = readGeneratedTypes();

    expect(request).toMatch(/operation_id:\n\s+type: string\n\s+minLength: 16\n\s+maxLength: 128/u);
    expect(request).toContain("pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$'");
    expect(session).toContain("additionalProperties: false");
    [
      "ranked_session_id",
      "internal_id",
      "operation_id",
      "mode_key",
      "mode_bucket",
      "challenge_id",
      "seed",
      "ranked_session_token",
      "issued_at",
      "started_at",
      "started_at_ms",
      "server_now_ms",
      "expired_at",
      "expires_at",
      "exp",
      "status"
    ].forEach((field) => {
      expect(session).toContain(`- ${field}`);
    });
    expect(session).toMatch(/operation_id:\n\s+type:\n\s+- string\n\s+- "null"/u);
    expect(session).toMatch(/seed:\n\s+type: integer\n\s+minimum: 0\n\s+maximum: 4294967295/u);
    expect(session).toMatch(/status:\n\s+type: string\n\s+enum: \[started, consumed, expired, abandoned\]/u);
    expect(session).not.toMatch(/\n\s+id:\n/u);

    ["200", "400", "401", "409", "500"].forEach((status) => {
      expect(rankedStartPath).toContain(`        "${status}":`);
      expect(generatedPath).toContain(`${status}:`);
    });
    [
      "UNSUPPORTED_MODE",
      "INVALID_OPERATION_ID",
      "UNAUTHORIZED",
      "TOKEN_REVOKED",
      "RANKED_SESSION_OPERATION_CONFLICT",
      "RANKED_SESSION_OPERATION_INTEGRITY_ERROR",
      "RANKED_SESSION_START_FAILED"
    ].forEach((code) => {
      expect(spec).toContain(code);
      expect(generated).toContain(code);
    });

    expect(generated).toContain("operation_id?: string;");
    expect(generated).toContain("operation_id: string | null;");
    expect(generated).toContain("ranked_session_id: string;");
    expect(generated).toContain("seed: number;");
    expect(generated).toContain("started_at_ms: number;");
    expect(generated).toContain("server_now_ms: number;");
    expect(generated).toContain('status: "started" | "consumed" | "expired" | "abandoned";');
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
