import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import {
  ACTIVE_RANKED_SESSION_FIXTURE,
  AUTH_TOKEN,
  LEGACY_AUTH_TOKEN,
  MODE_KEY,
  PREFETCH_RANKED_SESSION_FIXTURE,
  createDeterministicApiAudit,
  installDeterministicContext,
  resolveDeterministicApiRequest,
} from "../../scripts/core-performance/browser-api.mjs";
import { waitForActiveRescueResponse } from "../../scripts/core-performance/browser.mjs";
import {
  attachPageErrors,
  createNetworkCollector,
  validateLoadMetricSnapshot,
  waitForLcpStability,
} from "../../scripts/core-performance/browser-metrics.mjs";
import {
  validateRankedFixtureProof,
  validateReplayStepProof,
  validateRestoreProof,
} from "../../scripts/core-performance/browser-proofs.mjs";

class FakeSession extends EventEmitter {}
class FakePage extends EventEmitter {}

function request(overrides: Record<string, unknown> = {}) {
  return {
    url: `http://127.0.0.1:4173/api/auth/refresh`,
    method: "POST",
    headers: {
      authorization: `Bearer ${LEGACY_AUTH_TOKEN}`,
      "content-type": "application/json",
    },
    postData: JSON.stringify({ token: LEGACY_AUTH_TOKEN }),
    expectedOrigin: "http://127.0.0.1:4173",
    ...overrides,
  };
}

