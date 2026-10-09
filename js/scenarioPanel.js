import { getScenarios } from "./scenarios.js";

// Szenario-Dropdown und Play-Button in der GM-Schaltfläche
export function initializeScenarioPanel(onScenarioSelected) {
    const select = document.getElementById("scenario-select");
    const playButton = document.getElementById("scenario-play-button");
    if (!select || !playButton) return;

    select.innerHTML = "";
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "– Szenario wählen –";
    select.appendChild(none);

    getScenarios().forEach((scenario) => {
        const option = document.createElement("option");
        option.value = scenario.id;
        option.textContent = scenario.name;
        select.appendChild(option);
    });

    // Erst der Play-Button lädt das Szenario (kein Versehen beim Durchblättern)
    playButton.addEventListener("click", () => {
        if (select.value) onScenarioSelected(select.value);
    });
}
