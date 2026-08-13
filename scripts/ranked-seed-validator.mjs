import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  DEFAULT_MODE_KEY,
  applyPredictedSpawn,
  createExpectedRankedInitialBoard,
  formatBoard,
  normalizeSeed,
  parseBoardText,
  resolveExpectedRankedSpawn,
  resolveRankedModeFromCatalog
} from "../src/tools/ranked-seed-validator-core.js";

export {
  DEFAULT_MODE_KEY,
  RANKED_DIRECTION_OPTIONS,
  applyPredictedSpawn,
  createExpectedRankedInitialBoard,
  createRankedDeterministicHash,
  formatBoard,
  listAvailableCells,
  normalizeModeRecord,
  normalizeSeed,
  normalizeSpawnTable,
  parseBoardText,
  pickSpawnValueByRoll,
  predictAllRankedDirections,
  predictRankedDirectionOutcome,
  resolveExpectedRankedSpawn,
  resolveRankedDeterministicUnitFloat,
  resolveSpawnValueBit,
  simulateMove
} from "../src/tools/ranked-seed-validator-core.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function fail(message) {
  throw new Error(`[ranked-seed-validator] ${message}`);
}

export function loadModeCatalog() {
  const scriptPath = path.resolve(projectRoot, "js", "mode_catalog.js");
  const script = readFileSync(scriptPath, "utf8");
  const context = {
    module: { exports: {} },
    exports: {},
    global: {}
  };
  vm.runInNewContext(script, context);
  const catalog = context.module.exports;
  if (!catalog || typeof catalog.getMode !== "function") {
    fail("failed to load mode catalog");
  }
  return catalog;
}

export function resolveRankedMode(modeKey) {
  return resolveRankedModeFromCatalog(loadModeCatalog(), modeKey);
}

export function parseBoardInput(input, mode) {
  if (typeof input.boardText === "string" && input.boardText.trim()) {
    return parseBoardText(input.boardText, mode);
  }
  if (typeof input.boardFilePath === "string" && input.boardFilePath.trim()) {
    const resolvedPath = path.resolve(process.cwd(), input.boardFilePath);
    const boardText = readFileSync(resolvedPath, "utf8");
    return parseBoardText(boardText, mode);
  }
  fail("next-spawn mode requires --board or --board-file");
}

function printUsage() {
  process.stdout.write(
    [
      "Local ranked seed validator",
      "manual input only; does not connect to live pages and does not extract seeds",
      "",
      "Usage:",
      "  npm run dev:ranked-seed-validator -- --mode <modeKey> --seed <seed> --initial-board",
      "  npm run dev:ranked-seed-validator -- --mode <modeKey> --seed <seed> --board '<json>' --step-count <n>",
      "  npm run dev:ranked-seed-validator -- --mode <modeKey> --seed <seed> --board-file <path> --step-count <n> --json",
      "",
      "Options:",
      `  --mode <key>              ranked mode key, default: ${DEFAULT_MODE_KEY}`,
      "  --seed <int>              ranked seed, entered manually",
      "  --initial-board           print the deterministic 2-tile opening board",
      "  --board <json>            board matrix JSON for next-spawn validation",
      "  --board-file <path>       read board JSON from a file",
      "  --step-count <int>        deterministic spawn sequence index for this spawn",
      "  --successful-moves <int>  legacy alias of --step-count; pass the sequence index",
      "  --json                    output machine-readable JSON",
      "  --help                    show this help",
      "",
      "Notes:",
      "  - This validator is for local security verification only.",
      "  - It is intended for ranked modes that still expose a client-known seed.",
      "  - For the opening board, the two deterministic spawn steps are 0 and 1.",
      "  - In sequence v2, a later spawn uses the number of consumed move/undo actions plus 2."
    ].join("\n") + "\n"
  );
}

