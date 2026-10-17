// Gera um .ics de teste com datas relativas a hoje:  node tools/make-fixture.js > public/_test.ics
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const ymd = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
const wk = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const ev = (uid, d, h1, h2, title, loc, extra = "") =>
  `BEGIN:VEVENT\nUID:${uid}\nDTSTART;TZID=America/Sao_Paulo:${ymd(d)}T${h1}0000\nDTEND;TZID=America/Sao_Paulo:${ymd(d)}T${h2}0000\nSUMMARY:${title}\n${loc ? "LOCATION:" + loc + "\n" : ""}${extra}END:VEVENT\n`;
process.stdout.write(`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//painel//teste//PT
BEGIN:VTIMEZONE
TZID:America/Sao_Paulo
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:-0300
TZOFFSETTO:-0300
TZNAME:-03
END:STANDARD
END:VTIMEZONE
${ev("a", day(0), "23", "23", "Ligar para a Maria", "")}${ev("b", day(1), "09", "10", "Dentista", "Clínica Sorriso, Rua XV 100")}BEGIN:VEVENT
UID:c
DTSTART;VALUE=DATE:${ymd(day(2))}
DTEND;VALUE=DATE:${ymd(day(3))}
SUMMARY:Aniversário do Pedro
END:VEVENT
${ev("d", day(-7), "18", "19", "Hidroginástica", "Clube", "RRULE:FREQ=WEEKLY;BYDAY=" + wk[day(-7).getDay()] + "\n")}END:VCALENDAR
`);
