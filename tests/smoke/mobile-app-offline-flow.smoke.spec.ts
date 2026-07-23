import { expect, test, type Page } from "@playwright/test";

import type {
  GameDirection,
  GameSnapshot,
  ReplayRecord,
} from "../../src/contracts";
import { createEngineSession } from "../../src/core/engine";
import type { StoredGameRecord } from "../../mobile/src/data/app-database";

const MODE_KEY = "standard_4x4_pow2_no_undo" as const;

function createTerminalPreparation(): {
  snapshot: GameSnapshot;
  direction: GameDirection;
  finalSnapshot: GameSnapshot;
  replay: ReplayRecord;
} {
  const engine = createEngineSession({ modeKey: MODE_KEY, seed: 20_480 });
  engine.init();
  let logicalAt = 10_000;
  let selector = 0x2048;

  for (let turn = 0; turn < 10_000; turn += 1) {
    selector = (Math.imul(selector, 1_664_525) + 1_013_904_223) >>> 0;
    const first = (selector & 3) as GameDirection;
    const directions = [
      first,
      ((first + 1) % 4) as GameDirection,
      ((first + 3) % 4) as GameDirection,
      ((first + 2) % 4) as GameDirection,
    ];
    for (const direction of directions) {
      const snapshot = engine.exportState(logicalAt);
      logicalAt += 17;
      const transition = engine.move({ direction, atMs: logicalAt });
      if (transition.gameOver) {
        return {
          snapshot,
          direction,
          finalSnapshot: engine.exportState(logicalAt),
          replay: engine.exportReplay(),
        };
      }
      if (transition.moved) break;
    }
  }
  throw new Error("unable_to_build_terminal_fixture");
}

function createGuestRecord(
  terminal: ReturnType<typeof createTerminalPreparation>,
  clientRecordId: string,
  endedAt: number,
): StoredGameRecord {
  const state = terminal.finalSnapshot.state;
  const values = state.board.flat();
  return {
    schemaVersion: 1,
    clientRecordId,
    ownerKey: "guest",
    modeKey: MODE_KEY,
    source: "guest",
    endedAt,
    score: state.score,
    bestTile: Math.max(...values),
    steps: state.steps,
    durationMs: state.durationMs,
    boardSum: values.reduce((sum, value) => sum + value, 0),
    replay: terminal.replay,
    finalSnapshot: terminal.finalSnapshot,
    uploadStatus: "local",
  };
}

