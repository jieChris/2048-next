import { describe, expect, it, vi } from "vitest";

import { resolvePlayChallengeIntroFromContext } from "../../src/bootstrap/play-challenge-intro-host";

interface FakeElement {
  style: {
    display: string;
    setProperty: ReturnType<typeof vi.fn>;
  };
  textContent: string;
  __modeIntroBound?: boolean;
  listeners: Record<string, ((event: any) => void)[]>;
  addEventListener: ReturnType<typeof vi.fn>;
}

describe("bootstrap play challenge intro host", () => {
  it("returns not-applied when required nodes are missing", () => {
    const result = resolvePlayChallengeIntroFromContext({
      modeConfig: { key: "x" },
      featureEnabled: false,
      documentLike: {
        getElementById: () => null
      },
      resolveIntroModel: vi.fn(),
      resolveIntroUiState: vi.fn() as any,
      resolveIntroActionState: vi.fn() as any
    });

    expect(result.applied).toBe(false);
    expect(result.hasRequiredElements).toBe(false);
  });

  it("applies ui state and binds modal actions", () => {
    const introBtn: FakeElement = {
      style: {
        display: "",
        setProperty: vi.fn(function (name: string, value: string) {
          if (name === "display") introBtn.style.display = value;
        })
      },
      textContent: "",
      listeners: {},
      addEventListener: vi.fn((type: string, listener: (event: any) => void) => {
        introBtn.listeners[type] = introBtn.listeners[type] || [];
        introBtn.listeners[type].push(listener);
      })
    };
    const modal: FakeElement = {
      style: {
        display: "",
        setProperty: vi.fn(function (name: string, value: string) {
          if (name === "display") modal.style.display = value;
        })
      },
      textContent: "",
      listeners: {},
      addEventListener: vi.fn((type: string, listener: (event: any) => void) => {
        modal.listeners[type] = modal.listeners[type] || [];
        modal.listeners[type].push(listener);
      })
    };
    const closeBtn: FakeElement = {
      style: {
        display: "",
        setProperty: vi.fn()
      },
      textContent: "",
      listeners: {},
      addEventListener: vi.fn((type: string, listener: (event: any) => void) => {
        closeBtn.listeners[type] = closeBtn.listeners[type] || [];
        closeBtn.listeners[type].push(listener);
      })
    };
    const title: FakeElement = {
      style: { display: "", setProperty: vi.fn() },
      textContent: "",
      listeners: {},
      addEventListener: vi.fn()
    };
    const desc: FakeElement = {
      style: { display: "", setProperty: vi.fn() },
      textContent: "",
      listeners: {},
      addEventListener: vi.fn()
    };
    const leaderboard: FakeElement = {
      style: { display: "", setProperty: vi.fn() },
      textContent: "",
      listeners: {},
      addEventListener: vi.fn()
    };
    const elements: Record<string, FakeElement> = {
      "top-mode-intro-btn": introBtn,
      "mode-intro-modal": modal,
      "mode-intro-close-btn": closeBtn,
      "mode-intro-title": title,
      "mode-intro-desc": desc,
      "mode-intro-leaderboard": leaderboard
    };

    const resolveIntroActionState = vi.fn((opts: { action: string; eventTargetIsModal?: boolean }) => {
      if (opts.action === "open") {
        return { shouldPreventDefault: true, shouldApplyDisplay: true, nextModalDisplay: "flex" as const };
      }
      if (opts.action === "close") {
        return { shouldPreventDefault: true, shouldApplyDisplay: true, nextModalDisplay: "none" as const };
      }
      return {
        shouldPreventDefault: false,
        shouldApplyDisplay: !!opts.eventTargetIsModal,
        nextModalDisplay: "none" as const
      };
    });

    const result = resolvePlayChallengeIntroFromContext({
      modeConfig: { key: "standard_4x4_pow2_no_undo" },
      featureEnabled: false,
      documentLike: {
        getElementById: (id: string) => elements[id] || null
      },
      resolveIntroModel: () => ({ raw: true }),
      resolveIntroUiState: () => ({
        entryDisplay: "inline-flex",
        modalDisplay: "none",
        titleText: "标题",
        descriptionText: "描述",
        leaderboardText: "榜单",
        bindIntroClick: true,
        bindCloseClick: true,
        bindOverlayClick: true
      }),
      resolveIntroActionState
    });

    expect(result.applied).toBe(true);
    expect(introBtn.style.setProperty).toHaveBeenCalledWith("display", "inline-flex", "important");
    expect(modal.style.display).toBe("none");
    expect(title.textContent).toBe("标题");
    expect(desc.textContent).toBe("描述");
    expect(leaderboard.textContent).toBe("榜单");

    expect(introBtn.__modeIntroBound).toBe(true);
    expect(closeBtn.__modeIntroBound).toBe(true);
    expect(modal.__modeIntroBound).toBe(true);

    const preventDefault = vi.fn();
    introBtn.listeners.click[0]({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(modal.style.display).toBe("flex");

    closeBtn.listeners.click[0]({ preventDefault });
    expect(modal.style.display).toBe("none");

    modal.listeners.click[0]({ target: modal });
    expect(modal.style.display).toBe("none");

    expect(resolveIntroActionState).toHaveBeenCalledWith({ action: "open" });
    expect(resolveIntroActionState).toHaveBeenCalledWith({ action: "close" });
  });

  it("skips event binding when ui says no", () => {
    const introBtn: FakeElement = {
      style: { display: "", setProperty: vi.fn() },
      textContent: "",
      listeners: {},
      addEventListener: vi.fn()
    };
    const modal: FakeElement = {
      style: { display: "", setProperty: vi.fn() },
      textContent: "",
      listeners: {},
      addEventListener: vi.fn()
    };
    const closeBtn: FakeElement = {
      style: { display: "", setProperty: vi.fn() },
      textContent: "",
      listeners: {},
      addEventListener: vi.fn()
    };
    const title: FakeElement = {
      style: { display: "", setProperty: vi.fn() },
      textContent: "",
      listeners: {},
      addEventListener: vi.fn()
    };
    const desc: FakeElement = {
      style: { display: "", setProperty: vi.fn() },
      textContent: "",
      listeners: {},
      addEventListener: vi.fn()
    };

    resolvePlayChallengeIntroFromContext({
      modeConfig: { key: "x" },
      featureEnabled: false,
      documentLike: {
        getElementById: (id: string) => {
          const map: Record<string, FakeElement> = {
            "top-mode-intro-btn": introBtn,
            "mode-intro-modal": modal,
            "mode-intro-close-btn": closeBtn,
            "mode-intro-title": title,
            "mode-intro-desc": desc
          };
          return map[id] || null;
        }
      },
      resolveIntroModel: () => ({}),
      resolveIntroUiState: () => ({
        entryDisplay: "none",
        modalDisplay: "none",
        titleText: "",
        descriptionText: "",
        leaderboardText: "",
        bindIntroClick: false,
        bindCloseClick: false,
        bindOverlayClick: false
      }),
      resolveIntroActionState: () => ({
        shouldPreventDefault: false,
        shouldApplyDisplay: false,
        nextModalDisplay: "none"
      })
    });

    expect(introBtn.addEventListener).not.toHaveBeenCalled();
    expect(closeBtn.addEventListener).not.toHaveBeenCalled();
    expect(modal.addEventListener).not.toHaveBeenCalled();
  });
});
