// Der Spielbildschirm ist 1920 x 960 px groß und wird passend
// zum Browserfenster verkleinert oder vergrößert.
const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 960;

export function initializeStage() {
    const stage = document.getElementById("stage");
    if (!stage) return;

    const fit = () => {
        const scale = Math.min(
            window.innerWidth / STAGE_WIDTH,
            window.innerHeight / STAGE_HEIGHT
        );
        stage.style.setProperty("--stage-scale", scale);
    };

    window.addEventListener("resize", fit);
    fit();
}
