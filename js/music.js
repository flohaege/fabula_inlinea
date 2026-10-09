import { music } from "./assets.js";
import { setMusic } from "./gameState.js";
import { TITLE_MUSIC } from "./config.js";

const audio = new Audio();
audio.loop = true;

let current = null;      // aktuell laufender Titel laut Spielstand
let tracks = {};          // Schlüssel -> { file }
let loaded = false;
let pendingGame = null;

const select = document.getElementById("music-select");
const playButton = document.getElementById("music-play-button");
const currentLabel = document.getElementById("music-current");
const muteButton = document.getElementById("music-mute-button");
const volumeSlider = document.getElementById("music-volume");

function resolveSrc(src) {
    // Link, Schlüssel aus music.json oder direkter Dateiname in assets/music
    if (/^https?:\/\//i.test(src)) return src;
    const file = tracks[src] ? tracks[src].file : src;
    return `${music}/${encodeURIComponent(file)}`;
}

// Wird bei jedem Snapshot aufgerufen, spielt nur bei Änderung neu
const TITLE_MARK = "__title__";   // Platzhalter: Titelmusik läuft gerade

// Titelmusik: startet beim ersten Klick auf dem Startbildschirm
// (Browser erlauben Ton erst nach einer Interaktion)
export function startTitleMusic() {
    document.addEventListener("click", () => {
        if (current !== null) return;
        current = TITLE_MARK;
        audio.src = resolveSrc(TITLE_MUSIC);
        audio.play().catch(() => {});
    }, { once: true });
}

export function updateMusic(game) {
    // Titelliste noch nicht geladen: merken und später anwenden
    if (!loaded) { pendingGame = game; return; }

    const src = game?.music || null;

    // Anzeige des aktuellen Titels (Kurzform)
    if (currentLabel) {
        currentLabel.textContent = !src ? "–" : (tracks[src] ? src : "Link");
    }

    if (src === current) return;
    current = src;

    if (!src) {
        audio.pause();
        return;
    }
    audio.src = resolveSrc(src);
    audio.play().catch(() => {
        // Browser blockiert Autoplay bis zur ersten Interaktion, siehe unten
        console.warn("Musik wartet auf einen Klick.");
    });
}

export async function initializeMusic() {
    // Lokale Musikliste laden
    try {
        const response = await fetch("./data/music.json");
        tracks = (await response.json()).tracks || {};
    } catch (error) {
        console.warn("music.json konnte nicht geladen werden", error);
    }

    if (select) {
        select.innerHTML = "";
        const none = document.createElement("option");
        none.value = "";
        none.textContent = "– Titel wählen –";
        select.appendChild(none);
        Object.keys(tracks).forEach((key) => {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = key;
            select.appendChild(option);
        });
    }

    // Gewählten Titel für alle abspielen
    if (playButton && select) {
        playButton.addEventListener("click", () => {
            if (select.value) setMusic(select.value);
        });
    }

    // Lautstärke und Stummschaltung gelten nur für diesen Browser
    const savedVolume = Number(localStorage.getItem("musicVolume") ?? 50);
    audio.volume = savedVolume / 100;
    if (volumeSlider) {
        volumeSlider.value = savedVolume;
        volumeSlider.addEventListener("input", () => {
            audio.volume = volumeSlider.value / 100;
            localStorage.setItem("musicVolume", volumeSlider.value);
        });
    }
    if (muteButton) {
        muteButton.addEventListener("click", () => {
            audio.muted = !audio.muted;
            muteButton.textContent = audio.muted ? "🔇" : "🔊";
        });
    }

    loaded = true;
    if (pendingGame) updateMusic(pendingGame);

    // Falls Autoplay blockiert war: beim nächsten Klick starten
    document.addEventListener("click", () => {
        if (current && audio.paused) audio.play().catch(() => {});
    });
}
