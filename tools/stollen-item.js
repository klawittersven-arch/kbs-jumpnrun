// Stollen: Der Such-Bot schafft die Lifte nicht in einem Zug. Diese Prüfung geht den Weg zu jedem Speed-Item
// oberhalb der Stollendecke (Zeile 0) in Abschnitten: Kante vor dem Schacht, Ziegelplattform zwischen den Liften,
// passender Lift (Spalte 149 oder 164), oben auf der Decke, Speed-Item. Danach eine Gegenprobe von vorn.
//   node tools/stollen-item.js
"use strict";
const E = require("../public/js/engine.js");
const bot = require("./bot.js");
const lib = E.normalizeLibrary(require("../public/js/levels.js"));
const st = E.buildStages(lib), si = lib.stages.findIndex((s) => s.name === "Stollen");
if (si < 0) { console.log("Kein Level „Stollen“ gefunden."); process.exit(0); }
const T = 16, t0 = Date.now();
const secs = (r) => (r.inputs.length / 60).toFixed(2) + " s";
const items = [];
lib.stages[si].rows[0].split("").forEach((ch, c) => { if (ch === "s") items.push(c); });
if (!items.length) { console.log("Stollen: kein Speed-Item über der Decke."); process.exit(0); }

const edge = bot.solveStage(st, si, {}, { walk: true, width: 200, steps: 900, goal: (w) => w.p.onGround && w.p.lift < 0 && w.p.x >= 144 * T && w.p.x < 147 * T });
console.log("Kante vor dem Schacht:", edge.failed ? "nicht erreicht" : "erreicht nach " + secs(edge));
if (edge.failed) process.exit(1);
const onBricks = (w) => w.p.onGround && w.p.lift < 0 && Math.abs(w.p.y + w.p.h - 8 * T) < 0.5 && w.p.x > 155 * T && w.p.x < 160 * T;
const bricks = bot.solveStage(st, si, {}, { start: edge.w, walk: true, width: 400, steps: 400, goal: onBricks,
  score: (w) => Math.abs(w.p.x - 158 * T) + Math.abs(w.p.y + w.p.h - 128) * 2 });
console.log("Ziegelplattform zwischen den Liften:", bricks.failed ? "nicht erreicht" : "erreicht nach weiteren " + secs(bricks));

let ok = true;
for (const c of items) {
  // vor dem ersten Schacht (Spalte 148–152) über Lift 149, sonst über Lift 164
  const first = c < 155, from = first ? edge : bricks;
  if (from.failed) { ok = false; continue; }
  const liftCol = first ? 149 : 164, liftIdx = first ? [0, 1] : [2, 3];
  const lift = bot.solveStage(st, si, {}, { start: from.w, walk: true, width: 400, steps: 300, goal: (w) => liftIdx.includes(w.p.lift),
    score: (w) => Math.abs(w.p.x - (liftCol + 1) * T) + Math.abs(w.p.y - 100) });
  if (lift.failed) { console.log(`Item Spalte ${c}: Lift ${liftCol} nicht erreicht`); ok = false; continue; }
  const roof = bot.solveStage(st, si, {}, { start: lift.w, walk: true, width: 400, steps: 300,
    goal: (w) => w.p.onGround && w.p.lift < 0 && Math.abs(w.p.y + w.p.h - T) < 0.5,
    score: (w) => Math.abs(w.p.y + w.p.h - T) * 3 + Math.abs(w.p.x - c * T) });
  if (roof.failed) { console.log(`Item Spalte ${c}: nicht auf die Decke gekommen`); ok = false; continue; }
  const item = bot.solveStage(st, si, {}, { start: roof.w, walk: true, width: 400, steps: 300, goal: (w) => E.tileAt(w, c, 0) !== "s",
    score: (w) => Math.abs(w.p.x + 6 - (c * T + 8)) + Math.abs(w.p.y + w.p.h / 2 - 8) * 3 });
  if (item.failed) { console.log(`Item Spalte ${c}: auf der Decke, aber nicht erreicht`); ok = false; continue; }
  // Gegenprobe: alle Eingaben von vorn ergeben dasselbe
  const prefix = first ? edge.inputs : edge.inputs.concat(bricks.inputs);
  const all = prefix.concat(lift.inputs, roof.inputs, item.inputs);
  const w = E.createSoloWorld(st, si);
  for (const v of all) E.stepWorld(w, [E.decodeInput(v)]);
  const proof = E.tileAt(w, c, 0) !== "s" && w.p.speedT > 0;
  console.log(`Item Spalte ${c}: erreicht nach ${(all.length / 60).toFixed(2)} s gehend über Lift ${liftCol}, Gegenprobe ${proof ? "ok" : "FEHLER"}`);
  if (!proof) ok = false;
}
console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(ok ? 0 : 1);
