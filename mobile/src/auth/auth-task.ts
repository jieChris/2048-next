import type { AppModeKey } from "../../../src/contracts";
import type { Translator } from "../i18n";
import type { AccountSessionV1 } from "./account-session";
import type { AccountDeletionReceipt } from "./account-deletion-receipt";
import {
  MobileAuthCoordinator,
  type MobileAuthIssue,
  type MobileAuthIssueKind,
  type MobileAuthOperationResult,
  type MobileAuthServiceFactory,
} from "./auth-flow";

export type AuthTaskRoute =
  | "auth-login"
  | "auth-register"
  | "auth-register-verify"
  | "auth-reset"
  | "auth-reset-verify";

export type AuthSourceRoute = "modes" | "me";

export type AuthenticatedAppModeKey = Extract<
  AppModeKey,
  "classic_4x4_pow2_undo" | "board_3x3_pow2_no_undo"
>;

export type AuthTaskSubmitEffect =
  | { status: "none" }
  | { status: "navigate"; route: AuthTaskRoute; passwordReset: boolean }
  | {
      status: "authenticated";
      session: AccountSessionV1;
      source: AuthSourceRoute;
      targetMode: AuthenticatedAppModeKey | null;
    };

export interface MobileAuthTaskOptions {
  root: HTMLElement;
  t: Translator;
  serviceFactory?: MobileAuthServiceFactory;
  initialSession?: AccountSessionV1 | null;
}

export function isAuthTaskRoute(route: string): route is AuthTaskRoute {
  return (
    route === "auth-login" ||
    route === "auth-register" ||
    route === "auth-register-verify" ||
    route === "auth-reset" ||
    route === "auth-reset-verify"
  );
}

export function isAuthenticatedModeKey(
  modeKey: string | undefined,
): modeKey is AuthenticatedAppModeKey {
  return (
    modeKey === "classic_4x4_pow2_undo" || modeKey === "board_3x3_pow2_no_undo"
  );
}

export class MobileAuthTask {
  readonly #root: HTMLElement;
  readonly #t: Translator;
  readonly #auth: MobileAuthCoordinator | null;
  #session: AccountSessionV1 | null;
  #source: AuthSourceRoute = "me";
  #targetMode: AuthenticatedAppModeKey | null = null;
  #registerEmail = "";
  #resetEmail = "";
  #busy = false;
  #epoch = 0;

  constructor(options: MobileAuthTaskOptions) {
    this.#root = options.root;
    this.#t = options.t;
    this.#auth = options.serviceFactory
      ? new MobileAuthCoordinator(options.serviceFactory)
      : null;
    this.#session = options.initialSession ?? null;
    this.renderAccountState();
  }

  get session(): AccountSessionV1 | null {
    return this.#session;
  }

  setIntent(
    source: AuthSourceRoute,
    targetMode: AuthenticatedAppModeKey | null,
  ): void {
    this.#source = source;
    this.#targetMode = targetMode;
  }

  open(): AuthTaskRoute | null {
    if (!this.#auth) return null;
    this.#renderContext();
    return this.navigate("auth-login");
  }

  navigate(route: AuthTaskRoute): AuthTaskRoute {
    this.#epoch += 1;
    this.#clearIssues();
    return route;
  }

  back(route: AuthTaskRoute): AuthTaskRoute | AuthSourceRoute {
    if (route === "auth-register-verify") {
      return this.navigate("auth-register");
    }
    if (route === "auth-reset-verify") return this.navigate("auth-reset");
    if (route === "auth-register" || route === "auth-reset") {
      return this.navigate("auth-login");
    }
    return this.cancel();
  }

  cancel(): AuthSourceRoute {
    const destination = this.#source;
    this.clearIntent();
    return destination;
  }

  clearIntent(): void {
    this.#epoch += 1;
    this.#targetMode = null;
    this.#registerEmail = "";
    this.#resetEmail = "";
    this.#resetForms();
    this.#clearIssues();
  }

  signOut(): void {
    this.#session = null;
    this.clearIntent();
    this.renderAccountState();
  }

  requestAccountDeletion(
    password: string,
  ): Promise<MobileAuthOperationResult<AccountDeletionReceipt>> {
    if (!this.#auth || !this.#session) {
      return Promise.resolve({
        status: "failure",
        issue: {
          kind: "invalid_credentials",
          status: 401,
          serverCode: "SESSION_MISSING",
          retryable: false,
        },
      });
    }
    return this.#auth.run((service) =>
      service.requestAccountDeletion({ password }),
    );
  }

