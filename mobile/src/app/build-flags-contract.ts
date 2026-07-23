export const MOBILE_BUILD_FLAGS_SCHEMA = 2 as const;
export const MOBILE_PRODUCTION_API_BASE = "https://2048next.cn/api" as const;

export interface MobileBuildFlags {
  apiBase: typeof MOBILE_PRODUCTION_API_BASE;
  allowApiBaseOverride: boolean;
  allowDebugLoopbackHttp: boolean;
  allowUnapprovedPolicyOnline: boolean;
}

export function resolveMobileBuildFlags(mode: string): MobileBuildFlags {
  const allowDebugOverrides =
    mode === "development" || mode === "android-debug" || mode === "test";
  return {
    apiBase: MOBILE_PRODUCTION_API_BASE,
    allowApiBaseOverride: allowDebugOverrides,
    allowDebugLoopbackHttp: allowDebugOverrides,
    allowUnapprovedPolicyOnline: allowDebugOverrides,
  };
}