function createMilestonePreparation(): {
  snapshot: GameSnapshot;
  firstDirection: GameDirection;
  secondDirection: GameDirection;
} {
  const engine = createEngineSession({ modeKey: MODE_KEY, seed: 2_048 });
  engine.init({
    board: [
      [1024, 1024, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    score: 0,
    steps: 0,
    gameOver: false,
    won: false,
    milestone2048Reached: false,
    startedAtMs: null,
    lastEventAtMs: null,
    durationMs: 0,
    rngStep: 0,
    replayRecords: [],
  });
  const snapshot = engine.exportState(10_000);
  const firstDirection = 3;
  const first = engine.move({ direction: firstDirection, atMs: 10_017 });
  if (!first.moved || !first.milestone2048 || first.gameOver) {
    throw new Error("invalid_milestone_fixture_first_move");
  }
  const secondDirection = 1;
  const second = engine.move({ direction: secondDirection, atMs: 10_034 });
  if (!second.moved || second.milestone2048 || second.gameOver) {
    throw new Error("invalid_milestone_fixture_second_move");
  }
  return { snapshot, firstDirection, secondDirection };
}

function observeNetwork(page: Page): {
  businessRequests: string[];
  externalRequests: string[];
  consoleErrors: string[];
} {
  const evidence = {
    businessRequests: [] as string[],
    externalRequests: [] as string[],
    consoleErrors: [] as string[],
  };
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1")
      evidence.externalRequests.push(request.url());
    if (
      request.resourceType() === "fetch" ||
      request.resourceType() === "xhr" ||
      request.resourceType() === "websocket" ||
      url.pathname.startsWith("/api/")
    ) {
      evidence.businessRequests.push(request.url());
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") evidence.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => evidence.consoleErrors.push(error.message));
  return evidence;
}

async function injectSave(
  page: Page,
  snapshot: GameSnapshot,
  clientRecordId: string,
  records: readonly StoredGameRecord[] = [],
): Promise<void> {
  const wallAt = Date.now();
  await page.evaluate(
    async ({
      injectedSnapshot,
      recordId,
      closedAt,
      modeKey,
      injectedRecords,
    }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("2048_next_app", 2);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
          ["saves", "cache", "records"],
          "readwrite",
        );
        transaction.objectStore("saves").put({
          schemaVersion: 1,
          ownerKey: "guest",
          modeKey,
          clientRecordId: recordId,
          generation: 1,
          lifecycle: "active",
          gameKind: "normal",
          revision: injectedSnapshot.state.steps,
          lastClosedAt: closedAt,
          rankedSessionId: null,
          snapshot: injectedSnapshot,
        });
        transaction.objectStore("cache").put({
          schemaVersion: 1,
          cacheKey: `system:save-head:${modeKey}`,
          ownerKey: "guest",
          kind: "save_head",
          modeKey,
          clientRecordId: recordId,
          generation: 1,
          state: "active",
          updatedAt: closedAt,
          lastAccessedAt: closedAt,
          sizeBytes: 0,
        });
        const recordStore = transaction.objectStore("records");
        for (const record of injectedRecords) recordStore.put(record);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      database.close();
    },
    {
      injectedSnapshot: snapshot,
      recordId: clientRecordId,
      closedAt: wallAt,
      modeKey: MODE_KEY,
      injectedRecords: records,
    },
  );
}

async function readGuestDatabaseState(page: Page): Promise<{
  clientRecordId: string | null;
  generation: number | null;
  revision: number | null;
  recordCount: number;
  recordIds: string[];
}> {
  return page.evaluate(async (modeKey) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("2048_next_app", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result = await new Promise<{
      clientRecordId: string | null;
      generation: number | null;
      revision: number | null;
      recordCount: number;
      recordIds: string[];
    }>((resolve, reject) => {
      const transaction = database.transaction(
        ["saves", "records"],
        "readonly",
      );
      const saveRequest = transaction
        .objectStore("saves")
        .get(["guest", modeKey]);
      const recordsRequest = transaction.objectStore("records").getAll();
      transaction.oncomplete = () => {
        const save = saveRequest.result as
          | {
              clientRecordId?: unknown;
              generation?: unknown;
              revision?: unknown;
            }
          | undefined;
        const records = recordsRequest.result as Array<{
          clientRecordId?: unknown;
        }>;
        const recordIds = records
          .map((record) => record.clientRecordId)
          .filter((id): id is string => typeof id === "string")
          .sort();
        resolve({
          clientRecordId:
            typeof save?.clientRecordId === "string"
              ? save.clientRecordId
              : null,
          generation:
            typeof save?.generation === "number" ? save.generation : null,
          revision: typeof save?.revision === "number" ? save.revision : null,
          recordCount: recordIds.length,
          recordIds,
        });
      };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
    return result;
  }, MODE_KEY);
}

async function swipeBoard(page: Page, direction: GameDirection): Promise<void> {
  const board = page.locator("[data-game-board-root]");
  const box = await board.boundingBox();
  if (!box) throw new Error("mobile_board_not_visible");
  const distance = box.width * 0.3;
  const delta: Record<GameDirection, readonly [number, number]> = {
    0: [0, -distance],
    1: [distance, 0],
    2: [0, distance],
    3: [-distance, 0],
  };
  const [deltaX, deltaY] = delta[direction];
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + deltaX, centerY + deltaY, { steps: 4 });
  await page.mouse.up();
}

test("offline guest can resume, finish, replay, inspect and permanently delete a game", async ({
  page,
}) => {
  const evidence = observeNetwork(page);
  const terminal = createTerminalPreparation();
  const clientRecordId = "smoke-offline-terminal";
  const directionKey: Record<GameDirection, string> = {
    0: "ArrowUp",
    1: "ArrowRight",
    2: "ArrowDown",
    3: "ArrowLeft",
  };

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "仅离线体验" }).click();
  await expect(
    page.getByRole("heading", { name: "今天继续一局" }),
  ).toBeVisible();

  await injectSave(page, terminal.snapshot, clientRecordId);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "继续标准 4×4" }).click();

  const board = page.locator("[data-game-board-root]");
  await expect(board).toHaveAttribute("role", "grid");
  await board.focus();
  await page.keyboard.press(directionKey[terminal.direction]);

  const result = page.locator('[data-app-view="result"]');
  await expect(result).toBeVisible();
  await expect(result.locator("[data-result-score]")).not.toHaveText("0");
  await result.getByRole("button", { name: "查看回放" }).click();

  const replay = page.locator('[data-app-view="replay"]');
  await expect(replay).toBeVisible();
  await expect(replay.locator("[data-replay-progress]")).not.toHaveAttribute(
    "max",
    "0",
  );
  await replay.getByRole("button", { name: "下一步" }).click();
  await expect(replay.locator("[data-replay-progress]")).toHaveValue("1");
  await replay.getByRole("button", { name: "返回历史详情" }).click();

  await expect(result).toBeVisible();
  await result.getByRole("button", { name: "返回首页" }).click();
  await page.locator('[data-app-bottom-nav] [data-nav="records"]').click();

  const records = page.locator('[data-app-view="records"]');
  await expect(records).toBeVisible();
  await expect(
    records.locator(`[data-record-id="${clientRecordId}"]`),
  ).toBeVisible();
  await records.locator(`[data-record-id="${clientRecordId}"]`).click();

  const detail = page.locator('[data-app-view="detail"]');
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "查看回放" }).click();
  await expect(replay).toBeVisible();
  await replay.getByRole("button", { name: "返回历史详情" }).click();
  await expect(detail).toBeVisible();

  await detail.getByRole("button", { name: "永久删除本机记录" }).click();
  const deleteDialog = page.locator("[data-delete-dialog]");
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "永久删除" }).click();

  await expect(records).toBeVisible();
  await expect(
    records.locator(`[data-record-id="${clientRecordId}"]`),
  ).toHaveCount(0);
  await expect(records.getByText("还没有已结算记录")).toBeVisible();
  expect(evidence.businessRequests).toEqual([]);
  expect(evidence.externalRequests).toEqual([]);
  expect(evidence.consoleErrors).toEqual([]);
});

