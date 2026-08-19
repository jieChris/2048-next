import { createBootstrapPipeline, resolvePageDescriptor } from "../bootstrap/page-bootstrap";
import { installGameDialog } from "../bootstrap/game-dialog";
import { bindHomeUserDisplay } from "../bootstrap/home-user-display";
import { runBetaAccessGate, shouldRunBetaAccessGate } from "../bootstrap/access-gate";
import { getPageManifest } from "../entries/runtime-manifest";
import { bindStandaloneInternalNavigation } from "./standalone-navigation";
import { restoreAuthSession } from "../services/auth-session";

export interface DirectPageBootstrapResult {
  pageId: string;
  architecture: "manifest-bootstrap";
}

function bindContextualBackNavigation(): void {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    !window.history ||
    window.history.length <= 1
  ) return;

  let referrerUrl: URL;
  try {
    referrerUrl = new URL(document.referrer);
  } catch (_err) {
    return;
  }
  if (referrerUrl.origin !== window.location.origin || referrerUrl.href === window.location.href) return;

  document.addEventListener(
    "click",
    (event) => {
      const mouseEvent = event as MouseEvent;
      if (
        mouseEvent.defaultPrevented ||
        mouseEvent.button !== 0 ||
        mouseEvent.metaKey ||
        mouseEvent.ctrlKey ||
        mouseEvent.shiftKey ||
        mouseEvent.altKey
      ) return;
      const target = mouseEvent.target as Element | null;
      const backLink = target?.closest<HTMLAnchorElement>("a.page-back-button[href]");
      if (!backLink || backLink.dataset.backNavigation === "fixed") return;
      mouseEvent.preventDefault();
      window.history.back();
    },
    true
  );
}

export async function bootstrapDirectPage(
  pageId: string,
  pageInit?: (() => void | Promise<void>) | null
): Promise<DirectPageBootstrapResult> {
  const manifest = getPageManifest(pageId);
  if (!manifest) {
    throw new Error(`Unknown direct page manifest: ${pageId}`);
  }

  const descriptor = resolvePageDescriptor(pageId);
  const hooks = createBootstrapPipeline(descriptor);
  for (const hook of hooks) {
    await hook.run();
  }
  await restoreAuthSession().catch(() => ({ status: "transient_error" as const, code: "NETWORK_ERROR" }));

  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-page-entry-architecture", "manifest-bootstrap");
    document.documentElement.setAttribute("data-page-manifest-id", manifest.pageId);
    if (document.body) {
      document.body.setAttribute("data-page-entry-architecture", "manifest-bootstrap");
      document.body.setAttribute("data-page-manifest-id", manifest.pageId);
    }
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    installGameDialog(window);
    bindHomeUserDisplay({
      documentLike: document,
      pageId: manifest.pageId,
      windowLike: window,
      storageLike: window.localStorage
    });
  }
  bindContextualBackNavigation();

  if (shouldRunBetaAccessGate(manifest.pageId)) {
    const access = await runBetaAccessGate(manifest.pageId);
    if (!access.allowed) {
      bindStandaloneInternalNavigation();
      return {
        pageId: manifest.pageId,
        architecture: "manifest-bootstrap"
      };
    }
  }

  if (typeof pageInit === "function") {
    await pageInit();
  }
  bindStandaloneInternalNavigation();

  return {
    pageId: manifest.pageId,
    architecture: "manifest-bootstrap"
  };
}
