import { describe, expect, it } from "vitest";

import {
  extractFieldStringValues,
  extractMatrixContractBlocks,
  findMissingSnippets,
  rowFieldHasNonEmptyArray,
  verifyMatrixAssertionCoverageDepth,
  verifyContractsMatrixContent,
  verifyMatrixAssertionPathsExist,
  verifyMatrixDocContent
} from "../../scripts/contracts-matrix-audit.mjs";

const VALID_CONTRACTS_SOURCE = `
export const REPLAY_RECORD_REQUIRED_KEYS = ["version"];
export const HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS = ["v"];
export const SUBMIT_PAYLOAD_REQUIRED_KEYS = ["score"];
export const SAVED_GAME_STATE_PAYLOAD_REQUIRED_KEYS = ["v"];
export const SESSION_INIT_PAYLOAD_REQUIRED_KEYS = ["modeKey"];
export function isReplayRecordLike(v) { return !!v; }
export function isHistoryExportEnvelopeLike(v) { return !!v; }
export function isSubmitPayloadLike(v) { return !!v; }
export function isSavedGameStatePayloadLike(v) { return !!v; }
export function isSessionInitPayloadLike(v) { return !!v; }
export const CORE_CONTRACT_COVERAGE_MATRIX = [
  {
    contract: "ReplayRecord",
    requiredKeys: REPLAY_RECORD_REQUIRED_KEYS,
    producers: ["a"],
    consumers: ["b"],
    assertions: ["c"]
  },
  {
    contract: "HistoryExportEnvelope",
    requiredKeys: HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS,
    producers: ["a"],
    consumers: ["b"],
    assertions: ["c"]
  },
  {
    contract: "SubmitPayload",
    requiredKeys: SUBMIT_PAYLOAD_REQUIRED_KEYS,
    producers: ["a"],
    consumers: ["b"],
    assertions: ["c"]
  },
  {
    contract: "SavedGameStatePayload",
    requiredKeys: SAVED_GAME_STATE_PAYLOAD_REQUIRED_KEYS,
    producers: ["a"],
    consumers: ["b"],
    assertions: ["c"]
  },
  {
    contract: "SessionInitPayload",
    requiredKeys: SESSION_INIT_PAYLOAD_REQUIRED_KEYS,
    producers: ["a"],
    consumers: ["b"],
    assertions: ["c"]
  }
];
export const REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX = CORE_CONTRACT_COVERAGE_MATRIX;
`;

describe("contracts-matrix-audit helpers", () => {
  it("finds missing snippets", () => {
    expect(findMissingSnippets("alpha beta", ["alpha", "gamma"])).toEqual(["gamma"]);
  });

  it("extracts matrix rows and supports array field checks", () => {
    const rows = extractMatrixContractBlocks(VALID_CONTRACTS_SOURCE);
    expect(rows.map((row) => row.contract)).toEqual([
      "ReplayRecord",
      "HistoryExportEnvelope",
      "SubmitPayload",
      "SavedGameStatePayload",
      "SessionInitPayload"
    ]);
    expect(rowFieldHasNonEmptyArray(rows[0].body, "producers")).toBe(true);
    expect(rowFieldHasNonEmptyArray(rows[0].body, "missing")).toBe(false);
    expect(extractFieldStringValues(rows[0].body, "assertions")).toEqual(["c"]);
  });

  it("verifies contracts matrix content", () => {
    expect(() => verifyContractsMatrixContent(VALID_CONTRACTS_SOURCE)).not.toThrow();
    expect(() =>
      verifyContractsMatrixContent(
        VALID_CONTRACTS_SOURCE.replace(`contract: "SubmitPayload"`, `contract: "SubmitPayloadX"`)
      )
    ).toThrow(/missing matrix row/);
  });

  it("verifies matrix doc content", () => {
    const validDoc =
      "ReplayRecord\nHistoryExportEnvelope\nSubmitPayload\nSavedGameStatePayload\nSessionInitPayload";
    expect(() => verifyMatrixDocContent(validDoc)).not.toThrow();
    expect(() => verifyMatrixDocContent("ReplayRecord")).toThrow(/matrix doc missing contract name/);
  });

  it("verifies assertion path existence for direct and wildcard paths", async () => {
    const rows = [
      {
        contract: "ReplayRecord",
        body: `
assertions: [
  "tests/unit/contracts.spec.ts::ok",
  "tests/unit/core-replay-*.spec.ts::wildcard"
]`
      }
    ];
    await expect(verifyMatrixAssertionPathsExist(rows, process.cwd())).resolves.toBeUndefined();
    await expect(
      verifyMatrixAssertionPathsExist(
        [
          {
            contract: "ReplayRecord",
            body: `assertions: ["tests/unit/not-exists-*.spec.ts::missing"]`
          }
        ],
        process.cwd()
      )
    ).rejects.toThrow(/no matches/);
  });

  it("verifies matrix assertion depth requires unit and smoke coverage per contract", () => {
    expect(() =>
      verifyMatrixAssertionCoverageDepth([
        {
          contract: "ReplayRecord",
          body: `assertions: ["tests/unit/contracts.spec.ts::ok", "tests/smoke/pages-replay-runtime.smoke.spec.ts::ok"]`
        }
      ])
    ).not.toThrow();

    expect(() =>
      verifyMatrixAssertionCoverageDepth([
        {
          contract: "ReplayRecord",
          body: `assertions: ["tests/unit/contracts.spec.ts::only-unit"]`
        }
      ])
    ).toThrow(/at least one unit \+ one smoke assertion/);
  });
});
