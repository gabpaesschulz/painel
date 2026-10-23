#!/usr/bin/env python3
"""Servidor local do painel (para testar no PC). Faz o mesmo que o Worker do Cloudflare:
   serve a pasta public/ e oferece /api/ping, /api/ics, /api/river e /api/alerts.
   Uso:  python tools/dev_server.py [porta]"""
import json, os, ssl, sys, time, urllib.parse, urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
DEFESA_CIVIL = {
    "/api/river": "https://defesacivil.blumenau.sc.gov.br/static/data/nivel_oficial.json",
    "/api/alerts": "https://defesacivil.blumenau.sc.gov.br/static/data/situacao_atual.json",
}
ICS_HOSTS = {"calendar.google.com"}
# O servidor da Defesa Civil manda a cadeia de certificados incompleta; só para esse endereço não validamos.
DC_CTX = ssl._create_unverified_context()
_cache = {}


def cached(key, ttl, fn):
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    val = fn()
    _cache[key] = (time.time(), val)
    return val


def get(url, ctx=None, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": "painel-dev/1.0"})
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
        return r.read()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _send(self, code, body, ctype="application/json; charset=utf-8"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path == "/api/ping":
            return self._send(200, {"ok": True, "app": "painel"})
        if u.path in DEFESA_CIVIL:
            try:
                return self._send(200, cached(u.path, 120, lambda: get(DEFESA_CIVIL[u.path], DC_CTX)))
            except Exception as e:
                return self._send(502, {"error": str(e)})
        if u.path == "/api/ics":
            q = urllib.parse.parse_qs(u.query).get("u", [""])[0]
            t = urllib.parse.urlparse(q)
            local = os.environ.get("ALLOW_LOCAL") == "1" and t.hostname in ("localhost", "127.0.0.1")
            if not local and not (t.scheme == "https" and t.hostname in ICS_HOSTS and t.path.startswith("/calendar/ical/")):
                return self._send(400, {"error": "só aceito endereços iCal do Google Agenda"})
            try:
                return self._send(200, get(q), "text/calendar; charset=utf-8")
            except Exception as e:
                return self._send(502, {"error": str(e)})
        return super().do_GET()

    def log_message(self, fmt, *args):
        if "/api/" in (str(args[0]) if args else ""):
            sys.stderr.write("  " + (fmt % args) + "\n")


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f"Painel no ar em  http://localhost:{port}/   (Ctrl+C para parar)")
    # fila maior: o navegador abre várias conexões de uma vez e, no Windows, a fila padrão (5) recusa algumas
    ThreadingHTTPServer.request_queue_size = 64
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
