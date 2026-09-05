import { brotliCompressSync, gzipSync } from "node:zlib";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  analyzeCoreLoadDist,
  analyzeLegacyBundles,
  evaluateCoreLoadBudget,
  validateCoreLoadExceptions,
} from "../../scripts/core-load-budget-check.mjs";

type MetricRecord = {
  actual: number;
  encoding: string;
  path: string | null;
};
type AnalyzedPage = {
  entryPath: string | null;
  directCriticalPaths: string[];
  startupStaticPaths: string[];
  criticalCssDependencyPaths: string[];
  deferredDynamicPaths: string[];
  criticalPreloads: string[];
  metrics: Record<string, MetricRecord>;
};
type Violation = {
  code: string;
  metric?: string | null;
  path?: string | null;
  page?: string | null;
};
type CoreAnalysis = {
  pages: Record<string, AnalyzedPage>;
  discoveryViolations: Violation[];
};
type LegacyAnalysis = {
  bundles: Record<string, { metrics: Record<string, MetricRecord> }>;
  violations: Violation[];
};
type BudgetResult = {
  violations: Violation[];
  appliedExceptions: Array<{
    page?: string;
    path?: string;
    metric: string;
    exceptionStatus: string;
  }>;
};
type AnalysisOptions = {
  distRoot: string;
  pageConfigs: Record<string, { html: string }>;
  compression: {
    preferred: "br";
    fallback: "gzip";
    requireBrotli: boolean;
  };
};
const analyzeDist = analyzeCoreLoadDist as unknown as (
  options: AnalysisOptions,
) => Promise<CoreAnalysis>;
const analyzeLegacy = analyzeLegacyBundles as unknown as (
  distRoot: string,
  owners: Record<string, { path: string }>,
  compression: AnalysisOptions["compression"],
) => Promise<LegacyAnalysis>;
const evaluateBudget = evaluateCoreLoadBudget as unknown as (input: {
  config: ReturnType<typeof configFor>;
  repositoryConfig: ReturnType<typeof configFor> | null;
  analysis: CoreAnalysis;
  legacyAnalysis: LegacyAnalysis;
  exceptions: { schemaVersion: number; exceptions: unknown[] };
  now: Date;
}) => BudgetResult;

type FixtureOptions = {
  entryHash?: string;
  navigationHref?: string;
  includeBrotli?: boolean;
  includeGzip?: boolean;
  dynamicBytes?: number;
};

async function writeCompressed(
  root: string,
  relativePath: string,
  content: string | Buffer,
  options: FixtureOptions,
) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  if (options.includeBrotli !== false) {
    await writeFile(`${target}.br`, brotliCompressSync(buffer));
  }
  if (options.includeGzip !== false) {
    await writeFile(`${target}.gz`, gzipSync(buffer));
  }
}

async function createDistFixture(options: FixtureOptions = {}) {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "core-load-budget-"));
  const distRoot = path.join(projectRoot, "dist");
  const hash = options.entryHash || "AbCd1234";
  const navigationHref = options.navigationHref || "history.html";
  const pageHtml = (entryName: string) => `<!doctype html>
<script src="./js/preload.js"></script>
<script type="module" src="./assets/${entryName}-${hash}.js"></script>
<link rel="modulepreload" href="./assets/shared-${hash}.js">
<link rel="stylesheet" href="./assets/main-${hash}.css">
<a href="${navigationHref}">history</a>
<img src="./assets/logo-${hash}.png" fetchpriority="high">`;
  const entry = `import "./shared-${hash}.js"; import("./deferred-${hash}.js");`;
  const shared = `export const shared = true;`;
  const deferred = `export const deferred = "${"x".repeat(options.dynamicBytes || 8)}";`;
  for (const [htmlPath, entryName] of [
    ["2048.html", "home"],
    ["play.html", "play"],
    ["replay.html", "replay"],
  ] as const) {
    await writeCompressed(distRoot, htmlPath, pageHtml(entryName), options);
    await writeCompressed(
      distRoot,
      `assets/${entryName}-${hash}.js`,
      entry,
      options,
    );
  }
  await writeCompressed(distRoot, `assets/shared-${hash}.js`, shared, options);
  await writeCompressed(
    distRoot,
    `assets/deferred-${hash}.js`,
    deferred,
    options,
  );
  await writeCompressed(
    distRoot,
    `assets/main-${hash}.css`,
    "body{color:#000}",
    options,
  );
  await writeCompressed(
    distRoot,
    "js/preload.js",
    "window.preloaded=true",
    options,
  );
  await writeCompressed(
    distRoot,
    "assets/logo-" + hash + ".png",
    Buffer.alloc(120, 1),
    { ...options, includeBrotli: false, includeGzip: false },
  );
  await writeCompressed(
    distRoot,
    "js/home_standard_startup_bundle.js",
    "window.startup=true",
    options,
  );
  await writeCompressed(
    distRoot,
    "js/home_standard_deferred_bundle.js",
    "window.deferred=true",
    options,
  );
  return { projectRoot, distRoot, hash };
}

