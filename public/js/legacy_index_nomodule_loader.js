(function () {
  var scriptElementPrototype = window.HTMLScriptElement && window.HTMLScriptElement.prototype;
  if (scriptElementPrototype && "noModule" in scriptElementPrototype) return;
  if (window.__legacyIndexNomoduleLoaderStarted) return;
  window.__legacyIndexNomoduleLoaderStarted = true;

  function installLateDomReadyCompatibility() {
    if (!document || document.__legacyDomContentLoadedCompatInstalled) return;
    document.__legacyDomContentLoadedCompatInstalled = true;
    var originalAddEventListener = document.addEventListener;
    if (typeof originalAddEventListener !== "function") return;

    document.addEventListener = function patchedAddEventListener(type, listener, options) {
      if (type === "DOMContentLoaded" && listener && document.readyState !== "loading") {
        window.setTimeout(function () {
          var event;
          if (typeof Event === "function") {
            event = new Event("DOMContentLoaded");
          } else {
            event = document.createEvent("Event");
            event.initEvent("DOMContentLoaded", true, true);
          }
          if (typeof listener === "function") {
            listener.call(document, event);
            return;
          }
          if (listener && typeof listener.handleEvent === "function") {
            listener.handleEvent(event);
          }
        }, 0);
        return;
      }
      return originalAddEventListener.call(document, type, listener, options);
    };
  }

  function showFallbackError(message) {
    var container = document.querySelector && document.querySelector(".container");
    if (!container) return;
    var node = document.getElementById("legacy-loader-error");
    if (!node) {
      node = document.createElement("div");
      node.id = "legacy-loader-error";
      node.style.cssText =
        "margin:10px 0;padding:10px 12px;border-radius:6px;background:#f7d8d8;color:#7a1f1f;font-size:14px;line-height:1.45;";
      container.insertBefore(node, container.firstChild);
    }
    node.textContent = message;
  }

  function withJsPath(fileName) {
    return "js/" + fileName + "?v=20260606-nomodule1";
  }

  function loadScript(fileName, done) {
    var script = document.createElement("script");
    script.src = withJsPath(fileName);
    script.async = false;
    script.onload = function () {
      done();
    };
    script.onreadystatechange = function () {
      if (script.readyState === "loaded" || script.readyState === "complete") {
        script.onreadystatechange = null;
        done();
      }
    };
    script.onerror = function () {
      showFallbackError("当前浏览器加载旧版启动脚本失败，请清理缓存后重试，或改用 Safari / Chrome 打开。");
    };
    (document.head || document.documentElement).appendChild(script);
  }

  function loadScriptsSequentially(files, done) {
    var index = 0;
    function next() {
      if (index >= files.length) {
        if (typeof done === "function") done();
        return;
      }
      loadScript(files[index], function () {
        index += 1;
        next();
      });
    }
    next();
  }

  var coreScripts = [
    "seedrandom.js",
    "animframe_polyfill.js",
    "core_crypto_random_runtime.js",
    "core_bootstrap_runtime.js",
    "keyboard_input_manager.js",
    "theme_manager.js",
    "mode_catalog.js",
    "html_actuator.js",
    "grid.js",
    "tile.js",
    "local_score_manager.js",
    "local_history_store.js",
    "core_rules_runtime.js",
    "core_mode_runtime.js",
    "core_special_rules_runtime.js",
    "core_direction_lock_runtime.js",
    "core_grid_scan_runtime.js",
    "core_move_scan_runtime.js",
    "core_move_path_runtime.js",
    "core_timer_interval_runtime.js",
    "core_scoring_runtime.js",
    "core_merge_effects_runtime.js",
    "core_post_move_runtime.js",
    "core_post_move_record_runtime.js",
    "core_post_undo_record_runtime.js",
    "core_undo_restore_runtime.js",
    "core_undo_snapshot_runtime.js",
    "core_undo_tile_snapshot_runtime.js",
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
    "core_mode_catalog_runtime.js",
    "core_practice_mode_runtime.js",
    "core_home_mode_runtime.js",
    "core_home_runtime_contract_runtime.js",
    "core_home_startup_host_runtime.js",
    "core_home_page_host_runtime.js",
    "core_undo_action_runtime.js",
    "application.js"
  ];
  coreScripts = ["home_standard_startup_bundle.js"];

  var uiStartupScripts = [
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
    "core_home_guide_runtime.js",
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
  uiStartupScripts = ["home_standard_deferred_bundle.js"];

  var backgroundScripts = [
    "announcement_records.js",
    "core_announcement_runtime.js",
    "announcement_manager.js",
    "refresh_scheduler_runtime.js",
    "api_shared_utils.js",
    "admin_rescue_client_runtime.js",
    "online_leaderboard_runtime.js"
  ];

  installLateDomReadyCompatibility();
  loadScriptsSequentially(coreScripts, function () {
    loadScriptsSequentially(uiStartupScripts, function () {
      loadScriptsSequentially(backgroundScripts);
    });
  });
})();
