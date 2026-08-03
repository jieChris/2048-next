import { expect, test, type Page, type Route } from "@playwright/test";

const VIEWPORTS = [
  { key: "320x568", width: 320, height: 568 },
  { key: "390x844", width: 390, height: 844 },
  { key: "768x1024", width: 768, height: 1024 },
  { key: "1280x720", width: 1280, height: 720 }
] as const;

const THEMES = ["light", "night"] as const;

type Theme = (typeof THEMES)[number];
type VisualPage = {
  key: string;
  path: string;
  ready?: string;
  guest?: boolean;
  holdCacheReset?: boolean;
};

const PAGES: VisualPage[] = [
  { key: "game", path: "/2048.html?visual_preview=1", ready: "body[data-page='game']" },
  { key: "not-found", path: "/404.html", ready: "main" },
  { key: "practice-board", path: "/Practice_board.html?visual_preview=1", ready: "body[data-page='practice']" },
  { key: "account", path: "/account.html", ready: "body[data-page='account-hub']" },
  { key: "achievement-toast-reference", path: "/achievement-toast-reference.html", ready: ".toast-reference-page" },
  { key: "admin", path: "/admin.html?view=dashboard", ready: "body[data-admin-access='granted']" },
  { key: "api-docs", path: "/api-docs.html", ready: "body[data-page='api-docs']" },
  { key: "beta-access", path: "/beta-access.html", ready: "#beta-notice-section" },
  { key: "beta-login", path: "/beta-login.html", ready: "#beta-login-form", guest: true },
  { key: "cache-reset", path: "/cache-reset.html", ready: "#fallback-link", holdCacheReset: true },
  { key: "capped", path: "/capped_2048.html?visual_preview=1", ready: "body[data-page='game']" },
  { key: "favicon-preview", path: "/favicon-preview.html", ready: "main" },
  { key: "history", path: "/history.html", ready: "body[data-page='history']" },
  { key: "canonical-index", path: "/index.html?visual_preview=1", ready: "body[data-page='game']" },
  { key: "leaderboard-4x4", path: "/leaderboard_4x4.html", ready: "body[data-page='leaderboard-4x4']" },
  { key: "achievements", path: "/medal-wall.html", ready: "#achievements-list" },
  { key: "mobile-medal-preview", path: "/mobile-medal-preview.html", ready: "body" },
  { key: "modes", path: "/modes.html", ready: "body[data-page='modes']" },
  { key: "operation-feedback-preview", path: "/operation-feedback-preview.html", ready: "body" },
  { key: "palette", path: "/palette.html#appearance-settings", ready: "body[data-page='palette-hub']" },
  { key: "password", path: "/password.html", ready: "body[data-page='password-hub']" },
  { key: "play", path: "/play.html?visual_preview=1", ready: "body[data-page='game']" },
  { key: "breakout", path: "/public/easter-eggs/breakout/index.html", ready: ".breakout-modal" },
  { key: "ranked-seed-validator", path: "/ranked_seed_validator.html", ready: ".validator-shell" },
  { key: "register", path: "/register.html", ready: "body[data-page='register-hub']" },
  { key: "relay-5x5", path: "/relay_5x5.html", ready: "body[data-page='relay-5x5']" },
  { key: "replay", path: "/replay.html", ready: "body[data-page='replay']" },
  { key: "stone-2k-monitor", path: "/stone_2k_monitor.html", ready: "body[data-page='stone-2k-monitor']" },
  { key: "touch-sensitivity", path: "/touch_sensitivity.html", ready: "body[data-page='touch-sensitivity']" },
  { key: "ui-preview", path: "/ui-preview.html", ready: "[data-preview-button-workbench]" },
  { key: "undo", path: "/undo_2048.html?visual_preview=1", ready: "body[data-page='game']" },
  { key: "user-profile", path: "/user.html?id=42", ready: "body[data-page='user-profile']" },
  { key: "visual-preview", path: "/visual-preview.html", ready: "[data-classic-workshop-preview]" }
];

