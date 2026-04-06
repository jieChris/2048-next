import { spawn } from "node:child_process";
import process from "node:process";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const passThroughArgs = process.argv.slice(2);

const child = spawn(
  npmCmd,
  ["run", "dev", "--", ...passThroughArgs],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VITE_API_PROXY_TARGET: process.env.VITE_API_PROXY_TARGET || "https://taihe.fun"
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
