import { sprites } from "./assets.js";
import { TILE_SIZE } from "./config.js";

export function createPartyMarker() {
    const party = document.createElement("img");
    party.src = `${sprites}/party.png`;
    party.className = "party-marker";
    return party;
}

// Funktioniert für jedes Element, das auf einem Feld sitzen soll
export function positionOnTile(element, x, y) {
    element.style.left = `${x * TILE_SIZE}px`;
    element.style.top = `${y * TILE_SIZE}px`;
}
