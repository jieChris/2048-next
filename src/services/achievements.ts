import { createBrowserStorageAccess } from "../storage/browser-storage";
import {
  buildApiBaseCandidates,
  createJsonApiClient,
  readAuthToken,
  type JsonRecord
} from "./api-client";
import type { components } from "./generated-api/2048next-v1";
import { createTypedApiClient, type TypedApiClient } from "./typed-api-client";

export type AchievementCreateRequest = components["schemas"]["AchievementCreateRequest"];
export type AchievementUpdateRequest = components["schemas"]["AchievementUpdateRequest"];
export type AchievementRule = components["schemas"]["AchievementRule"];
export type AchievementGrantRequest = components["schemas"]["AchievementGrantRequest"];
export type AchievementEventRequest = components["schemas"]["AchievementEventRequest"];

export interface AchievementsServiceOptions {
  windowLike?: Window | null | undefined;
  client?: TypedApiClient;
}

export interface AchievementsService {
  listAchievements: () => Promise<JsonRecord>;
  listMyAchievements: () => Promise<JsonRecord>;
  grantMyAchievementEvent: (eventId: AchievementEventRequest["event_id"]) => Promise<JsonRecord>;
  getMyShowcase: () => Promise<JsonRecord>;
  updateMyShowcase: (achievementIds: string[]) => Promise<JsonRecord>;
  listAdminAchievements: () => Promise<JsonRecord>;
  createAdminAchievement: (payload: AchievementCreateRequest) => Promise<JsonRecord>;
  updateAdminAchievement: (
    achievementId: string,
    payload: AchievementUpdateRequest
  ) => Promise<JsonRecord>;
  replaceAdminAchievementRules: (
    achievementId: string,
    rules: AchievementRule[]
  ) => Promise<JsonRecord>;
  grantAdminAchievement: (payload: AchievementGrantRequest) => Promise<JsonRecord>;
  backfillAdminAchievements: (payload?: { user_id?: number; achievement_id?: string }) => Promise<JsonRecord>;
}

function createDefaultTypedClient(windowLike: Window | null): TypedApiClient {
  const storageAccess = createBrowserStorageAccess({
    windowLike: windowLike as unknown as Record<string, unknown>
  });
  const token = readAuthToken({ storageLike: storageAccess.local() });
  return createTypedApiClient(
    createJsonApiClient({
      bases: buildApiBaseCandidates({ locationLike: windowLike?.location }),
      token
    })
  );
}

export function createAchievementsService(
  options: AchievementsServiceOptions = {}
): AchievementsService {
  const windowLike = options.windowLike || (typeof window !== "undefined" ? window : null);
  const client = options.client || createDefaultTypedClient(windowLike);

  return {
    listAchievements() {
      return client.request("get", "/achievements");
    },
    listMyAchievements() {
      return client.request("get", "/user/me/achievements");
    },
    grantMyAchievementEvent(eventId) {
      return client.request("post", "/user/me/achievement-events", {
        body: { event_id: eventId }
      });
    },
    getMyShowcase() {
      return client.request("get", "/user/me/achievement-showcase");
    },
    updateMyShowcase(achievementIds) {
      if (achievementIds.length > 3) {
        return Promise.resolve({
          success: false,
          code: "ACHIEVEMENT_SHOWCASE_LIMIT",
          error: "最多只能展示 3 个成就"
        });
      }
      return client.request("put", "/user/me/achievement-showcase", {
        body: { achievement_ids: achievementIds }
      });
    },
    listAdminAchievements() {
      return client.request("get", "/admin/achievements");
    },
    createAdminAchievement(payload) {
      return client.request("post", "/admin/achievements", {
        body: payload
      });
    },
    updateAdminAchievement(achievementId, payload) {
      return client.request("patch", "/admin/achievements/{achievementId}", {
        path: { achievementId },
        body: payload
      });
    },
    replaceAdminAchievementRules(achievementId, rules) {
      return client.request("post", "/admin/achievements/{achievementId}/rules", {
        path: { achievementId },
        body: { rules }
      });
    },
    grantAdminAchievement(payload) {
      return client.request("post", "/admin/achievements/grant", {
        body: payload
      });
    },
    backfillAdminAchievements(payload = {}) {
      return client.request("post", "/admin/achievements/backfill", {
        body: payload
      });
    }
  };
}
