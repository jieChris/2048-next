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

  it("keeps public player profiles on an explicit sensitive-field allowlist", () => {
    const spec = readSpec();
    const publicSchema = spec.slice(spec.indexOf("    PublicUserProfile:"), spec.indexOf("    UserProfileSnapshot:"));

    expect(spec).toContain('$ref: "#/components/responses/PublicUserProfileResponse"');
    expect(publicSchema).toContain("additionalProperties: false");
    expect(publicSchema).toContain("featured_mode_keys:");
    expect(publicSchema).not.toContain("email:");
    expect(publicSchema).not.toContain("admin:");
    expect(publicSchema).not.toContain("super_admin:");
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
      "/user/me/moderation-submissions:",
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
      "/admin/moderation/submissions:",
      "/admin/moderation/submissions/{submissionId}/review:",
      "/admin/moderation/submissions/{submissionId}/retry:",
      "/admin/integrations/deepseek:",
      "/admin/integrations/deepseek/key:",
      "/admin/integrations/deepseek/test:",
      "/admin/profile-background/variants:",
      "/admin/profile-background/scenes:",
      "/admin/profile-background/scenes/{sceneId}/publish:",
      "/admin/profile-background/scenes/{sceneId}/archive:",
      "/admin/profile-background/default:",
      "/profile-backgrounds:",
      "/profile-backgrounds/{sceneId}/layers:",
      "/profile-backgrounds/{sceneId}/preview.png:",
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

  it("freezes account palette sync V2 resources and granular Theme Plaza capabilities", () => {
    const spec = readSpec();

    [
      "/me/palette-sync/bootstrap:",
      "/me/palettes:",
      "/me/palettes/{paletteId}:",
      "/me/palette-selection:",
      "/me/palette-order:",
    ].forEach((path) => expect(spec, `${path} should be documented`).toContain(path));

    [
      "AccountPaletteSyncCapabilities:",
      "AccountPaletteRecord:",
      "AccountPaletteRevision:",
      "AccountPaletteSelectionState:",
      "AccountPaletteOrderState:",
      "AccountPaletteWriteResult:",
      "AccountPaletteTombstone:",
      "AccountPaletteChange:",
    ].forEach((schema) => expect(spec, `${schema} should be documented`).toContain(schema));

    expect(spec).toContain("NewPaletteStableId:");
    expect(spec).toContain("Opaque account-scoped stable ID; migrated legacy IDs are preserved.");
    expect(spec).toContain("maxActivePalettes: { type: integer, const: 10 }");
    expect(spec).toContain("reactionEnabled: { type: boolean }");
    expect(spec).toContain("saveEnabled: { type: boolean }");
    expect(spec).toContain("shareEnabled: { type: boolean }");
    expect(spec).toContain("ThemePlazaSaveResult:");
    expect(spec).toContain("required: [operationId]");
    expect(spec).toContain("- required: [existingPaletteId]");
    expect(spec).toContain("status: { type: string, enum: [saved, duplicate_existing, capacity_full] }");
    expect(spec).toContain("changes:");
    expect(spec).toContain("entityKind: { type: string, enum: [palette, selection, order] }");
    const legacyPaletteGet = spec.slice(
      spec.indexOf("  /me/app-palettes:"),
      spec.indexOf("    put:", spec.indexOf("  /me/app-palettes:")),
    );
    expect(legacyPaletteGet).toContain('"409":');
    expect(legacyPaletteGet).toContain("nine- or ten-palette V2 library");
    expect(spec).toContain("allowDuplicate: { type: boolean, default: false");
    expect(spec).toContain("PALETTE_SYNC_CLIENT_UPGRADE_REQUIRED");
    expect(spec).toContain("base_revision_expired");
    expect(spec).toContain("conflict_copy");
  });

  it("documents complete day and night profile background scenes", () => {
    const spec = readSpec();

    expect(spec).toContain("ProfileBackgroundVariant:");
    expect(spec).toContain("ProfileBackgroundScene:");
    expect(spec).toContain("ProfileBackgroundLayers:");
    expect(spec).toContain("enum: [day, night]");
    expect(spec).toContain("preview_url:");
    expect(spec).toContain("/profile-backgrounds/{sceneId}/preview.png:");
    expect(spec).toContain("layers:");
    expect(spec).toContain("sky:");
    expect(spec).toContain("city:");
    expect(spec).toContain("foreground:");
  });

  it("documents P0b moderation and masked DeepSeek administration without exposing a generic SQL escape hatch", () => {
    const spec = readSpec();

    expect(spec).toContain("AdminModerationSubmission:");
    expect(spec).toContain("ModerationReviewRequest:");
    expect(spec).toContain("DeepSeekKeyUpdateRequest:");
    expect(spec).toContain("DeepSeekIntegrationState:");
    expect(spec).toContain("ModerationReviewRequest:\n      oneOf:");
    expect(spec).toContain("decision: { type: string, const: approved }");
    expect(spec).toContain("reason_code: { type: string, const: admin_retry }");
    expect(spec).toContain("const: deepseek-v4-flash");
    const adminQuery = spec.slice(spec.indexOf("  /admin/query:"), spec.indexOf("  /admin/rescue-offers:"));
    expect(adminQuery).toContain("deprecated: true");
    expect(adminQuery).toContain('"410":');
    expect(adminQuery).not.toContain('"200":');
    expect(adminQuery).not.toContain("sql:");
  });

  it("keeps profile update conflict and throttle payloads code-specific", () => {
    const spec = readSpec();
    const generatedTypes = readFileSync(generatedTypesPath, "utf8");
    const responses = spec.slice(spec.indexOf("    UserProfileUpdateConflictResponse:"), spec.indexOf("    AchievementResponse:"));
    const schemas = spec.slice(spec.indexOf("    ProfileUpdateConflictError:"), spec.indexOf("    ModerationSubmissionSummary:"));
    const generatedConflict = generatedTypes.slice(generatedTypes.indexOf("        ProfileUpdateConflictError:"), generatedTypes.indexOf("        ProfileRateLimitData:"));

    expect(responses).toContain('$ref: "#/components/schemas/ProfileUpdateConflictError"');
    expect(responses).toContain('$ref: "#/components/schemas/ProfileUpdateRateLimitError"');
    expect(responses).not.toContain('$ref: "#/components/schemas/ApiError"');
    expect(schemas).toContain("oneOf:");
    expect(schemas).toContain("const: PROFILE_REVISION_CONFLICT");
    expect(schemas).toContain("const: CONTENT_REVIEW_PENDING");
    expect(schemas).toContain("const: IDEMPOTENCY_KEY_CONFLICT");
    expect(generatedConflict).toContain('code: "GAME_ACCOUNT_MAPPING_UNAVAILABLE"');
    expect(generatedConflict).toContain('code: "GAME_USER_NOT_FOUND"');
    expect(schemas).toContain('$ref: "#/components/schemas/UserProfileConflictSnapshot"');
    expect(schemas).toContain('$ref: "#/components/schemas/ProfileContentReviewPendingData"');
    expect(schemas).toContain("next_allowed_at:");
    expect(schemas).toContain("const: BIO_RATE_LIMITED");
    expect(schemas).toContain("const: BIO_TEMPORARILY_BLOCKED");
  });

  it("documents no-store sensitive responses and typed DeepSeek results", () => {
    const spec = readSpec();
    const generatedTypes = readFileSync(generatedTypesPath, "utf8");
    const userModeration = spec.slice(spec.indexOf("  /user/me/moderation-submissions:"), spec.indexOf("  /user/me/avatar-submission:"));
    const adminSensitive = spec.slice(spec.indexOf("  /admin/moderation/submissions:"), spec.indexOf("  /admin/profile-background/variants:"));
    const sensitiveSchemas = spec.slice(spec.indexOf("    DeepSeekDisableResult:"), spec.indexOf("    AvatarSubmission:"));
    const generatedDeepSeekKey = generatedTypes.slice(generatedTypes.indexOf('    "/admin/integrations/deepseek/key":'), generatedTypes.indexOf('    "/admin/integrations/deepseek/test":'));
    const generatedDeepSeekTest = generatedTypes.slice(generatedTypes.indexOf('    "/admin/integrations/deepseek/test":'), generatedTypes.indexOf('    "/admin/dashboard":'));

    expect(spec).toContain("    NoStore:");
    expect(spec).toContain("const: no-store");
    expect(userModeration).toContain('$ref: "#/components/headers/NoStore"');
    expect(userModeration).toContain('$ref: "#/components/responses/ApiErrorResponse"');
    expect(userModeration).not.toContain('$ref: "#/components/responses/NoStoreApiErrorResponse"');
    expect(adminSensitive.match(/#\/components\/headers\/NoStore/g)).toHaveLength(9);
    expect(adminSensitive).not.toContain('$ref: "#/components/responses/ApiErrorResponse"');
    expect(adminSensitive).toContain('$ref: "#/components/schemas/DeepSeekDisableResult"');
    expect(adminSensitive).toContain('$ref: "#/components/schemas/DeepSeekConnectionTestSuccess"');
    expect(adminSensitive).toContain('$ref: "#/components/schemas/DeepSeekConnectionTestPending"');
    expect(sensitiveSchemas).toContain("const: false");
    expect(sensitiveSchemas).toContain("const: disabled");
    expect(sensitiveSchemas).toContain("const: ok");
    expect(sensitiveSchemas).toContain("const: pending");
    expect(sensitiveSchemas).toContain('type: [integer, "null"]');
    expect(generatedDeepSeekKey).toContain('data: components["schemas"]["DeepSeekDisableResult"]');
    expect(generatedDeepSeekKey).not.toContain('data?: components["schemas"]["DeepSeekDisableResult"]');
    expect(generatedDeepSeekTest).toContain('data: components["schemas"]["DeepSeekConnectionTestSuccess"]');
    expect(generatedDeepSeekTest).toContain('data: components["schemas"]["DeepSeekConnectionTestPending"]');
    expect(generatedDeepSeekTest).toContain('components["schemas"]["DeepSeekConnectionTestFailureEnvelope"]');
  });

  it("freezes reviewed avatar upload, private image, and administrator review contracts", () => {
    const spec = readSpec();
    const generatedTypes = readFileSync(generatedTypesPath, "utf8");
    const adminMe = spec.slice(spec.indexOf("  /admin/me:"), spec.indexOf("  /admin/moderation/submissions:"));
    const userAvatar = spec.slice(spec.indexOf("  /user/me/avatar-submission:"), spec.indexOf("  /user/me/nickname:"));
    const adminAvatar = spec.slice(spec.indexOf("  /admin/avatar-submissions:"), spec.indexOf("  /admin/record-delivery-health:"));
    const schemas = spec.slice(spec.indexOf("    AvatarSubmission:"), spec.indexOf("    RegisterRequest:"));
    const generatedUserAvatar = generatedTypes.slice(generatedTypes.indexOf('    "/user/me/avatar-submission":'), generatedTypes.indexOf('    "/user/me/nickname":'));

    expect(userAvatar.match(/#\/components\/parameters\/IdempotencyKeyHeader/g)).toHaveLength(1);
    expect(adminMe).toContain("avatar_review_enabled");
    expect(userAvatar).not.toContain("ProfileBackgroundVariant");
    expect(userAvatar.match(/#\/components\/schemas\/AvatarSubmission/g)).toHaveLength(3);
    expect(adminAvatar.match(/#\/components\/parameters\/IdempotencyKeyHeader/g)).toHaveLength(1);
    expect(adminAvatar).toContain("X-Content-Type-Options:");
    expect(adminAvatar.match(/#\/components\/headers\/NoStore/g)).toHaveLength(3);
    expect(schemas).toContain("required: [decision, reason_code]");
    expect(schemas).not.toContain("review_note:");
    expect(schemas).not.toContain("note:");
    expect(generatedUserAvatar).not.toContain('ProfileBackgroundVariant');
    expect(generatedUserAvatar).toContain('"Idempotency-Key": components["parameters"]["IdempotencyKeyHeader"]');
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

  it("documents the public-profile validation and conflict contract", () => {
    const spec = readSpec();
    const updateRequest = spec.slice(spec.indexOf("    UserProfileUpdateRequest:"), spec.indexOf("    PublicUserProfile:"));

    expect(updateRequest).toContain("minProperties: 2");
    expect(updateRequest).toContain("- required: [background_scene_id]");
    expect(updateRequest).toContain("- required: [featured_mode_keys]");
    expect(updateRequest).toContain("- required: [profile_bio]");
    expect(updateRequest).toContain("profile_bio:");
    expect(spec).toContain('"429":');
    expect(spec).toContain("ModerationSubmissionSummary:");
    expect(spec).toContain("moderation_submission:");
    expect(spec).toContain("UserProfileUpdateConflictResponse:");
    expect(spec).toContain("- revision_conflict");
    expect(spec).toContain("- idempotency_conflict");
    expect(spec).toContain("- rate_limited");
    expect(spec).toContain("- bio_temporarily_blocked");
    expect(spec).toContain("- content_review_pending");
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
