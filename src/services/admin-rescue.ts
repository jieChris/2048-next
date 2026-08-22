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
  const storageLike = storageAccess.local();
  const bases = buildApiBaseCandidates({ locationLike: windowLike?.location });

  return {
    request(path, requestOptions) {
      return createJsonApiClient({
        bases,
        token: readAuthToken({ storageLike })
      }).request(path, requestOptions);
    }
  };
}
