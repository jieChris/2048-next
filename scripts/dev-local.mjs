import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log("Usage: npm run dev:local");
  console.log("Env:");
  console.log("  LOCAL_API_DIR   2048-game-api repo directory");
  console.log("  LOCAL_API_PORT  API port (default: 3000)");
  console.log("  LOCAL_WEB_PORT  Web port (default: 5173)");
  console.log("  VITE_API_PROXY_TARGET  explicit proxy target for web");
  process.exit(0);
}

const rootDir = process.cwd();
const apiDir =
  (process.env.LOCAL_API_DIR || "").trim() ||
  path.resolve(rootDir, "..", "2048-game-api", "2048-game-api");

const parsedApiPort = Number.parseInt(process.env.LOCAL_API_PORT || "3000", 10);
const apiPort = Number.isFinite(parsedApiPort) && parsedApiPort > 0 ? parsedApiPort : 3000;

const parsedWebPort = Number.parseInt(process.env.LOCAL_WEB_PORT || "5173", 10);
const webPort = Number.isFinite(parsedWebPort) && parsedWebPort > 0 ? parsedWebPort : 5173;

if (!existsSync(apiDir)) {
  console.error(`[dev:local] API repo not found: ${apiDir}`);
  console.error("[dev:local] Set LOCAL_API_DIR to your 2048-game-api directory and retry.");
  process.exit(1);
}

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const children = [];
let stopping = false;
const isWindows = process.platform === "win32";

function killChildTree(child) {
  if (!child || !child.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }
  try {
    child.kill("SIGTERM");
  } catch {
    // ignore
  }
}

function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  console.log(`[dev:local] stopping all processes...`);
  for (const child of children) killChildTree(child);
  setTimeout(() => process.exit(exitCode), 1200);
}

function spawnManaged(name, command, args, cwd, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: "inherit",
    shell: isWindows
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (stopping) return;
    const sigText = signal ? ` signal=${signal}` : "";
    const codeText = Number.isInteger(code) ? ` code=${code}` : "";
    console.error(`[dev:local] ${name} exited.${codeText}${sigText}`);
    stopAll(Number.isInteger(code) ? code : 1);
  });
  return child;
}

for (const sig of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
  process.on(sig, () => stopAll(0));
}

const apiBase = `http://127.0.0.1:${apiPort}`;
console.log(`[dev:local] API dir: ${apiDir}`);
console.log(`[dev:local] API base: ${apiBase}`);
console.log(`[dev:local] Web port: ${webPort}`);

spawnManaged("api", npmCmd, ["run", "dev:server"], apiDir, {
  HTTP_PORT: String(apiPort),
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || apiBase
});
spawnManaged(
  "web",
  npmCmd,
  ["run", "dev", "--", "--port", String(webPort)],
  rootDir,
  {
    VITE_API_PROXY_TARGET: process.env.VITE_API_PROXY_TARGET || apiBase
  }
);
