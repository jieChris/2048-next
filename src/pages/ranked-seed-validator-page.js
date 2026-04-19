import {
  DEFAULT_MODE_KEY,
  applyPredictedSpawn,
  createExpectedRankedInitialBoard,
  listRankedModesFromCatalog,
  normalizeSeed,
  parseBoardText,
  predictAllRankedDirections,
  resolveExpectedRankedSpawn,
  resolveRankedModeFromCatalog
} from "../tools/ranked-seed-validator-core.js";

const EXAMPLE_SEED = "424242";
const EXAMPLE_STEP_COUNT = "7";
const EXAMPLE_BOARD = JSON.stringify(
  [
    [2, 4, 0, 8],
    [16, 0, 32, 64],
    [128, 256, 0, 512],
    [1024, 0, 2048, 4096]
  ],
  null,
  2
);

function getCatalog() {
  if (typeof window === "undefined") {
    throw new Error("window is unavailable");
  }
  const catalog = window.ModeCatalog;
  if (!catalog || typeof catalog.getMode !== "function") {
    throw new Error("mode catalog is unavailable on this page");
  }
  return catalog;
}

function getElements() {
  return {
    modeSelect: document.getElementById("validator-mode"),
    seedInput: document.getElementById("validator-seed"),
    modeButtons: Array.from(document.querySelectorAll("[data-validator-view]")),
    boardSection: document.getElementById("validator-board-section"),
    boardInput: document.getElementById("validator-board"),
    stepCountInput: document.getElementById("validator-step-count"),
    exampleButton: document.getElementById("validator-example"),
    runButton: document.getElementById("validator-run"),
    resultMeta: document.getElementById("validator-result-meta"),
    resultBoards: document.getElementById("validator-result-boards"),
    resultJson: document.getElementById("validator-result-json"),
    status: document.getElementById("validator-status")
  };
}

function createBoardCard(label, board) {
  const wrapper = document.createElement("section");
  wrapper.className = "validator-result-card";

  const title = document.createElement("h3");
  title.className = "validator-result-title";
  title.textContent = label;
  wrapper.appendChild(title);

  const boardElement = document.createElement("div");
  boardElement.className = "validator-board";
  boardElement.style.setProperty("--board-columns", String(board[0]?.length || 4));

  for (const row of board) {
    for (const rawValue of row) {
      const value = Math.floor(Number(rawValue) || 0);
      const cell = document.createElement("div");
      cell.className = "validator-cell";
      if (value <= 0) {
        cell.classList.add("is-empty");
        cell.textContent = "";
      } else {
        cell.textContent = String(value);
        cell.setAttribute("data-tile", String(value));
      }
      boardElement.appendChild(cell);
    }
  }

  wrapper.appendChild(boardElement);
  return wrapper;
}

export function buildDirectionContinuationState(directionResult, currentStepCount) {
  const normalizedStepCount = Math.floor(Number(currentStepCount));
  if (!Number.isInteger(normalizedStepCount) || normalizedStepCount < 0) {
    throw new Error("stepCount must be a non-negative integer.");
  }
  if (!directionResult || typeof directionResult !== "object") {
    throw new Error("direction result is invalid.");
  }
  if (!directionResult.moved) {
    return {
      boardText: JSON.stringify(directionResult.boardAfterMove, null, 2),
      nextStepCount: normalizedStepCount,
      consumedSpawn: false
    };
  }
  return {
    boardText: JSON.stringify(directionResult.boardAfterSpawn, null, 2),
    nextStepCount: normalizedStepCount + 1,
    consumedSpawn: true
  };
}

