import { execFileSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  createCorePerformanceFailurePayload,
  createPerformanceThresholds,
  deterministicApiPayload,
  fingerprintDistManifest,
  installDeterministicContext,
  parseCorePerformanceCliOptions,
  readPerformanceRepositoryConfigFromRef,
  resolveCorePerformanceExecutionProfile,
  runCorePerformanceCli,
  runCorePerformanceGate,
  validateEvidencePath,
  withCorePerformanceContext,
  withPreviewServer,
  writeCorePerformanceEvidence,
} from "../../scripts/core-performance-check.mjs";

class FakeChild extends EventEmitter {
  exitCode: number | null = null;
  killed = false;
  stderr = new EventEmitter();
  stdout = new EventEmitter();

  kill() {
    this.killed = true;
    this.exitCode = 0;
    queueMicrotask(() => this.emit("close", 0, null));
    return true;
  }
}

describe("core performance deterministic browser fixtures", () => {
  it("keeps auth refresh identity consistent with preloaded auth state", async () => {
    const fulfilled = vi.fn();
    const addInitScript = vi.fn();
    const context = {
      route: vi.fn(async (_pattern: string, handler: Function) => {
        await handler({
          request: () => ({
            url: () => "http://127.0.0.1:4173/api/auth/refresh",
            method: () => "POST",
            headers: () => ({
              authorization: "Bearer core-performance-legacy-token",
              "content-type": "application/json",
            }),
            postData: () =>
              JSON.stringify({ token: "core-performance-legacy-token" }),
          }),
          fulfill: fulfilled,
        });
      }),
      addInitScript,
    };

    await installDeterministicContext(context as never, {
      baseUrl: "http://127.0.0.1:4173",
    });

    const refresh = deterministicApiPayload(
      "http://127.0.0.1:4173/api/auth/refresh",
      "POST",
    );
    expect(refresh).toMatchObject({
      success: true,
      token: "core-performance-auth-token",
      user: {
        id: 42,
        public_profile_id: "performance-user",
        nickname: "Performance",
      },
    });
    expect(JSON.parse(fulfilled.mock.calls[0][0].body)).toEqual(refresh);
    const preloadSource = String(addInitScript.mock.calls[0][0]);
    const preloadArgs = addInitScript.mock.calls[0][1];
    expect(preloadArgs.legacyToken).toBe("core-performance-legacy-token");
    expect(preloadArgs.activeSession).toMatchObject({
      spawn_sequence_version: 2,
    });
    expect(preloadSource).toContain("2048_public_profile_id_v1");
    expect(preloadSource).toContain("Performance");
  });

  it("fails closed for an invalid deterministic API URL", () => {
    expect(() => deterministicApiPayload("not a url", "GET")).toThrow(
      /invalid deterministic API URL/u,
    );
  });
});

