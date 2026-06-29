import type { Page, Route } from "@playwright/test";

export async function seedBetaAccessToken(page: Page, token = "smoke-beta-token"): Promise<void> {
  await page.addInitScript((value) => {
    const applyAuth = () => {
      window.localStorage.setItem("2048_auth_token_v1", value);
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
    };
    applyAuth();
    const originalClear = window.localStorage.clear.bind(window.localStorage);
    window.localStorage.clear = () => {
      originalClear();
      applyAuth();
    };
  }, token);
}

export async function mockAcceptedBetaAccess(page: Page): Promise<void> {
  await seedBetaAccessToken(page);
  await page.route("**/api/access/me", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          authenticated: true,
          userId: 42,
          email: "smoke@example.com",
          role: "player",
          superAdmin: false,
          allowlisted: true,
          noticeAccepted: true,
          noticeVersion: "beta_notice_2026_06_26_v1",
          canAccessProduct: true
        }
      })
    });
  });
}
