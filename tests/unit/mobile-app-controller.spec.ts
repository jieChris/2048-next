// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAppController,
  formatDuration,
  resolveStoredSaveDurationMs,
  sortGuestRecords,
  type AppController,
} from "../../mobile/src/app/app-controller";
import type { GuestAppRuntime } from "../../mobile/src/app/app-runtime";
import { renderAppTemplate } from "../../mobile/src/app/templates";
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

function session(hasEffectiveMove = false): GuestGameSession {
  const engine = createEngineSession({
    modeKey: "standard_4x4_pow2_no_undo",
    seed: hasEffectiveMove ? 4_096 : 2_048,
  });
  const state = engine.init();
  const fences = new Set<string>();
  return {
    get state() {
      return state;
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
    elapsedMs: () => 0,
    addInputFence: vi.fn((reason: string) => fences.add(reason)),
    removeInputFence: vi.fn((reason: string) => fences.delete(reason)),
    flush: vi.fn(async () => undefined),
  } as unknown as GuestGameSession;
}

interface RuntimeHarness {
  readonly runtime: GuestAppRuntime;
  readonly enterGuestStandard: ReturnType<typeof vi.fn>;
  readonly restartActiveSession: ReturnType<typeof vi.fn>;
  readonly leaveActiveSession: ReturnType<typeof vi.fn>;
  readonly moveActiveSession: ReturnType<typeof vi.fn>;
  readonly finalizeActiveTerminal: ReturnType<typeof vi.fn>;
  readonly getGuestRecord: ReturnType<typeof vi.fn>;
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
  const getGuestRecord = vi.fn(async () => null);
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
    getGuestRecord,
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
    getGuestRecord,
    get activeSession() {
      return activeSession;
    },
    setActiveSession(value) {
      activeSession = value;
    },
  };
}

function mountController(harness: RuntimeHarness): {
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
    }),
  };
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
