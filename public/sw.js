/* Guarda os arquivos do painel para abrir mesmo sem internet.
   - Código e páginas: rede primeiro (sempre a versão mais nova); cache só se estiver sem internet.
   - Fontes, ícones e bibliotecas: cache primeiro (não mudam).
   - Dados (/api, river/alerts/status/version.json, tempo, agenda): nunca ficam presos aqui. */
const V = "painel-v3";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  if (u.pathname.startsWith("/api/") || /(river|alerts|deploy|status|version)\.json$/.test(u.pathname)) return;
  const heavy = /\/(assets|vendor)\//.test(u.pathname);
  e.respondWith(caches.open(V).then(async c => {
    if (heavy) {
      const hit = await c.match(e.request);
      if (hit) return hit;
    }
    try {
      const r = await fetch(e.request, { cache: "no-store" });
      if (r.ok) c.put(e.request, r.clone());
      return r;
    } catch (err) {
      const hit = await c.match(e.request, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  }));
});