describe("core performance deterministic API contract", () => {
  it("accepts only exact routes, methods, auth policy, and critical bodies", () => {
    expect(resolveDeterministicApiRequest(request())).toMatchObject({
      routeId: "auth-refresh",
      status: 200,
    });
    expect(
      resolveDeterministicApiRequest(
        request({
          url: "http://127.0.0.1:4173/api/access/me",
          method: "GET",
          headers: { authorization: `Bearer ${AUTH_TOKEN}` },
          postData: null,
        }),
      ),
    ).toMatchObject({ routeId: "access-me" });
    expect(
      resolveDeterministicApiRequest(
        request({
          url: "http://127.0.0.1:4173/api/me/palette-sync/bootstrap",
          method: "GET",
          headers: { authorization: `Bearer ${AUTH_TOKEN}` },
          postData: null,
        }),
      ),
    ).toMatchObject({ routeId: "palette-bootstrap" });
    expect(
      resolveDeterministicApiRequest(
        request({
          url: `http://127.0.0.1:4173/api/user/42/records?page_size=500&limit=500&page=1&sort_by=score&order=desc&status=active&mode=standard_no_undo&mode_key=${MODE_KEY}`,
          method: "GET",
          headers: { authorization: `Bearer ${AUTH_TOKEN}` },
          postData: null,
        }),
      ),
    ).toMatchObject({ routeId: "user-records", payload: { data: [] } });
    expect(
      resolveDeterministicApiRequest(
        request({
          url: `http://127.0.0.1:4173/api/leaderboard?limit=500&period=all&mode_key=${MODE_KEY}&mode=standard_no_undo`,
          method: "GET",
          headers: {},
          postData: null,
        }),
      ),
    ).toMatchObject({ routeId: "leaderboard", payload: { data: [] } });
    expect(
      resolveDeterministicApiRequest(
        request({
          url: `http://127.0.0.1:4173/api/leaderboard?limit=10&period=all&mode_key=${MODE_KEY}&mode=standard_no_undo`,
          method: "GET",
          headers: {},
          postData: null,
        }),
      ),
    ).toMatchObject({ routeId: "leaderboard", payload: { data: [] } });
    expect(
      resolveDeterministicApiRequest(
        request({
          url: `http://127.0.0.1:4173/api/rescue-offers/active?mode_key=${MODE_KEY}`,
          method: "GET",
          headers: { authorization: `Bearer ${AUTH_TOKEN}` },
          postData: null,
        }),
      ),
    ).toMatchObject({
      routeId: "active-rescue-offer",
      payload: { data: [] },
    });
    expect(
      resolveDeterministicApiRequest(
        request({
          url: "http://127.0.0.1:4173/api/ranked-session/start",
          method: "POST",
          headers: {
            authorization: `Bearer ${AUTH_TOKEN}`,
            "content-type": "application/json",
          },
          postData: JSON.stringify({
            mode_key: MODE_KEY,
            attempt_schema_version: 1,
            spawn_sequence_version: 2,
          }),
        }),
      ),
    ).toMatchObject({
      routeId: "ranked-session-start",
      payload: {
        data: expect.objectContaining({
          mode_key: MODE_KEY,
          mode_bucket: "standard-4x4-no-undo",
          seed: PREFETCH_RANKED_SESSION_FIXTURE.seed,
          ranked_session_token:
            PREFETCH_RANKED_SESSION_FIXTURE.ranked_session_token,
          issued_at: expect.any(Number),
          exp: expect.any(Number),
          spawn_sequence_version: 2,
          status: "created",
          record_era: "official_v1",
          owner_user_id: "42",
        }),
      },
    });
    expect(
      resolveDeterministicApiRequest(
        request({
          url: "http://127.0.0.1:4173/api/ranked-session/attempt",
          method: "POST",
          headers: {
            authorization: `Bearer ${AUTH_TOKEN}`,
            "content-type": "application/json",
          },
          postData: JSON.stringify({
            event: "begin",
            mode_key: MODE_KEY,
            ranked_session_token:
              ACTIVE_RANKED_SESSION_FIXTURE.ranked_session_token,
            replay_string: "fixture-replay",
            attempt_schema_version: 1,
          }),
        }),
      ),
    ).toMatchObject({ routeId: "ranked-session-attempt" });
  });

  it("rejects unknown routes and contract mismatches instead of returning generic success", () => {
    expect(() =>
      resolveDeterministicApiRequest(
        request({ url: "http://127.0.0.1:4173/api/unknown" }),
      ),
    ).toThrow(/unknown deterministic API route/u);
    expect(() =>
      resolveDeterministicApiRequest(request({ method: "GET" })),
    ).toThrow(/method/u);
    expect(() =>
      resolveDeterministicApiRequest(request({ headers: {} })),
    ).toThrow(/Authorization/u);
    expect(() =>
      resolveDeterministicApiRequest(request({ postData: "{}" })),
    ).toThrow(/body/u);
    expect(() =>
      resolveDeterministicApiRequest(
        request({
          url: `http://127.0.0.1:4173/api/ranked-checkpoint?mode_key=${MODE_KEY}`,
          method: "GET",
          headers: { authorization: `Bearer ${AUTH_TOKEN}` },
          postData: null,
        }),
      ),
    ).toThrow(/unknown deterministic API route/u);
    expect(() =>
      resolveDeterministicApiRequest(
        request({
          url: `https://unexpected.example/api/leaderboard?limit=10&period=all&mode_key=${MODE_KEY}&mode=standard_no_undo`,
          method: "GET",
          headers: {},
          postData: null,
        }),
      ),
    ).toThrow(/origin mismatch/u);
    expect(() =>
      resolveDeterministicApiRequest(
        request({
          url: `http://127.0.0.1:4173/api/leaderboard?limit=50&period=all&mode_key=${MODE_KEY}&mode=standard_no_undo`,
          method: "GET",
          headers: {},
          postData: null,
        }),
      ),
    ).toThrow(/limit|query/u);
    expect(() =>
      resolveDeterministicApiRequest(
        request({
          url: `http://127.0.0.1:4173/api/leaderboard?limit=500&period=all&mode_key=${MODE_KEY}&mode=standard_no_undo`,
          method: "GET",
          headers: { authorization: `Bearer ${AUTH_TOKEN}` },
          postData: null,
        }),
      ),
    ).toThrow(/must not send Authorization/u);
    expect(() =>
      resolveDeterministicApiRequest(
        request({
          url: `http://127.0.0.1:4173/api/rescue-offers/active?mode_key=${MODE_KEY}`,
          method: "GET",
          headers: {},
          postData: null,
        }),
      ),
    ).toThrow(/Authorization/u);
    expect(() =>
      resolveDeterministicApiRequest(
        request({
          url: "http://127.0.0.1:4173/api/rescue-offers/active?mode_key=wrong-mode",
          method: "GET",
          headers: { authorization: `Bearer ${AUTH_TOKEN}` },
          postData: null,
        }),
      ),
    ).toThrow(/query/u);
    expect(() =>
      resolveDeterministicApiRequest(
        request({
          url: `http://127.0.0.1:4173/api/user/7/records?page_size=500&limit=500&page=1&sort_by=score&order=desc&status=active&mode=standard_no_undo&mode_key=${MODE_KEY}`,
          method: "GET",
          headers: { authorization: `Bearer ${AUTH_TOKEN}` },
          postData: null,
        }),
      ),
    ).toThrow(/unknown deterministic API route/u);
    expect(() =>
      resolveDeterministicApiRequest(
        request({
          url: "http://127.0.0.1:4173/api/ranked-session/start",
          headers: {
            authorization: `Bearer ${AUTH_TOKEN}`,
            "content-type": "application/json",
          },
          postData: JSON.stringify({
            mode_key: MODE_KEY,
            attempt_schema_version: 1,
            spawn_sequence_version: 1,
          }),
        }),
      ),
    ).toThrow(/body/u);
  });

  it("records rejected route contracts and uses the exact public profile storage key", async () => {
    const audit = createDeterministicApiAudit();
    const fulfill = vi.fn();
    const addInitScript = vi.fn();
    const context = {
      route: vi.fn(async (_pattern: string, handler: Function) =>
        handler({
          request: () => ({
            url: () => "http://127.0.0.1:4173/api/unknown",
            method: () => "GET",
            headers: () => ({ authorization: `Bearer ${AUTH_TOKEN}` }),
            postData: () => null,
          }),
          fulfill,
        }),
      ),
      addInitScript,
    };
    const deterministicContextOptions = {
      audit,
      baseUrl: "http://127.0.0.1:4173",
    } as unknown as NonNullable<
      Parameters<typeof installDeterministicContext>[1]
    >;
    await installDeterministicContext(
      context as never,
      deterministicContextOptions,
    );
    expect(fulfill).toHaveBeenCalledWith(
      expect.objectContaining({ status: 599 }),
    );
    expect(audit.errors).toContainEqual(
      expect.stringMatching(/unknown deterministic API route/u),
    );
    const source = String(addInitScript.mock.calls[0][0]);
    expect(source).toContain("2048_public_profile_id_v1");
    expect(source).not.toContain("2048_auth_publicProfileId_v1");
  });
});

