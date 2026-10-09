import { textures } from "./assets.js";
import { getCharacterId, isGM } from "./role.js";
import { getCharacter, stateOf, partyOf, isLowHP, portraitUrl } from "./characters.js";
import { setCharacterState, spendFabula, triggerEffect } from "./gameState.js";
import { openEditor } from "./charEditor.js";

const main = document.getElementById("pl-main");
const companions = document.getElementById("pl-companions");

let current = null;      // letzter Spielstand
let own = null;          // Verweise auf die Elemente der eigenen Box

function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
}

function tex(file, className) {
    const img = el("img", className);
    img.src = `${textures}/${file}`;
    img.alt = "";
    return img;
}

function portraitImg(c) {
    const img = el("img");
    img.src = portraitUrl(c);
    img.dataset.char = c.id;                 // für das Aufleuchten
    img.addEventListener("error", () => { img.style.visibility = "hidden"; });
    return img;
}

function iconButton(file, title, className = "") {
    const b = el("button", `icon-btn ${className}`);
    b.title = title;
    b.appendChild(tex(file));
    return b;
}

// LP oder GP: Beschriftung 64 x 64, Leiste, darunter Eingabefeld mit + und -
function buildStat(label, kind, top, charId, field, maxField) {
    const labelBox = el("div", "pl-abs tex tex-1-1 pl-label", label);
    labelBox.style.cssText = `left:8px; top:${top}px;`;

    const bar = el("div", "pl-abs pl-bar");
    bar.style.cssText = `left:72px; top:${top}px;`;
    const fill = el("div", `pl-fill ${kind}`);
    const text = el("span", "pl-bar-text");
    bar.append(fill, text);

    const row = el("div", "pl-abs pl-inputrow");
    row.style.cssText = `left:72px; top:${top + 72}px;`;
    const input = el("input");
    input.type = "number";
    input.min = "0";
    const plus = el("button", "pl-step", "+");
    const minus = el("button", "pl-step", "−");
    row.append(input, plus, minus);

    const change = (sign) => {
        const n = parseInt(input.value, 10);
        if (Number.isNaN(n) || n <= 0) return;
        const st = stateOf(current, charId);
        const value = Math.max(0, Math.min(st[maxField], st[field] + sign * n));
        setCharacterState(charId, { [field]: value });
        input.value = "";
    };
    plus.addEventListener("click", () => change(+1));
    minus.addEventListener("click", () => change(-1));
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") change(+1);
    });

    return { nodes: [labelBox, bar, row], fill, text };
}

// ---------- Eigene Charakter-Box (448 x 608 px), einmal aufgebaut ----------

function buildOwnBox(c) {
    main.innerHTML = "";
    const box = el("div", "pl-box tex tex-char");

    const place = (node, css) => { node.style.cssText += css; box.appendChild(node); return node; };

    // Kopfzeile: Name und Stift (64 px)
    place(el("div", "pl-abs pl-name", c.name), "left:8px; top:0;");
    const pencil = place(iconButton("pencil.png", "Maximalwerte anpassen", "pl-abs"), "left:384px; top:0;");
    pencil.addEventListener("click", () => openEditor(c, current));

    // Portrait 256 x 256, 8 px unter der Kopfzeile und 8 px eingerückt
    const portrait = place(el("div", "pl-abs pl-portrait"), "left:8px; top:72px;");
    portrait.appendChild(portraitImg(c));

    // Zugkarten (Höhe 96 px): GO = Ass, verbraucht = Rückseite
    const card1 = place(el("button", "pl-abs pl-card"), "left:296px; top:72px; z-index:1;");
    const card1img = tex("ace_of_hearts.png");
    card1.appendChild(card1img);
    const card2 = place(el("button", "pl-abs pl-card"), "left:328px; top:104px; z-index:2;");
    const card2img = tex("ace_of_hearts.png");
    card2.appendChild(card2img);

    // Inventarpunkte: Rucksack (Klick = ein Punkt weniger) und aktueller Stand
    const ipIcon = place(iconButton("backpack.png", "Inventarpunkt ausgeben", "pl-abs"), "left:296px; top:264px;");
    const ipNum = place(el("div", "pl-abs tex tex-1-1 pl-number"), "left:360px; top:264px;");
    ipIcon.addEventListener("click", () => {
        const st = stateOf(current, c.id);
        if (st.ip > 0) setCharacterState(c.id, { ip: st.ip - 1 });
    });

    // LP und GP
    const lp = buildStat("LP", "lp", 336, c.id, "lp", "maxLP");
    const gp = buildStat("GP", "gp", 440, c.id, "gp", "maxGP");
    [...lp.nodes, ...gp.nodes].forEach((n) => box.appendChild(n));

    // Animationen und Fabula (544 bis 608)
    const attack = place(iconButton("attack.png", "Angriff", "pl-abs"), "left:8px; top:544px;");
    const magic = place(iconButton("magic.png", "Zauber", "pl-abs"), "left:80px; top:544px;");
    const heal = place(iconButton("heal.png", "Heilung", "pl-abs"), "left:152px; top:544px;");
    [[attack, "attack"], [magic, "spell"], [heal, "heal"]].forEach(([button, kind]) => {
        button.addEventListener("click", () => {
            if (current?.conflict?.active) triggerEffect(c.id, kind);
        });
    });

    const fabula = place(iconButton("fabula.png", "Fabula-Punkt ausgeben", "pl-abs"), "left:304px; top:544px;");
    const fabulaNum = place(el("div", "pl-abs tex tex-1-1 pl-number"), "left:376px; top:544px;");
    fabula.addEventListener("click", () => {
        const st = stateOf(current, c.id);
        if (st.fabula > 0) spendFabula(c.id, st.fabula - 1);
    });

    // Zug nehmen: nur ein Ass-Button im aktiven Konflikt
    [[card1, 0], [card2, 1]].forEach(([button, index]) => {
        button.addEventListener("click", () => {
            const st = stateOf(current, c.id);
            const used = Math.max(0, st.turns - st.turnsLeft);
            if (current?.conflict?.active && st.turnsLeft > 0 && index >= used) {
                setCharacterState(c.id, { turnsLeft: st.turnsLeft - 1 });
            }
        });
    });

    main.appendChild(box);
    own = { id: c.id, lp, gp, ipNum, fabula, fabulaNum, attack, magic, heal, card1, card1img, card2, card2img };
}

