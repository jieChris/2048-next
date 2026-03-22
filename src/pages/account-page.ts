import "../../js/api_shared_utils.js";
import "../../js/account_page.js";

export function bootstrapAccountPage(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "account");
  }
}
