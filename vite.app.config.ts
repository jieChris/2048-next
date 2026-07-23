import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import {
  MOBILE_BUILD_FLAGS_SCHEMA,
  resolveMobileBuildFlags,
} from "./mobile/src/app/build-flags-contract";
import { PREVIEW_POLICY_VERSION } from "./mobile/src/privacy";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const mobileRoot = fileURLToPath(new URL("./mobile", import.meta.url));

export default defineConfig(({ mode }) => {
  const buildFlags = resolveMobileBuildFlags(mode);
  return {
    root: mobileRoot,
    base: "./",
    plugins: [
      {
        name: "mobile-build-flags-manifest",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "mobile-build-flags.json",
            source: `${JSON.stringify({
              schema: MOBILE_BUILD_FLAGS_SCHEMA,
              mode,
              policyVersion: PREVIEW_POLICY_VERSION,
              ...buildFlags,
            })}\n`
          });
        }
      }
    ],
    build: {
      outDir: fileURLToPath(new URL("./dist-app", import.meta.url)),
      emptyOutDir: true,
      rollupOptions: {
        input: fileURLToPath(new URL("./mobile/index.html", import.meta.url))
      }
    },
    cacheDir: fileURLToPath(new URL("./node_modules/.vite-app", import.meta.url)),
    envDir: projectRoot
  };
});
