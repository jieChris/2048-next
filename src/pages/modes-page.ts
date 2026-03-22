import "../../js/theme_manager.js";
import "../../js/core_i18n_runtime.js";

export function bootstrapModesPage(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "modes");
  }
}
