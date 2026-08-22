import { installAccountLegacyRuntime } from "../bootstrap/account-legacy-runtime";
import { bindDisplayModeSync } from "../bootstrap/display-mode";

export function bootstrapAccountPage(): void {
  if (typeof document === "undefined") {
    return;
  }

  installAccountLegacyRuntime();
  bindDisplayModeSync({ documentLike: document, windowLike: window });
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "account");
  }

}
