import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "cn.next2048.app",
  appName: "2048 NEXT",
  webDir: "dist-app",
  android: {
    allowMixedContent: false,
    useLegacyBridge: false,
    loggingBehavior: "none"
  },
  plugins: {
    SystemBars: {
      insetsHandling: "css"
    },
    StatusBar: {
      overlaysWebView: false
    }
  }
};

export default config;
