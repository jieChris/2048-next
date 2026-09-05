import { readFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

import {
  ACTIVE_RANKED_SESSION_FIXTURE,
  MODE_KEY,
  PREFETCH_RANKED_SESSION_FIXTURE,
  createDeterministicApiAudit,
  deterministicApiPayload,
  installDeterministicContext as installDeterministicApiContext,
} from "./browser-api.mjs";
import {
  attachPageErrors,
  collectLoadMetrics,
  createNetworkCollector,
  installPerformanceObservers,
} from "./browser-metrics.mjs";
import {
  validateRankedFixtureProof,
  validateReplayStepProof,
  validateRestoreProof,
} from "./browser-proofs.mjs";
import { withCorePerformanceContext } from "./context.mjs";

const PLAY_PATH = `/play.html?mode_key=${MODE_KEY}`;
const REPLAY_FIXTURE_PATH =
  "tests/fixtures/replays/legacy-real-v9-text-replay.txt";

async function installDeterministicContext(context, options = {}) {
  const audit = await installDeterministicApiContext(context, options);
  await installPerformanceObservers(context);
  return audit;
}

async function configureCdp(page, profile) {
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  await session.send("Emulation.setCPUThrottlingRate", {
    rate: profile.cpuThrottleRate,
  });
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: profile.network.latencyMs,
    downloadThroughput: profile.network.downloadBytesPerSecond,
    uploadThroughput: profile.network.uploadBytesPerSecond,
    connectionType: "cellular4g",
  });
  return session;
}

function waitForActiveRescueResponse(page, baseUrl) {
  let expectedOrigin;
  try {
    expectedOrigin = new URL(baseUrl).origin;
  } catch (error) {
    throw new Error("active rescue wait requires baseUrl", { cause: error });
  }
  const pending = page.waitForResponse(
    (response) => {
      try {
        const parsed = new URL(response.url());
        return (
          parsed.origin === expectedOrigin &&
          parsed.pathname === "/api/rescue-offers/active" &&
          response.request().method() === "GET"
        );
      } catch {
        return false;
      }
    },
    { timeout: 5_000 },
  );
  pending.catch(() => {});
  return pending;
}

async function requireActiveRescueResponse(pending) {
  if (!pending) return;
  const response = await pending;
  if (response.status() !== 200) {
    throw new Error(
      `active rescue bootstrap failed with status ${response.status()}`,
    );
  }
}

async function navigateAndMeasure(
  page,
  pathValue,
  readiness,
  network,
  baseUrl,
) {
  const activeRescueResponse =
    pathValue === PLAY_PATH ? waitForActiveRescueResponse(page, baseUrl) : null;
  network.start();
  try {
    const response = await page.goto(pathValue, {
      waitUntil: "domcontentloaded",
    });
    if (!response?.ok()) {
      throw new Error(
        `navigation failed: ${pathValue} status=${response?.status()}`,
      );
    }
    try {
      await page.waitForFunction(readiness, null, { timeout: 30_000 });
    } catch (error) {
      const readinessState = await page.evaluate(() => {
        const manager = window.game_manager;
        return {
          url: window.location.href,
          bodyModeId: document.body?.getAttribute("data-mode-id") || null,
          documentReadyState: document.readyState,
          hasManager: Boolean(manager),
          hasMove: typeof manager?.move === "function",
          hasFinalBoard: typeof manager?.getFinalBoardMatrix === "function",
          rankedRestorePending: manager?.rankCheckpointRestorePending === true,
          needsRankedRestore: manager?.needsRankedCheckpointRestore === true,
          scriptCount: document.scripts.length,
        };
      });
      throw new Error(
        `readiness timed out for ${pathValue}; state=${JSON.stringify(readinessState)}`,
        { cause: error },
      );
    }
    const readyMs = await page.evaluate(() => performance.now());
    await requireActiveRescueResponse(activeRescueResponse);
    return await collectLoadMetrics(page, readyMs, network);
  } finally {
    network.stop();
  }
}

