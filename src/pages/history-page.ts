import "../../js/theme_manager.js";
import "../../js/mode_catalog.js";
import "../../js/core_game_settings_storage_runtime.js";
import "../../js/local_history_store.js";
import "../../js/refactor_cutover_migration.js";
import "../../js/history_page.js";
import "../../js/core_i18n_runtime.js";

export function bootstrapHistoryPage(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "history");
  }
}
