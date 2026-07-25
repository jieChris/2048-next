import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const DIST_ROOT = path.resolve("dist-app");
const BUDGETS = {
  initialJsBytes: 320 * 1024,
  initialJsGzipBytes: 90 * 1024,
  initialCssBytes: 45 * 1024,
  initialCssGzipBytes: 12 * 1024,
  distBytes: 5 * 1024 * 1024,
  bgmBytes: 4 * 1024 * 1024,
  debugApkBytes: 16 * 1024 * 1024,
};
const REQUIRED_LAZY_CHUNKS = [
  "mobile-cloud-data-",
  "replay-timeline-",
  "replay-share-",
  "diagnostic-export-",
];

function fail(message) {
  throw new Error(`[mobile-performance-budget] ${message}`);
}

async function walkFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  }
  await visit(root);
  return files;
}

function entryAsset(html, expression, label) {
  const value = expression.exec(html)?.[1];
  if (!value) fail(`missing ${label} entry asset`);
  return path.resolve(DIST_ROOT, value.replace(/^\.\//u, ""));
}

async function sizeWithGzip(file) {
  const bytes = await readFile(file);
  return { bytes: bytes.byteLength, gzipBytes: gzipSync(bytes).byteLength };
}

function assertBudget(value, limit, label) {
  if (value > limit) fail(`${label} exceeds budget: ${value}/${limit}`);
}

export async function auditMobilePerformanceBudget(options = {}) {
  const html = await readFile(path.join(DIST_ROOT, "index.html"), "utf8");
  const initialJs = await sizeWithGzip(
    entryAsset(html, /<script[^>]+src="([^"]+\.js)"/u, "JavaScript"),
  );
  const initialCss = await sizeWithGzip(
    entryAsset(html, /<link[^>]+href="([^"]+\.css)"/u, "CSS"),
  );
  const files = await walkFiles(DIST_ROOT);
  const lazyChunks = Object.fromEntries(
    REQUIRED_LAZY_CHUNKS.map((prefix) => {
      const matches = files.filter((file) =>
        path.basename(file).startsWith(prefix) && file.endsWith(".js")
      );
      if (matches.length !== 1) {
        fail(`expected one ${prefix} lazy chunk, found ${matches.length}`);
      }
      const filename = path.basename(matches[0]);
      if (html.includes(filename)) fail(`${prefix} lazy chunk leaked into the first-load HTML`);
      return [prefix.slice(0, -1), filename];
    }),
  );
  const hasDebugSampler = (
    await Promise.all(
      files
        .filter((candidate) => candidate.endsWith(".js"))
        .map(async (file) =>
          (await readFile(file, "utf8")).includes("__2048NextStartFrameSample"),
        ),
    )
  ).some(Boolean);
  if (options.expectDebugSampler && !hasDebugSampler) {
    fail("debug RAF sampler is missing from the Android debug build");
  }
  if (!options.expectDebugSampler && hasDebugSampler) {
    fail("debug RAF sampler leaked into the production build");
  }
  const distBytes = (
    await Promise.all(files.map(async (file) => (await stat(file)).size))
  ).reduce((sum, bytes) => sum + bytes, 0);
  const bgmFiles = files.filter((file) => file.endsWith(".m4a"));
  if (bgmFiles.length !== 1) fail(`expected exactly one M4A, found ${bgmFiles.length}`);
  const bgmBytes = (await stat(bgmFiles[0])).size;
  if (html.includes(path.basename(bgmFiles[0]))) fail("BGM is referenced by the first-load HTML");

  assertBudget(initialJs.bytes, BUDGETS.initialJsBytes, "initial JS");
  assertBudget(initialJs.gzipBytes, BUDGETS.initialJsGzipBytes, "initial JS gzip");
  assertBudget(initialCss.bytes, BUDGETS.initialCssBytes, "initial CSS");
  assertBudget(initialCss.gzipBytes, BUDGETS.initialCssGzipBytes, "initial CSS gzip");
  assertBudget(distBytes, BUDGETS.distBytes, "dist-app");
  assertBudget(bgmBytes, BUDGETS.bgmBytes, "BGM");

  let debugApkBytes = null;
  if (options.debugApk) {
    debugApkBytes = (await stat(path.resolve(options.debugApk))).size;
    assertBudget(debugApkBytes, BUDGETS.debugApkBytes, "debug APK");
  }
  const report = { success: true, initialJs, initialCss, distBytes, bgmBytes, debugApkBytes, hasDebugSampler, lazyChunks, budgets: BUDGETS };
  console.log(JSON.stringify(report));
  return report;
}

const debugApkArg = process.argv.find((arg) => arg.startsWith("--debug-apk="));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  auditMobilePerformanceBudget({
    debugApk: debugApkArg?.slice("--debug-apk=".length),
    expectDebugSampler: process.argv.includes("--expect-debug-sampler"),
  }).catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}
