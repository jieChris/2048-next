import { describe, expect, it, vi } from "vitest";

import {
  bindAppLifecycle,
  type AppLifecyclePort,
  type BackButtonEvent,
} from "../../mobile/src/platform/app-lifecycle";

class FakeLifecyclePort implements AppLifecyclePort {
  readonly listeners = new Map<string, (event?: BackButtonEvent) => void>();
  readonly removed: string[] = [];
  failOn: "pause" | "resume" | "backButton" | null = null;
  failRemoveOn: "pause" | "resume" | "backButton" | null = null;
  emitOnRegister: "pause" | null = null;

  async addListener(
    eventName: "pause" | "resume" | "backButton",
    listener: ((event: BackButtonEvent) => void) | (() => void),
  ) {
    if (eventName === this.failOn) throw new Error(`register ${eventName}`);
    this.listeners.set(eventName, listener);
    if (eventName === this.emitOnRegister) listener({ canGoBack: false });
    return {
      remove: async () => {
        this.removed.push(eventName);
        if (eventName === this.failRemoveOn) {
          throw new Error(`remove ${eventName}`);
        }
        this.listeners.delete(eventName);
      },
    };
  }

  emit(eventName: "pause" | "resume"): void;
  emit(eventName: "backButton", event: BackButtonEvent): void;
  emit(
    eventName: "pause" | "resume" | "backButton",
    event?: BackButtonEvent,
  ): void {
    this.listeners.get(eventName)?.(event);
  }
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

describe("mobile Android app lifecycle seam", () => {
  it("binds only pause, resume, and backButton and removes all listeners", async () => {
    const port = new FakeLifecyclePort();
    const binding = await bindAppLifecycle(port, {
      onPause: vi.fn(),
      onResume: vi.fn(),
      onBackButton: vi.fn(),
      onError: vi.fn(),
    });

    expect([...port.listeners.keys()]).toEqual([
      "pause",
      "resume",
      "backButton",
    ]);
    await binding.remove();
    expect(port.removed).toEqual(["pause", "resume", "backButton"]);
  });

  it("removes already registered listeners when later registration fails", async () => {
    const port = new FakeLifecyclePort();
    port.failOn = "resume";
    await expect(
      bindAppLifecycle(port, {
        onPause: vi.fn(),
        onResume: vi.fn(),
        onBackButton: vi.fn(),
        onError: vi.fn(),
      }),
    ).rejects.toThrow("register resume");
    expect(port.removed).toEqual(["pause"]);
    expect(port.listeners.size).toBe(0);
  });

  it("drains an event emitted during partial registration before rejecting", async () => {
    const port = new FakeLifecyclePort();
    const pause = deferred();
    let pauseFinished = false;
    port.emitOnRegister = "pause";
    port.failOn = "resume";
    const binding = bindAppLifecycle(port, {
      onPause: async () => {
        await pause.promise;
        pauseFinished = true;
      },
      onResume: vi.fn(),
      onBackButton: vi.fn(),
      onError: vi.fn(),
    });
    let settled = false;
    void binding.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    pause.resolve();
    await expect(binding).rejects.toThrow("register resume");
    expect(pauseFinished).toBe(true);
    expect(port.removed).toEqual(["pause"]);
  });

  it("dispatches pause and resume without leaking rejected promises", async () => {
    const port = new FakeLifecyclePort();
    const onPause = vi.fn(async () => {
      throw new Error("flush failed");
    });
    const onResume = vi.fn();
    const onError = vi.fn();
    const binding = await bindAppLifecycle(port, {
      onPause,
      onResume,
      onBackButton: vi.fn(),
      onError,
    });

    port.emit("pause");
    port.emit("resume");
    await binding.drain();
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith({
      phase: "pause",
      error: expect.objectContaining({ message: "flush failed" }),
    });
  });

  it("keeps pause and resume in emission order", async () => {
    const port = new FakeLifecyclePort();
    const pause = deferred();
    const calls: string[] = [];
    const binding = await bindAppLifecycle(port, {
      onPause: async () => {
        calls.push("pause:start");
        await pause.promise;
        calls.push("pause:end");
      },
      onResume: () => {
        calls.push("resume");
      },
      onBackButton: vi.fn(),
      onError: vi.fn(),
    });

    port.emit("pause");
    port.emit("resume");
    await Promise.resolve();
    expect(calls).toEqual(["pause:start"]);
    pause.resolve();
    await binding.drain();
    expect(calls).toEqual(["pause:start", "pause:end", "resume"]);
  });

  it("contains an asynchronously rejected error observer and continues", async () => {
    const port = new FakeLifecyclePort();
    const onResume = vi.fn();
    const binding = await bindAppLifecycle(port, {
      onPause: async () => {
        throw new Error("flush failed");
      },
      onResume,
      onBackButton: vi.fn(),
      onError: async () => {
        throw new Error("observer failed");
      },
    });

    port.emit("pause");
    port.emit("resume");
    await expect(binding.drain()).resolves.toBeUndefined();
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("serializes rapid Android back presses", async () => {
    const port = new FakeLifecyclePort();
    const first = deferred();
    const calls: boolean[] = [];
    const binding = await bindAppLifecycle(port, {
      onPause: vi.fn(),
      onResume: vi.fn(),
      onBackButton: async (event) => {
        calls.push(event.canGoBack);
        if (calls.length === 1) await first.promise;
      },
      onError: vi.fn(),
    });

    port.emit("backButton", { canGoBack: true });
    port.emit("backButton", { canGoBack: false });
    await Promise.resolve();
    expect(calls).toEqual([true]);
    first.resolve();
    await binding.drain();
    expect(calls).toEqual([true, false]);
  });

  it("continues handling back presses after one handler fails", async () => {
    const port = new FakeLifecyclePort();
    const onError = vi.fn();
    const calls: boolean[] = [];
    const binding = await bindAppLifecycle(port, {
      onPause: vi.fn(),
      onResume: vi.fn(),
      onBackButton: async (event) => {
        calls.push(event.canGoBack);
        if (calls.length === 1) throw new Error("back failed");
      },
      onError,
    });

    port.emit("backButton", { canGoBack: true });
    await binding.drain();
    port.emit("backButton", { canGoBack: false });
    await binding.drain();
    expect(calls).toEqual([true, false]);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("attempts every listener removal and drains handlers before surfacing removal errors", async () => {
    const port = new FakeLifecyclePort();
    const pause = deferred();
    let pauseFinished = false;
    const binding = await bindAppLifecycle(port, {
      onPause: async () => {
        await pause.promise;
        pauseFinished = true;
      },
      onResume: vi.fn(),
      onBackButton: vi.fn(),
      onError: vi.fn(),
    });
    port.failRemoveOn = "resume";
    port.emit("pause");
    await Promise.resolve();

    const removal = binding.remove();
    await Promise.resolve();
    expect(pauseFinished).toBe(false);
    pause.resolve();
    await expect(removal).rejects.toThrow("app_lifecycle_remove_failed");
    expect(pauseFinished).toBe(true);
    expect(port.removed).toEqual(["pause", "resume", "backButton"]);
  });
});
