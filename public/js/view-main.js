/* Tela principal: hora e tempo (lado "agora"), semana, agenda e rio/Defesa Civil (lado "agenda"). */
(function () {
  "use strict";
  const P = window.P, U = P.util;
  const html = document.documentElement;
  const el = {};
  const r0 = n => Math.round(n);
  const N = s => `<span class="num">${s}</span>`;                       // número na fonte de números

  function grab() {
    ["app", "sideA", "sideB", "greet", "time", "date", "todayHoliday", "wxNow", "wxHint", "aheadRule", "wxAhead",
      "week", "agenda", "safety", "agendaNote", "status"].forEach(id => { el[id] = document.getElementById(id); });
  }

  /* ---------- aparência ---------- */
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

  /* ---------- céu: a luz da tela segue o sol de verdade (nascer e pôr do sol da previsão) ---------- */
  const hm = (s, dflt) => { const m = /T(\d\d):(\d\d)/.exec(s || ""); return m ? +m[1] * 60 + +m[2] : dflt; };
  const wxKind = c => (c >= 95 ? "storm" : P.isRainy(c) ? "rain" : c >= 3 ? "cloud" : "clear");
  let skyAt = -1;
  function updateSky(now, force) {
    const m = now.getHours() * 60 + now.getMinutes();
    if (!force && skyAt >= 0 && Math.abs(m - skyAt) < 5) return;       // o sol anda devagar: mexe a cada 5 min
    const first = skyAt < 0;
    skyAt = m;
    const w = P.data.weather, today = P.weather.day(w, now) || {};
    const rise = hm(today.rise, 360), set = hm(today.set, 1080);         // sem previsão: 6 h e 18 h
    // aurora: da hora antes à hora depois do nascer · dourado: a hora antes do pôr · crepúsculo: a hora depois
    html.dataset.sky = m < rise - 60 || m >= set + 60 ? "night" : m < rise + 60 ? "dawn" : m < set - 60 ? "day" : m < set ? "golden" : "dusk";
    // nasce à esquerda, passa alto ao meio-dia e se põe à direita; de noite a lua faz o mesmo caminho, mais fraca
    const p = m >= rise && m <= set ? (m - rise) / (set - rise) : ((m - set + 1440) % 1440) / (1440 - (set - rise));
    html.style.setProperty("--sx", (6 + p * 88).toFixed(1));
    html.style.setProperty("--sy", (80 - Math.sin(Math.PI * p) * 72).toFixed(1));
    html.dataset.wx = w ? wxKind(w.now.code) : "clear";
    // ao abrir (ou redesenhar), o sol já aparece no lugar, sem atravessar a tela
    const sun = document.querySelector("#sky .sun");
    if (first && sun) { sun.style.transition = "none"; requestAnimationFrame(() => requestAnimationFrame(() => { sun.style.transition = ""; })); }
  }

  function isNight(now) {
    const r = P.cfg.get("rest");
    if (!r.night) return false;
    const [sh, sm] = U.parseHM(r.nightStart), [eh, em] = U.parseHM(r.nightEnd);
    const m = now.getHours() * 60 + now.getMinutes(), s = sh * 60 + sm, e = eh * 60 + em;
    return s <= e ? m >= s && m < e : m >= s || m < e;
  }

  /** "Quinta-feira, 22 de outubro" / "Hoje" / "Amanhã" */
  function longDay(d) {
    const diff = U.dayDiff(d);
    if (diff === 0) return "Hoje";
    if (diff === 1) return "Amanhã";
    return U.cap(d.toLocaleDateString("pt-BR", { weekday: "long" })) + ", " + d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  }
  /** hora com os dois-pontos mais leves e um pouco erguidos (como nos relógios bem desenhados) */
  function clockHTML(d) {
    const t = U.fmtTime(d);
    const [h, m] = t.split(":");
    return `${h}<span class="colon">:</span>${m}`;
  }
  P.view = { isNight, clockHTML, longDay };

  /* =====================================================================
     RELÓGIO
     ===================================================================== */
  let lastTime = "", lastMinute = -1, lastClock = "";
  function tick() {
    const now = new Date(), c = P.cfg.all();
    const clock = U.fmtTime(now);
    let extra = "";
    if (!c.clock24) extra += `<span class="ampm">${now.getHours() < 12 ? "AM" : "PM"}</span>`;
    if (c.showSeconds) extra += `<span class="sec">${U.pad(now.getSeconds())}</span>`;
    if (clock + extra !== lastTime) {
      // o algarismo novo entra devagar, de cima (uma vez por minuto; nada pisca)
      const roll = c.motion && !c.lite && lastClock.length === clock.length;
      el.time.innerHTML = [...clock].map((ch, i) => ch === ":" ? `<span class="colon">:</span>`
        : `<span class="dg${roll && lastClock[i] !== ch ? " roll" : ""}">${ch}</span>`).join("") + extra;
      lastTime = clock + extra; lastClock = clock;
    }
    if (now.getMinutes() !== lastMinute) { lastMinute = now.getMinutes(); minute(now); }
  }
  function minute(now) {
    const h = now.getHours(), c = P.cfg.all();
    const g = h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    el.greet.textContent = c.name ? `${g}, ${c.name}` : g;
    el.date.innerHTML = `<b>${U.cap(now.toLocaleDateString("pt-BR", { weekday: "long" }))}</b>, ${U.nums(now.toLocaleDateString("pt-BR", { day: "numeric", month: "long" }))}`;
    const hol = P.holidays(U.startOfDay(now), U.addDays(U.startOfDay(now), 1))[0];
    el.todayHoliday.hidden = !hol;
    if (hol) el.todayHoliday.innerHTML = P.ui("star") + `<span>Feriado: ${U.esc(hol.title)}</span>`;
    updateSky(now);
    html.dataset.night = isNight(now) ? "1" : "0";
    renderAhead(); renderSafety();
    layout();
    P.bus.emit("minute", now);
  }

  /* =====================================================================
     TEMPO
     ===================================================================== */
  function renderNow() {
    const w = P.data.weather;
    if (!w) {
      el.wxNow.className = "now loading";
      el.wxNow.innerHTML = `<div class="ico"></div><div class="temp disp">--°</div><div class="wxd"><div class="desc">Buscando a previsão…</div></div>`;
      el.wxHint.innerHTML = "";
      return;
    }
    el.wxNow.className = "now";
    const info = P.wmo(w.now.code, w.now.isDay), today = P.weather.day(w, new Date());
    const feels = Math.abs(w.now.feels - w.now.temp) >= 3 ? `<div class="feels">Sensação ${N(r0(w.now.feels) + "°")}</div>` : "";
    const range = today ? `<div class="range"><span class="mx">Máx ${N(r0(today.max) + "°")}</span><span class="mn">Mín ${N(r0(today.min) + "°")}</span></div>` : "";
    el.wxNow.innerHTML =
      `<div class="ico">${P.wxImg(info.icon)}</div>` +
      `<div class="temp disp">${r0(w.now.temp)}°</div><div class="wxd"><div class="desc">${info.text}</div>${range}${feels}</div>`;
    const h = P.cfg.get("hint") ? P.weather.hint(w) : null;
    el.wxHint.innerHTML = h ? `<div class="hint ${h.ui ? "calm" : ""}">${h.ui ? P.ui(h.ui, "hu") : P.wxImg(h.icon, "hi")}<span>${U.nums(h.text)}</span></div>` : "";
  }

  function renderAhead() {
    const w = P.data.weather;
    if (!w) { el.wxAhead.innerHTML = ""; return; }
    if (P.cfg.get("weatherMode") === "dias") {
      const list = [];
      for (let i = 1; i <= P.cfg.get("forecastDays"); i++) { const d = P.weather.day(w, U.addDays(new Date(), i)); if (d) list.push(d); }
      el.aheadRule.hidden = !list.length;
      el.wxAhead.innerHTML = `<div class="days">` + list.map((d, i) => {
        const dt = new Date(d.date + "T12:00"), info = P.wmo(d.code, true);
        const name = i === 0 ? "Amanhã" : dt.toLocaleDateString("pt-BR", { weekday: "long" }).replace("-feira", "");
        return `<div class="dayrow"><div class="who">${name}<small>${d.pop >= 30 ? "Chuva: " + N(d.pop + "%") : info.text}</small></div>` +
          P.wxImg(info.icon, "wi di") +
          `<div class="mm"><div class="mx">Máx ${N(r0(d.max) + "°")}</div><div class="mn">Mín ${N(r0(d.min) + "°")}</div></div></div>`;
      }).join("") + `</div>`;
      return;
    }
    const per = P.weather.periods(w, 4);
    el.aheadRule.hidden = !per.length;
    el.wxAhead.innerHTML = `<div class="tiles">` + per.map(p => {
      const info = P.wmo(p.code, !p.night);
      const rain = p.pop >= 20 ? P.ui("droplet") + N(p.pop + "%") : "";
      return `<div class="tile ${p.isNow ? "is-now" : ""}"><div class="k">${p.kicker}</div><div class="l">${p.label}</div>` +
        P.wxImg(info.icon, "wi ti") + `<div class="tt disp">${r0(p.temp)}°</div><div class="tr">${rain}</div></div>`;
    }).join("") + `</div>`;
  }

  /* =====================================================================
     SEMANA
     ===================================================================== */
  let selDay = 0, selTimer = null;            // 0 = hoje (visão normal); 1..6 = dia escolhido
  function selectDay(i) {
    selDay = i === selDay ? 0 : i;
    clearTimeout(selTimer);
    if (selDay) selTimer = setTimeout(() => { selDay = 0; layout(); }, 45000);
    layout();
  }
  P.view.resetDay = () => { if (selDay) { selDay = 0; clearTimeout(selTimer); layout(); } };

  function renderWeek() {
    const info = P.cal.byDay(7), base = U.startOfDay(new Date()), w = P.data.weather;
    const showWx = P.cfg.get("weekWeather") && w;
    el.week.classList.toggle("no-wx", !showWx);
    el.week.innerHTML = info.map((d, i) => {
      const day = U.addDays(base, i);
      const wd = P.weather.day(w, day);
      const wx = showWx && wd ? P.wxImg(P.wmo(wd.code, true).icon) + N(r0(wd.max) + "°") : "";
      const marks = (d.holiday ? P.ui("star") : "") + "<i></i>".repeat(Math.min(3, d.count));
      const label = day.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) +
        (d.count ? `, ${d.count} compromisso${d.count > 1 ? "s" : ""}` : "") + (d.holiday ? `, feriado: ${d.holiday}` : "");
      return `<button class="wd ${i === 0 ? "today" : ""} ${i === selDay && i > 0 ? "sel" : ""}" data-i="${i}" aria-label="${U.esc(label)}">` +
        `<span class="n">${day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</span>` +
        `<span class="d disp">${day.getDate()}</span><span class="wx">${wx}</span><span class="marks">${marks}</span></button>`;
    }).join("");
  }

  /* =====================================================================
     AGENDA
     ===================================================================== */
  function countdown(ev) {
    const now = new Date();
    if (ev.allDay) {                                  // "Dia todo" já diz tudo; o que dura vários dias diz até quando
      const lastDay = new Date(ev.end.getTime() - 1);
      if (ev.start > now || U.sameDay(lastDay, now)) return "";
      return "até " + (U.dayDiff(lastDay) === 1 ? "amanhã" : lastDay.toLocaleDateString("pt-BR", { weekday: "long" }));
    }
    if (ev.start <= now) return ev.end - ev.start >= 20 * 60000 ? `acontecendo agora, até ${U.fmtTime(ev.end)}` : "acontecendo agora";
    const min = Math.round((ev.start - now) / 60000);
    if (min < 60) return `daqui a ${min} ${min === 1 ? "minuto" : "minutos"}`;
    if (U.sameDay(ev.start, now)) { const h = Math.round(min / 60); return `daqui a ${h} ${h === 1 ? "hora" : "horas"}`; }
    return "";
  }
  /** Dia a mostrar: o que já começou (uma viagem desde ontem) aparece como hoje, não com a data de ontem */
  const shownDay = e => (e.start < U.startOfDay(new Date()) ? new Date() : e.start);
  P.view.shownDay = shownDay;
  const evIcon = e =>(e.kind === "reminder" ? P.ui("bell") : e.kind === "holiday" ? P.ui("star") : "");
  const evTime = e => (e.kind === "holiday" ? `<span class="hol">${P.ui("star")}</span>` : e.allDay ? "Dia todo" : N(U.fmtTime(e.start)));
  const evName = e => (e.kind === "holiday" ? `${U.esc(e.title)} <small>· feriado</small>` : evIcon(e) + U.esc(e.title));

  function renderAgenda() {
    if (!el.agenda) return;
    renderWeek();
    const cd = P.data.calendar;
    el.agendaNote.textContent = cd && cd.sample ? "exemplos · agenda não ligada" : "";
    el.agenda.classList.remove("now-on");
    if (selDay > 0) { renderDay(); return; }

    const all = P.cal.upcoming();
    const first = all.find(e => e.kind !== "holiday");
    if (!first) { renderEmpty(all); return; }

    const isNow = first.start <= new Date() && !first.allDay;
    el.agenda.classList.toggle("now-on", isNow);
    const freeToday = U.dayDiff(first.start) > 0 && !all.some(e => U.dayDiff(e.start) <= 0 && e.kind !== "holiday");
    const label = first.kind === "reminder" ? "Lembrete" : isNow ? "Agora" :
      freeToday ? "Hoje está livre · próximo" : html.dataset.big === "1" ? "Próximo" : "Próximo compromisso";
    const cdown = countdown(first);
    const time = first.allDay ? `<div class="ft allday disp">Dia<br>todo</div>` : `<div class="ft disp">${U.fmtTime(first.start, true)}</div>`;
    // o feriado de hoje já aparece embaixo da data; não repete na lista
    const rest = all.filter(e => e !== first && !(e.kind === "holiday" && U.dayDiff(e.start) <= 0)).slice(0, Math.max(P.cfg.get("calendar.laterCount"), 2) + 2);
    el.agenda.innerHTML =
      `<div class="feat">${time}<div class="fb"><div class="fl">${label}</div>` +
      `<div class="fn">${U.esc(first.title)}</div>` + (first.loc ? `<div class="floc">${U.esc(first.loc)}</div>` : "") +
      // acontecendo agora: o "Agora" do rótulo já diz o dia; fica só o selo com até quando
      `<div class="fs">${isNow && cdown ? "" : `<span>${U.nums(longDay(shownDay(first)))}</span>`}${cdown ? `<span class="cd">${U.nums(cdown)}</span>` : ""}</div></div></div>` +
      `<div class="list">` + (rest.length
        ? rest.map(e => `<div class="row ${e.kind === "holiday" ? "holiday" : ""}"><span class="d">${U.nums(U.dayLabel(shownDay(e), true))}</span>` +
            `<span class="t">${evTime(e)}</span><span class="n">${evName(e)}</span></div>`).join("")
        : P.cal.stale()
          ? `<div class="list-end">${P.ui("wifi-off")}<span>Agenda sem atualizar: pode faltar compromisso</span></div>`
          : `<div class="list-end">${P.ui("calendar-check")}<span>Nada mais marcado nos próximos ${N(P.cfg.get("calendar.daysAhead"))} dias</span></div>`) +
      `</div>`;
  }

  /** Estado vazio: diz o quê, por quê e o que fazer */
  function renderEmpty(all) {
    // sem conseguir ler a agenda, "semana livre" seria uma calma falsa
    if (P.cal.stale()) {
      const okAt = P.data.calendar.okAt;
      el.agenda.innerHTML =
        `<div class="empty"><div class="big disp">Agenda sem atualizar</div>` +
        `<div class="sub">Não consigo ler o Google Agenda${okAt ? " (última leitura " + U.nums(U.stamp(new Date(okAt))) + ")" : ""}. Pode haver compromissos que não aparecem aqui.</div>` +
        `<div class="tip">${P.ui("wifi-off")}<span>Confira a internet do tablet. Se continuar assim, avise quem cuida do painel.</span></div></div>`;
      return;
    }
    const days = P.cfg.get("calendar.daysAhead");
    const mode = P.cfg.get("calendar.mode");
    const hol = all.find(e => e.kind === "holiday");
    const tip = mode === "demo"
      ? `Para ver a sua agenda aqui, ligue o <b>Google Agenda</b> nas configurações.`
      : `Para marcar um compromisso, diga: <b>“Alexa, adicione dentista na quinta às 9 horas”</b>.`;
    el.agenda.innerHTML =
      `<div class="empty"><div class="big disp">${days >= 7 ? "Semana livre" : "Dias livres"}</div>` +
      `<div class="sub">Nenhum compromisso nos próximos ${N(days)} dias.</div>` +
      (hol ? `<div class="next"><span class="k">Feriado</span><span>${U.nums(longDay(hol.start))} · ${U.esc(hol.title)}</span></div>` : "") +
      `<div class="tip">${P.ui("info")}<span>${tip}</span></div></div>`;
  }

  /** Um dia escolhido na faixa da semana */
  function renderDay() {
    const base = U.startOfDay(new Date()), day = U.addDays(base, selDay), next = U.addDays(day, 1);
    const evs = P.cal.upcoming(8).filter(e => e.start < next && e.end > day);
    const w = P.data.weather, wd = P.weather.day(w, day);
    const wx = wd ? `<div class="dh-wx"><div class="mm"><div class="mx">Máx ${N(r0(wd.max) + "°")}</div><div class="mn">Mín ${N(r0(wd.min) + "°")}</div></div></div>` : "";
    const ahead = selDay === 1 ? "Amanhã" : `Daqui a ${selDay} dias`;
    el.agenda.innerHTML =
      `<div class="dayhead"><div><div class="dh-s">${ahead}</div><div class="dh-t disp">${U.cap(day.toLocaleDateString("pt-BR", { weekday: "long" }))}, ${day.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}</div></div>${wx}</div>` +
      `<div class="dvlist">` + (evs.length
        ? evs.map(e => `<div class="dvrow"><span class="t">${evTime(e)}</span><span class="n">${evName(e)}</span></div>`).join("")
        : `<div class="dv-empty">Nada marcado neste dia</div>`) + `</div>` +
      dayPartsHTML(selDay) +
      `<div class="backhint">Toque em “hoje” para voltar</div>`;
  }
  function dayPartsHTML(offset) {
    const parts = P.weather.dayParts(P.data.weather, offset);
    if (!parts.length) return "";
    return `<div class="dparts">` + parts.map(p => {
      const info = P.wmo(p.code, !p.night);
      return `<div class="dpart">${P.wxImg(info.icon)}<div><div class="k">${p.label}</div>` +
        `<div class="v"><span class="disp">${r0(p.temp)}°</span>${p.pop >= 30 ? ` <small>${P.ui("droplet")}${N(p.pop + "%")}</small>` : ""}</div></div></div>`;
    }).join("") + `</div>`;
  }

  /* =====================================================================
     RIO E DEFESA CIVIL
     ===================================================================== */
  const RIVER_MSG = {
    3: "Rio alto. Acompanhe os avisos da Defesa Civil.",
    4: "Rio muito alto. Áreas baixas podem alagar. Siga a Defesa Civil.",
    5: "Enchente. Siga as orientações da Defesa Civil.",
  };
  const ALERT_MSG = {
    cch: { 3: "Chuva forte prevista. Pode alagar. Evite sair se não precisar.", 4: "Chuva muito forte prevista. Fique em casa se puder.", 5: "Chuva muito forte e contínua. Fique em casa." },
    pes: { 3: "Risco de deslizamento. Fique longe de encostas e barrancos.", 4: "Deslizamentos prováveis. Se mora perto de encosta, procure um lugar seguro.", 5: "Deslizamentos generalizados. Siga a Defesa Civil." },
  };
  const fmtM = v => v.toFixed(2).replace(".", ",");

  /** O que merece destaque agora (gravidade 1 = tudo normal … 5 = máximo) */
  function safetyState() {
    const r = P.cfg.get("river.show") ? P.data.river : null;
    const st = P.alerts.enabled() ? P.alerts.status() : null;
    const cota = +P.cfg.get("river.cota") || 0;
    let s = { sev: 1, bg: null, fg: null, msg: "", icon: "triangle-alert" };
    if (r && r.sev >= 3) s = { sev: r.sev, bg: r.cond.bg, fg: r.cond.fg, msg: RIVER_MSG[r.sev] || RIVER_MSG[5], icon: "waves" };
    if (r && cota > 0) {                       // a cota da rua é o aviso mais útil para quem mora lá
      const gap = cota - r.level;
      if (gap <= 1.5 && (r.trend === "up" || gap <= .5)) {
        const sev = Math.max(4, r.sev);
        s = { sev, bg: sev >= 5 ? r.cond.bg : "#990000", fg: "#ffffff", icon: "house",
          msg: gap <= 0 ? "O rio passou da altura em que a sua rua alaga. Siga a Defesa Civil."
            : `O rio está a ${fmtM(gap)} m de alagar a sua rua${r.trend === "up" ? " e está subindo" : ""}.` };
      }
    }
    if (st) for (const it of st.items) {
      if (it.sev >= 3 && it.sev > s.sev) {
        s = { sev: it.sev, bg: it.bg, fg: it.fg, icon: it.tipo === "pes" ? "mountain" : "cloud-rain",
          msg: ((ALERT_MSG[it.tipo] || {})[Math.min(it.sev, 5)] || `${it.kind}: ${it.cond}.`) + (st.region ? "" : ` (região ${it.region})`) };
      }
    }
    return s;
  }
  P.view.safetyState = safetyState;

  function renderSafety() {
    const showR = P.cfg.get("river.show");
    const st = P.alerts.enabled() ? P.alerts.status() : null;
    if (!showR && !st) { el.safety.hidden = true; return; }
    el.safety.hidden = false;
    const r = showR ? P.data.river : null;
    const s = safetyState();
    el.safety.classList.toggle("alert", s.sev >= 3);
    el.safety.style.borderColor = s.sev >= 3 ? s.bg : "";

    let head, body = "";
    if (showR) {
      let stamp = P.data.err.river ? "Sem dados agora" : "Buscando…", old = !r;
      if (r) {
        const when = new Date(r.last), ageH = (Date.now() - when) / 3600000;
        old = ageH > 3;
        stamp = old ? `⚠ Dado antigo, ${U.nums(U.stamp(when))}` : `Leitura das ${N(U.fmtTime(when))}`;
      }
      // normal: selo discreto (bolinha + palavra); a partir de "Observação": selo cheio na cor oficial
      const badge = !r ? "" : r.sev <= 1
        ? `<span class="badge quiet"><i style="background:${r.cond.bg}"></i>${U.esc(r.cond.name)}</span>`
        : `<span class="badge" style="background:${r.cond.bg};color:${r.cond.fg}">${U.esc(r.cond.name)}</span>`;
      head = `<div class="sf-head"><span class="kicker">Rio Itajaí-Açu</span><span class="right"><span class="sf-stamp ${old ? "old" : ""}">${stamp}</span>${badge}</span></div>`;
      if (r) {
        const rate = Math.abs(r.rate) >= .05 ? ` · ${N(Math.round(Math.abs(r.rate) * 100))} cm/h` : "";
        const tr = r.trend === "up" ? [P.ui("arrow-up"), "Subindo" + rate, "var(--hot)"]
          : r.trend === "down" ? [P.ui("arrow-down"), "Descendo" + rate, "var(--cold)"] : [P.ui("minus"), "Estável", "var(--soft)"];
        body = `<div class="sf-body"><div><div class="rv disp">${fmtM(r.level)}<small>m</small></div>` +
          `<div class="trend"><span style="color:${tr[2]};display:flex">${tr[0]}</span><span>${tr[1]}</span></div></div>` +
          `<div class="chart ${+P.cfg.get("river.cota") > 0 ? "has-cota" : ""}" id="riverChart"></div></div>`;
      }
    } else {
      head = `<div class="sf-head"><span class="kicker">Defesa Civil · Blumenau</span></div>`;
    }

    let dc = "";
    if (st) {
      const bad = st.items.filter(i => i.sev > 1).sort((a, b) => b.sev - a.sev);
      const where = st.region ? "no seu bairro" : "em Blumenau";
      // dado velho nunca vira "tudo normal": diz que está sem atualizar e de quando é
      const old = st.stale ? `<b>sem atualizar</b> · último dado ${U.nums(U.stamp(new Date(st.fetched)))}` : "";
      dc = bad.length
        ? `<div class="sf-dc ${old ? "warn" : ""}"><span class="dot" style="background:${bad[0].bg}"></span><span>Defesa Civil: ` +
            bad.map(i => `${i.kind.toLowerCase()} em <b>${U.esc(i.cond.toLowerCase())}</b>${st.region ? "" : " na região " + U.esc(i.region)}`).join(" · ") +
            (old ? " · " + old : "") + `</span></div>`
        : old ? `<div class="sf-dc warn">${P.ui("wifi-off")}<span>Defesa Civil: ${old}</span></div>`
        : `<div class="sf-dc"><span class="dot" style="background:#64EE64"></span><span>Defesa Civil: <b>tudo normal</b> ${where}</span></div>`;
    }

    const action = s.sev >= 3
      ? `<div class="sf-action" style="background:${s.bg};color:${s.fg}">${P.ui(s.icon)}<span>${U.nums(s.msg)}</span><span class="tel">${P.ui("phone")}Defesa Civil ${N("199")}</span></div>` : "";

    el.safety.innerHTML = head + action + body + dc;
  }

  const f1 = v => v.toFixed(1);
  /** Curva monotônica pelos pontos (Fritsch–Carlson): suave, sem inventar picos ou vales entre as leituras */
  function smoothPath(pts) {
    const n = pts.length;
    if (n < 3) return "M" + pts.map(q => f1(q[0]) + "," + f1(q[1])).join("L");
    const dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0] || 1e-6; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
      const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
      if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
    }
    let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i] / 3;
      d += `C${f1(pts[i][0] + h)},${f1(pts[i][1] + t[i] * h)} ${f1(pts[i + 1][0] - h)},${f1(pts[i + 1][1] - t[i + 1] * h)} ${f1(pts[i + 1][0])},${f1(pts[i + 1][1])}`;
    }
    return d;
  }

  /** Gráfico das últimas 24 h: linha do nível, faixas oficiais na régua da direita, cota da rua */
  function drawChart() {
    const box = document.getElementById("riverChart"), r = P.data.river;
    if (!box || !r || el.safety.classList.contains("compact")) return;
    const W = box.clientWidth, H = box.clientHeight;
    if (W < 60 || H < 20) return;
    const rem = parseFloat(getComputedStyle(html).fontSize);
    const cota = +P.cfg.get("river.cota") || 0;
    const ser = r.series.length ? r.series : [{ t: r.last, v: r.level }];
    const vmax = Math.max(...ser.map(p => p.v));
    const top = Math.max(9, cota ? cota + .8 : 0, vmax + .8);
    const pw = W - 5.6 * rem;                                  // área do gráfico (o resto é a régua com as faixas)
    const x = i => (ser.length < 2 ? pw : (i / (ser.length - 1)) * pw);
    const y = v => H - (Math.max(0, v) / top) * H;
    let s = "";
    // linhas finas nas faixas oficiais
    r.conds.forEach(c => { if (c.level > 0 && c.level < top) s += `<line x1="0" x2="${pw}" y1="${y(c.level)}" y2="${y(c.level)}" stroke="var(--rule)" stroke-width="1"/>`; });
    // régua com as faixas (cor + número; o nome da faixa está no selo ao lado)
    const bx = pw + 1 * rem, bw = .9 * rem;
    r.conds.forEach((c, i) => {
      const hi = Math.min(i + 1 < r.conds.length ? r.conds[i + 1].level : top, top);
      if (c.level >= top) return;
      s += `<rect x="${bx}" y="${y(hi) + 1}" width="${bw}" height="${Math.max(1, y(c.level) - y(hi) - 2)}" rx="${bw / 2}" fill="${c.bg}"/>`;
    });
    // área + linha; o preenchimento é neutro quando está normal e na cor da faixa a partir de "Observação"
    const line = smoothPath(ser.map((p, i) => [x(i), y(p.v)]));
    const tint = r.sev >= 2 ? r.cond.bg : "var(--text-c)", a0 = r.sev >= 2 ? .42 : .16;
    s += `<defs><linearGradient id="rvFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${tint};stop-opacity:${a0}"/>` +
      `<stop offset="1" style="stop-color:${tint};stop-opacity:0"/></linearGradient></defs>`;
    s += `<path d="${line}L${f1(x(ser.length - 1))},${H}L0,${H}Z" fill="url(#rvFill)"/>`;
    s += `<path d="${line}" fill="none" stroke="var(--text-c)" stroke-width="${f1(.38 * rem)}" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (cota) s += `<line x1="0" x2="${pw}" y1="${y(cota)}" y2="${y(cota)}" stroke="var(--accent)" stroke-width="${(.28 * rem).toFixed(1)}" stroke-dasharray="${rem} ${.7 * rem}"/>`;
    const lx = x(ser.length - 1), ly = y(ser[ser.length - 1].v);
    s += `<circle cx="${lx}" cy="${ly}" r="${f1(2.4 * rem)}" style="fill:var(--text-c);opacity:.14"/>`;
    s += `<circle cx="${lx}" cy="${ly}" r="${rem}" fill="var(--text-c)" stroke="var(--bg)" stroke-width="${f1(.35 * rem)}"/>`;
    let labels = "", lastY = Infinity;
    r.conds.filter(c => c.level > 0 && c.level < top).forEach(c => {          // de baixo para cima; pula o que encostaria no anterior
      const yy = y(c.level);
      if (lastY - yy < 2.6 * rem) return;
      labels += `<span class="yl num" style="top:${yy}px;left:${bx + bw + .8 * rem}px">${c.level}</span>`;
      lastY = yy;
    });
    if (cota) labels += `<span class="yl cota" style="top:${y(cota)}px">Sua rua alaga · ${N(fmtM(cota).replace(/,00$/, "").replace(/0$/, "") + " m")}</span>`;
    labels += `<span class="xl" style="left:0">${N("24")} h atrás</span><span class="xl" style="left:${pw}px;transform:translateX(-100%)">agora</span>`;
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${s}</svg>${labels}`;
  }

  /* =====================================================================
     AVISO DE CONEXÃO (no cabeçalho, nunca por cima do conteúdo)
     ===================================================================== */
  function renderStatus() {
    const msgs = [];
    const w = P.data.weather;
    if (P.data.err.weather && (!w || Date.now() - w.at > 30 * 60000)) msgs.push("Tempo sem atualizar");
    if (P.cfg.get("river.show") && P.data.err.river && !P.data.river) msgs.push("Sem dados do rio");
    if (P.cal.stale()) msgs.push("Agenda sem atualizar");
    el.status.hidden = !msgs.length;
    el.agendaNote.hidden = !!msgs.length;
    if (msgs.length) el.status.innerHTML = P.ui("wifi-off") + `<span>${U.esc(msgs.join(" · "))}</span>`;
  }

  /* =====================================================================
     ENCAIXE: quando falta espaço (tela pequena ou letras grandes), some primeiro o menos importante.
     Nunca somem: hora, tempo agora e o cartão da agenda. Em alerta, o cartão do rio também não some.
     ===================================================================== */
  function fitList(box) {
    if (!box) return;
    let guard = 20;
    while (box.scrollHeight > box.clientHeight + 1 && box.children.length > 1 && guard--) box.removeChild(box.lastElementChild);
  }
  /** Altura mínima que o cartão da agenda precisa: o destaque (ou o estado vazio) + uma linha da lista */
  function agendaNeed() {
    let need = 0;
    for (const c of el.agenda.children) {
      if (c.classList.contains("list") || c.classList.contains("dvlist")) need += c.firstElementChild ? Math.min(c.firstElementChild.offsetHeight, 120) : 0;
      else if (c.classList.contains("empty")) need += c.scrollHeight;
      else need += c.offsetHeight;
    }
    return need;
  }
  function runSteps(side, steps, extra) {
    const over = () => side.scrollHeight > side.clientHeight + 1 || (extra ? extra() : false);
    steps.forEach(s => s.off());
    const applied = [];
    for (const s of steps) {
      if (s.skip && s.skip()) continue;
      if (over() || (s.clipped && s.clipped())) { s.on(); applied.push(s); }
    }
    for (const s of applied.reverse()) {                 // devolve o que couber
      s.off();
      if (over() || (s.clipped && s.clipped())) s.on();
    }
  }
  function layout() {
    renderAgenda();
    const alert = el.safety.classList.contains("alert");
    const weekWx = () => !!(P.cfg.get("weekWeather") && P.data.weather);
    runSteps(el.sideB, [
      { on: () => el.week.classList.add("no-wx"), off: () => el.week.classList.toggle("no-wx", !weekWx()), skip: () => !weekWx() },
      { on: () => el.safety.classList.add("compact"), off: () => el.safety.classList.remove("compact"), skip: () => alert },
      { on: () => el.week.classList.add("squeezed"), off: () => el.week.classList.remove("squeezed") },
      { on: () => el.safety.classList.add("squeezed"), off: () => el.safety.classList.remove("squeezed"), skip: () => alert },
    ], () => el.agenda.clientHeight + 1 < agendaNeed());
    const ahead = el.wxAhead;
    runSteps(el.sideA, [
      { on: () => ahead.classList.add("tight"), off: () => ahead.classList.remove("tight"),
        clipped: () => ahead.scrollHeight > ahead.clientHeight + 1 },
      { on: () => { ahead.classList.add("squeezed"); el.aheadRule.classList.add("squeezed"); },
        off: () => { ahead.classList.remove("squeezed"); el.aheadRule.classList.remove("squeezed"); },
        clipped: () => !ahead.classList.contains("squeezed") && ahead.scrollHeight > ahead.clientHeight + 1 },
      { on: () => el.wxHint.classList.add("squeezed"), off: () => el.wxHint.classList.remove("squeezed") },
    ]);
    fitList(el.agenda.querySelector(".list"));
    fitList(el.agenda.querySelector(".dvlist"));
    drawChart();
  }

  function renderAll() {
    applyLook();
    lastTime = ""; lastMinute = -1; lastClock = ""; skyAt = -1;
    tick();                                   // tick → minute → agenda, tempo à frente, rio, encaixe
    renderNow(); renderStatus();
    layout();
  }

  P.view.init = function () {
    grab();
    el.week.addEventListener("click", e => { const b = e.target.closest(".wd"); if (b) selectDay(+b.dataset.i); });
    P.bus.on("wake", () => P.view.resetDay());
    P.bus.on("cfg", () => renderAll());
    P.bus.on("data", which => {
      if (which === "weather") { renderNow(); renderAhead(); renderWeek(); updateSky(new Date(), true); }
      if (which === "river" || which === "alerts") renderSafety();
      renderStatus();
      layout();
    });
    renderAll();
    setInterval(tick, 1000);
    // depois que as fontes carregam, as alturas mudam: refaz o encaixe
    const refit = U.debounce(() => { renderSafety(); layout(); }, 120);
    if (document.fonts) { document.fonts.addEventListener("loadingdone", refit); document.fonts.ready.then(refit); }
    window.addEventListener("load", refit);
    window.addEventListener("resize", U.debounce(() => { renderSafety(); layout(); }, 200));
  };
  P.view.renderAll = renderAll;
})();
