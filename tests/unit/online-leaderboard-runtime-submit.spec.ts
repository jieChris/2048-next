import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

const MODE_KEY = "standard_4x4_pow2_no_undo";
const AUTH_TOKEN_STORAGE_KEY = "2048_auth_token_v1";
const AUTH_USER_ID_STORAGE_KEY = "2048_auth_userId_v1";
const ACTIVE_SESSION_KEY = `ranked_session_active:v1:${MODE_KEY}`;
const PREFETCH_SESSION_KEY = `ranked_session_prefetch:v1:${MODE_KEY}`;
const CHECKPOINT_MIRROR_KEY = `ranked_checkpoint_local_mirror:v1:${MODE_KEY}`;
const CHECKPOINT_CLEAR_KEY = `ranked_checkpoint_cleared_at:v1:user:7:${MODE_KEY}`;
const PENDING_RECORD_KEY = "online_pending_record_submit_signature_v1";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.has(key) ? this.values.get(key) || "" : null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

interface FetchCall {
  url: string;
  init: {
    body?: string;
    method?: string;
  };
}

function createElementStub(tagName: string): Record<string, unknown> {
  return {
    tagName: tagName.toUpperCase(),
    children: [],
    className: "",
    id: "",
    textContent: "",
    innerHTML: "",
    parentNode: null,
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      toggle: vi.fn()
    },
    appendChild(child: Record<string, unknown>) {
      child.parentNode = this;
      (this.children as unknown[]).push(child);
      return child;
    },
    insertBefore(child: Record<string, unknown>) {
      child.parentNode = this;
      (this.children as unknown[]).push(child);
      return child;
    },
    setAttribute(name: string, value: string) {
      this[name] = String(value);
    },
    getAttribute(name: string) {
      return this[name] || null;
    },
    querySelector: vi.fn(() => null)
  };
}

function createDocumentStub(): Record<string, unknown> {
  return {
    readyState: "complete",
    hidden: false,
    body: {
      getAttribute: vi.fn(() => "")
    },
    addEventListener: vi.fn(),
    createElement: vi.fn(createElementStub),
    getElementById: vi.fn(() => null),
    querySelector: vi.fn(() => null)
  };
}

function createJsonResponse(payload: unknown, ok = true, status = 200): Record<string, unknown> {
  return {
    ok,
    status,
    headers: {
      get: vi.fn(() => "application/json")
    },
    json: vi.fn(async () => payload)
  };
}

function createTerminatedManager(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    mode: MODE_KEY,
    modeKey: MODE_KEY,
    rankPolicy: "unranked",
    replayMode: false,
    score: 4096,
    over: true,
    won: false,
    keepPlaying: false,
    initialSeed: 123,
    moveHistory: [0, 1],
    successfulMoveCount: 2,
    clientRecordId: "rec_client_1",
    getDurationMs: vi.fn(() => 1200),
    serialize: vi.fn(() => "replay-v1"),
    serializeV3: vi.fn(() => ({ version: 3, moves: [0, 1] })),
    grid: {
      eachCell(callback: (x: number, y: number, tile: { value: number }) => void) {
        callback(0, 0, { value: 4096 });
      },
      serialize: vi.fn(() => ({
        cells: [[{ value: 4096 }]]
      }))
    },
    move: vi.fn(),
    ...overrides
  };
}

function loadOnlineLeaderboardRuntime(options: {
  manager: Record<string, unknown>;
  fetchImpl: (url: string, init: FetchCall["init"]) => Promise<Record<string, unknown>>;
  storage?: MemoryStorage;
}) {
  const storage = options.storage || new MemoryStorage();
  storage.setItem(AUTH_TOKEN_STORAGE_KEY, "auth-token");
  storage.setItem(AUTH_USER_ID_STORAGE_KEY, "7");
  const fetchCalls: FetchCall[] = [];
  const fetchImpl = vi.fn(async (url: string, init: FetchCall["init"]) => {
    fetchCalls.push({ url, init });
    return options.fetchImpl(url, init);
  });
  const windowLike: Record<string, unknown> = {
    __DISABLE_ONLINE_LEADERBOARD__: true,
    document: createDocumentStub(),
    localStorage: storage,
    location: {
      hostname: "2048next.cn",
      origin: "https://2048next.cn",
      pathname: "/2048.html"
    },
    game_manager: options.manager,
    ApiSharedUtils: {
      toText(value: unknown) {
        return value == null ? "" : String(value);
      },
      safeGetStorage(key: string) {
        return storage.getItem(key);
      },
      safeSetStorage(key: string, value: string) {
        storage.setItem(key, value);
      },
      safeRemoveStorage(key: string) {
        storage.removeItem(key);
      },
      buildApiBaseCandidates() {
        return ["https://2048next.cn/api"];
      },
      resolveApiTimeoutMs() {
        return 1000;
      },
      callFetch: fetchImpl
    },
    addEventListener: vi.fn(),
    setTimeout,
    clearTimeout,
    alert: vi.fn()
  };

  const scriptPath = path.resolve(process.cwd(), "js/online_leaderboard_runtime.js");
  const script = readFileSync(scriptPath, "utf8");
  vm.runInNewContext(script, {
    window: windowLike,
    console,
    setTimeout,
    clearTimeout
  });

  return { fetchCalls, fetchImpl, storage, windowLike };
}