test("result again starts the next generation without adding or removing history", async ({
  page,
}) => {
  const evidence = observeNetwork(page);
  const terminal = createTerminalPreparation();
  const terminalRecordId = "smoke-result-again-terminal";
  const olderRecordId = "smoke-result-again-existing";
  const olderRecord = createGuestRecord(
    terminal,
    olderRecordId,
    Date.now() - 60_000,
  );
  const directionKey: Record<GameDirection, string> = {
    0: "ArrowUp",
    1: "ArrowRight",
    2: "ArrowDown",
    3: "ArrowLeft",
  };

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "仅离线体验" }).click();
  await injectSave(page, terminal.snapshot, terminalRecordId, [olderRecord]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "继续标准 4×4" }).click();

  const beforeTerminal = await readGuestDatabaseState(page);
  expect(beforeTerminal).toMatchObject({
    clientRecordId: terminalRecordId,
    generation: 1,
    recordCount: 1,
    recordIds: [olderRecordId],
  });

  const board = page.locator("[data-game-board-root]");
  await board.focus();
  await page.keyboard.press(directionKey[terminal.direction]);
  const result = page.locator('[data-app-view="result"]');
  await expect(result).toBeVisible();
  await expect
    .poll(async () => (await readGuestDatabaseState(page)).recordCount)
    .toBe(2);

  const historyBeforeAgain = await readGuestDatabaseState(page);
  expect(historyBeforeAgain.recordIds).toEqual(
    [olderRecordId, terminalRecordId].sort(),
  );
  await result.locator('[data-action="result-again"]').click();

  await expect(page.locator('[data-app-view="game"]')).toBeVisible();
  await expect(result).toBeHidden();
  await expect
    .poll(async () => (await readGuestDatabaseState(page)).generation)
    .toBe(beforeTerminal.generation! + 1);
  const afterAgain = await readGuestDatabaseState(page);
  expect(afterAgain.clientRecordId).not.toBeNull();
  expect(afterAgain.clientRecordId).not.toBe(terminalRecordId);
  expect(afterAgain.clientRecordId).not.toBe(olderRecordId);
  expect(afterAgain.revision).toBe(0);
  expect(afterAgain.recordCount).toBe(historyBeforeAgain.recordCount);
  expect(afterAgain.recordIds).toEqual(historyBeforeAgain.recordIds);
  expect(evidence.businessRequests).toEqual([]);
  expect(evidence.externalRequests).toEqual([]);
  expect(evidence.consoleErrors).toEqual([]);
});

