import { describe, expect, it, vi } from "vitest";

import {
  createPracticeTransferPageActionResolvers,
  applyPracticeTransferPageAction,
  applyPracticeTransferPageActionFromContext
} from "../../src/bootstrap/practice-transfer-page-host";

describe("bootstrap practice transfer page host", () => {
  it("creates action resolvers with safe fallback", () => {
    const resolvers = createPracticeTransferPageActionResolvers({});
    expect(typeof resolvers.openPracticeBoardFromCurrent).toBe("function");
    expect(resolvers.openPracticeBoardFromCurrent()).toEqual({
      didInvokePageAction: false,
      managerResolved: false,
      modeConfigResolved: false,
      actionResult: {
        didInvokeHost: false,
        localStorageResolved: false,
        sessionStorageResolved: false,
        transferResult: null
      }
    });
  });

  it("delegates action resolver through page host runtime method", () => {
    const applyPracticeTransferPageActionFromContext = vi.fn(() => ({ marker: "delegated" }));
    const resolvers = createPracticeTransferPageActionResolvers({
      practiceTransferPageHostRuntime: {
        applyPracticeTransferPageActionFromContext
      },
      practiceTransferHostRuntime: { id: "host" },
      practiceTransferRuntime: { id: "runtime" },
      storageRuntime: { id: "storage" },
      guideShownKey: "guide-key",
      guideSeenFlag: "guide-seen=1",
      localStorageKey: "local-key",
      sessionStorageKey: "session-key",
      documentLike: { id: "doc" },
      windowLike: { id: "window" },
      alertLike: vi.fn()
    });

    expect(resolvers.openPracticeBoardFromCurrent()).toEqual({ marker: "delegated" });
    expect(applyPracticeTransferPageActionFromContext).toHaveBeenCalledWith({
      practiceTransferHostRuntime: { id: "host" },
      practiceTransferRuntime: { id: "runtime" },
      storageRuntime: { id: "storage" },
      guideShownKey: "guide-key",
      guideSeenFlag: "guide-seen=1",
      localStorageKey: "local-key",
      sessionStorageKey: "session-key",
      documentLike: { id: "doc" },
      windowLike: { id: "window" },
      alertLike: expect.any(Function)
    });
  });

  it("returns early when host runtime contract is missing", () => {
    const result = applyPracticeTransferPageAction({});
    expect(result).toEqual({
      didInvokeHost: false,
      localStorageResolved: false,
      sessionStorageResolved: false,
      transferResult: null
    });
  });

  it("resolves storages and delegates to practice transfer host runtime", () => {
    const resolveStorageByName = vi.fn((opts: { storageName?: string }) => {
      if (opts.storageName === "localStorage") return { id: "local" };
      if (opts.storageName === "sessionStorage") return { id: "session" };
      return null;
    });
    const applyPracticeTransferFromCurrent = vi.fn(() => ({
      opened: true,
      reason: "opened"
    }));

    const result = applyPracticeTransferPageAction({
      practiceTransferHostRuntime: {
        applyPracticeTransferFromCurrent
      },
      practiceTransferRuntime: { id: "runtime" },
      storageRuntime: {
        resolveStorageByName
      },
      manager: { id: "manager" },
      gameModeConfig: { ruleset: "pow2" },
      guideShownKey: "guide_key",
      guideSeenFlag: "guide_seen=1",
      localStorageKey: "local_key",
      sessionStorageKey: "session_key",
      documentLike: { id: "doc" },
      windowLike: { id: "window" },
      alertLike: vi.fn()
    });

    expect(resolveStorageByName).toHaveBeenCalledTimes(2);
    expect(resolveStorageByName).toHaveBeenNthCalledWith(1, {
      windowLike: { id: "window" },
      storageName: "localStorage"
    });
    expect(resolveStorageByName).toHaveBeenNthCalledWith(2, {
      windowLike: { id: "window" },
      storageName: "sessionStorage"
    });
    expect(applyPracticeTransferFromCurrent).toHaveBeenCalledWith(
      expect.objectContaining({
        manager: { id: "manager" },
        gameModeConfig: { ruleset: "pow2" },
        practiceTransferRuntime: { id: "runtime" },
        localStorageLike: { id: "local" },
        sessionStorageLike: { id: "session" },
        guideShownKey: "guide_key",
        guideSeenFlag: "guide_seen=1",
        localStorageKey: "local_key",
        sessionStorageKey: "session_key"
      })
    );
    expect(result).toEqual({
      didInvokeHost: true,
      localStorageResolved: true,
      sessionStorageResolved: true,
      transferResult: {
        opened: true,
        reason: "opened"
      }
    });
  });

  it("delegates with null storages when storage runtime is unavailable", () => {
    const applyPracticeTransferFromCurrent = vi.fn(() => ({
      opened: false,
      reason: "plan-failed"
    }));

    const result = applyPracticeTransferPageAction({
      practiceTransferHostRuntime: {
        applyPracticeTransferFromCurrent
      },
      storageRuntime: {}
    });

    expect(applyPracticeTransferFromCurrent).toHaveBeenCalledWith(
      expect.objectContaining({
        localStorageLike: null,
        sessionStorageLike: null
      })
    );
    expect(result.didInvokeHost).toBe(true);
    expect(result.localStorageResolved).toBe(false);
    expect(result.sessionStorageResolved).toBe(false);
  });

  it("resolves manager and mode config from window context", () => {
    const applyPracticeTransferFromCurrent = vi.fn(() => ({
      opened: true,
      reason: "opened"
    }));

    const result = applyPracticeTransferPageActionFromContext({
      practiceTransferHostRuntime: {
        applyPracticeTransferFromCurrent
      },
      practiceTransferRuntime: { id: "runtime" },
      storageRuntime: {
        resolveStorageByName(opts: { storageName?: string }) {
          return opts.storageName === "localStorage" ? { id: "local" } : { id: "session" };
        }
      },
      guideShownKey: "guide_key",
      guideSeenFlag: "guide_seen=1",
      localStorageKey: "local_key",
      sessionStorageKey: "session_key",
      windowLike: {
        game_manager: { id: "manager" },
        GAME_MODE_CONFIG: { ruleset: "pow2" }
      }
    });

    expect(applyPracticeTransferFromCurrent).toHaveBeenCalledWith(
      expect.objectContaining({
        manager: { id: "manager" },
        gameModeConfig: { ruleset: "pow2" }
      })
    );
    expect(result.didInvokePageAction).toBe(true);
    expect(result.managerResolved).toBe(true);
    expect(result.modeConfigResolved).toBe(true);
    expect(result.actionResult.didInvokeHost).toBe(true);
  });
});