function homeReady() {
  const manager = window.game_manager;
  return Boolean(
    manager &&
      typeof manager.move === "function" &&
      typeof manager.getFinalBoardMatrix === "function",
  );
}

function playReady() {
  const manager = window.game_manager;
  return Boolean(
    manager &&
      typeof manager.move === "function" &&
      typeof manager.getFinalBoardMatrix === "function" &&
      document.body.getAttribute("data-mode-id") ===
        "standard_4x4_pow2_no_undo",
  );
}

function replayReady() {
  const manager = window.game_manager;
  return Boolean(
    manager &&
      typeof manager.import === "function" &&
      typeof manager.step === "function",
  );
}

async function collectRankedFixtureProof(page) {
  const result = await page.evaluate(
    async ({ modeKey }) => {
      const runtime = window.RankedSessionRuntime;
      if (runtime?.ensurePrefetch) await runtime.ensurePrefetch(modeKey);
      const parse = (key) => {
        try {
          return JSON.parse(localStorage.getItem(key) || "null");
        } catch {
          return null;
        }
      };
      const manager = window.game_manager;
      return {
        manager: manager
          ? {
              challengeId: String(manager.challengeId || ""),
              initialSeed: Number(manager.initialSeed),
              rankedSessionToken: String(manager.rankedSessionToken || ""),
              spawnSequenceVersion: Number(manager.spawnSequenceVersion),
            }
          : null,
        active: parse(`ranked_session_active:v1:${modeKey}`),
        prefetched: parse(`ranked_session_prefetch:v1:${modeKey}`),
        prefetchFailureReason: String(runtime?.getLastFailureReason?.() || ""),
      };
    },
    { modeKey: MODE_KEY },
  );
  validateRankedFixtureProof({
    ...result,
    activeFixture: ACTIVE_RANKED_SESSION_FIXTURE,
    prefetchFixture: PREFETCH_RANKED_SESSION_FIXTURE,
  });
  return [
    "rankedManagerFixture=matched-v2",
    "rankedPrefetchFixture=accepted-v2",
  ];
}

async function runLoadScenario(page, scenario, network, baseUrl) {
  if (scenario === "homeCold") {
    return {
      metrics: await navigateAndMeasure(
        page,
        "/2048.html",
        homeReady,
        network,
        baseUrl,
      ),
      proofs: ["window.game_manager", "getFinalBoardMatrix"],
    };
  }
  const metrics = await navigateAndMeasure(
    page,
    PLAY_PATH,
    playReady,
    network,
    baseUrl,
  );
  return {
    metrics,
    proofs: [
      "window.game_manager",
      `body[data-mode-id=${MODE_KEY}]`,
      ...(await collectRankedFixtureProof(page)),
    ],
  };
}

