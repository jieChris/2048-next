import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { analyzeCoreLoadDist, analyzeLegacyBundles } from "./analyze.mjs";
import { evaluateCoreLoadBudget } from "./evaluate.mjs";
import { createViolation, isSafeExactRelativePath } from "./shared.mjs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_CONFIG_RELATIVE_PATH = "config/core-load-budgets.json";
const DEFAULT_EXCEPTIONS_RELATIVE_PATH =
  "config/core-load-budget-exceptions.json";
const DEFAULT_CONFIG_PATH = path.join(
  PROJECT_ROOT,
  DEFAULT_CONFIG_RELATIVE_PATH,
);
const DEFAULT_EXCEPTIONS_PATH = path.join(
  PROJECT_ROOT,
  DEFAULT_EXCEPTIONS_RELATIVE_PATH,
);

function validateBaselineRef(value) {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.trim().startsWith("-")
  ) {
    throw new Error("baseline ref must be a non-empty git ref or SHA");
  }
  return value.trim();
}

function relativeRepositoryPath(filePath, projectRoot) {
  const relativePath = path.relative(projectRoot, filePath);
  if (relativePath.includes("\\") || !isSafeExactRelativePath(relativePath)) {
    throw new Error(
      "core-load budget config must be a safe exact path inside the repository",
    );
  }
  return relativePath;
}

