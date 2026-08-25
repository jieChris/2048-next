import "@tabler/core/dist/css/tabler.min.css";
import "@tabler/core/dist/js/tabler.esm.min.js";
import "../../style/admin_page.css";
import "../../style/theme_plaza.css";
import { bootstrapDirectPage } from "../app/bootstrap-direct-page";
import { bootstrapAdminPage } from "../pages/admin-page";

await bootstrapDirectPage("admin", bootstrapAdminPage);
