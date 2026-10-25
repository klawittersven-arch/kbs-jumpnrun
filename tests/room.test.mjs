// Tests der Raum-Logik ohne Netz: node tests/room.test.mjs
// Geprüft wird der Ablauf einer Stunde: Anmeldung, Qualifying, Finale mit drei Spielern, Siegerehrung.
import { createRequire } from 'node:module';
import { RoomLogic, cleanName } from '../src/room.mjs';
const require = createRequire(import.meta.url);
const E = require('../public/js/engine.js');

let fails = 0, checks = 0;
function ok(cond, name, info) {
  checks++;
  if (cond) console.log('  ✓ ' + name);
  else { fails++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + JSON.stringify(info) : '')); }
}

// ein Raum mit künstlicher Uhr und Verbindungen, die alles mitschreiben
let clock = 1_000_000;
const conns = new Set();
let saved = null;
const room = new RoomLogic({
  load: async () => saved && JSON.parse(saved),
  save: async (s) => { saved = JSON.stringify(s); },
  wipe: async () => { saved = null; },
  conns: () => [...conns],
  setMeta: (c, meta) => { c.meta = meta; },
  now: () => clock,
});
function conn() {
  const c = { ws: {}, meta: {}, inbox: [], closed: null };
  c.send = (o) => c.inbox.push(JSON.parse(JSON.stringify(o)));
  c.sendRaw = (s) => c.inbox.push(JSON.parse(s));
  c.close = (code, why) => { c.closed = why; conns.delete(c); };
  conns.add(c);
  return c;
}
const last = (c, t) => [...c.inbox].reverse().find((m) => m.t === t);
const say = (c, obj) => room.message(c, JSON.stringify(obj));

// ein kurzes Testlevel: flacher Boden, Fahne nach 14 Feldern
const row = (s) => s.padEnd(40, '.');
const tiny = (name) => ({ name, theme: 'meadow', cols: 40, rows: [...Array(13)].map(() => row('')).concat(['#'.repeat(40), '#'.repeat(40)]),
  enemies: [], start: [2, 12], flag: [16, 12], hut: [22, 12] });

console.log('\n== Namen');
ok(cleanName(' lena ', 'k') === 'Lena K.', 'Vorname groß, Anfangsbuchstabe mit Punkt');
ok(cleanName('Lena', 'Kö') === null && cleanName('<b>', 'K') === null, 'ungültige Eingaben werden abgelehnt');

console.log('\n== Anmeldung und Qualifying');
const teacher = conn();
await room.open(teacher, { code: 'ABCDE', role: 'teacher', key: 'k'.repeat(20) });
ok(last(teacher, 'room') && last(teacher, 'room').phase === 'setup', 'Lehrkraft verbindet sich, Raum ist in der Einrichtung');
const intruder = conn();
await room.open(intruder, { code: 'ABCDE', role: 'teacher', key: 'x'.repeat(20) });
ok(intruder.closed === 'code-taken', 'ein zweiter Lehrer-Schlüssel wird abgewiesen');

await say(teacher, { t: 'quali-open', stage: { rows: 'kaputt' }, rounds: 1 });
ok(last(teacher, 'error').why === 'bad-level', 'ein kaputtes Level wird abgelehnt');
await say(teacher, { t: 'quali-open', stage: tiny('Probe'), rounds: 2, si: 0, reset: true });
ok(last(teacher, 'room').phase === 'quali' && last(teacher, 'room').quali.rounds === 2, 'Qualifying ist offen, zwei Runden');

const phones = [];
for (const [first, init] of [['Lena', 'K'], ['Mehmet', 'Ö'], ['Zoë', 'M'], ['Lena', 'K']]) {
  const c = conn(); c.pid = 'p' + phones.length + 'xxxxxxxx';
  await room.open(c, { code: 'ABCDE', role: 'player', pid: c.pid });
  await say(c, { t: 'join', first, initial: init });
  phones.push(c);
}
const names = last(teacher, 'room').players.map((p) => p.name);
ok(names.join('|') === 'Lena K.|Mehmet Ö.|Zoë M.|Lena K. 2', 'vier Anmeldungen, doppelter Name bekommt eine Zahl', names);
await say(phones[0], { t: 'level?' });
ok(last(phones[0], 'levels').quali && last(phones[0], 'levels').quali.name === 'Probe', 'das Handy bekommt das Level des Qualifyings');

const qlv = last(phones[0], 'you').quali.lv;
await say(phones[0], { t: 'result', frames: 1800, splits: [900], lv: qlv });
await say(phones[1], { t: 'result', frames: 1700, splits: [850], lv: qlv });
await say(phones[2], { t: 'result', frames: 2000, splits: [990], lv: qlv });
await say(phones[2], { t: 'result', frames: 100, lv: qlv });
await say(phones[3], { t: 'result', frames: 1500, lv: qlv - 1 });
const r = last(teacher, 'room');
ok(r.players.find((p) => p.name === 'Zoë M.').total === 2000, 'nur die erste Zeit zählt (ein Versuch)');
ok(last(phones[3], 'result-old') && r.players[3].total === null, 'eine Zeit aus einem alten Qualifying wird nicht gezählt');
ok(last(phones[1], 'you').me.rank === 1 && last(phones[0], 'you').me.rank === 2, 'Plätze im Qualifying stimmen');

