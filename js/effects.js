import { sprites } from "./assets.js";
import { getCharacter } from "./characters.js";

const EFFECT_MS = 1000;   // how long attack/spell/heal effects stay on screen

// Angriff und Zauber erscheinen auf der rechten, Heilung auf der linken Bildhälfte
const SIDE = { attack: "right", spell: "right", heal: "left" };
const LABEL = { attack: "⚔ Angriff", spell: "✦ Zauber", heal: "✚ Heilung" };

let initialized = false;
let lastAt = null;

// Bei jedem Spielstand aufrufen: spielt einen neuen Effekt bei allen ab
export function handleEffect(game) {
    if (!game) return;
    const effect = game.effect;

    // Erster Snapshot: nur merken, damit beim Laden nichts abgespielt wird
    if (!initialized) {
        initialized = true;
        lastAt = effect ? effect.at : null;
        return;
    }
    if (!effect || effect.at === lastAt) return;
    lastAt = effect.at;

    play(effect);
}

function play(effect) {
    const scene = document.querySelector(".scene");
    if (!scene || !SIDE[effect.kind]) return;      // nur in Szenarien

    const character = getCharacter(effect.id);
    const overlay = document.createElement("div");
    overlay.className = `effect-overlay ${SIDE[effect.kind]}`;

    const img = document.createElement("img");
    if (character && character.folder) {
        img.src = `${sprites}/${character.folder}/${effect.kind}.gif`;
    }
    // Ohne GIF-Datei: Hinweistext, damit man den Ablauf trotzdem testen kann
    img.addEventListener("error", () => {
        img.remove();
        const label = document.createElement("div");
        label.className = "effect-label";
        label.textContent = `${LABEL[effect.kind]} – ${character ? character.name : ""}`;
        overlay.appendChild(label);
    });
    overlay.appendChild(img);

    scene.appendChild(overlay);
    setTimeout(() => overlay.remove(), EFFECT_MS);
}
