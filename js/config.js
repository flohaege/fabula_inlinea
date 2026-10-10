// Gemeinsame Konstanten. Hier ändern, wirkt überall.
export const TILE_SIZE = 64;

// Spritegrößen in Pixeln im 1440 x 900 Dummy (Seitenlänge des quadratischen Feldes)
export const SPRITE_SIZES = {
    player: 128,
    soldier: 128,
    elite: 256,
    champion: 512
};

export const MAX_PER_SIDE = 4;   // max. 4 Spieler und 4 Monster pro Szene

// Standard-Züge pro Runde; ein Champion kann beim Erstellen auch 4 bekommen
export const RANK_TURNS = { soldier: 1, elite: 2, champion: 3 };


// Feste Musiktitel (Schlüssel aus data/music.json)
export const TITLE_MUSIC = "main_theme";
export const OVERWORLD_MUSIC = "overworld_travel";

// Kartenfläche in Pixeln (siehe Layout)
export const MAP_AREA = { width: 1440, height: 900 };

// Dauer der Angriffs-/Zauber-/Heil-Effekte in Millisekunden (pro Charakter mit "effectMs" änderbar)
export const EFFECT_MS = 1000;

// ---- Startpositionen der Sprites in Szenen ----
// Pixel im 1440 x 900 Dummy als [x, y]. Gemessen wird die untere Ecke des Sprites:
//   Spielerseite: linke untere Ecke, von links/unten
//   Gegnerseite:  rechte untere Ecke, von rechts/unten
export const START_POSITIONS = {
    // Spieler 1 bis 4 (auch Helfer-Soldaten auf der linken Seite)
    player:  [[64, 128], [200, 192], [336, 128], [472, 200]],
    // Soldat 1 bis 4
    soldier: [[64, 128], [200, 192], [336, 128], [472, 200]],
    // Elite/Champion: "first" wenn noch kein Soldat/Elite auf der Seite steht, sonst "other"
    elite:    { first: [32, 128], other: [384, 128] },
    champion: { first: [32, 128], other: [200, 128] }
};

// ---- Position der Effekt-GIFs im Dummy ----
// side = von welcher Seite gemessen, x/y = linke bzw. rechte untere Ecke, width = Breite in px
export const EFFECT_POSITIONS = {
    heal:   { side: "left",  x: 64, y: 8, width: 576 },
    attack: { side: "right", x: 64, y: 128, width: 576 },
    spell:  { side: "right", x: 64, y: 128, width: 576 }    // Zauber ("Magic")
};
