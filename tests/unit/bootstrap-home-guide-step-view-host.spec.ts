import { describe, expect, it, vi } from "vitest";

import {
  applyHomeGuideStepView,
  createHomeGuideStepViewHostRuntime,
  installHomeGuideStepViewHostRuntime,
  type HomeGuideStepViewHostRuntime
} from "../../src/bootstrap/home-guide-step-view-host";

describe("bootstrap home guide step view host", () => {
  it("creates the legacy CoreHomeGuideStepViewHostRuntime shape from TypeScript functions", () => {
    const runtime = createHomeGuideStepViewHostRuntime();

    expect(runtime.applyHomeGuideStepView).toBe(applyHomeGuideStepView);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreHomeGuideStepViewHostRuntime?: HomeGuideStepViewHostRuntime } = {};

    const installed = installHomeGuideStepViewHostRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreHomeGuideStepViewHostRuntime);
    expect(installed?.applyHomeGuideStepView).toBeTypeOf("function");
  });

  it("does not overwrite an existing step view host runtime", () => {
    const existing = createHomeGuideStepViewHostRuntime();
    const windowLike = { CoreHomeGuideStepViewHostRuntime: existing };

    const installed = installHomeGuideStepViewHostRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreHomeGuideStepViewHostRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installHomeGuideStepViewHostRuntime({ windowLike: null })).toBeNull();
  });

  it("renders step view model and schedules panel positioning", () => {
    const nodesById: Record<string, Record<string, unknown>> = {
      "home-guide-panel": {
        id: "home-guide-panel",
        style: {},
        querySelector() {
          return null;
        }
      },
      "home-guide-step": { textContent: "" },
      "home-guide-title": { textContent: "" },
      "home-guide-desc": { textContent: "" },
      "home-guide-prev": { disabled: false },
      "home-guide-next": { textContent: "" }
    };
    const appendedNodes: Array<Record<string, unknown>> = [];
    const body = {
      appendChild(node: unknown) {
        const record = node as Record<string, unknown>;
        appendedNodes.push(record);
        const id = String(record.id || "");
        if (id) nodesById[id] = record;
      }
    };
    const documentLike = {
      body,
      getElementById(id: string) {
        return nodesById[id] || null;
      },
      createElement() {
        return {
          id: "",
          className: "",
          style: {},
          textContent: "",
          innerHTML: ""
        } as Record<string, unknown>;
      },
      querySelector() {
        return null;
      }
    };
    const positionHomeGuidePanel = vi.fn();
    const requestAnimationFrame = vi.fn((cb: () => void) => cb());

    const result = applyHomeGuideStepView({
      documentLike,
      windowLike: { requestAnimationFrame },
      homeGuideRuntime: {
        buildHomeGuidePanelInnerHtml() {
          return "<button id='home-guide-next'>Next</button>";
        },
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
      stepCount: 4,
      positionHomeGuidePanel
    });

    expect(result).toEqual({
      didRender: true,
      didSchedulePanel: true
    });
    expect(nodesById["home-guide-step"].textContent).toBe("Step 3 / 4");
    expect(nodesById["home-guide-title"].textContent).toBe("Title");
    expect(nodesById["home-guide-desc"].textContent).toBe("Description");
    expect(nodesById["home-guide-prev"].disabled).toBe(true);
    expect(nodesById["home-guide-next"].textContent).toBe("Done");
    expect(requestAnimationFrame).toHaveBeenCalledWith(positionHomeGuidePanel);
    expect(positionHomeGuidePanel).toHaveBeenCalledTimes(1);
    expect(appendedNodes).toHaveLength(1);
    expect(nodesById["home-guide-message-banner"].textContent).toBe(
      "Step 3 / 4 · Title： Description"
    );
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
