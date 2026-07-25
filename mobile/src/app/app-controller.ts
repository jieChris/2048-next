import {
  isAppModeKey,
  type AppModeKey,
  type GameDirection,
  type GameTransition,
  type ReplayRecord,
} from "../../../src/contracts";
import { getBestTileValue } from "../../../src/core/engine";
import type { AccountSessionV1 } from "../auth/account-session";
import {
  loadAccountDeletionReceipt,
  saveAccountDeletionReceipt,
} from "../auth/account-deletion-receipt";
import type { MobileAuthIssue } from "../auth/auth-flow";
import type { MobileAuthServiceFactory } from "../auth/auth-flow";
import {
  isAuthenticatedModeKey,
  isAuthTaskRoute,
  MobileAuthTask,
  type AuthenticatedAppModeKey,
  type AuthSourceRoute,
  type AuthTaskRoute,
} from "../auth/auth-task";
import type {
  AchievementsCacheValue,
  CachedAchievementRow,
  CachedHistoryRow,
  CloudHistoryCacheValue,
  StoredGameRecord,
} from "../data/app-database";
import type {
  CloudHistoryQuery,
  LeaderboardMetric,
  LeaderboardPeriod,
  LeaderboardQuery,
  MobileCloudData,
} from "../data/mobile-cloud-data";
import { mountBoard, type BoardView } from "../game/board-view";
import {
  buildReplayTimeline,
  resolveReplayProgress,
  type ReplayTimeline,
} from "../game/replay-timeline";
import type { GuestGameSession } from "../game/guest-session";
import type { AppLocalePreference, Translator } from "../i18n";
import type { ThemePreference } from "../theme";
import type { GuestAppRuntime } from "./app-runtime";

export type AppNetworkMode = "undecided" | "offline" | "online";
export type AppTopRoute = "home" | "modes" | "records" | "me";
export type AppRoute =
  | "privacy"
  | AppTopRoute
  | "achievements"
  | "policies"
  | "game"
  | "result"
  | "detail"
  | "replay"
  | AuthTaskRoute;

export type { AuthenticatedAppModeKey, AuthTaskRoute } from "../auth/auth-task";

export type AuthenticatedModeEntryResult =
  | { status: "entered" }
  | { status: "unavailable" };

type RecordSort = "time" | "score" | "boardSum";
type RecordOwner = "guest" | "account-active" | "account-deleted";
type OnlineIntent = "auth" | "achievements" | "leaderboard";
type RecordSourceRoute = "home" | "records";
type ReplaySourceRoute = "result" | "detail";
type NavigationKind =
  | "enter"
  | "terminal"
  | "retry-terminal"
  | "retry-record-upload"
  | "logout-prepare"
  | "logout-confirm"
  | "restart"
  | "leave"
  | "result-home"
  | "open-record"
  | "delete-record"
  | "enter-account"
  | "pending-terminal-undo"
  | "pending-terminal-confirm";

export interface AppControllerOptions {
  root: HTMLElement;
  runtime: GuestAppRuntime;
  t: Translator;
  locale: "zh-CN" | "en";
  initialRoute?: AppTopRoute;
  networkMode: AppNetworkMode;
  onNetworkModeChange(mode: Exclude<AppNetworkMode, "undecided">): void;
  authServiceFactory?: MobileAuthServiceFactory;
  initialAccountSession?: AccountSessionV1 | null;
  enterAuthenticatedMode?: (
    modeKey: AppModeKey,
    session: AccountSessionV1,
  ) => Promise<AuthenticatedModeEntryResult>;
  diagnosticsEnabled?: boolean;
  themePreference?: ThemePreference;
  localePreference?: AppLocalePreference;
  soundEffectsEnabled?: boolean;
  hapticsEnabled?: boolean;
  bgmEnabled?: boolean;
  onDiagnosticsEnabledChange?: (enabled: boolean) => void;
  onThemePreferenceChange?: (preference: ThemePreference) => void;
  onLocalePreferenceChange?: (preference: AppLocalePreference) => void;
  onSoundEffectsEnabledChange?: (enabled: boolean) => void;
  onHapticsEnabledChange?: (enabled: boolean) => void;
  onBgmEnabledChange?: (enabled: boolean) => void;
  onGameTransition?: (
    transition: GameTransition,
    finalTerminal: boolean,
  ) => void;
  onPendingTerminalFinished?: () => void;
  onExportDiagnostics?: () => Promise<void>;
  onShareReplay?: (replay: ReplayRecord) => Promise<void>;
  onAccountSessionChange?: (session: AccountSessionV1 | null) => void;
  cloudData?: Pick<
    MobileCloudData,
    | "readHistoryCache"
    | "refreshHistory"
    | "deleteRecord"
    | "restoreRecord"
    | "readLeaderboardCache"
    | "refreshLeaderboard"
    | "readReplayCache"
    | "refreshReplay"
  > &
    Partial<
      Pick<
        MobileCloudData,
        "readAchievementsCache" | "refreshAchievements"
      >
    >;
}

export interface AppController {
  readonly route: AppRoute;
  pause(): Promise<void>;
  resume(): void;
  handleBack(): Promise<boolean>;
  notifyAccountDeletionCancelled(): void;
  showFatal(error: unknown): void;
  destroy(): void;
}

function requireElement<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`mobile_app_missing_element:${selector}`);
  return element;
}

function cloneRecords(
  records: readonly StoredGameRecord[],
): StoredGameRecord[] {
  if (typeof structuredClone === "function") {
    return structuredClone([...records]);
  }
  return JSON.parse(JSON.stringify(records)) as StoredGameRecord[];
}

