import { installPasswordLegacyRuntime } from "../bootstrap/password-legacy-runtime";

export function bootstrapPasswordPage(): void {
  if (typeof document === "undefined") {
    return;
  }

  installPasswordLegacyRuntime();
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "password");
  }
}
