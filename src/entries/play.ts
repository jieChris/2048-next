import "../../style/contextual-guide.css";
import { startContextualGuide } from "../features/contextual-guide/contextual-guide";

const { bootstrapHomeFamilyPage } = await import("./home-family-bootstrap");

await bootstrapHomeFamilyPage("play");

const globalWindow = window as Window & {
  GAME_MODE_CONFIG?: Record<string, unknown>;
};

startContextualGuide({
  guideId: "diagonal-moves-v1",
  context: () => ({
    pageId: "play",
    modeKey: String(globalWindow.GAME_MODE_CONFIG?.key || new URLSearchParams(window.location.search).get("mode_key") || ""),
    modeConfig: globalWindow.GAME_MODE_CONFIG || null,
    compact: window.matchMedia?.("(max-width: 980px)").matches === true,
    currentUrl: `${window.location.pathname}${window.location.search}${window.location.hash}`,
  }),
  ready: () =>
    !!document.querySelector(".game-container") &&
    (!!globalWindow.GAME_MODE_CONFIG || !!document.body?.getAttribute("data-mode-id")),
});
