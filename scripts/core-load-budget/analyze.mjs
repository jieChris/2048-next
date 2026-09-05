import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseBuiltHtml } from "./html-parser.mjs";
import { createResourceInspector } from "./resource-files.mjs";
import { collectResourceGraph } from "./resource-graph.mjs";
import {
  isSafeExactRelativePath,
  logicalAssetUrl,
  normalizeRequestUrl,
  splitQuery,
} from "./request-url.mjs";
import { createViolation } from "./shared.mjs";

const JS_PATTERN = /\.(?:js|mjs)$/iu;
const CSS_PATTERN = /\.css$/iu;
const IMAGE_PATTERN = /\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/iu;
const FONT_PATTERN = /\.(?:eot|otf|ttf|woff2?)$/iu;

function unique(values) {
  return [...new Set(values)];
}

function aggregateEncoding(records) {
  const encodings = [
    ...new Set(records.map((record) => record.encoding)),
  ].sort();
  if (encodings.length === 0) return "none";
  return encodings.length === 1 ? encodings[0] : `mixed:${encodings.join("+")}`;
}

function largestRecord(records, predicate) {
  return (
    records
      .filter((record) => predicate(record.diskPath))
      .sort((left, right) => right.bytes - left.bytes)[0] || null
  );
}

function sumBytes(records) {
  return records.reduce((sum, record) => sum + record.bytes, 0);
}

function metric(actual, encoding, requestUrl) {
  return { actual, encoding, path: requestUrl || null };
}

