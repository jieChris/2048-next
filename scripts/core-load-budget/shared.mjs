import path from "node:path";

const MAX_EXCEPTION_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const GLOB_PATTERN = /[*?[\]{}]/u;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isSafeExactRelativePath(value) {
  if (!isNonEmptyString(value) || path.isAbsolute(value)) return false;
  if (
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(value) ||
    GLOB_PATTERN.test(value)
  )
    return false;
  const normalized = path.posix.normalize(value);
  return (
    normalized !== "." &&
    normalized !== ".." &&
    !normalized.startsWith("../") &&
    !normalized.includes("/../") &&
    !normalized.split("/").some((part) => part.startsWith("dist.backup-"))
  );
}

function createViolation(code, message, details = {}) {
  return {
    code,
    message,
    metric: details.metric ?? null,
    baseline: details.baseline ?? null,
    actual: details.actual ?? null,
    path: details.path ?? null,
    page: details.page ?? null,
    encoding: details.encoding ?? "not-applicable",
    suggestedAction:
      details.suggestedAction || "Fix the reported core-load budget violation.",
    exceptionStatus: details.exceptionStatus || "not-applicable",
    ...details,
  };
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

function validateCoreLoadExceptions(
  config,
  now = new Date(),
  configPath = "config/core-load-budget-exceptions.json",
) {
  const violations = [];
  const activeExceptions = [];
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {
      violations: [
        createViolation(
          "invalid-exception-config",
          "exception config must be an object",
          {
            path: configPath,
            exceptionStatus: "invalid",
            suggestedAction: "Use a schemaVersion 1 exception config.",
          },
        ),
      ],
      activeExceptions,
    };
  }
  if (config.schemaVersion !== 1 || !Array.isArray(config.exceptions)) {
    return {
      violations: [
        createViolation(
          "invalid-exception-config",
          "exception config must have schemaVersion 1 and an exceptions array",
          {
            path: configPath,
            exceptionStatus: "invalid",
            suggestedAction:
              "Set schemaVersion to 1 and exceptions to an array.",
          },
        ),
      ],
      activeExceptions,
    };
  }
  const identities = new Set();
  const today = startOfUtcDay(now);
  for (const [configIndex, exception] of config.exceptions.entries()) {
    const createdOn = parseDateOnly(exception?.createdOn);
    const expiresOn = parseDateOnly(exception?.expiresOn);
    const hasPage = isNonEmptyString(exception?.page);
    const hasPath = isNonEmptyString(exception?.path);
    const selector = hasPage ? exception.page : exception?.path;
    const identity = `${hasPage ? "page" : "path"}:${selector}:${exception?.metric}`;
    const duration =
      createdOn === null || expiresOn === null
        ? null
        : (expiresOn - createdOn) / DAY_MS;
    const valid =
      exception &&
      typeof exception === "object" &&
      !Array.isArray(exception) &&
      hasPage !== hasPath &&
      isSafeExactRelativePath(selector) &&
      isNonEmptyString(exception.metric) &&
      isNonNegativeInteger(exception.allowed) &&
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
            metric: exception?.metric,
            path: hasPath ? exception.path : configPath,
            page: hasPage ? exception.page : null,
            configIndex,
            exceptionStatus: "invalid",
            suggestedAction:
              "Provide exactly one exact page/path selector, numeric allowed, task, reason, dates, and exitCondition.",
          },
        ),
      );
      continue;
    }
    identities.add(identity);
    if (createdOn > today) {
      violations.push(
        createViolation("future-exception", "exception starts in the future", {
          metric: exception.metric,
          path: hasPath ? exception.path : null,
          page: hasPage ? exception.page : null,
          configIndex,
          exceptionStatus: "invalid",
          suggestedAction: "Set createdOn to the current UTC date or earlier.",
        }),
      );
    } else if (expiresOn < today) {
      violations.push(
        createViolation("expired-exception", "exception has expired", {
          metric: exception.metric,
          path: hasPath ? exception.path : null,
          page: hasPage ? exception.page : null,
          configIndex,
          exceptionStatus: "expired",
          suggestedAction:
            "Remove the exception or add a newly reviewed replacement.",
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
  isNonEmptyString,
  isNonNegativeInteger,
  isSafeExactRelativePath,
  validateCoreLoadExceptions,
};
