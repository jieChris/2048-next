import { bootstrapDirectPage } from "../app/bootstrap-direct-page";
import { bootstrapHistoryPage } from "../pages/history-page";
import "../../style/contextual-guide.css";
import { startContextualGuide } from "../features/contextual-guide/contextual-guide";

await bootstrapDirectPage("history", bootstrapHistoryPage);

startContextualGuide({
  guideId: "records-and-leaderboards-v1",
  context: { pageId: "history" },
  autoOpen: false,
  ready: () => !!document.querySelector(".portal-container"),
});
