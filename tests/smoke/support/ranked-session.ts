import type { Page } from "@playwright/test";

export interface InstallRankedSessionOptions {
  authToken?: string | null;
  challengeId?: string;
  clearPrefetch?: boolean;
  clearSavedState?: boolean;
  confirmRestart?: boolean;
  nickname?: string | null;
  ownerUserId?: string | null;
  resetStorage?: boolean;
  seed?: number;
  token?: string;
  ttlSec?: number;
}

export async function installRankedSessionForMode(
  page: Page,
  modeKey: string,
  options: InstallRankedSessionOptions = {}
): Promise<void> {
  await page.addInitScript(
    ({ modeKey: injectedModeKey, options: injectedOptions }) => {
      const opts = injectedOptions as InstallRankedSessionOptions;
      if (opts.resetStorage) {
        window.localStorage.clear();
        window.sessionStorage.clear();
        window.name = "";
      }

      const authToken = opts.authToken === undefined ? "smoke_token" : opts.authToken;
      const ownerUserId = opts.ownerUserId === undefined ? "42" : opts.ownerUserId;
      const nickname = opts.nickname === undefined ? "Smoke" : opts.nickname;
      if (authToken === null) {
        window.localStorage.removeItem("2048_auth_token_v1");
        window.localStorage.removeItem("2048_auth_userId_v1");
        window.localStorage.removeItem("2048_auth_nickname_v1");
      } else {
        window.localStorage.setItem("2048_auth_token_v1", authToken);
        if (ownerUserId === null) {
          window.localStorage.removeItem("2048_auth_userId_v1");
        } else {
          window.localStorage.setItem("2048_auth_userId_v1", ownerUserId);
        }
        if (nickname === null) {
          window.localStorage.removeItem("2048_auth_nickname_v1");
        } else {
          window.localStorage.setItem("2048_auth_nickname_v1", nickname);
        }
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const session: Record<string, unknown> = {
        mode_key: injectedModeKey,
        challenge_id: opts.challengeId || `smoke-${injectedModeKey}`,
        seed: Number.isFinite(Number(opts.seed)) ? Math.floor(Number(opts.seed)) : 101,
        ranked_session_token: opts.token || `smoke-token-${injectedModeKey}`,
        issued_at: nowSec - 60,
        exp: nowSec + (Number.isFinite(Number(opts.ttlSec)) ? Math.floor(Number(opts.ttlSec)) : 3600)
      };
      if (ownerUserId !== null) session.owner_user_id = ownerUserId;

      window.localStorage.setItem("ranked_session_active:v1:" + injectedModeKey, JSON.stringify(session));
      (window as any).GAME_CHALLENGE_CONTEXT = {
        id: session.challenge_id,
        mode_key: session.mode_key,
        seed: session.seed,
        ranked_session_token: session.ranked_session_token
      };
      if (opts.clearPrefetch) {
        window.localStorage.removeItem("ranked_session_prefetch:v1:" + injectedModeKey);
      }
      if (opts.clearSavedState) {
        window.localStorage.removeItem("savedGameStateByMode:v1:" + injectedModeKey);
        window.localStorage.removeItem("savedGameStateLiteByMode:v1:" + injectedModeKey);
        window.localStorage.removeItem("savedGameStateSyncByMode:v1:" + injectedModeKey);
      }
      if (opts.confirmRestart) {
        window.confirm = () => true;
      }
    },
    { modeKey, options }
  );
}
