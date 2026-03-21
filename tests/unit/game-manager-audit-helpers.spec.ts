import { describe, expect, it } from "vitest";

import {
  EXPECTED_GAME_MANAGER_RUNTIME_SCRIPT_CHAIN,
  collectReplayRuntimeWriteBoundaryViolations,
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

  it("collects violations when replay writes bypass runtime wrappers", () => {
    const replayContent = `
function setRuntimeReplayMovesForReplay(manager, replayMoves) {
  manager.replayMoves = replayMoves;
}
function badReplayWrite(manager) {
  manager.replayMoves = [];
  manager.undoEnabled = true;
}
`;
    const violations = collectReplayRuntimeWriteBoundaryViolations(replayContent);
    expect(violations).toHaveLength(2);
    expect(violations.map((item) => item.owner)).toEqual([
      "badReplayWrite",
      "badReplayWrite"
    ]);
  });

  it("allows replay writes inside approved wrapper functions", () => {
    const replayContent = `
function setRuntimeReplayIndexForReplay(manager, value) { manager.replayIndex = value; }
function setRuntimeReplayMovesForReplay(manager, value) { manager.replayMoves = value; }
function setRuntimeReplaySpawnsForReplay(manager, value) { manager.replaySpawns = value; }
function setRuntimeReplayMovesV2ForReplay(manager, value) { manager.replayMovesV2 = value; }
function setRuntimeUndoEnabledForReplay(manager, value) { manager.undoEnabled = value; }
function setRuntimeDisableSessionSyncForReplay(manager, value) { manager.disableSessionSync = value; }
function setRuntimeReplayDelayForReplay(manager, value) { manager.replayDelay = value; }
`;
    expect(collectReplayRuntimeWriteBoundaryViolations(replayContent)).toEqual([]);
  });
});
