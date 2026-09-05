import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import {
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { runBrowserMeasurements } from "./browser.mjs";
import { fingerprintDistManifest } from "./dist-fingerprint.mjs";
import {
  resolveCorePerformanceExecutionProfile,
  resolveExecutionThresholdMode,
} from "./execution-profile.mjs";
import {
  readCorePerformanceContext,
  withCorePerformanceContext,
} from "./context.mjs";
import {
  DEFAULT_PROCESS_TREE_GRACE_MS,
  ownedSpawnOptions,
  terminateOwnedProcessTree,
} from "../process-tree.mjs";
import {
  REFERENCE_EXECUTION_PROFILE,
  REQUIRED_SCENARIO_METRICS,
  computeEffectiveThreshold,
  evaluatePerformanceBudget,
} from "./evaluate.mjs";
import { createViolation, isSafeExactRelativePath } from "./shared.mjs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_CONFIG_RELATIVE_PATH = "config/core-performance-budgets.json";
const DEFAULT_EXCEPTIONS_RELATIVE_PATH =
  "config/core-performance-budget-exceptions.json";
const DEFAULT_EVIDENCE_RELATIVE_PATH = "artifacts/core-performance/latest.json";
const DEFAULT_CONFIG_PATH = path.join(
  PROJECT_ROOT,
  DEFAULT_CONFIG_RELATIVE_PATH,
);
const DEFAULT_EXCEPTIONS_PATH = path.join(
  PROJECT_ROOT,
  DEFAULT_EXCEPTIONS_RELATIVE_PATH,
);
const DEFAULT_STARTUP_TIMEOUT_MS = 30_000;

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
      "core performance config must be a safe exact path inside the repository",
    );
  }
  return relativePath;
}

async function resolveCandidateSha(projectRoot, executeGit = execFileAsync) {
  const { stdout } = await executeGit(
    "git",
    ["rev-parse", "--verify", "HEAD^{commit}"],
    { cwd: projectRoot, encoding: "utf8" },
  );
  return String(stdout).trim();
}

/**
 * @param {string} configPath
 * @param {string} baselineRef
 * @param {string} [projectRoot]
 * @param {{ executeGit?: Function, candidateSha?: string | null }} [options]
 */
