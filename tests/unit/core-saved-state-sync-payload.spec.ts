import { describe, expect, it, vi } from "vitest";

import {
  buildSavedStateSyncTrimPayload,
  createSavedStateSyncPayloadRuntime,
  installSavedStateSyncPayloadRuntime,
  parseSavedStateSyncEventPayload,
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

  it("parses valid cross-tab saved-state events and rejects malformed payloads", () => {
    const state = {
      saved_at: 12_345.9,
      mode_key: "standard_4x4_pow2_no_undo"
    };

    expect(
      parseSavedStateSyncEventPayload(
        JSON.stringify({
          source_client_id: "tab-source",
          saved_at: 99_999,
          state
        })
      )
    ).toEqual({
      sourceClientId: "tab-source",
      savedAt: 12_345,
      state
    });

    expect(
      parseSavedStateSyncEventPayload(
        JSON.stringify({
          source_client_id: 42,
          saved_at: 77_777.7,
          state: { mode_key: "standard_4x4_pow2_no_undo" }
        })
      )
    ).toEqual({
      sourceClientId: "",
      savedAt: 77_777,
      state: { mode_key: "standard_4x4_pow2_no_undo" }
    });

    expect(parseSavedStateSyncEventPayload("")).toBeNull();
    expect(parseSavedStateSyncEventPayload("not-json")).toBeNull();
    expect(parseSavedStateSyncEventPayload(JSON.stringify({ state: [] }))).toBeNull();
    expect(parseSavedStateSyncEventPayload(JSON.stringify({ state: {} }))).toBeNull();
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSavedStateSyncPayloadRuntime();
    expect(runtime.buildSavedStateSyncTrimPayload).toBe(buildSavedStateSyncTrimPayload);
    expect(runtime.parseSavedStateSyncEventPayload).toBe(parseSavedStateSyncEventPayload);

    const windowLike: { CoreSavedStateSyncPayloadRuntime?: SavedStateSyncPayloadRuntime } = {};
    expect(installSavedStateSyncPayloadRuntime({ windowLike })).toBe(
      windowLike.CoreSavedStateSyncPayloadRuntime
    );
    expect(windowLike.CoreSavedStateSyncPayloadRuntime?.buildSavedStateSyncTrimPayload).toBe(
      buildSavedStateSyncTrimPayload
    );
    expect(windowLike.CoreSavedStateSyncPayloadRuntime?.parseSavedStateSyncEventPayload).toBe(
      parseSavedStateSyncEventPayload
    );

    const existing = { buildSavedStateSyncTrimPayload: vi.fn(), parseSavedStateSyncEventPayload: vi.fn() };
    expect(
      installSavedStateSyncPayloadRuntime({
        windowLike: { CoreSavedStateSyncPayloadRuntime: existing }
      })
    ).toBe(existing);
  });
});
