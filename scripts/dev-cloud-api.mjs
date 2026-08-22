import { spawn } from "node:child_process";
import process from "node:process";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const passThroughArgs = process.argv.slice(2);
const apiTarget = (process.env.VITE_API_PROXY_TARGET || "https://2048next.cn").replace(/\/+$/, "");

try {
  const response = await fetch(`${apiTarget}/api/health`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) throw new Error(`HTTP ${response.status}`);
  console.log(`[dev:cloud-api] backend ready: ${apiTarget}`);
} catch (error) {
  console.error(`[dev:cloud-api] backend unavailable: ${apiTarget}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const child = spawn(
  npmCmd,
  ["run", "dev", "--", ...passThroughArgs],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VITE_API_PROXY_TARGET: apiTarget
    },
    stdio: "inherit",
    shell: process.platform === "win32"
  }
);

for (const sig of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
  process.on(sig, () => {
    try {
      child.kill(sig);
    } catch {
      // ignore
    }
  });
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
    return;
  }
  process.exit(Number.isInteger(code) ? code : 0);
});
