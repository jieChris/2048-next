import { expect, test, type Page } from "@playwright/test";

async function readAppLayout(page: Page) {
  return page.evaluate(() => {
    const activeView = document.querySelector<HTMLElement>(
      ".app-view:not([hidden])",
    );
    const shell = document.querySelector<HTMLElement>("[data-app-shell]");
    const stage = document.querySelector<HTMLElement>("[data-app-stage]");
    const nav = document.querySelector<HTMLElement>("[data-app-bottom-nav]");
    if (!activeView || !shell || !stage || !nav) {
      throw new Error("mobile app layout is incomplete");
    }
    const bounds = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    };

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      windowScrollY: window.scrollY,
      root: {
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      body: {
        clientHeight: document.body.clientHeight,
        scrollHeight: document.body.scrollHeight,
      },
      shell: bounds(shell),
      stage: bounds(stage),
      view: {
        ...bounds(activeView),
        clientHeight: activeView.clientHeight,
        scrollHeight: activeView.scrollHeight,
        scrollTop: activeView.scrollTop,
        overflowY: getComputedStyle(activeView).overflowY,
      },
      nav: { ...bounds(nav), hidden: nav.hidden },
    };
  });
}

function expectAppConfinedToViewport(
  layout: Awaited<ReturnType<typeof readAppLayout>>,
  withBottomNav: boolean,
) {
  expect(layout.windowScrollY).toBe(0);
  expect(layout.root.scrollWidth).toBe(layout.root.clientWidth);
  expect(layout.root.scrollHeight).toBe(layout.root.clientHeight);
  expect(layout.body.scrollHeight).toBe(layout.body.clientHeight);
  expect(Math.abs(layout.shell.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(layout.shell.left)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(layout.shell.right - layout.viewport.width),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(layout.shell.bottom - layout.viewport.height),
  ).toBeLessThanOrEqual(1);
  expect(layout.view.overflowY).toBe("auto");
  expect(layout.view.top).toBeGreaterThanOrEqual(layout.shell.top - 1);

  if (withBottomNav) {
    expect(layout.nav.hidden).toBe(false);
    expect(layout.nav.top).toBeGreaterThanOrEqual(0);
    expect(layout.nav.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
    expect(Math.abs(layout.stage.bottom - layout.nav.top)).toBeLessThanOrEqual(
      1,
    );
    expect(layout.view.bottom).toBeLessThanOrEqual(layout.nav.top + 1);
  } else {
    expect(layout.nav.hidden).toBe(true);
    expect(layout.view.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
  }
}

test("offline privacy choice opens the empty mobile home without business requests", async ({
  page,
}) => {
  const businessRequests: string[] = [];
  const externalRequests: string[] = [];
  const consoleErrors: string[] = [];

  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    const resourceType = request.resourceType();
    if (requestUrl.hostname !== "127.0.0.1") {
      externalRequests.push(request.url());
    }
    if (
      resourceType === "fetch" ||
      resourceType === "xhr" ||
      resourceType === "websocket" ||
      requestUrl.pathname.startsWith("/api/")
    ) {
      businessRequests.push(request.url());
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.setViewportSize({ width: 320, height: 720 });
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "开始之前" })).toBeVisible();
  await expect(page.locator("[data-app-bottom-nav]")).toBeHidden();
  await expect(page.locator("[data-app-shell]")).toHaveAttribute(
    "data-network-mode",
    "undecided",
  );

  await page.getByRole("button", { name: "仅离线体验" }).click();

  await expect(
    page.getByRole("heading", { name: "今天继续一局" }),
  ).toBeVisible();
  await expect(page.getByText("仅离线", { exact: true })).toBeVisible();
  await expect(page.locator("[data-app-bottom-nav] button")).toHaveCount(4);
  await expect(page.locator("[data-app-shell]")).toHaveAttribute(
    "data-network-mode",
    "offline",
  );

  const previewRecord = await page.evaluate(() => {
    const raw = window.localStorage.getItem("2048-next.app.preview-privacy-v1");
    return raw ? (JSON.parse(raw) as unknown) : null;
  });
  expect(previewRecord).toMatchObject({
    schema: 1,
    choice: "offline",
    policyVersion: "unapproved-draft",
  });
  expect(previewRecord).toHaveProperty("decidedAt", expect.any(Number));
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem("2048-next.app.privacy"),
    ),
  ).toBeNull();

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(businessRequests).toEqual([]);
  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "今天继续一局" }),
  ).toBeVisible();
  expect(businessRequests).toEqual([]);
  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("320 by 568 keeps top pages and game inside app-owned scroll containers", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "仅离线体验" }).click();

  const home = page.locator('[data-app-view="home"]');
  let layout = await readAppLayout(page);
  expectAppConfinedToViewport(layout, true);
  expect(layout.view.scrollHeight).toBeGreaterThan(layout.view.clientHeight);
  await home.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(await home.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    0,
  );
  expectAppConfinedToViewport(await readAppLayout(page), true);

  for (const route of ["modes", "records", "me"] as const) {
    await page.locator(`[data-app-bottom-nav] [data-nav="${route}"]`).click();
    const view = page.locator(`[data-app-view="${route}"]`);
    await expect(view).toBeVisible();
    expect(await view.evaluate((element) => element.scrollTop)).toBe(0);
    expectAppConfinedToViewport(await readAppLayout(page), true);
  }

  await page.locator('[data-app-bottom-nav] [data-nav="modes"]').click();
  const modes = page.locator('[data-app-view="modes"]');
  layout = await readAppLayout(page);
  expect(layout.view.scrollHeight).toBeGreaterThan(layout.view.clientHeight);
  await modes.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(await modes.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    0,
  );
  expectAppConfinedToViewport(await readAppLayout(page), true);

  await page.locator('[data-mode="standard_4x4_pow2_no_undo"]').click();
  const game = page.locator('[data-app-view="game"]');
  await expect(game).toBeVisible();
  expect(await game.evaluate((element) => element.scrollTop)).toBe(0);
  expectAppConfinedToViewport(await readAppLayout(page), false);

  const actions = game.locator(".game-actions button");
  await actions.last().scrollIntoViewIfNeeded();
  const actionBoxes = await actions.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
      };
    }),
  );
  expect(actionBoxes).toHaveLength(2);
  expect(Math.abs(actionBoxes[0].top - actionBoxes[1].top)).toBeLessThanOrEqual(
    1,
  );
  expect(actionBoxes[0].right).toBeLessThanOrEqual(actionBoxes[1].left + 1);
  expectAppConfinedToViewport(await readAppLayout(page), false);
});

