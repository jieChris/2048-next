import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { STEP_TIMEOUT_BY_NAME_MS } from "../../scripts/refactor-gate.mjs";

function occurrences(source: string, pattern: RegExp) {
  return source.match(pattern)?.length || 0;
}

describe("core performance release integration", () => {
  it("runs performance immediately after the refactor gate's only build", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    const gate = await readFile("scripts/refactor-gate.mjs", "utf8");

    expect(packageJson.scripts["test:performance:core"]).toBe(
      "node scripts/core-performance-check.mjs",
    );
    expect(packageJson.scripts["verify:release"]).toContain(
      "npm run verify:refactor:ci",
    );
    const buildIndex = gate.indexOf(
      '{ name: "build", cmd: "npm", args: ["run", "build"] },',
    );
    const performanceIndex = gate.indexOf('name: "core-performance"');
    expect(buildIndex).toBeGreaterThan(-1);
    expect(performanceIndex).toBeGreaterThan(buildIndex);
    expect(gate.match(/args: \["run", "build"\]/gu)).toHaveLength(1);
    expect(STEP_TIMEOUT_BY_NAME_MS["core-performance"]).toBeGreaterThan(
      300_000,
    );
  });

  it("passes a real baseline and hands the sole deterministic dist through both workflows", async () => {
    const smokeWorkflow = await readFile(".github/workflows/smoke.yml", "utf8");
    const deployWorkflow = await readFile(
      ".github/workflows/deploy-self-hosted.yml",
      "utf8",
    );

    const refactorIndex = smokeWorkflow.indexOf(
      "run: npm run verify:refactor:ci",
    );
    const uploadIndex = smokeWorkflow.indexOf("name: deterministic-dist");
    expect(refactorIndex).toBeGreaterThan(-1);
    expect(uploadIndex).toBeGreaterThan(refactorIndex);
    expect(smokeWorkflow).toContain("CORE_PERFORMANCE_BASELINE_REF:");
    expect(smokeWorkflow).toContain(
      "REFACTOR_GATE_TIMEOUT_CORE_PERFORMANCE_MS:",
    );
    expect(smokeWorkflow).toContain("fetch-depth: 0");
    expect(smokeWorkflow).toContain("artifacts/core-performance");
    expect(smokeWorkflow).toContain("npm run verify:release-ready");
    expect(smokeWorkflow).toContain("ARCHITECTURE_BUDGET_BASELINE_REF:");
    expect(smokeWorkflow).toContain("CORE_LOAD_BUDGET_BASELINE_REF:");
    expect(smokeWorkflow).toContain("name: Download deterministic fresh dist");

    expect(deployWorkflow).toContain("uses: ./.github/workflows/smoke.yml");
    expect(deployWorkflow).not.toContain("run: npm run verify:release");
    expect(deployWorkflow).not.toContain("run: npm run build");
    expect(deployWorkflow).toContain("name: deterministic-dist");
    expect(deployWorkflow).toContain("path: dist");
    expect(deployWorkflow).toContain(
      'test "${GITHUB_SHA}" = "${EXPECTED_SHA}"',
    );
    expect(
      deployWorkflow.indexOf("name: Download deterministic fresh dist"),
    ).toBeLessThan(deployWorkflow.indexOf("name: Archive dist bundle"));

    const totalBuildsPerManualRelease =
      occurrences(smokeWorkflow, /run: npm run verify:refactor:ci/gu) +
      occurrences(deployWorkflow, /run: npm run (?:build|verify:release)/gu);
    expect(totalBuildsPerManualRelease).toBe(1);
  });

  it("documents explicit actual-base local commands and release tooling ownership", async () => {
    const releaseChecklist = await readFile(
      "docs/RELEASE_STABLE_CHECKLIST.zh-CN.md",
      "utf8",
    );
    const commitBatches = await readFile(
      "scripts/commit-batch-defs.mjs",
      "utf8",
    );

    expect(releaseChecklist).toContain(
      "CORE_PERFORMANCE_BASELINE_REF=<实际基线提交>",
    );
    expect(releaseChecklist).toContain("不得使用候选 HEAD");
    expect(releaseChecklist).toContain("deterministic-dist");
    expect(commitBatches).toContain("scripts/core-performance-check.mjs");
    expect(commitBatches).toContain("scripts/core-performance/policy.mjs");
    expect(commitBatches).toContain("config/core-performance-budgets.json");
  });
});