const CORE_PAGE_CONFIGS = {
  home: { html: "2048.html" },
  play: { html: "play.html" },
  replay: { html: "replay.html" },
};
const LEGACY_CONFIGS = {
  startup: { path: "js/home_standard_startup_bundle.js" },
  deferred: { path: "js/home_standard_deferred_bundle.js" },
};

async function analyzeCompleteFixture(
  fixture: Awaited<ReturnType<typeof createDistFixture>>,
) {
  const compression = {
    preferred: "br",
    fallback: "gzip",
    requireBrotli: true,
  } as const;
  return {
    analysis: (await analyzeDist({
      distRoot: fixture.distRoot,
      pageConfigs: CORE_PAGE_CONFIGS,
      compression,
    })) as CoreAnalysis,
    legacyAnalysis: (await analyzeLegacy(
      fixture.distRoot,
      LEGACY_CONFIGS,
      compression,
    )) as LegacyAnalysis,
  };
}

function configFor(actual: CoreAnalysis, legacyActual: LegacyAnalysis) {
  const pages = Object.fromEntries(
    Object.entries(CORE_PAGE_CONFIGS).map(([name, owner]) => {
      const page = actual.pages[name];
      return [
        name,
        {
          html: owner.html,
          criticalPreloads: page.criticalPreloads,
          max: Object.fromEntries(
            Object.entries(page.metrics).map(([metric, record]) => [
              metric,
              record.actual,
            ]),
          ),
        },
      ];
    }),
  );
  const legacyBundles = Object.fromEntries(
    Object.entries(LEGACY_CONFIGS).map(([name, owner]) => [
      name,
      {
        path: owner.path,
        max: Object.fromEntries(
          Object.entries(legacyActual.bundles[name].metrics).map(
            ([metric, record]) => [metric, record.actual],
          ),
        ),
      },
    ]),
  );
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
    pages,
    legacyBundles,
  };
}

const EMPTY_EXCEPTIONS = { schemaVersion: 1, exceptions: [] };

