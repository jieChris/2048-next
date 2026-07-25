import { describe, expect, it, vi } from "vitest";

import {
  AccountSessionEnvelopeError,
  loadAccountSession,
  parseAccountSessionEnvelope,
  saveAccountSession,
  serializeAccountSessionEnvelope,
  updateAccountSession,
  type AccountSessionV1,
} from "../../mobile/src/auth/account-session";
import {
  classifyMobileAuthIssue,
  MobileAuthCoordinator,
} from "../../mobile/src/auth/auth-flow";
import {
  createMobileAuthService,
  DEFAULT_MOBILE_AUTH_TIMEOUT_MS,
  MobileAuthError,
  normalizeMobileApiBase,
  resolveMobileAuthApiBase,
  validateMobileOnlinePrivacy,
  type MobileAuthService,
} from "../../mobile/src/auth/auth-service";
import {
  MOBILE_PRODUCTION_API_BASE,
  resolveMobileBuildFlags,
} from "../../mobile/src/app/build-flags";
import { createMemorySecureStorage } from "../../mobile/src/platform/secure-storage";
import {
  createPreviewPrivacyRecord,
  type PreviewPrivacyRecord,
} from "../../mobile/src/privacy";
import type { FetchLike } from "../../src/services/api-client";

const user = {
  id: 7,
  email: "player@example.com",
  nickname: "Player",
  role: "player",
};

function session(
  accessToken = "access-token-1",
  expiresAtEpochSeconds = 2_000_000_000,
): AccountSessionV1 {
  return {
    version: 1,
    accessToken,
    expiresAtEpochSeconds,
    user,
    persistentIdentity: { userId: 7, establishedAtMs: 1_000 },
    challengeRefs: [
      {
        challengeId: "challenge-1",
        rankedSessionId: "ranked-session-1",
        token: "ranked-token-1",
        expiresAtEpochSeconds: null,
      },
    ],
  };
}

function response(status: number, body: Record<string, unknown>) {
  return {
    status,
    statusText: status === 200 ? "OK" : "Unauthorized",
    json: () => Promise.resolve(body),
  };
}

