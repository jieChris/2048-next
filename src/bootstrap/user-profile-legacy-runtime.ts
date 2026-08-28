import coreGameSettingsStorageRuntimeUrl from "../../js/core_game_settings_storage_runtime.js?url";
import apiSharedUtilsUrl from "../../js/api_shared_utils.js?url";
import userProfilePageUrl from "../../js/user_profile_page.js?url";
import { loadLegacyScriptsSequentially } from "../entries/legacy-loader";

let userProfileLegacyRuntimePromise: Promise<void> | null = null;

export function installUserProfileLegacyRuntime(): Promise<void> {
  if (!userProfileLegacyRuntimePromise) {
    userProfileLegacyRuntimePromise = loadLegacyScriptsSequentially([
      coreGameSettingsStorageRuntimeUrl,
      apiSharedUtilsUrl,
      userProfilePageUrl,
    ]);
  }
  return userProfileLegacyRuntimePromise;
}
