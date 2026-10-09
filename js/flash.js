// Lässt das Portrait/Sprite eines Charakters bei ALLEN kurz aufleuchten.
// Der Auslöser (flash: {id, at}) liegt im Spielstand.
const DURATION = 1000;

let initialized = false;
let lastAt = null;
let flashId = null;
let until = 0;

export function handleFlash(game) {
    if (!game) return;
    const flash = game.flash;

    // Beim ersten Snapshot nur merken, nicht abspielen (sonst Aufleuchten beim Laden)
    if (!initialized) {
        initialized = true;
        lastAt = flash ? flash.at : null;
        return;
    }

    if (flash && flash.at !== lastAt) {
        lastAt = flash.at;
        flashId = flash.id;
        until = Date.now() + DURATION;
    }

    // Auch nach einem Neuaufbau der Oberfläche wieder anwenden, solange es läuft
    if (flashId && Date.now() < until) {
        document
            .querySelectorAll(`[data-char="${CSS.escape(flashId)}"]`)
            .forEach((el) => el.classList.add("flash"));
        setTimeout(() => {
            document
                .querySelectorAll(".flash")
                .forEach((el) => el.classList.remove("flash"));
        }, until - Date.now());
    }
}
