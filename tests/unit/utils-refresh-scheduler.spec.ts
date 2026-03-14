import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { RefreshScheduler } from "../../src/utils/refresh-scheduler";

describe("utils: RefreshScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls callback after interval", async () => {
    const scheduler = new RefreshScheduler();
    const fn = vi.fn();
    scheduler.register({ name: "test", intervalMs: 1000, callback: fn });

    await vi.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(1);

    scheduler.destroy();
  });

  it("calls callback repeatedly", async () => {
    const scheduler = new RefreshScheduler();
    const fn = vi.fn();
    scheduler.register({ name: "test", intervalMs: 500, callback: fn });

    await vi.advanceTimersByTimeAsync(500);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(fn).toHaveBeenCalledTimes(2);

    scheduler.destroy();
  });

  it("unregister stops the task", async () => {
    const scheduler = new RefreshScheduler();
    const fn = vi.fn();
    scheduler.register({ name: "test", intervalMs: 500, callback: fn });

    await vi.advanceTimersByTimeAsync(500);
    expect(fn).toHaveBeenCalledTimes(1);

    scheduler.unregister("test");
    await vi.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(1);

    scheduler.destroy();
  });

  it("applies backoff on errors", async () => {
    const scheduler = new RefreshScheduler();
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    scheduler.register({ name: "test", intervalMs: 100, maxBackoffMs: 5000, callback: fn });

    await vi.advanceTimersByTimeAsync(100);
    expect(fn).toHaveBeenCalledTimes(1);

    // After error, backoff should increase - next call after 100 + 200 = 300ms
    await vi.advanceTimersByTimeAsync(300);
    expect(fn).toHaveBeenCalledTimes(2);

    scheduler.destroy();
  });

  it("destroy cleans up all tasks", () => {
    const scheduler = new RefreshScheduler();
    const fn = vi.fn();
    scheduler.register({ name: "a", intervalMs: 100, callback: fn });
    scheduler.register({ name: "b", intervalMs: 100, callback: fn });
    scheduler.destroy();
    // No errors thrown
  });
});
