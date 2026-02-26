import { describe, expect, it } from "vitest";

import { applyHomeGuideDomEnsure } from "../../src/bootstrap/home-guide-dom-host";

function createDocumentHarness() {
  const nodesById: Record<string, Record<string, unknown>> = {};
  const appendedNodes: Array<Record<string, unknown>> = [];

  const body = {
    appendChild(node: unknown) {
      const record = node as Record<string, unknown>;
      appendedNodes.push(record);
      const id = String(record.id || "");
      if (id) {
        nodesById[id] = record;
      }
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
        innerHTML: ""
      } as Record<string, unknown>;
    }
  };

  return {
    documentLike,
    nodesById,
    appendedNodes
  };
}

describe("bootstrap home guide dom host", () => {
  it("creates missing overlay/panel and writes them into state", () => {
    const harness = createDocumentHarness();
    const homeGuideState: Record<string, unknown> = {};

    const result = applyHomeGuideDomEnsure({
      documentLike: harness.documentLike,
      homeGuideRuntime: {
        buildHomeGuidePanelInnerHtml() {
          return "<div>guide panel</div>";
        }
      },
      homeGuideState
    });

    expect(result.createdOverlay).toBe(true);
    expect(result.createdPanel).toBe(true);
    expect(harness.appendedNodes).toHaveLength(2);
    expect((result.overlay as Record<string, unknown>).id).toBe("home-guide-overlay");
    expect((result.panel as Record<string, unknown>).id).toBe("home-guide-panel");
    expect((result.panel as Record<string, unknown>).innerHTML).toBe("<div>guide panel</div>");
    expect(homeGuideState.overlay).toBe(result.overlay);
    expect(homeGuideState.panel).toBe(result.panel);
  });

  it("reuses existing overlay/panel without recreating", () => {
    const harness = createDocumentHarness();
    harness.nodesById["home-guide-overlay"] = {
      id: "home-guide-overlay",
      className: "home-guide-overlay",
      style: { display: "none" }
    };
    harness.nodesById["home-guide-panel"] = {
      id: "home-guide-panel",
      className: "home-guide-panel",
      style: { display: "none" },
      innerHTML: "existing"
    };

    const result = applyHomeGuideDomEnsure({
      documentLike: harness.documentLike,
      homeGuideRuntime: {
        buildHomeGuidePanelInnerHtml() {
          return "<div>new</div>";
        }
      },
      homeGuideState: {}
    });

    expect(result.createdOverlay).toBe(false);
    expect(result.createdPanel).toBe(false);
    expect(harness.appendedNodes).toHaveLength(0);
    expect((result.panel as Record<string, unknown>).innerHTML).toBe("existing");
  });
});
