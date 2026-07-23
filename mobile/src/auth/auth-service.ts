import {
  createJsonApiClient,
  type FetchLike,
  type JsonApiClient,
  type JsonApiClientOptions,
  type JsonApiResult,
  type JsonRecord,
} from "../../../src/services/api-client";
import {
  MOBILE_BUILD_FLAGS,
  type MobileBuildFlags,
} from "../app/build-flags";
import {
  parsePreviewPrivacyRecord,
  PREVIEW_POLICY_VERSION,
  type PreviewPrivacyRecord,
} from "../privacy";
import type { SecureStorage } from "../platform/secure-storage";
import {
  loadAccountSession,
  updateAccountSession,
  ACCOUNT_SESSION_TOKEN_MAX_LENGTH,
  type AccountSessionV1,
  type AccountUserV1,
} from "./account-session";

export type MobileAuthErrorCode =
  | "privacy_online_required"
  | "invalid_api_base"
  | "invalid_input"
  | "session_missing"
  | "network_error"
  | "http_error"
  | "api_error"
  | "invalid_response";

export class MobileAuthError extends Error {
  readonly code: MobileAuthErrorCode;
  readonly status: number | null;
  readonly serverCode: string | null;
  readonly networkError: string | null;

  constructor(
    code: MobileAuthErrorCode,
    details: {
      status?: number | null;
      serverCode?: string | null;
      networkError?: string | null;
    } = {},
  ) {
    super(code);
    this.name = "MobileAuthError";
    this.code = code;
    this.status = details.status ?? null;
    this.serverCode = details.serverCode ?? null;
    this.networkError = details.networkError ?? null;
  }
}

type ClientFactory = (options: JsonApiClientOptions) => JsonApiClient;

export interface MobileAuthServiceOptions {
  apiBase?: string;
  privacy: PreviewPrivacyRecord;
  secureStorage: Pick<SecureStorage, "get" | "set">;
  fetchLike?: FetchLike;
  timeoutMs?: number;
  now?: () => number;
  clientFactory?: ClientFactory;
}

export interface MobileAuthService {
  getSession(): Promise<AccountSessionV1 | null>;
  login(input: { email: string; password: string }): Promise<AccountSessionV1>;
  registerStart(input: {
    email: string;
    password: string;
    nickname: string;
  }): Promise<JsonRecord>;
  registerVerify(input: {
    email: string;
    code: string;
  }): Promise<AccountSessionV1>;
  passwordResetStart(input: { email: string }): Promise<JsonRecord>;
  passwordResetVerify(input: {
    email: string;
    code: string;
    newPassword: string;
  }): Promise<JsonRecord>;
  currentUser(): Promise<AccountUserV1>;
  refresh(): Promise<AccountSessionV1>;
}

const AUTH_REFRESH_WINDOW_SECONDS = 5 * 60;
export const DEFAULT_MOBILE_AUTH_TIMEOUT_MS = 10_000;

export function normalizeMobileApiBase(
  value: string,
  allowDebugLoopbackHttp: boolean,
): string {
  try {
    const parsed = new URL(value);
    const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    if (
      (parsed.protocol !== "https:" &&
        !(
          allowDebugLoopbackHttp &&
          parsed.protocol === "http:" &&
          loopbackHosts.has(parsed.hostname)
        )) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error("invalid");
    }
    return parsed.toString().replace(/\/+$/u, "");
  } catch {
    throw new MobileAuthError("invalid_api_base");
  }
}

export function resolveMobileAuthApiBase(
  value: string | undefined,
  buildFlags: MobileBuildFlags,
): string {
  const frozenBase = normalizeMobileApiBase(buildFlags.apiBase, false);
  if (value === undefined) return frozenBase;

  const requestedBase = normalizeMobileApiBase(
    value,
    buildFlags.allowDebugLoopbackHttp,
  );
  if (!buildFlags.allowApiBaseOverride && requestedBase !== frozenBase) {
    throw new MobileAuthError("invalid_api_base");
  }
  return requestedBase;
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function serverCode(body: JsonRecord | null): string | null {
  const value = body?.code;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function successfulBody(result: JsonApiResult): JsonRecord {
  if (result.networkError) {
    throw new MobileAuthError("network_error", {
      networkError: result.networkError,
    });
  }
  if (!result.ok) {
    throw new MobileAuthError("http_error", {
      status: result.status,
      serverCode: serverCode(result.body),
    });
  }
  if (!result.body) throw new MobileAuthError("invalid_response");
  if (result.body.success !== true) {
    throw new MobileAuthError("api_error", {
      status: result.status,
      serverCode: serverCode(result.body),
    });
  }
  return result.body;
}

function requiredText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") throw new MobileAuthError("invalid_input");
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new MobileAuthError("invalid_input");
  }
  return normalized;
}

