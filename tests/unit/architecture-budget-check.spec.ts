import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  MAX_EXCEPTION_DAYS,
  collectProjectFileMetrics,
  createArchitectureBudgetPayload,
  evaluateArchitectureBudget,
  readRepositoryConfigFromHead,
} from "../../scripts/architecture-budget-check.mjs";

type FileMetrics = {
  path: string;
  lines: number;
  imports: number;
  topLevelSymbols: number;
  runtimeRegistrations: number;
};

type ArchitectureMetric = Exclude<keyof FileMetrics, "path">;

type Hotspot = {
  path: string;
  metrics: Record<ArchitectureMetric, number>;
};

type ArchitectureConfig = {
  schemaVersion: number;
  globalMaxLines: number;
  roots: string[];
  extensions: string[];
  exclusions: unknown[];
  hotspots: Hotspot[];
};

type ExceptionConfig = {
  schemaVersion: number;
  exceptions: unknown[];
};

function createFile(
  path: string,
  overrides: Partial<Omit<FileMetrics, "path">> = {},
): FileMetrics {
  return {
    path,
    lines: 100,
    imports: 2,
    topLevelSymbols: 4,
    runtimeRegistrations: 0,
    ...overrides,
  };
}

function createConfig(
  overrides: Partial<ArchitectureConfig> = {},
): ArchitectureConfig {
  return {
    schemaVersion: 1,
    globalMaxLines: 800,
    roots: ["src", "js"],
    extensions: [".ts", ".tsx", ".js", ".mjs"],
    exclusions: [],
    hotspots: [],
    ...overrides,
  };
}

function createExceptions(exceptions: unknown[] = []): ExceptionConfig {
  return {
    schemaVersion: 1,
    exceptions,
  };
}

function createHotspot(file: FileMetrics): Hotspot {
  return {
    path: file.path,
    metrics: {
      lines: file.lines,
      imports: file.imports,
      topLevelSymbols: file.topLevelSymbols,
      runtimeRegistrations: file.runtimeRegistrations,
    },
  };
}

function createActiveException(
  pathValue = "src/core/hotspot.ts",
  overrides: Record<string, unknown> = {},
) {
  return {
    path: pathValue,
    metric: "lines",
    allowed: 110,
    task: "09-04-example",
    reason: "temporary adapter",
    createdOn: "2026-09-04",
    expiresOn: "2026-09-10",
    exitCondition: "extract the adapter owner",
    ...overrides,
  };
}

type EvaluateArchitectureBudgetForTest = (options: {
  config: ArchitectureConfig;
  repositoryConfig?: ArchitectureConfig | null;
  candidateRepositoryFiles?: FileMetrics[] | null;
  exceptions: ExceptionConfig;
  files: FileMetrics[];
  now: Date;
}) => ReturnType<typeof evaluateArchitectureBudget>;

const evaluateArchitectureBudgetForTest =
  evaluateArchitectureBudget as EvaluateArchitectureBudgetForTest;

function evaluate({
  config = createConfig(),
  repositoryConfig = null,
  candidateRepositoryFiles = null,
  exceptions = createExceptions(),
  files = [createFile("src/example.ts")],
  now = new Date("2026-09-04T00:00:00.000Z"),
}: {
  config?: ReturnType<typeof createConfig>;
  repositoryConfig?: ReturnType<typeof createConfig> | null;
  candidateRepositoryFiles?: FileMetrics[] | null;
  exceptions?: ReturnType<typeof createExceptions>;
  files?: FileMetrics[];
  now?: Date;
} = {}) {
  return evaluateArchitectureBudgetForTest({
    config,
    repositoryConfig,
    candidateRepositoryFiles,
    exceptions,
    files,
    now,
  });
}

function violationCodes(result: ReturnType<typeof evaluate>) {
  return result.violations.map((violation) => violation.code);
}

