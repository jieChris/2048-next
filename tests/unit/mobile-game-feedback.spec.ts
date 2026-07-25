// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GameFeedback,
  resolveGameFeedbackKind,
} from "../../mobile/src/platform/game-feedback";
import type { GameTransition } from "../../src/contracts";

function transition(
  values: Partial<Pick<GameTransition, "moved" | "merges" | "milestone2048" | "gameOver">>,
): GameTransition {
  return {
    state: {} as GameTransition["state"],
    moved: true,
    scoreDelta: 0,
    motions: [],
    merges: [],
    spawn: null,
    milestone2048: false,
    gameOver: false,
    ...values,
  };
}

describe("mobile game feedback", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("prioritizes finish and milestone while leaving blocked moves silent", () => {
    expect(resolveGameFeedbackKind(transition({ moved: false }), false)).toBeNull();
    expect(resolveGameFeedbackKind(transition({}), false)).toBe("move");
    expect(resolveGameFeedbackKind(transition({
      merges: [{
        from: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        to: { x: 0, y: 0 },
        value: 4,
      }],
    }), false)).toBe("merge");
    expect(resolveGameFeedbackKind(transition({ milestone2048: true }), false)).toBe("milestone");
    expect(resolveGameFeedbackKind(transition({ gameOver: true }), true)).toBe("finish");
    expect(resolveGameFeedbackKind(transition({ gameOver: true }), false)).toBe("move");
  });

  it("keeps BGM lazy, pauses in the background, resumes, and stops immediately", async () => {
    const instances: Array<{
      paused: boolean;
      currentTime: number;
      play: ReturnType<typeof vi.fn>;
      pause: ReturnType<typeof vi.fn>;
    }> = [];
    class FakeAudio {
      preload = "";
      loop = false;
      volume = 1;
      paused = true;
      currentTime = 10;
      play = vi.fn(async () => {
        this.paused = false;
      });
      pause = vi.fn(() => {
        this.paused = true;
      });

      constructor(_src: string) {
        instances.push(this);
      }
    }
    vi.stubGlobal("Audio", FakeAudio);
    const feedback = new GameFeedback({
      soundEffects: true,
      haptics: true,
      bgm: false,
    });

    expect(instances).toHaveLength(0);
    feedback.update({ soundEffects: true, haptics: true, bgm: true });
    await Promise.resolve();
    expect(instances).toHaveLength(1);
    expect(instances[0]?.play).toHaveBeenCalledTimes(1);
    feedback.pause();
    expect(instances[0]?.pause).toHaveBeenCalledTimes(1);
    feedback.resume();
    await Promise.resolve();
    expect(instances[0]?.play).toHaveBeenCalledTimes(2);
    feedback.update({ soundEffects: true, haptics: true, bgm: false });
    expect(instances[0]?.currentTime).toBe(0);
    feedback.destroy();
  });
});
