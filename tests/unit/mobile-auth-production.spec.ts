import { describe, expect, it, vi } from "vitest";

import { createMobileAuthService } from "../../mobile/src/auth/auth-service";
import {
  MOBILE_BUILD_FLAGS,
  MOBILE_PRODUCTION_API_BASE,
} from "../../mobile/src/app/build-flags";
import { createMemorySecureStorage } from "../../mobile/src/platform/secure-storage";
import { createPreviewPrivacyRecord } from "../../mobile/src/privacy";

describe("production mobile auth composition", () => {
  it("freezes the API base and accepts the current approved policy", () => {
    expect(import.meta.env.MODE).toBe("production");
    expect(MOBILE_BUILD_FLAGS).toEqual({
      apiBase: MOBILE_PRODUCTION_API_BASE,
      allowApiBaseOverride: false,
      allowDebugLoopbackHttp: false,
    });

    const clientFactory = vi.fn(() => ({
      request: vi.fn(),
      requestResult: vi.fn(),
    }));
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
        code: "invalid_api_base",
      }),
    );
    expect(() =>
      createMobileAuthService({
        privacy: createPreviewPrivacyRecord("online", 1),
        secureStorage: createMemorySecureStorage(),
        clientFactory,
      }),
    ).not.toThrow();
    expect(clientFactory).toHaveBeenCalledTimes(1);
    expect(clientFactory.mock.calls[0][0]).toMatchObject({
      bases: [MOBILE_PRODUCTION_API_BASE],
    });
  });
});
