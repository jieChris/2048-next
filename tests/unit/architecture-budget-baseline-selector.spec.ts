import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const TEST_FILE = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(TEST_FILE), "..", "..");
const SELECTOR_PATH = path.join(
  PROJECT_ROOT,
  "scripts",
  "architecture-budget",
  "select-baseline-ref.mjs",
);
const ZERO_SHA = "0000000000000000000000000000000000000000";

function git(cwd: string, args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function createRepository() {
  const root = await mkdtemp(path.join(tmpdir(), "architecture-selector-"));
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Architecture Test"]);
  await writeFile(path.join(root, "fixture.txt"), "root\n");
  git(root, ["add", "fixture.txt"]);
  git(root, ["commit", "-qm", "root"]);
  return root;
}

async function commit(root: string, message: string) {
  await writeFile(path.join(root, "fixture.txt"), `${message}\n`);
  git(root, ["add", "fixture.txt"]);
  git(root, ["commit", "-qm", message]);
  return git(root, ["rev-parse", "HEAD"]);
}

function runSelector(root: string, args: string[]) {
  return spawnSync(process.execPath, [SELECTOR_PATH, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

function selectorArgs(
  eventName: string,
  candidate: string,
  extras: string[] = [],
) {
  return [`--event-name=${eventName}`, `--candidate=${candidate}`, ...extras];
}

describe("architecture budget CI baseline selector", () => {
  it("selects the pull request base SHA", async () => {
    const root = await createRepository();
    try {
      const baseSha = git(root, ["rev-parse", "HEAD"]);
      const candidate = await commit(root, "candidate");
      const result = runSelector(
        root,
        selectorArgs("pull_request", candidate, [`--pr-base=${baseSha}`]),
      );
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(baseSha);
      expect(result.stderr).toBe("");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("selects ordinary push event.before", async () => {
    const root = await createRepository();
    try {
      const before = git(root, ["rev-parse", "HEAD"]);
      const candidate = await commit(root, "candidate");
      const result = runSelector(
        root,
        selectorArgs("push", candidate, [`--push-before=${before}`]),
      );
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("uses candidate first parent for a linear workflow_call", async () => {
    const root = await createRepository();
    try {
      const parent = git(root, ["rev-parse", "HEAD"]);
      const candidate = await commit(root, "candidate");
      const result = runSelector(
        root,
        selectorArgs("workflow_call", candidate),
      );
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(parent);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("uses main first parent for a standard merge candidate", async () => {
    const root = await createRepository();
    try {
      const rootSha = git(root, ["rev-parse", "HEAD"]);
      git(root, ["checkout", "-qb", "feature"]);
      await writeFile(path.join(root, "feature.txt"), "feature\n");
      git(root, ["add", "feature.txt"]);
      git(root, ["commit", "-qm", "feature"]);
      git(root, ["checkout", "-q", "main"]);
      const mainParent = await commit(root, "main-parent");
      git(root, ["merge", "--no-ff", "-qm", "merge feature", "feature"]);
      const candidate = git(root, ["rev-parse", "HEAD"]);
      expect(mainParent).not.toBe(rootSha);

      const result = runSelector(
        root,
        selectorArgs("workflow_call", candidate),
      );
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(mainParent);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("applies the documented first-parent policy to a reverse-parent merge", async () => {
    const root = await createRepository();
    try {
      git(root, ["checkout", "-qb", "previous-main"]);
      await writeFile(path.join(root, "main.txt"), "main\n");
      git(root, ["add", "main.txt"]);
      git(root, ["commit", "-qm", "previous main"]);
      git(root, ["checkout", "-qb", "feature", "main"]);
      const featureParent = await commit(root, "feature-parent");
      git(root, ["merge", "--no-ff", "-qm", "reverse merge", "previous-main"]);
      const candidate = git(root, ["rev-parse", "HEAD"]);

      const result = runSelector(
        root,
        selectorArgs("workflow_call", candidate),
      );
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(featureParent);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("attempts an exact fetch then fails closed for unreachable push before", async () => {
    const root = await createRepository();
    try {
      const candidate = git(root, ["rev-parse", "HEAD"]);
      const missingRemote = path.join(root, "missing-remote.git");
      git(root, ["remote", "add", "origin", missingRemote]);
      const unreachable = "1111111111111111111111111111111111111111";
      const result = runSelector(
        root,
        selectorArgs("push", candidate, [
          `--push-before=${unreachable}`,
          "--remote=origin",
        ]),
      );
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("best-effort exact fetch failed");
      expect(result.stderr).toContain(unreachable);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails closed for a zero-before root push", async () => {
    const root = await createRepository();
    try {
      const candidate = git(root, ["rev-parse", "HEAD"]);
      const result = runSelector(
        root,
        selectorArgs("push", candidate, [`--push-before=${ZERO_SHA}`]),
      );
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("has no first parent");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
