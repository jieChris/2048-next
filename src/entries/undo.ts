import { loadLegacyScriptsSequentially } from "./legacy-loader";
import {
  homeCoreScripts,
  homeStandardStartupScripts,
  homeSettingsAndPanelScripts,
  homeTopButtonStyleScripts,
  homeIndexTailScripts,
  homeLeaderboardScripts,
  homeI18nScripts
} from "./home-family-shared";

const undoLegacyScripts = [
  ...homeCoreScripts,
  ...homeStandardStartupScripts,
  ...homeSettingsAndPanelScripts,
  ...homeTopButtonStyleScripts,
  ...homeIndexTailScripts,
  ...homeLeaderboardScripts,
  ...homeI18nScripts
] as const;

await loadLegacyScriptsSequentially(undoLegacyScripts);
