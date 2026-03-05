import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

function runMigrationWithStorage(initial: Record<string, string>, options?: { throwOnSet?: boolean }) {
  const data = new Map<string, string>(Object.entries(initial));
  const throwOnSet = !!options?.throwOnSet;

  const localStorage = {
    getItem(key: string) {
      return data.has(key) ? String(data.get(key)) : null;
    },
    setItem(key: string, value: string) {
      if (throwOnSet) throw new Error("set blocked");
      data.set(String(key), String(value));
    },
    removeItem(key: string) {
      data.delete(String(key));
    }
  };

  const windowLike = { localStorage } as unknown as Record<string, unknown>;
  const scriptPath = path.resolve(process.cwd(), "js/refactor_cutover_migration.js");
  const script = readFileSync(scriptPath, "utf8");

  vm.runInNewContext(script, { window: windowLike, globalThis: windowLike, console });

  return {
    get(key: string) {
      return data.has(key) ? String(data.get(key)) : null;
    },
    dump() {
      return Object.fromEntries(data.entries());
    }
  };
}

describe("refactor cutover migration", () => {
  it("migrates practice_legacy data and cleanup fields", () => {
    const history = [
      {
        id: "h1",
        mode_key: "practice_legacy",
        score: 10,
        adapter_parity_report_v1: { a: 1 },
        adapter_parity_ab_diff_v2: { b: 1 }
      },
      {
        id: "h2",
        mode_key: "practice",
        score: 20
      }
    ];

    const storage = runMigrationWithStorage({
      "bestScoreByMode:practice_legacy": "200",
      "bestScoreByMode:practice": "150",
      "savedGameStateByMode:v1:practice_legacy": JSON.stringify({ mode_key: "practice_legacy", saved_at: 200 }),
      "savedGameStateByMode:v1:practice": JSON.stringify({ mode_key: "practice", saved_at: 100 }),
      "savedGameStateLiteByMode:v1:practice_legacy": JSON.stringify({ mode_key: "practice_legacy", saved_at: 9 }),
      "local_game_history_v1": JSON.stringify(history),
      "engine_adapter_mode": "legacy",
      "engine_adapter_default_mode": "legacy",
      "engine_adapter_force_legacy": "1",
      "history_filter_state_v1": JSON.stringify({
        filter: {
          modeKey: "practice",
          keyword: "abc",
          sortBy: "ended_desc",
          burnInWindow: 200,
          adapterParityFilter: "all"
        }
      })
    });

    expect(storage.get("bestScoreByMode:practice")).toBe("200");
    expect(storage.get("bestScoreByMode:practice_legacy")).toBeNull();

    const savedState = JSON.parse(storage.get("savedGameStateByMode:v1:practice") || "{}");
    expect(savedState.mode_key).toBe("practice");
    expect(storage.get("savedGameStateByMode:v1:practice_legacy")).toBeNull();
    expect(storage.get("savedGameStateLiteByMode:v1:practice_legacy")).toBeNull();

    const migratedHistory = JSON.parse(storage.get("local_game_history_v1") || "[]");
    expect(migratedHistory[0].mode_key).toBe("practice");
    expect(migratedHistory[0].adapter_parity_report_v1).toBeUndefined();
    expect(migratedHistory[0].adapter_parity_ab_diff_v2).toBeUndefined();

    expect(storage.get("engine_adapter_mode")).toBeNull();
    expect(storage.get("engine_adapter_default_mode")).toBeNull();
    expect(storage.get("engine_adapter_force_legacy")).toBeNull();

    const filterState = JSON.parse(storage.get("history_filter_state_v1") || "{}");
    expect(filterState.schemaVersion).toBe(2);
    expect(filterState.filter).toEqual({ modeKey: "practice", keyword: "abc", sortBy: "ended_desc" });

    expect(storage.get("refactor_cutover_v1_done")).toBe("1");
  });

  it("is idempotent when executed repeatedly", () => {
    const first = runMigrationWithStorage({
      "bestScoreByMode:practice_legacy": "300",
      "local_game_history_v1": JSON.stringify([{ id: "h1", mode_key: "practice_legacy" }])
    });

    const firstDump = first.dump();
    const second = runMigrationWithStorage(firstDump);

    expect(second.dump()).toEqual(firstDump);
  });

  it("does not throw when storage writes fail", () => {
    expect(() =>
      runMigrationWithStorage(
        {
          "bestScoreByMode:practice_legacy": "99",
          "local_game_history_v1": JSON.stringify([{ id: "h1", mode_key: "practice_legacy" }])
        },
        { throwOnSet: true }
      )
    ).not.toThrow();
  });
});
