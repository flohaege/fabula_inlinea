import { sprites } from "./assets.js";

// Feste Werte kommen aus data/characters.json,
// aktuelle Werte (LP, GP, Fabula) liegen im Spielstand in Firebase unter "chars".
let characters = [];

export async function loadCharacters() {
    const response = await fetch("./data/characters.json");
    if (!response.ok) throw new Error("characters.json konnte nicht geladen werden");
    characters = (await response.json()).characters;
    return characters;
}

export function getCharacters() { return characters; }
export function getCharacter(id) { return characters.find((c) => c.id === id) || null; }

// Aktueller Zustand: Firebase-Wert, sonst Standard aus der JSON-Datei
export function stateOf(game, id) {
    const c = getCharacter(id) || {};
    const s = (game && game.chars && game.chars[id]) || {};
    const maxLP = s.maxLP ?? c.maxLP ?? 50;
    const maxGP = s.maxGP ?? c.maxGP ?? 50;
    const maxIP = s.maxIP ?? c.maxIP ?? 6;           // Inventarpunkte
    return {
        maxLP,
        maxGP,
        maxIP,
        ip: s.ip ?? maxIP,
        lp: s.lp ?? maxLP,
        gp: s.gp ?? maxGP,
        fabula: s.fabula ?? c.fabula ?? 0,
        // Verbleibende Züge in dieser Runde (1 = GO, 0 = WAIT, mehr = Extra-Züge)
        turnsLeft: s.turnsLeft ?? (s.turnUsed ? 0 : 1),
        turns: s.turns ?? 1,               // Züge pro Runde (1, mit + im GM-Panel 2)
        turnUsed: (s.turnsLeft ?? (s.turnUsed ? 0 : 1)) <= 0
    };
}

// Standard: alle Spielercharaktere sind in der Party
export function partyOf(game) {
    const ids = (game && game.party) ||
        characters.filter((c) => c.type === "pc").map((c) => c.id);
    // NPCs sind nie "in der Party"
    return ids.filter((id) => getCharacter(id)?.type === "pc");
}

// LP bei 50 % oder darunter
export function isLowHP(state) {
    return state.lp <= state.maxLP * 0.5;
}

// Bildpfade: Spielercharaktere haben einen Ordner (portrait.png, idle.png, ...),
// NPCs ein einzelnes Bild in sprites/NPCs/.
export function portraitUrl(c) {
    return c.type === "pc" ? `${sprites}/${c.folder}/portrait.png` : `${sprites}/${c.sprite}`;
}

export function idleUrl(c) {
    return c.type === "pc" ? `${sprites}/${c.folder}/idle.png` : `${sprites}/${c.sprite}`;
}
