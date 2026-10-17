/* Inicialização e agendamento das atualizações. */
(function () {
  "use strict";
  const P = window.P;

  // código de configuração pela URL (?cfg=PNL1....), usado para configurar o tablet de uma vez
  try {
    const u = new URL(location.href), code = u.searchParams.get("cfg");
    if (code) {
      P.cfg.importCode(code);
      u.searchParams.delete("cfg");
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    }
  } catch (e) { console.warn("cfg da URL:", e); }

  P.weather.loadCache(); P.river.loadCache(); P.cal.loadCache();
  P.settings.init(); P.view.init(); P.kiosk.init();

  // dados: o tempo não depende do servidor do painel; rio e agenda esperam a detecção (rápida)
  P.cfg.loadDeploy().finally(() => {
    P.weather.refresh();
    P.server.detect().finally(() => { P.river.refresh(); P.cal.refresh(); });
  });

  setInterval(P.weather.refresh, 15 * 60000);
  setInterval(P.river.refresh, 10 * 60000);
  setInterval(P.cal.refresh, 3 * 60000);

  // ao acordar, atualiza o que estiver velho
  P.bus.on("wake", () => {
    const old = (d, min) => !d || Date.now() - d.at > min * 60000;
    if (old(P.data.weather, 10)) P.weather.refresh();
    if (old(P.data.calendar, 2)) P.cal.refresh();
    if (old(P.data.river, 8)) P.river.refresh();
  });
  window.addEventListener("online", () => { P.weather.refresh(); P.river.refresh(); P.cal.refresh(); });

  // modo offline: guarda os arquivos do painel (se o navegador permitir)
  if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* ignora */ });
  }
})();
