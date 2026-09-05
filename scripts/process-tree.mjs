import { spawnSync } from "node:child_process";

const DEFAULT_PROCESS_TREE_GRACE_MS = 5_000;
const PROCESS_TREE_FORCE_KILL_WAIT_MS = 1_000;

function waitForChildClose(child, timeoutMs) {
  if (!child || child.exitCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off?.("close", onClose);
      resolve(value);
    };
    const onClose = () => finish(true);
    child.once?.("close", onClose);
    const timer = setTimeout(() => finish(false), timeoutMs);
    timer.unref?.();
  });
}

function signalOwnedTree(
  child,
  signal,
  {
    platform = process.platform,
    killImpl = process.kill,
    spawnSyncImpl = spawnSync,
  } = {},
) {
  if (!child || child.exitCode !== null) return;
  const pid = Number(child.pid);
  if (platform === "win32" && Number.isInteger(pid) && pid > 0) {
    const args = ["/PID", String(pid), "/T"];
    if (signal === "SIGKILL") args.push("/F");
    const result = spawnSyncImpl("taskkill", args, {
      stdio: "ignore",
      windowsHide: true,
    });
    if (result?.status === 0) return;
    child.kill?.(signal);
    return;
  }
  if (Number.isInteger(pid) && pid > 0) {
    try {
      killImpl(-pid, signal);
      return;
    } catch {
      try {
        child.kill?.(signal);
      } catch {}
      return;
    }
  }
  child.kill?.(signal);
}

async function terminateOwnedProcessTree(
  child,
  {
    graceMs = DEFAULT_PROCESS_TREE_GRACE_MS,
    platform = process.platform,
    killImpl = process.kill,
    spawnSyncImpl = spawnSync,
  } = {},
) {
  if (!child || child.exitCode !== null) return;
  const options = { platform, killImpl, spawnSyncImpl };
  signalOwnedTree(child, "SIGTERM", options);
  if (await waitForChildClose(child, graceMs)) return;
  signalOwnedTree(child, "SIGKILL", options);
  await waitForChildClose(
    child,
    Math.min(graceMs, PROCESS_TREE_FORCE_KILL_WAIT_MS),
  );
}

function ownedSpawnOptions(options = {}) {
  return {
    ...options,
    detached: process.platform !== "win32",
    windowsHide: true,
  };
}

export {
  DEFAULT_PROCESS_TREE_GRACE_MS,
  PROCESS_TREE_FORCE_KILL_WAIT_MS,
  ownedSpawnOptions,
  signalOwnedTree,
  terminateOwnedProcessTree,
  waitForChildClose,
};