const ACHIEVEMENTS = [
  {
    id: "ach_first_2048",
    name: "首次 2048",
    description: "第一次合成 2048 方块。",
    name_i18n: { "zh-CN": "首次 2048", en: "First 2048" },
    description_i18n: { "zh-CN": "第一次合成 2048 方块。", en: "Reach 2048 for the first time." },
    icon_url: "/meta/apple-touch-icon.png",
    status: "active",
    level: 1,
    series_id: "tile-2048",
    rules: [{ type: "max_tile_reached", params: { tile: 2048, count: 1 } }]
  },
  {
    id: "ach_200th_2048",
    name: "第 200 次 2048",
    description: "累计第 200 次合成 2048。",
    name_i18n: { "zh-CN": "第 200 次 2048", en: "200th 2048" },
    description_i18n: { "zh-CN": "累计第 200 次合成 2048。", en: "Reach 2048 for the 200th time." },
    icon_url: "",
    status: "active",
    level: 2,
    series_id: "tile-2048",
    rules: [{ type: "nth_max_tile_reached", params: { tile: 2048, count: 200 } }]
  }
];

const ACCESS_PAYLOAD = {
  success: true,
  data: {
    authenticated: true,
    userId: 42,
    email: "visual@example.com",
    role: "player",
    superAdmin: false,
    allowlisted: true,
    noticeAccepted: true,
    noticeVersion: "beta_notice_2026_06_26_v1",
    canAccessProduct: true
  }
};

const VISUAL_USER = {
  id: 42,
  user_id: 42,
  email: "visual@example.com",
  nickname: "视觉测试员",
  display_name: "视觉测试员",
  role: "player",
  is_active: true,
  created_at: "2026-07-20T08:00:00.000Z",
  last_login_at: "2026-08-01T09:00:00.000Z",
  last_seen_at: "2026-08-02T09:00:00.000Z",
  record_count: 3
};

async function fulfillApi(route: Route, pageKey: string): Promise<void> {
  const path = new URL(route.request().url()).pathname;
  if (path === "/api/access/me") {
    if (pageKey === "beta-login") {
      await route.fulfill({ status: 401, json: { success: false, code: "UNAUTHORIZED" } });
    } else if (pageKey === "beta-access") {
      await route.fulfill({ json: { ...ACCESS_PAYLOAD, data: { ...ACCESS_PAYLOAD.data, noticeAccepted: false, canAccessProduct: false } } });
    } else {
      await route.fulfill({ json: ACCESS_PAYLOAD });
    }
    return;
  }
  if (path === "/api/admin/me") {
    await route.fulfill({ json: { success: true, data: { user_id: 0, email: "root@example.com", admin: true, rootAdmin: true, canManageSuperAdmins: true } } });
    return;
  }
  if (path === "/api/admin/dashboard") {
    await route.fulfill({ json: { success: true, data: { metrics: { total_users: 128, active_users: 120, inactive_users: 8, new_users_7d: 9, active_users_7d: 64, pending_rescue_offers: 2 }, recent_users: [VISUAL_USER], recent_audit: [], recent_events: [] } } });
    return;
  }
  if (path === "/api/admin/users") {
    await route.fulfill({ json: { success: true, data: [VISUAL_USER], page: 1, limit: 50, total: 1 } });
    return;
  }
  if (path === "/api/achievements") {
    await route.fulfill({ json: { success: true, data: ACHIEVEMENTS } });
    return;
  }
  if (path === "/api/user/me/achievements") {
    await route.fulfill({ json: { success: true, data: [{ achievement: ACHIEVEMENTS[0], earned_at: "2026-08-01T08:30:00.000Z", source: "ranked" }] } });
    return;
  }
  if (path === "/api/user/me/achievement-showcase") {
    await route.fulfill({ json: { success: true, data: [{ achievement: ACHIEVEMENTS[0], earned_at: "2026-08-01T08:30:00.000Z", source: "ranked" }] } });
    return;
  }
  if (path === "/api/user/me" || path === "/api/user/42") {
    await route.fulfill({ json: { success: true, data: VISUAL_USER } });
    return;
  }
  if (path.includes("ranked-session")) {
    await route.fulfill({ status: 503, json: { success: false, code: "VISUAL_RANKED_DISABLED" } });
    return;
  }
  await route.fulfill({ json: { success: true, data: [] } });
}

