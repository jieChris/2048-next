import "../../js/core_bootstrap_runtime.js";
import "../../js/core_mode_catalog_runtime.js";
import { bootstrapHomeFamilyPage } from "./home-family-bootstrap";
import { showCappedGuideOverlay } from "./home-family-shared";

await bootstrapHomeFamilyPage("capped");
showCappedGuideOverlay();
