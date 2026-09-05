const LOAD_METRICS = [
  "ttfbMs",
  "fcpMs",
  "lcpMs",
  "cls",
  "longTaskTotalMs",
  "longTaskMaxMs",
  "readyMs",
  "requestCount",
  "transferBytes",
  "decodedBodyBytes",
];

const REQUIRED_SCENARIO_METRICS = {
  homeCold: LOAD_METRICS,
  playCold: LOAD_METRICS,
  moveInteraction: ["moveLatencyMs"],
  warmSaveRestore: [
    ...LOAD_METRICS.filter((metric) => metric !== "readyMs"),
    "restoreReadyLatencyMs",
  ],
  replayColdImportStep: [
    ...LOAD_METRICS,
    "replayImportLatencyMs",
    "replayStepLatencyMs",
  ],
};

const REQUIRED_SCENARIO_POLICY = {
  homeCold: { path: "/2048.html", cache: "cold" },
  playCold: {
    path: "/play.html?mode_key=standard_4x4_pow2_no_undo",
    cache: "cold",
  },
  moveInteraction: {
    path: "/play.html?mode_key=standard_4x4_pow2_no_undo",
    cache: "cold",
  },
  warmSaveRestore: {
    path: "/play.html?mode_key=standard_4x4_pow2_no_undo",
    cache: "warm",
  },
  replayColdImportStep: { path: "/replay.html", cache: "cold" },
};

const FIXED_PROFILE = {
  browser: "chromium",
  viewport: { width: 1365, height: 768 },
  cpuThrottleRate: 4,
  network: {
    latencyMs: 80,
    downloadBytesPerSecond: 1_600_000,
    uploadBytesPerSecond: 750_000,
  },
  locale: "zh-CN",
  timezoneId: "Asia/Shanghai",
  colorScheme: "light",
  reducedMotion: "reduce",
};

const FIXED_POLICIES = {
  readiness: "core-performance-readiness-v1",
  mockPolicy: "same-origin-api-deterministic-v1",
  errorsCollected: [
    "pageerror",
    "uncaught-console-error",
    "failed-critical-request",
  ],
  resourcesCollected: [
    "request-count",
    "cdp-encoded-data-length",
    "performance-resource-decoded-body-size",
  ],
};

const LOAD_METRIC_POLICIES = {
  ttfbMs: {
    absoluteCap: 800,
    maxRelativeTolerance: 0.5,
    maxAdditiveTolerance: 25,
    bootstrapTolerance: 1,
  },
  fcpMs: {
    absoluteCap: 1800,
    maxRelativeTolerance: 0.25,
    maxAdditiveTolerance: 100,
    bootstrapTolerance: 25,
  },
  lcpMs: {
    absoluteCap: 2500,
    maxRelativeTolerance: 0.25,
    maxAdditiveTolerance: 100,
    bootstrapTolerance: 25,
  },
  cls: {
    absoluteCap: 0.1,
    maxRelativeTolerance: 0.25,
    maxAdditiveTolerance: 0.005,
    bootstrapTolerance: 0.001,
  },
  longTaskTotalMs: {
    absoluteCap: 1500,
    maxRelativeTolerance: 0.25,
    maxAdditiveTolerance: 50,
    bootstrapTolerance: 25,
  },
  longTaskMaxMs: {
    absoluteCap: 500,
    maxRelativeTolerance: 0.25,
    maxAdditiveTolerance: 25,
    bootstrapTolerance: 25,
  },
  readyMs: {
    absoluteCap: 3500,
    maxRelativeTolerance: 0.25,
    maxAdditiveTolerance: 100,
    bootstrapTolerance: 100,
  },
};

function resourcePolicies(requestCount, transferBytes, decodedBodyBytes) {
  return {
    requestCount: {
      absoluteCap: requestCount,
      maxRelativeTolerance: 0,
      maxAdditiveTolerance: 0,
      bootstrapTolerance: 0,
    },
    transferBytes: {
      absoluteCap: transferBytes,
      maxRelativeTolerance: 0,
      maxAdditiveTolerance: 16_384,
      bootstrapTolerance: 0,
    },
    decodedBodyBytes: {
      absoluteCap: decodedBodyBytes,
      maxRelativeTolerance: 0,
      maxAdditiveTolerance: 32_768,
      bootstrapTolerance: 0,
    },
  };
}

const IMMUTABLE_METRIC_POLICIES = {
  // Resource caps below were calibrated from the strict post-load network-quiescence,
  // redirect-aware 5x5 evidence. Timing and interaction caps remain unchanged.
  homeCold: {
    ...LOAD_METRIC_POLICIES,
    ...resourcePolicies(49, 847_737, 2_404_202),
  },
  playCold: {
    ...LOAD_METRIC_POLICIES,
    readyMs: { ...LOAD_METRIC_POLICIES.readyMs, absoluteCap: 4000 },
    ...resourcePolicies(124, 931_372, 2_624_139),
  },
  moveInteraction: {
    moveLatencyMs: {
      absoluteCap: 200,
      maxRelativeTolerance: 0.25,
      maxAdditiveTolerance: 10,
      bootstrapTolerance: 5,
    },
  },
  warmSaveRestore: {
    ...Object.fromEntries(
      Object.entries(LOAD_METRIC_POLICIES).filter(
        ([metric]) => metric !== "readyMs",
      ),
    ),
    ...resourcePolicies(122, 930_721, 2_623_620),
    restoreReadyLatencyMs: {
      absoluteCap: 3500,
      maxRelativeTolerance: 0.25,
      maxAdditiveTolerance: 100,
      bootstrapTolerance: 100,
    },
  },
  replayColdImportStep: {
    ...LOAD_METRIC_POLICIES,
    ...resourcePolicies(62, 434_986, 1_620_862),
    replayImportLatencyMs: {
      absoluteCap: 1500,
      maxRelativeTolerance: 0.25,
      maxAdditiveTolerance: 25,
      bootstrapTolerance: 25,
    },
    replayStepLatencyMs: {
      absoluteCap: 500,
      maxRelativeTolerance: 0.25,
      maxAdditiveTolerance: 10,
      bootstrapTolerance: 5,
    },
  },
};

export {
  FIXED_POLICIES,
  FIXED_PROFILE,
  IMMUTABLE_METRIC_POLICIES,
  LOAD_METRICS,
  REQUIRED_SCENARIO_METRICS,
  REQUIRED_SCENARIO_POLICY,
};
