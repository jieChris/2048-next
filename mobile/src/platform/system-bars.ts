import { registerPlugin } from "@capacitor/core";

interface NativeSystemBarsPlugin {
  setAppearance(options: { theme: "light" | "dark" }): Promise<void>;
}

const plugin = registerPlugin<NativeSystemBarsPlugin>("Next2048SystemBars");

export async function setSystemBarsAppearance(
  theme: "light" | "dark",
): Promise<void> {
  await plugin.setAppearance({ theme });
}
