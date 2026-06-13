import { describe, expect, it, vi } from "vitest";

import {
  applyHomeGuideStep,
  applyHomeGuideStepOrchestration,
  createHomeGuideStepHostRuntime,
  installHomeGuideStepHostRuntime,
  type HomeGuideStepHostRuntime
} from "../../src/bootstrap/home-guide-step-host";

describe("bootstrap home guide step host", () => {
  it("creates the legacy CoreHomeGuideStepHostRuntime shape from TypeScript functions", () => {
    const runtime = createHomeGuideStepHostRuntime();

    expect(runtime.applyHomeGuideStep).toBe(applyHomeGuideStep);
    expect(runtime.applyHomeGuideStepOrchestration).toBe(applyHomeGuideStepOrchestration);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreHomeGuideStepHostRuntime?: HomeGuideStepHostRuntime } = {};

    const installed = installHomeGuideStepHostRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreHomeGuideStepHostRuntime);
    expect(installed?.applyHomeGuideStep).toBeTypeOf("function");
    expect(installed?.applyHomeGuideStepOrchestration).toBeTypeOf("function");
  });

  it("does not overwrite an existing step host runtime", () => {
    const existing = createHomeGuideStepHostRuntime();
    const windowLike = { CoreHomeGuideStepHostRuntime: existing };

    const installed = installHomeGuideStepHostRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreHomeGuideStepHostRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installHomeGuideStepHostRuntime({ windowLike: null })).toBeNull();
  });

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

  it("orchestrates repeated advance until render", () => {
    const applyHomeGuideStepFlow = vi
      .fn()
      .mockReturnValueOnce({
        shouldAbort: false,
        didFinish: false,
        shouldAdvance: true,
        nextIndex: 2,
        shouldRender: false
      })
      .mockReturnValueOnce({
        shouldAbort: false,
        didFinish: false,
        shouldAdvance: false,
        shouldRender: true,
        stepIndex: 2,
        step: { selector: "#target", title: "x", desc: "y" }
      });
    const applyHomeGuideStepView = vi.fn().mockReturnValue({ didRender: true });

    const result = applyHomeGuideStepOrchestration({
      index: 1,
      maxAdvanceLoops: 8,
      stepFlowHostRuntime: {
        applyHomeGuideStepFlow
      },
      stepViewHostRuntime: {
        applyHomeGuideStepView
      },
      homeGuideState: {
        steps: [{}, {}, {}]
      }
    });

    expect(applyHomeGuideStepFlow).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      didAbort: false,
      didFinish: false,
      didRender: true,
      didHitAdvanceLimit: false,
      finalIndex: 2,
      loopCount: 2
    });
  });

  it("aborts when advance loop reaches safety limit", () => {
    const result = applyHomeGuideStepOrchestration({
      index: 0,
      maxAdvanceLoops: 3,
      stepFlowHostRuntime: {
        applyHomeGuideStepFlow() {
          return {
            shouldAbort: false,
            didFinish: false,
            shouldAdvance: true,
            shouldRender: false
          };
        }
      }
    });

    expect(result).toEqual({
      didAbort: true,
      didFinish: false,
      didRender: false,
      didHitAdvanceLimit: true,
      finalIndex: 3,
      loopCount: 3
    });
  });
});
