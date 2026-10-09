import { images } from "./assets.js";
import { TILE_SIZE, MAP_AREA } from "./config.js";
import { createPartyMarker, positionOnTile } from "./partyMarker.js";
import { isGM } from "./role.js";
import {
    setPartyPosition,
    setMoveRequest,
    clearMoveRequest,
    setFogTile
} from "./gameState.js";

// Fog of War: Schleier über unbekannten Feldern
const VEIL_PLAYER = "rgba(136, 82, 0, 0.6)";   // Felder neben dem Marker (Spieler)
const VEIL_GM = "rgba(136, 82, 0, 0.4)";        // unbekannte Felder aus Sicht des GM (violett)

const gameView = document.getElementById("game-view");

const PAN_STEP = TILE_SIZE;     // Pfeiltaste = ein Feld

let mapWidth = 0;               // in Feldern
let mapHeight = 0;
let mapPxWidth = 0;             // in Pixeln
let mapPxHeight = 0;

let world = null;               // Ebene, die gegen die Kamera verschoben wird
let map = null;
let fogCanvas = null;           // Schleier über der Karte
let party = null;
let target = null;              // gelbes Zielfeld (enthält den grünen Haken)
let rejectButton = null;        // rotes X auf dem Party-Marker
let lastGame = null;

let camX = 0;                   // linke obere Ecke des sichtbaren Ausschnitts (Kartenpixel)
let camY = 0;
let manualCamera = false;       // true = eigene Ansicht, folgt dem Marker nicht mehr

// Wird bei jedem Snapshot aufgerufen. Baut die Karte nur EINMAL auf,
// danach werden nur Marker und Kamera bewegt.
export function renderOverworld(game) {
    lastGame = game;
    if (!gameView.querySelector(".overworld-map")) {
        build();
    }
    updateMarkers();
    drawFog();
    updateCamera();
}

function build() {
    gameView.innerHTML = "";
    manualCamera = false;

    world = document.createElement("div");
    world.className = "world";

    map = document.createElement("img");
    map.className = "overworld-map";
    map.src = `${images}/overworld.png`;

    fogCanvas = document.createElement("canvas");
    fogCanvas.className = "fog-layer";

    party = createPartyMarker();
    party.style.width = `${TILE_SIZE}px`;
    party.style.height = `${TILE_SIZE}px`;

    // Zielfeld mit grünem Haken (nur für den GM sichtbar/klickbar)
    target = document.createElement("div");
    target.className = "target-marker hidden";
    target.style.width = `${TILE_SIZE}px`;
    target.style.height = `${TILE_SIZE}px`;

    const acceptButton = document.createElement("button");
    acceptButton.className = "move-button accept-button";
    acceptButton.textContent = "✔";
    acceptButton.addEventListener("click", acceptMove);
    target.appendChild(acceptButton);

    // Rotes X oben rechts auf dem Party-Marker
    rejectButton = document.createElement("button");
    rejectButton.className = "move-button reject-button hidden";
    rejectButton.textContent = "✖";
    rejectButton.addEventListener("click", clearMoveRequest);

    const thisMap = map;
    map.addEventListener("load", () => {
        mapPxWidth = thisMap.naturalWidth;
        mapPxHeight = thisMap.naturalHeight;
        mapWidth = Math.floor(mapPxWidth / TILE_SIZE);
        mapHeight = Math.floor(mapPxHeight / TILE_SIZE);
        fogCanvas.width = mapPxWidth;
        fogCanvas.height = mapPxHeight;
        drawFog();
        updateCamera();
    });

    // Klick: Bewegung. Shift+Klick auf den Party-Marker: eigene Ansicht zurücksetzen.
    map.addEventListener("click", handleMapClick);

    world.appendChild(map);
    world.appendChild(fogCanvas);
    world.appendChild(party);
    world.appendChild(target);
    world.appendChild(rejectButton);
    gameView.appendChild(world);
}

