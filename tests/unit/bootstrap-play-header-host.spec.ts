import { describe, expect, it, vi } from "vitest";

import { resolvePlayHeaderFromContext } from "../../src/bootstrap/play-header-host";

describe("bootstrap play header host", () => {
  it("returns not-applied when document is missing", () => {
    const result = resolvePlayHeaderFromContext({
      modeConfig: { key: "x" },
      documentLike: null,
      resolveHeaderState: () => ({})
    });
    expect(result.applied).toBe(false);
    expect(result.hasBody).toBe(false);
  });

  it("applies header state to body/title/intro and triggers challenge intro callback", () => {
    const setAttribute = vi.fn();
    const title = {
      textContent: "",
      style: { display: "" }
    };
    const intro = {
      textContent: "",
      style: { display: "" }
    };
    const applyChallengeModeIntro = vi.fn();

    const result = resolvePlayHeaderFromContext({
      modeConfig: { key: "standard_4x4_pow2_no_undo" },
      documentLike: {
        body: { setAttribute },
        getElementById: (id: string) => {
          if (id === "play-mode-title") return title;
          if (id === "play-mode-intro") return intro;
          return null;
        }
      },
      resolveHeaderState: () => ({
        bodyModeId: "standard_4x4_pow2_no_undo",
        bodyRuleset: "pow2",
        titleText: "标准模式",
        introText: "标准｜4x4｜2幂",
        titleDisplay: "",
        introDisplay: ""
      }),
      applyChallengeModeIntro
    });

    expect(setAttribute).toHaveBeenCalledWith("data-mode-id", "standard_4x4_pow2_no_undo");
    expect(setAttribute).toHaveBeenCalledWith("data-ruleset", "pow2");
    expect(title.textContent).toBe("标准模式");
    expect(intro.textContent).toBe("标准｜4x4｜2幂");
    expect(title.style.display).toBe("");
    expect(intro.style.display).toBe("");
    expect(applyChallengeModeIntro).toHaveBeenCalledWith({
      key: "standard_4x4_pow2_no_undo"
    });
    expect(result).toEqual({
      applied: true,
      hasBody: true,
      hasTitle: true,
      hasIntro: true,
      challengeIntroApplied: true
    });
  });

  it("continues without challenge callback when omitted", () => {
    const result = resolvePlayHeaderFromContext({
      modeConfig: { key: "x" },
      documentLike: {
        body: null,
        getElementById: () => null
      },
      resolveHeaderState: () => ({})
    });
    expect(result.applied).toBe(true);
    expect(result.challengeIntroApplied).toBe(false);
  });
});
