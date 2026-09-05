import { describe, expect, it } from "vitest";

import {
  FIXED_POLICIES,
  FIXED_PROFILE,
  IMMUTABLE_METRIC_POLICIES,
  REQUIRED_SCENARIO_METRICS,
  REQUIRED_SCENARIO_POLICY,
  computeEffectiveThreshold,
  evaluatePerformanceBudget,
  median,
  nearestRankPercentile,
  summarizeSamples,
  validatePerformanceConfig,
  validatePerformanceExceptions,
  validatePerformanceSamples,
} from "../../scripts/core-performance-check.mjs";

type ScenarioName = keyof typeof REQUIRED_SCENARIO_METRICS;

type MetricPolicy = {
  absoluteCap: number;
  maxRelativeTolerance: number;
  maxAdditiveTolerance: number;
  bootstrapTolerance: number;
};
const METRIC_POLICIES = IMMUTABLE_METRIC_POLICIES as Record<
  ScenarioName,
  Record<string, MetricPolicy>
>;
const SCENARIO_POLICIES = REQUIRED_SCENARIO_POLICY as Record<
  ScenarioName,
  { path: string; cache: string }
>;

const EMPTY_EXCEPTIONS = { schemaVersion: 1, exceptions: [] };

const PROOFS: Record<ScenarioName, string[]> = {
  homeCold: ["window.game_manager", "getFinalBoardMatrix"],
  playCold: [
    "window.game_manager",
    "body[data-mode-id=standard_4x4_pow2_no_undo]",
    "rankedManagerFixture=matched-v2",
    "rankedPrefetchFixture=accepted-v2",
  ],
  moveInteraction: [
    "moveHistoryLength=1",
    "rankedManagerFixture=matched-v2",
    "rankedPrefetchFixture=accepted-v2",
  ],
  warmSaveRestore: [
    "savedGameStateByMode present",
    "restoredMoveHistoryExact=1",
    "restored board score and move history equal",
    "rankedManagerFixture=matched-v2",
    "rankedPrefetchFixture=accepted-v2",
  ],
  replayColdImportStep: [
    "replayMovesLength=10",
    "replayIndex=0->1",
    "replayFirstActionExecuted",
    "replayBoardChanged",
  ],
};

function metricFor(scenario: ScenarioName, metricName: string) {
  const policy = METRIC_POLICIES[scenario][metricName];
  return {
    baselineP75: Math.min(10, policy.absoluteCap),
    relativeTolerance: Math.min(0.1, policy.maxRelativeTolerance),
    additiveTolerance: Math.min(1, policy.maxAdditiveTolerance),
    absoluteMax: policy.absoluteCap,
  };
}

function validConfig() {
  const scenarios = Object.fromEntries(
    Object.entries(REQUIRED_SCENARIO_METRICS).map(([scenario, metrics]) => [
      scenario,
      {
        ...SCENARIO_POLICIES[scenario as ScenarioName],
        metrics: Object.fromEntries(
          metrics.map((metricName) => [
            metricName,
            metricFor(scenario as ScenarioName, metricName),
          ]),
        ),
      },
    ]),
  );
  return {
    schemaVersion: 3,
    sampleCount: 5,
    distPath: "dist",
    profile: structuredClone(FIXED_PROFILE),
    policies: structuredClone(FIXED_POLICIES),
    executionPolicies: {
      "github-actions-linux-x64": {
        timingAndInteractionThreshold: "immutable-absolute",
        resourceThreshold: "relative-ratchet",
      },
    },
    scenarios,
  };
}

function legacySchema2Config() {
  const config = structuredClone(validConfig()) as any;
  config.schemaVersion = 2;
  delete config.executionPolicies;
  config.executionBaselines = {
    "github-actions-linux-x64": {
      homeCold: {
        longTaskTotalMs: 10,
        longTaskMaxMs: 10,
        readyMs: 10,
      },
      playCold: {
        longTaskTotalMs: 10,
        longTaskMaxMs: 10,
        readyMs: 10,
      },
      moveInteraction: { moveLatencyMs: 10 },
      warmSaveRestore: {
        longTaskTotalMs: 10,
        longTaskMaxMs: 10,
        restoreReadyLatencyMs: 10,
      },
      replayColdImportStep: {
        longTaskTotalMs: 10,
        longTaskMaxMs: 10,
        readyMs: 10,
        replayImportLatencyMs: 10,
        replayStepLatencyMs: 10,
      },
    },
  };
  return config;
}