test("the first 2048 milestone stays non-blocking and the next swipe runs once", async ({
  page,
}) => {
  const evidence = observeNetwork(page);
  const milestone = createMilestonePreparation();
  const clientRecordId = "smoke-milestone-2048";

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "仅离线体验" }).click();
  await injectSave(page, milestone.snapshot, clientRecordId);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "继续标准 4×4" }).click();

  const board = page.locator("[data-game-board-root]");
  const milestoneStatus = page.locator("[data-game-milestone]");
  const result = page.locator('[data-app-view="result"]');
  expect((await readGuestDatabaseState(page)).revision).toBe(0);

  await swipeBoard(page, milestone.firstDirection);
  await expect
    .poll(async () => (await readGuestDatabaseState(page)).revision)
    .toBe(1);
  await expect
    .poll(() =>
      board.evaluate(
        (element) => element.getAnimations({ subtree: true }).length,
      ),
    )
    .toBe(0);
  await expect(milestoneStatus).toBeVisible();
  await expect(milestoneStatus).toHaveAttribute("role", "status");
  await expect(result).toBeHidden();
  await expect(page.locator("dialog[open]")).toHaveCount(0);

  await swipeBoard(page, milestone.secondDirection);
  await expect
    .poll(async () => (await readGuestDatabaseState(page)).revision)
    .toBe(2);
  await page.waitForTimeout(300);
  expect((await readGuestDatabaseState(page)).revision).toBe(2);
  await expect(milestoneStatus).toBeVisible();
  await expect(page.locator('[data-app-view="game"]')).toBeVisible();
  await expect(result).toBeHidden();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  expect(evidence.businessRequests).toEqual([]);
  expect(evidence.externalRequests).toEqual([]);
  expect(evidence.consoleErrors).toEqual([]);
});

