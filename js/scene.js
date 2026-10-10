import { images, sprites } from "./assets.js";
import { SPRITE_SIZES, MAX_PER_SIDE, RANK_TURNS, TILE_SIZE, MAP_AREA, START_POSITIONS } from "./config.js";
import { isGM, getCharacterId } from "./role.js";
import { setActors, setConflict } from "./gameState.js";
import { getCharacters, getCharacter, stateOf, isLowHP, idleUrl } from "./characters.js";

const gameView = document.getElementById("game-view");

let scene = null;
let bg = null;
let selectedId = null;   // nur lokal beim GM
let lastGame = null;

// ---------- Aufbau ----------

// Die Szene ist ein "Dummy": immer 1440 x 900 px (schwarz). Hintergrundbild, Sprites und
// Effekte werden an ihm ausgerichtet; die Größe des Hintergrundbildes spielt keine Rolle.
// (Das Verkleinern des Browserfensters übernimmt die Bühnenskalierung, siehe stage.js.)
export function buildScene(scenario) {
    gameView.innerHTML = "";
    selectedId = null;

    scene = document.createElement("div");
    scene.className = "scene";
    scene.style.width = `${MAP_AREA.width}px`;
    scene.style.height = `${MAP_AREA.height}px`;

    // Bild wird eingepasst (nie zugeschnitten), kleine Bilder per nearest neighbor hochskaliert
    bg = document.createElement("img");
    bg.className = "scenario-background";
    bg.src = `${images}/${scenario.background}`;

    // Verschieben nur mit Shift+Klick oder Doppelklick auf freie Fläche
    scene.addEventListener("click", (event) => {
        if (event.shiftKey) moveSelected(event);
    });
    scene.addEventListener("dblclick", (event) => {
        if (!event.target.closest(".actor")) moveSelected(event);
    });
    scene.appendChild(bg);
    gameView.appendChild(scene);
}

// Der GM bewegt alle, ein Spieler nur den eigenen Avatar
function canControl(actor) {
    return isGM() || (!!actor.charId && actor.charId === getCharacterId());
}

// ---------- Darstellung ----------

export function renderActors(game) {
    lastGame = game;
    if (!scene || !game) return;

    scene.querySelectorAll(".actor, .round-label").forEach((el) => el.remove());

    // Weiter oben stehende Sprites zuerst, damit untere davor liegen
    const unit = TILE_SIZE;
    (game.actors || []).slice().sort((a, b) => b.gy - a.gy).forEach((actor) => {
        const sizeKey = actor.rank || "player";
        const size = SPRITE_SIZES[sizeKey] || 64;   // feste Größe im Dummy

        const el = document.createElement("div");
        el.className = "actor";
        if (actor.id === selectedId) el.classList.add("selected");
        // Ursprung: unten links. Monster werden von rechts gemessen (gespiegelt).
        if (actor.fromRight) {
            el.style.right = `${actor.gx * unit}px`;
        } else {
            el.style.left = `${actor.gx * unit}px`;
        }
        el.style.bottom = `${actor.gy * unit}px`;
        el.style.cursor = canControl(actor) ? "pointer" : "default";
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;

        // Platzhalter, wird von einem echten Sprite überdeckt, falls vorhanden
        const body = document.createElement("div");
        body.className = `actor-body ${actor.type}`;

        // Verknüpfter Spielercharakter (Sprite, LP-Warnung, Aufleuchten)?
        const char = actor.charId
            ? getCharacter(actor.charId)
            : (actor.type === "player"
                ? getCharacters().find((c) => c.type === "pc" && c.name.toLowerCase() === actor.name.toLowerCase())
                : null);
        // NPCs/Monster: Bild in sprites/NPCs oder sprites/Monster, nach Name
        const candidates = char ? [idleUrl(char)] : spriteCandidates(actor.spriteFile || actor.name);
        if (char) el.dataset.char = char.id;
        if (char && isLowHP(stateOf(game, char.id))) {
            body.classList.add("low-hp");
            body.style.setProperty("--sprite", `url("${candidates[0]}")`);
        }

        const img = document.createElement("img");
        let attempt = 0;
        img.src = candidates[0];
        img.addEventListener("error", () => {
            attempt++;
            if (attempt < candidates.length) img.src = candidates[attempt];
            else img.remove();
        });
        body.appendChild(img);
        el.appendChild(body);

        const label = document.createElement("div");
        label.className = "actor-name";
        label.textContent = actor.name;
        el.appendChild(label);

        const remove = document.createElement("button");
        remove.className = "actor-remove";
        remove.textContent = "✖";
        remove.addEventListener("click", (event) => {
            event.stopPropagation();
            selectedId = null;
            setActors(game.actors.filter((a) => a.id !== actor.id));
        });
        el.appendChild(remove);

        // NPCs/Monster: auf die andere Seite wechseln (Doppelpfeil)
        if (!char) {
            const flip = document.createElement("button");
            flip.className = "actor-flip";
            flip.textContent = "⇄";
            flip.title = "Auf die andere Seite setzen";
            flip.addEventListener("click", (event) => {
                event.stopPropagation();
                flipActor(actor);
            });
            el.appendChild(flip);
        }

        el.addEventListener("click", (event) => {
            event.stopPropagation();
            if (!canControl(actor)) return;
            selectedId = selectedId === actor.id ? null : actor.id;
            renderActors(lastGame);
        });

        // Spielercharaktere haben GO/WAIT in ihrer Schaltfläche, keine Kreise
        if (game.conflict && game.conflict.active && !char) {
            el.appendChild(buildTurns(actor));
        }

        scene.appendChild(el);
    });

    if (game.conflict && game.conflict.active) {
        const round = document.createElement("div");
        round.className = "round-label";
        round.textContent = `Konflikt – Runde ${game.conflict.round}`;
        scene.appendChild(round);
    }
}

