import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ZERO_SHA = "0000000000000000000000000000000000000000";
const FIRST_PARENT_EVENTS = new Set(["workflow_call", "workflow_dispatch"]);

function runGit(args, cwd = process.cwd()) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}

function gitFailure(result) {
  return String(result.stderr || result.stdout || "unknown git error").trim();
}

function tryResolveCommit(ref, cwd = process.cwd()) {
  if (typeof ref !== "string" || ref.trim() === "") return null;
  const result = runGit(
    ["rev-parse", "--verify", "--end-of-options", `${ref.trim()}^{commit}`],
    cwd,
  );
  return result.status === 0 ? result.stdout.trim() : null;
}

function resolveCommit(ref, label, cwd = process.cwd()) {
  const resolved = tryResolveCommit(ref, cwd);
  if (!resolved) {
    throw new Error(`${label} is not an available commit: ${String(ref)}`);
  }
  return resolved;
}

function resolveFirstParent(candidate, eventName, cwd = process.cwd()) {
  const result = runGit(
    ["rev-parse", "--verify", "--end-of-options", `${candidate}^1`],
    cwd,
  );
  if (result.status !== 0) {
    throw new Error(
      `${eventName} candidate ${candidate} has no first parent; root commits fail closed`,
    );
  }
  return result.stdout.trim();
}

function remoteExists(remote, cwd = process.cwd()) {
  return runGit(["remote", "get-url", remote], cwd).status === 0;
}

function resolvePushBefore(pushBefore, remote, cwd = process.cwd()) {
  const available = tryResolveCommit(pushBefore, cwd);
  if (available) return available;
  if (!remoteExists(remote, cwd)) {
    throw new Error(
      `push before ${pushBefore} is unavailable and remote ${remote} is not configured`,
    );
  }
  const fetchResult = runGit(
    ["fetch", "--no-tags", "--depth=1", remote, pushBefore],
    cwd,
  );
  if (fetchResult.status !== 0) {
    throw new Error(
      `push before ${pushBefore} is unavailable; best-effort exact fetch failed from ${remote}: ${gitFailure(fetchResult)}`,
    );
  }
  const fetched = tryResolveCommit(pushBefore, cwd);
  if (!fetched) {
    throw new Error(
      `push before ${pushBefore} remained unavailable after best-effort exact fetch from ${remote}`,
    );
  }
  return fetched;
}

function parseBaselineSelectorOptions(argv, env = process.env) {
  const options = {
    eventName: env.GITHUB_EVENT_NAME || null,
    candidate: env.GITHUB_SHA || "HEAD",
    prBase: env.PR_BASE_SHA || null,
    pushBefore: env.PUSH_BEFORE_SHA || null,
    remote: env.ARCHITECTURE_BASELINE_REMOTE || "origin",
    cwd: process.cwd(),
  };
  for (const arg of argv) {
    if (arg.startsWith("--event-name=")) {
      options.eventName = arg.slice("--event-name=".length);
    } else if (arg.startsWith("--candidate=")) {
      options.candidate = arg.slice("--candidate=".length);
    } else if (arg.startsWith("--pr-base=")) {
      options.prBase = arg.slice("--pr-base=".length);
    } else if (arg.startsWith("--push-before=")) {
      options.pushBefore = arg.slice("--push-before=".length);
    } else if (arg.startsWith("--remote=")) {
      options.remote = arg.slice("--remote=".length);
    } else if (arg.startsWith("--cwd=")) {
      options.cwd = path.resolve(arg.slice("--cwd=".length));
    } else {
      throw new Error(`unknown baseline selector option: ${arg}`);
    }
  }
  return options;
}

function selectArchitectureBaselineRef({
  eventName,
  candidate,
  prBase,
  pushBefore,
  remote = "origin",
  cwd = process.cwd(),
}) {
  if (typeof eventName !== "string" || eventName.trim() === "") {
    throw new Error("event name is required for baseline selection");
  }
  const normalizedEvent = eventName.trim();
  const candidateSha = resolveCommit(candidate, "candidate", cwd);
  let baselineSha;

  if (normalizedEvent === "pull_request") {
    baselineSha = resolveCommit(prBase, "pull request base", cwd);
  } else if (normalizedEvent === "push") {
    if (typeof pushBefore !== "string" || pushBefore.trim() === "") {
      throw new Error("push event.before is required for baseline selection");
    }
    baselineSha =
      pushBefore.trim() === ZERO_SHA
        ? resolveFirstParent(candidateSha, normalizedEvent, cwd)
        : resolvePushBefore(pushBefore.trim(), remote, cwd);
  } else if (FIRST_PARENT_EVENTS.has(normalizedEvent)) {
    baselineSha = resolveFirstParent(candidateSha, normalizedEvent, cwd);
  } else {
    throw new Error(`unsupported baseline selection event: ${normalizedEvent}`);
  }

  if (baselineSha === candidateSha) {
    throw new Error(
      `architecture budget baseline must not equal candidate ${candidateSha}`,
    );
  }
  return baselineSha;
}

function isDirectExecution() {
  return Boolean(
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url),
  );
}

function runBaselineSelectorCli(argv = process.argv.slice(2)) {
  try {
    const options = parseBaselineSelectorOptions(argv);
    console.log(selectArchitectureBaselineRef(options));
  } catch (error) {
    console.error(
      `[architecture-baseline-selector] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}

if (isDirectExecution()) runBaselineSelectorCli();

export {
  FIRST_PARENT_EVENTS,
  ZERO_SHA,
  parseBaselineSelectorOptions,
  runBaselineSelectorCli,
  selectArchitectureBaselineRef,
};
