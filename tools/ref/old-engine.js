// Engine des Einzelspiels (Artefakt), nur als Vergleich für Tests

  const T = 16, VW = 256, VH = 240, ROWS = 15;
  // Movement values follow Super Mario Bros. (SMBDIS.ASM). There, horizontal speed is counted in 1/16 px per
  // frame and acceleration and gravity in 1/256 steps; here everything is converted to px per frame.
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
  // "U" (an emptied block) only appears while playing; "~" is water, which looks like a stream but does not hold you
  const TILE_CHARS = ".#RBbQPo~";
  const MIN_COLS = 24, MAX_COLS = 400, MAX_ENEMIES = 160, MAX_LIFTS = 40, NAME_MAX = 24;
  // lifts ride up or down their column forever: one leaving the screen comes back on the other side
  const LIFT_W = 3, LIFT_H = 8, LIFT_V = 1, LIFT_LOOP = VH + 32;
  const THEMES = ["meadow", "mine"];
  const ENEMY_KINDS = ["walker", "snail"];

  // Level data, as stored in the page and written by the editor:
  //   { version: 1, stages: [{ name, theme, cols, rows: 15 strings of TILE_CHARS,
  //     enemies: [{ kind, c, r }], start: [c, r], flag: [c, r], hut: [c, r], lifts?: [{ c, r, w, dir }] }, ...two stages] }
  // Enemies, the start and the hut occupy cell (c, r) and stand on row r + 1;
  // the flag pole runs from the top of the screen down to the top of row r + 1.
  // A lift starts with its top edge on the top of row r, spans w columns from c and moves "up" or "down";
  // the key is left out when a stage has no lifts.
  // Returns a cleaned copy, or null when the data cannot be used at all.
  function normalizeLevels(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.stages) || raw.stages.length !== 2) return null;
    const int = (v, lo, hi, d) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
    const cell = (v, cols, rLo, rHi, d) =>
      Array.isArray(v) ? [int(v[0], 0, cols - 1, d[0]), int(v[1], rLo, rHi, d[1])] : d;
    const stages = [];
    for (let i = 0; i < 2; i++) {
      const s = raw.stages[i];
      if (!s || typeof s !== "object" || !Array.isArray(s.rows)) return null;
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
      const name = (typeof s.name === "string" ? s.name : "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX) || "Etappe " + (i + 1);
      const stage = {
        name, theme: THEMES.includes(s.theme) ? s.theme : "meadow", cols, rows, enemies,
        start: cell(s.start, cols, 0, ROWS - 2, [2, 12]),
        flag: cell(s.flag, cols, 2, ROWS - 2, [cols - 12, 12]),
        hut: cell(s.hut, cols, 0, ROWS - 2, [cols - 6, 12]),
      };
      if (lifts.length) stage.lifts = lifts;
      stages.push(stage);
    }
    return { version: 1, stages };
  }

  // engine view of one stage of level data; grid rows stay strings, read as grid[r][c]
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
  const buildStages = (levels) => levels.stages.map(stageView);

  function createWorld(stages, si, carry = {}) {
    const s = stages[si];
    const big = !!carry.big, h = big ? BIG_H : SMALL_H;
    return {
      si, s, mods: new Map(), frame: 0, cam: 0, coins: carry.coins || 0,
      status: "play", freeze: 0, freezeKind: "", poleT: 0, poleWait: 0, flagY: 2 * T + 2, goneSent: false,
      p: {
        x: s.startCol * T + 2, y: s.startFloor * T - h, w: 12, h, vx: 0, vy: 0, onGround: true, facing: 1, moving: 1,
        runT: 0, fast: false, g: PH.fallG[0], fallG: PH.fallG[0], jumpY: 0, big, hurt: 0, anim: 0, skid: false,
        lift: -1, // index of the lift the player stands on
      },
      enemies: s.enemies.map((e) => {
        const eh = e.kind === "snail" ? 12 : 9;
        return { kind: e.kind, x: e.c * T + 1, y: e.standRow * T - eh, w: 14, h: eh, vx: -PH.enemyVx, vy: 0,
          onGround: true, state: "walk", active: false, timer: 0, noHurt: 0, anim: 0 };
      }),
      items: [], bumps: [], lifts: s.lifts.map((l) => ({ x: l.x, y: l.y, w: l.w, h: LIFT_H, vy: l.vy })),
    };
  }
  function cloneWorld(w) {
    return Object.assign({}, w, {
      mods: new Map(w.mods), p: Object.assign({}, w.p),
      enemies: w.enemies.map((e) => Object.assign({}, e)), items: w.items.map((i) => Object.assign({}, i)),
      bumps: w.bumps.map((b) => Object.assign({}, b)), lifts: w.lifts.map((l) => Object.assign({}, l)),
    });
  }

  function tileAt(w, c, r) {
    if (r < 0 || r >= ROWS) return ".";
    if (c < 0) return "#"; // wall left of the start
    if (c >= w.s.cols) return ".";
    const m = w.mods.get(r * w.s.cols + c);
    return m !== undefined ? m : w.s.grid[r][c];
  }
  const setTile = (w, c, r, t) => w.mods.set(r * w.s.cols + c, t);
  const solidAt = (w, c, r) => SOLID.has(tileAt(w, c, r));
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const live = (e) => e.state === "walk" || e.state === "shell" || e.state === "slide";

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

  function playerStep(w, inp, ev) {
    const p = w.p;
    const dir = inp.left === inp.right ? 0 : inp.right ? 1 : -1;
    if (p.runT > 0) p.runT--;
    // a jump needs a fresh press of A while standing; its strength depends on the run-up speed
    if (inp.aPressed && p.onGround) {
      const sp = Math.abs(p.vx);
      let t = 0;
      while (t < 4 && sp >= PH.jumpTier[t]) t++;
      p.vy = PH.jumpVy[t]; p.g = PH.holdG[t]; p.fallG = PH.fallG[t];
      p.onGround = false; p.jumpY = p.y; p.lift = -1;
      ev.push({ t: p.big ? "jumpBig" : "jump" });
    }
    const sp = Math.abs(p.vx);
    let max, acc;
    if (p.onGround) {
      if (dir !== 0) p.facing = dir;
      if (sp >= PH.fastFrom) p.fast = true;
      else if (dir !== 0 && dir === p.moving) p.fast = false;
      // at low speed, pressing the other way turns around on the spot
      if ((dir !== 0 || inp.b) && dir !== p.moving && sp < PH.turnBelow) { p.moving = p.facing; p.vx = 0; }
      if (dir !== 0 && dir === p.moving && inp.b) p.runT = PH.runLinger;
      if (dir !== 0 && dir === p.moving && (inp.b || p.runT > 0)) { max = PH.maxRun; acc = PH.accRun; }
      else { max = PH.maxWalk; acc = p.fast || sp >= PH.fasterFrom ? PH.accFast : PH.accWalk; }
    } else if (sp >= PH.airRunFrom) { max = PH.maxRun; acc = PH.accRun; }
    else { max = PH.maxWalk; acc = PH.accWalk; }
    if (p.facing !== p.moving) acc *= 2; // skidding brakes twice as hard
    // on the ground speed always changes; in the air only while steering
    if (p.onGround || dir !== 0) {
      if (dir > 0) p.vx = Math.min(p.vx + acc, max);
      else if (dir < 0) p.vx = Math.max(p.vx - acc, -max);
      else if (p.vx > 0) p.vx = Math.max(p.vx - acc, 0);
      else if (p.vx < 0) p.vx = Math.min(p.vx + acc, 0);
    }
    if (p.vx > 0) p.moving = 1;
    else if (p.vx < 0) p.moving = -1;
    p.skid = p.onGround && dir !== 0 && dir !== p.moving && Math.abs(p.vx) > 0.5;

    // releasing A while rising switches to the stronger falling gravity for the rest of the jump
    if (!p.onGround && (p.vy >= 0 || (!inp.a && p.jumpY - p.y >= 1))) p.g = p.fallG;

    moveX(w, p);
    if (p.x < w.cam) { p.x = w.cam; if (p.vx < 0) p.vx = 0; }
    if (p.onGround && !onFloor(w, p) && !onLift(w, p)) { p.onGround = false; p.vy = 0; p.g = p.fallG; }
    if (!p.onGround) {
      const vy = p.vy;
      p.y += vy;
      p.vy += p.g;
      if (p.vy >= PH.maxFallOver) p.vy = PH.maxFall;
      let landed = false;
      if (vy > 0) {
        landed = land(w, p);
        if (landed && vy > 2) ev.push({ t: "land", x: p.x + p.w / 2, y: p.y + p.h });
      } else if (vy < 0) headBump(w, p, ev);
      if (landed) p.lift = -1;
      else landLift(w, p, vy);
    }
    p.anim += Math.abs(p.vx);
  }

  // ---- lifts: one-way platforms, you land on them from above and pass through them from below
  function onLift(w, p) {
    const L = w.lifts[p.lift];
    if (L && p.x + p.w > L.x && p.x < L.x + L.w) return true;
    p.lift = -1;
    return false;
  }
  // the feet were at or above the lift's top before this frame and are at or below it now
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
  // move the lifts and carry whoever stands on one
  function liftStep(w) {
    const p = w.p;
    w.lifts.forEach((L, i) => {
      L.y += L.vy;
      let wrapped = false;
      if (L.vy < 0 && L.y < -2 * T) { L.y += LIFT_LOOP; wrapped = true; }
      else if (L.vy > 0 && L.y > VH) { L.y -= LIFT_LOOP; wrapped = true; }
      if (p.lift !== i) return;
      if (wrapped) { p.lift = -1; p.onGround = false; p.vy = 0; p.g = p.fallG; return; }
      const oldY = p.y;
      p.y = L.y - p.h;
      if (L.vy < 0) {
        // rock overhead: the lift moves on through the player, who then falls
        const r = Math.floor(p.y / T);
        for (let c = Math.floor(p.x / T); c <= Math.floor((p.x + p.w - 0.01) / T); c++) {
          if (solidAt(w, c, r)) { p.y = oldY; p.lift = -1; p.onGround = false; p.vy = 0; p.g = p.fallG; return; }
        }
      } else if (land(w, p)) p.lift = -1; // set down on solid ground
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
    bumpBlock(w, hit, r, ev);
  }

  function bumpBlock(w, c, r, ev) {
    const t = tileAt(w, c, r), x = c * T, y = r * T;
    if (t === "Q" || t === "b") {
      setTile(w, c, r, "U"); w.coins++; w.bumps.push({ c, r, t: 8 });
      ev.push({ t: "coin", x, y, pop: true });
    } else if (t === "P") {
      setTile(w, c, r, "U"); w.bumps.push({ c, r, t: 8 });
      w.items.push({ x: x + 1, y, w: 14, h: 14, vx: PH.itemVx, vy: 0, rise: 16, onGround: true, gone: false });
      ev.push({ t: "sprout", x, y });
    } else if (t === "B") {
      if (w.p.big) { setTile(w, c, r, "."); ev.push({ t: "break", x, y }); }
      else { w.bumps.push({ c, r, t: 8 }); ev.push({ t: "bump", x, y }); }
    } else {
      ev.push({ t: "thud", x, y });
      return;
    }
    // whatever stands on the block is knocked off
    for (const e of w.enemies) {
      if (e.active && live(e) && Math.abs(e.y + e.h - y) < 3 && e.x + e.w > x && e.x < x + T) knock(e, e.x + e.w / 2 < x + 8 ? -1 : 1, ev);
    }
    for (const it of w.items) {
      if (!it.gone && it.rise <= 0 && Math.abs(it.y + it.h - y) < 3 && it.x + it.w > x && it.x < x + T) { it.vy = -3; it.onGround = false; }
    }
  }

  function knock(e, dir, ev) {
    e.state = "dead"; e.vy = -3; e.vx = dir > 0 ? 0.5 : -0.5;
    ev.push({ t: "smack", x: e.x, y: e.y });
  }

  function enemyStep(w, ev) {
    for (const e of w.enemies) {
      if (e.state === "gone") continue;
      if (!e.active) { if (e.x < w.cam + VW + 8) e.active = true; else continue; }
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
        e.vx = (w.p.x < e.x ? -1 : 1) * PH.enemyVx;
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
      if (e.y > VH + 8 || e.x < w.cam - 48) e.state = "gone";
    }
    // sliding shells clear other enemies; walking enemies turn around when they bump into each other
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
      if (it.y > VH + 8 || it.x < w.cam - 32) it.gone = true;
    }
  }

  function playerContacts(w, ev) {
    const p = w.p;
    for (const it of w.items) {
      if (it.gone || it.rise > 0 || !overlap(p, it)) continue;
      it.gone = true;
      if (!p.big) { w.freeze = 40; w.freezeKind = "grow"; ev.push({ t: "grow" }); }
      else { w.coins += 5; ev.push({ t: "bonus", x: it.x, y: it.y }); }
    }
    for (let c = Math.floor(p.x / T); c <= Math.floor((p.x + p.w - 0.01) / T); c++) {
      for (let r = Math.floor(p.y / T); r <= Math.floor((p.y + p.h - 0.01) / T); r++) {
        if (tileAt(w, c, r) === "o") { setTile(w, c, r, "."); w.coins++; ev.push({ t: "coin", x: c * T, y: r * T }); }
      }
    }
    // enemy contact is checked every second frame, as in the original
    if (w.freeze > 0 || w.frame & 1) return;
    for (const e of w.enemies) {
      if (!e.active || !live(e) || !overlap(p, e)) continue;
      if (e.state === "shell") {
        e.state = "slide";
        e.vx = (p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1) * PH.shellVx;
        e.noHurt = 12;
        ev.push({ t: "kick", x: e.x, y: e.y });
        continue;
      }
      if (p.vy > 0) {
        if (e.kind === "walker") { e.state = "flat"; e.timer = 30; e.vx = 0; }
        else { e.state = "shell"; e.vx = 0; e.timer = PH.shellNap; }
        p.vy = PH.stompVy; p.g = p.fallG; p.onGround = false;
        ev.push({ t: "stomp", x: e.x, y: e.y });
        continue;
      }
      if ((e.state === "slide" && e.noHurt > 0) || p.hurt > 0) continue;
      if (p.big) { w.freeze = 40; w.freezeKind = "shrink"; ev.push({ t: "shrink" }); }
      else die(w, ev, "enemy");
      return;
    }
  }

  function die(w, ev, why) {
    const p = w.p;
    p.vx = 0;
    p.hurt = 0;
    if (why === "pit") w.status = "dead";
    else { w.status = "dying"; w.freeze = 28; w.freezeKind = "die"; }
    ev.push({ t: "die", why });
  }

  function endFreeze(w) {
    const p = w.p;
    if (w.freezeKind === "grow") { p.big = true; p.y -= BIG_H - SMALL_H; p.h = BIG_H; }
    else if (w.freezeKind === "shrink") { p.big = false; p.y += BIG_H - SMALL_H; p.h = SMALL_H; p.hurt = 120; }
    else if (w.freezeKind === "die") { w.status = "dead"; p.vy = -4; }
    w.freezeKind = "";
  }

  function checkFlag(w, ev) {
    const s = w.s, p = w.p, px = s.flagCol * T + 7;
    if (p.x + p.w >= px && p.x <= px + 2 && p.y + p.h > 2 * T && p.y < s.flagBaseRow * T) {
      w.status = "pole";
      w.poleT = 0;
      p.vx = 0; p.vy = 0; p.x = px - p.w + 2; p.onGround = false; p.lift = -1;
      ev.push({ t: "flag" });
    }
  }

  // after the flag: slide down, pause, then walk into the hut
  function poleStep(w, ev) {
    const p = w.p, s = w.s, base = s.flagBaseRow * T;
    if (w.flagY < base - 12) w.flagY = Math.min(w.flagY + 2, base - 12);
    if (w.poleT === 0) {
      if (p.y + p.h < base) { p.y = Math.min(p.y + 2, base - p.h); return; }
      w.poleT = 1;
      p.onGround = true;
      w.poleWait = 24;
    }
    if (w.poleWait > 0) { w.poleWait--; return; }
    p.facing = 1; p.moving = 1; p.vx = 1.25;
    const blocked = moveX(w, p);
    p.anim += 1.25;
    if (p.onGround && !onFloor(w, p)) { p.onGround = false; p.vy = 0; }
    if (!p.onGround) {
      p.y += p.vy;
      p.vy = Math.min(p.vy + PH.fallG[0], PH.maxFall);
      land(w, p);
    }
    // the hut door ends the stage; so does a wall or a drop on the way, so a home-made stage can never get stuck here
    if (p.x >= (s.hutCol + 2) * T || blocked || p.y > VH) { w.status = "done"; ev.push({ t: "stageDone" }); }
  }

  function updateCamera(w) {
    const p = w.p, maxCam = w.s.cols * T - VW;
    const target = p.x + p.w / 2 - 112;
    if (target > w.cam) w.cam = Math.min(target, maxCam);
  }

  // One frame. inp: { left, right, a, b, aPressed }. Returns events for sound and effects.
  function stepWorld(w, inp) {
    const ev = [];
    w.frame++;
    for (const b of w.bumps) b.t--;
    w.bumps = w.bumps.filter((b) => b.t > 0);
    if (w.freeze > 0) {
      if (--w.freeze === 0) endFreeze(w);
      return ev;
    }
    if (w.status === "dead") {
      const p = w.p;
      p.y += p.vy;
      p.vy = Math.min(p.vy + PH.deadG, 4);
      if (p.y > VH + 40 && !w.goneSent) { w.goneSent = true; ev.push({ t: "gone" }); }
      return ev;
    }
    if (w.status === "pole") { liftStep(w); poleStep(w, ev); updateCamera(w); itemStep(w); enemyStep(w, ev); return ev; }
    if (w.status === "done") return ev;
    liftStep(w);
    playerStep(w, inp, ev);
    updateCamera(w);
    itemStep(w);
    enemyStep(w, ev);
    playerContacts(w, ev);
    if (w.status === "play") checkFlag(w, ev);
    if (w.status === "play" && w.p.y > VH) die(w, ev, "pit");
    if (w.p.hurt > 0) w.p.hurt--;
    return ev;
  }
  
module.exports = { normalizeLevels, buildStages, createWorld, stepWorld, cloneWorld, PH, T };
