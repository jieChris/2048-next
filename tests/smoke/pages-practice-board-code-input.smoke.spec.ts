import { expect, type Page, test } from "@playwright/test";

async function openPracticeBoardCodePanel(page: Page): Promise<void> {
  const panel = page.locator("#practice-board-code-panel");
  const input = page.locator("#practice-board-code-input");
  const toggle = page.locator("#practice-board-code-btn");
  await expect(toggle).toHaveAttribute("aria-expanded", /^(true|false)$/);
  const isOpen = await panel
    .evaluate((element) => element.classList.contains("is-open"))
    .catch(() => false);

  if (!isOpen) {
    await toggle.click();
  }

  await expect(panel).toHaveClass(/is-open/);
  await expect(input).toBeVisible();
}

async function readAndDismissGameDialogAlert(page: Page): Promise<string> {
  await expect(page.locator("#game-dialog-overlay.is-open")).toBeVisible();
  const message = (await page.locator("#game-dialog-message").textContent())?.trim() || "";
  await page.locator("#game-dialog-confirm").click();
  await expect(page.locator("#game-dialog-overlay.is-open")).toBeHidden();
  return message;
}

test.describe("Legacy Multi-Page Smoke", () => {
  test("practice board code input applies a valid board payload", async ({ page }) => {
    const response = await page.goto("/Practice_board.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => Boolean((window as any).game_manager) && Boolean((window as any).Tile));

    await openPracticeBoardCodePanel(page);
    await page.fill("#practice-board-code-input", "1234000000000000");
    await page.click("#practice-board-code-confirm");

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const manager = (window as any).game_manager;
          if (!manager || !manager.grid || !manager.grid.cells) return null;
          const width = Number(manager.width) || 0;
          const height = Number(manager.height) || 0;
          const board: number[][] = [];
          for (let y = 0; y < height; y += 1) {
            const row: number[] = [];
            for (let x = 0; x < width; x += 1) {
              const tile = manager.grid.cells[x] ? manager.grid.cells[x][y] : null;
              row.push(tile ? Number(tile.value) || 0 : 0);
            }
            board.push(row);
          }
          return {
            width,
            height,
            board,
            codePanelOpen: Boolean(document.getElementById("practice-board-code-panel")?.classList.contains("is-open"))
          };
        });
      })
      .toEqual({
        width: 4,
        height: 4,
        board: [
          [2, 4, 8, 16],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        codePanelOpen: false
      });
  });

  test("practice board code input rejects invalid payloads without changing the board", async ({ page }) => {
    const response = await page.goto("/Practice_board.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => Boolean((window as any).game_manager) && Boolean((window as any).Tile));

    await openPracticeBoardCodePanel(page);
    await page.fill("#practice-board-code-input", "1234000000000000");
    await page.click("#practice-board-code-confirm");

    const baseline = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      if (!manager || !manager.grid || !manager.grid.cells) return null;
      const width = Number(manager.width) || 0;
      const height = Number(manager.height) || 0;
      const board: number[][] = [];
      for (let y = 0; y < height; y += 1) {
        const row: number[] = [];
        for (let x = 0; x < width; x += 1) {
          const tile = manager.grid.cells[x] ? manager.grid.cells[x][y] : null;
          row.push(tile ? Number(tile.value) || 0 : 0);
        }
        board.push(row);
      }
      return board;
    });
    expect(baseline).not.toBeNull();

    await openPracticeBoardCodePanel(page);
    await page.fill("#practice-board-code-input", "1234Z00000000000");

    await page.locator("#practice-board-code-confirm").click({ force: true });
    const dialogMessage = await readAndDismissGameDialogAlert(page);
    expect(dialogMessage.length).toBeGreaterThan(0);

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const manager = (window as any).game_manager;
          if (!manager || !manager.grid || !manager.grid.cells) return null;
          const width = Number(manager.width) || 0;
          const height = Number(manager.height) || 0;
          const board: number[][] = [];
          for (let y = 0; y < height; y += 1) {
            const row: number[] = [];
            for (let x = 0; x < width; x += 1) {
              const tile = manager.grid.cells[x] ? manager.grid.cells[x][y] : null;
              row.push(tile ? Number(tile.value) || 0 : 0);
            }
            board.push(row);
          }
          return board;
        });
      })
      .toEqual(baseline);
  });

  test("practice board code input maps 12/8 digits to 4x3/4x2 and updates background grid", async ({ page }) => {
    const response = await page.goto("/Practice_board.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => Boolean((window as any).game_manager) && Boolean((window as any).Tile));

    const applyCode = async (code: string) => {
      await openPracticeBoardCodePanel(page);
      await page.fill("#practice-board-code-input", code);
      await page.click("#practice-board-code-confirm");
      return expect
        .poll(async () => {
          return page.evaluate(() => {
            const manager = (window as any).game_manager;
            if (!manager || !manager.grid || !manager.grid.cells) return null;
            const width = Number(manager.width) || 0;
            const height = Number(manager.height) || 0;
            const board: number[][] = [];
            for (let y = 0; y < height; y += 1) {
              const row: number[] = [];
              for (let x = 0; x < width; x += 1) {
                const tile = manager.grid.cells[x] ? manager.grid.cells[x][y] : null;
                row.push(tile ? Number(tile.value) || 0 : 0);
              }
              board.push(row);
            }
            const rows = Array.from(document.querySelectorAll("#test-grid-container .grid-row"));
            const rowCellCounts = rows.map((row) => row.querySelectorAll(".grid-cell").length);
            return { width, height, board, backgroundRows: rows.length, rowCellCounts };
          });
        })
        .toBeTruthy();
    };

    await applyCode("123456789ABC");
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const manager = (window as any).game_manager;
          if (!manager || !manager.grid || !manager.grid.cells) return null;
          const rows = Array.from(document.querySelectorAll("#test-grid-container .grid-row"));
          const rowCellCounts = rows.map((row) => row.querySelectorAll(".grid-cell").length);
          const board: number[][] = [];
          for (let y = 0; y < manager.height; y += 1) {
            const row: number[] = [];
            for (let x = 0; x < manager.width; x += 1) {
              const tile = manager.grid.cells[x] ? manager.grid.cells[x][y] : null;
              row.push(tile ? Number(tile.value) || 0 : 0);
            }
            board.push(row);
          }
          return {
            width: Number(manager.width) || 0,
            height: Number(manager.height) || 0,
            board,
            backgroundRows: rows.length,
            rowCellCounts
          };
        });
      })
      .toEqual({
        width: 4,
        height: 3,
        board: [
          [2, 4, 8, 16],
          [32, 64, 128, 256],
          [512, 1024, 2048, 4096]
        ],
        backgroundRows: 3,
        rowCellCounts: [4, 4, 4]
      });

    await applyCode("12345678");
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const manager = (window as any).game_manager;
          if (!manager || !manager.grid || !manager.grid.cells) return null;
          const rows = Array.from(document.querySelectorAll("#test-grid-container .grid-row"));
          const rowCellCounts = rows.map((row) => row.querySelectorAll(".grid-cell").length);
          const board: number[][] = [];
          for (let y = 0; y < manager.height; y += 1) {
            const row: number[] = [];
            for (let x = 0; x < manager.width; x += 1) {
              const tile = manager.grid.cells[x] ? manager.grid.cells[x][y] : null;
              row.push(tile ? Number(tile.value) || 0 : 0);
            }
            board.push(row);
          }
          return {
            width: Number(manager.width) || 0,
            height: Number(manager.height) || 0,
            board,
            backgroundRows: rows.length,
            rowCellCounts
          };
        });
      })
      .toEqual({
        width: 4,
        height: 2,
        board: [
          [2, 4, 8, 16],
          [32, 64, 128, 256]
        ],
        backgroundRows: 2,
        rowCellCounts: [4, 4]
      });
  });

  test("practice board code input does not trigger game hotkeys while typing", async ({ page }) => {
    const response = await page.goto("/Practice_board.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => Boolean((window as any).game_manager) && Boolean((window as any).Tile));

    await openPracticeBoardCodePanel(page);
    await page.fill("#practice-board-code-input", "1100000000000000");
    await page.click("#practice-board-code-confirm");

    const before = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      if (!manager || !manager.grid || !manager.grid.cells) return null;
      const width = Number(manager.width) || 0;
      const height = Number(manager.height) || 0;
      const board: number[][] = [];
      for (let y = 0; y < height; y += 1) {
        const row: number[] = [];
        for (let x = 0; x < width; x += 1) {
          const tile = manager.grid.cells[x] ? manager.grid.cells[x][y] : null;
          row.push(tile ? Number(tile.value) || 0 : 0);
        }
        board.push(row);
      }
      return board;
    });
    expect(before).not.toBeNull();

    await openPracticeBoardCodePanel(page);
    await page.click("#practice-board-code-input");
    await page.fill("#practice-board-code-input", "");
    await page.keyboard.type("13AD");
    await page.keyboard.press("Backspace");

    const snapshot = await page.evaluate(() => {
      const input = document.getElementById("practice-board-code-input") as HTMLInputElement | null;
      const manager = (window as any).game_manager;
      if (!manager || !manager.grid || !manager.grid.cells) {
        return { value: input?.value || "", board: null };
      }
      const width = Number(manager.width) || 0;
      const height = Number(manager.height) || 0;
      const board: number[][] = [];
      for (let y = 0; y < height; y += 1) {
        const row: number[] = [];
        for (let x = 0; x < width; x += 1) {
          const tile = manager.grid.cells[x] ? manager.grid.cells[x][y] : null;
          row.push(tile ? Number(tile.value) || 0 : 0);
        }
        board.push(row);
      }
      return { value: input?.value || "", board };
    });

    expect(snapshot.value).toBe("13A");
    expect(snapshot.board).toEqual(before);
  });

  test("practice board code input rejects tiles above capped mode limit", async ({ page }) => {
    const response = await page.goto("/Practice_board.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(
      () =>
        Boolean((window as any).game_manager) &&
        typeof (window as any).game_manager.restartWithBoard === "function" &&
        document.getElementById("practice-mode-picker-btn") !== null &&
        document.querySelectorAll("#practice-mode-list [data-practice-mode-key]").length > 0
    );

    await page.click("#practice-mode-picker-btn");
    await expect(page.locator("#practice-mode-panel")).toHaveClass(/is-open/);
    await page.click('[data-practice-mode-key="capped_4x4_pow2_64_no_undo"]');
    await expect(page.locator("#practice-mode-panel")).not.toHaveClass(/is-open/);

    const baseline = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      if (!manager || !manager.grid || !manager.grid.cells) return null;
      const width = Number(manager.width) || 0;
      const height = Number(manager.height) || 0;
      const board: number[][] = [];
      for (let y = 0; y < height; y += 1) {
        const row: number[] = [];
        for (let x = 0; x < width; x += 1) {
          const tile = manager.grid.cells[x] ? manager.grid.cells[x][y] : null;
          row.push(tile ? Number(tile.value) || 0 : 0);
        }
        board.push(row);
      }
      return board;
    });
    expect(baseline).not.toBeNull();

    await openPracticeBoardCodePanel(page);
    await page.fill("#practice-board-code-input", "7000000000000000");

    await page.locator("#practice-board-code-confirm").click({ force: true });
    const dialogMessage = await readAndDismissGameDialogAlert(page);
    expect(dialogMessage).toContain("64");

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const manager = (window as any).game_manager;
          if (!manager || !manager.grid || !manager.grid.cells) return null;
          const width = Number(manager.width) || 0;
          const height = Number(manager.height) || 0;
          const board: number[][] = [];
          for (let y = 0; y < height; y += 1) {
            const row: number[] = [];
            for (let x = 0; x < width; x += 1) {
              const tile = manager.grid.cells[x] ? manager.grid.cells[x][y] : null;
              row.push(tile ? Number(tile.value) || 0 : 0);
            }
            board.push(row);
          }
          return board;
        });
      })
      .toEqual(baseline);
  });

  test("practice board centers tools and pages tile choices by board limit", async ({ page }) => {
    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();

    await page.waitForFunction(
      () =>
        Boolean((window as any).game_manager) &&
        document.querySelectorAll("#practice-mode-list [data-practice-mode-key]").length > 0
    );

    const toolCenterDelta = await page.evaluate(() => {
      const panel = document.querySelector(".dashboard-stats")?.getBoundingClientRect();
      const buttons = Array.from(
        document.querySelectorAll<HTMLElement>("#practice-stats-actions .top-action-btn")
      ).filter((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (!panel || buttons.length === 0) return null;
      const rects = buttons.map((button) => button.getBoundingClientRect());
      const left = Math.min(...rects.map((rect) => rect.left));
      const right = Math.max(...rects.map((rect) => rect.right));
      const top = Math.min(...rects.map((rect) => rect.top));
      const bottom = Math.max(...rects.map((rect) => rect.bottom));
      return {
        x: Math.abs((left + right) / 2 - (panel.left + panel.right) / 2),
        y: Math.abs((top + bottom) / 2 - (panel.top + panel.bottom) / 2)
      };
    });
    expect(toolCenterDelta).not.toBeNull();
    expect(toolCenterDelta?.x).toBeLessThanOrEqual(1);
    expect(toolCenterDelta?.y).toBeLessThanOrEqual(1);
    await expect(page.locator(".game-explanation")).toHaveCount(0);
    await expect(page.locator("#selection-grid .selection-tile")).toHaveCount(16);
    await expect(page.locator("#selection-pager")).toBeHidden();

    const chooseMode = async (modeKey: string) => {
      await page.locator("#practice-mode-picker-btn").click();
      await page.locator(`[data-practice-mode-key="${modeKey}"]`).click();
      await expect(page.locator("#practice-mode-picker-btn")).toHaveAttribute(
        "data-active-practice-mode-key",
        modeKey
      );
    };

    await chooseMode("board_2x4_pow2_no_undo");
    await expect(page.locator("#selection-grid .selection-tile")).toHaveCount(10);
    expect(await page.locator("#selection-grid .selection-tile").allTextContents()).toEqual([
      "0", "2", "4", "8", "16", "32", "64", "128", "256", "512"
    ]);
    await expect(page.locator("#selection-pager")).toBeHidden();

    await chooseMode("board_5x5_pow2_no_undo");
    await expect(page.locator("#selection-page-status")).toHaveText("1 / 2");
    expect(await page.locator("#selection-grid .selection-tile").allTextContents()).toEqual([
      "0", "2", "4", "8", "16", "32", "64", "128",
      "256", "512", "1024", "2048", "4096", "8192", "16384", "32768"
    ]);

    await page.locator("#selection-page-next").click();
    await expect(page.locator("#selection-page-status")).toHaveText("2 / 2");
    expect(await page.locator("#selection-grid .selection-tile").allTextContents()).toEqual([
      "65536", "131072", "262144", "524288", "1048576", "2097152",
      "4194304", "8388608", "16777216", "33554432", "67108864"
    ]);
    await expect(page.locator("#selection-grid .selection-tile.tile-super")).toHaveCount(10);

    for (const fibonacciMode of [
      { modeKey: "fib_4x2_no_undo", maxTile: "1597" },
      { modeKey: "fib_3x3_no_undo", maxTile: "4181" },
      { modeKey: "fib_4x3_no_undo", maxTile: "75025" },
      { modeKey: "fib_4x4_no_undo", maxTile: "2178309" }
    ]) {
      await chooseMode(fibonacciMode.modeKey);
      await expect(page.locator("#selection-page-status")).toHaveText("1 / 2");
      await page.locator("#selection-page-next").click();
      await expect(page.locator("#selection-grid .selection-tile").last()).toHaveText(
        fibonacciMode.maxTile
      );
    }
    await expect(page.locator('.selection-tile[data-value="3524578"]')).toHaveCount(0);
    expect(
      await page.locator("#selection-grid .selection-tile").last().evaluate((tile) => {
        const label = tile.querySelector<HTMLElement>(".tile-inner");
        return Boolean(label && label.scrollWidth <= label.clientWidth);
      })
    ).toBe(true);
  });
});
