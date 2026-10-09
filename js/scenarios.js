let scenarios = null;

export async function loadScenarios() {
    const response = await fetch("./data/scenarios.json");
    if (!response.ok) throw new Error("Could not load scenarios.json");
    scenarios = (await response.json()).scenarios;
    return scenarios;
}

// Gibt die Liste zurück, oder [] solange noch nicht geladen
export function getScenarios() {
    return scenarios || [];
}

export function getScenario(id) {
    return getScenarios().find((s) => s.id === id) || null;
}
