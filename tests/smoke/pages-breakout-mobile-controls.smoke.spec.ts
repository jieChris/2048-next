import { expect, test } from "@playwright/test";

test.describe("Breakout easter egg mobile controls", () => {
  test("places mobile launch and movement controls below the game stage", async ({ page }) => {
    await page.setViewportSize({ width: 520, height: 1125 });
    await page.goto("/easter-eggs/breakout/index.html", { waitUntil: "domcontentloaded" });

    const stage = page.locator(".breakout-stage");
    const controls = page.locator(".breakout-mobile-controls");

    await expect(stage).toBeVisible();
    await expect(controls).toBeVisible();
    await expect(
      controls.getByRole("button", { name: /开始游戏|开始|发球|Start Game|Start|Launch/i })
    ).toBeVisible();

    const initialLayout = await page.evaluate(() => {
      const modalRect = document.querySelector(".breakout-modal")?.getBoundingClientRect();
      const stageRect = document.querySelector(".breakout-stage")?.getBoundingClientRect();
      const controlsRect = document
        .querySelector(".breakout-mobile-controls")
        ?.getBoundingClientRect();
      return {
        modalBottom: modalRect?.bottom ?? null,
        stageWidth: stageRect?.width ?? null,
        stageHeight: stageRect?.height ?? null,
        stageBottom: stageRect?.bottom ?? null,
        controlsTop: controlsRect?.top ?? null,
        controlsBottom: controlsRect?.bottom ?? null,
        viewportWidth: window.innerWidth
      };
    });

    expect(initialLayout.controlsTop).not.toBeNull();
    expect(initialLayout.stageBottom).not.toBeNull();
    expect(Number(initialLayout.stageWidth)).toBeGreaterThanOrEqual(
      initialLayout.viewportWidth - 32
    );
    expect(Number(initialLayout.stageHeight) / Number(initialLayout.stageWidth)).toBeCloseTo(
      1080 / 760,
      2
    );
    expect(Number(initialLayout.controlsTop)).toBeGreaterThanOrEqual(
      Number(initialLayout.stageBottom) + 4
    );
    expect(Number(initialLayout.modalBottom) - Number(initialLayout.controlsBottom)).toBeCloseTo(
      5,
      1
    );

    await page.locator(".breakout-start-screen .breakout-restart-btn").click();
    await expect(controls.getByRole("button", { name: /发球|Launch/i })).toBeVisible();
    await expect(page.locator(".breakout-serve-hint")).toBeHidden();

    const launchLayout = await page.evaluate(() => {
      const modalRect = document.querySelector(".breakout-modal")?.getBoundingClientRect();
      const stageRect = document.querySelector(".breakout-stage")?.getBoundingClientRect();
      const controlsRect = document
        .querySelector(".breakout-mobile-controls")
        ?.getBoundingClientRect();
      const levelRect = document.querySelector(".breakout-level")?.getBoundingClientRect();
      const shieldsRect = document.querySelector(".breakout-shields")?.getBoundingClientRect();
      const historyRect = document
        .querySelector(".breakout-hud .breakout-history-btn")
        ?.getBoundingClientRect();
      return {
        stageBottom: stageRect?.bottom ?? null,
        controlsTop: controlsRect?.top ?? null,
        controlsBottom: controlsRect?.bottom ?? null,
        modalBottom: modalRect?.bottom ?? null,
        levelRight: levelRect?.right ?? null,
        shieldsLeft: shieldsRect?.left ?? null,
        shieldsRight: shieldsRect?.right ?? null,
        historyLeft: historyRect?.left ?? null
      };
    });

    expect(launchLayout.controlsTop).not.toBeNull();
    expect(launchLayout.stageBottom).not.toBeNull();
    expect(Number(launchLayout.controlsTop)).toBeGreaterThanOrEqual(
      Number(launchLayout.stageBottom) + 4
    );
    expect(Number(launchLayout.modalBottom) - Number(launchLayout.controlsBottom)).toBeCloseTo(
      5,
      1
    );
    expect(Number(launchLayout.shieldsLeft)).toBeGreaterThanOrEqual(Number(launchLayout.levelRight));
    expect(Number(launchLayout.shieldsRight)).toBeLessThanOrEqual(Number(launchLayout.historyLeft));

    await controls.getByRole("button", { name: /发球|Launch/i }).click();
    await expect(controls.getByRole("button", { name: /向左移动|Move Left/i })).toBeVisible();
    await expect(controls.getByRole("button", { name: /向右移动|Move Right/i })).toBeVisible();

    const movementLayout = await page.evaluate(() => {
      const modalRect = document.querySelector(".breakout-modal")?.getBoundingClientRect();
      const stageRect = document.querySelector(".breakout-stage")?.getBoundingClientRect();
      const moveControlsRect = document
        .querySelector(".breakout-mobile-move-controls")
        ?.getBoundingClientRect();
      const leftButtonRect = document
        .querySelector(".breakout-mobile-move-btn.is-left")
        ?.getBoundingClientRect();
      const rightButtonRect = document
        .querySelector(".breakout-mobile-move-btn.is-right")
        ?.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const hitY = Math.min(viewportHeight - 10, ((stageRect?.bottom ?? 0) + viewportHeight) / 2);
      const leftTarget = document.elementFromPoint(viewportWidth * 0.25, hitY);
      const rightTarget = document.elementFromPoint(viewportWidth * 0.75, hitY);
      return {
        modalLeft: modalRect?.left ?? null,
        modalRight: modalRect?.right ?? null,
        stageBottom: stageRect?.bottom ?? null,
        moveControlsTop: moveControlsRect?.top ?? null,
        moveControlsBottom: moveControlsRect?.bottom ?? null,
        leftButtonLeft: leftButtonRect?.left ?? null,
        leftButtonRight: leftButtonRect?.right ?? null,
        rightButtonLeft: rightButtonRect?.left ?? null,
        rightButtonRight: rightButtonRect?.right ?? null,
        viewportWidth,
        viewportHeight,
        leftHitIsLeftButton: Boolean(leftTarget?.closest?.(".breakout-mobile-move-btn.is-left")),
        rightHitIsRightButton: Boolean(rightTarget?.closest?.(".breakout-mobile-move-btn.is-right"))
      };
    });

    expect(Number(movementLayout.modalLeft)).toBeCloseTo(0, 1);
    expect(Number(movementLayout.modalRight)).toBeCloseTo(movementLayout.viewportWidth, 1);
    expect(movementLayout.moveControlsTop).not.toBeNull();
    expect(movementLayout.moveControlsBottom).not.toBeNull();
    expect(Number(movementLayout.moveControlsTop)).toBeCloseTo(
      Number(movementLayout.stageBottom),
      1
    );
    expect(Number(movementLayout.moveControlsBottom)).toBeGreaterThanOrEqual(
      movementLayout.viewportHeight
    );
    expect(Number(movementLayout.leftButtonLeft)).toBeCloseTo(0, 1);
    expect(Number(movementLayout.leftButtonRight)).toBeCloseTo(movementLayout.viewportWidth / 2, 1);
    expect(Number(movementLayout.rightButtonLeft)).toBeCloseTo(movementLayout.viewportWidth / 2, 1);
    expect(Number(movementLayout.rightButtonRight)).toBeCloseTo(movementLayout.viewportWidth, 1);
    expect(movementLayout.leftHitIsLeftButton).toBe(true);
    expect(movementLayout.rightHitIsRightButton).toBe(true);
  });
});