function metricValue(metricName: string, value: number) {
  if (["cls", "longTaskTotalMs", "longTaskMaxMs"].includes(metricName)) {
    return Math.max(0, value);
  }
  return Math.max(Number.EPSILON, value);
}

function sample(
  scenario: ScenarioName,
  iteration: number,
  value = 5,
  overrides: Record<string, unknown> = {},
) {
  return {
    scenario,
    iteration,
    cache: SCENARIO_POLICIES[scenario].cache,
    metrics: Object.fromEntries(
      REQUIRED_SCENARIO_METRICS[scenario].map((metricName) => [
        metricName,
        metricValue(metricName, value),
      ]),
    ),
    proofs: [...PROOFS[scenario]],
    errors: [] as string[],
    ...overrides,
  };
}

function validSamples(value = 5) {
  return (Object.keys(REQUIRED_SCENARIO_METRICS) as ScenarioName[]).flatMap(
    (scenario) =>
      [1, 2, 3, 4, 5].map((iteration) => sample(scenario, iteration, value)),
  );
}

function evaluate(
  config = validConfig(),
  samples = validSamples(),
  repositoryConfig: ReturnType<typeof validConfig> | null = config,
  exceptions: Record<string, unknown> = EMPTY_EXCEPTIONS,
) {
  return evaluatePerformanceBudget({
    config,
    repositoryConfig,
    samples,
    exceptions,
    now: new Date("2026-09-04T00:00:00Z"),
  });
}

describe("core performance statistics", () => {
  it("computes deterministic median and nearest-rank p75 for five samples", () => {
    expect(median([5, 1, 4, 2, 3])).toBe(3);
    expect(nearestRankPercentile([5, 1, 4, 2, 3], 0.75)).toBe(4);
    expect(summarizeSamples([1, 2, 3, 4, 100])).toEqual({
      median: 3,
      p75: 4,
    });
  });

  it("fails on p75 instead of a single outlier", () => {
    const config = validConfig();
    config.scenarios.moveInteraction.metrics.moveLatencyMs = {
      baselineP75: 100,
      relativeTolerance: 0,
      additiveTolerance: 0,
      absoluteMax: 200,
    };
    const samples = validSamples(5);
    const moveValues = [50, 50, 50, 50, 999];
    for (const current of samples.filter(
      (item) => item.scenario === "moveInteraction",
    )) {
      current.metrics.moveLatencyMs = moveValues[current.iteration - 1];
    }
    const result = evaluate(config, samples);

    expect(
      (
        result.summaries as Record<
          string,
          Record<string, { p75: number | null }>
        >
      ).moveInteraction.moveLatencyMs.p75,
    ).toBe(50);
    expect(
      result.violations.filter(
        (item) =>
          item.scenario === "moveInteraction" &&
          item.metric === "moveLatencyMs",
      ),
    ).toEqual([]);
  });

  it("uses the lower of the relative and absolute thresholds", () => {
    expect(
      computeEffectiveThreshold({
        baselineP75: 100,
        relativeTolerance: 0.5,
        additiveTolerance: 10,
        absoluteMax: 120,
      }),
    ).toEqual({ relativeMax: 160, effectiveMax: 120 });
    expect(
      computeEffectiveThreshold({
        baselineP75: 100,
        relativeTolerance: 0.1,
        additiveTolerance: 5,
        absoluteMax: 500,
      }),
    ).toEqual({ relativeMax: 115, effectiveMax: 115 });
  });

  it("reports a violation when actual p75 exceeds the effective threshold", () => {
    const config = validConfig();
    config.scenarios.moveInteraction.metrics.moveLatencyMs = {
      baselineP75: 100,
      relativeTolerance: 0,
      additiveTolerance: 0,
      absoluteMax: 200,
    };
    const samples = validSamples(5);
    const moveValues = [90, 110, 120, 130, 140];
    for (const current of samples.filter(
      (item) => item.scenario === "moveInteraction",
    )) {
      current.metrics.moveLatencyMs = moveValues[current.iteration - 1];
    }
    expect(evaluate(config, samples).violations).toContainEqual(
      expect.objectContaining({
        code: "performance-budget-exceeded",
        scenario: "moveInteraction",
        metric: "moveLatencyMs",
        actual: 130,
        threshold: 100,
      }),
    );
  });
});

