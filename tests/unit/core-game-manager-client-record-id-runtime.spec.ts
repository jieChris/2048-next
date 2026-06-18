import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type ClientRecordIdRuntime = {
  buildClientRecordIdRandomSuffix: () => string;
  createManagerClientRecordId: () => string;
};

function loadClientRecordIdRuntime(extraContext?: Record<string, unknown>): ClientRecordIdRuntime {
  const scriptPath = path.resolve(process.cwd(), "js/core_game_manager_client_record_id_runtime.js");
  const script = readFileSync(scriptPath, "utf8");
  const context = {
    console,
    Date: { now: vi.fn(() => 1_700_000_000_000) },
    ...extraContext
  };
  vm.runInNewContext(script, context);
  return context as ClientRecordIdRuntime;
}

describe("core game manager client record id legacy runtime", () => {
  it("delegates random suffix generation to the TypeScript runtime", () => {
    const buildClientRecordIdRandomSuffix = vi.fn(() => "runtime-suffix");
    const runtime = loadClientRecordIdRuntime({
      CoreGameManagerClientRecordIdRuntime: {
        buildClientRecordIdRandomSuffix
      }
    });

    expect(runtime.buildClientRecordIdRandomSuffix()).toBe("runtime-suffix");
    expect(buildClientRecordIdRandomSuffix).toHaveBeenCalledTimes(1);
  });
});
