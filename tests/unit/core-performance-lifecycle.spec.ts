import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_CORE_PERFORMANCE_CLEANUP_TIMEOUT_MS,
  createCorePerformanceLifecycle,
  installCorePerformanceSignalHandlers,
} from "../../scripts/core-performance-check.mjs";
import {
  DEFAULT_PROCESS_TREE_GRACE_MS,
  PROCESS_TREE_FORCE_KILL_WAIT_MS,
  ownedSpawnOptions,
  terminateOwnedProcessTree,
} from "../../scripts/process-tree.mjs";
import { runStep } from "../../scripts/refactor-gate.mjs";

class FakeChild extends EventEmitter {
  exitCode: number | null = null;
  pid = 43210;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
}

async function waitFor(
  check: () => Promise<boolean> | boolean,
  timeoutMs = 2000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("condition timeout");
}

async function reservePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    (server as unknown as EventEmitter).once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

describe("core performance signal lifecycle", () => {
  it("installs one-shot signal handlers, runs bounded cleanup, and exits compatibly", async () => {
    expect(DEFAULT_CORE_PERFORMANCE_CLEANUP_TIMEOUT_MS).toBeGreaterThan(
      DEFAULT_PROCESS_TREE_GRACE_MS + PROCESS_TREE_FORCE_KILL_WAIT_MS,
    );
    const processLike = new EventEmitter();
    const lifecycle = createCorePerformanceLifecycle({ cleanupTimeoutMs: 50 });
    const cleanup = vi.fn();
    lifecycle.register(cleanup);
    const exit = vi.fn();
    const signalHandlerOptions = {
      lifecycle,
      processLike,
      exit,
    } as unknown as NonNullable<
      Parameters<typeof installCorePerformanceSignalHandlers>[0]
    >;
    const uninstall =
      installCorePerformanceSignalHandlers(signalHandlerOptions);
    processLike.emit("SIGTERM");
    await waitFor(() => exit.mock.calls.length === 1);
    expect(cleanup).toHaveBeenCalledWith("SIGTERM");
    expect(exit).toHaveBeenCalledWith(143);
    expect(lifecycle.signal.aborted).toBe(true);
    uninstall();
    expect(processLike.listenerCount("SIGTERM")).toBe(0);
  });

  it("uses TERM then KILL for only the owned POSIX process group", async () => {
    const child = new FakeChild();
    const signals: Array<[number, string]> = [];
    await terminateOwnedProcessTree(child, {
      graceMs: 2,
      platform: "darwin",
      killImpl: (pid: number, signal: NodeJS.Signals) => {
        signals.push([pid, signal]);
        if (signal === "SIGKILL") {
          child.exitCode = 0;
          queueMicrotask(() => child.emit("close", null, signal));
        }
        return true;
      },
    });
    expect(signals).toEqual([
      [-child.pid, "SIGTERM"],
      [-child.pid, "SIGKILL"],
    ]);
  });

  it("refactor step timeout delegates cleanup to the owned process tree", async () => {
    const child = new FakeChild();
    const terminateImpl = vi.fn(async () => {
      child.exitCode = 0;
      child.emit("close", null, "SIGTERM");
    });
    const runStepOptions = {
      stepLogDir: path.join(
        await mkdtemp(path.join(tmpdir(), "refactor-step-")),
        "logs",
      ),
      spawnImpl: vi.fn(() => child),
      terminateImpl,
      timeoutMsOverride: 5,
    } as unknown as NonNullable<Parameters<typeof runStep>[1]>;
    const result = await runStep(
      { name: "core-performance", cmd: "fixture", args: [] },
      runStepOptions,
    );
    expect(result).toMatchObject({ ok: false, signal: "TIMEOUT" });
    expect(terminateImpl).toHaveBeenCalledWith(child);
  });

  it.skipIf(process.platform === "win32")(
    "signal cleanup force-kills a stubborn isolated tree and releases its port",
    async () => {
      const root = await mkdtemp(path.join(tmpdir(), "core-performance-tree-"));
      const marker = path.join(root, "tree.json");
      const script = path.join(root, "tree.mjs");
      const port = await reservePort();
      await writeFile(
        script,
        `import {spawn} from 'node:child_process';\nimport {writeFileSync} from 'node:fs';\nimport net from 'node:net';\nprocess.on('SIGTERM',()=>{});\nconst descendant=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],{stdio:'ignore'});\nconst server=net.createServer();\nserver.listen(${port},'127.0.0.1',()=>writeFileSync(${JSON.stringify(marker)},JSON.stringify({descendantPid:descendant.pid})));\nsetInterval(()=>{},1000);\n`,
      );
      const child = spawn(
        process.execPath,
        [script],
        ownedSpawnOptions({ stdio: "ignore" }),
      );
      await waitFor(async () => {
        try {
          return JSON.parse(await readFile(marker, "utf8")).descendantPid > 0;
        } catch {
          return false;
        }
      });
      const { descendantPid } = JSON.parse(await readFile(marker, "utf8"));
      const lifecycle = createCorePerformanceLifecycle({
        cleanupTimeoutMs: 1_000,
      });
      lifecycle.register(() =>
        terminateOwnedProcessTree(child, { graceMs: 50 }),
      );
      const processLike = new EventEmitter();
      const exit = vi.fn();
      const signalHandlerOptions = {
        lifecycle,
        processLike,
        exit,
      } as unknown as NonNullable<
        Parameters<typeof installCorePerformanceSignalHandlers>[0]
      >;
      const uninstall =
        installCorePerformanceSignalHandlers(signalHandlerOptions);
      processLike.emit("SIGTERM");
      await waitFor(() => exit.mock.calls.length === 1);
      expect(exit).toHaveBeenCalledWith(143);
      uninstall();
      await waitFor(() => {
        try {
          process.kill(descendantPid, 0);
          return false;
        } catch (error) {
          return (error as NodeJS.ErrnoException).code === "ESRCH";
        }
      });
      const probe = createServer();
      await new Promise<void>((resolve, reject) => {
        (probe as unknown as EventEmitter).once("error", reject);
        probe.listen(port, "127.0.0.1", resolve);
      });
      await new Promise<void>((resolve) => probe.close(() => resolve()));
    },
  );
});
