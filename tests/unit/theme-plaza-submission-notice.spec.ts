import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { createThemePlazaSubmissionNotice } from "../../src/features/theme-plaza/submission-notice";

function createScheduler() {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  const delays = new Map<number, number>();
  return {
    windowLike: {
      setTimeout(callback: TimerHandler, delay?: number): number {
        const id = nextId++;
        callbacks.set(id, callback as () => void);
        delays.set(id, Number(delay) || 0);
        return id;
      },
      clearTimeout(id: number): void {
        callbacks.delete(id);
        delays.delete(id);
      },
    },
    latestDelay(): number | null {
      const id = nextId - 1;
      return delays.get(id) ?? null;
    },
    runLatest(): void {
      const id = nextId - 1;
      const callback = callbacks.get(id);
      callbacks.delete(id);
      delays.delete(id);
      callback?.();
    },
    pendingCount(): number {
      return callbacks.size;
    },
  };
}

describe("Theme Plaza submission notice", () => {
  it("appears at the top, announces success, and closes automatically after three seconds", () => {
    const dom = new JSDOM("<!doctype html><body></body>");
    const scheduler = createScheduler();
    const notice = createThemePlazaSubmissionNotice({
      documentLike: dom.window.document,
      windowLike: scheduler.windowLike,
      durationMs: 3000,
      language: () => "zh",
    });

    notice.show();
    const host = dom.window.document.getElementById(
      "theme-plaza-submission-notice",
    ) as HTMLElement;
    expect(host.hidden).toBe(false);
    expect(host.classList.contains("is-visible")).toBe(true);
    expect(host.textContent).toContain("已提交审核");
    expect(host.textContent).toContain("我的分享");
    expect(host.querySelector("button")?.getAttribute("aria-label")).toBe(
      "关闭提示",
    );
    expect(scheduler.latestDelay()).toBe(3000);

    scheduler.runLatest();
    expect(host.hidden).toBe(true);
    expect(host.classList.contains("is-visible")).toBe(false);
    notice.destroy();
    dom.window.close();
  });

  it("allows manual close and resets the auto-close timer when shown again", () => {
    const dom = new JSDOM("<!doctype html><body></body>");
    const scheduler = createScheduler();
    const notice = createThemePlazaSubmissionNotice({
      documentLike: dom.window.document,
      windowLike: scheduler.windowLike,
      durationMs: 3000,
      language: () => "en",
    });

    notice.show();
    expect(scheduler.pendingCount()).toBe(1);
    notice.show();
    expect(scheduler.pendingCount()).toBe(1);
    const host = dom.window.document.getElementById(
      "theme-plaza-submission-notice",
    ) as HTMLElement;
    expect(host.textContent).toContain("Submitted for review");

    host.querySelector<HTMLButtonElement>("button")?.click();
    expect(host.hidden).toBe(true);
    expect(scheduler.pendingCount()).toBe(0);
    notice.destroy();
    dom.window.close();
  });
});
