import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const STABLE_SPARSE_CHECKPOINT_REPLAY_TEXT = readFileSync(
  "tests/fixtures/replays/legacy-real-v9-text-replay.txt",
  "utf8"
).trim();

async function importReplayFileAndConfirm(
  page: Page,
  filePath: string,
  expectedBaseName: string
) {
  const importedFileName = page.locator("#replay-imported-file-name");

  await expect(importedFileName).toBeHidden();

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.locator("#import-replay-file-btn").click()
  ]);
  await fileChooser.setFiles(filePath);

  await page.waitForFunction(() => {
    const manager = (window as any).game_manager;
    return Array.isArray(manager?.replayMoves) && manager.replayMoves.length > 0;
  });
  await expect(importedFileName).toHaveText(expectedBaseName);
}

async function importReplayFileByDropAndConfirm(
  page: Page,
  fileName: string,
  fileContents: string,
  expectedBaseName: string
) {
  const dropOverlay = page.locator("#replay-file-drop-overlay");
  const importedFileName = page.locator("#replay-imported-file-name");

  await expect(importedFileName).toBeHidden();

  const dataTransfer = await page.evaluateHandle(
    ({ nextFileName, nextFileContents }) => {
      const dt = new DataTransfer();
      dt.items.add(new File([nextFileContents], nextFileName, { type: "text/plain" }));
      return dt;
    },
    { nextFileName: fileName, nextFileContents: fileContents }
  );

  await page.dispatchEvent("body", "dragenter", { dataTransfer });
  await expect(dropOverlay).toBeVisible();
  await page.dispatchEvent("body", "dragover", { dataTransfer });
  await page.dispatchEvent("body", "drop", { dataTransfer });
  await dataTransfer.dispose();

  await expect(dropOverlay).toBeHidden();
  await page.waitForFunction(() => {
    const manager = (window as any).game_manager;
    return Array.isArray(manager?.replayMoves) && manager.replayMoves.length > 0;
  });
  await expect(importedFileName).toHaveText(expectedBaseName);
}

