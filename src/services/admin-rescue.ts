import { createBrowserStorageAccess } from "../storage/browser-storage";
import {
  buildApiBaseCandidates,
  createJsonApiClient,
  readAuthToken,
  type JsonApiClient,
  type JsonRecord
} from "./api-client";

export interface AdminServiceOptions {
  windowLike?: Window | null | undefined;
  client?: JsonApiClient;
}

export interface AdminService {
  request: (path: string, options?: RequestInit) => Promise<JsonRecord>;
}

export function createAdminService(options: AdminServiceOptions = {}): AdminService {
  if (options.client) return { request: options.client.request };
  const windowLike = options.windowLike || (typeof window !== "undefined" ? window : null);
  const storageAccess = createBrowserStorageAccess({
    windowLike: windowLike as unknown as Record<string, unknown>
  });
  const token = readAuthToken({ storageLike: storageAccess.local() });
  const client = createJsonApiClient({
    bases: buildApiBaseCandidates({ locationLike: windowLike?.location }),
    token
  });

  return {
    async request(path, requestOptions) {
      if (!token) {
        return { success: false, code: "NO_TOKEN", error: "未登录或 token 不存在" };
      }
      return client.request(path, requestOptions);
    }
  };
}
