import { bootstrapDirectPage } from "../app/bootstrap-direct-page";
import { bootstrapPalettePage } from "../pages/palette-page";
import "../../style/contextual-guide.css";
import { startContextualGuide } from "../features/contextual-guide/contextual-guide";
import { initContextualGuideCatalogUI } from "../features/contextual-guide/contextual-guide-catalog";

await bootstrapDirectPage("palette", bootstrapPalettePage);

initContextualGuideCatalogUI();

startContextualGuide({
  guideId: "palette-settings-v1",
  context: { pageId: "palette" },
  autoOpen: false,
  ready: () => !!document.querySelector(".settings-workbench"),
});
