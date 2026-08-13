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
import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";

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
const UI_LANGUAGE_KEY = "ui_language_v1";

function isEnglishUi() {
  try {
    const storageLike = resolveStorageByName({
      windowLike: window,
      storageName: "localStorage"
    });
    return String(safeReadStorageItem({
      storageLike,
      key: UI_LANGUAGE_KEY
    }) || "").trim().toLowerCase().indexOf("en") === 0;
  } catch (_err) {
    return false;
  }
}

function translateModeLabelToEnglish(rawLabel) {
  return String(rawLabel || "")
    .replace(/斐波那契/gu, "Fibonacci")
    .replace(/标准版/gu, "Standard")
    .replace(/经典版/gu, "Classic")
    .replace(/封顶版|封顶/gu, "Capped")
    .replace(/斜向/gu, "Diagonal")
    .replace(/练习板/gu, "Practice Board")
    .replace(/无撤回/gu, "No Undo")
    .replace(/可撤回/gu, "Undo")
    .replace(/自定义4率/gu, "Custom 4-Rate")
    .replace(/概率/gu, "Spawn")
    .replace(/限次撤回/gu, "Limited Undo")
    .replace(/连击加分/gu, "Combo Scoring")
    .replace(/方向锁/gu, "Direction Lock")
    .replace(/障碍块/gu, "Obstacle Blocks")
    .replace(/道具模式/gu, "Item Mode")
    .replace(/石头模式/gu, "Stone Mode")
    .replace(/限时/gu, "Timed")
    .replace(/（/gu, " (")
    .replace(/）/gu, ")")
    .replace(/，/gu, ", ")
    .replace(/次/gu, " Uses")
    .replace(/\s+/g, " ")
    .trim();
}

function displayModeLabel(mode) {
  const label = mode?.label || "";
  return isEnglishUi() ? translateModeLabelToEnglish(label) : label;
}

function applyStaticCopy() {
  if (!isEnglishUi()) return;
  document.documentElement.lang = "en";
  document.title = "Ranked Seed Validator";
  const kicker = document.querySelector(".validator-kicker");
  if (kicker) kicker.textContent = "OFFLINE VALIDATION SURFACE";
  const title = document.querySelector(".validator-title");
  if (title) title.textContent = "Ranked Seed Validator";
  const intro = document.querySelector(".validator-intro");
  if (intro) {
    intro.textContent =
      "For local safety validation only. Manually enter a ranked mode, seed, board, and stepCount to reproduce deterministic spawn results. This page does not connect to production pages and does not read seeds from browser runtime state.";
  }
  const badges = document.querySelectorAll(".validator-badge");
  if (badges[0]) badges[0].textContent = "Manual seed input only";
  if (badges[1]) badges[1].textContent = "Offline / local verification";
  if (badges[2]) badges[2].textContent = "No live extraction";
  const panels = document.querySelectorAll(".validator-panel h2");
  if (panels[0]) panels[0].textContent = "Input";
  if (panels[1]) panels[1].textContent = "Result";
  const labels = document.querySelectorAll(".validator-field label");
  if (labels[0]) labels[0].textContent = "Ranked Mode";
  if (labels[1]) labels[1].textContent = "Seed";
  if (labels[2]) labels[2].textContent = "Validation Type";
  if (labels[3]) labels[3].textContent = "stepCount";
  if (labels[4]) labels[4].textContent = "Current Board JSON";
  const help = document.querySelectorAll(".validator-field small");
  if (help[0]) help[0].textContent = "Use a decimal non-negative integer. The backend currently issues unsigned 32-bit integer seeds.";
  if (help[1]) help[1].textContent = "Enter the deterministic sequence index. The opening tiles use 0 and 1; sequence v2 later uses consumed move/undo actions + 2.";
  if (help[2]) help[2].textContent = "Enter the board matrix before the next tile is spawned.";
  const viewGroup = document.querySelector(".validator-view-switch");
  if (viewGroup) viewGroup.setAttribute("aria-label", "Validation type");
  const viewButtons = document.querySelectorAll("[data-validator-view]");
  if (viewButtons[0]) viewButtons[0].textContent = "Opening Board";
  if (viewButtons[1]) viewButtons[1].textContent = "Next Tile";
  if (viewButtons[2]) viewButtons[2].textContent = "Four Directions";
  const seedInput = document.getElementById("validator-seed");
  if (seedInput) seedInput.setAttribute("placeholder", "Example: 424242");
  const exampleButton = document.getElementById("validator-example");
  if (exampleButton) exampleButton.textContent = "Fill Example";
  const runButton = document.getElementById("validator-run");
  if (runButton) runButton.textContent = "Run Validation";
}

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
  const modeLabel = displayModeLabel(result.mode);
  fragment.appendChild(createMetaRow("Mode", `${modeLabel} (${result.mode.key})`));
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
    option.textContent = `${displayModeLabel(mode)} [${mode.key}]`;
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
          modeLabel: displayModeLabel(mode),
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
          modeLabel: displayModeLabel(mode),
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
        modeLabel: displayModeLabel(mode),
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
  applyStaticCopy();
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
