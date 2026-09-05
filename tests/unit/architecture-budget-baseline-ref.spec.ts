import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const TEST_FILE = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(TEST_FILE), "..", "..");
const CHECKER_PATH = path.join(
  PROJECT_ROOT,
  "scripts",
  "architecture-budget-check.mjs",
);

type Hotspot = {
  path: string;
  metrics: {
    lines: number;
    imports: number;
    topLevelSymbols: number;
    runtimeRegistrations: number;
  };
};

type Exclusion = {
  path: string;
  category: string;
  reason: string;
};

type ArchitectureConfig = {
  schemaVersion: number;
  globalMaxLines: number;
  roots: string[];
  extensions: string[];
  exclusions: Exclusion[];
  hotspots: Hotspot[];
};

type AuditPayload = {
  status?: string;
  repositoryBaselineStatus?: string;
  repositoryBaselineRef?: string | null;
  counts?: {
    scannedFiles?: number;
    repositoryScannedFiles?: number;
  };
  violations?: Array<{
    code?: string;
    path?: string;
    metric?: string;
    configPath?: string | null;
    suggestedAction?: string;
    exceptionStatus?: string;
  }>;
};

function createConfig(
  overrides: Partial<ArchitectureConfig> = {},
): ArchitectureConfig {
  return {
    schemaVersion: 1,
    globalMaxLines: 800,
    roots: ["src"],
    extensions: [".ts"],
    exclusions: [],
    hotspots: [],
    ...overrides,
  };
}

function sourceWithLines(lineCount: number) {
  return Array.from(
    { length: lineCount },
    (_, index) => `export const value${index} = ${index};`,
  ).join("\n");
}

function createHotspot(pathValue: string, lines: number): Hotspot {
  return {
    path: pathValue,
    metrics: {
      lines,
      imports: 0,
      topLevelSymbols: lines,
      runtimeRegistrations: 0,
    },
  };
}

function createExclusion(pathValue: string): Exclusion {
  return {
    path: pathValue,
    category: "generated",
    reason: "fixture exclusion",
  };
}

function git(cwd: string, args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function writeFiles(root: string, files: Record<string, string>) {
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }
}

async function createGitFixture(
  config: ArchitectureConfig | null = createConfig(),
  files: Record<string, string> = {},
) {
  const root = await mkdtemp(path.join(tmpdir(), "architecture-budget-ref-"));
  await mkdir(path.join(root, "config"), { recursive: true });
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Architecture Test"]);
  await writeFile(
    path.join(root, "config", "architecture-budget-exceptions.json"),
    `${JSON.stringify({ schemaVersion: 1, exceptions: [] })}\n`,
  );
  if (config) {
    await writeFile(
      path.join(root, "config", "architecture-budgets.json"),
      `${JSON.stringify(config)}\n`,
    );
  }
  await writeFiles(root, files);
  await writeFile(path.join(root, "README.md"), "fixture\n");
  git(root, ["add", "."]);
  git(root, ["commit", "-qm", "base"]);
  return { root, baseSha: git(root, ["rev-parse", "HEAD"]) };
}

async function commitCandidate(
  root: string,
  {
    config,
    files = {},
    deleted = [],
  }: {
    config?: ArchitectureConfig;
    files?: Record<string, string>;
    deleted?: string[];
  },
) {
  if (config) {
    await writeFile(
      path.join(root, "config", "architecture-budgets.json"),
      `${JSON.stringify(config)}\n`,
    );
  }
  await writeFiles(root, files);
  for (const relativePath of deleted) {
    await unlink(path.join(root, relativePath));
  }
  git(root, ["add", "-A"]);
  git(root, ["commit", "-qm", "candidate"]);
}

function runChecker(
  root: string,
  args: string[],
  envOverrides: NodeJS.ProcessEnv = {},
) {
  return spawnSync(
    process.execPath,
    [CHECKER_PATH, `--project-root=${root}`, ...args],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, ...envOverrides },
    },
  );
}

function parsePayload(stdout: string): AuditPayload {
  return JSON.parse(stdout) as AuditPayload;
}

function expectFailure(
  result: ReturnType<typeof runChecker>,
  baseSha: string,
  code: string,
  counts?: { scannedFiles: number; repositoryScannedFiles: number },
) {
  const payload = parsePayload(result.stdout);
  expect(result.status).toBe(1);
  expect(payload.repositoryBaselineRef).toBe(baseSha);
  expect(payload.violations).toContainEqual(expect.objectContaining({ code }));
  if (counts) expect(payload.counts).toEqual(expect.objectContaining(counts));
  return payload;
}

