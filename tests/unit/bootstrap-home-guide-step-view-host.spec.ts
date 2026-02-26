import { describe, expect, it, vi } from "vitest";

import { applyHomeGuideStepView } from "../../src/bootstrap/home-guide-step-view-host";

describe("bootstrap home guide step view host", () => {
  it("renders step view model and schedules panel layout", () => {
    const stepEl = { textContent: "" };
    const titleEl = { textContent: "" };
    const descEl = { textContent: "" };
    const prevBtn = { disabled: false };
    const nextBtn = { textContent: "" };
    const requestAnimationFrame = vi.fn((cb: () => void) => cb());
    const positionHomeGuidePanel = vi.fn();

    const result = applyHomeGuideStepView({
      documentLike: {
        getElementById(id: string) {
          if (id === "home-guide-step") return stepEl;
          if (id === "home-guide-title") return titleEl;
          if (id === "home-guide-desc") return descEl;
          if (id === "home-guide-prev") return prevBtn;
          if (id === "home-guide-next") return nextBtn;
          return null;
        }
      },
      windowLike: { requestAnimationFrame },
      homeGuideRuntime: {
        resolveHomeGuideStepRenderState(payload: { stepIndex: number; stepCount: number }) {
          return {
            stepText: "第 " + (payload.stepIndex + 1) + " / " + payload.stepCount + " 步",
            titleText: "标题",
            descText: "说明",
            prevDisabled: true,
            nextText: "完成"
          };
        }
      },
      step: { selector: "#x", title: "A", desc: "B" },
      stepIndex: 2,
      stepCount: 4,
      positionHomeGuidePanel
    });

    expect(result).toEqual({
      didRender: true,
      didSchedulePanel: true
    });
    expect(stepEl.textContent).toBe("第 3 / 4 步");
    expect(titleEl.textContent).toBe("标题");
    expect(descEl.textContent).toBe("说明");
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.textContent).toBe("完成");
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(positionHomeGuidePanel).toHaveBeenCalledTimes(1);
  });

  it("renders without scheduling when raf or panel callback is missing", () => {
    const nextBtn = { textContent: "" };
    const result = applyHomeGuideStepView({
      documentLike: {
        getElementById(id: string) {
          if (id === "home-guide-next") return nextBtn;
          return null;
        }
      },
      homeGuideRuntime: {
        resolveHomeGuideStepRenderState() {
          return {
            stepText: "",
            titleText: "",
            descText: "",
            prevDisabled: false,
            nextText: "下一步"
          };
        }
      }
    });

    expect(result).toEqual({
      didRender: true,
      didSchedulePanel: false
    });
    expect(nextBtn.textContent).toBe("下一步");
  });

  it("returns noop when step render resolver is missing", () => {
    expect(
      applyHomeGuideStepView({
        documentLike: {},
        homeGuideRuntime: {}
      })
    ).toEqual({
      didRender: false,
      didSchedulePanel: false
    });
  });
});
