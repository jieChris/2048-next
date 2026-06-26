import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

const MODE_KEY = "standard_4x4_pow2_no_undo";
const UNDO_MODE_KEY = "classic_4x4_pow2_undo";
const AUTH_TOKEN_STORAGE_KEY = "2048_auth_token_v1";
const AUTH_USER_ID_STORAGE_KEY = "2048_auth_userId_v1";
const ACTIVE_SESSION_KEY = `ranked_session_active:v1:${MODE_KEY}`;
const UNDO_ACTIVE_SESSION_KEY = `ranked_session_active:v1:${UNDO_MODE_KEY}`;
const PREFETCH_SESSION_KEY = `ranked_session_prefetch:v1:${MODE_KEY}`;
const CHECKPOINT_MIRROR_KEY = `ranked_checkpoint_local_mirror:v1:${MODE_KEY}`;
const CHECKPOINT_CLEAR_KEY = `ranked_checkpoint_cleared_at:v1:user:7:${MODE_KEY}`;
const PENDING_RECORD_KEY = "online_pending_record_submit_signature_v1";
const PENDING_SCORE_KEY = "online_pending_score_submit_v1";
const LAST_RECORD_SUBMIT_KEY = "online_last_record_submit_signature_v1";
const LAST_RECORD_RESULT_KEY = "online_last_record_submit_result_v1";
const BEST_SCORE_KEY = `bestScoreByMode:${MODE_KEY}`;
const TIMER_LEADERBOARD_CACHE_KEY = `timer_leaderboard_cache:v1:${MODE_KEY}|all`;

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
    keepalive?: boolean;
    method?: string;
  };
}