describe("core performance CLI and Git baseline", () => {
  it("derives the execution profile from trusted runner identity only", () => {
    expect(
      resolveCorePerformanceExecutionProfile(
        {},
        { platform: "darwin", arch: "arm64" },
      ),
    ).toBe("reference");
    expect(
      parseCorePerformanceCliOptions(
        ["--baseline-ref=HEAD"],
        {
          GITHUB_ACTIONS: "true",
          RUNNER_OS: "Linux",
          RUNNER_ARCH: "X64",
        },
        { platform: "linux", arch: "x64" },
      ).executionProfile,
    ).toBe("github-actions-linux-x64");
    expect(() =>
      resolveCorePerformanceExecutionProfile(
        {
          GITHUB_ACTIONS: "true",
          RUNNER_OS: "Linux",
          RUNNER_ARCH: "ARM64",
        },
        { platform: "linux", arch: "arm64" },
      ),
    ).toThrow(/unsupported GitHub Actions/u);
    expect(() =>
      parseCorePerformanceCliOptions(
        ["--baseline-ref=HEAD", "--execution-profile=reference"],
        {},
      ),
    ).toThrow(/unknown core performance option/u);
  });

  it("builds evidence thresholds with the same execution modes as evaluation", async () => {
    const config = JSON.parse(
      await readFile("config/core-performance-budgets.json", "utf8"),
    );
    const githubThresholds = createPerformanceThresholds(
      config,
      "github-actions-linux-x64",
    );
    expect(githubThresholds.homeCold.ttfbMs).toMatchObject({
      thresholdMode: "immutable-absolute",
      effectiveMax: 800,
    });
    expect(githubThresholds.homeCold.fcpMs).toMatchObject({
      thresholdMode: "immutable-absolute",
      relativeMax: 560,
      effectiveMax: 1800,
    });
    expect(githubThresholds.homeCold.cls).toMatchObject({
      thresholdMode: "immutable-absolute",
      effectiveMax: 0.1,
    });
    expect(githubThresholds.homeCold.requestCount).toMatchObject({
      thresholdMode: "relative-ratchet",
      effectiveMax: 49,
    });
    expect(githubThresholds.homeCold.transferBytes).toMatchObject({
      thresholdMode: "relative-ratchet",
      effectiveMax: 847737,
    });
    expect(githubThresholds.homeCold.decodedBodyBytes).toMatchObject({
      thresholdMode: "relative-ratchet",
      effectiveMax: 2404202,
    });

    const referenceThresholds = createPerformanceThresholds(
      config,
      "reference",
    );
    expect(referenceThresholds.homeCold.fcpMs).toMatchObject({
      thresholdMode: "relative-ratchet",
      relativeMax: 560,
      effectiveMax: 560,
    });
  });

  it("rejects an empty baseline ref and emits a valid JSON failure", async () => {
    expect(() =>
      parseCorePerformanceCliOptions(["--json", "--baseline-ref="], {}),
    ).toThrow(/baseline ref/u);
    const payload = createCorePerformanceFailurePayload(
      new Error("baseline ref must be non-empty"),
      { baselineRef: "" },
    );
    expect(() => JSON.parse(JSON.stringify(payload))).not.toThrow();
    expect(payload.status).toBe("failed");

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const originalExitCode = process.exitCode;
    const failureEvidencePath = path.join(
      await mkdtemp(path.join(tmpdir(), "core-performance-cli-failure-")),
      "failure.json",
    );
    try {
      await runCorePerformanceCli(
        ["--json", "--baseline-ref="],
        {},
        {
          failureEvidencePath,
        },
      );
      expect(log).toHaveBeenCalledOnce();
      expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({
        status: "failed",
        violations: [
          expect.objectContaining({ code: "core-performance-error" }),
        ],
      });
      expect(
        JSON.parse(await readFile(failureEvidencePath, "utf8")),
      ).toMatchObject({
        status: "failed",
        violations: [
          expect.objectContaining({ code: "core-performance-error" }),
        ],
      });
    } finally {
      log.mockRestore();
      process.exitCode = originalExitCode;
    }
  });

  it("rejects relative traversal even when it would land in an OS temp tree", () => {
    expect(() =>
      parseCorePerformanceCliOptions(
        ["--measure-only", "--evidence=../escaped.json"],
        {},
      ),
    ).toThrow(/relative evidence path/u);
  });

  it("rejects candidate-equal repository baselines once config exists", async () => {
    const executeGit = vi.fn(async (_command: string, args: string[]) => {
      if (args[0] === "rev-parse") return { stdout: "abc123\n" };
      if (args[0] === "ls-tree")
        return {
          stdout: Buffer.from("config/core-performance-budgets.json\0"),
        };
      return {
        stdout: JSON.stringify({ schemaVersion: 1 }),
      };
    });

    await expect(
      readPerformanceRepositoryConfigFromRef(
        "/repo/config/core-performance-budgets.json",
        "HEAD",
        "/repo",
        { executeGit, candidateSha: "abc123" },
      ),
    ).rejects.toThrow(/candidate commit/u);
  });

  it("allows bootstrap only when the config object is absent at the base", async () => {
    const executeGit = vi.fn(async (_command: string, args: string[]) => {
      if (args[0] === "rev-parse") return { stdout: "base123\n" };
      if (args[0] === "ls-tree") return { stdout: Buffer.alloc(0) };
      throw new Error("git show must not run");
    });
    const result = await readPerformanceRepositoryConfigFromRef(
      "/repo/config/core-performance-budgets.json",
      "base",
      "/repo",
      { executeGit, candidateSha: "candidate123" },
    );
    expect(result).toMatchObject({
      status: "bootstrap",
      config: null,
      resolvedRef: "base123",
    });
  });
  it("rejects candidate-equal bootstrap using a real Git repository", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "core-performance-git-"));
    execFileSync("git", ["init", "-q"], { cwd: root });
    await writeFile(path.join(root, "README.md"), "fixture\n");
    execFileSync("git", ["add", "README.md"], { cwd: root });
    execFileSync("git", ["commit", "-q", "-m", "fixture"], {
      cwd: root,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "Test",
        GIT_AUTHOR_EMAIL: "test@example.invalid",
        GIT_COMMITTER_NAME: "Test",
        GIT_COMMITTER_EMAIL: "test@example.invalid",
      },
    });
    const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();

    await expect(
      readPerformanceRepositoryConfigFromRef(
        path.join(root, "config/core-performance-budgets.json"),
        candidateSha,
        root,
        { candidateSha },
      ),
    ).rejects.toThrow(/candidate commit/u);
  });
});

