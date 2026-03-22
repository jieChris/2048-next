import { bootstrapDirectPage } from "../app/bootstrap-direct-page";
import { bootstrapAccountPage } from "../pages/account-page";

await bootstrapDirectPage("account", bootstrapAccountPage);
