/* Dados: previsão do tempo (Open-Meteo), nível do rio e avisos (AlertaBLU / Defesa Civil de Blumenau),
   agenda (Google Agenda via iCal, lembretes do painel) e feriados. */
(function () {
  "use strict";
  const P = window.P, U = P.util;
  P.data = { weather: null, river: null, alerts: null, calendar: null, err: {} };

  /* =====================================================================
     TEMPO — Open-Meteo (gratuito, sem chave)
     ===================================================================== */
  function buildWeather(j) {
    const cur = j.current, dly = j.daily, hr = j.hourly;
    return {
      at: Date.now(),
      now: { temp: cur.temperature_2m, feels: cur.apparent_temperature, code: cur.weather_code, isDay: cur.is_day === 1 },
      days: dly.time.map((t, i) => ({
        date: t, code: dly.weather_code[i], max: dly.temperature_2m_max[i], min: dly.temperature_2m_min[i],
        pop: dly.precipitation_probability_max[i], uv: dly.uv_index_max[i],
      })),                                   // days[0] = hoje
      hourly: { t: hr.time, temp: hr.temperature_2m, code: hr.weather_code, pop: hr.precipitation_probability },
    };
  }

  /* Períodos do dia, como as pessoas falam ("hoje à tarde", "amanhã de manhã") */
  const PERIODS = [
    { id: "madrugada", label: "Madrugada", from: 0, to: 5, night: true, phrase: "de madrugada" },
    { id: "manha", label: "Manhã", from: 6, to: 11, night: false, phrase: "de manhã" },
    { id: "tarde", label: "Tarde", from: 12, to: 17, night: false, phrase: "à tarde" },
    { id: "noite", label: "Noite", from: 18, to: 23, night: true, phrase: "à noite" },
  ];

  P.weather = {
    async refresh() {
      const c = P.cfg.get("city");
      const url = "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${c.lat}&longitude=${c.lon}&timezone=${encodeURIComponent(c.tz || "auto")}` +
        "&current=temperature_2m,apparent_temperature,weather_code,is_day" +
        "&hourly=temperature_2m,weather_code,precipitation_probability" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max" +
        "&forecast_days=8";
      try {
        const r = await U.fetchT(url, {}, 15000);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const w = buildWeather(await r.json());
        w.cityKey = c.lat + "," + c.lon;
        P.data.weather = w; P.data.err.weather = false;
        P.cache.set("weather2", w);
      } catch (e) {
        console.warn("tempo:", e);
        P.data.err.weather = true;
      }
      P.bus.emit("data", "weather");
    },
    loadCache() {
      const w = P.cache.get("weather2"), c = P.cfg.get("city");
      if (w && w.cityKey === c.lat + "," + c.lon) P.data.weather = w;
    },

    /** Previsão de um dia pela data (nunca pela posição: se o tablet ficar sem internet, as posições "andam") */
    day(w, date) {
      if (!w) return null;
      const ds = `${date.getFullYear()}-${U.pad(date.getMonth() + 1)}-${U.pad(date.getDate())}`;
      return w.days.find(d => d.date === ds) || null;
    },
    /** Próximos períodos a partir de agora: [Agora · Tarde, Hoje · Noite, Amanhã · Manhã, Amanhã · Tarde].
        A madrugada só aparece quando é o período atual. Dia: máxima do período; noite: mínima. */
    periods(w, count) {
      if (!w || !w.hourly) return [];
      const now = new Date(), idx = {};
      w.hourly.t.forEach((t, i) => { idx[t] = i; });
      const out = [];
      for (let d = 0; d < 3 && out.length < count; d++) {
        const day = U.addDays(U.startOfDay(now), d);
        const ds = `${day.getFullYear()}-${U.pad(day.getMonth() + 1)}-${U.pad(day.getDate())}`;
        for (const p of PERIODS) {
          if (out.length >= count) break;
          const isNow = d === 0 && now.getHours() >= p.from && now.getHours() <= p.to;
          if (d === 0 && now.getHours() > p.to) continue;                 // já passou
          if (p.id === "madrugada" && !isNow) continue;                   // madrugada só se for agora
          const from = isNow ? now.getHours() : p.from;
          let code = null, pop = 0, tmax = -99, tmin = 99, n = 0;
          for (let h = from; h <= p.to; h++) {
            const i = idx[`${ds}T${U.pad(h)}:00`];
            if (i == null) continue;
            n++;
            const c = w.hourly.code[i];
            if (code == null || P.wmoSeverity(c) > P.wmoSeverity(code)) code = c;
            pop = Math.max(pop, w.hourly.pop[i] || 0);
            tmax = Math.max(tmax, w.hourly.temp[i]); tmin = Math.min(tmin, w.hourly.temp[i]);
          }
          if (!n) continue;
          out.push({
            id: p.id, label: p.label, phrase: p.phrase, night: p.night, isNow, dayOffset: d,
            kicker: isNow ? "Agora" : d === 0 ? "Hoje" : d === 1 ? "Amanhã" : U.cap(day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")),
            code, pop, temp: p.night ? tmin : tmax,
          });
        }
      }
      return out;
    },

    /** Manhã, tarde e noite de um dia qualquer (0 = hoje) */
    dayParts(w, offset) {
      if (!w || !w.hourly) return [];
      const day = U.addDays(U.startOfDay(new Date()), offset);
      const ds = `${day.getFullYear()}-${U.pad(day.getMonth() + 1)}-${U.pad(day.getDate())}`;
      const idx = {}; w.hourly.t.forEach((t, i) => { idx[t] = i; });
      return PERIODS.filter(p => p.id !== "madrugada").map(p => {
        let code = null, pop = 0, tmax = -99, tmin = 99, n = 0;
        for (let h = p.from; h <= p.to; h++) {
          const i = idx[`${ds}T${U.pad(h)}:00`]; if (i == null) continue; n++;
          const c = w.hourly.code[i];
          if (code == null || P.wmoSeverity(c) > P.wmoSeverity(code)) code = c;
          pop = Math.max(pop, w.hourly.pop[i] || 0);
          tmax = Math.max(tmax, w.hourly.temp[i]); tmin = Math.min(tmin, w.hourly.temp[i]);
        }
        return n ? { id: p.id, label: p.label, night: p.night, code, pop, temp: p.night ? tmin : tmax } : null;
      }).filter(Boolean);
    },

    /** Uma frase curta e útil, em linguagem simples. O ícone sempre combina com a frase. */
    hint(w) {
      if (!w || !P.weather.day(w, new Date())) return null;            // previsão velha demais: melhor não dizer nada
      const n = w.now, hour = new Date().getHours();
      const per = P.weather.periods(w, 6);
      const today = per.filter(p => p.dayOffset === 0);
      const when = p => (p.isNow ? "agora" : p.dayOffset === 0 ? p.phrase : "amanhã " + p.phrase);
      const r = x => Math.round(x);

      if (n.code >= 95) return { icon: "thunderstorms-rain", text: "Trovoadas agora. Fique em casa se puder." };
      if (P.isRainy(n.code) && n.code >= 61) return { icon: "umbrella", text: "Está chovendo. Leve o guarda-chuva." };
      if (P.isRainy(n.code)) return { icon: "umbrella", text: "Garoa agora. Leve o guarda-chuva." };
      const storm = today.find(p => p.code >= 95);
      if (storm) return { icon: "thunderstorms-rain", text: `Trovoadas ${when(storm)}. Evite sair nessa hora.` };
      const wet = today.find(p => p.pop >= 50 || (P.isRainy(p.code) && p.code >= 61));
      if (wet) return { icon: "umbrella", text: `Deve chover ${when(wet)}. Leve o guarda-chuva.` };
      const maybe = today.find(p => p.pop >= 30);
      if (maybe) return { icon: "umbrella", text: `Pode chover ${when(maybe)}.` };
      if (n.feels <= 14) return { icon: "thermometer-colder", text: "Está frio. Use um agasalho." };
      const night = per.find(p => p.night && p.dayOffset <= 1 && !p.isNow);
      if (night && night.temp <= 12 && hour >= 12) return { icon: "thermometer-colder", text: `Noite fria: ${r(night.temp)}°. Separe um agasalho.` };
      const td = P.weather.day(w, new Date()) || {}, tm = P.weather.day(w, U.addDays(new Date(), 1)) || {};
      if (td.max >= 31 && hour < 17) return { icon: "thermometer-warmer", text: "Dia quente. Beba bastante água." };
      if (n.isDay && n.code <= 2 && td.uv >= 8 && hour >= 9 && hour <= 15) return { icon: "clear-day", text: "Sol forte. Use protetor e chapéu." };
      if (hour >= 18 && tm.pop >= 60) return { icon: "umbrella", text: "Amanhã deve chover. Separe o guarda-chuva." };
      // nada a avisar: responde a pergunta de sempre ("preciso de guarda-chuva?")
      return hour >= 18 ? { ui: "umbrella-off", text: "Sem chuva prevista para a noite." }
        : { ui: "umbrella-off", text: "Sem chuva prevista para hoje." };
    },
  };

  /* =====================================================================
     RIO ITAJAÍ-AÇU — AlertaBLU / Defesa Civil de Blumenau
     ===================================================================== */
  const BLU = { lat: -26.9194, lon: -49.0661 };
  function kmBetween(a, b) {
    const R = 6371, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const hexColor = n => (typeof n === "string" ? n : "#" + (n >>> 0).toString(16).padStart(6, "0"));
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  /** Gravidade pelo nome oficial: 1 Normalidade · 2 Observação · 3 Atenção · 4 Alerta · 5 Alerta máximo */
  const SEV = { normalidade: 1, observacao: 2, atencao: 3, alerta: 4, "alerta maximo": 5 };
  P.severity = (name, fallback) => SEV[norm(name)] || fallback || 1;

  function buildRiver(d) {
    const pts = d.niveis;
    const last = pts[pts.length - 1];
    const conds = d.condicoes.filter(c => c.tipo === "nvl").sort((a, b) => a.nivel - b.nivel)
      .map(c => ({ level: c.nivel, name: c.condicao, bg: hexColor(c.cor_fundo), fg: hexColor(c.cor_fonte) }));
    let cond = conds[0];
    for (const c of conds) if (last.nivel >= c.level) cond = c;
    const ref = pts[Math.max(0, pts.length - 4)].nivel;          // ~3 horas atrás
    const diff = last.nivel - ref;
    return {
      at: Date.now(), level: last.nivel, cond, conds, last: last.horaLeitura,
      sev: P.severity(cond.name),
      trend: diff > 0.05 ? "up" : diff < -0.05 ? "down" : "flat", rate: diff / 3,   // m/h
      series: pts.slice(-25).map(p => ({ t: p.horaLeitura, v: p.nivel })),
      source: d.fonte || "AlertaBLU",
    };
  }

  P.river = {
    isNear() { return kmBetween(P.cfg.get("city"), BLU) <= 80; },
    async refresh() {
      if (!P.cfg.get("river.show")) return;
      // 1º a cópia publicada junto com o painel (renovada a cada 15 min); 2º o servidor do painel
      const urls = ["river.json"];
      if (P.server.ok) urls.push(P.server.base + "/api/river");
      let best = null;
      for (const u of urls) {
        try {
          const r = await U.fetchT(u + (u.includes("?") ? "&" : "?") + "a=" + Date.now(), { cache: "no-store" }, 12000);
          if (!r.ok) throw new Error("HTTP " + r.status);
          const rv = buildRiver(await r.json());
          if (!best || new Date(rv.last) > new Date(best.last)) best = rv;
          if ((Date.now() - new Date(rv.last)) / 3600000 < 2) break;    // recente o bastante
        } catch (e) { /* tenta a próxima fonte */ }
      }
      if (best && (!P.data.river || new Date(best.last) >= new Date(P.data.river.last))) P.data.river = best;
      if (best) P.cache.set("river2", P.data.river);
      P.data.err.river = !best;
      P.bus.emit("data", "river");
    },
    loadCache() { const r = P.cache.get("river2"); if (r) P.data.river = r; },
  };

  /* =====================================================================
     AVISOS DA DEFESA CIVIL — condições de chuva e risco de deslizamento, por região de Blumenau
     ===================================================================== */
  const KIND = { cch: "Chuva", pes: "Deslizamento" };
  function buildAlerts(d) {
    const kinds = (d.dados || []).map(x => ({
      tipo: x.tipo, name: x.tipoNome, short: KIND[x.tipo] || x.tipoNome,
      regions: (x.sitregioes || []).map(sr => ({
        name: sr.regiao.nome, bairros: sr.regiao.bairros || [],
        cond: sr.condicao.condicao, sev: P.severity(sr.condicao.condicao, sr.condicao.nivel),
        bg: hexColor(sr.condicao.cor_fundo), fg: hexColor(sr.condicao.cor_fonte),
      })),
    }));
    const bairros = [];
    (kinds[0] ? kinds[0].regions : []).forEach(r => r.bairros.forEach(b => bairros.push({ bairro: b, region: r.name })));
    bairros.sort((a, b) => a.bairro.localeCompare(b.bairro, "pt-BR"));
    return { at: Date.now(), updated: d.datahoraAtualizacao, kinds, bairros };
  }

  P.alerts = {
    enabled() { return P.cfg.get("alerts.show") && P.river.isNear(); },
    async refresh() {
      if (!P.alerts.enabled()) { P.data.alerts = null; P.bus.emit("data", "alerts"); return; }
      try {
        const r = await U.fetchT("alerts.json?a=" + Date.now(), { cache: "no-store" }, 12000);
        if (!r.ok) throw new Error("HTTP " + r.status);
        P.data.alerts = buildAlerts(await r.json());
        P.cache.set("alerts", P.data.alerts);
        P.data.err.alerts = false;
      } catch (e) { P.data.err.alerts = true; }
      P.bus.emit("data", "alerts");
    },
    loadCache() { const a = P.cache.get("alerts"); if (a) P.data.alerts = a; },
    regionOf(bairro) {
      const a = P.data.alerts; if (!a || !bairro) return null;
      const hit = a.bairros.find(x => norm(x.bairro) === norm(bairro));
      return hit ? hit.region : null;
    },
    /** Situação que importa: na região do bairro escolhido (ou a pior da cidade, se não houver bairro) */
    status() {
      const a = P.data.alerts; if (!a) return null;
      const region = P.alerts.regionOf(P.cfg.get("alerts.bairro"));
      const items = a.kinds.map(k => {
        const pool = region ? k.regions.filter(r => r.name === region) : k.regions;
        const worst = pool.reduce((m, r) => (!m || r.sev > m.sev ? r : m), null);
        return worst ? { kind: k.short, tipo: k.tipo, cond: worst.cond, sev: worst.sev, region: worst.name, bg: worst.bg, fg: worst.fg } : null;
      }).filter(Boolean);
      return { region, items, sev: items.reduce((m, i) => Math.max(m, i.sev), 1), updated: a.updated };
    },
  };

  /* =====================================================================
     FERIADOS — nacionais (+ aniversário de Blumenau)
     ===================================================================== */
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  function holidaysOf(y) {
    const E = easter(y), at = (m, d) => new Date(y, m - 1, d);
    const list = [
      [at(1, 1), "Ano-Novo"], [U.addDays(E, -48), "Carnaval"], [U.addDays(E, -47), "Carnaval"],
      [U.addDays(E, -2), "Sexta-feira Santa"], [E, "Páscoa"], [at(4, 21), "Tiradentes"], [at(5, 1), "Dia do Trabalho"],
      [U.addDays(E, 60), "Corpus Christi"], [at(9, 7), "Independência do Brasil"], [at(10, 12), "Nossa Senhora Aparecida"],
      [at(11, 2), "Finados"], [at(11, 15), "Proclamação da República"], [at(11, 20), "Consciência Negra"], [at(12, 25), "Natal"],
    ];
    if (P.river.isNear()) list.push([at(9, 2), "Aniversário de Blumenau"]);
    return list;
  }
  P.holidays = function (from, to) {
    if (!P.cfg.get("holidays")) return [];
    const out = [];
    for (let y = from.getFullYear(); y <= to.getFullYear(); y++) {
      for (const [d, name] of holidaysOf(y)) {
        if (d >= U.startOfDay(from) && d < to) out.push({ id: "h" + (+d), start: d, end: U.addDays(d, 1), allDay: true, title: name, loc: "", kind: "holiday" });
      }
    }
    return out;
  };

  /* =====================================================================
     AGENDA — endereço secreto iCal (via servidor do painel), API do Google (agenda pública) ou exemplos
     ===================================================================== */
  const cal = (P.cal = {});

  function sampleEvents() {
    const at = (add, h, m, title, loc) => {
      const d = U.addDays(new Date(), add); d.setHours(h, m, 0, 0);
      return { id: "s" + add + h, start: d, end: new Date(d.getTime() + 3600000), allDay: false, title, loc: loc || "", kind: "event" };
    };
    return [
      at(0, 15, 30, "Consulta com o dentista", "Clínica Sorriso"),
      at(1, 9, 0, "Fisioterapia", "Rua das Flores, 120"),
      at(2, 19, 0, "Jantar com a família"),
      at(3, 14, 30, "Visita da Ana"),
      at(5, 10, 0, "Caminhada no parque"),
    ];
  }

  /** Lê um arquivo .ics (inclui eventos que se repetem) */
  cal.parseICS = function (text, from, to) {
    const out = [];
    const root = new ICAL.Component(ICAL.parse(text));
    root.getAllSubcomponents("vtimezone").forEach(vtz => { try { ICAL.TimezoneService.register(vtz); } catch (e) { /* já registrado */ } });
    const masters = new Map(), exceptions = [];
    for (const ve of root.getAllSubcomponents("vevent")) {
      const ev = new ICAL.Event(ve);
      if (ev.isRecurrenceException()) exceptions.push(ev); else masters.set(ev.uid, ev);
    }
    exceptions.forEach(ex => { const m = masters.get(ex.uid); if (m) m.relateException(ex); });

    const push = (sd, ed, item, uid) => {
      const status = item.component.getFirstPropertyValue("status");
      if (status === "CANCELLED") return;
      const allDay = !!sd.isDate;
      const start = sd.toJSDate();
      const end = ed ? ed.toJSDate() : new Date(start.getTime() + (allDay ? 86400000 : 0));
      if (end <= from || start >= to) return;
      out.push({ id: uid + start.getTime(), start, end, allDay, title: (item.summary || "(sem título)").trim(), loc: (item.location || "").trim(), kind: "event" });
    };

    for (const ev of masters.values()) {
      try {
        if (ev.isRecurring()) {
          const it = ev.iterator(); let next, n = 0;
          while ((next = it.next()) && n++ < 800) {
            if (next.toJSDate() > to) break;
            const d = ev.getOccurrenceDetails(next);
            push(d.startDate, d.endDate, d.item, ev.uid);
          }
        } else push(ev.startDate, ev.endDate, ev, ev.uid);
      } catch (e) { console.warn("evento ignorado:", e); }
    }
    return out;
  };

  async function fetchICS(from, to) {
    const url = (P.cfg.get("calendar.icsUrl") || "").trim().replace(/^webcal:/i, "https:");
    if (!url) throw new Error("Cole o endereço secreto do Google Agenda.");
    const sameOrigin = url.startsWith("/") || url.startsWith(location.origin) || !/^https?:/i.test(url);
    let target = url;
    if (!sameOrigin) {
      if (!P.server.ok) throw new Error("Falta o servidor do painel (veja o passo a passo em Avançado).");
      target = P.server.base + "/api/ics?u=" + encodeURIComponent(url);
    }
    const r = await U.fetchT(target, { cache: "no-store" }, 20000);
    if (!r.ok) throw new Error("O Google respondeu " + r.status + ". Confira o endereço.");
    const text = await r.text();
    if (!/BEGIN:VCALENDAR/.test(text)) throw new Error("O endereço não devolveu uma agenda.");
    await window.icalReady;
    if (!window.ICAL) throw new Error("Não consegui carregar o leitor de agenda.");
    return cal.parseICS(text, from, to);
  }

  async function fetchGoogleApi(from, to) {
    const id = (P.cfg.get("calendar.calId") || "").trim(), key = (P.cfg.get("calendar.apiKey") || "").trim();
    if (!id || !key) throw new Error("Preencha o e-mail da agenda e a chave.");
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events` +
      `?key=${encodeURIComponent(key)}&singleEvents=true&orderBy=startTime&maxResults=50` +
      `&timeMin=${from.toISOString()}&timeMax=${to.toISOString()}`;
    const r = await U.fetchT(url, {}, 15000);
    if (!r.ok) {
      let msg = "O Google respondeu " + r.status + ".";
      if (r.status === 404) msg = "Agenda não encontrada. Ela precisa estar pública.";
      if (r.status === 403 || r.status === 400) msg = "Chave recusada ou agenda não pública.";
      throw new Error(msg);
    }
    const data = await r.json();
    return (data.items || []).filter(e => e.status !== "cancelled").map(e => {
      const allDay = !!e.start.date;
      const start = new Date(allDay ? e.start.date + "T00:00" : e.start.dateTime);
      const end = new Date(allDay ? e.end.date + "T00:00" : e.end.dateTime);
      return { id: e.id, start, end, allDay, title: e.summary || "(sem título)", loc: e.location || "", kind: "event" };
    });
  }

  /** Lembretes diários (configurados no próprio painel) viram compromissos */
  function reminderEvents(from, to) {
    const out = [];
    const list = P.cfg.get("reminders") || [];
    for (let d = U.startOfDay(from); d < to; d = U.addDays(d, 1)) {
      for (const r of list) {
        if (!r.text || (r.days && r.days.length && !r.days.includes(d.getDay()))) continue;
        const [h, m] = U.parseHM(r.time);
        const start = new Date(d); start.setHours(h, m, 0, 0);
        out.push({ id: "r" + r.id + start.getTime(), start, end: new Date(start.getTime() + 15 * 60000), allDay: false, title: r.text, loc: "", kind: "reminder" });
      }
    }
    return out;
  }

  cal.fetchRaw = async function () {
    const c = P.cfg.get("calendar");
    const from = U.startOfDay(new Date()), to = U.addDays(from, c.daysAhead);
    if (c.mode === "ics") return fetchICS(from, to);
    if (c.mode === "apikey") return fetchGoogleApi(from, to);
    return sampleEvents();
  };

  cal.refresh = async function () {
    const c = P.cfg.get("calendar");
    let events = [];
    try {
      events = await cal.fetchRaw();
      P.data.err.calendar = false;
      P.cache.set("calendar", events.map(e => Object.assign({}, e, { start: +e.start, end: +e.end })));
    } catch (e) {
      console.warn("agenda:", e.message);
      P.data.err.calendar = e.message;
      const cached = P.cache.get("calendar");
      if (cached) events = cached.map(x => Object.assign({}, x, { start: new Date(x.start), end: new Date(x.end) }));
    }
    P.data.calendar = { at: Date.now(), events, sample: c.mode === "demo" };
    P.bus.emit("data", "calendar");
  };

  /** Tudo o que ainda vai acontecer (agenda + lembretes + feriados), em ordem; dias inteiros primeiro */
  cal.upcoming = function (days) {
    const d = P.data.calendar;
    const from = U.startOfDay(new Date()), to = U.addDays(from, days || P.cfg.get("calendar.daysAhead"));
    const now = new Date();
    const all = ((d && d.events) || []).concat(reminderEvents(from, to), P.holidays(from, to));
    return all.filter(e => e.end > now && e.start < to).sort((a, b) => a.start - b.start || (b.allDay - a.allDay));
  };
  /** Por dia da semana (0 = hoje): quantos compromissos e qual feriado */
  cal.byDay = function (days) {
    const list = cal.upcoming(Math.max(days, P.cfg.get("calendar.daysAhead"))), base = U.startOfDay(new Date());
    const res = Array.from({ length: days }, () => ({ count: 0, holiday: null }));
    list.forEach(e => {
      const s = Math.max(0, U.dayDiff(e.start, base));
      const last = e.allDay ? U.dayDiff(new Date(e.end.getTime() - 1), base) : s;
      for (let i = s; i <= last && i < days; i++) {
        if (e.kind === "holiday") res[i].holiday = e.title; else res[i].count++;
      }
    });
    return res;
  };
  cal.loadCache = function () {
    const cached = P.cache.get("calendar");
    if (cached && P.cfg.get("calendar.mode") !== "demo") {
      P.data.calendar = { at: 0, events: cached.map(x => Object.assign({}, x, { start: new Date(x.start), end: new Date(x.end) })), sample: false };
    }
  };
})();
