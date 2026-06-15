import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { resolve } from "path";

const HOME_STANDARD_STARTUP_BUNDLE = "home_standard_startup_bundle.js";
const HOME_STANDARD_DEFERRED_BUNDLE = "home_standard_deferred_bundle.js";
const HOME_STANDARD_STARTUP_FILES = [
  "seedrandom.js",
  "animframe_polyfill.js",
  "core_bootstrap_runtime.js",
  "keyboard_input_manager.js",
  "theme_manager.js",
  "mode_catalog.js",
  "html_actuator.js",
  "grid.js",
  "tile.js",
  "local_score_manager.js",
  "local_history_store.js",
  "core_undo_tile_restore_runtime.js",
  "core_undo_restore_payload_runtime.js",
  "core_undo_stack_entry_runtime.js",
  "core_replay_codec_runtime.js",
  "core_replay_v4_actions_runtime.js",
  "core_replay_import_runtime.js",
  "core_replay_execution_runtime.js",
  "core_replay_dispatch_runtime.js",
  "core_replay_lifecycle_runtime.js",
  "core_replay_timer_runtime.js",
  "core_replay_flow_runtime.js",
  "core_replay_control_runtime.js",
  "core_replay_loop_runtime.js",
  "core_move_apply_runtime.js",
  "core_game_settings_storage_runtime.js",
  "core_game_manager_client_record_id_runtime.js",
  "core_game_manager_base_helpers_runtime.js",
  "core_game_manager_env_helpers_runtime.js",
  "core_game_manager_runtime_call_helpers_runtime.js",
  "core_game_manager_saved_state_helpers_runtime.js",
  "core_ranked_checkpoint_local_mirror_fallback_runtime.js",
  "core_game_manager_runtime_accessor_helpers_runtime.js",
  "core_game_manager_stats_ui_helpers_runtime.js",
  "core_game_manager_move_input_helpers_runtime.js",
  "core_game_manager_stats_display_helpers_runtime.js",
  "core_game_manager_panel_timer_helpers_runtime.js",
  "core_game_manager_undo_stats_helpers_runtime.js",
  "core_game_manager_restart_setup_helpers_runtime.js",
  "core_game_manager_setup_timer_ui_helpers_runtime.js",
  "core_game_manager_session_init_helpers_runtime.js",
  "core_game_manager_common_runtime.js",
  "core_game_manager_replay_helpers_runtime.js",
  "core_game_manager_mode_rules_helpers_runtime.js",
  "core_game_manager_static_runtime.js",
  "core_game_manager_bindings_runtime.js",
  "game_manager.js",
  "core_practice_mode_runtime.js",
  "core_home_mode_runtime.js",
  "core_home_runtime_contract_runtime.js",
  "core_home_startup_host_runtime.js",
  "core_home_page_host_runtime.js",
  "core_undo_action_runtime.js",
  "application.js"
];
const HOME_STANDARD_DEFERRED_FILES = [
  "core_practice_transfer_runtime.js",
  "core_practice_transfer_host_runtime.js",
  "core_practice_transfer_page_host_runtime.js",
  "core_capped_timer_scroll_runtime.js",
  "capped_timer_scroll.js",
  "core_timer_module_runtime.js",
  "core_timer_module_settings_host_runtime.js",
  "core_timer_module_settings_page_host_runtime.js",
  "core_theme_settings_runtime.js",
  "core_theme_settings_host_runtime.js",
  "core_theme_settings_page_host_runtime.js",
  "core_mobile_hint_runtime.js",
  "core_mobile_hint_ui_runtime.js",
  "core_mobile_hint_modal_runtime.js",
  "core_mobile_hint_open_host_runtime.js",
  "core_mobile_hint_ui_host_runtime.js",
  "core_mobile_hint_host_runtime.js",
  "core_mobile_hint_page_host_runtime.js",
  "core_mobile_timerbox_runtime.js",
  "core_mobile_timerbox_host_runtime.js",
  "core_mobile_timerbox_page_host_runtime.js",
  "core_mobile_undo_top_runtime.js",
  "core_mobile_undo_top_availability_host_runtime.js",
  "core_mobile_undo_top_host_runtime.js",
  "core_top_actions_runtime.js",
  "core_top_actions_host_runtime.js",
  "core_top_actions_page_host_runtime.js",
  "core_mobile_top_buttons_runtime.js",
  "core_mobile_top_buttons_page_host_runtime.js",
  "core_mobile_viewport_runtime.js",
  "core_mobile_viewport_page_host_runtime.js",
  "core_storage_runtime.js",
  "core_bgm_runtime.js",
  "core_night_mode_runtime.js",
  "core_replay_modal_runtime.js",
  "core_settings_modal_host_runtime.js",
  "core_settings_modal_page_host_runtime.js",
  "core_top_button_style_runtime.js",
  "core_replay_export_runtime.js",
  "core_replay_page_host_runtime.js",
  "core_pretty_time_runtime.js",
  "core_responsive_relayout_runtime.js",
  "core_responsive_relayout_host_runtime.js",
  "core_top_action_bindings_host_runtime.js",
  "core_game_over_undo_host_runtime.js",
  "core_index_ui_startup_host_runtime.js",
  "core_home_guide_dom_host_runtime.js",
  "core_home_guide_done_notice_host_runtime.js",
  "core_home_guide_highlight_host_runtime.js",
  "core_home_guide_panel_host_runtime.js",
  "core_home_guide_finish_host_runtime.js",
  "core_home_guide_start_host_runtime.js",
  "core_home_guide_controls_host_runtime.js",
  "core_home_guide_step_flow_host_runtime.js",
  "core_home_guide_step_host_runtime.js",
  "core_home_guide_step_view_host_runtime.js",
  "core_home_guide_settings_host_runtime.js",
  "core_home_guide_startup_host_runtime.js",
  "core_home_guide_page_host_runtime.js",
  "core_index_ui_runtime_contract_runtime.js",
  "core_index_ui_page_host_runtime.js",
  "core_index_ui_page_resolvers_host_runtime.js",
  "core_index_ui_page_actions_host_runtime.js",
  "index_ui.js",
  "core_i18n_runtime.js"
];

