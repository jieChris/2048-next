import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
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
