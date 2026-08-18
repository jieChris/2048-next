import { expect, test } from "@playwright/test";

const pages = [
  {
    path: "/2048.html",
    canonical: "https://2048next.cn/2048.html",
    zhTitle: "2048 NEXT — 免费在线 2048 多模式数字合并游戏",
    enTitle: "2048 NEXT — Free Online 2048 Puzzle Game"
  },
  {
    path: "/modes.html",
    canonical: "https://2048next.cn/modes.html",
    zhTitle: "2048 游戏模式大全 — 2048 NEXT",
    enTitle: "2048 Game Modes — 2048 NEXT"
  }
] as const;

for (const pageContract of pages) {
  test(`${pageContract.path} keeps its Chinese SEO title after startup`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("ui_language_v1", "zh"));
    await page.goto(pageContract.path, { waitUntil: "networkidle" });

    await expect(page).toHaveTitle(pageContract.zhTitle);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      pageContract.canonical
    );
  });

  test(`${pageContract.path} keeps its English SEO title after startup`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("ui_language_v1", "en"));
    await page.goto(pageContract.path, { waitUntil: "networkidle" });

    await expect(page).toHaveTitle(pageContract.enTitle);
  });
}
