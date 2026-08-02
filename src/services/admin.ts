import { createAdminService } from "./admin-rescue";

export type AdminRecord = Record<string, unknown>;

export interface AdminApiResponse<T = unknown> extends AdminRecord {
  success?: boolean;
  data?: T;
  error?: string;
  code?: string;
  page?: number;
  limit?: number;
  total?: number;
}

export interface AdminApi {
  request<T = unknown>(path: string, options?: RequestInit): Promise<AdminApiResponse<T>>;
}

export function createAdminApi(): AdminApi {
  const service = createAdminService();
  return {
    request<T>(path: string, options?: RequestInit) {
      return service.request(path, options) as Promise<AdminApiResponse<T>>;
    }
  };
}

export function adminQuery(path: string, params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    query.set(key, String(value));
  }
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}
