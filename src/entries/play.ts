import "../../style/contextual-guide.css";
import { startContextualGuide } from "../features/contextual-guide/contextual-guide";

await (await import("./home-family-bootstrap")).bootstrapHomeFamilyPage("play");

const globalWindow = window as Window & {
  GAME_MODE_CONFIG?: Record<string, unknown>;
};

startContextualGuide({
  guideId: "diagonal-moves-v1",
  context: () => ({
    modeKey: String(
      globalWindow.GAME_MODE_CONFIG?.key ||
        new URLSearchParams(location.search).get("mode_key") ||
        "",
    ),
    modeConfig: globalWindow.GAME_MODE_CONFIG || null,
    compact: window.matchMedia?.("(max-width: 980px)").matches === true,
  }),
  ready: () =>
    !!document.querySelector(".game-container") &&
    (!!globalWindow.GAME_MODE_CONFIG ||
      !!document.body?.getAttribute("data-mode-id")),
});
