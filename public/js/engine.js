// Spiel-Engine von „KBS Jump-'n'-Run!“: reine Spiellogik ohne Grafik und ohne Browser.
// Läuft im Browser (window.JRE) und in Node (require), damit Server-Tests dieselbe Logik prüfen.
//
// Die Bewegungswerte folgen der Disassembly des NES-Klassikers (SMBDIS.ASM): Geschwindigkeiten in 1/16 px pro
// Frame, Beschleunigung und Schwerkraft in 1/256-Schritten, hier in px pro Frame umgerechnet.
//
// Alles ist deterministisch: gleiche Level und gleiche Tastendrücke ergeben auf jedem Gerät exakt dasselbe Spiel.
// Darauf beruht der Klassenmodus: Die Handys schicken nur ihre Tastendrücke, Beamer und Mitspieler rechnen nach.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.JRE = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const T = 16, VW = 256, VH = 240, ROWS = 15;
  const PH = {
    maxWalk: 0x18 / 16, maxRun: 0x28 / 16,
    accWalk: 0x98 / 4096, accRun: 0xe4 / 4096, accFast: 0xd0 / 4096,
    airRunFrom: 0x19 / 16, fastFrom: 0x1c / 16, fasterFrom: 0x21 / 16, turnBelow: 0x0b / 16, runLinger: 10,
    jumpTier: [0x09 / 16, 0x10 / 16, 0x19 / 16, 0x1c / 16],
    jumpVy: [-4, -4, -4, -5, -5],
    holdG: [0x20 / 256, 0x20 / 256, 0x1e / 256, 0x28 / 256, 0x28 / 256],
    fallG: [0x70 / 256, 0x70 / 256, 0x60 / 256, 0x90 / 256, 0x90 / 256],
    maxFall: 4, maxFallOver: 4 + 0x80 / 256,
    stompVy: -4, bumpVy: 1,
    enemyVx: 8 / 16, shellVx: 0x30 / 16, enemyG: 0x3d / 256, enemyMaxFall: 3,
    itemVx: 1, shellNap: 300, deadG: 0.25,
  };
  const SMALL_H = 22, BIG_H = 28;
  const SOLID = new Set(["#", "R", "B", "b", "Q", "P", "U"]);
  // "U" (ein geleerter Block) entsteht erst beim Spielen; "~" ist Wasser, sieht aus wie ein Bach, trägt aber nicht;
  // "s" ist das Speed-Item: wer es einsammelt, rennt 10 Sekunden lang;
  // "x" ist Schleim, eine Pfütze auf dem Boden darunter: wer hineintritt, wird sehr langsam
  const TILE_CHARS = ".#RBbQPo~sx";
  const MIN_COLS = 24, MAX_COLS = 400, MAX_ENEMIES = 160, MAX_LIFTS = 40, NAME_MAX = 24, MAX_STAGES = 12;
  // Lifte fahren ewig ihre Spalte hinauf oder hinunter: wer den Bildschirm verlässt, kommt auf der anderen Seite wieder
  const LIFT_W = 3, LIFT_H = 8, LIFT_V = 1, LIFT_LOOP = VH + 32;
  const THEMES = ["meadow", "mine", "clinic", "glacier", "vineyard"];
  const ENEMY_KINDS = ["walker", "snail"];
  const STAGE_PAUSE = 90; // Frames der Etappenkarte zwischen zwei Etappen
  const RESPAWN_AFTER = 240; // spätestens so viele Frames nach einem verlorenen Leben beginnt die Etappe neu
  const REGROW = 240; // im Finale wachsen zerschlagene Ziegel nach 4 Sekunden nach
  const SPEED_T = 600; // so viele Frames rennt die Figur nach dem Speed-Item
  const SLIME_AFTER = 120, SLIME_MAX = 0.5; // im Schleim und 2 Sekunden danach höchstens 0,5 px pro Frame

  // ---------------------------------------------------------------- Leveldaten
  // Ein Level (eine Etappe), wie es gespeichert und im Editor bearbeitet wird:
  //   { name, theme, cols, rows: 15 Zeichenketten aus TILE_CHARS, enemies: [{ kind, c, r }],
  //     start: [c, r], flag: [c, r], hut: [c, r], lifts?: [{ c, r, w, dir }] }
  // Gegner, Start und Hütte belegen das Feld (c, r) und stehen auf Zeile r + 1; die Fahnenstange reicht vom oberen
  // Bildrand bis zur Oberkante von Zeile r + 1. Ein Lift beginnt mit seiner Oberkante auf Zeile r, ist w Spalten breit
  // und fährt "up" oder "down"; ohne Lifte fehlt der Schlüssel.
  // Gibt eine bereinigte Kopie zurück oder null, wenn die Daten gar nicht zu gebrauchen sind.
  function normalizeStage(s, i) {
    if (!s || typeof s !== "object" || !Array.isArray(s.rows)) return null;
    const int = (v, lo, hi, d) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
    const cell = (v, cols, rLo, rHi, d) => (Array.isArray(v) ? [int(v[0], 0, cols - 1, d[0]), int(v[1], rLo, rHi, d[1])] : d);
    const cols = int(s.cols, MIN_COLS, MAX_COLS, 0);
    if (!cols) return null;
    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      const src = typeof s.rows[r] === "string" ? s.rows[r] : "";
      let row = "";
      for (let c = 0; c < cols; c++) { const ch = src[c]; row += ch && TILE_CHARS.includes(ch) ? ch : "."; }
      rows.push(row);
    }
    const enemies = [];
    const seen = new Set();
    for (const e of Array.isArray(s.enemies) ? s.enemies : []) {
      if (!e || !ENEMY_KINDS.includes(e.kind) || enemies.length >= MAX_ENEMIES) continue;
      const c = int(e.c, 0, cols - 1, -1), r = int(e.r, 0, ROWS - 2, -1);
      if (c < 0 || r < 0 || seen.has(c + "," + r)) continue;
      seen.add(c + "," + r);
      enemies.push({ kind: e.kind, c, r });
    }
    const lifts = [];
    const liftAt = new Set();
    for (const l of Array.isArray(s.lifts) ? s.lifts : []) {
      if (!l || (l.dir !== "up" && l.dir !== "down") || lifts.length >= MAX_LIFTS) continue;
      const w = int(l.w, 2, 6, LIFT_W), c = int(l.c, 0, cols - w, -1), r = int(l.r, 0, ROWS - 1, -1);
      if (c < 0 || r < 0 || liftAt.has(c + "," + r)) continue;
      liftAt.add(c + "," + r);
      lifts.push({ c, r, w, dir: l.dir });
    }
    const name = (typeof s.name === "string" ? s.name : "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX) || "Level " + (i + 1);
    const stage = {
      name, theme: THEMES.includes(s.theme) ? s.theme : "meadow", cols, rows, enemies,
      start: cell(s.start, cols, 0, ROWS - 2, [2, 12]),
      flag: cell(s.flag, cols, 2, ROWS - 2, [cols - 12, 12]),
      hut: cell(s.hut, cols, 0, ROWS - 2, [cols - 6, 12]),
    };
    if (lifts.length) stage.lifts = lifts;
    return stage;
  }
  // Die Level-Sammlung: { version: 1, stages: [...] } mit 1 bis MAX_STAGES Leveln
  function normalizeLibrary(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.stages)) return null;
    const stages = [];
    for (let i = 0; i < Math.min(raw.stages.length, MAX_STAGES); i++) {
      const s = normalizeStage(raw.stages[i], i);
      if (!s) return null;
      stages.push(s);
    }
    return stages.length ? { version: 1, stages } : null;
  }

  // Sicht der Engine auf ein Level; die Zeilen bleiben Zeichenketten, gelesen als grid[r][c]
  function stageView(d) {
    return {
      name: d.name, theme: d.theme, cols: d.cols, grid: d.rows,
      enemies: d.enemies.map((e) => ({ kind: e.kind, c: e.c, standRow: e.r + 1 })),
      startCol: d.start[0], startFloor: d.start[1] + 1,
      flagCol: d.flag[0], flagBaseRow: d.flag[1] + 1,
      hutCol: d.hut[0], hutFloor: d.hut[1] + 1,
      lifts: (d.lifts || []).map((l) => ({ x: l.c * T, y: l.r * T, w: l.w * T, vy: l.dir === "up" ? -LIFT_V : LIFT_V })),
    };
  }
  const buildStages = (lib) => lib.stages.map(stageView);

  // ---------------------------------------------------------------- Welt und Spielfiguren
  // Eine Welt ist ein laufendes Level. Allein gespielt steht genau eine Figur darin und es gelten exakt die Regeln
  // des Einzelspiels. In einer geteilten Welt (gemeinsames Level im Finale) laufen mehrere Figuren durch dasselbe
  // Level: Sie blockieren sich nicht, aber Münzen, Blöcke und Gegner sind für alle dieselben.
  function makePlayer(slot, s, carry) {
    carry = carry || {};
    const big = !!carry.big, h = big ? BIG_H : SMALL_H;
    return {
      slot, x: s.startCol * T + 2, y: s.startFloor * T - h, w: 12, h, vx: 0, vy: 0, onGround: true, facing: 1, moving: 1,
      runT: 0, fast: false, g: PH.fallG[0], fallG: PH.fallG[0], jumpY: 0, big, hurt: 0, anim: 0, skid: false,
      lift: -1, // Index des Lifts, auf dem die Figur steht
      cam: 0, status: "play", freeze: 0, freezeKind: "", poleT: 0, poleWait: 0, goneSent: false, coins: carry.coins || 0,
      speedT: 0, // Frames, die das Speed-Item noch wirkt
      slowT: 0, slimed: false, // Frames, die der Schleim noch bremst; steht die Figur gerade im Schleim?
    };
  }
  function createWorld(s, opts) {
    opts = opts || {};
    return {
      s, mods: new Map(), frame: 0, flagY: 2 * T + 2, flagDown: false, shared: !!opts.shared, regrowOn: !!opts.regrow,
      players: [],
      enemies: s.enemies.map((e) => {
        const eh = e.kind === "snail" ? 12 : 9;
        return { kind: e.kind, x: e.c * T + 1, y: e.standRow * T - eh, w: 14, h: eh, vx: -PH.enemyVx, vy: 0,
          onGround: true, state: "walk", active: false, timer: 0, noHurt: 0, anim: 0, kicker: -1 };
      }),
      items: [], bumps: [], regrow: [], lifts: s.lifts.map((l) => ({ x: l.x, y: l.y, w: l.w, h: LIFT_H, vy: l.vy })),
    };
  }
  // Einzelwelt mit einer Figur (Einzelspiel, Qualifying, Tests)
  function createSoloWorld(stages, si, carry) {
    const w = createWorld(stages[si]);
    w.si = si;
    w.players.push(makePlayer(0, stages[si], carry));
    w.p = w.players[0];
    return w;
  }
  function addPlayer(w, p) {
    let i = 0;
    while (i < w.players.length && w.players[i].slot < p.slot) i++;
    w.players.splice(i, 0, p);
  }
  function removePlayer(w, p) {
    const i = w.players.indexOf(p);
    if (i >= 0) w.players.splice(i, 1);
  }
  // Tiefe Kopie; bySlot erlaubt, Figuren mit bereits kopierten Figuren zu verknüpfen (beim Kopieren eines Rennens)
  function cloneWorld(w, bySlot) {
    const players = w.players.map((p) => (bySlot && bySlot[p.slot]) || Object.assign({}, p));
    const c = Object.assign({}, w, {
      mods: new Map(w.mods), players,
      enemies: w.enemies.map((e) => Object.assign({}, e)), items: w.items.map((i) => Object.assign({}, i)),
      bumps: w.bumps.map((b) => Object.assign({}, b)), regrow: w.regrow.map((b) => Object.assign({}, b)),
      lifts: w.lifts.map((l) => Object.assign({}, l)),
    });
    if (w.p) c.p = players[0];
    return c;
  }

  function tileAt(w, c, r) {
    if (r < 0 || r >= ROWS) return ".";
    // links vom Start und rechts vom Levelende steht eine Wand: niemand fällt aus dem Level
    if (c < 0 || c >= w.s.cols) return "#";
    const m = w.mods.get(r * w.s.cols + c);
    return m !== undefined ? m : w.s.grid[r][c];
  }
  const setTile = (w, c, r, t) => w.mods.set(r * w.s.cols + c, t);
  const solidAt = (w, c, r) => SOLID.has(tileAt(w, c, r));
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const live = (e) => e.state === "walk" || e.state === "shell" || e.state === "slide";
  function maxCam(w) { let m = -Infinity; for (const p of w.players) if (p.cam > m) m = p.cam; return m; }
  function minCam(w) { let m = Infinity; for (const p of w.players) if (p.cam < m) m = p.cam; return m; }

  function moveX(w, o) {
    o.x += o.vx;
    const r0 = Math.floor(o.y / T), r1 = Math.floor((o.y + o.h - 0.01) / T);
    if (o.vx > 0) {
      const c = Math.floor((o.x + o.w - 0.01) / T);
      for (let r = r0; r <= r1; r++) if (solidAt(w, c, r)) { o.x = c * T - o.w; o.vx = 0; return true; }
    } else if (o.vx < 0) {
      const c = Math.floor(o.x / T);
      for (let r = r0; r <= r1; r++) if (solidAt(w, c, r)) { o.x = (c + 1) * T; o.vx = 0; return true; }
    }
    return false;
  }
  function onFloor(w, o) {
    const r = Math.floor((o.y + o.h) / T);
    for (let c = Math.floor(o.x / T); c <= Math.floor((o.x + o.w - 0.01) / T); c++) if (solidAt(w, c, r)) return true;
    return false;
  }
  function land(w, o) {
    const r = Math.floor((o.y + o.h - 0.01) / T);
    for (let c = Math.floor(o.x / T); c <= Math.floor((o.x + o.w - 0.01) / T); c++) {
      if (solidAt(w, c, r)) { o.y = r * T - o.h; o.vy = 0; o.onGround = true; return true; }
    }
    return false;
  }

  function playerStep(w, p, inp, ev) {
    const dir = inp.left === inp.right ? 0 : inp.right ? 1 : -1;
    // mit dem Speed-Item zählt „Rennen“ als gedrückt, auch dort, wo man sonst nur gehen kann
    let run = inp.b;
    if (p.speedT > 0) {
      run = true;
      if (--p.speedT === 0) ev.push({ t: "speedEnd", s: p.slot });
    }
    // Schleim: wer darin steht, klebt fest; nach dem Verlassen bremst er noch 2 Sekunden (Springen geht normal)
    const slimed = p.onGround && onSlime(w, p);
    if (slimed) {
      if (!p.slimed) ev.push({ t: "slime", s: p.slot, x: p.x + p.w / 2, y: p.y + p.h });
      p.slowT = SLIME_AFTER;
    } else if (p.slowT > 0) p.slowT--;
    p.slimed = slimed;
    if (p.runT > 0) p.runT--;
    // ein Sprung braucht einen neuen Druck auf „Springen“ im Stehen; seine Kraft hängt vom Anlauf ab
    if (inp.aPressed && p.onGround) {
      const sp = Math.abs(p.vx);
      let t = 0;
      while (t < 4 && sp >= PH.jumpTier[t]) t++;
      p.vy = PH.jumpVy[t]; p.g = PH.holdG[t]; p.fallG = PH.fallG[t];
      p.onGround = false; p.jumpY = p.y; p.lift = -1;
      ev.push({ t: p.big ? "jumpBig" : "jump", s: p.slot });
    }
    const sp = Math.abs(p.vx);
    let max, acc;
    if (p.onGround) {
      if (dir !== 0) p.facing = dir;
      if (sp >= PH.fastFrom) p.fast = true;
      else if (dir !== 0 && dir === p.moving) p.fast = false;
      // langsam dreht ein Druck in die andere Richtung auf der Stelle
      if ((dir !== 0 || run) && dir !== p.moving && sp < PH.turnBelow) { p.moving = p.facing; p.vx = 0; }
      if (dir !== 0 && dir === p.moving && run) p.runT = PH.runLinger;
      if (dir !== 0 && dir === p.moving && (run || p.runT > 0)) { max = PH.maxRun; acc = PH.accRun; }
      else { max = PH.maxWalk; acc = p.fast || sp >= PH.fasterFrom ? PH.accFast : PH.accWalk; }
    } else if (sp >= PH.airRunFrom) { max = PH.maxRun; acc = PH.accRun; }
    else { max = PH.maxWalk; acc = PH.accWalk; }
    if (p.slowT > 0) max = Math.min(max, SLIME_MAX);
    if (p.facing !== p.moving) acc *= 2; // Bremsen geht doppelt so schnell
    // am Boden ändert sich das Tempo immer, in der Luft nur beim Steuern
    if (p.onGround || dir !== 0) {
      if (dir > 0) p.vx = Math.min(p.vx + acc, max);
      else if (dir < 0) p.vx = Math.max(p.vx - acc, -max);
      else if (p.vx > 0) p.vx = Math.max(p.vx - acc, 0);
      else if (p.vx < 0) p.vx = Math.min(p.vx + acc, 0);
    }
    if (slimed && Math.abs(p.vx) > SLIME_MAX) p.vx = p.vx > 0 ? SLIME_MAX : -SLIME_MAX; // im Schleim kein Rutschen
    if (p.vx > 0) p.moving = 1;
    else if (p.vx < 0) p.moving = -1;
    p.skid = p.onGround && dir !== 0 && dir !== p.moving && Math.abs(p.vx) > 0.5;

    // wer „Springen“ beim Steigen loslässt, fällt für den Rest des Sprungs mit der stärkeren Schwerkraft
    if (!p.onGround && (p.vy >= 0 || (!inp.a && p.jumpY - p.y >= 1))) p.g = p.fallG;

    moveX(w, p);
    if (p.x < p.cam) { p.x = p.cam; if (p.vx < 0) p.vx = 0; }
    if (p.onGround && !onFloor(w, p) && !onLift(w, p)) { p.onGround = false; p.vy = 0; p.g = p.fallG; }
    if (!p.onGround) {
      const vy = p.vy;
      p.y += vy;
      p.vy += p.g;
      if (p.vy >= PH.maxFallOver) p.vy = PH.maxFall;
      let landed = false;
      if (vy > 0) {
        landed = land(w, p);
        if (landed && vy > 2) ev.push({ t: "land", s: p.slot, x: p.x + p.w / 2, y: p.y + p.h });
      } else if (vy < 0) headBump(w, p, ev);
      if (landed) p.lift = -1;
      else landLift(w, p, vy);
    }
    p.anim += Math.abs(p.vx);
  }

  // steht die Figur in einer Schleimpfütze? (die Pfütze liegt im Feld über dem Boden, in Höhe der Füße)
  function onSlime(w, p) {
    const r = Math.floor((p.y + p.h - 0.01) / T);
    for (let c = Math.floor(p.x / T); c <= Math.floor((p.x + p.w - 0.01) / T); c++) if (tileAt(w, c, r) === "x") return true;
    return false;
  }

  // ---- Lifte: Plattformen, auf denen man von oben landet und durch die man von unten hindurchspringt
  function onLift(w, p) {
    const L = w.lifts[p.lift];
    if (L && p.x + p.w > L.x && p.x < L.x + L.w) return true;
    p.lift = -1;
    return false;
  }
  // die Füße waren vor diesem Frame auf oder über dem Lift und sind jetzt auf oder unter seiner Oberkante
  function landLift(w, p, vy) {
    const feet = p.y + p.h, before = feet - vy;
    for (let i = 0; i < w.lifts.length; i++) {
      const L = w.lifts[i];
      if (p.x + p.w > L.x && p.x < L.x + L.w && before <= L.y - L.vy + 0.01 && feet >= L.y) {
        p.y = L.y - p.h; p.vy = 0; p.onGround = true; p.lift = i;
        return;
      }
    }
  }
  // die Lifte fahren und nehmen mit, wer darauf steht
  function liftStep(w) {
    w.lifts.forEach((L, i) => {
      L.y += L.vy;
      let wrapped = false;
      if (L.vy < 0 && L.y < -2 * T) { L.y += LIFT_LOOP; wrapped = true; }
      else if (L.vy > 0 && L.y > VH) { L.y -= LIFT_LOOP; wrapped = true; }
      for (const p of w.players) {
        if (p.lift !== i) continue;
        if (wrapped) { p.lift = -1; p.onGround = false; p.vy = 0; p.g = p.fallG; continue; }
        const oldY = p.y;
        p.y = L.y - p.h;
        if (L.vy < 0) {
          // Fels über dem Kopf: der Lift fährt durch die Figur hindurch, sie fällt
          const r = Math.floor(p.y / T);
          for (let c = Math.floor(p.x / T); c <= Math.floor((p.x + p.w - 0.01) / T); c++) {
            if (solidAt(w, c, r)) { p.y = oldY; p.lift = -1; p.onGround = false; p.vy = 0; p.g = p.fallG; break; }
          }
        } else if (land(w, p)) p.lift = -1; // auf festem Boden abgesetzt
      }
    });
  }

  function headBump(w, p, ev) {
    const r = Math.floor(p.y / T);
    const cm = Math.floor((p.x + p.w / 2) / T), c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 0.01) / T);
    const hit = solidAt(w, cm, r) ? cm : solidAt(w, c0, r) ? c0 : solidAt(w, c1, r) ? c1 : -1;
    if (hit < 0) return;
    p.y = (r + 1) * T;
    p.vy = PH.bumpVy;
    p.g = p.fallG;
    bumpBlock(w, hit, r, ev, p);
  }

  function bumpBlock(w, c, r, ev, p) {
    const t = tileAt(w, c, r), x = c * T, y = r * T;
    if (t === "Q" || t === "b") {
      setTile(w, c, r, "U"); p.coins++; w.bumps.push({ c, r, t: 8 });
      ev.push({ t: "coin", s: p.slot, x, y, pop: true });
    } else if (t === "P") {
      setTile(w, c, r, "U"); w.bumps.push({ c, r, t: 8 });
      w.items.push({ x: x + 1, y, w: 14, h: 14, vx: PH.itemVx, vy: 0, rise: 16, onGround: true, gone: false });
      ev.push({ t: "sprout", s: p.slot, x, y });
    } else if (t === "B") {
      if (p.big) {
        setTile(w, c, r, ".");
        if (w.regrowOn) w.regrow.push({ c, r, t: REGROW });
        ev.push({ t: "break", s: p.slot, x, y });
      } else { w.bumps.push({ c, r, t: 8 }); ev.push({ t: "bump", s: p.slot, x, y }); }
    } else {
      ev.push({ t: "thud", s: p.slot, x, y });
      return;
    }
    // was auf dem Block steht, wird heruntergestoßen
    for (const e of w.enemies) {
      if (e.active && live(e) && Math.abs(e.y + e.h - y) < 3 && e.x + e.w > x && e.x < x + T) knock(e, e.x + e.w / 2 < x + 8 ? -1 : 1, ev);
    }
    for (const it of w.items) {
      if (!it.gone && it.rise <= 0 && Math.abs(it.y + it.h - y) < 3 && it.x + it.w > x && it.x < x + T) { it.vy = -3; it.onGround = false; }
    }
  }

  // im Finale wachsen zerschlagene Ziegel nach, sobald nichts mehr in ihrem Feld steht
  function regrowStep(w) {
    if (!w.regrow.length) return;
    for (const b of w.regrow) {
      if (b.t > 0) b.t--;
      if (b.t > 0) continue;
      const box = { x: b.c * T, y: b.r * T, w: T, h: T };
      if (w.players.some((p) => overlap(p, box)) || w.enemies.some((e) => e.state !== "gone" && e.state !== "dead" && overlap(e, box)) ||
          w.items.some((it) => !it.gone && overlap(it, box))) continue;
      setTile(w, b.c, b.r, "B");
      b.done = true;
    }
    w.regrow = w.regrow.filter((b) => !b.done);
  }

  function knock(e, dir, ev) {
    e.state = "dead"; e.vy = -3; e.vx = dir > 0 ? 0.5 : -0.5;
    ev.push({ t: "smack", x: e.x, y: e.y });
  }

  function nearestPlayerX(w, x) {
    let best = null;
    for (const p of w.players) if (!best || Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
    return best ? best.x : x - 1;
  }

  function enemyStep(w, ev) {
    const camHi = maxCam(w), camLo = minCam(w);
    for (const e of w.enemies) {
      if (e.state === "gone") continue;
      if (!e.active) { if (e.x < camHi + VW + 8) e.active = true; else continue; }
      e.anim++;
      if (e.noHurt > 0) e.noHurt--;
      if (e.state === "dead") {
        e.x += e.vx; e.y += e.vy; e.vy += PH.deadG;
        if (e.y > VH + 16) e.state = "gone";
        continue;
      }
      if (e.state === "flat") { if (--e.timer <= 0) e.state = "gone"; continue; }
      if (e.state === "shell" && --e.timer <= 0) {
        e.state = "walk";
        e.vx = (nearestPlayerX(w, e.x) < e.x ? -1 : 1) * PH.enemyVx;
      }
      if (e.vx !== 0) {
        const nx = e.x + e.vx;
        const front = e.vx < 0 ? nx : nx + e.w;
        if (nx < 0 || solidAt(w, Math.floor(front / T), Math.floor((e.y + e.h - 1) / T))) {
          e.vx = -e.vx;
          if (e.state === "slide") ev.push({ t: "shellWall", x: e.x, y: e.y });
        } else e.x = nx;
      }
      if (e.onGround && !onFloor(w, e)) { e.onGround = false; e.vy = 0; }
      if (!e.onGround) {
        e.y += e.vy;
        e.vy = Math.min(e.vy + PH.enemyG, PH.enemyMaxFall);
        land(w, e);
      }
      if (e.y > VH + 8 || e.x < camLo - 48) e.state = "gone";
    }
    // rutschende Panzer räumen andere Gegner ab; laufende Gegner drehen um, wenn sie zusammenstoßen
    const act = w.enemies.filter((e) => e.active && live(e));
    for (let i = 0; i < act.length; i++) {
      for (let j = i + 1; j < act.length; j++) {
        const a = act[i], b = act[j];
        if (!live(a) || !live(b) || !overlap(a, b)) continue;
        if (a.state === "slide" || b.state === "slide") {
          if (a.state === "slide") knock(b, a.vx, ev);
          if (b.state === "slide") knock(a, b.vx, ev);
          continue;
        }
        if (a.state === "walk" && (a.x < b.x) === (a.vx > 0)) a.vx = -a.vx;
        if (b.state === "walk" && (b.x < a.x) === (b.vx > 0)) b.vx = -b.vx;
      }
    }
  }

  function itemStep(w) {
    const camLo = minCam(w);
    for (const it of w.items) {
      if (it.gone) continue;
      if (it.rise > 0) { it.y -= 1; it.rise--; continue; }
      const nx = it.x + it.vx;
      const front = it.vx < 0 ? nx : nx + it.w;
      if (solidAt(w, Math.floor(front / T), Math.floor((it.y + it.h - 1) / T))) it.vx = -it.vx;
      else it.x = nx;
      if (it.onGround && !onFloor(w, it)) { it.onGround = false; it.vy = 0; }
      if (!it.onGround) {
        it.y += it.vy;
        it.vy = Math.min(it.vy + PH.enemyG, PH.enemyMaxFall);
        if (it.vy > 0) land(w, it);
      }
      if (it.y > VH + 8 || it.x < camLo - 32) it.gone = true;
    }
  }

  function playerContacts(w, p, ev) {
    for (const it of w.items) {
      if (it.gone || it.rise > 0 || !overlap(p, it)) continue;
      it.gone = true;
      if (!p.big) { p.freeze = 40; p.freezeKind = "grow"; ev.push({ t: "grow", s: p.slot }); }
      else { p.coins += 5; ev.push({ t: "bonus", s: p.slot, x: it.x, y: it.y }); }
    }
    for (let c = Math.floor(p.x / T); c <= Math.floor((p.x + p.w - 0.01) / T); c++) {
      for (let r = Math.floor(p.y / T); r <= Math.floor((p.y + p.h - 0.01) / T); r++) {
        const t = tileAt(w, c, r);
        if (t === "o") { setTile(w, c, r, "."); p.coins++; ev.push({ t: "coin", s: p.slot, x: c * T, y: r * T }); }
        else if (t === "s") { setTile(w, c, r, "."); p.speedT = SPEED_T; ev.push({ t: "speed", s: p.slot, x: c * T, y: r * T }); }
      }
    }
    // Gegnerkontakt zählt nur jeden zweiten Frame, wie im Original
    if (p.freeze > 0 || w.frame & 1) return;
    for (const e of w.enemies) {
      if (!e.active || !live(e) || !overlap(p, e)) continue;
      if (e.state === "shell") {
        e.state = "slide";
        e.vx = (p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1) * PH.shellVx;
        e.noHurt = 12;
        e.kicker = p.slot;
        ev.push({ t: "kick", s: p.slot, x: e.x, y: e.y });
        continue;
      }
      if (p.vy > 0) {
        if (e.kind === "walker") { e.state = "flat"; e.timer = 30; e.vx = 0; }
        else { e.state = "shell"; e.vx = 0; e.timer = PH.shellNap; }
        p.vy = PH.stompVy; p.g = p.fallG; p.onGround = false;
        ev.push({ t: "stomp", s: p.slot, x: e.x, y: e.y });
        continue;
      }
      if ((e.state === "slide" && e.noHurt > 0) || p.hurt > 0) continue;
      // im gemeinsamen Level treffen Panzer nur Gegner, nie die Mitspieler
      if (e.state === "slide" && w.shared && e.kicker !== p.slot) continue;
      if (p.big) { p.freeze = 40; p.freezeKind = "shrink"; ev.push({ t: "shrink", s: p.slot }); }
      else die(w, p, ev, "enemy");
      return;
    }
  }

  function die(w, p, ev, why) {
    p.vx = 0;
    p.hurt = 0;
    p.lift = -1;
    if (why === "pit") p.status = "dead";
    else { p.status = "dying"; p.freeze = 28; p.freezeKind = "die"; }
    ev.push({ t: "die", s: p.slot, why });
  }

  function endFreeze(w, p) {
    if (p.freezeKind === "grow") { p.big = true; p.y -= BIG_H - SMALL_H; p.h = BIG_H; }
    else if (p.freezeKind === "shrink") { p.big = false; p.y += BIG_H - SMALL_H; p.h = SMALL_H; p.hurt = 120; }
    else if (p.freezeKind === "die") { p.status = "dead"; p.vy = -4; }
    p.freezeKind = "";
  }

  function deadStep(w, p, ev) {
    p.y += p.vy;
    p.vy = Math.min(p.vy + PH.deadG, 4);
    if (p.y > VH + 40 && !p.goneSent) { p.goneSent = true; ev.push({ t: "gone", s: p.slot }); }
  }

  // Die Fahnenstange zählt in jeder Höhe über dem Boden: Wer über ihre Spitze springt, greift die Spitze.
  // So kann niemand die Fahne überspringen, auch nicht mit Anlauf von einer hohen Treppe oder mit dem Speed-Item.
  function checkFlag(w, p, ev) {
    const s = w.s, px = s.flagCol * T + 7;
    if (p.x + p.w >= px && p.x <= px + 2 && p.y < s.flagBaseRow * T) {
      p.status = "pole";
      p.poleT = 0;
      if (p.y < 2 * T) p.y = 2 * T;
      p.vx = 0; p.vy = 0; p.x = px - p.w + 2; p.onGround = false; p.lift = -1;
      w.flagDown = true;
      ev.push({ t: "flag", s: p.slot });
    }
  }

  // nach der Fahne: hinunterrutschen, kurz warten, dann in die Hütte gehen
  function poleStep(w, p, ev) {
    const s = w.s, base = s.flagBaseRow * T;
    if (w.flagY < base - 12) w.flagY = Math.min(w.flagY + 2, base - 12);
    if (p.poleT === 0) {
      if (p.y + p.h < base) { p.y = Math.min(p.y + 2, base - p.h); return; }
      p.poleT = 1;
      p.onGround = true;
      p.poleWait = 24;
    }
    if (p.poleWait > 0) { p.poleWait--; return; }
    p.facing = 1; p.moving = 1; p.vx = 1.25;
    const blocked = moveX(w, p);
    p.anim += 1.25;
    if (p.onGround && !onFloor(w, p)) { p.onGround = false; p.vy = 0; }
    if (!p.onGround) {
      p.y += p.vy;
      p.vy = Math.min(p.vy + PH.fallG[0], PH.maxFall);
      land(w, p);
    }
    // die Hüttentür beendet das Level, ebenso eine Wand oder ein Abgrund auf dem Weg (so bleibt nichts hängen)
    if (p.x >= (s.hutCol + 2) * T || blocked || p.y > VH) { p.status = "done"; ev.push({ t: "stageDone", s: p.slot }); }
  }

  function updateCamera(w, p) {
    const maxC = w.s.cols * T - VW;
    const target = p.x + p.w / 2 - 112;
    if (target > p.cam) p.cam = Math.min(target, maxC);
  }

  const NO_INPUT = { left: false, right: false, a: false, b: false, aPressed: false };
  // Ein Frame. inputs: Eingaben nach Platz (slot) { left, right, a, b, aPressed }. Gibt Ereignisse für Ton und Effekte zurück.
  function stepWorld(w, inputs) {
    const ev = [];
    const inp = (p) => (inputs && inputs[p.slot]) || NO_INPUT;
    w.frame++;
    for (const b of w.bumps) b.t--;
    w.bumps = w.bumps.filter((b) => b.t > 0);
    const ps = w.players;
    if (ps.length === 1 && !w.shared) {
      // allein im Level: genau die Regeln des Einzelspiels, Wachsen und Schrumpfen halten die ganze Welt an
      const p = ps[0];
      if (p.freeze > 0) { if (--p.freeze === 0) endFreeze(w, p); return ev; }
      if (p.status === "dead") { deadStep(w, p, ev); return ev; }
      regrowStep(w);
      if (p.status === "pole") { liftStep(w); poleStep(w, p, ev); updateCamera(w, p); itemStep(w); enemyStep(w, ev); return ev; }
      if (p.status === "done") return ev;
      liftStep(w);
      playerStep(w, p, inp(p), ev);
      updateCamera(w, p);
      itemStep(w);
      enemyStep(w, ev);
      playerContacts(w, p, ev);
      if (p.status === "play") checkFlag(w, p, ev);
      if (p.status === "play" && p.y > VH) die(w, p, ev, "pit");
      if (p.hurt > 0) p.hurt--;
      return ev;
    }
    // gemeinsames Level: jede Figur für sich, die Welt läuft immer weiter
    regrowStep(w);
    liftStep(w);
    for (const p of ps) {
      if (p.freeze > 0) { if (--p.freeze === 0) endFreeze(w, p); continue; }
      if (p.status === "dead") { deadStep(w, p, ev); continue; }
      if (p.status === "pole") { poleStep(w, p, ev); updateCamera(w, p); continue; }
      if (p.status !== "play") continue;
      playerStep(w, p, inp(p), ev);
      updateCamera(w, p);
    }
    itemStep(w);
    enemyStep(w, ev);
    for (const p of ps) {
      if (p.status !== "play" || p.freeze > 0) continue;
      playerContacts(w, p, ev);
      if (p.status === "play") checkFlag(w, p, ev);
      if (p.status === "play" && p.y > VH) die(w, p, ev, "pit");
      if (p.hurt > 0) p.hurt--;
    }
    return ev;
  }

  // ---------------------------------------------------------------- Eingaben als Zeichen
  // Ein Frame Eingabe passt in ein Zeichen: links 1, rechts 2, Springen gehalten 4, Rennen 8, Springen neu gedrückt 16.
  const BIT = { left: 1, right: 2, a: 4, b: 8, press: 16 };
  function encodeInput(i) {
    return (i.left ? 1 : 0) | (i.right ? 2 : 0) | (i.a ? 4 : 0) | (i.b ? 8 : 0) | (i.aPressed ? 16 : 0);
  }
  const DECODED = [];
  for (let v = 0; v < 32; v++) DECODED.push(Object.freeze({ left: !!(v & 1), right: !!(v & 2), a: !!(v & 4), b: !!(v & 8), aPressed: !!(v & 16) }));
  const decodeInput = (v) => DECODED[v & 31];
  const inputChar = (v) => String.fromCharCode(48 + (v & 31));
  const charInput = (ch) => (ch.charCodeAt(0) - 48) & 31;

  // ---------------------------------------------------------------- Rennen (ein oder mehrere Spieler)
  // Ein Rennen führt jede Figur durch eine Folge von Leveln (plan, Indizes in die Level-Sammlung): Etappenkarte,
  // unbegrenzte Leben (nach einem verlorenen Leben beginnt das Level von vorn, die Uhr läuft weiter), Zwischenzeiten
  // und Zielzeit. Alle Spieler teilen sich die Frame-Uhr. opts: { shared, regrow }
  //   shared: alle laufen in denselben Welten (eine pro Plan-Position), sonst hat jeder seine eigenen.
  function createMatch(stages, plan, n, opts) {
    opts = opts || {};
    const m = { frame: 0, stages, plan: plan.slice(), n, shared: !!opts.shared, regrow: !!opts.regrow, worlds: [], recs: [] };
    if (m.shared) plan.forEach((si, k) => m.worlds.push({ key: "k" + k, k, w: createWorld(stages[si], { shared: true, regrow: m.regrow }) }));
    for (let slot = 0; slot < n; slot++) {
      const rec = { slot, k: 0, inter: 0, down: 0, fin: null, done: false, deaths: 0, splits: [], stageCoins: 0, carry: null, p: null, wk: null };
      m.recs.push(rec);
      enterStage(m, rec, 0, {});
    }
    return m;
  }
  function worldOf(m, key) {
    for (const e of m.worlds) if (e.key === key) return e;
    return null;
  }
  function enterStage(m, rec, k, carry) {
    const s = m.stages[m.plan[k]];
    rec.k = k;
    rec.stageCoins = carry.coins || 0;
    const p = makePlayer(rec.slot, s, carry);
    if (m.shared) {
      const e = worldOf(m, "k" + k);
      addPlayer(e.w, p);
      rec.wk = e.key;
    } else {
      const key = rec.slot + ":" + k;
      const w = createWorld(s, { regrow: m.regrow });
      w.players.push(p);
      const old = m.worlds.findIndex((e) => e.key.startsWith(rec.slot + ":"));
      const entry = { key, k, slot: rec.slot, w };
      if (old >= 0) m.worlds[old] = entry; else m.worlds.push(entry);
      rec.wk = key;
    }
    rec.p = p;
  }
  function leaveWorld(m, rec) {
    const e = worldOf(m, rec.wk);
    if (!e) return;
    if (m.shared) removePlayer(e.w, rec.p);
    else m.worlds.splice(m.worlds.indexOf(e), 1);
    rec.wk = null;
  }
  // ein verlorenes Leben: das Level beginnt von vorn, klein und mit den Münzen vom Levelbeginn
  function respawn(m, rec) {
    rec.down = 0;
    if (m.shared) { leaveWorld(m, rec); enterStage(m, rec, rec.k, { coins: rec.stageCoins }); }
    else enterStage(m, rec, rec.k, { coins: rec.stageCoins });
  }

  // Ein Frame für alle. bits: Eingaben als Zahl je Platz. Gibt die Ereignisse zurück (mit s = Platz, w = Weltschlüssel).
  function stepMatch(m, bits) {
    m.frame++;
    const inputs = [];
    for (let i = 0; i < m.n; i++) inputs.push(decodeInput(bits[i] | 0));
    const out = [];
    const fresh = new Set(); // wer in diesem Frame eine Etappe beendet hat, wartet erst ab dem nächsten Frame
    for (const e of m.worlds.slice()) {
      if (!e.w.players.length && !m.shared) continue;
      for (const ev of stepWorld(e.w, inputs)) { ev.w = e.key; out.push(ev); }
    }
    for (const ev of out) {
      if (ev.s === undefined) continue;
      const rec = m.recs[ev.s];
      if (!rec || !rec.p || rec.wk !== ev.w) continue;
      switch (ev.t) {
        case "flag":
          if (rec.k === m.plan.length - 1) { if (rec.fin == null) rec.fin = m.frame; }
          else rec.splits[rec.k] = m.frame;
          break;
        case "stageDone":
          if (rec.k === m.plan.length - 1) { rec.done = true; break; }
          rec.carry = { big: rec.p.big, coins: rec.p.coins };
          leaveWorld(m, rec);
          rec.p = null;
          rec.k++;
          rec.inter = STAGE_PAUSE;
          fresh.add(rec.slot);
          break;
        case "die":
          rec.deaths++;
          rec.down = 1;
          break;
        case "gone":
          if (rec.down) respawn(m, rec);
          break;
      }
    }
    for (const rec of m.recs) {
      if (rec.inter > 0 && !fresh.has(rec.slot)) {
        if (--rec.inter === 0) { enterStage(m, rec, rec.k, rec.carry || {}); rec.carry = null; }
      }
      if (rec.down && ++rec.down > RESPAWN_AFTER) respawn(m, rec);
    }
    return out;
  }

  function cloneMatch(m) {
    const bySlot = {};
    for (const rec of m.recs) if (rec.p) bySlot[rec.slot] = Object.assign({}, rec.p);
    const worlds = m.worlds.map((e) => Object.assign({}, e, { w: cloneWorld(e.w, bySlot) }));
    const recs = m.recs.map((r) => Object.assign({}, r, { splits: r.splits.slice(), carry: r.carry && Object.assign({}, r.carry), p: r.p ? bySlot[r.slot] : null }));
    return Object.assign({}, m, { plan: m.plan.slice(), worlds, recs });
  }
  // Wo steht ein Spieler im Rennen? Größer heißt weiter vorne; im Ziel zählt die Zielzeit.
  function progressOf(m, rec) {
    if (rec.fin != null) return 1e9 - rec.fin;
    const x = rec.p && rec.p.status !== "dead" && rec.p.status !== "dying" ? rec.p.x : 0;
    return rec.k * 100000 + x;
  }
  function worldFor(m, rec) {
    const e = rec.wk && worldOf(m, rec.wk);
    return e ? e.w : null;
  }

  // ---------------------------------------------------------------- Abgleich über das Netz (Rollback)
  // Jedes Gerät rechnet das ganze Rennen aus allen Eingaben nach. Die eigenen Eingaben sind sofort da, die der
  // anderen kommen etwas später. Bis dahin wird geschätzt (die letzte bekannte Eingabe läuft weiter, ohne neuen
  // Sprung). Kommt eine Eingabe, die anders war als geschätzt, wird ab diesem Frame neu gerechnet.
  // local: eigener Platz oder -1 (Beamer). Danach stimmen alle Geräte überein, sobald alle Eingaben angekommen sind.
  const SNAP_EVERY = 8, MAX_SNAPS = 160;
  function createSync(stages, plan, n, opts, local) {
    const S = {
      local, logs: [], snaps: [], cur: null, onEvents: null,
      known(s) { return S.logs[s].length; },
      confirmed() { let f = Infinity; for (const l of S.logs) f = Math.min(f, l.length); return f; },
      predict(s) { const l = S.logs[s]; return l.length ? charInput(l[l.length - 1]) & ~16 : 0; },
      inputAt(s, f) { const l = S.logs[s]; return f < l.length ? charInput(l[f]) : S.predict(s); },
    };
    for (let i = 0; i < n; i++) S.logs.push("");
    const m0 = createMatch(stages, plan, n, opts);
    S.snaps.push(cloneMatch(m0));
    S.cur = m0;
    function stepCur(report) {
      const f = S.cur.frame, bits = [];
      for (let s = 0; s < n; s++) bits.push(S.inputAt(s, f));
      const ev = stepMatch(S.cur, bits);
      if (report && S.onEvents) S.onEvents(ev, S.cur);
      if (S.cur.frame % SNAP_EVERY === 0) {
        const last = S.snaps[S.snaps.length - 1];
        if (!last || last.frame < S.cur.frame) S.snaps.push(cloneMatch(S.cur));
      }
    }
    function prune() {
      const fc = S.confirmed();
      let keep = 0;
      for (let i = 0; i < S.snaps.length; i++) if (S.snaps[i].frame <= fc) keep = i;
      if (keep > 0) S.snaps.splice(0, keep);
      if (S.snaps.length > MAX_SNAPS) S.snaps = S.snaps.filter((sn, i) => i === 0 || i === S.snaps.length - 1 || i % 2 === 0);
    }
    function rewind(f) {
      // zurück zum letzten Stand vor Frame f und neu bis zum bisherigen Stand rechnen
      const target = S.cur.frame;
      while (S.snaps.length > 1 && S.snaps[S.snaps.length - 1].frame > f) S.snaps.pop();
      S.cur = cloneMatch(S.snaps[S.snaps.length - 1]);
      while (S.cur.frame < target) stepCur(false);
    }
    // weiter bis Frame F (Ereignisse nur für neu gerechnete Frames melden)
    S.advanceTo = function (F) {
      while (S.cur.frame < F) stepCur(true);
    };
    // eigene Eingabe für den nächsten Frame
    S.pushLocal = function (bits) {
      S.logs[local] += inputChar(bits);
      S.advanceTo(S.logs[local].length);
      prune();
    };
    // Eingaben eines anderen Platzes ab Frame from. Rückgabe: false, wenn eine Lücke besteht (from ist zu groß).
    S.addRemote = function (s, from, chars) {
      if (s === local || s < 0 || s >= n) return true;
      const have = S.logs[s].length;
      if (from > have) return false;
      if (from + chars.length <= have) return true;
      const before = S.predict(s), part = chars.slice(have - from);
      S.logs[s] += part;
      let diff = -1;
      for (let f = have; f < S.cur.frame; f++) {
        if (S.inputAt(s, f) !== before) { diff = f; break; }
      }
      if (diff >= 0) rewind(diff);
      prune();
      return true;
    };
    S.match = () => S.cur;
    return S;
  }

  return {
    T, VW, VH, ROWS, PH, SMALL_H, BIG_H, SOLID, TILE_CHARS, MIN_COLS, MAX_COLS, MAX_ENEMIES, MAX_LIFTS, NAME_MAX, MAX_STAGES,
    LIFT_W, LIFT_H, LIFT_V, LIFT_LOOP, THEMES, ENEMY_KINDS, STAGE_PAUSE, RESPAWN_AFTER, REGROW, SPEED_T, SLIME_AFTER, SLIME_MAX,
    normalizeStage, normalizeLibrary, stageView, buildStages,
    makePlayer, createWorld, createSoloWorld, addPlayer, removePlayer, cloneWorld, tileAt, stepWorld,
    BIT, encodeInput, decodeInput, inputChar, charInput,
    createMatch, stepMatch, cloneMatch, progressOf, worldFor, createSync,
  };
});
