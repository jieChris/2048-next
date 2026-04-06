import { bootstrapDirectPage } from "../app/bootstrap-direct-page";
import { bootstrapRelay5x5Page } from "../pages/relay-5x5-page";

await bootstrapDirectPage("relay-5x5", bootstrapRelay5x5Page);