test("English 200 percent text keeps navigation, readouts, and game actions uncut", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ["en-US"],
    });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.getByRole("button", { name: "Continue offline" }).click();

  expectAppConfinedToViewport(await readAppLayout(page), true);
  const navItems = await page
    .locator("[data-app-bottom-nav] button")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const label = element.lastElementChild as HTMLElement;
        const buttonRect = element.getBoundingClientRect();
        const labelRect = label.getBoundingClientRect();
        return {
          text: label.textContent?.trim(),
          button: {
            top: buttonRect.top,
            right: buttonRect.right,
            bottom: buttonRect.bottom,
            left: buttonRect.left,
          },
          label: {
            top: labelRect.top,
            right: labelRect.right,
            bottom: labelRect.bottom,
            left: labelRect.left,
            clientWidth: label.clientWidth,
            scrollWidth: label.scrollWidth,
          },
        };
      }),
    );
  expect(navItems.map((item) => item.text)).toEqual([
    "Home",
    "Modes",
    "Records",
    "Me",
  ]);
  for (const item of navItems) {
    expect(item.label.left).toBeGreaterThanOrEqual(item.button.left - 1);
    expect(item.label.right).toBeLessThanOrEqual(item.button.right + 1);
    expect(item.label.top).toBeGreaterThanOrEqual(item.button.top - 1);
    expect(item.label.bottom).toBeLessThanOrEqual(item.button.bottom + 1);
    expect(item.label.scrollWidth).toBeLessThanOrEqual(
      item.label.clientWidth + 1,
    );
  }

  const home = page.locator('[data-app-view="home"]');
  await home.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(await home.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    0,
  );
  expectAppConfinedToViewport(await readAppLayout(page), true);

  await page.locator('[data-app-bottom-nav] [data-nav="modes"]').click();
  const modes = page.locator('[data-app-view="modes"]');
  await expect(modes).toBeVisible();
  expect(await modes.evaluate((element) => element.scrollTop)).toBe(0);
  const modesLayout = await readAppLayout(page);
  expectAppConfinedToViewport(modesLayout, true);
  expect(modesLayout.view.scrollHeight).toBeGreaterThan(
    modesLayout.view.clientHeight,
  );

  await page.locator('[data-mode="standard_4x4_pow2_no_undo"]').click();
  const game = page.locator('[data-app-view="game"]');
  await expect(game).toBeVisible();
  expect(await game.evaluate((element) => element.scrollTop)).toBe(0);
  expectAppConfinedToViewport(await readAppLayout(page), false);

  const taskBar = await game.locator(".task-bar").boundingBox();
  expect(taskBar).not.toBeNull();
  if (taskBar) {
    expect(taskBar.y).toBeGreaterThanOrEqual(0);
    expect(taskBar.y + taskBar.height).toBeLessThanOrEqual(568);
  }

  const readouts = await game
    .locator(".game-readouts .readout")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        const children = Array.from(element.children, (child) => {
          const childElement = child as HTMLElement;
          return {
            text: childElement.textContent?.trim(),
            clientWidth: childElement.clientWidth,
            scrollWidth: childElement.scrollWidth,
          };
        });
        return { top: rect.top, bottom: rect.bottom, children };
      }),
    );
  expect(readouts.map((readout) => readout.children[0].text)).toEqual([
    "Score",
    "Best tile",
    "Time",
  ]);
  expect(readouts).toHaveLength(3);
  expect(readouts[0].bottom).toBeLessThanOrEqual(readouts[1].top + 1);
  expect(readouts[1].bottom).toBeLessThanOrEqual(readouts[2].top + 1);
  for (const readout of readouts) {
    for (const child of readout.children) {
      expect(child.scrollWidth).toBeLessThanOrEqual(child.clientWidth + 1);
    }
  }

  const actions = game.locator(".game-actions button");
  await actions.last().scrollIntoViewIfNeeded();
  const actionGeometry = await actions.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        text: element.textContent?.trim(),
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        clientWidth: (element as HTMLElement).clientWidth,
        scrollWidth: (element as HTMLElement).scrollWidth,
        clientHeight: (element as HTMLElement).clientHeight,
        scrollHeight: (element as HTMLElement).scrollHeight,
      };
    }),
  );
  expect(actionGeometry.map((action) => action.text)).toEqual([
    "Restart",
    "View leaderboard",
  ]);
  expect(actionGeometry[0].bottom).toBeLessThanOrEqual(
    actionGeometry[1].top + 1,
  );
  for (const action of actionGeometry) {
    expect(action.left).toBeGreaterThanOrEqual(0);
    expect(action.right).toBeLessThanOrEqual(320);
    expect(action.top).toBeGreaterThanOrEqual(0);
    expect(action.bottom).toBeLessThanOrEqual(568);
    expect(action.scrollWidth).toBeLessThanOrEqual(action.clientWidth + 1);
    expect(action.scrollHeight).toBeLessThanOrEqual(action.clientHeight + 1);
  }
  expectAppConfinedToViewport(await readAppLayout(page), false);

  await game.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(game.locator(".task-bar")).toBeInViewport();
  expectAppConfinedToViewport(await readAppLayout(page), false);
});

