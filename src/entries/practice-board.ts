import { loadLegacyScriptsSequentially } from "./legacy-loader";
import {
  homeCoreScripts,
  homeStandardStartupScripts,
  homeSettingsAndPanelScripts,
  homeIndexTailScripts,
  homeTestUiScripts,
  homeI18nScripts
} from "./home-family-shared";

const practiceBoardLegacyScripts = [
  ...homeCoreScripts,
  ...homeStandardStartupScripts,
  ...homeSettingsAndPanelScripts,
  ...homeIndexTailScripts,
  ...homeTestUiScripts,
  ...homeI18nScripts
] as const;

await loadLegacyScriptsSequentially(practiceBoardLegacyScripts);
