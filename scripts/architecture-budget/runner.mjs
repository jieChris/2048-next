import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  createViolation,
  evaluateArchitectureBudget,
  isSafeExactRelativePath,
  toPosixPath,
  validateArchitectureBudgetConfig,
} from "./core.mjs";
import {
  collectProjectSourceMetrics,
  collectRepositoryRefSourceMetrics,
} from "./source-metrics.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_CONFIG_RELATIVE_PATH = "config/architecture-budgets.json";
const DEFAULT_EXCEPTIONS_RELATIVE_PATH =
  "config/architecture-budget-exceptions.json";
const DEFAULT_CONFIG_PATH = path.resolve(
  PROJECT_ROOT,
  DEFAULT_CONFIG_RELATIVE_PATH,
);
const DEFAULT_EXCEPTIONS_PATH = path.resolve(
  PROJECT_ROOT,
  DEFAULT_EXCEPTIONS_RELATIVE_PATH,
);

function displayPath(filePath, projectRoot = PROJECT_ROOT) {
  const relativePath = path.relative(projectRoot, filePath);
  return relativePath && !relativePath.startsWith("..")
    ? toPosixPath(relativePath)
    : toPosixPath(filePath);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function validateBaselineRef(baselineRef) {
  if (
    typeof baselineRef !== "string" ||
    baselineRef.trim().length === 0 ||
    baselineRef.startsWith("-")
  ) {
    throw new Error("baseline ref must be a non-empty git ref or SHA");
  }
  return baselineRef.trim();
}

async function readRepositoryConfigFromRef(
  configPath,
  baselineRef = "HEAD",
  projectRoot = PROJECT_ROOT,
  { executeGit = execFileAsync } = {},
) {
  const relativePath = toPosixPath(path.relative(projectRoot, configPath));
  if (!isSafeExactRelativePath(relativePath)) {
    throw new Error("architecture budget config must be inside the repository");
  }
  const requestedRef = validateBaselineRef(baselineRef);
  const { stdout: resolvedOutput } = await executeGit(
    "git",
    ["rev-parse", "--verify", "--end-of-options", `${requestedRef}^{commit}`],
    { cwd: projectRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  const resolvedRef = String(resolvedOutput).trim();
  const { stdout: pathOutput } = await executeGit(
    "git",
    ["ls-tree", "-z", "--name-only", resolvedRef, "--", relativePath],
    { cwd: projectRoot, encoding: "buffer", maxBuffer: 16 * 1024 * 1024 },
  );
  if (String(pathOutput).replaceAll("\0", "").trim() === "") {
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

async function readRepositoryConfigFromHead(
  configPath,
  projectRoot = PROJECT_ROOT,
  options = {},
) {
  return readRepositoryConfigFromRef(configPath, "HEAD", projectRoot, options);
}

function createArchitectureBudgetPayload({
  config,
  configPath,
  files,
  repositoryBaselineStatus,
  repositoryBaselineRef = null,
  repositoryBaselineSource = null,
  repositoryScannedFiles = 0,
  result,
}) {
  const activeExceptions = result.activeExceptions.map((exception) => ({
    ...exception,
    exceptionStatus: "active",
  }));
  const appliedExceptions = result.appliedExceptions.map((exception) => ({
    ...exception,
    exceptionStatus: "applied",
  }));
  const counts = {
    scannedFiles: files.length,
    repositoryScannedFiles,
    hotspots: Array.isArray(config.hotspots) ? config.hotspots.length : 0,
    activeExceptions: activeExceptions.length,
    appliedExceptions: appliedExceptions.length,
    violations: result.violations.length,
  };
  return {
    status: result.violations.length === 0 ? "passed" : "failed",
    configPath,
    repositoryBaselineStatus,
    repositoryBaselineRef,
    repositoryBaselineSource,
    counts,
    scannedFiles: counts.scannedFiles,
    hotspots: counts.hotspots,
    activeExceptions,
    appliedExceptions,
    violations: result.violations,
  };
}

function parseArchitectureBudgetCliOptions(argv, env = process.env) {
  let projectRoot = PROJECT_ROOT;
  let configArgument = null;
  let exceptionsArgument = null;
  let baselineRef = Object.prototype.hasOwnProperty.call(
    env,
    "ARCHITECTURE_BUDGET_BASELINE_REF",
  )
    ? env.ARCHITECTURE_BUDGET_BASELINE_REF
    : null;
  let json = false;
  for (const arg of argv) {
    if (arg === "--json") {
      json = true;
    } else if (arg.startsWith("--project-root=")) {
      projectRoot = path.resolve(
        PROJECT_ROOT,
        arg.slice("--project-root=".length),
      );
    } else if (arg.startsWith("--config=")) {
      configArgument = arg.slice("--config=".length);
    } else if (arg.startsWith("--exceptions=")) {
      exceptionsArgument = arg.slice("--exceptions=".length);
    } else if (arg.startsWith("--baseline-ref=")) {
      baselineRef = arg.slice("--baseline-ref=".length);
    } else {
      throw new Error(`unknown architecture budget option: ${arg}`);
    }
  }
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

function formatViolation(violation) {
  const parts = [`[${violation.code}]`];
  if (violation.path) parts.push(violation.path);
  if (violation.configPath) parts.push(`config=${violation.configPath}`);
  if (Number.isInteger(violation.configIndex)) {
    parts.push(`configIndex=${violation.configIndex}`);
  }
  if (violation.metric) parts.push(`metric=${violation.metric}`);
  if (Number.isInteger(violation.baseline)) {
    parts.push(`baseline=${violation.baseline}`);
  }
  if (Number.isInteger(violation.actual)) {
    parts.push(`actual=${violation.actual}`);
  }
  parts.push(`exception=${violation.exceptionStatus}`);
  parts.push(violation.message);
  parts.push(`action=${violation.suggestedAction}`);
  return parts.join(" | ");
}

function hasSameScanScope(left, right) {
  return (
    left.roots.length === right.roots.length &&
    left.extensions.length === right.extensions.length &&
    left.roots.every((root) => right.roots.includes(root)) &&
    left.extensions.every((extension) => right.extensions.includes(extension))
  );
}

function deduplicateDiscoveryViolations(violations) {
  const seen = new Set();
  const unique = [];
  for (const violation of violations) {
    const key = JSON.stringify([
      violation.code ?? null,
      violation.path ?? null,
      violation.configPath ?? null,
    ]);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(violation);
  }
  return unique;
}

async function runArchitectureBudgetCheck({
  configPath = DEFAULT_CONFIG_PATH,
  exceptionsPath = DEFAULT_EXCEPTIONS_PATH,
  projectRoot = PROJECT_ROOT,
  baselineRef = null,
  now = new Date(),
  json = false,
  repositoryBaseline = null,
  repositoryBaselineLoader = readRepositoryConfigFromRef,
  collectMetrics = collectProjectSourceMetrics,
  collectRepositoryMetrics = collectRepositoryRefSourceMetrics,
} = {}) {
  const configDisplayPath = displayPath(configPath, projectRoot);
  const exceptionsDisplayPath = displayPath(exceptionsPath, projectRoot);
  const config = await readJson(configPath);
  const exceptions = await readJson(exceptionsPath);
  const selectedBaselineRef = baselineRef === null ? "HEAD" : baselineRef;
  const baselineState =
    repositoryBaseline ||
    (await repositoryBaselineLoader(
      configPath,
      selectedBaselineRef,
      projectRoot,
    ));
  const configViolations = validateArchitectureBudgetConfig(config, {
    configPath: configDisplayPath,
  });
  const repositoryConfigViolations = baselineState.config
    ? validateArchitectureBudgetConfig(baselineState.config, {
        configPath: baselineState.source,
      })
    : [];
  const fileCollection = configViolations.length
    ? { files: [], violations: [] }
    : await collectMetrics(config, projectRoot, {
        configPath: configDisplayPath,
      });
  const files = fileCollection.files;
  const repositoryCollection =
    baselineState.config && repositoryConfigViolations.length === 0
      ? await collectRepositoryMetrics(
          baselineState.config,
          baselineState.resolvedRef,
          projectRoot,
          { configPath: baselineState.source },
        )
      : { files: [], violations: [] };
  const repositoryFiles = repositoryCollection.files;
  const usesCurrentCollectionForRepositoryScope =
    baselineState.config && hasSameScanScope(config, baselineState.config);
  const candidateRepositoryCollection =
    baselineState.config &&
    configViolations.length === 0 &&
    repositoryConfigViolations.length === 0
      ? usesCurrentCollectionForRepositoryScope
        ? fileCollection
        : await collectMetrics(baselineState.config, projectRoot, {
            configPath: configDisplayPath,
          })
      : { files: [], violations: [] };
  const candidateRepositoryFiles = candidateRepositoryCollection.files;
  const result = evaluateArchitectureBudget({
    config,
    repositoryConfig: baselineState.config,
    candidateRepositoryFiles,
    repositoryConfigPath: baselineState.source || undefined,
    exceptions,
    files,
    now,
    configPath: configDisplayPath,
    exceptionsConfigPath: exceptionsDisplayPath,
  });
  const discoveryViolations = deduplicateDiscoveryViolations([
    ...fileCollection.violations,
    ...repositoryCollection.violations,
    ...(usesCurrentCollectionForRepositoryScope
      ? []
      : candidateRepositoryCollection.violations),
  ]);
  result.violations.push(...discoveryViolations);
  const payload = createArchitectureBudgetPayload({
    config,
    configPath: configDisplayPath,
    files,
    repositoryBaselineStatus: baselineState.status,
    repositoryBaselineRef: baselineState.resolvedRef,
    repositoryBaselineSource: baselineState.source,
    repositoryScannedFiles: repositoryFiles.length,
    result,
  });
  printArchitectureBudgetPayload(payload, json);
  if (result.violations.length > 0) process.exitCode = 1;
  return payload;
}

function createArchitectureBudgetFailurePayload(error, options = {}) {
  const configPath = options.configPath
    ? displayPath(options.configPath, options.projectRoot || PROJECT_ROOT)
    : null;
  const violation = createViolation(
    "architecture-budget-error",
    error instanceof Error ? error.message : String(error),
    {
      configPath,
      suggestedAction:
        "Fix the config, file access, or git baseline error and rerun the audit.",
    },
  );
  return {
    status: "failed",
    configPath,
    repositoryBaselineStatus: "error",
    repositoryBaselineRef: options.baselineRef ?? null,
    repositoryBaselineSource: null,
    counts: {
      scannedFiles: 0,
      repositoryScannedFiles: 0,
      hotspots: 0,
      activeExceptions: 0,
      appliedExceptions: 0,
      violations: 1,
    },
    scannedFiles: 0,
    hotspots: 0,
    activeExceptions: [],
    appliedExceptions: [],
    violations: [violation],
  };
}

function printArchitectureBudgetPayload(payload, json) {
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  if (payload.violations.length === 0) {
    console.log(
      `[architecture-budget] PASS: scanned=${payload.counts.scannedFiles} repositoryScanned=${payload.counts.repositoryScannedFiles} hotspots=${payload.counts.hotspots} activeExceptions=${payload.counts.activeExceptions} appliedExceptions=${payload.counts.appliedExceptions} repositoryBaseline=${payload.repositoryBaselineStatus} baselineRef=${payload.repositoryBaselineRef || "none"}`,
    );
    return;
  }
  console.error(
    `[architecture-budget] FAIL: ${payload.violations.length} violation(s)`,
  );
  for (const violation of payload.violations) {
    console.error(`  ${formatViolation(violation)}`);
  }
}

export {
  DEFAULT_CONFIG_PATH,
  DEFAULT_EXCEPTIONS_PATH,
  PROJECT_ROOT,
  createArchitectureBudgetFailurePayload,
  createArchitectureBudgetPayload,
  parseArchitectureBudgetCliOptions,
  printArchitectureBudgetPayload,
  readRepositoryConfigFromHead,
  readRepositoryConfigFromRef,
  runArchitectureBudgetCheck,
};