describe("core performance behavior proof validators", () => {
  it("requires exact full restore state including move history", () => {
    const expected = {
      board: [[2, 0]],
      score: 4,
      moveHistory: [{ direction: 1, spawned: [0, 0] }],
    };
    expect(() =>
      validateRestoreProof(expected, structuredClone(expected)),
    ).not.toThrow();
    expect(() =>
      validateRestoreProof(expected, {
        ...expected,
        moveHistory: [...expected.moveHistory, { direction: 2 }],
      }),
    ).toThrow(/move history/u);
    expect(() =>
      validateRestoreProof(expected, {
        ...expected,
        moveHistory: [{ direction: 3 }],
      }),
    ).toThrow(/move history/u);
  });

  it("requires replay to execute exactly the first step and rejects no-op/end-state proofs", () => {
    const valid = {
      imported: true,
      total: 2,
      beforeIndex: 0,
      afterIndex: 1,
      beforeBoard: [[2, 0]],
      afterBoard: [[0, 2]],
      firstAction: [1],
      executedAction: [1],
    };
    expect(() => validateReplayStepProof(valid)).not.toThrow();
    expect(() =>
      validateReplayStepProof({ ...valid, beforeIndex: 1, afterIndex: 2 }),
    ).toThrow(/0 to 1/u);
    expect(() =>
      validateReplayStepProof({ ...valid, afterBoard: valid.beforeBoard }),
    ).toThrow(/board/u);
    expect(() =>
      validateReplayStepProof({ ...valid, executedAction: [2] }),
    ).toThrow(/first action/u);
  });

  it("requires manager active-session identity and accepted V2 prefetch identity", () => {
    expect(() =>
      validateRankedFixtureProof({
        manager: {
          challengeId: ACTIVE_RANKED_SESSION_FIXTURE.challenge_id,
          initialSeed: ACTIVE_RANKED_SESSION_FIXTURE.seed,
          rankedSessionToken:
            ACTIVE_RANKED_SESSION_FIXTURE.ranked_session_token,
          spawnSequenceVersion: 2,
        },
        active: ACTIVE_RANKED_SESSION_FIXTURE,
        prefetched: PREFETCH_RANKED_SESSION_FIXTURE,
        prefetchFailureReason: "",
      }),
    ).not.toThrow();
    expect(() =>
      validateRankedFixtureProof({
        manager: {
          challengeId: "wrong",
          initialSeed: 0,
          rankedSessionToken: "wrong",
          spawnSequenceVersion: 1,
        },
        active: ACTIVE_RANKED_SESSION_FIXTURE,
        prefetched: null,
        prefetchFailureReason: "spawn_sequence_version_mismatch",
      }),
    ).toThrow(/ranked fixture/u);
  });
});

