import { installAccountSettingsLegacyRuntime } from "../bootstrap/account-settings-legacy-runtime";
import { bindDisplayModeSync } from "../bootstrap/display-mode";

export function bootstrapAccountSettingsPage(): void {
  if (typeof document === "undefined") {
    return;
  }

  installAccountSettingsLegacyRuntime();
  bindDisplayModeSync({ documentLike: document, windowLike: window });
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "account-settings");
  }

}