async function readPerformanceRepositoryConfigFromRef(
  configPath,
  baselineRef,
  projectRoot = PROJECT_ROOT,
  { executeGit = execFileAsync, candidateSha = null } = {},
) {
  const requestedRef = validateBaselineRef(baselineRef);
  const relativePath = relativeRepositoryPath(configPath, projectRoot);
  const { stdout: resolvedOutput } = await executeGit(
    "git",
    ["rev-parse", "--verify", "--end-of-options", `${requestedRef}^{commit}`],
    { cwd: projectRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  const resolvedRef = String(resolvedOutput).trim();
  if (candidateSha && resolvedRef === candidateSha) {
    throw new Error(
      "baseline ref resolves to the candidate commit; use a distinct actual base commit",
    );
  }
  const { stdout: treeOutput } = await executeGit(
    "git",
    ["ls-tree", "-z", "--name-only", resolvedRef, "--", relativePath],
    { cwd: projectRoot, encoding: "buffer", maxBuffer: 16 * 1024 * 1024 },
  );
  const exists =
    Buffer.from(treeOutput).toString("utf8").replaceAll("\0", "").trim() !== "";
  if (!exists) {
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
  let config;
  try {
    config = JSON.parse(String(stdout));
  } catch (error) {
    throw new Error(
      `repository performance baseline is invalid JSON: ${resolvedRef}:${relativePath}`,
      { cause: error },
    );
  }
  return {
    config,
    status: "loaded",
    source: `${resolvedRef}:${relativePath}`,
    requestedRef,
    resolvedRef,
  };
}

function isPathInside(root, target) {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

async function rejectSymlinkComponents(root, target) {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("evidence path escapes its approved root");
  }
  let current = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      const entry = await lstat(current);
      if (entry.isSymbolicLink()) {
        throw new Error(`evidence path contains a symlink: ${current}`);
      }
    } catch (error) {
      if (error?.code === "ENOENT") break;
      throw error;
    }
  }
}

/**
 * @param {string} evidencePath
 * @param {{ projectRoot?: string }} [options]
 */
async function validateEvidencePath(
  evidencePath,
  { projectRoot = PROJECT_ROOT } = {},
) {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const resolvedEvidencePath = path.resolve(evidencePath);
  if (path.extname(resolvedEvidencePath).toLowerCase() !== ".json") {
    throw new Error("evidence path must name a JSON file");
  }

  const artifactRoot = path.join(
    resolvedProjectRoot,
    "artifacts",
    "core-performance",
  );
  if (isPathInside(resolvedProjectRoot, resolvedEvidencePath)) {
    if (!isPathInside(artifactRoot, resolvedEvidencePath)) {
      throw new Error(
        "evidence path inside the project must be under artifacts/core-performance",
      );
    }
    await rejectSymlinkComponents(resolvedProjectRoot, resolvedEvidencePath);
    return resolvedEvidencePath;
  }

  const tempAliases = [
    ...new Set([path.resolve(tmpdir()), path.resolve("/tmp")]),
  ];
  const matchingAlias = tempAliases
    .filter((root) => isPathInside(root, resolvedEvidencePath))
    .sort((left, right) => right.length - left.length)[0];
  if (!matchingAlias) {
    throw new Error(
      "evidence path outside the project must be explicitly under the OS temp directory",
    );
  }
  await rejectSymlinkComponents(matchingAlias, resolvedEvidencePath);
  const canonicalRoot = await realpath(matchingAlias);
  let existingParent = path.dirname(resolvedEvidencePath);
  while (true) {
    try {
      const canonicalParent = await realpath(existingParent);
      if (!isPathInside(canonicalRoot, canonicalParent)) {
        throw new Error("evidence path symlink escapes the OS temp directory");
      }
      break;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const next = path.dirname(existingParent);
      if (next === existingParent) throw error;
      existingParent = next;
    }
  }
  return resolvedEvidencePath;
}

function parseCorePerformanceCliOptions(
  argv,
  env = process.env,
  system = { platform: process.platform, arch: process.arch },
) {
  const executionProfile = resolveCorePerformanceExecutionProfile(env, system);
  let projectRoot = PROJECT_ROOT;
  let configArgument = null;
  let exceptionsArgument = null;
  let evidenceArgument = null;
  let json = false;
  let measureOnly = false;
  let baselineRef = Object.hasOwn(env, "CORE_PERFORMANCE_BASELINE_REF")
    ? env.CORE_PERFORMANCE_BASELINE_REF
    : null;
  for (const arg of argv) {
    if (arg === "--json") json = true;
    else if (arg === "--measure-only") measureOnly = true;
    else if (arg.startsWith("--project-root=")) {
      projectRoot = path.resolve(
        PROJECT_ROOT,
        arg.slice("--project-root=".length),
      );
    } else if (arg.startsWith("--config=")) {
      configArgument = arg.slice("--config=".length);
    } else if (arg.startsWith("--exceptions=")) {
      exceptionsArgument = arg.slice("--exceptions=".length);
    } else if (arg.startsWith("--evidence=")) {
      evidenceArgument = arg.slice("--evidence=".length);
    } else if (arg.startsWith("--baseline-ref=")) {
      baselineRef = arg.slice("--baseline-ref=".length);
    } else {
      throw new Error(`unknown core performance option: ${arg}`);
    }
  }
  if (baselineRef !== null) baselineRef = validateBaselineRef(baselineRef);
  if (!measureOnly && baselineRef === null) {
    throw new Error(
      "CORE_PERFORMANCE_BASELINE_REF or --baseline-ref is required for the enforcing gate",
    );
  }
  if (measureOnly && !evidenceArgument) {
    throw new Error("--measure-only requires an explicit --evidence path");
  }
  const evidencePath = path.resolve(
    projectRoot,
    evidenceArgument || DEFAULT_EVIDENCE_RELATIVE_PATH,
  );
  if (
    evidenceArgument &&
    !path.isAbsolute(evidenceArgument) &&
    !isPathInside(
      path.join(projectRoot, "artifacts", "core-performance"),
      evidencePath,
    )
  ) {
    throw new Error(
      "relative evidence path must stay under artifacts/core-performance; use an absolute OS temp path for external evidence",
    );
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
    evidencePath,
    baselineRef,
    executionProfile,
    json,
    measureOnly,
  };
}

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => {
        if (error) reject(error);
        else if (port) resolve(port);
        else reject(new Error("failed to reserve preview port"));
      });
    });
  });
}

