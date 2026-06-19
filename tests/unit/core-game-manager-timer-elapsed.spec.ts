import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerTimerElapsedRuntime,
  installGameManagerTimerElapsedRuntime,
  resolveTimerElapsedMs,
  type GameManagerTimerElapsedRuntime
} from "../../src/core/game-manager-timer-elapsed";

describe("core game manager timer elapsed", () => {
  it("uses the server anchor when server now is available", () => {
    const manager = {
      timerAnchorServerMs: 1_000,
      timerAnchorLocalMs: 3_000,
      timerElapsedOffsetMs: 250,
      timerStatus: 1
    };
    const resolveTimerServerNowMs = vi.fn(() => 2_500);
    const resolveTimerElapsedOffsetMs = vi.fn(() => 250);

    expect(
      resolveTimerElapsedMs(manager, 8_000, {
        resolveTimerServerNowMs,
        resolveTimerElapsedOffsetMs
      })
    ).toBe(1_750);
    expect(resolveTimerServerNowMs).toHaveBeenCalledWith(manager, 8_000);
    expect(resolveTimerElapsedOffsetMs).toHaveBeenCalledWith(manager);
  });

  it("uses the local anchor when no server duration is available", () => {
    const manager = {
      timerAnchorServerMs: null,
      timerAnchorLocalMs: 5_000,
      timerElapsedOffsetMs: 1_250,
      timerStatus: 1
    };

    expect(
      resolveTimerElapsedMs(manager, 9_500, {
        resolveTimerServerNowMs: vi.fn(() => null),
        resolveTimerElapsedOffsetMs: vi.fn(() => 1_250)
      })
    ).toBe(5_750);
  });

  it("falls back to active startTime and then elapsed offset", () => {
    const operations = {
      resolveTimerServerNowMs: vi.fn(() => null),
      resolveTimerElapsedOffsetMs: vi.fn(() => 4_000)
    };

    expect(
      resolveTimerElapsedMs(
        {
          timerStatus: 1,
          startTime: {
            getTime: () => 2_000
          }
        },
        6_250,
        operations
      )
    ).toBe(4_250);
    expect(
      resolveTimerElapsedMs(
        {
          timerStatus: 0
        },
        6_250,
        operations
      )
    ).toBe(4_000);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerTimerElapsedRuntime();
    expect(runtime.resolveTimerElapsedMs).toBe(resolveTimerElapsedMs);

    const windowLike: { CoreGameManagerTimerElapsedRuntime?: GameManagerTimerElapsedRuntime } = {};
    expect(installGameManagerTimerElapsedRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerTimerElapsedRuntime
    );
    expect(windowLike.CoreGameManagerTimerElapsedRuntime?.resolveTimerElapsedMs).toBe(
      resolveTimerElapsedMs
    );

    const existing = {
      resolveTimerElapsedMs: vi.fn()
    };
    expect(
      installGameManagerTimerElapsedRuntime({
        windowLike: { CoreGameManagerTimerElapsedRuntime: existing }
      })
    ).toBe(existing);
  });
});
