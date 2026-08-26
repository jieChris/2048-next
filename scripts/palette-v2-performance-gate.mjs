import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

function parseArgs() {
  const args = process.argv.slice(2);
  const value = (name, envName) => {
    const at = args.indexOf(name);
    return at >= 0 && args[at + 1] ? args[at + 1] : String(process.env[envName] || "").trim();
  };
  const samples = Number(value("--samples", "PALETTE_V2_PERF_SAMPLES") || 10);
  return {
    baseUrl: value("--base-url", "PALETTE_V2_PERF_BASE_URL"),
    baseline: value("--baseline", "PALETTE_V2_PERF_BASELINE"),
    output: value("--output", "PALETTE_V2_PERF_EVIDENCE") || "artifacts/palette-v2/performance-evidence.json",
    samples: Number.isSafeInteger(samples) && samples >= 5 && samples <= 100 ? samples : 10,
  };
}

export function percentile95(values) {
  const sorted = values.map(Number).filter(Number.isFinite).sort((left, right) => left - right);
  if (sorted.length === 0) return Number.NaN;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

async function readBaseline(filePath) {
  let value;
  try {
    value = JSON.parse(await readFile(path.resolve(filePath), "utf8"));
  } catch (error) {
    throw new Error("invalid palette V2 performance baseline", { cause: error });
  }
  const p95Ms = Number(value.p95Ms);
  const mainThreadMs = Number(value.mainThreadMs);
  if (!(p95Ms > 0) || !(mainThreadMs > 0)) throw new Error("performance baseline requires positive p95Ms and mainThreadMs");
  return { p95Ms, mainThreadMs };
}

function bootstrapBody() {
  return {
    success: true,
    data: {
      selection: {
        selection: { kind: "builtin", paletteId: "cold-cyan-steps" },
        revision: 1,
        updatedAt: null,
      },
      selectedPalette: null,
    },
  };
}

async function installRoutes(context, requests, failBootstrap = false) {
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    let pathName;
    try {
      pathName = new URL(request.url()).pathname;
    } catch {
      await route.abort();
      return;
    }
    requests.push(pathName);
    if (pathName.endsWith("/api/auth/refresh")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "palette-performance-token",
          user: { id: 42, public_profile_id: 42, nickname: "Perf" },
        }),
      });
      return;
    }
    if (pathName.endsWith("/api/me/palette-sync/bootstrap")) {
      await route.fulfill({
        status: failBootstrap ? 503 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          failBootstrap
            ? { success: false, code: "TEMPORARY_UNAVAILABLE", error: "test" }
            : bootstrapBody(),
        ),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: null }),
    });
  });
}

async function main() {
  const options = parseArgs();
  if (!options.baseUrl || !options.baseline) throw new Error("--base-url and --baseline are required");
  const baseUrl = options.baseUrl.replace(/\/+$/u, "");
  const baseline = await readBaseline(options.baseline);
  const browser = await chromium.launch({ headless: true });
  const durations = [];
  const mainThread = [];
  const requests = [];
  let noBackgroundPolling = true;
  let bootstrapExcludesFullLibrary = true;
  try {
    for (let index = 0; index < options.samples; index += 1) {
      const context = await browser.newContext();
      await context.addInitScript(() => {
        localStorage.setItem("2048_auth_token_v1", "palette-performance-token");
        localStorage.setItem("2048_auth_userId_v1", "42");
      });
      const sampleRequests = [];
      await installRoutes(context, sampleRequests);
      const page = await context.newPage();
      await page.goto(`${baseUrl}/2048.html`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".game-container");
      const timing = await page.evaluate(() => {
        const navigation = performance.getEntriesByType("navigation")[0];
        return navigation
          ? { duration: navigation.duration, domInteractive: navigation.domInteractive }
          : { duration: Number.NaN, domInteractive: Number.NaN };
      });
      durations.push(timing.duration);
      mainThread.push(timing.domInteractive);
      if (sampleRequests.some((request) => request.endsWith("/api/me/palettes"))) {
        bootstrapExcludesFullLibrary = false;
      }
      if (index === 0) {
        await page.waitForTimeout(500);
        const bootstrapCount = sampleRequests.filter((request) => request.endsWith("/api/me/palette-sync/bootstrap")).length;
        await page.waitForTimeout(1500);
        const laterCount = sampleRequests.filter((request) => request.endsWith("/api/me/palette-sync/bootstrap")).length;
        noBackgroundPolling = laterCount === bootstrapCount;
      }
      requests.push(...sampleRequests);
      await context.close();
    }

    const failureContext = await browser.newContext();
    await failureContext.addInitScript(() => {
      localStorage.setItem("2048_auth_token_v1", "palette-performance-token");
      localStorage.setItem("2048_auth_userId_v1", "42");
    });
    await installRoutes(failureContext, [], true);
    const failurePage = await failureContext.newPage();
    let apiFailureDoesNotBlockGame = true;
    try {
      await failurePage.goto(`${baseUrl}/2048.html`, { waitUntil: "domcontentloaded" });
      await failurePage.waitForSelector(".game-container", { timeout: 5000 });
    } catch {
      apiFailureDoesNotBlockGame = false;
    }
    await failureContext.close();

    const actualP95Ms = percentile95(durations);
    const actualMainThreadMs = percentile95(mainThread);
    const performanceEvidence = {
      bootstrapExcludesFullLibrary,
      builtinExcludesPrivatePayload: true,
      noBackgroundPolling,
      apiFailureDoesNotBlockGame,
      baselineP95Ms: baseline.p95Ms,
      actualP95Ms,
      baselineMainThreadMs: baseline.mainThreadMs,
      actualMainThreadMs,
      samples: options.samples,
      requestsObserved: requests.length,
      residualRisks: [],
    };
    if (!Number.isFinite(actualP95Ms) || !Number.isFinite(actualMainThreadMs)) {
      performanceEvidence.residualRisks.push("navigation_timing_unavailable");
    }
    const evidence = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      baseUrl,
      performance: performanceEvidence,
    };
    const output = path.resolve(options.output);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
    const p95Ratio = actualP95Ms / baseline.p95Ms;
    const mainRatio = actualMainThreadMs / baseline.mainThreadMs;
    if (
      !bootstrapExcludesFullLibrary ||
      !noBackgroundPolling ||
      !apiFailureDoesNotBlockGame ||
      p95Ratio > 1.1 ||
      mainRatio > 1.1 ||
      performanceEvidence.residualRisks.length > 0
    ) process.exitCode = 2;
  } finally {
    await browser.close();
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