function createElementStub(tagName: string): Record<string, unknown> {
  const listeners = new Map<string, Array<(event?: unknown) => void>>();
  return {
    tagName: tagName.toUpperCase(),
    children: [],
    className: "",
    id: "",
    textContent: "",
    innerHTML: "",
    parentNode: null,
    style: {},
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(() => false),
      toggle: vi.fn()
    },
    addEventListener: vi.fn((type: string, listener: (event?: unknown) => void) => {
      const handlers = listeners.get(type) || [];
      handlers.push(listener);
      listeners.set(type, handlers);
    }),
    removeEventListener: vi.fn((type: string, listener: (event?: unknown) => void) => {
      const handlers = listeners.get(type) || [];
      listeners.set(
        type,
        handlers.filter((handler) => handler !== listener)
      );
    }),
    dispatchEvent(event: { type?: string }) {
      const handlers = listeners.get(String(event && event.type ? event.type : ""));
      if (!handlers) return true;
      handlers.forEach((handler) => handler(event));
      return true;
    },
    dispatch(type: string, event?: unknown) {
      const handlers = listeners.get(type) || [];
      handlers.forEach((handler) => handler(event));
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
    removeAttribute(name: string) {
      delete this[name];
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

function activeSessionKeyForMode(modeKey: string): string {
  return `ranked_session_active:v1:${modeKey}`;
}

function createScoreManagerStub(storage: MemoryStorage, score: number): Record<string, unknown> {
  storage.setItem(BEST_SCORE_KEY, String(score));
  return {
    get: vi.fn(() => storage.getItem(BEST_SCORE_KEY) || "0"),
    set: vi.fn((nextScore: number) => {
      storage.setItem(BEST_SCORE_KEY, String(nextScore));
    })
  };
}

function loadOnlineLeaderboardRuntime(options: {
  manager: Record<string, unknown>;
  fetchImpl: (url: string, init: FetchCall["init"]) => Promise<Record<string, unknown>>;
  disableOnlineLeaderboard?: boolean;
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
    __DISABLE_ONLINE_LEADERBOARD__: options.disableOnlineLeaderboard !== false,
    document: createDocumentStub(),
    localStorage: storage,
    location: {
      hostname: "2048next.cn",
      origin: "https://2048next.cn",
      pathname: "/2048.html"
    },
    URLSearchParams,
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
    clearTimeout,
    applySavedStateRestore(manager: Record<string, unknown>, savedState: Record<string, unknown>) {
      manager.score = Number(savedState.score || 0);
      manager.over = !!savedState.over;
      manager.won = !!savedState.won;
      manager.keepPlaying = !!savedState.keep_playing;
      return true;
    }
  });

  return { fetchCalls, fetchImpl, storage, windowLike };
}

async function flushRuntimePromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function collectTextContent(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const record = node as Record<string, unknown>;
  const ownText = typeof record.textContent === "string" ? record.textContent : "";
  const childText = Array.isArray(record.children)
    ? record.children.map((child) => collectTextContent(child)).join(" ")
    : "";
  return `${ownText} ${childText}`.trim();
}

describe("online leaderboard terminal submission", () => {
  it("syncs the authenticated account best score for the current exact mode on startup", async () => {
    const storage = new MemoryStorage();
    const scoreManager = createScoreManagerStub(storage, 16);
    const bestContainer = { textContent: "" };
    const updateBestScore = vi.fn((bestScore: number | string) => {
      bestContainer.textContent = String(bestScore);
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({
        over: false,
        score: 0,
        scoreManager,
        actuator: {
          bestContainer,
          updateBestScore
        }
      }),
      storage,
      disableOnlineLeaderboard: false,
      fetchImpl: async (url) => {
        if (url.includes("/user/7/records")) {
          return createJsonResponse({
            success: true,
            data: [
              { mode_key: "capped_4x4_pow2_no_undo", mode_bucket: "standard_no_undo", score: 8192 },
              { mode_key: MODE_KEY, mode_bucket: "standard_no_undo", score: 4096 }
            ]
          });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    await flushRuntimePromises();

    const bestScoreCall = runtime.fetchCalls.find((call) => call.url.includes("/user/7/records"));
    expect(bestScoreCall?.url).toContain("mode=standard_no_undo");
    expect(bestScoreCall?.url).toContain(`mode_key=${encodeURIComponent(MODE_KEY)}`);
    expect(scoreManager.set).toHaveBeenCalledWith(4096);
    expect(storage.getItem(BEST_SCORE_KEY)).toBe("4096");
    expect(updateBestScore).toHaveBeenCalledWith("4096");
    expect(bestContainer.textContent).toBe("4096");
  });

  it("does not lower the local best score when the account record is lower", async () => {
    const storage = new MemoryStorage();
    const scoreManager = createScoreManagerStub(storage, 8192);
    const updateBestScore = vi.fn();
    loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({
        over: false,
        score: 0,
        scoreManager,
        actuator: {
          bestContainer: { textContent: "" },
          updateBestScore
        }
      }),
      storage,
      disableOnlineLeaderboard: false,
      fetchImpl: async (url) => {
        if (url.includes("/user/7/records")) {
          return createJsonResponse({
            success: true,
            data: [{ mode_key: MODE_KEY, mode_bucket: "standard_no_undo", score: 4096 }]
          });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    await flushRuntimePromises();

    expect(scoreManager.set).not.toHaveBeenCalled();
    expect(storage.getItem(BEST_SCORE_KEY)).toBe("8192");
    expect(updateBestScore).not.toHaveBeenCalled();
  });

  it("retries pending record submit immediately on startup even during retry backoff", async () => {
    const storage = new MemoryStorage();
    const now = Date.now();
    storage.setItem(
      PENDING_RECORD_KEY,
      JSON.stringify({
        signature: "pending-record-signature",
        payload: {
          mode_key: MODE_KEY,
          score: 2048,
          replay_string: "pending-replay-v1"
        },
        ownerUserId: "7",
        createdAt: now,
        lastAttemptAt: now,
        retryCount: 4
      })
    );
    let recordPayload: Record<string, unknown> | null = null;
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({ over: false, score: 0 }),
      storage,
      disableOnlineLeaderboard: false,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          return createJsonResponse({ success: true, data: { id: "record-pending-startup" } });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    await flushRuntimePromises();

    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(true);
    expect(storage.getItem(PENDING_RECORD_KEY)).toBeNull();
    expect(storage.getItem(PENDING_SCORE_KEY)).toBeNull();
    expect(recordPayload).toMatchObject({
      mode_key: MODE_KEY,
      score: 2048,
      replay_string: "pending-replay-v1"
    });
    expect(
      runtime.fetchCalls.some(
        (call) =>
          call.url.includes("/leaderboard?") &&
          call.url.includes("mode_key=standard_4x4_pow2_no_undo")
      )
    ).toBe(true);
  });

  it("keeps old ranked pending record payloads retryable beyond the normal offline retry window", async () => {
    const storage = new MemoryStorage();
    const now = Date.now();
    storage.setItem(
      PENDING_RECORD_KEY,
      JSON.stringify({
        signature: "old-ranked-record-signature",
        payload: {
          mode_key: MODE_KEY,
          score: 4096,
          replay_string: "old-ranked-replay-v1",
          ranked_session_token: "ranked-token",
          challenge_id: "ranked-1",
          initial_seed: 123,
          seed: 123,
          ranked_verification: {
            random_source: "server_seed",
            replay_format: "v1",
            challenge_id: "ranked-1",
            seed: 123,
            mode_key: MODE_KEY,
            ranked_session_token: "ranked-token"
          }
        },
        ownerUserId: "7",
        createdAt: now - 10 * 24 * 60 * 60 * 1000,
        lastAttemptAt: now - 10 * 24 * 60 * 60 * 1000,
        retryCount: 8
      })
    );
    let recordPayload: Record<string, unknown> | null = null;
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({ over: false, score: 0 }),
      storage,
      disableOnlineLeaderboard: false,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          return createJsonResponse({ success: true, data: { id: "record-old-ranked-pending" } });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    await flushRuntimePromises();

    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(true);
    expect(recordPayload).toMatchObject({
      mode_key: MODE_KEY,
      score: 4096,
      replay_string: "old-ranked-replay-v1",
      ranked_session_token: "ranked-token",
      challenge_id: "ranked-1",
      initial_seed: 123,
      seed: 123
    });
    expect(storage.getItem(PENDING_RECORD_KEY)).toBeNull();
  });

  it("submits online record when local terminal auto-submit runs", async () => {
    const localAutoSubmit = vi.fn(function (this: Record<string, unknown>) {
      this.sessionSubmitDone = true;
    });
    const manager = createTerminatedManager({
      tryAutoSubmitOnGameOver: localAutoSubmit
    });
    let recordPayload: Record<string, unknown> | null = null;
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          return createJsonResponse({ success: true, data: { id: "record-from-local-submit" } });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.tryAutoSubmitOnGameOver as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(localAutoSubmit).toHaveBeenCalledTimes(1);
    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(true);
    expect(recordPayload).toMatchObject({
      mode_key: MODE_KEY,
      score: 4096,
      replay_string: "replay-v1"
    });
  });

  it.each([
    ["fib_4x4_no_undo", "fib_4x4"],
    ["board_3x3_pow2_no_undo", "pow2_3x3"]
  ])("submits terminal ranked records for expanded mode %s", async (modeKey, modeBucket) => {
    const storage = new MemoryStorage();
    storage.setItem(
      activeSessionKeyForMode(modeKey),
      JSON.stringify({
        mode_key: modeKey,
        challenge_id: `ranked-${modeKey}`,
        seed: 123,
        ranked_session_token: `ranked-token-${modeKey}`,
        issued_at: Math.floor(Date.now() / 1000) - 60,
        exp: Math.floor(Date.now() / 1000) + 3600,
        owner_user_id: "7"
      })
    );
    const localAutoSubmit = vi.fn(function (this: Record<string, unknown>) {
      this.sessionSubmitDone = true;
    });
    const manager = createTerminatedManager({
      mode: modeKey,
      modeKey,
      rankPolicy: "ranked",
      rankedBucket: modeBucket,
      rankedSessionToken: `ranked-token-${modeKey}`,
      challengeId: `ranked-${modeKey}`,
      tryAutoSubmitOnGameOver: localAutoSubmit
    });
    let recordPayload: Record<string, unknown> | null = null;
    loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          return createJsonResponse({ success: true, data: { id: "record-expanded-mode" } });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.tryAutoSubmitOnGameOver as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(recordPayload).toMatchObject({
      mode: modeBucket,
      mode_key: modeKey,
      mode_bucket: modeBucket,
      ranked_session_token: `ranked-token-${modeKey}`,
      challenge_id: `ranked-${modeKey}`,
      seed: 123,
      end_reason: "game_over"
    });
  });

  it("defers ranked undo-mode death record submit until restart", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      UNDO_ACTIVE_SESSION_KEY,
      JSON.stringify({
        mode_key: UNDO_MODE_KEY,
        challenge_id: "ranked-undo",
        seed: 123,
        ranked_session_token: "ranked-token-undo",
        issued_at: Math.floor(Date.now() / 1000) - 60,
        exp: Math.floor(Date.now() / 1000) + 3600,
        owner_user_id: "7"
      })
    );
    const localAutoSubmit = vi.fn(function (this: Record<string, unknown>) {
      this.sessionSubmitDone = true;
    });
    const originalRestart = vi.fn(function (this: Record<string, unknown>) {
      this.over = false;
      this.score = 0;
      this.moveHistory = [];
      this.clientRecordId = "rec_client_undo_next";
    });
    const manager = createTerminatedManager({
      mode: UNDO_MODE_KEY,
      modeKey: UNDO_MODE_KEY,
      modeConfig: {
        key: UNDO_MODE_KEY,
        undo_enabled: true,
        rank_policy: "ranked",
        ranked_bucket: "standard_undo"
      },
      undoEnabled: true,
      rankPolicy: "ranked",
      rankedBucket: "standard_undo",
      rankedSessionToken: "ranked-token-undo",
      challengeId: "ranked-undo",
      tryAutoSubmitOnGameOver: localAutoSubmit,
      restart: originalRestart
    });
    let recordPayload: Record<string, unknown> | null = null;
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          return createJsonResponse({ success: true, data: { id: "record-undo-mode" } });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.tryAutoSubmitOnGameOver as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(localAutoSubmit).toHaveBeenCalledTimes(1);
    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(false);
    expect(recordPayload).toBeNull();

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(true);
    expect(recordPayload).toMatchObject({
      mode: "standard_undo",
      mode_key: UNDO_MODE_KEY,
      mode_bucket: "standard_undo",
      ranked_session_token: "ranked-token-undo",
      challenge_id: "ranked-undo",
      seed: 123,
      end_reason: "game_over"
    });
  });

  it("submits recovered online records with rescue replay fallback when live serialization is unavailable", async () => {
    const localAutoSubmit = vi.fn(function (this: Record<string, unknown>) {
      this.sessionSubmitDone = true;
    });
    const manager = createTerminatedManager({
      tryAutoSubmitOnGameOver: localAutoSubmit,
      serialize: vi.fn(() => {
        throw new Error("replay_v1_unavailable");
      }),
      serializeV3: vi.fn(() => null),
      rescueReplayString: "REPLAY_v1RPL_B64_rescue"
    });
    let recordPayload: Record<string, unknown> | null = null;
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          return createJsonResponse({ success: true, data: { id: "record-from-rescue" } });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.tryAutoSubmitOnGameOver as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(localAutoSubmit).toHaveBeenCalledTimes(1);
    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(true);
    expect(recordPayload).toMatchObject({
      mode_key: MODE_KEY,
      score: 4096,
      replay_string: "REPLAY_v1RPL_B64_rescue"
    });
  });

  it("submits repeated recovered records when a new client record id distinguishes the session", async () => {
    const manager = createTerminatedManager({
      serialize: vi.fn(() => {
        throw new Error("replay_v1_unavailable");
      }),
      serializeV3: vi.fn(() => null),
      rescueReplayString: "REPLAY_v1RPL_B64_same_rescue",
      clientRecordId: "rec_rescue_first"
    });
    const recordPayloads: Record<string, unknown>[] = [];
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayloads.push(init.body ? (JSON.parse(init.body) as Record<string, unknown>) : {});
          return createJsonResponse({ success: true, data: { id: `record-${recordPayloads.length}` } });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    manager.clientRecordId = "rec_rescue_second";
    manager.sessionSubmitDone = false;
    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(runtime.fetchCalls.filter((call) => call.url.endsWith("/records"))).toHaveLength(2);
    expect(recordPayloads.map((payload) => payload.client_record_id)).toEqual([
      "rec_rescue_first",
      "rec_rescue_second"
    ]);
    expect(recordPayloads.map((payload) => payload.replay_string)).toEqual([
      "REPLAY_v1RPL_B64_same_rescue",
      "REPLAY_v1RPL_B64_same_rescue"
    ]);
  });

  it("uses keepalive when flushing terminal record during pagehide", async () => {
    const manager = createTerminatedManager();
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      fetchImpl: async (url) => {
        if (url.endsWith("/records")) {
          return createJsonResponse({ success: true, data: { id: "record-keepalive" } });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });
    const addEventListenerMock = runtime.windowLike.addEventListener as ReturnType<typeof vi.fn>;
    const pagehideCall = addEventListenerMock.mock.calls.find((call) => call[0] === "pagehide");
    expect(pagehideCall).toBeTruthy();

    const pagehideHandler = pagehideCall?.[1] as (() => void) | undefined;
    pagehideHandler?.();
    await flushRuntimePromises();

    const recordCall = runtime.fetchCalls.find((call) => call.url.endsWith("/records"));
    expect(recordCall?.init.keepalive).toBe(true);
  });

  it("submits verified records and skips legacy score when replay data exists", async () => {
    const manager = createTerminatedManager();
    let recordPayload: Record<string, unknown> | null = null;
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
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
    expect(
      runtime.fetchCalls.some(
        (call) =>
          call.url.includes("/leaderboard?") &&
          call.url.includes("mode_key=standard_4x4_pow2_no_undo")
      )
    ).toBe(true);
    expect(recordPayload).toMatchObject({
      mode_key: MODE_KEY,
      ranked_session_token: null,
      challenge_id: null,
      initial_seed: null,
      seed: null,
      ranked_verification: null,
      client_record_id: "rec_client_1",
      replay_string: "replay-v1"
    });
  });

  it("renders persisted timer leaderboard cache immediately while refreshing in the background", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      TIMER_LEADERBOARD_CACHE_KEY,
      JSON.stringify({
        key: `${MODE_KEY}|all`,
        rows: [{ user_id: 11, nickname: "CachedUser", score: 8192 }],
        time: Date.now() - 60_000
      })
    );

    const list = createElementStub("div");
    list.id = "timer-leaderboard-list";
    const summary = createElementStub("div");
    summary.id = "timer-leaderboard-summary";
    const panel = createElementStub("div");
    panel.id = "timer-leaderboard-panel";
    const timerBox = createElementStub("div");
    timerBox.id = "timerbox";
    const elements: Record<string, Record<string, unknown>> = {
      "timerbox": timerBox,
      "timer-leaderboard-panel": panel,
      "timer-leaderboard-summary": summary,
      "timer-leaderboard-list": list
    };

    const refreshDeferred = createDeferred<Record<string, unknown>>();
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({
        over: false,
        score: 0,
        getTimerModuleViewMode: vi.fn(() => "hidden")
      }),
      storage,
      disableOnlineLeaderboard: false,
      fetchImpl: async (url) => {
        if (url.includes("/leaderboard?")) return refreshDeferred.promise;
        return createJsonResponse({ success: true, data: [] });
      }
    });
    const documentLike = runtime.windowLike.document as Record<string, unknown>;
    documentLike.getElementById = vi.fn((id: string) => elements[id] || null);

    const onlineRuntime = runtime.windowLike.OnlineLeaderboardRuntime as {
      refreshTimerLeaderboardPanel: (force?: boolean, preferCached?: boolean) => Promise<boolean>;
    };
    const refreshPromise = onlineRuntime.refreshTimerLeaderboardPanel(false, true);

    const renderedText = collectTextContent(list);
    expect(renderedText).toContain("CachedUser");
    expect(renderedText).toContain("8192");
    expect(runtime.fetchCalls.find((call) => call.url.includes("/leaderboard?"))?.url).toContain("limit=10");

    refreshDeferred.resolve(createJsonResponse({ success: true, data: [] }));
    await refreshPromise;
    await flushRuntimePromises();
  });

  it("leaves flying click effects to the hidden easter egg binding", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      TIMER_LEADERBOARD_CACHE_KEY,
      JSON.stringify({
        key: `${MODE_KEY}|all`,
        rows: [{ user_id: 11, nickname: "CachedUser", score: 8192 }],
        time: Date.now() - 60_000
      })
    );

    const list = createElementStub("div");
    list.id = "timer-leaderboard-list";
    const summary = createElementStub("div");
    summary.id = "timer-leaderboard-summary";
    const panel = createElementStub("div");
    panel.id = "timer-leaderboard-panel";
    const timerBox = createElementStub("div");
    timerBox.id = "timerbox";
    const elements: Record<string, Record<string, unknown>> = {
      "timerbox": timerBox,
      "timer-leaderboard-panel": panel,
      "timer-leaderboard-summary": summary,
      "timer-leaderboard-list": list
    };
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({
        over: false,
        score: 0,
        getTimerModuleViewMode: vi.fn(() => "hidden")
      }),
      storage,
      disableOnlineLeaderboard: false,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });
    runtime.windowLike.CoreFlyingClickEffectRuntime = {
      bindFlyingClickEffect: vi.fn()
    };
    const documentLike = runtime.windowLike.document as Record<string, unknown>;
    documentLike.getElementById = vi.fn((id: string) => elements[id] || null);

    const onlineRuntime = runtime.windowLike.OnlineLeaderboardRuntime as {
      refreshTimerLeaderboardPanel: (force?: boolean, preferCached?: boolean) => Promise<boolean>;
    };
    await onlineRuntime.refreshTimerLeaderboardPanel(false, true);

    const selfRow = (list.children as Array<Record<string, unknown>>)[10];
    const rankTile = (selfRow.children as Array<Record<string, unknown>>)[0];
    expect(rankTile.__timerLeaderboardSelfRankFlyingEffectBinding).toBe(true);
    expect(runtime.windowLike.CoreFlyingClickEffectRuntime.bindFlyingClickEffect).not.toHaveBeenCalled();
  });

  it("binds the hidden breakout easter egg only to the self timer leaderboard rank tile", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      TIMER_LEADERBOARD_CACHE_KEY,
      JSON.stringify({
        key: `${MODE_KEY}|all`,
        rows: [{ user_id: 11, nickname: "CachedUser", score: 8192 }],
        time: Date.now() - 60_000
      })
    );

    const list = createElementStub("div");
    list.id = "timer-leaderboard-list";
    const summary = createElementStub("div");
    summary.id = "timer-leaderboard-summary";
    const panel = createElementStub("div");
    panel.id = "timer-leaderboard-panel";
    const timerBox = createElementStub("div");
    timerBox.id = "timerbox";
    const elements: Record<string, Record<string, unknown>> = {
      "timerbox": timerBox,
      "timer-leaderboard-panel": panel,
      "timer-leaderboard-summary": summary,
      "timer-leaderboard-list": list
    };

    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({
        over: false,
        score: 0,
        getTimerModuleViewMode: vi.fn(() => "hidden")
      }),
      storage,
      disableOnlineLeaderboard: false,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });
    runtime.windowLike.CoreBreakoutEasterEggRuntime = {
      bindBreakoutEasterEgg: vi.fn(() => ({
        destroy: vi.fn()
      })),
      openBreakoutEasterEgg: vi.fn()
    };
    const documentLike = runtime.windowLike.document as Record<string, unknown>;
    documentLike.getElementById = vi.fn((id: string) => elements[id] || null);

    const onlineRuntime = runtime.windowLike.OnlineLeaderboardRuntime as {
      refreshTimerLeaderboardPanel: (force?: boolean, preferCached?: boolean) => Promise<boolean>;
    };
    await onlineRuntime.refreshTimerLeaderboardPanel(false, true);

    const firstRow = (list.children as Array<Record<string, unknown>>)[0];
    const firstRankTile = (firstRow.children as Array<Record<string, unknown>>)[0];
    const selfRow = (list.children as Array<Record<string, unknown>>)[10];
    const selfRankTile = (selfRow.children as Array<Record<string, unknown>>)[0];

    expect(runtime.windowLike.CoreBreakoutEasterEggRuntime.bindBreakoutEasterEgg).toHaveBeenCalledTimes(1);
    expect(runtime.windowLike.CoreBreakoutEasterEggRuntime.bindBreakoutEasterEgg).toHaveBeenCalledWith(
      selfRankTile,
      expect.objectContaining({
        gameUrl: "./easter-eggs/breakout/index.html",
        enableClickEffect: true,
        logoSrc: "meta/favicon.svg?v=20260606-fillframe",
        logoAlt: "2048",
        triggerCount: 19
      })
    );
    expect(runtime.windowLike.CoreBreakoutEasterEggRuntime.bindBreakoutEasterEgg).not.toHaveBeenCalledWith(
      firstRankTile,
      expect.anything()
    );
  });

  it("does not pair a current ranked token with a replay started from a different seed", async () => {
    const storage = new MemoryStorage();
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      rankedSessionToken: "",
      challengeId: null,
      initialSeed: 111,
      seed: 111
    });
    let recordPayload: Record<string, unknown> | null = null;
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          return createJsonResponse({ success: true, data: { id: "record-1" } });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });
    runtime.windowLike.GAME_CHALLENGE_CONTEXT = {
      id: "ranked-current",
      mode_key: MODE_KEY,
      seed: 222,
      ranked_session_token: "current-ranked-token"
    };

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(recordPayload).not.toBeNull();
    expect(recordPayload?.ranked_session_token).toBeNull();
    expect(recordPayload?.challenge_id).toBeNull();
    expect(recordPayload?.ranked_verification).toBeNull();
    expect(recordPayload?.initial_seed).toBeNull();
    expect(recordPayload?.seed).toBeNull();
  });

  it("does not trust a manager ranked token when the active ranked seed differs from the replay seed", async () => {
    const storage = new MemoryStorage();
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      rankedSessionToken: "current-ranked-token",
      challengeId: "ranked-current",
      initialSeed: 111,
      seed: 111
    });
    let recordPayload: Record<string, unknown> | null = null;
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          return createJsonResponse({ success: true, data: { id: "record-1" } });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });
    runtime.windowLike.GAME_CHALLENGE_CONTEXT = {
      id: "ranked-current",
      mode_key: MODE_KEY,
      seed: 222,
      ranked_session_token: "current-ranked-token"
    };

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(recordPayload).not.toBeNull();
    expect(recordPayload?.ranked_session_token).toBeNull();
    expect(recordPayload?.challenge_id).toBeNull();
    expect(recordPayload?.ranked_verification).toBeNull();
    expect(recordPayload?.initial_seed).toBeNull();
    expect(recordPayload?.seed).toBeNull();
  });

  it("keeps ranked state and pending record retryable when final record submit reports an expired session", async () => {
    const storage = new MemoryStorage();
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const session = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-1",
      seed: 123,
      ranked_session_token: "ranked-token",
      issued_at: futureExp - 120,
      exp: futureExp,
      owner_user_id: "7"
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

    expect(clearModeSession).not.toHaveBeenCalled();
    expect(JSON.parse(storage.getItem(ACTIVE_SESSION_KEY) || "{}")).toMatchObject({
      ranked_session_token: "ranked-token",
      challenge_id: "ranked-1",
      seed: 123
    });
    expect(storage.getItem(PREFETCH_SESSION_KEY)).not.toBeNull();
    expect(JSON.parse(storage.getItem(PENDING_RECORD_KEY) || "{}")).toMatchObject({
      signature: expect.any(String),
      payload: {
        mode_key: MODE_KEY,
        ranked_session_token: "ranked-token",
        challenge_id: "ranked-1",
        initial_seed: 123,
        seed: 123
      }
    });
    expect(manager.rankedSessionToken).toBe("ranked-token");
    expect(manager.lastRankedCheckpointSaveError || "").not.toBe("RANKED_SESSION_EXPIRED");
    expect(runtime.windowLike.alert).not.toHaveBeenCalled();
    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/score"))).toBe(false);
  });

  it("does not pair a current ranked token with a replay started from a different seed", async () => {
    const storage = new MemoryStorage();
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      rankedSessionToken: "",
      challengeId: null,
      initialSeed: 111,
      seed: 111
    });
    let recordPayload: Record<string, unknown> | null = null;
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          return createJsonResponse({ success: true, data: { id: "record-1" } });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });
    runtime.windowLike.GAME_CHALLENGE_CONTEXT = {
      id: "ranked-current",
      mode_key: MODE_KEY,
      seed: 222,
      ranked_session_token: "current-ranked-token"
    };

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(recordPayload).not.toBeNull();
    expect(recordPayload?.ranked_session_token).toBeNull();
    expect(recordPayload?.challenge_id).toBeNull();
    expect(recordPayload?.ranked_verification).toBeNull();
    expect(recordPayload?.initial_seed).toBeNull();
    expect(recordPayload?.seed).toBeNull();
  });

  it("does not trust a manager ranked token when the active ranked seed differs from the replay seed", async () => {
    const storage = new MemoryStorage();
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      rankedSessionToken: "current-ranked-token",
      challengeId: "ranked-current",
      initialSeed: 111,
      seed: 111
    });
    let recordPayload: Record<string, unknown> | null = null;
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          return createJsonResponse({ success: true, data: { id: "record-1" } });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });
    runtime.windowLike.GAME_CHALLENGE_CONTEXT = {
      id: "ranked-current",
      mode_key: MODE_KEY,
      seed: 222,
      ranked_session_token: "current-ranked-token"
    };

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(recordPayload).not.toBeNull();
    expect(recordPayload?.ranked_session_token).toBeNull();
    expect(recordPayload?.challenge_id).toBeNull();
    expect(recordPayload?.ranked_verification).toBeNull();
    expect(recordPayload?.initial_seed).toBeNull();
    expect(recordPayload?.seed).toBeNull();
  });

  it("keeps pending record payload when upload auth is rejected so the user can re-login and retry", async () => {
    const storage = new MemoryStorage();
    const manager = createTerminatedManager();
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url) => {
        if (url.endsWith("/records")) {
          return createJsonResponse(
            { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
            false,
            401
          );
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    const pendingRaw = storage.getItem(PENDING_RECORD_KEY);
    expect(pendingRaw).not.toBeNull();
    expect(JSON.parse(pendingRaw || "{}")).toMatchObject({
      ownerUserId: "7",
      payload: {
        mode_key: MODE_KEY,
        score: 4096,
        replay_string: "replay-v1"
      }
    });
    expect(storage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(true);
  });

  it("stores the last record submit failure code for diagnostics", async () => {
    const storage = new MemoryStorage();
    const manager = createTerminatedManager();
    loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url) => {
        if (url.endsWith("/records")) {
          return createJsonResponse(
            {
              success: false,
              error: "Replay is not terminal",
              code: "REPLAY_NOT_TERMINATED",
              detail: "replay payload does not describe a terminated game"
            },
            false,
            400
          );
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(JSON.parse(storage.getItem(LAST_RECORD_RESULT_KEY) || "{}")).toMatchObject({
      ok: false,
      status: 400,
      mode_key: MODE_KEY,
      code: "REPLAY_NOT_TERMINATED",
      error: "Replay is not terminal"
    });
  });

  it("keeps a terminal record pending when auth was cleared before the game-over submit runs", async () => {
    const storage = new MemoryStorage();
    const manager = createTerminatedManager();
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });
    storage.removeItem(AUTH_TOKEN_STORAGE_KEY);

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    const pendingRaw = storage.getItem(PENDING_RECORD_KEY);
    expect(pendingRaw).not.toBeNull();
    expect(JSON.parse(pendingRaw || "{}")).toMatchObject({
      ownerUserId: "7",
      payload: {
        mode_key: MODE_KEY,
        score: 4096,
        replay_string: "replay-v1"
      }
    });
    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(false);
  });

  it("does not resubmit the same terminal record after a non-transient record validation error", async () => {
    const storage = new MemoryStorage();
    const manager = createTerminatedManager();
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url) => {
        if (url.endsWith("/records")) {
          return createJsonResponse(
            { success: false, error: "Replay verification failed", code: "REPLAY_VERIFY_FAILED" },
            false,
            400
          );
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();
    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(runtime.fetchCalls.filter((call) => call.url.endsWith("/records"))).toHaveLength(1);
    expect(storage.getItem(PENDING_RECORD_KEY)).toBeNull();
    expect(storage.getItem(LAST_RECORD_SUBMIT_KEY)).toBeTruthy();
  });

  it("keeps ranked page-hide progress local without uploading a cloud checkpoint", async () => {
    const storage = new MemoryStorage();
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      over: false,
      hasGameStarted: true,
      moveHistory: [0],
      successfulMoveCount: 1,
      score: 1024,
      rankedSessionToken: "active-ranked-token"
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url) => {
        if (url.includes("/ranked-checkpoint")) {
          return createJsonResponse({ success: true, verified: true, data: {} });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    const onlineRuntime = runtime.windowLike.OnlineLeaderboardRuntime as {
      persistRankedCheckpointOnPageHide: (manager: Record<string, unknown>) => void;
    };
    onlineRuntime.persistRankedCheckpointOnPageHide(manager);
    await flushRuntimePromises();

    expect(storage.getItem(CHECKPOINT_MIRROR_KEY)).not.toBeNull();
    expect(runtime.fetchCalls.some((call) => call.url.includes("/ranked-checkpoint"))).toBe(false);
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
      exp: nowSec + 3600,
      owner_user_id: "7"
    };
    const nextSession = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-next",
      seed: 456,
      ranked_session_token: "next-ranked-token",
      issued_at: nowSec,
      exp: nowSec + 3600,
      owner_user_id: "7"
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
    expect(recordPayload?.challenge_id).toBe("ranked-old");
    expect(recordPayload?.initial_seed).toBe(123);
    expect(recordPayload?.seed).toBe(123);
    expect(recordPayload?.ranked_verification).toEqual({
      random_source: "server_seed",
      replay_format: "v1",
      challenge_id: "ranked-old",
      seed: 123,
      mode_key: MODE_KEY,
      ranked_session_token: "old-ranked-token"
    });
    expect(storage.getItem(ACTIVE_SESSION_KEY)).not.toBeNull();
    expect(JSON.parse(storage.getItem(ACTIVE_SESSION_KEY) || "{}").ranked_session_token).toBe(
      "next-ranked-token"
    );
    expect(runtime.windowLike.GAME_CHALLENGE_CONTEXT).toMatchObject({
      ranked_session_token: "next-ranked-token"
    });
  });

  it("does not clear the promoted active session when runtime context is stale during submit cleanup", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    const oldSession = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-old",
      seed: 123,
      ranked_session_token: "old-ranked-token",
      issued_at: nowSec - 60,
      exp: nowSec + 3600,
      owner_user_id: "7"
    };
    const nextSession = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-next",
      seed: 456,
      ranked_session_token: "next-ranked-token",
      issued_at: nowSec,
      exp: nowSec + 3600,
      owner_user_id: "7"
    };
    storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(oldSession));
    storage.setItem(PREFETCH_SESSION_KEY, JSON.stringify(nextSession));

    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      rankedSessionToken: "old-ranked-token",
      restart: vi.fn(function (this: Record<string, unknown>) {
        this.over = false;
        this.score = 0;
        this.initialSeed = nextSession.seed;
        this.moveHistory = [];
        this.rankedSessionToken = nextSession.ranked_session_token;
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
      getCurrentContext: vi.fn(() => null),
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

    expect(recordPayload?.ranked_session_token).toBe("old-ranked-token");
    expect(runtime.windowLike.RankedSessionRuntime.clearActiveSession).not.toHaveBeenCalled();
    expect(JSON.parse(storage.getItem(ACTIVE_SESSION_KEY) || "{}").ranked_session_token).toBe(
      "next-ranked-token"
    );
    expect(runtime.windowLike.GAME_CHALLENGE_CONTEXT).toMatchObject({
      ranked_session_token: "next-ranked-token"
    });
  });

  it("mirrors the next active storage when the manager has already advanced to the next ranked token", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    const oldSession = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-old",
      seed: 123,
      ranked_session_token: "old-ranked-token",
      issued_at: nowSec - 60,
      exp: nowSec + 3600,
      owner_user_id: "7"
    };
    const nextSession = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-next",
      seed: 456,
      ranked_session_token: "next-ranked-token",
      issued_at: nowSec,
      exp: nowSec + 3600,
      owner_user_id: "7"
    };
    storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(oldSession));
    let resolveRecordSubmit: ((value: Record<string, unknown>) => void) | null = null;

    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      rankedSessionToken: "old-ranked-token",
      tryAutoSubmitOnGameOver: vi.fn()
    });
    let recordPayload: Record<string, unknown> | null = null;
    loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          await new Promise<Record<string, unknown>>((resolve) => {
            resolveRecordSubmit = resolve;
          });
          return createJsonResponse({ success: true, data: { id: "record-old" } });
        }
        if (url.includes("/ranked-checkpoint")) {
          return createJsonResponse({ success: true, deleted: true });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.tryAutoSubmitOnGameOver as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();
    manager.rankedSessionToken = nextSession.ranked_session_token;
    manager.challengeId = nextSession.challenge_id;
    manager.initialSeed = nextSession.seed;
    manager.seed = nextSession.seed;
    resolveRecordSubmit?.({ success: true });
    await flushRuntimePromises();

    expect(recordPayload?.ranked_session_token).toBe("old-ranked-token");
    expect(manager.rankedSessionToken).toBe("next-ranked-token");
    const activeSession = JSON.parse(storage.getItem(ACTIVE_SESSION_KEY) || "{}");
    expect(activeSession.ranked_session_token).toBe("next-ranked-token");
    expect(activeSession.challenge_id).toBe("ranked-next");
    expect(activeSession.seed).toBe(nextSession.seed);
  });

  it("keeps active storage when stale submit cleanup wins the race before prefetch promotion", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    const oldSession = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-old",
      seed: 123,
      ranked_session_token: "old-ranked-token",
      issued_at: nowSec - 60,
      exp: nowSec + 3600,
      owner_user_id: "7"
    };
    const nextSession = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-next",
      seed: 456,
      ranked_session_token: "next-ranked-token",
      issued_at: nowSec,
      exp: nowSec + 3600,
      owner_user_id: "7"
    };
    storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(oldSession));
    storage.setItem(PREFETCH_SESSION_KEY, JSON.stringify(nextSession));

    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      rankedSessionToken: "old-ranked-token",
      tryAutoSubmitOnGameOver: vi.fn()
    });
    let recordPayload: Record<string, unknown> | null = null;
    loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          return createJsonResponse({ success: true, data: { id: "record-old" } });
        }
        if (url.includes("/ranked-checkpoint")) {
          return createJsonResponse({ success: true, deleted: true });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.tryAutoSubmitOnGameOver as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(recordPayload?.ranked_session_token).toBe("old-ranked-token");
    expect(JSON.parse(storage.getItem(ACTIVE_SESSION_KEY) || "{}").ranked_session_token).toBe(
      "old-ranked-token"
    );
    expect(JSON.parse(storage.getItem(PREFETCH_SESSION_KEY) || "{}").ranked_session_token).toBe(
      "next-ranked-token"
    );
  });

  it("creates the next ranked session on demand when restart has no prefetched session", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    const oldSession = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-old",
      seed: 123,
      ranked_session_token: "old-ranked-token",
      issued_at: nowSec - 60,
      exp: nowSec + 3600,
      owner_user_id: "7"
    };
    const nextSession = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-next",
      seed: 456,
      ranked_session_token: "next-ranked-token",
      issued_at: nowSec,
      exp: nowSec + 3600,
      owner_user_id: "7"
    };
    storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(oldSession));

    const originalRestart = vi.fn(function (this: Record<string, unknown>) {
      this.over = false;
      this.score = 0;
      this.initialSeed = 456;
      this.moveHistory = [];
      this.rankedSessionToken = "next-ranked-token";
      this.clientRecordId = "rec_client_next";
    });
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      rankedSessionToken: "old-ranked-token",
      restart: originalRestart
    });
    let recordPayload: Record<string, unknown> | null = null;
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          return createJsonResponse({
            success: true,
            data: { id: "record-old" }
          });
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
    const startNextSession = vi.fn(async () => {
      storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(nextSession));
      runtime.windowLike.GAME_CHALLENGE_CONTEXT = {
        id: nextSession.challenge_id,
        mode_key: MODE_KEY,
        seed: nextSession.seed,
        ranked_session_token: nextSession.ranked_session_token
      };
      return true;
    });
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
      promotePrefetchedSession: vi.fn(() => false),
      startNextSession,
      ensurePrefetch: vi.fn(async () => true),
      clearActiveSession: vi.fn()
    };

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);

    expect(originalRestart).not.toHaveBeenCalled();
    await flushRuntimePromises();

    expect(startNextSession).toHaveBeenCalledWith(MODE_KEY);
    expect(originalRestart).toHaveBeenCalledTimes(1);
    expect(recordPayload?.ranked_session_token).toBe("old-ranked-token");
    expect(recordPayload?.challenge_id).toBe("ranked-old");
    expect(JSON.parse(storage.getItem(ACTIVE_SESSION_KEY) || "{}").ranked_session_token).toBe("next-ranked-token");
    expect(runtime.windowLike.alert).not.toHaveBeenCalled();
  });

  it("shows the restart confirmation before requesting an on-demand ranked session", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    const oldSession = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-old",
      seed: 123,
      ranked_session_token: "old-ranked-token",
      issued_at: nowSec - 60,
      exp: nowSec + 3600,
      owner_user_id: "7"
    };
    const nextSession = {
      mode_key: MODE_KEY,
      challenge_id: "ranked-next",
      seed: 456,
      ranked_session_token: "next-ranked-token",
      issued_at: nowSec,
      exp: nowSec + 3600,
      owner_user_id: "7"
    };
    storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(oldSession));

    const confirmDeferred = createDeferred<boolean>();
    const seedDeferred = createDeferred<boolean>();
    let confirmationShown = false;
    const actuate = vi.fn();
    const setup = vi.fn(function (this: Record<string, unknown>) {
      this.over = false;
      this.score = 0;
      this.initialSeed = 456;
      this.moveHistory = [];
      this.rankedSessionToken = "next-ranked-token";
      this.clientRecordId = "rec_client_next";
    });
    const originalRestart = vi.fn(function (this: Record<string, unknown>) {
      confirmationShown = true;
      return confirmDeferred.promise.then((confirmed) => {
        if (!confirmed) return;
        (this.setup as (...args: unknown[]) => void)(undefined, { disableStateRestore: true });
      });
    });
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      rankedSessionToken: "old-ranked-token",
      restart: originalRestart,
      actuate,
      setup
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url) => {
        if (url.endsWith("/records")) {
          return createJsonResponse({
            success: true,
            data: { id: "record-old" }
          });
        }
        if (url.includes("/ranked-checkpoint")) {
          return createJsonResponse({ success: true, deleted: true });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });
    runtime.windowLike.RankedSessionRuntime = {
      promotePrefetchedSession: vi.fn(() => false),
      startNextSession: vi.fn(() => seedDeferred.promise.then((ready) => {
        if (ready) {
          storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(nextSession));
          runtime.windowLike.GAME_CHALLENGE_CONTEXT = {
            id: nextSession.challenge_id,
            mode_key: MODE_KEY,
            seed: nextSession.seed,
            ranked_session_token: nextSession.ranked_session_token
          };
        }
        return ready;
      })),
      ensurePrefetch: vi.fn(async () => true),
      clearActiveSession: vi.fn()
    };

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);

    expect(confirmationShown).toBe(true);
    expect(runtime.windowLike.RankedSessionRuntime.startNextSession).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();

    confirmDeferred.resolve(true);
    await flushRuntimePromises();

    expect(runtime.windowLike.RankedSessionRuntime.startNextSession).toHaveBeenCalledWith(MODE_KEY);
    expect(setup).not.toHaveBeenCalled();

    seedDeferred.resolve(true);
    await flushRuntimePromises();

    expect(setup).toHaveBeenCalledWith(undefined, { disableStateRestore: true });
    expect(actuate).not.toHaveBeenCalled();
    expect(manager.rankedSessionToken).toBe("next-ranked-token");
    expect(JSON.parse(storage.getItem(ACTIVE_SESSION_KEY) || "{}").ranked_session_token).toBe("next-ranked-token");
  });

  it("does not request a ranked session when restart confirmation is cancelled", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    storage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        mode_key: MODE_KEY,
        challenge_id: "ranked-old",
        seed: 123,
        ranked_session_token: "old-ranked-token",
        issued_at: nowSec - 60,
        exp: nowSec + 3600,
        owner_user_id: "7"
      })
    );

    const confirmDeferred = createDeferred<boolean>();
    let confirmationShown = false;
    const setup = vi.fn();
    const originalRestart = vi.fn(function (this: Record<string, unknown>) {
      confirmationShown = true;
      return confirmDeferred.promise.then((confirmed) => {
        if (!confirmed) return;
        (this.setup as (...args: unknown[]) => void)(undefined, { disableStateRestore: true });
      });
    });
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      rankedSessionToken: "old-ranked-token",
      restart: originalRestart,
      setup
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });
    runtime.windowLike.RankedSessionRuntime = {
      promotePrefetchedSession: vi.fn(() => false),
      startNextSession: vi.fn(async () => true),
      ensurePrefetch: vi.fn(async () => true),
      clearActiveSession: vi.fn()
    };

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);

    expect(confirmationShown).toBe(true);
    expect(runtime.windowLike.RankedSessionRuntime.startNextSession).not.toHaveBeenCalled();

    confirmDeferred.resolve(false);
    await flushRuntimePromises();

    expect(runtime.windowLike.RankedSessionRuntime.startNextSession).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
    expect(manager.setup).toBe(setup);
    expect(manager.rankedRestartPreparing).toBe(false);
  });

  it("does not start a ranked board when on-demand ranked session creation fails", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    storage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        mode_key: MODE_KEY,
        challenge_id: "ranked-old",
        seed: 123,
        ranked_session_token: "old-ranked-token",
        issued_at: nowSec - 60,
        exp: nowSec + 3600,
        owner_user_id: "7"
      })
    );
    const originalRestart = vi.fn(function (this: Record<string, unknown>) {
      this.over = false;
      this.score = 0;
      if (typeof this.setup === "function") {
        this.setup(undefined, { disableStateRestore: true });
      }
      if (typeof this.actuate === "function") {
        this.actuate();
      }
    });
    const setup = vi.fn();
    const actuate = vi.fn();
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      modeConfig: {
        key: MODE_KEY,
        rank_policy: "ranked",
        ranked_bucket: "daily"
      },
      rankedSessionToken: "old-ranked-token",
      restart: originalRestart,
      setup,
      actuate
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url) => {
        if (url.endsWith("/records")) {
          return createJsonResponse({
            success: true,
            data: { id: "record-old" }
          });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });
    const ensurePrefetch = vi.fn(async () => false);
    runtime.windowLike.RankedSessionRuntime = {
      promotePrefetchedSession: vi.fn(() => false),
      startNextSession: vi.fn(async () => false),
      ensurePrefetch,
      clearModeSession: vi.fn((modeKey: string) => {
        storage.removeItem(`ranked_session_active:v1:${modeKey}`);
        storage.removeItem(`ranked_session_prefetch:v1:${modeKey}`);
      })
    };

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(originalRestart).toHaveBeenCalledTimes(1);
    expect(manager.rankPolicy).toBe("ranked");
    expect(setup).not.toHaveBeenCalled();
    expect(actuate).not.toHaveBeenCalled();
    expect(manager.over).toBe(true);
    expect(manager.score).toBe(4096);
    expect(ensurePrefetch).toHaveBeenCalledWith(MODE_KEY);
    expect(runtime.windowLike.alert).not.toHaveBeenCalled();
    expect(storage.getItem(ACTIVE_SESSION_KEY)).not.toBeNull();
    expect(JSON.parse(storage.getItem(ACTIVE_SESSION_KEY) || "{}").ranked_session_token).toBe("old-ranked-token");
    expect(manager.rankedSessionToken).toBe("old-ranked-token");
    expect(manager.rankedRestartBlockedUntilSessionReady).toBe(true);
    expect(manager.rankedRestartPreparing).toBe(false);
  });

  it("does not call restartWithSeed when ranked session creation fails before setup", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    storage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        mode_key: MODE_KEY,
        challenge_id: "ranked-old",
        seed: 123,
        ranked_session_token: "old-ranked-token",
        issued_at: nowSec - 60,
        exp: nowSec + 3600,
        owner_user_id: "7"
      })
    );
    const originalRestartWithSeed = vi.fn(function (this: Record<string, unknown>) {
      this.over = false;
      this.score = 0;
    });
    const setup = vi.fn();
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      rankedSessionToken: "old-ranked-token",
      restartWithSeed: originalRestartWithSeed,
      setup
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });
    const ensurePrefetch = vi.fn(async () => false);
    runtime.windowLike.RankedSessionRuntime = {
      promotePrefetchedSession: vi.fn(() => false),
      startNextSession: vi.fn(async () => false),
      ensurePrefetch
    };

    (manager.restartWithSeed as { call: (thisArg: unknown, seed: number) => void }).call(manager, 999);
    await flushRuntimePromises();

    expect(originalRestartWithSeed).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
    expect(manager.over).toBe(true);
    expect(manager.score).toBe(4096);
    expect(ensurePrefetch).toHaveBeenCalledWith(MODE_KEY);
    expect(manager.rankedRestartBlockedUntilSessionReady).toBe(true);
    expect(manager.rankedRestartPreparing).toBe(false);
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
        exp: nowSec + 3600,
        owner_user_id: "7"
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

  it("does not restore a cleared checkpoint even if the server reports a newer timestamp", async () => {
    const storage = new MemoryStorage();
    const now = Date.now();
    const nowSec = Math.floor(now / 1000);
    storage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        mode_key: MODE_KEY,
        challenge_id: "ranked-active",
        seed: 456,
        ranked_session_token: "active-token",
        issued_at: nowSec,
        exp: nowSec + 3600,
        owner_user_id: "7"
      })
    );
    storage.setItem(
      CHECKPOINT_CLEAR_KEY,
      JSON.stringify({
        mode_key: MODE_KEY,
        owner_user_id: "7",
        cleared_at: now,
        ranked_session_token: "active-token",
        client_record_id: "old-record"
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
              ranked_session_token: "active-token",
              client_record_id: "old-record",
              replay_string: "old-replay",
              duration_ms: 3000,
              updated_at: new Date(now + 60_000).toISOString(),
              ui_state: {
                saved_state: {
                  v: 1,
                  saved_at: now + 60_000,
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

  it("requires active ranked checkpoints to carry the current session token", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    storage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        mode_key: MODE_KEY,
        challenge_id: "ranked-active",
        seed: 456,
        ranked_session_token: "active-token",
        issued_at: nowSec,
        exp: nowSec + 3600,
        owner_user_id: "7"
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
              client_record_id: "tokenless-record",
              replay_string: "old-replay",
              duration_ms: 3000,
              updated_at: new Date().toISOString(),
              ui_state: {
                saved_state: {
                  v: 1,
                  saved_at: Date.now(),
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

  it("does not restore cloud ranked checkpoints even when the challenge matches", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    storage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        mode_key: MODE_KEY,
        challenge_id: "ranked-active",
        seed: 456,
        ranked_session_token: "old-active-token",
        issued_at: nowSec,
        exp: nowSec + 3600,
        owner_user_id: "7"
      })
    );
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      over: false,
      score: 0,
      hasGameStarted: false,
      moveHistory: [],
      needsRankedCheckpointRestore: true,
      lastRankedCheckpointRestoreError: "",
      actuate: vi.fn(),
      updateUndoUiState: vi.fn(),
      notifyUndoSettingsStateChanged: vi.fn(),
      updateStatsPanel: vi.fn()
    });
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
              challenge_id: "ranked-active",
              ranked_session_id: "ranked-active",
              ranked_session_token: "refreshed-token",
              client_record_id: "same-session-record",
              replay_string: "refreshed-replay",
              duration_ms: 3000,
              updated_at: new Date().toISOString(),
              ui_state: {
                saved_state: {
                  v: 1,
                  saved_at: Date.now(),
                  mode_key: MODE_KEY,
                  board_width: 4,
                  board_height: 4,
                  ruleset: "pow2",
                  board: [[1024, 1024, 0, 0]],
                  score: 454348,
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
    expect(runtime.fetchCalls.some((call) => call.url.includes("/ranked-checkpoint"))).toBe(false);
  });
});
