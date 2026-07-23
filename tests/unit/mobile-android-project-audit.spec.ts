import { describe, expect, it } from "vitest";

import {
  assertPermissionBoundary,
  assertSecureStorageSource,
  DYNAMIC_RECEIVER_PERMISSION_SUFFIX
} from "../../scripts/android-project-audit.mjs";

const validSecureStorageSource = `
  KEYSTORE_PROVIDER = "AndroidKeyStore";
  CIPHER_TRANSFORMATION = "AES/GCM/NoPadding";
  getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
  KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_PROVIDER);
  Cipher.getInstance(CIPHER_TRANSFORMATION);
  setRandomizedEncryptionRequired(true);
  setKeySize(AES_KEY_BITS);
  cipher.updateAAD(aadFor(key));
  cipher.updateAAD(aadFor(key));
`;
const validSecureStoragePluginSource = `
  @CapacitorPlugin(name = "Next2048SecureStorage")
  storage = new SecureStorage(getContext());
  @PluginMethod storage.get(call.getString("key"));
  @PluginMethod storage.set(call.getString("key"), call.getString("value"));
  @PluginMethod storage.delete(call.getString("key"));
`;

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
describe("Android secure-storage source audit", () => {
  it("requires executable registration, AES-GCM/AAD, and a delegating bridge", () => {
    expect(() => assertSecureStorageSource({
      mainActivity: "registerPlugin(Next2048SecureStoragePlugin.class);",
      secureStorage: validSecureStorageSource,
      secureStoragePlugin: validSecureStoragePluginSource
    })).not.toThrow();
  });

  it("does not accept security markers that exist only in comments", () => {
    expect(() => assertSecureStorageSource({
      mainActivity: "// registerPlugin(Next2048SecureStoragePlugin.class);",
      secureStorage: validSecureStorageSource,
      secureStoragePlugin: validSecureStoragePluginSource
    })).toThrow(/registered explicitly/u);
    expect(() => assertSecureStorageSource({
      mainActivity: "registerPlugin(Next2048SecureStoragePlugin.class);",
      secureStorage: `/* ${validSecureStorageSource} */`,
      secureStoragePlugin: validSecureStoragePluginSource
    })).toThrow(/implementation is missing/u);
  });

  it("rejects encryption code that does not bind both directions with AAD", () => {
    expect(() => assertSecureStorageSource({
      mainActivity: "registerPlugin(Next2048SecureStoragePlugin.class);",
      secureStorage: validSecureStorageSource.replace(
        "cipher.updateAAD(aadFor(key));\n  cipher.updateAAD(aadFor(key));",
        "cipher.updateAAD(aadFor(key));"
      ),
      secureStoragePlugin: validSecureStoragePluginSource
    })).toThrow(/both encryption and decryption/u);
  });

  it("rejects a bridge that does not delegate all operations to SecureStorage", () => {
    expect(() => assertSecureStorageSource({
      mainActivity: "registerPlugin(Next2048SecureStoragePlugin.class);",
      secureStorage: validSecureStorageSource,
      secureStoragePlugin: validSecureStoragePluginSource.replace(
        'storage.set(call.getString("key"), call.getString("value"));',
        'getSharedPreferences("plaintext", 0).edit();'
      )
    })).toThrow(/secure-storage plugin/u);
  });
});
