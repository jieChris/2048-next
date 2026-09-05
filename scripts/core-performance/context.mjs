const ALLOWED_CONTEXT_KEYS = new Set([
  "stage",
  "executionProfile",
  "profile",
  "policies",
  "candidateSha",
  "distManifestFingerprint",
  "browserVersion",
  "samples",
  "scenario",
  "iteration",
  "repositoryBaselineStatus",
  "repositoryBaselineRef",
  "repositoryBaselineSource",
]);

function cloneSafe(value) {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function sanitizeCorePerformanceContext(context) {
  const safe = {};
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    return safe;
  }
  for (const [key, value] of Object.entries(context)) {
    if (!ALLOWED_CONTEXT_KEYS.has(key)) continue;
    safe[key] = cloneSafe(value);
  }
  return safe;
}

function readCorePerformanceContext(error) {
  if (!error || typeof error !== "object") return {};
  return sanitizeCorePerformanceContext(error.corePerformanceContext);
}

function withCorePerformanceContext(error, context) {
  const target =
    error instanceof Error
      ? error
      : new Error(String(error || "unknown error"));
  const previous = readCorePerformanceContext(target);
  Object.defineProperty(target, "corePerformanceContext", {
    value: { ...previous, ...sanitizeCorePerformanceContext(context) },
    configurable: true,
    enumerable: false,
    writable: true,
  });
  return target;
}

export {
  readCorePerformanceContext,
  sanitizeCorePerformanceContext,
  withCorePerformanceContext,
};