describe("core load dist analysis", () => {
  it("locates a changed hashed module entry from built HTML", async () => {
    const first = await createDistFixture({ entryHash: "HashAAAA" });
    const second = await createDistFixture({ entryHash: "HashBBBB" });
    const pageConfig = { play: { html: "play.html" } };

    const firstResult = (await analyzeDist({
      distRoot: first.distRoot,
      pageConfigs: pageConfig,
      compression: { preferred: "br", fallback: "gzip", requireBrotli: true },
    })) as CoreAnalysis;
    const secondResult = (await analyzeDist({
      distRoot: second.distRoot,
      pageConfigs: pageConfig,
      compression: { preferred: "br", fallback: "gzip", requireBrotli: true },
    })) as CoreAnalysis;

    expect(firstResult.pages.play.entryPath).toContain("play-HashAAAA.js");
    expect(secondResult.pages.play.entryPath).toContain("play-HashBBBB.js");
  });

  it("does not count navigation hrefs as downloaded resources", async () => {
    const fixture = await createDistFixture({
      navigationHref: "huge-page.html",
    });
    await writeCompressed(
      fixture.distRoot,
      "huge-page.html",
      "x".repeat(50_000),
      {},
    );
    const result = await analyzeDist({
      distRoot: fixture.distRoot,
      pageConfigs: { play: { html: "play.html" } },
      compression: { preferred: "br", fallback: "gzip", requireBrotli: true },
    });

    expect(result.pages.play.directCriticalPaths).not.toContain(
      "huge-page.html",
    );
  });

  it("includes static imports in startup and separates dynamic imports", async () => {
    const fixture = await createDistFixture({ dynamicBytes: 20_000 });
    const result = await analyzeDist({
      distRoot: fixture.distRoot,
      pageConfigs: { play: { html: "play.html" } },
      compression: { preferred: "br", fallback: "gzip", requireBrotli: true },
    });
    const page = result.pages.play;

    expect(page.startupStaticPaths).toContain(
      `assets/shared-${fixture.hash}.js`,
    );
    expect(page.startupStaticPaths).not.toContain(
      `assets/deferred-${fixture.hash}.js`,
    );
    expect(page.deferredDynamicPaths).toContain(
      `assets/deferred-${fixture.hash}.js`,
    );
  });

  it("fails closed on non-literal dynamic imports", async () => {
    const fixture = await createDistFixture();
    const entryPath = path.join(
      fixture.distRoot,
      `assets/play-${fixture.hash}.js`,
    );
    await writeFile(entryPath, "const target='./deferred.js'; import(target);");
    const result = await analyzeDist({
      distRoot: fixture.distRoot,
      pageConfigs: { play: { html: "play.html" } },
      compression: { preferred: "br", fallback: "gzip", requireBrotli: false },
    });

    expect(result.discoveryViolations).toContainEqual(
      expect.objectContaining({ code: "non-literal-dynamic-import" }),
    );
  });

  it("falls back to gzip when Brotli is absent and policy permits it", async () => {
    const fixture = await createDistFixture({ includeBrotli: false });
    const result = await analyzeDist({
      distRoot: fixture.distRoot,
      pageConfigs: { play: { html: "play.html" } },
      compression: { preferred: "br", fallback: "gzip", requireBrotli: false },
    });

    expect(result.pages.play.metrics.directCriticalBytes.encoding).toBe(
      "mixed:gzip+raw",
    );
    expect(result.discoveryViolations).toEqual([]);
  });

  it("fails discovery when required Brotli sidecars are missing", async () => {
    const fixture = await createDistFixture({ includeBrotli: false });
    const result = await analyzeDist({
      distRoot: fixture.distRoot,
      pageConfigs: { play: { html: "play.html" } },
      compression: { preferred: "br", fallback: "gzip", requireBrotli: true },
    });

    expect(result.discoveryViolations).toContainEqual(
      expect.objectContaining({ code: "missing-brotli-sidecar" }),
    );
  });

  it("rejects control characters in candidate resource paths", async () => {
    const fixture = await createDistFixture();
    const htmlPath = path.join(fixture.distRoot, "play.html");
    const html = await readFile(htmlPath, "utf8");
    await writeFile(
      htmlPath,
      html.replace("./assets/play-", "./assets/%0Aplay-"),
    );
    const result = await analyzeDist({
      distRoot: fixture.distRoot,
      pageConfigs: { play: { html: "play.html" } },
      compression: { preferred: "br", fallback: "gzip", requireBrotli: false },
    });

    expect(result.discoveryViolations).toContainEqual(
      expect.objectContaining({ code: "unsafe-resource-url" }),
    );
  });

  it("rejects Windows separators and never scans dist.backup paths", async () => {
    const fixture = await createDistFixture();
    const htmlPath = path.join(fixture.distRoot, "play.html");
    const html = await readFile(htmlPath, "utf8");
    await writeFile(
      htmlPath,
      html.replace("./assets/play-", ".\\assets\\play-"),
    );
    const result = await analyzeDist({
      distRoot: fixture.distRoot,
      pageConfigs: { play: { html: "play.html" } },
      compression: { preferred: "br", fallback: "gzip", requireBrotli: false },
    });

    expect(result.discoveryViolations).toContainEqual(
      expect.objectContaining({ code: "unsafe-resource-url" }),
    );
    const backupTarget = path.join(
      fixture.projectRoot,
      "dist.backup-symlink-target",
    );
    await mkdir(backupTarget);
    const linkedDist = path.join(fixture.projectRoot, "dist-link");
    await symlink(backupTarget, linkedDist, "dir");
    await expect(
      analyzeCoreLoadDist({
        distRoot: linkedDist,
        pageConfigs: { play: { html: "play.html" } },
        compression: {
          preferred: "br",
          fallback: "gzip",
          requireBrotli: false,
        },
      }),
    ).rejects.toThrow(/dist\.backup-/u);
    await expect(
      analyzeCoreLoadDist({
        distRoot: path.join(fixture.projectRoot, "dist.backup-20260904"),
        pageConfigs: { play: { html: "play.html" } },
        compression: {
          preferred: "br",
          fallback: "gzip",
          requireBrotli: false,
        },
      }),
    ).rejects.toThrow(/dist\.backup-/u);
  });
});

