import { loadLegacyScriptsSequentially } from "./legacy-loader";
import {
  homeAnnouncementScripts,
  homeCoreScripts,
  homeStandardStartupScripts,
  homeSettingsAndPanelScripts,
  homeTopButtonStyleScripts,
  homeIndexTailScripts,
  homeLeaderboardScripts,
  homeI18nScripts
} from "./home-family-shared";

const indexLegacyScripts = [
  ...homeAnnouncementScripts,
  ...homeCoreScripts,
  ...homeStandardStartupScripts,
  ...homeSettingsAndPanelScripts,
  ...homeTopButtonStyleScripts,
  ...homeIndexTailScripts,
  ...homeLeaderboardScripts,
  ...homeI18nScripts
] as const;

await loadLegacyScriptsSequentially(indexLegacyScripts);
