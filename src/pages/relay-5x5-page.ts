import "../../js/api_shared_utils.js";
import "../../js/relay_5x5_page.js";

export function bootstrapRelay5x5Page(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "relay-5x5");
  }
}
