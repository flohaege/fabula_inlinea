import { getScenario } from "./scenarios.js";

const roleScreen = document.getElementById("role-screen");
const gameScreen = document.getElementById("game-screen");
const gmPanel = document.getElementById("gm-panel");

const scenarioName = document.getElementById("scenario-name");
const overworldButton = document.getElementById("overworld-button");


export function showGameScreen(role) {
    roleScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    if (role === "gm") {
        gmPanel.classList.remove("hidden");
    }

    // Toneinstellungen sitzen in der Schaltfläche (GM: Zeile 10, Spieler: unten)
    const sound = document.getElementById("music-controls");
    const slot = document.getElementById(role === "gm" ? "gm-sound-row" : "pl-sound-row");
    if (sound && slot) slot.appendChild(sound);
}

// Kleiner Szenariotitel; in der Overworld kein Titel
export function updateGameDisplay(game) {
    if (!game) return;

    const inScenario =
        game.currentView !== "overworld" &&
        game.currentScenario &&
        game.currentScenario !== "none";

    const scenario = inScenario ? getScenario(game.currentScenario) : null;
    scenarioName.textContent = scenario ? scenario.name : "";
}

export function initializeViewButtons(handlers) {
    overworldButton.addEventListener("click", handlers.onOverworld);
}
