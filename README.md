# JRPG TTRPG (Fabula Ultima Tisch-Tool)

Online-Tool für Fabula Ultima unter Freunden: Der GM und die Spieler sehen verschiedene
Oberflächen, der Spielstand ist über Firebase live synchron. Reines HTML/CSS/JavaScript, kein Build-Schritt.

## Starten
```
python tools/serve.py        # http://localhost:8000
```
Die Seite muss über einen Server laufen (nicht per Doppelklick auf `index.html`), weil der
Browser JavaScript-Module sonst blockiert. `tools/serve.py` bearbeitet mehrere Anfragen
gleichzeitig und schaltet das Zwischenspeichern aus.

## Aufbau
| Ordner/Datei | Inhalt |
|---|---|
| `index.html` | Startbildschirm und Spielbildschirm (feste Bühne 1920 × 960 px) |
| `css/` | `main.css` Grundlagen, `layout.css` Bühne und Kartenfläche, `panel.css` Spieler-Panel, `gm.css` GM-Panel und Texturfärbung, `login.css` Startbildschirm |
| `js/` | Spiellogik, je Datei eine Aufgabe (siehe unten) |
| `data/` | `characters.json`, `scenarios.json`, `music.json` |
| `assets/` | `images/` (Karten und Szenenbilder), `sprites/`, `textures/`, `music/` |
| `tools/` | Hilfsskripte (Python) |

### Wichtige JS-Dateien
- `main.js` verbindet alles, `firebase.js` und `gameState.js` sprechen mit Firebase, `login.js` meldet an.
- `overworld.js` (Karte, Kamera, Fog of War), `scene.js` (Szenarien, Sprites, Konflikt), `effects.js` (Angriff/Zauber/Heilung).
- `playerPanel.js` und `gmPanel.js` bauen die beiden Oberflächen, `charEditor.js` das Pop-up für Maximalwerte.
- `config.js` enthält Größen, Startpositionen der Sprites und Effektpositionen.
- `dom.js` enthält gemeinsame Hilfsfunktionen.

## Einstellungen
- Sprite-Größen, Startpositionen, Effektpositionen: `js/config.js`
- Farben der Buttons (Ocker, Grün, Rot): `css/gm.css`, ganz oben (`--tint`)
- Schrift: `css/main.css`, im Block `body` (Buttons und Felder übernehmen sie über die Regel `font-family: inherit`)
- Dauer der Effekte: `js/effects.js` (`EFFECT_MS`)

## Dateien der Charaktere
Pro Spielercharakter ein Ordner in `assets/sprites/<Ordner>/`:
`portrait.png` (128 × 128), `idle.png`, `attack.gif`, `spell.gif`, `heal.gif`.
NPCs: `assets/sprites/NPCs/<Name>.png`, Monster: `assets/sprites/Monster/<Name>.png`.
Feste Werte stehen in `data/characters.json`, aktuelle Werte (LP, GP, IP, Fabula, Züge) liegen im Spielstand in Firebase.

## Musik
Titel in `assets/music/` ablegen, dann `python tools/update_music_list.py` ausführen.
Es schreibt `data/music.json` mit Kurznamen (Schlüsseln), die Szenarien und `config.js` verwenden.

## Firebase
- Anmeldung: E-Mail/Passwort, Konten heißen `<id>@fabula.local` (`gm@fabula.local` und je Charakter
  die `id` aus `data/characters.json`). Die Adresse existiert nur als Platzhalter.
- Der Spielstand liegt im Dokument `games/main` (Firestore).
- Der Web-API-Schlüssel in `js/firebase.js` ist öffentlich vorgesehen. In der Google Cloud Console sollte
  er auf die eigenen Adressen beschränkt werden (HTTP-Referrer).

## Werkzeuge
- `tools/update_music_list.py`: Musikliste neu erzeugen
- `tools/gif_tool.py`: Bildrate eines GIFs anzeigen, verlangsamen oder nur einmal abspielen
- `tools/serve.py`: lokaler Entwicklungsserver