async function installVisualState(page: Page, pageKey: string, theme: Theme, options: VisualPage = { key: pageKey, path: "" }): Promise<void> {
  await page.clock.setFixedTime(new Date("2026-08-02T14:30:00+08:00"));
  await page.addInitScript(({ guest, holdCacheReset, night, pageKey: injectedPageKey }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("ui_language_v1", "zh-CN");
    localStorage.setItem("theme_profile_v1", "mist_cyan");
    localStorage.setItem("settings_day_theme_profile_v1", "mist_cyan");
    localStorage.setItem("settings_night_theme_profile_v1", "mist_cyan");
    localStorage.setItem("settings_night_background_enabled_v1", night ? "1" : "0");
    localStorage.setItem("tile_palette_active_v1", "follow-theme");
    if (injectedPageKey !== "beta-login" && injectedPageKey !== "beta-access") {
      localStorage.setItem("2048_beta_access_smoke_bypass_v1", "1");
    } else {
      localStorage.setItem("2048_beta_access_force_gate_local_v1", "1");
    }
    if (!guest) {
      localStorage.setItem("2048_auth_token_v1", injectedPageKey === "admin" || injectedPageKey === "admin-import" ? "visual-admin-token" : "visual-token");
      localStorage.setItem("2048_auth_userId_v1", "42");
      localStorage.setItem("2048_auth_nickname_v1", "视觉测试员");
    }
    (window as Window & { __DISABLE_ONLINE_LEADERBOARD__?: boolean }).__DISABLE_ONLINE_LEADERBOARD__ = true;
    Math.random = () => 0.125;
    Object.defineProperty(window.crypto, "getRandomValues", {
      configurable: true,
      value: <T extends ArrayBufferView>(values: T): T => {
        const bytes = new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
        bytes.forEach((_, index) => { bytes[index] = (32 + index * 17) & 0xff; });
        return values;
      }
    });
    if (holdCacheReset) {
      Object.defineProperty(window, "caches", {
        configurable: true,
        value: { keys: () => new Promise<never>(() => undefined) }
      });
    }
  }, { guest: options.guest === true, holdCacheReset: options.holdCacheReset === true, night: theme === "night", pageKey });

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "challenges.cloudflare.com") {
      await route.fulfill({
        contentType: "application/javascript",
        body: "window.turnstile={render:function(){return 'visual-turnstile'},reset:function(){},remove:function(){}};"
      });
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      await fulfillApi(route, pageKey);
      return;
    }
    await route.continue();
  });
}

async function settle(page: Page, ready = "body"): Promise<void> {
  await expect(page.locator(ready).first()).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const layout = await page.evaluate(() => ({
    overflow: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) - window.innerWidth,
    offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return { selector: `${node.tagName.toLowerCase()}#${node.id}.${String(node.className || "").trim().replace(/\s+/gu, ".")}`, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
      })
      .filter((item) => item.left < -1 || item.right > window.innerWidth + 1)
      .sort((left, right) => right.right - left.right)
      .slice(0, 8)
  }));
  expect(layout.overflow, JSON.stringify(layout.offenders)).toBeLessThanOrEqual(1);
}

async function scrollAppearanceSettingsIntoView(page: Page): Promise<void> {
  await page.locator("#appearance-settings").evaluate((section) => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY);
    root.style.scrollBehavior = previous;
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
}

