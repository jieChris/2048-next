import {
  assertSupportedExecutionProfile,
  resolveExecutionThresholdMode,
} from "./execution-profile.mjs";
import {
  FIXED_EXECUTION_POLICIES,
  FIXED_POLICIES,
  FIXED_PROFILE,
  IMMUTABLE_ABSOLUTE_THRESHOLD,
  IMMUTABLE_METRIC_POLICIES,
  LEGACY_SCHEMA_V2_EXECUTION_BASELINE_METRICS,
  LOAD_METRICS,
  REFERENCE_EXECUTION_PROFILE,
  REQUIRED_SCENARIO_METRICS,
  REQUIRED_SCENARIO_POLICY,
} from "./policy.mjs";
import {
  median,
  nearestRankPercentile,
  summarizeSamples,
  validatePerformanceSamples,
} from "./sample-schema.mjs";
import {
  createViolation,
  isFiniteNonNegativeNumber,
  isNonEmptyString,
  validatePerformanceExceptions,
} from "./shared.mjs";

function computeEffectiveThreshold(metricConfig, thresholdMode = null) {
  const relativeMax = Number(
    (
      metricConfig.baselineP75 * (1 + metricConfig.relativeTolerance) +
      metricConfig.additiveTolerance
    ).toFixed(6),
  );
  return {
    relativeMax,
    effectiveMax:
      thresholdMode === IMMUTABLE_ABSOLUTE_THRESHOLD
        ? metricConfig.absoluteMax
        : Math.min(relativeMax, metricConfig.absoluteMax),
  };
}

function isMetricBudget(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    isFiniteNonNegativeNumber(value.baselineP75) &&
    isFiniteNonNegativeNumber(value.relativeTolerance) &&
    isFiniteNonNegativeNumber(value.additiveTolerance) &&
    isFiniteNonNegativeNumber(value.absoluteMax)
  );
}

function haveSameKeys(actual, required) {
  const sortedRequired = [...required].sort();
  return (
    actual.length === sortedRequired.length &&
    [...actual].sort().every((value, index) => value === sortedRequired[index])
  );
}

function validateExecutionBaselines(config, configPath) {
  const violations = [];
  const baselines = config.executionBaselines;
  if (!baselines || typeof baselines !== "object" || Array.isArray(baselines)) {
    return [
      createViolation(
        "invalid-config",
        "schemaVersion=2 requires fixed execution baselines",
        { path: configPath },
      ),
    ];
  }
  const requiredProfiles = Object.keys(
    LEGACY_SCHEMA_V2_EXECUTION_BASELINE_METRICS,
  );
  if (!haveSameKeys(Object.keys(baselines), requiredProfiles)) {
    violations.push(
      createViolation(
        "invalid-config",
        "execution baseline profiles are missing or unsupported",
        { path: configPath },
      ),
    );
  }
  for (const [executionProfile, requiredScenarios] of Object.entries(
    LEGACY_SCHEMA_V2_EXECUTION_BASELINE_METRICS,
  )) {
    const profileBaselines = baselines[executionProfile];
    if (
      !profileBaselines ||
      typeof profileBaselines !== "object" ||
      Array.isArray(profileBaselines) ||
      !haveSameKeys(
        Object.keys(profileBaselines),
        Object.keys(requiredScenarios),
      )
    ) {
      violations.push(
        createViolation(
          "invalid-config",
          "execution baseline scenarios are missing or unsupported",
          { executionProfile, path: configPath },
        ),
      );
      continue;
    }
    for (const [scenario, requiredMetrics] of Object.entries(
      requiredScenarios,
    )) {
      const scenarioBaselines = profileBaselines[scenario];
      if (
        !scenarioBaselines ||
        typeof scenarioBaselines !== "object" ||
        Array.isArray(scenarioBaselines) ||
        !haveSameKeys(Object.keys(scenarioBaselines), requiredMetrics)
      ) {
        violations.push(
          createViolation(
            "invalid-config",
            "execution baseline metrics are missing or unsupported",
            { executionProfile, scenario, path: configPath },
          ),
        );
        continue;
      }
      for (const metric of requiredMetrics) {
        const baselineP75 = scenarioBaselines[metric];
        const baseBudget = config.scenarios?.[scenario]?.metrics?.[metric];
        const immutablePolicy = IMMUTABLE_METRIC_POLICIES[scenario]?.[metric];
        if (
          !isFiniteNonNegativeNumber(baselineP75) ||
          !isMetricBudget(baseBudget) ||
          !immutablePolicy ||
          baselineP75 > baseBudget.absoluteMax ||
          baselineP75 > immutablePolicy.absoluteCap
        ) {
          violations.push(
            createViolation(
              "invalid-config",
              "execution baseline exceeds the base or immutable metric cap",
              {
                executionProfile,
                scenario,
                metric,
                baseline: immutablePolicy?.absoluteCap ?? null,
                actual: baselineP75 ?? null,
                path: configPath,
              },
            ),
          );
        }
      }
    }
  }
  return violations;
}

