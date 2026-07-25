// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAppController,
  formatDuration,
  resolveStoredSaveDurationMs,
  sortGuestRecords,
  type AppController,
  type AppControllerOptions,
} from "../../mobile/src/app/app-controller";
import type { GuestAppRuntime } from "../../mobile/src/app/app-runtime";
import { renderAppTemplate } from "../../mobile/src/app/templates";
import type { AccountSessionV1 } from "../../mobile/src/auth/account-session";
import {
  MobileAuthError,
  type MobileAuthService,
} from "../../mobile/src/auth/auth-service";
import {
  APP_DATABASE_SCHEMA_VERSION,
  type StoredGameRecord,
} from "../../mobile/src/data/app-database";
import type { GuestGameSession } from "../../mobile/src/game/guest-session";
import { createTranslator } from "../../mobile/src/i18n";
import { createEngineSession } from "../../src/core/engine";

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function session(
  hasEffectiveMove = false,
  modeKey:
    | "standard_4x4_pow2_no_undo"
    | "classic_4x4_pow2_undo"
    | "board_3x3_pow2_no_undo" = "standard_4x4_pow2_no_undo",
  options: {
    ownerKey?: "guest" | `user:${number}`;
    gameKind?: "normal" | "ranked";
    pendingTerminal?: boolean;
  } = {},
): GuestGameSession {
  const engine = createEngineSession({
    modeKey,
    seed: hasEffectiveMove ? 4_096 : 2_048,
  });
  let state = engine.init();
  const fences = new Set<string>();
  let pendingTerminal = options.pendingTerminal ?? false;
  return {
    get state() {
      return state;
    },
    get currentSave() {
      return {
        ownerKey: options.ownerKey ?? "guest",
        modeKey,
        gameKind: options.gameKind ?? "normal",
      };
    },
    get inputLocked() {
      return fences.size > 0;
    },
    get inputFences() {
      return new Set(fences);
    },
    get hasEffectiveMove() {
      return hasEffectiveMove;
    },
    get pendingTerminal() {
      return pendingTerminal;
    },
    elapsedMs: () => 0,
    addInputFence: vi.fn((reason: string) => fences.add(reason)),
    removeInputFence: vi.fn((reason: string) => fences.delete(reason)),
    flush: vi.fn(async () => undefined),
    undoPendingTerminal: vi.fn(async () => {
      for (const direction of [0, 1, 2, 3] as const) {
        const transition = engine.move({ direction, atMs: 1 });
        if (!transition.moved) continue;
        state = transition.state;
        pendingTerminal = false;
        return transition;
      }
      throw new Error("test_transition_missing");
    }),
  } as unknown as GuestGameSession;
}

function accountSession(): AccountSessionV1 {
  return {
    version: 1,
    accessToken: "account-access-token",
    expiresAtEpochSeconds: 2_000_000_000,
    user: {
      id: 42,
      email: "player@example.com",
      nickname: "Next Player",
      role: "player",
    },
    persistentIdentity: { userId: 42, establishedAtMs: 1_000 },
    challengeRefs: [],
  };
}

function authService(
  overrides: Partial<MobileAuthService> = {},
): MobileAuthService {
  return {
    getSession: vi.fn(async () => accountSession()),
    login: vi.fn(async () => accountSession()),
    registerStart: vi.fn(async () => ({ success: true })),
    registerVerify: vi.fn(async () => accountSession()),
    passwordResetStart: vi.fn(async () => ({ success: true })),
    passwordResetVerify: vi.fn(async () => ({ success: true })),
    currentUser: vi.fn(async () => accountSession().user),
    refresh: vi.fn(async () => accountSession()),
    submitRecord: vi.fn(async () => ({ success: true })),
    ...overrides,
  };
}

interface RuntimeHarness {
  readonly runtime: GuestAppRuntime;
  readonly enterGuestStandard: ReturnType<typeof vi.fn>;
  readonly restartActiveSession: ReturnType<typeof vi.fn>;
  readonly leaveActiveSession: ReturnType<typeof vi.fn>;
  readonly moveActiveSession: ReturnType<typeof vi.fn>;
  readonly finalizeActiveTerminal: ReturnType<typeof vi.fn>;
  readonly undoActivePendingTerminal: ReturnType<typeof vi.fn>;
  readonly confirmActivePendingTerminal: ReturnType<typeof vi.fn>;
  readonly getGuestRecord: ReturnType<typeof vi.fn>;
  readonly getAccountRecord: ReturnType<typeof vi.fn>;
  readonly retryAccountRecordSubmit: ReturnType<typeof vi.fn>;
  readonly prepareAccountLogout: ReturnType<typeof vi.fn>;
  readonly confirmAccountLogout: ReturnType<typeof vi.fn>;
  get activeSession(): GuestGameSession | null;
  setActiveSession(value: GuestGameSession | null): void;
}