describe("strict core performance sample schema", () => {
  it("rejects empty samples instead of silently passing", () => {
    expect(validatePerformanceSamples([]).violations).toContainEqual(
      expect.objectContaining({ code: "missing-performance-samples" }),
    );
    expect(evaluate(validConfig(), []).violations).toContainEqual(
      expect.objectContaining({ code: "missing-performance-samples" }),
    );
  });

  it.each([
    [
      "duplicate iteration",
      (samples: ReturnType<typeof validSamples>) => {
        samples.find(
          (item) => item.scenario === "homeCold" && item.iteration === 2,
        )!.iteration = 1;
      },
      "duplicate-performance-sample",
    ],
    [
      "unknown scenario",
      (samples: ReturnType<typeof validSamples>) => {
        samples[0].scenario = "unknown" as ScenarioName;
      },
      "invalid-performance-sample",
    ],
    [
      "wrong cache",
      (samples: ReturnType<typeof validSamples>) => {
        samples[0].cache = "warm";
      },
      "invalid-performance-sample",
    ],
    [
      "browser errors",
      (samples: ReturnType<typeof validSamples>) => {
        samples[0].errors = ["pageerror"];
      },
      "invalid-performance-sample",
    ],
    [
      "empty proofs",
      (samples: ReturnType<typeof validSamples>) => {
        samples[0].proofs = [];
      },
      "invalid-performance-sample",
    ],
    [
      "scenario-inappropriate proofs",
      (samples: ReturnType<typeof validSamples>) => {
        samples[0].proofs = ["moveHistoryLength=1"];
      },
      "invalid-performance-sample",
    ],
    [
      "missing metric",
      (samples: ReturnType<typeof validSamples>) => {
        delete samples[0].metrics.fcpMs;
      },
      "invalid-performance-metric",
    ],
    [
      "extra metric",
      (samples: ReturnType<typeof validSamples>) => {
        samples[0].metrics.extraMetric = 1;
      },
      "invalid-performance-metric",
    ],
    [
      "nonfinite metric",
      (samples: ReturnType<typeof validSamples>) => {
        samples[0].metrics.fcpMs = Number.NaN;
      },
      "invalid-performance-metric",
    ],
    [
      "zero required paint metric",
      (samples: ReturnType<typeof validSamples>) => {
        samples[0].metrics.lcpMs = 0;
      },
      "invalid-performance-metric",
    ],
  ])("rejects %s", (_label, mutate, code) => {
    const samples = validSamples();
    mutate(samples);
    expect(validatePerformanceSamples(samples).violations).toContainEqual(
      expect.objectContaining({ code }),
    );
  });

  it("does not let duplicate samples combine partial metrics", () => {
    const samples = validSamples();
    const homeOne = samples.find(
      (item) => item.scenario === "homeCold" && item.iteration === 1,
    )!;
    const homeTwo = samples.find(
      (item) => item.scenario === "homeCold" && item.iteration === 2,
    )!;
    homeTwo.iteration = 1;
    delete homeOne.metrics.fcpMs;
    delete homeTwo.metrics.lcpMs;
    expect(validatePerformanceSamples(samples).violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate-performance-sample" }),
        expect.objectContaining({
          code: "invalid-performance-metric",
          metric: "fcpMs",
        }),
        expect.objectContaining({
          code: "invalid-performance-metric",
          metric: "lcpMs",
        }),
      ]),
    );
  });
});

