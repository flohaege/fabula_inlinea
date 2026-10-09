import { setCharacterState } from "./gameState.js";
import { stateOf } from "./characters.js";

// Pop-up zum Korrigieren der Werte (aktuell und maximal): LP, GP, IP
export function openEditor(c, game) {
    const st = stateOf(game, c.id);
    const old = document.getElementById("char-editor");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "char-editor";
    overlay.innerHTML = `
        <div class="editor-box">
            <h3></h3>
            <label>LP aktuell <input id="ed-lp" type="number" min="0" value="${st.lp}"></label>
            <label>LP max <input id="ed-maxlp" type="number" min="1" value="${st.maxLP}"></label>
            <label>GP aktuell <input id="ed-gp" type="number" min="0" value="${st.gp}"></label>
            <label>GP max <input id="ed-maxgp" type="number" min="1" value="${st.maxGP}"></label>
            <label>IP aktuell <input id="ed-ip" type="number" min="0" value="${st.ip}"></label>
            <label>IP max <input id="ed-maxip" type="number" min="1" value="${st.maxIP}"></label>
            <div>
                <button id="ed-save">SPEICHERN</button>
                <button id="ed-cancel">ABBRECHEN</button>
            </div>
        </div>`;
    overlay.querySelector("h3").textContent = c.name;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector("#ed-cancel").addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close();
    });

    overlay.querySelector("#ed-save").addEventListener("click", () => {
        const num = (id, fallback) => {
            const n = parseInt(overlay.querySelector(id).value, 10);
            return Number.isNaN(n) ? fallback : n;
        };
        const maxLP = Math.max(1, num("#ed-maxlp", st.maxLP));
        const maxGP = Math.max(1, num("#ed-maxgp", st.maxGP));
        const maxIP = Math.max(1, num("#ed-maxip", st.maxIP));
        setCharacterState(c.id, {
            maxLP, maxGP, maxIP,
            lp: Math.max(0, Math.min(maxLP, num("#ed-lp", st.lp))),
            gp: Math.max(0, Math.min(maxGP, num("#ed-gp", st.gp))),
            ip: Math.max(0, Math.min(maxIP, num("#ed-ip", st.ip)))
        });
        close();
    });
}
