import { bootstrapDirectPage } from "../app/bootstrap-direct-page";
import { bootstrapAccountSettingsPage } from "../pages/account-settings-page";

await bootstrapDirectPage("account-settings", bootstrapAccountSettingsPage);
