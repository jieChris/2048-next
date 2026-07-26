import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  normalizeCertificateSha256,
  parseAabCertificateSha256,
  parseApkCertificateSha256,
} from "../../scripts/android-release-artifacts.mjs";

const fingerprint =
  "00112233445566778899AABBCCDDEEFF00112233445566778899AABBCCDDEEFF";
const colonFingerprint = fingerprint.match(/.{2}/gu)?.join(":") ?? "";

describe("Android release candidate workflow", () => {
  it("normalizes and parses APK/AAB signer certificates", () => {
    expect(normalizeCertificateSha256(colonFingerprint)).toBe(fingerprint);
    expect(
      parseApkCertificateSha256(
        `Signer #1 certificate SHA-256 digest: ${fingerprint.toLowerCase()}`,
      ),
    ).toBe(fingerprint);
    expect(
      parseAabCertificateSha256(`SHA256: ${colonFingerprint}`),
    ).toBe(fingerprint);
    expect(() => normalizeCertificateSha256("1234")).toThrow(
      /64 hexadecimal characters/u,
    );
  });

  it("stays manual, protected, signed, and artifact-only", () => {
    const workflow = readFileSync(
      ".github/workflows/android-release.yml",
      "utf8",
    );
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toMatch(/\n\s+(?:push|pull_request|schedule):/u);
    expect(workflow).toContain("environment: android-release");
    expect(workflow).toContain("NEXT2048_RELEASE_KEYSTORE_BASE64");
    expect(workflow).toContain("NEXT2048_RELEASE_CERT_SHA256");
    expect(workflow).toContain("version_code:");
    expect(workflow).toContain("version_name:");
    expect(workflow).toContain("ORG_GRADLE_PROJECT_NEXT2048_VERSION_CODE");
    expect(workflow).toContain("ORG_GRADLE_PROJECT_NEXT2048_VERSION_NAME");
    expect(workflow).toContain("NEXT2048_EXPECTED_VERSION_CODE");
    expect(workflow).toContain("NEXT2048_EXPECTED_VERSION_NAME");
    expect(workflow).toContain("npm run android:release");
    expect(workflow).toContain("artifacts/android-release");
    expect(workflow).not.toMatch(/google-play|play console|deploy/u);
    expect(packageJson.scripts["android:release"]).toContain(
      ":app:assembleRelease :app:bundleRelease",
    );
    expect(packageJson.scripts["android:release"]).toContain(
      "android-release-artifacts.mjs",
    );
    expect(packageJson.scripts["android:release"]).toContain(
      "audit:mobile-boundary -- --release-candidate",
    );
    expect(
      readFileSync("scripts/android-release-artifacts.mjs", "utf8"),
    ).toContain('"--untracked-files=no"');
  });
});
