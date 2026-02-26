import { describe, expect, it, vi } from "vitest";

import { applyPracticeTransferFromCurrent } from "../../src/bootstrap/practice-transfer-host";

describe("bootstrap practice transfer host", () => {
  it("returns runtime-missing when required runtime functions do not exist", () => {
    const result = applyPracticeTransferFromCurrent({});
    expect(result).toEqual({
      opened: false,
      reason: "runtime-missing",
      openUrl: null
    });
  });

  it("alerts and exits when precheck fails", () => {
    const alertLike = vi.fn();
    const result = applyPracticeTransferFromCurrent({
      practiceTransferRuntime: {
        resolvePracticeTransferPrecheck() {
          return {
            canOpen: false,
            board: null,
            alertMessage: "当前局面尚未就绪，稍后再试。"
          };
        },
        createPracticeTransferNavigationPlan: vi.fn()
      },
      alertLike
    });

    expect(result).toEqual({
      opened: false,
      reason: "precheck-failed",
      openUrl: null
    });
    expect(alertLike).toHaveBeenCalledWith("当前局面尚未就绪，稍后再试。");
  });

  it("alerts and exits when plan generation fails", () => {
    const alertLike = vi.fn();
    const result = applyPracticeTransferFromCurrent({
      practiceTransferRuntime: {
        resolvePracticeTransferPrecheck() {
          return {
            canOpen: true,
            board: [[2]],
            alertMessage: null
          };
        },
        createPracticeTransferNavigationPlan() {
          return {};
        }
      },
      alertLike
    });

    expect(result).toEqual({
      opened: false,
      reason: "plan-failed",
      openUrl: null
    });
    expect(alertLike).toHaveBeenCalledWith("练习板链接生成失败。");
  });

  it("opens practice board with cookie/windowName context", () => {
    const open = vi.fn();
    const createPracticeTransferNavigationPlan = vi.fn(() => ({
      openUrl: "Practice_board.html?practice_token=abc"
    }));

    const result = applyPracticeTransferFromCurrent({
      manager: { id: "manager" },
      gameModeConfig: { ruleset: "pow2" },
      localStorageLike: { getItem: vi.fn() },
      sessionStorageLike: { getItem: vi.fn() },
      guideShownKey: "guide_key",
      guideSeenFlag: "guide_seen=1",
      localStorageKey: "local_key",
      sessionStorageKey: "session_key",
      documentLike: { cookie: "guide_key=1" },
      windowLike: { name: "guide_seen=1", open },
      practiceTransferRuntime: {
        resolvePracticeTransferPrecheck() {
          return {
            canOpen: true,
            board: [[2, 4]],
            alertMessage: null
          };
        },
        createPracticeTransferNavigationPlan
      }
    });

    expect(createPracticeTransferNavigationPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        cookie: "guide_key=1",
        windowName: "guide_seen=1",
        guideShownKey: "guide_key",
        guideSeenFlag: "guide_seen=1"
      })
    );
    expect(open).toHaveBeenCalledWith("Practice_board.html?practice_token=abc", "_blank");
    expect(result).toEqual({
      opened: true,
      reason: "opened",
      openUrl: "Practice_board.html?practice_token=abc"
    });
  });
});
