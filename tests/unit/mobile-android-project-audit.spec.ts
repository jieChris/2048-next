import { describe, expect, it } from "vitest";

import {
  assertPermissionBoundary,
  DYNAMIC_RECEIVER_PERMISSION_SUFFIX
} from "../../scripts/android-project-audit.mjs";

function mergedManifest(options: {
  applicationId?: string;
  platformPermissions?: string[];
  customPermission?: string;
  protectionLevel?: string;
} = {}): string {
  const applicationId = options.applicationId ?? "cn.next2048.app.debug";
  const platformPermissions = options.platformPermissions ?? [
    "android.permission.INTERNET",
    "android.permission.VIBRATE"
  ];
  const customPermission = options.customPermission ??
    `${applicationId}${DYNAMIC_RECEIVER_PERMISSION_SUFFIX}`;
  const protectionLevel = options.protectionLevel ?? "signature";
  return `
    <manifest xmlns:android="http://schemas.android.com/apk/res/android">
      <permission android:name="${customPermission}" android:protectionLevel="${protectionLevel}"></permission>
      ${[...platformPermissions, customPermission]
        .map((permission) => `<uses-permission android:name="${permission}"></uses-permission>`)
        .join("\n")}
    </manifest>
  `;
}

describe("Android merged-permission audit", () => {
  it("accepts only the two approved platform permissions plus the app-scoped signature permission", () => {
    expect(assertPermissionBoundary({
      manifest: mergedManifest(),
      applicationId: "cn.next2048.app.debug",
      label: "fixture"
    })).toEqual({
      platformPermissions: ["android.permission.INTERNET", "android.permission.VIBRATE"],
      customPermission: `cn.next2048.app.debug${DYNAMIC_RECEIVER_PERMISSION_SUFFIX}`
    });
  });

  it("rejects notification, storage, or any other platform permission", () => {
    expect(() => assertPermissionBoundary({
      manifest: mergedManifest({
        platformPermissions: [
          "android.permission.INTERNET",
          "android.permission.POST_NOTIFICATIONS",
          "android.permission.VIBRATE"
        ]
      }),
      applicationId: "cn.next2048.app.debug",
      label: "fixture"
    })).toThrow(/platform permissions mismatch/u);
  });

  it("rejects a custom permission not bound to the exact build application id", () => {
    expect(() => assertPermissionBoundary({
      manifest: mergedManifest({
        customPermission: `cn.next2048.app${DYNAMIC_RECEIVER_PERMISSION_SUFFIX}`
      }),
      applicationId: "cn.next2048.app.debug",
      label: "fixture"
    })).toThrow(/custom permissions mismatch/u);
  });

  it("rejects the dynamic receiver permission unless it is signature protected", () => {
    expect(() => assertPermissionBoundary({
      manifest: mergedManifest({ protectionLevel: "normal" }),
      applicationId: "cn.next2048.app.debug",
      label: "fixture"
    })).toThrow(/signature protected/u);
  });
});
