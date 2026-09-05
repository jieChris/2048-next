import {
  DEFAULT_PROCESS_TREE_GRACE_MS,
  PROCESS_TREE_FORCE_KILL_WAIT_MS,
} from "../process-tree.mjs";

const SIGNAL_EXIT_CODES = {
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
};

const DEFAULT_CORE_PERFORMANCE_CLEANUP_TIMEOUT_MS =
  DEFAULT_PROCESS_TREE_GRACE_MS + PROCESS_TREE_FORCE_KILL_WAIT_MS + 4_000;

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      timer.unref?.();
    }),
  ]);
}

function createCorePerformanceLifecycle({
  cleanupTimeoutMs = DEFAULT_CORE_PERFORMANCE_CLEANUP_TIMEOUT_MS,
} = {}) {
  const controller = new AbortController();
  const cleanups = new Set();
  let cleanupPromise = null;
  return {
    signal: controller.signal,
    register(cleanup) {
      if (typeof cleanup !== "function") return () => {};
      cleanups.add(cleanup);
      return () => cleanups.delete(cleanup);
    },
    async cleanup(reason = "cleanup") {
      if (cleanupPromise) return cleanupPromise;
      controller.abort(reason);
      cleanupPromise = withTimeout(
        Promise.allSettled(
          [...cleanups]
            .reverse()
            .map((cleanup) => Promise.resolve().then(() => cleanup(reason))),
        ),
        cleanupTimeoutMs,
      ).then(() => undefined);
      return cleanupPromise;
    },
  };
}

function installCorePerformanceSignalHandlers({
  lifecycle,
  processLike = process,
  exit = (code) => processLike.exit(code),
} = {}) {
  if (!lifecycle) throw new Error("signal handlers require a lifecycle");
  let handling = false;
  const handlers = new Map();
  for (const signal of Object.keys(SIGNAL_EXIT_CODES)) {
    const handler = async () => {
      if (handling) return;
      handling = true;
      await lifecycle.cleanup(signal);
      exit(SIGNAL_EXIT_CODES[signal]);
    };
    handlers.set(signal, handler);
    processLike.once(signal, handler);
  }
  return () => {
    for (const [signal, handler] of handlers) {
      processLike.off(signal, handler);
    }
  };
}

export {
  DEFAULT_CORE_PERFORMANCE_CLEANUP_TIMEOUT_MS,
  SIGNAL_EXIT_CODES,
  createCorePerformanceLifecycle,
  installCorePerformanceSignalHandlers,
};