test.describe("Legacy Multi-Page Smoke", () => {
  test("replay step controls advance replay index deterministically and rewinds without seek", async ({ page }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.import === "function" && typeof manager.step === "function";
    });
    await page.waitForFunction(() => {
      return (
        typeof (window as any).replayUiSetReplaySpeed === "function" ||
        typeof (window as any).setReplaySpeed === "function"
      );
    });
    await page.waitForFunction(() => {
      return typeof (window as any).replayUiSetReplaySpeed === "function";
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const originalAlert = window.alert;
      window.alert = function (_msg) {};
      try {
        let ok = manager.import("replay_(!\u00e4fC");
        if (!ok) {
          ok = manager.import("replay_(!\u76f2fC");
        }
        manager.pause();
        const originalSeek = manager.seek;
        let seekCallCount = 0;
        manager.seek = function (...args: unknown[]) {
          seekCallCount += 1;
          return originalSeek.apply(this, args);
        };
        const total = Array.isArray(manager.replayMoves) ? manager.replayMoves.length : 0;
        const before = Number(manager.replayIndex);
        manager.step(1);
        const afterPlusOne = Number(manager.replayIndex);
        manager.step(10);
        const afterPlusTen = Number(manager.replayIndex);
        const seekCountBeforeBack = seekCallCount;
        manager.step(-1);
        const afterMinusOne = Number(manager.replayIndex);
        const seekCountAfterMinusOne = seekCallCount;
        manager.step(-10);
        const afterMinusTen = Number(manager.replayIndex);
        const seekCountAfterMinusTen = seekCallCount;
        return {
          ok,
          total,
          before,
          afterPlusOne,
          afterPlusTen,
          afterMinusOne,
          afterMinusTen,
          seekCountBeforeBack,
          seekCountAfterMinusOne,
          seekCountAfterMinusTen
        };
      } finally {
        window.alert = originalAlert;
      }
    });

    expect(snapshot.ok).toBe(true);
    expect(snapshot.total).toBeGreaterThan(0);
    expect(snapshot.afterPlusOne).toBe(Math.min(snapshot.before + 1, snapshot.total));
    expect(snapshot.afterPlusTen).toBe(Math.min(snapshot.afterPlusOne + 10, snapshot.total));
    expect(snapshot.afterMinusOne).toBe(Math.max(snapshot.afterPlusTen - 1, 0));
    expect(snapshot.afterMinusTen).toBe(Math.max(snapshot.afterMinusOne - 10, 0));
    expect(snapshot.seekCountAfterMinusOne).toBe(snapshot.seekCountBeforeBack);
    expect(snapshot.seekCountAfterMinusTen).toBe(snapshot.seekCountAfterMinusOne);
  });

  test("replay seek keeps exact history bounded while building sparse checkpoints", async ({
    page
  }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.import === "function" && typeof manager.seek === "function";
    });

    const snapshot = await page.evaluate((replayText) => {
      const manager = (window as any).game_manager;
      const originalAlert = window.alert;
      window.alert = function (_msg) {};
      try {
        const ok = typeof replayText === "string" && replayText !== "" && manager.import(replayText);
        manager.pause();
        const total = Array.isArray(manager.replayMoves) ? manager.replayMoves.length : 0;
        if (!ok || total < 120) {
          return {
            ok: false,
            total,
            replayTextLength: typeof replayText === "string" ? replayText.length : 0
          };
        }

        const forwardTarget = Math.floor(total * 0.75);
        const backwardTarget = Math.floor(total * 0.25);
        const originalMove = manager.move;
        let moveCallCount = 0;
        manager.move = function (...args: unknown[]) {
          moveCallCount += 1;
          return originalMove.apply(this, args);
        };
        manager.seek(forwardTarget);
        const moveCallCountAfterForwardSeek = moveCallCount;

        const exactHistoryCountAfterForward = Array.isArray(manager.replayStateHistory)
          ? manager.replayStateHistory.filter(Boolean).length
          : 0;
        const checkpointCountAfterForward = Array.isArray(manager.replaySeekCheckpointHistory)
          ? manager.replaySeekCheckpointHistory.filter(Boolean).length
          : 0;
        const forwardIndex = Number(manager.replayIndex || 0);

        manager.seek(backwardTarget);

        const exactHistoryCountAfterBackward = Array.isArray(manager.replayStateHistory)
          ? manager.replayStateHistory.filter(Boolean).length
          : 0;
        const checkpointCountAfterBackward = Array.isArray(manager.replaySeekCheckpointHistory)
          ? manager.replaySeekCheckpointHistory.filter(Boolean).length
          : 0;
        const backwardIndex = Number(manager.replayIndex || 0);

        return {
          ok: true,
          total,
          forwardTarget,
          backwardTarget,
          forwardIndex,
          backwardIndex,
          moveCallCountAfterForwardSeek,
          exactHistoryCountAfterForward,
          checkpointCountAfterForward,
          exactHistoryCountAfterBackward,
          checkpointCountAfterBackward
        };
      } finally {
        window.alert = originalAlert;
      }
    }, STABLE_SPARSE_CHECKPOINT_REPLAY_TEXT);

    expect(snapshot.ok).toBe(true);
    expect(snapshot.total).toBeGreaterThanOrEqual(120);
    expect(snapshot.forwardIndex).toBe(snapshot.forwardTarget);
    expect(snapshot.backwardIndex).toBe(snapshot.backwardTarget);
    expect(snapshot.moveCallCountAfterForwardSeek).toBeLessThanOrEqual(40);
    expect(snapshot.exactHistoryCountAfterForward).toBeLessThanOrEqual(24);
    expect(snapshot.exactHistoryCountAfterBackward).toBeLessThanOrEqual(40);
    expect(snapshot.checkpointCountAfterForward).toBeGreaterThanOrEqual(3);
    expect(snapshot.checkpointCountAfterBackward).toBeGreaterThanOrEqual(
      snapshot.checkpointCountAfterForward
    );
  });

  test("replay forward step after rewind still dispatches real move execution", async ({ page }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.import === "function" && typeof manager.step === "function";
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const originalAlert = window.alert;
      window.alert = function (_msg) {};
      try {
        let ok = manager.import("replay_(!\u00e4fC");
        if (!ok) {
          ok = manager.import("replay_(!\u76f2fC");
        }
        manager.pause();
        const originalMove = manager.move;
        let moveCallCount = 0;
        manager.move = function (...args: unknown[]) {
          moveCallCount += 1;
          return originalMove.apply(this, args);
        };
        manager.step(5);
        const moveCountAfterWarmup = moveCallCount;
        manager.step(-2);
        const moveCountAfterRewind = moveCallCount;
        manager.step(1);
        const moveCountAfterForward = moveCallCount;
        return {
          ok,
          moveCountAfterWarmup,
          moveCountAfterRewind,
          moveCountAfterForward
        };
      } finally {
        window.alert = originalAlert;
      }
    });

    expect(snapshot.ok).toBe(true);
    expect(snapshot.moveCountAfterWarmup).toBeGreaterThan(0);
    expect(snapshot.moveCountAfterRewind).toBe(snapshot.moveCountAfterWarmup);
    expect(snapshot.moveCountAfterForward).toBe(snapshot.moveCountAfterRewind + 1);
  });

  test("replay page supports step-timer and fixed-step-ms playback speed", async ({
    page
  }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.import === "function" && typeof manager.step === "function";
    });

    const snapshot = await page.evaluate(async () => {
      const manager = (window as any).game_manager;
      const originalAlert = window.alert;
      window.alert = function (_msg) {};
      try {
        let ok = manager.import("replay_(!\u00e4fC");
        if (!ok) {
          ok = manager.import("replay_(!\u76f2fC");
        }
        manager.pause();
        const setSpeedApi =
          (window as any).replayUiSetReplaySpeed || (window as any).setReplaySpeed;
        if (typeof setSpeedApi !== "function") {
          return {
            ok,
            hasSpeedButton: !!document.getElementById("replay-open-speed-btn"),
            hasPauseButton: !!document.getElementById("replay-pause-btn"),
            hasTimerNode: !!document.getElementById("replay-step-timer"),
            hasSetSpeedApi: false
          };
        }
        setSpeedApi(120);
        await new Promise((resolve) => window.setTimeout(resolve, 30));
        const speedButton = document.getElementById("replay-open-speed-btn") as HTMLElement | null;
        const pauseButton = document.getElementById("replay-pause-btn") as HTMLButtonElement | null;
        const timerNode = document.getElementById("replay-step-timer") as HTMLElement | null;
        if (!(ok && speedButton && pauseButton && timerNode)) {
          return {
            ok,
            hasSpeedButton: !!speedButton,
            hasPauseButton: !!pauseButton,
            hasTimerNode: !!timerNode,
            hasSetSpeedApi: true
          };
        }

        pauseButton.click();
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        const replayIndexAfterStart = Number(manager.replayIndex || 0);
        const pauseTextDuringPlay = String(pauseButton.textContent || "");

        pauseButton.click();
        const replayIndexAfterPauseClick = Number(manager.replayIndex || 0);
        await new Promise((resolve) => window.setTimeout(resolve, 60));
        const replayIndexAfterPauseSettled = Number(manager.replayIndex || 0);
        const pauseTextAfterPause = String(pauseButton.textContent || "");

        return {
          ok: true,
          hasSpeedButton: true,
          hasPauseButton: true,
          hasTimerNode: true,
          hasSetSpeedApi: true,
          speedTitle: String(speedButton.title || ""),
          replayIndexAfterStart,
          replayIndexAfterPauseClick,
          replayIndexAfterPauseSettled,
          timerText: String(timerNode.textContent || "").trim(),
          pauseTextDuringPlay,
          pauseTextAfterPause
        };
      } finally {
        window.alert = originalAlert;
      }
    });

    expect(snapshot.ok).toBe(true);
    expect(snapshot.hasSpeedButton).toBe(true);
    expect(snapshot.hasPauseButton).toBe(true);
    expect(snapshot.hasTimerNode).toBe(true);
    expect(snapshot.hasSetSpeedApi).toBe(true);
    expect(snapshot.speedTitle).toContain("120ms");
    expect(snapshot.replayIndexAfterStart).toBeGreaterThan(0);
    expect(snapshot.replayIndexAfterPauseSettled).toBeGreaterThanOrEqual(snapshot.replayIndexAfterPauseClick);
    expect(snapshot.replayIndexAfterPauseSettled).toBeLessThanOrEqual(snapshot.replayIndexAfterPauseClick + 1);
    expect(snapshot.timerText).toMatch(/^\d+\.\d{4} s$/);
    expect(snapshot.pauseTextDuringPlay.toLowerCase()).not.toBe(snapshot.pauseTextAfterPause.toLowerCase());
  });

  test("replay page imports legacy replay text files and shows compatibility notice", async ({
    page
  }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.import === "function";
    });

    await page.evaluate(() => {
      (window as any).__replayAlerts = [];
      window.alert = function (msg?: unknown) {
        (window as any).__replayAlerts.push(typeof msg === "string" ? msg : String(msg));
      };
    });

    await importReplayFileAndConfirm(page, "tests/fixtures/replays/legacy-text-replay.txt", "legacy-text-replay");

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return Array.isArray(manager?.replayMoves) && manager.replayMoves.length > 0;
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const banner = document.getElementById("replay-compatibility-banner") as HTMLElement | null;
      const importedFileName = document.getElementById("replay-imported-file-name") as HTMLElement | null;
      const importedFileNameStyle = importedFileName ? window.getComputedStyle(importedFileName) : null;
      const style = banner ? window.getComputedStyle(banner) : null;
      return {
        alerts: Array.isArray((window as any).__replayAlerts)
          ? (window as any).__replayAlerts.slice()
          : [],
        replayMovesLength: Array.isArray(manager?.replayMoves) ? manager.replayMoves.length : -1,
        bannerVisible: !!(banner && style && style.display !== "none" && style.visibility !== "hidden"),
        bannerText: String(banner?.textContent || ""),
        importedFileNameVisible: !!(
          importedFileName &&
          importedFileNameStyle &&
          importedFileNameStyle.display !== "none" &&
          importedFileNameStyle.visibility !== "hidden"
        ),
        importedFileNameText: String(importedFileName?.textContent || "")
      };
    });

    expect(snapshot.alerts).toEqual([]);
    expect(snapshot.replayMovesLength).toBeGreaterThan(0);
    expect(snapshot.bannerVisible).toBe(true);
    expect(snapshot.bannerText).toContain("replay_");
    expect(snapshot.bannerText).toContain("v1");
    expect(snapshot.importedFileNameVisible).toBe(true);
    expect(snapshot.importedFileNameText).toBe("legacy-text-replay");
  });

  test("replay page supports drag-and-drop replay file import", async ({ page }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.import === "function";
    });

    await page.evaluate(() => {
      (window as any).__replayAlerts = [];
      window.alert = function (msg?: unknown) {
        (window as any).__replayAlerts.push(typeof msg === "string" ? msg : String(msg));
      };
    });

    const replayText = readFileSync("tests/fixtures/replays/legacy-text-replay.txt", "utf8");
    await importReplayFileByDropAndConfirm(page, "drag-drop-replay.txt", replayText, "drag-drop-replay");

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const dropOverlay = document.getElementById("replay-file-drop-overlay") as HTMLElement | null;
      const dropStyle = dropOverlay ? window.getComputedStyle(dropOverlay) : null;
      return {
        alerts: Array.isArray((window as any).__replayAlerts)
          ? (window as any).__replayAlerts.slice()
          : [],
        replayMovesLength: Array.isArray(manager?.replayMoves) ? manager.replayMoves.length : -1,
        dropOverlayVisible: !!(
          dropOverlay &&
          dropStyle &&
          dropStyle.display !== "none" &&
          dropStyle.visibility !== "hidden"
        )
      };
    });

    expect(snapshot.alerts).toEqual([]);
    expect(snapshot.replayMovesLength).toBeGreaterThan(0);
    expect(snapshot.dropOverlayVisible).toBe(false);
  });

  test("replay page imports real legacy text replay files and shows compatibility notice", async ({
    page
  }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.import === "function";
    });

    await page.evaluate(() => {
      (window as any).__replayAlerts = [];
      window.alert = function (msg?: unknown) {
        (window as any).__replayAlerts.push(typeof msg === "string" ? msg : String(msg));
      };
    });

    await importReplayFileAndConfirm(
      page,
      "tests/fixtures/replays/legacy-real-v9-text-replay.txt",
      "legacy-real-v9-text-replay"
    );

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return Array.isArray(manager?.replayMoves) && manager.replayMoves.length > 0;
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const banner = document.getElementById("replay-compatibility-banner") as HTMLElement | null;
      const style = banner ? window.getComputedStyle(banner) : null;
      return {
        replayMovesLength: Array.isArray(manager?.replayMoves) ? manager.replayMoves.length : 0,
        modeKey: manager?.modeKey || manager?.mode?.key || "",
        alerts: Array.isArray((window as any).__replayAlerts) ? (window as any).__replayAlerts.slice() : [],
        bannerVisible: !!banner && style?.display !== "none",
        bannerText: banner ? banner.textContent || "" : ""
      };
    });

    expect(snapshot.replayMovesLength).toBeGreaterThan(0);
    expect(snapshot.modeKey).toBe("standard_4x4_pow2_no_undo");
    expect(snapshot.alerts).toEqual([]);
    expect(snapshot.bannerVisible).toBe(true);
    expect(snapshot.bannerText).toContain("replay_");
    expect(snapshot.bannerText).toContain("v1");
  });

  test("replay page imports legacy VRS text files and shows compatibility notice", async ({
    page
  }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.import === "function";
    });

    await page.evaluate(() => {
      (window as any).__replayAlerts = [];
      window.alert = function (msg?: unknown) {
        (window as any).__replayAlerts.push(typeof msg === "string" ? msg : String(msg));
      };
    });

    await importReplayFileAndConfirm(page, "tests/fixtures/replays/legacy-vrs-text-replay.vrs", "legacy-vrs-text-replay");

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return Array.isArray(manager?.replayMoves) && manager.replayMoves.length > 0;
    });

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      if (typeof (window as any).pauseReplay === "function") {
        (window as any).pauseReplay();
      }
      if (manager && typeof manager.seek === "function") {
        manager.seek(1);
      }
    });

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return Number(manager?.replayIndex) === 1;
    });

    await page.waitForFunction(() => {
      const timer = document.getElementById("replay-step-timer");
      const text = String(timer?.textContent || "").trim();
      return text !== "" && text !== "0.0000 s";
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const banner = document.getElementById("replay-compatibility-banner") as HTMLElement | null;
      const stepTimer = document.getElementById("replay-step-timer") as HTMLElement | null;
      const style = banner ? window.getComputedStyle(banner) : null;
      return {
        replayMovesLength: Array.isArray(manager?.replayMoves) ? manager.replayMoves.length : 0,
        modeKey: manager?.modeKey || manager?.mode?.key || "",
        alerts: Array.isArray((window as any).__replayAlerts) ? (window as any).__replayAlerts.slice() : [],
        bannerVisible: !!banner && style?.display !== "none",
        bannerText: banner ? banner.textContent || "" : "",
        stepTimerText: stepTimer ? stepTimer.textContent || "" : ""
      };
    });

    expect(snapshot.replayMovesLength).toBe(1);
    expect(snapshot.modeKey).toBe("standard_4x4_pow2_no_undo");
    expect(snapshot.alerts).toEqual([]);
    expect(snapshot.bannerVisible).toBe(true);
    expect(snapshot.bannerText).toContain(".vrs");
    expect(snapshot.bannerText).toContain("v1");
    expect(snapshot.stepTimerText).not.toBe("0.0000 s");
  });

  test("replay page import file chooser only accepts txt vrs and rpl", async ({ page }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => typeof (window as any).importReplay === "function");

    const replayUiSource = readFileSync("js/replay_ui.js", "utf8");
    const acceptMatch = replayUiSource.match(/input\.accept\s*=\s*["']([^"']+)["']/);
    const accept = acceptMatch ? acceptMatch[1] : null;

    expect(accept).toBe(".txt,.vrs,.rpl");
  });

  test("replay page keeps compatibility notice hidden for mainstream v1 replay imports", async ({
    page
  }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.serialize === "function";
    });

    const replayText = await page.evaluate(() => {
      return String((window as any).game_manager.serialize());
    });

    await page.evaluate(() => {
      (window as any).__replayAlerts = [];
      window.alert = function (msg?: unknown) {
        (window as any).__replayAlerts.push(typeof msg === "string" ? msg : String(msg));
      };
    });

    await page.locator("#import-replay-text-btn").click();
    await expect(page.locator("#replay-modal")).toBeVisible();
    await page.locator("#replay-textarea").fill(replayText);
    await page.locator("#replay-action-btn").click();
    await expect(page.locator("#replay-modal")).toBeHidden();

    const snapshot = await page.evaluate(() => {
      const banner = document.getElementById("replay-compatibility-banner") as HTMLElement | null;
      const style = banner ? window.getComputedStyle(banner) : null;
      return {
        alerts: Array.isArray((window as any).__replayAlerts)
          ? (window as any).__replayAlerts.slice()
          : [],
        bannerVisible: !!(banner && style && style.display !== "none" && style.visibility !== "hidden"),
        bannerText: String(banner?.textContent || "")
      };
    });

    expect(snapshot.alerts).toEqual([]);
    expect(snapshot.bannerVisible).toBe(false);
    expect(snapshot.bannerText).toBe("");
  });

  test("replay import accepts serialized v1 payload", async ({ page }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.import === "function" && typeof manager.serialize === "function";
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const replayText = manager.serialize();
      const v1Prefix =
        ((window as any).GameManager && (window as any).GameManager.REPLAY_V1_RPL_BASE64_PREFIX) ||
        "REPLAY_v1RPL_B64_";
      const originalAlert = window.alert;
      const alerts: string[] = [];
      window.alert = function (msg?: unknown) {
        alerts.push(typeof msg === "string" ? msg : String(msg));
      };
      try {
        const ok = manager.import(replayText);
        manager.pause();
        return {
          hasV1Prefix: typeof replayText === "string" && replayText.indexOf(v1Prefix) === 0,
          ok,
          alerts,
          replayMovesLength: Array.isArray(manager.replayMoves) ? manager.replayMoves.length : -1
        };
      } finally {
        window.alert = originalAlert;
      }
    });

    expect(snapshot.hasV1Prefix).toBe(true);
    expect(snapshot.ok).toBe(true);
    expect(snapshot.alerts).toEqual([]);
    expect(snapshot.replayMovesLength).toBe(0);
  });

  test("live v1 replay serialization keeps start timestamp within backend-safe integer range", async ({
    browser
  }) => {
    const cases = [
      { url: "/2048.html", expectedModeKey: "standard_4x4_pow2_no_undo" },
      { url: "/play.html?mode_key=board_3x3_pow2_no_undo", expectedModeKey: "board_3x3_pow2_no_undo" }
    ];

    for (const testCase of cases) {
      const page = await browser.newPage();
      const response = await page.goto(testCase.url, {
        waitUntil: "domcontentloaded"
      });
      expect(response).not.toBeNull();
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
      await page.waitForFunction(() => {
        const manager = (window as any).game_manager;
        const codec = (window as any).CoreReplayCodecRuntime;
        return (
          !!manager &&
          typeof manager.move === "function" &&
          typeof manager.serialize === "function" &&
          !!codec &&
          typeof codec.decodeReplayV1Rpl === "function"
        );
      });

      const snapshot = await page.evaluate(() => {
        const manager = (window as any).game_manager;
        const codec = (window as any).CoreReplayCodecRuntime;
        const prefix =
          ((window as any).GameManager && (window as any).GameManager.REPLAY_V1_RPL_BASE64_PREFIX) ||
          "REPLAY_v1RPL_B64_";

        const trySuccessfulMove = () => {
          const startLength = Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0;
          for (const direction of [0, 1, 2, 3]) {
            manager.move(direction);
            const nextLength = Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0;
            if (nextLength > startLength) return true;
          }
          return false;
        };

        for (let i = 0; i < 6; i += 1) {
          if (trySuccessfulMove()) break;
        }

        const replayText = String(manager.serialize());
        const encoded = replayText.startsWith(prefix) ? replayText.slice(prefix.length) : "";
        const binary = window.atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i) & 255;
        const decoded = codec.decodeReplayV1Rpl(bytes);
        return {
          modeKey: String(manager.modeKey || ""),
          replayTextHead: replayText.slice(0, 24),
          startUnixMs: decoded ? decoded.startUnixMs : null
        };
      });

      expect(snapshot.modeKey).toBe(testCase.expectedModeKey);
      expect(snapshot.replayTextHead).toContain("REPLAY_v1RPL_B64_");
      expect(
        snapshot.startUnixMs === null ||
          (Number.isInteger(snapshot.startUnixMs) && Number(snapshot.startUnixMs) > 0 && Number(snapshot.startUnixMs) <= 0xffffffff)
      ).toBe(true);

      await page.close();
    }
  });

  test("live v1 replay roundtrip preserves terminal board state for 4x4 and 3x3", async ({
    browser
  }) => {
    const cases = [
      { url: "/2048.html", expectedModeKey: "standard_4x4_pow2_no_undo" },
      { url: "/play.html?mode_key=board_3x3_pow2_no_undo", expectedModeKey: "board_3x3_pow2_no_undo" }
    ];

    for (const testCase of cases) {
      const page = await browser.newPage();
      const response = await page.goto(testCase.url, {
        waitUntil: "domcontentloaded"
      });
      expect(response).not.toBeNull();
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
      await page.waitForFunction(() => {
        const manager = (window as any).game_manager;
        return (
          !!manager &&
          typeof manager.move === "function" &&
          typeof manager.serialize === "function" &&
          typeof manager.import === "function" &&
          typeof manager.seek === "function"
        );
      });

      const snapshot = await page.evaluate(() => {
        const manager = (window as any).game_manager;
        const originalAlert = window.alert;
        window.alert = function (_msg) {};
        const toBoardRows = () => {
          const columns = manager && manager.grid && Array.isArray(manager.grid.cells) ? manager.grid.cells : [];
          const width = Array.isArray(columns) ? columns.length : 0;
          const height = width > 0 && Array.isArray(columns[0]) ? columns[0].length : 0;
          const rows = [];
          for (let y = 0; y < height; y += 1) {
            const row = [];
            for (let x = 0; x < width; x += 1) {
              const column = Array.isArray(columns[x]) ? columns[x] : [];
              const cell = column[y];
              row.push(cell ? Math.floor(Number(cell.value) || 0) : 0);
            }
            rows.push(row);
          }
          return rows;
        };
        const trySuccessfulMove = () => {
          const startLength = Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0;
          for (const direction of [0, 1, 2, 3]) {
            manager.move(direction);
            const nextLength = Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0;
            if (nextLength > startLength) return true;
          }
          return false;
        };

        try {
          let attempts = 0;
          while (Number(manager.successfulMoveCount || 0) < 24 && attempts < 160) {
            if (!trySuccessfulMove()) break;
            attempts += 1;
          }

          const replayText = String(manager.serialize() || "");
          const expectedScore = Math.floor(Number(manager.score) || 0);
          const expectedMoves = Math.floor(Number(manager.successfulMoveCount) || 0);
          const expectedBoard = toBoardRows();
          const ok = replayText !== "" && manager.import(replayText);
          manager.pause();
          const total = Array.isArray(manager.replayMoves) ? manager.replayMoves.length : 0;
          if (!ok || total !== expectedMoves) {
            return {
              ok: false,
              total,
              expectedMoves,
              modeKey: String(manager.modeKey || "")
            };
          }
          manager.seek(total);
          return {
            ok: true,
            modeKey: String(manager.modeKey || ""),
            total,
            expectedScore,
            actualScore: Math.floor(Number(manager.score) || 0),
            expectedMoves,
            actualMoves: Math.floor(Number(manager.successfulMoveCount) || 0),
            expectedBoard,
            actualBoard: toBoardRows()
          };
        } finally {
          window.alert = originalAlert;
        }
      });

      expect(snapshot.ok).toBe(true);
      expect(snapshot.modeKey).toBe(testCase.expectedModeKey);
      expect(snapshot.total).toBe(snapshot.expectedMoves);
      expect(snapshot.actualScore).toBe(snapshot.expectedScore);
      expect(snapshot.actualMoves).toBe(snapshot.expectedMoves);
      expect(snapshot.actualBoard).toEqual(snapshot.expectedBoard);

      await page.close();
    }
  });

  test("5x5 mode serializes replay as v1 with per-step deltaMs", async ({ page }) => {
    const response = await page.goto("/play.html?mode_key=board_5x5_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "5x5 play response should exist").not.toBeNull();
    expect(response?.ok(), "5x5 play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      const codec = (window as any).CoreReplayCodecRuntime;
      return (
        !!manager &&
        typeof manager.move === "function" &&
        typeof manager.serialize === "function" &&
        !!codec &&
        typeof codec.decodeReplayV1Rpl === "function"
      );
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const codec = (window as any).CoreReplayCodecRuntime;
      const prefix =
        ((window as any).GameManager && (window as any).GameManager.REPLAY_V1_RPL_BASE64_PREFIX) ||
        "REPLAY_v1RPL_B64_";
      for (let i = 0; i < 64; i += 1) {
        manager.move(i % 4);
        const session = manager.sessionReplayV1;
        if (session && Array.isArray(session.records) && session.records.length > 0) break;
      }
      const replayText = String(manager.serialize());
      const hasV1Prefix = replayText.startsWith(prefix);
      if (!hasV1Prefix) {
        return {
          hasV1Prefix,
          replayTextHead: replayText.slice(0, 40)
        };
      }
      const encoded = replayText.slice(prefix.length);
      const binary = window.atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i) & 255;
      const decoded = codec.decodeReplayV1Rpl(bytes);
      const moveRecords = Array.isArray(decoded?.records)
        ? decoded.records.filter((record: any) => record && record.kind === "move")
        : [];
      return {
        hasV1Prefix,
        width: Number(decoded?.width),
        height: Number(decoded?.height),
        moveCount: moveRecords.length,
        hasDeltaMs: moveRecords.every(
          (record: any) => Number.isInteger(record?.deltaMs) && Number(record.deltaMs) >= 0
        )
      };
    });

    expect(snapshot.hasV1Prefix).toBe(true);
    expect(snapshot.width).toBe(5);
    expect(snapshot.height).toBe(5);
    expect(snapshot.moveCount).toBeGreaterThan(0);
    expect(snapshot.hasDeltaMs).toBe(true);
  });

  test("replay ui step/seek triggers single final actuate without extra relayout flash", async ({
    page
  }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.import === "function" && typeof manager.step === "function";
    });

    const snapshot = await page.evaluate(async () => {
      const manager = (window as any).game_manager;
      const originalAlert = window.alert;
      window.alert = function (_msg) {};
      try {
        if (typeof manager.move === "function") {
          manager.move(1);
          manager.move(2);
          manager.move(1);
        }
        const replayText = manager.serialize();
        const ok = manager.import(replayText);
        manager.pause();
        if (!ok) {
          return { ok: false };
        }

        const originalActuate = manager.actuate;
        let actuateCount = 0;
        manager.actuate = function (...args: unknown[]) {
          actuateCount += 1;
          return originalActuate.apply(this, args);
        };

        window.replayUiStepReplay(1);
        await new Promise((resolve) => window.setTimeout(resolve, 280));
        const stepActuateCount = actuateCount;

        actuateCount = 0;
        const progress = document.getElementById("replay-progress") as HTMLInputElement | null;
        if (progress) {
          progress.value = "50";
          progress.dispatchEvent(new Event("input", { bubbles: true }));
          progress.dispatchEvent(new Event("change", { bubbles: true }));
        }
        await new Promise((resolve) => window.setTimeout(resolve, 280));
        const seekActuateCount = actuateCount;

        manager.actuate = originalActuate;
        return {
          ok: true,
          stepActuateCount,
          seekActuateCount
        };
      } finally {
        window.alert = originalAlert;
      }
    });

    expect(snapshot.ok).toBe(true);
    expect(snapshot.stepActuateCount).toBe(1);
    expect(snapshot.seekActuateCount).toBeLessThanOrEqual(1);
  });

  test("replay mode does not write best score into standard mode storage key", async ({ page }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.actuate === "function";
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const standardKey = "bestScoreByMode:standard_4x4_pow2_no_undo";
      window.localStorage.setItem(standardKey, "0");

      manager.replayMode = true;
      manager.score = 4096;
      manager.actuate();

      // Even if replay flag is off, replay page should remain isolated from standard best score key.
      if (manager.scoreManager && typeof manager.scoreManager.setModeKey === "function") {
        manager.scoreManager.setModeKey("standard_4x4_pow2_no_undo");
      }
      manager.replayMode = false;
      manager.score = 8192;
      manager.actuate();

      return {
        standardAfter: window.localStorage.getItem(standardKey),
        replayScoreKey:
          manager.scoreManager && typeof manager.scoreManager.getKey === "function"
            ? manager.scoreManager.getKey()
            : null
      };
    });

    expect(snapshot.standardAfter).toBe("0");
    expect(snapshot.replayScoreKey).toBe("bestScoreByMode:replay_view");
  });

  test("replay page loads cloud replay via cloud_replay parameter", async ({ page }) => {
    await page.addInitScript(() => {
      const payload = {
        source: "cloud_record",
        cloud_payload_version: 2,
        replay_file_version: 1,
        id: "cloud-rec-1",
        replay_string: "replay_(!閻╃灄C"
      };
      window.sessionStorage.setItem("cloud_replay_payload_v1", JSON.stringify(payload));
      (window as any).__replayLoadAlerts = [];
      window.alert = function (message?: unknown) {
        (window as any).__replayLoadAlerts.push(String(message || ""));
      };
    });

    const response = await page.goto("/replay.html?cloud_replay=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const payloadAfter = window.sessionStorage.getItem("cloud_replay_payload_v1");
      return payloadAfter === null;
    });

    const snapshot = await page.evaluate(() => {
      return {
        alerts: ((window as any).__replayLoadAlerts || []).map((item: unknown) => String(item || "")),
        payloadAfter: window.sessionStorage.getItem("cloud_replay_payload_v1")
      };
    });

    expect(snapshot.payloadAfter).toBeNull();
    expect(
      snapshot.alerts.some(
        (item: string) =>
          item.toLowerCase().includes("failed to load cloud replay") ||
          (item.toLowerCase().includes("cloud replay") && item.toLowerCase().includes("failed"))
      )
    ).toBe(false);
  });

  test("replay page rejects cloud replay when payload version mismatches", async ({ page }) => {
    await page.addInitScript(() => {
      const payload = {
        source: "cloud_record",
        cloud_payload_version: 1,
        replay_file_version: 1,
        id: "cloud-rec-mismatch",
        replay_string: "replay_(!閻╃灄C"
      };
      window.sessionStorage.setItem("cloud_replay_payload_v1", JSON.stringify(payload));
      (window as any).__replayLoadAlerts = [];
      window.alert = function (message?: unknown) {
        (window as any).__replayLoadAlerts.push(String(message || ""));
      };
    });

    const response = await page.goto("/replay.html?cloud_replay=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(
      () => Array.isArray((window as any).__replayLoadAlerts) && (window as any).__replayLoadAlerts.length > 0
    );

    const snapshot = await page.evaluate(() => {
      return {
        alerts: ((window as any).__replayLoadAlerts || []).map((item: unknown) => String(item || "")),
        payloadAfter: window.sessionStorage.getItem("cloud_replay_payload_v1")
      };
    });

    expect(snapshot.alerts.length).toBeGreaterThan(0);
    expect(snapshot.alerts.some((item: string) => item.toLowerCase().includes("version") || item.includes("版本"))).toBe(true);
    expect(snapshot.payloadAfter).not.toBeNull();
  });

  test("replay page loads local history replay via local_history_id parameter", async ({ page }) => {
    const replayId = "lh_replay_local_param";
    await page.addInitScript((id: string) => {
      const records = [
        {
          id,
          mode_key: "standard_4x4_pow2_no_undo",
          replay_string: "replay_(!鐩瞗C",
          diagnostics_index_entries: [
            {
              key: "secondaryTimerPlacement",
              schemaVersion: 1,
              payload: {
                validPlacementDescriptors: 3,
                placed: 2,
                skippedDuplicate: 1,
                skippedMissingAnchor: 0,
                dedupeKeyKinds: 2,
                dedupeKeySamples: ["parent-child:8192:4096#2"]
              }
            }
          ],
          ended_at: new Date().toISOString(),
          saved_at: new Date().toISOString()
        }
      ];
      window.localStorage.setItem("local_game_history_v1", JSON.stringify(records));
      (window as any).__replayLoadAlerts = [];
      window.alert = function (message?: unknown) {
        (window as any).__replayLoadAlerts.push(String(message || ""));
      };
    }, replayId);

    const response = await page.goto("/replay.html?local_history_id=" + replayId, {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && Array.isArray(manager.replayMoves);
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      return {
        replayMovesLength: Array.isArray(manager?.replayMoves) ? manager.replayMoves.length : -1,
        alertCount: Number(((window as any).__replayLoadAlerts || []).length),
        diagnosticsText: String((document.getElementById("replay-diagnostics-summary")?.textContent || "")).trim(),
        diagnosticsSamplesText: String((document.getElementById("replay-diagnostics-samples")?.textContent || "")).trim()
      };
    });

    expect(snapshot.alertCount).toBe(0);
    expect(snapshot.replayMovesLength).toBeGreaterThanOrEqual(0);
    expect(snapshot.diagnosticsText).toContain("secondaryTimerPlacement");
    expect(snapshot.diagnosticsText).toContain("有效 3");
    expect(snapshot.diagnosticsSamplesText).toContain("parent-child:8192:4096#2");
  });

  test("replay page keeps backward compatibility for legacy id parameter", async ({ page }) => {
    const replayId = "lh_replay_legacy_param";
    await page.addInitScript((id: string) => {
      const records = [
        {
          id,
          mode_key: "standard_4x4_pow2_no_undo",
          replay_string: "replay_(!鐩瞗C",
          ended_at: new Date().toISOString(),
          saved_at: new Date().toISOString()
        }
      ];
      window.localStorage.setItem("local_game_history_v1", JSON.stringify(records));
      (window as any).__replayLoadAlerts = [];
      window.alert = function (message?: unknown) {
        (window as any).__replayLoadAlerts.push(String(message || ""));
      };
    }, replayId);

    const response = await page.goto("/replay.html?id=" + replayId, {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && Array.isArray(manager.replayMoves);
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      return {
        replayMovesLength: Array.isArray(manager?.replayMoves) ? manager.replayMoves.length : -1,
        alertCount: Number(((window as any).__replayLoadAlerts || []).length)
      };
    });

    expect(snapshot.alertCount).toBe(0);
    expect(snapshot.replayMovesLength).toBeGreaterThanOrEqual(0);
  });

  test("replay page prefers replay_string when local history record contains both replay object and replay_string", async ({
    page
  }) => {
    const replayId = "lh_replay_prefer_string";
    await page.addInitScript((id: string) => {
      const records = [
        {
          id,
          mode_key: "standard_4x4_pow2_no_undo",
          replay: {
            v: 3,
            mode_key: "standard_4x4_pow2_no_undo",
            seed: 0.125,
            actions: [0, 1, 2]
          },
          replay_string: JSON.stringify({
            v: 3,
            mode_key: "standard_4x4_pow2_no_undo",
            seed: 0.25,
            actions: [3]
          }),
          ended_at: new Date().toISOString(),
          saved_at: new Date().toISOString()
        }
      ];
      window.localStorage.setItem("local_game_history_v1", JSON.stringify(records));
      (window as any).__replayLoadAlerts = [];
      window.alert = function (message?: unknown) {
        (window as any).__replayLoadAlerts.push(String(message || ""));
      };
    }, replayId);

    const response = await page.goto("/replay.html?local_history_id=" + replayId, {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && Array.isArray(manager.replayMoves);
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      return {
        replayMoves: Array.isArray(manager?.replayMoves) ? manager.replayMoves.slice() : [],
        alertCount: Number(((window as any).__replayLoadAlerts || []).length)
      };
    });

    expect(snapshot.alertCount).toBe(0);
    expect(snapshot.replayMoves).toEqual([3]);
  });

  test("replay page reports explicit error when local history replay code is missing", async ({
    page
  }) => {
    const replayId = "lh_replay_missing_code";
    await page.addInitScript((id: string) => {
      const records = [
        {
          id,
          mode_key: "standard_4x4_pow2_no_undo",
          replay_string: "",
          ended_at: new Date().toISOString(),
          saved_at: new Date().toISOString()
        }
      ];
      window.localStorage.setItem("local_game_history_v1", JSON.stringify(records));
      (window as any).__replayLoadAlerts = [];
      window.alert = function (message?: unknown) {
        (window as any).__replayLoadAlerts.push(String(message || ""));
      };
    }, replayId);

    const response = await page.goto("/replay.html?local_history_id=" + replayId, {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      return Number(((window as any).__replayLoadAlerts || []).length || 0) > 0;
    });

    const snapshot = await page.evaluate(() => {
      return {
        alerts: ((window as any).__replayLoadAlerts || []).map((item: unknown) => String(item || ""))
      };
    });

    expect(snapshot.alerts.length).toBeGreaterThan(0);
    expect(snapshot.alerts[0].length).toBeGreaterThan(0);
  });

  test("replay ui no longer includes onboarding guide storage runtime", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.removeItem("replay_guide_shown_v1");
      } catch (_err) {}

      (window as any).__replayGuideShowCalls = 0;
      (window as any).__replayGuideMarkCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "shouldShowReplayGuideFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__replayGuideShowCalls =
                Number((window as any).__replayGuideShowCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "markReplayGuideSeenFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__replayGuideMarkCalls =
                Number((window as any).__replayGuideMarkCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreReplayGuideRuntime", {
        configurable: true,
        writable: true,
        value: runtimeProxy
      });
    });

    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreReplayGuideRuntime;
      if (
        !runtime ||
        typeof runtime.readReplayGuideSeenFromContext !== "function" ||
        typeof runtime.shouldShowReplayGuideFromContext !== "function" ||
        typeof runtime.markReplayGuideSeenFromContext !== "function"
      ) {
        return {
          hasRuntime: false,
          hasOverlay: false,
          showCalls: Number((window as any).__replayGuideShowCalls || 0),
          markCalls: Number((window as any).__replayGuideMarkCalls || 0),
          initialDisplay: "",
          finalDisplay: ""
        };
      }

      const overlay = document.getElementById("guide-overlay") as HTMLElement | null;
      const initialDisplay = overlay ? String(overlay.style.display || "") : "";
      if (overlay) {
        overlay.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      }
      await new Promise((resolve) => {
        window.requestAnimationFrame(() => resolve(null));
      });
      const finalDisplay = overlay ? String(overlay.style.display || "") : "";

      return {
        hasRuntime: true,
        hasOverlay: !!overlay,
        showCalls: Number((window as any).__replayGuideShowCalls || 0),
        markCalls: Number((window as any).__replayGuideMarkCalls || 0),
        initialDisplay,
        finalDisplay
      };
    });

    expect(snapshot.hasRuntime).toBe(false);
    expect(snapshot.hasOverlay).toBe(false);
    expect(snapshot.showCalls).toBe(0);
    expect(snapshot.markCalls).toBe(0);
    expect(snapshot.initialDisplay).toBe("");
    expect(snapshot.finalDisplay).toBe("");
  });
});
