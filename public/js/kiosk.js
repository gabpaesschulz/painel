/* Modo quiosque: descanso (tela escura e discreta), acordar por toque/movimento (Fully Kiosk), botão de configurações. */
(function () {
  "use strict";
  const P = window.P, U = P.util;
  let rest, resting = false, lastAct = Date.now(), fullyOn = false;

  const hasFully = () => typeof window.fully !== "undefined";

  function idleLimitMs() {
    const r = P.cfg.get("rest");
    if (P.view.isNight(new Date())) return 60 * 1000;     // de noite o descanso vem rápido
    return r.idleMin > 0 ? r.idleMin * 60 * 1000 : 0;
  }

  function fillRest() {
    if (!rest) return;
    const now = new Date();
    U.$(".rt", rest).textContent = U.fmtTime(now);
    const wd = now.toLocaleDateString("pt-BR", { weekday: "long" });
    U.$(".rd", rest).textContent = U.cap(wd) + ", " + now.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
    const next = P.cal.upcoming()[0];
    U.$(".rn", rest).textContent = next
      ? `Próximo: ${next.title} — ${U.dayLabel(next.start)}${next.allDay ? "" : " às " + U.fmtTime(next.start)}`
      : "";
    // desloca um pouquinho a cada minuto (evita imagem "queimada" na tela)
    const dx = (Math.random() * 6 - 3).toFixed(1), dy = (Math.random() * 4 - 2).toFixed(1);
    U.$(".ri", rest).style.transform = `translate(${dx}rem, ${dy}rem)`;
  }

  function enterRest() {
    if (resting || (P.settings && P.settings.isOpen())) return;
    resting = true;
    fillRest();
    rest.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => rest.classList.add("on")));
    if (P.cfg.get("rest.screenOff") && hasFully()) { try { window.fully.turnScreenOff(); } catch (e) { /* ignora */ } }
  }

  function wake() {
    lastAct = Date.now();
    if (!resting) return;
    resting = false;
    rest.classList.remove("on");
    setTimeout(() => { if (!resting) rest.hidden = true; }, 1000);
    if (hasFully()) { try { window.fully.turnScreenOn(); } catch (e) { /* ignora */ } }
    P.bus.emit("wake");
  }

  function activity() { lastAct = Date.now(); if (resting) wake(); }

  function checkIdle() {
    const lim = idleLimitMs();
    if (lim && !resting && Date.now() - lastAct >= lim) enterRest();
  }

  /* ---------- botão de configurações: segurar 1 segundo ---------- */
  function setupGear() {
    const g = document.getElementById("gear");
    let timer = null;
    const cancel = () => { clearTimeout(timer); timer = null; g.classList.remove("holding"); };
    g.addEventListener("pointerdown", e => {
      e.preventDefault();
      g.classList.add("holding");
      timer = setTimeout(() => { cancel(); P.settings.open(); }, 1100);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => g.addEventListener(ev, cancel));
    g.addEventListener("contextmenu", e => e.preventDefault());
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") P.settings.open(); });
  }

  /* ---------- manter a tela ligada (Screen Wake Lock) ---------- */
  let lock = null;
  async function keepAwake() {
    if (!P.cfg.get("keepAwake") || !("wakeLock" in navigator) || document.visibilityState !== "visible") return;
    try {
      if (lock) return;
      lock = await navigator.wakeLock.request("screen");
      lock.addEventListener("release", () => { lock = null; });
    } catch (e) { lock = null; /* sem permissão ou sem suporte: ignora */ }
  }

  P.kiosk = {
    isResting: () => resting,
    isFully: hasFully,
    motion() { activity(); },          // chamado pelo Fully Kiosk quando detecta movimento
    restNow() { lastAct = 0; enterRest(); },
    wake,
  };

  P.kiosk.init = function () {
    rest = document.getElementById("rest");
    setupGear();
    ["pointerdown", "touchstart", "keydown"].forEach(ev => window.addEventListener(ev, activity, { passive: true, capture: true }));
    rest.addEventListener("pointerdown", wake);
    setInterval(checkIdle, 5000);
    keepAwake();
    document.addEventListener("visibilitychange", keepAwake);
    P.bus.on("cfg", p => { if (p === "keepAwake" || p === "*") { if (!P.cfg.get("keepAwake") && lock) { lock.release(); lock = null; } else keepAwake(); } });
    P.bus.on("minute", () => { if (resting) fillRest(); });
    P.bus.on("data", () => { if (resting) fillRest(); });

    // Fully Kiosk (opcional): acorda com movimento; precisa da opção "JavaScript Interface" ligada
    if (hasFully()) {
      fullyOn = true;
      try {
        window.fully.bind("onMotion", "P.kiosk.motion();");
        window.fully.bind("screenOn", "P.kiosk.motion();");
        window.fully.bind("onScreensaverStop", "P.kiosk.motion();");
      } catch (e) { console.warn("fully.bind:", e); }
    }

    const fromHash = () => {
      const m = /^#config(?:=(\w+))?$/.exec(location.hash);
      if (m) P.settings.open(m[1]);
      else if (location.hash === "#rest") P.kiosk.restNow();
    };
    setTimeout(fromHash, 300);
    window.addEventListener("hashchange", fromHash);
  };
})();
