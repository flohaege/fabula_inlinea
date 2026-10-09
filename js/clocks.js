import { setClocks } from "./gameState.js";
import { isGM } from "./role.js";

const clocksContainer = document.getElementById("clocks-container");

const SVG_NS = "http://www.w3.org/2000/svg";
const FILLED_COLOR = "#f2b705";   // goldgelb
const EMPTY_COLOR = "#666";       // grau


// ---------- Darstellung ----------

// Ein Tortenstück von Segment i bei n Segmenten (Mittelpunkt 50/50, Radius 46)
function wedgePath(i, n) {
    const point = (index) => {
        const angle = ((-90 + (index * 360) / n) * Math.PI) / 180;
        return [50 + 46 * Math.cos(angle), 50 + 46 * Math.sin(angle)];
    };
    const [x0, y0] = point(i);
    const [x1, y1] = point(i + 1);
    return `M50 50 L${x0.toFixed(2)} ${y0.toFixed(2)} A46 46 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

// Position der Uhr im Array (per ID, bei alten Uhren ohne ID per Index)
function locate(clocks, clock, fallbackIndex) {
    return clock.id ? clocks.findIndex((c) => c.id === clock.id) : fallbackIndex;
}

export function renderClocks(clocks) {
    clocksContainer.innerHTML = "";
    if (!clocks || clocks.length === 0) return;

    clocks.forEach((clock, index) => {
        const element = document.createElement("div");
        element.className = "clock";

        // Titel (GM: Doppelklick zum Umbenennen)
        const title = document.createElement("div");
        title.className = "clock-title";
        title.textContent = clock.title;
        title.addEventListener("dblclick", () => {
            if (isGM()) editTitle(title, clocks, clock, index);
        });
        element.appendChild(title);

        // Löschen (nur GM sichtbar, siehe CSS .gm-only)
        const remove = document.createElement("button");
        remove.className = "clock-remove gm-only";
        remove.textContent = "✖";
        remove.title = "Uhr löschen";
        remove.addEventListener("click", () => {
            const i = locate(clocks, clock, index);
            if (i >= 0) setClocks(clocks.filter((_, j) => j !== i));
        });
        element.appendChild(remove);

        // Runde Uhr aus Segmenten
        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.setAttribute("class", "clock-face");

        for (let k = 0; k < clock.segments; k++) {
            const wedge = document.createElementNS(SVG_NS, "path");
            wedge.setAttribute("d", wedgePath(k, clock.segments));
            wedge.setAttribute("fill", k < clock.filled ? FILLED_COLOR : EMPTY_COLOR);
            wedge.setAttribute("stroke", "#111");
            wedge.setAttribute("stroke-width", "2");
            wedge.setAttribute("class", "clock-wedge");

            wedge.addEventListener("click", () => {
                const i = locate(clocks, clock, index);
                if (i < 0) return;
                // gefülltes Segment anklicken = ab hier leeren, leeres = bis hier füllen
                const newFilled = k < clock.filled ? k : k + 1;
                setClocks(clocks.map((c, j) => (j === i ? { ...c, filled: newFilled } : c)));
            });
            svg.appendChild(wedge);
        }
        element.appendChild(svg);

        clocksContainer.appendChild(element);
    });
}

function editTitle(titleElement, clocks, clock, index) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "clock-title-edit";
    input.value = clock.title;
    input.maxLength = 40;
    titleElement.replaceWith(input);
    input.focus();
    input.select();

    let done = false;
    const finish = (save) => {
        if (done) return;
        done = true;
        const newTitle = input.value.trim();
        const i = locate(clocks, clock, index);
        if (save && newTitle && newTitle !== clock.title && i >= 0) {
            setClocks(clocks.map((c, j) => (j === i ? { ...c, title: newTitle } : c)));
        } else {
            input.replaceWith(titleElement);
        }
    };
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") finish(true);
        if (event.key === "Escape") finish(false);
    });
    input.addEventListener("blur", () => finish(true));
}


// ---------- Erstellen (Uhren-Panel in der GM-Schaltfläche) ----------

export function initializeClockControls(onAddClock) {
    const createButton = document.getElementById("clock-create-button");
    const titleField = document.getElementById("clock-title-field");
    const sizeSelect = document.getElementById("clock-size-select");
    if (!createButton || !titleField || !sizeSelect) return;

    const create = () => {
        const title = titleField.value.trim();
        if (!title) {
            titleField.focus();
            return;
        }
        onAddClock({
            id: crypto.randomUUID(),
            title,
            segments: Number(sizeSelect.value),
            filled: 0
        });
        titleField.value = "";
    };

    createButton.addEventListener("click", create);
    titleField.addEventListener("keydown", (event) => {
        if (event.key === "Enter") create();
    });
}
