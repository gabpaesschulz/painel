// Teste do leitor de agenda (.ics): node tools/test-ics.js
const path = require("path"), fs = require("fs");
global.window = global; global.localStorage = { getItem: () => null, setItem() {} };
global.location = { protocol: "http:", origin: "http://x" };
global.ICAL = require(path.join(__dirname, "../public/vendor/ical.min.js"));
const ICALmod = global.ICAL; if (ICALmod.default) global.ICAL = ICALmod.default;
for (const f of ["core.js", "icons.js", "data.js"]) eval(fs.readFileSync(path.join(__dirname, "../public/js", f), "utf8"));
const P = global.P;

const fmt = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const ymd = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
const wk = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const t1 = day(1), t2 = day(2), t3 = day(3);

const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//teste//PT
BEGIN:VTIMEZONE
TZID:America/Sao_Paulo
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:-0300
TZOFFSETTO:-0300
TZNAME:-03
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:dentista@x
DTSTART;TZID=America/Sao_Paulo:${ymd(t1)}T090000
DTEND;TZID=America/Sao_Paulo:${ymd(t1)}T100000
SUMMARY:Dentista
LOCATION:Clínica Sorriso
END:VEVENT
BEGIN:VEVENT
UID:aniv@x
DTSTART;VALUE=DATE:${ymd(t2)}
DTEND;VALUE=DATE:${ymd(day(3))}
SUMMARY:Aniversário da Ana
END:VEVENT
BEGIN:VEVENT
UID:semanal@x
DTSTART;TZID=America/Sao_Paulo:${ymd(day(-14))}T180000
DTEND;TZID=America/Sao_Paulo:${ymd(day(-14))}T190000
RRULE:FREQ=WEEKLY;BYDAY=${wk[day(-14).getDay()]}
SUMMARY:Hidroginástica
END:VEVENT
BEGIN:VEVENT
UID:utc@x
DTSTART:${fmt(new Date(t3.setHours(15, 0, 0, 0)))}
DTEND:${fmt(new Date(t3.setHours(16, 0, 0, 0)))}
SUMMARY:Evento em UTC
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
UID:remedio@x
DTSTART;TZID=America/Sao_Paulo:20150310T080000
DTEND;TZID=America/Sao_Paulo:20150310T081500
RRULE:FREQ=DAILY
SUMMARY:Remédio da pressão
END:VEVENT
BEGIN:VEVENT
UID:missa@x
DTSTART;TZID=America/Sao_Paulo:20050102T100000
DTEND;TZID=America/Sao_Paulo:20050102T110000
RRULE:FREQ=WEEKLY
SUMMARY:Missa
END:VEVENT
BEGIN:VEVENT
UID:cancel@x
DTSTART;TZID=America/Sao_Paulo:${ymd(t1)}T120000
DTEND;TZID=America/Sao_Paulo:${ymd(t1)}T130000
SUMMARY:Cancelado
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`;

const from = P.util.startOfDay(new Date()), to = P.util.addDays(from, 7);
const evs = P.cal.parseICS(ics, from, to).sort((a, b) => a.start - b.start);
for (const e of evs) console.log(e.start.toLocaleString("pt-BR"), "→", e.end.toLocaleTimeString("pt-BR"), e.allDay ? "[dia todo]" : "", e.title, e.loc ? "@" + e.loc : "");
const titles = evs.map(e => e.title);
const assert = (c, m) => { if (!c) { console.error("FALHOU:", m); process.exitCode = 1; } };
assert(titles.includes("Dentista"), "dentista");
assert(titles.includes("Aniversário da Ana") && evs.find(e => e.title.startsWith("Aniv")).allDay, "dia todo");
assert(titles.filter(t => t === "Hidroginástica").length >= 1, "recorrência semanal");
assert(titles.filter(t => t === "Remédio da pressão").length === 7, "repetição diária de 2015 (milhares de voltas) aparece todo dia");
assert(titles.filter(t => t === "Missa").length === 1, "repetição semanal de 2005 aparece na semana");
assert(titles.includes("Evento em UTC"), "utc");
assert(!titles.includes("Cancelado"), "cancelado some");
assert(evs.find(e => e.title === "Dentista").start.getHours() === 9, "fuso do dentista = 9h");
console.log(process.exitCode ? "\nHÁ FALHAS" : "\nOK — leitor de agenda funcionando");
