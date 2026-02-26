import { describe, expect, it, vi } from "vitest";

import { applyHomeGuideStep } from "../../src/bootstrap/home-guide-step-host";

describe("bootstrap home guide step host", () => {
  it("returns abort result when step-flow runtime is missing", () => {
    expect(applyHomeGuideStep({})).toEqual({
      didAbort: true,
      didFinish: false,
      didAdvance: false,
      nextIndex: 0,
      didRender: false
    });
  });

  it("returns advance result when flow asks to advance", () => {
    const result = applyHomeGuideStep({
      index: 2,
      stepFlowHostRuntime: {
        applyHomeGuideStepFlow() {
          return {
            shouldAbort: false,
            didFinish: false,
            shouldAdvance: true,
            nextIndex: 4,
            shouldRender: false
          };
        }
      }
    });

    expect(result).toEqual({
      didAbort: false,
      didFinish: false,
      didAdvance: true,
      nextIndex: 4,
      didRender: false
    });
  });

  it("invokes step-view runtime when flow asks to render", () => {
    const applyHomeGuideStepView = vi.fn().mockReturnValue({ didRender: true });

    const result = applyHomeGuideStep({
      index: 1,
      stepFlowHostRuntime: {
        applyHomeGuideStepFlow() {
          return {
            shouldAbort: false,
            didFinish: false,
            shouldAdvance: false,
            shouldRender: true,
            stepIndex: 1,
            step: { selector: "#x", title: "t", desc: "d" }
          };
        }
      },
      stepViewHostRuntime: {
        applyHomeGuideStepView
      },
      homeGuideState: {
        steps: [{ selector: "#x" }, { selector: "#y" }]
      },
      positionHomeGuidePanel: vi.fn()
    });

    expect(result).toEqual({
      didAbort: false,
      didFinish: false,
      didAdvance: false,
      nextIndex: 1,
      didRender: true
    });
    expect(applyHomeGuideStepView).toHaveBeenCalledWith(
      expect.objectContaining({
        stepIndex: 1,
        stepCount: 2
      })
    );
  });

  it("returns finish result when flow reports completion", () => {
    const result = applyHomeGuideStep({
      stepFlowHostRuntime: {
        applyHomeGuideStepFlow() {
          return {
            shouldAbort: false,
            didFinish: true,
            shouldAdvance: false,
            shouldRender: false
          };
        }
      }
    });

    expect(result).toEqual({
      didAbort: false,
      didFinish: true,
      didAdvance: false,
      nextIndex: 0,
      didRender: false
    });
  });
});
