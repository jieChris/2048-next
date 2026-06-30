import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { defineConfig, loadEnv, transformWithEsbuild, type Plugin } from "vite";
import { resolve } from "path";

const HOME_STANDARD_STARTUP_BUNDLE = "home_standard_startup_bundle.js";
const HOME_STANDARD_DEFERRED_BUNDLE = "home_standard_deferred_bundle.js";
const PLAY_STANDARD_BUNDLE = "play_standard_bundle.js";
const LEGACY_BUNDLE_HASH_LENGTH = 12;
const LEGACY_BUNDLE_CLEANUP_GLOBS = [
  "home_standard_startup_bundle.*.js",
  "home_standard_deferred_bundle.*.js",
  "play_standard_bundle.*.js"
] as const;
const HOME_STANDARD_STARTUP_FILES = [
  "game_dialog_runtime.js",
  "seedrandom.js",
  "animframe_polyfill.js",
  "core_bootstrap_runtime.js",
  "keyboard_input_manager.js",
  "mode_catalog.js",
  "html_actuator.js",
  "grid.js",
  "tile.js",
  "local_score_manager.js",
  "local_history_store.js",
  "core_game_manager_saved_state_helpers_runtime.js",
  "core_ranked_checkpoint_local_mirror_fallback_runtime.js",
  "core_game_manager_stats_ui_helpers_runtime.js",
  "core_game_manager_move_input_helpers_runtime.js",
  "core_game_manager_stats_display_helpers_runtime.js",
  "core_game_manager_panel_timer_helpers_runtime.js",
  "core_game_manager_undo_stats_helpers_runtime.js",
  "core_game_manager_restart_setup_helpers_runtime.js",
  "core_game_manager_setup_timer_ui_helpers_runtime.js",
  "core_game_manager_session_init_helpers_runtime.js",
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
  "theme_manager.js",
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

interface LegacyBundleSnapshot {
  readonly baseFileName: string;
  readonly fileName: string;
  readonly publicUrl: string;
  readonly content: string;
}

interface LegacyBundleSnapshots {
  readonly homeStartup: LegacyBundleSnapshot;
  readonly homeDeferred: LegacyBundleSnapshot;
  readonly playStandard: LegacyBundleSnapshot;
}

async function readLegacyScriptBundleSource(fileNames: readonly string[]): Promise<string> {
  const chunks = [];
  for (const fileName of fileNames) {
    const filePath = resolve(__dirname, "js", fileName);
    const content = await readFile(filePath, "utf8");
    chunks.push(`\n/* ${fileName} */\n${content}\n;`);
  }
  return chunks.join("\n");
}

async function minifyLegacyScriptBundle(fileNames: readonly string[]): Promise<string> {
  const source = await readLegacyScriptBundleSource(fileNames);
  const result = await transformWithEsbuild(source, "legacy-bundle.js", {
    loader: "js",
    minify: true,
    target: "es2018"
  });
  return `${result.code.trim()}\n`;
}

async function readPlayRuntimeScriptFileNames(): Promise<string[]> {
  const manifestPath = resolve(__dirname, "src", "entries", "play-runtime-scripts.ts");
  const manifest = await readFile(manifestPath, "utf8");
  return Array.from(
    manifest.matchAll(/from "\.\.\/\.\.\/js\/([^"]+\.js)\?url";/g),
    (match) => match[1]
  );
}

function hashLegacyBundleContent(content: string): string {
  return createHash("sha256")
    .update(content)
    .digest("hex")
    .slice(0, LEGACY_BUNDLE_HASH_LENGTH);
}

function createLegacyBundleSnapshot(baseFileName: string, content: string): LegacyBundleSnapshot {
  const hash = hashLegacyBundleContent(content);
  const fileName = `${baseFileName.replace(/\.js$/, "")}.${hash}.js`;
  return {
    baseFileName,
    fileName,
    publicUrl: `./js/${fileName}`,
    content
  };
}

async function createLegacyBundleSnapshots(): Promise<LegacyBundleSnapshots> {
  const playRuntimeFiles = await readPlayRuntimeScriptFileNames();
  const [homeStartupContent, homeDeferredContent, playStandardContent] = await Promise.all([
    minifyLegacyScriptBundle(HOME_STANDARD_STARTUP_FILES),
    minifyLegacyScriptBundle(HOME_STANDARD_DEFERRED_FILES),
    minifyLegacyScriptBundle(playRuntimeFiles)
  ]);

  return {
    homeStartup: createLegacyBundleSnapshot(HOME_STANDARD_STARTUP_BUNDLE, homeStartupContent),
    homeDeferred: createLegacyBundleSnapshot(HOME_STANDARD_DEFERRED_BUNDLE, homeDeferredContent),
    playStandard: createLegacyBundleSnapshot(PLAY_STANDARD_BUNDLE, playStandardContent)
  };
}

