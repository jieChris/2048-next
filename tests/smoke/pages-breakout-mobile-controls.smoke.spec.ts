import { expect, test } from "@playwright/test";

test.describe("Breakout easter egg mobile controls", () => {
  test("places mobile launch and movement controls below the game stage", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/easter-eggs/breakout/index.html", { waitUntil: "domcontentloaded" });

    const stage = page.locator(".breakout-stage");
    const controls = page.locator(".breakout-mobile-controls");

    await expect(stage).toBeVisible();
    await expect(controls).toBeVisible();
    await expect(
      controls.getByRole("button", { name: /开始游戏|开始|发球|Start Game|Start|Launch/i })
    ).toBeVisible();

    const initialLayout = await page.evaluate(() => {
      const stageRect = document.querySelector(".breakout-stage")?.getBoundingClientRect();
      const controlsRect = document
        .querySelector(".breakout-mobile-controls")
        ?.getBoundingClientRect();
      return {
        stageBottom: stageRect?.bottom ?? null,
        controlsTop: controlsRect?.top ?? null
      };
    });

    expect(initialLayout.controlsTop).not.toBeNull();
    expect(initialLayout.stageBottom).not.toBeNull();
    expect(Number(initialLayout.controlsTop)).toBeGreaterThanOrEqual(
      Number(initialLayout.stageBottom) + 8
    );

    await page.locator(".breakout-start-screen .breakout-restart-btn").click();
    await expect(controls.getByRole("button", { name: /发球|Launch/i })).toBeVisible();

    const launchLayout = await page.evaluate(() => {
      const stageRect = document.querySelector(".breakout-stage")?.getBoundingClientRect();
      const controlsRect = document
        .querySelector(".breakout-mobile-controls")
        ?.getBoundingClientRect();
      return {
        stageBottom: stageRect?.bottom ?? null,
        controlsTop: controlsRect?.top ?? null
      };
    });

    expect(launchLayout.controlsTop).not.toBeNull();
    expect(launchLayout.stageBottom).not.toBeNull();
    expect(Number(launchLayout.controlsTop)).toBeGreaterThanOrEqual(
      Number(launchLayout.stageBottom) + 8
    );

    await controls.getByRole("button", { name: /发球|Launch/i }).click();
    await expect(controls.getByRole("button", { name: /向左移动|Move Left/i })).toBeVisible();
    await expect(controls.getByRole("button", { name: /向右移动|Move Right/i })).toBeVisible();

    const movementLayout = await page.evaluate(() => {
      const stageRect = document.querySelector(".breakout-stage")?.getBoundingClientRect();
      const controlsRect = document
        .querySelector(".breakout-mobile-controls")
        ?.getBoundingClientRect();
      return {
        stageBottom: stageRect?.bottom ?? null,
        controlsTop: controlsRect?.top ?? null
      };
    });

    expect(movementLayout.controlsTop).not.toBeNull();
    expect(movementLayout.stageBottom).not.toBeNull();
    expect(Number(movementLayout.controlsTop)).toBeGreaterThanOrEqual(
      Number(movementLayout.stageBottom) + 8
    );
  });
});