describe("core performance evidence safety", () => {
  async function evidenceFixture() {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "core-performance-evidence-project-"),
    );
    await mkdir(path.join(projectRoot, "config"), { recursive: true });
    await mkdir(path.join(projectRoot, "dist"), { recursive: true });
    await writeFile(
      path.join(projectRoot, "config/core-performance-budgets.json"),
      "{}\n",
    );
    await writeFile(
      path.join(projectRoot, "config/core-performance-budget-exceptions.json"),
      "{}\n",
    );
    await writeFile(path.join(projectRoot, "README.md"), "keep\n");
    return projectRoot;
  }

  it("allows only the project performance artifact directory or OS temp", async () => {
    const projectRoot = await evidenceFixture();
    const artifactPath = path.join(
      projectRoot,
      "artifacts/core-performance/result.json",
    );
    const externalTemp = path.join(
      await mkdtemp(path.join(tmpdir(), "core-performance-output-")),
      "result.json",
    );
    await expect(
      validateEvidencePath(artifactPath, { projectRoot }),
    ).resolves.toBe(artifactPath);
    await expect(
      validateEvidencePath(externalTemp, { projectRoot }),
    ).resolves.toBe(externalTemp);
  });

  it.each([
    "README.md",
    "config/core-performance-budgets.json",
    "config/core-performance-budget-exceptions.json",
    "dist/result.json",
    "src/result.json",
  ])("rejects unsafe project evidence target %s", async (relativeTarget) => {
    const projectRoot = await evidenceFixture();
    const target = path.join(projectRoot, relativeTarget);
    await expect(
      writeCorePerformanceEvidence(
        target,
        { evidenceKind: "core-performance", schemaVersion: 1 },
        { projectRoot },
      ),
    ).rejects.toThrow(/evidence path/u);
    expect(await readFile(path.join(projectRoot, "README.md"), "utf8")).toBe(
      "keep\n",
    );
  });

  it("rejects an artifact symlink that aliases the budget config", async () => {
    const projectRoot = await evidenceFixture();
    const artifactDir = path.join(projectRoot, "artifacts/core-performance");
    await mkdir(artifactDir, { recursive: true });
    const target = path.join(artifactDir, "linked.json");
    await symlink(
      path.join(projectRoot, "config/core-performance-budgets.json"),
      target,
    );
    await expect(
      writeCorePerformanceEvidence(
        target,
        {
          evidenceKind: "core-performance",
          schemaVersion: 1,
        },
        { projectRoot },
      ),
    ).rejects.toThrow(/symlink/u);
    expect(
      await readFile(
        path.join(projectRoot, "config/core-performance-budgets.json"),
        "utf8",
      ),
    ).toBe("{}\n");
  });

  it("rejects an artifact ancestor symlink escape", async () => {
    const projectRoot = await evidenceFixture();
    const artifactDir = path.join(projectRoot, "artifacts/core-performance");
    await mkdir(artifactDir, { recursive: true });
    await symlink(
      path.join(projectRoot, "config"),
      path.join(artifactDir, "alias"),
    );
    await expect(
      writeCorePerformanceEvidence(
        path.join(artifactDir, "alias/escaped.json"),
        { evidenceKind: "core-performance", schemaVersion: 1 },
        { projectRoot },
      ),
    ).rejects.toThrow(/symlink/u);
  });

  it("writes owned JSON evidence atomically and refuses an unowned file", async () => {
    const projectRoot = await evidenceFixture();
    const target = path.join(
      projectRoot,
      "artifacts/core-performance/result.json",
    );
    await writeCorePerformanceEvidence(
      target,
      { evidenceKind: "core-performance", schemaVersion: 1, status: "passed" },
      { projectRoot },
    );
    expect(JSON.parse(await readFile(target, "utf8"))).toMatchObject({
      evidenceKind: "core-performance",
      status: "passed",
    });
    await writeFile(target, "not owned\n");
    await expect(
      writeCorePerformanceEvidence(
        target,
        { evidenceKind: "core-performance", schemaVersion: 1 },
        { projectRoot },
      ),
    ).rejects.toThrow(/owned core performance evidence/u);
  });
});