describe("core load budget evaluation", () => {
  it("hard-fails total bytes, request count, and largest resource", async () => {
    const fixture = await createDistFixture();
    const { analysis, legacyAnalysis } = await analyzeCompleteFixture(fixture);
    const config = configFor(analysis, legacyAnalysis);
    config.pages.play.max.criticalLoadBytes -= 1;
    config.pages.play.max.startupStaticRequests -= 1;
    config.pages.play.max.largestCriticalJsBytes -= 1;
    const result = evaluateBudget({
      config,
      repositoryConfig: configFor(analysis, legacyAnalysis),
      analysis,
      legacyAnalysis,
      exceptions: EMPTY_EXCEPTIONS,
      now: new Date("2026-09-04T00:00:00Z"),
    });

    expect(result.violations.map((item) => item.metric)).toEqual(
      expect.arrayContaining([
        "criticalLoadBytes",
        "startupStaticRequests",
        "largestCriticalJsBytes",
      ]),
    );
  });

  it("rejects baseline raises once a repository baseline exists", async () => {
    const fixture = await createDistFixture();
    const { analysis, legacyAnalysis } = await analyzeCompleteFixture(fixture);
    const repositoryConfig = configFor(analysis, legacyAnalysis);
    const config = structuredClone(repositoryConfig);
    config.pages.play.max.criticalLoadBytes += 1;
    const result = evaluateBudget({
      config,
      repositoryConfig,
      analysis,
      legacyAnalysis,
      exceptions: EMPTY_EXCEPTIONS,
      now: new Date("2026-09-04T00:00:00Z"),
    });

    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: "core-load-baseline-raised" }),
    );
  });

  it("applies a precise active exception to one exceeded page metric", async () => {
    const fixture = await createDistFixture();
    const { analysis, legacyAnalysis } = await analyzeCompleteFixture(fixture);
    const repositoryConfig = configFor(analysis, legacyAnalysis);
    const config = structuredClone(repositoryConfig);
    const measured = analysis.pages.play.metrics.criticalLoadBytes.actual;
    config.pages.play.max.criticalLoadBytes = measured - 1;
    const result = evaluateBudget({
      config,
      repositoryConfig,
      analysis,
      legacyAnalysis,
      exceptions: {
        schemaVersion: 1,
        exceptions: [
          {
            page: "play",
            metric: "criticalLoadBytes",
            allowed: measured,
            task: "09-04-example",
            reason: "temporary measured increase",
            createdOn: "2026-09-04",
            expiresOn: "2026-09-10",
            exitCondition: "remove the extra startup dependency",
          },
        ],
      },
      now: new Date("2026-09-04T00:00:00Z"),
    });

    expect(result.violations).toEqual([]);
    expect(result.appliedExceptions).toContainEqual(
      expect.objectContaining({
        page: "play",
        metric: "criticalLoadBytes",
        exceptionStatus: "applied",
      }),
    );
  });

  it("rejects scan policy, page target, and metric removal laundering", async () => {
    const fixture = await createDistFixture();
    const { analysis, legacyAnalysis } = await analyzeCompleteFixture(fixture);
    const repositoryConfig = configFor(analysis, legacyAnalysis);
    const config = structuredClone(repositoryConfig);
    config.compression.requireBrotli = false;
    config.pages.play.html = "other.html";
    delete config.pages.play.max.criticalLoadBytes;
    const result = evaluateBudget({
      config,
      repositoryConfig,
      analysis,
      legacyAnalysis,
      exceptions: EMPTY_EXCEPTIONS,
      now: new Date("2026-09-04T00:00:00Z"),
    });

    expect(result.violations.map((item) => item.code)).toEqual(
      expect.arrayContaining(["invalid-config"]),
    );
  });

  it("permits only an exact complete first bootstrap", async () => {
    const fixture = await createDistFixture();
    const { analysis, legacyAnalysis } = await analyzeCompleteFixture(fixture);
    const config = configFor(analysis, legacyAnalysis);
    const result = evaluateBudget({
      config,
      repositoryConfig: null,
      analysis,
      legacyAnalysis,
      exceptions: EMPTY_EXCEPTIONS,
      now: new Date("2026-09-04T00:00:00Z"),
    });
    expect(result.violations).toEqual([]);

    config.pages.home.max.criticalLoadBytes += 1;
    const headroom = evaluateBudget({
      config,
      repositoryConfig: null,
      analysis,
      legacyAnalysis,
      exceptions: EMPTY_EXCEPTIONS,
      now: new Date("2026-09-04T00:00:00Z"),
    });
    expect(headroom.violations).toContainEqual(
      expect.objectContaining({ code: "bootstrap-baseline-not-exact" }),
    );
  });
});

