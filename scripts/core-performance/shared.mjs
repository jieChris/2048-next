import path from "node:path";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_EXCEPTION_DAYS = 14;
const GLOB_PATTERN = /[*?[\]{}]/u;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isSafeExactRelativePath(value) {
  if (!isNonEmptyString(value) || path.isAbsolute(value)) return false;
  if (
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(value) ||
    GLOB_PATTERN.test(value)
  ) {
    return false;
  }
  const normalized = path.posix.normalize(value);
  return (
    normalized !== "." &&
    normalized !== ".." &&
    !normalized.startsWith("../") &&
    !normalized.includes("/../") &&
    !normalized.split("/").some((part) => part.startsWith("dist.backup-"))
  );
}

function isSafeExactPerformancePath(value) {
  if (!isNonEmptyString(value) || path.isAbsolute(value)) return false;
  if (
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(value) ||
    /[*[\]{}]/u.test(value)
  ) {
    return false;
  }
  const [pathname, ...queryParts] = value.split("?");
  if (queryParts.length > 1 || !isSafeExactRelativePath(pathname)) return false;
  return queryParts.length === 0 || queryParts[0].length > 0;
}

function parseDateOnly(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return null;
  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  const date = new Date(timestamp);
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
    ? timestamp
    : null;
}

function startOfUtcDay(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function createViolation(code, message, details = {}) {
  return {
    code,
    message,
    scenario: details.scenario ?? null,
    metric: details.metric ?? null,
    baseline: details.baseline ?? null,
    actual: details.actual ?? null,
    threshold: details.threshold ?? null,
    path: details.path ?? null,
    exceptionStatus: details.exceptionStatus ?? "not-applicable",
    suggestedAction:
      details.suggestedAction || "Fix the reported core performance violation.",
    ...details,
  };
}

function validatePerformanceExceptions(
  config,
  now = new Date(),
  configPath = "config/core-performance-budget-exceptions.json",
) {
  const violations = [];
  const activeExceptions = [];
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config) ||
    config.schemaVersion !== 1 ||
    !Array.isArray(config.exceptions)
  ) {
    return {
      violations: [
        createViolation(
          "invalid-exception-config",
          "exception config must have schemaVersion 1 and an exceptions array",
          { path: configPath, exceptionStatus: "invalid" },
        ),
      ],
      activeExceptions,
    };
  }
  const identities = new Set();
  const today = startOfUtcDay(now);
  for (const [configIndex, exception] of config.exceptions.entries()) {
    const hasScenario = isNonEmptyString(exception?.scenario);
    const hasPath = isNonEmptyString(exception?.path);
    const selector = hasScenario ? exception.scenario : exception?.path;
    const createdOn = parseDateOnly(exception?.createdOn);
    const expiresOn = parseDateOnly(exception?.expiresOn);
    const duration =
      createdOn === null || expiresOn === null
        ? null
        : (expiresOn - createdOn) / DAY_MS;
    const identity = `${hasScenario ? "scenario" : "path"}:${selector}:${exception?.metric}`;
    const valid =
      exception &&
      typeof exception === "object" &&
      !Array.isArray(exception) &&
      hasScenario !== hasPath &&
      (hasScenario
        ? isSafeExactRelativePath(selector)
        : isSafeExactPerformancePath(selector)) &&
      isNonEmptyString(exception.metric) &&
      isFiniteNonNegativeNumber(exception.allowed) &&
      isNonEmptyString(exception.task) &&
      isNonEmptyString(exception.reason) &&
      isNonEmptyString(exception.exitCondition) &&
      createdOn !== null &&
      expiresOn !== null &&
      duration !== null &&
      duration >= 0 &&
      duration < MAX_EXCEPTION_DAYS &&
      !identities.has(identity);
    if (!valid) {
      violations.push(
        createViolation(
          "invalid-exception",
          `exceptions[${configIndex}] must be exact, unique, auditable, and cover no more than ${MAX_EXCEPTION_DAYS} inclusive UTC dates`,
          {
            scenario: hasScenario ? exception.scenario : null,
            metric: exception?.metric,
            path: hasPath ? exception.path : configPath,
            configIndex,
            exceptionStatus: "invalid",
          },
        ),
      );
      continue;
    }
    identities.add(identity);
    if (createdOn > today) {
      violations.push(
        createViolation("future-exception", "exception starts in the future", {
          scenario: hasScenario ? exception.scenario : null,
          metric: exception.metric,
          path: hasPath ? exception.path : null,
          configIndex,
          exceptionStatus: "invalid",
        }),
      );
    } else if (expiresOn < today) {
      violations.push(
        createViolation("expired-exception", "exception has expired", {
          scenario: hasScenario ? exception.scenario : null,
          metric: exception.metric,
          path: hasPath ? exception.path : null,
          configIndex,
          exceptionStatus: "expired",
        }),
      );
    } else {
      activeExceptions.push({
        ...exception,
        configIndex,
        exceptionStatus: "active",
      });
    }
  }
  return { violations, activeExceptions };
}

export {
  MAX_EXCEPTION_DAYS,
  createViolation,
  isFiniteNonNegativeNumber,
  isNonEmptyString,
  isSafeExactRelativePath,
  isSafeExactPerformancePath,
  validatePerformanceExceptions,
};