async function withFixture(
  config: ArchitectureConfig | null,
  files: Record<string, string>,
  run: (fixture: { root: string; baseSha: string }) => Promise<void>,
) {
  const fixture = await createGitFixture(config, files);
  try {
    await run(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

describe("architecture budget real explicit-baseline ratchets", () => {
  it("deduplicates an overlapping candidate discovery violation across different scan scopes", async () => {
    await withFixture(createConfig(), {}, async ({ root, baseSha }) => {
      const literalBackslashPath = String.raw`src/giant\owner.ts`;
      await commitCandidate(root, {
        config: createConfig({ roots: ["src", "js"] }),
        files: { [literalBackslashPath]: sourceWithLines(801) },
      });
      const payload = expectFailure(
        runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]),
        baseSha,
        "unsupported-source-path",
        { scannedFiles: 0, repositoryScannedFiles: 0 },
      );
      const sourcePathViolations = payload.violations?.filter(
        (violation) =>
          violation.code === "unsupported-source-path" &&
          violation.path === literalBackslashPath,
      );
      expect(sourcePathViolations).toEqual([
        expect.objectContaining({
          code: "unsupported-source-path",
          path: literalBackslashPath,
          configPath: "config/architecture-budgets.json",
          exceptionStatus: "not-applicable",
          suggestedAction: expect.any(String),
        }),
      ]);
    });
  });

  it("keeps candidate and baseline discovery violations distinct by config source", async () => {
    const literalBackslashPath = String.raw`src/shared\owner.ts`;
    await withFixture(
      createConfig(),
      { [literalBackslashPath]: sourceWithLines(801) },
      async ({ root, baseSha }) => {
        await commitCandidate(root, {
          config: createConfig({ roots: ["src", "js"] }),
        });
        const payload = expectFailure(
          runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]),
          baseSha,
          "unsupported-source-path",
          { scannedFiles: 0, repositoryScannedFiles: 0 },
        );
        const sourcePathViolations = payload.violations?.filter(
          (violation) =>
            violation.code === "unsupported-source-path" &&
            violation.path === literalBackslashPath,
        );
        expect(sourcePathViolations).toHaveLength(2);
        expect(
          sourcePathViolations?.map((violation) => violation.configPath),
        ).toEqual([
          "config/architecture-budgets.json",
          `${baseSha}:config/architecture-budgets.json`,
        ]);
      },
    );
  });

  it("rejects a literal-backslash production source path in the baseline ref", async () => {
    const literalBackslashPath = String.raw`src/baseline\owner.ts`;
    await withFixture(
      createConfig(),
      { [literalBackslashPath]: sourceWithLines(801) },
      async ({ root, baseSha }) => {
        await commitCandidate(root, { deleted: [literalBackslashPath] });
        const payload = expectFailure(
          runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]),
          baseSha,
          "unsupported-source-path",
          { scannedFiles: 0, repositoryScannedFiles: 0 },
        );
        expect(payload.violations).toEqual([
          expect.objectContaining({
            code: "unsupported-source-path",
            path: literalBackslashPath,
            configPath: `${baseSha}:config/architecture-budgets.json`,
            exceptionStatus: "not-applicable",
            suggestedAction: expect.any(String),
          }),
        ]);
      },
    );
  });

  it("rejects a global maximum raise", async () => {
    await withFixture(
      createConfig(),
      { "src/owner.ts": sourceWithLines(100) },
      async ({ root, baseSha }) => {
        await commitCandidate(root, {
          config: createConfig({ globalMaxLines: 801 }),
        });
        expectFailure(
          runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]),
          baseSha,
          "global-baseline-raised",
          { scannedFiles: 1, repositoryScannedFiles: 1 },
        );
      },
    );
  });

  it("rejects a normal file growing from 800 to 801 lines", async () => {
    await withFixture(
      createConfig(),
      { "src/owner.ts": sourceWithLines(800) },
      async ({ root, baseSha }) => {
        await commitCandidate(root, {
          files: { "src/owner.ts": sourceWithLines(801) },
        });
        expectFailure(
          runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]),
          baseSha,
          "untracked-hotspot",
          { scannedFiles: 1, repositoryScannedFiles: 1 },
        );
      },
    );
  });

  it("rejects removing a source root", async () => {
    const base = createConfig({ roots: ["src", "js"] });
    await withFixture(
      base,
      {
        "src/owner.ts": sourceWithLines(10),
        "js/runtime.ts": sourceWithLines(10),
      },
      async ({ root, baseSha }) => {
        await commitCandidate(root, {
          config: createConfig({ roots: ["src"] }),
        });
        expectFailure(
          runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]),
          baseSha,
          "scan-scope-narrowed",
          { scannedFiles: 1, repositoryScannedFiles: 2 },
        );
      },
    );
  });

  it("rejects removing a source extension", async () => {
    const base = createConfig({ extensions: [".ts", ".js"] });
    await withFixture(
      base,
      {
        "src/owner.ts": sourceWithLines(10),
        "src/runtime.js": sourceWithLines(10),
      },
      async ({ root, baseSha }) => {
        await commitCandidate(root, {
          config: createConfig({ extensions: [".ts"] }),
        });
        expectFailure(
          runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]),
          baseSha,
          "scan-scope-narrowed",
          { scannedFiles: 1, repositoryScannedFiles: 2 },
        );
      },
    );
  });

  it("rejects a new giant source recognized as a new hotspot", async () => {
    await withFixture(createConfig(), {}, async ({ root, baseSha }) => {
      const giant = createHotspot("src/giant.ts", 5000);
      await commitCandidate(root, {
        config: createConfig({ hotspots: [giant] }),
        files: { "src/giant.ts": sourceWithLines(5000) },
      });
      const result = runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]);
      const payload = expectFailure(result, baseSha, "new-hotspot-baseline", {
        scannedFiles: 1,
        repositoryScannedFiles: 0,
      });
      expect(payload.violations).toContainEqual(
        expect.objectContaining({ code: "untracked-hotspot" }),
      );
    });
  });

  it("rejects promoting an existing normal file to hotspot", async () => {
    await withFixture(
      createConfig(),
      { "src/owner.ts": sourceWithLines(700) },
      async ({ root, baseSha }) => {
        await commitCandidate(root, {
          config: createConfig({
            hotspots: [createHotspot("src/owner.ts", 900)],
          }),
          files: { "src/owner.ts": sourceWithLines(900) },
        });
        expectFailure(
          runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]),
          baseSha,
          "new-hotspot-baseline",
          { scannedFiles: 1, repositoryScannedFiles: 1 },
        );
      },
    );
  });

  it("rejects removing a hotspot baseline while its file remains", async () => {
    const base = createConfig({
      hotspots: [createHotspot("src/owner.ts", 900)],
    });
    await withFixture(
      base,
      { "src/owner.ts": sourceWithLines(900) },
      async ({ root, baseSha }) => {
        await commitCandidate(root, { config: createConfig() });
        expectFailure(
          runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]),
          baseSha,
          "hotspot-baseline-removed",
          { scannedFiles: 1, repositoryScannedFiles: 1 },
        );
      },
    );
  });

  it("allows hotspot baseline removal after actual candidate deletion", async () => {
    const base = createConfig({
      hotspots: [createHotspot("src/owner.ts", 900)],
    });
    await withFixture(
      base,
      { "src/owner.ts": sourceWithLines(900) },
      async ({ root, baseSha }) => {
        await commitCandidate(root, {
          config: createConfig(),
          deleted: ["src/owner.ts"],
        });
        const result = runChecker(root, [
          `--baseline-ref=${baseSha}`,
          "--json",
        ]);
        const payload = parsePayload(result.stdout);
        expect(result.status).toBe(0);
        expect(payload.repositoryBaselineRef).toBe(baseSha);
        expect(payload.counts).toEqual(
          expect.objectContaining({
            scannedFiles: 0,
            repositoryScannedFiles: 1,
          }),
        );
        expect(payload.violations).toEqual([]);
      },
    );
  });

  it("rejects replacing a deleted hotspot with a new giant hotspot", async () => {
    const base = createConfig({ hotspots: [createHotspot("src/old.ts", 900)] });
    await withFixture(
      base,
      { "src/old.ts": sourceWithLines(900) },
      async ({ root, baseSha }) => {
        await commitCandidate(root, {
          config: createConfig({
            hotspots: [createHotspot("src/new.ts", 5000)],
          }),
          files: { "src/new.ts": sourceWithLines(5000) },
          deleted: ["src/old.ts"],
        });
        expectFailure(
          runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]),
          baseSha,
          "new-hotspot-baseline",
          { scannedFiles: 1, repositoryScannedFiles: 1 },
        );
      },
    );
  });

  it("rejects converting an existing baseline file to a new exclusion", async () => {
    await withFixture(
      createConfig(),
      { "src/owner.ts": sourceWithLines(700) },
      async ({ root, baseSha }) => {
        await commitCandidate(root, {
          config: createConfig({
            exclusions: [createExclusion("src/owner.ts")],
          }),
          files: { "src/owner.ts": sourceWithLines(900) },
        });
        expectFailure(
          runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]),
          baseSha,
          "new-permanent-exclusion",
          { scannedFiles: 1, repositoryScannedFiles: 1 },
        );
      },
    );
  });

  it("rejects a new 5000-line source hidden by a new exclusion", async () => {
    await withFixture(createConfig(), {}, async ({ root, baseSha }) => {
      await commitCandidate(root, {
        config: createConfig({ exclusions: [createExclusion("src/new.ts")] }),
        files: { "src/new.ts": sourceWithLines(5000) },
      });
      expectFailure(
        runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]),
        baseSha,
        "new-permanent-exclusion",
        { scannedFiles: 1, repositoryScannedFiles: 0 },
      );
    });
  });

  it("rejects deleting an old hotspot and adding a giant excluded replacement", async () => {
    const base = createConfig({ hotspots: [createHotspot("src/old.ts", 900)] });
    await withFixture(
      base,
      { "src/old.ts": sourceWithLines(900) },
      async ({ root, baseSha }) => {
        await commitCandidate(root, {
          config: createConfig({ exclusions: [createExclusion("src/new.ts")] }),
          files: { "src/new.ts": sourceWithLines(5000) },
          deleted: ["src/old.ts"],
        });
        expectFailure(
          runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]),
          baseSha,
          "new-permanent-exclusion",
          { scannedFiles: 1, repositoryScannedFiles: 1 },
        );
      },
    );
  });

  it("rejects code and its hotspot baseline rising together", async () => {
    const base = createConfig({
      hotspots: [createHotspot("src/owner.ts", 800)],
    });
    await withFixture(
      base,
      { "src/owner.ts": sourceWithLines(800) },
      async ({ root, baseSha }) => {
        await commitCandidate(root, {
          config: createConfig({
            hotspots: [createHotspot("src/owner.ts", 801)],
          }),
          files: { "src/owner.ts": sourceWithLines(801) },
        });
        expectFailure(
          runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]),
          baseSha,
          "hotspot-baseline-raised",
          { scannedFiles: 1, repositoryScannedFiles: 1 },
        );
      },
    );
  });

  it("bootstraps only when the explicit base commit lacks the config", async () => {
    await withFixture(null, {}, async ({ root, baseSha }) => {
      await commitCandidate(root, {
        config: createConfig({ exclusions: [createExclusion("src/owner.ts")] }),
        files: { "src/owner.ts": sourceWithLines(5000) },
      });
      const result = runChecker(root, [`--baseline-ref=${baseSha}`, "--json"]);
      const payload = parsePayload(result.stdout);
      expect(result.status).toBe(0);
      expect(payload.repositoryBaselineStatus).toBe("bootstrap");
      expect(payload.repositoryBaselineRef).toBe(baseSha);
    });
  });
});