function runtimeHarness(records: StoredGameRecord[] = []): RuntimeHarness {
  let activeSession: GuestGameSession | null = null;
  const enterGuestStandard = vi.fn(async () => {
    activeSession ??= session();
    return {
      status: "ready" as const,
      restored: false,
      session: activeSession,
    };
  });
  const restartActiveSession = vi.fn(async () => {
    activeSession = session();
    return activeSession;
  });
  const leaveActiveSession = vi.fn(async () => {
    activeSession = null;
  });
  const moveActiveSession = vi.fn();
  const finalizeActiveTerminal = vi.fn();
  const undoActivePendingTerminal = vi.fn(async () => {
    if (!activeSession) throw new Error("no_active_session");
    return activeSession.undoPendingTerminal();
  });
  const confirmActivePendingTerminal = vi.fn();
  const getGuestRecord = vi.fn(async () => null);
  const getAccountRecord = vi.fn(async (clientRecordId: string) =>
    records.find((record) => record.clientRecordId === clientRecordId) ?? null,
  );
  const retryAccountRecordSubmit = vi.fn(async () => null);
  const prepareAccountLogout = vi.fn(async () => null);
  const confirmAccountLogout = vi.fn(async () => null);
  const runtime = {
    get guestSave() {
      return { status: "missing" as const };
    },
    get guestRecords() {
      return records;
    },
    get activeSession() {
      return activeSession;
    },
    enterGuestStandard,
    restartActiveSession,
    leaveActiveSession,
    moveActiveSession,
    finalizeActiveTerminal,
    undoActivePendingTerminal,
    confirmActivePendingTerminal,
    getGuestRecord,
    getAccountRecord,
    flushAccountRecordOutbox: vi.fn(async () => null),
    retryAccountRecordSubmit,
    prepareAccountLogout,
    confirmAccountLogout,
    refreshGuestSummary: vi.fn(async () => undefined),
    deleteGuestRecord: vi.fn(async () => true),
    pauseActiveSession: vi.fn(async () => undefined),
    resumeActiveSession: vi.fn(() => 0),
  } as unknown as GuestAppRuntime;
  return {
    runtime,
    enterGuestStandard,
    restartActiveSession,
    leaveActiveSession,
    moveActiveSession,
    finalizeActiveTerminal,
    undoActivePendingTerminal,
    confirmActivePendingTerminal,
    getGuestRecord,
    getAccountRecord,
    retryAccountRecordSubmit,
    prepareAccountLogout,
    confirmAccountLogout,
    get activeSession() {
      return activeSession;
    },
    setActiveSession(value) {
      activeSession = value;
    },
  };
}

type ControllerOverrides = Partial<
  Pick<
    AppControllerOptions,
    | "networkMode"
    | "authServiceFactory"
    | "initialAccountSession"
    | "enterAuthenticatedMode"
  >
>;

function mountController(
  harness: RuntimeHarness,
  overrides: ControllerOverrides = {},
): {
  controller: AppController;
  root: HTMLElement;
} {
  const root = document.createElement("div");
  root.innerHTML = renderAppTemplate(createTranslator("zh-CN"));
  document.body.append(root);
  return {
    root,
    controller: createAppController({
      root,
      runtime: harness.runtime,
      t: createTranslator("zh-CN"),
      locale: "zh-CN",
      networkMode: "offline",
      onNetworkModeChange: vi.fn(),
      ...overrides,
    }),
  };
}

function setAuthInput(
  root: ParentNode,
  route: string,
  name: string,
  value: string,
): void {
  const input = root.querySelector<HTMLInputElement>(
    `[data-app-view="${route}"] input[name="${name}"]`,
  );
  if (!input) throw new Error(`missing_auth_input:${route}:${name}`);
  input.value = value;
}

function submitAuth(root: ParentNode, route: string): void {
  const form = root.querySelector<HTMLFormElement>(
    `[data-app-view="${route}"] [data-auth-form]`,
  );
  if (!form) throw new Error(`missing_auth_form:${route}`);
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function focusAndClick(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`missing_test_element:${selector}`);
  element.focus();
  element.click();
  return element;
}

async function flushTasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function record(
  clientRecordId: string,
  values: {
    endedAt: number;
    score: number;
    boardSum: number;
  },
): StoredGameRecord {
  const engine = createEngineSession({
    modeKey: "standard_4x4_pow2_no_undo",
    seed: 2_048,
  });
  const state = engine.init();
  const snapshot = engine.exportState(values.endedAt);
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    clientRecordId,
    ownerKey: "guest",
    modeKey: "standard_4x4_pow2_no_undo",
    source: "guest",
    endedAt: values.endedAt,
    score: values.score,
    bestTile: Math.max(...state.board.flat()),
    steps: state.steps,
    durationMs: state.durationMs,
    boardSum: values.boardSum,
    replay: engine.exportReplay(),
    finalSnapshot: snapshot,
    uploadStatus: "local",
  };
}

beforeEach(() => {
  document.body.replaceChildren();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    })),
  );
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      callback(performance.now());
      return 1;
    }),
  );
});

