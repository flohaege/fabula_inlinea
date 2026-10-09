import { stepToward } from "./overworld.js";
import {
    setPartyPosition,
    setMoveRequest,
    clearMoveRequest
} from "./gameState.js";

const box = document.getElementById("move-request-box");
const text = document.getElementById("move-request-text");
const acceptButton = document.getElementById("move-accept-button");
const rejectButton = document.getElementById("move-reject-button");

let lastGame = null;

export function initializeMoveControls() {
    if (!box || !acceptButton || !rejectButton || !text) {
        console.warn("move-request-box fehlt in index.html - GM-Bestätigung deaktiviert");
        return;
    }
    acceptButton.addEventListener("click", () => {
        const req = lastGame?.moveRequest;
        if (!req) return;

        const x = lastGame.partyX ?? 0;
        const y = lastGame.partyY ?? 0;
        const next = stepToward(x, y, req.x, req.y);

        const arrived = next.x === req.x && next.y === req.y;

        setPartyPosition(next.x, next.y).then(() => {
            // Noch nicht am Ziel: Wunsch bleibt bestehen
            if (!arrived) setMoveRequest(req.x, req.y);
        });
    });

    rejectButton.addEventListener("click", clearMoveRequest);
}

export function updateMoveControls(game) {
    lastGame = game;
    if (!box) return;
    const req = game?.moveRequest;
    if (req && game.currentView === "overworld") {
        text.textContent = `Spieler möchte nach (${req.x}, ${req.y})`;
        box.classList.remove("hidden");
    } else {
        box.classList.add("hidden");
    }
}