export function parseArgs(argv) {
  const parsed = {
    modeKey: DEFAULT_MODE_KEY,
    seed: null,
    boardText: null,
    boardFilePath: null,
    stepCount: null,
    showInitialBoard: false,
    showNextSpawn: false,
    json: false,
    help: false
  };
  const positionals = [];
  let hasExplicitMode = false;
  let hasExplicitSeed = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    let normalizedToken = token;
    let inlineValue = null;
    if (typeof token === "string" && token.startsWith("--")) {
      const equalIndex = token.indexOf("=");
      if (equalIndex !== -1) {
        normalizedToken = token.slice(0, equalIndex);
        inlineValue = token.slice(equalIndex + 1);
      }
    }
    const nextValue = () => {
      if (inlineValue !== null) return inlineValue;
      const value = argv[index + 1];
      if (typeof value !== "string" || !value.trim()) fail(`missing value for ${token}`);
      index += 1;
      return value;
    };

    switch (normalizedToken) {
      case "--mode":
        hasExplicitMode = true;
        parsed.modeKey = nextValue().trim();
        break;
      case "--seed":
        hasExplicitSeed = true;
        parsed.seed = nextValue().trim();
        break;
      case "--board":
        parsed.boardText = nextValue();
        break;
      case "--board-file":
        parsed.boardFilePath = nextValue().trim();
        break;
      case "--step-count":
      case "--successful-moves":
        parsed.stepCount = nextValue().trim();
        break;
      case "--initial-board":
        parsed.showInitialBoard = true;
        break;
      case "--next-spawn":
        parsed.showNextSpawn = true;
        break;
      case "--json":
        parsed.json = true;
        break;
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      default:
        if (typeof token === "string" && !token.startsWith("-")) {
          positionals.push(token);
          break;
        }
        fail(`unknown argument: ${token}`);
    }
  }

  let positionalIndex = 0;
  if (!hasExplicitMode && typeof positionals[positionalIndex] === "string") {
    parsed.modeKey = positionals[positionalIndex].trim();
    positionalIndex += 1;
  }
  if (!hasExplicitSeed && typeof positionals[positionalIndex] === "string") {
    parsed.seed = positionals[positionalIndex].trim();
    positionalIndex += 1;
  }
  if (positionals.length > positionalIndex) {
    fail(`too many positional arguments: ${positionals.slice(positionalIndex).join(" ")}`);
  }

  if (!parsed.showInitialBoard && !parsed.showNextSpawn) {
    parsed.showInitialBoard = !parsed.boardText && !parsed.boardFilePath;
    parsed.showNextSpawn = !!(parsed.boardText || parsed.boardFilePath);
  }

  return parsed;
}

export function buildValidationResult(argv) {
  const args = parseArgs(argv);
  if (args.help) return { help: true };
  const seed = normalizeSeed(args.seed);
  const mode = resolveRankedMode(args.modeKey);
  const result = {
    meta: {
      tool: "ranked-seed-validator",
      manualOnly: true,
      modeKey: mode.key,
      modeLabel: mode.label,
      ruleset: mode.ruleset,
      seed
    }
  };

  if (args.showInitialBoard) {
    result.initialBoard = createExpectedRankedInitialBoard(mode, seed);
  }

  if (args.showNextSpawn) {
    const stepCount = Math.floor(Number(args.stepCount));
    if (!Number.isInteger(stepCount) || stepCount < 0) {
      fail("next-spawn validation requires --step-count <non-negative integer>");
    }
    const board = parseBoardInput(args, mode);
    const nextSpawn = resolveExpectedRankedSpawn({ board, mode, seed, stepCount });
    result.nextSpawn = {
      board,
      prediction: nextSpawn,
      boardAfterSpawn: applyPredictedSpawn(board, nextSpawn)
    };
  }

  return result;
}

function printHumanResult(result) {
  process.stdout.write(
    [
      "Local ranked seed validator",
      "manual input only; does not connect to live pages and does not extract seeds",
      "",
      `mode: ${result.meta.modeKey}`,
      `label: ${result.meta.modeLabel || result.meta.modeKey}`,
      `ruleset: ${result.meta.ruleset}`,
      `seed: ${result.meta.seed}`
    ].join("\n") + "\n"
  );

  if (result.initialBoard) {
    process.stdout.write(
      [
        "",
        "initial board:",
        formatBoard(result.initialBoard.board),
        "",
        "opening spawns:",
        ...result.initialBoard.spawns.map(
          (spawn) =>
            `  step=${spawn.stepCount} cell=(${spawn.x},${spawn.y}) index=${spawn.spawnIndex} value=${spawn.value} bit=${spawn.spawnValueBit}`
        )
      ].join("\n") + "\n"
    );
  }

  if (result.nextSpawn) {
    const prediction = result.nextSpawn.prediction;
    process.stdout.write(
      [
        "",
        "next spawn prediction:",
        `  step=${prediction.stepCount}`,
        `  cell=(${prediction.x},${prediction.y}) index=${prediction.spawnIndex}`,
        `  value=${prediction.value} bit=${prediction.spawnValueBit}`,
        `  valueRoll=${prediction.valueRoll}`,
        `  cellRoll=${prediction.cellRoll}`,
        "",
        "board after spawn:",
        formatBoard(result.nextSpawn.boardAfterSpawn)
      ].join("\n") + "\n"
    );
  }
}

export function runCli(argv = process.argv.slice(2)) {
  try {
    const result = buildValidationResult(argv);
    if (result.help) {
      printUsage();
      return 0;
    }
    if (parseArgs(argv).json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }
    printHumanResult(result);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return 1;
  }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  process.exitCode = runCli();
}