async function runMoveScenario(page, network, baseUrl) {
  await navigateAndMeasure(page, PLAY_PATH, playReady, network, baseUrl);
  const result = await page.evaluate(async () => {
    const manager = window.game_manager;
    const before = Array.isArray(manager.moveHistory)
      ? manager.moveHistory.length
      : 0;
    const started = performance.now();
    let moved = false;
    for (const direction of [0, 1, 2, 3]) {
      manager.move(direction);
      if (
        Array.isArray(manager.moveHistory) &&
        manager.moveHistory.length > before
      ) {
        moved = true;
        break;
      }
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return {
      moved,
      moveLatencyMs: performance.now() - started,
      historyLength: Array.isArray(manager.moveHistory)
        ? manager.moveHistory.length
        : 0,
    };
  });
  if (!result.moved || result.historyLength <= 0) {
    throw new Error("valid move interaction did not change move history");
  }
  return {
    metrics: { moveLatencyMs: result.moveLatencyMs },
    proofs: [
      `moveHistoryLength=${result.historyLength}`,
      ...(await collectRankedFixtureProof(page)),
    ],
  };
}

async function runRestoreScenario(page, session, network, baseUrl) {
  await navigateAndMeasure(page, PLAY_PATH, playReady, network, baseUrl);
  const saved = await page.evaluate(() => {
    const manager = window.game_manager;
    for (const direction of [0, 1, 2, 3]) {
      const before = Array.isArray(manager.moveHistory)
        ? manager.moveHistory.length
        : 0;
      manager.move(direction);
      if (
        Array.isArray(manager.moveHistory) &&
        manager.moveHistory.length > before
      )
        break;
    }
    window.saveGameState(manager, { force: true, forceFull: true });
    return {
      board: manager.getFinalBoardMatrix(),
      score: Number(manager.score || 0),
      moveHistory: structuredClone(manager.moveHistory || []),
      saved: Boolean(
        localStorage.getItem(
          "savedGameStateByMode:v1:standard_4x4_pow2_no_undo",
        ),
      ),
    };
  });
  if (!saved.saved || saved.moveHistory.length <= 0) {
    throw new Error("warm restore preparation did not persist a moved game");
  }
  await session.send("Network.setCacheDisabled", { cacheDisabled: false });
  network.start();
  const activeRescueResponse = waitForActiveRescueResponse(page, baseUrl);
  try {
    const startedAt = Date.now();
    const response = await page.reload({ waitUntil: "domcontentloaded" });
    if (!response?.ok()) throw new Error("warm restore reload failed");
    await page.waitForFunction(
      (expected) => {
        const manager = window.game_manager;
        return Boolean(
          manager &&
            manager.rankCheckpointRestorePending !== true &&
            manager.needsRankedCheckpointRestore !== true &&
            typeof manager.getFinalBoardMatrix === "function" &&
            JSON.stringify(manager.getFinalBoardMatrix()) ===
              JSON.stringify(expected.board) &&
            Number(manager.score || 0) === expected.score &&
            JSON.stringify(manager.moveHistory || []) ===
              JSON.stringify(expected.moveHistory),
        );
      },
      saved,
      { timeout: 30_000 },
    );
    const actual = await page.evaluate(() => ({
      board: window.game_manager.getFinalBoardMatrix(),
      score: Number(window.game_manager.score || 0),
      moveHistory: structuredClone(window.game_manager.moveHistory || []),
    }));
    validateRestoreProof(saved, actual);
    const restoreReadyLatencyMs = Date.now() - startedAt;
    await requireActiveRescueResponse(activeRescueResponse);
    const loadMetrics = await collectLoadMetrics(
      page,
      restoreReadyLatencyMs,
      network,
    );
    delete loadMetrics.readyMs;
    return {
      metrics: { ...loadMetrics, restoreReadyLatencyMs },
      proofs: [
        "savedGameStateByMode present",
        `restoredMoveHistoryExact=${saved.moveHistory.length}`,
        "restored board score and move history equal",
        ...(await collectRankedFixtureProof(page)),
      ],
    };
  } finally {
    network.stop();
  }
}

async function runReplayScenario(page, network, replayText, baseUrl) {
  const loadMetrics = await navigateAndMeasure(
    page,
    "/replay.html",
    replayReady,
    network,
    baseUrl,
  );
  const result = await page.evaluate(async (payload) => {
    const manager = window.game_manager;
    const importStarted = performance.now();
    const imported = manager.import(payload);
    manager.pause();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const replayImportLatencyMs = performance.now() - importStarted;
    const total = Array.isArray(manager.replayMoves)
      ? manager.replayMoves.length
      : 0;
    const beforeIndex = Number(manager.replayIndex || 0);
    const beforeBoard = manager.getFinalBoardMatrix();
    const firstAction = structuredClone(manager.replayMoves?.[0] ?? null);
    let executedAction = null;
    const originalMove = manager.move;
    manager.move = function (direction, ...args) {
      if (executedAction === null) executedAction = structuredClone(direction);
      return originalMove.call(this, direction, ...args);
    };
    const stepStarted = performance.now();
    try {
      manager.step(1);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    } finally {
      manager.move = originalMove;
    }
    return {
      imported,
      total,
      beforeIndex,
      afterIndex: Number(manager.replayIndex || 0),
      beforeBoard,
      afterBoard: manager.getFinalBoardMatrix(),
      firstAction,
      executedAction,
      replayImportLatencyMs,
      replayStepLatencyMs: performance.now() - stepStarted,
    };
  }, replayText);
  validateReplayStepProof(result);
  return {
    metrics: {
      ...loadMetrics,
      replayImportLatencyMs: result.replayImportLatencyMs,
      replayStepLatencyMs: result.replayStepLatencyMs,
    },
    proofs: [
      `replayMovesLength=${result.total}`,
      "replayIndex=0->1",
      "replayFirstActionExecuted",
      "replayBoardChanged",
    ],
  };
}

async function runOneSample({
  browser,
  baseUrl,
  profile,
  scenario,
  iteration,
  replayText,
  signal,
}) {
  if (signal?.aborted) throw new Error("core performance sampling aborted");
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: profile.viewport,
    locale: profile.locale,
    timezoneId: profile.timezoneId,
    colorScheme: profile.colorScheme,
    reducedMotion: profile.reducedMotion,
    serviceWorkers: "block",
  });
  try {
    const apiAudit = createDeterministicApiAudit();
    await installDeterministicContext(context, { audit: apiAudit, baseUrl });
    const page = await context.newPage();
    const errors = attachPageErrors(page, baseUrl);
    const session = await configureCdp(page, profile);
    const network = createNetworkCollector(session, baseUrl);
    let result;
    if (scenario === "homeCold" || scenario === "playCold")
      result = await runLoadScenario(page, scenario, network, baseUrl);
    else if (scenario === "moveInteraction")
      result = await runMoveScenario(page, network, baseUrl);
    else if (scenario === "warmSaveRestore")
      result = await runRestoreScenario(page, session, network, baseUrl);
    else if (scenario === "replayColdImportStep")
      result = await runReplayScenario(page, network, replayText, baseUrl);
    else throw new Error(`unknown performance scenario: ${scenario}`);
    errors.push(...apiAudit.errors.map((error) => `api-contract: ${error}`));
    if (errors.length)
      throw new Error(`${scenario} browser errors: ${errors.join(" | ")}`);
    return {
      scenario,
      iteration,
      cache: scenario === "warmSaveRestore" ? "warm" : "cold",
      metrics: result.metrics,
      proofs: result.proofs,
      errors,
      apiAudit: apiAudit.requests,
    };
  } finally {
    await context.close().catch(() => {});
  }
}