function authBody(token: string) {
  return {
    success: true,
    token,
    expiresAt: 2_000_000_001,
    ttl: 3_600,
    user,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("mobile account session envelope", () => {
  it("round-trips the only versioned Keystore envelope", async () => {
    const storage = createMemorySecureStorage();
    const expected = session();

    const serialized = serializeAccountSessionEnvelope(expected);
    expect(parseAccountSessionEnvelope(serialized)).toEqual(expected);
    await saveAccountSession(storage, expected);
    await expect(loadAccountSession(storage)).resolves.toEqual(expected);
  });

  it.each([
    "not-json",
    JSON.stringify({ ...session(), version: 2 }),
    JSON.stringify({ ...session(), unexpected: true }),
    JSON.stringify({
      ...session(),
      persistentIdentity: { userId: 8, establishedAtMs: 1_000 },
    }),
    JSON.stringify({
      ...session(),
      challengeRefs: [session().challengeRefs[0], session().challengeRefs[0]],
    }),
    JSON.stringify({
      ...session(),
      challengeRefs: Array.from({ length: 4 }, (_, index) => ({
        challengeId: `challenge-${index}`,
        rankedSessionId: `ranked-session-${index}`,
        token: `ranked-token-${index}`,
        expiresAtEpochSeconds: null,
      })),
    }),
  ])("fails closed for a corrupt envelope", (serialized) => {
    expect(() => parseAccountSessionEnvelope(serialized)).toThrow(
      expect.objectContaining({
        name: "AccountSessionEnvelopeError",
        code: "invalid_account_session_envelope",
      }),
    );
    expect(() => parseAccountSessionEnvelope(serialized)).toThrow(
      AccountSessionEnvelopeError,
    );
  });
});

describe("mobile auth service", () => {
  it("uses only the explicitly injected API base for every public auth route", async () => {
    const urls: string[] = [];
    const fetchLike: FetchLike = vi.fn(async (url) => {
      urls.push(url);
      if (url.endsWith("/login")) return response(200, authBody("login-token"));
      if (url.endsWith("/register/verify")) {
        return response(200, authBody("register-token"));
      }
      if (url.endsWith("/user/me")) {
        return response(200, { success: true, user });
      }
      if (url.endsWith("/auth/refresh")) {
        return response(200, authBody("refresh-token"));
      }
      if (url.endsWith("/account/deletion/request")) {
        return response(200, {
          success: true,
          data: {
            status: "pending_deletion",
            requestedAt: "2026-07-25T00:00:00.000Z",
            dueAt: "2026-07-28T00:00:00.000Z",
            maskedEmail: "p***@example.com",
          },
        });
      }
      return response(200, { success: true });
    });
    const service = createMobileAuthService({
      apiBase: "https://api.example.test/mobile-api/",
      privacy: createPreviewPrivacyRecord("online", 1),
      secureStorage: createMemorySecureStorage(),
      fetchLike,
      now: () => 1_000,
    });

    await service.login({ email: user.email, password: "Password123!" });
    await service.registerStart({
      email: user.email,
      password: "Password123!",
      nickname: user.nickname,
    });
    await service.registerVerify({ email: user.email, code: "123456" });
    await service.passwordResetStart({ email: user.email });
    await service.passwordResetVerify({
      email: user.email,
      code: "123456",
      newPassword: "NextPassword123!",
    });
    await service.currentUser();
    await service.refresh();
    await service.requestAccountDeletion({ password: "Password123!" });

    expect(urls).toEqual([
      "https://api.example.test/mobile-api/login",
      "https://api.example.test/mobile-api/register/start",
      "https://api.example.test/mobile-api/register/verify",
      "https://api.example.test/mobile-api/password/reset/start",
      "https://api.example.test/mobile-api/password/reset/verify",
      "https://api.example.test/mobile-api/user/me",
      "https://api.example.test/mobile-api/auth/refresh",
      "https://api.example.test/mobile-api/account/deletion/request",
    ]);
    expect(
      urls.every((url) => url.startsWith("https://api.example.test/")),
    ).toBe(true);
  });

  it("refreshes an authenticated 401 at most once and preserves challenge refs", async () => {
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, session("expired-token"));
    const calls: Array<{ url: string; authorization: string | null }> = [];
    const fetchLike: FetchLike = vi.fn(async (url, init) => {
      const authorization = new Headers(init?.headers).get("Authorization");
      calls.push({ url, authorization });
      if (url.endsWith("/auth/refresh")) {
        return response(200, authBody("refreshed-token"));
      }
      return response(401, { success: false, code: "UNAUTHORIZED" });
    });
    const service = createMobileAuthService({
      apiBase: "https://api.example.test/api",
      privacy: createPreviewPrivacyRecord("online", 1),
      secureStorage: storage,
      fetchLike,
    });

    await expect(service.currentUser()).rejects.toMatchObject({
      name: "MobileAuthError",
      code: "http_error",
      status: 401,
      serverCode: "UNAUTHORIZED",
    });
    expect(calls).toEqual([
      {
        url: "https://api.example.test/api/user/me",
        authorization: "Bearer expired-token",
      },
      {
        url: "https://api.example.test/api/auth/refresh",
        authorization: "Bearer expired-token",
      },
      {
        url: "https://api.example.test/api/user/me",
        authorization: "Bearer refreshed-token",
      },
    ]);
    expect(
      calls.filter((call) => call.url.endsWith("/auth/refresh")),
    ).toHaveLength(1);
    await expect(loadAccountSession(storage)).resolves.toMatchObject({
      accessToken: "refreshed-token",
      persistentIdentity: { userId: 7, establishedAtMs: 1_000 },
      challengeRefs: session().challengeRefs,
    });
  });

  it("submits a frozen record payload and retries one authenticated 401 after refresh", async () => {
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, session("record-token"));
    const calls: Array<{
      url: string;
      authorization: string | null;
      body: Record<string, unknown> | null;
    }> = [];
    let recordAttempts = 0;
    const fetchLike: FetchLike = vi.fn(async (url, init) => {
      calls.push({
        url,
        authorization: new Headers(init?.headers).get("Authorization"),
        body:
          typeof init?.body === "string"
            ? (JSON.parse(init.body) as Record<string, unknown>)
            : null,
      });
      if (url.endsWith("/auth/refresh")) {
        return response(200, authBody("record-refreshed-token"));
      }
      recordAttempts += 1;
      return recordAttempts === 1
        ? response(401, { success: false, code: "UNAUTHORIZED" })
        : response(200, { success: true, id: "record-cloud-1" });
    });
    const onAuthenticatedSession = vi.fn();
    const service = createMobileAuthService({
      apiBase: "https://api.example.test/api",
      privacy: createPreviewPrivacyRecord("online", 1),
      secureStorage: storage,
      fetchLike,
      onAuthenticatedSession,
    });

    await expect(
      service.submitRecord({
        clientRecordId: "record-local-1",
        modeKey: "standard_4x4_pow2_no_undo",
        score: 4096,
        durationMs: 12_345,
        bestTile: 2048,
        endedAt: "2026-07-25T00:00:00.000Z",
        replayString: "REPLAY_v1RPL_B64_payload",
        rankedSessionToken: "ranked-token-1",
        challengeId: "challenge-1",
      }),
    ).resolves.toMatchObject({ success: true, id: "record-cloud-1" });

    expect(calls.map(({ url, authorization }) => ({ url, authorization }))).toEqual([
      {
        url: "https://api.example.test/api/records",
        authorization: "Bearer record-token",
      },
      {
        url: "https://api.example.test/api/auth/refresh",
        authorization: "Bearer record-token",
      },
      {
        url: "https://api.example.test/api/records",
        authorization: "Bearer record-refreshed-token",
      },
    ]);
    expect(calls[0]?.body).toMatchObject({
      client_record_id: "record-local-1",
      mode_key: "standard_4x4_pow2_no_undo",
      ranked_session_token: "ranked-token-1",
      challenge_id: "challenge-1",
    });
    expect(onAuthenticatedSession).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "record-refreshed-token" }),
      "refresh",
      { accountDeletionCancelled: false },
    );
  });

  it("requests account deletion with the stored email and parses only the server receipt", async () => {
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, session("deletion-token"));
    const requests: Array<Record<string, unknown>> = [];
    const service = createMobileAuthService({
      apiBase: "https://api.example.test/api",
      privacy: createPreviewPrivacyRecord("online", 1),
      secureStorage: storage,
      fetchLike: vi.fn(async (url, init) => {
        expect(url).toBe(
          "https://api.example.test/api/account/deletion/request",
        );
        requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return response(200, {
          success: true,
          data: {
            status: "pending_deletion",
            requestedAt: "2026-07-25T00:00:00.000Z",
            dueAt: "2026-07-28T00:00:00.000Z",
            maskedEmail: "p***@example.com",
          },
        });
      }),
    });

    await expect(
      service.requestAccountDeletion({ password: "Password123!" }),
    ).resolves.toEqual({
      version: 1,
      requestedAt: "2026-07-25T00:00:00.000Z",
      dueAt: "2026-07-28T00:00:00.000Z",
      maskedEmail: "p***@example.com",
    });
    expect(requests).toEqual([
      { email: user.email, password: "Password123!" },
    ]);
    await expect(loadAccountSession(storage)).resolves.toMatchObject({
      accessToken: "deletion-token",
    });
  });

  it("reports a password-login cancellation of pending account deletion", async () => {
    const onAuthenticatedSession = vi.fn();
    const service = createMobileAuthService({
      apiBase: "https://api.example.test/api",
      privacy: createPreviewPrivacyRecord("online", 1),
      secureStorage: createMemorySecureStorage(),
      fetchLike: vi.fn(async () =>
        response(200, {
          ...authBody("restored-account-token"),
          accountDeletionCancelled: true,
        }),
      ),
      onAuthenticatedSession,
    });

    await service.login({
      email: user.email,
      password: "Password123!",
    });
    expect(onAuthenticatedSession).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "restored-account-token" }),
      "login",
      { accountDeletionCancelled: true },
    );
  });

  it("refreshes before a still-valid token enters the backend expiry boundary", async () => {
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, session("near-expiry-token", 1_200));
    const calls: Array<{ url: string; authorization: string | null }> = [];
    const fetchLike: FetchLike = vi.fn(async (url, init) => {
      calls.push({
        url,
        authorization: new Headers(init?.headers).get("Authorization"),
      });
      if (url.endsWith("/auth/refresh")) {
        return response(200, authBody("preemptively-refreshed-token"));
      }
      return response(200, { success: true, user });
    });
    const service = createMobileAuthService({
      apiBase: "https://api.example.test/api",
      privacy: createPreviewPrivacyRecord("online", 1),
      secureStorage: storage,
      fetchLike,
      now: () => 1_000_000,
    });

    await expect(service.currentUser()).resolves.toEqual(user);
    expect(calls).toEqual([
      {
        url: "https://api.example.test/api/auth/refresh",
        authorization: "Bearer near-expiry-token",
      },
      {
        url: "https://api.example.test/api/user/me",
        authorization: "Bearer preemptively-refreshed-token",
      },
    ]);
  });

  it("does not send a business request after the stored token has already expired", async () => {
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, session("already-expired-token", 900));
    const fetchLike: FetchLike = vi.fn(async () =>
      response(401, { success: false, code: "INVALID_TOKEN" }),
    );
    const service = createMobileAuthService({
      apiBase: "https://api.example.test/api",
      privacy: createPreviewPrivacyRecord("online", 1),
      secureStorage: storage,
      fetchLike,
      now: () => 1_000_000,
    });

    await expect(service.currentUser()).rejects.toMatchObject({
      code: "http_error",
      status: 401,
      serverCode: "INVALID_TOKEN",
    });
    expect(vi.mocked(fetchLike).mock.calls).toHaveLength(1);
    expect(vi.mocked(fetchLike).mock.calls[0]?.[0]).toBe(
      "https://api.example.test/api/auth/refresh",
    );
  });

  it("reuses a concurrently refreshed token instead of refreshing a second time", async () => {
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, session("request-token"));
    let releaseUnauthorized: (() => void) | undefined;
    const unauthorizedGate = new Promise<void>((resolve) => {
      releaseUnauthorized = resolve;
    });
    const calls: Array<{ url: string; authorization: string | null }> = [];
    const fetchLike: FetchLike = vi.fn(async (url, init) => {
      const authorization = new Headers(init?.headers).get("Authorization");
      calls.push({ url, authorization });
      if (authorization === "Bearer request-token") {
        await unauthorizedGate;
        return response(401, { success: false, code: "UNAUTHORIZED" });
      }
      return response(200, { success: true, user });
    });
    const service = createMobileAuthService({
      apiBase: "https://api.example.test/api",
      privacy: createPreviewPrivacyRecord("online", 1),
      secureStorage: storage,
      fetchLike,
    });

    const request = service.currentUser();
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    await updateAccountSession(storage, (current) => {
      if (!current) throw new Error("missing test session");
      return { ...current, accessToken: "concurrent-token" };
    });
    releaseUnauthorized?.();

    await expect(request).resolves.toEqual(user);
    expect(calls).toEqual([
      {
        url: "https://api.example.test/api/user/me",
        authorization: "Bearer request-token",
      },
      {
        url: "https://api.example.test/api/user/me",
        authorization: "Bearer concurrent-token",
      },
    ]);
    expect(calls.some((call) => call.url.endsWith("/auth/refresh"))).toBe(
      false,
    );
  });

  it("shares one preemptive refresh across concurrent authenticated requests", async () => {
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, session("near-expiry-token", 1_200));
    let releaseRefresh: (() => void) | undefined;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const fetchLike: FetchLike = vi.fn(async (url) => {
      if (url.endsWith("/auth/refresh")) {
        await refreshGate;
        return response(200, authBody("shared-refresh-token"));
      }
      return response(200, { success: true, user });
    });
    const service = createMobileAuthService({
      apiBase: "https://api.example.test/api",
      privacy: createPreviewPrivacyRecord("online", 1),
      secureStorage: storage,
      fetchLike,
      now: () => 1_000_000,
    });

    const first = service.currentUser();
    const second = service.currentUser();
    await vi.waitFor(() => {
      expect(
        vi
          .mocked(fetchLike)
          .mock.calls.filter(([url]) => url.endsWith("/auth/refresh")),
      ).toHaveLength(1);
    });
    releaseRefresh?.();
    await expect(Promise.all([first, second])).resolves.toEqual([user, user]);
    expect(
      vi
        .mocked(fetchLike)
        .mock.calls.filter(([url]) => url.endsWith("/auth/refresh")),
    ).toHaveLength(1);
  });

  it("does not erase a challenge reference written while refresh is in flight", async () => {
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, session("refresh-source-token"));
    let releaseRefresh: (() => void) | undefined;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const fetchLike: FetchLike = vi.fn(async (url) => {
      if (url.endsWith("/auth/refresh")) {
        await refreshGate;
        return response(200, authBody("refresh-result-token"));
      }
      return response(200, { success: true });
    });
    const service = createMobileAuthService({
      apiBase: "https://api.example.test/api",
      privacy: createPreviewPrivacyRecord("online", 1),
      secureStorage: storage,
      fetchLike,
    });

    const refreshing = service.refresh();
    await vi.waitFor(() => {
      expect(vi.mocked(fetchLike)).toHaveBeenCalledTimes(1);
    });
    await updateAccountSession(storage, (current) => {
      if (!current) throw new Error("missing test session");
      return {
        ...current,
        challengeRefs: [
          ...current.challengeRefs,
          {
            challengeId: "challenge-2",
            rankedSessionId: "ranked-session-2",
            token: "ranked-token-2",
            expiresAtEpochSeconds: null,
          },
        ],
      };
    });
    releaseRefresh?.();

    await expect(refreshing).resolves.toMatchObject({
      accessToken: "refresh-result-token",
      challengeRefs: [
        expect.objectContaining({ challengeId: "challenge-1" }),
        expect.objectContaining({ challengeId: "challenge-2" }),
      ],
    });
  });

  it("times out a hung refresh and clears the single-flight slot for retry", async () => {
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, session("near-expiry-token", 1_200));
    let shouldHang = true;
    const fetchLike: FetchLike = vi.fn((url, init) => {
      if (shouldHang) {
        return new Promise((_, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        });
      }
      if (url.endsWith("/auth/refresh")) {
        return Promise.resolve(response(200, authBody("retry-token")));
      }
      return Promise.resolve(response(200, { success: true, user }));
    });
    const service = createMobileAuthService({
      apiBase: "https://api.example.test/api",
      privacy: createPreviewPrivacyRecord("online", 1),
      secureStorage: storage,
      fetchLike,
      timeoutMs: 10,
      now: () => 1_000_000,
    });

    await expect(service.currentUser()).rejects.toMatchObject({
      code: "network_error",
      networkError: "request_timeout",
    });
    shouldHang = false;
    await expect(service.currentUser()).resolves.toEqual(user);
    expect(
      vi
        .mocked(fetchLike)
        .mock.calls.filter(([url]) => url.endsWith("/auth/refresh")),
    ).toHaveLength(2);
  });

  it("rejects offline privacy before constructing any HTTP client", () => {
    const clientFactory = vi.fn();
    expect(() =>
      createMobileAuthService({
        apiBase: "https://api.example.test/api",
        privacy: createPreviewPrivacyRecord("offline", 1),
        secureStorage: createMemorySecureStorage(),
        clientFactory,
      }),
    ).toThrow(
      expect.objectContaining({
        name: "MobileAuthError",
        code: "privacy_online_required",
      }),
    );
    expect(clientFactory).not.toHaveBeenCalled();
  });

  it("rejects a mismatched privacy version without constructing HTTP", () => {
    const clientFactory = vi.fn();
    const privacy = {
      ...createPreviewPrivacyRecord("online", 1),
      policyVersion: "future-policy",
    } as unknown as PreviewPrivacyRecord;
    expect(() =>
      createMobileAuthService({
        apiBase: "https://api.example.test/api",
        privacy,
        secureStorage: createMemorySecureStorage(),
        clientFactory,
      }),
    ).toThrow(MobileAuthError);
    expect(clientFactory).not.toHaveBeenCalled();
  });

  it("rejects a malformed online privacy record before constructing HTTP", () => {
    const clientFactory = vi.fn();
    const privacy = {
      ...createPreviewPrivacyRecord("online", 1),
      schema: 2,
      decidedAt: Number.NaN,
    } as unknown as PreviewPrivacyRecord;
    expect(() =>
      createMobileAuthService({
        apiBase: "https://api.example.test/api",
        privacy,
        secureStorage: createMemorySecureStorage(),
        clientFactory,
      }),
    ).toThrow(
      expect.objectContaining({
        name: "MobileAuthError",
        code: "privacy_online_required",
      }),
    );
    expect(clientFactory).not.toHaveBeenCalled();
  });

  it.each(["http://api.example.test/api", "http://localhost.example.test/api"])(
    "rejects a non-loopback cleartext API base",
    (apiBase) => {
      const clientFactory = vi.fn();
      expect(() =>
        createMobileAuthService({
          apiBase,
          privacy: createPreviewPrivacyRecord("online", 1),
          secureStorage: createMemorySecureStorage(),
          clientFactory,
        }),
      ).toThrow(
        expect.objectContaining({
          name: "MobileAuthError",
          code: "invalid_api_base",
        }),
      );
      expect(clientFactory).not.toHaveBeenCalled();
    },
  );

  it("rejects loopback HTTP unless the debug composition root explicitly enables it", () => {
    expect(() =>
      normalizeMobileApiBase("http://localhost:3000/api/", false),
    ).toThrow(
      expect.objectContaining({
        name: "MobileAuthError",
        code: "invalid_api_base",
      }),
    );
  });

  it("allows explicitly enabled loopback debug HTTP and passes exactly one base", () => {
    const clientFactory = vi.fn(() => ({
      request: vi.fn(),
      requestResult: vi.fn(),
    }));
    expect(() =>
      createMobileAuthService({
        apiBase: "http://localhost:3000/api/",
        privacy: createPreviewPrivacyRecord("online", 1),
        secureStorage: createMemorySecureStorage(),
        clientFactory,
      }),
    ).not.toThrow();
    expect(clientFactory).toHaveBeenCalledTimes(1);
    expect(clientFactory.mock.calls[0][0]).toMatchObject({
      bases: ["http://localhost:3000/api"],
      timeoutMs: DEFAULT_MOBILE_AUTH_TIMEOUT_MS,
    });
  });

  it("freezes the production API base and rejects every production override", () => {
    const production = resolveMobileBuildFlags("production");

    expect(production).toEqual({
      apiBase: MOBILE_PRODUCTION_API_BASE,
      allowApiBaseOverride: false,
      allowDebugLoopbackHttp: false,
      allowUnapprovedPolicyOnline: false,
    });
    expect(resolveMobileAuthApiBase(undefined, production)).toBe(
      MOBILE_PRODUCTION_API_BASE,
    );
    expect(
      resolveMobileAuthApiBase(`${MOBILE_PRODUCTION_API_BASE}/`, production),
    ).toBe(MOBILE_PRODUCTION_API_BASE);
    expect(() =>
      resolveMobileAuthApiBase("https://api.example.test/api", production),
    ).toThrow(
      expect.objectContaining({
        name: "MobileAuthError",
        code: "invalid_api_base",
      }),
    );
  });

  it("keeps API and draft-policy overrides inside explicit debug/test modes", () => {
    for (const mode of ["production", "staging"]) {
      expect(resolveMobileBuildFlags(mode)).toMatchObject({
        apiBase: MOBILE_PRODUCTION_API_BASE,
        allowApiBaseOverride: false,
        allowDebugLoopbackHttp: false,
        allowUnapprovedPolicyOnline: false,
      });
    }
    for (const mode of ["development", "test", "android-debug"]) {
      const buildFlags = resolveMobileBuildFlags(mode);
      expect(buildFlags).toMatchObject({
        apiBase: MOBILE_PRODUCTION_API_BASE,
        allowApiBaseOverride: true,
        allowDebugLoopbackHttp: true,
        allowUnapprovedPolicyOnline: true,
      });
      expect(
        resolveMobileAuthApiBase("http://localhost:3000/api/", buildFlags),
      ).toBe("http://localhost:3000/api");
    }
  });

  it("hard-rejects the unapproved draft before production constructs HTTP", () => {
    const production = resolveMobileBuildFlags("production");

    expect(() =>
      validateMobileOnlinePrivacy(
        createPreviewPrivacyRecord("online", 1),
        production,
      ),
    ).toThrow(
      expect.objectContaining({
        name: "MobileAuthError",
        code: "privacy_online_required",
      }),
    );
    expect(() =>
      validateMobileOnlinePrivacy(
        createPreviewPrivacyRecord("online", 1),
        resolveMobileBuildFlags("test"),
      ),
    ).not.toThrow();
  });
});