function email(value: unknown): string {
  const normalized = requiredText(value, 320).toLowerCase();
  if (!normalized.includes("@")) throw new MobileAuthError("invalid_input");
  return normalized;
}

function password(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 256) {
    throw new MobileAuthError("invalid_input");
  }
  return value;
}

function parseUser(value: unknown): AccountUserV1 {
  const data = record(value);
  const id = Number(data?.id ?? data?.user_id);
  const userEmail = data?.email;
  const nickname = data?.nickname;
  const role = data?.role;
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    typeof userEmail !== "string" ||
    !userEmail.includes("@") ||
    typeof nickname !== "string" ||
    !nickname.trim() ||
    typeof role !== "string" ||
    !role.trim()
  ) {
    throw new MobileAuthError("invalid_response");
  }
  return {
    id,
    email: userEmail,
    nickname,
    role,
  };
}

function jsonBody(value: JsonRecord): RequestInit {
  return { method: "POST", body: JSON.stringify(value) };
}

export function validateMobileOnlinePrivacy(
  privacy: PreviewPrivacyRecord,
  buildFlags: MobileBuildFlags,
): PreviewPrivacyRecord {
  let validatedPrivacy: PreviewPrivacyRecord | null = null;
  try {
    validatedPrivacy = parsePreviewPrivacyRecord(
      JSON.stringify(privacy) ?? null,
    );
  } catch {
    validatedPrivacy = null;
  }
  if (
    !validatedPrivacy ||
    validatedPrivacy.choice !== "online" ||
    validatedPrivacy.policyVersion !== PREVIEW_POLICY_VERSION ||
    (PREVIEW_POLICY_VERSION === "unapproved-draft" &&
      !buildFlags.allowUnapprovedPolicyOnline)
  ) {
    throw new MobileAuthError("privacy_online_required");
  }
  return validatedPrivacy;
}