test("system theme follows live light and dark preferences", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const darkBackground = await page
    .locator("html")
    .evaluate((element) =>
      getComputedStyle(element)
        .getPropertyValue("--color-app-background")
        .trim(),
    );

  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const lightBackground = await page
    .locator("html")
    .evaluate((element) =>
      getComputedStyle(element)
        .getPropertyValue("--color-app-background")
        .trim(),
    );

  expect(darkBackground).not.toBe("");
  expect(lightBackground).not.toBe("");
  expect(darkBackground).not.toBe(lightBackground);
});

test("dialog actions remain reachable at 320dp with 200 percent text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ["en-US"],
    });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.getByRole("button", { name: "Continue offline" }).click();
  await page.locator('[data-app-bottom-nav] [data-nav="modes"]').click();
  await page.getByRole("button", { name: /Classic 4×4/ }).click();

  const dialog = page.locator("[data-offline-gate]");
  const plate = dialog.locator(".dialog-plate");
  await expect(dialog).toBeVisible();
  expect(
    await plate.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  await plate.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  const action = dialog.getByRole("button", { name: "Review online access" });
  await expect(action).toBeInViewport();
  const bounds = await Promise.all([
    dialog.boundingBox(),
    action.boundingBox(),
  ]);
  expect(bounds[0]).not.toBeNull();
  expect(bounds[1]).not.toBeNull();
  if (bounds[0] && bounds[1]) {
    expect(bounds[1].y).toBeGreaterThanOrEqual(bounds[0].y);
    expect(bounds[1].y + bounds[1].height).toBeLessThanOrEqual(
      bounds[0].y + bounds[0].height,
    );
  }

  await page.evaluate(() => {
    document
      .querySelector<HTMLDialogElement>("[data-offline-gate]")
      ?.close();
    document
      .querySelector<HTMLDialogElement>("[data-pending-terminal-dialog]")
      ?.showModal();
  });
  const pendingTerminal = page.locator("[data-pending-terminal-dialog]");
  await expect(pendingTerminal).toBeVisible();
  await pendingTerminal.locator(".dialog-plate").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    pendingTerminal.getByRole("button", { name: "Finish and save" }),
  ).toBeInViewport();
});

