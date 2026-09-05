import {
  createViolation,
  isNonEmptyString,
  isNonNegativeInteger,
} from "./shared.mjs";
import {
  isSafeExactRelativePath,
  normalizeRequestUrl,
} from "./request-url.mjs";

const REQUIRED_CORE_PAGES = {
  home: "2048.html",
  play: "play.html",
  replay: "replay.html",
};
const REQUIRED_LEGACY_BUNDLES = {
  startup: "js/home_standard_startup_bundle.js",
  deferred: "js/home_standard_deferred_bundle.js",
};
const REQUIRED_PAGE_METRICS = [
  "htmlBytes",
  "directResourceBytes",
  "directResourceRequests",
  "directCriticalBytes",
  "directCriticalRequests",
  "criticalLoadBytes",
  "criticalLoadRequests",
  "startupStaticBytes",
  "startupStaticRequests",
  "criticalCssDependencyBytes",
  "criticalCssDependencyRequests",
  "deferredDynamicBytes",
  "deferredDynamicRequests",
  "largestCriticalJsBytes",
  "largestCriticalCssBytes",
  "largestCriticalImageBytes",
  "largestCriticalFontBytes",
  "criticalPreloadCount",
  "discoveredMissingBrotliSidecars",
  "discoveredMissingGzipSidecars",
];
const REQUIRED_LEGACY_METRICS = ["rawBytes", "brotliBytes", "gzipBytes"];

function isValidLogicalPreload(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    const normalized = normalizeRequestUrl(
      value.replaceAll("<hash>", "hash0000"),
    );
    return normalized.kind === "request";
  } catch {
    return false;
  }
}

function validateMetricMaxima(
  maxima,
  requiredMetrics,
  owner,
  violations,
  configPath,
) {
  if (!maxima || typeof maxima !== "object" || Array.isArray(maxima)) {
    violations.push(
      createViolation("invalid-config", "metric maxima must be an object", {
        page: owner,
        path: configPath,
        suggestedAction:
          "Record the complete exact metric set from the fresh dist.",
      }),
    );
    return;
  }
  for (const metric of requiredMetrics) {
    if (!isNonNegativeInteger(maxima[metric])) {
      violations.push(
        createViolation(
          "invalid-config",
          "required metric maximum is missing or invalid",
          {
            page: owner,
            metric,
            path: configPath,
            suggestedAction:
              "Restore the required metric with the exact fresh-dist integer.",
          },
        ),
      );
    }
  }
  for (const [metric, value] of Object.entries(maxima)) {
    if (!isNonEmptyString(metric) || !isNonNegativeInteger(value)) {
      violations.push(
        createViolation(
          "invalid-config",
          "all metric maxima must be named non-negative integers",
          {
            page: owner,
            metric,
            actual: value,
            path: configPath,
            suggestedAction: "Use a named non-negative integer metric maximum.",
          },
        ),
      );
    }
  }
}

function validateCompression(value, violations, configPath) {
  if (
    !value ||
    typeof value !== "object" ||
    value.preferred !== "br" ||
    value.fallback !== "gzip" ||
    typeof value.requireBrotli !== "boolean"
  ) {
    violations.push(
      createViolation(
        "invalid-config",
        "compression must prefer br with required gzip fallback",
        {
          path: configPath,
          suggestedAction:
            "Set preferred=br, fallback=gzip, and requireBrotli to a boolean.",
        },
      ),
    );
  }
}

function validateGraphPolicy(value, violations, configPath) {
  if (
    value?.staticImports !== "included" ||
    value?.dynamicImports !== "deferred-separate" ||
    value?.navigationHrefs !== "excluded" ||
    value?.cssDependencies !== "transitive" ||
    value?.dataAndFragmentUrls !== "embedded-excluded" ||
    value?.queryStrings !== "request-identity"
  ) {
    violations.push(
      createViolation(
        "invalid-config",
        "graphPolicy is incomplete or changed",
        {
          path: configPath,
          suggestedAction:
            "Restore the deterministic JS/CSS/navigation/data/query graph policy.",
        },
      ),
    );
  }
}

