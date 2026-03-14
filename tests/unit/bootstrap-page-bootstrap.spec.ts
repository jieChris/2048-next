import { describe, expect, it } from "vitest";

import {
  createDefaultDescriptor,
  resolvePageDescriptor,
  createBootstrapPipeline
} from "../../src/bootstrap/page-bootstrap";

describe("bootstrap: page-bootstrap", () => {
  it("createDefaultDescriptor returns all-false capabilities", () => {
    const desc = createDefaultDescriptor("test");
    expect(desc.pageId).toBe("test");
    expect(desc.needsLeaderboard).toBe(false);
    expect(desc.needsReplay).toBe(false);
    expect(desc.needsHistory).toBe(false);
    expect(desc.needsSettings).toBe(false);
    expect(desc.needsI18n).toBe(false);
    expect(desc.needsAnnouncement).toBe(false);
    expect(desc.devOnly).toBe(false);
  });

  it("resolvePageDescriptor returns index page with leaderboard", () => {
    const desc = resolvePageDescriptor("index");
    expect(desc.needsLeaderboard).toBe(true);
    expect(desc.needsAnnouncement).toBe(true);
    expect(desc.needsI18n).toBe(true);
  });

  it("resolvePageDescriptor returns unknown page with defaults", () => {
    const desc = resolvePageDescriptor("nonexistent");
    expect(desc.needsLeaderboard).toBe(false);
  });

  it("createBootstrapPipeline creates hooks for index page", () => {
    const desc = resolvePageDescriptor("index");
    const hooks = createBootstrapPipeline(desc);
    expect(hooks.length).toBeGreaterThan(0);
    expect(hooks[0].phase).toBe("pre-init");
  });

  it("createBootstrapPipeline creates minimal hooks for modes page", () => {
    const desc = resolvePageDescriptor("modes");
    const hooks = createBootstrapPipeline(desc);
    const phases = hooks.map((h) => h.phase);
    expect(phases).toContain("pre-init");
    expect(phases).toContain("init"); // i18n
  });
});
