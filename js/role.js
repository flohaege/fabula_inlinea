// Merkt sich, wer dieser Browser ist: GM oder ein Spielercharakter.
let role = null;
let characterId = null;

export function setSession(newRole, newCharacterId = null) {
    role = newRole;
    characterId = newCharacterId;
    // CSS-Klasse, damit GM-only-Elemente sichtbar werden
    document.body.classList.toggle("is-gm", newRole === "gm");
}
export function getCharacterId() { return characterId; }
export function isGM() { return role === "gm"; }