describe("core performance config and anti-laundering", () => {
  it("rejects invalid schema and a bootstrap missing a required owner/metric", () => {
    expect(validatePerformanceConfig({ schemaVersion: 0 })).not.toEqual([]);

    const config = validConfig();
    delete config.scenarios.homeCold.metrics.lcpMs;
    expect(evaluate(config, [], null).violations).toContainEqual(
      expect.objectContaining({ code: "invalid-config", metric: "lcpMs" }),
    );
  });

  it("rejects raised budgets, removals, lower sample count, and policy changes", () => {
    const repositoryConfig = validConfig();
    const config = structuredClone(repositoryConfig);
    config.sampleCount = 4;
    config.scenarios.homeCold.metrics.ttfbMs.baselineP75 += 1;
    config.scenarios.homeCold.metrics.fcpMs.relativeTolerance += 0.01;
    config.scenarios.homeCold.metrics.lcpMs.additiveTolerance += 1;
    config.scenarios.homeCold.metrics.cls.absoluteMax += 0.01;
    delete config.scenarios.playCold.metrics.requestCount;
    config.policies.readiness = "relaxed";
    config.distPath = "other-dist";

    const codes = evaluate(config, [], repositoryConfig).violations.map(
      (item) => item.code,
    );
    expect(codes).toContain("performance-baseline-raised");
    expect(codes).toContain("performance-scope-narrowed");
    expect(codes).toContain("performance-policy-changed");
    expect(codes).toContain("invalid-config");
  });

  it("locks immutable absolute caps, tolerance maxima, and baseline bounds", () => {
    const cases = [
      ["ttfbMs", "absoluteMax", 801],
      ["fcpMs", "absoluteMax", 1801],
      ["lcpMs", "absoluteMax", 2501],
      ["cls", "absoluteMax", 0.1001],
      ["moveLatencyMs", "absoluteMax", 201],
      ["fcpMs", "relativeTolerance", 0.251],
      ["fcpMs", "additiveTolerance", 101],
    ] as const;
    for (const [metricName, field, value] of cases) {
      const config = validConfig();
      const scenario =
        metricName === "moveLatencyMs" ? "moveInteraction" : "homeCold";
      config.scenarios[scenario].metrics[metricName][field] = value;
      expect(validatePerformanceConfig(config)).toContainEqual(
        expect.objectContaining({
          code: "invalid-config",
          scenario,
          metric: metricName,
        }),
      );
    }

    const config = validConfig();
    config.scenarios.homeCold.metrics.fcpMs.baselineP75 = 1801;
    expect(validatePerformanceConfig(config)).toContainEqual(
      expect.objectContaining({ code: "invalid-config", metric: "fcpMs" }),
    );
  });

  it("allows only small fixed bootstrap calibration headroom", () => {
    const config = validConfig();
    const samples = validSamples(100);
    config.scenarios.homeCold.metrics.fcpMs.baselineP75 = 100;
    expect(evaluate(config, samples, null).violations).not.toContainEqual(
      expect.objectContaining({
        code: "bootstrap-baseline-headroom",
        scenario: "homeCold",
        metric: "fcpMs",
      }),
    );

    config.scenarios.homeCold.metrics.fcpMs.baselineP75 = 120;
    expect(evaluate(config, samples, null).violations).not.toContainEqual(
      expect.objectContaining({
        code: "bootstrap-baseline-headroom",
        scenario: "homeCold",
        metric: "fcpMs",
      }),
    );

    config.scenarios.homeCold.metrics.fcpMs.baselineP75 = 126;
    expect(evaluate(config, samples, null).violations).toContainEqual(
      expect.objectContaining({
        code: "bootstrap-baseline-headroom",
        scenario: "homeCold",
        metric: "fcpMs",
      }),
    );
  });

  it("uses absolute timing caps on GitHub Actions without relaxing reference ratchets", () => {
    const config = validConfig();
    config.scenarios.homeCold.metrics.cls = {
      baselineP75: 0.01,
      relativeTolerance: 0,
      additiveTolerance: 0,
      absoluteMax: 0.1,
    };
    const observed = {
      homeCold: {
        ttfbMs: 100,
        fcpMs: 100,
        lcpMs: 100,
        cls: 0.05,
        longTaskTotalMs: 630,
        longTaskMaxMs: 313,
        readyMs: 1671.8,
      },
      playCold: {
        longTaskTotalMs: 679,
        longTaskMaxMs: 322,
        readyMs: 2082.3,
      },
      moveInteraction: { moveLatencyMs: 35 },
      warmSaveRestore: {
        longTaskTotalMs: 414,
        longTaskMaxMs: 219,
        restoreReadyLatencyMs: 1928,
      },
      replayColdImportStep: {
        longTaskTotalMs: 0,
        longTaskMaxMs: 0,
        readyMs: 1242,
        replayImportLatencyMs: 77.5,
        replayStepLatencyMs: 30.5,
      },
    };
    const samples = validSamples(5);
    for (const current of samples) {
      if (Object.hasOwn(current.metrics, "cls")) current.metrics.cls = 0.01;
      Object.assign(current.metrics, observed[current.scenario] || {});
    }

    const referenceResult = evaluatePerformanceBudget({
      config,
      repositoryConfig: config,
      samples,
      exceptions: EMPTY_EXCEPTIONS,
      executionProfile: "reference",
      now: new Date("2026-09-05T00:00:00Z"),
    });
    expect(
      referenceResult.violations.filter(
        (violation) => violation.code === "performance-budget-exceeded",
      ),
    ).toHaveLength(17);

    const githubResult = evaluatePerformanceBudget({
      config,
      repositoryConfig: legacySchema2Config(),
      samples,
      exceptions: EMPTY_EXCEPTIONS,
      executionProfile: "github-actions-linux-x64",
      now: new Date("2026-09-05T00:00:00Z"),
    });
    expect(githubResult.violations).toEqual([]);

    const overAbsoluteCap = structuredClone(samples);
    for (const current of overAbsoluteCap.filter(
      (item) => item.scenario === "moveInteraction",
    )) {
      current.metrics.moveLatencyMs = 201;
    }
    expect(
      evaluatePerformanceBudget({
        config,
        repositoryConfig: legacySchema2Config(),
        samples: overAbsoluteCap,
        exceptions: EMPTY_EXCEPTIONS,
        executionProfile: "github-actions-linux-x64",
      }).violations,
    ).toContainEqual(
      expect.objectContaining({
        code: "performance-budget-exceeded",
        scenario: "moveInteraction",
        metric: "moveLatencyMs",
        threshold: 200,
      }),
    );

    for (const [metric, value, threshold] of [
      ["requestCount", 11, 10],
      ["transferBytes", 12, 11],
      ["decodedBodyBytes", 12, 11],
    ] as const) {
      const resourceGrowth = structuredClone(samples);
      for (const current of resourceGrowth.filter(
        (item) => item.scenario === "homeCold",
      )) {
        current.metrics[metric] = value;
      }
      expect(
        evaluatePerformanceBudget({
          config,
          repositoryConfig: legacySchema2Config(),
          samples: resourceGrowth,
          exceptions: EMPTY_EXCEPTIONS,
          executionProfile: "github-actions-linux-x64",
        }).violations,
      ).toContainEqual(
        expect.objectContaining({
          code: "performance-budget-exceeded",
          scenario: "homeCold",
          metric,
          threshold,
        }),
      );
    }
  });

  it("locks execution policy after the one-time schema 2 migration", () => {
    const executionProfile = "github-actions-linux-x64";
    const repositoryConfig = validConfig();
    const changed = structuredClone(repositoryConfig);
    changed.executionPolicies[executionProfile].timingAndInteractionThreshold =
      "relative-ratchet";
    expect(validatePerformanceConfig(changed)).toContainEqual(
      expect.objectContaining({ code: "invalid-config" }),
    );
    expect(
      evaluate(changed, validSamples(), repositoryConfig).violations,
    ).toContainEqual(
      expect.objectContaining({ code: "performance-policy-changed" }),
    );

    const legacyRepositoryConfig = legacySchema2Config();
    expect(
      evaluatePerformanceBudget({
        config: repositoryConfig,
        repositoryConfig: legacyRepositoryConfig,
        samples: validSamples(),
        exceptions: EMPTY_EXCEPTIONS,
        executionProfile: "reference",
      }).violations.filter((violation) => violation.code === "invalid-config"),
    ).toEqual([]);
    expect(validatePerformanceConfig(legacyRepositoryConfig)).toContainEqual(
      expect.objectContaining({ code: "invalid-config" }),
    );

    const schema1RepositoryConfig = legacySchema2Config();
    schema1RepositoryConfig.schemaVersion = 1;
    expect(
      evaluatePerformanceBudget({
        config: repositoryConfig,
        repositoryConfig: schema1RepositoryConfig,
        samples: validSamples(),
        exceptions: EMPTY_EXCEPTIONS,
        executionProfile: "reference",
      }).violations,
    ).toContainEqual(
      expect.objectContaining({
        code: "invalid-config",
        path: "repository:config/core-performance-budgets.json",
      }),
    );
  });
});

