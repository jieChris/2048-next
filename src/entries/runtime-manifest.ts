/**
 * Runtime manifest: declarative dependency groups for each page type.
 *
 * Instead of manually maintaining script URL arrays in each entry file,
 * pages declare their required capability groups here. The loader reads
 * the manifest and resolves the correct ordered script list.
 *
 * This is the SINGLE SOURCE OF TRUTH for which runtime scripts each
 * page family needs. Adding or removing a runtime only requires editing
 * this file.
 */

// ---------------------------------------------------------------------------
// Capability groups
// ---------------------------------------------------------------------------

export type RuntimeCapability =
  | "announcement"
  | "core"
  | "capped-core"
  | "standard-startup"
  | "capped-startup"
  | "settings-and-panel"
  | "top-button-style"
  | "index-tail"
  | "leaderboard"
  | "test-ui"
  | "pku-inline-stats"
  | "i18n"
  | "play"
  | "replay"
  | "account"
  | "admin"
  | "account-settings"
  | "history"
  | "modes"
  | "relay-5x5"
  | "palette"
  | "stone-2k-monitor"
  | "user-profile"
  | "register"
  | "password";

// ---------------------------------------------------------------------------
// Page manifest
// ---------------------------------------------------------------------------

export interface PageManifestEntry {
  pageId: string;
  htmlFile: string;
  capabilities: readonly RuntimeCapability[];
  devOnly?: boolean;
}

export const PAGE_MANIFESTS: readonly PageManifestEntry[] = [
  {
    pageId: "index",
    htmlFile: "2048.html",
    capabilities: ["announcement", "core", "standard-startup", "settings-and-panel", "top-button-style", "index-tail", "leaderboard", "i18n"]
  },
  {
    pageId: "undo",
    htmlFile: "undo_2048.html",
    capabilities: ["core", "standard-startup", "settings-and-panel", "top-button-style", "index-tail", "leaderboard", "i18n"]
  },
  {
    pageId: "capped",
    htmlFile: "capped_2048.html",
    capabilities: ["capped-core", "capped-startup", "settings-and-panel", "top-button-style", "index-tail", "leaderboard", "i18n"]
  },
  {
    pageId: "practice",
    htmlFile: "Practice_board.html",
    capabilities: ["core", "test-ui", "standard-startup", "settings-and-panel", "index-tail", "pku-inline-stats", "i18n"]
  },
  {
    pageId: "pku2048",
    htmlFile: "PKU2048.html",
    capabilities: ["core", "test-ui", "standard-startup", "settings-and-panel", "index-tail", "pku-inline-stats", "i18n"]
  },
  {
    pageId: "play",
    htmlFile: "play.html",
    capabilities: ["play", "i18n"]
  },
  {
    pageId: "replay",
    htmlFile: "replay.html",
    capabilities: ["replay"]
  },
  {
    pageId: "account",
    htmlFile: "account.html",
    capabilities: ["account"]
  },
  {
    pageId: "achievements",
    htmlFile: "medal-wall.html",
    capabilities: ["account"]
  },
  {
    pageId: "admin",
    htmlFile: "admin.html",
    capabilities: ["admin"]
  },
  {
    pageId: "account-settings",
    htmlFile: "account_settings.html",
    capabilities: ["account"]
  },
  {
    pageId: "history",
    htmlFile: "history.html",
    capabilities: ["history"]
  },
  {
    pageId: "user-profile",
    htmlFile: "user.html",
    capabilities: ["user-profile"]
  },
  {
    pageId: "register",
    htmlFile: "register.html",
    capabilities: ["register"]
  },
  {
    pageId: "password",
    htmlFile: "password.html",
    capabilities: ["password"]
  },
  {
    pageId: "modes",
    htmlFile: "modes.html",
    capabilities: ["modes"]
  },
  {
    pageId: "relay-5x5",
    htmlFile: "relay_5x5.html",
    capabilities: ["relay-5x5"]
  },
  {
    pageId: "palette",
    htmlFile: "palette.html",
    capabilities: ["palette"]
  },
  {
    pageId: "stone-2k-monitor",
    htmlFile: "stone_2k_monitor.html",
    capabilities: ["stone-2k-monitor"]
  },
  {
    pageId: "index_test",
    htmlFile: "index_test.html",
    capabilities: ["core", "standard-startup", "test-ui", "i18n"],
    devOnly: true
  }
] as const;

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export function getPageManifest(pageId: string): PageManifestEntry | undefined {
  return PAGE_MANIFESTS.find((m) => m.pageId === pageId);
}

export function getProductionPages(): PageManifestEntry[] {
  return PAGE_MANIFESTS.filter((m) => !m.devOnly);
}

export function validateManifestCapabilities(
  entry: PageManifestEntry,
  knownCapabilities: ReadonlySet<RuntimeCapability>
): string[] {
  const errors: string[] = [];
  for (const cap of entry.capabilities) {
    if (!knownCapabilities.has(cap)) {
      errors.push(`Page "${entry.pageId}": unknown capability "${cap}"`);
    }
  }
  return errors;
}

export function getAllDeclaredCapabilities(): Set<RuntimeCapability> {
  const all = new Set<RuntimeCapability>();
  for (const entry of PAGE_MANIFESTS) {
    for (const cap of entry.capabilities) {
      all.add(cap);
    }
  }
  return all;
}
