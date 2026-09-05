import { readValidatedResource } from "./resource-files.mjs";
import { normalizeRequestUrl, splitQuery } from "./request-url.mjs";
import { createViolation } from "./shared.mjs";
import { parseCssDependencies } from "./css-parser.mjs";
import { parseJavaScriptModule } from "./javascript-parser.mjs";

const JAVASCRIPT_PATTERN = /\.(?:js|mjs)$/iu;
const CSS_PATTERN = /\.css$/iu;

function normalizeDependency(rawValue, baseRequestUrl, violations) {
  try {
    const normalized = normalizeRequestUrl(rawValue, baseRequestUrl);
    if (normalized.kind === "request") return normalized.requestUrl;
    return null;
  } catch (error) {
    violations.push(
      createViolation("unsafe-resource-url", error.message, {
        path: rawValue,
        suggestedAction: "Use a literal safe local dependency URL.",
      }),
    );
    return null;
  }
}

async function readGraphText(distRoot, requestUrl, violations) {
  try {
    const resource = await readValidatedResource(
      distRoot,
      splitQuery(requestUrl).diskPart,
    );
    return resource ? resource.raw.toString("utf8") : null;
  } catch (error) {
    violations.push(
      createViolation("unsafe-resource-path", error.message, {
        path: requestUrl,
        suggestedAction:
          "Keep every graph resource and symlink target inside dist and outside dist.backup-*.",
      }),
    );
    return null;
  }
}

async function parseGraphNode(distRoot, requestUrl, violations) {
  const diskPath = splitQuery(requestUrl).diskPart;
  if (!JAVASCRIPT_PATTERN.test(diskPath) && !CSS_PATTERN.test(diskPath)) {
    return { staticDependencies: [], dynamicDependencies: [] };
  }
  const content = await readGraphText(distRoot, requestUrl, violations);
  if (content === null)
    return { staticDependencies: [], dynamicDependencies: [] };
  if (JAVASCRIPT_PATTERN.test(diskPath)) {
    const parsed = parseJavaScriptModule(content, requestUrl);
    violations.push(...parsed.violations);
    return {
      staticDependencies: parsed.staticImports
        .map((value) => normalizeDependency(value, requestUrl, violations))
        .filter(Boolean),
      dynamicDependencies: [
        ...parsed.dynamicImports,
        ...parsed.viteDependencies,
      ]
        .map((value) => normalizeDependency(value, requestUrl, violations))
        .filter(Boolean),
    };
  }
  const parsed = parseCssDependencies(content, requestUrl);
  violations.push(...parsed.violations);
  return {
    staticDependencies: [...parsed.imports, ...parsed.assets]
      .map((value) => normalizeDependency(value, requestUrl, violations))
      .filter(Boolean),
    dynamicDependencies: [],
  };
}

async function expandStaticClosure(distRoot, roots, excluded = new Set()) {
  const visited = new Set();
  const dynamicRoots = new Set();
  const violations = [];
  const queue = [...roots];
  while (queue.length) {
    const requestUrl = queue.shift();
    if (!requestUrl || visited.has(requestUrl) || excluded.has(requestUrl))
      continue;
    visited.add(requestUrl);
    const parsed = await parseGraphNode(distRoot, requestUrl, violations);
    queue.push(...parsed.staticDependencies);
    for (const dependency of parsed.dynamicDependencies)
      dynamicRoots.add(dependency);
  }
  return {
    resources: [...visited].sort(),
    dynamicRoots: [...dynamicRoots].sort(),
    violations,
  };
}

async function collectResourceGraph(
  distRoot,
  entryRequestUrls,
  directRequestUrls,
) {
  const startup = await expandStaticClosure(distRoot, entryRequestUrls);
  const directCssRoots = directRequestUrls.filter((requestUrl) =>
    CSS_PATTERN.test(splitQuery(requestUrl).diskPart),
  );
  const criticalCss = await expandStaticClosure(
    distRoot,
    directCssRoots,
    new Set(startup.resources),
  );
  const deferredRoots = [
    ...new Set([...startup.dynamicRoots, ...criticalCss.dynamicRoots]),
  ];
  const deferred = await expandStaticClosure(
    distRoot,
    deferredRoots,
    new Set([...startup.resources, ...criticalCss.resources]),
  );
  let pendingDynamic = deferred.dynamicRoots;
  const deferredResources = new Set(deferred.resources);
  const deferredViolations = [...deferred.violations];
  while (pendingDynamic.length) {
    const next = await expandStaticClosure(
      distRoot,
      pendingDynamic,
      new Set([
        ...startup.resources,
        ...criticalCss.resources,
        ...deferredResources,
      ]),
    );
    for (const item of next.resources) deferredResources.add(item);
    deferredViolations.push(...next.violations);
    pendingDynamic = next.dynamicRoots.filter(
      (item) => !deferredResources.has(item),
    );
  }
  return {
    startupResources: startup.resources,
    criticalCssResources: criticalCss.resources,
    deferredResources: [...deferredResources].sort(),
    violations: [
      ...startup.violations,
      ...criticalCss.violations,
      ...deferredViolations,
    ],
  };
}

export { collectResourceGraph, expandStaticClosure };
