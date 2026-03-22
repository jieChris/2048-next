import "../../js/core_game_settings_storage_runtime.js";
import "../../js/user_profile_page.js";

export function bootstrapUserProfilePage(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "profile-history-replay");
  }
}
