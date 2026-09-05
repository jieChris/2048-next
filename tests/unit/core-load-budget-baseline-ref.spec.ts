import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  evaluateCoreLoadBudget,
  parseCoreLoadBudgetCliOptions,
  readCoreLoadRepositoryConfigFromRef,
  runCoreLoadBudgetCli,
} from "../../scripts/core-load-budget-check.mjs";
import {
  REQUIRED_LEGACY_METRICS,
  REQUIRED_PAGE_METRICS,
} from "../../scripts/core-load-budget/schema.mjs";

function exactMetrics(names: readonly string[], value = 0) {
  return Object.fromEntries(names.map((name) => [name, value]));
}

function completeConfig() {
  const page = (html: string) => ({
    html,
    criticalPreloads: [],
    max: exactMetrics(REQUIRED_PAGE_METRICS),
  });
  const bundle = (pathValue: string) => ({
    path: pathValue,
    max: exactMetrics(REQUIRED_LEGACY_METRICS),
  });
  return {
    schemaVersion: 1,
    distPath: "dist",
    compression: { preferred: "br", fallback: "gzip", requireBrotli: true },
    graphPolicy: {
      staticImports: "included",
      dynamicImports: "deferred-separate",
      navigationHrefs: "excluded",
      cssDependencies: "transitive",
      dataAndFragmentUrls: "embedded-excluded",
      queryStrings: "request-identity",
    },
    pages: {
      home: page("2048.html"),
      play: page("play.html"),
      replay: page("replay.html"),
    },
    legacyBundles: {
      startup: bundle("js/home_standard_startup_bundle.js"),
      deferred: bundle("js/home_standard_deferred_bundle.js"),
    },
  };
}

function completeAnalysis() {
  const metrics = Object.fromEntries(
    REQUIRED_PAGE_METRICS.map((metric) => [
      metric,
      { actual: 0, encoding: "br", path: "fixture" },
    ]),
  );
  const legacyMetrics = Object.fromEntries(
    REQUIRED_LEGACY_METRICS.map((metric) => [
      metric,
      { actual: 0, encoding: "br", path: "fixture" },
    ]),
  );
  return {
    analysis: {
      pages: Object.fromEntries(
        ["home", "play", "replay"].map((page) => [
          page,
          { criticalPreloads: [], metrics },
        ]),
      ),
      discoveryViolations: [],
    },
    legacyAnalysis: {
      bundles: Object.fromEntries(
        ["startup", "deferred"].map((name) => [
          name,
          { metrics: legacyMetrics },
        ]),
      ),
      violations: [],
    },
  };
}

function git(root: string, args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

async function createRepository(
  withConfig: boolean,
  config: Record<string, unknown> = { schemaVersion: 1, marker: "baseline" },
) {
  const root = await mkdtemp(path.join(tmpdir(), "core-load-budget-git-"));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "fixture@example.com"]);
  git(root, ["config", "user.name", "Fixture"]);
  await writeFile(path.join(root, "seed.txt"), "seed\n");
  if (withConfig) {
    await mkdir(path.join(root, "config"), { recursive: true });
    await writeFile(
      path.join(root, "config/core-load-budgets.json"),
      JSON.stringify(config),
    );
  }
  git(root, ["add", "."]);
  git(root, ["commit", "-qm", "baseline"]);
  return { root, sha: git(root, ["rev-parse", "HEAD"]) };
}

describe("core load repository baseline ref", () => {
  it("loads the config from an explicit base commit", async () => {
    const fixture = await createRepository(true);
    const state = await readCoreLoadRepositoryConfigFromRef(
      path.join(fixture.root, "config/core-load-budgets.json"),
      fixture.sha,
      fixture.root,
    );
    expect(state.status).toBe("loaded");
    expect(state.config).toEqual({ schemaVersion: 1, marker: "baseline" });
  });

  it("uses a Git-loaded baseline to reject candidate baseline laundering", async () => {
    const baselineConfig = completeConfig();
    const fixture = await createRepository(true, baselineConfig);
    const state = await readCoreLoadRepositoryConfigFromRef(
      path.join(fixture.root, "config/core-load-budgets.json"),
      fixture.sha,
      fixture.root,
    );
    const candidateConfig = structuredClone(baselineConfig);
    candidateConfig.pages.play.max.criticalLoadBytes = 1;
    const { analysis, legacyAnalysis } = completeAnalysis();
    const result = evaluateCoreLoadBudget({
      config: candidateConfig,
      repositoryConfig: state.config,
      analysis,
      legacyAnalysis,
      exceptions: { schemaVersion: 1, exceptions: [] },
      now: new Date("2026-09-04T00:00:00Z"),
    });

    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: "core-load-baseline-raised" }),
    );
  });

  it("uses bootstrap only when the config is absent at the base commit", async () => {
    const fixture = await createRepository(false);
    const state = await readCoreLoadRepositoryConfigFromRef(
      path.join(fixture.root, "config/core-load-budgets.json"),
      fixture.sha,
      fixture.root,
    );
    expect(state.status).toBe("bootstrap");
    expect(state.config).toBeNull();
  });

  it.each(["", "   ", "--help"])("rejects invalid baseline ref %j", (ref) => {
    expect(() =>
      parseCoreLoadBudgetCliOptions([`--baseline-ref=${ref}`], {}),
    ).toThrow(/baseline ref/u);
  });

  it("rejects an explicitly empty environment baseline ref", () => {
    expect(() =>
      parseCoreLoadBudgetCliOptions([], { CORE_LOAD_BUDGET_BASELINE_REF: "" }),
    ).toThrow(/baseline ref/u);
  });

  it("returns valid JSON and nonzero status for top-level CLI errors", async () => {
    const lines: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalExitCode = process.exitCode;
    console.log = (...args) => lines.push(args.join(" "));
    console.error = (...args) => lines.push(args.join(" "));
    process.exitCode = 0;
    try {
      await runCoreLoadBudgetCli(["--json", "--baseline-ref="]);
      expect(process.exitCode).toBe(1);
      expect(() => JSON.parse(lines.join("\n"))).not.toThrow();
    } finally {
      console.log = originalLog;
      console.error = originalError;
      process.exitCode = originalExitCode;
    }
  });

  it.each(["config\\core-load-budgets.json", "config/core-load\nbudgets.json"])(
    "rejects a config path containing unsafe Git characters: %j",
    async (relativePath) => {
      const fixture = await createRepository(true);
      await expect(
        readCoreLoadRepositoryConfigFromRef(
          path.join(fixture.root, relativePath),
          fixture.sha,
          fixture.root,
        ),
      ).rejects.toThrow(/inside the repository|safe exact/u);
    },
  );
});
