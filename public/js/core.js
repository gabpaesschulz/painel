/* Núcleo: barramento de eventos, configurações (salvas no tablet), cache e utilidades. */
(function () {
  "use strict";
  const P = (window.P = window.P || {});
  P.VERSION = "2.2";
  P.build = "";                // publicação no ar (version.json, gravado pelo GitHub); vazio no PC

  /* ---------- barramento de eventos ---------- */
  const handlers = {};
  P.bus = {
    on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
    emit(ev, arg) { (handlers[ev] || []).slice().forEach(fn => { try { fn(arg); } catch (e) { console.error(ev, e); } }); },
  };

  /* ---------- configurações ---------- */
  const KEY = "painel:v1";
  const DEFAULTS = {
    name: "",
    theme: "noite",            // noite | papel | contraste | oceano | floresta
    font: "editorial",         // editorial | limpo | moderno | classico
    textScale: 1,              // 0.9 | 1 | 1.12 | 1.25
    motion: true,              // ícones animados e entrada suave
    lite: false,               // modo leve para tablets antigos (sem desfoque nem textura)
    keepAwake: true,           // pede ao navegador para manter a tela ligada
    side: "left",              // lado do relógio: left | right
    clock24: true,
    showSeconds: false,
    city: { name: "Blumenau", region: "Santa Catarina", lat: -26.9194, lon: -49.0661, tz: "America/Sao_Paulo" },
    v: 2,                      // versão das configurações (para migrar as antigas)
    weatherMode: "horas",      // horas (agora, depois, amanhã…) | dias
    forecastDays: 2,           // 1..3 (modo "dias")
    hint: true,                // frase amigável (guarda-chuva, agasalho…)
    weekWeather: true,         // tempo de cada dia na faixa da semana
    holidays: true,            // feriados nacionais (e o aniversário de Blumenau)
    river: { show: true, cota: 0 },          // cota = altura (m) em que a rua da casa alaga; 0 = não informada
    alerts: { show: true, bairro: "" },      // avisos da Defesa Civil de Blumenau para o bairro
    calendar: { mode: "demo", icsUrl: "", calId: "", apiKey: "", daysAhead: 7, laterCount: 3 },
    reminders: [],             // { id, time:"08:00", text, days:[0..6] }
    rest: { idleMin: 10, night: true, nightStart: "22:00", nightEnd: "06:00", morningWake: true, dim: 0.4, screenOff: false },
    proxy: "",                 // endereço do servidor do painel (se não for o mesmo do site)
  };

  const clone = o => JSON.parse(JSON.stringify(o));
  function merge(base, over) {
    if (!over || typeof over !== "object") return base;
    for (const k of Object.keys(base)) {
      if (!(k in over)) continue;
      const b = base[k], o = over[k];
      if (b && typeof b === "object" && !Array.isArray(b)) base[k] = merge(b, o);
      else if (Array.isArray(b)) { if (Array.isArray(o)) base[k] = o; }
      else if (typeof o === typeof b) base[k] = o;
    }
    return base;
  }

  let state;
  function migrate(saved) {
    // v1 → v2: o modo "próximos dias" era o padrão; o novo padrão é "próximas horas"
    if (saved && !saved.v) { saved.weatherMode = "horas"; saved.v = 2; }
    return saved;
  }
  function load() {
    try { state = merge(clone(DEFAULTS), migrate(JSON.parse(localStorage.getItem(KEY) || "{}"))); }
    catch (e) { state = clone(DEFAULTS); }
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* modo privado */ } }
  function setIn(obj, path, val) {
    const parts = path.split(".");
    let o = obj;
    while (parts.length > 1) o = o[parts.shift()];
    o[parts[0]] = val;
  }
  function getIn(obj, path) { return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj); }

  load();
  P.cfg = {
    DEFAULTS,
    all: () => state,
    get: p => getIn(state, p),
    set(path, val, silent) { setIn(state, path, val); persist(); if (!silent) P.bus.emit("cfg", path); },
    reset() { state = clone(DEFAULTS); persist(); P.bus.emit("cfg", "*"); },
    exportCode() { return "PNL1." + btoa(unescape(encodeURIComponent(JSON.stringify(state)))); },
    importCode(code) {
      const raw = String(code || "").trim().replace(/^PNL1\./, "");
      const obj = migrate(JSON.parse(decodeURIComponent(escape(atob(raw)))));
      state = merge(clone(DEFAULTS), obj);
      P.cfg.isFirstRun = false;
      persist(); P.bus.emit("cfg", "*");
    },
  };

  /* ---------- configuração do site (deploy.json): endereço do servidor e padrões do primeiro uso ---------- */
  P.deploy = { proxy: "", defaults: {} };
  P.cfg.isFirstRun = !localStorage.getItem(KEY);
  P.cfg.loadDeploy = async function () {
    try {
      const r = await fetch("deploy.json?a=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      P.deploy = Object.assign({ proxy: "", defaults: {} }, d);
      if (P.cfg.isFirstRun && d.defaults && Object.keys(d.defaults).length) {
        state = merge(state, d.defaults); persist(); P.bus.emit("cfg", "*");
      }
    } catch (e) { /* sem deploy.json: tudo bem */ }
  };

  /* ---------- cache de dados (para mostrar algo se a internet cair) ---------- */
  P.cache = {
    get(k) { try { return JSON.parse(localStorage.getItem("painel:c:" + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem("painel:c:" + k, JSON.stringify(v)); } catch (e) { /* cheio */ } },
  };

  /* ---------- utilidades ---------- */
  const U = (P.util = {});
  U.$ = (s, el) => (el || document).querySelector(s);
  U.$$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  U.esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  U.pad = n => String(n).padStart(2, "0");
  U.startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  U.addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  U.sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  U.dayDiff = (d, ref) => Math.round((U.startOfDay(d) - U.startOfDay(ref || new Date())) / 86400000);
  U.uid = () => Math.random().toString(36).slice(2, 10);
  U.cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  U.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /** "09:15" (24h) ou "9:15" + sufixo (12h) */
  U.fmtTime = (d, withAmPm) => {
    if (P.cfg.get("clock24")) return U.pad(d.getHours()) + ":" + U.pad(d.getMinutes());
    const h = d.getHours() % 12 || 12;
    return h + ":" + U.pad(d.getMinutes()) + (withAmPm ? (d.getHours() < 12 ? " AM" : " PM") : "");
  };
  U.dayLabel = (date, short) => {
    const diff = U.dayDiff(date);
    if (diff === 0) return "Hoje";
    if (diff === 1) return "Amanhã";
    const wd = date.toLocaleDateString("pt-BR", { weekday: short ? "short" : "long" }).replace("-feira", "").replace(".", "");
    return wd + " " + date.getDate();
  };
  /** De quando é um dado: "das 14:30" (hoje) · "de ontem, 14:30" · "de 12/10" */
  U.stamp = d => {
    const diff = U.dayDiff(d);
    if (diff === 0) return "das " + U.fmtTime(d);
    if (diff === -1) return "de ontem, " + U.fmtTime(d);
    return "de " + d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };
  /** Coloca os algarismos de um texto na fonte de números (a fonte de texto tem zero cortado) */
  U.nums = s => U.esc(s).replace(/\d+(?:[:,.]\d+)*/g, m => `<span class="num">${m}</span>`);
  U.parseHM = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ""); return m ? [+m[1], +m[2]] : [0, 0]; };

  /** fetch com limite de tempo */
  U.fetchT = async (url, opt, ms) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms || 15000);
    try { return await fetch(url, Object.assign({}, opt, { signal: ctl.signal })); }
    finally { clearTimeout(t); }
  };

  /* ---------- servidor do painel (proxy do Cloudflare Worker), se existir ---------- */
  P.server = { base: "", ok: false };
  P.server.detect = async function () {
    const candidates = [];
    const custom = (P.cfg.get("proxy") || P.deploy.proxy || "").trim().replace(/\/+$/, "");
    if (custom) candidates.push(custom);
    if (/^https?:/.test(location.protocol)) candidates.push(location.origin);
    for (const base of candidates) {
      try {
        const r = await U.fetchT(base + "/api/ping", { cache: "no-store" }, 6000);
        if (r.ok) { const j = await r.json(); if (j && j.app === "painel") { P.server.base = base; P.server.ok = true; return true; } }
      } catch (e) { /* tenta o próximo */ }
    }
    P.server.base = ""; P.server.ok = false;
    return false;
  };
})();
