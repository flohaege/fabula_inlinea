import { isGM } from "./role.js";
import { textures } from "./assets.js";
import { getCharacter, stateOf, partyOf, isLowHP, portraitUrl } from "./characters.js";
import { setCharacterState } from "./gameState.js";
import { openEditor } from "./charEditor.js";
import { addCharacterToScene } from "./scene.js";

const conflictButton = document.getElementById("conflict-button");
const roundButton = document.getElementById("new-round-button");
const helperButton = document.getElementById("helper-button");
const enemyButton = document.getElementById("enemy-button");
const rows = [
    document.getElementById("gm-status-1"),
    document.getElementById("gm-status-2")
];

let current = null;
let blocks = [];            // Verweise auf die Elemente je Statusbox
let builtKey = "";

function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
}

function icon(file, className) {
    const img = el("img", className);
    img.src = `${textures}/${file}`;
    img.alt = "";
    return img;
}

function conflictActive() {
    return !!(current && current.conflict && current.conflict.active);
}

// ---------- Statusbox (224 x 256 px) ----------
// oben: Name + Stift (64 px) / Mitte: Portrait + LP/GP (128 px) / unten: Fabula + Zugkarten (64 px)

function buildBlock(c) {
    const root = el("div", "gm-box tex tex-status");

    root.appendChild(el("div", "gm-box-name", c.name));

    const pencil = el("button", "gm-box-pencil");
    pencil.title = "Maximale LP und GP anpassen";
    pencil.appendChild(icon("pencil.png"));
    pencil.addEventListener("click", () => openEditor(c, current));
    root.appendChild(pencil);

    const portrait = el("div", "gm-box-portrait");
    portrait.title = "In die Szene setzen";
    const img = el("img");
    img.src = portraitUrl(c);
    img.dataset.char = c.id;                       // für das Aufleuchten
    img.addEventListener("error", () => { img.style.visibility = "hidden"; });
    portrait.appendChild(img);
    portrait.addEventListener("click", () => addCharacterToScene(c.id));
    root.appendChild(portrait);

    const stats = el("div", "gm-box-stats");
    const lp = el("div", "gm-stat");
    const gp = el("div", "gm-stat");
    const ip = el("div", "gm-stat");
    stats.append(lp, gp, ip);
    root.appendChild(stats);

    // Fabula-Punkte (32 x 32 Symbol, 32 x 32 Zahlenfeld)
    const foot = el("div", "gm-box-foot");
    foot.appendChild(icon("fabula.png", "gm-fabula-icon"));
    const input = el("input", "gm-fabula-input");
    input.type = "number";
    input.min = "0";
    input.title = "Fabula-Punkte (direkt überschreibbar)";
    input.addEventListener("change", () => {
        const n = parseInt(input.value, 10);
        if (!Number.isNaN(n)) setCharacterState(c.id, { fabula: Math.max(0, n) });
    });
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") input.blur();
    });
    foot.appendChild(input);

    // Zugkarten: Ass = Zug verfügbar (GO), Rückseite = Zug verbraucht
    const card1 = el("button", "gm-card");
    const card1img = icon("ace_of_hearts.png");
    card1.appendChild(card1img);
    const card2 = el("button", "gm-card");           // zweite Karte ODER Plus
    const card2img = icon("ace_of_hearts.png");
    const plus = el("span", "gm-plus", "+");
    card2.append(card2img, plus);
    foot.append(card1, card2);
    root.appendChild(foot);

    // Klick auf eine Karte: Zug verbrauchen bzw. zurückgeben (nur im Konflikt)
    const toggle = (index) => {
        if (!conflictActive()) return;
        const st = stateOf(current, c.id);
        const used = Math.max(0, st.turns - st.turnsLeft);
        const showsAce = index >= used;
        setCharacterState(c.id, {
            turnsLeft: Math.max(0, Math.min(st.turns, st.turnsLeft + (showsAce ? -1 : 1)))
        });
    };
    card1.addEventListener("click", () => toggle(0));
    card2.addEventListener("click", (event) => {
        const st = stateOf(current, c.id);
        if (st.turns < 2) {
            // Plus: zweiten Zug pro Runde geben (maximal 2)
            setCharacterState(c.id, { turns: 2, turnsLeft: st.turnsLeft + 1 });
        } else if (event.shiftKey) {
            // Shift+Klick auf die zweite Karte: wieder entfernen, Plus kommt zurück
            setCharacterState(c.id, { turns: 1, turnsLeft: Math.min(st.turnsLeft, 1) });
        } else {
            toggle(1);
        }
    });

    return { root, id: c.id, lp, gp, ip, input, portrait, card1, card1img, card2, card2img, plus };
}

// Statusboxen neu aufbauen, wenn sich die Party ändert
function ensureBlocks(game) {
    const ids = partyOf(game).slice(0, 4);
    const key = ids.join(",");
    if (key === builtKey) return;
    builtKey = key;

    rows.forEach((row) => { row.innerHTML = ""; });
    blocks = ids.map((id) => buildBlock(getCharacter(id)));
    blocks.forEach((b, i) => rows[Math.floor(i / 2)].appendChild(b.root));
}

export function renderGmPanel(game) {
    if (!isGM() || !game) return;
    current = game;

    const inScenario = game.currentView !== "overworld" &&
        !!game.currentScenario && game.currentScenario !== "none";
    const conflict = !!(game.conflict && game.conflict.active);

    // Konflikt-Button: grün = startbar, rot = läuft, in der Overworld nicht nutzbar
    conflictButton.disabled = !inScenario;
    conflictButton.classList.toggle("green", !conflict);
    conflictButton.classList.toggle("red", conflict);
    roundButton.disabled = !(inScenario && conflict);

    // In der Overworld nicht nutzbar
    helperButton.disabled = !inScenario;
    enemyButton.disabled = !inScenario;

    ensureBlocks(game);
    const actors = game.actors || [];
    blocks.forEach((b) => {
        const st = stateOf(game, b.id);
        b.lp.textContent = `LP ${st.lp}/${st.maxLP}`;
        b.lp.classList.toggle("low", isLowHP(st));
        b.gp.textContent = `GP ${st.gp}/${st.maxGP}`;
        b.ip.textContent = `IP ${st.ip}/${st.maxIP}`;
        if (document.activeElement !== b.input) b.input.value = st.fabula;
        b.portrait.classList.toggle("in-scene", actors.some((a) => a.charId === b.id));
        b.portrait.classList.toggle("disabled", !inScenario);

        // Zugkarten: die ersten (Züge - übrig) Karten zeigen die Rückseite
        const used = Math.max(0, st.turns - st.turnsLeft);
        b.card1img.src = `${textures}/${used > 0 ? "cards_backside" : "ace_of_hearts"}.png`;
        const second = st.turns >= 2;
        b.card2img.classList.toggle("hidden", !second);
        b.plus.classList.toggle("hidden", second);
        if (second) {
            b.card2img.src = `${textures}/${used > 1 ? "cards_backside" : "ace_of_hearts"}.png`;
        }
        b.card1.disabled = !conflict;
        b.card2.disabled = second && !conflict;      // das Plus geht jederzeit
    });
}
