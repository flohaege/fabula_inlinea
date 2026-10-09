"""Liest assets/music und aktualisiert data/music.json.

- Vorhandene Schlüssel bleiben erhalten (auch wenn du sie umbenannt hast).
- Neue Dateien bekommen einen Schlüssel: der Text in Klammern am Ende des
  Dateinamens, sonst der Dateiname; klein geschrieben, Leerzeichen -> _.
- Gelöschte Dateien werden aus der Liste entfernt.

Aufruf (im Projektordner):  python tools/update_music_list.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MUSIC_DIR = ROOT / "assets" / "music"
OUTPUT = ROOT / "data" / "music.json"
EXTENSIONS = {".mp3", ".ogg", ".wav", ".m4a"}


def make_key(filename: str) -> str:
    match = re.search(r"\(([^)]*)\)\.[^.]+$", filename)
    base = match.group(1) if match else filename.rsplit(".", 1)[0]
    return re.sub(r"[^a-z0-9]+", "_", base.lower()).strip("_") or "track"


old = {}
if OUTPUT.exists():
    old = json.loads(OUTPUT.read_text(encoding="utf-8")).get("tracks", {})
key_by_file = {entry["file"]: key for key, entry in old.items()}

files = sorted(
    (f.name for f in MUSIC_DIR.iterdir() if f.suffix.lower() in EXTENSIONS),
    key=str.lower,
)

tracks = {}
for name in files:
    key = key_by_file.get(name) or make_key(name)
    unique, n = key, 2
    while unique in tracks:          # doppelte Schlüssel durchnummerieren
        unique, n = f"{key}_{n}", n + 1
    entry = dict(old.get(key_by_file.get(name), {}))   # weitere Felder behalten
    entry["file"] = name
    tracks[unique] = entry

OUTPUT.parent.mkdir(exist_ok=True)
OUTPUT.write_text(
    json.dumps({"tracks": tracks}, indent=4, ensure_ascii=False),
    encoding="utf-8",
)
print(f"{len(tracks)} Titel nach {OUTPUT} geschrieben.")
