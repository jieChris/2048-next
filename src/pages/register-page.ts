import { installRegisterLegacyRuntime } from "../bootstrap/register-legacy-runtime";

export function bootstrapRegisterPage(): void {
  if (typeof document === "undefined") {
    return;
  }

  installRegisterLegacyRuntime();
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "register");
  }
}
