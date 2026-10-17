#!/usr/bin/env python3
"""Baixa o nível do rio e os avisos da Defesa Civil de Blumenau para public/ (o GitHub roda isto a cada 15 min).

   - Se a Defesa Civil não responder, usa a cópia que já está publicada no site.
     (A cópia do git é do dia do commit: publicá-la faria o painel voltar no tempo.)
   - Grava public/status.json com a hora em que cada dado foi baixado de fato.
     O painel usa isso para avisar "sem atualizar" em vez de mostrar dado velho como se fosse novo.

   Uso:  python tools/fetch_data.py [endereço do site publicado]"""
import json, os, ssl, sys, time, urllib.request
from datetime import datetime, timezone

PUBLIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
SOURCES = {  # nome → (endereço, campo que precisa ter conteúdo)
    "river": ("https://defesacivil.blumenau.sc.gov.br/static/data/nivel_oficial.json", "niveis"),
    "alerts": ("https://defesacivil.blumenau.sc.gov.br/static/data/situacao_atual.json", "dados"),
}
# O servidor da Defesa Civil manda a cadeia de certificados incompleta; só para ele não validamos.
DC_CTX = ssl._create_unverified_context()


def get_json(url, ctx=None):
    sep = "&" if "?" in url else "?"
    req = urllib.request.Request(f"{url}{sep}a={int(time.time())}", headers={"User-Agent": "painel/2"})
    with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
        return json.loads(r.read())


def valid(name, data):
    return isinstance(data, dict) and bool(data.get(SOURCES[name][1]))


def main():
    site = (sys.argv[1] if len(sys.argv) > 1 else "").rstrip("/")

    def published(file):
        if not site:
            return None
        try:
            return get_json(f"{site}/{file}")
        except Exception as e:
            print(f"  (sem a cópia publicada de {file}: {e})")
            return None

    before = published("status.json") or {}
    status = {}
    for name, (url, _) in SOURCES.items():
        key = f"{name}_at"
        try:
            data = get_json(url, DC_CTX)
            if not valid(name, data):
                raise ValueError("resposta sem dados")
            status[key] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            print(f"{name}.json atualizado")
        except Exception as e:
            print(f"::warning::não consegui baixar {name} da Defesa Civil ({e}); usando a cópia publicada")
            data = published(f"{name}.json")
            if not valid(name, data):
                print(f"::warning::sem cópia publicada de {name}; fica a do git")
                data = None
            status[key] = before.get(key)          # continua dizendo quando foi a última vez que deu certo
        if data is not None:
            with open(os.path.join(PUBLIC, f"{name}.json"), "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False)
    with open(os.path.join(PUBLIC, "status.json"), "w", encoding="utf-8") as f:
        json.dump(status, f)
    print("status.json:", status)


if __name__ == "__main__":
    main()
