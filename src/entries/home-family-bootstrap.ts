import { createBootstrapPipeline, resolvePageDescriptor } from "../bootstrap/page-bootstrap";
import { loadLegacyScriptsSequentially } from "./legacy-loader";
import { getPageManifest } from "./runtime-manifest";
import { resolveHomeFamilyScriptsByCapabilities } from "./home-family-shared";

async function runBootstrapPipeline(pageId: string): Promise<void> {
  const descriptor = resolvePageDescriptor(pageId);
  const hooks = createBootstrapPipeline(descriptor);
  for (const hook of hooks) {
    await hook.run();
  }
}

export async function bootstrapHomeFamilyPage(pageId: string): Promise<void> {
  const manifest = getPageManifest(pageId);
  if (!manifest) {
    throw new Error(`Unknown page manifest: ${pageId}`);
  }

  await runBootstrapPipeline(pageId);
  const scripts = resolveHomeFamilyScriptsByCapabilities(manifest.capabilities);
  await loadLegacyScriptsSequentially(scripts);
}
