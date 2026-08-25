#!/usr/bin/env python3

from __future__ import annotations

import os
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen


class MasterPlanHandler(SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        request = urlparse(self.path)
        if request.path != "/api/calendar":
            super().do_GET()
            return

        calendar_url = parse_qs(request.query).get("url", [""])[0]
        if urlparse(calendar_url).scheme not in {"http", "https"}:
            self.send_error(400, "Lien calendrier invalide")
            return

        try:
            upstream = Request(calendar_url, headers={"User-Agent": "MASTERPLAN-Vincent/1.0"})
            with urlopen(upstream, timeout=20) as response:
                payload = response.read(5_000_001)
            if len(payload) > 5_000_000:
                self.send_error(413, "Calendrier trop volumineux")
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/calendar; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except Exception as error:
            self.send_error(502, f"Pronote inaccessible: {error}")


def create_server() -> tuple[ThreadingHTTPServer, int]:
    requested_port = os.environ.get("MASTERPLAN_PORT")
    ports = [int(requested_port)] if requested_port else range(8765, 8775)

    for port in ports:
        try:
            return ThreadingHTTPServer(("127.0.0.1", port), MasterPlanHandler), port
        except OSError:
            continue

    raise SystemExit("MASTERPLAN ne trouve aucun port local disponible.")


server, port = create_server()
url = f"http://127.0.0.1:{port}/index.html"

print(f"MASTERPLAN · VINCENT est ouvert sur {url}")
print("Gardez cette fenêtre ouverte. Ctrl+C arrête l'application.")
threading.Timer(0.4, lambda: webbrowser.open(url)).start()

try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nMASTERPLAN arrêté.")
finally:
    server.server_close()
