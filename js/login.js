import { login, logout, onUser, idFromUser, GM_ID } from "./firebase.js";
import { stopGameSubscription } from "./gameState.js";
import { portraitUrl } from "./characters.js";

const stepChoose = document.getElementById("login-choose");
const stepCharacters = document.getElementById("login-characters");
const stepPassword = document.getElementById("login-password");

const cardsBox = document.getElementById("character-buttons");
const whoLabel = document.getElementById("login-who");
const passwordInput = document.getElementById("password-input");
const errorLabel = document.getElementById("login-error");

let characters = [];     // aus data/characters.json (nur Spielercharaktere)
let entered = false;

function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
}

function showStep(step) {
    [stepChoose, stepCharacters, stepPassword].forEach((s) => s.classList.add("hidden"));
    step.classList.remove("hidden");
    errorLabel.textContent = "";
}

function errorText(error) {
    console.warn("Login fehlgeschlagen:", error.code);
    return ["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(error.code)
        ? "Falsches Passwort."
        : `Anmeldung nicht möglich (${error.code}).`;
}

// Meldet an; bei Erfolg geht es im onUser-Callback unten weiter
async function attempt(id, password, errorElement) {
    errorElement.textContent = "";
    try {
        await login(id, password);
    } catch (error) {
        errorElement.textContent = errorText(error);
    }
}

// ---------- GM ----------

function askGmPassword() {
    whoLabel.textContent = "Spielleitung";
    passwordInput.value = "";
    showStep(stepPassword);
    passwordInput.focus();
}

// ---------- Charakterauswahl ----------

// Ein Charakter: Portrait mit gelbem Rahmen, Name darunter, nach Klick die Passworteingabe
function buildCard(c) {
    const card = el("div", "login-card");

    const frame = el("div", "login-frame");
    const img = el("img");
    img.src = portraitUrl(c);
    img.alt = c.name;
    img.addEventListener("error", () => { img.style.visibility = "hidden"; });
    frame.appendChild(img);

    const name = el("div", "login-name", c.name);

    const pw = el("div", "login-pw hidden");
    const input = el("input");
    input.type = "password";
    input.placeholder = "Passwort";
    const ok = el("button", "login-ok", "OK");
    const error = el("div", "login-card-error");
    pw.append(input, ok, error);

    const select = () => {
        // Nur bei einem Charakter ist die Passworteingabe offen
        cardsBox.querySelectorAll(".login-pw").forEach((p) => {
            p.classList.add("hidden");
            p.querySelector("input").value = "";
            p.querySelector(".login-card-error").textContent = "";
        });
        pw.classList.remove("hidden");
        input.focus();
    };
    const submit = () => attempt(c.id, input.value, error);

    frame.addEventListener("click", select);
    name.addEventListener("click", select);
    ok.addEventListener("click", submit);
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") submit();
    });

    card.append(frame, name, pw);
    return card;
}

export async function initializeLogin(onLoggedIn) {
    // Zuerst alle Buttons verdrahten, damit sie auch funktionieren,
    // falls das Laden der Charakterliste unten fehlschlägt.
    document.getElementById("gm-role-button").addEventListener("click", askGmPassword);
    document.getElementById("player-role-button")
        .addEventListener("click", () => showStep(stepCharacters));
    document.getElementById("login-back-characters")
        .addEventListener("click", () => showStep(stepChoose));
    document.getElementById("login-back")
        .addEventListener("click", () => showStep(stepChoose));

    document.getElementById("login-submit")
        .addEventListener("click", () => attempt(GM_ID, passwordInput.value, errorLabel));
    passwordInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") attempt(GM_ID, passwordInput.value, errorLabel);
    });

    // Startbild: fehlt die Datei, erscheint stattdessen der Titel als Text
    const startImage = document.getElementById("start-image");
    const startTitle = document.getElementById("start-title");
    if (startImage && startTitle) {
        startImage.addEventListener("error", () => {
            startImage.classList.add("hidden");
            startTitle.classList.remove("hidden");
        });
    }

    document.getElementById("logout-button").addEventListener("click", async () => {
        stopGameSubscription();                    // erst Verbindung zur Datenbank trennen
        setTimeout(() => location.reload(), 1500); // Sicherung, falls signOut hängt
        try {
            await logout();
        } catch (error) {
            console.warn("Abmelden:", error);
        }
        location.reload();
    });

    // Charakterliste laden
    try {
        const response = await fetch("./data/characters.json");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        // Nur Spielercharaktere haben ein Konto
        characters = (await response.json()).characters.filter((c) => c.type === "pc");
    } catch (error) {
        console.error("characters.json konnte nicht geladen werden:", error);
        const note = el("p", "", "data/characters.json konnte nicht geladen werden (Details in der Konsole).");
        note.style.color = "#ff6b6b";
        document.getElementById("role-screen").appendChild(note);
    }

    characters.forEach((c) => cardsBox.appendChild(buildCard(c)));

    // Greift bei neuer Anmeldung UND wenn eine gespeicherte Sitzung wiederhergestellt wird
    onUser((user) => {
        if (!user || entered) return;
        const id = idFromUser(user);
        const character = characters.find((c) => c.id === id);
        if (id !== GM_ID && !character) {
            console.warn("Konto ohne Charakter in characters.json:", id);
            return;
        }
        entered = true;
        onLoggedIn({
            role: id === GM_ID ? "gm" : "player",
            characterId: id === GM_ID ? null : id,
            name: id === GM_ID ? "Spielleitung" : character.name
        });
    });
}
