// Engine-Tests (Node, ohne Zusatzpakete): node tests/engine.test.js
//  1. Allein gespielt verhält sich die neue Engine Frame für Frame wie die des Einzelspiels (Artefakt).
//  2. Ein Rennen (Match) ist deterministisch und lässt sich kopieren.
//  3. Der Rollback-Abgleich liefert auf allen Geräten denselben Stand, auch mit Verzögerung und Schätzfehlern.
//  4. Gemeinsames Level: Münzen und Blöcke für alle, fremde Panzer treffen nicht, Ziegel wachsen nach.
"use strict";
const path = require("path");
const OLD = require("../tools/ref/old-engine.js");
const E = require("../public/js/engine.js");
const LV = require("../tools/ref/artifact-levels.json");

let fails = 0, checks = 0;
function ok(cond, name, info) {
  checks++;
  if (cond) console.log("  ✓ " + name);
  else { fails++; console.log("  ✗ " + name + (info !== undefined ? "  → " + JSON.stringify(info) : "")); }
}

// kleiner, reproduzierbarer Zufall
function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
// Eingabe-Skript: meist nach rechts, mal rennen, springen (kurz und lang), selten zurück
function script(seed, n, allowRun) {
  const r = rng(seed), out = [];
  let hold = 0, dir = 1, run = false, aLeft = 0;
  for (let f = 0; f < n; f++) {
    if (hold-- <= 0) { hold = 10 + ((r() * 50) | 0); dir = r() < 0.82 ? 1 : r() < 0.5 ? 0 : -1; run = allowRun && r() < 0.5; }
    let press = false;
    if (aLeft > 0) aLeft--;
    else if (r() < 0.035) { aLeft = 2 + ((r() * 26) | 0); press = true; }
    out.push({ left: dir < 0, right: dir > 0, b: run, a: aLeft > 0 || press, aPressed: press });
  }
  return out;
}

console.log("\n== 1. Gleiches Verhalten wie das Einzelspiel");
{
  const oldST = OLD.buildStages(OLD.normalizeLevels(LV));
  const newST = E.buildStages(E.normalizeLibrary(LV));
  let frames = 0, mismatch = null;
  for (let si = 0; si < 2 && !mismatch; si++) {
    for (let seed = 1; seed <= 40 && !mismatch; seed++) {
      const ins = script(seed * 7 + si, 5000, seed % 3 !== 0);
      const a = OLD.createWorld(oldST, si), b = E.createSoloWorld(newST, si);
      for (let f = 0; f < ins.length; f++) {
        const ea = OLD.stepWorld(a, ins[f]).map((e) => e.t).join(","), eb = E.stepWorld(b, [ins[f]]).map((e) => e.t).join(",");
        frames++;
        const pa = a.p, pb = b.p;
        const sa = [pa.x, pa.y, pa.vx, pa.vy, pa.big, pa.h, a.coins, a.cam, a.status, a.freeze, pa.lift, ea].join("|");
        const sb = [pb.x, pb.y, pb.vx, pb.vy, pb.big, pb.h, pb.coins, pb.cam, pb.status, pb.freeze, pb.lift, eb].join("|");
        const enA = a.enemies.map((e) => [e.x, e.y, e.state].join(",")).join(";"), enB = b.enemies.map((e) => [e.x, e.y, e.state].join(",")).join(";");
        if (sa !== sb || enA !== enB || a.mods.size !== b.mods.size) { mismatch = { si, seed, f, sa, sb, en: enA === enB }; break; }
        if (a.status === "done" || (a.status === "dead" && a.goneSent)) break;
      }
    }
  }
  ok(!mismatch, "80 Eingabe-Skripte auf beiden Etappen, " + frames + " Frames: Figur, Gegner, Blöcke, Münzen identisch", mismatch);
}