function validateExecutionPolicies(config, configPath) {
  if (
    JSON.stringify(config.executionPolicies) ===
    JSON.stringify(FIXED_EXECUTION_POLICIES)
  ) {
    return [];
  }
  return [
    createViolation(
      "invalid-config",
      "schemaVersion=3 requires the fixed execution policies",
      { path: configPath },
    ),
  ];
}

function validatePerformanceConfig(
  config,
  configPath = "config/core-performance-budgets.json",
  { allowLegacySchema = false } = {},
) {
  const violations = [];
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return [
      createViolation(
        "invalid-config",
        "performance config must be an object",
        { path: configPath },
      ),
    ];
  }
  const validSchema =
    config.schemaVersion === 3 ||
    (allowLegacySchema && config.schemaVersion === 2);
  if (!validSchema || config.sampleCount !== 5 || config.distPath !== "dist") {
    violations.push(
      createViolation(
        "invalid-config",
        "schemaVersion=3, sampleCount=5, and distPath=dist are required",
        { path: configPath },
      ),
    );
  }
  if (config.schemaVersion === 2 && allowLegacySchema) {
    violations.push(...validateExecutionBaselines(config, configPath));
  }
  if (config.schemaVersion === 3) {
    violations.push(...validateExecutionPolicies(config, configPath));
  }
  if (JSON.stringify(config.profile) !== JSON.stringify(FIXED_PROFILE)) {
    violations.push(
      createViolation("invalid-config", "the fixed browser profile changed", {
        path: configPath,
      }),
    );
  }
  for (const [field, requiredValue] of Object.entries(FIXED_POLICIES)) {
    const candidateValue = config.policies?.[field];
    const valid = Array.isArray(requiredValue)
      ? JSON.stringify(candidateValue) === JSON.stringify(requiredValue)
      : candidateValue === requiredValue;
    if (!valid) {
      violations.push(
        createViolation(
          "invalid-config",
          `required performance policy ${field} is missing or changed`,
          { path: configPath },
        ),
      );
    }
  }
  for (const [scenario, requiredMetrics] of Object.entries(
    REQUIRED_SCENARIO_METRICS,
  )) {
    const owner = config.scenarios?.[scenario];
    const scenarioPolicy = REQUIRED_SCENARIO_POLICY[scenario];
    if (
      !owner ||
      owner.path !== scenarioPolicy.path ||
      owner.cache !== scenarioPolicy.cache
    ) {
      violations.push(
        createViolation(
          "invalid-config",
          "required scenario path/cache owner is missing or changed",
          { scenario, path: owner?.path || configPath },
        ),
      );
      continue;
    }
    const actualMetrics = Object.keys(owner.metrics || {});
    for (const metric of new Set([...requiredMetrics, ...actualMetrics])) {
      const budget = owner.metrics?.[metric];
      const immutablePolicy = IMMUTABLE_METRIC_POLICIES[scenario]?.[metric];
      const threshold = isMetricBudget(budget)
        ? computeEffectiveThreshold(budget)
        : null;
      if (
        !requiredMetrics.includes(metric) ||
        !isNonEmptyString(metric) ||
        !isMetricBudget(budget) ||
        !immutablePolicy ||
        budget.absoluteMax > immutablePolicy.absoluteCap ||
        budget.relativeTolerance > immutablePolicy.maxRelativeTolerance ||
        budget.additiveTolerance > immutablePolicy.maxAdditiveTolerance ||
        budget.baselineP75 > budget.absoluteMax ||
        !Number.isFinite(threshold?.relativeMax) ||
        !Number.isFinite(threshold?.effectiveMax) ||
        threshold.effectiveMax > immutablePolicy.absoluteCap
      ) {
        violations.push(
          createViolation(
            "invalid-config",
            "metric budget exceeds an immutable cap, tolerance, baseline bound, or required metric schema",
            {
              scenario,
              metric,
              path: owner.path,
              baseline: immutablePolicy?.absoluteCap ?? null,
              actual: budget?.absoluteMax ?? null,
            },
          ),
        );
      }
    }
  }
  return violations;
}

