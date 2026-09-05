import { validateRepositoryRatchet } from "./ratchet.mjs";
import {
  ARCHITECTURE_BUDGET_METRICS,
  ARCHITECTURE_BUDGET_METRIC_SET,
  GLOB_PATTERN,
  MAX_EXCEPTION_DAYS,
  createViolation,
  isNonEmptyString,
  isNonNegativeInteger,
  isSafeExactRelativePath,
  toPosixPath,
} from "./shared.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? timestamp
    : null;
}

function startOfUtcDay(value) {
  return Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  );
}

function validateArchitectureBudgetConfig(
  config,
  { configPath = "config/architecture-budgets.json" } = {},
) {
  const violations = [];
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return [
      createViolation(
        "invalid-config",
        "architecture budget config must be an object",
        {
          configPath,
          suggestedAction:
            "Replace the config with a schemaVersion 1 JSON object.",
        },
      ),
    ];
  }
  if (config.schemaVersion !== 1) {
    violations.push(
      createViolation("invalid-config", "schemaVersion must equal 1", {
        configPath,
        suggestedAction: "Set schemaVersion to 1.",
      }),
    );
  }
  if (!Number.isInteger(config.globalMaxLines) || config.globalMaxLines <= 0) {
    violations.push(
      createViolation(
        "invalid-config",
        "globalMaxLines must be a positive integer",
        {
          configPath,
          suggestedAction: "Set globalMaxLines to a positive integer.",
        },
      ),
    );
  }
  if (
    !Array.isArray(config.roots) ||
    config.roots.length === 0 ||
    config.roots.some((root) => !isSafeExactRelativePath(root))
  ) {
    violations.push(
      createViolation(
        "invalid-config",
        "roots must contain exact relative directory paths",
        {
          configPath,
          suggestedAction: "Use non-glob roots such as src and js.",
        },
      ),
    );
  }
  if (
    !Array.isArray(config.extensions) ||
    config.extensions.length === 0 ||
    config.extensions.some(
      (extension) =>
        !isNonEmptyString(extension) ||
        !extension.startsWith(".") ||
        GLOB_PATTERN.test(extension),
    )
  ) {
    violations.push(
      createViolation(
        "invalid-config",
        "extensions must contain exact dot-prefixed extensions",
        {
          configPath,
          suggestedAction: "Use exact extensions such as .ts and .js.",
        },
      ),
    );
  }
  validateExclusions(config.exclusions, configPath, violations);
  validateHotspots(config.hotspots, config.exclusions, configPath, violations);
  return violations;
}

function validateExclusions(exclusions, configPath, violations) {
  if (!Array.isArray(exclusions)) {
    violations.push(
      createViolation("invalid-config", "exclusions must be an array", {
        configPath,
        suggestedAction: "Set exclusions to an array, using [] when empty.",
      }),
    );
    return;
  }
  const paths = new Set();
  for (const [configIndex, exclusion] of exclusions.entries()) {
    const exclusionPath = toPosixPath(exclusion && exclusion.path);
    const valid =
      exclusion &&
      typeof exclusion === "object" &&
      !Array.isArray(exclusion) &&
      isSafeExactRelativePath(exclusion.path) &&
      isNonEmptyString(exclusion.category) &&
      isNonEmptyString(exclusion.reason) &&
      !paths.has(exclusionPath);
    if (valid) {
      paths.add(exclusionPath);
    } else {
      violations.push(
        createViolation(
          "invalid-exclusion",
          `exclusions[${configIndex}] must have a unique exact path, category, and reason`,
          {
            path: exclusionPath || null,
            configPath,
            configIndex,
            suggestedAction:
              "Use one exact file path and non-empty category and reason fields; globs are forbidden.",
          },
        ),
      );
    }
  }
}

