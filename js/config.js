// Gemeinsame Konstanten. Hier ändern, wirkt überall.
export const TILE_SIZE = 64;

// Spritegrößen in Pixeln (bezogen auf die Originalgröße des Hintergrundbilds)
export const SPRITE_SIZES = {
    player: 64,
    soldier: 64,
    elite: 128,
    champion: 256
};

export const MAX_PER_SIDE = 4;   // max. 4 Spieler und 4 Monster pro Szene

// Standard-Züge pro Runde; ein Champion kann beim Erstellen auch 4 bekommen
export const RANK_TURNS = { soldier: 1, elite: 2, champion: 3 };

// Wie viele Soldaten-Felder ein Akteur beim Platzieren belegt
export const RANK_SLOTS = { soldier: 1, elite: 2, champion: 3 };

// Feste Musiktitel (Schlüssel aus data/music.json)
export const TITLE_MUSIC = "main_theme";
export const OVERWORLD_MUSIC = "overworld_travel";

// Kartenfläche in Pixeln (siehe Layout)
export const MAP_AREA = { width: 1440, height: 900 };
