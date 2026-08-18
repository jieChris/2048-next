import "../../style/contextual-guide.css";
import { startContextualGuide } from "../features/contextual-guide/contextual-guide";

const { bootstrapHomeFamilyPage } = await import("./home-family-bootstrap");

await bootstrapHomeFamilyPage("practice");

const params = new URLSearchParams(window.location.search);
const globalWindow = window as Window & {
  GAME_MODE_CONFIG?: Record<string, unknown>;
};

startContextualGuide({
  guideId: "practice-board-v1",
  context: () => ({
    pageId: "practice",
    modeKey: params.get("practice_mode_key") || document.body.dataset.modeId || "",
    ruleset: params.get("practice_ruleset") || String(globalWindow.GAME_MODE_CONFIG?.ruleset || ""),
    modeConfig: globalWindow.GAME_MODE_CONFIG || null,
    compact: window.matchMedia?.("(max-width: 980px)").matches === true,
    currentUrl: `${window.location.pathname}${window.location.search}${window.location.hash}`,
  }),
  ready: () => !!document.querySelector("#selection-grid"),
});
