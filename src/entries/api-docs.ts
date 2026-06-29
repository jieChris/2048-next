import { runBetaAccessGate } from "../bootstrap/access-gate";
import { bootstrapApiDocsPage } from "../pages/api-docs-page";

const access = await runBetaAccessGate("api-docs");
if (access.allowed) {
  await bootstrapApiDocsPage();
}
