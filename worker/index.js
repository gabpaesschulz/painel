/**
 * Servidor do painel (Cloudflare Worker, plano gratuito).
 *
 *  /api/ping   → confirma que o servidor está no ar
 *  /api/ics    → entrega o seu Google Agenda (endereço secreto iCal) com permissão de CORS,
 *                já que o Google não deixa o navegador ler direto. Só aceita calendar.google.com.
 *  /api/river  → nível do rio (AlertaBLU / Defesa Civil de Blumenau), com cache de 5 min.
 *  /api/alerts → avisos de chuva e deslizamento por região (Defesa Civil de Blumenau), com cache de 5 min.
 *  qualquer outra coisa → os arquivos do painel (pasta public/)
 *
 * Nada é guardado aqui: o endereço secreto passa pelo servidor só durante a leitura e não é registrado.
 * O servidor da Defesa Civil manda a cadeia de certificados incompleta; o Cloudflare completa sozinho (testado em 17/10/2026).
 * Se um dia parar, o painel usa a cópia que o GitHub publica junto com o site, e avisa quando ela ficar velha.
 */
const DEFESA_CIVIL = {
  "/api/river": "https://defesacivil.blumenau.sc.gov.br/static/data/nivel_oficial.json",
  "/api/alerts": "https://defesacivil.blumenau.sc.gov.br/static/data/situacao_atual.json",
};
const ICS_HOSTS = new Set(["calendar.google.com"]);

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "*",
};
const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS, ...extra } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === "/api/ping") return json({ ok: true, app: "painel" });

    if (DEFESA_CIVIL[url.pathname]) {
      try {
        const r = await fetch(DEFESA_CIVIL[url.pathname], { cf: { cacheTtl: 300, cacheEverything: true } });
        if (!r.ok) return json({ error: "upstream " + r.status }, 502);
        return new Response(r.body, { status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=120", ...CORS } });
      } catch (e) {
        return json({ error: "não consegui falar com a Defesa Civil: " + String(e.message || e) }, 502);
      }
    }

    if (url.pathname === "/api/ics") {
      let target;
      try { target = new URL(url.searchParams.get("u") || ""); } catch (e) { return json({ error: "endereço inválido" }, 400); }
      if (target.protocol !== "https:" || !ICS_HOSTS.has(target.hostname) || !target.pathname.startsWith("/calendar/ical/")) {
        return json({ error: "só aceito endereços iCal do Google Agenda" }, 400);
      }
      try {
        const r = await fetch(target.toString(), { cf: { cacheTtl: 10, cacheEverything: true } });
        if (!r.ok) return json({ error: "o Google respondeu " + r.status }, r.status === 404 ? 404 : 502);
        return new Response(r.body, { status: 200, headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "no-store", ...CORS } });
      } catch (e) {
        return json({ error: String(e.message || e) }, 502);
      }
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "não existe" }, 404);
    return env.ASSETS.fetch(request);
  },
};
