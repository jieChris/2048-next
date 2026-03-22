import { createBootstrapPipeline, resolvePageDescriptor } from "../bootstrap/page-bootstrap";
import { getPageManifest } from "../entries/runtime-manifest";

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

  if (typeof pageInit === "function") {
    await pageInit();
  }

  return {
    pageId: manifest.pageId,
    architecture: "manifest-bootstrap"
  };
}