function deduplicateViolations(violations) {
  const seen = new Set();
  return violations.filter((violation) => {
    const key = JSON.stringify([
      violation.code,
      violation.page,
      violation.path,
      violation.metric,
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isFontPath(diskPath) {
  return (
    FONT_PATTERN.test(diskPath) ||
    /(?:font|clear-sans|clearsans)[^/]*\.svg$/iu.test(diskPath)
  );
}

function isImagePath(diskPath) {
  return IMAGE_PATTERN.test(diskPath) && !isFontPath(diskPath);
}

async function inspectRequests(inspector, requestUrls, page, violations) {
  const records = [];
  for (const requestUrl of unique(requestUrls)) {
    try {
      const record = await inspector.inspect(requestUrl);
      records.push(record);
      if (record.missing) {
        violations.push(
          createViolation(
            "missing-critical-resource",
            "discovered resource is missing",
            {
              page,
              path: requestUrl,
              suggestedAction:
                "Restore the referenced resource in the exact fresh dist.",
            },
          ),
        );
      }
      violations.push(
        ...record.violations.map((violation) => ({ ...violation, page })),
      );
    } catch (error) {
      violations.push(
        createViolation("unsafe-resource-path", error.message, {
          page,
          path: requestUrl,
          suggestedAction:
            "Keep raw resources and compression sidecars inside dist and outside dist.backup-*.",
        }),
      );
    }
  }
  return records;
}

async function analyzeCoreLoadDist({ distRoot, pageConfigs, compression }) {
  const inspector = await createResourceInspector(distRoot, compression);
  const pages = {};
  const discoveryViolations = [];
  for (const [page, pageConfig] of Object.entries(pageConfigs || {})) {
    if (!isSafeExactRelativePath(pageConfig.html)) {
      throw new Error(`page ${page} HTML path must be safe and exact`);
    }
    const htmlRequest = normalizeRequestUrl(pageConfig.html).requestUrl;
    const htmlResource = await inspector.inspect(htmlRequest);
    if (htmlResource.missing) {
      discoveryViolations.push(
        createViolation(
          "missing-page-html",
          "configured page HTML is missing",
          {
            page,
            path: pageConfig.html,
            suggestedAction: "Restore the required core page in dist.",
          },
        ),
      );
      continue;
    }
    const html = await readFile(
      path.join(inspector.distRoot, splitQuery(htmlRequest).diskPart),
      "utf8",
    );
    const parsed = parseBuiltHtml(html, htmlRequest);
    discoveryViolations.push(
      ...parsed.violations.map((violation) => ({ ...violation, page })),
      ...htmlResource.violations.map((violation) => ({ ...violation, page })),
    );
    if (parsed.entries.length !== 1) {
      discoveryViolations.push(
        createViolation(
          "invalid-module-entry",
          "core page must contain exactly one module entry",
          {
            page,
            path: pageConfig.html,
            actual: parsed.entries.length,
            suggestedAction:
              "Restore exactly one local type=module script in built HTML.",
          },
        ),
      );
    }
    const directRequestUrls = parsed.directResources.map(
      (resource) => resource.requestUrl,
    );
    const graph = await collectResourceGraph(
      inspector.distRoot,
      parsed.entries,
      directRequestUrls,
    );
    discoveryViolations.push(
      ...graph.violations.map((violation) => ({ ...violation, page })),
    );
    const allRequestUrls = unique([
      htmlRequest,
      ...directRequestUrls,
      ...graph.startupResources,
      ...graph.criticalCssResources,
      ...graph.deferredResources,
    ]);
    const allRecords = await inspectRequests(
      inspector,
      allRequestUrls,
      page,
      discoveryViolations,
    );
    const recordsByUrl = new Map(
      allRecords.map((record) => [record.requestUrl, record]),
    );
    const recordsFor = (requestUrls) =>
      unique(requestUrls)
        .map((requestUrl) => recordsByUrl.get(requestUrl))
        .filter(Boolean);
    const htmlRecord = recordsByUrl.get(htmlRequest) || htmlResource;
    const directRecords = recordsFor(directRequestUrls);
    const startupRecords = recordsFor(graph.startupResources);
    const criticalCssRecords = recordsFor(graph.criticalCssResources);
    const deferredRecords = recordsFor(graph.deferredResources);
    const directCriticalRecords = recordsFor([
      htmlRequest,
      ...directRequestUrls,
    ]);
    const criticalRecords = recordsFor([
      htmlRequest,
      ...directRequestUrls,
      ...graph.startupResources,
      ...graph.criticalCssResources,
    ]);
    const discoveredRecords = recordsFor(allRequestUrls);
    const largestJs = largestRecord(criticalRecords, (diskPath) =>
      JS_PATTERN.test(diskPath),
    );
    const largestCss = largestRecord(criticalRecords, (diskPath) =>
      CSS_PATTERN.test(diskPath),
    );
    const largestImage = largestRecord(criticalRecords, isImagePath);
    const largestFont = largestRecord(criticalRecords, isFontPath);
    pages[page] = {
      htmlPath: pageConfig.html,
      entryPath: parsed.entries[0] || null,
      directCriticalPaths: [htmlRequest, ...directRequestUrls].sort(),
      startupStaticPaths: graph.startupResources,
      criticalCssDependencyPaths: graph.criticalCssResources,
      deferredDynamicPaths: graph.deferredResources,
      criticalPreloads: parsed.preloads,
      embeddedUrlPolicy: "data-and-fragment-excluded",
      metrics: {
        htmlBytes: metric(htmlRecord.bytes, htmlRecord.encoding, htmlRequest),
        directResourceBytes: metric(
          sumBytes(directRecords),
          aggregateEncoding(directRecords),
          pageConfig.html,
        ),
        directResourceRequests: metric(
          directRecords.length,
          "requests",
          pageConfig.html,
        ),
        directCriticalBytes: metric(
          sumBytes(directCriticalRecords),
          aggregateEncoding(directCriticalRecords),
          pageConfig.html,
        ),
        directCriticalRequests: metric(
          directCriticalRecords.length,
          "requests",
          pageConfig.html,
        ),
        criticalLoadBytes: metric(
          sumBytes(criticalRecords),
          aggregateEncoding(criticalRecords),
          pageConfig.html,
        ),
        criticalLoadRequests: metric(
          criticalRecords.length,
          "requests",
          pageConfig.html,
        ),
        startupStaticBytes: metric(
          sumBytes(startupRecords),
          aggregateEncoding(startupRecords),
          parsed.entries[0],
        ),
        startupStaticRequests: metric(
          startupRecords.length,
          "requests",
          parsed.entries[0],
        ),
        criticalCssDependencyBytes: metric(
          sumBytes(criticalCssRecords),
          aggregateEncoding(criticalCssRecords),
          pageConfig.html,
        ),
        criticalCssDependencyRequests: metric(
          criticalCssRecords.length,
          "requests",
          pageConfig.html,
        ),
        deferredDynamicBytes: metric(
          sumBytes(deferredRecords),
          aggregateEncoding(deferredRecords),
          parsed.entries[0],
        ),
        deferredDynamicRequests: metric(
          deferredRecords.length,
          "requests",
          parsed.entries[0],
        ),
        largestCriticalJsBytes: metric(
          largestJs?.bytes || 0,
          largestJs?.encoding || "none",
          largestJs?.requestUrl,
        ),
        largestCriticalCssBytes: metric(
          largestCss?.bytes || 0,
          largestCss?.encoding || "none",
          largestCss?.requestUrl,
        ),
        largestCriticalImageBytes: metric(
          largestImage?.bytes || 0,
          largestImage?.encoding || "none",
          largestImage?.requestUrl,
        ),
        largestCriticalFontBytes: metric(
          largestFont?.bytes || 0,
          largestFont?.encoding || "none",
          largestFont?.requestUrl,
        ),
        criticalPreloadCount: metric(
          parsed.preloads.length,
          "requests",
          pageConfig.html,
        ),
        discoveredMissingBrotliSidecars: metric(
          discoveredRecords.filter((record) => record.missingBrotli).length,
          "count",
          pageConfig.html,
        ),
        discoveredMissingGzipSidecars: metric(
          discoveredRecords.filter((record) => record.missingGzip).length,
          "count",
          pageConfig.html,
        ),
      },
    };
  }
  return {
    pages,
    discoveryViolations: deduplicateViolations(discoveryViolations),
  };
}

async function analyzeLegacyBundles(
  distRoot,
  legacyBundles,
  compression = { preferred: "br", fallback: "gzip", requireBrotli: true },
) {
  const inspector = await createResourceInspector(distRoot, compression);
  const bundles = {};
  const violations = [];
  for (const [name, config] of Object.entries(legacyBundles || {})) {
    if (!isSafeExactRelativePath(config.path)) {
      throw new Error(`legacy bundle ${name} path must be safe and exact`);
    }
    const requestUrl = normalizeRequestUrl(config.path).requestUrl;
    let record;
    try {
      record = await inspector.inspect(requestUrl);
    } catch (error) {
      violations.push(
        createViolation("unsafe-resource-path", error.message, {
          page: name,
          path: config.path,
        }),
      );
      continue;
    }
    if (record.missing) {
      violations.push(
        createViolation("missing-legacy-bundle", "legacy bundle is missing", {
          page: name,
          path: config.path,
        }),
      );
      continue;
    }
    violations.push(
      ...record.violations.map((violation) => ({ ...violation, page: name })),
    );
    bundles[name] = {
      path: config.path,
      metrics: {
        rawBytes: metric(record.rawBytes, "raw", requestUrl),
        brotliBytes: metric(
          record.brotliBytes,
          record.brotliBytes ? "br" : "missing",
          requestUrl,
        ),
        gzipBytes: metric(
          record.gzipBytes,
          record.gzipBytes ? "gzip" : "missing",
          requestUrl,
        ),
      },
    };
  }
  return { bundles, violations: deduplicateViolations(violations) };
}

export { analyzeCoreLoadDist, analyzeLegacyBundles, logicalAssetUrl };