describe("architecture budget explicit baseline CLI failures", () => {
  it.each([
    { name: "empty CLI ref", args: ["--baseline-ref=", "--json"], env: {} },
    {
      name: "whitespace CLI ref",
      args: ["--baseline-ref=   ", "--json"],
      env: {},
    },
    {
      name: "empty environment ref",
      args: ["--json"],
      env: { ARCHITECTURE_BUDGET_BASELINE_REF: "" },
    },
    {
      name: "whitespace environment ref",
      args: ["--json"],
      env: { ARCHITECTURE_BUDGET_BASELINE_REF: "   " },
    },
    {
      name: "invalid ref",
      args: ["--baseline-ref=refs/heads/missing", "--json"],
      env: {},
    },
  ])("fails $name with valid JSON", async ({ args, env }) => {
    await withFixture(createConfig(), {}, async ({ root }) => {
      const result = runChecker(root, args, env);
      const payload = parsePayload(result.stdout);
      expect(result.status).toBe(1);
      expect(result.stderr).toBe("");
      expect(payload.status).toBe("failed");
      expect(payload.repositoryBaselineStatus).toBe("error");
      expect(payload.violations).toContainEqual(
        expect.objectContaining({ code: "architecture-budget-error" }),
      );
    });
  });

  it("emits valid JSON for a top-level config parse failure", async () => {
    await withFixture(createConfig(), {}, async ({ root }) => {
      await writeFile(
        path.join(root, "config", "architecture-budgets.json"),
        "{ invalid json\n",
      );
      const result = runChecker(root, ["--json"]);
      const payload = parsePayload(result.stdout);
      expect(result.status).toBe(1);
      expect(result.stderr).toBe("");
      expect(payload.status).toBe("failed");
      expect(payload.violations).toContainEqual(
        expect.objectContaining({ code: "architecture-budget-error" }),
      );
    });
  });

  it("wires the tested selector script into the quality workflow", async () => {
    const workflow = await readFile(
      path.join(PROJECT_ROOT, ".github", "workflows", "smoke.yml"),
      "utf8",
    );
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain(
      "scripts/architecture-budget/select-baseline-ref.mjs",
    );
    expect(workflow).toContain("ARCHITECTURE_BUDGET_BASELINE_REF");
    expect(workflow).toContain("Architecture/core-load budget baseline ref");
  });
});
