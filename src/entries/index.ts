import "../../style/contextual-guide.css";
import { startContextualGuide } from "../features/contextual-guide/contextual-guide";

const { bootstrapHomeFamilyPage } = await import("./home-family-bootstrap");

await bootstrapHomeFamilyPage("index");

startContextualGuide({
  guideId: "game-basics-v1",
  context: { pageId: "index" },
  autoOpen: false,
  ready: () => !!document.querySelector(".game-container"),
});
