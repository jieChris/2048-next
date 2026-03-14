/**
 * Unified page bootstrap template.
 *
 * Provides a standardized startup flow for all pages. Individual pages
 * configure their behavior through a capability descriptor rather than
 * duplicating initialization logic.
 */

// ---------------------------------------------------------------------------
// Capability descriptor
// ---------------------------------------------------------------------------

export interface PageCapabilityDescriptor {
  pageId: string;
  needsLeaderboard: boolean;
  needsReplay: boolean;
  needsHistory: boolean;
  needsSettings: boolean;
  needsI18n: boolean;
  needsAnnouncement: boolean;
  devOnly: boolean;
}

export function createDefaultDescriptor(pageId: string): PageCapabilityDescriptor {
  return {
    pageId,
    needsLeaderboard: false,
    needsReplay: false,
    needsHistory: false,
    needsSettings: false,
    needsI18n: false,
    needsAnnouncement: false,
    devOnly: false
  };
}

// ---------------------------------------------------------------------------
// Known page descriptors
// ---------------------------------------------------------------------------

const PAGE_DESCRIPTORS: Record<string, Partial<PageCapabilityDescriptor>> = {
  index: { needsLeaderboard: true, needsReplay: true, needsSettings: true, needsI18n: true, needsAnnouncement: true },
  undo: { needsLeaderboard: true, needsReplay: true, needsSettings: true, needsI18n: true },
  capped: { needsLeaderboard: true, needsReplay: true, needsSettings: true, needsI18n: true },
  play: { needsLeaderboard: true, needsReplay: true, needsSettings: true, needsI18n: true },
  practice: { needsSettings: true, needsI18n: true },
  pku2048: { needsSettings: true, needsI18n: true },
  replay: { needsReplay: true },
  history: { needsHistory: true },
  account: { needsLeaderboard: true },
  modes: { needsI18n: true },
  palette: { needsSettings: true },
  index_test: { needsSettings: true, needsI18n: true, devOnly: true }
};

export function resolvePageDescriptor(pageId: string): PageCapabilityDescriptor {
  const base = createDefaultDescriptor(pageId);
  const overrides = PAGE_DESCRIPTORS[pageId];
  if (!overrides) return base;
  return { ...base, ...overrides };
}

// ---------------------------------------------------------------------------
// Bootstrap lifecycle hooks
// ---------------------------------------------------------------------------

export type BootstrapPhase = "pre-init" | "init" | "post-init" | "ready";

export interface BootstrapHook {
  phase: BootstrapPhase;
  run: () => void | Promise<void>;
}

export function createBootstrapPipeline(descriptor: PageCapabilityDescriptor): BootstrapHook[] {
  const hooks: BootstrapHook[] = [];

  hooks.push({
    phase: "pre-init",
    run: () => {
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-page-id", descriptor.pageId);
      }
    }
  });

  if (descriptor.needsI18n) {
    hooks.push({
      phase: "init",
      run: () => {
        // i18n runtime loaded via legacy script chain; this is a placeholder
        // for future native TS i18n module.
      }
    });
  }

  if (descriptor.needsAnnouncement) {
    hooks.push({
      phase: "init",
      run: () => {
        // Announcement loaded via legacy script chain; placeholder for TS migration.
      }
    });
  }

  return hooks;
}