function validateHotspots(hotspots, exclusions, configPath, violations) {
  if (!Array.isArray(hotspots)) {
    violations.push(
      createViolation("invalid-config", "hotspots must be an array", {
        configPath,
        suggestedAction: "Set hotspots to an array, using [] when empty.",
      }),
    );
    return;
  }
  const exclusionPaths = new Set(
    Array.isArray(exclusions)
      ? exclusions.map((entry) => toPosixPath(entry && entry.path))
      : [],
  );
  const paths = new Set();
  for (const [configIndex, hotspot] of hotspots.entries()) {
    const hotspotPath = toPosixPath(hotspot && hotspot.path);
    let valid =
      hotspot &&
      typeof hotspot === "object" &&
      !Array.isArray(hotspot) &&
      isSafeExactRelativePath(hotspot.path) &&
      hotspot.metrics &&
      typeof hotspot.metrics === "object" &&
      !Array.isArray(hotspot.metrics) &&
      !paths.has(hotspotPath) &&
      !exclusionPaths.has(hotspotPath);
    if (valid) {
      valid = ARCHITECTURE_BUDGET_METRICS.every((metric) =>
        isNonNegativeInteger(hotspot.metrics[metric]),
      );
    }
    if (valid) {
      paths.add(hotspotPath);
    } else {
      violations.push(
        createViolation(
          "invalid-hotspot",
          `hotspots[${configIndex}] must have a unique exact path and all non-negative metrics`,
          {
            path: hotspotPath || null,
            configPath,
            configIndex,
            suggestedAction:
              "Use one exact non-excluded path and provide every architecture metric.",
          },
        ),
      );
    }
  }
}

function validateArchitectureBudgetExceptions(
  exceptionConfig,
  now = new Date(),
  { configPath = "config/architecture-budget-exceptions.json" } = {},
) {
  const violations = [];
  const activeExceptions = [];
  if (
    !exceptionConfig ||
    typeof exceptionConfig !== "object" ||
    Array.isArray(exceptionConfig)
  ) {
    return {
      violations: [
        createViolation(
          "invalid-exception-config",
          "architecture budget exception config must be an object",
          {
            configPath,
            exceptionStatus: "invalid",
            suggestedAction: "Replace it with a schemaVersion 1 JSON object.",
          },
        ),
      ],
      activeExceptions,
    };
  }
  if (exceptionConfig.schemaVersion !== 1) {
    violations.push(
      createViolation(
        "invalid-exception-config",
        "exception schemaVersion must equal 1",
        {
          configPath,
          exceptionStatus: "invalid",
          suggestedAction: "Set exception schemaVersion to 1.",
        },
      ),
    );
  }
  if (!Array.isArray(exceptionConfig.exceptions)) {
    violations.push(
      createViolation(
        "invalid-exception-config",
        "exceptions must be an array",
        {
          configPath,
          exceptionStatus: "invalid",
          suggestedAction: "Set exceptions to an array, using [] when empty.",
        },
      ),
    );
    return { violations, activeExceptions };
  }

  const identities = new Set();
  const today = startOfUtcDay(now);
  for (const [configIndex, exception] of exceptionConfig.exceptions.entries()) {
    const exceptionPath = toPosixPath(exception && exception.path);
    const createdOn = parseDateOnly(exception && exception.createdOn);
    const expiresOn = parseDateOnly(exception && exception.expiresOn);
    const identity = `${exceptionPath}:${String(exception && exception.metric)}`;
    const durationDays =
      createdOn === null || expiresOn === null
        ? null
        : (expiresOn - createdOn) / DAY_MS;
    const valid =
      exception &&
      typeof exception === "object" &&
      !Array.isArray(exception) &&
      isSafeExactRelativePath(exception.path) &&
      ARCHITECTURE_BUDGET_METRIC_SET.has(exception.metric) &&
      isNonNegativeInteger(exception.allowed) &&
      isNonEmptyString(exception.task) &&
      isNonEmptyString(exception.reason) &&
      isNonEmptyString(exception.exitCondition) &&
      createdOn !== null &&
      expiresOn !== null &&
      durationDays !== null &&
      durationDays >= 0 &&
      durationDays < MAX_EXCEPTION_DAYS &&
      !identities.has(identity);
    if (!valid) {
      violations.push(
        createViolation(
          "invalid-exception",
          `exceptions[${configIndex}] must be unique, exact, auditable, and last no more than ${MAX_EXCEPTION_DAYS} days`,
          {
            path: exceptionPath || null,
            metric: exception && exception.metric ? exception.metric : null,
            configPath,
            configIndex,
            exceptionStatus: "invalid",
            suggestedAction:
              "Provide exact path, metric, allowed, task, reason, dates, and exitCondition without globs.",
          },
        ),
      );
      continue;
    }
    identities.add(identity);
    if (createdOn > today) {
      violations.push(
        createViolation(
          "future-exception",
          `exception createdOn ${exception.createdOn} is later than the current UTC day`,
          {
            path: exceptionPath,
            metric: exception.metric,
            configPath,
            configIndex,
            exceptionStatus: "invalid",
            suggestedAction:
              "Set createdOn to the current UTC date or earlier.",
          },
        ),
      );
      continue;
    }
    if (expiresOn < today) {
      violations.push(
        createViolation(
          "expired-exception",
          `exception expired on ${exception.expiresOn}`,
          {
            path: exceptionPath,
            metric: exception.metric,
            configPath,
            configIndex,
            exceptionStatus: "expired",
            suggestedAction:
              "Remove it or add a newly reviewed time-limited replacement.",
          },
        ),
      );
      continue;
    }
    activeExceptions.push({
      ...exception,
      path: exceptionPath,
      configPath,
      configIndex,
      exceptionStatus: "active",
    });
  }
  return { violations, activeExceptions };
}