export function createMobileAuthService(
  options: MobileAuthServiceOptions,
): MobileAuthService {
  validateMobileOnlinePrivacy(options.privacy, MOBILE_BUILD_FLAGS);
  const apiBase = resolveMobileAuthApiBase(options.apiBase, MOBILE_BUILD_FLAGS);
  const createClient = options.clientFactory ?? createJsonApiClient;
  const timeoutMs = options.timeoutMs ?? DEFAULT_MOBILE_AUTH_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000) {
    throw new MobileAuthError("invalid_input");
  }
  const commonClientOptions = {
    bases: [apiBase],
    ...(options.fetchLike ? { fetchLike: options.fetchLike } : {}),
    timeoutMs,
  };
  const publicClient = createClient(commonClientOptions);
  const now = options.now ?? Date.now;

  const currentEpochSeconds = (): number => {
    const nowMs = Math.floor(now());
    if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
      throw new MobileAuthError("invalid_response");
    }
    return Math.floor(nowMs / 1_000);
  };

  const clientFor = (token: string): JsonApiClient =>
    createClient({ ...commonClientOptions, token });

  const requestPublic = async (
    path: string,
    init: RequestInit,
  ): Promise<JsonRecord> =>
    successfulBody(await publicClient.requestResult(path, init));

  const requireSession = async (): Promise<AccountSessionV1> => {
    const session = await loadAccountSession(options.secureStorage);
    if (!session) throw new MobileAuthError("session_missing");
    return session;
  };

  const persistAuthBody = async (
    body: JsonRecord,
    previous: AccountSessionV1 | null,
    refreshAccessToken?: string,
  ): Promise<AccountSessionV1> => {
    const token = requiredText(body.token, ACCOUNT_SESSION_TOKEN_MAX_LENGTH);
    const expiresAtEpochSeconds = Number(body.expiresAt ?? body.expires_at);
    if (
      !Number.isSafeInteger(expiresAtEpochSeconds) ||
      expiresAtEpochSeconds <= currentEpochSeconds()
    ) {
      throw new MobileAuthError("invalid_response");
    }
    const user = parseUser(body.user);
    const newEstablishedAtMs = Math.floor(now());
    if (
      !Number.isSafeInteger(newEstablishedAtMs) ||
      newEstablishedAtMs < 0
    ) {
      throw new MobileAuthError("invalid_response");
    }
    return updateAccountSession(options.secureStorage, (current) => {
      if (refreshAccessToken) {
        if (!current || current.user.id !== user.id) {
          throw new MobileAuthError("session_missing");
        }
        if (current.accessToken !== refreshAccessToken) return current;
      }
      const sameUserSession =
        current?.user.id === user.id
          ? current
          : previous?.user.id === user.id
            ? previous
            : null;
      return {
        version: 1,
        accessToken: token,
        expiresAtEpochSeconds,
        user,
        persistentIdentity: {
          userId: user.id,
          establishedAtMs:
            sameUserSession?.persistentIdentity.establishedAtMs ??
            newEstablishedAtMs,
        },
        challengeRefs: sameUserSession?.challengeRefs ?? [],
      };
    });
  };

  let refreshInFlight: Promise<AccountSessionV1> | null = null;

  const refresh = (): Promise<AccountSessionV1> => {
    if (refreshInFlight) return refreshInFlight;
    const operation = (async () => {
      const previous = await requireSession();
      const body = successfulBody(
        await clientFor(previous.accessToken).requestResult(
          "/auth/refresh",
          jsonBody({ token: previous.accessToken }),
        ),
      );
      return persistAuthBody(body, previous, previous.accessToken);
    })();
    refreshInFlight = operation;
    void operation.then(
      () => {
        if (refreshInFlight === operation) refreshInFlight = null;
      },
      () => {
        if (refreshInFlight === operation) refreshInFlight = null;
      },
    );
    return operation;
  };

  const requestAuthenticated = async (
    path: string,
    init: RequestInit,
  ): Promise<JsonRecord> => {
    let session = await requireSession();
    let refreshed = false;
    if (
      session.expiresAtEpochSeconds - currentEpochSeconds() <=
      AUTH_REFRESH_WINDOW_SECONDS
    ) {
      session = await refresh();
      refreshed = true;
    }
    let result = await clientFor(session.accessToken).requestResult(path, init);
    if (result.status === 401 && !refreshed) {
      const latest = await requireSession();
      if (latest.user.id !== session.user.id) {
        throw new MobileAuthError("session_missing");
      }
      session =
        latest.accessToken === session.accessToken ? await refresh() : latest;
      result = await clientFor(session.accessToken).requestResult(path, init);
    }
    return successfulBody(result);
  };

  return {
    getSession: () => loadAccountSession(options.secureStorage),
    async login(input) {
      const body = await requestPublic(
        "/login",
        jsonBody({
          email: email(input.email),
          password: password(input.password),
        }),
      );
      return persistAuthBody(
        body,
        await loadAccountSession(options.secureStorage),
      );
    },
    registerStart(input) {
      return requestPublic(
        "/register/start",
        jsonBody({
          email: email(input.email),
          password: password(input.password),
          nickname: requiredText(input.nickname, 64),
        }),
      );
    },
    async registerVerify(input) {
      const body = await requestPublic(
        "/register/verify",
        jsonBody({
          email: email(input.email),
          code: requiredText(input.code, 32),
        }),
      );
      return persistAuthBody(
        body,
        await loadAccountSession(options.secureStorage),
      );
    },
    passwordResetStart(input) {
      return requestPublic(
        "/password/reset/start",
        jsonBody({ email: email(input.email) }),
      );
    },
    passwordResetVerify(input) {
      return requestPublic(
        "/password/reset/verify",
        jsonBody({
          email: email(input.email),
          code: requiredText(input.code, 32),
          new_password: password(input.newPassword),
        }),
      );
    },
    async currentUser() {
      const body = await requestAuthenticated("/user/me", { method: "GET" });
      return parseUser(body.user ?? body.data);
    },
    refresh,
  };
}
