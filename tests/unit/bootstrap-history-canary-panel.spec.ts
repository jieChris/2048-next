import { describe, expect, it } from "vitest";

import {
  resolveHistoryCanaryActionName,
  resolveHistoryCanaryPanelHtml
} from "../../src/bootstrap/history-canary-panel";

describe("bootstrap history canary panel", () => {
  it("builds canary panel html from view model", () => {
    const html = resolveHistoryCanaryPanelHtml({
      gateClass: "history-burnin-gate-pass",
      gateText: "可切换",
      effectiveModeText: "core-adapter",
      modeSourceText: "default",
      forceLegacyText: "否",
      forceSourceText: "none",
      storedDefaultText: "core-adapter",
      storedForceLegacyText: "-"
    });

    expect(html).toContain("Canary 策略控制");
    expect(html).toContain("history-burnin-gate-pass");
    expect(html).toContain("data-action='reset_policy'");
    expect(html).toContain("当前有效模式: core-adapter");
  });

  it("escapes html content from view model", () => {
    const html = resolveHistoryCanaryPanelHtml({
      gateText: "<script>alert(1)</script>"
    });
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("reads action name from target node", () => {
    const target = {
      getAttribute(name: string) {
        return name === "data-action" ? "apply_canary" : null;
      }
    };
    expect(resolveHistoryCanaryActionName(target)).toBe("apply_canary");
    expect(resolveHistoryCanaryActionName(null)).toBe("");
  });
});
