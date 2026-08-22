import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
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
const PENDING_RECORD_QUEUE_KEY = "online_pending_record_submit_queue_v1";
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
    headers?: Record<string, string>;
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
  apiBases?: string[];
  storage?: MemoryStorage;
  parseReplayImportEnvelope?: (...args: unknown[]) => Record<string, unknown> | null;
  restartWithBoard?: (...args: unknown[]) => void;
  resolveStructuredReplayModeConfig?: (...args: unknown[]) => Record<string, unknown> | null;
  buildSavedGameStatePayload?: (...args: unknown[]) => Record<string, unknown> | null;
  applySavedStateRestore?: (...args: unknown[]) => boolean;
  localHistoryStore?: Record<string, unknown>;
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
    TextEncoder,
    crypto: webcrypto,
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
        return options.apiBases || ["https://2048next.cn/api"];
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
  if (options.localHistoryStore) windowLike.LocalHistoryStore = options.localHistoryStore;

  const scriptPath = path.resolve(process.cwd(), "js/online_leaderboard_runtime.js");
  const script = readFileSync(scriptPath, "utf8");
  const context: Record<string, unknown> = {
    window: windowLike,
    console,
    setTimeout,
    clearTimeout,
    parseReplayImportEnvelope: options.parseReplayImportEnvelope,
    restartWithBoard: options.restartWithBoard,
    resolveStructuredReplayModeConfig: options.resolveStructuredReplayModeConfig,
    applySavedStateRestore(manager: Record<string, unknown>, savedState: Record<string, unknown>) {
      if (options.applySavedStateRestore) {
        return options.applySavedStateRestore(manager, savedState);
      }
      manager.score = Number(savedState.score || 0);
      manager.over = !!savedState.over;
      manager.won = !!savedState.won;
      manager.keepPlaying = !!savedState.keep_playing;
      return true;
    }
  };
  if (options.buildSavedGameStatePayload) {
    context.buildSavedGameStatePayload = options.buildSavedGameStatePayload;
  }
  vm.runInNewContext(script, context);

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
  it("queues begin once after the first successful ranked move", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
      mode_key: MODE_KEY,
      challenge_id: "ranked-first-move",
      seed: 123,
      ranked_session_token: "first-move-token",
      issued_at: nowSec,
      exp: nowSec + 3600,
      owner_user_id: "7"
    }));
    const originalMove = vi.fn(function (this: Record<string, unknown>) {
      this.successfulMoveCount = Number(this.successfulMoveCount || 0) + 1;
    });
    const manager = createTerminatedManager({
      over: false,
      rankPolicy: "ranked",
      rankedSessionToken: "first-move-token",
      challengeId: "ranked-first-move",
      successfulMoveCount: 0,
      move: originalMove
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });
    const enqueueAttempt = vi.fn(() => true);
    const flushAttemptOutbox = vi.fn(async () => true);
    runtime.windowLike.RankedSessionRuntime = { enqueueAttempt, flushAttemptOutbox };

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(originalMove).toHaveBeenCalledTimes(2);
    expect(enqueueAttempt).toHaveBeenCalledTimes(1);
    expect(enqueueAttempt).toHaveBeenCalledWith({
      challenge_id: "ranked-first-move",
      event: "begin",
      mode_key: MODE_KEY,
      ranked_session_token: "first-move-token",
      replay_string: "replay-v1",
      attempt_schema_version: 1
    });
    expect(flushAttemptOutbox).toHaveBeenCalledTimes(1);
  });

  it("pagehide only flushes existing ranked attempts without creating abandon", async () => {
    const manager = createTerminatedManager({
      over: false,
      rankPolicy: "ranked",
      rankedSessionToken: "pagehide-token",
      challengeId: "ranked-pagehide",
      successfulMoveCount: 3
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });
    const enqueueAttempt = vi.fn(() => true);
    const flushAttemptOutbox = vi.fn(async () => true);
    runtime.windowLike.RankedSessionRuntime = { enqueueAttempt, flushAttemptOutbox };
    const addEventListenerMock = runtime.windowLike.addEventListener as ReturnType<typeof vi.fn>;
    const pagehideHandler = addEventListenerMock.mock.calls.find((call) => call[0] === "pagehide")?.[1] as
      | (() => void)
      | undefined;

    pagehideHandler?.();
    await flushRuntimePromises();

    expect(enqueueAttempt).not.toHaveBeenCalled();
    expect(flushAttemptOutbox).toHaveBeenCalledWith({ keepalive: true });
  });

  it.each(["missing manager", "replay manager"])(
    "pagehide still flushes existing ranked attempts with %s",
    async (managerState) => {
      const manager = createTerminatedManager();
      const runtime = loadOnlineLeaderboardRuntime({
        manager,
        fetchImpl: async () => createJsonResponse({ success: true, data: [] })
      });
      const enqueueAttempt = vi.fn(() => true);
      const flushAttemptOutbox = vi.fn(async () => true);
      runtime.windowLike.RankedSessionRuntime = { enqueueAttempt, flushAttemptOutbox };
      runtime.windowLike.game_manager = managerState === "missing manager"
        ? null
        : createTerminatedManager({ replayMode: true });
      const addEventListenerMock = runtime.windowLike.addEventListener as ReturnType<typeof vi.fn>;
      const pagehideHandler = addEventListenerMock.mock.calls.find((call) => call[0] === "pagehide")?.[1] as
        | (() => void)
        | undefined;

      pagehideHandler?.();
      await flushRuntimePromises();

      expect(enqueueAttempt).not.toHaveBeenCalled();
      expect(flushAttemptOutbox).toHaveBeenCalledWith({ keepalive: true });
    }
  );

  it("does not abandon an active game when opening the practice board", async () => {
    const manager = createTerminatedManager({
      over: false,
      rankPolicy: "ranked",
      rankedSessionToken: "navigation-token",
      challengeId: "ranked-navigation",
      successfulMoveCount: 3
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });
    const enqueueAttempt = vi.fn(() => false);
    runtime.windowLike.RankedSessionRuntime = {
      enqueueAttempt,
      flushAttemptOutbox: vi.fn(async () => true),
      getLastFailureReason: () => "attempt_outbox_write_failed"
    };
    const documentLike = runtime.windowLike.document as { addEventListener: ReturnType<typeof vi.fn> };
    const clickHandler = documentLike.addEventListener.mock.calls.find((call) => call[0] === "click")?.[1] as
      | ((eventLike: Record<string, unknown>) => void)
      | undefined;
    const createNavigationEvent = (id: string) => {
      const anchor = {
        id,
        closest: vi.fn((selector: string) => selector === ".title" ? null : anchor)
      };
      return {
        button: 0,
        target: { closest: vi.fn(() => anchor) },
        preventDefault: vi.fn(),
        stopImmediatePropagation: vi.fn()
      };
    };

    const navigation = createNavigationEvent("top-practice-btn");
    clickHandler?.(navigation);

    expect(enqueueAttempt).not.toHaveBeenCalled();
    expect(navigation.preventDefault).not.toHaveBeenCalled();
    expect(navigation.stopImmediatePropagation).not.toHaveBeenCalled();
    expect(runtime.windowLike.alert).not.toHaveBeenCalled();
  });

  it("does not expose timer leaderboard support for 6x6 through 10x10 board modes", () => {
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager(),
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });
    const onlineRuntime = runtime.windowLike.OnlineLeaderboardRuntime as {
      isLeaderboardModeSupported(modeKey: string): boolean;
      resolveLeaderboardMode(modeKey: string): string | null;
    };

    expect(onlineRuntime.resolveLeaderboardMode("board_5x5_pow2_no_undo")).toBe("pow2_5x5");
    expect(onlineRuntime.resolveLeaderboardMode("board_5x5_pow2_undo")).toBe("pow2_5x5_undo");
    for (const size of [6, 7, 8, 9, 10]) {
      expect(onlineRuntime.isLeaderboardModeSupported(`board_${size}x${size}_pow2_no_undo`)).toBe(false);
      expect(onlineRuntime.isLeaderboardModeSupported(`board_${size}x${size}_pow2_undo`)).toBe(false);
      expect(onlineRuntime.resolveLeaderboardMode(`board_${size}x${size}_pow2_no_undo`)).toBeNull();
      expect(onlineRuntime.resolveLeaderboardMode(`board_${size}x${size}_pow2_undo`)).toBeNull();
    }
  });

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

  it("replaces a stale higher local best score with account records", async () => {
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

    expect(scoreManager.set).toHaveBeenCalledWith(4096);
    expect(storage.getItem(BEST_SCORE_KEY)).toBe("4096");
    expect(updateBestScore).toHaveBeenCalledWith("4096");
  });

  it("does not bypass pending-record retry backoff during automatic startup scans", async () => {
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

    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(false);
    expect(storage.getItem(PENDING_RECORD_KEY)).not.toBeNull();
    expect(storage.getItem(PENDING_SCORE_KEY)).toBeNull();
    expect(recordPayload).toBeNull();
  });

  it("queues achievement unlock toasts returned by record submit", async () => {
    const manager = createTerminatedManager();
    const showAchievementUnlockToasts = vi.fn();
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      fetchImpl: async (url) => {
        if (url.endsWith("/records")) {
          return createJsonResponse({
            success: true,
            data: { id: "record-achievement" },
            achievements: [{ achievement: { id: "tile_2048_count_1", name: "首次 2048" } }]
          });
        }
        if (url.endsWith("/score")) {
          return createJsonResponse({ success: true, skipped: true });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });
    runtime.windowLike.AchievementUnlockToastRuntime = { showAchievementUnlockToasts };

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(showAchievementUnlockToasts).toHaveBeenCalledWith([
      { achievement: { id: "tile_2048_count_1", name: "首次 2048" } }
    ]);
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

  it("does not submit a standard win prompt when legacy config still carries max_tile", async () => {
    const manager = createTerminatedManager({
      over: false,
      won: true,
      keepPlaying: false,
      modeConfig: { max_tile: 2048, special_rules: {} },
      score: 4096
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(false);
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
        spawn_sequence_version: 2,
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
      spawnSequenceVersion: 2,
      sessionReplayV1: { spawn_sequence_version: 2 },
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
      ranked_verification: expect.objectContaining({ spawn_sequence_version: 2 }),
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
      record_schema_version: 1,
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
    expect(runtime.fetchCalls.find((call) => call.url.includes("/leaderboard?"))?.url).toContain("limit=500");

    refreshDeferred.resolve(createJsonResponse({ success: true, data: [] }));
    await refreshPromise;
    await flushRuntimePromises();
  });

  it("fetches enough timer leaderboard rows to render the authenticated player's own rank below top 10", async () => {
    const storage = new MemoryStorage();
    const topRows = Array.from({ length: 10 }, (_, index) => ({
      user_id: index + 1,
      nickname: `Top${index + 1}`,
      score: 10000 - index
    }));
    storage.setItem(
      TIMER_LEADERBOARD_CACHE_KEY,
      JSON.stringify({
        key: `${MODE_KEY}|all`,
        rows: topRows,
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
    const fullRows = [
      ...topRows,
      {
        user_id: 42,
        nickname: "Hui",
        score: 3492
      }
    ];
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({
        over: false,
        score: 0,
        getTimerModuleViewMode: vi.fn(() => "hidden")
      }),
      storage,
      fetchImpl: async (url) => {
        if (url.includes("/leaderboard?")) {
          const parsedUrl = new URL(url);
          const limit = Number(parsedUrl.searchParams.get("limit") || "10");
          return createJsonResponse({ success: true, data: fullRows.slice(0, limit) });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });
    runtime.storage.setItem(AUTH_USER_ID_STORAGE_KEY, "42");
    runtime.storage.setItem("2048_auth_nickname_v1", "Hui");
    const documentLike = runtime.windowLike.document as Record<string, unknown>;
    documentLike.getElementById = vi.fn((id: string) => elements[id] || null);

    const onlineRuntime = runtime.windowLike.OnlineLeaderboardRuntime as {
      refreshTimerLeaderboardPanel: (force?: boolean, preferCached?: boolean) => Promise<boolean>;
    };
    await onlineRuntime.refreshTimerLeaderboardPanel(false, true);

    const requestUrl = runtime.fetchCalls.find((call) => call.url.includes("/leaderboard?"))?.url || "";
    expect(requestUrl).toContain("limit=500");
    const selfRow = (list.children as Array<Record<string, unknown>>)[10];
    const selfText = collectTextContent(selfRow);
    expect(selfText).toContain("11");
    expect(selfText).toContain("Hui");
    expect(selfText).toContain("3492");
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
        logoAlt: "2048",
        triggerCount: 19
      })
    );
    const bindOptions = (
      runtime.windowLike.CoreBreakoutEasterEggRuntime.bindBreakoutEasterEgg as ReturnType<typeof vi.fn>
    ).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(bindOptions).not.toHaveProperty("logoSrc");
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

  it("retires the active session but keeps the pending record retryable when final submit reports expiry", async () => {
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
    expect(storage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
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

  it("preserves the original owner and stable id when migrating a legacy pending record", async () => {
    const storage = new MemoryStorage();
    storage.setItem(PENDING_RECORD_KEY, JSON.stringify({
      signature: "legacy-signature-42",
      ownerUserId: "42",
      createdAt: 123,
      lastAttemptAt: 0,
      retryCount: 0,
      payload: {
        mode: "standard_no_undo",
        mode_key: MODE_KEY,
        score: 4096,
        replay_string: "legacy-replay"
      }
    }));
    const prepareRecordSubmitAsync = vi.fn(async () => ({ id: "local-legacy" }));
    const localHistoryStore = {
      prepareRecordSubmitAsync,
      listSyncCandidatesAsync: vi.fn(async () => []),
      updateRecordAsync: vi.fn(),
      getByIdAsync: vi.fn(async () => null)
    };
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({ over: false, score: 0 }),
      storage,
      localHistoryStore,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });

    await (runtime.windowLike.OnlineLeaderboardRuntime as {
      retryAllLocalHistoryRecords(): Promise<unknown>;
    }).retryAllLocalHistoryRecords();

    expect(prepareRecordSubmitAsync).toHaveBeenCalledWith(null, expect.objectContaining({
      owner_type: "user",
      owner_user_id: "42",
      owner_key: "user:42",
      client_record_id: expect.stringMatching(/^legacy_pending_/)
    }));
  });

  it("keeps a durable record waiting for auth when the server returns an auth code", async () => {
    const record = {
      id: "local-1",
      owner_type: "user",
      owner_user_id: "7",
      sync_status: "pending",
      upload_attempts: 0,
      mode: "standard_no_undo",
      mode_key: MODE_KEY,
      score: 4096,
      replay_string: "replay-v1",
      client_record_id: "client-local-1"
    };
    const patches: Array<Record<string, unknown>> = [];
    const localHistoryStore = {
      prepareRecordSubmitAsync: vi.fn(async () => record),
      listSyncCandidatesAsync: vi.fn(async () => [record]),
      getByIdAsync: vi.fn(async () => record),
      updateRecordAsync: vi.fn(async (_id: string, patch: Record<string, unknown>) => {
        patches.push(patch);
        return Object.assign({}, record, ...patches);
      })
    };
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({ over: false, score: 0 }),
      localHistoryStore,
      fetchImpl: async (url) => url.endsWith("/records")
        ? createJsonResponse({ success: false, code: "TOKEN_EXPIRED" }, false, 401)
        : createJsonResponse({ success: true, data: [] })
    });

    await (runtime.windowLike.OnlineLeaderboardRuntime as {
      retryLocalHistoryRecord(id: string): Promise<unknown>;
    }).retryLocalHistoryRecord("local-1");

    expect(patches.at(-1)).toMatchObject({
      sync_status: "waiting_auth"
    });
  });

  it("allows a manual retry to explicitly upload a finalized local record", async () => {
    let currentRecord: Record<string, unknown> = {
      id: "local-finalized-1",
      owner_type: "user",
      owner_user_id: "7",
      sync_status: "finalized_local",
      upload_attempts: 0,
      mode: "classic_4x4_pow2_undo",
      mode_key: "classic_4x4_pow2_undo",
      score: 4096,
      replay_string: "replay-finalized",
      client_record_id: "client-finalized-1"
    };
    const localHistoryStore = {
      prepareRecordSubmitAsync: vi.fn(async () => currentRecord),
      listSyncCandidatesAsync: vi.fn(async () => []),
      getByIdAsync: vi.fn(async () => currentRecord),
      updateRecordAsync: vi.fn(async (_id: string, patch: Record<string, unknown>) => {
        currentRecord = Object.assign({}, currentRecord, patch);
        return currentRecord;
      })
    };
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({ over: false, score: 0 }),
      localHistoryStore,
      fetchImpl: async (url) => url.endsWith("/records")
        ? createJsonResponse({ success: true, data: { id: "server-finalized-1" } })
        : createJsonResponse({ success: true, data: [] })
    });

    await (runtime.windowLike.OnlineLeaderboardRuntime as {
      retryLocalHistoryRecord(id: string): Promise<unknown>;
    }).retryLocalHistoryRecord("local-finalized-1");

    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(true);
    expect(currentRecord).toMatchObject({
      sync_status: "synced",
      server_record_id: "server-finalized-1"
    });
  });

  it("does not clear account auth for a ranked-session-specific 401", async () => {
    const record = {
      id: "local-ranked-session-invalid",
      owner_type: "user",
      owner_user_id: "7",
      sync_status: "pending",
      upload_attempts: 0,
      mode: "standard_no_undo",
      mode_key: MODE_KEY,
      score: 4096,
      replay_string: "replay-v1",
      client_record_id: "client-ranked-session-invalid"
    };
    const patches: Array<Record<string, unknown>> = [];
    const localHistoryStore = {
      prepareRecordSubmitAsync: vi.fn(async () => record),
      listSyncCandidatesAsync: vi.fn(async () => [record]),
      getByIdAsync: vi.fn(async () => record),
      updateRecordAsync: vi.fn(async (_id: string, patch: Record<string, unknown>) => {
        patches.push(patch);
        return Object.assign({}, record, ...patches);
      })
    };
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({ over: false, score: 0 }),
      localHistoryStore,
      fetchImpl: async (url) => url.endsWith("/records")
        ? createJsonResponse({ success: false, code: "RANKED_SESSION_INVALID" }, false, 401)
        : createJsonResponse({ success: true, data: [] })
    });

    await (runtime.windowLike.OnlineLeaderboardRuntime as {
      retryLocalHistoryRecord(id: string): Promise<unknown>;
    }).retryLocalHistoryRecord(record.id);

    expect(patches.at(-1)).toMatchObject({
      sync_status: "needs_action",
      last_error_code: "RANKED_SESSION_INVALID"
    });
    expect(runtime.storage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe("auth-token");
  });

  it("keeps a successful response pending until the server confirms a record id", async () => {
    let currentRecord: Record<string, unknown> = {
      id: "local-missing-server-id",
      owner_type: "user",
      owner_user_id: "7",
      sync_status: "pending",
      upload_attempts: 0,
      mode: "standard_no_undo",
      mode_key: MODE_KEY,
      score: 4096,
      replay_string: "replay-v1",
      client_record_id: "client-missing-server-id"
    };
    const localHistoryStore = {
      prepareRecordSubmitAsync: vi.fn(async () => currentRecord),
      listSyncCandidatesAsync: vi.fn(async () => [currentRecord]),
      getByIdAsync: vi.fn(async () => currentRecord),
      updateRecordAsync: vi.fn(async (_id: string, patch: Record<string, unknown>) => {
        currentRecord = Object.assign({}, currentRecord, patch);
        return currentRecord;
      })
    };
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({ over: false, score: 0 }),
      localHistoryStore,
      fetchImpl: async (url) => url.endsWith("/records")
        ? createJsonResponse({ success: true, skipped: true })
        : createJsonResponse({ success: true, data: [] })
    });

    await (runtime.windowLike.OnlineLeaderboardRuntime as {
      retryLocalHistoryRecord(id: string): Promise<unknown>;
    }).retryLocalHistoryRecord(String(currentRecord.id));

    expect(currentRecord).toMatchObject({
      sync_status: "needs_action",
      last_error_code: "SERVER_RECORD_ID_MISSING"
    });
    expect(currentRecord.server_record_id).toBeUndefined();
  });

  it("keeps the legacy pending payload until the server confirms a record id", async () => {
    const storage = new MemoryStorage();
    storage.setItem(PENDING_RECORD_KEY, JSON.stringify({
      signature: "legacy-missing-server-id",
      ownerUserId: "7",
      createdAt: 123,
      lastAttemptAt: 0,
      retryCount: 0,
      payload: {
        mode: "standard_no_undo",
        mode_key: MODE_KEY,
        score: 4096,
        replay_string: "legacy-replay",
        client_record_id: "legacy-client-record"
      }
    }));
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({ over: false, score: 0 }),
      storage,
      fetchImpl: async (url) => url.endsWith("/records")
        ? createJsonResponse({ success: true, skipped: true })
        : createJsonResponse({ success: true, data: [] })
    });

    await (runtime.windowLike.OnlineLeaderboardRuntime as {
      retryAllLocalHistoryRecords(): Promise<unknown>;
    }).retryAllLocalHistoryRecords();

    expect(storage.getItem(PENDING_RECORD_KEY)).not.toBeNull();
    expect(JSON.parse(storage.getItem(LAST_RECORD_RESULT_KEY) || "{}")).toMatchObject({
      ok: false,
      code: "SERVER_RECORD_ID_MISSING"
    });
  });

  it("keeps a legacy pending record owned by a different account", async () => {
    const storage = new MemoryStorage();
    storage.setItem(PENDING_RECORD_KEY, JSON.stringify({
      signature: "legacy-other-owner",
      ownerUserId: "42",
      createdAt: 123,
      lastAttemptAt: 0,
      retryCount: 0,
      payload: {
        mode: "standard_no_undo",
        mode_key: MODE_KEY,
        score: 4096,
        replay_string: "legacy-other-owner-replay",
        client_record_id: "legacy-other-owner-record"
      }
    }));
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({ over: false, score: 0 }),
      storage,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });

    await (runtime.windowLike.OnlineLeaderboardRuntime as {
      retryAllLocalHistoryRecords(): Promise<unknown>;
    }).retryAllLocalHistoryRecords();

    expect(storage.getItem(PENDING_RECORD_KEY)).not.toBeNull();
    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(false);
  });

  it("waits for the terminal durable save before preparing the upload record", async () => {
    const localSave = createDeferred<Record<string, unknown>>();
    const record = {
      id: "local-terminal-save",
      owner_type: "user",
      owner_user_id: "7",
      sync_status: "pending",
      upload_attempts: 0,
      mode: "standard_no_undo",
      mode_key: MODE_KEY,
      score: 4096,
      replay_string: "replay-v1",
      client_record_id: "rec_client_1"
    };
    const manager = createTerminatedManager({
      sessionSubmitPromise: localSave.promise,
      localHistoryRecordId: null
    });
    const prepareRecordSubmitAsync = vi.fn(async () => record);
    const localHistoryStore = {
      prepareRecordSubmitAsync,
      listSyncCandidatesAsync: vi.fn(async () => []),
      getByIdAsync: vi.fn(async () => record),
      updateRecordAsync: vi.fn(async (_id: string, patch: Record<string, unknown>) => Object.assign({}, record, patch))
    };
    loadOnlineLeaderboardRuntime({
      manager,
      localHistoryStore,
      fetchImpl: async (url) => url.endsWith("/records")
        ? createJsonResponse({ success: true, data: { id: "server-terminal-save" } })
        : createJsonResponse({ success: true, data: [] })
    });

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();
    expect(prepareRecordSubmitAsync).not.toHaveBeenCalled();

    manager.localHistoryRecordId = record.id;
    localSave.resolve(record);
    await flushRuntimePromises();

    expect(prepareRecordSubmitAsync).toHaveBeenCalledWith(
      record.id,
      expect.objectContaining({ client_record_id: "rec_client_1" })
    );
  });

  it("starts the terminal durable save before preparing the upload record", async () => {
    const localSave = createDeferred<Record<string, unknown>>();
    const record = {
      id: "local-terminal-started",
      owner_type: "user",
      owner_user_id: "7",
      sync_status: "pending",
      upload_attempts: 0,
      mode: "standard_no_undo",
      mode_key: MODE_KEY,
      score: 4096,
      replay_string: "replay-v1",
      client_record_id: "rec_client_1"
    };
    const manager = createTerminatedManager({
      sessionSubmitDone: false,
      sessionSubmitPromise: null,
      localHistoryRecordId: null
    });
    const terminalSave = localSave.promise.then((savedRecord) => {
      manager.sessionSubmitDone = true;
      manager.localHistoryRecordId = savedRecord.id;
      return savedRecord;
    });
    const tryAutoSubmitOnGameOver = vi.fn(() => {
      manager.sessionSubmitPromise = terminalSave;
      return terminalSave;
    });
    manager.tryAutoSubmitOnGameOver = tryAutoSubmitOnGameOver;
    const prepareRecordSubmitAsync = vi.fn(async () => record);
    const localHistoryStore = {
      prepareRecordSubmitAsync,
      listSyncCandidatesAsync: vi.fn(async () => []),
      getByIdAsync: vi.fn(async () => record),
      updateRecordAsync: vi.fn(async (_id: string, patch: Record<string, unknown>) => Object.assign({}, record, patch))
    };
    loadOnlineLeaderboardRuntime({
      manager,
      localHistoryStore,
      fetchImpl: async (url) => url.endsWith("/records")
        ? createJsonResponse({ success: true, data: { id: "server-terminal-started" } })
        : createJsonResponse({ success: true, data: [] })
    });

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(tryAutoSubmitOnGameOver).toHaveBeenCalled();
    expect(prepareRecordSubmitAsync).not.toHaveBeenCalled();

    localSave.resolve(record);
    await flushRuntimePromises();

    expect(prepareRecordSubmitAsync).toHaveBeenCalledWith(
      record.id,
      expect.objectContaining({ client_record_id: "rec_client_1" })
    );
  });

  it("respects retry time and excludes needs-action records during automatic scans", async () => {
    const listSyncCandidatesAsync = vi.fn(async () => []);
    const localHistoryStore = {
      prepareRecordSubmitAsync: vi.fn(),
      listSyncCandidatesAsync,
      getByIdAsync: vi.fn(async () => null),
      updateRecordAsync: vi.fn()
    };
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({ over: false, score: 0 }),
      localHistoryStore,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });

    await (runtime.windowLike.OnlineLeaderboardRuntime as {
      retryAllLocalHistoryRecords(options: { deliverySource: string }): Promise<unknown>;
    }).retryAllLocalHistoryRecords({ deliverySource: "automatic" });

    expect(listSyncCandidatesAsync).toHaveBeenCalledWith({
      owner_user_id: "7",
      statuses: ["pending", "retry_wait", "waiting_auth"],
      include_future_retries: false
    });

    await (runtime.windowLike.OnlineLeaderboardRuntime as {
      retryAllLocalHistoryRecords(): Promise<unknown>;
    }).retryAllLocalHistoryRecords();

    expect(listSyncCandidatesAsync).toHaveBeenLastCalledWith({
      owner_user_id: "7",
      statuses: ["pending", "retry_wait", "waiting_auth", "needs_action", "finalized_local"],
      include_future_retries: true
    });
  });

  it("resumes a large local replay through chunk uploads without retrying the direct record body", async () => {
    const replayString = "A".repeat(1536 * 1024 + 17);
    let currentRecord: Record<string, unknown> = {
      id: "local-large-5x5",
      owner_type: "user",
      owner_user_id: "7",
      sync_status: "pending",
      upload_attempts: 0,
      mode: "pow2_5x5",
      mode_key: "board_5x5_pow2_no_undo",
      score: 4096,
      replay_string: replayString,
      replay_byte_size: replayString.length,
      client_record_id: "client-large-5x5"
    };
    const patches: Array<Record<string, unknown>> = [];
    const localHistoryStore = {
      prepareRecordSubmitAsync: vi.fn(async () => currentRecord),
      listSyncCandidatesAsync: vi.fn(async () => [currentRecord]),
      getByIdAsync: vi.fn(async () => currentRecord),
      updateRecordAsync: vi.fn(async (_id: string, patch: Record<string, unknown>) => {
        patches.push(patch);
        currentRecord = Object.assign({}, currentRecord, patch);
        return currentRecord;
      })
    };
    const chunkIndexes: number[] = [];
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({ over: false, score: 0 }),
      localHistoryStore,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records/uploads") && init.method === "POST") {
          return createJsonResponse({
            success: true,
            data: {
              upload_task_id: "upload-large-1",
              status: "uploading",
              chunk_size: 512 * 1024,
              chunk_count: 4,
              received_chunks: [0]
            }
          });
        }
        const chunkMatch = url.match(/\/records\/uploads\/upload-large-1\/chunks\/(\d+)$/);
        if (chunkMatch) {
          chunkIndexes.push(Number(chunkMatch[1]));
          return createJsonResponse({ success: true, chunk_index: Number(chunkMatch[1]) });
        }
        if (url.endsWith("/records/uploads/upload-large-1/complete")) {
          return createJsonResponse({ success: true, id: "server-large-1", upload_task_id: "upload-large-1" });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    await (runtime.windowLike.OnlineLeaderboardRuntime as {
      retryLocalHistoryRecord(id: string): Promise<unknown>;
    }).retryLocalHistoryRecord("local-large-5x5");

    expect(chunkIndexes).toEqual([1, 2, 3]);
    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(false);
    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records/uploads/upload-large-1/complete"))).toBe(true);
    expect(patches).toEqual(expect.arrayContaining([
      expect.objectContaining({ upload_task_id: "upload-large-1", uploaded_chunk_count: 1 }),
      expect.objectContaining({ upload_task_id: "upload-large-1", uploaded_chunk_count: 4 }),
      expect.objectContaining({ sync_status: "synced", server_record_id: "server-large-1" })
    ]));
  });

  it("accepts an already-synced large record without requiring an upload task id", async () => {
    const replayString = "A".repeat(1536 * 1024 + 17);
    let currentRecord: Record<string, unknown> = {
      id: "local-large-existing",
      owner_type: "user",
      owner_user_id: "7",
      sync_status: "pending",
      upload_attempts: 0,
      mode: "pow2_5x5",
      mode_key: "board_5x5_pow2_no_undo",
      replay_string: replayString,
      replay_byte_size: replayString.length,
      client_record_id: "client-large-existing",
    };
    const localHistoryStore = {
      prepareRecordSubmitAsync: vi.fn(async () => currentRecord),
      listSyncCandidatesAsync: vi.fn(async () => [currentRecord]),
      getByIdAsync: vi.fn(async () => currentRecord),
      updateRecordAsync: vi.fn(async (_id: string, patch: Record<string, unknown>) => {
        currentRecord = Object.assign({}, currentRecord, patch);
        return currentRecord;
      }),
    };
    const runtime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({ over: false, score: 0 }),
      localHistoryStore,
      fetchImpl: async (url) => url.endsWith("/records/uploads")
        ? createJsonResponse({
            success: true,
            data: { upload_task_id: null, status: "completed", server_record_id: "server-existing" },
          })
        : createJsonResponse({ success: true, data: [] }),
    });

    await (runtime.windowLike.OnlineLeaderboardRuntime as {
      retryLocalHistoryRecord(id: string): Promise<unknown>;
    }).retryLocalHistoryRecord("local-large-existing");

    expect(currentRecord).toMatchObject({ sync_status: "synced", server_record_id: "server-existing" });
    expect(runtime.fetchCalls.find((call) => call.url.endsWith("/records/uploads"))?.init.headers).toMatchObject({
      "X-Client-Version": "1.8",
      "X-Record-Mode-Key": "board_5x5_pow2_no_undo",
      "X-Client-Record-Id": "client-large-existing",
      "X-Record-Delivery-Source": "manual",
    });
    expect(runtime.fetchCalls.some((call) => call.url.includes("/chunks/"))).toBe(false);
    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/complete"))).toBe(false);
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

  it("keeps a terminal record pending after a transient server failure", async () => {
    const storage = new MemoryStorage();
    const manager = createTerminatedManager();
    loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url) => {
        if (url.endsWith("/records")) {
          return createJsonResponse({ success: false, code: "INTERNAL_ERROR" }, false, 500);
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    const pendingRaw = storage.getItem(PENDING_RECORD_KEY);
    expect(pendingRaw).not.toBeNull();
    expect(JSON.parse(pendingRaw || "{}")).toMatchObject({
      payload: {
        mode_key: MODE_KEY,
        score: 4096,
        replay_string: "replay-v1"
      }
    });
    expect(storage.getItem(LAST_RECORD_SUBMIT_KEY)).toBeNull();
  });

  it("does not fallback authenticated record writes to another API base", async () => {
    const storage = new MemoryStorage();
    const manager = createTerminatedManager();
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      apiBases: ["https://local.example/api", "https://remote.example/api"],
      fetchImpl: async (url) => {
        if (url === "https://local.example/api/records") {
          return {
            ok: false,
            status: 500,
            headers: { get: vi.fn(() => "") },
            json: vi.fn(async () => {
              throw new Error("no-json");
            })
          };
        }
        return createJsonResponse({ success: true, data: { id: "should-not-fallback" } });
      }
    });

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(runtime.fetchCalls.filter((call) => call.url.endsWith("/records"))).toHaveLength(1);
    expect(runtime.fetchCalls[0]?.url).toBe("https://local.example/api/records");
    expect(storage.getItem(PENDING_RECORD_KEY)).not.toBeNull();
  });

  it("queues later terminal records instead of overwriting an older pending record", async () => {
    const storage = new MemoryStorage();
    const manager = createTerminatedManager();
    let submitOk = false;
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url) => {
        if (url.endsWith("/records")) {
          return submitOk
            ? createJsonResponse({ success: true, data: { id: "record-ok" } })
            : createJsonResponse({ success: false, code: "INTERNAL_ERROR" }, false, 500);
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    manager.clientRecordId = "rec_client_2";
    manager.score = 8192;
    manager.serialize = vi.fn(() => "replay-v2");
    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(JSON.parse(storage.getItem(PENDING_RECORD_KEY) || "{}")).toMatchObject({
      payload: { replay_string: "replay-v1" }
    });
    expect(JSON.parse(storage.getItem(PENDING_RECORD_QUEUE_KEY) || "[]")).toMatchObject([
      { payload: { replay_string: "replay-v2", score: 8192 } }
    ]);

    submitOk = true;
    const retryRuntime = loadOnlineLeaderboardRuntime({
      manager: createTerminatedManager({ over: false, score: 0 }),
      storage,
      disableOnlineLeaderboard: false,
      fetchImpl: async (url) => {
        if (url.endsWith("/records")) return createJsonResponse({ success: true, data: { id: "record-ok" } });
        return createJsonResponse({ success: true, data: [] });
      }
    });
    await (retryRuntime.windowLike.OnlineLeaderboardRuntime as {
      retryAllLocalHistoryRecords(): Promise<unknown>;
    }).retryAllLocalHistoryRecords();
    await flushRuntimePromises();
    await flushRuntimePromises();

    expect(runtime.fetchCalls.filter((call) => call.url.endsWith("/records"))).toHaveLength(1);
    expect(retryRuntime.fetchCalls.filter((call) => call.url.endsWith("/records"))).toHaveLength(2);
    expect(storage.getItem(PENDING_RECORD_KEY)).toBeNull();
    expect(storage.getItem(PENDING_RECORD_QUEUE_KEY)).toBeNull();
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

  it("reports a failed ranked checkpoint mirror write instead of treating the old mirror as current", () => {
    const storage = new MemoryStorage();
    storage.setItem(CHECKPOINT_MIRROR_KEY, JSON.stringify({
      mode_key: MODE_KEY,
      replay_string: "old-replay",
      saved_at: Date.now() - 1000,
      owner_user_id: "7"
    }));
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = vi.fn((key: string, value: string) => {
      if (key === CHECKPOINT_MIRROR_KEY) throw new DOMException("quota", "QuotaExceededError");
      originalSetItem(key, value);
    });
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      over: false,
      hasGameStarted: true,
      moveHistory: [0, 1],
      successfulMoveCount: 2,
      rankedSessionToken: "current-ranked-token",
      challengeId: "current-ranked-challenge"
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });

    const persisted = (runtime.windowLike.OnlineLeaderboardRuntime as any)
      .persistRankedCheckpointOnPageHide(manager);

    expect(persisted).toBe(false);
    expect(storage.getItem(CHECKPOINT_MIRROR_KEY)).toContain("old-replay");
  });

  it("restores the original v1 session after checkpoint replay instead of recording machine replay time", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    const replayString = "checkpoint-v1-original";
    const originalSession = {
      v: 1,
      mode_key: MODE_KEY,
      ruleset: "pow2",
      board_width: 4,
      board_height: 4,
      start_unix_ms: 1_780_000_000,
      challenge_id: "ranked-checkpoint-prefix",
      seed: 202,
      init_tiles: [{ cellIndex: 0, valueBit: 0 }, { cellIndex: 5, valueBit: 0 }],
      records: [
        { kind: "move", dir: 0, spawnIndex: 2, spawnValueBit: 0, deltaMs: 700 },
        { kind: "move", dir: 1, spawnIndex: 3, spawnValueBit: 1, deltaMs: 1_300 }
      ],
      recorded_elapsed_ms: 2_000,
      supported: true
    };
    storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
      mode_key: MODE_KEY,
      challenge_id: originalSession.challenge_id,
      seed: originalSession.seed,
      ranked_session_token: "checkpoint-prefix-token",
      issued_at: nowSec,
      exp: nowSec + 3600,
      owner_user_id: "7"
    }));
    storage.setItem(CHECKPOINT_MIRROR_KEY, JSON.stringify({
      mode_key: MODE_KEY,
      challenge_id: originalSession.challenge_id,
      ranked_session_token: "checkpoint-prefix-token",
      initial_seed: originalSession.seed,
      seed: originalSession.seed,
      replay_string: replayString,
      duration_ms: 4_000,
      saved_at: Date.now(),
      owner_user_id: "7",
      ui_state: { has_game_started: true, timer_status: 1 }
    }));
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      over: false,
      score: 0,
      hasGameStarted: false,
      moveHistory: [],
      successfulMoveCount: 0,
      rankedSessionToken: "checkpoint-prefix-token",
      challengeId: originalSession.challenge_id,
      initialSeed: originalSession.seed,
      needsRankedCheckpointRestore: false,
      sessionReplayV1: null,
      actuate: vi.fn(),
      updateUndoUiState: vi.fn(),
      notifyUndoSettingsStateChanged: vi.fn(),
      updateStatsPanel: vi.fn(),
      startTimer: vi.fn(function (this: Record<string, unknown>) {
        this.timerStatus = 1;
      }),
      serialize: vi.fn(function (this: Record<string, unknown>) {
        return this.sessionReplayV1 === originalSession ? replayString : "rewritten-machine-replay";
      }),
      move: vi.fn(function (this: Record<string, unknown>, direction: number) {
        expect(this.rankCheckpointReplayExecuting).toBe(true);
        const session = this.sessionReplayV1 as { records?: unknown[] } | null;
        session?.records?.push({ kind: "move", dir: direction, deltaMs: 1 });
        (this.moveHistory as number[]).push(direction);
        this.forcedSpawn = null;
        return true;
      })
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      parseReplayImportEnvelope: () => ({
        kind: "v1rpl",
        modeKey: MODE_KEY,
        initialBoard: [[2, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        replayMoves: [0, 1],
        replaySpawns: [{ x: 2, y: 0, value: 2 }, { x: 3, y: 0, value: 4 }],
        sessionReplayV1: originalSession
      }),
      resolveStructuredReplayModeConfig: () => ({ key: MODE_KEY }),
      buildSavedGameStatePayload: (currentManager) => ({
        mode_key: MODE_KEY,
        score: Number((currentManager as Record<string, unknown>).score || 0),
        over: !!(currentManager as Record<string, unknown>).over,
        won: !!(currentManager as Record<string, unknown>).won,
        keep_playing: !!(currentManager as Record<string, unknown>).keepPlaying
      }),
      applySavedStateRestore: () => true,
      restartWithBoard: (currentManager) => {
        (currentManager as Record<string, unknown>).sessionReplayV1 = { records: [] };
        (currentManager as Record<string, unknown>).moveHistory = [];
      },
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });

    manager.needsRankedCheckpointRestore = true;
    (runtime.windowLike.OnlineLeaderboardRuntime as any).scheduleRankedCheckpointRestore(manager, { delayMs: 0 });
    await flushRuntimePromises();

    expect(manager.sessionReplayV1).toBe(originalSession);
    expect(originalSession.records).toEqual([
      { kind: "move", dir: 0, spawnIndex: 2, spawnValueBit: 0, deltaMs: 700 },
      { kind: "move", dir: 1, spawnIndex: 3, spawnValueBit: 1, deltaMs: 1_300 }
    ]);
    expect(manager.serialize).toHaveReturnedWith(replayString);
    expect(manager.lastRankedCheckpointRestoreError).toBe("");
    expect(manager.rankCheckpointReplayExecuting).toBe(false);
  });

  it("rolls back a partial checkpoint replay and keeps restore locked when a later action fails", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    const replayString = "checkpoint-v1-partial-failure";
    const priorSession = { records: [{ kind: "move", dir: 3, deltaMs: 900 }] };
    const priorBoard = [[4, 2], [0, 0]];
    const originalSession = {
      v: 1,
      mode_key: MODE_KEY,
      ruleset: "pow2",
      board_width: 4,
      board_height: 4,
      challenge_id: "ranked-checkpoint-partial",
      seed: 404,
      init_tiles: [],
      records: [
        { kind: "move", dir: 0, spawnIndex: 2, spawnValueBit: 0, deltaMs: 700 },
        { kind: "move", dir: 1, spawnIndex: 3, spawnValueBit: 0, deltaMs: 800 }
      ],
      recorded_elapsed_ms: 1_500,
      supported: true
    };
    storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
      mode_key: MODE_KEY,
      challenge_id: originalSession.challenge_id,
      seed: originalSession.seed,
      ranked_session_token: "checkpoint-partial-token",
      issued_at: nowSec,
      exp: nowSec + 3600,
      owner_user_id: "7"
    }));
    storage.setItem(CHECKPOINT_MIRROR_KEY, JSON.stringify({
      mode_key: MODE_KEY,
      challenge_id: originalSession.challenge_id,
      ranked_session_token: "checkpoint-partial-token",
      initial_seed: originalSession.seed,
      seed: originalSession.seed,
      replay_string: replayString,
      duration_ms: 2_000,
      saved_at: Date.now(),
      owner_user_id: "7",
      ui_state: { has_game_started: true, timer_status: 1 }
    }));
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      over: false,
      score: 64,
      hasGameStarted: true,
      moveHistory: [3],
      successfulMoveCount: 1,
      rankedSessionToken: "checkpoint-partial-token",
      challengeId: originalSession.challenge_id,
      initialSeed: originalSession.seed,
      seed: originalSession.seed,
      sessionReplayV1: priorSession,
      board: priorBoard,
      timerStatus: 1,
      accumulatedTime: 1_900,
      actuate: vi.fn(),
      updateUndoUiState: vi.fn(),
      notifyUndoSettingsStateChanged: vi.fn(),
      updateStatsPanel: vi.fn(),
      startTimer: vi.fn(function (this: Record<string, unknown>) {
        this.timerStatus = 1;
      }),
      serialize: vi.fn(() => replayString),
      move: vi.fn(function (this: Record<string, unknown>, direction: number) {
        if (direction === 0) {
          this.score = 128;
          this.board = [[8, 0], [0, 0]];
          (this.moveHistory as number[]).push(direction);
          this.forcedSpawn = null;
          return true;
        }
        return false;
      })
    });
    const rollbackSnapshot = {
      mode_key: MODE_KEY,
      score: 64,
      board: priorBoard.map((row) => row.slice()),
      move_history: [3],
      successful_move_count: 1,
      session_replay_v1: priorSession,
      duration_ms: 1_900,
      timer_status: 1,
      ranked_session_token: "checkpoint-partial-token",
      challenge_id: originalSession.challenge_id,
      initial_seed: originalSession.seed,
      seed: originalSession.seed
    };
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      parseReplayImportEnvelope: () => ({
        kind: "v1rpl",
        modeKey: MODE_KEY,
        initialBoard: [[2, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        replayMoves: [0, 1],
        replaySpawns: [{ x: 2, y: 0, value: 2 }, { x: 3, y: 0, value: 2 }],
        sessionReplayV1: originalSession
      }),
      resolveStructuredReplayModeConfig: () => ({ key: MODE_KEY }),
      buildSavedGameStatePayload: () => rollbackSnapshot,
      applySavedStateRestore: (currentManager, savedState) => {
        const target = currentManager as Record<string, unknown>;
        target.score = savedState.score;
        target.board = (savedState.board as number[][]).map((row) => row.slice());
        target.moveHistory = (savedState.move_history as number[]).slice();
        target.successfulMoveCount = savedState.successful_move_count;
        target.sessionReplayV1 = savedState.session_replay_v1;
        target.accumulatedTime = savedState.duration_ms;
        target.timerStatus = 0;
        target.rankedSessionToken = savedState.ranked_session_token;
        target.challengeId = savedState.challenge_id;
        target.initialSeed = savedState.initial_seed;
        target.seed = savedState.seed;
        return true;
      },
      restartWithBoard: (currentManager) => {
        const target = currentManager as Record<string, unknown>;
        target.score = 0;
        target.board = [[2, 0], [0, 2]];
        target.moveHistory = [];
        target.sessionReplayV1 = { records: [] };
      },
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });

    manager.needsRankedCheckpointRestore = true;
    (runtime.windowLike.OnlineLeaderboardRuntime as any).scheduleRankedCheckpointRestore(manager, { delayMs: 0 });
    await flushRuntimePromises();

    expect(manager).toMatchObject({
      score: 64,
      board: priorBoard,
      moveHistory: [3],
      successfulMoveCount: 1,
      sessionReplayV1: priorSession,
      accumulatedTime: 1_900,
      timerStatus: 1,
      rankedSessionToken: "checkpoint-partial-token",
      challengeId: originalSession.challenge_id,
      initialSeed: originalSession.seed,
      seed: originalSession.seed,
      needsRankedCheckpointRestore: true,
      rankCheckpointRestorePending: true,
      rankCheckpointApplying: false,
      lastRankedCheckpointRestoreError: "action_apply_failed"
    });
    expect(manager.startTimer).toHaveBeenCalledTimes(1);
    const checkpointBeforePageHide = storage.getItem(CHECKPOINT_MIRROR_KEY);
    expect(checkpointBeforePageHide).not.toBeNull();
    (runtime.windowLike.OnlineLeaderboardRuntime as any).persistRankedCheckpointOnPageHide(manager);
    expect(storage.getItem(CHECKPOINT_MIRROR_KEY)).toBe(checkpointBeforePageHide);
    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(false);
  });

  it("keeps the checkpoint when its saved duration predates the replay timeline", async () => {
    const storage = new MemoryStorage();
    const replayString = "checkpoint-duration-invalid";
    const nowSec = Math.floor(Date.now() / 1000);
    const originalSession = {
      v: 1,
      mode_key: MODE_KEY,
      ruleset: "pow2",
      board_width: 4,
      board_height: 4,
      init_tiles: [],
      records: [{ kind: "move", dir: 0, spawnIndex: 2, spawnValueBit: 0, deltaMs: 2_000 }],
      recorded_elapsed_ms: 2_000,
      supported: true
    };
    storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
      mode_key: MODE_KEY,
      challenge_id: "duration-invalid",
      seed: 303,
      ranked_session_token: "duration-invalid-token",
      issued_at: nowSec,
      exp: nowSec + 3600,
      owner_user_id: "7"
    }));
    storage.setItem(CHECKPOINT_MIRROR_KEY, JSON.stringify({
      mode_key: MODE_KEY,
      challenge_id: "duration-invalid",
      ranked_session_token: "duration-invalid-token",
      initial_seed: 303,
      replay_string: replayString,
      duration_ms: 1_000,
      saved_at: Date.now(),
      owner_user_id: "7",
      ui_state: { has_game_started: true, timer_status: 1 }
    }));
    const manager = createTerminatedManager({
      rankPolicy: "ranked",
      over: false,
      rankedSessionToken: "duration-invalid-token",
      challengeId: "duration-invalid",
      initialSeed: 303,
      sessionReplayV1: null,
      actuate: vi.fn(),
      updateUndoUiState: vi.fn(),
      notifyUndoSettingsStateChanged: vi.fn(),
      updateStatsPanel: vi.fn(),
      startTimer: vi.fn(),
      serialize: vi.fn(function (this: Record<string, unknown>) {
        return this.sessionReplayV1 === originalSession ? replayString : "rewritten";
      }),
      move: vi.fn()
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      parseReplayImportEnvelope: () => ({
        kind: "v1rpl",
        modeKey: MODE_KEY,
        initialBoard: [[2, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        replayMoves: [],
        replaySpawns: [],
        sessionReplayV1: originalSession
      }),
      resolveStructuredReplayModeConfig: () => ({ key: MODE_KEY }),
      buildSavedGameStatePayload: () => ({ mode_key: MODE_KEY }),
      applySavedStateRestore: () => true,
      restartWithBoard: () => undefined,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });

    manager.needsRankedCheckpointRestore = true;
    (runtime.windowLike.OnlineLeaderboardRuntime as any).scheduleRankedCheckpointRestore(manager, { delayMs: 0 });
    await flushRuntimePromises();

    expect(manager.lastRankedCheckpointRestoreError).toBe("duration_before_replay");
    expect(storage.getItem(CHECKPOINT_MIRROR_KEY)).not.toBeNull();
  });

  it("does not submit an intermediate terminal board while replaying a checkpoint", async () => {
    const manager = createTerminatedManager({
      rankCheckpointApplying: true,
      score: 2048
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      fetchImpl: async (url) => {
        if (url.endsWith("/records")) {
          return createJsonResponse({ success: true, data: { id: "unexpected" } });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.move as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(runtime.fetchCalls.some((call) => call.url.endsWith("/records"))).toBe(false);
    expect(runtime.storage.getItem(PENDING_RECORD_KEY)).toBeNull();
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
      spawn_sequence_version: 1,
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

  it("durably captures the terminal record and retires its active session before upload finishes", async () => {
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
      challengeId: "ranked-old",
      tryAutoSubmitOnGameOver: vi.fn()
    });
    let recordPayload: Record<string, unknown> | null = null;
    const recordSubmit = createDeferred<Record<string, unknown>>();
    loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async (url, init) => {
        if (url.endsWith("/records")) {
          recordPayload = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
          await recordSubmit.promise;
          return createJsonResponse({ success: true, data: { id: "record-old" } });
        }
        if (url.includes("/ranked-checkpoint")) {
          return createJsonResponse({ success: true, deleted: true });
        }
        return createJsonResponse({ success: true, data: [] });
      }
    });

    (manager.tryAutoSubmitOnGameOver as { call: (thisArg: unknown) => void }).call(manager);

    expect(JSON.parse(storage.getItem(PENDING_RECORD_KEY) || "{}")).toMatchObject({
      payload: {
        ranked_session_token: "old-ranked-token",
        challenge_id: "ranked-old"
      }
    });
    expect(storage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
    expect(JSON.parse(storage.getItem(PREFETCH_SESSION_KEY) || "{}").ranked_session_token).toBe(
      "next-ranked-token"
    );

    await flushRuntimePromises();
    expect(recordPayload?.ranked_session_token).toBe("old-ranked-token");

    recordSubmit.resolve({ success: true });
    await flushRuntimePromises();
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
    const enqueueAttempt = vi.fn(() => true);
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
      clearActiveSession: vi.fn(),
      enqueueAttempt,
      flushAttemptOutbox: vi.fn(async () => true)
    };

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);

    expect(originalRestart).not.toHaveBeenCalled();
    await flushRuntimePromises();

    expect(startNextSession).toHaveBeenCalledWith(MODE_KEY);
    expect(originalRestart).toHaveBeenCalledTimes(1);
    expect(recordPayload?.ranked_session_token).toBe("old-ranked-token");
    expect(recordPayload?.challenge_id).toBe("ranked-old");
    expect(enqueueAttempt).not.toHaveBeenCalled();
    expect(JSON.parse(storage.getItem(ACTIVE_SESSION_KEY) || "{}").ranked_session_token).toBe("next-ranked-token");
    expect(runtime.windowLike.alert).not.toHaveBeenCalled();
  });

  it("attempts to persist abandon before restarting an active ranked game without setup", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    storage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        mode_key: MODE_KEY,
        challenge_id: "ranked-no-setup",
        seed: 123,
        ranked_session_token: "no-setup-token",
        issued_at: nowSec - 60,
        exp: nowSec + 3600,
        owner_user_id: "7"
      })
    );

    const originalRestart = vi.fn();
    const manager = createTerminatedManager({
      over: false,
      rankPolicy: "ranked",
      rankedSessionToken: "no-setup-token",
      challengeId: "ranked-no-setup",
      restart: originalRestart
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });
    const enqueueAttempt = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const startNextSession = vi.fn(async () => true);
    runtime.windowLike.RankedSessionRuntime = {
      startNextSession,
      enqueueAttempt,
      flushAttemptOutbox: vi.fn(async () => true),
      ensurePrefetch: vi.fn(async () => true)
    };

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(enqueueAttempt).toHaveBeenCalledWith(expect.objectContaining({
      event: "abandon",
      ranked_session_token: "no-setup-token",
      reason: "restart",
      attempt_schema_version: 1
    }));
    expect(startNextSession).not.toHaveBeenCalled();
    expect(originalRestart).not.toHaveBeenCalled();
    expect(runtime.windowLike.alert).toHaveBeenCalledTimes(1);

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(enqueueAttempt).toHaveBeenCalledTimes(2);
    expect(startNextSession).toHaveBeenCalledWith(MODE_KEY);
    expect(originalRestart).toHaveBeenCalledTimes(1);
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
    const restartOrder: string[] = [];
    const clearSavedGameState = vi.fn(() => {
      restartOrder.push("clear");
    });
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
        (this.clearSavedGameState as (...args: unknown[]) => void)(MODE_KEY);
        (this.setup as (...args: unknown[]) => void)(undefined, { disableStateRestore: true });
      });
    });
    const manager = createTerminatedManager({
      over: false,
      rankPolicy: "ranked",
      rankedSessionToken: "old-ranked-token",
      challengeId: "ranked-old",
      restart: originalRestart,
      actuate,
      clearSavedGameState,
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
    const enqueueAttempt = vi.fn(() => {
      restartOrder.push("enqueue");
      return true;
    });
    const flushAttemptOutbox = vi.fn(async () => true);
    runtime.windowLike.RankedSessionRuntime = {
      promotePrefetchedSession: vi.fn(() => false),
      startNextSession: vi.fn(() => {
        restartOrder.push("start");
        return seedDeferred.promise.then((ready) => {
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
        });
      }),
      ensurePrefetch: vi.fn(async () => true),
      clearActiveSession: vi.fn(),
      enqueueAttempt,
      flushAttemptOutbox
    };

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);

    expect(confirmationShown).toBe(true);
    expect(runtime.windowLike.RankedSessionRuntime.startNextSession).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();

    confirmDeferred.resolve(true);
    await flushRuntimePromises();

    expect(runtime.windowLike.RankedSessionRuntime.startNextSession).toHaveBeenCalledWith(MODE_KEY);
    expect(restartOrder.slice(0, 3)).toEqual(["enqueue", "clear", "start"]);
    expect(enqueueAttempt).toHaveBeenCalledWith(expect.objectContaining({
      event: "abandon",
      ranked_session_token: "old-ranked-token",
      reason: "restart",
      attempt_schema_version: 1
    }));
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
    const enqueueAttempt = vi.fn(() => true);
    runtime.windowLike.RankedSessionRuntime = {
      promotePrefetchedSession: vi.fn(() => false),
      startNextSession: vi.fn(async () => true),
      ensurePrefetch: vi.fn(async () => true),
      clearActiveSession: vi.fn(),
      enqueueAttempt,
      flushAttemptOutbox: vi.fn(async () => true)
    };

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);

    expect(confirmationShown).toBe(true);
    expect(runtime.windowLike.RankedSessionRuntime.startNextSession).not.toHaveBeenCalled();

    confirmDeferred.resolve(false);
    await flushRuntimePromises();

    expect(runtime.windowLike.RankedSessionRuntime.startNextSession).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
    expect(enqueueAttempt).not.toHaveBeenCalled();
    expect(manager.setup).toBe(setup);
    expect(manager.rankedRestartPreparing).toBe(false);
  });

  it("keeps the old ranked game when restart abandon cannot be persisted", async () => {
    const storage = new MemoryStorage();
    const continueGame = vi.fn();
    const clearSavedGameState = vi.fn();
    const setup = vi.fn();
    const originalRestart = vi.fn(function (this: Record<string, any>) {
      return Promise.resolve().then(() => {
        this.actuator.continue();
        this.clearSavedGameState(MODE_KEY);
        this.setup(undefined, { disableStateRestore: true });
      });
    });
    const manager = createTerminatedManager({
      over: false,
      rankPolicy: "ranked",
      rankedSessionToken: "persist-failure-token",
      challengeId: "persist-failure-challenge",
      successfulMoveCount: 2,
      actuator: { continue: continueGame },
      clearSavedGameState,
      setup,
      restart: originalRestart
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });
    const startNextSession = vi.fn(async () => true);
    runtime.windowLike.RankedSessionRuntime = {
      startNextSession,
      enqueueAttempt: vi.fn(() => false),
      flushAttemptOutbox: vi.fn(async () => false),
      ensurePrefetch: vi.fn(async () => true)
    };

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(continueGame).not.toHaveBeenCalled();
    expect(clearSavedGameState).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
    expect(startNextSession).not.toHaveBeenCalled();
    expect(manager.rankedSessionToken).toBe("persist-failure-token");
    expect(manager.rankedRestartPreparing).toBe(false);
    expect(runtime.windowLike.alert).toHaveBeenCalled();
  });

  it("does not promote a prefetched ranked session before restart confirmation is accepted", async () => {
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
      over: false,
      rankPolicy: "ranked",
      rankedSessionToken: "old-ranked-token",
      challengeId: "ranked-old",
      restart: originalRestart,
      setup
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });
    const promotePrefetchedSession = vi.fn(() => {
      storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(nextSession));
      storage.removeItem(PREFETCH_SESSION_KEY);
      runtime.windowLike.GAME_CHALLENGE_CONTEXT = {
        id: nextSession.challenge_id,
        mode_key: MODE_KEY,
        seed: nextSession.seed,
        ranked_session_token: nextSession.ranked_session_token
      };
      return true;
    });
    runtime.windowLike.RankedSessionRuntime = {
      promotePrefetchedSession,
      startNextSession: vi.fn(async () => true),
      ensurePrefetch: vi.fn(async () => true),
      clearActiveSession: vi.fn()
    };

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);

    expect(confirmationShown).toBe(true);
    expect(promotePrefetchedSession).not.toHaveBeenCalled();

    confirmDeferred.resolve(false);
    await flushRuntimePromises();

    expect(promotePrefetchedSession).not.toHaveBeenCalled();
    expect(runtime.windowLike.RankedSessionRuntime.startNextSession).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
    expect(JSON.parse(storage.getItem(ACTIVE_SESSION_KEY) || "{}").ranked_session_token).toBe(
      "old-ranked-token"
    );
    expect(JSON.parse(storage.getItem(PREFETCH_SESSION_KEY) || "{}").ranked_session_token).toBe(
      "next-ranked-token"
    );
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
    expect(storage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
    expect(manager.rankedSessionToken).toBe("old-ranked-token");
    expect(manager.rankedRestartBlockedUntilSessionReady).toBe(true);
    expect(manager.rankedRestartPreparing).toBe(false);
  });

  it("blocks moves after abandon is persisted but the next ranked session is unavailable", async () => {
    const storage = new MemoryStorage();
    const nowSec = Math.floor(Date.now() / 1000);
    storage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        mode_key: MODE_KEY,
        challenge_id: "ranked-abandoned",
        seed: 123,
        ranked_session_token: "abandoned-token",
        issued_at: nowSec - 60,
        exp: nowSec + 3600,
        owner_user_id: "7"
      })
    );

    const setup = vi.fn();
    const originalMove = vi.fn();
    const originalRestart = vi.fn(function (this: Record<string, unknown>) {
      (this.setup as (...args: unknown[]) => void)(undefined, { disableStateRestore: true });
    });
    const manager = createTerminatedManager({
      over: false,
      rankPolicy: "ranked",
      rankedSessionToken: "abandoned-token",
      challengeId: "ranked-abandoned",
      move: originalMove,
      restart: originalRestart,
      setup
    });
    const runtime = loadOnlineLeaderboardRuntime({
      manager,
      storage,
      fetchImpl: async () => createJsonResponse({ success: true, data: [] })
    });
    const enqueueAttempt = vi.fn(() => true);
    runtime.windowLike.RankedSessionRuntime = {
      startNextSession: vi.fn(async () => false),
      enqueueAttempt,
      flushAttemptOutbox: vi.fn(async () => true),
      ensurePrefetch: vi.fn(async () => false)
    };

    (manager.restart as { call: (thisArg: unknown) => void }).call(manager);
    await flushRuntimePromises();

    expect(enqueueAttempt).toHaveBeenCalledWith(expect.objectContaining({
      event: "abandon",
      ranked_session_token: "abandoned-token",
      reason: "restart"
    }));
    expect(manager.rankedRestartBlockedUntilSessionReady).toBe(true);
    expect(manager.over).toBe(false);

    (manager.move as { call: (thisArg: unknown, direction: number) => void }).call(manager, 1);

    expect(originalMove).not.toHaveBeenCalled();
    expect(manager.successfulMoveCount).toBe(2);
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