async function prepareVisualPage(page: Page, pageKey: string, theme: Theme): Promise<void> {
  if (pageKey === "not-found") {
    await expect(page.locator("#tile-playground .play-tile")).toHaveCount(10);
  }

  if (pageKey === "practice-board") {
    await waitForPracticeBoardReady(page);
    await page.evaluate(() => {
      const manager = (window as Window & {
        game_manager: {
          modeConfig?: unknown;
          restartWithBoard: (board: number[][], modeConfig: unknown, options: unknown) => void;
          clearTransientTileVisualState?: () => void;
          actuate?: () => void;
        };
      }).game_manager;
      manager.restartWithBoard([
        [2, 0, 0, 0],
        [0, 4, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ], manager.modeConfig || null, {
        preserveSeed: true,
        preserveMode: true,
        skipStartTiles: true,
        disableStateRestore: true
      });
      manager.clearTransientTileVisualState?.();
      manager.actuate?.();
    });
  }

  if (pageKey === "palette") {
    await expect(page.locator("#appearance-settings-editor")).toHaveAttribute("open", "");
    await expect(page.locator("#palette-list .palette-item.is-active")).toBeVisible();
    await scrollAppearanceSettingsIntoView(page);
  }

  if (pageKey === "visual-preview") {
    const themeButton = page.locator(`[data-preview-theme="${theme}"]`);
    await themeButton.click();
    await expect(themeButton).toHaveAttribute("aria-pressed", "true");
    await page.waitForFunction((night) => {
      const frame = document.querySelector<HTMLIFrameElement>("[data-preview-frame]");
      const root = frame?.contentDocument?.documentElement;
      return root?.dataset.visualPreviewFrame === "candidate" &&
        root.hasAttribute("data-night-background") === night;
    }, theme === "night");
  }

  await page.evaluate(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

for (const scenario of PAGES) {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`页面 ${scenario.key} ${viewport.key} ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await installVisualState(page, scenario.key, theme, scenario);
        const response = await page.goto(scenario.path, { waitUntil: "domcontentloaded" });
        expect(response?.ok()).toBeTruthy();
        await settle(page, scenario.ready);
        await prepareVisualPage(page, scenario.key, theme);
        await expectNoHorizontalOverflow(page);
        await expect(page).toHaveScreenshot(`page-${scenario.key}-${viewport.key}-${theme}.png`);
      });
    }
  }
}

type ModalScenario = {
  key: string;
  page: VisualPage;
  open: (page: Page) => Promise<void>;
  ready: string;
};

async function waitForPracticeBoardReady(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const manager = (window as Window & { game_manager?: { restartWithBoard?: unknown } }).game_manager;
    return typeof manager?.restartWithBoard === "function" &&
      document.querySelectorAll("#practice-mode-list [data-practice-mode-key]").length > 0;
  });
}

async function waitForReplayUiReady(page: Page): Promise<void> {
  await page.waitForFunction(() => (document as Document & { __replayFileDropBound?: boolean }).__replayFileDropBound === true);
}

const MODALS: ModalScenario[] = [
  {
    key: "settings",
    page: { key: "game", path: "/2048.html?visual_preview=1" },
    open: async (page) => {
      await page.waitForFunction(() => typeof (window as Window & { openSettingsModal?: unknown }).openSettingsModal === "function");
      await page.evaluate(() => (window as Window & { openSettingsModal: () => void }).openSettingsModal());
    },
    ready: "#settings-modal"
  },
  {
    key: "replay-export",
    page: { key: "game", path: "/2048.html?visual_preview=1" },
    open: async (page) => {
      await page.waitForFunction(() => {
        const target = window as Window & { exportReplay?: unknown; game_manager?: { serialize?: unknown } };
        return typeof target.exportReplay === "function" && typeof target.game_manager?.serialize === "function";
      });
      await page.evaluate(() => (window as Window & { exportReplay: () => void }).exportReplay());
    },
    ready: "#replay-modal"
  },
  {
    key: "announcement",
    page: { key: "game", path: "/2048.html?visual_preview=1" },
    open: async (page) => {
      await page.waitForFunction(() => typeof (window as Window & { AnnouncementManager?: { openModal?: unknown } }).AnnouncementManager?.openModal === "function");
      await page.evaluate(() => (window as Window & { AnnouncementManager: { openModal: () => void } }).AnnouncementManager.openModal());
    },
    ready: "#announcement-modal"
  },
  {
    key: "mode-intro",
    page: { key: "play", path: "/play.html?mode_key=capped_4x4_pow2_64_no_undo&visual_preview=1" },
    open: async (page) => {
      await page.waitForFunction(() => {
        const target = window as Window & {
          CorePlayChallengeIntroHostRuntime?: { resolvePlayChallengeIntroFromContext?: unknown };
          CorePlayChallengeIntroRuntime?: { resolvePlayChallengeIntroModel?: unknown };
          CorePlayChallengeIntroUiRuntime?: { resolvePlayChallengeIntroUiState?: unknown };
          CorePlayChallengeIntroActionRuntime?: { resolvePlayChallengeIntroActionState?: unknown };
        };
        const introButton = document.getElementById("top-mode-intro-btn");
        return typeof target.CorePlayChallengeIntroHostRuntime?.resolvePlayChallengeIntroFromContext === "function" &&
          typeof target.CorePlayChallengeIntroRuntime?.resolvePlayChallengeIntroModel === "function" &&
          typeof target.CorePlayChallengeIntroUiRuntime?.resolvePlayChallengeIntroUiState === "function" &&
          typeof target.CorePlayChallengeIntroActionRuntime?.resolvePlayChallengeIntroActionState === "function" &&
          introButton?.style.getPropertyPriority("display") === "important";
      });
      await page.evaluate(() => {
        type Resolver = (options: unknown) => unknown;
        const target = window as Window & {
          CorePlayChallengeIntroHostRuntime: { resolvePlayChallengeIntroFromContext: Resolver };
          CorePlayChallengeIntroRuntime: { resolvePlayChallengeIntroModel: Resolver };
          CorePlayChallengeIntroUiRuntime: { resolvePlayChallengeIntroUiState: Resolver };
          CorePlayChallengeIntroActionRuntime: { resolvePlayChallengeIntroActionState: Resolver };
        };
        target.CorePlayChallengeIntroHostRuntime.resolvePlayChallengeIntroFromContext({
          modeConfig: { key: "capped_4x4_pow2_64_no_undo" },
          featureEnabled: true,
          documentLike: document,
          resolveIntroModel: target.CorePlayChallengeIntroRuntime.resolvePlayChallengeIntroModel,
          resolveIntroUiState: target.CorePlayChallengeIntroUiRuntime.resolvePlayChallengeIntroUiState,
          resolveIntroActionState: target.CorePlayChallengeIntroActionRuntime.resolvePlayChallengeIntroActionState
        });
      });
      await page.locator("#top-mode-intro-btn").evaluate((node) => (node as HTMLElement).click());
    },
    ready: "#mode-intro-modal"
  },
  {
    key: "practice-mode",
    page: { key: "practice-board", path: "/Practice_board.html?visual_preview=1" },
    open: async (page) => {
      await waitForPracticeBoardReady(page);
      await page.locator("#practice-mode-picker-btn").click();
    },
    ready: "#practice-mode-panel.is-open"
  },
  {
    key: "practice-board-code",
    page: { key: "practice-board", path: "/Practice_board.html?visual_preview=1" },
    open: async (page) => {
      await waitForPracticeBoardReady(page);
      await page.locator("#practice-board-code-btn").click();
    },
    ready: "#practice-board-code-panel.is-open"
  },
  {
    key: "no-x-selection",
    page: { key: "practice-board", path: "/Practice_board.html?visual_preview=1" },
    open: async (page) => {
      await waitForPracticeBoardReady(page);
      await page.locator("#practice-mode-picker-btn").click();
      await expect(page.locator("#practice-mode-panel.is-open")).toBeVisible();
      await page.locator('[data-practice-mode-key="nox_4x4_pow2_no_undo"]').click();
    },
    ready: "#no-x-selection-overlay"
  },
  {
    key: "game-dialog",
    page: { key: "practice-board", path: "/Practice_board.html?visual_preview=1" },
    open: async (page) => {
      await page.waitForFunction(() => Boolean((window as Window & { GameDialog?: unknown }).GameDialog));
      await page.evaluate(() => { void (window as Window & { GameDialog: { alert: (message: string) => Promise<void> } }).GameDialog.alert("盘面代码格式无效，请检查后重试。"); });
    },
    ready: "#game-dialog-overlay.is-open"
  },
  {
    key: "replay-import",
    page: { key: "replay", path: "/replay.html" },
    open: async (page) => {
      await waitForReplayUiReady(page);
      await page.locator("#import-replay-text-btn").click();
    },
    ready: "#replay-modal"
  },
  {
    key: "replay-stats",
    page: { key: "replay", path: "/replay.html" },
    open: async (page) => {
      await waitForReplayUiReady(page);
      await page.locator("#replay-toggle-diagnostics-btn").click();
    },
    ready: "#replay-modal"
  },
  {
    key: "replay-speed",
    page: { key: "replay", path: "/replay.html" },
    open: async (page) => {
      await waitForReplayUiReady(page);
      await page.locator("#replay-open-speed-btn").click();
    },
    ready: "#replay-modal"
  },
  {
    key: "replay-file-drop",
    page: { key: "replay", path: "/replay.html" },
    open: async (page) => {
      await waitForReplayUiReady(page);
      const dataTransfer = await page.evaluateHandle(() => {
        const value = new DataTransfer();
        value.items.add(new File(["VISUAL_REPLAY"], "visual-replay.txt", { type: "text/plain" }));
        return value;
      });
      await page.dispatchEvent("body", "dragenter", { dataTransfer });
      await dataTransfer.dispose();
    },
    ready: "#replay-file-drop-overlay"
  },
  {
    key: "achievement-family",
    page: { key: "achievements", path: "/medal-wall.html" },
    open: async (page) => page.getByRole("button", { name: /2048 里程碑/ }).click(),
    ready: "#achievement-family-dialog"
  },
  {
    key: "admin-import",
    page: { key: "admin-import", path: "/admin.html?view=users" },
    open: async (page) => page.getByRole("button", { name: "补录对局" }).click(),
    ready: "#admin-dialog"
  },
  {
    key: "operation-feedback-settings",
    page: { key: "operation-feedback-preview", path: "/operation-feedback-preview.html" },
    open: async (page) => {
      await expect(page.locator("[data-placement].is-active")).toHaveCount(1);
      await page.locator("[data-settings-open]").evaluate((node) => (node as HTMLButtonElement).click());
    },
    ready: "[data-settings-modal]"
  },
  {
    key: "palette-swatch",
    page: { key: "palette", path: "/palette.html#appearance-settings" },
    open: async (page) => {
      const disclosure = page.locator("#appearance-settings-editor");
      if (!await disclosure.evaluate((node) => (node as HTMLDetailsElement).open)) {
        await disclosure.locator("summary").click();
      }
      await page.locator("#palette-create-btn").click();
      await scrollAppearanceSettingsIntoView(page);
      await page.locator("#palette-editor-current .color-target").first().click();
    },
    ready: "#palette-swatch-popover.is-open"
  },
  {
    key: "achievement-toast",
    page: { key: "game", path: "/2048.html?achievement_toast_debug=1&visual_preview=1" },
    open: async (page) => {
      await page.waitForFunction(() => Boolean((window as Window & { AchievementUnlockToastRuntime?: unknown }).AchievementUnlockToastRuntime));
      await page.evaluate(() => (window as Window & { AchievementUnlockToastRuntime: { showAchievementUnlockToast: (value: unknown) => void } }).AchievementUnlockToastRuntime.showAchievementUnlockToast({ id: "ach_first_2048", name: "首次 2048", description: "第一次合成 2048 方块。", rules: [{ type: "max_tile_reached", params: { tile: 2048, count: 1 } }], series_id: "tile-2048" }));
    },
    ready: "#global-achievement-unlock-toast-host .unlock-toast"
  },
  {
    key: "breakout-easter-egg",
    page: { key: "game", path: "/2048.html?visual_preview=1" },
    open: async (page) => {
      await page.waitForFunction(() => Boolean((window as Window & { CoreBreakoutEasterEggRuntime?: unknown }).CoreBreakoutEasterEggRuntime));
      await page.evaluate(() => {
        const target = document.createElement("button");
        document.body.append(target);
        (window as Window & { CoreBreakoutEasterEggRuntime: { bindBreakoutEasterEgg: (node: HTMLElement, options: unknown) => void } }).CoreBreakoutEasterEggRuntime.bindBreakoutEasterEgg(target, { enableClickEffect: false, triggerCount: 1 });
        target.click();
      });
    },
    ready: "[data-breakout-easter-egg-overlay='1']"
  }
];

for (const scenario of MODALS) {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`弹窗 ${scenario.key} ${viewport.key} ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await installVisualState(page, scenario.page.key, theme, scenario.page);
        const response = await page.goto(scenario.page.path, { waitUntil: "domcontentloaded" });
        expect(response?.ok()).toBeTruthy();
        await settle(page);
        await prepareVisualPage(page, scenario.page.key, theme);
        await scenario.open(page);
        await settle(page, scenario.ready);
        await expectNoHorizontalOverflow(page);
        await expect(page).toHaveScreenshot(`modal-${scenario.key}-${viewport.key}-${theme}.png`);
      });
    }
  }
}
