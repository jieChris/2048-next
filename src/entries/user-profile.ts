import { bootstrapDirectPage } from "../app/bootstrap-direct-page";
import { bootstrapUserProfilePage } from "../pages/user-profile-page";

await bootstrapDirectPage("user-profile", bootstrapUserProfilePage);