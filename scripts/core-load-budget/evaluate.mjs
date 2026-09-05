import {
  createViolation,
  isNonNegativeInteger,
  validateCoreLoadExceptions,
} from "./shared.mjs";
import { validateCoreLoadConfig } from "./schema.mjs";

function addApplied(appliedExceptions, exception) {
  const key = `${exception.page || exception.path}:${exception.metric}`;
  if (
    appliedExceptions.some(
      (item) => `${item.page || item.path}:${item.metric}` === key,
    )
  )
    return;
  appliedExceptions.push({ ...exception, exceptionStatus: "applied" });
}

function resolveException(activeExceptions, owner, metric, record) {
  const match = activeExceptions.find(
    (item) =>
      item.metric === metric &&
      ((item.page && item.page === owner) ||
        (item.path && item.path === record.path)),
  );
  if (!match) return { status: "none", exception: null };
  return match.allowed >= record.actual
    ? { status: "applied", exception: match }
    : { status: "active-insufficient", exception: null };
}

function compareRepositoryConfig(
  config,
  repositoryConfig,
  violations,
  configPath,
) {
  if (!repositoryConfig) return;
  const policyFields = ["distPath", "compression", "graphPolicy"];
  for (const field of policyFields) {
    if (
      JSON.stringify(config[field]) !== JSON.stringify(repositoryConfig[field])
    ) {
      violations.push(
        createViolation(
          "core-load-policy-changed",
          `${field} cannot change after bootstrap`,
          {
            path: configPath,
            suggestedAction: `Restore repository ${field}.`,
          },
        ),
      );
    }
  }
  for (const [page, baselinePage] of Object.entries(
    repositoryConfig.pages || {},
  )) {
    const candidatePage = config.pages?.[page];
    if (!candidatePage) {
      violations.push(
        createViolation(
          "core-load-scope-narrowed",
          "repository page budget was removed",
          { page, path: configPath },
        ),
      );
      continue;
    }
    if (
      candidatePage.html !== baselinePage.html ||
      JSON.stringify(candidatePage.criticalPreloads) !==
        JSON.stringify(baselinePage.criticalPreloads)
    ) {
      violations.push(
        createViolation(
          "core-load-policy-changed",
          "page target or preload set cannot change through budget config",
          {
            page,
            path: configPath,
            suggestedAction:
              "Restore the repository page target and logical preload set.",
          },
        ),
      );
    }
    compareMaxima(
      page,
      candidatePage.max,
      baselinePage.max,
      violations,
      configPath,
    );
  }
  for (const [name, baselineBundle] of Object.entries(
    repositoryConfig.legacyBundles || {},
  )) {
    const candidateBundle = config.legacyBundles?.[name];
    if (!candidateBundle) {
      violations.push(
        createViolation(
          "core-load-scope-narrowed",
          "repository legacy bundle was removed",
          { page: name, path: configPath },
        ),
      );
      continue;
    }
    if (candidateBundle.path !== baselineBundle.path) {
      violations.push(
        createViolation(
          "core-load-policy-changed",
          "legacy bundle path cannot change",
          { page: name, path: candidateBundle.path },
        ),
      );
    }
    compareMaxima(
      name,
      candidateBundle.max,
      baselineBundle.max,
      violations,
      candidateBundle.path,
    );
  }
}

function compareMaxima(owner, candidate, baseline, violations, path) {
  for (const [metric, baselineValue] of Object.entries(baseline || {})) {
    const candidateValue = candidate?.[metric];
    if (!isNonNegativeInteger(candidateValue)) {
      violations.push(
        createViolation(
          "core-load-scope-narrowed",
          "repository metric was removed",
          {
            page: owner,
            metric,
            baseline: baselineValue,
            path,
            suggestedAction: "Restore the repository metric.",
          },
        ),
      );
    } else if (candidateValue > baselineValue) {
      violations.push(
        createViolation(
          "core-load-baseline-raised",
          "metric baseline cannot increase",
          {
            page: owner,
            metric,
            baseline: baselineValue,
            actual: candidateValue,
            path,
            suggestedAction:
              "Restore or lower the baseline; use a precise expiring exception for temporary regression.",
          },
        ),
      );
    }
  }
}