test("locked modes stay behind local privacy and account gates without requests", async ({
  page,
}) => {
  const evidence = observeNetwork(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "仅离线体验" }).click();
  await page.getByRole("button", { name: "模式", exact: true }).click();
  await page.getByRole("button", { name: /经典 4×4/ }).click();
  const offlineGate = page.locator("[data-offline-gate]");
  await expect(offlineGate).toBeVisible();
  await page.locator("html").evaluate((element) => {
    element.style.fontSize = "200%";
  });
  const dialogMetrics = await offlineGate
    .locator(".dialog-plate")
    .evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      bottom: element.getBoundingClientRect().bottom,
    }));
  expect(dialogMetrics.clientHeight).toBeLessThanOrEqual(540);
  expect(dialogMetrics.scrollHeight).toBeGreaterThanOrEqual(
    dialogMetrics.clientHeight,
  );
  expect(dialogMetrics.bottom).toBeLessThanOrEqual(568);
  await page.getByRole("button", { name: "查看联网说明" }).click();
  await expect(page.getByRole("heading", { name: "开始之前" })).toBeVisible();
  await page.getByRole("button", { name: "预览联网入口" }).click();
  await expect(page.locator("[data-auth-gate]")).toBeVisible();
  await page.getByRole("button", { name: "保持游客身份" }).click();
  await expect(page.locator('[data-app-view="modes"]')).toBeVisible();
  expect(evidence.businessRequests).toEqual([]);
  expect(evidence.externalRequests).toEqual([]);
  expect(evidence.consoleErrors).toEqual([]);
});

test("restart is immediate before the first move and confirmed afterwards without history", async ({
  page,
}) => {
  const evidence = observeNetwork(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "仅离线体验" }).click();
  await page.getByRole("button", { name: "开始标准 4×4" }).click();
  const game = page.locator('[data-app-view="game"]');
  const restart = game.getByRole("button", { name: "重新开始" });
  const restartDialog = page.locator("[data-restart-dialog]");

  await restart.click();
  await expect(restartDialog).toBeHidden();
  await expect
    .poll(async () => (await readGuestDatabaseState(page)).generation)
    .toBe(2);

  const board = page.locator("[data-game-board-root]");
  const boardBox = await board.boundingBox();
  if (!boardBox) throw new Error("mobile_board_not_visible");
  const centerX = boardBox.x + boardBox.width / 2;
  const centerY = boardBox.y + boardBox.height / 2;
  const distance = boardBox.width * 0.3;
  const swipeDeltas = [
    [-distance, 0],
    [0, distance],
    [distance, 0],
    [0, -distance],
  ] as const;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const [deltaX, deltaY] = swipeDeltas[attempt % swipeDeltas.length];
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + deltaX, centerY + deltaY, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(220);
    if (((await readGuestDatabaseState(page)).revision ?? 0) >= 8) break;
  }
  expect((await readGuestDatabaseState(page)).revision).toBeGreaterThanOrEqual(
    8,
  );
  await page.waitForTimeout(350);
  const animationState = await board.evaluate((element) => ({
    finishedAnimations: element
      .getAnimations({ subtree: true })
      .filter((animation) => animation.playState === "finished").length,
    transforms: [...element.querySelectorAll<HTMLElement>("[data-board-tile]")]
      .filter((tile) => !tile.hidden)
      .map((tile) => {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(tile).transform);
        return {
          scaleX: matrix.a,
          scaleY: matrix.d,
          translateX: matrix.e,
          translateY: matrix.f,
        };
      }),
  }));
  expect(animationState.finishedAnimations).toBe(0);
  expect(animationState.transforms).not.toHaveLength(0);
  for (const transform of animationState.transforms) {
    expect(transform).toEqual({
      scaleX: 1,
      scaleY: 1,
      translateX: 0,
      translateY: 0,
    });
  }

  await restart.click();
  await expect(restartDialog).toBeVisible();
  await restartDialog.getByRole("button", { name: "取消" }).click();
  await expect(restartDialog).toBeHidden();
  expect((await readGuestDatabaseState(page)).generation).toBe(2);

  await restart.click();
  await restartDialog.getByRole("button", { name: "重新开始" }).click();
  await expect
    .poll(async () => (await readGuestDatabaseState(page)).generation)
    .toBe(3);
  expect((await readGuestDatabaseState(page)).recordCount).toBe(0);
  expect(evidence.businessRequests).toEqual([]);
  expect(evidence.externalRequests).toEqual([]);
  expect(evidence.consoleErrors).toEqual([]);
});
