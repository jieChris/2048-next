import path from "node:path";

const ARCHITECTURE_BUDGET_METRICS = [
  "lines",
  "imports",
  "topLevelSymbols",
  "runtimeRegistrations",
];
const ARCHITECTURE_BUDGET_METRIC_SET = new Set(ARCHITECTURE_BUDGET_METRICS);
const MAX_EXCEPTION_DAYS = 14;
const GLOB_PATTERN = /[*?[\]{}]/u;

function toPosixPath(filePath) {
  return String(filePath || "").replace(/\\/gu, "/");
}

function createViolation(code, message, details = {}) {
  return {
    code,
    message,
    configPath: details.configPath ?? null,
    configIndex: details.configIndex ?? null,
    suggestedAction:
      details.suggestedAction ??
      "Fix the reported architecture budget violation.",
    exceptionStatus: details.exceptionStatus ?? "not-applicable",
    ...details,
  };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafeExactRelativePath(value) {
  if (!isNonEmptyString(value) || path.isAbsolute(value)) return false;
  if (GLOB_PATTERN.test(value)) return false;
  const normalized = toPosixPath(path.posix.normalize(toPosixPath(value)));
  return (
    normalized !== "." &&
    normalized !== ".." &&
    !normalized.startsWith("../") &&
    !normalized.includes("/../")
  );
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

export {
  ARCHITECTURE_BUDGET_METRICS,
  ARCHITECTURE_BUDGET_METRIC_SET,
  GLOB_PATTERN,
  MAX_EXCEPTION_DAYS,
  createViolation,
  isNonEmptyString,
  isNonNegativeInteger,
  isSafeExactRelativePath,
  toPosixPath,
};