function handleMapClick(event) {
    if (!map) return;
    // rect ist nach Bühnen-Skalierung und Kamera-Versatz gemessen
    const rect = map.getBoundingClientRect();
    const k = rect.width / map.naturalWidth;
    const x = Math.floor((event.clientX - rect.left) / k / TILE_SIZE);
    const y = Math.floor((event.clientY - rect.top) / k / TILE_SIZE);

    if (!isValidTile(x, y)) return;

    if (event.shiftKey) {
        const onMarker = lastGame &&
            x === (lastGame.partyX ?? 0) && y === (lastGame.partyY ?? 0);
        if (onMarker) {
            manualCamera = false;
            updateCamera();
        }
        // GM: Shift+Klick deckt ein Feld für die Spieler auf oder verdeckt es wieder
        if (!onMarker && isGM() && lastGame) {
            const known = new Set(lastGame.fogKnown || []);
            setFogTile(x, y, !known.has(`${x},${y}`));
        }
        return;
    }

    if (isGM()) {
        setPartyPosition(x, y);   // GM: sofort
    } else {
        setMoveRequest(x, y);     // Player: Wunsch an GM
    }
}

// ---------- Fog of War ----------

// Bekannt sind alle betretenen und vom GM aufgedeckten Felder (dauerhaft gespeichert).
// Spieler sehen zusätzlich nur die Felder, die GERADE an den Marker grenzen
// (mit Schleier); bewegt sich der Marker, verlieren die alten Nachbarn diesen Zustand.
// Alles andere ist schwarz. Der GM sieht alles, unbekannte Felder liegen unter einem
// violetten Schleier.
function drawFog() {
    if (!fogCanvas || !lastGame || !mapPxWidth) return;

    const ctx = fogCanvas.getContext("2d");
    const gm = isGM();
    const partyX = lastGame.partyX ?? 0;
    const partyY = lastGame.partyY ?? 0;

    const known = new Set(lastGame.fogKnown || []);
    known.add(`${partyX},${partyY}`);                       // besetztes Feld

    const nextToMarker = (x, y) =>
        Math.max(Math.abs(x - partyX), Math.abs(y - partyY)) === 1;

    ctx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
    if (!gm) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
    }

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;

            if (known.has(`${x},${y}`)) {
                if (!gm) ctx.clearRect(px, py, TILE_SIZE, TILE_SIZE);
            } else if (gm) {
                ctx.fillStyle = VEIL_GM;
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            } else if (nextToMarker(x, y)) {
                ctx.clearRect(px, py, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = VEIL_PLAYER;
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

// ---------- Kamera ----------

// Ist die Karte kleiner als die Fläche, steht sie mittig, sonst bleibt der Rand bündig
function clampAxis(pos, mapSize, viewSize) {
    if (mapSize <= viewSize) return -(viewSize - mapSize) / 2;
    return Math.max(0, Math.min(mapSize - viewSize, pos));
}

function updateCamera() {
    if (!world || !mapPxWidth) return;

    if (!manualCamera && lastGame) {
        // Ausschnitt auf den Marker zentrieren (am Kartenrand begrenzt)
        camX = (lastGame.partyX ?? 0) * TILE_SIZE + TILE_SIZE / 2 - MAP_AREA.width / 2;
        camY = (lastGame.partyY ?? 0) * TILE_SIZE + TILE_SIZE / 2 - MAP_AREA.height / 2;
    }
    camX = clampAxis(camX, mapPxWidth, MAP_AREA.width);
    camY = clampAxis(camY, mapPxHeight, MAP_AREA.height);

    world.style.transform = `translate(${-camX}px, ${-camY}px)`;
}

// Pfeiltasten verschieben nur die eigene Ansicht
document.addEventListener("keydown", (event) => {
    const keys = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]
    };
    const move = keys[event.key];
    if (!move || !world || !lastGame || lastGame.currentView !== "overworld") return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;

    event.preventDefault();
    manualCamera = true;
    camX += move[0] * PAN_STEP;
    camY += move[1] * PAN_STEP;
    updateCamera();
});

// ---------- Marker ----------

function updateMarkers() {
    if (!party || !lastGame) return;

    const px = lastGame.partyX ?? 0;
    const py = lastGame.partyY ?? 0;
    positionOnTile(party, px, py);

    const req = lastGame.moveRequest;
    if (req) {
        positionOnTile(target, req.x, req.y);
        positionOnTile(rejectButton, px, py);
        target.classList.remove("hidden");
        rejectButton.classList.remove("hidden");
    } else {
        target.classList.add("hidden");
        rejectButton.classList.add("hidden");
    }
}

// GM bestätigt: ein Feld in Richtung Ziel (auch diagonal)
function acceptMove() {
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
}

export function isValidTile(x, y) {
    return x >= 0 && x < mapWidth && y >= 0 && y < mapHeight;
}

export function stepToward(x, y, targetX, targetY) {
    return {
        x: x + Math.sign(targetX - x),
        y: y + Math.sign(targetY - y)
    };
}