  async submit(
    form: HTMLFormElement,
    route: AuthTaskRoute,
  ): Promise<AuthTaskSubmitEffect> {
    if (this.#busy || !this.#auth) return { status: "none" };
    if (!form.checkValidity()) {
      this.#showIssue(route, {
        kind: "invalid_input",
        status: null,
        serverCode: null,
        retryable: false,
      });
      return { status: "none" };
    }

    const epoch = this.#epoch;
    this.#setBusy(true);
    this.#clearIssues();
    let result: MobileAuthOperationResult<unknown>;
    try {
      result = await this.#runOperation(form, route);
    } finally {
      this.#setBusy(false);
    }

    if (result.status === "busy") return { status: "none" };
    if (result.status === "failure") {
      if (epoch === this.#epoch) this.#showIssue(route, result.issue);
      return { status: "none" };
    }

    if (route === "auth-login" || route === "auth-register-verify") {
      const session = result.value as AccountSessionV1;
      this.#session = session;
      this.renderAccountState();
      if (epoch !== this.#epoch) return { status: "none" };
      const effect: AuthTaskSubmitEffect = {
        status: "authenticated",
        session,
        source: this.#source,
        targetMode: this.#targetMode,
      };
      this.#targetMode = null;
      this.#registerEmail = "";
      this.#resetEmail = "";
      this.#resetForms();
      return effect;
    }
    if (epoch !== this.#epoch) return { status: "none" };

    if (route === "auth-register") {
      this.#registerEmail = this.#readValue(form, "email").trim().toLowerCase();
      this.#clearValue(form, "password");
      this.#setText("[data-auth-register-email]", this.#registerEmail);
      return {
        status: "navigate",
        route: this.navigate("auth-register-verify"),
        passwordReset: false,
      };
    }
    if (route === "auth-reset") {
      this.#resetEmail = this.#readValue(form, "email").trim().toLowerCase();
      this.#setText("[data-auth-reset-email]", this.#resetEmail);
      return {
        status: "navigate",
        route: this.navigate("auth-reset-verify"),
        passwordReset: false,
      };
    }
    this.#prefillLoginEmail(this.#resetEmail);
    this.#resetEmail = "";
    form.reset();
    return {
      status: "navigate",
      route: this.navigate("auth-login"),
      passwordReset: true,
    };
  }

  showUnexpectedIssue(route: string, errorCode: string): void {
    if (!isAuthTaskRoute(route)) return;
    this.#showIssue(route, {
      kind: "unknown",
      status: null,
      serverCode: errorCode,
      retryable: false,
    });
  }

