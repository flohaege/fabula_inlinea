"""Lokaler Entwicklungsserver für das Spiel (ersetzt `python -m http.server`).

Aufruf im Projektordner:  python tools/serve.py        (Port 8000)
                          python tools/serve.py 8080   (anderer Port)

Unterschiede zum einfachen Python-Server:
- Mehrere Anfragen gleichzeitig. Der alte Server bearbeitet nur eine zur Zeit,
  deshalb blockierte eine große MP3 alle anderen Dateien.
- Abgebrochene Verbindungen (der Browser bricht MP3-Downloads oft ab) werden
  still ignoriert statt als Fehler ausgegeben.
- Keine Zwischenspeicherung im Browser: Änderungen sind sofort sichtbar.
"""
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def handle(self):
        try:
            super().handle()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    os.chdir(ROOT)
    print("Server läuft auf http://localhost:%d  (Beenden mit Strg+C)" % PORT)
    try:
        Server(("0.0.0.0", PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\nBeendet.")
