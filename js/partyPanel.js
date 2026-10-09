import { isGM, getCharacterId } from "./role.js";
import { setCharacterState, setParty } from "./gameState.js";
import { getCharacters, getCharacter, stateOf, partyOf, isLowHP, portraitUrl } from "./characters.js";

const panel = document.getElementById("party-panel");
let lastGame = null;

export function renderParty(game) {
    lastGame = game;
    if (!panel) return;
    panel.innerHTML = "";

    const members = partyOf(game);
    members.forEach((id) => {
        const character = getCharacter(id);
        if (character) panel.appendChild(buildCard(character, game, members));
    });

    if (isGM()) panel.appendChild(buildAddMenu(members));
}

function canEdit(id) {
    return isGM() || getCharacterId() === id;
}

function buildCard(c, game, members) {
    const st = stateOf(game, c.id);
    const card = document.createElement("div");
    card.className = "char-card";

    // Kopfzeile: Bild, Name, Zahnrad
    const head = document.createElement("div");
    head.className = "char-head";

    const portrait = document.createElement("img");
    portrait.className = "char-portrait";
    portrait.src = portraitUrl(c);
    portrait.addEventListener("error", () => portrait.classList.add("missing"));
    head.appendChild(portrait);

    const name = document.createElement("strong");
    name.textContent = c.name;
    head.appendChild(name);

    if (canEdit(c.id)) {
        const gear = document.createElement("button");
        gear.className = "small-button";
        gear.textContent = "⚙";
        gear.title = "Werte bearbeiten";
        gear.addEventListener("click", () => openEditor(c));
        head.appendChild(gear);
    }
    if (isGM()) {
        const leave = document.createElement("button");
        leave.className = "small-button danger";
        leave.textContent = "✖";
        leave.title = "Aus der Party entfernen";
        leave.addEventListener("click", () =>
            setParty(members.filter((id) => id !== c.id))
        );
        head.appendChild(leave);
    }
    card.appendChild(head);

    // Balken: LP grün, bei <= 50 % gelb; GP blau
    card.appendChild(buildBar("LP", st.lp, st.maxLP, isLowHP(st) ? "low" : "lp"));
    card.appendChild(buildBar("GP", st.gp, st.maxGP, "gp"));

    // Fabula-Punkte nur für Spielercharaktere
    if (c.type === "pc") card.appendChild(buildFabula(c, st));

    return card;
}

function buildBar(label, value, max, kind) {
    const bar = document.createElement("div");
    bar.className = "bar";

    const fill = document.createElement("div");
    fill.className = `bar-fill ${kind}`;
    fill.style.width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
    bar.appendChild(fill);

    const text = document.createElement("span");
    text.className = "bar-text";
    text.textContent = `${label} ${value}/${max}`;
    bar.appendChild(text);
    return bar;
}

function buildFabula(c, st) {
    const row = document.createElement("div");
    row.className = "fabula-row";

    for (let i = 0; i < st.fabula; i++) {
        const star = document.createElement("button");
        star.className = "fabula-star";
        star.textContent = "★";
        star.title = "Fabula-Punkt ausgeben";
        star.addEventListener("click", () => {
            if (canEdit(c.id)) setCharacterState(c.id, { fabula: st.fabula - 1 });
        });
        row.appendChild(star);
    }
    if (st.fabula === 0) {
        const none = document.createElement("span");
        none.className = "fabula-none";
        none.textContent = "keine Fabula-Punkte";
        row.appendChild(none);
    }

    if (isGM()) {
        const add = document.createElement("button");
        add.className = "small-button good";
        add.textContent = "+";
        add.title = "Fabula-Punkt hinzufügen";
        add.addEventListener("click", () =>
            setCharacterState(c.id, { fabula: st.fabula + 1 })
        );
        row.appendChild(add);
    }
    return row;
}

// GM: weitere Charaktere in die Party aufnehmen
function buildAddMenu(members) {
    const wrap = document.createElement("div");
    wrap.className = "char-card add-card";

    const outside = getCharacters().filter((c) => !members.includes(c.id));
    if (outside.length === 0) {
        wrap.textContent = "Alle Charaktere sind in der Party.";
        return wrap;
    }

    const select = document.createElement("select");
    outside.forEach((c) => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = c.name;
        select.appendChild(option);
    });
    const button = document.createElement("button");
    button.textContent = "+ IN PARTY";
    button.addEventListener("click", () => setParty([...members, select.value]));

    wrap.appendChild(select);
    wrap.appendChild(button);
    return wrap;
}

// Pop-up zum Korrigieren der Werte
export function openEditor(c, game = lastGame) {
    const st = stateOf(game, c.id);
    const old = document.getElementById("char-editor");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "char-editor";
    overlay.innerHTML = `
        <div class="editor-box">
            <h3>${c.name}</h3>
            <label>LP aktuell <input id="ed-lp" type="number" min="0" value="${st.lp}"></label>
            <label>LP max <input id="ed-maxlp" type="number" min="1" value="${st.maxLP}"></label>
            <label>GP aktuell <input id="ed-gp" type="number" min="0" value="${st.gp}"></label>
            <label>GP max <input id="ed-maxgp" type="number" min="1" value="${st.maxGP}"></label>
            <div>
                <button id="ed-save">SPEICHERN</button>
                <button id="ed-cancel">ABBRECHEN</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector("#ed-cancel").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#ed-save").addEventListener("click", () => {
        const num = (id, fallback) => {
            const n = parseInt(overlay.querySelector(id).value, 10);
            return Number.isNaN(n) ? fallback : n;
        };
        const maxLP = Math.max(1, num("#ed-maxlp", st.maxLP));
        const maxGP = Math.max(1, num("#ed-maxgp", st.maxGP));
        setCharacterState(c.id, {
            maxLP,
            maxGP,
            lp: Math.max(0, Math.min(maxLP, num("#ed-lp", st.lp))),
            gp: Math.max(0, Math.min(maxGP, num("#ed-gp", st.gp)))
        });
        overlay.remove();
    });
}
