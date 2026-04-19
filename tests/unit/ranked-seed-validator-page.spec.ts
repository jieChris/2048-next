import { describe, expect, it } from "vitest";

import { buildDirectionContinuationState } from "../../src/pages/ranked-seed-validator-page.js";

describe("ranked seed validator page", () => {
  it("advances stepCount and uses the spawned board for a valid direction result", () => {
    expect(
      buildDirectionContinuationState(
        {
          moved: true,
          boardAfterMove: [
            [4, 4, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
          ],
          boardAfterSpawn: [
            [4, 4, 2, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
          ]
        },
        7
      )
    ).toEqual({
      boardText: JSON.stringify(
        [
          [4, 4, 2, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        null,
        2
      ),
      nextStepCount: 8,
      consumedSpawn: true
    });
  });

  it("keeps stepCount unchanged for a blocked direction", () => {
    expect(
      buildDirectionContinuationState(
        {
          moved: false,
          boardAfterMove: [
            [2, 4, 8, 16],
            [32, 64, 128, 256],
            [512, 1024, 2048, 4096],
            [8192, 16384, 32768, 65536]
          ]
        },
        9
      )
    ).toEqual({
      boardText: JSON.stringify(
        [
          [2, 4, 8, 16],
          [32, 64, 128, 256],
          [512, 1024, 2048, 4096],
          [8192, 16384, 32768, 65536]
        ],
        null,
        2
      ),
      nextStepCount: 9,
      consumedSpawn: false
    });
  });
});
