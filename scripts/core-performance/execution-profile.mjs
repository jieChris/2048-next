import {
  GITHUB_ACTIONS_LINUX_X64_EXECUTION_PROFILE,
  REFERENCE_EXECUTION_PROFILE,
} from "./policy.mjs";

function resolveCorePerformanceExecutionProfile(
  env = process.env,
  { platform = process.platform, arch = process.arch } = {},
) {
  if (env.GITHUB_ACTIONS !== "true") return REFERENCE_EXECUTION_PROFILE;
  if (
    env.RUNNER_OS !== "Linux" ||
    env.RUNNER_ARCH !== "X64" ||
    platform !== "linux" ||
    arch !== "x64"
  ) {
    throw new Error(
      "unsupported GitHub Actions core performance environment; expected Linux/X64 on linux/x64",
    );
  }
  return GITHUB_ACTIONS_LINUX_X64_EXECUTION_PROFILE;
}

function assertSupportedExecutionProfile(executionProfile) {
  if (
    executionProfile !== REFERENCE_EXECUTION_PROFILE &&
    executionProfile !== GITHUB_ACTIONS_LINUX_X64_EXECUTION_PROFILE
  ) {
    throw new Error(
      `unsupported core performance execution profile: ${executionProfile}`,
    );
  }
}

function hasExecutionBaseline(config, executionProfile) {
  assertSupportedExecutionProfile(executionProfile);
  if (executionProfile === REFERENCE_EXECUTION_PROFILE) return true;
  return Boolean(config?.executionBaselines?.[executionProfile]);
}

function resolvePerformanceConfigForExecution(config, executionProfile) {
  assertSupportedExecutionProfile(executionProfile);
  if (executionProfile === REFERENCE_EXECUTION_PROFILE) return config;
  const executionBaseline = config?.executionBaselines?.[executionProfile];
  if (!executionBaseline) {
    throw new Error(
      `missing core performance execution baseline: ${executionProfile}`,
    );
  }
  const scenarios = Object.fromEntries(
    Object.entries(config.scenarios || {}).map(([scenario, owner]) => {
      const baselineMetrics = executionBaseline[scenario] || {};
      const metrics = Object.fromEntries(
        Object.entries(owner.metrics || {}).map(([metric, budget]) => [
          metric,
          Object.hasOwn(baselineMetrics, metric)
            ? { ...budget, baselineP75: baselineMetrics[metric] }
            : budget,
        ]),
      );
      return [scenario, { ...owner, metrics }];
    }),
  );
  return { ...config, scenarios };
}

export {
  assertSupportedExecutionProfile,
  hasExecutionBaseline,
  resolveCorePerformanceExecutionProfile,
  resolvePerformanceConfigForExecution,
};
