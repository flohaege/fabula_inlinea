import { textures } from "./assets.js";
import { portraitUrl } from "./characters.js";

// Element mit optionaler Klasse und optionalem Text (textContent, daher sicher gegen HTML)
export function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
}

// <img> für eine Datei aus assets/textures
export function textureImg(file, className) {
    const img = el("img", className);
    img.src = `${textures}/${file}`;
    img.alt = "";
    return img;
}

// Portrait eines Charakters; data-char sorgt dafür, dass es beim Fabula-Aufleuchten mitleuchtet
export function portraitImage(character) {
    const img = el("img");
    img.src = portraitUrl(character);
    img.alt = character.name;
    img.dataset.char = character.id;
    img.addEventListener("error", () => { img.style.visibility = "hidden"; });
    return img;
}
