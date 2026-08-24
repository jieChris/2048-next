import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runtimeSource = readFileSync(
  path.resolve(process.cwd(), "js/refresh_scheduler_runtime.js"),
  "utf8"
);

describe("refresh scheduler runtime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs an immediate follow-up when woken during an active task", async () => {
    const windowLike: Record<string, any> = {
      clearTimeout,
      document: {
        hidden: false,
        addEventListener() {},
        removeEventListener() {}
      },
      setTimeout
    };
    vm.runInNewContext(runtimeSource, { window: windowLike });

    const scheduler = new windowLike.RefreshSchedulerRuntime.RefreshScheduler();
    let finishFirstRun!: () => void;
    const firstRun = new Promise<void>((resolve) => {
      finishFirstRun = resolve;
    });
    const callback = vi.fn().mockReturnValueOnce(firstRun).mockResolvedValue(undefined);

    scheduler.register({
      name: "online-submit",
      intervalMs: 5_000,
      callback,
      immediate: true
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(callback).toHaveBeenCalledTimes(1);

    scheduler.wake("online-submit");
    await vi.advanceTimersByTimeAsync(0);
    finishFirstRun();
    await vi.advanceTimersByTimeAsync(0);

    expect(callback).toHaveBeenCalledTimes(2);
    scheduler.destroy();
  });
});
