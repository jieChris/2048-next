import "../../style/contextual-guide.css";
import { startContextualGuide } from "../features/contextual-guide/contextual-guide";

await (
  await import("./home-family-bootstrap")
).bootstrapHomeFamilyPage("index");

startContextualGuide({
  guideId: "game-basics-v1",
  ready: () => !!document.querySelector(".game-container"),
});
