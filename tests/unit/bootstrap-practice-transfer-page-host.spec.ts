import { describe, expect, it, vi } from "vitest";

import { applyPracticeTransferPageAction } from "../../src/bootstrap/practice-transfer-page-host";

describe("bootstrap practice transfer page host", () => {
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
});