// ---------- Zug-Kreise ----------

function updateActor(id, patch) {
    setActors(lastGame.actors.map((a) => (a.id === id ? { ...a, ...patch } : a)));
}

// Kreise oben links im Sprite. Gefüllt = Zug verfügbar, grau = Zug verbraucht.
function buildTurns(actor) {
    const base = actor.turns || 1;
    const total = base + (actor.extra || 0);
    const used = Math.min(actor.used || 0, total);
    const gm = isGM();
    // Spieler dürfen nur Spielerkreise leeren; Monsterkreise nur der GM
    const mayUse = gm;   // Kreise gehören NPCs/Monstern, nur der GM bedient sie

    const wrap = document.createElement("div");
    wrap.className = "turns";

    for (let i = 0; i < total; i++) {
        const dot = document.createElement("button");
        dot.className = "turn-dot";
        if (i < used) dot.classList.add("spent");
        if (i >= base) dot.classList.add("extra");

        dot.addEventListener("click", (event) => {
            event.stopPropagation();
            if (i >= used) {
                if (mayUse) updateActor(actor.id, { used: used + 1 });   // verbrauchen
            } else if (gm) {
                updateActor(actor.id, { used: used - 1 });               // zurückgeben
            }
        });
        wrap.appendChild(dot);
    }

    if (gm) {
        const plus = document.createElement("button");
        plus.className = "turn-extra-button";
        plus.textContent = "+";
        plus.title = "Extra-Zug hinzufügen";
        plus.addEventListener("click", (event) => {
            event.stopPropagation();
            updateActor(actor.id, { extra: (actor.extra || 0) + 1 });
        });
        wrap.appendChild(plus);

        if ((actor.extra || 0) > 0) {
            const minus = document.createElement("button");
            minus.className = "turn-extra-button turn-extra-remove";
            minus.textContent = "✖";
            minus.title = "Extra-Zug entfernen";
            minus.addEventListener("click", (event) => {
                event.stopPropagation();
                updateActor(actor.id, {
                    extra: actor.extra - 1,
                    used: Math.min(used, total - 1)
                });
            });
            wrap.appendChild(minus);
        }
    }

    return wrap;
}

