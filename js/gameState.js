import { db, authReady } from "./firebase.js";
import { OVERWORLD_MUSIC } from "./config.js";
import {
    doc,
    onSnapshot,
    setDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const gameRef = doc(db, "games", "main");

// setDoc mit merge: legt das Dokument an, falls es noch fehlt,
// und überschreibt nur die angegebenen Felder.
function update(data) {
    return authReady.then(() => setDoc(gameRef, data, { merge: true }));
}

let unsubscribeGame = null;

export function subscribeToGame(callback) {
    return authReady.then(() => {
        unsubscribeGame = onSnapshot(
            gameRef,
            (snapshot) => callback(snapshot.data()),
            (error) => console.warn("Spielstand-Verbindung beendet:", error.code)
        );
        return unsubscribeGame;
    });
}

// Vor dem Abmelden aufrufen, sonst meldet Firestore "permission-denied"
export function stopGameSubscription() {
    if (unsubscribeGame) {
        unsubscribeGame();
        unsubscribeGame = null;
    }
}

// Zurück zur Overworld (feste Overworld-Musik)
export function setView(view) {
    return update({
        currentView: view,
        currentScenario: "none",
        conflict: { active: false, round: 0 },
        music: view === "overworld" ? OVERWORLD_MUSIC : null
    });
}

// Szenario laden (Battle und Space sind jetzt dasselbe)
export function setScenario(scenarioId, actors = [], musicTrack = null) {
    return update({
        currentView: "scenario",
        currentScenario: scenarioId,
        actors,
        conflict: { active: false, round: 0 },
        music: musicTrack
    });
}

export function setActors(actors) {
    return update({ actors });
}

export function setClocks(clocks) {
    return update({ clocks: clocks });
}

// GM setzt den Marker direkt (löscht auch offene Wünsche).
// Das betretene Feld gilt ab jetzt als bekannt (Fog of War).
export function setPartyPosition(x, y) {
    return update({
        partyX: x,
        partyY: y,
        moveRequest: null,
        fogKnown: arrayUnion(`${x},${y}`)
    });
}

// GM: Feld für die Spieler aufdecken oder wieder verdecken
export function setFogTile(x, y, known) {
    return update({
        fogKnown: known ? arrayUnion(`${x},${y}`) : arrayRemove(`${x},${y}`)
    });
}

// Spieler wünscht sich ein Ziel, GM muss bestätigen
export function setMoveRequest(x, y) {
    return update({ moveRequest: { x, y } });
}

export function clearMoveRequest() {
    return update({ moveRequest: null });
}

// Konflikt starten/beenden/neue Runde (optional gleichzeitig Akteure und Charakterwerte setzen)
export function setConflict(conflict, actors, chars) {
    const data = { conflict };
    if (actors) data.actors = actors;
    if (chars) data.chars = chars;
    return update(data);
}

// Fabula-Punkt ausgeben und das Portrait bei allen aufleuchten lassen
export function spendFabula(id, newValue) {
    return update({
        chars: { [id]: { fabula: newValue } },
        flash: { id, at: Date.now() }
    });
}

// Aktuelle Werte einer Figur (LP, GP, Fabula ...). merge sorgt dafür,
// dass nur die angegebenen Felder dieser Figur überschrieben werden.
export function setCharacterState(id, patch) {
    return update({ chars: { [id]: patch } });
}

// Musik für alle setzen: Schlüssel aus music.json, Dateiname, Link oder null (aus)
export function setMusic(track) {
    return update({ music: track });
}

// Angriff, Zauber oder Heilung auslösen: alle Spieler sehen den Effekt
export function triggerEffect(id, kind) {
    return update({ effect: { id, kind, at: Date.now() } });
}