function createDirectionCard(result, options = {}) {
  const wrapper = document.createElement("section");
  wrapper.className = "validator-result-card";

  const title = document.createElement("h3");
  title.className = "validator-result-title";
  title.textContent = result.directionLabel;
  wrapper.appendChild(title);

  const summary = document.createElement("div");
  summary.className = "validator-direction-summary";
  if (!result.moved) {
    summary.textContent = "Blocked move: board does not change, so no spawn is consumed.";
    wrapper.appendChild(summary);
    wrapper.appendChild(createBoardCard("Board stays the same", result.boardAfterMove));
    return wrapper;
  }
  summary.textContent = `Spawn -> (${result.prediction.x}, ${result.prediction.y}) / value=${result.prediction.value}`;
  wrapper.appendChild(summary);

  const boardGrid = document.createElement("div");
  boardGrid.className = "validator-direction-boards";
  boardGrid.appendChild(createBoardCard("After move", result.boardAfterMove));
  boardGrid.appendChild(createBoardCard("After move + spawn", result.boardAfterSpawn));
  wrapper.appendChild(boardGrid);

  const actionButton = document.createElement("button");
  actionButton.type = "button";
  actionButton.className = "validator-btn validator-btn-secondary validator-card-action";
  actionButton.textContent = "Use as current board";
  actionButton.addEventListener("click", () => {
    if (typeof options.onApply === "function") {
      options.onApply(result);
    }
  });
  wrapper.appendChild(actionButton);
  return wrapper;
}

function createMetaRow(label, value) {
  const row = document.createElement("div");
  row.className = "validator-meta-row";
  const key = document.createElement("span");
  key.className = "validator-meta-label";
  key.textContent = label;
  const text = document.createElement("span");
  text.className = "validator-meta-value";
  text.textContent = String(value);
  row.append(key, text);
  return row;
}

function createMetaContent(result, view) {
  const fragment = document.createDocumentFragment();
  fragment.appendChild(createMetaRow("Mode", `${result.mode.label} (${result.mode.key})`));
  fragment.appendChild(createMetaRow("Ruleset", result.mode.ruleset));
  fragment.appendChild(createMetaRow("Seed", result.seed));
  if (view === "next" || view === "directions") {
    fragment.appendChild(createMetaRow("stepCount", result.stepCount));
  }
  if (view === "next") {
    fragment.appendChild(
      createMetaRow(
        "Prediction",
        `(${result.prediction.x}, ${result.prediction.y}) / value=${result.prediction.value}`
      )
    );
  }
  return fragment;
}

function setStatus(message, kind) {
  const elements = getElements();
  if (!elements.status) return;
  elements.status.textContent = message;
  elements.status.setAttribute("data-status-kind", kind);
}

function getActiveView(elements) {
  const active = elements.modeButtons.find((button) => button.getAttribute("aria-pressed") === "true");
  return active ? active.getAttribute("data-validator-view") : "initial";
}

function syncView(elements) {
  const activeView = getActiveView(elements);
  if (elements.boardSection) {
    elements.boardSection.hidden = activeView === "initial";
  }
}

function applyExample(elements) {
  if (elements.modeSelect) elements.modeSelect.value = DEFAULT_MODE_KEY;
  if (elements.seedInput) elements.seedInput.value = EXAMPLE_SEED;
  if (elements.stepCountInput) elements.stepCountInput.value = EXAMPLE_STEP_COUNT;
  if (elements.boardInput) elements.boardInput.value = EXAMPLE_BOARD;
  setStatus("Example inputs loaded.", "info");
}

function populateModeOptions(elements) {
  const catalog = getCatalog();
  const rankedModes = listRankedModesFromCatalog(catalog);
  if (!elements.modeSelect) return;
  elements.modeSelect.innerHTML = "";
  for (const mode of rankedModes) {
    const option = document.createElement("option");
    option.value = mode.key;
    option.textContent = `${mode.label} [${mode.key}]`;
    elements.modeSelect.appendChild(option);
  }
  elements.modeSelect.value = rankedModes.some((mode) => mode.key === DEFAULT_MODE_KEY)
    ? DEFAULT_MODE_KEY
    : rankedModes[0]?.key || DEFAULT_MODE_KEY;
}

