import "../../style/contextual-guide.css";
import { startContextualGuide } from "../features/contextual-guide/contextual-guide";

const { bootstrapHomeFamilyPage } = await import("./home-family-bootstrap");

await bootstrapHomeFamilyPage("replay");

startContextualGuide({
  guideId: "replay-controls-v1",
  context: {
    pageId: "replay",
    currentUrl: `${window.location.pathname}${window.location.search}${window.location.hash}`,
  },
  ready: () => !!document.querySelector("#replay-progress"),
});
