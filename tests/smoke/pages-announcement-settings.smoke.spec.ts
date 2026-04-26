import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("announcement manager delegates unread decisions to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.removeItem("announcement_last_read_id_v1");
      } catch (_err) {}

      (window as any).__announcementResolveCalls = 0;
      (window as any).__announcementUnreadCalls = 0;
      (window as any).__announcementMarkCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveAnnouncementRecords" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__announcementResolveCalls =
                Number((window as any).__announcementResolveCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "hasUnreadAnnouncementFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__announcementUnreadCalls =
                Number((window as any).__announcementUnreadCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "markAnnouncementSeenFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__announcementMarkCalls =
                Number((window as any).__announcementMarkCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreAnnouncementRuntime", {
        configurable: true,
        writable: true,
        value: runtimeProxy
      });
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreAnnouncementRuntime;
      if (
        !runtime ||
        typeof runtime.resolveAnnouncementRecords !== "function" ||
        typeof runtime.hasUnreadAnnouncementFromContext !== "function" ||
        typeof runtime.markAnnouncementSeenFromContext !== "function"
      ) {
        return {
          hasRuntime: false
        };
      }

      const btn = document.getElementById("top-announcement-btn") as HTMLElement | null;
      const modal = document.getElementById("announcement-modal") as HTMLElement | null;
      const initialUnread = !!(btn && btn.classList.contains("has-unread"));
      if (btn) {
        btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      }

      await new Promise((resolve) => {
        window.requestAnimationFrame(() => resolve(null));
      });

      return {
        hasRuntime: true,
        hasButton: !!btn,
        hasModal: !!modal,
        initialUnread,
        afterUnread: !!(btn && btn.classList.contains("has-unread")),
        modalDisplay: modal ? String(modal.style.display || "") : "",
        hasAnnouncementLink: !!document.querySelector(".announcement-link"),
        homeFeedbackText: String(
          (document.querySelector(".mobile-hide-project-copy")?.textContent || "").trim()
        ),
        homeFeedbackHref: String(
          (
            document.querySelectorAll(".mobile-hide-project-copy a")[1] as HTMLAnchorElement | null
          )?.href || ""
        ),
        resolveCalls: Number((window as any).__announcementResolveCalls || 0),
        unreadCalls: Number((window as any).__announcementUnreadCalls || 0),
        markCalls: Number((window as any).__announcementMarkCalls || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasButton).toBe(true);
    expect(snapshot.hasModal).toBe(true);
    expect(snapshot.initialUnread).toBe(true);
    expect(snapshot.afterUnread).toBe(false);
    expect(snapshot.modalDisplay).toBe("flex");
    expect(snapshot.hasAnnouncementLink).toBe(false);
    expect(snapshot.homeFeedbackText).toContain("问题反馈交流群");
    expect(snapshot.homeFeedbackHref).toBe("https://qm.qq.com/q/QkKc783jCW");
    expect(snapshot.resolveCalls).toBeGreaterThan(0);
    expect(snapshot.unreadCalls).toBeGreaterThan(0);
    expect(snapshot.markCalls).toBeGreaterThan(0);
  });

});