async function writeLegacyBundleFile(
  targetDir: string,
  bundle: LegacyBundleSnapshot
): Promise<void> {
  await writeFile(resolve(targetDir, bundle.fileName), bundle.content, "utf8");
  await writeFile(resolve(targetDir, bundle.baseFileName), bundle.content, "utf8");
}

async function removeStaleLegacyBundleFiles(
  targetDir: string,
  bundles: readonly LegacyBundleSnapshot[]
): Promise<void> {
  const currentBundleFiles = new Set<string>();
  for (const bundle of bundles) {
    currentBundleFiles.add(bundle.fileName);
    currentBundleFiles.add(bundle.baseFileName);
  }

  const bundlePrefixes = LEGACY_BUNDLE_CLEANUP_GLOBS.map((glob) => glob.replace("*.js", ""));
  const fileNames = await readdir(targetDir).catch(() => []);
  await Promise.all(
    fileNames.map(async (fileName) => {
      if (currentBundleFiles.has(fileName)) return;
      const isStaleBundle = bundlePrefixes.some(
        (prefix) => fileName.startsWith(prefix) && fileName.endsWith(".js")
      );
      if (!isStaleBundle) return;
      await rm(resolve(targetDir, fileName), { force: true });
    })
  );
}

function copyRootLegacyScriptsPlugin(legacyBundles: LegacyBundleSnapshots): Plugin {
  return {
    name: "copy-root-legacy-scripts",
    transformIndexHtml(html) {
      return html.replace(
        "%HOME_STANDARD_STARTUP_BUNDLE_URL%",
        legacyBundles.homeStartup.publicUrl.replace(/^\.\//, "")
      );
    },
    async closeBundle() {
      const sourceDir = resolve(__dirname, "js");
      const targetDir = resolve(__dirname, "dist", "js");
      await mkdir(targetDir, { recursive: true });
      await cp(sourceDir, targetDir, { recursive: true });
      await removeStaleLegacyBundleFiles(targetDir, [
        legacyBundles.homeStartup,
        legacyBundles.homeDeferred,
        legacyBundles.playStandard
      ]);
      await writeLegacyBundleFile(targetDir, legacyBundles.homeStartup);
      await writeLegacyBundleFile(targetDir, legacyBundles.homeDeferred);
      await writeLegacyBundleFile(targetDir, legacyBundles.playStandard);
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathName = req.url ? req.url.split("?")[0] : "";
        const bundlesByPath: Record<string, LegacyBundleSnapshot> = {
          [`/js/${legacyBundles.homeStartup.fileName}`]: legacyBundles.homeStartup,
          [`/js/${legacyBundles.homeStartup.baseFileName}`]: legacyBundles.homeStartup,
          [`/js/${legacyBundles.homeDeferred.fileName}`]: legacyBundles.homeDeferred,
          [`/js/${legacyBundles.homeDeferred.baseFileName}`]: legacyBundles.homeDeferred,
          [`/js/${legacyBundles.playStandard.fileName}`]: legacyBundles.playStandard,
          [`/js/${legacyBundles.playStandard.baseFileName}`]: legacyBundles.playStandard
        };
        const bundle = bundlesByPath[pathName];
        if (!bundle) {
          next();
          return;
        }
        try {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          res.end(bundle.content);
        } catch (error) {
          next(error as Error);
        }
      });
    }
  };
}

function copyOpenApiContractPlugin(): Plugin {
  return {
    name: "copy-openapi-contract",
    async closeBundle() {
      const sourceDir = resolve(__dirname, "openapi");
      const targetDir = resolve(__dirname, "dist", "openapi");
      await rm(targetDir, { recursive: true, force: true });
      await cp(sourceDir, targetDir, { recursive: true });
    }
  };
}

export default defineConfig(async ({ mode }) => {
  const legacyBundles = await createLegacyBundleSnapshots();
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
    define: {
      __HOME_STANDARD_STARTUP_BUNDLE_URL__: JSON.stringify(legacyBundles.homeStartup.publicUrl),
      __HOME_STANDARD_DEFERRED_BUNDLE_URL__: JSON.stringify(legacyBundles.homeDeferred.publicUrl),
      __PLAY_STANDARD_BUNDLE_URL__: JSON.stringify(legacyBundles.playStandard.publicUrl)
    },
    plugins: [copyRootLegacyScriptsPlugin(legacyBundles), copyOpenApiContractPlugin()],
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
          achievements: resolve(__dirname, "medal-wall.html"),
          beta_login: resolve(__dirname, "beta-login.html"),
          beta_access: resolve(__dirname, "beta-access.html"),
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
          ui_preview: resolve(__dirname, "ui-preview.html"),
          api_docs: resolve(__dirname, "api-docs.html"),
          cache_reset: resolve(__dirname, "cache-reset.html")
        }
      }
    }
  };
});