describe("core load gate integration", () => {
  it("hands the exact refactor-gate dist artifact to quality without rebuilding", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    const workflow = await readFile(".github/workflows/smoke.yml", "utf8");
    const refactorGate = await readFile("scripts/refactor-gate.mjs", "utf8");

    expect(packageJson.scripts["audit:core-load-budget"]).toBe(
      "node scripts/core-load-budget-check.mjs",
    );
    expect(packageJson.scripts["audit:quality"]).toContain(
      "npm run audit:core-load-budget",
    );
    expect(packageJson.scripts["verify:refactor:ci"]).toContain(
      "scripts/refactor-gate.mjs",
    );
    expect(refactorGate).toContain(
      '{ name: "build", cmd: "npm", args: ["run", "build"] }',
    );
    expect(workflow).toContain("run: npm run verify:refactor:ci");
    expect(workflow).toContain("name: deterministic-dist");
    expect(workflow).toContain("path: dist");
    expect(workflow).toContain(
      "uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093",
    );
    expect(workflow).toContain("needs:\n      - refactor-gate");
    const qualityJob = workflow.slice(
      workflow.indexOf("  quality-audit-report:"),
      workflow.indexOf("  smoke:"),
    );
    expect(qualityJob).not.toContain("npm run build");
    expect(
      qualityJob.indexOf("Download deterministic fresh dist"),
    ).toBeLessThan(
      qualityJob.indexOf("Generate quality audit markdown report"),
    );
    expect(workflow).toContain("CORE_LOAD_BUDGET_BASELINE_REF:");
  });
});

describe("core load performance exceptions", () => {
  function exception(overrides: Record<string, unknown> = {}) {
    return {
      page: "play",
      metric: "directCriticalBytes",
      allowed: 999,
      task: "09-04-example",
      reason: "temporary measured increase",
      createdOn: "2026-09-04",
      expiresOn: "2026-09-10",
      exitCondition: "remove the extra startup dependency",
      ...overrides,
    };
  }

  it("accepts a precise active exception", () => {
    const result = validateCoreLoadExceptions(
      { schemaVersion: 1, exceptions: [exception()] },
      new Date("2026-09-04T00:00:00Z"),
    );
    expect(result.violations).toEqual([]);
    expect(result.activeExceptions).toHaveLength(1);
  });

  it("accepts 14 inclusive UTC dates and rejects 15", () => {
    const fourteen = validateCoreLoadExceptions(
      {
        schemaVersion: 1,
        exceptions: [
          exception({ createdOn: "2026-09-04", expiresOn: "2026-09-17" }),
        ],
      },
      new Date("2026-09-04T00:00:00Z"),
    );
    const fifteen = validateCoreLoadExceptions(
      {
        schemaVersion: 1,
        exceptions: [
          exception({ createdOn: "2026-09-04", expiresOn: "2026-09-18" }),
        ],
      },
      new Date("2026-09-04T00:00:00Z"),
    );

    expect(fourteen.violations).toEqual([]);
    expect(fifteen.violations).toContainEqual(
      expect.objectContaining({ code: "invalid-exception" }),
    );
  });

  it.each([
    [
      "expired",
      { createdOn: "2026-08-25", expiresOn: "2026-09-03" },
      "expired-exception",
    ],
    ["future", { createdOn: "2026-09-05" }, "future-exception"],
    ["too long", { expiresOn: "2026-09-19" }, "invalid-exception"],
    ["non exact", { page: "*" }, "invalid-exception"],
  ])("rejects %s exceptions", (_label, overrides, code) => {
    const result = validateCoreLoadExceptions(
      { schemaVersion: 1, exceptions: [exception(overrides)] },
      new Date("2026-09-04T00:00:00Z"),
    );
    expect(result.violations).toContainEqual(expect.objectContaining({ code }));
  });
});
