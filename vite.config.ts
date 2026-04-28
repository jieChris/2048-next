import { defineConfig, loadEnv } from "vite";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = (env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8787").trim();
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
          relay_5x5: resolve(__dirname, "relay_5x5.html")
        }
      }
    }
  };
});