async function runBrowserMeasurements({
  projectRoot,
  baseUrl,
  profile,
  sampleCount,
  scenarioNames,
  browserLauncher = chromium,
  signal = null,
  lifecycle = null,
}) {
  const replayText = (
    await readFile(path.join(projectRoot, REPLAY_FIXTURE_PATH), "utf8")
  ).trim();
  const browser = await browserLauncher.launch({ headless: true });
  const unregister = lifecycle?.register?.(() => browser.close());
  const samples = [];
  try {
    for (const scenario of scenarioNames) {
      for (let iteration = 1; iteration <= sampleCount; iteration += 1) {
        try {
          samples.push(
            await runOneSample({
              browser,
              baseUrl,
              profile,
              scenario,
              iteration,
              replayText,
              signal,
            }),
          );
        } catch (error) {
          throw withCorePerformanceContext(
            new Error(
              `${scenario} sample ${iteration} failed: ${error instanceof Error ? error.message : String(error)}`,
              { cause: error },
            ),
            {
              stage: "browser-sampling",
              browserVersion: browser.version(),
              samples,
              scenario,
              iteration,
            },
          );
        }
      }
    }
    return { browserVersion: browser.version(), samples };
  } finally {
    unregister?.();
    await browser.close().catch(() => {});
  }
}

export {
  ACTIVE_RANKED_SESSION_FIXTURE,
  MODE_KEY,
  PLAY_PATH,
  PREFETCH_RANKED_SESSION_FIXTURE,
  REPLAY_FIXTURE_PATH,
  deterministicApiPayload,
  installDeterministicContext,
  runBrowserMeasurements,
  waitForActiveRescueResponse,
};