// ---------- Aktualisierung (bei jedem Snapshot) ----------

function setBar(stat, value, max, color) {
    stat.fill.style.width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
    stat.fill.className = `pl-fill ${color}`;
    stat.text.textContent = `${value} / ${max}`;
}

function updateOwnBox(game) {
    const st = stateOf(game, own.id);
    const conflict = !!(game.conflict && game.conflict.active);

    setBar(own.lp, st.lp, st.maxLP, isLowHP(st) ? "red" : "green");
    setBar(own.gp, st.gp, st.maxGP, "blue");
    own.ipNum.textContent = st.ip;
    own.fabulaNum.textContent = st.fabula;
    own.fabula.disabled = st.fabula <= 0;

    // Konfliktbezogene Schaltflächen nur in aktiven Konflikten
    [own.attack, own.magic, own.heal].forEach((b) => { b.disabled = !conflict; });

    // Zugkarten: bei zwei Zügen erscheint die zweite Karte (32 px versetzt, darüber)
    const used = Math.max(0, st.turns - st.turnsLeft);
    own.card1img.src = `${textures}/${used > 0 ? "cards_backside" : "ace_of_hearts"}.png`;
    own.card2.classList.toggle("hidden", st.turns < 2);
    own.card2img.src = `${textures}/${used > 1 ? "cards_backside" : "ace_of_hearts"}.png`;
    own.card1.disabled = !conflict;
    own.card2.disabled = !conflict;
}

// Begleiter-Boxen: 150 / 148 / 150 px breit, grün über 50 % LP, sonst rot
function updateCompanions(game) {
    companions.innerHTML = "";
    const members = partyOf(game).filter((id) => id !== own.id).slice(0, 3);

    for (let i = 0; i < 3; i++) {
        const c = getCharacter(members[i]);
        const box = el("div", "pl-comp tex tex-companion");
        if (i === 1) box.classList.add("trim");           // mittlere: 1 px Rand links und rechts abgeschnitten
        if (!c) {
            box.classList.add("empty");
            companions.appendChild(box);
            continue;
        }
        const st = stateOf(game, c.id);
        box.classList.add(isLowHP(st) ? "red" : "green");

        box.appendChild(el("div", "pl-comp-name", c.name));
        const portrait = el("div", `pl-comp-portrait${st.turnsLeft <= 0 ? " gray" : ""}`);
        portrait.appendChild(portraitImg(c));
        box.appendChild(portrait);
        companions.appendChild(box);
    }
}

export function renderPlayerPanel(game) {
    if (!main || isGM() || !game) return;
    current = game;

    const c = getCharacter(getCharacterId());
    if (!c) return;                            // Charaktere noch nicht geladen

    if (!own || own.id !== c.id) buildOwnBox(c);
    updateOwnBox(game);
    updateCompanions(game);
}
