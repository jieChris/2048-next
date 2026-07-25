import type { MobileAuthService } from "./auth-service";

export type MobileAuthServiceFactory = () =>
  | MobileAuthService
  | Promise<MobileAuthService>;

export type MobileAuthIssueKind =
  | "privacy_required"
  | "invalid_input"
  | "invalid_credentials"
  | "email_exists"
  | "nickname_exists"
  | "verification_invalid"
  | "verification_expired"
  | "rate_limited"
  | "network_error"
  | "service_unavailable"
  | "unknown";

export interface MobileAuthIssue {
  kind: MobileAuthIssueKind;
  status: number | null;
  serverCode: string | null;
  retryable: boolean;
}

export type MobileAuthOperationResult<T> =
  | { status: "success"; value: T }
  | { status: "busy" }
  | { status: "failure"; issue: MobileAuthIssue };

const INVALID_CREDENTIAL_CODES = new Set([
  "INVALID_CREDENTIALS",
  "UNAUTHORIZED",
]);
const INVALID_INPUT_CODES = new Set([
  "CHARS",
  "EMPTY",
  "INVALID",
  "INVALID_EMAIL",
  "LENGTH",
  "MISSING_REQUIRED_PARAMS",
  "RESERVED",
  "SAME_PASSWORD",
  "SENSITIVE",
  "WEAK_PASSWORD",
]);
const INVALID_VERIFICATION_CODES = new Set([
  "INVALID_VERIFICATION_CODE",
  "USER_NOT_FOUND",
  "VERIFICATION_NOT_FOUND",
  "VERIFICATION_ATTEMPTS_EXCEEDED",
]);
const RATE_LIMIT_CODES = new Set([
  "RATE_LIMIT_IP",
  "RATE_LIMIT_EMAIL",
  "RESEND_COOLDOWN",
]);
const SERVICE_UNAVAILABLE_CODES = new Set([
  "AUTH_TABLES_UNAVAILABLE",
  "CAPTCHA_FAILED",
  "CAPTCHA_REQUIRED",
  "CAPTCHA_VERIFY_FAILED",
  "CONFIG_MISSING",
  "MAIL_NOT_CONFIGURED",
  "MAIL_SEND_FAILED",
  "REGISTER_CREATE_USER_FAILED",
  "REGISTRATION_TABLES_UNAVAILABLE",
  "TOKEN_ISSUE_FAILED",
]);

export function classifyMobileAuthIssue(error: unknown): MobileAuthIssue {
  if (
    typeof error !== "object" ||
    error === null ||
    Reflect.get(error, "name") !== "MobileAuthError" ||
    typeof Reflect.get(error, "code") !== "string"
  ) {
    return {
      kind: "unknown",
      status: null,
      serverCode: null,
      retryable: false,
    };
  }

  const rawStatus = Reflect.get(error, "status");
  const rawServerCode = Reflect.get(error, "serverCode");
  const code = Reflect.get(error, "code") as string;
  const status = typeof rawStatus === "number" ? rawStatus : null;
  const serverCode = typeof rawServerCode === "string" ? rawServerCode : null;
  if (code === "privacy_online_required") {
    return {
      kind: "privacy_required",
      status,
      serverCode,
      retryable: false,
    };
  }
  if (code === "invalid_input") {
    return {
      kind: "invalid_input",
      status,
      serverCode,
      retryable: false,
    };
  }
  if (serverCode && INVALID_INPUT_CODES.has(serverCode)) {
    return {
      kind: "invalid_input",
      status,
      serverCode,
      retryable: false,
    };
  }
  if (code === "network_error") {
    return {
      kind: "network_error",
      status,
      serverCode,
      retryable: true,
    };
  }
  if (serverCode && INVALID_CREDENTIAL_CODES.has(serverCode)) {
    return {
      kind: "invalid_credentials",
      status,
      serverCode,
      retryable: false,
    };
  }
  if (serverCode === "EMAIL_EXISTS") {
    return {
      kind: "email_exists",
      status,
      serverCode,
      retryable: false,
    };
  }
  if (serverCode === "NICKNAME_EXISTS") {
    return {
      kind: "nickname_exists",
      status,
      serverCode,
      retryable: false,
    };
  }
  if (serverCode && INVALID_VERIFICATION_CODES.has(serverCode)) {
    return {
      kind: "verification_invalid",
      status,
      serverCode,
      retryable: false,
    };
  }
  if (serverCode === "VERIFICATION_EXPIRED") {
    return {
      kind: "verification_expired",
      status,
      serverCode,
      retryable: false,
    };
  }
  if (
    status === 429 ||
    (serverCode !== null && RATE_LIMIT_CODES.has(serverCode))
  ) {
    return {
      kind: "rate_limited",
      status,
      serverCode,
      retryable: true,
    };
  }
  if (
    (status !== null && status >= 500) ||
    (serverCode !== null && SERVICE_UNAVAILABLE_CODES.has(serverCode)) ||
    code === "invalid_response" ||
    code === "session_missing"
  ) {
    return {
      kind: "service_unavailable",
      status,
      serverCode,
      retryable: true,
    };
  }
  return {
    kind: "unknown",
    status,
    serverCode,
    retryable: false,
  };
}

/**
 * Owns lazy service construction and the single-submit invariant. It never
 * stores credentials; the task page passes each request payload directly.
 */
export class MobileAuthCoordinator {
  readonly #createService: MobileAuthServiceFactory;
  #service: MobileAuthService | null = null;
  #operation: Promise<MobileAuthOperationResult<unknown>> | null = null;

  constructor(createService: MobileAuthServiceFactory) {
    this.#createService = createService;
  }

  get busy(): boolean {
    return this.#operation !== null;
  }

  async run<T>(
    operation: (service: MobileAuthService) => Promise<T>,
  ): Promise<MobileAuthOperationResult<T>> {
    if (this.#operation) return { status: "busy" };

    const pending: Promise<MobileAuthOperationResult<T>> = (async () => {
      try {
        const service =
          this.#service ?? (this.#service = await this.#createService());
        return { status: "success", value: await operation(service) };
      } catch (error) {
        return { status: "failure", issue: classifyMobileAuthIssue(error) };
      }
    })();
    this.#operation = pending;
    try {
      return await pending;
    } finally {
      if (this.#operation === pending) this.#operation = null;
    }
  }
}
