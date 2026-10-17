/* Ícones: de interface (Lucide, ISC) embutidos; de tempo (Meteocons, MIT) em assets/icons. */
(function () {
  "use strict";
  const P = window.P;

  P.ui = function (name, cls) {
    const inner = (window.UI_ICONS || {})[name] || "";
    return `<svg class="ic ${cls || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  };

  P.wxImg = function (name, cls) {
    const set = P.cfg.get("motion") ? "anim" : "static";
    return `<img class="${cls || "wi"}" src="assets/icons/${set}/${name}.svg" alt="" draggable="false">`;
  };

  /* Código do tempo (WMO, da Open-Meteo) → ícone Meteocons + descrição em português simples */
  const D = {
    0:  ["clear", "Céu limpo"],
    1:  ["clear", "Quase limpo"],
    2:  ["partly", "Poucas nuvens"],
    3:  ["overcast", "Nublado"],
    45: ["fog", "Neblina"], 48: ["fog", "Neblina"],
    51: ["drizzle", "Garoa"], 53: ["drizzle", "Garoa"], 55: ["drizzle", "Garoa"],
    56: ["sleet", "Garoa gelada"], 57: ["sleet", "Garoa gelada"],
    61: ["rain-light", "Chuva fraca"], 63: ["rain", "Chuva"], 65: ["extreme-rain", "Chuva forte"],
    66: ["sleet", "Chuva gelada"], 67: ["sleet", "Chuva gelada"],
    71: ["snow", "Neve"], 73: ["snow", "Neve"], 75: ["snow", "Neve"], 77: ["snow", "Neve"],
    80: ["rain-light", "Pancadas de chuva"], 81: ["rain", "Pancadas de chuva"], 82: ["extreme-rain", "Chuva muito forte"],
    85: ["snow", "Neve"], 86: ["snow", "Neve"],
    95: ["storm", "Trovoadas"], 96: ["storm-hail", "Trovoadas e granizo"], 99: ["storm-hail", "Trovoadas e granizo"],
  };
  const ICON = {
    clear: d => (d ? "clear-day" : "clear-night"),
    partly: d => (d ? "partly-cloudy-day" : "partly-cloudy-night"),
    overcast: d => (d ? "overcast-day" : "overcast-night"),
    fog: d => (d ? "fog-day" : "fog-night"),
    drizzle: () => "drizzle",
    sleet: () => "sleet",
    "rain-light": d => (d ? "partly-cloudy-day-rain" : "partly-cloudy-night-rain"),
    rain: () => "rain",
    "extreme-rain": () => "extreme-rain",
    snow: () => "snow",
    storm: d => (d ? "thunderstorms-day" : "thunderstorms-night"),
    "storm-hail": () => "thunderstorms-hail",
  };
  P.wmo = function (code, isDay) {
    const e = D[code] || ["overcast", ""];
    return { icon: ICON[e[0]](isDay !== false), text: e[1], kind: e[0] };
  };
  /** gravidade (para escolher o "pior" tempo de um período) */
  P.wmoSeverity = c => (c >= 95 ? 5 : c >= 80 ? 4 : c >= 61 ? 4 : c >= 51 ? 3 : c >= 71 ? 3 : c >= 45 ? 2 : c >= 3 ? 1 : 0);
})();
