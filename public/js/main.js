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

  P.weather.loadCache(); P.river.loadCache(); P.alerts.loadCache(); P.cal.loadCache();
  P.settings.init(); P.view.init(); P.kiosk.init();

  // dados: o tempo não depende do servidor do painel; rio, avisos e agenda esperam a detecção (rápida)
  P.cfg.loadDeploy().finally(() => {
    P.weather.refresh();
    P.server.detect().finally(() => { P.river.refresh(); P.alerts.refresh(); P.cal.refresh(); });
  });

  setInterval(P.weather.refresh, 15 * 60000);
  setInterval(P.river.refresh, 10 * 60000);
  setInterval(P.alerts.refresh, 10 * 60000);
  setInterval(P.cal.refresh, 60000);

  // ao acordar, atualiza o que estiver velho
  P.bus.on("wake", () => {
    const old = (d, min) => !d || Date.now() - d.at > min * 60000;
    if (old(P.data.weather, 10)) P.weather.refresh();
    if (old(P.data.calendar, 2)) P.cal.refresh();
    if (old(P.data.river, 8)) P.river.refresh();
    if (old(P.data.alerts, 8)) P.alerts.refresh();
  });
  window.addEventListener("online", () => { P.weather.refresh(); P.river.refresh(); P.alerts.refresh(); P.cal.refresh(); });

  /* Versão nova: cada publicação no GitHub grava version.json. O painel confere a cada 30 min e recarrega sozinho
     quando ninguém está olhando (em descanso ou sem toque há 5 min). Uma vez por dia também recarrega,
     no descanso, para não acumular memória num aparelho que nunca desliga. */
  const bootAt = Date.now();
  let newBuild = false;
  async function checkVersion() {
    try {
      const r = await P.util.fetchT("version.json?a=" + Date.now(), { cache: "no-store" }, 10000);
      if (!r.ok) return;                                // rodando no PC: não há version.json
      const { build } = await r.json();
      if (!P.build) P.build = build;
      else if (build && build !== P.build) newBuild = true;
    } catch (e) { /* sem internet: confere depois */ }
  }
  function maybeReload() {
    const daily = Date.now() - bootAt > 24 * 3600000;
    if ((!newBuild && !daily) || !navigator.onLine || P.settings.isOpen()) return;
    const resting = P.kiosk.isResting();
    if (!resting && !(newBuild && P.kiosk.idleMs() >= 5 * 60000)) return;
    P.kiosk.reload();
  }
  checkVersion();
  setInterval(checkVersion, 30 * 60000);
  P.bus.on("minute", maybeReload);

  // modo offline: guarda os arquivos do painel (se o navegador permitir)
  if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* ignora */ });
  }
})();
