import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("account leaderboard only exposes score metric and ignores removed min-step filters", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__accountMetricCalls = [];

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const rawUrl = typeof input === "string" ? input : String((input as Request).url || input);
        if (rawUrl.includes("/leaderboard")) {
          const parsed = new URL(rawUrl, window.location.origin);
          const metric = parsed.searchParams.get("metric") || "score";
          ((window as any).__accountMetricCalls as string[]).push(metric);

          return new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  user_id: 1,
                  nickname: "Alice",
                  score: 4096,
                  game_date: "2026-03-25T10:00:00Z"
                }
              ]
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
        return originalFetch(input, init);
      };
    });

    await page.goto("/account.html", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#account-board-list .account-board-row");

    const initialSnapshot = await page.evaluate(() => {
      const value = (document.querySelector("#account-board-list .account-score") as HTMLElement | null)?.textContent || "";
      const date = (document.querySelector("#account-board-list .account-date") as HTMLElement | null)?.textContent || "";
      const options = Array.from(document.querySelectorAll("#account-board-metric option")).map((option) =>
        (option as HTMLOptionElement).value
      );
      const calls = ((window as any).__accountMetricCalls as string[]) || [];
      return { value, date, options, calls };
    });

    expect(initialSnapshot.value).toBe("4096");
    expect(initialSnapshot.date).toBe("2026-03-25 18:00:00");
    expect(initialSnapshot.date).not.toContain("T");
    expect(initialSnapshot.date).not.toContain("Z");
    expect(initialSnapshot.options).toEqual(["score"]);
    expect(initialSnapshot.calls.length).toBeGreaterThan(0);
    expect(initialSnapshot.calls[0]).toBe("score");

    await page.evaluate(() => {
      const metricSelect = document.querySelector("#account-board-metric") as HTMLSelectElement | null;
      if (!metricSelect) return;
      const injectedOption = document.createElement("option");
      injectedOption.value = "min_steps_2048";
      injectedOption.textContent = "Injected";
      metricSelect.appendChild(injectedOption);
      metricSelect.value = "min_steps_2048";
      metricSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await page.waitForFunction(() => {
      const calls = ((window as any).__accountMetricCalls as string[]) || [];
      return calls.length >= 2;
    });

    const metricSnapshot = await page.evaluate(() => {
      const value = (document.querySelector("#account-board-list .account-score") as HTMLElement | null)?.textContent || "";
      const header = (document.querySelector("#account-col-score") as HTMLElement | null)?.textContent || "";
      const calls = ((window as any).__accountMetricCalls as string[]) || [];
      return { value, header, calls };
    });

    expect(metricSnapshot.value).toBe("4096");
    expect(metricSnapshot.header.length).toBeGreaterThan(0);
    expect(metricSnapshot.calls.every((item) => item === "score")).toBeTruthy();
  });
});