async function readCoreLoadRepositoryConfigFromRef(
  configPath,
  baselineRef = "HEAD",
  projectRoot = PROJECT_ROOT,
  { executeGit = execFileAsync } = {},
) {
  const relativePath = relativeRepositoryPath(configPath, projectRoot);
  const requestedRef = validateBaselineRef(baselineRef);
  const { stdout: resolvedOutput } = await executeGit(
    "git",
    ["rev-parse", "--verify", "--end-of-options", `${requestedRef}^{commit}`],
    { cwd: projectRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  const resolvedRef = String(resolvedOutput).trim();
  const { stdout: treeOutput } = await executeGit(
    "git",
    ["ls-tree", "-z", "--name-only", resolvedRef, "--", relativePath],
    { cwd: projectRoot, encoding: "buffer", maxBuffer: 16 * 1024 * 1024 },
  );
  if (
    Buffer.from(treeOutput).toString("utf8").replaceAll("\0", "").trim() === ""
  ) {
    return {
      config: null,
      status: "bootstrap",
      source: null,
      requestedRef,
      resolvedRef,
    };
  }
  const { stdout } = await executeGit(
    "git",
    ["show", `${resolvedRef}:${relativePath}`],
    { cwd: projectRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  return {
    config: JSON.parse(String(stdout)),
    status: "loaded",
    source: `${resolvedRef}:${relativePath}`,
    requestedRef,
    resolvedRef,
  };
}

function parseCoreLoadBudgetCliOptions(argv, env = process.env) {
  let projectRoot = PROJECT_ROOT;
  let configArgument = null;
  let exceptionsArgument = null;
  let json = false;
  let baselineRef = Object.hasOwn(env, "CORE_LOAD_BUDGET_BASELINE_REF")
    ? env.CORE_LOAD_BUDGET_BASELINE_REF
    : null;
  for (const arg of argv) {
    if (arg === "--json") json = true;
    else if (arg.startsWith("--project-root="))
      projectRoot = path.resolve(
        PROJECT_ROOT,
        arg.slice("--project-root=".length),
      );
    else if (arg.startsWith("--config="))
      configArgument = arg.slice("--config=".length);
    else if (arg.startsWith("--exceptions="))
      exceptionsArgument = arg.slice("--exceptions=".length);
    else if (arg.startsWith("--baseline-ref="))
      baselineRef = arg.slice("--baseline-ref=".length);
    else throw new Error(`unknown core-load budget option: ${arg}`);
  }
  if (baselineRef !== null) baselineRef = validateBaselineRef(baselineRef);
  return {
    projectRoot,
    configPath: path.resolve(
      projectRoot,
      configArgument || DEFAULT_CONFIG_RELATIVE_PATH,
    ),
    exceptionsPath: path.resolve(
      projectRoot,
      exceptionsArgument || DEFAULT_EXCEPTIONS_RELATIVE_PATH,
    ),
    baselineRef,
    json,
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function measurementExceptionStatus(result, owner, metric, pathValue) {
  const matches = (item) =>
    item.metric === metric &&
    ((item.page && item.page === owner) ||
      (item.path && item.path === pathValue));
  if (result.appliedExceptions.some(matches)) return "applied";
  if (result.activeExceptions.some(matches)) return "active";
  return "none";
}

function createMeasurements(config, analysis, legacyAnalysis, result) {
  const measurements = [];
  for (const [page, pageConfig] of Object.entries(config.pages || {})) {
    for (const [metric, record] of Object.entries(
      analysis.pages?.[page]?.metrics || {},
    )) {
      measurements.push({
        page,
        metric,
        baseline: pageConfig.max?.[metric] ?? null,
        actual: record.actual,
        path: record.path,
        encoding: record.encoding,
        suggestedAction:
          record.actual > (pageConfig.max?.[metric] ?? Number.POSITIVE_INFINITY)
            ? "Reduce the measured core-load resource or request set."
            : "Keep this metric at or below its baseline.",
        exceptionStatus: measurementExceptionStatus(
          result,
          page,
          metric,
          record.path,
        ),
      });
    }
  }
  for (const [name, bundleConfig] of Object.entries(
    config.legacyBundles || {},
  )) {
    for (const [metric, record] of Object.entries(
      legacyAnalysis.bundles?.[name]?.metrics || {},
    )) {
      measurements.push({
        page: name,
        metric,
        baseline: bundleConfig.max?.[metric] ?? null,
        actual: record.actual,
        path: record.path,
        encoding: record.encoding,
        suggestedAction:
          "Keep this legacy bundle metric at or below its baseline.",
        exceptionStatus: measurementExceptionStatus(
          result,
          name,
          metric,
          record.path,
        ),
      });
    }
  }
  return measurements;
}

function createPayload({
  config,
  configPath,
  baselineState,
  analysis,
  legacyAnalysis,
  result,
}) {
  return {
    status: result.violations.length ? "failed" : "passed",
    configPath,
    repositoryBaselineStatus: baselineState.status,
    repositoryBaselineRef: baselineState.resolvedRef,
    repositoryBaselineSource: baselineState.source,
    graphPolicy: {
      staticImports: "included",
      dynamicImports: "deferred-separate",
      navigationHrefs: "excluded",
      cssDependencies: "transitive",
      dataAndFragmentUrls: "embedded-excluded",
      queryStrings: "request-identity",
    },
    pages: analysis.pages,
    legacyBundles: legacyAnalysis.bundles,
    measurements: createMeasurements(config, analysis, legacyAnalysis, result),
    activeExceptions: result.activeExceptions,
    appliedExceptions: result.appliedExceptions,
    violations: result.violations,
  };
}

function printCoreLoadBudgetPayload(payload, json) {
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  if (!payload.violations.length) {
    const pageSummary = Object.entries(payload.pages)
      .map(
        ([page, value]) =>
          `${page}=critical:${value.metrics.criticalLoadBytes.actual}/${value.metrics.criticalLoadBytes.encoding}/${value.metrics.criticalLoadRequests.actual}req,` +
          `startup:${value.metrics.startupStaticBytes.actual}/${value.metrics.startupStaticBytes.encoding}/${value.metrics.startupStaticRequests.actual}req,` +
          `cssGraph:${value.metrics.criticalCssDependencyBytes.actual}/${value.metrics.criticalCssDependencyBytes.encoding}/${value.metrics.criticalCssDependencyRequests.actual}req,` +
          `deferred:${value.metrics.deferredDynamicBytes.actual}/${value.metrics.deferredDynamicBytes.encoding}/${value.metrics.deferredDynamicRequests.actual}req`,
      )
      .join(" ");
    const legacySummary = Object.entries(payload.legacyBundles)
      .map(
        ([name, value]) =>
          `${name}=raw:${value.metrics.rawBytes.actual},br:${value.metrics.brotliBytes.actual},gzip:${value.metrics.gzipBytes.actual}`,
      )
      .join(" ");
    console.log(
      `[core-load-budget] PASS: baseline=${payload.repositoryBaselineStatus} ref=${payload.repositoryBaselineRef || "none"} ${pageSummary} ${legacySummary}`,
    );
    return;
  }
  console.error(
    `[core-load-budget] FAIL: ${payload.violations.length} violation(s)`,
  );
  for (const item of payload.violations) {
    console.error(
      `  [${item.code}] page=${item.page || "none"} path=${item.path || "none"} metric=${item.metric || "none"} baseline=${item.baseline ?? "none"} actual=${item.actual ?? "none"} encoding=${item.encoding} exception=${item.exceptionStatus} action=${item.suggestedAction}`,
    );
  }
}

async function runCoreLoadBudgetCheck({
  projectRoot = PROJECT_ROOT,
  configPath = DEFAULT_CONFIG_PATH,
  exceptionsPath = DEFAULT_EXCEPTIONS_PATH,
  baselineRef = null,
  json = false,
  now = new Date(),
  repositoryBaseline = null,
} = {}) {
  relativeRepositoryPath(configPath, projectRoot);
  relativeRepositoryPath(exceptionsPath, projectRoot);
  const config = await readJson(configPath);
  const exceptions = await readJson(exceptionsPath);
  const baselineState =
    repositoryBaseline ||
    (await readCoreLoadRepositoryConfigFromRef(
      configPath,
      baselineRef === null ? "HEAD" : baselineRef,
      projectRoot,
    ));
  const distRoot = path.resolve(projectRoot, config.distPath || "dist");
  if (path.basename(distRoot).startsWith("dist.backup-"))
    throw new Error("dist.backup-* directories must never be scanned");
  const analysis = await analyzeCoreLoadDist({
    distRoot,
    pageConfigs: config.pages,
    compression: config.compression,
  });
  const legacyAnalysis = await analyzeLegacyBundles(
    distRoot,
    config.legacyBundles,
    config.compression,
  );
  const result = evaluateCoreLoadBudget({
    config,
    repositoryConfig: baselineState.config,
    analysis,
    legacyAnalysis,
    exceptions,
    now,
    configPath: path.relative(projectRoot, configPath),
    exceptionsPath: path.relative(projectRoot, exceptionsPath),
  });
  const payload = createPayload({
    config,
    configPath: path.relative(projectRoot, configPath),
    baselineState,
    analysis,
    legacyAnalysis,
    result,
  });
  printCoreLoadBudgetPayload(payload, json);
  if (result.violations.length) process.exitCode = 1;
  return payload;
}

function createCoreLoadFailurePayload(error, options = {}) {
  return {
    status: "failed",
    configPath: options.configPath || null,
    repositoryBaselineStatus: "error",
    repositoryBaselineRef: options.baselineRef ?? null,
    repositoryBaselineSource: null,
    graphPolicy: null,
    pages: {},
    legacyBundles: {},
    measurements: [],
    activeExceptions: [],
    appliedExceptions: [],
    violations: [
      createViolation(
        "core-load-budget-error",
        error instanceof Error ? error.message : String(error),
        {
          suggestedAction:
            "Fix the config, dist, or Git baseline error and rerun the audit.",
        },
      ),
    ],
  };
}

export {
  DEFAULT_CONFIG_PATH,
  DEFAULT_EXCEPTIONS_PATH,
  PROJECT_ROOT,
  createCoreLoadFailurePayload,
  parseCoreLoadBudgetCliOptions,
  printCoreLoadBudgetPayload,
  readCoreLoadRepositoryConfigFromRef,
  runCoreLoadBudgetCheck,
};