test("auth task pages stay inside the 320dp short-screen scroll container", async ({
  page,
}) => {
  const businessRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      request.resourceType() === "fetch" ||
      request.resourceType() === "xhr" ||
      request.resourceType() === "websocket" ||
      url.pathname.startsWith("/api/")
    ) {
      businessRequests.push(request.url());
    }
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "仅离线体验" }).click();
  await page.locator('[data-app-bottom-nav] [data-nav="modes"]').click();
  await page.locator('[data-mode="classic_4x4_pow2_undo"]').click();
  await page.getByRole("button", { name: "查看联网说明" }).click();
  await page.getByRole("button", { name: "预览联网入口" }).click();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });

  const login = page.locator('[data-app-view="auth-login"]');
  await expect(login).toBeVisible();
  let layout = await readAppLayout(page);
  expectAppConfinedToViewport(layout, false);
  expect(layout.view.scrollHeight).toBeGreaterThan(layout.view.clientHeight);
  await login.locator("[data-auth-submit]").scrollIntoViewIfNeeded();
  await expect(login.locator("[data-auth-submit]")).toBeInViewport();

  await login.locator('[data-action="auth-open-register"]').click();
  const register = page.locator('[data-app-view="auth-register"]');
  await expect(register).toBeVisible();
  layout = await readAppLayout(page);
  expectAppConfinedToViewport(layout, false);
  await register.locator("[data-auth-submit]").scrollIntoViewIfNeeded();
  await expect(register.locator("[data-auth-submit]")).toBeInViewport();
  expect(businessRequests).toEqual([]);
});

test.describe("English system locale", () => {
  test.use({ locale: "en-US" });

  test("renders the centralized English privacy copy", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Before you begin" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue offline" }),
    ).toBeVisible();
  });
});