console.log("\n== 2. Rennen: deterministisch und kopierbar");
const stages = E.buildStages(E.normalizeLibrary(LV));
function playMatch(opts, n, seeds, frames) {
  const m = E.createMatch(stages, [0, 1], n, opts);
  const ins = seeds.map((s) => script(s, frames, false));
  for (let f = 0; f < frames; f++) E.stepMatch(m, ins.map((x) => E.encodeInput(x[f])));
  return m;
}
function digest(m) {
  return JSON.stringify(m.recs.map((r) => [r.k, r.fin, r.deaths, r.p && [r.p.x, r.p.y, r.p.coins, r.p.status]])) +
    JSON.stringify(m.worlds.map((e) => [e.key, [...e.w.mods.entries()].join(), e.w.enemies.map((x) => x.state + x.x).join()]));
}
for (const shared of [false, true]) {
  const a = playMatch({ shared, regrow: true }, 4, [11, 12, 13, 14], 6000);
  const b = playMatch({ shared, regrow: true }, 4, [11, 12, 13, 14], 6000);
  ok(digest(a) === digest(b), (shared ? "gemeinsames Level" : "eigene Level") + ": zweimal gerechnet, gleicher Stand");
  // Kopie in der Mitte, beide weiterrechnen
  const m = E.createMatch(stages, [0, 1], 3, { shared, regrow: true });
  const ins = [21, 22, 23].map((s) => script(s, 4000, false));
  let copy = null;
  for (let f = 0; f < 4000; f++) {
    if (f === 1500) copy = E.cloneMatch(m);
    E.stepMatch(m, ins.map((x) => E.encodeInput(x[f])));
  }
  for (let f = 1500; f < 4000; f++) E.stepMatch(copy, ins.map((x) => E.encodeInput(x[f])));
  ok(digest(m) === digest(copy), (shared ? "gemeinsames Level" : "eigene Level") + ": Kopie rechnet genauso weiter");
}
{
  // Einzelspieler-Rennen über zwei Etappen kommt mit einer guten Eingabe ins Ziel (Bot aus tools/bot.js)
  const bot = require("../tools/bot.js");
  const plan = [0, 1];
  const res = bot.solveMatch(stages, plan, { width: 150 });
  ok(res && res.fin, "Ein Bot schafft beide Etappen hintereinander (" + (res && res.fin ? (res.fin / 60).toFixed(2) + " s" : "nicht im Ziel") + ")");
  if (res && res.inputs) {
    const m = E.createMatch(stages, plan, 1, {});
    for (const v of res.inputs) E.stepMatch(m, [v]);
    ok(m.recs[0].fin === res.fin, "dieselbe Eingabe ergibt im Rennen dieselbe Zielzeit");
  }
}

console.log("\n== 3. Abgleich über das Netz (Rollback)");
for (const shared of [false, true]) {
  const n = 4, F = 5000;
  const ins = [31, 32, 33, 34].map((s) => script(s, F, false).map(E.encodeInput));
  // Referenz: alles sofort bekannt
  const ref = E.createMatch(stages, [0, 1], n, { shared, regrow: true });
  for (let f = 0; f < F; f++) E.stepMatch(ref, ins.map((x) => x[f]));
  // vier Handys und ein Beamer, Pakete alle 6 Frames, jedes mit eigener Verspätung (bis 40 Frames), einer bricht ab und holt nach
  const r = rng(99 + (shared ? 1 : 0));
  const devs = [0, 1, 2, 3, -1].map((local) => ({ local, S: E.createSync(stages, [0, 1], n, { shared, regrow: true }, local), inbox: [] }));
  const sent = [0, 0, 0, 0];
  for (let f = 0; f < F; f++) {
    for (const d of devs) if (d.local >= 0) d.S.pushLocal(ins[d.local][f]);
    for (let s = 0; s < n; s++) {
      const outage = s === 2 && f > 1200 && f < 1800; // Platz 3 hat 10 Sekunden kein WLAN
      if ((f + 1) % 6 === 0 && !outage) {
        const from = sent[s], chars = ins[s].slice(from, f + 1).map(E.inputChar).join("");
        sent[s] = f + 1;
        for (const d of devs) if (d.local !== s) d.inbox.push({ at: f + 2 + ((r() * 40) | 0), s, from, chars });
      }
    }
    for (const d of devs) {
      d.inbox.sort((a, b) => a.at - b.at);
      while (d.inbox.length && d.inbox[0].at <= f) { const m = d.inbox.shift(); d.S.addRemote(m.s, m.from, m.chars); }
      if (d.local < 0) d.S.advanceTo(Math.min(f + 1, d.S.confirmed() + 60));
    }
  }
  // alles nachliefern
  for (const d of devs) {
    for (const m of d.inbox) d.S.addRemote(m.s, m.from, m.chars);
    for (let s = 0; s < n; s++) if (s !== d.local && d.S.known(s) < F) d.S.addRemote(s, d.S.known(s), ins[s].slice(d.S.known(s)).map(E.inputChar).join(""));
    if (d.local < 0) d.S.advanceTo(F);
  }
  const want = digest(ref);
  ok(devs.every((d) => digest(d.S.match()) === want), (shared ? "gemeinsames Level" : "eigene Level") + ": vier Handys und Beamer enden exakt beim Stand ohne Verzögerung");
}

