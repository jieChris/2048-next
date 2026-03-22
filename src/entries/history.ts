import { bootstrapDirectPage } from "../app/bootstrap-direct-page";
import { bootstrapHistoryPage } from "../pages/history-page";

await bootstrapDirectPage("history", bootstrapHistoryPage);
