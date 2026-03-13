import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./",
  build: {
    // Keep legacy runtime assets as real files so page CSP can load them via 'self'.
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        index_test: resolve(__dirname, "index_test.html"),
        play: resolve(__dirname, "play.html"),
        undo: resolve(__dirname, "undo_2048.html"),
        capped: resolve(__dirname, "capped_2048.html"),
        practice: resolve(__dirname, "Practice_board.html"),
        PKU2048: resolve(__dirname, "PKU2048.html"),
        palette: resolve(__dirname, "palette.html"),
        account: resolve(__dirname, "account.html"),
        replay: resolve(__dirname, "replay.html"),
        modes: resolve(__dirname, "modes.html"),
        history: resolve(__dirname, "history.html")
      }
    }
  }
});