// GM (alle) bzw. Spieler (eigener Avatar): Shift+Klick bzw. Doppelklick auf freie Fläche setzt den gewählten Sprite dorthin (Mitte = Klickpunkt)
function moveSelected(event) {
    if (!selectedId || !lastGame) return;

    const actor = (lastGame.actors || []).find((a) => a.id === selectedId);
    if (!actor || !canControl(actor)) return;

    // rect ist nach der Bühnen-Skalierung gemessen, daher Faktor Bildschirm -> Dummy
    const rect = scene.getBoundingClientRect();
    const k = rect.width / MAP_AREA.width;
    const px = (event.clientX - rect.left) / k;    // Dummy-Pixel von links
    const py = (rect.bottom - event.clientY) / k;  // Dummy-Pixel von unten
    const size = SPRITE_SIZES[actor.rank || "player"];

    const gx = Math.max(0, (px - size / 2) / TILE_SIZE);
    const gy = Math.max(0, (py - size / 2) / TILE_SIZE);

    setActors(
        lastGame.actors.map((a) =>
            a.id === selectedId ? { ...a, gx, gy, fromRight: false } : a
        )
    );
}

// ---------- Akteure erzeugen ----------

// Standardposition: Pixel im 1440 x 900 Dummy, die Werte stehen in config.js (START_POSITIONS).
// Spieler/Helfer zählen von links, Gegner gespiegelt von rechts (gemessen wird die untere Ecke).
// Soldat/Spieler: n-ter Platz der Seite. Elite/Champion: feste Plätze, je nachdem ob schon
// ein Soldat oder Elite auf der Seite steht.

// opts: { rank, turns, charId, spriteFile }
function makeActor(actors, type, name, opts = {}) {
    const sameSide = actors.filter((a) => a.type === type);
    if (sameSide.length >= MAX_PER_SIDE) return null;

    const rank = opts.rank || null;
    const P = START_POSITIONS;
    const isSmall = (a) => !a.rank || a.rank === "soldier";

    let position;
    if (rank === "elite") {
        const taken = sameSide.some((a) => isSmall(a) || a.rank === "elite");
        position = taken ? P.elite.other : P.elite.first;
    } else if (rank === "champion") {
        const taken = sameSide.some((a) => isSmall(a) || a.rank === "elite" || a.rank === "champion");
        position = taken ? P.champion.other : P.champion.first;
    } else {
        const list = type === "player" ? P.player : P.soldier;
        const index = Math.min(sameSide.filter(isSmall).length, list.length - 1);
        position = list[index];
    }
    const [x, y] = position;

    return [
        ...actors,
        {
            id: crypto.randomUUID(),
            type,                                   // "player" = linke Seite, "monster" = rechte
            name,
            charId: opts.charId || null,
            spriteFile: opts.spriteFile || null,
            rank,
            turns: opts.turns ?? (rank ? RANK_TURNS[rank] : 1),
            gx: x / TILE_SIZE,                      // gespeichert in Feldern zu 64 px
            gy: y / TILE_SIZE,
            fromRight: type === "monster"
        }
    ];
}

// Mögliche Bilddateien für einen NPC/ein Monster, in dieser Reihenfolge
function spriteCandidates(file) {
    const base = file.replace(/\.png$/i, "");
    const lower = base.toLowerCase();
    return [...new Set([
        `${sprites}/NPCs/${base}.png`,
        `${sprites}/Monster/${base}.png`,
        `${sprites}/NPCs/${lower}.png`,
        `${sprites}/Monster/${lower}.png`
    ])];
}

// Für fest eingeplante Akteure aus scenarios.json
export function buildDefaultActors(definitions = []) {
    let actors = [];
    definitions.forEach((d) => {
        actors = makeActor(actors, d.type, d.name, { rank: d.rank, turns: d.turns }) || actors;
    });
    return actors;
}

function flipActor(actor) {
    const others = lastGame.actors.filter((a) => a.id !== actor.id);
    const newType = actor.type === "player" ? "monster" : "player";
    const updated = makeActor(others, newType, actor.name, { rank: actor.rank, turns: actor.turns });
    if (!updated) {
        alert(`Maximal ${MAX_PER_SIDE} pro Seite.`);
        return;
    }
    selectedId = null;
    setActors(updated);
}

