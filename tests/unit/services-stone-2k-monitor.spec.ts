import { describe, expect, it } from "vitest";

import {
  buildStone2kRunsPath,
  createStone2kMonitorService
} from "../../src/services/stone-2k-monitor";

describe("services: stone-2k-monitor", () => {
  it("builds the runs query path from filter options", () => {
    expect(
      buildStone2kRunsPath({
        names: "alice,bob",
        sortValue: "time_asc",
        startAt: "2026-06-01T00:00:00.000Z",
        endAt: "2026-06-02T00:00:00.000Z",
        limit: 500,
        latestOnly: true
      })
    ).toBe(
      "/stone-2k/runs?limit=200&count=true&names=alice%2Cbob&sort_by=time&sort_order=asc&start_at=2026-06-01T00%3A00%3A00.000Z&end_at=2026-06-02T00%3A00%3A00.000Z&latest_only=true"
    );
  });

  it("fetches runs through the shared JSON API client", async () => {
    const calls: string[] = [];
    const service = createStone2kMonitorService({
      request: async (path) => {
        calls.push(path);
        return { success: true, rows: [{ id: "run-1" }] };
      }
    });

    await expect(service.listRuns({ limit: 10, sortValue: "score_desc" })).resolves.toEqual({
      success: true,
      rows: [{ id: "run-1" }]
    });
    expect(calls).toEqual(["/stone-2k/runs?limit=10&count=true&sort_by=score&sort_order=desc"]);
  });
});
