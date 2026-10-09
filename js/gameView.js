import { getScenario } from "./scenarios.js";
import { renderOverworld } from "./overworld.js";
import { buildScene, renderActors, trackGame } from "./scene.js";

const gameView = document.getElementById("game-view");
let lastKey = null;

export function renderGameView(game) {
    if (!game) return;
    trackGame(game);

    if (game.currentView === "overworld") {
        lastKey = "overworld";
        renderOverworld(game);
        return;
    }

    const key = `scenario/${game.currentScenario}`;

    if (key !== lastKey) {
        lastKey = key;
        gameView.innerHTML = "";

        if (!game.currentScenario || game.currentScenario === "none") return;

        const scenario = getScenario(game.currentScenario);
        if (!scenario) {
            console.error("Scenario not found:", game.currentScenario);
            return;
        }
        buildScene(scenario);
    }

    renderActors(game);
}