describe("core performance preview lifecycle", () => {
  it("always tears down the owned preview server on runner failure", async () => {
    const child = new FakeChild();
    const spawnImpl = vi.fn(() => child);
    const fetchImpl = vi.fn(async () => ({ ok: true }));

    await expect(
      withPreviewServer(
        async () => {
          throw new Error("browser failed");
        },
        {
          projectRoot: "/repo",
          port: 45678,
          spawnImpl,
          fetchImpl,
          startupTimeoutMs: 100,
          pollIntervalMs: 1,
        },
      ),
    ).rejects.toThrow("browser failed");
    expect(spawnImpl).toHaveBeenCalledOnce();
    const spawnCall = (spawnImpl.mock.calls as unknown[][])[0];
    expect(spawnCall[2]).toMatchObject({
      detached: process.platform !== "win32",
    });
    expect(child.killed).toBe(true);
  });

  it("kills the server when startup exits or readiness times out", async () => {
    const child = new FakeChild();
    const spawnImpl = vi.fn(() => child);
    const fetchImpl = vi.fn(async () => {
      throw new Error("not ready");
    });
    const promise = withPreviewServer(async () => "never", {
      projectRoot: "/repo",
      port: 45679,
      spawnImpl,
      fetchImpl,
      startupTimeoutMs: 10,
      pollIntervalMs: 1,
    });
    await expect(promise).rejects.toThrow(/preview server/u);
    expect(child.killed).toBe(true);
  });
});

