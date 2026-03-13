import { loadLegacyScriptsSequentially } from "./legacy-loader";
import {
  homeCoreScripts,
  homeStandardStartupScripts,
  homeSettingsAndPanelScripts,
  homeIndexTailScripts,
  homeTestUiScripts,
  homePkuInlineStatsScripts,
  homeI18nScripts
} from "./home-family-shared";

const pkuLegacyScripts = [
  ...homeCoreScripts,
  ...homeStandardStartupScripts,
  ...homeSettingsAndPanelScripts,
  ...homeIndexTailScripts,
  ...homeTestUiScripts,
  ...homePkuInlineStatsScripts,
  ...homeI18nScripts
] as const;

await loadLegacyScriptsSequentially(pkuLegacyScripts);
