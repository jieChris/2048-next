import "../../js/theme_manager.js";
import "../../js/mode_catalog.js";
import "../../js/core_game_settings_storage_runtime.js";
import "../../js/local_history_store.js";
import { runRefactorCutoverMigration } from "../bootstrap/refactor-cutover-migration";
import { bootstrapHistoryPageRuntime } from "./history-page-runtime";

export function bootstrapHistoryPage(): void {
  if (typeof document === "undefined") {
    return;
  }

  runRefactorCutoverMigration(window);
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "history");
  }
  bootstrapHistoryPageRuntime({ windowLike: window, documentLike: document });
}
