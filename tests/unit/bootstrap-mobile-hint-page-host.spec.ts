import { describe, expect, it } from "vitest";

import { createMobileHintPageResolvers } from "../../src/bootstrap/mobile-hint-page-host";

describe("bootstrap mobile hint page host", () => {
  it("creates resolvers and delegates modal/open/ui orchestration with page context", () => {
    const calls: Array<{ name: string; payload: unknown }> = [];
    const overlay = { style: { display: "flex" } };
    const documentLike = {
      getElementById(id: string) {
        return id === "mobile-hint-overlay" ? overlay : null;
      }
    };
    const ensureMobileHintToggleButton = () => ({ id: "top-mobile-hint-btn" });

    const resolvers = createMobileHintPageResolvers({
      mobileHintModalRuntime: {
        ensureMobileHintModalDom(payload: unknown) {
          calls.push({ name: "ensure", payload });
          return { overlay, body: { id: "mobile-hint-body" } };
        }
      },
      mobileHintOpenHostRuntime: {
        applyMobileHintModalOpen(payload: unknown) {
          calls.push({ name: "open", payload });
          return { didOpen: true };
        }
      },
      mobileHintUiHostRuntime: {
        applyMobileHintUiSync(payload: unknown) {
          calls.push({ name: "sync", payload });
          return { synced: true };
        }
      },
      mobileHintHostRuntime: {
        applyMobileHintToggleInit(payload: unknown) {
          calls.push({ name: "init", payload });
          return { initialized: true };
        }
      },
      mobileHintRuntime: { id: "hint-runtime" },
      mobileHintUiRuntime: { id: "hint-ui-runtime" },
      documentLike,
      ensureMobileHintToggleButton,
      isGamePageScope() {
        return true;
      },
      isCompactGameViewport() {
        return true;
      }
    });

    const ensured = resolvers.ensureMobileHintModalDom();
    const opened = resolvers.openMobileHintModal();
    const synced = resolvers.syncMobileHintUI({ reason: "resize" });
    const initialized = resolvers.initMobileHintToggle();
    resolvers.closeMobileHintModal();

    expect(ensured).toEqual({
      overlay,
      body: { id: "mobile-hint-body" }
    });
    expect(opened).toEqual({ didOpen: true });
    expect(synced).toEqual({ synced: true });
    expect(initialized).toEqual({ initialized: true });
    expect(overlay.style.display).toBe("none");
    expect(calls).toHaveLength(4);
    expect(calls[0]).toEqual({
      name: "ensure",
      payload: { isGamePageScope: true, documentLike }
    });
    expect(calls[1].name).toBe("open");
    expect(calls[1].payload).toEqual(
      expect.objectContaining({
        isGamePageScope: expect.any(Function),
        isCompactGameViewport: expect.any(Function),
        ensureMobileHintModalDom: expect.any(Function),
        mobileHintRuntime: { id: "hint-runtime" },
        documentLike,
        defaultText: "合并数字，合成 2048 方块。"
      })
    );
    expect(calls[2]).toEqual({
      name: "sync",
      payload: {
        options: { reason: "resize" },
        isGamePageScope: expect.any(Function),
        isCompactGameViewport: expect.any(Function),
        ensureMobileHintToggleButton,
        closeMobileHintModal: expect.any(Function),
        mobileHintUiRuntime: { id: "hint-ui-runtime" },
        documentLike,
        collapsedClassName: "mobile-hint-collapsed-content",
        introHiddenClassName: "mobile-hint-hidden",
        introSelector: ".above-game .game-intro",
        containerSelector: ".container"
      }
    });
    expect(calls[3]).toEqual({
      name: "init",
      payload: {
        isGamePageScope: expect.any(Function),
        ensureMobileHintToggleButton,
        openMobileHintModal: expect.any(Function),
        syncMobileHintUI: expect.any(Function)
      }
    });
  });

  it("returns safe fallbacks when runtime apis are missing", () => {
    const resolvers = createMobileHintPageResolvers({
      mobileHintModalRuntime: {},
      mobileHintOpenHostRuntime: {},
      documentLike: {}
    });

    expect(resolvers.ensureMobileHintModalDom()).toBeNull();
    expect(resolvers.openMobileHintModal()).toBeNull();
    expect(() => resolvers.closeMobileHintModal()).not.toThrow();
    expect(resolvers.syncMobileHintUI()).toBeNull();
    expect(resolvers.initMobileHintToggle()).toBeNull();
  });
});
