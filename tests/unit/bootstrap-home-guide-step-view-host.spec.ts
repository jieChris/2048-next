import { describe, expect, it, vi } from "vitest";

import { applyHomeGuideStepView } from "../../src/bootstrap/home-guide-step-view-host";

describe("bootstrap home guide step view host", () => {
  it("renders step view model and schedules a banner reposition pass", () => {
    const stepEl = { textContent: "" };
    const titleEl = { textContent: "" };
    const descEl = { textContent: "" };
    const prevBtn = { disabled: false };
    const nextBtn = { textContent: "" };
    const requestAnimationFrame = vi.fn((cb: () => void) => cb());

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
            stepText: "Step " + (payload.stepIndex + 1) + " / " + payload.stepCount,
            titleText: "Title",
            descText: "Description",
            prevDisabled: true,
            nextText: "Done"
          };
        }
      },
      step: { selector: "#x", title: "A", desc: "B" },
      stepIndex: 2,
      stepCount: 4
    });

    expect(result).toEqual({
      didRender: true,
      didSchedulePanel: true
    });
    expect(stepEl.textContent).toBe("Step 3 / 4");
    expect(titleEl.textContent).toBe("Title");
    expect(descEl.textContent).toBe("Description");
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.textContent).toBe("Done");
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it("renders without scheduling when requestAnimationFrame is missing", () => {
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
            nextText: "Next"
          };
        }
      }
    });

    expect(result).toEqual({
      didRender: true,
      didSchedulePanel: false
    });
    expect(nextBtn.textContent).toBe("Next");
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
