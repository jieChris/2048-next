import { expect, type Page, test } from "@playwright/test";

async function openPracticeBoardCodePanel(page: Page): Promise<void> {
  const panel = page.locator("#practice-board-code-panel");
  const input = page.locator("#practice-board-code-input");
  const isOpen = await panel
    .evaluate((element) => element.classList.contains("is-open"))
    .catch(() => false);

  if (!isOpen) {
    await page.locator("#practice-board-code-btn").click();
  }

  await expect(panel).toHaveClass(/is-open/);
  await expect(input).toBeVisible();
}

test.describe("Legacy Multi-Page Smoke", () => {
  test("practice board code input applies a valid board payload", async ({ page }) => {
    const response = await page.goto("/Practice_board.html?practice_guide_seen=1", {
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
    const response = await page.goto("/Practice_board.html?practice_guide_seen=1", {
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

    let dialogMessage = "";
    page.once("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    await page.locator("#practice-board-code-confirm").click({ force: true });
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
    const response = await page.goto("/Practice_board.html?practice_guide_seen=1", {
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
    const response = await page.goto("/Practice_board.html?practice_guide_seen=1", {
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
    const response = await page.goto("/Practice_board.html?practice_guide_seen=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(
      () =>
        Boolean((window as any).game_manager) &&
        typeof (window as any).game_manager.restartWithBoard === "function" &&
        document.getElementById("practice-mode-picker-btn") !== null
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

    let dialogMessage = "";
    page.once("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    await page.locator("#practice-board-code-confirm").click({ force: true });
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
});
