import { describe, expect, it } from "vitest";

import {
  EXPECTED_GAME_MANAGER_RUNTIME_SCRIPT_CHAIN,
  hasGamePageMarkers,
  hasOrderedRuntimeScripts,
  shouldEnforceRuntimeScriptChain
} from "../../scripts/game-manager-audit.mjs";

function buildRuntimeScriptChainHtml(fileNames: string[]) {
  return fileNames
    .map((fileName, index) => `<script src="js/${fileName}?v=${index}"></script>`)
    .join("\n");
}

describe("game-manager-audit helpers", () => {
  it("detects game page markers from data-page and class list", () => {
    const dataPageMarker = `<section data-page='game'></section>`;
    const classMarker = `<div class="hero game-container wide"></div>`;

    expect(hasGamePageMarkers(dataPageMarker)).toBe(true);
    expect(hasGamePageMarkers(classMarker)).toBe(true);
    expect(hasGamePageMarkers(`<main data-page="home"></main>`)).toBe(false);
  });

  it("validates runtime script chain order", () => {
    const ordered = buildRuntimeScriptChainHtml(
      EXPECTED_GAME_MANAGER_RUNTIME_SCRIPT_CHAIN
    );
    const swapped = [...EXPECTED_GAME_MANAGER_RUNTIME_SCRIPT_CHAIN];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    const unordered = buildRuntimeScriptChainHtml(swapped);

    expect(hasOrderedRuntimeScripts(ordered)).toBe(true);
    expect(hasOrderedRuntimeScripts(unordered)).toBe(false);
  });

  it("enforces script chain only for non-module game pages", () => {
    const moduleEntry = `<script type="module" src="./src/entries/index.ts"></script>`;
    const gamePageWithoutModule = `<body data-page="game"></body>`;
    const nonGamePage = `<body data-page="home"></body>`;

    expect(shouldEnforceRuntimeScriptChain("index.html", moduleEntry)).toBe(false);
    expect(shouldEnforceRuntimeScriptChain("index.html", gamePageWithoutModule)).toBe(
      true
    );
    expect(shouldEnforceRuntimeScriptChain("index.html", nonGamePage)).toBe(false);
  });
});
