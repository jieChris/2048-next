import { describe, expect, it } from "vitest";

import {
  extractMatrixContractBlocks,
  findMissingSnippets,
  rowFieldHasNonEmptyArray,
  verifyContractsMatrixContent,
  verifyMatrixDocContent
} from "../../scripts/contracts-matrix-audit.mjs";

const VALID_CONTRACTS_SOURCE = `
export const REPLAY_RECORD_REQUIRED_KEYS = ["version"];
export const HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS = ["v"];
export const SUBMIT_PAYLOAD_REQUIRED_KEYS = ["score"];
export function isReplayRecordLike(v) { return !!v; }
export function isHistoryExportEnvelopeLike(v) { return !!v; }
export function isSubmitPayloadLike(v) { return !!v; }
export const REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX = [
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
  }
];
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
      "SubmitPayload"
    ]);
    expect(rowFieldHasNonEmptyArray(rows[0].body, "producers")).toBe(true);
    expect(rowFieldHasNonEmptyArray(rows[0].body, "missing")).toBe(false);
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
    const validDoc = "ReplayRecord\nHistoryExportEnvelope\nSubmitPayload";
    expect(() => verifyMatrixDocContent(validDoc)).not.toThrow();
    expect(() => verifyMatrixDocContent("ReplayRecord")).toThrow(/matrix doc missing contract name/);
  });
});
