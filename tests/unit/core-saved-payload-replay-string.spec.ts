import { describe, expect, it, vi } from "vitest";

import {
  createSavedPayloadReplayStringRuntime,
  installSavedPayloadReplayStringRuntime,
  resolveReplayStringForSavedPayload,
  type SavedPayloadReplayStringRuntime
} from "../../src/core/saved-payload-replay-string";

describe("core saved payload replay string", () => {
  it("serializes live replay strings and records the save timestamp", () => {
    const manager = {
      lastReplayStringSavedAt: 0
    };
    const serializeReplay = vi.fn(() => "REPLAY_v1RPL_B64_live");

    expect(resolveReplayStringForSavedPayload(manager, 10_000, {}, { serializeReplay })).toBe(
      "REPLAY_v1RPL_B64_live"
    );
    expect(serializeReplay).toHaveBeenCalledWith(manager);
    expect(manager.lastReplayStringSavedAt).toBe(10_000);
  });

  it("throttles replay string saves unless forced", () => {
    const manager = {
      lastReplayStringSavedAt: 9_000
    };
    const serializeReplay = vi.fn(() => "REPLAY_v1RPL_B64_live");

    expect(resolveReplayStringForSavedPayload(manager, 10_000, {}, { serializeReplay })).toBe("");
    expect(serializeReplay).not.toHaveBeenCalled();

    expect(resolveReplayStringForSavedPayload(manager, 10_000, { force: true }, { serializeReplay })).toBe(
      "REPLAY_v1RPL_B64_live"
    );
  });

  it("uses rescue replay string when serialization is unavailable", () => {
    const manager = {
      rescueReplayString: "  REPLAY_v1RPL_B64_rescue  "
    };

    expect(
      resolveReplayStringForSavedPayload(manager, 10_000, { force: true }, {
        serializeReplay: () => {
          throw new Error("serialize unavailable");
        }
      })
    ).toBe("REPLAY_v1RPL_B64_rescue");
    expect(manager).toMatchObject({ lastReplayStringSavedAt: 10_000 });
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSavedPayloadReplayStringRuntime();
    expect(runtime.resolveReplayStringForSavedPayload).toBe(resolveReplayStringForSavedPayload);

    const windowLike: { CoreSavedPayloadReplayStringRuntime?: SavedPayloadReplayStringRuntime } = {};
    expect(installSavedPayloadReplayStringRuntime({ windowLike })).toBe(
      windowLike.CoreSavedPayloadReplayStringRuntime
    );
    expect(windowLike.CoreSavedPayloadReplayStringRuntime?.resolveReplayStringForSavedPayload).toBe(
      resolveReplayStringForSavedPayload
    );

    const existing = { resolveReplayStringForSavedPayload: vi.fn() };
    expect(
      installSavedPayloadReplayStringRuntime({
        windowLike: { CoreSavedPayloadReplayStringRuntime: existing }
      })
    ).toBe(existing);
  });
});