function compareRepositoryConfig(config, repositoryConfig, violations) {
  if (!repositoryConfig) return;
  for (const field of ["distPath", "profile", "policies"]) {
    if (
      JSON.stringify(config[field]) !== JSON.stringify(repositoryConfig[field])
    ) {
      violations.push(
        createViolation(
          "performance-policy-changed",
          `${field} cannot change after bootstrap`,
          { path: "config/core-performance-budgets.json" },
        ),
      );
    }
  }
  if (config.sampleCount < repositoryConfig.sampleCount) {
    violations.push(
      createViolation(
        "performance-policy-changed",
        "sample count cannot be lowered",
        { baseline: repositoryConfig.sampleCount, actual: config.sampleCount },
      ),
    );
  }
  for (const [scenario, baselineOwner] of Object.entries(
    repositoryConfig.scenarios || {},
  )) {
    const candidateOwner = config.scenarios?.[scenario];
    if (!candidateOwner) {
      violations.push(
        createViolation(
          "performance-scope-narrowed",
          "repository scenario was removed",
          { scenario },
        ),
      );
      continue;
    }
    if (
      candidateOwner.path !== baselineOwner.path ||
      candidateOwner.cache !== baselineOwner.cache
    ) {
      violations.push(
        createViolation(
          "performance-policy-changed",
          "scenario target/cache policy cannot change",
          { scenario, path: candidateOwner.path },
        ),
      );
    }
    for (const [metric, baselineBudget] of Object.entries(
      baselineOwner.metrics || {},
    )) {
      const candidateBudget = candidateOwner.metrics?.[metric];
      if (!candidateBudget) {
        violations.push(
          createViolation(
            "performance-scope-narrowed",
            "repository metric was removed",
            { scenario, metric },
          ),
        );
        continue;
      }
      for (const field of [
        "baselineP75",
        "relativeTolerance",
        "additiveTolerance",
        "absoluteMax",
      ]) {
        if (candidateBudget[field] > baselineBudget[field]) {
          violations.push(
            createViolation(
              "performance-baseline-raised",
              `${field} cannot increase after bootstrap`,
              {
                scenario,
                metric,
                baseline: baselineBudget[field],
                actual: candidateBudget[field],
              },
            ),
          );
        }
      }
    }
  }
  if (
    repositoryConfig.schemaVersion === 3 &&
    JSON.stringify(config.executionPolicies) !==
      JSON.stringify(repositoryConfig.executionPolicies)
  ) {
    violations.push(
      createViolation(
        "performance-policy-changed",
        "execution policies cannot change after schema 3 migration",
        { path: "config/core-performance-budgets.json" },
      ),
    );
  }
}