function renderResult(result, view) {
  const elements = getElements();
  if (!elements.resultMeta || !elements.resultBoards || !elements.resultJson) return;
  elements.resultMeta.replaceChildren(createMetaContent(result, view));
  elements.resultBoards.replaceChildren();

  if (view === "initial") {
    elements.resultBoards.appendChild(createBoardCard("Opening board", result.initialBoard.board));
  } else if (view === "directions") {
    for (const directionResult of result.directionResults) {
      elements.resultBoards.appendChild(
        createDirectionCard(directionResult, {
          onApply(appliedDirectionResult) {
            try {
              const currentStepCount = elements.stepCountInput?.value || "0";
              const continuation = buildDirectionContinuationState(
                appliedDirectionResult,
                currentStepCount
              );
              if (elements.boardInput) {
                elements.boardInput.value = continuation.boardText;
              }
              if (elements.stepCountInput) {
                elements.stepCountInput.value = String(continuation.nextStepCount);
              }
              runValidation(elements);
              setStatus(
                continuation.consumedSpawn
                  ? `${appliedDirectionResult.directionLabel} applied. stepCount advanced to ${continuation.nextStepCount}.`
                  : `${appliedDirectionResult.directionLabel} is blocked. Board kept unchanged.`,
                "success"
              );
            } catch (error) {
              setStatus(error instanceof Error ? error.message : String(error), "error");
            }
          }
        })
      );
    }
  } else {
    elements.resultBoards.appendChild(createBoardCard("Current board", result.board));
    elements.resultBoards.appendChild(createBoardCard("After predicted spawn", result.boardAfterSpawn));
  }

  elements.resultJson.textContent = JSON.stringify(result.raw, null, 2);
}

function runValidation(elements) {
  const catalog = getCatalog();
  const mode = resolveRankedModeFromCatalog(catalog, elements.modeSelect?.value || DEFAULT_MODE_KEY);
  const seed = normalizeSeed(elements.seedInput?.value || "");
  const view = getActiveView(elements);

  if (view === "initial") {
    const initialBoard = createExpectedRankedInitialBoard(mode, seed);
    const result = {
      raw: {
        meta: {
          modeKey: mode.key,
          modeLabel: mode.label,
          ruleset: mode.ruleset,
          seed
        },
        initialBoard
      },
      mode,
      seed,
      initialBoard
    };
    renderResult(result, view);
    setStatus("Deterministic opening board generated.", "success");
    return;
  }

  const stepCount = Math.floor(Number(elements.stepCountInput?.value || ""));
  if (!Number.isInteger(stepCount) || stepCount < 0) {
    throw new Error("stepCount must be a non-negative integer.");
  }

  const board = parseBoardText(elements.boardInput?.value || "", mode);
  if (view === "directions") {
    const directionResults = predictAllRankedDirections({
      board,
      mode,
      seed,
      stepCount
    });
    const result = {
      raw: {
        meta: {
          modeKey: mode.key,
          modeLabel: mode.label,
          ruleset: mode.ruleset,
          seed,
          stepCount
        },
        directions: directionResults
      },
      mode,
      seed,
      stepCount,
      directionResults
    };
    renderResult(result, view);
    setStatus("All four ranked direction previews generated.", "success");
    return;
  }

  const prediction = resolveExpectedRankedSpawn({
    board,
    mode,
    seed,
    stepCount
  });
  const boardAfterSpawn = applyPredictedSpawn(board, prediction);
  const result = {
    raw: {
      meta: {
        modeKey: mode.key,
        modeLabel: mode.label,
        ruleset: mode.ruleset,
        seed
      },
      nextSpawn: {
        board,
        prediction,
        boardAfterSpawn
      }
    },
    mode,
    seed,
    stepCount,
    board,
    prediction,
    boardAfterSpawn
  };
  renderResult(result, view);
  setStatus("Next spawn prediction generated.", "success");
}

export function bootstrapRankedSeedValidatorPage() {
  if (typeof document === "undefined") return;
  const elements = getElements();
  populateModeOptions(elements);
  applyExample(elements);
  syncView(elements);

  for (const button of elements.modeButtons) {
    button.addEventListener("click", () => {
      for (const peer of elements.modeButtons) {
        peer.setAttribute("aria-pressed", peer === button ? "true" : "false");
      }
      syncView(elements);
    });
  }

  elements.exampleButton?.addEventListener("click", () => {
    applyExample(elements);
  });

  elements.runButton?.addEventListener("click", () => {
    try {
      runValidation(elements);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "error");
    }
  });

  try {
    runValidation(elements);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
}