function validateCoreLoadConfig(
  config,
  configPath = "config/core-load-budgets.json",
) {
  const violations = [];
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return [
      createViolation(
        "invalid-config",
        "core-load budget config must be an object",
        { path: configPath },
      ),
    ];
  }
  if (config.schemaVersion !== 1 || config.distPath !== "dist") {
    violations.push(
      createViolation(
        "invalid-config",
        "schemaVersion must be 1 and distPath must be exactly dist",
        {
          path: configPath,
          suggestedAction:
            "Restore schemaVersion=1 and distPath=dist; backups are forbidden.",
        },
      ),
    );
  }
  validateCompression(config.compression, violations, configPath);
  validateGraphPolicy(config.graphPolicy, violations, configPath);
  if (
    !config.pages ||
    typeof config.pages !== "object" ||
    Array.isArray(config.pages)
  ) {
    violations.push(
      createViolation("invalid-config", "pages must be an object", {
        path: configPath,
      }),
    );
  } else {
    for (const [page, expectedHtml] of Object.entries(REQUIRED_CORE_PAGES)) {
      const pageConfig = config.pages[page];
      if (!pageConfig || pageConfig.html !== expectedHtml) {
        violations.push(
          createViolation(
            "invalid-config",
            "required core page owner/path is missing or changed",
            {
              page,
              path: pageConfig?.html || configPath,
              suggestedAction: `Restore ${page} -> ${expectedHtml}.`,
            },
          ),
        );
        continue;
      }
      if (!Array.isArray(pageConfig.criticalPreloads)) {
        violations.push(
          createViolation(
            "invalid-config",
            "criticalPreloads must be an array",
            { page, path: configPath },
          ),
        );
      } else if (
        pageConfig.criticalPreloads.some(
          (item) => !isValidLogicalPreload(item),
        ) ||
        new Set(pageConfig.criticalPreloads).size !==
          pageConfig.criticalPreloads.length
      ) {
        violations.push(
          createViolation(
            "invalid-config",
            "criticalPreloads must contain normalized logical request URLs",
            { page, path: configPath },
          ),
        );
      }
      validateMetricMaxima(
        pageConfig.max,
        REQUIRED_PAGE_METRICS,
        page,
        violations,
        configPath,
      );
    }
    for (const [page, pageConfig] of Object.entries(config.pages)) {
      if (
        !isSafeExactRelativePath(page) ||
        !isSafeExactRelativePath(pageConfig?.html)
      ) {
        violations.push(
          createViolation(
            "invalid-config",
            "page names and HTML paths must be safe and exact",
            { page, path: pageConfig?.html || configPath },
          ),
        );
      }
    }
  }
  if (
    !config.legacyBundles ||
    typeof config.legacyBundles !== "object" ||
    Array.isArray(config.legacyBundles)
  ) {
    violations.push(
      createViolation("invalid-config", "legacyBundles must be an object", {
        path: configPath,
      }),
    );
  } else {
    for (const [name, expectedPath] of Object.entries(
      REQUIRED_LEGACY_BUNDLES,
    )) {
      const bundle = config.legacyBundles[name];
      if (!bundle || bundle.path !== expectedPath) {
        violations.push(
          createViolation(
            "invalid-config",
            "required legacy bundle owner/path is missing or changed",
            {
              page: name,
              path: bundle?.path || configPath,
              suggestedAction: `Restore ${name} -> ${expectedPath}.`,
            },
          ),
        );
        continue;
      }
      validateMetricMaxima(
        bundle.max,
        REQUIRED_LEGACY_METRICS,
        name,
        violations,
        configPath,
      );
    }
  }
  return violations;
}

export {
  REQUIRED_CORE_PAGES,
  REQUIRED_LEGACY_BUNDLES,
  REQUIRED_LEGACY_METRICS,
  REQUIRED_PAGE_METRICS,
  validateCoreLoadConfig,
};
