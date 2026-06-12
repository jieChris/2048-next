import { createAdminService } from "../services/admin-rescue";
import { createBrowserStorageAccess } from "../storage/browser-storage";

export interface AdminRescueClientServiceBoundary {
  getStorage: () => Storage | null;
  request: (path: string, options?: RequestInit) => Promise<Record<string, unknown>>;
}

export interface AdminRescueClientServiceBoundaryOptions {
  windowLike?: Window | null | undefined;
}

interface AdminRescueClientServiceBoundaryWindow extends Window {
  AdminRescueClientServiceBoundary?: AdminRescueClientServiceBoundary;
}

export function createAdminRescueClientServiceBoundary(
  options: AdminRescueClientServiceBoundaryOptions = {}
): AdminRescueClientServiceBoundary {
  const windowLike = options.windowLike || (typeof window !== "undefined" ? window : null);
  const storageAccess = createBrowserStorageAccess({
    windowLike: windowLike as unknown as Record<string, unknown>
  });

  return {
    getStorage() {
      return storageAccess.local();
    },

    async request(path, requestOptions) {
      return createAdminService({ windowLike }).request(path, requestOptions);
    }
  };
}

export function installAdminRescueClientServiceBoundary(
  options: AdminRescueClientServiceBoundaryOptions = {}
): AdminRescueClientServiceBoundary | null {
  const windowLike = options.windowLike || (typeof window !== "undefined" ? window : null);
  if (!windowLike) return null;
  const target = windowLike as AdminRescueClientServiceBoundaryWindow;
  if (!target.AdminRescueClientServiceBoundary) {
    target.AdminRescueClientServiceBoundary = createAdminRescueClientServiceBoundary({ windowLike });
  }
  return target.AdminRescueClientServiceBoundary || null;
}
