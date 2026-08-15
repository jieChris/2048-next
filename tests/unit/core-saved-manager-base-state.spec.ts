import { describe, expect, it, vi } from "vitest";

import {
  applySavedManagerBaseState,
  createSavedManagerBaseStateRuntime,
  installSavedManagerBaseStateRuntime,
  type SavedManagerBaseStateRuntime
} from "../../src/core/saved-manager-base-state";

describe("core saved manager base state", () => {
  it("applies saved base state with legacy-compatible normalization", () => {
    const manager = {
      initialSeed: 11,
      capped64Unlocked: { previous: true }
    } as Record<string, unknown>;
    const setRuntimeScore = vi.fn((target: Record<string, unknown>, score: number) => {
      target.score = score;
    });
    const clonePlain = vi.fn((value: unknown) => ({ cloned: value }));
    const assignClientRecordId = vi.fn((target: Record<string, unknown>, value: string) => {
      target.clientRecordId = value;
    });

    applySavedManagerBaseState(
      manager,
      {
        score: 2048,
        over: 1,
        won: "",
        keep_playing: true,
        initial_seed: 123,
        seed: 456,
        reached_32k: true,
        capped_milestone_count: 3,
        capped64_unlocked: { "64": true },
        client_record_id: "rec_saved",
        challenge_id: "daily-1",
        ranked_session_token: "ranked-token",
        has_game_started: true
      },
      { setRuntimeScore, clonePlain, assignClientRecordId }
    );

    expect(setRuntimeScore).toHaveBeenCalledWith(manager, 2048);
    expect(manager).toEqual(
      expect.objectContaining({
        score: 2048,
        over: true,
        won: false,
        keepPlaying: true,
        initialSeed: 123,
        seed: 456,
        reached32k: true,
        cappedMilestoneCount: 3,
        capped64Unlocked: { cloned: { "64": true } },
        clientRecordId: "rec_saved",
        challengeId: "daily-1",
        rankedSessionToken: "ranked-token",
        hasGameStarted: true,
        sessionSubmitDone: false
      })
    );
    expect(clonePlain).toHaveBeenCalledWith({ "64": true });
    expect(assignClientRecordId).toHaveBeenCalledWith(manager, "rec_saved");
  });

  it("keeps legacy fallback defaults for invalid numeric and object fields", () => {
    const manager = {
      initialSeed: 77,
      capped64Unlocked: { existing: true }
    } as Record<string, unknown>;
    const setRuntimeScore = vi.fn((target: Record<string, unknown>, score: number) => {
      target.score = score;
    });
    const assignClientRecordId = vi.fn((target: Record<string, unknown>, value: string) => {
      target.clientRecordId = value || "generated-client";
    });

    applySavedManagerBaseState(
      manager,
      {
        score: -1,
        initial_seed: Number.NaN,
        seed: Number.POSITIVE_INFINITY,
        capped_milestone_count: 1.5,
        capped64_unlocked: ["bad"],
        client_record_id: 42,
        challenge_id: "",
        ranked_session_token: 123
      },
      { setRuntimeScore, assignClientRecordId }
    );

    expect(manager).toEqual(
      expect.objectContaining({
        score: 0,
        initialSeed: 77,
        seed: 77,
        cappedMilestoneCount: 0,
        capped64Unlocked: { existing: true },
        clientRecordId: "generated-client",
        challengeId: null,
        sessionSubmitDone: false
      })
    );
    expect(manager.rankedSessionToken).toBeUndefined();
    expect(assignClientRecordId).toHaveBeenCalledWith(manager, "");
  });

  it("ignores nullish managers", () => {
    const setRuntimeScore = vi.fn();

    applySavedManagerBaseState(null, { score: 1 }, { setRuntimeScore });

    expect(setRuntimeScore).not.toHaveBeenCalled();
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSavedManagerBaseStateRuntime();
    expect(runtime.applySavedManagerBaseState).toBe(applySavedManagerBaseState);

    const windowLike: { CoreSavedManagerBaseStateRuntime?: SavedManagerBaseStateRuntime } = {};
    expect(installSavedManagerBaseStateRuntime({ windowLike })).toBe(
      windowLike.CoreSavedManagerBaseStateRuntime
    );
    expect(windowLike.CoreSavedManagerBaseStateRuntime?.applySavedManagerBaseState).toBe(
      applySavedManagerBaseState
    );

    const existing = { applySavedManagerBaseState: vi.fn() };
    expect(
      installSavedManagerBaseStateRuntime({
        windowLike: { CoreSavedManagerBaseStateRuntime: existing }
      })
    ).toBe(existing);
  });
});
