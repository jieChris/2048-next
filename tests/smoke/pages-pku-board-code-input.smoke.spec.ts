import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("PKU2048 supports board code input modal without breaking board reset flow", async ({
    page
  }) => {
    const response = await page.goto("/PKU2048.html?practice_guide_seen=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "PKU2048 response should exist").not.toBeNull();
    expect(response?.ok(), "PKU2048 response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => Boolean((window as any).game_manager) && Boolean((window as any).Tile));
    await expect(page.locator("#practice-board-code-btn")).toBeVisible();

    await page.click("#practice-board-code-btn");
    await expect(page.locator("#practice-board-code-panel")).toHaveClass(/is-open/);
    await page.fill("#practice-board-code-input", "1234000000000000");
    await page.click("#practice-board-code-confirm");
    await expect(page.locator("#practice-board-code-panel")).not.toHaveClass(/is-open/);

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
          return { width, height, board };
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
        ]
      });
  });
});