  renderAccountState(): void {
    const session = this.#session;
    const badge = this.#root.querySelector<HTMLElement>("[data-account-badge]");
    const title = this.#root.querySelector<HTMLElement>("[data-account-title]");
    const body = this.#root.querySelector<HTMLElement>("[data-account-body]");
    const login = this.#root.querySelector<HTMLButtonElement>(
      '[data-action="open-auth-gate"]',
    );
    const logout = this.#root.querySelector<HTMLButtonElement>(
      '[data-action="request-account-logout"]',
    );
    const deleteAccount = this.#root.querySelector<HTMLButtonElement>(
      '[data-action="request-account-deletion"]',
    );
    const modeIdentity = this.#root.querySelector<HTMLElement>(
      "[data-mode-identity]",
    );
    if (badge) {
      badge.textContent = session
        ? this.#t("me.signedInBadge")
        : this.#t("me.guestBadge");
    }
    if (title) {
      title.textContent = session?.user.nickname ?? this.#t("me.guestTitle");
    }
    if (body) {
      body.textContent = session
        ? `${session.user.email} · ${this.#t("me.signedInBody")}`
        : this.#t("me.guestBody");
    }
    if (login) login.hidden = session !== null;
    if (logout) logout.hidden = session === null;
    if (deleteAccount) deleteAccount.hidden = session === null;
    if (modeIdentity) {
      modeIdentity.textContent =
        session?.user.nickname ?? this.#t("records.guestOwner");
    }

    for (const modeKey of [
      "classic_4x4_pow2_undo",
      "board_3x3_pow2_no_undo",
    ] as const) {
      const state = this.#root.querySelector<HTMLElement>(
        `[data-mode="${modeKey}"] [data-mode-state]`,
      );
      if (!state) continue;
      state.textContent = session
        ? this.#t("modes.accountState")
        : this.#t("modes.lockedState");
      state.classList.toggle("mode-card__state--locked", session === null);
    }
  }

  async #runOperation(
    form: HTMLFormElement,
    route: AuthTaskRoute,
  ): Promise<MobileAuthOperationResult<unknown>> {
    const auth = this.#auth;
    if (!auth) throw new Error("mobile_auth_service_unavailable");
    switch (route) {
      case "auth-login":
        return auth.run((service) =>
          service.login({
            email: this.#readValue(form, "email"),
            password: this.#readValue(form, "password"),
          }),
        );
      case "auth-register":
        return auth.run((service) =>
          service.registerStart({
            email: this.#readValue(form, "email"),
            nickname: this.#readValue(form, "nickname"),
            password: this.#readValue(form, "password"),
          }),
        );
      case "auth-register-verify":
        return auth.run((service) =>
          service.registerVerify({
            email: this.#registerEmail,
            code: this.#readValue(form, "code"),
          }),
        );
      case "auth-reset":
        return auth.run((service) =>
          service.passwordResetStart({
            email: this.#readValue(form, "email"),
          }),
        );
      case "auth-reset-verify":
        return auth.run((service) =>
          service.passwordResetVerify({
            email: this.#resetEmail,
            code: this.#readValue(form, "code"),
            newPassword: this.#readValue(form, "newPassword"),
          }),
        );
    }
  }

  #renderContext(): void {
    const copy = this.#targetMode
      ? this.#t("auth.contextMode")
      : this.#t("auth.contextAccount");
    for (const element of this.#root.querySelectorAll<HTMLElement>(
      "[data-auth-context]",
    )) {
      element.textContent = copy;
    }
  }

  #readValue(form: HTMLFormElement, name: string): string {
    const field = form.elements.namedItem(name);
    return field instanceof HTMLInputElement ? field.value : "";
  }

  #clearValue(form: HTMLFormElement, name: string): void {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement) field.value = "";
  }

  #prefillLoginEmail(email: string): void {
    const input = this.#root.querySelector<HTMLInputElement>(
      '[data-app-view="auth-login"] input[name="email"]',
    );
    if (input) input.value = email;
  }

  #resetForms(): void {
    for (const form of this.#root.querySelectorAll<HTMLFormElement>(
      "[data-auth-form]",
    )) {
      form.reset();
    }
  }

  #setBusy(busy: boolean): void {
    this.#busy = busy;
    for (const form of this.#root.querySelectorAll<HTMLFormElement>(
      "[data-auth-form]",
    )) {
      form.setAttribute("aria-busy", String(busy));
      const submit =
        form.querySelector<HTMLButtonElement>("[data-auth-submit]");
      if (submit) submit.disabled = busy;
    }
  }

  #showIssue(route: AuthTaskRoute, issue: MobileAuthIssue): void {
    const view = this.#root.querySelector<HTMLElement>(
      `[data-app-view="${route}"]`,
    );
    const error = view?.querySelector<HTMLElement>("[data-auth-error]");
    if (!error) return;
    error.hidden = false;
    error.dataset.errorCode = issue.serverCode ?? issue.kind;
    error.textContent = this.#issueMessage(issue.kind);
  }

  #clearIssues(): void {
    for (const error of this.#root.querySelectorAll<HTMLElement>(
      "[data-auth-error]",
    )) {
      error.hidden = true;
      error.textContent = "";
      error.removeAttribute("data-error-code");
    }
  }

  #issueMessage(kind: MobileAuthIssueKind): string {
    switch (kind) {
      case "privacy_required":
        return this.#t("auth.error.privacy");
      case "invalid_input":
        return this.#t("auth.error.invalidInput");
      case "invalid_credentials":
        return this.#t("auth.error.credentials");
      case "email_exists":
        return this.#t("auth.error.emailExists");
      case "nickname_exists":
        return this.#t("auth.error.nicknameExists");
      case "verification_invalid":
        return this.#t("auth.error.verification");
      case "verification_expired":
        return this.#t("auth.error.expired");
      case "rate_limited":
        return this.#t("auth.error.rateLimit");
      case "network_error":
        return this.#t("auth.error.network");
      case "service_unavailable":
        return this.#t("auth.error.unavailable");
      default:
        return this.#t("auth.error.generic");
    }
  }

  #setText(selector: string, value: string): void {
    const element = this.#root.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`mobile_auth_missing_element:${selector}`);
    element.textContent = value;
  }
}
