import { installRelay5x5LegacyRuntime } from "../bootstrap/relay-5x5-legacy-runtime";
import { bindDisplayModeSync } from "../bootstrap/display-mode";

export function bootstrapRelay5x5Page(): void {
  if (typeof document === "undefined") {
    return;
  }
  installRelay5x5LegacyRuntime();
  bindDisplayModeSync({ documentLike: document, windowLike: window });
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "relay-5x5");
  }
}
