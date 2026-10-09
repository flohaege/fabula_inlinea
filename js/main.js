import { authReady } from "./firebase.js";
import { subscribeToGame, setView, setScenario, setClocks } from "./gameState.js";
import { showGameScreen, updateGameDisplay, initializeViewButtons } from "./views.js";
import { initializeLogin } from "./login.js";
import { renderClocks, initializeClockControls } from "./clocks.js";
import { loadScenarios, getScenario } from "./scenarios.js";
import { buildDefaultActors, initializeSceneControls } from "./scene.js";
import { initializeScenarioPanel } from "./scenarioPanel.js";
import { initializeMusic, updateMusic, startTitleMusic } from "./music.js";
import { renderGameView } from "./gameView.js";
import { loadCharacters } from "./characters.js";
import { renderGmPanel } from "./gmPanel.js";
import { setSession, isGM } from "./role.js";
import { renderPlayerPanel } from "./playerPanel.js";
import { handleFlash } from "./flash.js";
import { handleEffect } from "./effects.js";
import { initializeStage } from "./stage.js";

initializeStage();

// Schaltfläche links: Spieler und GM sehen verschiedene Oberflächen
function renderSidePanel(game) {
    if (isGM()) renderGmPanel(game);
    else renderPlayerPanel(game);
}

let currentClocks = [];
let latestGame = null;

loadCharacters()
    .then(() => {
        if (latestGame) {
            renderSidePanel(latestGame);
            renderGameView(latestGame);
            handleFlash(latestGame);
        }
    })
    .catch((error) => console.error(error));

initializeLogin(({ role, characterId, name }) => {
    setSession(role, characterId);
    showGameScreen(role);
    document.getElementById("who-am-i").textContent = name;
});

initializeViewButtons({
    onOverworld: () => setView("overworld")
});

initializeSceneControls();
initializeMusic();
startTitleMusic();

initializeClockControls((newClock) => {
    currentClocks = [...currentClocks, newClock];
    setClocks(currentClocks);
});

loadScenarios().then(() => {
    if (latestGame) updateGameDisplay(latestGame);
    initializeScenarioPanel((scenarioId) => {
        const scenario = getScenario(scenarioId);
        setScenario(scenarioId, buildDefaultActors(scenario?.actors), scenario?.music || null);
    });
});

authReady.then(() => {
    subscribeToGame((game) => {
        if (!game) return;

        latestGame = game;
        currentClocks = game.clocks || [];

        updateGameDisplay(game);
        renderGameView(game);
        renderClocks(currentClocks);
        updateMusic(game);
        renderSidePanel(game);
        handleFlash(game);
        handleEffect(game);
    });
});
