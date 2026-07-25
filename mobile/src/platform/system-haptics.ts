import { registerPlugin } from "@capacitor/core";

export type SystemHapticKind = "merge" | "milestone" | "finish";

interface NativeSystemHapticsPlugin {
  impact(options: {
    kind: SystemHapticKind;
  }): Promise<{ performed: boolean }>;
}

const plugin = registerPlugin<NativeSystemHapticsPlugin>(
  "Next2048SystemHaptics",
);

export async function performSystemHaptic(
  kind: SystemHapticKind,
): Promise<void> {
  await plugin.impact({ kind });
}
