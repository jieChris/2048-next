import { loadLegacyScriptsSequentially } from "./legacy-loader";
import {
  cappedCoreScripts,
  cappedStartupScripts,
  homeSettingsAndPanelScripts,
  homeTopButtonStyleScripts,
  homeIndexTailScripts,
  homeLeaderboardScripts,
  homeI18nScripts,
  showCappedGuideOverlay
} from "./home-family-shared";

const cappedLegacyScripts = [
  ...cappedCoreScripts,
  ...cappedStartupScripts,
  ...homeSettingsAndPanelScripts,
  ...homeTopButtonStyleScripts,
  ...homeIndexTailScripts,
  ...homeLeaderboardScripts,
  ...homeI18nScripts
] as const;

await loadLegacyScriptsSequentially(cappedLegacyScripts);
showCappedGuideOverlay();
