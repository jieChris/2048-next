import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

function loadCoreBootstrapRuntime(windowLike: Record<string, unknown>) {
  const storageScript = readFileSync(path.resolve(process.cwd(), "js/core_storage_runtime.js"), "utf8");
  const script = readFileSync(path.resolve(process.cwd(), "js/core_bootstrap_runtime.js"), "utf8");
  vm.runInNewContext(storageScript, { window: windowLike });
  vm.runInNewContext(script, { window: windowLike });
  return windowLike.CoreBootstrapRuntime as {
    startGame(options: Record<string, unknown>): unknown;
    startGameOnAnimationFrame(options: Record<string, unknown>): unknown;
  };
}

describe("core bootstrap runtime", () => {
  it("binds online submit hooks when the manager is created after the online runtime", () => {
    const bindImmediateOnlineSubmitHooks = vi.fn();
    const manager = {};
    const windowLike: Record<string, unknown> = {
      OnlineLeaderboardRuntime: { bindImmediateOnlineSubmitHooks },
      document: { documentElement: { getAttribute: vi.fn(() => "") } }
    };
    const runtime = loadCoreBootstrapRuntime(windowLike);
    function GameManagerCtor() {
      return manager;
    }

    runtime.startGame({
      gameManagerCtor: GameManagerCtor,
      inputManagerCtor: vi.fn(),
      actuatorCtor: vi.fn(),
      scoreManagerCtor: vi.fn()
    });

    expect(bindImmediateOnlineSubmitHooks).toHaveBeenCalledWith(manager);
  });

  it("uses the persisted language before i18n initialization for duplicate mode alerts", async () => {
    const alert = vi.fn();
    const windowLike: Record<string, unknown> = {
      alert,
      localStorage: { getItem: vi.fn(() => "en") },
      location: { href: "play.html" },
      document: { documentElement: { getAttribute: vi.fn(() => "") } },
      requestAnimationFrame(callback: () => void) {
        callback();
      },
      CoreSingleModePageLockRuntime: {
        acquireSingleModeBrowserLock: vi.fn(async () => false)
      }
    };
    const runtime = loadCoreBootstrapRuntime(windowLike);

    runtime.startGameOnAnimationFrame({ modeKey: "standard_4x4_pow2_no_undo" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(alert).toHaveBeenCalledWith(
      "Illegal operation: each mode can only be open in one page."
    );
    expect((windowLike.location as { href: string }).href).toBe("modes.html");
  });
});
