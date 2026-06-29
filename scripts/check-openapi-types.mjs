import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const specPath = path.resolve(root, "openapi/2048next.v1.yaml");
const generatedTypesPath = path.resolve(root, "src/services/generated-api/2048next-v1.ts");
const openapiTypescriptBin = path.resolve(
  root,
  "node_modules/.bin",
  process.platform === "win32" ? "openapi-typescript.cmd" : "openapi-typescript"
);

async function main() {
  const tempDir = await mkdtemp(path.join(tmpdir(), "2048next-openapi-types-"));
  const tempTypesPath = path.join(tempDir, "2048next-v1.ts");

  try {
    const result = spawnSync(openapiTypescriptBin, [specPath, "-o", tempTypesPath], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      process.exitCode = result.status || 1;
      return;
    }

    const expected = await readFile(generatedTypesPath, "utf8");
    const actual = await readFile(tempTypesPath, "utf8");

    if (expected !== actual) {
      console.error("[api:types:check] generated API types are out of sync.");
      console.error("[api:types:check] Run `npm run api:types` and commit src/services/generated-api/2048next-v1.ts.");
      process.exitCode = 1;
      return;
    }

    console.log("[api:types:check] PASS: src/services/generated-api/2048next-v1.ts matches openapi/2048next.v1.yaml");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("[api:types:check] unexpected failure");
  console.error(error);
  process.exitCode = 1;
});
