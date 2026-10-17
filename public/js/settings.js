/* Tela de configurações — tudo é aplicado na hora (dá pra ver o painel mudando atrás). */
(function () {
  "use strict";
  const P = window.P, U = P.util, esc = U.esc;
  let root, main, nav, tab = "look", opened = false;
  let testBox = {};     // resultados de testes por aba (mantidos ao re-desenhar)

  const TABS = [
    { id: "look",   label: "Aparência",     icon: "palette" },
    { id: "city",   label: "Cidade e tempo", icon: "cloud-sun" },
    { id: "agenda", label: "Agenda",        icon: "calendar" },
    { id: "rem",    label: "Lembretes",     icon: "bell" },
    { id: "river",  label: "Rio e Defesa Civil", icon: "waves" },
    { id: "screen", label: "Tela",          icon: "monitor-smartphone" },
    { id: "adv",    label: "Avançado",      icon: "sliders-horizontal" },
  ];

  /* ---------- peças de interface ---------- */
  const val = v => esc(JSON.stringify(v));
  const seg = (path, opts) => {
    const cur = P.cfg.get(path);
    return `<div class="seg">${opts.map(([v, l]) => `<button class="${v === cur ? "on" : ""}" data-set="${path}" data-val="${val(v)}">${l}</button>`).join("")}</div>`;
  };
  const toggle = path => { const on = !!P.cfg.get(path); return `<button class="switch ${on ? "on" : ""}" role="switch" aria-checked="${on}" data-toggle="${path}"><i></i></button>`; };
  const row = (label, desc, ctl, cls) => `<div class="row2 ${cls || ""}"><div class="lab">${label}${desc ? `<small>${desc}</small>` : ""}</div>${ctl || ""}</div>`;
  const sec = (title, body) => `<section class="sec">${title ? `<h3>${title}</h3>` : ""}${body}</section>`;
  const input = (path, ph, extra) => `<input class="in" data-bind="${path}" value="${esc(P.cfg.get(path) || "")}" placeholder="${esc(ph || "")}" ${extra || ""}>`;
  const callout = (kind, html) => `<div class="callout ${kind || ""}">${html}</div>`;

  /* ---------- abas ---------- */
  const THEMES = [
    ["noite", "Noite", "Fundo escuro e quente. Recomendado."],
    ["papel", "Papel", "Fundo claro. Bom em ambiente iluminado."],
    ["contraste", "Alto contraste", "Preto, branco e amarelo. Máximo destaque."],
    ["oceano", "Oceano", "Azul profundo com toque turquesa."],
    ["floresta", "Floresta", "Verde profundo com toque dourado."],
  ];
  const FONTS = [
    ["editorial", "Elegante", "Números em serifa macia + texto Atkinson."],
    ["limpo", "Limpo", "Atkinson Hyperlegible, feita para baixa visão."],
    ["moderno", "Moderno", "Lexend, letras mais espaçadas."],
    ["classico", "Clássico", "Literata, pensada para leitura em tela."],
  ];

  function tabLook() {
    const c = P.cfg.all();
    return sec("Tema",
      `<div class="cards">${THEMES.map(([id, nm, ds]) =>
        `<button class="card2 ${c.theme === id ? "on" : ""}" data-set="theme" data-val="${val(id)}">` +
        `<div class="sw" data-theme="${id}"><b>09:41</b><div style="text-align:right"><i style="margin-left:auto"></i><u>Aa</u></div></div>` +
        `<div class="nm">${nm}</div><div class="ds">${ds}</div></button>`).join("")}</div>`) +
      sec("Letras",
        `<div class="cards">${FONTS.map(([id, nm, ds]) =>
          `<button class="card2 ${c.font === id ? "on" : ""}" data-set="font" data-val="${val(id)}" data-font="${id}">` +
          `<div class="spec"><b>09:41</b><span>Consulta às 15h</span></div><div class="nm">${nm}</div><div class="ds">${ds}</div></button>`).join("")}</div>`) +
      sec("Tamanho e posição",
        row("Tamanho das letras", "Aumenta os textos do painel. Se faltar espaço, itens menos importantes somem.",
          seg("textScale", [[0.9, "A"], [1, "A+"], [1.12, "A++"], [1.25, "A+++"]])) +
        row("Lado do relógio", "Escolha o lado onde ficam o relógio e o tempo. Útil se a visão de um dos lados foi afetada.",
          seg("side", [["left", "Esquerda"], ["right", "Direita"]])) +
        row("Relógio de 24 horas", "Desligado mostra 9:15 AM / PM.", toggle("clock24")) +
        row("Mostrar segundos", "", toggle("showSeconds"))) +
      sec("Movimento",
        row("Ícones animados", "Nuvens e sol se mexem devagar. Desligue para uma tela totalmente parada.", toggle("motion")) +
        row("Modo leve", "Para tablets antigos ou lentos: tira o desfoque e a textura.", toggle("lite"))) +
      sec("Saudação",
        row("Nome na saudação", "Aparece como “Bom dia, Seu José”.", input("name", "Ex.: Seu José"), "col"));
  }

  function tabCity() {
    const c = P.cfg.get("city");
    return sec("Cidade",
      callout("", `<b>${esc(c.name)}</b>${c.region ? ", " + esc(c.region) : ""}`) +
      `<div class="fld" style="margin-top:.8em"><input class="in" id="citySearch" placeholder="Digite o nome de outra cidade"><button class="btn primary" data-act="citySearch">Buscar</button></div>` +
      `<div class="results" id="cityResults">${testBox.city || ""}</div>`) +
      sec("Previsão",
        row("Embaixo do tempo de agora", "“Próximas horas” mostra agora, hoje à noite e amanhã de manhã e à tarde.",
          seg("weatherMode", [["horas", "Próximas horas"], ["dias", "Próximos dias"]])) +
        (P.cfg.get("weatherMode") === "dias" ? row("Quantos dias", "", seg("forecastDays", [[1, "1"], [2, "2"], [3, "3"]])) : "") +
        row("Frase amiga", "“Deve chover à tarde. Leve o guarda-chuva.”", toggle("hint")) +
        row("Tempo na faixa da semana", "Um ícone e a máxima de cada dia, embaixo da data.", toggle("weekWeather")));
  }

  function tabAgenda() {
    const c = P.cfg.get("calendar");
    const srv = P.server.ok
      ? callout("ok", `✔ <b>Servidor do painel conectado.</b> O endereço secreto do Google funciona.`)
      : callout("bad", `✖ <b>Servidor do painel não encontrado.</b> Ele é necessário para o endereço secreto. Veja “Avançado” ou o arquivo LEIA-ME.`);
    const MODES = [["ics", "Endereço secreto", "Privado e permanente. Recomendado."], ["apikey", "Agenda pública", "Mais simples, mas qualquer pessoa com o link vê."], ["demo", "Exemplos", "Só para ver como fica."]];
    let body = `<div class="cards" style="margin-bottom:1em">${MODES.map(([id, nm, ds]) =>
      `<button class="card2 ${c.mode === id ? "on" : ""}" data-set="calendar.mode" data-val="${val(id)}"><div class="nm">${nm}</div><div class="ds">${ds}</div></button>`).join("")}</div>`;

    if (c.mode === "ics") {
      body += srv +
        row("Endereço secreto em formato iCal", "Fica só neste tablet. Não compartilhe.",
          `<textarea class="in" rows="3" data-bind="calendar.icsUrl" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics">${esc(c.icsUrl)}</textarea>`, "col") +
        `<details class="guide"><summary>Como achar o endereço secreto</summary><ol>
          <li>No computador, abra <b>calendar.google.com</b>.</li>
          <li>Clique na engrenagem → <b>Configurações</b>.</li>
          <li>À esquerda, em <b>Configurações das minhas agendas</b>, clique na agenda desejada.</li>
          <li>Role até <b>Endereço secreto no formato iCal</b> e copie.</li>
          <li>Mande para o tablet (WhatsApp, e-mail…) e cole aqui.</li></ol>
          <p class="help" style="margin-bottom:.8em">Dica: se você pedir “Alexa, adicione dentista na quinta às 9h”, o evento vai para a agenda principal do Google e aparece aqui sozinho.</p></details>`;
    } else if (c.mode === "apikey") {
      body +=
        row("E-mail ou ID da agenda", "A agenda precisa estar pública.", input("calendar.calId", "nome@gmail.com"), "col") +
        row("Chave de API do Google", "", input("calendar.apiKey", "AIza…"), "col") +
        `<details class="guide"><summary>Como conseguir</summary><ol>
          <li>Em <b>console.cloud.google.com</b> crie um projeto e ative a <b>Google Calendar API</b>.</li>
          <li>Em <b>Credenciais</b>, crie uma <b>chave de API</b>.</li>
          <li>No Google Agenda, nas configurações da agenda, marque <b>Disponibilizar publicamente</b> (qualquer um com o link pode ver os compromissos).</li>
          <li>Cole aqui o e-mail da agenda e a chave.</li></ol></details>`;
    } else {
      body += callout("", "Mostrando compromissos de <b>exemplo</b>. Escolha uma das opções acima para ligar a sua agenda.");
    }

    body += row("Feriados", "Feriados nacionais (e o aniversário de Blumenau) na agenda e na faixa da semana.", toggle("holidays")) +
      row("Olhar quantos dias à frente", "", seg("calendar.daysAhead", [[3, "3"], [7, "7"], [14, "14"]])) +
      row("Compromissos listados abaixo do próximo", "", seg("calendar.laterCount", [[2, "2"], [3, "3"], [4, "4"], [5, "5"]]));
    if (c.mode !== "demo") body += `<div class="btns"><button class="btn primary" data-act="testCal">Testar agora</button></div><div id="calTest" style="margin-top:.8em">${testBox.cal || ""}</div>`;
    return sec("Google Agenda", body);
  }

  const DOW = ["D", "S", "T", "Q", "Q", "S", "S"];
  function tabRem() {
    const list = P.cfg.get("reminders");
    const items = list.map((r, i) =>
      `<div class="rem" data-i="${i}"><div class="top"><input type="time" class="in" data-rem="time" value="${esc(r.time)}">` +
      `<input class="in" data-rem="text" value="${esc(r.text)}" placeholder="Ex.: Tomar o remédio da pressão">` +
      `<button class="btn danger" data-act="remDel" data-i="${i}" aria-label="Apagar">${P.ui("trash-2")}</button></div>` +
      `<div class="chips">${DOW.map((d, k) => `<button class="chip ${(r.days || []).includes(k) ? "on" : ""}" data-act="remDay" data-i="${i}" data-d="${k}">${d}</button>`).join("")}</div></div>`).join("");
    return sec("Lembretes que se repetem",
      `<p class="help" style="margin-bottom:1em">Aparecem na agenda junto com os compromissos, sem precisar do Google. Bom para remédios e rotinas.</p>` +
      (items || callout("", "Nenhum lembrete ainda.")) +
      `<div class="btns"><button class="btn primary" data-act="remAdd">${P.ui("plus")} Novo lembrete</button></div>`);
  }

  function tabRiver() {
    const r = P.data.river, a = P.data.alerts, st = P.alerts.status && P.alerts.status();
    const near = P.river.isNear();
    const cota = +P.cfg.get("river.cota") || 0;
    const bairro = P.cfg.get("alerts.bairro") || "";
    const opts = a ? a.bairros.map(b => `<option value="${esc(b.bairro)}" ${b.bairro === bairro ? "selected" : ""}>${esc(b.bairro)} (região ${esc(b.region)})</option>`).join("") : "";
    return (!near ? callout("bad", "A cidade escolhida fica longe de Blumenau. O nível do rio e os avisos são da Defesa Civil de Blumenau.") : "") +
      sec("Nível do rio Itajaí-Açu",
        row("Mostrar no painel", "Dados oficiais da Defesa Civil de Blumenau (AlertaBLU), atualizados a cada hora.", toggle("river.show")) +
        (r ? `<dl class="kv" style="margin:.6em 0 .4em"><dt>Nível</dt><dd>${r.level.toFixed(2).replace(".", ",")} m</dd><dt>Situação</dt><dd>${esc(r.cond.name)}</dd><dt>Última leitura</dt><dd>${new Date(r.last).toLocaleString("pt-BR")}</dd></dl>` : "") +
        row("Cota de enchente da sua rua", "Altura do rio (em metros) em que a sua rua começa a alagar. O painel desenha essa linha no gráfico e avisa quando o rio chegar perto. Consulte no <b>Mapa de Inundação</b> do site da Defesa Civil de Blumenau. Deixe 0 se não souber.",
          `<input class="in" type="text" inputmode="decimal" style="max-width:8em" data-bind="river.cota" data-num="1" placeholder="Ex.: 8,5" value="${cota ? String(cota).replace(".", ",") : ""}">`) +
        `<div class="btns"><button class="btn" data-act="testRiver">${P.ui("refresh-cw")} Atualizar agora</button></div><div id="riverTest" style="margin-top:.8em">${testBox.river || ""}</div>`) +
      sec("Avisos da Defesa Civil",
        row("Mostrar avisos", "Condições de chuva e risco de deslizamento, por região de Blumenau. Quando passa de “Atenção”, o painel mostra o aviso em destaque com o telefone 199.", toggle("alerts.show")) +
        (P.cfg.get("alerts.show") ? row("Seu bairro", "Para mostrar só o que vale para a sua região.",
          a ? `<select class="sel" data-bind="alerts.bairro" style="max-width:100%"><option value="">Não informar (mostrar a cidade toda)</option>${opts}</select>` : callout("", "Carregando a lista de bairros…"), "col") : "") +
        (st && st.items.length ? `<dl class="kv" style="margin-top:.8em">${st.items.map(i => `<dt>${esc(i.kind)}</dt><dd>${esc(i.cond)}${st.region ? "" : " (região " + esc(i.region) + ")"}</dd>`).join("")}` +
          (st.fetched ? `<dt>Consultado</dt><dd>${new Date(st.fetched).toLocaleString("pt-BR")}${st.stale ? " — antigo" : ""}</dd>` : "") + `</dl>` : "")) +
      sec("Como ler", `<p class="help">Faixas oficiais do rio: <b>Normalidade</b> até 3 m · <b>Observação</b> de 3 a 4 m · <b>Atenção</b> de 4 a 6 m · <b>Alerta</b> de 6 a 8 m · <b>Alerta máximo</b> acima de 8 m. Em emergência, ligue <b>199</b> (Defesa Civil).</p>`);
  }

  function tabScreen() {
    const r = P.cfg.get("rest");
    const fully = P.kiosk.isFully();
    return sec("Descanso",
      row("Entrar em descanso depois de", "Tela escura e discreta só com hora, data e próximo compromisso. Toque ou movimento acorda.",
        `<select class="sel" data-bind="rest.idleMin" data-num="1">${[[0, "Nunca"], [2, "2 minutos"], [5, "5 minutos"], [10, "10 minutos"], [20, "20 minutos"], [30, "30 minutos"]].map(([v, l]) => `<option value="${v}" ${r.idleMin === v ? "selected" : ""}>${l}</option>`).join("")}</select>`) +
      row("Manter a tela ligada", "Pede ao navegador para não apagar a tela sozinho (não precisa se usar o Fully Kiosk).", toggle("keepAwake")) +
      row("Brilho no descanso", "Quanto menor, mais escuro.", `<input type="range" min="0.1" max="0.8" step="0.05" value="${r.dim}" data-bind="rest.dim" data-num="1" style="max-width:14em">`) +
      `<div class="btns"><button class="btn" data-act="restNow">Ver o descanso agora</button></div>`) +
      sec("Noite",
        row("Modo noite", "No horário abaixo o painel escurece e entra em descanso depois de 1 minuto sem toque.", toggle("rest.night")) +
        (r.night ? row("Das", "", `<input type="time" class="in" data-bind="rest.nightStart" value="${esc(r.nightStart)}">`) + row("Até", "", `<input type="time" class="in" data-bind="rest.nightEnd" value="${esc(r.nightEnd)}">`) : "")) +
      sec("Tablet com Fully Kiosk",
        (fully ? callout("ok", "✔ <b>Fully Kiosk detectado.</b> O painel acorda quando o tablet vê movimento.") :
          callout("", "Fully Kiosk <b>não detectado</b>. Abra o painel pelo app Fully Kiosk e ligue <b>Configurações Web avançadas → Habilitar interface JavaScript</b> e <b>Detecção de movimento</b>.")) +
        (fully ? row("Apagar a tela do tablet no descanso", "Economiza energia. A tela volta quando o Fully vê movimento (ligue “Ligar a tela ao detectar movimento” no Fully).", toggle("rest.screenOff")) : ""));
  }

  function tabAdv() {
    const ok = P.server.ok;
    return sec("Servidor do painel",
      (ok ? callout("ok", `✔ Conectado em <b>${esc(P.server.base)}</b>`) : callout("bad", "✖ Não encontrado. Sem ele o endereço secreto do Google Agenda não funciona (o navegador bloqueia). O LEIA-ME explica como colocar no ar em 5 minutos, de graça.")) +
      row("Endereço (se for diferente deste site)", "Ex.: https://painel.seunome.workers.dev", input("proxy", "https://…", `data-after="detect"`), "col") +
      `<div class="btns"><button class="btn" data-act="detect">Procurar de novo</button></div>`) +
      sec("Copiar configurações para outro aparelho",
        `<p class="help">Gera um código com todas as suas configurações (inclui o endereço secreto da agenda — não compartilhe). Cole no outro aparelho em “Aplicar”.</p>` +
        `<textarea class="in" id="codeBox" rows="3" placeholder="Cole aqui um código para aplicar"></textarea>` +
        `<div class="btns"><button class="btn" data-act="copyCode">${P.ui("clipboard-copy")} Gerar e copiar</button><button class="btn primary" data-act="applyCode">${P.ui("download")} Aplicar</button></div>`) +
      sec("Manutenção",
        `<div class="btns"><button class="btn" data-act="reload">${P.ui("refresh-cw")} Recarregar o painel</button><button class="btn danger" data-act="reset">Voltar ao padrão</button></div>`) +
      sec("Sobre", `<p class="help">Painel ${P.VERSION}${P.build ? ` (publicação ${esc(P.build)})` : ""}. Versões novas entram sozinhas, quando o painel está em descanso. Previsão: Open-Meteo. Rio: AlertaBLU / Defesa Civil de Blumenau. Ícones de tempo: Meteocons (MIT). Ícones: Lucide (ISC). Fontes: Fraunces, Atkinson Hyperlegible Next, Lexend, Literata (OFL).</p>`);
  }

  const BUILD = { look: tabLook, city: tabCity, agenda: tabAgenda, rem: tabRem, river: tabRiver, screen: tabScreen, adv: tabAdv };

  /* ---------- desenhar ---------- */
  function render() {
    nav.innerHTML = TABS.map(t => `<button class="${t.id === tab ? "on" : ""}" data-tab="${t.id}">${P.ui(t.icon)}<span>${t.label}</span></button>`).join("");
    const st = main.scrollTop;
    main.innerHTML = BUILD[tab]();
    main.scrollTop = st;
  }

  function toast(msg) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600);
  }
  P.toast = toast;

  /* ---------- ações ---------- */
  async function citySearch() {
    const q = (U.$("#citySearch").value || "").trim();
    const box = U.$("#cityResults");
    if (q.length < 2) { box.innerHTML = ""; return; }
    box.innerHTML = `<p class="help" style="margin-top:.8em">Procurando…</p>`;
    try {
      const r = await U.fetchT(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=pt&format=json`, {}, 12000);
      const j = await r.json();
      const res = j.results || [];
      testBox.city = res.length
        ? res.map((c, i) => `<button class="it" data-act="pickCity" data-c="${esc(JSON.stringify({ name: c.name, region: [c.admin1, c.country].filter(Boolean).join(", "), lat: c.latitude, lon: c.longitude, tz: c.timezone }))}"><span><b>${esc(c.name)}</b> <small>${esc([c.admin1, c.country].filter(Boolean).join(", "))}</small></span>${P.ui("chevron-right")}</button>`).join("")
        : `<p class="help" style="margin-top:.8em">Nenhuma cidade encontrada.</p>`;
    } catch (e) { testBox.city = `<p class="help" style="margin-top:.8em">Sem internet para buscar agora.</p>`; }
    box.innerHTML = testBox.city;
  }

  /** grava na hora o que estiver nos campos de texto (evita testar com o valor antigo) */
  function flushInputs() {
    U.$$("[data-bind]", main).forEach(el => {
      if (el.type === "range" || el.tagName === "SELECT" || el.type === "time") return;
      const path = el.dataset.bind; let v = el.value;
      if (el.dataset.num) { v = parseFloat(String(v).replace(",", ".")); if (isNaN(v)) v = 0; }
      if (typeof v === "string") v = v.trim();
      if (P.cfg.get(path) !== v) { P.cfg.set(path, v, true); }
    });
  }

  async function runTest(kind) {
    flushInputs();
    const box = U.$(kind === "cal" ? "#calTest" : "#riverTest");
    box.innerHTML = callout("", "Testando…");
    try {
      if (kind === "cal") {
        const evs = await P.cal.fetchRaw();
        const until = U.addDays(U.startOfDay(new Date()), P.cfg.get("calendar.daysAhead"));
        const next = evs.filter(e => e.end > new Date() && e.start < until).sort((a, b) => a.start - b.start).slice(0, 4);
        testBox.cal = next.length
          ? callout("ok", `✔ <b>Funcionou!</b> Achei ${next.length === 1 ? "1 compromisso" : "compromissos"} nos próximos ${P.cfg.get("calendar.daysAhead")} dias:<br>` +
              next.map(e => `${esc(U.dayLabel(e.start))} ${e.allDay ? "" : U.fmtTime(e.start)} — ${esc(e.title)}`).join("<br>"))
          : callout("ok", `✔ <b>A agenda está ligada e foi lida.</b> Mas não há nenhum compromisso marcado nos próximos ${P.cfg.get("calendar.daysAhead")} dias, por isso o painel mostra “Nada marcado”. Crie um evento para amanhã e toque em <b>Testar agora</b> de novo.`);
        P.cal.refresh();
      } else {
        await Promise.all([P.river.refresh(), P.alerts.refresh()]);
        testBox.river = P.data.err.river ? callout("bad", "✖ Não consegui ler o nível do rio agora.") : callout("ok", "✔ Nível do rio atualizado.");
      }
    } catch (e) { testBox[kind] = callout("bad", "✖ " + esc(e.message || "Não funcionou")); }
    const b = U.$(kind === "cal" ? "#calTest" : "#riverTest"); if (b) b.innerHTML = testBox[kind];
    if (kind === "river") render();
  }

  function onClick(e) {
    const t = e.target;
    const tabBtn = t.closest("[data-tab]");
    if (tabBtn) { tab = tabBtn.dataset.tab; render(); main.scrollTop = 0; return; }

    const set = t.closest("[data-set]");
    if (set) { P.cfg.set(set.dataset.set, JSON.parse(set.dataset.val)); render(); afterSet(set.dataset.set); return; }
    const tg = t.closest("[data-toggle]");
    if (tg) { const p = tg.dataset.toggle; P.cfg.set(p, !P.cfg.get(p)); render(); afterSet(p); return; }

    const a = t.closest("[data-act]");
    if (!a) return;
    const act = a.dataset.act;
    if (act === "close") close();
    else if (act === "citySearch") citySearch();
    else if (act === "pickCity") {
      const c = JSON.parse(a.dataset.c);
      P.cfg.set("city", c); testBox.city = "";
      if (!P.river.isNear() && P.cfg.get("river.show")) { P.cfg.set("river.show", false); toast("Nível do rio desligado (só vale para Blumenau)"); }
      else toast("Cidade: " + c.name);
      P.weather.refresh(); render();
    }
    else if (act === "testCal") runTest("cal");
    else if (act === "testRiver") runTest("river");
    else if (act === "remAdd") { const l = P.cfg.get("reminders").slice(); l.push({ id: U.uid(), time: "08:00", text: "", days: [0, 1, 2, 3, 4, 5, 6] }); P.cfg.set("reminders", l); render(); }
    else if (act === "remDel") { const l = P.cfg.get("reminders").slice(); l.splice(+a.dataset.i, 1); P.cfg.set("reminders", l); render(); }
    else if (act === "remDay") {
      const l = JSON.parse(JSON.stringify(P.cfg.get("reminders"))), r = l[+a.dataset.i], d = +a.dataset.d;
      r.days = (r.days || []).includes(d) ? r.days.filter(x => x !== d) : r.days.concat(d);
      P.cfg.set("reminders", l); render();
    }
    else if (act === "restNow") { close(); setTimeout(() => P.kiosk.restNow(), 500); }
    else if (act === "detect") { P.server.detect().then(() => { render(); P.cal.refresh(); P.river.refresh(); }); }
    else if (act === "copyCode") {
      const code = P.cfg.exportCode(); U.$("#codeBox").value = code;
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => toast("Código copiado"), () => { U.$("#codeBox").select(); toast("Selecione e copie o código"); });
    }
    else if (act === "applyCode") {
      try { P.cfg.importCode(U.$("#codeBox").value); toast("Configurações aplicadas"); render(); P.weather.refresh(); P.cal.refresh(); P.river.refresh(); }
      catch (err) { toast("Código inválido"); }
    }
    else if (act === "reload") location.reload();
    else if (act === "reset") { if (confirm("Voltar todas as configurações ao padrão?")) { P.cfg.reset(); render(); P.weather.refresh(); P.cal.refresh(); } }
  }

  /** reações depois de mudar certas opções */
  function afterSet(path) {
    if (/^calendar\.(mode|daysAhead)/.test(path)) P.cal.refresh();
    if (path === "river.show" && P.cfg.get("river.show")) P.river.refresh();
    if (path === "alerts.show") P.alerts.refresh();
    if (path === "calendar.mode") testBox.cal = "";
  }

  const saveText = U.debounce((el) => {
    const path = el.dataset.bind;
    let v = el.value;
    if (el.dataset.num) { v = parseFloat(String(v).replace(",", ".")); if (isNaN(v)) v = 0; }
    P.cfg.set(path, v);
    afterSet(path);
    if (el.dataset.after === "detect") P.server.detect().then(() => { P.cal.refresh(); P.river.refresh(); });
  }, 450);

  function onInput(e) {
    const el = e.target;
    if (el.dataset.bind) { if (el.type === "range" || el.tagName === "SELECT" || el.type === "time") { saveNow(el); } else saveText(el); return; }
    if (el.dataset.rem) {
      const i = +el.closest(".rem").dataset.i;
      const l = JSON.parse(JSON.stringify(P.cfg.get("reminders")));
      l[i][el.dataset.rem] = el.value;
      P.cfg.set("reminders", l);
    }
  }
  function saveNow(el) { const path = el.dataset.bind; let v = el.value; if (el.dataset.num) { v = parseFloat(v); if (isNaN(v)) v = 0; } P.cfg.set(path, v); afterSet(path); if (path === "alerts.bairro") render(); }

  /* ---------- abrir / fechar ---------- */
  function open(which) {
    if (which && BUILD[which]) tab = which;
    if (opened) { render(); return; }
    opened = true; P.kiosk.wake();
    render();
    root.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("on")));
    P.server.detect().then(() => { if (opened && (tab === "agenda" || tab === "adv")) render(); });
  }
  function close() {
    if (!opened) return;
    opened = false;
    root.classList.remove("on");
    setTimeout(() => { if (!opened) root.hidden = true; }, 420);
    if (/^#config/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
    P.cal.refresh(); P.river.refresh();
  }

  P.settings = {
    isOpen: () => opened, open, close,
    init() {
      root = document.getElementById("settings");
      root.innerHTML =
        `<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-label="Configurações">` +
        `<div class="sh-head"><div><h2>Configurações</h2><div class="sub">As mudanças valem na hora</div></div><button class="btn primary big" data-act="close">${P.ui("check")} Concluir</button></div>` +
        `<div class="sh-body"><nav class="sh-nav"></nav><div class="sh-main"></div></div></div>`;
      main = U.$(".sh-main", root); nav = U.$(".sh-nav", root);
      root.addEventListener("click", onClick);
      root.addEventListener("input", onInput);
      root.addEventListener("paste", () => setTimeout(flushInputs, 0));
      root.addEventListener("focusout", flushInputs);
      root.addEventListener("change", onInput);
      root.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.id === "citySearch") citySearch(); if (e.key === "Escape") close(); });
    },
  };
})();
