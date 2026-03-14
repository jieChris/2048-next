import { bootstrapHomeFamilyPage } from "./home-family-bootstrap";
import { showCappedGuideOverlay } from "./home-family-shared";

await bootstrapHomeFamilyPage("capped");
showCappedGuideOverlay();
