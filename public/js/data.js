/* Dados: previsão do tempo (Open-Meteo), nível do rio (AlertaBLU/Defesa Civil de Blumenau) e agenda. */
(function () {
  "use strict";
  const P = window.P, U = P.util;
  P.data = { weather: null, river: null, calendar: null, err: {} };

  /* =====================================================================
     TEMPO — Open-Meteo (gratuito, sem chave)
     ===================================================================== */
  const WINDOWS = [
    { id: "manha", label: "Manhã", from: 6, to: 11, mid: 9 },
    { id: "tarde", label: "Tarde", from: 12, to: 17, mid: 15 },
    { id: "noite", label: "Noite", from: 18, to: 23, mid: 21 },
  ];

  function buildWeather(j) {
    const cur = j.current, dly = j.daily, hr = j.hourly;
    const todayStr = cur.time.slice(0, 10);
    const w = {
      at: Date.now(),
      now: { temp: cur.temperature_2m, feels: cur.apparent_temperature, code: cur.weather_code, isDay: cur.is_day === 1, wind: cur.wind_speed_10m, hum: cur.relative_humidity_2m },
      today: { max: dly.temperature_2m_max[0], min: dly.temperature_2m_min[0], pop: dly.precipitation_probability_max[0], uv: dly.uv_index_max[0], code: dly.weather_code[0] },
      days: [], periods: [],
    };
    for (let i = 1; i < dly.time.length; i++) {
      w.days.push({ date: dly.time[i], code: dly.weather_code[i], max: dly.temperature_2m_max[i], min: dly.temperature_2m_min[i], pop: dly.precipitation_probability_max[i] });
    }
    // períodos do dia de hoje
    const idx = {}; hr.time.forEach((t, i) => { idx[t] = i; });
    for (const win of WINDOWS) {
      let worst = null, pop = 0;
      for (let h = win.from; h <= win.to; h++) {
        const i = idx[`${todayStr}T${U.pad(h)}:00`];
        if (i == null) continue;
        const c = hr.weather_code[i];
        if (worst == null || P.wmoSeverity(c) > P.wmoSeverity(worst)) worst = c;
        pop = Math.max(pop, hr.precipitation_probability[i] || 0);
      }
      const mi = idx[`${todayStr}T${U.pad(win.mid)}:00`];
      w.periods.push({ id: win.id, label: win.label, from: win.from, to: win.to, code: worst != null ? worst : w.now.code, temp: mi != null ? hr.temperature_2m[mi] : w.now.temp, pop });
    }
    return w;
  }

  P.weather = {
    async refresh() {
      const c = P.cfg.get("city");
      const url = "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${c.lat}&longitude=${c.lon}&timezone=${encodeURIComponent(c.tz || "auto")}` +
        "&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m" +
        "&hourly=temperature_2m,weather_code,precipitation_probability" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max" +
        "&forecast_days=4";
      try {
        const r = await U.fetchT(url, {}, 15000);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const w = buildWeather(await r.json());
        w.cityKey = c.lat + "," + c.lon;
        P.data.weather = w; P.data.err.weather = false;
        P.cache.set("weather", w);
      } catch (e) {
        console.warn("tempo:", e);
        P.data.err.weather = true;
      }
      P.bus.emit("data", "weather");
    },
    loadCache() {
      const w = P.cache.get("weather");
      const c = P.cfg.get("city");
      if (w && w.cityKey === c.lat + "," + c.lon) P.data.weather = w;
    },
    /** frase amigável, em linguagem simples */
    hint(w) {
      if (!w) return null;
      const n = w.now, hour = new Date().getHours();
      if (n.code >= 95) return { icon: "thunderstorms-day", text: "Há trovoadas. É melhor ficar em casa." };
      if (w.today.pop >= 60) return { icon: "umbrella", text: "Hoje deve chover. Leve o guarda-chuva." };
      if (w.today.pop >= 35) return { icon: "umbrella", text: "Pode chover hoje. Leve o guarda-chuva." };
      if (n.feels <= 14) return { icon: "thermometer-colder", text: "Está frio. Leve um agasalho." };
      if (n.feels >= 31) return { icon: "thermometer-warmer", text: "Está muito quente. Beba bastante água." };
      if (n.isDay && w.today.uv >= 8 && hour >= 10 && hour <= 16) return { icon: "clear-day", text: "Sol forte. Use protetor e chapéu." };
      return { icon: P.wmo(n.code, n.isDay).icon, text: n.isDay ? "Dia agradável lá fora." : "Noite tranquila." };
    },
  };

  /* =====================================================================
     RIO ITAJAÍ-AÇU — AlertaBLU / Defesa Civil de Blumenau
     ===================================================================== */
  function kmBetween(a, b) {
    const R = 6371, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const hexColor = n => "#" + (n >>> 0).toString(16).padStart(6, "0");

  function buildRiver(d) {
    const pts = d.niveis;
    const last = pts[pts.length - 1];
    const conds = d.condicoes.filter(c => c.tipo === "nvl").sort((a, b) => a.nivel - b.nivel)
      .map(c => ({ level: c.nivel, name: c.condicao, bg: hexColor(c.cor_fundo), fg: hexColor(c.cor_fonte) }));
    let cond = conds[0];
    for (const c of conds) if (last.nivel >= c.level) cond = c;
    const ref = pts[Math.max(0, pts.length - 4)].nivel;
    const diff = last.nivel - ref;
    return {
      at: Date.now(), level: last.nivel, cond, conds, last: last.horaLeitura,
      trend: diff > 0.05 ? "up" : diff < -0.05 ? "down" : "flat",
      series: pts.slice(-24).map(p => p.nivel),
      source: d.fonte || "AlertaBLU",
    };
  }

  P.river = {
    isNear() { return kmBetween(P.cfg.get("city"), { lat: -26.9194, lon: -49.0661 }) <= 80; },
    async refresh() {
      if (!P.cfg.get("river.show")) return;
      const urls = [];
      if (P.server.ok) urls.push(P.server.base + "/api/river");
      urls.push("river.json");
      let ok = false;
      for (const u of urls) {
        try {
          const r = await U.fetchT(u + (u.includes("?") ? "&" : "?") + "a=" + Date.now(), { cache: "no-store" }, 12000);
          if (!r.ok) throw new Error("HTTP " + r.status);
          const rv = buildRiver(await r.json());
          // se a cópia local for mais velha que a que já temos, ignora
          if (!P.data.river || new Date(rv.last) >= new Date(P.data.river.last)) P.data.river = rv;
          P.cache.set("river", P.data.river);
          ok = true; break;
        } catch (e) { console.warn("rio:", u, e.message); }
      }
      P.data.err.river = !ok;
      P.bus.emit("data", "river");
    },
    loadCache() { const r = P.cache.get("river"); if (r) P.data.river = r; },
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
      let end = ed ? ed.toJSDate() : new Date(start.getTime() + (allDay ? 86400000 : 0));
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
    let url = (P.cfg.get("calendar.icsUrl") || "").trim().replace(/^webcal:/i, "https:");
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
    const from = U.startOfDay(new Date()), to = U.addDays(from, c.daysAhead);
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
    P.data.calendar = { at: Date.now(), events, sample: c.mode === "demo", from, to };
    P.bus.emit("data", "calendar");
  };

  /** Lista final: agenda + lembretes, sem o que já terminou, em ordem */
  cal.upcoming = function () {
    const d = P.data.calendar;
    const c = P.cfg.get("calendar");
    const from = U.startOfDay(new Date()), to = U.addDays(from, c.daysAhead);
    const now = new Date();
    const all = ((d && d.events) || []).concat(reminderEvents(from, to));
    return all.filter(e => e.end > now && e.start < to).sort((a, b) => a.start - b.start || (b.allDay - a.allDay));
  };
  /** Quantos compromissos por dia (para os pontinhos do calendário da semana) */
  cal.countsByDay = function (days) {
    const list = cal.upcoming(), res = {};
    const base = U.startOfDay(new Date());
    for (let i = 0; i < days; i++) res[i] = 0;
    list.forEach(e => {
      const s = Math.max(0, U.dayDiff(e.start, base));
      const last = e.allDay ? U.dayDiff(new Date(e.end.getTime() - 1), base) : s;
      for (let i = s; i <= last && i < days; i++) res[i]++;
    });
    return res;
  };
  cal.loadCache = function () {
    const cached = P.cache.get("calendar");
    const c = P.cfg.get("calendar");
    if (cached && c.mode !== "demo") {
      P.data.calendar = { at: 0, events: cached.map(x => Object.assign({}, x, { start: new Date(x.start), end: new Date(x.end) })), sample: false };
    }
  };
})();
