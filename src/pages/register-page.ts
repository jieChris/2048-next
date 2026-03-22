import "../../js/api_shared_utils.js";
import "../../js/register_page.js";

export function bootstrapRegisterPage(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "register");
  }
}