async function readHomeStandardBundle(fileNames: readonly string[]): Promise<string> {
  const chunks = [];
  for (const fileName of fileNames) {
    const filePath = resolve(__dirname, "js", fileName);
    const content = await readFile(filePath, "utf8");
    chunks.push(`\n/* ${fileName} */\n${content}\n;`);
  }
  return chunks.join("\n");
}

function copyRootLegacyScriptsPlugin(): Plugin {
  return {
    name: "copy-root-legacy-scripts",
    async closeBundle() {
      const sourceDir = resolve(__dirname, "js");
      const targetDir = resolve(__dirname, "dist", "js");
      await mkdir(targetDir, { recursive: true });
      await cp(sourceDir, targetDir, { recursive: true });
      await writeFile(
        resolve(targetDir, HOME_STANDARD_STARTUP_BUNDLE),
        await readHomeStandardBundle(HOME_STANDARD_STARTUP_FILES),
        "utf8"
      );
      await writeFile(
        resolve(targetDir, HOME_STANDARD_DEFERRED_BUNDLE),
        await readHomeStandardBundle(HOME_STANDARD_DEFERRED_FILES),
        "utf8"
      );
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathName = req.url ? req.url.split("?")[0] : "";
        const bundleFiles: Record<string, readonly string[]> = {
          [`/js/${HOME_STANDARD_STARTUP_BUNDLE}`]: HOME_STANDARD_STARTUP_FILES,
          [`/js/${HOME_STANDARD_DEFERRED_BUNDLE}`]: HOME_STANDARD_DEFERRED_FILES
        };
        const fileNames = bundleFiles[pathName];
        if (!fileNames) {
          next();
          return;
        }
        try {
          const bundle = await readHomeStandardBundle(fileNames);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          res.end(bundle);
        } catch (error) {
          next(error as Error);
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = (env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3000").trim();
  const apiProxy = {
    "/api": {
      target: apiProxyTarget,
      changeOrigin: true,
      secure: false,
      configure(proxy) {
        proxy.on("error", (_err, _req, res) => {
          const response = res as any;
          if (!response || typeof response.writeHead !== "function") return;
          if (response.headersSent || response.writableEnded) return;
          const body = JSON.stringify({
            success: false,
            error: "api_unavailable"
          });
          response.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": String(body.length)
          });
          response.end(body);
        });
      }
    }
  };

  return {
    base: "./",
    plugins: [copyRootLegacyScriptsPlugin()],
    server: {
      proxy: apiProxy
    },
    preview: {
      proxy: apiProxy
    },
    build: {
      // Keep legacy runtime assets as real files so page CSP can load them via 'self'.
      assetsInlineLimit: 0,
      rollupOptions: {
        input: {
          index: resolve(__dirname, "index.html"),
          game2048: resolve(__dirname, "2048.html"),
          index_test: resolve(__dirname, "index_test.html"),
          play: resolve(__dirname, "play.html"),
          undo: resolve(__dirname, "undo_2048.html"),
          capped: resolve(__dirname, "capped_2048.html"),
          practice: resolve(__dirname, "Practice_board.html"),
          PKU2048: resolve(__dirname, "PKU2048.html"),
          palette: resolve(__dirname, "palette.html"),
          account: resolve(__dirname, "account.html"),
          admin: resolve(__dirname, "admin.html"),
          account_settings: resolve(__dirname, "account_settings.html"),
          register: resolve(__dirname, "register.html"),
          password: resolve(__dirname, "password.html"),
          user: resolve(__dirname, "user.html"),
          replay: resolve(__dirname, "replay.html"),
          modes: resolve(__dirname, "modes.html"),
          history: resolve(__dirname, "history.html"),
          stone_2k_monitor: resolve(__dirname, "stone_2k_monitor.html"),
          relay_5x5: resolve(__dirname, "relay_5x5.html"),
          favicon_preview: resolve(__dirname, "favicon-preview.html"),
          cache_reset: resolve(__dirname, "cache-reset.html")
        }
      }
    }
  };
});
