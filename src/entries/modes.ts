import { bootstrapDirectPage } from "../app/bootstrap-direct-page";
import { bootstrapModesPage } from "../pages/modes-page";
import "../../style/contextual-guide.css";
import { startContextualGuide } from "../features/contextual-guide/contextual-guide";

await bootstrapDirectPage("modes", bootstrapModesPage);

startContextualGuide({
  guideId: "mode-selection-v1",
  context: { pageId: "modes" },
  autoOpen: false,
  ready: () => !!document.querySelector(".mode-select-page"),
});
