import {
  FIXED_EXECUTION_POLICIES,
  GITHUB_ACTIONS_LINUX_X64_EXECUTION_PROFILE,
  REFERENCE_EXECUTION_PROFILE,
  RELATIVE_RATCHET_THRESHOLD,
  RESOURCE_METRICS,
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
    !Object.hasOwn(FIXED_EXECUTION_POLICIES, executionProfile)
  ) {
    throw new Error(
      `unsupported core performance execution profile: ${executionProfile}`,
    );
  }
}

function resolveExecutionThresholdMode(executionProfile, metric) {
  assertSupportedExecutionProfile(executionProfile);
  if (executionProfile === REFERENCE_EXECUTION_PROFILE) {
    return RELATIVE_RATCHET_THRESHOLD;
  }
  const policy = FIXED_EXECUTION_POLICIES[executionProfile];
  return RESOURCE_METRICS.includes(metric)
    ? policy.resourceThreshold
    : policy.timingAndInteractionThreshold;
}

export {
  assertSupportedExecutionProfile,
  resolveCorePerformanceExecutionProfile,
  resolveExecutionThresholdMode,
};
