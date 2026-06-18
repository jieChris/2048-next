import { describe, expect, it, vi } from "vitest";

import {
  buildSavedStateSyncTrimPayload,
  createSavedStateSyncPayloadRuntime,
  installSavedStateSyncPayloadRuntime,
  type SavedStateSyncPayloadRuntime
} from "../../src/core/saved-state-sync-payload";

describe("core saved-state sync payload", () => {
  it("builds lightweight trim fields for cross-tab sync", () => {
    expect(buildSavedStateSyncTrimPayload({ ipsInputCount: 4 })).toEqual({
      move_history: [],
      undo_stack: [],
      redo_stack: [],
      replay_compact_log: "",
      session_replay_v3: null,
      replay_string: "",
      ips_input_count: 4
    });
    expect(buildSavedStateSyncTrimPayload({ ipsInputCount: -1 }).ips_input_count).toBe(0);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSavedStateSyncPayloadRuntime();
    expect(runtime.buildSavedStateSyncTrimPayload).toBe(buildSavedStateSyncTrimPayload);

    const windowLike: { CoreSavedStateSyncPayloadRuntime?: SavedStateSyncPayloadRuntime } = {};
    expect(installSavedStateSyncPayloadRuntime({ windowLike })).toBe(
      windowLike.CoreSavedStateSyncPayloadRuntime
    );
    expect(windowLike.CoreSavedStateSyncPayloadRuntime?.buildSavedStateSyncTrimPayload).toBe(
      buildSavedStateSyncTrimPayload
    );

    const existing = { buildSavedStateSyncTrimPayload: vi.fn() };
    expect(
      installSavedStateSyncPayloadRuntime({
        windowLike: { CoreSavedStateSyncPayloadRuntime: existing }
      })
    ).toBe(existing);
  });
});