export function formatDuration(durationMs: number): string {
  const seconds = Math.max(0, Math.floor(durationMs / 1_000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  const pair = (value: number): string => String(value).padStart(2, "0");
  return hours > 0
    ? `${pair(hours)}:${pair(minutes)}:${pair(remainder)}`
    : `${pair(minutes)}:${pair(remainder)}`;
}

export function formatSpeedDuration(durationMs: number): string {
  const milliseconds = Math.max(0, Math.floor(durationMs));
  const seconds = Math.floor(milliseconds / 1_000);
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = seconds % 60;
  const remainderMilliseconds = milliseconds % 1_000;
  return `${String(minutes).padStart(2, "0")}:${String(remainderSeconds).padStart(2, "0")}.${String(remainderMilliseconds).padStart(3, "0")}`;
}

export function resolveStoredSaveDurationMs(save: {
  readonly snapshot: {
    readonly savedAtMs: number;
    readonly state: {
      readonly startedAtMs: number | null;
      readonly durationMs: number;
    };
  };
}): number {
  const { savedAtMs, state } = save.snapshot;
  const { startedAtMs, durationMs } = state;
  if (startedAtMs === null) return 0;
  if (
    !Number.isSafeInteger(savedAtMs) ||
    savedAtMs < 0 ||
    !Number.isSafeInteger(startedAtMs) ||
    startedAtMs < 0 ||
    !Number.isSafeInteger(durationMs) ||
    durationMs < 0
  ) {
    throw new RangeError("mobile_app_invalid_save_duration");
  }
  return Math.max(durationMs, savedAtMs - startedAtMs, 0);
}

export function sortGuestRecords(
  records: readonly StoredGameRecord[],
  order: RecordSort,
): StoredGameRecord[] {
  return cloneRecords(records).sort((left, right) => {
    const primary =
      order === "score"
        ? right.score - left.score
        : order === "boardSum"
          ? right.boardSum - left.boardSum
          : right.endedAt - left.endedAt;
    return (
      primary ||
      right.endedAt - left.endedAt ||
      left.clientRecordId.localeCompare(right.clientRecordId)
    );
  });
}

function openDialog(dialog: HTMLDialogElement): void {
  if (dialog.open) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(dialog: HTMLDialogElement): void {
  if (!dialog.open && !dialog.hasAttribute("open")) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = Reflect.get(error, "code");
    if (typeof code === "string") return code.slice(0, 128);
  }
  return error instanceof Error
    ? error.message.slice(0, 128)
    : "mobile_app_unknown_error";
}

class MobileAppController implements AppController {
  readonly #root: HTMLElement;
  readonly #runtime: GuestAppRuntime;
  readonly #t: Translator;
  readonly #locale: "zh-CN" | "en";
  readonly #numberFormat: Intl.NumberFormat;
  readonly #dateFormat: Intl.DateTimeFormat;
  readonly #onNetworkModeChange: AppControllerOptions["onNetworkModeChange"];
  readonly #authTask: MobileAuthTask;
  readonly #enterAuthenticatedMode: NonNullable<
    AppControllerOptions["enterAuthenticatedMode"]
  > | null;
  readonly #onDiagnosticsEnabledChange: (enabled: boolean) => void;
  readonly #onThemePreferenceChange: (preference: ThemePreference) => void;
  readonly #onLocalePreferenceChange: (
    preference: AppLocalePreference,
  ) => void;
  readonly #onSoundEffectsEnabledChange: (enabled: boolean) => void;
  readonly #onHapticsEnabledChange: (enabled: boolean) => void;
  readonly #onBgmEnabledChange: (enabled: boolean) => void;
  readonly #onGameTransition: (
    transition: GameTransition,
    finalTerminal: boolean,
  ) => void;
  readonly #onPendingTerminalFinished: () => void;
  readonly #onExportDiagnostics: () => Promise<void>;
  readonly #onShareReplay: (replay: ReplayRecord) => Promise<void>;
  readonly #onAccountSessionChange: (session: AccountSessionV1 | null) => void;
  readonly #cloudData: AppControllerOptions["cloudData"];
  readonly #views: Map<AppRoute, HTMLElement>;
  readonly #bottomNavigation: HTMLElement;
  readonly #status: HTMLElement;
  readonly #onClick: (event: Event) => void;
  readonly #onChange: (event: Event) => void;
  readonly #onSubmit: (event: SubmitEvent) => void;
  readonly #onDialogCancel: (event: Event) => void;
  readonly #dialogOpeners = new WeakMap<HTMLDialogElement, HTMLElement>();

  #route: AppRoute;
  #networkMode: AppNetworkMode;
  #privacyReturnRoute: AppRoute | null = null;
  #policyReturnRoute: AppRoute = "me";
  #pendingOnlineIntent: OnlineIntent | null = null;
  #postAuthRoute: "achievements" | null = null;
  #detailSource: RecordSourceRoute = "records";
  #replaySource: ReplaySourceRoute = "detail";
  #selectedRecord: StoredGameRecord | null = null;
  #selectedCloudRecord: CachedHistoryRow | null = null;
  #recordSort: RecordSort = "time";
  #recordOwner: RecordOwner;
  #cloudHistory: CloudHistoryCacheValue | null = null;
  #cloudHistoryFetchedAt: number | null = null;
  #cloudHistoryRequestEpoch = 0;
  #gameBoard: BoardView | null = null;
  #replayBoard: BoardView | null = null;
  #replayTimeline: ReplayTimeline | null = null;
  #replayRecord: ReplayRecord | null = null;
  #replayIndex = 0;
  #replayTimer: number | null = null;
  #gameTimer: number | null = null;
  #statusTimer: number | null = null;
  #milestoneTimer: number | null = null;
  #moveBusy = false;
  #navigationBusy = false;
  #navigationEpoch = 0;
  #navigationKind: NavigationKind | null = null;
  #navigationTask: Promise<void> | null = null;
  #performanceSequence = 0;
  #destroyed = false;
  #leaderboardRequestEpoch = 0;
  #achievementsRequestEpoch = 0;
  #leaderboardQuery: LeaderboardQuery = {
    modeKey: "standard_4x4_pow2_no_undo",
    metric: "score",
    period: "all",
    targetTile: 2048,
    page: 1,
  };

  constructor(options: AppControllerOptions) {
    this.#root = options.root;
    this.#runtime = options.runtime;
    this.#t = options.t;
    this.#locale = options.locale;
    this.#networkMode = options.networkMode;
    this.#onNetworkModeChange = options.onNetworkModeChange;
    this.#authTask = new MobileAuthTask({
      root: options.root,
      t: options.t,
      ...(options.authServiceFactory
        ? { serviceFactory: options.authServiceFactory }
        : {}),
      initialSession: options.initialAccountSession ?? null,
    });
    this.#enterAuthenticatedMode = options.enterAuthenticatedMode ?? null;
    this.#onDiagnosticsEnabledChange =
      options.onDiagnosticsEnabledChange ?? (() => undefined);
    this.#onThemePreferenceChange =
      options.onThemePreferenceChange ?? (() => undefined);
    this.#onLocalePreferenceChange =
      options.onLocalePreferenceChange ?? (() => undefined);
    this.#onSoundEffectsEnabledChange =
      options.onSoundEffectsEnabledChange ?? (() => undefined);
    this.#onHapticsEnabledChange =
      options.onHapticsEnabledChange ?? (() => undefined);
    this.#onBgmEnabledChange =
      options.onBgmEnabledChange ?? (() => undefined);
    this.#onGameTransition = options.onGameTransition ?? (() => undefined);
    this.#onPendingTerminalFinished =
      options.onPendingTerminalFinished ?? (() => undefined);
    this.#onExportDiagnostics =
      options.onExportDiagnostics ?? (() => Promise.resolve());
    this.#onShareReplay =
      options.onShareReplay ?? (() => Promise.resolve());
    this.#onAccountSessionChange =
      options.onAccountSessionChange ?? (() => undefined);
    this.#cloudData = options.cloudData;
    this.#recordOwner = options.initialAccountSession
      ? "account-active"
      : "guest";
    this.#numberFormat = new Intl.NumberFormat(options.locale);
    this.#dateFormat = new Intl.DateTimeFormat(options.locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    this.#views = new Map(
      [...this.#root.querySelectorAll<HTMLElement>("[data-app-view]")].map(
        (view) => [view.dataset.appView as AppRoute, view],
      ),
    );
    this.#bottomNavigation = requireElement(
      this.#root,
      "[data-app-bottom-nav]",
    );
    this.#status = requireElement(this.#root, "[data-app-status]");
    this.#route =
      this.#networkMode === "undecided"
        ? "privacy"
        : options.initialRoute ?? "home";

    this.#onClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest<HTMLElement>(
        "[data-consent], [data-nav], [data-action], [data-mode-card], [data-record-id], [data-cloud-record-id]",
      );
      if (!trigger || !this.#root.contains(trigger)) return;
      void this.#dispatch(trigger).catch((error: unknown) => {
        this.#showStorageError(error);
      });
    };
    this.#onChange = (event) => {
      const target = event.target;
      if (
        !(
          target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement
        )
      ) {
        return;
      }
      if (target.matches("[data-record-sort]")) {
        const value = target.value;
        if (value === "time" || value === "score" || value === "boardSum") {
          this.#recordSort = value;
          this.#renderRecordSummaries();
          if (this.#recordOwner !== "guest") void this.#loadCloudHistory();
        }
      }
      if (target.matches("[data-record-owner]")) {
        const value = target.value;
        if (
          value === "guest" ||
          value === "account-active" ||
          value === "account-deleted"
        ) {
          this.#recordOwner = value;
          this.#cloudHistoryRequestEpoch += 1;
          this.#cloudHistory = null;
          this.#cloudHistoryFetchedAt = null;
          this.#renderRecordSummaries();
          if (value !== "guest") void this.#loadCloudHistory();
        }
      }
      if (
        target instanceof HTMLInputElement &&
        target.matches("[data-diagnostics-enabled]")
      ) {
        this.#onDiagnosticsEnabledChange(target.checked);
      }
      if (target.matches("[data-replay-progress]")) {
        this.#stopReplay();
        this.#setReplayIndex(Number.parseInt(target.value, 10));
      }
      if (target.matches("[data-leaderboard-filter]")) {
        this.#updateLeaderboardQuery();
        void this.#loadLeaderboard();
      }
      if (target.matches("[data-theme-preference]")) {
        const value = target.value;
        if (value === "system" || value === "light" || value === "dark") {
          this.#onThemePreferenceChange(value);
        }
      }
      if (target.matches("[data-locale-preference]")) {
        const value = target.value;
        if (value === "system" || value === "zh-CN" || value === "en") {
          this.#onLocalePreferenceChange(value);
        }
      }
      if (
        target instanceof HTMLInputElement &&
        target.matches("[data-sound-effects-enabled]")
      ) {
        this.#onSoundEffectsEnabledChange(target.checked);
      }
      if (
        target instanceof HTMLInputElement &&
        target.matches("[data-haptics-enabled]")
      ) {
        this.#onHapticsEnabledChange(target.checked);
      }
      if (
        target instanceof HTMLInputElement &&
        target.matches("[data-bgm-enabled]")
      ) {
        this.#onBgmEnabledChange(target.checked);
      }
    };
    this.#onSubmit = (event) => {
      const form = event.target;
      if (
        !(form instanceof HTMLFormElement)
      ) {
        return;
      }
      if (form.matches("[data-account-deletion-form]")) {
        event.preventDefault();
        void this.#submitAccountDeletion(form);
        return;
      }
      if (!form.matches("[data-auth-form]")) return;
      event.preventDefault();
      void this.#submitAuth(form).catch((error: unknown) => {
        this.#authTask.showUnexpectedIssue(this.#route, errorCode(error));
      });
    };
    this.#onDialogCancel = (event) => {
      event.preventDefault();
      const target = event.target;
      if (target instanceof HTMLDialogElement) this.#cancelModal(target);
    };

    this.#root.addEventListener("click", this.#onClick);
    this.#root.addEventListener("change", this.#onChange);
    this.#root.addEventListener("submit", this.#onSubmit);
    for (const dialog of this.#dialogs()) {
      dialog.addEventListener("cancel", this.#onDialogCancel);
    }

    this.#syncShellState();
    requireElement<HTMLInputElement>(
      this.#root,
      "[data-diagnostics-enabled]",
    ).checked = options.diagnosticsEnabled ?? true;
    requireElement<HTMLSelectElement>(
      this.#root,
      "[data-theme-preference]",
    ).value = options.themePreference ?? "system";
    requireElement<HTMLSelectElement>(
      this.#root,
      "[data-locale-preference]",
    ).value = options.localePreference ?? "system";
    requireElement<HTMLInputElement>(
      this.#root,
      "[data-sound-effects-enabled]",
    ).checked = options.soundEffectsEnabled ?? true;
    requireElement<HTMLInputElement>(
      this.#root,
      "[data-haptics-enabled]",
    ).checked = options.hapticsEnabled ?? true;
    requireElement<HTMLInputElement>(
      this.#root,
      "[data-bgm-enabled]",
    ).checked = options.bgmEnabled ?? false;
    this.#renderRecordSummaries();
    this.#renderAccountDeletionReceipt();
    this.#showRoute(this.#route);
    const save = this.#runtime.guestSave;
    if (save.status === "corrupt" || save.status === "future_schema") {
      this.#showStatus(this.#t("status.storageError"), "error");
    }
  }

  get route(): AppRoute {
    return this.#route;
  }

  notifyAccountDeletionCancelled(): void {
    this.#renderAccountDeletionReceipt();
    this.#showStatus(
      this.#t("accountDeletion.cancelled"),
      "success",
      5_000,
    );
  }

  async pause(): Promise<void> {
    if (!this.#runtime.activeSession) return;
    try {
      await this.#runtime.pauseActiveSession();
    } catch (error) {
      this.#showStorageError(error);
      throw error;
    }
  }

  resume(): void {
    this.#runtime.resumeActiveSession();
    if (this.#route === "game") this.#updateGameReadouts();
  }

  async handleBack(): Promise<boolean> {
    const openModal = this.#dialogs().find((dialog) => dialog.open);
    if (openModal) {
      if (openModal.matches("[data-pending-terminal-dialog]")) {
        this.#closeModal(openModal);
        await this.#leaveGame();
        return true;
      }
      this.#cancelModal(openModal);
      return true;
    }

    const pendingKind = this.#navigationKind;
    const pendingTask = this.#navigationTask;
    if (pendingTask) {
      if (pendingKind === "leave" || pendingKind === "result-home") {
        await pendingTask;
        return true;
      }
      if (this.#route === "game") {
        await this.#leaveGame();
        return true;
      }
      if (this.#route === "result") {
        await this.#returnHomeFromResult();
        return true;
      }
      await this.#invalidateNavigation();
      if (this.#destroyed) return true;
      if (this.#route === "detail") this.#showRoute(this.#detailSource);
      else if (this.#route === "replay") this.#closeReplay();
      else if (this.#route === "policies") this.#returnFromPolicies();
      else if (isAuthTaskRoute(this.#route)) this.#backAuthentication();
      else if (this.#route === "privacy" && this.#privacyReturnRoute) {
        this.#returnFromPrivacy(false);
      } else if (this.#route !== "home" && this.#route !== "privacy") {
        this.#showRoute("home");
      }
      return true;
    }

    if (this.#route === "privacy" && this.#privacyReturnRoute) {
      this.#returnFromPrivacy(false);
      return true;
    }
    if (isAuthTaskRoute(this.#route)) {
      this.#backAuthentication();
      return true;
    }
    if (this.#route === "game") {
      await this.#leaveGame();
      return true;
    }
    if (this.#route === "result") {
      await this.#returnHomeFromResult();
      return true;
    }
    if (this.#route === "detail") {
      this.#showRoute(this.#detailSource);
      return true;
    }
    if (this.#route === "achievements") {
      this.#showRoute("me");
      return true;
    }
    if (this.#route === "policies") {
      this.#returnFromPolicies();
      return true;
    }
    if (this.#route === "replay") {
      this.#closeReplay();
      return true;
    }
    if (this.#route !== "home" && this.#route !== "privacy") {
      this.#showRoute("home");
      return true;
    }
    return false;
  }

  showFatal(error: unknown): void {
    this.#showStorageError(error);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#navigationEpoch += 1;
    this.#root.removeEventListener("click", this.#onClick);
    this.#root.removeEventListener("change", this.#onChange);
    this.#root.removeEventListener("submit", this.#onSubmit);
    for (const dialog of this.#dialogs()) {
      dialog.removeEventListener("cancel", this.#onDialogCancel);
    }
    this.#clearGameSurface();
    this.#clearReplaySurface();
    if (this.#statusTimer !== null) window.clearTimeout(this.#statusTimer);
    if (this.#milestoneTimer !== null)
      window.clearTimeout(this.#milestoneTimer);
  }

  #runNavigation(
    kind: NavigationKind,
    work: (epoch: number) => Promise<void>,
  ): Promise<void> {
    if (this.#navigationTask) return this.#navigationTask;
    const epoch = ++this.#navigationEpoch;
    this.#navigationBusy = true;
    this.#navigationKind = kind;
    let task: Promise<void>;
    task = Promise.resolve()
      .then(() => work(epoch))
      .finally(() => {
        if (this.#navigationTask !== task) return;
        this.#navigationTask = null;
        this.#navigationKind = null;
        this.#navigationBusy = false;
      });
    this.#navigationTask = task;
    return task;
  }

  #isNavigationCurrent(epoch: number): boolean {
    return !this.#destroyed && epoch === this.#navigationEpoch;
  }

  async #invalidateNavigation(): Promise<void> {
    const task = this.#navigationTask;
    if (!task) return;
    this.#navigationEpoch += 1;
    await task;
  }

  async #dispatch(trigger: HTMLElement): Promise<void> {
    const consent = trigger.dataset.consent;
    if (consent === "offline" || consent === "online") {
      this.#chooseNetworkMode(consent);
      return;
    }

    const route = trigger.dataset.nav;
    if (
      route === "home" ||
      route === "modes" ||
      route === "records" ||
      route === "me"
    ) {
      await this.#navigateTop(route);
      return;
    }

    const recordId = trigger.dataset.recordId;
    if (recordId) {
      await this.#openRecord(
        recordId,
        this.#route === "home" ? "home" : "records",
      );
      return;
    }

    const cloudRecordId = trigger.dataset.cloudRecordId;
    if (cloudRecordId) {
      this.#openCloudRecord(
        cloudRecordId,
        this.#route === "home" ? "home" : "records",
      );
      return;
    }

    if (trigger.hasAttribute("data-mode-card")) {
      const mode = trigger.dataset.mode;
      if (mode === "standard_4x4_pow2_no_undo") await this.#enterStandard();
      else if (isAuthenticatedModeKey(mode)) {
        await this.#requestAuthenticatedMode(mode);
      }
      return;
    }

    switch (trigger.dataset.action) {
      case "enter-standard":
        await this.#enterStandard();
        break;
      case "leave-game":
        await this.#leaveGame();
        break;
      case "restart-game":
        this.#requestRestart();
        break;
      case "cancel-restart":
        this.#closeNamedDialog("[data-restart-dialog]");
        break;
      case "confirm-restart":
        this.#closeNamedDialog("[data-restart-dialog]");
        await this.#restartGame();
        break;
      case "pending-terminal-undo":
        await this.#undoPendingTerminal();
        break;
      case "pending-terminal-confirm":
        await this.#confirmPendingTerminal();
        break;
      case "result-again":
        await this.#restartGame();
        break;
      case "result-replay":
        await this.#openReplay("result");
        break;
      case "retry-record-upload":
        await this.#retryRecordUpload();
        break;
      case "result-home":
        await this.#returnHomeFromResult();
        break;
      case "request-account-logout":
        await this.#requestAccountLogout();
        break;
      case "cancel-account-logout":
        this.#closeNamedDialog("[data-account-logout-dialog]");
        break;
      case "confirm-account-logout":
        await this.#confirmAccountLogout();
        break;
      case "request-account-deletion":
        this.#openAccountDeletionDialog();
        break;
      case "cancel-account-deletion":
        this.#closeNamedDialog("[data-account-deletion-dialog]");
        break;
      case "close-detail":
        this.#showRoute(this.#detailSource);
        break;
      case "open-replay":
        await this.#openReplay("detail");
        break;
      case "close-replay":
        this.#closeReplay();
        break;
      case "replay-previous":
        this.#stopReplay();
        this.#setReplayIndex(this.#replayIndex - 1);
        break;
      case "replay-next":
        this.#stopReplay();
        this.#setReplayIndex(this.#replayIndex + 1);
        break;
      case "replay-play":
        this.#toggleReplay();
        break;
      case "share-replay":
        await this.#shareReplay();
        break;
      case "delete-record":
        if (this.#selectedCloudRecord?.deletedAt) {
          await this.#deleteSelectedRecord();
        } else {
          this.#prepareDeleteDialog();
          this.#openModal(requireElement(this.#root, "[data-delete-dialog]"));
        }
        break;
      case "cancel-delete":
        this.#closeNamedDialog("[data-delete-dialog]");
        break;
      case "confirm-delete":
        this.#closeNamedDialog("[data-delete-dialog]");
        await this.#deleteSelectedRecord();
        break;
      case "open-leaderboard":
        this.#requestOnline("leaderboard");
        break;
      case "close-leaderboard":
        this.#closeNamedDialog("[data-leaderboard-dialog]");
        break;
      case "open-auth-gate":
        this.#requestAuthentication("me", null);
        break;
      case "open-achievements-gate":
        this.#requestOnline("achievements");
        break;
      case "close-achievements":
        this.#showRoute("me");
        break;
      case "open-policies":
        this.#openPoliciesFromCurrentRoute();
        break;
      case "close-policies":
        this.#returnFromPolicies();
        break;
      case "export-diagnostics":
        await this.#exportDiagnostics();
        break;
      case "close-offline-gate":
        this.#pendingOnlineIntent = null;
        this.#clearAuthenticationIntent();
        this.#closeNamedDialog("[data-offline-gate]");
        break;
      case "close-auth-gate":
        this.#clearAuthenticationIntent();
        this.#closeNamedDialog("[data-auth-gate]");
        break;
      case "cancel-auth":
        this.#cancelAuthentication();
        break;
      case "auth-back":
        this.#backAuthentication();
        break;
      case "auth-open-register":
        this.#showAuthRoute("auth-register");
        break;
      case "auth-open-reset":
        this.#showAuthRoute("auth-reset");
        break;
      case "show-privacy-notes":
        this.#openPrivacyFromCurrentRoute();
        break;
      case "retry-save":
        await this.#retrySave();
        break;
      case "retry-leave":
        if (this.#route === "result") await this.#returnHomeFromResult();
        else await this.#leaveGame();
        break;
      case "retry-restart":
        await this.#restartGame();
        break;
      case "retry-terminal":
        await this.#retryTerminal();
        break;
      case "dismiss-status":
        this.#hideStatus();
        break;
      default:
        break;
    }
  }

  #syncShellState(): void {
    const shell = requireElement<HTMLElement>(this.#root, "[data-app-shell]");
    shell.dataset.networkMode = this.#networkMode;
    shell.dataset.appRoute = this.#route;
    const connectivity = this.#root.querySelector<HTMLElement>(
      "[data-connectivity]",
    );
    if (connectivity) {
      connectivity.textContent =
        this.#networkMode === "online"
          ? this.#t("home.onlineState")
          : this.#t("home.offlineState");
    }
  }

  async #navigateTop(route: AppTopRoute): Promise<void> {
    const timing = this.#beginPerformanceMeasure("app-navigation");
    if (this.#navigationTask) {
      if (
        this.#navigationKind === "leave" ||
        this.#navigationKind === "result-home"
      ) {
        await this.#navigationTask;
      } else {
        await this.#invalidateNavigation();
      }
    }
    if (!this.#destroyed) {
      this.#showRoute(route);
      this.#finishPerformanceMeasureNextFrame("app-navigation", timing);
    } else {
      performance.clearMarks(timing);
    }
  }

  #beginPerformanceMeasure(name: string): string {
    const mark = `${name}-start-${String(++this.#performanceSequence)}`;
    performance.mark(mark);
    return mark;
  }

  #finishPerformanceMeasureNextFrame(name: string, startMark: string): void {
    requestAnimationFrame(() => {
      const endMark = `${startMark}-end`;
      performance.mark(endMark);
      performance.measure(name, startMark, endMark);
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
    });
  }

  #showRoute(route: AppRoute): void {
    if (this.#destroyed) return;
    const previousRoute = this.#route;
    this.#route = route;
    for (const [name, view] of this.#views) view.hidden = name !== route;
    const topLevel =
      route === "home" ||
      route === "modes" ||
      route === "records" ||
      route === "me";
    this.#bottomNavigation.hidden = !topLevel;
    for (const button of this.#bottomNavigation.querySelectorAll<HTMLElement>(
      "[data-nav]",
    )) {
      if (button.dataset.nav === route)
        button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    if (route === "home" || route === "modes" || route === "records") {
      this.#renderRecordSummaries();
    }
    if (route === "records" && this.#recordOwner !== "guest") {
      void this.#loadCloudHistory();
    }
    if (route === "achievements") void this.#loadAchievements();
    if (route === "game") this.#startGameTimer();
    else this.#stopGameTimer();
    this.#syncShellState();
    const view = this.#views.get(route);
    if (
      previousRoute !== route ||
      !view?.contains(this.#root.ownerDocument.activeElement)
    ) {
      this.#focusRouteHeading(view);
    }
  }

  #focusRouteHeading(view: HTMLElement | undefined): void {
    const headingId = view?.getAttribute("aria-labelledby")?.split(/\s+/u)[0];
    if (!headingId) return;
    const heading = this.#root.ownerDocument.getElementById(headingId);
    if (!(heading instanceof HTMLElement) || !this.#root.contains(heading))
      return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }

  #chooseNetworkMode(mode: "offline" | "online"): void {
    this.#networkMode = mode;
    this.#onNetworkModeChange(mode);
    this.#syncShellState();
    if (this.#privacyReturnRoute) {
      this.#returnFromPrivacy(mode === "online");
      return;
    }
    this.#showRoute("home");
  }

  #openPoliciesFromCurrentRoute(): void {
    const openDialog = this.#dialogs().find((dialog) => dialog.open);
    if (openDialog) this.#closeModal(openDialog);
    this.#policyReturnRoute = this.#route;
    this.#runtime.activeSession?.addInputFence("dialog");
    this.#showRoute("policies");
  }

  #openPrivacyFromCurrentRoute(): void {
    const openDialog = this.#dialogs().find((dialog) => dialog.open);
    if (openDialog) this.#closeModal(openDialog);
    if (this.#route === "privacy") {
      this.#showStatus(this.#t("status.privacyPreview"), "info", 5_000);
      return;
    }
    this.#privacyReturnRoute = this.#route;
    this.#runtime.activeSession?.addInputFence("dialog");
    this.#showRoute("privacy");
  }

  #returnFromPolicies(): void {
    this.#runtime.activeSession?.removeInputFence("dialog");
    this.#showRoute(this.#policyReturnRoute);
  }

  #returnFromPrivacy(continueIntent: boolean): void {
    const route = this.#privacyReturnRoute ?? "home";
    this.#privacyReturnRoute = null;
    this.#runtime.activeSession?.removeInputFence("dialog");
    this.#showRoute(route);
    const intent = this.#pendingOnlineIntent;
    this.#pendingOnlineIntent = null;
    if (continueIntent && intent) {
      this.#showUnavailableOnlineIntent(intent);
    } else if (intent === "auth") {
      this.#clearAuthenticationIntent();
    }
  }

  #requestOnline(intent: OnlineIntent): void {
    if (this.#networkMode !== "online") {
      this.#pendingOnlineIntent = intent;
      this.#openModal(requireElement(this.#root, "[data-offline-gate]"));
      return;
    }
    this.#showUnavailableOnlineIntent(intent);
  }

  #showUnavailableOnlineIntent(_intent: OnlineIntent): void {
    if (_intent === "auth") {
      this.#openAuthentication();
      return;
    }
    if (_intent === "leaderboard") {
      this.#openLeaderboard();
      return;
    }
    this.#openAchievements();
  }

  #openAchievements(): void {
    if (this.#authTask.session) {
      this.#showRoute("achievements");
      return;
    }
    this.#postAuthRoute = "achievements";
    this.#requestAuthentication("me", null);
  }

  #openLeaderboard(): void {
    const activeMode = this.#runtime.activeSession?.state.modeKey;
    if (activeMode && isAuthenticatedModeKey(activeMode)) {
      this.#leaderboardQuery = {
        ...this.#leaderboardQuery,
        modeKey: activeMode,
        metric: "score",
      };
    } else if (activeMode === "standard_4x4_pow2_no_undo") {
      this.#leaderboardQuery = {
        ...this.#leaderboardQuery,
        modeKey: activeMode,
      };
    }
    this.#syncLeaderboardFilters();
    this.#openModal(
      requireElement<HTMLDialogElement>(
        this.#root,
        "[data-leaderboard-dialog]",
      ),
    );
    void this.#loadLeaderboard();
  }

  #syncLeaderboardFilters(): void {
    const mode = requireElement<HTMLSelectElement>(
      this.#root,
      "[data-leaderboard-mode]",
    );
    const metric = requireElement<HTMLSelectElement>(
      this.#root,
      "[data-leaderboard-metric]",
    );
    const period = requireElement<HTMLSelectElement>(
      this.#root,
      "[data-leaderboard-period]",
    );
    const target = requireElement<HTMLSelectElement>(
      this.#root,
      "[data-leaderboard-target]",
    );
    mode.value = this.#leaderboardQuery.modeKey;
    metric.value = this.#leaderboardQuery.metric;
    period.value = this.#leaderboardQuery.period;
    target.value = String(this.#leaderboardQuery.targetTile ?? 2048);
    const speedAvailable =
      this.#leaderboardQuery.modeKey === "standard_4x4_pow2_no_undo";
    metric.querySelector<HTMLOptionElement>('option[value="speed"]')!.disabled =
      !speedAvailable;
    target.closest<HTMLElement>("label")!.hidden =
      !speedAvailable || this.#leaderboardQuery.metric !== "speed";
  }

  #updateLeaderboardQuery(): void {
    const mode = requireElement<HTMLSelectElement>(
      this.#root,
      "[data-leaderboard-mode]",
    ).value;
    const metric = requireElement<HTMLSelectElement>(
      this.#root,
      "[data-leaderboard-metric]",
    ).value;
    const period = requireElement<HTMLSelectElement>(
      this.#root,
      "[data-leaderboard-period]",
    ).value;
    const targetTile = Number(
      requireElement<HTMLSelectElement>(
        this.#root,
        "[data-leaderboard-target]",
      ).value,
    );
    if (!isAuthenticatedModeKey(mode) && mode !== "standard_4x4_pow2_no_undo") {
      return;
    }
    const normalizedMetric: LeaderboardMetric =
      mode === "standard_4x4_pow2_no_undo" && metric === "speed"
        ? "speed"
        : "score";
    const normalizedPeriod: LeaderboardPeriod =
      period === "day" || period === "week" || period === "month"
        ? period
        : "all";
    this.#leaderboardQuery = {
      modeKey: mode,
      metric: normalizedMetric,
      period: normalizedPeriod,
      targetTile: [2048, 4096, 8192, 16384, 32768].includes(targetTile)
        ? targetTile
        : 2048,
      page: 1,
    };
    this.#syncLeaderboardFilters();
  }

  async #loadLeaderboard(): Promise<void> {
    const epoch = ++this.#leaderboardRequestEpoch;
    const dialog = requireElement<HTMLDialogElement>(
      this.#root,
      "[data-leaderboard-dialog]",
    );
    if (!this.#cloudData || !dialog.open) return;
    const query = { ...this.#leaderboardQuery };
    const status = requireElement<HTMLElement>(
      this.#root,
      "[data-leaderboard-status]",
    );
    status.textContent = this.#t("leaderboard.loading");
    const cached = await this.#cloudData.readLeaderboardCache(query).catch(
      () => null,
    );
    if (epoch !== this.#leaderboardRequestEpoch || !dialog.open) return;
    if (cached) {
      this.#renderLeaderboard(cached.value);
      status.textContent = this.#t("leaderboard.cached").replace(
        "{time}",
        this.#dateFormat.format(new Date(cached.fetchedAt)),
      );
    }
    try {
      const refreshed = await this.#cloudData.refreshLeaderboard(query);
      if (epoch !== this.#leaderboardRequestEpoch || !dialog.open) return;
      this.#renderLeaderboard(refreshed.value);
      status.textContent = this.#t("leaderboard.updated").replace(
        "{time}",
        this.#dateFormat.format(new Date(refreshed.fetchedAt)),
      );
    } catch {
      if (epoch !== this.#leaderboardRequestEpoch || !dialog.open) return;
      status.textContent = cached
        ? this.#t("leaderboard.offlineCached")
        : this.#t("leaderboard.unavailable");
      if (!cached) this.#renderLeaderboard({ rows: [] });
    }
  }

  #renderLeaderboard(value: {
    rows: Array<{
      rank: number;
      nickname: string;
      score: number | null;
      speedMs: number | null;
      achievedAt: string;
    }>;
  }): void {
    const list = requireElement<HTMLElement>(
      this.#root,
      "[data-leaderboard-list]",
    );
    const fragment = document.createDocumentFragment();
    for (const row of value.rows) {
      const item = document.createElement("div");
      item.className = "leaderboard-row";
      const rank = document.createElement("strong");
      rank.className = "leaderboard-row__rank";
      rank.textContent = `#${this.#numberFormat.format(row.rank)}`;
      const player = document.createElement("span");
      player.className = "leaderboard-row__player";
      player.textContent = row.nickname;
      const result = document.createElement("span");
      result.className = "leaderboard-row__result";
      result.textContent =
        this.#leaderboardQuery.metric === "speed"
          ? formatSpeedDuration(row.speedMs ?? 0)
          : this.#numberFormat.format(row.score ?? 0);
      item.append(rank, player, result);
      fragment.append(item);
    }
    list.replaceChildren(fragment);
    requireElement<HTMLElement>(
      this.#root,
      "[data-leaderboard-empty]",
    ).hidden = value.rows.length > 0;
  }

  async #loadAchievements(): Promise<void> {
    const epoch = ++this.#achievementsRequestEpoch;
    const cloudData = this.#cloudData;
    const session = this.#authTask.session;
    const status = requireElement<HTMLElement>(
      this.#root,
      "[data-achievements-status]",
    );
    this.#renderAchievements({ earned: [], available: [] });
    status.textContent = this.#t("achievements.loading");
    if (
      !session ||
      !cloudData?.readAchievementsCache ||
      !cloudData.refreshAchievements
    ) {
      status.textContent = this.#t("achievements.unavailable");
      return;
    }
    const cached = await cloudData.readAchievementsCache(session.user.id).catch(
      () => null,
    );
    if (epoch !== this.#achievementsRequestEpoch || this.#route !== "achievements") {
      return;
    }
    if (cached) {
      this.#renderAchievements(cached.value);
      status.textContent = this.#t("achievements.cached").replace(
        "{time}",
        this.#dateFormat.format(new Date(cached.fetchedAt)),
      );
    }
    try {
      const refreshed = await cloudData.refreshAchievements({
        userId: session.user.id,
      });
      if (
        epoch !== this.#achievementsRequestEpoch ||
        this.#route !== "achievements"
      ) {
        return;
      }
      this.#renderAchievements(refreshed.value);
      status.textContent = this.#t("achievements.updated").replace(
        "{time}",
        this.#dateFormat.format(new Date(refreshed.fetchedAt)),
      );
    } catch {
      if (
        epoch !== this.#achievementsRequestEpoch ||
        this.#route !== "achievements"
      ) {
        return;
      }
      status.textContent = cached
        ? this.#t("achievements.offlineCached")
        : this.#t(
            window.navigator.onLine
              ? "achievements.unavailable"
              : "achievements.offlineEmpty",
          );
    }
  }

  #renderAchievements(value: AchievementsCacheValue): void {
    this.#renderAchievementCards(
      "[data-achievements-earned]",
      value.earned,
      true,
    );
    this.#renderAchievementCards(
      "[data-achievements-available]",
      value.available,
      false,
    );
    this.#setText(
      "[data-achievements-earned-count]",
      this.#numberFormat.format(value.earned.length),
    );
    this.#setText(
      "[data-achievements-available-count]",
      this.#numberFormat.format(value.available.length),
    );
    requireElement<HTMLElement>(
      this.#root,
      "[data-achievements-earned-empty]",
    ).hidden = value.earned.length > 0;
    requireElement<HTMLElement>(
      this.#root,
      "[data-achievements-available-empty]",
    ).hidden = value.available.length > 0;
  }

  #renderAchievementCards(
    selector: string,
    rows: readonly CachedAchievementRow[],
    earned: boolean,
  ): void {
    const list = requireElement<HTMLElement>(this.#root, selector);
    const fragment = document.createDocumentFragment();
    for (const row of rows) {
      const card = document.createElement("article");
      card.className = "achievement-card";
      card.dataset.achievementId = row.id;
      const badge = document.createElement("span");
      badge.className = "achievement-card__badge";
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = earned ? "✓" : "○";
      const copy = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = this.#localizedAchievementText(row.name);
      const description = document.createElement("p");
      description.textContent = this.#localizedAchievementText(row.description);
      const meta = document.createElement("small");
      if (earned && row.earnedAt && row.source) {
        meta.textContent = this.#t("achievements.earnedMeta")
          .replace("{time}", this.#dateFormat.format(new Date(row.earnedAt)))
          .replace("{source}", this.#achievementSource(row.source));
      } else if (row.requiredModeKeys.length > 0) {
        meta.textContent = this.#t("achievements.availableMeta").replace(
          "{modes}",
          row.requiredModeKeys
            .filter(isAppModeKey)
            .map((modeKey) => this.#modeTitle(modeKey))
            .join(" · "),
        );
      } else {
        meta.textContent = this.#t("achievements.availableAnyMode");
      }
      copy.append(title, description, meta);
      card.append(badge, copy);
      fragment.append(card);
    }
    list.replaceChildren(fragment);
  }

  #localizedAchievementText(value: { zhCn: string; en: string }): string {
    return this.#locale === "en" ? value.en : value.zhCn;
  }

  #achievementSource(source: NonNullable<CachedAchievementRow["source"]>): string {
    if (source === "event") return this.#t("achievements.sourceEvent");
    if (source === "manual") return this.#t("achievements.sourceManual");
    if (source === "backfill") return this.#t("achievements.sourceBackfill");
    return this.#t("achievements.sourceRecord");
  }

  async #requestAuthenticatedMode(
    modeKey: AuthenticatedAppModeKey,
  ): Promise<void> {
    const session = this.#authTask.session;
    if (session) {
      await this.#enterAccountMode(modeKey, session, "modes");
      return;
    }
    this.#requestAuthentication("modes", modeKey);
  }

  #requestAuthentication(
    source: AuthSourceRoute,
    targetMode: AuthenticatedAppModeKey | null,
  ): void {
    this.#authTask.setIntent(source, targetMode);
    if (this.#networkMode !== "online") {
      this.#pendingOnlineIntent = "auth";
      this.#openModal(requireElement(this.#root, "[data-offline-gate]"));
      return;
    }
    this.#openAuthentication();
  }

  #openAuthentication(): void {
    const route = this.#authTask.open();
    if (!route) {
      this.#openModal(requireElement(this.#root, "[data-auth-gate]"));
      return;
    }
    this.#showRoute(route);
  }

  #showAuthRoute(route: AuthTaskRoute): void {
    this.#showRoute(this.#authTask.navigate(route));
  }

  #backAuthentication(): void {
    if (!isAuthTaskRoute(this.#route)) return;
    const route = this.#authTask.back(this.#route);
    if (!isAuthTaskRoute(route)) this.#postAuthRoute = null;
    this.#showRoute(route);
  }

  #cancelAuthentication(): void {
    this.#postAuthRoute = null;
    this.#showRoute(this.#authTask.cancel());
  }

  #clearAuthenticationIntent(): void {
    if (this.#pendingOnlineIntent === "auth") {
      this.#pendingOnlineIntent = null;
    }
    this.#postAuthRoute = null;
    this.#authTask.clearIntent();
  }

  async #submitAuth(form: HTMLFormElement): Promise<void> {
    if (!isAuthTaskRoute(this.#route)) return;
    const effect = await this.#authTask.submit(form, this.#route);
    if (effect.status === "none") return;
    if (effect.status === "navigate") {
      this.#showRoute(effect.route);
      if (effect.passwordReset) {
        this.#showStatus(
          this.#t("auth.success.passwordReset"),
          "success",
          4_000,
        );
      }
      return;
    }
    this.#onAccountSessionChange(effect.session);
    this.#recordOwner = "account-active";
    this.#renderRecordSummaries();
    if (effect.targetMode) {
      await this.#enterAccountMode(
        effect.targetMode,
        effect.session,
        effect.source,
      );
      return;
    }
    if (this.#postAuthRoute === "achievements") {
      this.#postAuthRoute = null;
      this.#showRoute("achievements");
      this.#showStatus(this.#t("auth.success.signedIn"), "success", 3_000);
      return;
    }
    this.#showRoute(effect.source);
    this.#showStatus(this.#t("auth.success.signedIn"), "success", 3_000);
  }

  #enterAccountMode(
    modeKey: AppModeKey,
    session: AccountSessionV1,
    failureRoute: AuthSourceRoute | "home",
  ): Promise<void> {
    const timing = this.#beginPerformanceMeasure("app-game-entry");
    return this.#runNavigation("enter-account", async (epoch) => {
      let result: AuthenticatedModeEntryResult = { status: "unavailable" };
      try {
        if (this.#enterAuthenticatedMode) {
          result = await this.#enterAuthenticatedMode(modeKey, session);
        }
      } catch {
        result = { status: "unavailable" };
      }
      if (!this.#isNavigationCurrent(epoch)) {
        performance.clearMarks(timing);
        return;
      }
      const activeSession = this.#runtime.activeSession;
      if (
        result.status === "entered" &&
        activeSession?.state.modeKey === modeKey
      ) {
        this.#mountGame(activeSession);
        this.#hideStatus();
        this.#showRoute("game");
        this.#showPendingTerminalIfNeeded();
        this.#finishPerformanceMeasureNextFrame("app-game-entry", timing);
        return;
      }
      performance.clearMarks(timing);
      this.#showRoute(failureRoute);
      this.#showStatus(this.#t("auth.modeUnavailable"), "error", 5_000);
    });
  }

  #enterStandard(): Promise<void> {
    const accountSession = this.#authTask.session;
    if (accountSession) {
      return this.#enterAccountMode(
        "standard_4x4_pow2_no_undo",
        accountSession,
        this.#route === "modes" ? "modes" : "home",
      );
    }
    const timing = this.#beginPerformanceMeasure("app-game-entry");
    return this.#runNavigation("enter", async (epoch) => {
      try {
        const opened = await this.#runtime.enterGuestStandard();
        if (!this.#isNavigationCurrent(epoch)) {
          performance.clearMarks(timing);
          return;
        }
        if (opened.status !== "ready") {
          performance.clearMarks(timing);
          this.#showStatus(this.#t("status.storageError"), "error");
          return;
        }
        this.#mountGame(opened.session);
        this.#showRoute("game");
        this.#showPendingTerminalIfNeeded();
        this.#finishPerformanceMeasureNextFrame("app-game-entry", timing);
      } catch (error) {
        performance.clearMarks(timing);
        if (this.#isNavigationCurrent(epoch)) this.#showStorageError(error);
      }
    });
  }

  #mountGame(session: GuestGameSession): void {
    this.#gameBoard?.destroy();
    const save = session.currentSave;
    const title = this.#modeTitle(save.modeKey);
    this.#setText("#game-title", title);
    this.#setText(
      "[data-game-status]",
      save.ownerKey === "guest"
        ? this.#t("game.status")
        : save.gameKind === "ranked"
          ? this.#t("game.statusRanked")
          : this.#t("game.statusNormal"),
    );
    const boardRoot = requireElement<HTMLElement>(
      this.#root,
      "[data-game-board-root]",
    );
    boardRoot.setAttribute(
      "aria-label",
      `${title} ${this.#t("game.boardSuffix")}`,
    );
    this.#gameBoard = mountBoard(boardRoot, session.state, {
      isInputLocked: () =>
        this.#moveBusy || this.#navigationBusy || session.inputLocked,
      onDirection: (direction) => {
        void this.#move(direction);
      },
      cellLabel: (value, position) => this.#boardCellLabel(value, position),
    });
    this.#updateGameReadouts();
  }

  async #move(direction: GameDirection): Promise<void> {
    const session = this.#runtime.activeSession;
    if (
      !session ||
      this.#moveBusy ||
      session.inputLocked ||
      this.#route !== "game"
    ) {
      return;
    }
    this.#moveBusy = true;
    const timing = this.#beginPerformanceMeasure(
      "app-input-first-frame-latency",
    );
    let timingScheduled = false;
    try {
      const result = this.#runtime.moveActiveSession(direction);
      const coreEnd = `${timing}-core`;
      performance.mark(coreEnd);
      performance.measure("app-input-core", timing, coreEnd);
      performance.clearMarks(coreEnd);
      this.#onGameTransition(result.transition, result.terminal !== null);
      this.#updateGameReadouts();
      const animation =
        this.#gameBoard?.apply(result.transition) ?? Promise.resolve();
      const commitEnd = `${timing}-commit`;
      performance.mark(commitEnd);
      performance.measure("app-input-dom-commit", timing, commitEnd);
      performance.clearMarks(commitEnd);
      this.#finishPerformanceMeasureNextFrame(
        "app-input-first-frame-latency",
        timing,
      );
      timingScheduled = true;
      if (result.save) {
        void result.save.catch((error: unknown) => {
          this.#showStorageError(error, "retry-save");
        });
      }
      if (result.transition.milestone2048) this.#showMilestone();
      if (result.terminal) {
        await this.#completeTerminal(result.terminal, animation);
        return;
      }
      await animation;
      if (session.pendingTerminal && this.#route === "game") {
        this.#showPendingTerminalIfNeeded();
      }
    } catch (error) {
      if (!timingScheduled) performance.clearMarks(timing);
      this.#showStorageError(error);
    } finally {
      if (this.#route === "game" && !session.inputFences.has("terminal")) {
        this.#moveBusy = false;
      }
    }
  }

  #completeTerminal(
    firstAttempt: Promise<StoredGameRecord>,
    animation: Promise<void>,
  ): Promise<void> {
    return this.#runNavigation("terminal", async (epoch) => {
      let record: StoredGameRecord;
      try {
        record = await firstAttempt;
      } catch {
        if (!this.#isNavigationCurrent(epoch)) return;
        try {
          record = await this.#runtime.finalizeActiveTerminal();
        } catch (error) {
          await animation.catch(() => undefined);
          if (!this.#isNavigationCurrent(epoch)) return;
          this.#showStatus(
            this.#t("status.terminalError"),
            "error",
            0,
            "retry-terminal",
          );
          this.#status.dataset.errorCode = errorCode(error);
          return;
        }
      }
      await animation.catch(() => undefined);
      if (!this.#isNavigationCurrent(epoch)) return;
      this.#selectedRecord = record;
      this.#renderResult(record);
      this.#clearGameSurface();
      this.#showRoute("result");
      void this.#refreshResultUpload(record);
      this.#refreshSummariesInBackground();
    });
  }

  #retryTerminal(): Promise<void> {
    return this.#runNavigation("retry-terminal", async (epoch) => {
      try {
        const record = await this.#runtime.finalizeActiveTerminal();
        if (!this.#isNavigationCurrent(epoch)) return;
        this.#selectedRecord = record;
        this.#renderResult(record);
        this.#hideStatus();
        this.#clearGameSurface();
        this.#showRoute("result");
        void this.#refreshResultUpload(record);
        this.#refreshSummariesInBackground();
      } catch (error) {
        if (this.#isNavigationCurrent(epoch)) {
          this.#showStorageError(error, "retry-terminal", true);
        }
      }
    });
  }

  #showPendingTerminalIfNeeded(): void {
    if (!this.#runtime.activeSession?.pendingTerminal) return;
    const dialog = requireElement<HTMLDialogElement>(
      this.#root,
      "[data-pending-terminal-dialog]",
    );
    if (!dialog.open) this.#openModal(dialog);
  }

  #undoPendingTerminal(): Promise<void> {
    return this.#runNavigation("pending-terminal-undo", async (epoch) => {
      try {
        const transition = await this.#runtime.undoActivePendingTerminal();
        if (!this.#isNavigationCurrent(epoch)) return;
        const dialog = requireElement<HTMLDialogElement>(
          this.#root,
          "[data-pending-terminal-dialog]",
        );
        if (dialog.open) this.#closeModal(dialog);
        this.#updateGameReadouts();
        await (this.#gameBoard?.apply(transition) ?? Promise.resolve());
        if (!this.#isNavigationCurrent(epoch)) return;
        this.#moveBusy = false;
        this.#hideStatus();
      } catch (error) {
        if (this.#isNavigationCurrent(epoch)) {
          this.#showPendingTerminalError(error);
        }
      }
    });
  }

  #confirmPendingTerminal(): Promise<void> {
    return this.#runNavigation("pending-terminal-confirm", async (epoch) => {
      try {
        const record = await this.#runtime.confirmActivePendingTerminal();
        if (!this.#isNavigationCurrent(epoch)) return;
        const dialog = requireElement<HTMLDialogElement>(
          this.#root,
          "[data-pending-terminal-dialog]",
        );
        if (dialog.open) this.#closeModal(dialog);
        this.#onPendingTerminalFinished();
        this.#selectedRecord = record;
        this.#renderResult(record);
        this.#hideStatus();
        this.#clearGameSurface();
        this.#showRoute("result");
        void this.#refreshResultUpload(record);
        this.#refreshSummariesInBackground();
      } catch (error) {
        if (this.#isNavigationCurrent(epoch)) {
          this.#showPendingTerminalError(error);
        }
      }
    });
  }

  #showPendingTerminalError(error: unknown): void {
    this.#showStatus(this.#t("pendingTerminal.error"), "error", 0);
    this.#status.dataset.errorCode = errorCode(error);
  }

  async #retrySave(): Promise<void> {
    const session = this.#runtime.activeSession;
    if (!session) return;
    try {
      await session.flush();
      this.#hideStatus();
    } catch (error) {
      this.#showStorageError(error, "retry-save", true);
    }
  }

  #requestRestart(): void {
    const session = this.#runtime.activeSession;
    if (!session) return;
    if (!session.hasEffectiveMove) {
      void this.#restartGame();
      return;
    }
    this.#openModal(requireElement(this.#root, "[data-restart-dialog]"));
  }

  #restartGame(): Promise<void> {
    return this.#runNavigation("restart", async (epoch) => {
      try {
        const replacement = await this.#runtime.restartActiveSession();
        if (!this.#isNavigationCurrent(epoch)) return;
        this.#moveBusy = false;
        this.#mountGame(replacement);
        this.#hideStatus();
        this.#showRoute("game");
      } catch (error) {
        if (this.#isNavigationCurrent(epoch)) {
          this.#showStorageError(error, "retry-restart");
        }
      }
    });
  }

  async #leaveGame(): Promise<void> {
    if (this.#navigationTask) {
      if (this.#navigationKind === "leave") {
        await this.#navigationTask;
        return;
      }
      await this.#invalidateNavigation();
    }
    if (this.#destroyed) return;
    await this.#runNavigation("leave", async (epoch) => {
      try {
        await this.#runtime.leaveActiveSession();
        if (!this.#isNavigationCurrent(epoch)) return;
        this.#clearGameSurface();
        this.#renderRecordSummaries();
        this.#hideStatus();
        this.#showRoute("home");
      } catch (error) {
        if (this.#isNavigationCurrent(epoch)) {
          this.#showStorageError(error, "retry-leave");
        }
      }
    });
  }

  async #returnHomeFromResult(): Promise<void> {
    if (this.#navigationTask) {
      if (this.#navigationKind === "result-home") {
        await this.#navigationTask;
        return;
      }
      await this.#invalidateNavigation();
    }
    if (this.#destroyed) return;
    await this.#runNavigation("result-home", async (epoch) => {
      try {
        if (this.#runtime.activeSession) {
          await this.#runtime.leaveActiveSession();
        }
        if (!this.#isNavigationCurrent(epoch)) return;
        this.#selectedRecord = null;
        this.#renderRecordSummaries();
        this.#showRoute("home");
      } catch (error) {
        if (this.#isNavigationCurrent(epoch)) {
          this.#showStorageError(error, "retry-leave");
        }
      }
    });
  }

  #openRecord(
    clientRecordId: string,
    source: RecordSourceRoute,
  ): Promise<void> {
    return this.#runNavigation("open-record", async (epoch) => {
      try {
        const record = await this.#runtime.getGuestRecord(clientRecordId);
        if (!this.#isNavigationCurrent(epoch)) return;
        if (!record) {
          await this.#runtime.refreshGuestSummary();
          if (!this.#isNavigationCurrent(epoch)) return;
          this.#renderRecordSummaries();
          this.#showStatus(this.#t("status.storageError"), "error", 4_000);
          return;
        }
        this.#selectedRecord = record;
        this.#selectedCloudRecord = null;
        this.#detailSource = source;
        this.#renderDetail(record);
        this.#showRoute("detail");
      } catch (error) {
        if (this.#isNavigationCurrent(epoch)) this.#showStorageError(error);
      }
    });
  }

  #openCloudRecord(recordId: string, source: RecordSourceRoute): void {
    const record = this.#cloudHistory?.rows.find((row) => row.id === recordId);
    if (!record) return;
    this.#selectedRecord = null;
    this.#selectedCloudRecord = record;
    this.#detailSource = source;
    this.#renderCloudDetail(record);
    this.#showRoute("detail");
  }

  #prepareDeleteDialog(): void {
    const cloud = this.#selectedCloudRecord;
    this.#setText(
      "[data-delete-title]",
      cloud ? this.#t("delete.cloudTitle") : this.#t("delete.title"),
    );
    this.#setText(
      "[data-delete-body]",
      cloud ? this.#t("delete.cloudBody") : this.#t("delete.body"),
    );
    this.#setText(
      '[data-action="confirm-delete"]',
      cloud ? this.#t("delete.cloudConfirm") : this.#t("delete.confirm"),
    );
  }

  #deleteSelectedRecord(): Promise<void> {
    const cloud = this.#selectedCloudRecord;
    const session = this.#authTask.session;
    if (cloud && session && this.#cloudData) {
      return this.#runNavigation("delete-record", async (epoch) => {
        try {
          if (cloud.deletedAt) {
            await this.#cloudData!.restoreRecord({
              userId: session.user.id,
              recordId: cloud.id,
            });
          } else {
            await this.#cloudData!.deleteRecord({
              userId: session.user.id,
              recordId: cloud.id,
            });
          }
          if (!this.#isNavigationCurrent(epoch)) return;
          this.#selectedCloudRecord = null;
          this.#cloudHistory = null;
          this.#cloudHistoryFetchedAt = null;
          this.#showRoute(this.#detailSource);
          this.#showStatus(
            cloud.deletedAt
              ? this.#t("status.restored")
              : this.#t("status.cloudDeleted"),
            "success",
            4_000,
          );
        } catch {
          if (this.#isNavigationCurrent(epoch)) {
            this.#showStatus(
              this.#t("status.cloudActionFailed"),
              "error",
              5_000,
            );
          }
        }
      });
    }
    const record = this.#selectedRecord;
    if (!record) return Promise.resolve();
    return this.#runNavigation("delete-record", async (epoch) => {
      try {
        await this.#runtime.deleteGuestRecord(record.clientRecordId);
        if (!this.#isNavigationCurrent(epoch)) return;
        this.#selectedRecord = null;
        this.#selectedCloudRecord = null;
        this.#renderRecordSummaries();
        this.#showRoute(this.#detailSource);
        this.#showStatus(this.#t("status.deleted"), "success", 3_000);
      } catch (error) {
        if (this.#isNavigationCurrent(epoch)) this.#showStorageError(error);
      }
    });
  }

  async #openReplay(source: ReplaySourceRoute): Promise<void> {
    const localRecord = this.#selectedRecord;
    const cloudRecord = this.#selectedCloudRecord;
    try {
      if (localRecord) {
        this.#presentReplay(
          localRecord.replay,
          buildReplayTimeline({
            replay: localRecord.replay,
            finalSnapshot: localRecord.finalSnapshot,
          }),
          source,
        );
        return;
      }
      if (!cloudRecord || cloudRecord.deletedAt) return;
      this.#showStatus(this.#t("status.replayLoading"), "info", 0);
      const replay = await this.#loadCloudReplay(cloudRecord);
      if (
        this.#route !== "detail" ||
        this.#selectedCloudRecord?.id !== cloudRecord.id
      ) {
        return;
      }
      this.#presentReplay(
        replay,
        this.#buildCloudReplayTimeline(cloudRecord, replay),
        source,
      );
      this.#hideStatus();
    } catch (error) {
      const code = errorCode(error);
      this.#showStatus(
        this.#t(
          code === "cloud_replay_offline"
            ? "status.replayOffline"
            : "status.replayError",
        ),
        "error",
        0,
      );
      this.#status.dataset.errorCode = code;
    }
  }

  async #loadCloudReplay(record: CachedHistoryRow): Promise<ReplayRecord> {
    const session = this.#authTask.session;
    if (!session || !this.#cloudData) throw new Error("cloud_replay_unavailable");
    const input = { userId: session.user.id, recordId: record.id };
    const cached = await this.#cloudData.readReplayCache(input).catch(
      () => null,
    );
    if (cached) {
      if (this.#networkMode === "online") {
        void this.#cloudData.refreshReplay(input).catch(() => undefined);
      }
      return cached.value;
    }
    if (this.#networkMode !== "online") {
      throw new Error("cloud_replay_offline");
    }
    return (await this.#cloudData.refreshReplay(input)).value;
  }

  #buildCloudReplayTimeline(
    record: CachedHistoryRow,
    replay: ReplayRecord,
  ): ReplayTimeline {
    const timeline = buildReplayTimeline({ replay });
    const finalFrame = timeline.frames.at(-1);
    if (!finalFrame) throw new Error("cloud_replay_empty");
    const boardSum = finalFrame.board
      .flat()
      .reduce((total, value) => total + value, 0);
    if (
      timeline.modeKey !== record.modeKey ||
      finalFrame.score !== record.score ||
      finalFrame.steps !== record.steps ||
      finalFrame.durationMs !== record.durationMs ||
      getBestTileValue(finalFrame.board) !== record.bestTile ||
      boardSum !== record.boardSum
    ) {
      throw new Error("cloud_replay_summary_mismatch");
    }
    return timeline;
  }

  #presentReplay(
    replay: ReplayRecord,
    timeline: ReplayTimeline,
    source: ReplaySourceRoute,
  ): void {
    const initialFrame = timeline.frames[0];
    if (!initialFrame) throw new Error("replay_timeline_empty");
    this.#clearReplaySurface();
    this.#replayTimeline = timeline;
    this.#replayRecord = replay;
    this.#replaySource = source;
    this.#replayIndex = 0;
    this.#setText("#replay-title", this.#modeTitle(timeline.modeKey));
    const boardRoot = requireElement<HTMLElement>(
      this.#root,
      "[data-replay-board-root]",
    );
    boardRoot.setAttribute(
      "aria-label",
      `${this.#modeTitle(timeline.modeKey)} · ${this.#t("replay.title")}`,
    );
    this.#replayBoard = mountBoard(
      boardRoot,
      { board: initialFrame.board },
      {
        isInputLocked: () => true,
        onDirection: () => undefined,
        reducedMotion: () => true,
        cellLabel: (value, position) => this.#boardCellLabel(value, position),
      },
    );
    const range = requireElement<HTMLInputElement>(
      this.#root,
      "[data-replay-progress]",
    );
    range.max = String(Math.max(0, timeline.frames.length - 1));
    this.#setReplayIndex(0);
    this.#showRoute("replay");
  }

  async #shareReplay(): Promise<void> {
    try {
      let replay = this.#route === "replay" ? this.#replayRecord : null;
      replay ??= this.#selectedRecord?.replay ?? null;
      if (!replay && this.#selectedCloudRecord?.deletedAt === null) {
        const cloud = this.#selectedCloudRecord;
        if (cloud) {
          replay = await this.#loadCloudReplay(cloud);
          this.#buildCloudReplayTimeline(cloud, replay);
        }
      }
      if (!replay) throw new Error("replay_share_unavailable");
      await this.#onShareReplay(replay);
      this.#showStatus(this.#t("status.replayShared"), "success", 4_000);
    } catch {
      this.#showStatus(this.#t("status.replayShareFailed"), "error", 5_000);
    }
  }

  #closeReplay(): void {
    const destination = this.#replaySource;
    this.#clearReplaySurface();
    this.#showRoute(destination);
  }

  #toggleReplay(): void {
    if (!this.#replayTimeline) return;
    if (this.#replayTimer !== null) {
      this.#stopReplay();
      return;
    }
    if (this.#replayIndex >= this.#replayTimeline.frames.length - 1) {
      this.#setReplayIndex(0);
    }
    this.#setReplayPlaying(true);
    const advance = (): void => {
      const timeline = this.#replayTimeline;
      if (!timeline || this.#replayIndex >= timeline.frames.length - 1) {
        this.#stopReplay();
        return;
      }
      const current = timeline.frames[this.#replayIndex];
      const next = timeline.frames[this.#replayIndex + 1];
      const delay = Math.min(
        900,
        Math.max(180, (next?.durationMs ?? 0) - (current?.durationMs ?? 0)),
      );
      this.#replayTimer = window.setTimeout(() => {
        this.#replayTimer = null;
        this.#setReplayIndex(this.#replayIndex + 1);
        advance();
      }, delay);
    };
    advance();
  }

  #stopReplay(): void {
    if (this.#replayTimer !== null) window.clearTimeout(this.#replayTimer);
    this.#replayTimer = null;
    this.#setReplayPlaying(false);
  }

  #setReplayPlaying(playing: boolean): void {
    const button = this.#root.querySelector<HTMLButtonElement>(
      '[data-action="replay-play"]',
    );
    if (!button) return;
    button.setAttribute("aria-pressed", String(playing));
    button.textContent = playing
      ? this.#t("replay.pause")
      : this.#t("replay.play");
  }

  #setReplayIndex(requestedIndex: number): void {
    const timeline = this.#replayTimeline;
    if (!timeline) return;
    const progress = resolveReplayProgress(timeline, requestedIndex);
    this.#replayIndex = progress.index;
    const frame = timeline.frames[progress.index];
    if (frame) this.#replayBoard?.render({ board: frame.board });
    const range = requireElement<HTMLInputElement>(
      this.#root,
      "[data-replay-progress]",
    );
    range.value = String(progress.index);
    const output = requireElement<HTMLOutputElement>(
      this.#root,
      "[data-replay-progress-copy]",
    );
    output.value = `${String(progress.index)} / ${String(progress.totalSteps)} · ${formatDuration(progress.elapsedMs)} / ${formatDuration(progress.totalDurationMs)}`;
  }

  #renderRecordSummaries(): void {
    const save = this.#runtime.guestSave;
    const primary = this.#root.querySelector<HTMLButtonElement>(
      "[data-home-primary]",
    );
    const saveCopy = this.#root.querySelector<HTMLElement>(
      "[data-home-save-copy]",
    );
    const modeState = this.#root.querySelector<HTMLElement>(
      '[data-mode="standard_4x4_pow2_no_undo"] [data-mode-state]',
    );
    if (primary && saveCopy) {
      if (save.status === "ok") {
        primary.disabled = false;
        primary.textContent = this.#t("home.continueAction");
        saveCopy.hidden = false;
        saveCopy.textContent = `${this.#numberFormat.format(save.save.snapshot.state.score)} ${this.#t("game.score")} · ${formatDuration(resolveStoredSaveDurationMs(save.save))}`;
        if (modeState) modeState.textContent = this.#t("modes.savedState");
      } else if (save.status === "missing") {
        primary.disabled = false;
        primary.textContent = this.#t("home.startAction");
        saveCopy.hidden = true;
        saveCopy.textContent = "";
        if (modeState) modeState.textContent = this.#t("modes.standardState");
      } else {
        primary.disabled = true;
        primary.textContent = this.#t("status.storageError");
        saveCopy.hidden = false;
        saveCopy.textContent = this.#t("status.storageError");
        if (modeState) modeState.textContent = this.#t("status.storageError");
      }
    }

    const records = sortGuestRecords(
      this.#runtime.guestRecords,
      this.#recordSort,
    );
    this.#syncRecordOwnerFilter();
    const recordList =
      this.#root.querySelector<HTMLElement>("[data-record-list]");
    const recordEmpty = this.#root.querySelector<HTMLElement>(
      "[data-record-empty]",
    );
    if (recordList && recordEmpty) {
      if (this.#recordOwner === "guest") {
        this.#renderRecordCards(recordList, records);
        recordEmpty.hidden = records.length > 0;
      } else {
        const cloudRows = this.#cloudHistory?.rows ?? [];
        this.#renderCloudRecordCards(recordList, cloudRows);
        recordEmpty.hidden = cloudRows.length > 0;
      }
    }
    const recentList = this.#root.querySelector<HTMLElement>(
      "[data-home-recent-records]",
    );
    const recentEmpty = this.#root.querySelector<HTMLElement>(
      "[data-home-recent-empty]",
    );
    if (recentList && recentEmpty) {
      this.#renderRecordCards(recentList, records.slice(0, 3));
      recentEmpty.hidden = records.length > 0;
    }
  }

  #syncRecordOwnerFilter(): void {
    const session = this.#authTask.session;
    const select = requireElement<HTMLSelectElement>(
      this.#root,
      "[data-record-owner]",
    );
    for (const option of select.querySelectorAll<HTMLOptionElement>(
      'option[value^="account-"]',
    )) {
      option.hidden = session === null;
      option.disabled = session === null;
    }
    if (!session && this.#recordOwner !== "guest") {
      this.#recordOwner = "guest";
      this.#cloudHistory = null;
      this.#cloudHistoryFetchedAt = null;
    }
    select.value = this.#recordOwner;
    const status = requireElement<HTMLElement>(
      this.#root,
      "[data-cloud-history-status]",
    );
    status.hidden = this.#recordOwner === "guest";
    if (this.#recordOwner !== "guest" && this.#cloudHistoryFetchedAt !== null) {
      status.textContent = this.#t("records.cachedAt").replace(
        "{time}",
        this.#dateFormat.format(new Date(this.#cloudHistoryFetchedAt)),
      );
    }
  }

  #cloudHistoryQuery(): CloudHistoryQuery | null {
    const session = this.#authTask.session;
    if (!session || this.#recordOwner === "guest") return null;
    return {
      userId: session.user.id,
      status: this.#recordOwner === "account-deleted" ? "deleted" : "active",
      sort:
        this.#recordSort === "boardSum" ? "board_sum" : this.#recordSort,
    };
  }

  async #loadCloudHistory(): Promise<void> {
    const query = this.#cloudHistoryQuery();
    if (!query || !this.#cloudData) return;
    const epoch = ++this.#cloudHistoryRequestEpoch;
    const status = requireElement<HTMLElement>(
      this.#root,
      "[data-cloud-history-status]",
    );
    status.hidden = false;
    status.textContent = this.#t("records.loadingCloud");
    const cached = await this.#cloudData.readHistoryCache(query).catch(
      () => null,
    );
    if (epoch !== this.#cloudHistoryRequestEpoch) return;
    if (cached) {
      this.#cloudHistory = cached.value;
      this.#cloudHistoryFetchedAt = cached.fetchedAt;
      this.#renderRecordSummaries();
    }
    if (this.#networkMode !== "online") {
      status.textContent = cached
        ? this.#t("records.offlineCached")
        : this.#t("records.offlineEmpty");
      return;
    }
    try {
      const refreshed = await this.#cloudData.refreshHistory(query);
      if (epoch !== this.#cloudHistoryRequestEpoch) return;
      this.#cloudHistory = refreshed.value;
      this.#cloudHistoryFetchedAt = refreshed.fetchedAt;
      this.#renderRecordSummaries();
      status.textContent = this.#t("records.updatedAt").replace(
        "{time}",
        this.#dateFormat.format(new Date(refreshed.fetchedAt)),
      );
    } catch {
      if (epoch !== this.#cloudHistoryRequestEpoch) return;
      status.textContent = cached
        ? this.#t("records.offlineCached")
        : this.#t("records.cloudUnavailable");
    }
  }

  #refreshSummariesInBackground(): void {
    void this.#runtime.refreshGuestSummary().then(
      () => this.#renderRecordSummaries(),
      (error: unknown) => {
        this.#showStatus(this.#t("status.storageError"), "error", 4_000);
        this.#status.dataset.errorCode = errorCode(error);
      },
    );
  }

  #renderRecordCards(
    container: HTMLElement,
    records: readonly StoredGameRecord[],
  ): void {
    const fragment = document.createDocumentFragment();
    for (const record of records) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "record-card";
      button.dataset.recordId = record.clientRecordId;
      const copy = document.createElement("span");
      copy.className = "record-card__copy";
      const title = document.createElement("strong");
      title.textContent = `${this.#numberFormat.format(record.score)} ${this.#t("game.score")}`;
      const meta = document.createElement("small");
      meta.textContent = `${this.#t("result.bestTile")} ${this.#numberFormat.format(record.bestTile)} · ${formatDuration(record.durationMs)}`;
      copy.append(title, meta);
      const time = document.createElement("time");
      time.dateTime = new Date(record.endedAt).toISOString();
      time.textContent = this.#dateFormat.format(new Date(record.endedAt));
      button.append(copy, time);
      fragment.append(button);
    }
    container.replaceChildren(fragment);
  }

  #renderCloudRecordCards(
    container: HTMLElement,
    records: readonly CachedHistoryRow[],
  ): void {
    const fragment = document.createDocumentFragment();
    for (const record of records) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "record-card";
      button.dataset.cloudRecordId = record.id;
      const copy = document.createElement("span");
      copy.className = "record-card__copy";
      const title = document.createElement("strong");
      title.textContent = `${this.#numberFormat.format(record.score)} ${this.#t("game.score")}`;
      const meta = document.createElement("small");
      meta.textContent = `${this.#modeTitle(record.modeKey)} · ${record.source === "normal" ? this.#t("records.normalSource") : this.#t("records.rankedSource")}`;
      copy.append(title, meta);
      const time = document.createElement("time");
      time.dateTime = record.endedAt;
      time.textContent = this.#dateFormat.format(new Date(record.endedAt));
      button.append(copy, time);
      fragment.append(button);
    }
    container.replaceChildren(fragment);
  }

  #renderResult(record: StoredGameRecord): void {
    this.#setText("#result-title", this.#modeTitle(record.modeKey));
    this.#setText(
      "[data-result-score]",
      this.#numberFormat.format(record.score),
    );
    this.#setText(
      "[data-result-best-tile]",
      this.#numberFormat.format(record.bestTile),
    );
    this.#setText("[data-result-time]", formatDuration(record.durationMs));
    this.#setText(
      "[data-result-steps]",
      this.#numberFormat.format(record.steps),
    );
    const status =
      record.ownerKey === "guest"
        ? this.#t("result.savedLocal")
        : record.uploadStatus === "uploaded"
          ? this.#t("result.uploaded")
          : record.uploadStatus === "failed"
            ? this.#t("result.uploadFailed")
            : this.#t("result.uploadPending");
    this.#setText("[data-result-upload-status]", status);
    this.#setText(
      "[data-result-upload-note]",
      record.ownerKey === "guest"
        ? this.#t("detail.localRecord")
        : this.#t("result.accountRecord"),
    );
    const retry = requireElement<HTMLButtonElement>(
      this.#root,
      '[data-action="retry-record-upload"]',
    );
    retry.hidden =
      record.ownerKey === "guest" || record.uploadStatus !== "failed";
    retry.disabled = false;
  }

  async #refreshResultUpload(record: StoredGameRecord): Promise<void> {
    if (record.ownerKey === "guest") return;
    await this.#runtime.flushAccountRecordOutbox().catch(() => null);
    const current = await this.#runtime
      .getAccountRecord(record.clientRecordId)
      .catch(() => null);
    if (
      !current ||
      this.#route !== "result" ||
      this.#selectedRecord?.clientRecordId !== record.clientRecordId
    ) {
      return;
    }
    this.#selectedRecord = current;
    this.#renderResult(current);
  }

  #retryRecordUpload(): Promise<void> {
    return this.#runNavigation("retry-record-upload", async (epoch) => {
      const record = this.#selectedRecord;
      if (!record || record.ownerKey === "guest") return;
      const retry = requireElement<HTMLButtonElement>(
        this.#root,
        '[data-action="retry-record-upload"]',
      );
      retry.disabled = true;
      await this.#runtime
        .retryAccountRecordSubmit(record.clientRecordId)
        .catch(() => null);
      const current = await this.#runtime
        .getAccountRecord(record.clientRecordId)
        .catch(() => null);
      if (!this.#isNavigationCurrent(epoch)) return;
      if (!current) {
        retry.disabled = false;
        return;
      }
      this.#selectedRecord = current;
      this.#renderResult(current);
    });
  }

  #requestAccountLogout(): Promise<void> {
    return this.#runNavigation("logout-prepare", async (epoch) => {
      try {
        const summary = await this.#runtime.prepareAccountLogout();
        if (!this.#isNavigationCurrent(epoch)) return;
        if (!summary) {
          this.#authTask.signOut();
          this.#onAccountSessionChange(null);
          return;
        }
        if (!summary.requiresConfirmation) {
          await this.#completeAccountLogout(epoch);
          return;
        }
        const copy = this.#t("logout.summary")
          .replace("{records}", this.#numberFormat.format(summary.pendingRecords))
          .replace("{saves}", this.#numberFormat.format(summary.unfinishedSaves))
          .replace(
            "{operations}",
            this.#numberFormat.format(summary.pendingOperations),
          );
        this.#setText("[data-account-logout-summary]", copy);
        requireElement<HTMLElement>(
          this.#root,
          "[data-account-logout-timeout]",
        ).hidden = !summary.flushTimedOut;
        this.#openModal(
          requireElement(this.#root, "[data-account-logout-dialog]"),
        );
      } catch {
        if (this.#isNavigationCurrent(epoch)) {
          this.#showStatus(this.#t("logout.error"), "error", 5_000);
        }
      }
    });
  }

  #confirmAccountLogout(): Promise<void> {
    return this.#runNavigation("logout-confirm", async (epoch) => {
      const confirm = requireElement<HTMLButtonElement>(
        this.#root,
        '[data-action="confirm-account-logout"]',
      );
      confirm.disabled = true;
      try {
        await this.#completeAccountLogout(epoch);
      } finally {
        confirm.disabled = false;
      }
    });
  }

  async #completeAccountLogout(epoch: number): Promise<void> {
    try {
      const result = await this.#runtime.confirmAccountLogout();
      if (!this.#isNavigationCurrent(epoch)) return;
      this.#authTask.signOut();
      this.#onAccountSessionChange(null);
      const dialog = requireElement<HTMLDialogElement>(
        this.#root,
        "[data-account-logout-dialog]",
      );
      if (dialog.open) this.#closeModal(dialog);
      this.#renderRecordSummaries();
      this.#showStatus(
        result?.status === "cleanup_pending"
          ? this.#t("logout.pending")
          : this.#t("logout.success"),
        result?.status === "cleanup_pending" ? "error" : "success",
        result?.status === "cleanup_pending" ? 0 : 4_000,
      );
    } catch {
      if (this.#isNavigationCurrent(epoch)) {
        this.#showStatus(this.#t("logout.error"), "error", 5_000);
      }
    }
  }

  #openAccountDeletionDialog(): void {
    if (!this.#authTask.session) return;
    const form = requireElement<HTMLFormElement>(
      this.#root,
      "[data-account-deletion-form]",
    );
    form.reset();
    const issue = requireElement<HTMLElement>(
      this.#root,
      "[data-account-deletion-issue]",
    );
    issue.hidden = true;
    issue.textContent = "";
    this.#openModal(
      requireElement<HTMLDialogElement>(
        this.#root,
        "[data-account-deletion-dialog]",
      ),
    );
  }

  async #submitAccountDeletion(form: HTMLFormElement): Promise<void> {
    if (!form.checkValidity()) return;
    const password = new FormData(form).get("password");
    if (typeof password !== "string" || !password) return;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) submit.disabled = true;
    const issue = requireElement<HTMLElement>(
      this.#root,
      "[data-account-deletion-issue]",
    );
    issue.hidden = true;
    issue.textContent = "";
    try {
      const result = await this.#authTask.requestAccountDeletion(password);
      if (result.status === "busy") return;
      if (result.status === "failure") {
        issue.textContent = this.#accountDeletionIssue(result.issue);
        issue.hidden = false;
        return;
      }
      try {
        saveAccountDeletionReceipt(window.localStorage, result.value);
      } catch {
        // The server receipt remains authoritative when localStorage is unavailable.
      }
      const cleanup = await this.#runtime
        .clearAccountAfterDeletion()
        .catch(() => null);
      this.#authTask.signOut();
      this.#onAccountSessionChange(null);
      form.reset();
      this.#closeNamedDialog("[data-account-deletion-dialog]");
      this.#renderAccountDeletionReceipt();
      this.#renderRecordSummaries();
      this.#showStatus(
        cleanup?.status === "cleanup_pending"
          ? this.#t("logout.pending")
          : this.#t("accountDeletion.success"),
        cleanup?.status === "cleanup_pending" ? "error" : "success",
        cleanup?.status === "cleanup_pending" ? 0 : 5_000,
      );
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  #accountDeletionIssue(issue: MobileAuthIssue): string {
    if (issue.kind === "invalid_credentials") {
      return this.#t("accountDeletion.invalid");
    }
    if (
      issue.kind === "network_error" ||
      issue.kind === "service_unavailable" ||
      issue.kind === "rate_limited"
    ) {
      return this.#t("accountDeletion.network");
    }
    return this.#t("accountDeletion.error");
  }

  #renderAccountDeletionReceipt(): void {
    const container = requireElement<HTMLElement>(
      this.#root,
      "[data-account-deletion-receipt]",
    );
    let receipt = null;
    try {
      receipt = loadAccountDeletionReceipt(window.localStorage);
    } catch {
      receipt = null;
    }
    container.hidden = receipt === null;
    if (!receipt) return;
    const copy = this.#t("deletionReceipt.copy")
      .replace("{email}", receipt.maskedEmail)
      .replace("{dueAt}", this.#dateFormat.format(new Date(receipt.dueAt)));
    this.#setText("[data-account-deletion-receipt-copy]", copy);
  }

  async #exportDiagnostics(): Promise<void> {
    try {
      await this.#onExportDiagnostics();
      this.#showStatus(this.#t("diagnostics.exported"), "success", 4_000);
    } catch {
      this.#showStatus(this.#t("diagnostics.exportFailed"), "error", 5_000);
    }
  }

  #renderDetail(record: StoredGameRecord): void {
    this.#setText("#detail-title", this.#modeTitle(record.modeKey));
    this.#setText(".result-score--compact span", this.#t("detail.localRecord"));
    this.#setText(
      "[data-detail-score]",
      this.#numberFormat.format(record.score),
    );
    this.#setText(
      "[data-detail-best-tile]",
      this.#numberFormat.format(record.bestTile),
    );
    this.#setText(
      "[data-detail-board-sum]",
      this.#numberFormat.format(record.boardSum),
    );
    this.#setText("[data-detail-time]", formatDuration(record.durationMs));
    this.#setText(
      "[data-detail-steps]",
      this.#numberFormat.format(record.steps),
    );
    requireElement<HTMLButtonElement>(
      this.#root,
      '[data-action="open-replay"]',
    ).hidden = false;
    requireElement<HTMLButtonElement>(
      this.#root,
      "[data-detail-share-replay]",
    ).hidden = false;
    const deleteButton = requireElement<HTMLButtonElement>(
      this.#root,
      '[data-action="delete-record"]',
    );
    deleteButton.hidden = false;
    deleteButton.textContent = this.#t("detail.delete");
  }

  #renderCloudDetail(record: CachedHistoryRow): void {
    this.#setText("#detail-title", this.#modeTitle(record.modeKey));
    this.#setText(
      ".result-score--compact span",
      record.deletedAt
        ? this.#t("detail.deletedCloudRecord")
        : this.#t("detail.cloudRecord"),
    );
    this.#setText(
      "[data-detail-score]",
      this.#numberFormat.format(record.score),
    );
    this.#setText(
      "[data-detail-best-tile]",
      this.#numberFormat.format(record.bestTile),
    );
    this.#setText(
      "[data-detail-board-sum]",
      this.#numberFormat.format(record.boardSum),
    );
    this.#setText("[data-detail-time]", formatDuration(record.durationMs));
    this.#setText(
      "[data-detail-steps]",
      this.#numberFormat.format(record.steps),
    );
    requireElement<HTMLButtonElement>(
      this.#root,
      '[data-action="open-replay"]',
    ).hidden = record.deletedAt !== null || !record.replayAvailable;
    requireElement<HTMLButtonElement>(
      this.#root,
      "[data-detail-share-replay]",
    ).hidden = record.deletedAt !== null || !record.replayAvailable;
    const deleteButton = requireElement<HTMLButtonElement>(
      this.#root,
      '[data-action="delete-record"]',
    );
    deleteButton.hidden = this.#networkMode !== "online";
    deleteButton.textContent = record.deletedAt
      ? this.#t("detail.restore")
      : this.#t("detail.deleteCloud");
  }

  #updateGameReadouts(): void {
    const session = this.#runtime.activeSession;
    if (!session) return;
    const state = session.state;
    this.#setText("[data-game-score]", this.#numberFormat.format(state.score));
    this.#setText(
      "[data-game-best]",
      this.#numberFormat.format(getBestTileValue(state.board)),
    );
    this.#setText("[data-game-time]", formatDuration(session.elapsedMs()));
  }

  #modeTitle(modeKey: AppModeKey): string {
    switch (modeKey) {
      case "classic_4x4_pow2_undo":
        return this.#t("modes.classicTitle");
      case "board_3x3_pow2_no_undo":
        return this.#t("modes.compactTitle");
      default:
        return this.#t("modes.standardTitle");
    }
  }

  #startGameTimer(): void {
    this.#stopGameTimer();
    this.#updateGameReadouts();
    this.#gameTimer = window.setInterval(() => this.#updateGameReadouts(), 250);
  }

  #stopGameTimer(): void {
    if (this.#gameTimer !== null) window.clearInterval(this.#gameTimer);
    this.#gameTimer = null;
  }

  #showMilestone(): void {
    const toast = requireElement<HTMLElement>(
      this.#root,
      "[data-game-milestone]",
    );
    toast.hidden = false;
    if (this.#milestoneTimer !== null)
      window.clearTimeout(this.#milestoneTimer);
    this.#milestoneTimer = window.setTimeout(() => {
      toast.hidden = true;
      this.#milestoneTimer = null;
    }, 2_400);
  }

  #clearGameSurface(): void {
    this.#stopGameTimer();
    this.#gameBoard?.destroy();
    this.#gameBoard = null;
    this.#moveBusy = false;
  }

  #clearReplaySurface(): void {
    this.#stopReplay();
    this.#replayBoard?.destroy();
    this.#replayBoard = null;
    this.#replayTimeline = null;
    this.#replayRecord = null;
    this.#replayIndex = 0;
  }

  #setText(selector: string, value: string): void {
    const element = requireElement<HTMLElement>(this.#root, selector);
    element.textContent = value;
  }

  #boardCellLabel(value: number, position: { x: number; y: number }): string {
    return this.#locale === "en"
      ? `row ${String(position.y + 1)}, column ${String(position.x + 1)}, ${value > 0 ? String(value) : "empty"}`
      : `第 ${String(position.y + 1)} 行，第 ${String(position.x + 1)} 列，${value > 0 ? String(value) : "空"}`;
  }

  #dialogs(): HTMLDialogElement[] {
    return [...this.#root.querySelectorAll<HTMLDialogElement>("dialog")];
  }

  #openModal(dialog: HTMLDialogElement): void {
    if (!dialog.open) {
      const active = this.#root.ownerDocument.activeElement;
      if (active instanceof HTMLElement && this.#root.contains(active)) {
        this.#dialogOpeners.set(dialog, active);
      }
    }
    this.#runtime.activeSession?.addInputFence("dialog");
    openDialog(dialog);
  }

  #closeModal(dialog: HTMLDialogElement): void {
    const opener = this.#dialogOpeners.get(dialog);
    this.#dialogOpeners.delete(dialog);
    closeDialog(dialog);
    if (!this.#dialogs().some((candidate) => candidate.open)) {
      this.#runtime.activeSession?.removeInputFence("dialog");
      if (
        opener?.isConnected &&
        this.#root.contains(opener) &&
        !opener.closest("[hidden], dialog:not([open])")
      ) {
        opener.focus({ preventScroll: true });
      }
    }
  }

  #cancelModal(dialog: HTMLDialogElement): void {
    if (dialog.matches("[data-pending-terminal-dialog]")) {
      this.#closeModal(dialog);
      void this.#leaveGame();
      return;
    }
    if (
      dialog.matches("[data-offline-gate]") ||
      dialog.matches("[data-auth-gate]")
    ) {
      this.#pendingOnlineIntent = null;
      this.#clearAuthenticationIntent();
    }
    this.#closeModal(dialog);
  }

  #closeNamedDialog(selector: string): void {
    this.#closeModal(requireElement(this.#root, selector));
  }

  #showStorageError(
    error: unknown,
    retryAction:
      | "retry-save"
      | "retry-terminal"
      | "retry-leave"
      | "retry-restart" = "retry-save",
    terminal = false,
  ): void {
    this.#showStatus(
      terminal
        ? this.#t("status.terminalError")
        : this.#t("status.storageError"),
      "error",
      0,
      retryAction,
    );
    this.#status.dataset.errorCode = errorCode(error);
  }

  #showStatus(
    message: string,
    kind: "info" | "success" | "error",
    timeoutMs = 0,
    action?: "retry-save" | "retry-terminal" | "retry-leave" | "retry-restart",
  ): void {
    if (this.#statusTimer !== null) window.clearTimeout(this.#statusTimer);
    this.#statusTimer = null;
    this.#status.hidden = false;
    this.#status.dataset.tone = kind;
    this.#status.removeAttribute("data-error-code");
    const copy = document.createElement("span");
    copy.textContent = message;
    const controls = document.createElement("span");
    controls.className = "app-status__actions";
    if (action) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.dataset.action = action;
      retry.textContent = this.#t("status.retry");
      controls.append(retry);
    }
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.dataset.action = "dismiss-status";
    dismiss.setAttribute("aria-label", this.#t("status.dismiss"));
    dismiss.textContent = "×";
    controls.append(dismiss);
    this.#status.replaceChildren(copy, controls);
    if (timeoutMs > 0) {
      this.#statusTimer = window.setTimeout(
        () => this.#hideStatus(),
        timeoutMs,
      );
    }
  }

  #hideStatus(): void {
    if (this.#statusTimer !== null) window.clearTimeout(this.#statusTimer);
    this.#statusTimer = null;
    this.#status.hidden = true;
    this.#status.replaceChildren();
  }
}

export function createAppController(
  options: AppControllerOptions,
): AppController {
  return new MobileAppController(options);
}
