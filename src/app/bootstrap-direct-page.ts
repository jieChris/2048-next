import { createBootstrapPipeline, resolvePageDescriptor } from "../bootstrap/page-bootstrap";
import { installGameDialog } from "../bootstrap/game-dialog";
import { bindHomeUserDisplay } from "../bootstrap/home-user-display";
import { getPageManifest } from "../entries/runtime-manifest";
import { bindStandaloneInternalNavigation } from "./standalone-navigation";

export interface DirectPageBootstrapResult {
  pageId: string;
  architecture: "manifest-bootstrap";
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

  if (typeof pageInit === "function") {
    await pageInit();
  }
  bindStandaloneInternalNavigation();

  return {
    pageId: manifest.pageId,
    architecture: "manifest-bootstrap"
  };
}
