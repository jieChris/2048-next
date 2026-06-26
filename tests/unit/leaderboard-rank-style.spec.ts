import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function extractRule(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match ? match[1] : "";
}

describe("timer leaderboard rank style", () => {
  it("shows the static leaderboard shell when preload marks the initial leaderboard view", () => {
    const css = readFileSync("style/main.css", "utf8");
    const hiddenRule = extractRule(css, 'html[data-initial-timer-leaderboard="1"] #timerbox > *');
    const panelRule = extractRule(
      css,
      'html[data-initial-timer-leaderboard="1"] #timerbox > #timer-leaderboard-panel'
    );

    expect(hiddenRule).toContain("display: none !important;");
    expect(hiddenRule).toContain("visibility: hidden !important;");
    expect(panelRule).toContain("display: block !important;");
    expect(panelRule).toContain("visibility: visible !important;");
  });

  it("uses logo-derived rank colors instead of saturated warning colors", () => {
    const css = readFileSync("style/main.css", "utf8");
    const timerboxRule = extractRule(css, "#timerbox");
    const baseRule = extractRule(css, ".timertile.timer-leaderboard-rank-tile");
    const topOneRule = extractRule(css, ".timer-leaderboard-rank-tile.is-top-1");
    const selfRule = extractRule(css, ".timer-leaderboard-row.is-self .timer-leaderboard-rank-tile");
    const nightBaseRule = extractRule(
      css,
      'html[data-night-background="1"] .timer-leaderboard-row:not(.is-self) .timer-leaderboard-rank-tile:not(.is-top-1):not(.is-top-2):not(.is-top-3)'
    );
    const nightSelfRule = extractRule(
      css,
      'html[data-night-background="1"] .timer-leaderboard-row.is-self .timer-leaderboard-rank-tile'
    );

    expect(timerboxRule).toContain("--leaderboard-rank-bg: #b9aea2;");
    expect(timerboxRule).toContain("--leaderboard-rank-text: #fffaf2;");
    expect(timerboxRule).toContain("--leaderboard-rank-top-1-bg: #f3cd6f;");
    expect(timerboxRule).toContain("--leaderboard-rank-top-2-bg: #7099b6;");
    expect(timerboxRule).toContain("--leaderboard-rank-top-3-bg: #729b8b;");
    expect(timerboxRule).toContain("--leaderboard-rank-top-1-text: #fffaf2;");
    expect(timerboxRule).toContain("--leaderboard-rank-self-bg: #b27f58;");
    expect(timerboxRule).toContain("--leaderboard-rank-self-text: #fffaf2;");
    expect(timerboxRule).toContain("--leaderboard-rank-top-shadow: none;");
    expect(timerboxRule).toContain("--leaderboard-rank-self-shadow: none;");
    expect(baseRule).toContain("background: var(--leaderboard-rank-bg)");
    expect(baseRule).toContain("font-weight: var(--leaderboard-rank-font-weight);");
    expect(nightBaseRule).toContain("background: #b9aea2;");
    expect(nightBaseRule).toContain("color: #fffaf2;");
    expect(topOneRule).toContain("var(--leaderboard-rank-top-1-bg)");
    expect(topOneRule).toContain("var(--leaderboard-rank-top-1-text)");
    expect(selfRule).toContain("var(--leaderboard-rank-self-bg)");
    expect(selfRule).toContain("var(--leaderboard-rank-self-text)");
    expect(selfRule).toContain("cursor: pointer;");
    expect(selfRule).toContain("user-select: none;");
    expect(nightSelfRule).toContain("background: #b27f58;");
    expect(nightSelfRule).toContain("color: #fffaf2;");
    expect(css).toContain("background: #f4eadf;");
    expect(css).not.toContain("#d8ab00");
    expect(css).not.toContain("#d61212");
  });

  it("defines an isolated fixed overlay for the hidden breakout easter egg", () => {
    const css = readFileSync("style/main.css", "utf8");
    const openHtmlRule = extractRule(css, "html.breakout-easter-egg-open");
    const openBodyRule = extractRule(css, "body.breakout-easter-egg-open");
    const overlayRule = extractRule(css, ".breakout-easter-egg-overlay");
    const panelRule = extractRule(css, ".breakout-easter-egg-panel");
    const frameRule = extractRule(css, ".breakout-easter-egg-frame");
    const closeRule = extractRule(css, ".breakout-easter-egg-close");

    expect(openHtmlRule || openBodyRule).toContain("overflow: hidden;");
    expect(overlayRule).toContain("position: fixed;");
    expect(overlayRule).toContain("inset: 0;");
    expect(overlayRule).toContain("z-index: 10000;");
    expect(overlayRule).toContain("pointer-events: auto;");
    expect(css).toContain(".breakout-easter-egg-overlay.is-minimized");
    expect(panelRule).toContain("position: fixed;");
    expect(panelRule).toContain("inset: 0;");
    expect(panelRule).toContain("border: 0;");
    expect(panelRule).toContain("background: transparent;");
    expect(panelRule).toContain("box-shadow: none;");
    expect(panelRule).not.toContain("max-width:");
    expect(frameRule).toContain("border: 0;");
    expect(frameRule).toContain("background: transparent;");
    expect(closeRule).toContain("display: none;");
  });

  it("keeps the flying click effect on a continuous no-pause motion path", () => {
    const css = readFileSync("style/main.css", "utf8");
    const rootRule = extractRule(css, ".flying-click-effect-root");
    const layerRule = extractRule(css, ".flying-click-effect-layer");
    const particleRule = extractRule(css, ".flying-click-effect-particle");
    const particleTileRule = extractRule(css, ".flying-click-effect-particle.tile");
    const tileInnerRule = extractRule(css, ".flying-click-effect-particle.tile .tile-inner");
    const logoRule = extractRule(css, ".flying-click-effect-logo");
    const logoImageRule = extractRule(css, ".flying-click-effect-logo-image");

    expect(rootRule).not.toContain("contain:");
    expect(rootRule).not.toContain("isolation:");
    expect(layerRule).not.toContain("contain:");
    expect(layerRule).not.toContain("isolation:");
    expect(layerRule).not.toContain("translateZ");
    expect(layerRule).not.toContain("will-change");
    expect(particleRule).toContain("will-change: transform, opacity;");
    expect(particleRule).toContain("animation: flying-click-effect-tile 0.83s linear forwards;");
    expect(particleRule).not.toContain("contain:");
    expect(particleRule).not.toContain("cubic-bezier");
    expect(particleRule).not.toContain("ease-out");
    expect(particleTileRule).toContain("transition: none !important;");
    expect(tileInnerRule).toContain("box-shadow: none !important;");
    expect(tileInnerRule).toContain("background-image: none !important;");
    expect(logoRule).toContain("width: 34px;");
    expect(logoRule).toContain("height: 34px;");
    expect(logoImageRule).toContain("object-fit: contain;");
    expect(logoImageRule).toContain("-webkit-user-drag: none;");
    expect(css).toContain("12%");
    expect(css).toContain("24%");
    expect(css).toContain("36%");
    expect(css).toContain("48%");
    expect(css).toContain("60%");
    expect(css).toContain("72%");
    expect(css).toContain("84%");
    expect(css).toContain("92%");
  });
});