describe("core performance injected orchestration", () => {
  it("permits fewer samples only through the injected runner API", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "core-performance-"));
    await mkdir(path.join(projectRoot, "config"), { recursive: true });
    await mkdir(path.join(projectRoot, "dist"), { recursive: true });
    await writeFile(
      path.join(projectRoot, "config", "core-performance-budgets.json"),
      await readFile("config/core-performance-budgets.json", "utf8"),
    );
    await writeFile(
      path.join(
        projectRoot,
        "config",
        "core-performance-budget-exceptions.json",
      ),
      JSON.stringify({ schemaVersion: 1, exceptions: [] }),
    );
    await writeFile(path.join(projectRoot, "dist", "2048.html"), "home");
    const runBrowser = vi.fn(async ({ sampleCount }) => ({
      browserVersion: "Chromium test",
      samples: Array.from({ length: sampleCount }, (_value, index) => ({
        scenario: "injected",
        iteration: index + 1,
        cache: "cold",
        metrics: {},
        proofs: ["injected"],
        errors: [],
      })),
    }));
    const withServer = vi.fn(async (callback) =>
      callback({ baseUrl: "http://127.0.0.1:4173" }),
    );

    const payload = await runCorePerformanceGate({
      projectRoot,
      measureOnly: true,
      evidencePath: path.join(
        projectRoot,
        "artifacts/core-performance/evidence.json",
      ),
      sampleCountOverrideForTests: 2,
      runBrowser,
      withServer,
      candidateSha: "candidate",
      writeStdout: false,
    });

    expect(runBrowser).toHaveBeenCalledWith(
      expect.objectContaining({ sampleCount: 2 }),
    );
    expect(payload.executionProfile).toBe("reference");
    expect(payload.samples).toHaveLength(2);
    expect(payload.status).toBe("failed");
    expect(payload.violations).toContainEqual(
      expect.objectContaining({ code: "missing-performance-samples" }),
    );
    expect(() =>
      parseCorePerformanceCliOptions(
        ["--samples=2", "--baseline-ref=HEAD"],
        {},
      ),
    ).toThrow(/unknown core performance option/u);
  });

  it("changes when file content changes without changing file length", async () => {
    const root = await mkdtemp(
      path.join(tmpdir(), "core-performance-dist-content-"),
    );
    const target = path.join(root, "same-size.txt");
    await writeFile(target, "alpha");
    const before = await fingerprintDistManifest(root);
    await writeFile(target, "bravo");
    const after = await fingerprintDistManifest(root);
    expect(after.totalBytes).toBe(before.totalBytes);
    expect(after.sha256).not.toBe(before.sha256);
    expect(after.algorithm).toMatch(/content/u);
  });

  it.skipIf(process.platform === "win32")(
    "rejects symlink files and directories instead of omitting served content",
    async () => {
      const fileRoot = await mkdtemp(
        path.join(tmpdir(), "core-performance-dist-file-link-"),
      );
      const fileTarget = path.join(fileRoot, "target.js");
      await writeFile(fileTarget, "export default 1;");
      await symlink(fileTarget, path.join(fileRoot, "runtime.js"), "file");
      await expect(fingerprintDistManifest(fileRoot)).rejects.toThrow(
        /symbolic links.*runtime\.js/u,
      );

      const directoryRoot = await mkdtemp(
        path.join(tmpdir(), "core-performance-dist-directory-link-"),
      );
      const assets = path.join(directoryRoot, "assets");
      await mkdir(assets);
      await writeFile(path.join(assets, "app.js"), "export default 2;");
      await symlink(assets, path.join(directoryRoot, "linked-assets"), "dir");
      await expect(fingerprintDistManifest(directoryRoot)).rejects.toThrow(
        /symbolic links.*linked-assets/u,
      );
    },
  );

  it("preserves known stage context and completed samples in failure evidence", () => {
    const completed = [
      {
        scenario: "homeCold",
        iteration: 1,
        cache: "cold",
        metrics: { fcpMs: 100 },
        proofs: ["fixture"],
        errors: [],
      },
    ];
    const error = withCorePerformanceContext(new Error("play sample failed"), {
      stage: "browser-sampling",
      executionProfile: "github-actions-linux-x64",
      profile: { viewport: { width: 1365, height: 768 } },
      policies: { percentile: "p75" },
      candidateSha: "candidate-sha",
      distManifestFingerprint: {
        algorithm: "sha256",
        sha256: "abc",
        fileCount: 1,
        totalBytes: 5,
      },
      browserVersion: "Chromium fixture",
      samples: completed,
      scenario: "playCold",
      iteration: 2,
      authorization: "must-not-leak",
    });
    const payload = createCorePerformanceFailurePayload(error, {
      measureOnly: false,
    });
    expect(payload).toMatchObject({
      status: "failed",
      stage: "browser-sampling",
      executionProfile: "github-actions-linux-x64",
      profile: { viewport: { width: 1365, height: 768 } },
      policies: { percentile: "p75" },
      candidateSha: "candidate-sha",
      distManifestFingerprint: { sha256: "abc" },
      browserVersion: "Chromium fixture",
      samples: completed,
      failedScenario: "playCold",
      failedIteration: 2,
    });
    expect(JSON.stringify(payload)).not.toContain("must-not-leak");
  });

  it("propagates runner-known context into partial browser failure evidence", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "core-performance-partial-"),
    );
    await mkdir(path.join(projectRoot, "config"), { recursive: true });
    await mkdir(path.join(projectRoot, "dist"), { recursive: true });
    await writeFile(
      path.join(projectRoot, "config/core-performance-budgets.json"),
      await readFile("config/core-performance-budgets.json", "utf8"),
    );
    await writeFile(
      path.join(projectRoot, "config/core-performance-budget-exceptions.json"),
      JSON.stringify({ schemaVersion: 1, exceptions: [] }),
    );
    await writeFile(path.join(projectRoot, "dist/2048.html"), "fixture");
    const completed = [{ scenario: "homeCold", iteration: 1, errors: [] }];
    let failure: unknown = null;
    try {
      await runCorePerformanceGate({
        projectRoot,
        measureOnly: true,
        evidencePath: path.join(
          projectRoot,
          "artifacts/core-performance/partial.json",
        ),
        candidateSha: "candidate-from-runner",
        writeStdout: false,
        withServer: async (callback: Function) =>
          callback({ baseUrl: "http://127.0.0.1:4173" }),
        runBrowser: async () => {
          throw withCorePerformanceContext(new Error("sample two failed"), {
            stage: "browser-sampling",
            browserVersion: "Chromium partial",
            samples: completed,
            scenario: "playCold",
            iteration: 2,
          });
        },
      });
    } catch (error) {
      failure = error;
    }
    const payload = createCorePerformanceFailurePayload(failure, {
      measureOnly: true,
    });
    expect(payload).toMatchObject({
      profile: expect.any(Object),
      policies: expect.any(Object),
      candidateSha: "candidate-from-runner",
      distManifestFingerprint: expect.objectContaining({ fileCount: 1 }),
      browserVersion: "Chromium partial",
      samples: completed,
      failedScenario: "playCold",
      failedIteration: 2,
    });
  });

  it("fingerprints path, bytes, count, and total size deterministically", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "core-performance-dist-"));
    await writeFile(path.join(root, "b.txt"), "bb");
    await writeFile(path.join(root, "a.txt"), "a");
    const first = await fingerprintDistManifest(root);
    const second = await fingerprintDistManifest(root);
    expect(first).toEqual(second);
    expect(first.fileCount).toBe(2);
    expect(first.totalBytes).toBe(3);
    expect(first.sha256).toMatch(/^[a-f0-9]{64}$/u);
  });
});
