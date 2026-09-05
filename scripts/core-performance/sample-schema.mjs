import {
  createViolation,
  isFiniteNonNegativeNumber,
  isNonEmptyString,
} from "./shared.mjs";
import {
  REQUIRED_SCENARIO_METRICS,
  REQUIRED_SCENARIO_POLICY,
} from "./policy.mjs";

const POSITIVE_METRICS = new Set([
  "ttfbMs",
  "fcpMs",
  "lcpMs",
  "readyMs",
  "requestCount",
  "transferBytes",
  "decodedBodyBytes",
]);

const REQUIRED_PROOF_PATTERNS = {
  homeCold: [/^window\.game_manager$/u, /^getFinalBoardMatrix$/u],
  playCold: [
    /^window\.game_manager$/u,
    /^body\[data-mode-id=standard_4x4_pow2_no_undo\]$/u,
    /^rankedManagerFixture=matched-v2$/u,
    /^rankedPrefetchFixture=accepted-v2$/u,
  ],
  moveInteraction: [
    /^moveHistoryLength=\d+$/u,
    /^rankedManagerFixture=matched-v2$/u,
    /^rankedPrefetchFixture=accepted-v2$/u,
  ],
  warmSaveRestore: [
    /^savedGameStateByMode present$/u,
    /^restoredMoveHistoryExact=\d+$/u,
    /^restored board score and move history equal$/u,
    /^rankedManagerFixture=matched-v2$/u,
    /^rankedPrefetchFixture=accepted-v2$/u,
  ],
  replayColdImportStep: [
    /^replayMovesLength=\d+$/u,
    /^replayIndex=0->1$/u,
    /^replayFirstActionExecuted$/u,
    /^replayBoardChanged$/u,
  ],
};

function median(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function nearestRankPercentile(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) return null;
  if (!(percentile > 0 && percentile <= 1)) {
    throw new Error("percentile must be greater than zero and at most one");
  }
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(percentile * sorted.length) - 1];
}

function summarizeSamples(values) {
  return {
    median: median(values),
    p75: nearestRankPercentile(values, 0.75),
  };
}

function proofTokensAreValid(scenario, proofs) {
  const patterns = REQUIRED_PROOF_PATTERNS[scenario] || [];
  if (
    !Array.isArray(proofs) ||
    proofs.length === 0 ||
    proofs.some((proof) => !isNonEmptyString(proof))
  ) {
    return false;
  }
  return (
    patterns.every((pattern) => proofs.some((proof) => pattern.test(proof))) &&
    proofs.every((proof) => patterns.some((pattern) => pattern.test(proof)))
  );
}

function createSummaries(samples) {
  const summaries = {};
  for (const [scenario, requiredMetrics] of Object.entries(
    REQUIRED_SCENARIO_METRICS,
  )) {
    summaries[scenario] = {};
    for (const metric of requiredMetrics) {
      const values = samples
        .filter((sample) => sample?.scenario === scenario)
        .map((sample) => sample.metrics?.[metric])
        .filter(isFiniteNonNegativeNumber);
      summaries[scenario][metric] = {
        ...summarizeSamples(values),
        sampleCount: values.length,
      };
    }
  }
  return summaries;
}

function validatePerformanceSamples(samples) {
  const violations = [];
  const input = Array.isArray(samples) ? samples : [];
  if (!Array.isArray(samples)) {
    violations.push(
      createViolation(
        "invalid-performance-sample",
        "performance samples must be an array",
      ),
    );
  }
  if (input.length !== 25) {
    violations.push(
      createViolation(
        "missing-performance-samples",
        "exactly five samples for each of the five required scenarios are required",
        { baseline: 25, actual: input.length },
      ),
    );
  }

  const seen = new Set();
  for (const [sampleIndex, sample] of input.entries()) {
    if (!sample || typeof sample !== "object" || Array.isArray(sample)) {
      violations.push(
        createViolation(
          "invalid-performance-sample",
          "each performance sample must be an object",
          { sampleIndex },
        ),
      );
      continue;
    }
    const scenario = sample.scenario;
    const requiredMetrics = REQUIRED_SCENARIO_METRICS[scenario];
    const scenarioPolicy = REQUIRED_SCENARIO_POLICY[scenario];
    if (!requiredMetrics || !scenarioPolicy) {
      violations.push(
        createViolation(
          "invalid-performance-sample",
          "unknown performance scenarios are not allowed",
          { scenario, sampleIndex },
        ),
      );
      continue;
    }

    const validIteration =
      Number.isInteger(sample.iteration) &&
      sample.iteration >= 1 &&
      sample.iteration <= 5;
    if (validIteration) {
      const identity = `${scenario}:${sample.iteration}`;
      if (seen.has(identity)) {
        violations.push(
          createViolation(
            "duplicate-performance-sample",
            "scenario iterations must be unique",
            { scenario, actual: sample.iteration, sampleIndex },
          ),
        );
      }
      seen.add(identity);
    } else {
      violations.push(
        createViolation(
          "invalid-performance-sample",
          "sample iteration must be an integer from 1 through 5",
          { scenario, actual: sample.iteration, sampleIndex },
        ),
      );
    }

    if (sample.cache !== scenarioPolicy.cache) {
      violations.push(
        createViolation(
          "invalid-performance-sample",
          "sample cache label does not match the scenario policy",
          {
            scenario,
            baseline: scenarioPolicy.cache,
            actual: sample.cache,
            sampleIndex,
          },
        ),
      );
    }
    if (!proofTokensAreValid(scenario, sample.proofs)) {
      violations.push(
        createViolation(
          "invalid-performance-sample",
          "sample proofs must be nonempty and scenario-appropriate",
          { scenario, sampleIndex },
        ),
      );
    }
    if (!Array.isArray(sample.errors) || sample.errors.length !== 0) {
      violations.push(
        createViolation(
          "invalid-performance-sample",
          "sample errors must be an empty array",
          { scenario, actual: sample.errors, sampleIndex },
        ),
      );
    }

    const metrics =
      sample.metrics &&
      typeof sample.metrics === "object" &&
      !Array.isArray(sample.metrics)
        ? sample.metrics
        : {};
    const requiredSet = new Set(requiredMetrics);
    for (const metric of new Set([
      ...requiredMetrics,
      ...Object.keys(metrics),
    ])) {
      const value = metrics[metric];
      const valid =
        requiredSet.has(metric) &&
        isFiniteNonNegativeNumber(value) &&
        (!POSITIVE_METRICS.has(metric) || value > 0);
      if (!valid) {
        violations.push(
          createViolation(
            "invalid-performance-metric",
            "sample metrics must exactly match the scenario schema with finite values and positive load/paint/navigation metrics",
            { scenario, metric, actual: value, sampleIndex },
          ),
        );
      }
    }
  }

  for (const scenario of Object.keys(REQUIRED_SCENARIO_METRICS)) {
    for (let iteration = 1; iteration <= 5; iteration += 1) {
      if (!seen.has(`${scenario}:${iteration}`)) {
        violations.push(
          createViolation(
            "missing-performance-samples",
            "every required scenario must contain iterations 1 through 5",
            { scenario, actual: iteration },
          ),
        );
      }
    }
  }
  return { summaries: createSummaries(input), violations };
}

export {
  createSummaries,
  median,
  nearestRankPercentile,
  summarizeSamples,
  validatePerformanceSamples,
};
