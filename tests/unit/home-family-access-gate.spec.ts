import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/bootstrap/access-gate", () => ({
  runBetaAccessGate: vi.fn(async () => ({ allowed: false })),
  shouldRunBetaAccessGate: vi.fn(() => true)
}));

vi.mock("../../src/entries/legacy-loader", () => ({
  loadLegacyScriptsSequentially: vi.fn(async () => undefined)
}));

import { runBetaAccessGate } from "../../src/bootstrap/access-gate";
import { loadLegacyScriptsSequentially } from "../../src/entries/legacy-loader";
import { bootstrapHomeFamilyPage } from "../../src/entries/home-family-bootstrap";

describe("entries: home-family beta access", () => {
  it("does not load legacy runtimes when the gate blocks a game page", async () => {
    await bootstrapHomeFamilyPage("play");

    expect(runBetaAccessGate).toHaveBeenCalledWith("play");
    expect(loadLegacyScriptsSequentially).not.toHaveBeenCalled();
  });
});
