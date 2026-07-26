import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("refresh scheduler runtime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reruns immediately when woken during an active task", async () => {
    let finishFirst!: () => void;
    const firstRun = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });
    const callback = vi.fn()
      .mockImplementationOnce(() => firstRun)
      .mockResolvedValue(undefined);
    const windowLike = {
      document: {
        hidden: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      },
      setTimeout,
      clearTimeout
    };
    const script = readFileSync(path.resolve(process.cwd(), "js/refresh_scheduler_runtime.js"), "utf8");
    vm.runInNewContext(script, { window: windowLike });
    const Scheduler = (windowLike as any).RefreshSchedulerRuntime.RefreshScheduler;
    const scheduler = new Scheduler();

    scheduler.register({ name: "test", intervalMs: 5000, immediate: true, callback });
    await vi.advanceTimersByTimeAsync(0);
    expect(callback).toHaveBeenCalledTimes(1);

    scheduler.wake("test");
    finishFirst();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(callback).toHaveBeenCalledTimes(2);
    scheduler.destroy();
  });
});