function normalizeFileMetrics(file) {
  if (!file || typeof file !== "object") return null;
  const filePath = toPosixPath(file.path);
  if (!isSafeExactRelativePath(filePath)) return null;
  if (
    !ARCHITECTURE_BUDGET_METRICS.every((metric) =>
      isNonNegativeInteger(file[metric]),
    )
  ) {
    return null;
  }
  return {
    path: filePath,
    ...Object.fromEntries(
      ARCHITECTURE_BUDGET_METRICS.map((metric) => [metric, file[metric]]),
    ),
  };
}

function resolveExceptionState(exceptions, pathValue, metric, actual) {
  const exception = exceptions.find(
    (candidate) => candidate.path === pathValue && candidate.metric === metric,
  );
  if (!exception) return { exception: null, status: "none" };
  return exception.allowed >= actual
    ? { exception, status: "applied" }
    : { exception: null, status: "active-insufficient" };
}

function addAppliedException(appliedExceptions, exception) {
  const identity = `${exception.path}:${exception.metric}`;
  if (
    appliedExceptions.some(
      (candidate) => `${candidate.path}:${candidate.metric}` === identity,
    )
  ) {
    return;
  }
  appliedExceptions.push({ ...exception, exceptionStatus: "applied" });
}

function evaluateArchitectureBudget({
  config,
  configPath = "config/architecture-budgets.json",
  repositoryConfig = null,
  candidateRepositoryFiles = null,
  repositoryConfigPath = `repository:${configPath}`,
  exceptions,
  files,
  now = new Date(),
  exceptionsConfigPath = "config/architecture-budget-exceptions.json",
}) {
  const violations = validateArchitectureBudgetConfig(config, { configPath });
  if (repositoryConfig) {
    violations.push(
      ...validateArchitectureBudgetConfig(repositoryConfig, {
        configPath: repositoryConfigPath,
      }),
    );
  }
  const exceptionState = validateArchitectureBudgetExceptions(exceptions, now, {
    configPath: exceptionsConfigPath,
  });
  violations.push(...exceptionState.violations);
  const appliedExceptions = [];
  if (violations.some((violation) => violation.code.startsWith("invalid-"))) {
    return {
      violations,
      activeExceptions: exceptionState.activeExceptions,
      appliedExceptions,
    };
  }

  const normalizedFiles = [];
  for (const [configIndex, file] of (Array.isArray(files)
    ? files
    : []
  ).entries()) {
    const normalized = normalizeFileMetrics(file);
    if (normalized) {
      normalizedFiles.push(normalized);
    } else {
      violations.push(
        createViolation(
          "invalid-file-metrics",
          `files[${configIndex}] has invalid architecture metrics`,
          {
            configIndex,
            suggestedAction: "Regenerate metrics from repository files.",
          },
        ),
      );
    }
  }
  const normalizedCandidateRepositoryFiles = [];
  const candidateRepositoryFileInput =
    candidateRepositoryFiles === null
      ? normalizedFiles
      : candidateRepositoryFiles;
  for (const file of Array.isArray(candidateRepositoryFileInput)
    ? candidateRepositoryFileInput
    : []) {
    const normalized = normalizeFileMetrics(file);
    if (normalized) normalizedCandidateRepositoryFiles.push(normalized);
  }
  violations.push(
    ...validateRepositoryRatchet({
      repositoryConfig,
      candidateRepositoryFiles: normalizedCandidateRepositoryFiles,
      config,
      configPath,
    }),
  );

  const filesByPath = new Map(normalizedFiles.map((file) => [file.path, file]));
  const exclusionPaths = new Set(
    config.exclusions.map((entry) => toPosixPath(entry.path)),
  );
  const hotspotPaths = new Set(
    (repositoryConfig ? repositoryConfig.hotspots : config.hotspots).map(
      (entry) => toPosixPath(entry.path),
    ),
  );
  for (const [configIndex, hotspot] of config.hotspots.entries()) {
    evaluateHotspot({
      hotspot,
      configIndex,
      actualFile: filesByPath.get(toPosixPath(hotspot.path)),
      activeExceptions: exceptionState.activeExceptions,
      appliedExceptions,
      violations,
      configPath,
    });
  }
  for (const file of normalizedFiles) {
    if (exclusionPaths.has(file.path) || hotspotPaths.has(file.path)) continue;
    if (file.lines <= config.globalMaxLines) continue;
    const exceptionStateForMetric = resolveExceptionState(
      exceptionState.activeExceptions,
      file.path,
      "lines",
      file.lines,
    );
    if (exceptionStateForMetric.exception) {
      addAppliedException(appliedExceptions, exceptionStateForMetric.exception);
    } else {
      violations.push(
        createViolation(
          "untracked-hotspot",
          "production file exceeds the global line limit",
          {
            path: file.path,
            metric: "lines",
            baseline: config.globalMaxLines,
            actual: file.lines,
            configPath,
            exceptionStatus: exceptionStateForMetric.status,
            suggestedAction: "Split the file below the global limit.",
          },
        ),
      );
    }
  }
  return {
    violations,
    activeExceptions: exceptionState.activeExceptions,
    appliedExceptions,
  };
}