describe("core performance fail-closed measurement", () => {
  it("waits for only the exact same-origin active rescue response", async () => {
    const response = {
      url: () =>
        `http://127.0.0.1:4173/api/rescue-offers/active?mode_key=${MODE_KEY}`,
      request: () => ({ method: () => "GET" }),
      status: () => 200,
    };
    const page = {
      waitForResponse: vi.fn(
        async (predicate: (value: typeof response) => boolean, options) => {
          expect(options).toEqual({ timeout: 5_000 });
          expect(
            predicate({
              ...response,
              url: () =>
                `http://127.0.0.1:41730/api/rescue-offers/active?mode_key=${MODE_KEY}`,
            }),
          ).toBe(false);
          expect(predicate(response)).toBe(true);
          return response;
        },
      ),
    };
    await expect(
      waitForActiveRescueResponse(page as never, "http://127.0.0.1:4173"),
    ).resolves.toBe(response);
  });

  it("rejects missing navigation, FCP, and LCP observer state", () => {
    const valid = {
      navigation: { requestStart: 1, responseStart: 2, decodedBodySize: 10 },
      fcpMs: 3,
      lcp: { supported: true, entryCount: 1, lcpMs: 4, quietForMs: 500 },
      cls: 0,
      longTaskTotalMs: 0,
      longTaskMaxMs: 0,
      decodedBodyBytes: 10,
    };
    expect(validateLoadMetricSnapshot(valid)).toMatchObject({
      ttfbMs: 1,
      fcpMs: 3,
      lcpMs: 4,
    });
    expect(() =>
      validateLoadMetricSnapshot({ ...valid, navigation: null }),
    ).toThrow(/navigation/u);
    expect(() => validateLoadMetricSnapshot({ ...valid, fcpMs: null })).toThrow(
      /FCP/u,
    );
    expect(() =>
      validateLoadMetricSnapshot({
        ...valid,
        lcp: { supported: true, entryCount: 0, lcpMs: 0, quietForMs: 500 },
      }),
    ).toThrow(/LCP/u);
  });

  it("waits for late network completion and counts redirects/encoded bytes exactly once", async () => {
    const session = new FakeSession();
    const collector = createNetworkCollector(
      session as never,
      "http://127.0.0.1:4173",
    );
    collector.start();
    session.emit("Network.requestWillBeSent", {
      requestId: "1",
      request: { url: "http://127.0.0.1:4173/a.js" },
    });
    const waiting = collector.waitForIdle({
      quietWindowMs: 5,
      timeoutMs: 100,
      pollIntervalMs: 1,
    });
    setTimeout(
      () =>
        session.emit("Network.loadingFinished", {
          requestId: "1",
          encodedDataLength: 10,
        }),
      10,
    );
    await expect(waiting).resolves.toBeUndefined();
    session.emit("Network.loadingFinished", {
      requestId: "1",
      encodedDataLength: 10,
    });
    session.emit("Network.requestWillBeSent", {
      requestId: "2",
      request: { url: "http://127.0.0.1:4173/final.js" },
      redirectResponse: {
        url: "http://127.0.0.1:4173/redirect.js",
        encodedDataLength: 5,
      },
    });
    session.emit("Network.loadingFinished", {
      requestId: "2",
      encodedDataLength: 7,
    });
    await collector.waitForIdle({
      quietWindowMs: 1,
      timeoutMs: 50,
      pollIntervalMs: 1,
    });
    expect(collector.snapshot()).toEqual({
      requestCount: 3,
      transferBytes: 22,
    });
  });

  it("fails snapshot and idle wait when tracked requests remain unfinished", async () => {
    const session = new FakeSession();
    const collector = createNetworkCollector(
      session as never,
      "http://127.0.0.1:4173",
    );
    collector.start();
    session.emit("Network.requestWillBeSent", {
      requestId: "late",
      request: { url: "http://127.0.0.1:4173/late.js" },
    });
    expect(() => collector.snapshot()).toThrow(/unfinished/u);
    await expect(
      collector.waitForIdle({
        quietWindowMs: 1,
        timeoutMs: 5,
        pollIntervalMs: 1,
      }),
    ).rejects.toThrow(/unfinished/u);
  });

  it("tracks every HTTP(S) request and rejects cross-origin or similar-port traffic", async () => {
    const session = new FakeSession();
    const collector = createNetworkCollector(
      session as never,
      "http://127.0.0.1:4173",
    );
    collector.start();
    session.emit("Network.requestWillBeSent", {
      requestId: "external",
      request: { url: "https://unexpected.example/heavy.js" },
    });
    session.emit("Network.loadingFinished", {
      requestId: "external",
      encodedDataLength: 99,
    });
    expect(() => collector.snapshot()).toThrow(/cross-origin/u);

    collector.start();
    session.emit("Network.requestWillBeSent", {
      requestId: "similar-port",
      request: { url: "http://127.0.0.1:41730/hanging.js" },
    });
    await expect(
      collector.waitForIdle({
        quietWindowMs: 1,
        timeoutMs: 5,
        pollIntervalMs: 1,
      }),
    ).rejects.toThrow(/unfinished/u);
    expect(() => collector.snapshot()).toThrow(/unfinished/u);
  });

  it("fails API 500 and critical aborts, allowing only exact navigation aborts", () => {
    const page = new FakePage();
    const errors = attachPageErrors(page as never, "http://127.0.0.1:4173");
    page.emit("response", {
      url: () => "http://127.0.0.1:4173/api/access/me",
      status: () => 500,
    });
    page.emit("request", {
      url: () => "https://unexpected.example/external.js",
      method: () => "GET",
    });
    page.emit("response", {
      url: () => "https://unexpected.example/api/data",
      status: () => 500,
    });
    page.emit("requestfailed", {
      url: () => "http://127.0.0.1:4173/assets/app.js",
      method: () => "GET",
      resourceType: () => "script",
      isNavigationRequest: () => false,
      failure: () => ({ errorText: "net::ERR_ABORTED" }),
    });
    page.emit("requestfailed", {
      url: () =>
        "http://127.0.0.1:4173/play.html?mode_key=standard_4x4_pow2_no_undo",
      method: () => "GET",
      resourceType: () => "document",
      isNavigationRequest: () => true,
      failure: () => ({ errorText: "net::ERR_ABORTED" }),
    });
    expect(errors).toContainEqual(
      expect.stringMatching(/unexpected-cross-origin-request/u),
    );
    expect(errors).toContainEqual(
      expect.stringMatching(/unexpected\.example\/api\/data/u),
    );
    expect(errors).toContainEqual(
      expect.stringMatching(/critical-response: 500/u),
    );
    expect(errors).toContainEqual(expect.stringMatching(/assets\/app\.js/u));
    expect(errors.filter((item) => item.includes("play.html"))).toEqual([]);
  });

  it("waits through a late LCP update until the bounded quiet window", async () => {
    const snapshots = [
      { supported: true, entryCount: 1, lcpMs: 100, quietForMs: 100 },
      { supported: true, entryCount: 2, lcpMs: 250, quietForMs: 50 },
      { supported: true, entryCount: 2, lcpMs: 250, quietForMs: 500 },
    ];
    const read = vi.fn(
      async () =>
        snapshots.shift() || {
          supported: true,
          entryCount: 2,
          lcpMs: 250,
          quietForMs: 500,
        },
    );
    await expect(
      waitForLcpStability(read, {
        quietWindowMs: 500,
        timeoutMs: 100,
        pollIntervalMs: 1,
      }),
    ).resolves.toMatchObject({ lcpMs: 250 });
    expect(read).toHaveBeenCalledTimes(3);
  });
});
