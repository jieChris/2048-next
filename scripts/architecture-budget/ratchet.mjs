import {
  ARCHITECTURE_BUDGET_METRICS,
  createViolation,
  toPosixPath,
} from "./shared.mjs";

function validateRepositoryRatchet({
  repositoryConfig,
  candidateRepositoryFiles,
  config,
  configPath,
}) {
  if (!repositoryConfig) return [];
  const violations = [];
  if (config.globalMaxLines > repositoryConfig.globalMaxLines) {
    violations.push(
      createViolation(
        "global-baseline-raised",
        "globalMaxLines cannot increase above the repository baseline",
        {
          configPath,
          metric: "globalMaxLines",
          baseline: repositoryConfig.globalMaxLines,
          actual: config.globalMaxLines,
          suggestedAction:
            "Restore or lower globalMaxLines; exceptions must target exact files.",
        },
      ),
    );
  }
  for (const root of repositoryConfig.roots) {
    if (!config.roots.includes(root)) {
      violations.push(
        createViolation("scan-scope-narrowed", "a source root was removed", {
          path: root,
          configPath,
          suggestedAction: `Restore the ${root} source root.`,
        }),
      );
    }
  }
  for (const extension of repositoryConfig.extensions) {
    if (!config.extensions.includes(extension)) {
      violations.push(
        createViolation(
          "scan-scope-narrowed",
          "a source extension was removed",
          {
            path: extension,
            configPath,
            suggestedAction: `Restore the ${extension} source extension.`,
          },
        ),
      );
    }
  }

  const repositoryHotspots = new Map(
    repositoryConfig.hotspots.map((hotspot, repositoryConfigIndex) => [
      toPosixPath(hotspot.path),
      { hotspot, repositoryConfigIndex },
    ]),
  );
  const repositoryExclusionPaths = new Set(
    repositoryConfig.exclusions.map((exclusion) => toPosixPath(exclusion.path)),
  );
  const currentHotspots = new Map(
    config.hotspots.map((hotspot, configIndex) => [
      toPosixPath(hotspot.path),
      { hotspot, configIndex },
    ]),
  );
  const currentExclusions = new Map(
    config.exclusions.map((exclusion, configIndex) => [
      toPosixPath(exclusion.path),
      { configIndex },
    ]),
  );
  const filesByPath = new Map(
    candidateRepositoryFiles.map((file) => [file.path, file]),
  );

  for (const [hotspotPath, currentHotspot] of currentHotspots) {
    if (repositoryHotspots.has(hotspotPath)) continue;
    violations.push(
      createViolation(
        "new-hotspot-baseline",
        "a repository baseline cannot gain a permanent hotspot",
        {
          path: hotspotPath,
          configPath,
          configIndex: currentHotspot.configIndex,
          suggestedAction:
            "Keep the file below the global limit or use a precise time-limited exception.",
        },
      ),
    );
  }

  for (const [exclusionPath, currentExclusion] of currentExclusions) {
    if (repositoryExclusionPaths.has(exclusionPath)) continue;
    violations.push(
      createViolation(
        "new-permanent-exclusion",
        "a repository baseline cannot gain a permanent exclusion",
        {
          path: exclusionPath,
          configPath,
          configIndex: currentExclusion.configIndex,
          suggestedAction:
            "Remove the exclusion and use a precise time-limited exception when needed.",
        },
      ),
    );
  }

  for (const [
    repositoryConfigIndex,
    repositoryHotspot,
  ] of repositoryConfig.hotspots.entries()) {
    const hotspotPath = toPosixPath(repositoryHotspot.path);
    const currentHotspot = currentHotspots.get(hotspotPath);
    const currentExclusion = currentExclusions.get(hotspotPath);
    if (currentExclusion) {
      violations.push(
        createViolation(
          "hotspot-converted-to-exclusion",
          "an existing repository hotspot cannot become an exclusion",
          {
            path: hotspotPath,
            configPath,
            configIndex: currentExclusion.configIndex,
            repositoryConfigIndex,
            suggestedAction:
              "Restore the hotspot and ratchet its metrics downward.",
          },
        ),
      );
      continue;
    }
    if (!currentHotspot) {
      if (filesByPath.has(hotspotPath)) {
        violations.push(
          createViolation(
            "hotspot-baseline-removed",
            "a repository hotspot baseline cannot be removed while its file exists",
            {
              path: hotspotPath,
              configPath,
              repositoryConfigIndex,
              suggestedAction:
                "Restore the hotspot; remove it only when deleting the file.",
            },
          ),
        );
      }
      continue;
    }
    for (const metric of ARCHITECTURE_BUDGET_METRICS) {
      const baseline = repositoryHotspot.metrics[metric];
      const actual = currentHotspot.hotspot.metrics[metric];
      if (actual <= baseline) continue;
      violations.push(
        createViolation(
          "hotspot-baseline-raised",
          "a hotspot baseline cannot increase above the repository baseline",
          {
            path: hotspotPath,
            metric,
            baseline,
            actual,
            configPath,
            configIndex: currentHotspot.configIndex,
            repositoryConfigIndex,
            suggestedAction:
              "Restore or lower the baseline; use a precise exception for temporary code growth.",
          },
        ),
      );
    }
  }
  return violations;
}

export { validateRepositoryRatchet };
