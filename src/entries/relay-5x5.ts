import { bootstrapDirectPage } from "../app/bootstrap-direct-page";
import { bootstrapRelay5x5Page } from "../pages/relay-5x5-page";
import "../../style/contextual-guide.css";
import { startContextualGuide } from "../features/contextual-guide/contextual-guide";

await bootstrapDirectPage("relay-5x5", bootstrapRelay5x5Page);

startContextualGuide({
  guideId: "relay-5x5-v1",
  context: { pageId: "relay-5x5" },
  autoOpen: false,
  ready: () => !!document.querySelector(".relay-page"),
});
