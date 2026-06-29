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
    expect(generatedTypes).toContain("AchievementShowcase");
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