describe("architecture-budget-check", () => {
  it("rejects a new production file above the 800 line global limit", () => {
    const result = evaluate({
      files: [createFile("src/features/new-feature.ts", { lines: 801 })],
    });

    expect(violationCodes(result)).toContain("untracked-hotspot");
  });

  it("rejects an existing non-hotspot when it crosses the 800 line threshold", () => {
    const result = evaluate({
      files: [createFile("src/core/existing-owner.ts", { lines: 801 })],
    });

    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: "untracked-hotspot",
        path: "src/core/existing-owner.ts",
        baseline: 800,
        actual: 801,
      }),
    );
  });

  it("rejects hotspot metric growth above its frozen baseline", () => {
    const hotspot = createFile("src/core/hotspot.ts");
    const result = evaluate({
      config: createConfig({
        hotspots: [
          {
            path: hotspot.path,
            metrics: {
              lines: hotspot.lines,
              imports: hotspot.imports,
              topLevelSymbols: hotspot.topLevelSymbols,
              runtimeRegistrations: hotspot.runtimeRegistrations,
            },
          },
        ],
      }),
      files: [{ ...hotspot, lines: hotspot.lines + 1 }],
    });

    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: "hotspot-growth",
        path: hotspot.path,
        metric: "lines",
        baseline: hotspot.lines,
        actual: hotspot.lines + 1,
        configPath: "config/architecture-budgets.json",
        configIndex: 0,
        suggestedAction: expect.any(String),
        exceptionStatus: "none",
      }),
    );
  });

  it("rejects code and its working-tree hotspot baseline growing together", () => {
    const repositoryFile = createFile("src/core/hotspot.ts");
    const currentFile = { ...repositoryFile, lines: repositoryFile.lines + 1 };
    const result = evaluate({
      repositoryConfig: createConfig({
        hotspots: [createHotspot(repositoryFile)],
      }),
      config: createConfig({ hotspots: [createHotspot(currentFile)] }),
      files: [currentFile],
    });

    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: "hotspot-baseline-raised",
        path: repositoryFile.path,
        metric: "lines",
        baseline: repositoryFile.lines,
        actual: currentFile.lines,
      }),
    );
  });

  it("rejects raising the global maximum", () => {
    const result = evaluate({
      repositoryConfig: createConfig({ globalMaxLines: 800 }),
      config: createConfig({ globalMaxLines: 801 }),
    });

    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: "global-baseline-raised",
        metric: "globalMaxLines",
        baseline: 800,
        actual: 801,
      }),
    );
  });

  it("rejects converting a repository hotspot into an exclusion", () => {
    const hotspot = createFile("src/core/hotspot.ts");
    const result = evaluate({
      repositoryConfig: createConfig({ hotspots: [createHotspot(hotspot)] }),
      config: createConfig({
        exclusions: [
          {
            path: hotspot.path,
            category: "generated",
            reason: "attempted bypass",
          },
        ],
      }),
      files: [hotspot],
    });

    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: "hotspot-converted-to-exclusion",
        path: hotspot.path,
      }),
    );
  });

  it("allows bootstrap when no repository config exists", () => {
    const hotspot = createFile("src/core/hotspot.ts", { lines: 900 });
    const result = evaluate({
      repositoryConfig: null,
      config: createConfig({ hotspots: [createHotspot(hotspot)] }),
      files: [hotspot],
    });

    expect(result.violations).toEqual([]);
  });

  it("requires the manifest to ratchet down when a hotspot shrinks", () => {
    const hotspot = createFile("js/runtime-hotspot.js");
    const result = evaluate({
      config: createConfig({
        hotspots: [
          {
            path: hotspot.path,
            metrics: {
              lines: hotspot.lines,
              imports: hotspot.imports,
              topLevelSymbols: hotspot.topLevelSymbols,
              runtimeRegistrations: hotspot.runtimeRegistrations,
            },
          },
        ],
      }),
      files: [{ ...hotspot, lines: hotspot.lines - 1 }],
    });

    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: "hotspot-baseline-stale",
        path: hotspot.path,
        metric: "lines",
        baseline: hotspot.lines,
        actual: hotspot.lines - 1,
      }),
    );
  });

  it.each([
    {
      name: "wildcard path",
      exclusion: {
        path: "src/services/generated-api/*",
        category: "generated",
        reason: "generated from OpenAPI",
      },
    },
    {
      name: "missing category",
      exclusion: {
        path: "src/services/generated-api/client.ts",
        reason: "generated from OpenAPI",
      },
    },
    {
      name: "missing reason",
      exclusion: {
        path: "src/services/generated-api/client.ts",
        category: "generated",
      },
    },
  ])("rejects an invalid exclusion with $name", ({ exclusion }) => {
    const result = evaluate({
      config: createConfig({ exclusions: [exclusion] }),
    });

    expect(violationCodes(result)).toContain("invalid-exclusion");
  });

  it("rejects an exception missing required audit fields", () => {
    const result = evaluate({
      exceptions: createExceptions([
        {
          path: "src/core/hotspot.ts",
          metric: "lines",
          allowed: 110,
          task: "09-04-example",
        },
      ]),
    });

    expect(violationCodes(result)).toContain("invalid-exception");
  });

  it("adds path and actions to invalid exception violations", () => {
    const invalidPath = "src/core/hotspot.ts";
    const result = evaluate({
      exceptions: createExceptions([
        {
          path: invalidPath,
          metric: "lines",
          allowed: 110,
        },
      ]),
    });

    expect(
      result.violations.find(
        (violation) => violation.code === "invalid-exception",
      ),
    ).toEqual(
      expect.objectContaining({
        path: invalidPath,
        configPath: "config/architecture-budget-exceptions.json",
        configIndex: 0,
        suggestedAction: expect.any(String),
        exceptionStatus: "invalid",
      }),
    );
  });

  it("rejects expired exceptions", () => {
    const result = evaluate({
      exceptions: createExceptions([
        {
          path: "src/core/hotspot.ts",
          metric: "lines",
          allowed: 110,
          task: "09-04-example",
          reason: "temporary adapter",
          createdOn: "2026-08-25",
          expiresOn: "2026-09-03",
          exitCondition: "extract the adapter owner",
        },
      ]),
    });

    expect(violationCodes(result)).toContain("expired-exception");
  });

  it("rejects exceptions created after the current day", () => {
    const result = evaluate({
      exceptions: createExceptions([
        createActiveException("src/core/hotspot.ts", {
          createdOn: "2026-09-05",
          expiresOn: "2026-09-10",
        }),
      ]),
    });

    expect(violationCodes(result)).toContain("future-exception");
  });

  it(`rejects exceptions lasting longer than ${MAX_EXCEPTION_DAYS} days`, () => {
    const result = evaluate({
      exceptions: createExceptions([
        {
          path: "src/core/hotspot.ts",
          metric: "lines",
          allowed: 110,
          task: "09-04-example",
          reason: "temporary adapter",
          createdOn: "2026-09-04",
          expiresOn: "2026-09-19",
          exitCondition: "extract the adapter owner",
        },
      ]),
    });

    expect(violationCodes(result)).toContain("invalid-exception");
  });

  it("rejects wildcard exception paths", () => {
    const result = evaluate({
      exceptions: createExceptions([
        {
          path: "src/core/*",
          metric: "lines",
          allowed: 110,
          task: "09-04-example",
          reason: "temporary adapter",
          createdOn: "2026-09-04",
          expiresOn: "2026-09-10",
          exitCondition: "extract the adapter owner",
        },
      ]),
    });

    expect(violationCodes(result)).toContain("invalid-exception");
  });

  it("is wired into the existing quality audit command", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["audit:architecture-budget"]).toBe(
      "node scripts/architecture-budget-check.mjs",
    );
    expect(packageJson.scripts?.["audit:quality"]).toContain(
      "npm run audit:architecture-budget",
    );
    expect(packageJson.scripts?.["audit:quality:report"]).toContain(
      "npm run audit:architecture-budget",
    );
  });

  it("preserves active and applied exceptions separately in machine output", () => {
    const hotspot = createFile("src/core/hotspot.ts");
    const unusedException = createActiveException("src/unused.ts");
    const appliedException = createActiveException(hotspot.path, {
      allowed: hotspot.lines + 2,
    });
    const result = evaluate({
      config: createConfig({ hotspots: [createHotspot(hotspot)] }),
      exceptions: createExceptions([unusedException, appliedException]),
      files: [{ ...hotspot, lines: hotspot.lines + 2 }],
    });
    const payload = createArchitectureBudgetPayload({
      config: createConfig({ hotspots: [createHotspot(hotspot)] }),
      configPath: "config/architecture-budgets.json",
      files: [{ ...hotspot, lines: hotspot.lines + 2 }],
      repositoryBaselineStatus: "loaded",
      result,
    });
    const json = JSON.parse(JSON.stringify(payload));

    expect(json.activeExceptions).toHaveLength(2);
    expect(json.appliedExceptions).toHaveLength(1);
    expect(json.appliedExceptions[0]).toEqual(
      expect.objectContaining({
        path: hotspot.path,
        exceptionStatus: "applied",
      }),
    );
    expect(json.counts).toEqual(
      expect.objectContaining({
        activeExceptions: 2,
        appliedExceptions: 1,
        violations: 0,
      }),
    );
  });

  it("adds actionable config metadata to violations", () => {
    const invalidPath = "src/generated/client.ts";
    const result = evaluate({
      config: createConfig({
        exclusions: [
          {
            path: invalidPath,
            category: "generated",
          },
        ],
      }),
    });
    const violation = result.violations.find(
      (candidate) => candidate.code === "invalid-exclusion",
    );

    expect(violation).toEqual(
      expect.objectContaining({
        path: invalidPath,
        configPath: "config/architecture-budgets.json",
        configIndex: 0,
        suggestedAction: expect.any(String),
        exceptionStatus: "not-applicable",
      }),
    );
  });

  it("loads the repository config from HEAD and bootstraps before it is committed", async () => {
    const fixtureRoot = await mkdtemp(
      path.join(tmpdir(), "architecture-budget-baseline-"),
    );
    const configPath = path.join(
      fixtureRoot,
      "config",
      "architecture-budgets.json",
    );
    try {
      execFileSync("git", ["init", "-q"], { cwd: fixtureRoot });
      execFileSync("git", ["config", "user.email", "test@example.com"], {
        cwd: fixtureRoot,
      });
      execFileSync("git", ["config", "user.name", "Architecture Test"], {
        cwd: fixtureRoot,
      });
      await mkdir(path.dirname(configPath), { recursive: true });
      const repositoryConfig = createConfig({ globalMaxLines: 800 });
      await writeFile(configPath, `${JSON.stringify(repositoryConfig)}\n`);
      await writeFile(path.join(fixtureRoot, "README.md"), "fixture\n");
      execFileSync("git", ["add", "README.md"], { cwd: fixtureRoot });
      execFileSync("git", ["commit", "-qm", "initial"], {
        cwd: fixtureRoot,
      });

      const bootstrap = await readRepositoryConfigFromHead(
        configPath,
        fixtureRoot,
      );
      expect(bootstrap).toEqual(
        expect.objectContaining({ status: "bootstrap", config: null }),
      );

      execFileSync("git", ["add", "config/architecture-budgets.json"], {
        cwd: fixtureRoot,
      });
      execFileSync("git", ["commit", "-qm", "add baseline"], {
        cwd: fixtureRoot,
      });
      await writeFile(
        configPath,
        `${JSON.stringify(createConfig({ globalMaxLines: 801 }))}\n`,
      );

      const loaded = await readRepositoryConfigFromHead(
        configPath,
        fixtureRoot,
      );
      expect(loaded.status).toBe("loaded");
      expect(loaded.config).not.toBeNull();
      expect(loaded.config?.globalMaxLines).toBe(800);
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("scans tracked and untracked non-ignored source files only", async () => {
    const fixtureRoot = await mkdtemp(
      path.join(tmpdir(), "architecture-budget-"),
    );
    try {
      await mkdir(path.join(fixtureRoot, "src"), { recursive: true });
      await Promise.all([
        writeFile(path.join(fixtureRoot, ".gitignore"), "src/ignored.ts\n"),
        writeFile(
          path.join(fixtureRoot, "src", "tracked.ts"),
          "export const tracked = true;\n",
        ),
        writeFile(
          path.join(fixtureRoot, "src", "untracked.ts"),
          "export const untracked = true;\n",
        ),
        writeFile(
          path.join(fixtureRoot, "src", "ignored.ts"),
          "export const ignored = true;\n",
        ),
      ]);
      execFileSync("git", ["init", "-q"], { cwd: fixtureRoot });
      execFileSync("git", ["add", ".gitignore", "src/tracked.ts"], {
        cwd: fixtureRoot,
      });

      const files = await collectProjectFileMetrics(
        createConfig({ roots: ["src"] }),
        fixtureRoot,
      );

      expect(files.map((file) => file.path)).toEqual([
        "src/tracked.ts",
        "src/untracked.ts",
      ]);
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects removing a configured source root", () => {
    const result = evaluate({
      repositoryConfig: createConfig({ roots: ["src", "js"] }),
      config: createConfig({ roots: ["src"] }),
    });

    expect(violationCodes(result)).toContain("scan-scope-narrowed");
  });

  it("rejects removing a configured source extension", () => {
    const result = evaluate({
      repositoryConfig: createConfig({ extensions: [".ts", ".js"] }),
      config: createConfig({ extensions: [".ts"] }),
    });

    expect(violationCodes(result)).toContain("scan-scope-narrowed");
  });

  it("does not treat a hotspot hidden by narrowed scope as deleted", () => {
    const hotspot = createFile("js/hotspot.js", { lines: 900 });
    const result = evaluate({
      repositoryConfig: createConfig({
        roots: ["src", "js"],
        hotspots: [createHotspot(hotspot)],
      }),
      candidateRepositoryFiles: [hotspot],
      config: createConfig({ roots: ["src"] }),
      files: [],
    });

    expect(violationCodes(result)).toEqual(
      expect.arrayContaining([
        "scan-scope-narrowed",
        "hotspot-baseline-removed",
      ]),
    );
  });

  it("rejects a new giant file disguised as a new hotspot", () => {
    const giantFile = createFile("src/new-giant.ts", { lines: 5000 });
    const result = evaluate({
      repositoryConfig: createConfig(),
      config: createConfig({ hotspots: [createHotspot(giantFile)] }),
      files: [createFile("src/existing.ts"), giantFile],
    });

    expect(violationCodes(result)).toEqual(
      expect.arrayContaining(["new-hotspot-baseline", "untracked-hotspot"]),
    );
  });

  it("rejects promoting an existing normal file to a hotspot", () => {
    const baselineFile = createFile("src/existing.ts", { lines: 700 });
    const grownFile = { ...baselineFile, lines: 900 };
    const result = evaluate({
      repositoryConfig: createConfig(),
      config: createConfig({ hotspots: [createHotspot(grownFile)] }),
      files: [grownFile],
    });

    expect(violationCodes(result)).toEqual(
      expect.arrayContaining(["new-hotspot-baseline", "untracked-hotspot"]),
    );
  });

  it("rejects adding an exclusion for a baseline-scanned file", () => {
    const baselineFile = createFile("src/existing.ts", { lines: 700 });
    const result = evaluate({
      repositoryConfig: createConfig(),
      config: createConfig({
        exclusions: [
          {
            path: baselineFile.path,
            category: "generated",
            reason: "attempted laundering",
          },
        ],
      }),
      files: [{ ...baselineFile, lines: 900 }],
    });

    expect(violationCodes(result)).toContain("new-permanent-exclusion");
  });

  it("rejects removing a hotspot while its candidate file remains", () => {
    const hotspot = createFile("src/hotspot.ts", { lines: 900 });
    const result = evaluate({
      repositoryConfig: createConfig({ hotspots: [createHotspot(hotspot)] }),
      config: createConfig(),
      files: [hotspot],
    });

    expect(violationCodes(result)).toContain("hotspot-baseline-removed");
  });

  it("allows removing a hotspot only when the candidate file is deleted", () => {
    const hotspot = createFile("src/hotspot.ts", { lines: 900 });
    const result = evaluate({
      repositoryConfig: createConfig({ hotspots: [createHotspot(hotspot)] }),
      config: createConfig(),
      files: [],
    });

    expect(violationCodes(result)).not.toContain("hotspot-baseline-removed");
  });

  it("rejects replacing a deleted hotspot with a new giant hotspot", () => {
    const deletedHotspot = createFile("src/old-hotspot.ts", { lines: 900 });
    const replacement = createFile("src/new-hotspot.ts", { lines: 5000 });
    const result = evaluate({
      repositoryConfig: createConfig({
        hotspots: [createHotspot(deletedHotspot)],
      }),
      config: createConfig({ hotspots: [createHotspot(replacement)] }),
      files: [replacement],
    });

    expect(violationCodes(result)).toEqual(
      expect.arrayContaining(["new-hotspot-baseline", "untracked-hotspot"]),
    );
  });

  it("allows a precise active exception for an oversized file but not a new hotspot", () => {
    const giantFile = createFile("src/new-giant.ts", { lines: 5000 });
    const result = evaluate({
      repositoryConfig: createConfig(),
      config: createConfig({ hotspots: [createHotspot(giantFile)] }),
      exceptions: createExceptions([
        createActiveException(giantFile.path, { allowed: giantFile.lines }),
      ]),
      files: [giantFile],
    });

    expect(violationCodes(result)).toContain("new-hotspot-baseline");
    expect(violationCodes(result)).not.toContain("untracked-hotspot");
    expect(result.appliedExceptions).toHaveLength(1);
  });

  it("allows a precise, active exception up to its declared value", () => {
    const hotspot = createFile("src/core/hotspot.ts");
    const result = evaluate({
      config: createConfig({
        hotspots: [createHotspot(hotspot)],
      }),
      exceptions: createExceptions([
        {
          path: hotspot.path,
          metric: "lines",
          allowed: hotspot.lines + 2,
          task: "09-04-example",
          reason: "temporary adapter",
          createdOn: "2026-09-04",
          expiresOn: "2026-09-10",
          exitCondition: "extract the adapter owner",
        },
      ]),
      files: [{ ...hotspot, lines: hotspot.lines + 2 }],
    });

    expect(result.violations).toEqual([]);
    expect(result.appliedExceptions).toHaveLength(1);
  });
});