// ---------- GM-Schaltflächen ----------

// Klassen für +Helfer / +Gegner (Champion+ hat 4 Züge)
const CLASSES = {
    soldier:       { rank: "soldier",  turns: 1 },
    elite:         { rank: "elite",    turns: 2 },
    champion:      { rank: "champion", turns: 3 },
    champion_plus: { rank: "champion", turns: 4 }
};

export function initializeSceneControls() {
    const conflictButton = document.getElementById("conflict-button");
    const helperButton = document.getElementById("helper-button");
    const enemyButton = document.getElementById("enemy-button");
    if (!conflictButton || !helperButton || !enemyButton) {
        console.warn("GM-Schaltflächen fehlen in index.html");
        return;
    }

    // Konflikt starten bzw. beenden (setzt Züge und GO/WAIT zurück)
    conflictButton.addEventListener("click", () => {
        if (!inScene()) return;
        const active = lastGame.conflict && lastGame.conflict.active;
        const reset = (lastGame.actors || []).map((a) => ({ ...a, used: 0 }));
        setConflict({ active: !active, round: active ? 0 : 1 }, reset, resetTurns(lastGame));
    });

    // Sanduhr: neue Runde (Kreise wieder füllen, alle Spielercharaktere auf GO)
    const roundButton = document.getElementById("new-round-button");
    if (roundButton) {
        roundButton.addEventListener("click", () => startNextRound(lastGame));
    }

    helperButton.addEventListener("click", () => addNamed("player"));   // links
    enemyButton.addEventListener("click", () => addNamed("monster"));   // rechts
}

// Spielstand merken, auch in der Overworld (für inScene())
export function trackGame(game) {
    lastGame = game;
}

// Neue Runde: jeder Spielercharakter bekommt seine Züge pro Runde zurück (1, mit + im GM-Panel 2)
function resetTurns(game) {
    const patch = {};
    getCharacters().filter((c) => c.type === "pc").forEach((c) => {
        patch[c.id] = { turnsLeft: stateOf(game, c.id).turns };
    });
    return patch;
}

function inScene() {
    return lastGame &&
        lastGame.currentView !== "overworld" &&
        lastGame.currentScenario &&
        lastGame.currentScenario !== "none";
}

// Name + Klasse aus der GM-Schaltfläche: NPC oder Monster hinzufügen
function addNamed(type) {
    if (!inScene()) return;

    const nameInput = document.getElementById("actor-name-input");
    const classSelect = document.getElementById("actor-class-select");
    const name = nameInput.value.trim();
    if (!name) {
        nameInput.focus();
        return;
    }

    const spriteInput = document.getElementById("actor-sprite-input");
    const cls = CLASSES[classSelect.value] || CLASSES.soldier;
    const updated = makeActor(lastGame.actors || [], type, name, {
        ...cls,
        spriteFile: spriteInput.value.trim() || null   // leer = Bild heißt wie der Name
    });
    if (!updated) {
        alert(`Maximal ${MAX_PER_SIDE} pro Seite.`);
        return;
    }
    setActors(updated);
    nameInput.value = "";
    spriteInput.value = "";
}

// Klick auf das Portrait im Statusblock: Spielercharakter in die Szene setzen
export function addCharacterToScene(charId) {
    if (!inScene()) return;
    const c = getCharacter(charId);
    const actors = lastGame.actors || [];
    if (!c || actors.some((a) => a.charId === charId)) return;

    const updated = makeActor(actors, "player", c.name, { charId });
    if (!updated) {
        alert(`Maximal ${MAX_PER_SIDE} pro Seite.`);
        return;
    }
    setActors(updated);
}


// ---------- Runden ----------

// Neue Runde: alle Kreise gefüllt, alle Spielercharaktere wieder auf GO
function startNextRound(game) {
    if (!game || !game.conflict || !game.conflict.active) return;
    const reset = (game.actors || []).map((a) => ({ ...a, used: 0 }));
    setConflict({ active: true, round: game.conflict.round + 1 }, reset, resetTurns(game));
}