console.log("\n== 4. Regeln im gemeinsamen Level");
{
  // ein eigenes kleines Level: Boden, eine Münze, ein Ziegel, ein Panzer-Gegner
  const row = (s) => s.padEnd(40, ".");
  const lib = E.normalizeLibrary({ stages: [{ name: "Test", theme: "meadow", cols: 40, rows: [
    row(""), row(""), row(""), row(""), row(""), row(""), row(""), row(""), row(""),
    row("..........B"), row(""), row(""), row(".....o"), "#".repeat(40), "#".repeat(40)],
    enemies: [{ kind: "snail", c: 20, r: 12 }], start: [2, 12], flag: [36, 12], hut: [37, 12] }] });
  const st = E.buildStages(lib);
  const m = E.createMatch(st, [0], 2, { shared: true, regrow: true });
  const w = m.worlds[0].w;
  // Spieler 0 läuft zur Münze, Spieler 1 bleibt stehen
  for (let f = 0; f < 60; f++) E.stepMatch(m, [2, 0]);
  ok(E.tileAt(w, 5, 12) === "." && m.recs[0].p.coins === 1 && m.recs[1].p.coins === 0, "Münze gehört dem, der sie zuerst nimmt, und ist danach für alle weg");
  // Ziegel: groß machen, darunter springen
  const p0 = m.recs[0].p;
  p0.big = true; p0.h = E.BIG_H; p0.y -= E.BIG_H - E.SMALL_H; p0.x = 10 * 16 + 2; p0.vx = 0;
  let broke = false;
  for (let f = 0; f < 40 && !broke; f++) { E.stepMatch(m, [f === 0 ? 4 | 16 : 4, 0]); broke = E.tileAt(w, 10, 9) === "."; }
  ok(broke && w.regrow.length === 1, "großer Spieler zerschlägt den Ziegel, er ist für alle weg");
  for (let f = 0; f < E.REGROW + 60; f++) E.stepMatch(m, [0, 0]);
  ok(E.tileAt(w, 10, 9) === "B", "nach " + E.REGROW / 60 + " Sekunden ist der Ziegel wieder da");
  // fremder Panzer: Spieler 0 macht die Schnecke zum Panzer und kickt ihn auf Spieler 1 zu
  const e = w.enemies[0];
  e.active = true; e.state = "slide"; e.vx = -E.PH.shellVx; e.kicker = 0; e.noHurt = 0; e.x = 60; e.y = m.recs[1].p.y + 10;
  const p1 = m.recs[1].p; p1.x = 40; p1.hurt = 0;
  let hit = false;
  for (let f = 0; f < 30; f++) { const ev = E.stepMatch(m, [0, 0]); if (ev.some((x) => x.t === "die" && x.s === 1)) hit = true; }
  ok(!hit && m.recs[1].p.status === "play", "Panzer eines Mitspielers trifft nicht");
}

console.log(`\n${checks - fails} von ${checks} Prüfungen bestanden.`);
process.exit(fails ? 1 : 0);
