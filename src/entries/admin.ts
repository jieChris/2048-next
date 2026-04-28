import { bootstrapDirectPage } from "../app/bootstrap-direct-page";
import { bootstrapAdminPage } from "../pages/admin-page";

await bootstrapDirectPage("admin", bootstrapAdminPage);