function validateExceptionTargets(exceptions, config, exceptionState) {
  const violations = [];
  const invalidIndexes = new Set();
  for (const [configIndex, exception] of (
    exceptions?.exceptions || []
  ).entries()) {
    if (!exception || typeof exception !== "object") continue;
    const matches = Object.entries(config?.scenarios || {}).filter(
      ([scenario, owner]) =>
        (exception.scenario && exception.scenario === scenario) ||
        (exception.path &&
          exception.path === String(owner.path || "").replace(/^\//u, "")),
    );
    const caps = matches
      .map(([scenario, owner]) =>
        owner.metrics?.[exception.metric]
          ? IMMUTABLE_METRIC_POLICIES[scenario]?.[exception.metric]?.absoluteCap
          : null,
      )
      .filter((cap) => typeof cap === "number");
    if (
      matches.length === 0 ||
      caps.length === 0 ||
      !isFiniteNonNegativeNumber(exception.allowed) ||
      exception.allowed > Math.min(...caps)
    ) {
      invalidIndexes.add(configIndex);
      violations.push(
        createViolation(
          "invalid-exception-target",
          "exception must target an existing scenario metric and cannot waive its immutable absolute cap",
          {
            scenario: exception.scenario ?? null,
            metric: exception.metric ?? null,
            path: exception.path ?? null,
            actual: exception.allowed ?? null,
            threshold: caps.length ? Math.min(...caps) : null,
            configIndex,
            exceptionStatus: "invalid",
          },
        ),
      );
    }
  }
  return {
    violations,
    activeExceptions: exceptionState.activeExceptions.filter(
      (exception) => !invalidIndexes.has(exception.configIndex),
    ),
  };
}

function verifyBootstrapHeadroom(config, summaries, violations) {
  for (const [scenario, requiredMetrics] of Object.entries(
    REQUIRED_SCENARIO_METRICS,
  )) {
    for (const metric of requiredMetrics) {
      const measuredP75 = summaries[scenario]?.[metric]?.p75;
      const baselineP75 =
        config?.scenarios?.[scenario]?.metrics?.[metric]?.baselineP75;
      const tolerance =
        IMMUTABLE_METRIC_POLICIES[scenario]?.[metric]?.bootstrapTolerance ?? 0;
      if (
        typeof measuredP75 === "number" &&
        typeof baselineP75 === "number" &&
        baselineP75 > measuredP75 + tolerance
      ) {
        violations.push(
          createViolation(
            "bootstrap-baseline-headroom",
            "bootstrap baselineP75 cannot exceed measured p75 plus the small immutable calibration tolerance",
            {
              scenario,
              metric,
              baseline: measuredP75,
              actual: baselineP75,
              threshold: measuredP75 + tolerance,
            },
          ),
        );
      }
    }
  }
}

function resolveException(activeExceptions, scenario, metric, path, actual) {
  const match = activeExceptions.find(
    (item) =>
      item.metric === metric &&
      ((item.scenario && item.scenario === scenario) ||
        (item.path && item.path === path)),
  );
  if (!match) return { status: "none", exception: null };
  return match.allowed >= actual
    ? { status: "applied", exception: match }
    : { status: "active-insufficient", exception: null };
}

function evaluatePerformanceBudget({
  config,
  repositoryConfig,
  samples,
  exceptions,
  now = new Date(),
  enforceBudgets = true,
  bootstrapMode = enforceBudgets && repositoryConfig === null,
  executionProfile = REFERENCE_EXECUTION_PROFILE,
}) {
  const violations = validatePerformanceConfig(config);
  if (repositoryConfig) {
    violations.push(
      ...validatePerformanceConfig(
        repositoryConfig,
        "repository:config/core-performance-budgets.json",
        { allowLegacySchema: true },
      ),
    );
  }
  compareRepositoryConfig(config || {}, repositoryConfig, violations);

  let executionProfileValid = true;
  try {
    assertSupportedExecutionProfile(executionProfile);
  } catch (error) {
    executionProfileValid = false;
    violations.push(
      createViolation(
        "invalid-config",
        error instanceof Error ? error.message : String(error),
        { executionProfile, path: "config/core-performance-budgets.json" },
      ),
    );
  }

  const exceptionState = validatePerformanceExceptions(exceptions, now);
  violations.push(...exceptionState.violations);
  const targetState = validateExceptionTargets(
    exceptions,
    config,
    exceptionState,
  );
  violations.push(...targetState.violations);

  const sampleState = validatePerformanceSamples(samples);
  violations.push(...sampleState.violations);
  const summaries = sampleState.summaries;
  const appliedExceptions = [];
  const sampleSchemaValid = sampleState.violations.length === 0;

  if (bootstrapMode && sampleSchemaValid) {
    verifyBootstrapHeadroom(config, summaries, violations);
  }
  if (enforceBudgets && sampleSchemaValid && executionProfileValid) {
    for (const [scenario, requiredMetrics] of Object.entries(
      REQUIRED_SCENARIO_METRICS,
    )) {
      for (const metric of requiredMetrics) {
        const summary = summaries[scenario][metric];
        const budget = config.scenarios?.[scenario]?.metrics?.[metric];
        if (!budget || typeof summary.p75 !== "number") continue;
        const thresholdMode = resolveExecutionThresholdMode(
          executionProfile,
          metric,
        );
        const threshold = computeEffectiveThreshold(budget, thresholdMode);
        if (summary.p75 <= threshold.effectiveMax) continue;
        const exception = resolveException(
          targetState.activeExceptions,
          scenario,
          metric,
          config.scenarios?.[scenario]?.path?.replace(/^\//u, "") || "",
          summary.p75,
        );
        if (exception.exception) {
          appliedExceptions.push(exception.exception);
          continue;
        }
        violations.push(
          createViolation(
            "performance-budget-exceeded",
            "measured p75 exceeds the effective relative/absolute threshold",
            {
              scenario,
              metric,
              baseline: budget.baselineP75,
              actual: summary.p75,
              threshold: threshold.effectiveMax,
              relativeThreshold: threshold.relativeMax,
              absoluteMax: budget.absoluteMax,
              exceptionStatus: exception.status,
            },
          ),
        );
      }
    }
  }
  return {
    summaries,
    activeExceptions: targetState.activeExceptions,
    appliedExceptions,
    violations,
  };
}

export {
  FIXED_EXECUTION_POLICIES,
  FIXED_POLICIES,
  FIXED_PROFILE,
  IMMUTABLE_METRIC_POLICIES,
  LEGACY_SCHEMA_V2_EXECUTION_BASELINE_METRICS,
  LOAD_METRICS,
  REFERENCE_EXECUTION_PROFILE,
  REQUIRED_SCENARIO_METRICS,
  REQUIRED_SCENARIO_POLICY,
  computeEffectiveThreshold,
  evaluatePerformanceBudget,
  median,
  nearestRankPercentile,
  summarizeSamples,
  validatePerformanceConfig,
  validatePerformanceSamples,
};