function evaluateHotspot({
  hotspot,
  configIndex,
  actualFile,
  activeExceptions,
  appliedExceptions,
  violations,
  configPath,
}) {
  const hotspotPath = toPosixPath(hotspot.path);
  if (!actualFile) {
    violations.push(
      createViolation("hotspot-missing", "hotspot file is missing", {
        path: hotspotPath,
        configPath,
        configIndex,
        suggestedAction:
          "Remove the entry only if the file was deleted; otherwise restore scan scope.",
      }),
    );
    return;
  }
  for (const metric of ARCHITECTURE_BUDGET_METRICS) {
    const baseline = hotspot.metrics[metric];
    const actual = actualFile[metric];
    if (actual > baseline) {
      const state = resolveExceptionState(
        activeExceptions,
        hotspotPath,
        metric,
        actual,
      );
      if (state.exception) {
        addAppliedException(appliedExceptions, state.exception);
      } else {
        violations.push(
          createViolation("hotspot-growth", "hotspot metric grew", {
            path: hotspotPath,
            metric,
            baseline,
            actual,
            configPath,
            configIndex,
            exceptionStatus: state.status,
            suggestedAction:
              "Reduce the metric or add a precise time-limited exception.",
          }),
        );
      }
    } else if (actual < baseline) {
      violations.push(
        createViolation(
          "hotspot-baseline-stale",
          "hotspot shrank; lower its baseline",
          {
            path: hotspotPath,
            metric,
            baseline,
            actual,
            configPath,
            configIndex,
            suggestedAction: "Set the baseline to the lower actual value.",
          },
        ),
      );
    }
  }
}

export {
  ARCHITECTURE_BUDGET_METRICS,
  MAX_EXCEPTION_DAYS,
  createViolation,
  evaluateArchitectureBudget,
  isSafeExactRelativePath,
  toPosixPath,
  validateArchitectureBudgetConfig,
  validateArchitectureBudgetExceptions,
};