afterEach(() => {
  document.body.replaceChildren();
  performance.clearMarks();
  performance.clearMeasures();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("mobile app controller helpers", () => {
  it("renders exactly one polite status live region", () => {
    const root = document.createElement("div");
    root.innerHTML = renderAppTemplate(createTranslator("zh-CN"));

    const liveRegions = root.querySelectorAll('[aria-live="polite"]');
    expect(liveRegions).toHaveLength(1);
    expect(liveRegions[0]).toMatchObject({
      dataset: expect.objectContaining({ appStatus: "" }),
    });
    expect(root.querySelector("[data-app-announcer]")).toBeNull();
  });

  it.each([
    [-1, "00:00"],
    [0, "00:00"],
    [59_999, "00:59"],
    [60_000, "01:00"],
    [3_661_999, "01:01:01"],
  ] as const)("formats %s milliseconds as %s", (durationMs, expected) => {
    expect(formatDuration(durationMs)).toBe(expected);
  });

  it.each([
    [{ savedAtMs: 9_000, startedAtMs: null, durationMs: 0 }, 0],
    [{ savedAtMs: 4_200, startedAtMs: 1_000, durationMs: 100 }, 3_200],
    [{ savedAtMs: 900, startedAtMs: 1_000, durationMs: 800 }, 800],
    [
      {
        savedAtMs: Number.MAX_SAFE_INTEGER,
        startedAtMs: 0,
        durationMs: 1,
      },
      Number.MAX_SAFE_INTEGER,
    ],
  ] as const)("projects stored save duration from %o", (input, expected) => {
    expect(
      resolveStoredSaveDurationMs({
        snapshot: {
          savedAtMs: input.savedAtMs,
          state: {
            startedAtMs: input.startedAtMs,
            durationMs: input.durationMs,
          },
        },
      }),
    ).toBe(expected);
  });

  it("sorts local records by the selected product metric with deterministic ties", () => {
    const records = [
      record("b", { endedAt: 20, score: 100, boardSum: 80 }),
      record("a", { endedAt: 20, score: 100, boardSum: 40 }),
      record("c", { endedAt: 10, score: 200, boardSum: 120 }),
    ];

    expect(
      sortGuestRecords(records, "time").map((item) => item.clientRecordId),
    ).toEqual(["a", "b", "c"]);
    expect(
      sortGuestRecords(records, "score").map((item) => item.clientRecordId),
    ).toEqual(["c", "a", "b"]);
    expect(
      sortGuestRecords(records, "boardSum").map((item) => item.clientRecordId),
    ).toEqual(["c", "b", "a"]);
    expect(records.map((item) => item.clientRecordId)).toEqual(["b", "a", "c"]);
  });
});

describe("mobile app controller navigation", () => {
  it("consumes Back while home entry is pending and ignores the stale route", async () => {
    const harness = runtimeHarness();
    const openedSession = session();
    const entry = deferred<{
      status: "ready";
      restored: false;
      session: GuestGameSession;
    }>();
    harness.enterGuestStandard.mockImplementation(async () => {
      const opened = await entry.promise;
      harness.setActiveSession(opened.session);
      return opened;
    });
    const { controller, root } = mountController(harness);

    focusAndClick(root, '[data-action="enter-standard"]');
    const back = controller.handleBack();
    entry.resolve({ status: "ready", restored: false, session: openedSession });

    expect(await back).toBe(true);
    expect(controller.route).toBe("home");
    expect(
      root.querySelector<HTMLElement>('[data-app-view="game"]')?.hidden,
    ).toBe(true);
    expect(harness.activeSession).toBe(openedSession);
    controller.destroy();
  });

  it("invalidates a pending entry when top navigation changes", async () => {
    const harness = runtimeHarness();
    const openedSession = session();
    const entry = deferred<{
      status: "ready";
      restored: false;
      session: GuestGameSession;
    }>();
    harness.enterGuestStandard.mockImplementation(async () => {
      const opened = await entry.promise;
      harness.setActiveSession(opened.session);
      return opened;
    });
    const { controller, root } = mountController(harness);

    focusAndClick(root, '[data-action="enter-standard"]');
    focusAndClick(root, '[data-app-bottom-nav] [data-nav="modes"]');
    entry.resolve({ status: "ready", restored: false, session: openedSession });
    await vi.waitFor(() => expect(controller.route).toBe("modes"));

    expect(
      root.querySelector<HTMLElement>('[data-app-view="game"]')?.hidden,
    ).toBe(true);
    expect(document.activeElement).toBe(root.querySelector("#modes-title"));
    controller.destroy();
  });

  it("does not let a delayed record open reverse Back navigation", async () => {
    const storedRecord = record("record-race", {
      endedAt: 20,
      score: 100,
      boardSum: 80,
    });
    const harness = runtimeHarness([storedRecord]);
    const read = deferred<StoredGameRecord | null>();
    harness.getGuestRecord.mockImplementation(() => read.promise);
    const { controller, root } = mountController(harness);
    focusAndClick(root, '[data-app-bottom-nav] [data-nav="records"]');
    focusAndClick(root, '[data-record-id="record-race"]');

    const back = controller.handleBack();
    read.resolve(storedRecord);

    expect(await back).toBe(true);
    expect(controller.route).toBe("home");
    expect(
      root.querySelector<HTMLElement>('[data-app-view="detail"]')?.hidden,
    ).toBe(true);
    controller.destroy();
  });

  it("waits out a stale restart and then leaves its replacement session", async () => {
    const harness = runtimeHarness();
    const { controller, root } = mountController(harness);
    focusAndClick(root, '[data-action="enter-standard"]');
    await vi.waitFor(() => expect(controller.route).toBe("game"));

    const restart = deferred<GuestGameSession>();
    const replacement = session();
    harness.restartActiveSession.mockImplementation(async () => {
      const next = await restart.promise;
      harness.setActiveSession(next);
      return next;
    });
    focusAndClick(root, '[data-action="restart-game"]');
    const back = controller.handleBack();
    expect(harness.leaveActiveSession).not.toHaveBeenCalled();

    restart.resolve(replacement);
    expect(await back).toBe(true);
    expect(harness.leaveActiveSession).toHaveBeenCalledTimes(1);
    expect(harness.activeSession).toBeNull();
    expect(controller.route).toBe("home");
    controller.destroy();
  });

  it("never reopens a result after Back wins a terminal finalize race", async () => {
    const harness = runtimeHarness();
    const { controller, root } = mountController(harness);
    focusAndClick(root, '[data-action="enter-standard"]');
    await vi.waitFor(() => expect(controller.route).toBe("game"));

    const terminal = deferred<StoredGameRecord>();
    const leave = deferred<void>();
    const terminalRecord = record("terminal-race", {
      endedAt: 30,
      score: 200,
      boardSum: 120,
    });
    const transitionEngine = createEngineSession({
      modeKey: "standard_4x4_pow2_no_undo",
      seed: 8_192,
    });
    transitionEngine.init();
    const transition = transitionEngine.move({ direction: 1, atMs: 100 });
    harness.moveActiveSession.mockReturnValue({
      transition,
      save: null,
      terminal: terminal.promise,
    });
    harness.leaveActiveSession.mockImplementation(async () => {
      await leave.promise;
      harness.setActiveSession(null);
    });

    root
      .querySelector<HTMLElement>("[data-game-board-root]")
      ?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    const back = controller.handleBack();
    expect(harness.leaveActiveSession).not.toHaveBeenCalled();

    terminal.resolve(terminalRecord);
    await vi.waitFor(() =>
      expect(harness.leaveActiveSession).toHaveBeenCalledTimes(1),
    );
    expect(controller.route).toBe("game");
    leave.resolve();
    expect(await back).toBe(true);
    await flushTasks();

    expect(harness.activeSession).toBeNull();
    expect(controller.route).toBe("home");
    expect(
      root.querySelector<HTMLElement>('[data-app-view="result"]')?.hidden,
    ).toBe(true);
    controller.destroy();
  });

  it("invalidates an in-flight terminal retry before Back leaves", async () => {
    const harness = runtimeHarness();
    const { controller, root } = mountController(harness);
    focusAndClick(root, '[data-action="enter-standard"]');
    await vi.waitFor(() => expect(controller.route).toBe("game"));

    const transitionEngine = createEngineSession({
      modeKey: "standard_4x4_pow2_no_undo",
      seed: 16_384,
    });
    transitionEngine.init();
    const transition = transitionEngine.move({ direction: 1, atMs: 100 });
    harness.moveActiveSession.mockReturnValue({
      transition,
      save: null,
      terminal: Promise.reject(new Error("terminal_first_attempt_failed")),
    });
    const retry = deferred<StoredGameRecord>();
    harness.finalizeActiveTerminal
      .mockRejectedValueOnce(new Error("terminal_retry_required"))
      .mockImplementationOnce(() => retry.promise);
    root
      .querySelector<HTMLElement>("[data-game-board-root]")
      ?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    await vi.waitFor(() =>
      expect(
        root.querySelector<HTMLElement>('[data-action="retry-terminal"]'),
      ).not.toBeNull(),
    );

    focusAndClick(root, '[data-action="retry-terminal"]');
    const back = controller.handleBack();
    retry.resolve(
      record("terminal-retry-race", {
        endedAt: 40,
        score: 300,
        boardSum: 160,
      }),
    );

    expect(await back).toBe(true);
    expect(harness.leaveActiveSession).toHaveBeenCalledTimes(1);
    expect(controller.route).toBe("home");
    expect(
      root.querySelector<HTMLElement>('[data-app-view="result"]')?.hidden,
    ).toBe(true);
    controller.destroy();
  });

  it("opens the classic pending-terminal choice after a move and resumes after undo", async () => {
    const harness = runtimeHarness();
    const active = session(false, "classic_4x4_pow2_undo", {
      ownerKey: "user:42",
      gameKind: "normal",
    });
    let pendingTerminal = false;
    Object.defineProperty(active, "pendingTerminal", {
      configurable: true,
      get: () => pendingTerminal,
    });
    const enterAuthenticatedMode = vi.fn(async () => {
      harness.setActiveSession(active);
      return { status: "entered" as const };
    });
    const transitionEngine = createEngineSession({
      modeKey: "classic_4x4_pow2_undo",
      seed: 32_768,
    });
    transitionEngine.init();
    const terminalTransition = transitionEngine.move({
      direction: 1,
      atMs: 100,
    });
    harness.moveActiveSession.mockImplementation(() => {
      pendingTerminal = true;
      return {
        transition: terminalTransition,
        save: Promise.resolve("written"),
        terminal: null,
      };
    });
    harness.undoActivePendingTerminal.mockImplementation(async () => {
      pendingTerminal = false;
      return terminalTransition;
    });
    const { controller, root } = mountController(harness, {
      networkMode: "online",
      initialAccountSession: accountSession(),
      enterAuthenticatedMode,
    });

    focusAndClick(root, '[data-app-bottom-nav] [data-nav="modes"]');
    focusAndClick(root, '[data-mode="classic_4x4_pow2_undo"]');
    await vi.waitFor(() => expect(controller.route).toBe("game"));
    root
      .querySelector<HTMLElement>("[data-game-board-root]")
      ?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    const dialog = root.querySelector<HTMLDialogElement>(
      "[data-pending-terminal-dialog]",
    );
    await vi.waitFor(() => expect(dialog?.open).toBe(true));

    focusAndClick(root, '[data-action="pending-terminal-undo"]');

    await vi.waitFor(() => expect(dialog?.open).toBe(false));
    expect(harness.undoActivePendingTerminal).toHaveBeenCalledTimes(1);
    expect(controller.route).toBe("game");
    controller.destroy();
  });

  it("restores a classic pending terminal and finalizes exactly once", async () => {
    const harness = runtimeHarness();
    const active = session(false, "classic_4x4_pow2_undo", {
      ownerKey: "user:42",
      gameKind: "normal",
      pendingTerminal: true,
    });
    const finalized = {
      ...record("classic-pending-final", {
        endedAt: 50,
        score: 512,
        boardSum: 256,
      }),
      ownerKey: "user:42" as const,
      modeKey: "classic_4x4_pow2_undo" as const,
      source: "normal" as const,
      uploadStatus: "pending" as const,
    };
    const enterAuthenticatedMode = vi.fn(async () => {
      harness.setActiveSession(active);
      return { status: "entered" as const };
    });
    harness.confirmActivePendingTerminal.mockResolvedValue(finalized);
    const { controller, root } = mountController(harness, {
      networkMode: "online",
      initialAccountSession: accountSession(),
      enterAuthenticatedMode,
    });

    focusAndClick(root, '[data-app-bottom-nav] [data-nav="modes"]');
    focusAndClick(root, '[data-mode="classic_4x4_pow2_undo"]');
    await vi.waitFor(() =>
      expect(
        root.querySelector<HTMLDialogElement>(
          "[data-pending-terminal-dialog]",
        )?.open,
      ).toBe(true),
    );

    focusAndClick(root, '[data-action="pending-terminal-confirm"]');

    await vi.waitFor(() => expect(controller.route).toBe("result"));
    expect(harness.confirmActivePendingTerminal).toHaveBeenCalledTimes(1);
    expect(root.querySelector("#result-title")?.textContent).toBe("经典 4×4");
    controller.destroy();
  });

  it("shows account upload failure and retries the same result in place", async () => {
    const harness = runtimeHarness();
    const active = session(false, "classic_4x4_pow2_undo", {
      ownerKey: "user:42",
      gameKind: "normal",
      pendingTerminal: true,
    });
    let stored: StoredGameRecord = {
      ...record("account-upload-retry", {
        endedAt: 50,
        score: 512,
        boardSum: 256,
      }),
      ownerKey: "user:42" as const,
      modeKey: "classic_4x4_pow2_undo" as const,
      source: "normal" as const,
      uploadStatus: "failed",
    };
    harness.confirmActivePendingTerminal.mockResolvedValue(stored);
    harness.getAccountRecord.mockImplementation(async () => stored);
    harness.retryAccountRecordSubmit.mockImplementation(async () => {
      stored = { ...stored, uploadStatus: "uploaded" };
      return null;
    });
    const { controller, root } = mountController(harness, {
      networkMode: "online",
      initialAccountSession: accountSession(),
      enterAuthenticatedMode: vi.fn(async () => {
        harness.setActiveSession(active);
        return { status: "entered" as const };
      }),
    });

    focusAndClick(root, '[data-app-bottom-nav] [data-nav="modes"]');
    focusAndClick(root, '[data-mode="classic_4x4_pow2_undo"]');
    await vi.waitFor(() =>
      expect(
        root.querySelector<HTMLDialogElement>(
          "[data-pending-terminal-dialog]",
        )?.open,
      ).toBe(true),
    );
    focusAndClick(root, '[data-action="pending-terminal-confirm"]');

    const retry = root.querySelector<HTMLButtonElement>(
      '[data-action="retry-record-upload"]',
    );
    await vi.waitFor(() => expect(retry?.hidden).toBe(false));
    expect(
      root.querySelector("[data-result-upload-status]")?.textContent,
    ).toBe("同步失败");
    retry?.click();

    await vi.waitFor(() =>
      expect(
        root.querySelector("[data-result-upload-status]")?.textContent,
      ).toBe("已同步"),
    );
    expect(harness.retryAccountRecordSubmit).toHaveBeenCalledWith(
      "account-upload-retry",
    );
    expect(retry?.hidden).toBe(true);
    controller.destroy();
  });

  it("cancels logout without mutation, then confirms owner cleanup with visible counts", async () => {
    const harness = runtimeHarness();
    const summary = {
      ownerKey: "user:42" as const,
      unfinishedSaves: 2,
      pendingRecords: 1,
      pendingOperations: 3,
      requiresConfirmation: true,
      flushTimedOut: false,
    };
    harness.prepareAccountLogout.mockResolvedValue(summary);
    harness.confirmAccountLogout.mockResolvedValue({
      status: "cleared",
      summary,
    });
    const { controller, root } = mountController(harness, {
      networkMode: "online",
      initialAccountSession: accountSession(),
    });

    focusAndClick(root, '[data-app-bottom-nav] [data-nav="me"]');
    const logout = root.querySelector<HTMLButtonElement>(
      '[data-action="request-account-logout"]',
    );
    expect(logout?.hidden).toBe(false);
    logout?.click();
    const dialog = root.querySelector<HTMLDialogElement>(
      "[data-account-logout-dialog]",
    );
    await vi.waitFor(() => expect(dialog?.open).toBe(true));
    expect(
      root.querySelector("[data-account-logout-summary]")?.textContent,
    ).toContain("未上传记录 1 条 · 未结束模式 2 个 · 其他同步任务 3 个");

    focusAndClick(root, '[data-action="cancel-account-logout"]');
    expect(dialog?.open).toBe(false);
    expect(harness.confirmAccountLogout).not.toHaveBeenCalled();
    expect(root.querySelector("[data-account-title]")?.textContent).toBe(
      "Next Player",
    );

    logout?.click();
    await vi.waitFor(() => expect(dialog?.open).toBe(true));
    focusAndClick(root, '[data-action="confirm-account-logout"]');
    await vi.waitFor(() =>
      expect(root.querySelector("[data-account-title]")?.textContent).toBe(
        "当前为游客",
      ),
    );
    expect(harness.confirmAccountLogout).toHaveBeenCalledTimes(1);
    expect(logout?.hidden).toBe(true);
    expect(
      root.querySelector<HTMLElement>("[data-app-status]")?.textContent,
    ).toContain("已退出账号，并清除该账号的本机数据。");
    controller.destroy();
  });

  it("leaves a restored pending terminal on Android Back without settling it", async () => {
    const harness = runtimeHarness();
    const active = session(false, "classic_4x4_pow2_undo", {
      ownerKey: "user:42",
      gameKind: "normal",
      pendingTerminal: true,
    });
    const enterAuthenticatedMode = vi.fn(async () => {
      harness.setActiveSession(active);
      return { status: "entered" as const };
    });
    const { controller, root } = mountController(harness, {
      networkMode: "online",
      initialAccountSession: accountSession(),
      enterAuthenticatedMode,
    });
    focusAndClick(root, '[data-app-bottom-nav] [data-nav="modes"]');
    focusAndClick(root, '[data-mode="classic_4x4_pow2_undo"]');
    await vi.waitFor(() =>
      expect(
        root.querySelector<HTMLDialogElement>(
          "[data-pending-terminal-dialog]",
        )?.open,
      ).toBe(true),
    );

    expect(await controller.handleBack()).toBe(true);

    expect(harness.leaveActiveSession).toHaveBeenCalledTimes(1);
    expect(harness.confirmActivePendingTerminal).not.toHaveBeenCalled();
    expect(harness.undoActivePendingTerminal).not.toHaveBeenCalled();
    expect(controller.route).toBe("home");
    controller.destroy();
  });
});

describe("mobile app authentication tasks", () => {
  it("does not construct auth before online privacy and the first submission", async () => {
    const harness = runtimeHarness();
    const service = authService();
    const factory = vi.fn(() => service);
    const { controller, root } = mountController(harness, {
      authServiceFactory: factory,
    });

    focusAndClick(root, '[data-app-bottom-nav] [data-nav="modes"]');
    focusAndClick(root, '[data-mode="classic_4x4_pow2_undo"]');
    expect(factory).not.toHaveBeenCalled();
    focusAndClick(root, '[data-action="show-privacy-notes"]');
    expect(controller.route).toBe("privacy");
    expect(factory).not.toHaveBeenCalled();

    focusAndClick(root, '[data-consent="online"]');
    expect(controller.route).toBe("auth-login");
    expect(factory).not.toHaveBeenCalled();
    setAuthInput(root, "auth-login", "email", "player@example.com");
    setAuthInput(root, "auth-login", "password", "Password123!");
    submitAuth(root, "auth-login");

    await vi.waitFor(() => expect(factory).toHaveBeenCalledTimes(1));
    expect(service.login).toHaveBeenCalledTimes(1);
    controller.destroy();
  });

  it.each(["classic_4x4_pow2_undo", "board_3x3_pow2_no_undo"] as const)(
    "preserves the exact %s target through sign-in",
    async (modeKey) => {
      const harness = runtimeHarness();
      const service = authService();
      const enteredSession = session(false, modeKey, {
        ownerKey: "user:42",
        gameKind: "ranked",
      });
      const enterAuthenticatedMode = vi.fn(async () => {
        harness.setActiveSession(enteredSession);
        return { status: "entered" as const };
      });
      const { controller, root } = mountController(harness, {
        networkMode: "online",
        authServiceFactory: () => service,
        enterAuthenticatedMode,
      });

      focusAndClick(root, '[data-app-bottom-nav] [data-nav="modes"]');
      focusAndClick(root, `[data-mode="${modeKey}"]`);
      expect(controller.route).toBe("auth-login");
      setAuthInput(root, "auth-login", "email", "player@example.com");
      setAuthInput(root, "auth-login", "password", "Password123!");
      submitAuth(root, "auth-login");

      await vi.waitFor(() => expect(controller.route).toBe("game"));
      expect(enterAuthenticatedMode).toHaveBeenCalledWith(
        modeKey,
        accountSession(),
      );
      expect(root.querySelector("[data-game-status]")?.textContent).toBe(
        "排位对局",
      );
      expect(root.querySelector("#game-title")?.textContent).toBe(
        modeKey === "classic_4x4_pow2_undo"
          ? "经典 4×4"
          : modeKey === "board_3x3_pow2_no_undo"
            ? "标准 3×3"
            : "标准 4×4",
      );
      expect(harness.enterGuestStandard).not.toHaveBeenCalled();
      controller.destroy();
    },
  );

  it.each([
    "standard_4x4_pow2_no_undo",
    "classic_4x4_pow2_undo",
    "board_3x3_pow2_no_undo",
  ] as const)(
    "routes signed-in %s through the account runtime",
    async (modeKey) => {
      const harness = runtimeHarness();
      const enteredSession = session(false, modeKey, {
        ownerKey: "user:42",
        gameKind: "ranked",
      });
      const enterAuthenticatedMode = vi.fn(async () => {
        harness.setActiveSession(enteredSession);
        return { status: "entered" as const };
      });
      const { controller, root } = mountController(harness, {
        networkMode: "online",
        initialAccountSession: accountSession(),
        enterAuthenticatedMode,
      });

      if (modeKey === "standard_4x4_pow2_no_undo") {
        focusAndClick(root, '[data-action="enter-standard"]');
      } else {
        focusAndClick(root, '[data-app-bottom-nav] [data-nav="modes"]');
        focusAndClick(root, `[data-mode="${modeKey}"]`);
      }

      await vi.waitFor(() => expect(controller.route).toBe("game"));
      expect(enterAuthenticatedMode).toHaveBeenCalledWith(
        modeKey,
        accountSession(),
      );
      expect(harness.enterGuestStandard).not.toHaveBeenCalled();
      controller.destroy();
    },
  );

  it("fails closed when the account mode runtime is unavailable", async () => {
    const harness = runtimeHarness();
    const enterAuthenticatedMode = vi.fn(async () => ({
      status: "unavailable" as const,
    }));
    const { controller, root } = mountController(harness, {
      networkMode: "online",
      initialAccountSession: accountSession(),
      authServiceFactory: () => authService(),
      enterAuthenticatedMode,
    });

    focusAndClick(root, '[data-app-bottom-nav] [data-nav="modes"]');
    expect(root.querySelector("[data-mode-identity]")?.textContent).toBe(
      "Next Player",
    );
    expect(
      root.querySelector(
        '[data-mode="board_3x3_pow2_no_undo"] [data-mode-state]',
      )?.textContent,
    ).toBe("账号已登录");
    focusAndClick(root, '[data-mode="board_3x3_pow2_no_undo"]');

    await vi.waitFor(() =>
      expect(enterAuthenticatedMode).toHaveBeenCalledWith(
        "board_3x3_pow2_no_undo",
        accountSession(),
      ),
    );
    expect(controller.route).toBe("modes");
    expect(harness.enterGuestStandard).not.toHaveBeenCalled();
    expect(root.querySelector("[data-game-board-root] .game-tile")).toBeNull();
    expect(root.querySelector("[data-app-status]")?.textContent).toContain(
      "未启动任何对局",
    );
    controller.destroy();
  });

  it("uses explicit auth history and clears a cancelled mode target", async () => {
    const harness = runtimeHarness();
    const enterAuthenticatedMode = vi.fn(async () => ({
      status: "unavailable" as const,
    }));
    const service = authService();
    const { controller, root } = mountController(harness, {
      networkMode: "online",
      authServiceFactory: () => service,
      enterAuthenticatedMode,
    });

    focusAndClick(root, '[data-app-bottom-nav] [data-nav="modes"]');
    focusAndClick(root, '[data-mode="classic_4x4_pow2_undo"]');
    expect(await controller.handleBack()).toBe(true);
    expect(controller.route).toBe("modes");
    focusAndClick(root, '[data-mode="classic_4x4_pow2_undo"]');
    focusAndClick(root, '[data-action="auth-open-register"]');
    expect(controller.route).toBe("auth-register");
    expect(await controller.handleBack()).toBe(true);
    expect(controller.route).toBe("auth-login");
    focusAndClick(root, '[data-action="auth-open-reset"]');
    expect(controller.route).toBe("auth-reset");
    expect(await controller.handleBack()).toBe(true);
    expect(controller.route).toBe("auth-login");
    focusAndClick(
      root.querySelector('[data-app-view="auth-login"]')!,
      '[data-action="cancel-auth"]',
    );
    expect(controller.route).toBe("modes");

    focusAndClick(root, '[data-app-bottom-nav] [data-nav="me"]');
    focusAndClick(root, '[data-action="open-auth-gate"]');
    setAuthInput(root, "auth-login", "email", "player@example.com");
    setAuthInput(root, "auth-login", "password", "Password123!");
    submitAuth(root, "auth-login");
    await vi.waitFor(() => expect(controller.route).toBe("me"));
    expect(enterAuthenticatedMode).not.toHaveBeenCalled();
    controller.destroy();
  });

  it("executes the two-stage registration contract", async () => {
    const harness = runtimeHarness();
    const service = authService();
    const { controller, root } = mountController(harness, {
      networkMode: "online",
      authServiceFactory: () => service,
    });

    focusAndClick(root, '[data-app-bottom-nav] [data-nav="me"]');
    focusAndClick(root, '[data-action="open-auth-gate"]');
    focusAndClick(root, '[data-action="auth-open-register"]');
    setAuthInput(root, "auth-register", "email", "Player@Example.com");
    setAuthInput(root, "auth-register", "nickname", "Next Player");
    setAuthInput(root, "auth-register", "password", "Password123!");
    submitAuth(root, "auth-register");

    await vi.waitFor(() =>
      expect(controller.route).toBe("auth-register-verify"),
    );
    expect(service.registerStart).toHaveBeenCalledWith({
      email: "Player@Example.com",
      nickname: "Next Player",
      password: "Password123!",
    });
    expect(root.querySelector("[data-auth-register-email]")?.textContent).toBe(
      "player@example.com",
    );
    expect(
      root.querySelector<HTMLInputElement>(
        '[data-app-view="auth-register"] input[name="password"]',
      )?.value,
    ).toBe("");
    setAuthInput(root, "auth-register-verify", "code", "204826");
    submitAuth(root, "auth-register-verify");

    await vi.waitFor(() => expect(controller.route).toBe("me"));
    expect(service.registerVerify).toHaveBeenCalledWith({
      email: "player@example.com",
      code: "204826",
    });
    expect(root.querySelector("[data-account-title]")?.textContent).toBe(
      "Next Player",
    );
    controller.destroy();
  });

  it("executes the two-stage password reset contract", async () => {
    const harness = runtimeHarness();
    const service = authService();
    const { controller, root } = mountController(harness, {
      networkMode: "online",
      authServiceFactory: () => service,
    });

    focusAndClick(root, '[data-app-bottom-nav] [data-nav="me"]');
    focusAndClick(root, '[data-action="open-auth-gate"]');
    focusAndClick(root, '[data-action="auth-open-reset"]');
    setAuthInput(root, "auth-reset", "email", "Player@Example.com");
    submitAuth(root, "auth-reset");

    await vi.waitFor(() => expect(controller.route).toBe("auth-reset-verify"));
    expect(service.passwordResetStart).toHaveBeenCalledWith({
      email: "Player@Example.com",
    });
    setAuthInput(root, "auth-reset-verify", "code", "204826");
    setAuthInput(root, "auth-reset-verify", "newPassword", "NewPassword123!");
    submitAuth(root, "auth-reset-verify");

    await vi.waitFor(() => expect(controller.route).toBe("auth-login"));
    expect(service.passwordResetVerify).toHaveBeenCalledWith({
      email: "player@example.com",
      code: "204826",
      newPassword: "NewPassword123!",
    });
    expect(
      root.querySelector<HTMLInputElement>(
        '[data-app-view="auth-login"] input[name="email"]',
      )?.value,
    ).toBe("player@example.com");
    expect(
      root.querySelector<HTMLInputElement>(
        '[data-app-view="auth-reset-verify"] input[name="newPassword"]',
      )?.value,
    ).toBe("");
    controller.destroy();
  });

  it("disables repeated login submission and maps a structured error", async () => {
    const harness = runtimeHarness();
    const loginResult = deferred<AccountSessionV1>();
    const login = vi.fn(() => loginResult.promise);
    const service = authService({ login });
    const { controller, root } = mountController(harness, {
      networkMode: "online",
      authServiceFactory: () => service,
    });

    focusAndClick(root, '[data-app-bottom-nav] [data-nav="me"]');
    focusAndClick(root, '[data-action="open-auth-gate"]');
    setAuthInput(root, "auth-login", "email", "player@example.com");
    setAuthInput(root, "auth-login", "password", "Password123!");
    submitAuth(root, "auth-login");
    submitAuth(root, "auth-login");
    await vi.waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(
      root.querySelector<HTMLButtonElement>(
        '[data-app-view="auth-login"] [data-auth-submit]',
      )?.disabled,
    ).toBe(true);
    loginResult.resolve(accountSession());
    await vi.waitFor(() => expect(controller.route).toBe("me"));

    const failingService = authService({
      login: vi.fn(async () => {
        throw new MobileAuthError("http_error", {
          status: 401,
          serverCode: "INVALID_CREDENTIALS",
        });
      }),
    });
    controller.destroy();
    const next = mountController(runtimeHarness(), {
      networkMode: "online",
      authServiceFactory: () => failingService,
    });
    focusAndClick(next.root, '[data-app-bottom-nav] [data-nav="me"]');
    focusAndClick(next.root, '[data-action="open-auth-gate"]');
    setAuthInput(next.root, "auth-login", "email", "player@example.com");
    setAuthInput(next.root, "auth-login", "password", "wrong-password");
    submitAuth(next.root, "auth-login");
    await vi.waitFor(() =>
      expect(
        next.root.querySelector<HTMLElement>(
          '[data-app-view="auth-login"] [data-auth-error]',
        )?.dataset.errorCode,
      ).toBe("INVALID_CREDENTIALS"),
    );
    expect(
      next.root.querySelector('[data-app-view="auth-login"] [data-auth-error]')
        ?.textContent,
    ).toBe("邮箱或密码不正确。");
    next.controller.destroy();
  });

  it("does not render restricted-release wording on auth pages", () => {
    const zh = renderAppTemplate(createTranslator("zh-CN"));
    const en = renderAppTemplate(createTranslator("en"));
    expect(`${zh}\n${en}`).not.toMatch(/beta|内测|邀请|受邀|invite/iu);
  });
});

describe("mobile app controller focus", () => {
  it("focuses the visible route title without scrolling", () => {
    const harness = runtimeHarness();
    const { controller, root } = mountController(harness);
    expect(document.activeElement).toBe(root.querySelector("#home-title"));

    const title = root.querySelector<HTMLElement>("#modes-title");
    if (!title) throw new Error("missing_modes_title");
    const focus = vi.spyOn(title, "focus");
    focusAndClick(root, '[data-app-bottom-nav] [data-nav="modes"]');
    expect(document.activeElement).toBe(title);
    expect(title.tabIndex).toBe(-1);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    controller.destroy();
  });

  it("restores a dialog opener and moves hidden privacy focus to its title", () => {
    const harness = runtimeHarness();
    const { controller, root } = mountController(harness);
    focusAndClick(root, '[data-app-bottom-nav] [data-nav="modes"]');
    const mode = focusAndClick(root, '[data-mode="classic_4x4_pow2_undo"]');
    focusAndClick(root, '[data-action="close-offline-gate"]');
    expect(document.activeElement).toBe(mode);

    mode.focus();
    mode.click();
    focusAndClick(root, '[data-action="show-privacy-notes"]');
    const privacyTitle = root.querySelector<HTMLElement>("#privacy-title");
    expect(controller.route).toBe("privacy");
    expect(document.activeElement).toBe(privacyTitle);
    expect(document.activeElement?.closest("[hidden]")).toBeNull();
    controller.destroy();
  });
});