function verifyBootstrapExact(config, analysis, legacyAnalysis, violations) {
  for (const [page, pageConfig] of Object.entries(config.pages || {})) {
    const actualPage = analysis.pages?.[page];
    if (!actualPage) continue;
    if (
      JSON.stringify(pageConfig.criticalPreloads) !==
      JSON.stringify(actualPage.criticalPreloads)
    ) {
      violations.push(
        createViolation(
          "bootstrap-baseline-not-exact",
          "bootstrap preload baseline must equal fresh dist",
          {
            page,
            path: pageConfig.html,
            baseline: pageConfig.criticalPreloads.length,
            actual: actualPage.criticalPreloads.length,
          },
        ),
      );
    }
    for (const [metric, maximum] of Object.entries(pageConfig.max || {})) {
      const actual = actualPage.metrics?.[metric]?.actual;
      if (typeof actual === "number" && actual !== maximum) {
        violations.push(
          createViolation(
            "bootstrap-baseline-not-exact",
            "bootstrap metric maximum must equal fresh dist",
            {
              page,
              metric,
              baseline: maximum,
              actual,
              path: actualPage.metrics[metric].path,
              encoding: actualPage.metrics[metric].encoding,
              suggestedAction:
                "Regenerate the bootstrap config from the existing fresh dist without headroom.",
            },
          ),
        );
      }
    }
  }
  for (const [name, bundleConfig] of Object.entries(
    config.legacyBundles || {},
  )) {
    const actualBundle = legacyAnalysis.bundles?.[name];
    if (!actualBundle) continue;
    for (const [metric, maximum] of Object.entries(bundleConfig.max || {})) {
      const actual = actualBundle.metrics?.[metric]?.actual;
      if (typeof actual === "number" && actual !== maximum) {
        violations.push(
          createViolation(
            "bootstrap-baseline-not-exact",
            "bootstrap legacy maximum must equal fresh dist",
            {
              page: name,
              metric,
              baseline: maximum,
              actual,
              path: bundleConfig.path,
              encoding: actualBundle.metrics[metric].encoding,
            },
          ),
        );
      }
    }
  }
}

function evaluateOwnerMetrics(
  owner,
  maxima,
  actualMetrics,
  activeExceptions,
  appliedExceptions,
  violations,
) {
  if (!actualMetrics) return;
  for (const [metric, maximum] of Object.entries(maxima || {})) {
    const record = actualMetrics[metric];
    if (!record) {
      violations.push(
        createViolation(
          "missing-metric",
          "configured metric was not measured",
          {
            page: owner,
            metric,
            baseline: maximum,
            suggestedAction:
              "Restore deterministic measurement for this required metric.",
          },
        ),
      );
      continue;
    }
    if (record.actual <= maximum) continue;
    const state = resolveException(activeExceptions, owner, metric, record);
    if (state.exception) addApplied(appliedExceptions, state.exception);
    else {
      violations.push(
        createViolation(
          "core-load-budget-exceeded",
          "core-load metric exceeds maximum",
          {
            page: owner,
            metric,
            baseline: maximum,
            actual: record.actual,
            path: record.path,
            encoding: record.encoding,
            exceptionStatus: state.status,
            suggestedAction:
              "Reduce the resource/request graph or add one precise expiring exception.",
          },
        ),
      );
    }
  }
}

function evaluateCoreLoadBudget({
  config,
  repositoryConfig,
  analysis,
  legacyAnalysis = { bundles: {}, violations: [] },
  exceptions,
  now = new Date(),
  configPath = "config/core-load-budgets.json",
  exceptionsPath = "config/core-load-budget-exceptions.json",
}) {
  const violations = validateCoreLoadConfig(config, configPath);
  if (repositoryConfig) {
    violations.push(
      ...validateCoreLoadConfig(repositoryConfig, `repository:${configPath}`),
    );
  }
  const exceptionState = validateCoreLoadExceptions(
    exceptions,
    now,
    exceptionsPath,
  );
  violations.push(...exceptionState.violations);
  const appliedExceptions = [];
  if (violations.some((item) => item.code.startsWith("invalid-"))) {
    return {
      violations,
      activeExceptions: exceptionState.activeExceptions,
      appliedExceptions,
    };
  }
  compareRepositoryConfig(config, repositoryConfig, violations, configPath);
  violations.push(
    ...(analysis.discoveryViolations || []),
    ...(legacyAnalysis.violations || []),
  );
  for (const [page, pageConfig] of Object.entries(config.pages)) {
    const actualPage = analysis.pages?.[page];
    if (!actualPage) {
      violations.push(
        createViolation(
          "missing-page-analysis",
          "required core page was not analyzed",
          { page, path: pageConfig.html },
        ),
      );
      continue;
    }
    if (
      JSON.stringify(pageConfig.criticalPreloads) !==
      JSON.stringify(actualPage.criticalPreloads)
    ) {
      violations.push(
        createViolation(
          "critical-preload-set-changed",
          "critical preload set changed",
          {
            page,
            path: pageConfig.html,
            baseline: pageConfig.criticalPreloads.length,
            actual: actualPage.criticalPreloads.length,
            encoding: "requests",
          },
        ),
      );
    }
    evaluateOwnerMetrics(
      page,
      pageConfig.max,
      actualPage.metrics,
      exceptionState.activeExceptions,
      appliedExceptions,
      violations,
    );
  }
  for (const [name, bundleConfig] of Object.entries(config.legacyBundles)) {
    const actualBundle = legacyAnalysis.bundles?.[name];
    if (!actualBundle) {
      violations.push(
        createViolation(
          "missing-legacy-analysis",
          "required legacy bundle was not analyzed",
          { page: name, path: bundleConfig.path },
        ),
      );
      continue;
    }
    evaluateOwnerMetrics(
      name,
      bundleConfig.max,
      actualBundle.metrics,
      exceptionState.activeExceptions,
      appliedExceptions,
      violations,
    );
  }
  if (!repositoryConfig)
    verifyBootstrapExact(config, analysis, legacyAnalysis, violations);
  return {
    violations,
    activeExceptions: exceptionState.activeExceptions,
    appliedExceptions,
  };
}

export { evaluateCoreLoadBudget, validateCoreLoadConfig };
