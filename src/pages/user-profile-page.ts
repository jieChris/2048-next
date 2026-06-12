import { installUserProfileLegacyRuntime } from "../bootstrap/user-profile-legacy-runtime";

export function bootstrapUserProfilePage(): void {
  if (typeof document === "undefined") {
    return;
  }

  installUserProfileLegacyRuntime();
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "profile-history-replay");
  }
}
