import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const mobileRoot = fileURLToPath(new URL("./mobile", import.meta.url));

export default defineConfig({
  root: mobileRoot,
  base: "./",
  build: {
    outDir: fileURLToPath(new URL("./dist-app", import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL("./mobile/index.html", import.meta.url))
    }
  },
  cacheDir: fileURLToPath(new URL("./node_modules/.vite-app", import.meta.url)),
  envDir: projectRoot
});
