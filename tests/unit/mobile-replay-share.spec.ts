import { describe, expect, it, vi } from "vitest";

import {
  REPLAY_FILENAME,
  saveReplayRecord,
  type ReplayShareNativePort,
} from "../../mobile/src/platform/replay-share";
import type { ReplayRecord } from "../../src/contracts";

const replay: ReplayRecord = {
  version: 1,
  kind: "rpl1",
  modeKey: "standard_4x4_pow2_no_undo",
  replayString: "REPLAY_v1RPL_B64_ZmFrZQ==",
};

describe("mobile replay share", () => {
  it("shares the exact ReplayRecord JSON from the dedicated cache subtree", async () => {
    const native: ReplayShareNativePort = {
      write: vi.fn(async () => undefined),
      uri: vi.fn(async () => "content://replay-export"),
      share: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    };

    await saveReplayRecord(replay, { native });

    expect(native.write).toHaveBeenCalledWith(
      `replay-share/${REPLAY_FILENAME}`,
      JSON.stringify(replay, null, 2),
    );
    expect(native.share).toHaveBeenCalledWith(
      "content://replay-export",
      "2048 NEXT replay",
    );
    expect(native.remove).toHaveBeenCalledTimes(1);
  });

  it("removes the temporary replay when the system share panel is cancelled", async () => {
    const native: ReplayShareNativePort = {
      write: vi.fn(async () => undefined),
      uri: vi.fn(async () => "content://replay-export"),
      share: vi.fn(async () => {
        throw new Error("share_cancelled");
      }),
      remove: vi.fn(async () => undefined),
    };

    await expect(saveReplayRecord(replay, { native })).rejects.toThrow(
      "share_cancelled",
    );
    expect(native.remove).toHaveBeenCalledTimes(1);
  });
});