describe("mobile auth coordinator", () => {
  it("constructs the service lazily and rejects duplicate submissions", async () => {
    const loginResult = deferred<AccountSessionV1>();
    const login = vi.fn(() => loginResult.promise);
    const service = { login } as unknown as MobileAuthService;
    const factory = vi.fn(async () => service);
    const coordinator = new MobileAuthCoordinator(factory);

    expect(factory).not.toHaveBeenCalled();
    const first = coordinator.run((auth) =>
      auth.login({ email: user.email, password: "Password123!" }),
    );
    const duplicate = await coordinator.run((auth) =>
      auth.login({ email: user.email, password: "Password123!" }),
    );

    expect(duplicate).toEqual({ status: "busy" });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledTimes(1);

    loginResult.resolve(session());
    await expect(first).resolves.toEqual({
      status: "success",
      value: session(),
    });
    expect(coordinator.busy).toBe(false);
  });

  it.each([
    [
      new MobileAuthError("http_error", {
        status: 401,
        serverCode: "INVALID_CREDENTIALS",
      }),
      "invalid_credentials",
      false,
    ],
    [
      new MobileAuthError("http_error", {
        status: 400,
        serverCode: "VERIFICATION_EXPIRED",
      }),
      "verification_expired",
      false,
    ],
    [
      new MobileAuthError("http_error", {
        status: 429,
        serverCode: "RATE_LIMIT_EMAIL",
      }),
      "rate_limited",
      true,
    ],
    [new MobileAuthError("network_error"), "network_error", true],
    [new Error("opaque"), "unknown", false],
  ] as const)("maps auth failures to %s", (error, kind, retryable) => {
    expect(classifyMobileAuthIssue(error)).toMatchObject({ kind, retryable });
  });
});