describe("core performance exceptions", () => {
  function exception(overrides: Record<string, unknown> = {}) {
    return {
      scenario: "moveInteraction",
      metric: "moveLatencyMs",
      allowed: 180,
      task: "09-04-web-architecture-performance-gates",
      reason: "temporary CI calibration noise",
      createdOn: "2026-09-04",
      expiresOn: "2026-09-17",
      exitCondition: "remove after stable CI calibration",
      ...overrides,
    };
  }

  it("accepts both exact inclusive date boundaries", () => {
    for (const now of ["2026-09-04T00:00:00Z", "2026-09-17T23:59:59Z"]) {
      const result = validatePerformanceExceptions(
        { schemaVersion: 1, exceptions: [exception()] },
        new Date(now),
      );
      expect(result.violations).toEqual([]);
      expect(result.activeExceptions).toHaveLength(1);
    }
  });

  it.each([
    [
      "expired",
      { createdOn: "2026-08-25", expiresOn: "2026-09-03" },
      "expired-exception",
    ],
    ["future", { createdOn: "2026-09-05" }, "future-exception"],
    ["overlong", { expiresOn: "2026-09-18" }, "invalid-exception"],
    ["glob", { scenario: "*" }, "invalid-exception"],
    ["both selectors", { path: "play.html" }, "invalid-exception"],
  ])("rejects %s exceptions", (_label, overrides, code) => {
    const result = validatePerformanceExceptions(
      { schemaVersion: 1, exceptions: [exception(overrides)] },
      new Date("2026-09-04T00:00:00Z"),
    );
    expect(result.violations).toContainEqual(expect.objectContaining({ code }));
  });

  it("accepts an exact configured path selector with a query", () => {
    const exactPathException = exception({
      scenario: undefined,
      path: "play.html?mode_key=standard_4x4_pow2_no_undo",
      metric: "fcpMs",
      allowed: 1800,
    });
    const result = evaluate(validConfig(), validSamples(), validConfig(), {
      schemaVersion: 1,
      exceptions: [exactPathException],
    });
    expect(
      result.violations.filter(
        (violation) => violation.code === "invalid-exception-target",
      ),
    ).toEqual([]);
    expect(result.activeExceptions).toHaveLength(1);
  });

  it("reports active-insufficient and only applies an exception within its cap", () => {
    const config = validConfig();
    config.scenarios.moveInteraction.metrics.moveLatencyMs = {
      baselineP75: 100,
      relativeTolerance: 0,
      additiveTolerance: 0,
      absoluteMax: 200,
    };
    const samples = validSamples(5);
    for (const current of samples.filter(
      (item) => item.scenario === "moveInteraction",
    )) {
      current.metrics.moveLatencyMs = 190;
    }
    const insufficient = evaluate(config, samples, config, {
      schemaVersion: 1,
      exceptions: [exception({ allowed: 180 })],
    });
    expect(insufficient.violations).toContainEqual(
      expect.objectContaining({
        code: "performance-budget-exceeded",
        scenario: "moveInteraction",
        exceptionStatus: "active-insufficient",
      }),
    );

    for (const current of samples.filter(
      (item) => item.scenario === "moveInteraction",
    )) {
      current.metrics.moveLatencyMs = 175;
    }
    const applied = evaluate(config, samples, config, {
      schemaVersion: 1,
      exceptions: [exception({ allowed: 180 })],
    });
    expect(applied.appliedExceptions).toHaveLength(1);
    expect(
      applied.violations.filter(
        (violation) =>
          violation.scenario === "moveInteraction" &&
          violation.code === "performance-budget-exceeded",
      ),
    ).toEqual([]);
  });

  it("rejects unknown targets and non-waivable absolute-cap overrides", () => {
    for (const overrides of [
      { scenario: "unknown" },
      { metric: "unknownMetric" },
      { allowed: 201 },
      { scenario: undefined, path: "missing.html" },
    ]) {
      expect(
        evaluate(validConfig(), validSamples(), validConfig(), {
          schemaVersion: 1,
          exceptions: [exception(overrides)],
        }).violations,
      ).toContainEqual(
        expect.objectContaining({ code: "invalid-exception-target" }),
      );
    }
  });
});
