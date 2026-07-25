import { ACCOUNT_SESSION_SECURE_KEY } from "../data/owner-cleanup";
import type { SecureStorage } from "../platform/secure-storage";

export interface AccountUserV1 {
  id: number;
  email: string;
  nickname: string;
  role: string;
}

export interface AccountChallengeRefV1 {
  challengeId: string;
  rankedSessionId: string;
  token: string;
  expiresAtEpochSeconds: number | null;
}

export interface AccountSessionV1 {
  version: 1;
  accessToken: string;
  expiresAtEpochSeconds: number;
  user: AccountUserV1;
  persistentIdentity: {
    userId: number;
    establishedAtMs: number;
  };
  challengeRefs: AccountChallengeRefV1[];
}

export const ACCOUNT_SESSION_TOKEN_MAX_LENGTH = 12 * 1024;
const ACCOUNT_SESSION_ENVELOPE_MAX_BYTES = 64 * 1024;
const mutationTails = new WeakMap<object, Promise<void>>();

export class AccountSessionEnvelopeError extends Error {
  readonly code = "invalid_account_session_envelope";

  constructor() {
    super("invalid_account_session_envelope");
    this.name = "AccountSessionEnvelopeError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: unknown, keys: readonly string[]): boolean {
  return (
    isRecord(value) &&
    Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
  );
}

function isText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= ACCOUNT_SESSION_TOKEN_MAX_LENGTH &&
    /^[\x21-\x7e]+$/u.test(value)
  );
}

function isTimestamp(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isUser(value: unknown): value is AccountUserV1 {
  return (
    hasExactKeys(value, ["id", "email", "nickname", "role"]) &&
    isRecord(value) &&
    Number.isSafeInteger(value.id) &&
    Number(value.id) > 0 &&
    isText(value.email, 320) &&
    value.email.includes("@") &&
    isText(value.nickname, 64) &&
    isText(value.role, 64)
  );
}

function isChallengeRef(value: unknown): value is AccountChallengeRefV1 {
  return (
    hasExactKeys(value, [
      "challengeId",
      "rankedSessionId",
      "token",
      "expiresAtEpochSeconds",
    ]) &&
    isRecord(value) &&
    isText(value.challengeId, 160) &&
    isText(value.rankedSessionId, 160) &&
    isToken(value.token) &&
    (value.expiresAtEpochSeconds === null ||
      isTimestamp(value.expiresAtEpochSeconds))
  );
}

function isSession(value: unknown): value is AccountSessionV1 {
  if (
    !hasExactKeys(value, [
      "version",
      "accessToken",
      "expiresAtEpochSeconds",
      "user",
      "persistentIdentity",
      "challengeRefs",
    ]) ||
    !isRecord(value) ||
    value.version !== 1 ||
    !isToken(value.accessToken) ||
    !isTimestamp(value.expiresAtEpochSeconds) ||
    !isUser(value.user) ||
    !hasExactKeys(value.persistentIdentity, ["userId", "establishedAtMs"]) ||
    !isRecord(value.persistentIdentity) ||
    value.persistentIdentity.userId !== value.user.id ||
    !isTimestamp(value.persistentIdentity.establishedAtMs) ||
    !Array.isArray(value.challengeRefs) ||
    value.challengeRefs.length > 3 ||
    !value.challengeRefs.every(isChallengeRef)
  ) {
    return false;
  }
  return [
    value.challengeRefs.map((entry) => entry.challengeId),
    value.challengeRefs.map((entry) => entry.rankedSessionId),
  ].every((identifiers) => new Set(identifiers).size === identifiers.length);
}

function cloneSession(session: AccountSessionV1): AccountSessionV1 {
  return {
    ...session,
    user: { ...session.user },
    persistentIdentity: { ...session.persistentIdentity },
    challengeRefs: session.challengeRefs.map((entry) => ({ ...entry })),
  };
}

export function parseAccountSessionEnvelope(
  serialized: string | null,
): AccountSessionV1 | null {
  if (serialized === null) return null;
  try {
    if (
      serialized.length > ACCOUNT_SESSION_ENVELOPE_MAX_BYTES ||
      new TextEncoder().encode(serialized).byteLength >
        ACCOUNT_SESSION_ENVELOPE_MAX_BYTES
    ) {
      throw new AccountSessionEnvelopeError();
    }
    const candidate: unknown = JSON.parse(serialized);
    if (!isSession(candidate)) throw new AccountSessionEnvelopeError();
    return cloneSession(candidate);
  } catch (error) {
    if (error instanceof AccountSessionEnvelopeError) throw error;
    throw new AccountSessionEnvelopeError();
  }
}

export function serializeAccountSessionEnvelope(
  session: AccountSessionV1,
): string {
  if (!isSession(session)) throw new AccountSessionEnvelopeError();
  const serialized = JSON.stringify(cloneSession(session));
  if (
    new TextEncoder().encode(serialized).byteLength >
    ACCOUNT_SESSION_ENVELOPE_MAX_BYTES
  ) {
    throw new AccountSessionEnvelopeError();
  }
  return serialized;
}

export async function loadAccountSession(
  storage: Pick<SecureStorage, "get">,
): Promise<AccountSessionV1 | null> {
  return parseAccountSessionEnvelope(
    await storage.get(ACCOUNT_SESSION_SECURE_KEY),
  );
}

export async function saveAccountSession(
  storage: Pick<SecureStorage, "get" | "set">,
  session: AccountSessionV1,
): Promise<void> {
  await updateAccountSession(storage, () => session);
}

export async function updateAccountSession(
  storage: Pick<SecureStorage, "get" | "set">,
  update: (current: AccountSessionV1 | null) => AccountSessionV1,
): Promise<AccountSessionV1> {
  const previous = mutationTails.get(storage) ?? Promise.resolve();
  let result: AccountSessionV1 | undefined;
  const operation = previous
    .catch(() => undefined)
    .then(async () => {
      const next = update(await loadAccountSession(storage));
      const serialized = serializeAccountSessionEnvelope(next);
      await storage.set(ACCOUNT_SESSION_SECURE_KEY, serialized);
      result = parseAccountSessionEnvelope(serialized) ?? undefined;
    });
  const tail = operation.then(
    () => undefined,
    () => undefined,
  );
  mutationTails.set(storage, tail);
  try {
    await operation;
    if (!result) throw new AccountSessionEnvelopeError();
    return result;
  } finally {
    if (mutationTails.get(storage) === tail) mutationTails.delete(storage);
  }
}

export function removeAccountChallengeRef(
  storage: Pick<SecureStorage, "get" | "set">,
  expectedIdentity: AccountSessionV1["persistentIdentity"],
  challengeId: string,
): Promise<AccountSessionV1> {
  return updateAccountSession(storage, (current) => {
    if (
      !current ||
      current.persistentIdentity.userId !== expectedIdentity.userId ||
      current.persistentIdentity.establishedAtMs !==
        expectedIdentity.establishedAtMs
    ) {
      throw new AccountSessionEnvelopeError();
    }
    return {
      ...current,
      challengeRefs: current.challengeRefs.filter(
        (candidate) => candidate.challengeId !== challengeId,
      ),
    };
  });
}