console.log('\n== Finale');
const order = [phones[1], phones[0], phones[2]]; // die drei Schnellsten
await say(teacher, { t: 'final-setup', p: order.map((c) => c.pid), stages: [tiny('Eins'), tiny('Zwei')], si: [0, 1], shared: true });
ok(last(teacher, 'room').phase === 'final-setup' && last(teacher, 'room').final.names.join() === 'Mehmet Ö.,Lena K.,Zoë M.', 'Finale eingerichtet');
ok(last(phones[2], 'you').final.slot === 2 && last(phones[3], 'you').final === null, 'Finalisten kennen ihren Platz, die anderen sind nicht dabei');
await say(teacher, { t: 'final-start' });
const fin = last(teacher, 'room').final;
ok(fin.state === 'running' && fin.startAt === clock + 6000, 'Finale läuft mit Countdown');

// Eingaben: Platz 0 läuft sofort los, Platz 1 eine halbe Sekunde später, Platz 2 bleibt stehen
const want = [(f) => 2, (f) => (f < 30 ? 0 : 2), (f) => 0];
const logs = want.map((fn) => { let s = ''; for (let f = 0; f < 900; f++) s += E.inputChar(fn(f)); return s; });
// Platz 2 schickt zuerst ein Paket mit Lücke: der Raum fordert ab Frame 0 nach
await say(order[2], { t: 'in', f: 6, d: logs[2].slice(6, 12) });
ok(last(order[2], 'need') && last(order[2], 'need').from === 0, 'bei einer Lücke fordert der Raum die fehlenden Frames an');
for (let f = 0; f < 900; f += 6) {
  for (let s = 0; s < 3; s++) await say(order[s], { t: 'in', f, d: logs[s].slice(f, f + 6) });
  if (room.s.phase === 'podium') break;
}
const relayed = order[0].inbox.filter((m) => m.t === 'in' && m.s === 1).map((m) => m.d).join('');
ok(relayed === logs[1].slice(0, relayed.length) && relayed.length > 100, 'Eingaben werden an die anderen Finalisten weitergereicht');
const tin = teacher.inbox.filter((m) => m.t === 'in');
ok(tin.some((m) => m.s === 0) && tin.some((m) => m.s === 2), 'und an den Beamer');

// zum Vergleich dasselbe Rennen direkt gerechnet
const ref = E.createMatch([tiny('Eins'), tiny('Zwei')].map(E.stageView), [0, 1], 3, { shared: true, regrow: true });
for (let f = 0; f < 900 && ref.recs[1].fin == null; f++) E.stepMatch(ref, [0, 1, 2].map((s) => E.charInput(logs[s][f])));
const done = last(teacher, 'room');
ok(done.phase === 'podium', 'nach zwei Zieleinläufen von drei ist das Finale entschieden');
ok(done.final.fin[0] === ref.recs[0].fin && done.final.fin[1] === ref.recs[1].fin && done.final.fin[2] === null,
  'Zielzeiten aus der Rechnung des Raums (' + (ref.recs[0].fin / 60).toFixed(2) + ' s und ' + (ref.recs[1].fin / 60).toFixed(2) + ' s)', done.final.fin);
ok(done.final.place.join() === '0,1,2', 'Siegerehrung: Platz 1, 2, 3', done.final.place);
ok(last(order[0], 'you').winner === 'Mehmet Ö.', 'alle Handys erfahren den Sieger');

console.log('\n== Neustart des Servers mitten im Finale');
await say(teacher, { t: 'final-setup', p: order.slice(0, 2).map((c) => c.pid), stages: [tiny('Eins'), tiny('Zwei')], shared: false });
await say(teacher, { t: 'final-start' });
for (let f = 0; f < 120; f += 6) for (let s = 0; s < 2; s++) await say(order[s], { t: 'in', f, d: logs[s].slice(f, f + 6) });
room.s = null; room.race = null; // Speicher bleibt, Arbeitsspeicher ist weg
await say(order[0], { t: 'in', f: 120, d: logs[0].slice(120, 126) });
ok(last(order[0], 'need').from === 0, 'nach dem Neustart fordert der Raum alles ab Frame 0 neu an');
for (let s = 0; s < 2; s++) await say(order[s], { t: 'in', f: 0, d: logs[s].slice(0, 400) });
await say(teacher, { t: 'logs?' });
ok(last(teacher, 'logs').logs[1] === logs[1].slice(0, 400), 'danach hat der Raum die Protokolle wieder vollständig');

console.log('\n== Finale beenden und Sitzung löschen');
await say(teacher, { t: 'final-setup', p: order.slice(0, 2).map((c) => c.pid), stages: [tiny('Eins'), tiny('Zwei')], shared: false });
await say(teacher, { t: 'final-start' });
for (let f = 0; f < 120; f += 6) { await say(order[0], { t: 'in', f, d: E.inputChar(0).repeat(6) }); await say(order[1], { t: 'in', f, d: E.inputChar(2).repeat(6) }); }
await say(teacher, { t: 'final-end' });
ok(last(teacher, 'room').phase === 'podium' && last(teacher, 'room').final.place.join() === '1,0', 'beim Abbruch gewinnt, wer weiter vorne ist');
await say(teacher, { t: 'kick', pid: phones[3].pid });
ok(last(phones[3], 'kicked') && last(teacher, 'room').players.length === 3, 'die Lehrkraft entfernt einen Namen');
await say(teacher, { t: 'wipe' });
ok(saved === null && phones[0].closed === 'ended', 'Sitzung beendet, Daten gelöscht, Handys getrennt');

console.log(`\n${checks - fails} von ${checks} Prüfungen bestanden.`);
process.exit(fails ? 1 : 0);
