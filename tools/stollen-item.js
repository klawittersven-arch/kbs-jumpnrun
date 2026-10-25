// Stollen: Der Such-Bot schafft die Lifte nicht in einem Zug. Diese Prüfung geht den Weg zum Speed-Item in Abschnitten:
// Kante vor dem Schacht, Ziegelplattform zwischen den Liften, Lift in Spalte 164, oben auf der Decke, Speed-Item.
//   node tools/stollen-item.js
const E = require("../public/js/engine.js");
const bot = require("./bot.js");
const lib = E.normalizeLibrary(require("../public/js/levels.js"));
const st = E.buildStages(lib), si = 1;
const t0 = Date.now();
const onBricks = (w) => w.p.onGround && w.p.lift < 0 && Math.abs(w.p.y + w.p.h - 8 * 16) < 0.5 && w.p.x > 155 * 16 && w.p.x < 160 * 16;
const edge = bot.solveStage(st, si, {}, { walk: true, width: 200, steps: 900, goal: (w) => w.p.onGround && w.p.lift < 0 && w.p.x >= 144 * 16 && w.p.x < 147 * 16 });
console.log("Kante vor dem Schacht:", edge.failed ? "nicht erreicht" : "erreicht nach " + (edge.inputs.length / 60).toFixed(2) + " s", ((Date.now() - t0) / 1000).toFixed(1) + " s");
if (edge.failed) process.exit(1);
const a0 = bot.solveStage(st, si, {}, { start: edge.w, walk: true, width: 400, steps: 400, goal: (w) => onBricks(w),
  score: (w) => Math.abs(w.p.x - 158 * 16) + Math.abs(w.p.y + w.p.h - 128) * 2 });
const a = a0.failed ? a0 : { inputs: edge.inputs.concat(a0.inputs), w: a0.w };
console.log("Ziegelplattform:", a.failed ? "nicht erreicht" : "erreicht nach " + (a.inputs.length / 60).toFixed(2) + " s", ((Date.now() - t0) / 1000).toFixed(1) + " s");
if (a.failed) process.exit(1);
// Lift 2 und 3 fahren in Spalte 164 durch die Lücke in der Decke nach oben
const lift = bot.solveStage(st, si, {}, { start: a.w, walk: true, width: 400, steps: 300, goal: (w) => w.p.lift >= 2,
  score: (w) => Math.abs(w.p.x - 165 * 16) + Math.abs(w.p.y - 100) });
console.log("auf dem Lift in Spalte 164:", lift.failed ? "nicht erreicht" : "erreicht nach weiteren " + (lift.inputs.length / 60).toFixed(2) + " s");
if (lift.failed) process.exit(1);
const roof = bot.solveStage(st, si, {}, { start: lift.w, walk: true, width: 400, steps: 300,
  goal: (w) => w.p.onGround && w.p.lift < 0 && Math.abs(w.p.y + w.p.h - 16) < 0.5 && w.p.x >= 168 * 16,
  score: (w) => Math.abs(w.p.y + w.p.h - 16) * 3 + Math.abs(w.p.x - 170 * 16) });
console.log("oben auf der Decke:", roof.failed ? "nicht erreicht" : "erreicht nach weiteren " + (roof.inputs.length / 60).toFixed(2) + " s");
if (roof.failed) process.exit(1);
a.inputs = a.inputs.concat(lift.inputs, roof.inputs);
const tx = 186 * 16 + 8, ty = 8;
const b = bot.solveStage(st, si, {}, { start: roof.w, walk: true, width: 400, steps: 300, goal: (w) => E.tileAt(w, 186, 0) !== "s",
  score: (w) => Math.abs(w.p.x + 6 - tx) + Math.abs(w.p.y + w.p.h / 2 - ty) * 3 });
console.log("Speed-Item:", b.failed ? "nicht erreicht" : "erreicht nach weiteren " + (b.inputs.length / 60).toFixed(2) + " s", ((Date.now() - t0) / 1000).toFixed(1) + " s");
if (!b.failed) {
  // Gegenprobe: dieselben Eingaben von vorn ergeben dasselbe
  const w = E.createSoloWorld(st, si);
  for (const v of a.inputs.concat(b.inputs)) E.stepWorld(w, [E.decodeInput(v)]);
  console.log("Gegenprobe:", E.tileAt(w, 186, 0) !== "s" && w.p.speedT > 0 ? "Item eingesammelt, Speed aktiv" : "FEHLER");
}
