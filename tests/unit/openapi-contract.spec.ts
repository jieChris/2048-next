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

  it("publishes achievement client and mode completion metadata", () => {
    const spec = readSpec();
    const generatedTypes = readGeneratedTypes();
    const achievement = readSchema(spec, "Achievement");
    const createRequest = readSchema(spec, "AchievementCreateRequest");
    const updateRequest = readSchema(spec, "AchievementUpdateRequest");

    expect(achievement).toContain("completable_clients");
    expect(achievement).toContain("required_mode_keys");
    expect(achievement).toContain("enum: [web, android]");
    expect(achievement).toContain("- completable_clients");
    expect(achievement).toContain("- required_mode_keys");
    expect(createRequest).toContain("completable_clients");
    expect(createRequest).toContain("required_mode_keys");
    expect(updateRequest).toContain("completable_clients");
    expect(updateRequest).toContain("required_mode_keys");
    expect(generatedTypes).toContain('completable_clients: ("web" | "android")[];');
    expect(generatedTypes).toContain("required_mode_keys: string[];");
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

  it("freezes the password-verified 72-hour account deletion receipt", () => {
    const spec = readSpec();
    const generatedTypes = readGeneratedTypes();
    const path = readPathItem(spec, "/account/deletion/request");
    const request = readSchema(spec, "AccountDeletionRequest");
    const response = readSchema(spec, "AccountDeletionResponse");
    const generatedPath = readGeneratedPathItem(
      generatedTypes,
      "/account/deletion/request",
    );

    expect(path).toContain("security: []");
    expect(path).toContain(
      '$ref: "#/components/schemas/AccountDeletionRequest"',
    );
    expect(path).toContain(
      '$ref: "#/components/schemas/AccountDeletionResponse"',
    );
    expect(request).toContain("required: [email, password]");
    expect(response).toContain(
      "required: [status, requestedAt, dueAt, maskedEmail]",
    );
    expect(response).toContain("const: pending_deletion");
    expect(generatedPath).toContain(
      'components["schemas"]["AccountDeletionRequest"]',
    );
    expect(generatedPath).toContain(
      'components["schemas"]["AccountDeletionResponse"]',
    );
  });

  it("freezes the anonymous redacted client diagnostics contract", () => {
    const spec = readSpec();
    const generatedTypes = readGeneratedTypes();
    const path = readPathItem(spec, "/client-diagnostics");
    const request = readSchema(spec, "ClientDiagnosticRequest");
    const response = readSchema(spec, "ClientDiagnosticResponse");
    const generatedPath = readGeneratedPathItem(
      generatedTypes,
      "/client-diagnostics",
    );

    expect(path).toContain("security: []");
    expect(path).toContain('$ref: "#/components/schemas/ClientDiagnosticRequest"');
    expect(path).toContain('"201":');
    expect(request).toContain("additionalProperties: false");
    expect(request).toContain(
      "required: [event_id, category, severity, occurred_at_ms, payload]",
    );
    expect(request).toContain("enum: [error, critical]");
    expect(request).toContain("maxLength: 8192");
    expect(request).not.toContain("email:");
    expect(request).not.toContain("token:");
    expect(request).not.toContain("board:");
    expect(request).not.toContain("replay:");
    expect(response).toContain("required: [success, accepted, duplicate]");
    expect(generatedPath).toContain(
      'components["schemas"]["ClientDiagnosticRequest"]',
    );
  });

  it("matches the Node registration and password-reset verification payloads", () => {
    const spec = readSpec();
    const generated = readGeneratedTypes();
    const registerVerify = readSchema(spec, "RegisterVerifyRequest");
    const resetVerifyPath = readPathItem(spec, "/password/reset/verify");
    const authResponse = spec.slice(
      spec.indexOf("    AuthResponse:\n"),
      spec.indexOf("    UserResponse:\n"),
    );

    expect(registerVerify).toContain("required: [email, code]");
    expect(registerVerify).not.toContain("nickname:");
    expect(registerVerify).not.toContain("password:");
    expect(registerVerify).toContain("pattern: '^\\d{6}$'");
    expect(resetVerifyPath).toContain("required: [email, code, new_password]");
    expect(resetVerifyPath).toMatch(/new_password:\n\s+type: string\n\s+minLength: 10/u);
    expect(generated).toContain('RegisterVerifyRequest: {\n            /** Format: email */\n            email: string;\n            code: string;');
    expect(generated).toContain("new_password: string;");
    expect(authResponse).toContain(
      '$ref: "#/components/schemas/AuthRefreshResponse"',
    );
    expect(generated).toContain("expiresAt: number;");
    expect(generated).toContain("ttl: number;");
  });

  it("freezes the Node email-login identity response", () => {
    const spec = readSpec();
    const generated = readGeneratedTypes();
    const login = readSchema(spec, "LoginRequest");
    const user = readSchema(spec, "User");
    const authResponse = spec.slice(
      spec.indexOf("    AuthResponse:\n"),
      spec.indexOf("    UserResponse:\n"),
    );

    expect(login).toContain("required: [email, password]");
    expect(login).not.toContain("nickname:");
    expect(user).toContain("required: [id, email, nickname, role]");
    expect(user).toMatch(/role:\n\s+type: string/u);
    expect(authResponse).toContain("required: [userId, nickname]");
    expect(authResponse).toContain(
      '$ref: "#/components/schemas/AuthRefreshResponse"',
    );
    expect(generated).toContain("email: string;\n            password: string;");
    expect(generated).not.toContain("nickname?: string;\n            /** Format: email */\n            email");
    expect(generated).toContain("userId: number;\n                    nickname: string;");
    expect(generated).toContain("role: string;");
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

  it("requires backend-owned absolute leaderboard ranks and canonical time", () => {
    const spec = readSpec();
    const entry = readSchema(spec, "LeaderboardEntry");
    const generated = readGeneratedTypes();

    [
      "rank",
      "user_id",
      "nickname",
      "score",
      "game_date",
      "canonical_ended_at",
      "mode_bucket",
      "best_tile",
      "duration_ms",
      "steps",
    ].forEach((field) => expect(entry).toContain(`- ${field}`));
    expect(entry).toMatch(/rank:\n\s+type: integer\n\s+minimum: 1/u);
    expect(entry).toContain("Compatibility alias of canonical_ended_at.");
    expect(generated).toContain("rank: number;");
    expect(generated).toContain("canonical_ended_at: string;");
    expect(generated).toContain("speed_ms?: number;");
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
