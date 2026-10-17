// Confere o contraste (WCAG) de cada tema direto do themes.css:  node tools/contrast.js
const fs = require("fs"), path = require("path");
const css = fs.readFileSync(path.join(__dirname, "../public/css/themes.css"), "utf8");
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = h => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const themes = {};
for (const m of css.matchAll(/(?:^|\n)(?::root, )?\[data-theme="(\w+)"\]\s*\{([^}]*)\}/g)) {
  const vars = {}; for (const v of m[2].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) vars[v[1]] = v[2];
  if (vars.bg) themes[m[1]] = vars;
}
let bad = 0;
console.log("tema        texto  suave  destaque  max   min   texto-no-destaque");
for (const [name, t] of Object.entries(themes)) {
  const r = { text: ratio(t["text-c"], t.bg), soft: ratio(t.soft, t.bg), accent: ratio(t.accent, t.bg), hot: ratio(t.hot, t.bg), cold: ratio(t.cold, t.bg), ink: ratio(t["accent-ink"], t.accent) };
  const need = { text: 7, soft: 7, accent: 4.5, hot: 4.5, cold: 4.5, ink: 4.5 };
  const flag = Object.keys(r).filter(k => r[k] < need[k]);
  if (flag.length) bad++;
  console.log(name.padEnd(11), Object.values(r).map(v => v.toFixed(1).padStart(5)).join("  "), flag.length ? "  ← abaixo do mínimo: " + flag.join(",") : "  ok");
}
console.log(bad ? "\nHÁ TEMAS ABAIXO DO MÍNIMO" : "\nTodos os temas passam (texto ≥ 7:1 AAA; destaques ≥ 4,5:1 AA).");
process.exitCode = bad ? 1 : 0;