async function waitForPreview({
  baseUrl,
  child,
  fetchImpl,
  startupTimeoutMs,
  pollIntervalMs,
  signal = null,
}) {
  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error("preview startup aborted");
    if (child.exitCode !== null) {
      throw new Error(
        `preview server exited before readiness with code ${child.exitCode}`,
      );
    }
    try {
      const response = await fetchImpl(`${baseUrl}/2048.html`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(
    `preview server did not become ready within ${startupTimeoutMs}ms`,
  );
}

async function stopPreviewChild(child, options = {}) {
  await terminateOwnedProcessTree(child, options);
}

/**
 * @param {Function} callback
 * @param {any} [options]
 */
async function withPreviewServer(
  callback,
  {
    projectRoot = PROJECT_ROOT,
    port = null,
    spawnImpl = spawn,
    fetchImpl = fetch,
    startupTimeoutMs = DEFAULT_STARTUP_TIMEOUT_MS,
    pollIntervalMs = 100,
    lifecycle = null,
    signal = lifecycle?.signal || null,
    cleanupGraceMs = DEFAULT_PROCESS_TREE_GRACE_MS,
  } = {},
) {
  const selectedPort = port || (await reservePort());
  const baseUrl = `http://127.0.0.1:${selectedPort}`;
  const viteCli = path.join(
    projectRoot,
    "node_modules",
    "vite",
    "bin",
    "vite.js",
  );
  const child = spawnImpl(
    process.execPath,
    [
      viteCli,
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      String(selectedPort),
      "--strictPort",
    ],
    ownedSpawnOptions({
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  const unregister = lifecycle?.register?.(() =>
    stopPreviewChild(child, { graceMs: cleanupGraceMs }),
  );
  let stderr = "";
  child.stderr?.on?.("data", (chunk) => {
    stderr += String(chunk);
  });
  try {
    await waitForPreview({
      baseUrl,
      child,
      fetchImpl,
      startupTimeoutMs,
      pollIntervalMs,
      signal,
    });
    return await callback({ baseUrl, child });
  } catch (error) {
    if (stderr.trim()) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}; preview stderr: ${stderr.trim()}`,
      );
    }
    throw error;
  } finally {
    unregister?.();
    await stopPreviewChild(child, { graceMs: cleanupGraceMs });
  }
}

function createPerformanceThresholds(config, executionProfile) {
  return Object.fromEntries(
    Object.entries(config.scenarios || {}).map(([scenario, owner]) => [
      scenario,
      Object.fromEntries(
        Object.entries(owner.metrics || {}).map(([metric, budget]) => {
          const thresholdMode = resolveExecutionThresholdMode(
            executionProfile,
            metric,
          );
          return [
            metric,
            {
              ...budget,
              thresholdMode,
              ...computeEffectiveThreshold(budget, thresholdMode),
            },
          ];
        }),
      ),
    ]),
  );
}

function printPayload(payload, json) {
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  const prefix = payload.status === "passed" ? "PASS" : "FAIL";
  console.log(
    `[core-performance] ${prefix}: execution=${payload.executionProfile || "unknown"} browser=${payload.browserVersion || "unavailable"} samples=${payload.samples.length} baseline=${payload.repositoryBaselineStatus} evidence=${payload.evidencePath}`,
  );
  for (const [scenario, metrics] of Object.entries(payload.summaries || {})) {
    const concise = Object.entries(metrics)
      .map(
        ([metric, summary]) =>
          `${metric}=median:${summary.median ?? "-"},p75:${summary.p75 ?? "-"}`,
      )
      .join(" ");
    console.log(`  ${scenario}: ${concise}`);
  }
  for (const violation of payload.violations || []) {
    console.error(
      `  [${violation.code}] scenario=${violation.scenario || "none"} metric=${violation.metric || "none"} actual=${violation.actual ?? "none"} threshold=${violation.threshold ?? "none"} action=${violation.suggestedAction}`,
    );
  }
}

function isOwnedEvidence(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    value.schemaVersion === 1 &&
    (value.evidenceKind === "core-performance" ||
      (typeof value.mode === "string" &&
        Array.isArray(value.samples) &&
        Array.isArray(value.violations))),
  );
}

/**
 * @param {string} evidencePath
 * @param {unknown} payload
 * @param {{ projectRoot?: string }} [options]
 */
async function writeEvidence(
  evidencePath,
  payload,
  { projectRoot = PROJECT_ROOT } = {},
) {
  const safePath = await validateEvidencePath(evidencePath, { projectRoot });
  await mkdir(path.dirname(safePath), { recursive: true });
  await validateEvidencePath(safePath, { projectRoot });
  try {
    const existing = JSON.parse(await readFile(safePath, "utf8"));
    if (!isOwnedEvidence(existing)) {
      throw new Error(
        "refusing to overwrite a file that is not owned core performance evidence",
      );
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      if (error instanceof SyntaxError) {
        throw new Error(
          "refusing to overwrite a file that is not owned core performance evidence",
        );
      }
      throw error;
    }
  }

  const temporaryPath = path.join(
    path.dirname(safePath),
    `.${path.basename(safePath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporaryPath, safePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

/** @param {any} [options] */
async function runCorePerformanceGate({
  projectRoot = PROJECT_ROOT,
  configPath = null,
  exceptionsPath = null,
  evidencePath = null,
  baselineRef = null,
  executionProfile = REFERENCE_EXECUTION_PROFILE,
  json = false,
  measureOnly = false,
  now = new Date(),
  candidateSha = null,
  repositoryBaseline = null,
  runBrowser = runBrowserMeasurements,
  withServer = withPreviewServer,
  sampleCountOverrideForTests = null,
  writeStdout = true,
  lifecycle = null,
  signal = lifecycle?.signal || null,
} = {}) {
  const failureContext = {
    stage: "configuration",
    samples: [],
  };
  try {
    const resolvedConfigPath =
      configPath || path.join(projectRoot, DEFAULT_CONFIG_RELATIVE_PATH);
    const resolvedExceptionsPath =
      exceptionsPath ||
      path.join(projectRoot, DEFAULT_EXCEPTIONS_RELATIVE_PATH);
    const resolvedEvidencePath =
      evidencePath || path.join(projectRoot, DEFAULT_EVIDENCE_RELATIVE_PATH);
    await validateEvidencePath(resolvedEvidencePath, { projectRoot });
    relativeRepositoryPath(resolvedConfigPath, projectRoot);
    relativeRepositoryPath(resolvedExceptionsPath, projectRoot);
    const config = JSON.parse(await readFile(resolvedConfigPath, "utf8"));
    const exceptions = JSON.parse(
      await readFile(resolvedExceptionsPath, "utf8"),
    );
    Object.assign(failureContext, {
      stage: "git-baseline",
      executionProfile,
      profile: config.profile,
      policies: config.policies,
    });
    const resolvedCandidateSha =
      candidateSha || (await resolveCandidateSha(projectRoot));
    failureContext.candidateSha = resolvedCandidateSha;
    let baselineState = {
      config: null,
      status: measureOnly ? "measure-only" : "bootstrap",
      source: null,
      resolvedRef: null,
    };
    if (!measureOnly) {
      if (!baselineRef) {
        throw new Error(
          "CORE_PERFORMANCE_BASELINE_REF or --baseline-ref is required for the enforcing gate",
        );
      }
      baselineState =
        repositoryBaseline ||
        (await readPerformanceRepositoryConfigFromRef(
          resolvedConfigPath,
          baselineRef,
          projectRoot,
          { candidateSha: resolvedCandidateSha },
        ));
    }
    if (!measureOnly) {
      if (
        typeof baselineState.resolvedRef !== "string" ||
        baselineState.resolvedRef.trim() === "" ||
        baselineState.resolvedRef === resolvedCandidateSha
      ) {
        throw new Error(
          "enforcing performance baselines must resolve to a distinct real base commit",
        );
      }
    }
    const distRoot = path.resolve(projectRoot, config.distPath || "dist");
    const distManifestFingerprint = await fingerprintDistManifest(distRoot);
    Object.assign(failureContext, {
      stage: "browser-sampling",
      repositoryBaselineStatus: baselineState.status,
      repositoryBaselineRef: baselineState.resolvedRef,
      repositoryBaselineSource: baselineState.source,
      distManifestFingerprint,
    });
    const sampleCount = sampleCountOverrideForTests || config.sampleCount;
    if (
      sampleCountOverrideForTests !== null &&
      (!Number.isInteger(sampleCountOverrideForTests) ||
        sampleCountOverrideForTests <= 0)
    ) {
      throw new Error(
        "test-only sample count override must be a positive integer",
      );
    }
    const browserResult = await withServer(
      ({ baseUrl }) =>
        runBrowser({
          projectRoot,
          baseUrl,
          profile: config.profile,
          sampleCount,
          scenarioNames: Object.keys(REQUIRED_SCENARIO_METRICS),
          signal,
          lifecycle,
        }),
      { projectRoot, signal, lifecycle },
    );
    Object.assign(failureContext, {
      stage: "evaluation",
      browserVersion: browserResult.browserVersion,
      samples: browserResult.samples,
    });
    const evaluation = evaluatePerformanceBudget({
      config,
      repositoryConfig: measureOnly ? config : baselineState.config,
      samples: browserResult.samples,
      exceptions,
      now,
      enforceBudgets: !measureOnly,
      bootstrapMode: !measureOnly && baselineState.status === "bootstrap",
      executionProfile,
    });
    const violations = evaluation.violations;
    const payload = {
      evidenceKind: "core-performance",
      schemaVersion: 1,
      status: violations.length
        ? "failed"
        : measureOnly
          ? "measured"
          : "passed",
      stage: violations.length ? "evaluation" : "complete",
      generatedAt: now.toISOString(),
      mode: measureOnly ? "measure-only" : "enforce",
      executionProfile,
      profile: config.profile,
      policies: config.policies,
      browserVersion: browserResult.browserVersion,
      candidateSha: resolvedCandidateSha,
      repositoryBaselineStatus: baselineState.status,
      repositoryBaselineRef: baselineState.resolvedRef,
      repositoryBaselineSource: baselineState.source,
      distManifestFingerprint,
      sampleCount,
      samples: browserResult.samples,
      summaries: evaluation.summaries,
      thresholds: createPerformanceThresholds(config, executionProfile),
      activeExceptions: evaluation.activeExceptions,
      appliedExceptions: evaluation.appliedExceptions,
      violations,
      evidencePath: isPathInside(projectRoot, resolvedEvidencePath)
        ? path
            .relative(projectRoot, resolvedEvidencePath)
            .replaceAll(path.sep, "/")
        : resolvedEvidencePath,
    };
    await writeEvidence(resolvedEvidencePath, payload, { projectRoot });
    if (writeStdout) printPayload(payload, json);
    if (violations.length && writeStdout) process.exitCode = 1;
    return payload;
  } catch (error) {
    throw withCorePerformanceContext(error, {
      ...failureContext,
      ...readCorePerformanceContext(error),
    });
  }
}

function createCorePerformanceFailurePayload(error, options = {}) {
  const context = readCorePerformanceContext(error);
  return {
    evidenceKind: "core-performance",
    schemaVersion: 1,
    status: "failed",
    generatedAt: new Date().toISOString(),
    stage: context.stage || "initialization",
    mode: options.measureOnly ? "measure-only" : "enforce",
    executionProfile:
      context.executionProfile ?? options.executionProfile ?? null,
    profile: context.profile ?? null,
    policies: context.policies ?? null,
    browserVersion: context.browserVersion ?? null,
    candidateSha: context.candidateSha ?? null,
    repositoryBaselineStatus: context.repositoryBaselineStatus || "error",
    repositoryBaselineRef:
      context.repositoryBaselineRef ?? options.baselineRef ?? null,
    repositoryBaselineSource: context.repositoryBaselineSource ?? null,
    distManifestFingerprint: context.distManifestFingerprint ?? null,
    sampleCount: Array.isArray(context.samples) ? context.samples.length : null,
    samples: Array.isArray(context.samples) ? context.samples : [],
    failedScenario: context.scenario ?? null,
    failedIteration: context.iteration ?? null,
    summaries: {},
    thresholds: {},
    activeExceptions: [],
    appliedExceptions: [],
    violations: [
      createViolation(
        "core-performance-error",
        error instanceof Error ? error.message : String(error),
        {
          suggestedAction:
            "Fix the config, Git baseline, dist, preview, or browser error and rerun the gate.",
        },
      ),
    ],
    evidencePath: options.evidencePath || null,
  };
}

export {
  DEFAULT_CONFIG_PATH,
  DEFAULT_EVIDENCE_RELATIVE_PATH,
  DEFAULT_EXCEPTIONS_PATH,
  DEFAULT_STARTUP_TIMEOUT_MS,
  PROJECT_ROOT,
  createCorePerformanceFailurePayload,
  createPerformanceThresholds,
  fingerprintDistManifest,
  parseCorePerformanceCliOptions,
  printPayload,
  readPerformanceRepositoryConfigFromRef,
  runCorePerformanceGate,
  validateBaselineRef,
  validateEvidencePath,
  withPreviewServer,
  writeEvidence as writeCorePerformanceEvidence,
};
