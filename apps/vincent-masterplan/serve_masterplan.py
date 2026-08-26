#!/usr/bin/env python3

from __future__ import annotations

import ipaddress
import os
import socket
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

# Seuls ces hôtes d'origine sont acceptés : barre la voie au DNS rebinding
# (un domaine attaquant résolu en 127.0.0.1 serait refusé ici).
ALLOWED_ORIGIN_HOSTS = {"127.0.0.1", "localhost", "::1"}


def host_header_only(host_header: str) -> str:
    """Extrait le nom d'hôte du header Host (supporte les crochets IPv6)."""
    if host_header.startswith("["):
        return host_header[1:].split("]", 1)[0]
    return host_header.split(":", 1)[0]


def resolves_public_only(hostname: str) -> bool:
    """Vrai si le nom d'hôte ne résout QUE vers des IP publiques.

    Anti-SSRF : refuse localhost, les réseaux privés, le link-local
    (notamment 169.254.169.254) et tout adressage réservé — y compris
    pour les URL explicites en 127.0.0.1/localhost (cibles = services
    locaux de la machine, hors périmètre d'un flux iCal Pronote).
    """
    try:
        infos = socket.getaddrinfo(hostname, None)
    except (socket.gaierror, UnicodeError):
        return False
    if not infos:
        return False
    for _family, _type, _proto, _canonname, sockaddr in infos:
        ip = ipaddress.ip_address(sockaddr[0])
        if not ip.is_global:
            return False
    return True


class MasterPlanHandler(SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        origin_host = host_header_only(self.headers.get("Host", ""))
        if origin_host not in ALLOWED_ORIGIN_HOSTS:
            self.send_error(403, "Requête refusée")
            return

        request = urlparse(self.path)
        if request.path != "/api/calendar":
            super().do_GET()
            return

        calendar_url = parse_qs(request.query).get("url", [""])[0]
        parsed = urlparse(calendar_url)
        hostname = parsed.hostname or ""
        if parsed.scheme not in {"http", "https"} or not hostname:
            self.send_error(400, "Lien calendrier invalide")
            return
        if not resolves_public_only(hostname):
            self.send_error(400, "Lien calendrier inatteignable")
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
        except Exception:
            self.send_error(502, "Pronote inaccessible")


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
