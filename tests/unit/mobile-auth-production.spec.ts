import { describe, expect, it, vi } from "vitest";

import {
  createMobileAuthService,
  MobileAuthError,
} from "../../mobile/src/auth/auth-service";
import {
  MOBILE_BUILD_FLAGS,
  MOBILE_PRODUCTION_API_BASE,
} from "../../mobile/src/app/build-flags";
import { createMemorySecureStorage } from "../../mobile/src/platform/secure-storage";
import { createPreviewPrivacyRecord } from "../../mobile/src/privacy";

describe("production mobile auth composition", () => {
  it("freezes the API base and keeps the unapproved policy fully offline", () => {
    expect(import.meta.env.MODE).toBe("production");
    expect(MOBILE_BUILD_FLAGS).toEqual({
      apiBase: MOBILE_PRODUCTION_API_BASE,
      allowApiBaseOverride: false,
      allowDebugLoopbackHttp: false,
      allowUnapprovedPolicyOnline: false,
    });

    const clientFactory = vi.fn();
    expect(() =>
      createMobileAuthService({
        apiBase: "https://api.example.test/api",
        privacy: createPreviewPrivacyRecord("online", 1),
        secureStorage: createMemorySecureStorage(),
        clientFactory,
      }),
    ).toThrow(
      expect.objectContaining({
        name: "MobileAuthError",
        code: "privacy_online_required",
      }),
    );
    expect(() =>
      createMobileAuthService({
        privacy: createPreviewPrivacyRecord("online", 1),
        secureStorage: createMemorySecureStorage(),
        clientFactory,
      }),
    ).toThrow(MobileAuthError);
    expect(clientFactory).not.toHaveBeenCalled();
  });
});
