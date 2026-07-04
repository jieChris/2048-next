import "../../js/core_bootstrap_runtime.js";

const { bootstrapHomeFamilyPage } = await import("./home-family-bootstrap");
await bootstrapHomeFamilyPage("capped");
const { showCappedGuideOverlay } = await import("./home-family-shared");
showCappedGuideOverlay();
