import "../../style/contextual-guide.css";
import { startContextualGuide } from "../features/contextual-guide/contextual-guide";

await (
  await import("./home-family-bootstrap")
).bootstrapHomeFamilyPage("replay");

startContextualGuide({
  guideId: "replay-controls-v1",
  ready: () => !!document.querySelector("#replay-progress"),
});
