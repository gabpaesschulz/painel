/* Tela principal: relógio, tempo, agenda, rio. */
(function () {
  "use strict";
  const P = window.P, U = P.util, $ = U.$;
  const html = document.documentElement;
  const el = {};
  const round = n => Math.round(n);

  function grab() {
    ["app", "greet", "time", "date", "wxNow", "wxHint", "wxMore", "week", "feature", "later", "river", "agendaNote", "status", "wxRule"]
      .forEach(id => { el[id] = document.getElementById(id); });
  }

  /* ---------- aparência (tema, fonte, tamanho…) ---------- */
  function applyLook() {
    const c = P.cfg.all();
    html.dataset.theme = c.theme;
    html.dataset.font = c.font;
    html.dataset.motion = c.motion ? "1" : "0";
    html.dataset.big = c.textScale >= 1.2 ? "1" : "0";
    html.dataset.lite = c.lite ? "1" : "0";
    html.style.setProperty("--ts", c.textScale);
    html.style.setProperty("--rest-dim", c.rest.dim);
    el.app.dataset.side = c.side;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(html).getPropertyValue("--bg").trim() || "#000";
  }

  function skyFor(h) { return h >= 5 && h < 8 ? "dawn" : h >= 8 && h < 17 ? "day" : h >= 17 && h < 20 ? "dusk" : "night"; }
  function isNight(now) {
    const r = P.cfg.get("rest");
    if (!r.night) return false;
    const [sh, sm] = U.parseHM(r.nightStart), [eh, em] = U.parseHM(r.nightEnd);
    const m = now.getHours() * 60 + now.getMinutes(), s = sh * 60 + sm, e = eh * 60 + em;
    return s <= e ? m >= s && m < e : m >= s || m < e;
  }
  P.view = { isNight };

  /* ---------- relógio ---------- */
  let lastTime = "", lastMinute = -1;
  function tick() {
    const now = new Date();
    const c = P.cfg.all();
    let t = U.fmtTime(now);
    if (!c.clock24) t += `<span class="ampm">${now.getHours() < 12 ? "AM" : "PM"}</span>`;
    if (c.showSeconds) t += `<span class="sec">${U.pad(now.getSeconds())}</span>`;
    if (t !== lastTime) { el.time.innerHTML = t; lastTime = t; }
    if (now.getMinutes() !== lastMinute) { lastMinute = now.getMinutes(); minute(now); }
  }
  function minute(now) {
    const h = now.getHours(), c = P.cfg.all();
    const g = h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    el.greet.textContent = c.name ? `${g}, ${c.name}` : g;
    const wd = now.toLocaleDateString("pt-BR", { weekday: "long" });
    el.date.innerHTML = `<b>${U.cap(wd)}</b>, ${now.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`;
    html.dataset.sky = skyFor(h);
    html.dataset.night = isNight(now) ? "1" : "0";
    document.body.dataset.night = html.dataset.night;
    renderAgenda();            // atualiza "daqui a 2 horas", dia da semana, etc.
    renderWeatherPeriods();
    fitSides();
    P.bus.emit("minute", now);
  }

  /* ---------- tempo ---------- */
  function renderWeather() {
    const w = P.data.weather;
    if (!w) { el.wxNow.innerHTML = `<div class="wx-txt skel"><div class="temp">--°</div><div class="desc">Carregando…</div></div>`; el.wxHint.innerHTML = ""; el.wxMore.innerHTML = ""; return; }
    const info = P.wmo(w.now.code, w.now.isDay);
    const feelsDiff = Math.abs(w.now.feels - w.now.temp) >= 3;
    el.wxNow.innerHTML =
      `<div class="wx-ico">${P.wxImg(info.icon)}</div>` +
      `<div class="wx-txt"><div class="temp">${round(w.now.temp)}°</div><div class="desc">${info.text}</div>` +
      `<div class="range"><span class="mx">Máx ${round(w.today.max)}°</span> · <span class="mn">Mín ${round(w.today.min)}°</span></div>` +
      (feelsDiff ? `<div class="feels">Sensação de ${round(w.now.feels)}°</div>` : "") + `</div>`;

    const h = P.cfg.get("hint") ? P.weather.hint(w) : null;
    el.wxHint.innerHTML = h ? `<div class="hint">${P.wxImg(h.icon, "hi")}<span>${U.esc(h.text)}</span></div>` : "";

    if (P.cfg.get("weatherMode") === "periodos") renderWeatherPeriods();
    else renderWeatherDays();
  }

  function renderWeatherDays() {
    const w = P.data.weather; if (!w) return;
    const n = P.cfg.get("forecastDays");
    el.wxMore.innerHTML = w.days.slice(0, n).map((d, i) => {
      const dt = new Date(d.date + "T12:00");
      const name = i === 0 ? "Amanhã" : dt.toLocaleDateString("pt-BR", { weekday: "long" }).replace("-feira", "");
      const info = P.wmo(d.code, true);
      return `<div class="day"><div class="who">${name}<small>${d.pop >= 30 ? "Chuva: " + d.pop + "%" : info.text}</small></div>` +
        P.wxImg(info.icon, "wi di") +
        `<div class="mm"><div class="mx">Máx ${round(d.max)}°</div><div class="mn">Mín ${round(d.min)}°</div></div></div>`;
    }).join("");
    fit(el.wxMore);
  }

  function renderWeatherPeriods() {
    const w = P.data.weather;
    if (!w || P.cfg.get("weatherMode") !== "periodos") return;
    const h = new Date().getHours();
    el.wxMore.innerHTML = `<div class="periods">` + w.periods.map(p => {
      const cls = h >= p.from && h <= p.to ? "now" : h > p.to ? "past" : "";
      const info = P.wmo(p.code, p.id !== "noite");
      return `<div class="period ${cls}"><div class="pl">${p.label}</div>${P.wxImg(info.icon, "wi pi")}` +
        `<div class="pt">${round(p.temp)}°</div><div class="pr">${p.pop >= 30 ? "Chuva " + p.pop + "%" : "&nbsp;"}</div></div>`;
    }).join("") + `</div>`;
  }

  /** Remove itens que não cabem (telas menores / letras maiores) em vez de cortar no meio */
  function fit(box) {
    let guard = 12;
    while (box.scrollHeight > box.clientHeight + 1 && box.children.length > 1 && guard--) box.removeChild(box.lastElementChild);
  }

  /** Prioridade quando falta espaço (tela pequena ou letras grandes).
      1) esconde o menos importante até caber; 2) tenta devolver o que couber, do mais para o menos importante.
      Nunca somem: relógio, tempo agora e próximo compromisso. O rio só some em último caso. */
  function fitSides() {
    const sides = [
      [document.querySelector(".side-b"), [el.agendaNote, el.later, el.week, el.river]],   // do menos ao mais importante
      [document.querySelector(".side-a"), [el.wxMore, el.wxHint]],
    ];
    const over = side => side.scrollHeight > side.clientHeight + 1;
    for (const [side, order] of sides) {
      order.forEach(n => { if (n) n.classList.remove("squeezed"); });
      for (const n of order) {
        if (!n || n.hidden) continue;
        if (over(side) || (n === el.wxMore && n.scrollHeight > n.clientHeight + 1)) n.classList.add("squeezed");
      }
      // devolve o que couber (do mais importante para o menos)
      for (const n of order.slice().reverse()) {
        if (!n || n.hidden || !n.classList.contains("squeezed")) continue;
        n.classList.remove("squeezed");
        if (n === el.later) fit(el.later);
        const clipped = (n === el.later || n === el.wxMore) && n.scrollHeight > n.clientHeight + 1;
        if (over(side) || clipped) n.classList.add("squeezed");
      }
    }
  }

  /* ---------- agenda ---------- */
  function countdown(ev) {
    const now = new Date();
    if (ev.start <= now) return "Acontecendo agora";
    const min = Math.round((ev.start - now) / 60000);
    if (min < 60) return `Daqui a ${min} ${min === 1 ? "minuto" : "minutos"}`;
    if (U.sameDay(ev.start, now)) { const h = Math.round(min / 60); return `Daqui a ${h} ${h === 1 ? "hora" : "horas"}`; }
    return "";
  }

  function renderWeek() {
    const counts = P.cal.countsByDay(7), base = U.startOfDay(new Date());
    el.week.innerHTML = Array.from({ length: 7 }, (_, i) => {
      const d = U.addDays(base, i);
      const n = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      return `<div class="wd ${i === 0 ? "today" : ""}"><div class="n">${n}</div><div class="d">${d.getDate()}</div>` +
        `<div class="dots">${"<i></i>".repeat(Math.min(3, counts[i] || 0))}</div></div>`;
    }).join("");
  }

  function renderAgenda() {
    if (!el.feature) return;
    const list = P.cal.upcoming();
    const cd = P.data.calendar;
    el.agendaNote.textContent = cd && cd.sample ? "exemplos · agenda não ligada" : "";
    renderWeek();

    const first = list[0];
    if (!first) {
      el.feature.classList.remove("now-on");
      el.feature.innerHTML = `<div class="empty">Nada marcado<small>Nenhum compromisso nos próximos dias</small></div>`;
      el.later.innerHTML = "";
      return;
    }
    const isNow = first.start <= new Date() && !first.allDay;
    el.feature.classList.toggle("now-on", isNow);
    const time = first.allDay ? `<div class="ft allday">O dia<br>todo</div>` : `<div class="ft">${U.fmtTime(first.start, true)}</div>`;
    const c = countdown(first);
    el.feature.innerHTML = time +
      `<div class="fb"><div class="fl">${first.kind === "reminder" ? "Lembrete" : html.dataset.big === "1" ? "Próximo" : "Próximo compromisso"}</div>` +
      `<div class="fn">${U.esc(first.title)}</div>` +
      (first.loc ? `<div class="floc">${U.esc(first.loc)}</div>` : "") +
      `<div class="fs">${U.dayLabel(first.start)}${c ? " · " + c : ""}</div></div>`;

    const rest = list.slice(1, 1 + P.cfg.get("calendar.laterCount"));
    el.later.innerHTML = rest.map(ev =>
      `<div class="row"><span class="d">${U.dayLabel(ev.start, true)}</span>` +
      `<span class="t">${ev.allDay ? "Dia todo" : U.fmtTime(ev.start)}</span>` +
      `<span class="n">${ev.kind === "reminder" ? P.ui("bell", "bell") : ""}${U.esc(ev.title)}</span></div>`).join("");
    fit(el.later);
  }

  /* ---------- rio ---------- */
  function renderRiver() {
    const show = P.cfg.get("river.show");
    el.river.hidden = !show;
    if (!show) return;
    const r = P.data.river;
    if (!r) {
      el.river.innerHTML = `<div class="rh"><span class="kicker">Rio Itajaí-Açu · Blumenau</span><span class="stamp">${P.data.err.river ? "Sem dados" : "Carregando…"}</span></div>`;
      return;
    }
    const MAX = 9;
    const zones = r.conds.map((c, i) => {
      const end = i + 1 < r.conds.length ? r.conds[i + 1].level : MAX;
      return `<i style="width:${((end - c.level) / MAX) * 100}%;background:${c.bg}"></i>`;
    }).join("");
    const ticks = r.conds.map(c => `<span style="left:${(c.level / MAX) * 100}%">${c.level}</span>`).join("");
    const when = new Date(r.last), ageH = (Date.now() - when) / 3600000;
    const trend = r.trend === "up" ? ["▲ Subindo", "var(--hot)"] : r.trend === "down" ? ["▼ Descendo", "var(--cold)"] : ["● Estável", "var(--soft)"];
    el.river.classList.toggle("alert", r.cond.level >= 4);
    el.river.innerHTML =
      `<div class="rh"><span class="kicker">Rio Itajaí-Açu · Blumenau</span>` +
      `<span class="stamp">${ageH > 3 ? "⚠ Dado antigo · " : "Leitura das "}${U.fmtTime(when)}</span></div>` +
      `<div class="rb"><div><div class="rv">${r.level.toFixed(2).replace(".", ",")}<small>metros</small></div>` +
      `<div class="tr" style="color:${trend[1]}">${trend[0]}</div></div>` +
      `<div><div class="badge" style="background:${r.cond.bg};color:${r.cond.fg}">${U.esc(r.cond.name)}</div>` +
      `<div class="gauge"><div class="zones">${zones}</div><div class="mark" style="left:${Math.min(r.level / MAX, 1) * 100}%"></div></div>` +
      `<div class="ticks">${ticks}</div></div></div>`;
  }

  /* ---------- aviso de conexão ---------- */
  function renderStatus() {
    const msgs = [];
    const w = P.data.weather;
    if (P.data.err.weather && (!w || Date.now() - w.at > 30 * 60000)) msgs.push("Tempo sem atualizar");
    if (P.cfg.get("river.show") && P.data.err.river) msgs.push("Sem dados do rio");
    if (P.cfg.get("calendar.mode") !== "demo" && P.data.err.calendar) msgs.push("Agenda sem atualizar");
    el.status.hidden = !msgs.length;
    if (msgs.length) el.status.innerHTML = P.ui("wifi-off") + `<span>${U.esc(msgs.join(" · "))}</span>`;
  }

  function renderAll() {
    applyLook();
    lastTime = ""; lastMinute = -1;
    tick();
    renderWeather(); renderRiver(); renderAgenda(); renderStatus();
    fitSides();
  }

  P.view.init = function () {
    grab();
    P.bus.on("cfg", () => renderAll());
    P.bus.on("data", which => {
      if (which === "weather") renderWeather();
      if (which === "river") renderRiver();
      if (which === "calendar") renderAgenda();
      renderStatus();
    });
    renderAll();
    setInterval(tick, 1000);
    // depois que as fontes carregam, as alturas mudam: refaz o ajuste de espaço
    const refit = U.debounce(() => { renderWeather(); renderAgenda(); fitSides(); }, 120);
    if (document.fonts) { document.fonts.addEventListener("loadingdone", refit); document.fonts.ready.then(refit); }
    window.addEventListener("load", refit);
    window.addEventListener("resize", U.debounce(() => { renderWeather(); renderAgenda(); fitSides(); }, 250));
  };
  P.view.renderAll = renderAll;
  P.view.fitSides = fitSides;
})();
