// Such-Bot für Tests: findet mit einer Strahlsuche (beam search) einen Weg durch ein Level.
// Damit prüfen die Tests, dass jedes Level schaffbar ist (auch nur gehend, wie im Klassenmodus).
//   node tools/bot.js [--walk] [Levelnummer …]     prüft die Standard-Level
"use strict";
const E = require("../public/js/engine.js");

const K = 4; // Frames pro Entscheidung
function actions(walk) {
  const list = [];
  const moves = walk ? [[1, false], [0, false], [-1, false]] : [[1, true], [1, false], [0, false], [-1, true]];
  for (const [dir, b] of moves) for (const j of ["none", "press", "hold"]) list.push({ dir, b, j });
  return list;
}
function bits(a, f) {
  return E.encodeInput({ left: a.dir < 0, right: a.dir > 0, b: a.b, a: a.j !== "none", aPressed: a.j === "press" && f === 0 });
}

// Ein Level allein spielen, bis die Fahne erreicht ist. Rückgabe: { inputs, flag, w } oder { failed, col }
function solveStage(stages, si, carry, opts) {
  opts = opts || {};
  const W = opts.width || 200, ACT = actions(opts.walk);
  let beam = [{ w: E.createSoloWorld(stages, si, carry), path: [] }];
  let furthest = -1;
  for (let step = 0; step < (opts.steps || 900) && beam.length; step++) {
    const next = [];
    for (const s of beam) for (const a of ACT) {
      const w = E.cloneWorld(s.w);
      let dead = false, flag = false, used = 0;
      const path = s.path.slice();
      for (let f = 0; f < K; f++) {
        const v = bits(a, f);
        path.push(v); used++;
        const ev = E.stepWorld(w, [E.decodeInput(v)]);
        if (ev.some((e) => e.t === "die")) { dead = true; break; }
        if (ev.some((e) => e.t === "flag")) { flag = true; break; }
      }
      if (dead) continue;
      if (flag) return { inputs: path, w };
      next.push({ w, path });
    }
    // wer schon in einen Abgrund fällt, kommt zuletzt, so übersteht Warten auf einen Lift das Aussieben
    const doomed = (w) => (w.p.y + w.p.h > 212 && w.p.lift < 0 ? 1 : 0);
    next.sort((u, v) => doomed(u.w) - doomed(v.w) || v.w.p.x - u.w.p.x || u.w.p.y - v.w.p.y);
    for (const s of next) furthest = Math.max(furthest, Math.floor(s.w.p.x / 16));
    const seen = new Set();
    beam = [];
    for (const s of next) {
      const p = s.w.p;
      const key = [Math.round(p.x / 3), Math.round(p.y / 4), Math.round(p.vx * 4), Math.round(p.vy * 2), p.big ? 1 : 0, p.lift,
        s.w.enemies.filter((e) => e.state === "walk").length].join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      beam.push(s);
      if (beam.length >= W) break;
    }
  }
  return { failed: true, col: furthest };
}

// Mehrere Level hintereinander wie im Rennen: Level, Fahne und Weg zur Hütte, Etappenkarte, nächstes Level.
function solveMatch(stages, plan, opts) {
  const inputs = [];
  let carry = {};
  for (let k = 0; k < plan.length; k++) {
    const r = solveStage(stages, plan[k], carry, opts);
    if (r.failed) return { failed: true, k, col: r.col };
    inputs.push(...r.inputs);
    if (k === plan.length - 1) break;
    // Fahne, Weg zur Hütte und Etappenkarte ohne Eingabe
    const w = r.w;
    let done = false;
    while (!done) { inputs.push(0); done = E.stepWorld(w, [E.decodeInput(0)]).some((e) => e.t === "stageDone"); }
    for (let i = 0; i < E.STAGE_PAUSE; i++) inputs.push(0);
    carry = { big: w.p.big, coins: w.p.coins };
  }
  const m = E.createMatch(stages, plan, 1, {});
  for (const v of inputs) E.stepMatch(m, [v]);
  return { fin: m.recs[0].fin, inputs };
}

module.exports = { solveStage, solveMatch };

if (require.main === module) {
  const walk = process.argv.includes("--walk");
  const lib = E.normalizeLibrary(require("../public/js/levels.js"));
  const stages = E.buildStages(lib);
  const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
  for (const si of only.length ? only : stages.map((_, i) => i)) {
    const t0 = Date.now();
    const r = solveStage(stages, si, {}, { walk, width: +process.env.WIDTH || 200 });
    const name = lib.stages[si].name;
    if (r.failed) console.log(`Level ${si + 1} (${name}): NICHT geschafft, weiteste Spalte ${r.col}`);
    else console.log(`Level ${si + 1} (${name}): Fahne nach ${r.inputs.length} Frames (${(r.inputs.length / 60).toFixed(2)} s)${walk ? " gehend" : ""}, Suche ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
}
