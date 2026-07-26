import { expect, test } from "@playwright/test";

async function dispatchSeriousError(page: import("@playwright/test").Page, message: string) {
  await page.evaluate((value) => {
    const error = new Error(value);
    window.dispatchEvent(new ErrorEvent("error", { error, message: value }));
  }, message);
}

async function readDownload(download: import("@playwright/test").Download) {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

test("offline privacy keeps serious errors local forever without a diagnostic request", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      requests.push(request.url());
    }
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "仅离线体验" }).click();
  await expect(page.locator('[data-app-view="home"]')).toBeVisible();
  await dispatchSeriousError(page, "offline-diagnostic");

  await expect.poll(async () =>
    page.evaluate(async () => {
      const request = indexedDB.open("2048_next_app");
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const read = database.transaction("diagnostics").objectStore("diagnostics").getAll();
      const rows = await new Promise<Array<{ uploadPolicy: string }>>((resolve, reject) => {
        read.onsuccess = () => resolve(read.result);
        read.onerror = () => reject(read.error);
      });
      database.close();
      return rows.map((row) => row.uploadPolicy);
    }),
  ).toEqual(["never"]);
  expect(requests).toEqual([]);
});

test("online diagnostics upload redacted data, respect the toggle, and export locally", async ({
  page,
}) => {
  const bodies: Array<Record<string, unknown>> = [];
  await page.route("**/api/client-diagnostics", async (route) => {
    bodies.push(JSON.parse(route.request().postData() ?? "{}"));
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ success: true, accepted: true, duplicate: false }),
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "同意并继续" }).click();
  await expect(page.locator('[data-app-view="home"]')).toBeVisible();
  await dispatchSeriousError(
    page,
    "player@example.com token=secret https://example.test/a?token=secret",
  );

  await expect.poll(() => bodies.length).toBe(1);
  expect(JSON.stringify(bodies[0])).not.toContain("player@example.com");
  expect(JSON.stringify(bodies[0])).not.toContain("token=secret");
  expect(bodies[0]).toMatchObject({
    category: "uncaught_error",
    severity: "critical",
    payload: {
      error_type: "Error",
      app_version: expect.any(String),
      build_number: expect.any(String),
    },
  });

  await page.getByRole("button", { name: "我的", exact: true }).click();
  const toggle = page.locator("[data-diagnostics-enabled]");
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await dispatchSeriousError(page, "disabled-diagnostic");
  await page.waitForTimeout(100);
  expect(bodies).toHaveLength(1);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /导出本地诊断/u }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^2048-next-diagnostics-.+\.json$/u);
  const exported = await readDownload(download);
  expect(exported).toContain("disabled-diagnostic");
  expect(exported).not.toContain("ownerKey");
  expect(exported).not.toContain("player@example.com");
  expect(exported).not.toContain("token=secret");
});
