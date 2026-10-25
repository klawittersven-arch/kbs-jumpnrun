// Spielablauf im Browser: ein Rennen lokal spielen (Einzelspiel, Qualifying), im Finale übers Netz abgleichen
// und am Beamer die Breitbild-Ansicht mit Kamera auf dem Führenden zeichnen.
(function () {
  "use strict";
  const E = window.JRE, G = window.JRG, A = window.JRA, I = window.JRI;
  const T = E.T, VH = E.VH, FRAME_MS = 1000 / 60;

  // Zeit aus Frames: 0:34.217
  function fmt(frames) {
    if (frames == null || !(frames >= 0)) return "–";
    const ms = Math.round((frames * 1000) / 60);
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), r = ms % 1000;
    return m + ":" + String(s).padStart(2, "0") + "." + String(r).padStart(3, "0");
  }

  // geschaffte Strecke als ganze Prozent (abgerundet, damit nur das Ziel 100 % ist)
  function pct(x) { return x == null || !(x >= 0) ? "–" : Math.floor(x * 100) + "\u00a0%"; }
  // dasselbe für die Anzeige: das %-Zeichen der Pixelschrift ist schlecht lesbar, es kommt aus der Textschrift
  function pctHtml(x) { return x == null || !(x >= 0) ? "–" : Math.floor(x * 100) + '<span class="pc">%</span>'; }

  // Wo steht ein Spieler im Rennen, als Anteil 0 … 1 (für die Fortschrittsleiste)
  function share(m, rec) {
    const n = m.plan.length;
    if (rec.fin != null) return 1;
    let x = 0;
    if (rec.p) {
      const s = m.stages[m.plan[rec.k]];
      x = Math.max(0, Math.min(1, (rec.p.x + rec.p.w) / ((s.flagCol + 1) * T)));
    }
    return Math.min(1, (rec.k + x) / n);
  }

  // Zeichnet die Sicht eines Spielers (Handy). others: wie wer gezeichnet wird.
  //   look: { colorOf(slot), tagOf(slot), ghostAlpha }
  function drawRec(view, m, rec, look) {
    look = look || {};
    const colorOf = look.colorOf || ((s) => s), tagOf = look.tagOf || (() => "");
    const w = E.worldFor(m, rec);
    if (!w) {
      const s = m.stages[m.plan[rec.k]];
      G.drawCard(view, "Etappe " + (rec.k + 1) + " von " + m.plan.length, s.name, rec.carry && rec.carry.big, colorOf(rec.slot));
      return;
    }
    const figures = [];
    for (const o of m.recs) {
      if (o === rec || !o.p || o.k !== rec.k) continue;
      // im eigenen Level laufen die anderen als Geister mit, im gemeinsamen Level stehen sie wirklich darin
      figures.push({ p: o.p, color: colorOf(o.slot), tag: tagOf(o.slot), alpha: m.shared ? 0.9 : look.ghostAlpha || 0.45 });
    }
    figures.push({ p: rec.p, color: colorOf(rec.slot), tag: look.selfTag || "" });
    G.drawWorld(view, w, { cam: rec.p.cam, figures, coins: rec.p.coins, won: rec.fin != null, speed: rec.p.speedT / E.SPEED_T, slow: rec.p.slowT / E.SLIME_AFTER });
  }

  // ---------------------------------------------------------------- Lokales Rennen (ein Spieler)
  // opts: { stages, plan, view, color, limit, onTick(m, rec), onFinish(result), onTimeUp(result), onEvent(e) }
  // Ablauf: Countdown (3 Sekunden) → Rennen → Fahne der letzten Etappe → Weg zur Hütte → fertig
  //   limit: Spielzeit in Frames (Qualifying). Wer dann nicht im Ziel ist, bekommt „Zeit um“ und als Ergebnis die
  //   weiteste Strecke, die er geschafft hat (rec.best: 0 … 1 über alle Runden, siehe E.reachOf).
  function localRace(opts) {
    const m = E.createMatch(opts.stages, opts.plan, 1, {});
    const rec = m.recs[0];
    const R = { m, rec, phase: "count", count: 180, result: null, stopped: false, paused: false };
    let acc = 0, lastT = 0, raf = 0;
    function tick() {
      if (R.phase === "count") {
        I.sample(); // Eingaben im Countdown verfallen
        if (R.count % 60 === 0) A.SFX.count();
        if (--R.count <= 0) { R.phase = "run"; A.SFX.start(); }
        return;
      }
      if (R.phase === "timeup") return; // nach Ablauf der Zeit bleibt das Bild stehen
      const ev = E.stepMatch(m, [R.phase === "run" ? I.sample() : 0]);
      const w = E.worldFor(m, rec);
      for (const e of ev) {
        A.eventSound(e);
        if (w) G.eventFx(opts.view, w, e);
        if (opts.onEvent) opts.onEvent(e);
      }
      if (ev.some((e) => e.t === "flag") && rec.fin == null && rec.k < m.plan.length - 1) A.SFX.split();
      if (rec.fin == null && R.phase === "run" && opts.limit && m.frame >= opts.limit) {
        R.phase = "timeup";
        R.result = { timeUp: true, frames: m.frame, progress: rec.best, splits: rec.splits.slice(), deaths: rec.deaths };
        A.SFX.timeUp();
        if (opts.onTimeUp) opts.onTimeUp(R.result);
      }
      if (rec.fin != null && R.phase === "run") {
        R.phase = "finish";
        R.result = { frames: rec.fin, splits: rec.splits.slice(), deaths: rec.deaths, coins: rec.p ? rec.p.coins : 0 };
        A.SFX.finish();
        G.burst(opts.view, w.s.flagCol * T + 8, 40, 46, ["#f0b43c", "#c14a63", "#8fd6a2", "#7fb8e6", "#ffffff"], 3.6, 2.6);
        if (opts.onFinish) opts.onFinish(R.result);
      }
      if (R.phase === "finish" && rec.done) R.phase = "over";
    }
    function loop(t) {
      if (R.stopped) return;
      raf = requestAnimationFrame(loop);
      I.pollGamepad();
      if (R.paused) { lastT = t; return; }
      let dt = lastT ? t - lastT : FRAME_MS;
      lastT = t;
      if (dt > 200) dt = FRAME_MS;
      acc += dt;
      let n = 0;
      while (acc >= FRAME_MS && n < 4 && R.phase !== "over") { tick(); acc -= FRAME_MS; n++; }
      if (acc > FRAME_MS * 4) acc = 0;
      opts.view.tick++;
      G.stepParticles(opts.view);
      drawRec(opts.view, m, rec, { colorOf: () => opts.color || 0 });
      if (opts.onTick) opts.onTick(m, rec, R);
    }
    R.start = () => { raf = requestAnimationFrame(loop); return R; };
    R.stop = () => { R.stopped = true; cancelAnimationFrame(raf); };
    // im Hintergrund hält das Spiel an, die Zeit zählt nur gespielte Frames
    R.onVisibility = () => { R.paused = document.hidden; I.releaseAll(); };
    document.addEventListener("visibilitychange", R.onVisibility);
    const stop = R.stop;
    R.stop = () => { stop(); document.removeEventListener("visibilitychange", R.onVisibility); };
    return R;
  }

  // ---------------------------------------------------------------- Finale übers Netz
  // Jedes Gerät rechnet das ganze Rennen aus allen Eingaben (createSync). Frame 0 beginnt zur Startzeit des Servers.
  //   opts: { stages, plan, n, shared, local (Platz oder -1 für den Beamer), startAt, now() (Serverzeit),
  //           send(obj), view, onEvents(ev, m) }
  const SEND_EVERY = 4, CHUNK = 6000, BEAMER_DELAY = 6, MAX_AHEAD = 150;
  function netRace(opts) {
    const S = E.createSync(opts.stages, opts.plan, opts.n, { shared: opts.shared, regrow: opts.shared }, opts.local);
    const N = { S, sent: 0, lastAsk: 0, stopped: false };
    S.onEvents = (ev, m) => { if (opts.onEvents) opts.onEvents(ev, m); };
    N.frameNow = () => Math.floor((opts.now() - opts.startAt) / FRAME_MS);
    // eigene Eingaben bis zum aktuellen Frame eintragen; ruckelt das Handy, gelten die gehaltenen Tasten
    // für alle verpassten Frames (ein neuer Sprung zählt nur einmal)
    N.pump = () => {
      // nach Ablauf der Zeit bleibt das Rennen stehen (siehe E.FINAL_FRAMES)
      const target = Math.min(N.frameNow(), E.FINAL_FRAMES);
      if (opts.local >= 0) {
        if (target <= 0) { I.sample(); return; }
        const have = S.known(opts.local);
        if (have < target) {
          const bits = I.sample();
          for (let f = have; f < target; f++) S.pushLocal(f === have ? bits : bits & ~E.BIT.press);
        }
        // am Ende der Zeit auch den letzten, kleinen Rest senden, sonst wartet der Server darauf
        N.flush(target >= E.FINAL_FRAMES);
      } else {
        // der Beamer zeigt das Rennen knapp hinter der Echtzeit und schätzt höchstens 2,5 Sekunden voraus
        S.advanceTo(Math.max(S.match().frame, Math.min(N.frameNow() - BEAMER_DELAY, S.confirmed() + MAX_AHEAD, E.FINAL_FRAMES)));
      }
    };
    // eigene Eingaben an den Server, in kleinen Paketen
    N.flush = (force) => {
      if (opts.local < 0) return;
      const log = S.logs[opts.local];
      if (log.length - N.sent < (force ? 1 : SEND_EVERY)) return;
      const d = log.slice(N.sent, N.sent + CHUNK);
      if (opts.send({ t: "in", f: N.sent, d })) N.sent += d.length;
    };
    // Nachricht vom Server: Eingaben eines anderen Platzes, Anforderung zum Nachsenden, alle Protokolle
    N.receive = (msg) => {
      if (msg.t === "in") {
        if (!S.addRemote(msg.s, msg.f, msg.d)) N.askLogs();
      } else if (msg.t === "need") {
        if (msg.s === opts.local) N.sent = Math.min(N.sent, msg.from | 0);
      } else if (msg.t === "logs") {
        (msg.logs || []).forEach((l, s) => {
          if (s === opts.local) { if (l.length < N.sent) N.sent = l.length; return; }
          if (typeof l === "string" && l.length > S.known(s)) S.addRemote(s, S.known(s), l.slice(S.known(s)));
        });
      }
    };
    N.askLogs = () => {
      const now = Date.now();
      if (now - N.lastAsk < 1000) return;
      N.lastAsk = now;
      opts.send({ t: "logs?" });
    };
    // nach einem Neuladen der Seite: das eigene Protokoll vom Server übernehmen
    N.restoreOwn = (log) => {
      if (opts.local < 0 || !log) return;
      for (let i = S.known(opts.local); i < log.length; i++) S.pushLocal(E.charInput(log[i]));
      N.sent = Math.max(N.sent, Math.min(log.length, S.known(opts.local)));
    };
    N.match = () => S.match();
    N.stale = (slot) => S.known(slot) < N.frameNow() - 60;
    return N;
  }

  // ---------------------------------------------------------------- Beamer: Breitbild, Kamera auf dem Führenden
  // look: { colorOf(slot), tagOf(slot), stale(slot) }
  function beamer(view) {
    const B = { cam: 0, wk: null };
    B.leader = (m) => {
      let best = null, bv = -Infinity;
      for (const r of m.recs) { const v = E.progressOf(m, r); if (v > bv) { bv = v; best = r; } }
      return best;
    };
    B.draw = (m, look) => {
      const vw = view.cv.width, g = view.g;
      const lead = B.leader(m);
      const w = lead && E.worldFor(m, lead);
      if (!w) {
        const k = lead ? lead.k : 0, s = m.stages[m.plan[k]];
        G.drawCard(view, "Etappe " + (k + 1) + " von " + m.plan.length, s.name, false, look.colorOf(lead ? lead.slot : 0));
        B.wk = null;
        return;
      }
      const maxCam = Math.max(0, w.s.cols * T - vw);
      const target = Math.max(0, Math.min(maxCam, lead.p.x + lead.p.w / 2 - vw * 0.42));
      if (B.wk !== lead.wk && !(m.shared && B.wk && B.wk === lead.wk)) B.cam = target;
      B.wk = lead.wk;
      B.cam += (target - B.cam) * 0.12;
      if (Math.abs(target - B.cam) < 0.5) B.cam = target;
      const figures = [];
      const others = m.recs.filter((r) => r !== lead && r.p && r.k === lead.k);
      for (const o of others) figures.push({ p: o.p, color: look.colorOf(o.slot), tag: look.tagOf(o.slot), alpha: m.shared ? 1 : 0.55 });
      figures.push({ p: lead.p, color: look.colorOf(lead.slot), tag: look.tagOf(lead.slot) });
      G.drawWorld(view, w, { cam: B.cam, figures, coins: null, won: lead.fin != null });
      // Pfeile am Rand für alle in dieser Etappe, die gerade nicht im Bild sind
      for (const o of others) {
        const p = o.p, x = p.x - B.cam;
        if (p.status === "done") continue;
        if (x + p.w < 0) edgeArrow(g, 2, p, look, o.slot, -1);
        else if (x > vw) edgeArrow(g, vw - 2, p, look, o.slot, 1);
      }
    };
    function edgeArrow(g, x, p, look, slot, dir) {
      const y = Math.max(24, Math.min(VH - 24, Math.round(p.y + p.h / 2)));
      const col = G.COLORS[look.colorOf(slot)].ui;
      g.fillStyle = "rgba(13,14,18,0.8)";
      const tag = look.tagOf(slot), tw = G.textWidth(tag) + 4;
      const bx = dir < 0 ? x + 6 : x - 6 - tw;
      g.fillRect(bx, y - 5, tw, 9);
      G.drawText(g, tag, bx + 2, y - 3, col);
      g.fillStyle = col;
      for (let i = 0; i < 4; i++) g.fillRect(dir < 0 ? x + i : x - i - 1, y - i, 1, i * 2 + 1);
    }
    return B;
  }

  // Zeitlimit im Finale: Sekunden bis zum Schluss, sobald der Countdown läuft (sonst 0); -1 heißt „Zeit um“
  // Countdown vor einem Zeitlimit: in den letzten Sekunden die verbleibenden Sekunden, danach -1, sonst 0
  function limitCountdown(frame, end, warn) {
    if (frame >= end) return -1;
    if (frame >= warn) return Math.ceil((end - frame) / 60);
    return 0;
  }
  function finalCountdown(frame) { return limitCountdown(frame, E.FINAL_FRAMES, E.FINAL_WARN); }
  // Rangfolge im Rennen: wer im Ziel ist nach Zeit, dann wer dem Ziel am nächsten gekommen ist (wie auf dem Server)
  function standings(m) {
    return m.recs.slice().sort((a, b) => E.scoreOf(m, b) - E.scoreOf(m, a) || a.slot - b.slot);
  }

  // gerade das Speed-Item eingesammelt? Dann steht anderthalb Sekunden lang „Speed!“ groß im Bild
  const speedNews = (rec) => !!rec && !!rec.p && rec.p.speedT > E.SPEED_T - 90;

  window.JRP = { fmt, pct, pctHtml, share, drawRec, localRace, netRace, beamer, speedNews, limitCountdown, finalCountdown, standings, FRAME_MS };
})();
