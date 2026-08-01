import { expect, test } from "@playwright/test";

test("404 playground submits the hidden lost-page achievement event", async ({
  page,
}) => {
  let requestBody: unknown = null;
  let authHeader = "";
  await page.addInitScript(() => {
    localStorage.setItem("2048_auth_token_v1", "smoke-token");
  });
  await page.route("**/api/user/me/achievement-events", async (route) => {
    requestBody = route.request().postDataJSON();
    authHeader = route.request().headers().authorization || "";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        newly_granted: true,
        data: {
          achievement: {
            id: "lost_page_visited",
            name: "你也曾迷路",
            description: "你也曾迷路，但好在你又回来了。",
            series_id: "community-lost-page",
            rules: [
              {
                type: "manual_grant",
                params: { hidden: true, no_level: true },
              },
            ],
          },
        },
      }),
    });
  });

  await page.goto("/404.html", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".unlock-toast-title")).toHaveText("隐藏成就");
  await expect(page.locator(".unlock-toast-name")).toHaveText("你也曾迷路");
  expect(requestBody).toEqual({ event_id: "lost_page_visited" });
  expect(authHeader).toBe("Bearer smoke-token");
});

test("404 playground drags matching tiles together and resets", async ({
  page,
}) => {
  const response = await page.goto("/404.html", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator(".play-tile")).toHaveCount(10);
  await expect(page.locator("#scatter-button")).toBeVisible();
  await expect(page.locator("#maze")).toHaveCount(0);
  await expect(page.locator(".controls-note, #playground-status")).toHaveCount(0);

  const initialSnapshot = await page.locator(".play-tile").evaluateAll((tiles) =>
    tiles.map((tile) => ({
      value: tile.getAttribute("data-value"),
      position: tile.getAttribute("style"),
    })),
  );
  const firstPairValue = await page.locator(".play-tile").evaluateAll((tiles) => {
    const values = tiles.map((tile) => tile.getAttribute("data-value"));
    return values.find((value, index) => values.indexOf(value) !== index);
  });
  const firstPair = page.locator(`[data-value="${firstPairValue}"]`);
  const source = firstPair.nth(0);
  const target = firstPair.nth(1);
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Expected draggable 404 tiles");
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 6 },
  );
  await page.mouse.up();

  await expect(page.locator(".play-tile")).toHaveCount(10);
  const firstDrop = page.locator('[data-tile-id="11"]');
  await expect(firstDrop).toHaveCount(1);
  expect(Number(await firstDrop.getAttribute("data-value"))).toBeLessThanOrEqual(
    64,
  );
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState === "finished"),
  );
  expect(
    await page.locator('[data-tile-id="11"]').evaluate((spawned) => {
      const first = spawned.getBoundingClientRect();
      return [...document.querySelectorAll<HTMLElement>(".play-tile")]
        .filter((tile) => tile !== spawned)
        .every((tile) => {
          const second = tile.getBoundingClientRect();
          return (
            Math.min(first.right, second.right) <=
              Math.max(first.left, second.left) ||
            Math.min(first.bottom, second.bottom) <=
              Math.max(first.top, second.top)
          );
        });
    }),
  ).toBe(true);

  const secondPairValue = await page.locator(".play-tile").evaluateAll((tiles) => {
    const values = tiles.map((tile) => tile.getAttribute("data-value"));
    return values.find((value, index) => values.indexOf(value) !== index);
  });
  const secondPair = page.locator(`[data-value="${secondPairValue}"]`);
  const secondSourceBox = await secondPair.nth(0).boundingBox();
  const secondTargetBox = await secondPair.nth(1).boundingBox();
  if (!secondSourceBox || !secondTargetBox)
    throw new Error("Expected another mergeable pair");
  await page.mouse.move(
    secondSourceBox.x + secondSourceBox.width / 2,
    secondSourceBox.y + secondSourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    secondTargetBox.x + secondTargetBox.width / 2,
    secondTargetBox.y + secondTargetBox.height / 2,
    { steps: 6 },
  );
  await page.mouse.up();
  await expect(page.locator(".play-tile")).toHaveCount(10);
  const secondDrop = page.locator('[data-tile-id="12"]');
  await expect(secondDrop).toHaveCount(1);
  expect(Number(await secondDrop.getAttribute("data-value"))).toBeLessThanOrEqual(
    64,
  );
  expect(
    await page.locator(".play-tile").evaluateAll((tiles) => {
      const values = tiles.map((tile) => tile.getAttribute("data-value"));
      return values.some((value, index) => values.indexOf(value) !== index);
    }),
  ).toBe(true);
  await page.locator("#scatter-button").click();
  await expect(page.locator(".play-tile")).toHaveCount(10);
  expect(
    await page.locator(".play-tile").evaluateAll((tiles) =>
      tiles.map((tile) => ({
        value: tile.getAttribute("data-value"),
        position: tile.getAttribute("style"),
      })),
    ),
  ).not.toEqual(initialSnapshot);
});

test("404 playground supports keyboard movement without merging unequal tiles", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/404.html", { waitUntil: "domcontentloaded" });
  const tile = page.locator('[data-tile-id="1"]');
  const before = await tile.getAttribute("style");
  await tile.focus();
  await page.keyboard.press("ArrowRight");
  expect(await tile.getAttribute("style")).not.toBe(before);
  await expect(page.locator(".play-tile")).toHaveCount(10);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