async function flushRuntimePromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("online leaderboard terminal submission", () => {
  it("submits verified records and skips legacy score when replay data exists", async () => {
    const manager = createTerminatedManager();
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      fetchImpl: async (url) => {
        if (url.endsWith("/records")) {
          return createJsonResponse({ success: true, data: { id: "record-1" } });
        }
        if (url.endsWith("/score")) {
          return createJsonResponse({ success: true, skipped: true });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(true);
    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/score"))).toBe(false);
  });

  it("clears ranked state and prompts when final record submit reports an expired session", async () => {
    const storage = new MemoryStorage();
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const session = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-1",
      seed: 123,
      ranked_session_token: "ranked-token",
      issued_at: futureExp - 120,
      exp: futureExp
    };
    storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    storage.setItem(PREFETCH_SESSION_KEY, JSON.stringify({ ...session, challenge_id: "ranked-2" }));
    storage.setItem(
      CHECKPOINT_MIRROR_KEY,
      JSON.stringify({
        mode_key: MODE_KEY,
        replay_string: "replay-v1",
        owner_user_id: "7",
        duration_ms: 1200,
        ui_state: {}
      })
    );
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      rankedSessionToken: "ranked-token"
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url) => {
        if (url.endsWith("/records")) {
          return createJsonResponse(
            { success: false, code: "RANKED_SESSION_EXPIRED" },
            false,
            409
          );
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });
    const clearModeSession = vi.fn((modeKey: string) => {
      storage.removeItem(`ranked_session_active:v1:${modeKey}`);
      storage.removeItem(`ranked_session_prefetch:v1:${modeKey}`);
      runtime.windowLike.GAME_CHALLENGE_CONTEXT = null;
    });
    runtime.windowLike.GAME_CHALLENGE_CONTEXT = {
      id: "ranked-1",
      mode_key: MODE_KEY,
      seed: 123,
      ranked_session_token: "ranked-token"
    };
    runtime.windowLike.RankedSessionRuntime = {
      clearModeSession
    };

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(clearModeSession).toHaveBeenCalledWith(MODE_KEY);
    expect(storage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
    expect(storage.getItem(PREFETCH_SESSION_KEY)).toBeNull();
    expect(storage.getItem(CHECKPOINT_MIRROR_KEY)).toBeNull();
    expect(storage.getItem(PENDING_RECORD_KEY)).toBeNull();
    expect(manager.rankedSessionToken).toBe("");
    expect(manager.lastRankedCheckpointSaveError).toBe("RANKED_SESSION_EXPIRED");
    expect(runtime.windowLike.alert).toHaveBeenCalledTimes(1);
    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/score"))).toBe(false);
  });

  it("marks ranked checkpoints cleared synchronously before restart delete completes", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      CHECKPOINT_MIRROR_KEY,
      JSON.stringify({
        mode_key: MODE_KEY,
        replay_string: "old-replay",
        owner_user_id: "7",
        duration_ms: 1200,
        saved_at: Date.now() - 5000,
        ui_state: {}
      })
    );
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      over: false,
      hasGameStarted: true,
      rankedSessionToken: "active-token",
      restart: vi.fn()
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url) => {
        if (url.includes("/ranked-checkpoint")) {
          return createJsonResponse({ success: true, deleted: true });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });
    runtime.windowLike.RankedSessionRuntime = {
      promotePrefetchedSession: vi.fn(() => true),
      ensurePrefetch: vi.fn(async () => true)
    };

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);

    const clearMarkerRaw = storage.getItem(CHECKPOINT_CLEAR_KEY);
    expect(clearMarkerRaw).not.toBeNull();
    expect(storage.getItem(CHECKPOINT_MIRROR_KEY)).toBeNull();
    expect(runtime.fetchCalls.some((call) => call.url.includes("/ranked-checkpoint"))).toBe(true);
    expect(
      runtime.fetchCalls.some(
        (call) => call.url.includes("/ranked-checkpoint") && (call.init as any).keepalive === true
      )
    ).toBe(true);
    await flushRuntimePromises();
  });

  it("keeps the next ranked session when a terminal record submit resolves after restart", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    const oldSession = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-old",
      seed: 123,
      ranked_session_token: "old-ranked-token",
      issued_at: nowSec - 60,
      exp: nowSec + 3600
    };
    const nextSession = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-next",
      seed: 456,
      ranked_session_token: "next-ranked-token",
      issued_at: nowSec,
      exp: nowSec + 3600
    };
    storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(oldSession));
    storage.setItem(PREFETCH_SESSION_KEY, JSON.stringify(nextSession));

    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      rankedSessionToken: "old-ranked-token",
      restart: vi.fn(function (this: Record<string, unknown>) {
        this.over = false;
        this.score = 0;
        this.initialSeed = 456;
        this.moveHistory = [];
        this.rankedSessionToken = "next-ranked-token";
        this.clientRecordId = "rec_client_next";
      })
    });
    let recordPayload: Record<string, unknown> | null = null;
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          await new Promise((resolve) => setTimeout(resolve, 0));
          return createJsonResponse({ success: true, data: { id: "record-old" } });
        }
        if (url.includes("/ranked-checkpoint")) {
          return createJsonResponse({ success: true, deleted: true });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });
    runtime.windowLike.GAME_CHALLENGE_CONTEXT = {
      id: oldSession.challenge_id,
      mode_key: MODE_KEY,
      seed: oldSession.seed,
      ranked_session_token: oldSession.ranked_session_token
    };
    runtime.windowLike.RankedSessionRuntime = {
      getCurrentContext: vi.fn(() => {
        const raw = storage.getItem(ACTIVE_SESSION_KEY);
        if (!raw) return null;
        const active = JSON.parse(raw);
        return {
          id: active.challenge_id,
          mode_key: active.mode_key,
          seed: active.seed,
          ranked_session_token: active.ranked_session_token
        };
      }),
      promotePrefetchedSession: vi.fn(() => {
        storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(nextSession));
        storage.removeItem(PREFETCH_SESSION_KEY);
        runtime.windowLike.GAME_CHALLENGE_CONTEXT = {
          id: nextSession.challenge_id,
          mode_key: MODE_KEY,
          seed: nextSession.seed,
          ranked_session_token: nextSession.ranked_session_token
        };
        return true;
      }),
      ensurePrefetch: vi.fn(async () => true),
      clearActiveSession: vi.fn((modeKey: string) => {
        storage.removeItem(`ranked_session_active:v1:${modeKey}`);
        runtime.windowLike.GAME_CHALLENGE_CONTEXT = null;
      })
    };

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(recordPayload).not.toBeNull();
    expect(recordPayload?.ranked_session_token).toBe("old-ranked-token");
    expect(storage.getItem(ACTIVE_SESSION_KEY)).not.toBeNull();
    expect(JSON.parse(storage.getItem(ACTIVE_SESSION_KEY) || "{}").ranked_session_token).toBe(
      "next-ranked-token"
    );
    expect(runtime.windowLike.GAME_CHALLENGE_CONTEXT).toMatchObject({
      ranked_session_token: "next-ranked-token"
    });
  });

  it("does not restore stale ranked checkpoints from a previous active session", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    storage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        mode_key: MODE_KEY,
        challenge_id: "ranked-new",
        seed: 456,
        ranked_session_token: "active-token",
        issued_at: nowSec,
        exp: nowSec + 3600
      })
    );
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      over: false,
      score: 0,
      hasGameStarted: false,
      moveHistory: [],
      needsRankedCheckpointRestore: true,
      lastRankedCheckpointRestoreError: ""
    });
    const oldCheckpointAt = new Date((nowSec - 60) * 1000).toISOString();
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url) => {
        if (url.includes("/ranked-checkpoint")) {
          return createJsonResponse({
            success: true,
            data: {
              mode_key: MODE_KEY,
              mode_bucket: "standard_no_undo",
              ranked_session_token: "old-token",
              client_record_id: "old-record",
              replay_string: "old-replay",
              duration_ms: 3000,
              updated_at: oldCheckpointAt,
              ui_state: {
                saved_state: {
                  v: 1,
                  saved_at: (nowSec - 60) * 1000,
                  mode_key: MODE_KEY,
                  board_width: 4,
                  board_height: 4,
                  ruleset: "pow2",
                  board: [[1024, 1024, 0, 0]],
                  score: 424242,
                  over: false,
                  won: false,
                  keep_playing: false
                }
              }
            }
          });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    runtime.windowLike.OnlineLeaderboardRuntime.scheduleRankedCheckpointRestore(manager, {
      delayMs: 0
    });
    await flushRuntimePromises();

    expect(manager.needsRankedCheckpointRestore).toBe(false);
    expect(manager.rankCheckpointRestorePending).toBe(false);
    expect(manager.lastRankedCheckpointRestoreError).toBe("");
    expect(manager.score).toBe(0);
  });
});
