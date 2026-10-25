// Seite der Lehrkraft (Beamer): Qualifying einrichten, QR-Code, Zeitenliste, Finale einrichten,
// Finale in Breitbild mit Kamera auf dem Führenden, Siegerehrung. Den Level-Editor gibt es nur hier.
(function () {
  "use strict";
  const E = window.JRE, G = window.JRG, A = window.JRA, I = window.JRI, P = window.JRP, U = window.KUtil;
  const $ = (s) => document.querySelector(s);
  const viewEl = $("#view"), toastEl = $("#toast"), netdot = $("#netdot"), codeChip = $("#codeChip");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const roundsTxt = (n) => n + " " + (n === 1 ? "Runde" : "Runden");
  const THEME_NAMES = { meadow: "Wiese", mine: "Stollen", clinic: "Klinik bei Nacht", glacier: "Gletscher", vineyard: "Weinberg" };
  const BEAM_W = 427; // 16:9 bei 240 Zeilen
  I.enabled = false; // am Beamer wird nicht gespielt (außer im Testlauf des Editors)

  // ---------------------------------------------------------------- Level-Sammlung dieses Browsers
  const DEFAULT_LIB = E.normalizeLibrary(window.JR_LEVELS);
  function loadLib() { const l = E.normalizeLibrary(U.store("jr.levels")); return l || JSON.parse(JSON.stringify(DEFAULT_LIB)); }
  let lib = loadLib();
  function saveLib(l) {
    lib = l;
    if (JSON.stringify(l) === JSON.stringify(DEFAULT_LIB)) U.store("jr.levels", null); else U.store("jr.levels", l);
    if (setup.si >= lib.stages.length) setup.si = 0;
    if (screen === "setup") renderSetup();
  }

  let sess = U.store("jr.teacher");
  let net = null, room = null, screen = "", race = null, podiumRound = -1;
  const setup = Object.assign({ si: 0, rounds: 1 }, U.store("jr.teacher.setup") || {});
  const fsel = { p: null, si: [0, 1], shared: true, n: 4 };
  const lv = { final: null, flv: 0, asked: 0 };

  // ---------------------------------------------------------------- Verbindung
  function newSession() {
    sess = { code: U.randomCode(5), key: U.randomId(24) };
    U.store("jr.teacher", sess); room = null; screen = "";
    connect();
  }
  function connect() {
    if (net) net.close();
    codeChip.hidden = false; codeChip.textContent = "Code " + sess.code;
    net = window.KNet({
      code: sess.code, params: { role: "teacher", key: sess.key },
      onMessage, onStatus: (s) => { netdot.dataset.s = s; if (s === "online" && race) race.N.askLogs(); if (s === "offline" && net.stopped === "code-taken") newSession(); },
    });
    net.open();
  }
  function onMessage(m) {
    switch (m.t) {
      case "room": room = m; render(); break;
      case "levels": if (m.final) { lv.final = m.final; lv.flv = m.flv; } render(); break;
      case "error":
        if (m.why === "code-taken") newSession();
        else if (m.why === "final-offline") toast("Alle Handys im Finale müssen verbunden sein, bevor es losgeht.");
        else if (m.why === "final-players") toast("Bitte zwei bis vier verschiedene Namen fürs Finale wählen.");
        else if (m.why === "bad-level") toast("Das Level ist fehlerhaft. Öffne es im Level-Editor und speichere es neu.");
        else if (m.why === "kick-finalist") toast("Während des Finales kann niemand aus dem Finale entfernt werden.");
        break;
      case "in": case "logs": case "need": if (race) race.N.receive(m); break;
      case "ended": room = null; screen = ""; break;
    }
  }
  // wichtige Befehle gehen nie verloren: ohne Verbindung warten sie, bis sie wieder steht
  function send(obj) { if (!net.send(obj, true)) toast("Keine Verbindung zum Server. Die Änderung wird gesendet, sobald die Verbindung wieder steht."); }
  let toastT = 0;
  function toast(t) { toastEl.textContent = t; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (toastEl.hidden = true), 4500); }
  function confirmToast(html, yes, onYes) {
    toastEl.innerHTML = html + ` <button class="mini" id="cYes" type="button">${esc(yes)}</button> <button class="mini ghost" id="cNo" type="button">Abbrechen</button>`;
    toastEl.hidden = false; clearTimeout(toastT);
    $("#cYes").onclick = () => { toastEl.hidden = true; onYes(); };
    $("#cNo").onclick = () => { toastEl.hidden = true; };
  }

  // ---------------------------------------------------------------- Bausteine
  // Vorschau eines Levels: der Anfang in Breitbild mit der Spielfigur am Start
  function preview(stage, w) {
    const cv = document.createElement("canvas");
    cv.width = w || BEAM_W; cv.height = E.VH;
    const st = E.stageView(stage), world = E.createSoloWorld([st], 0);
    G.drawWorld(G.makeView(cv), world, { cam: 0, figures: [{ p: world.p, color: 0 }] });
    return cv;
  }
  function levelPicker(sel, onPick, label) {
    const wrap = document.createElement("div");
    wrap.className = "levels"; wrap.setAttribute("role", "radiogroup"); wrap.setAttribute("aria-label", label || "Level");
    lib.stages.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(i === sel));
      b.appendChild(preview(s));
      const t = document.createElement("span");
      const changed = !DEFAULT_LIB.stages[i] || JSON.stringify(DEFAULT_LIB.stages[i]) !== JSON.stringify(s);
      t.innerHTML = `<b>${i + 1} · ${esc(s.name)}</b>${changed ? '<span class="badge">eigen</span>' : ""}<small>${esc(THEME_NAMES[s.theme] || s.theme)} · ${s.cols} Spalten · ${s.enemies.length} Gegner</small>`;
      b.appendChild(t);
      b.onclick = () => { A.ensure(); wrap.querySelectorAll(".lvl").forEach((x, j) => x.setAttribute("aria-checked", String(j === i))); onPick(i); };
      wrap.appendChild(b);
    });
    return wrap;
  }
  function stepper(val, min, max, fmtFn, onChange) {
    const w = document.createElement("div"); w.className = "stepper";
    w.innerHTML = `<button type="button" aria-label="Weniger">−</button><output></output><button type="button" aria-label="Mehr">+</button>`;
    const [minus, out, plus] = w.children;
    const set = (v, quiet) => { val = Math.max(min, Math.min(max, v)); out.textContent = fmtFn(val); minus.disabled = val <= min; plus.disabled = val >= max; if (!quiet) onChange(val); };
    minus.onclick = () => set(val - 1); plus.onclick = () => set(val + 1);
    set(val, true);
    return w;
  }
  function figure(color, big, width) {
    const src = G.portrait(color, big), cv = document.createElement("canvas");
    cv.width = src.width; cv.height = src.height; cv.getContext("2d").drawImage(src, 0, 0);
    if (width) cv.style.width = width;
    return cv;
  }

  // ---------------------------------------------------------------- Ansichten
  function render() {
    if (!room || !editorClosed()) return;
    codeChip.textContent = "Code " + room.code;
    const ph = room.phase;
    if (ph !== "final" && !(ph === "podium" && race && race.round === room.final.round)) stopRace();
    if (ph === "setup") { if (screen !== "setup") renderSetup(); else updateSetupCount(); }
    else if (ph === "quali") { if (screen !== "quali") renderQuali(); else updateQuali(); }
    else if (ph === "final-setup") { if (screen !== "final-setup") renderFinalSetup(); else updateFinalSetup(); }
    else if (ph === "final") { if (!race || race.round !== room.final.round) startRace(); else updateRace(); }
    else if (ph === "podium") {
      if (race && race.round === room.final.round) { race.done = room.final; return; }
      if (screen !== "podium" || podiumRound !== room.final.round) renderPodium();
    }
  }

  // ---------- 1. Qualifying einrichten
  function renderSetup() {
    screen = "setup";
    viewEl.innerHTML = `<div class="tpage">
      <div class="thead"><h2>Qualifying einrichten</h2><p>Die SuS spielen allein gegen die Uhr, jede und jeder auf dem eigenen Handy. Gegangen wird nur, Rennen gibt es im Klassenmodus nicht. Die Zeit erscheint hier am Beamer.</p></div>
      <div class="tsec"><h3>Level</h3><div id="slotLevels"></div></div>
      <div class="tsec"><h3>Rundenzahl</h3><div id="slotRounds"></div><p class="hint">Bei mehr als einer Runde muss das Level mehrmals hintereinander geschafft werden.</p></div>
      <div class="tactions">
        <label class="check" id="resetRow" hidden><input type="checkbox" id="chkReset" checked> Bisherige Anmeldungen und Zeiten löschen (<span id="nPlayers">0</span>)</label>
        <button class="big-btn" id="btnOpen" type="button">Qualifying starten und QR-Code zeigen</button>
      </div></div>`;
    if (setup.si >= lib.stages.length) setup.si = 0;
    $("#slotLevels").appendChild(levelPicker(setup.si, (i) => { setup.si = i; saveSetup(); }, "Level fürs Qualifying"));
    $("#slotRounds").appendChild(stepper(setup.rounds, 1, 5, roundsTxt, (v) => { setup.rounds = v; saveSetup(); }));
    updateSetupCount();
    $("#btnOpen").onclick = () => {
      A.ensure();
      const reset = room.players.length ? $("#chkReset").checked : true;
      send({ t: "quali-open", stage: lib.stages[setup.si], si: setup.si, rounds: setup.rounds, reset });
    };
  }
  function saveSetup() { U.store("jr.teacher.setup", setup); }
  function updateSetupCount() {
    const n = room.players.length;
    $("#resetRow").hidden = !n; $("#nPlayers").textContent = n === 1 ? "1 Person" : n + " Personen";
  }

  // ---------- 2. Qualifying läuft
  function joinUrl() { return location.origin + "/mitspielen#" + room.code; }
  function drawQR(canvas, text) {
    const qr = window.qrcode(0, "M"); qr.addData(text); qr.make();
    const n = qr.getModuleCount(), q = 3, px = 8, size = (n + q * 2) * px;
    canvas.width = canvas.height = size;
    const g = canvas.getContext("2d");
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, size, size);
    g.fillStyle = "#1a1d25";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect((c + q) * px, (r + q) * px, px, px);
  }
  function renderQuali() {
    screen = "quali";
    const q = room.quali;
    viewEl.innerHTML = `<div class="tpage quali">
      <div class="joinbox">
        <p class="eyebrow">Qualifying · ${esc(q.name)} · ${roundsTxt(q.rounds)}</p>
        <h2>Scanne den Code und lauf deine Bestzeit</h2>
        <canvas id="qr" class="qr" role="img" aria-label="QR-Code zum Mitspielen"></canvas>
        <p class="joinurl">Ohne Kamera: <b>${esc(location.host)}/mitspielen</b> öffnen und den Code <b class="code">${esc(room.code)}</b> eingeben.</p>
      </div>
      <div class="board">
        <div class="board-head"><h2>Zeiten</h2><span id="counts"></span></div>
        <ol class="ranking" id="ranking"></ol>
        <div class="tactions">
          <button class="ghost-btn" id="btnSettings" type="button">Einstellungen ändern</button>
          <button class="ghost-btn" id="btnRestart" type="button">Qualifying neu starten</button>
          <button class="big-btn" id="btnFinal" type="button">Finale einrichten</button>
        </div>
      </div></div>`;
    drawQR($("#qr"), joinUrl());
    $("#btnSettings").onclick = () => send({ t: "phase", phase: "setup" });
    $("#btnRestart").onclick = () => {
      const n = room.players.length;
      const go = () => { A.ensure(); send({ t: "quali-open", stage: lib.stages[q.si] || lib.stages[0], si: q.si, rounds: q.rounds, reset: true }); screen = ""; };
      if (!n) return go();
      confirmToast(`Neues Qualifying mit denselben Einstellungen starten? ${n === 1 ? "Die eine Anmeldung wird" : "Die " + n + " Anmeldungen und Zeiten werden"} gelöscht.`, "Neu starten", go);
    };
    $("#btnFinal").onclick = openFinalSetup;
    updateQuali();
  }
  function ranked() {
    const done = room.players.filter((p) => p.total != null).sort((a, b) => a.rank - b.rank);
    return done.concat(room.players.filter((p) => p.total == null));
  }
  function updateQuali() {
    const list = ranked(), done = list.filter((p) => p.total != null).length;
    $("#counts").textContent = `${list.length} angemeldet · ${done} im Ziel`;
    const fb = $("#btnFinal"); fb.disabled = done < 2; fb.title = done < 2 ? "Sobald zwei im Ziel sind, kann das Finale beginnen." : "";
    const ol = $("#ranking");
    ol.classList.toggle("many", list.length > 12);
    if (!list.length) { ol.innerHTML = '<li class="empty">Noch niemand angemeldet. Sobald jemand den QR-Code scannt und einen Namen eingibt, erscheint er hier.</li>'; return; }
    ol.innerHTML = list.map((p, i) => {
      const fin = p.total != null;
      return `<li class="${fin && i < 4 ? "fin4" : ""}${fin ? "" : " running"}${p.online ? "" : " off"}" data-pid="${esc(p.pid)}">
        <span class="rk">${fin ? i + 1 + "." : ""}</span>
        <span class="nm">${esc(p.name)}</span><span class="tm">${fin ? P.fmt(p.total) : "läuft …"}</span>
        <button class="kick" type="button" title="${esc(p.name)} entfernen" aria-label="${esc(p.name)} entfernen">×</button></li>`;
    }).join("");
    ol.querySelectorAll(".kick").forEach((b) => (b.onclick = () => {
      const li = b.closest("li"), name = li.querySelector(".nm").textContent;
      confirmToast(`${esc(name)} aus der Liste entfernen?`, "Entfernen", () => send({ t: "kick", pid: li.dataset.pid }));
    }));
  }

  // ---------- 3. Finale einrichten
  function finishers() { return room.players.filter((p) => p.total != null).sort((a, b) => a.rank - b.rank); }
  function sendFinal(start) {
    const msg = { t: start ? "final-start" : "final-setup", p: fsel.p, stages: fsel.si.map((i) => lib.stages[i]), si: fsel.si, shared: fsel.shared };
    send(msg);
  }
  function openFinalSetup() {
    const fin = finishers();
    if (fin.length < 2) return toast("Für das Finale braucht es mindestens zwei Zeiten.");
    fsel.p = fin.slice(0, Math.min(fsel.n, fin.length)).map((p) => p.pid);
    if (fsel.si.some((i) => i >= lib.stages.length)) fsel.si = [0, Math.min(1, lib.stages.length - 1)];
    sendFinal(false);
  }
  function renderFinalSetup() {
    screen = "final-setup";
    const f = room.final;
    fsel.p = f.p.slice(); fsel.shared = f.shared;
    if (f.si && f.si.every((i) => i < lib.stages.length)) fsel.si = f.si.slice();
    viewEl.innerHTML = `<div class="tpage">
      <div class="thead"><h2>Finale einrichten</h2><p>Die Schnellsten aus dem Qualifying sind vorausgewählt. Tippe Namen an, um sie hinzuzufügen oder zu entfernen (2 bis 4). Die Reihenfolge im Qualifying bestimmt die Farbe.</p></div>
      <div class="tsec"><h3>Finalisten</h3><div class="finalists" id="fPlayers"></div></div>
      <div class="tgrid2">
        <div class="tsec"><h3>Etappe 1</h3><div id="fLv0"></div></div>
        <div class="tsec"><h3>Etappe 2</h3><div id="fLv1"></div></div>
      </div>
      <label class="toggle"><input type="checkbox" id="chkShared"><span><b>Gemeinsames Level</b>
        <span>Alle laufen im selben Level und sehen sich gegenseitig. Niemand blockiert jemanden, aber Münzen, zerbrochene Ziegel und Gegner gelten für alle. Ziegel wachsen nach 4 Sekunden nach, Panzer treffen nur Gegner, Kristalle bekommt, wer zuerst da ist. Ohne Haken läuft jede und jeder im eigenen Level, die anderen sind als Geister zu sehen.</span></span></label>
      <div class="tactions">
        <button class="ghost-btn" id="btnBackQ" type="button">Zurück zum Qualifying</button>
        <span class="hint" id="startHint"></span>
        <button class="big-btn" id="btnStart" type="button">Finale starten</button>
      </div></div>`;
    const small = (i, onPick) => {
      const w = levelPicker(fsel.si[i], onPick, "Level für Etappe " + (i + 1));
      w.style.gridTemplateColumns = "repeat(auto-fill,minmax(170px,1fr))";
      return w;
    };
    $("#fLv0").appendChild(small(0, (j) => { fsel.si[0] = j; sendFinal(false); }));
    $("#fLv1").appendChild(small(1, (j) => { fsel.si[1] = j; sendFinal(false); }));
    const chk = $("#chkShared"); chk.checked = fsel.shared;
    chk.onchange = () => { fsel.shared = chk.checked; sendFinal(false); };
    $("#btnBackQ").onclick = () => send({ t: "phase", phase: "quali" });
    $("#btnStart").onclick = () => { A.ensure(); sendFinal(true); };
    updateFinalSetup();
  }
  function updateFinalSetup() {
    const f = room.final; if (!f) return;
    const fin = finishers();
    // Finalisten in der Reihenfolge des Qualifyings: Platz im Finale = Farbe
    const box = $("#fPlayers");
    box.innerHTML = "";
    fin.forEach((p) => {
      const slot = fsel.p.indexOf(p.pid), on = p.online;
      const b = document.createElement("button");
      b.type = "button"; b.className = "fpick"; b.setAttribute("aria-pressed", String(slot >= 0));
      b.appendChild(figure(slot >= 0 ? slot : 0, false, "40px"));
      if (slot < 0) b.firstChild.style.opacity = ".35";
      const t = document.createElement("span");
      t.innerHTML = `<span class="nm ${slot >= 0 ? "cname c" + slot : ""}">${p.rank}. ${esc(p.name)}</span><small>${P.fmt(p.total)}${slot >= 0 ? " · " + esc(G.COLORS[slot].name) : ""}</small>${slot >= 0 ? `<small class="online ${on ? "yes" : "no"}">${on ? "Handy verbunden" : "Handy nicht verbunden"}</small>` : ""}`;
      b.appendChild(t);
      b.onclick = () => {
        let sel = fsel.p.slice();
        if (slot >= 0) { if (sel.length <= 2) return toast("Mindestens zwei spielen im Finale."); sel = sel.filter((x) => x !== p.pid); }
        else { if (sel.length >= 4) return toast("Höchstens vier spielen im Finale."); sel.push(p.pid); }
        const order = fin.map((x) => x.pid);
        fsel.p = sel.sort((a, b2) => order.indexOf(a) - order.indexOf(b2));
        fsel.n = fsel.p.length;
        sendFinal(false);
      };
      box.appendChild(b);
    });
    const ok = f.online && f.online.every(Boolean);
    $("#btnStart").disabled = !ok;
    $("#startHint").textContent = ok ? f.p.length + " bereit." : "Warte, bis alle Handys im Finale verbunden sind.";
  }

  // ---------- 4. Finale am Beamer
  function stopRace() {
    if (!race) return;
    cancelAnimationFrame(race.raf);
    race = null;
  }
  function startRace() {
    const f = room.final;
    if (lv.flv !== f.lv || !lv.final) {
      if (Date.now() - lv.asked > 1000) { lv.asked = Date.now(); send({ t: "level?" }); }
      if (screen !== "loading") { screen = "loading"; viewEl.innerHTML = `<div class="card"><h2>Lade das Finale …</h2></div>`; }
      return;
    }
    stopRace();
    screen = "final";
    const stages = lv.final.map((d, i) => E.stageView(E.normalizeStage(d, i)));
    const n = f.names.length, tags = f.names.map(G.initials);
    viewEl.innerHTML = `<div class="tpage race">
      <div class="progress" id="prog"></div>
      <div class="beam"><canvas id="beam" width="${BEAM_W}" height="240" aria-label="Finale, die Kamera folgt der Spitze"></canvas><div class="overlay" id="bmsg"></div></div>
      <div class="racers" id="racers">${f.names.map((nm, i) => `<div class="racer" id="r${i}"><span class="dot c${i}"></span><span><span class="nm cname c${i}">${esc(nm)}</span><small id="rs${i}"></small></span><span class="tm" id="rt${i}"></span></div>`).join("")}</div>
      <div class="racefoot"><span class="eyebrow">Finale · ${esc(f.stageNames.join(" + "))}${f.shared ? " · gemeinsames Level" : ""}</span>
        <span><button class="ghost-btn" id="btnCancel" type="button">Abbrechen</button> <button class="ghost-btn" id="btnEnd" type="button">Finale jetzt beenden</button></span></div></div>`;
    // Fortschrittsleiste: zwei Abschnitte, ein Punkt je Spieler mit Initialen
    const prog = $("#prog");
    prog.innerHTML = [0, 1].map((k) => `<div class="seg" style="left:calc(24px + (100% - 48px) * ${k / 2} + ${k ? 6 : 0}px);width:calc((100% - 48px) / 2 - 6px)"><span>${k + 1} · ${esc(f.stageNames[k])}</span></div>`).join("") +
      `<div class="flag" style="left:calc(100% - 26px)"></div>` +
      f.names.map((nm, i) => `<div class="pdot" id="pd${i}" style="background:var(--c${i});left:24px"><b class="cname c${i}">${esc(tags[i])}</b></div>`).join("");
    const view = G.makeView($("#beam"));
    const B = P.beamer(view);
    const N = P.netRace({
      stages, plan: [0, 1], n, shared: f.shared, local: -1, startAt: f.startAt, now: () => net.serverNow(), send: (o) => net.send(o), view,
      onEvents: (ev, m) => {
        const lead = B.leader(m), w = lead && E.worldFor(m, lead);
        for (const e of ev) {
          if (!lead || e.w !== lead.wk) continue;
          if (e.t !== "jump" && e.t !== "jumpBig") A.eventSound(e);
          if (w) G.eventFx(view, w, e);
          if (e.t === "flag" && m.recs[e.s] && m.recs[e.s].k === m.plan.length - 1) A.SFX.finish();
        }
      },
    });
    race = { N, B, round: f.round, raf: 0, done: null, n, lastCount: 99 };
    if (N.frameNow() > 30) N.askLogs();
    const look = { colorOf: (s) => s, tagOf: (s) => tags[s] };
    const dots = f.names.map((_, i) => $("#pd" + i));
    let tick = 0;
    function loop() {
      if (!race || race.N !== N) return;
      race.raf = requestAnimationFrame(loop);
      N.pump();
      const m = N.match(), fnow = N.frameNow();
      view.tick++;
      G.stepParticles(view);
      B.draw(m, look);
      // Countdown, Start, Zieleinlauf
      const msg = $("#bmsg");
      if (fnow < 0) {
        const c = Math.ceil(-fnow / 60);
        if (c !== race.lastCount && c <= 3) { race.lastCount = c; A.SFX.count(); }
        msg.innerHTML = c <= 3 ? `<div class="big">${c}</div><div class="sub">Finale</div>` : `<div class="sub">Gleich geht's los</div>`;
      } else if (fnow < 60) { if (race.lastCount) { race.lastCount = 0; A.SFX.start(); } msg.innerHTML = `<div class="big">Los!</div>`; }
      else {
        const first = m.recs.filter((r) => r.fin != null).sort((a, b) => a.fin - b.fin)[0];
        msg.innerHTML = first ? `<div class="big gold">Ziel!</div><div class="sub">${esc(f.names[first.slot])} · ${P.fmt(first.fin)}</div>` : "";
      }
      if (++tick % 6 === 0) {
        // Punkte auf der Fortschrittsleiste; liegen sie dicht beieinander, stapeln sich die Initialen
        const shares = m.recs.map((r) => P.share(m, r));
        const order = shares.map((v, i) => i).sort((a, b) => shares[a] - shares[b]);
        let prev = -1, level = 0;
        for (const i of order) {
          level = prev >= 0 && shares[i] - shares[prev] < 0.035 ? level + 1 : 0;
          dots[i].firstChild.style.bottom = 24 + level * 13 + "px";
          prev = i;
        }
        m.recs.forEach((r, i) => {
          const sh = shares[i];
          dots[i].style.left = `calc(24px + (100% - 48px) * ${sh.toFixed(4)})`;
          const stale = fnow > 60 && N.stale(i) && r.fin == null;
          $("#r" + i).classList.toggle("stale", stale);
          $("#rs" + i).textContent = stale ? "Verbindung …" : r.fin != null ? "im Ziel" : "Etappe " + (r.k + 1) + (r.deaths ? " · " + r.deaths + "× neu" : "");
          $("#rt" + i).textContent = r.fin != null ? P.fmt(r.fin) : "";
        });
      }
      // nach der Entscheidung noch kurz zuschauen, dann Siegerehrung
      if (race.done && net.serverNow() - race.done.doneAt > 4000) { stopRace(); renderPodium(); }
    }
    $("#btnEnd").onclick = () => confirmToast("Finale jetzt beenden? Wer gerade vorne liegt, gewinnt.", "Beenden", () => send({ t: "final-end" }));
    $("#btnCancel").onclick = () => confirmToast("Finale abbrechen und zur Einrichtung zurück?", "Abbrechen", () => send({ t: "final-cancel" }));
    race.raf = requestAnimationFrame(loop);
  }
  function updateRace() {}

  // ---------- 5. Siegerehrung
  function renderPodium() {
    screen = "podium";
    const f = room.final; podiumRound = f.round;
    const pl = f.place;
    viewEl.innerHTML = `<div class="tpage podium">
      <p class="eyebrow">Siegerehrung · Finale ${esc(f.stageNames.join(" + "))}</p>
      <canvas id="podCv" width="640" height="320" role="img" aria-label="Siegertreppchen"></canvas>
      <h2 class="cname c${pl[0]}">${esc(f.names[pl[0]])}</h2>
      <div class="places">${pl.slice(0, 3).map((s, i) => `<span>${i + 1}. <b class="cname c${s}">${esc(f.names[s])}</b>${f.fin[s] != null ? " · " + P.fmt(f.fin[s]) : ""}</span>`).join("")}</div>
      <div class="tactions center">
        <button class="big-btn" id="btnRematch" type="button">Revanche</button>
        <button class="ghost-btn" id="btnNewFinal" type="button">Anderes Finale</button>
        <button class="ghost-btn" id="btnBackQ2" type="button">Zurück zum Qualifying</button>
      </div></div>`;
    podiumScene($("#podCv"), f);
    A.ensure(); A.SFX.fanfare();
    $("#btnRematch").onclick = () => { fsel.p = f.p.slice(); fsel.si = f.si.slice(); fsel.shared = f.shared; sendFinal(false); };
    $("#btnNewFinal").onclick = openFinalSetup;
    $("#btnBackQ2").onclick = () => send({ t: "phase", phase: "quali" });
  }
  // Treppchen mit Platz 2, 1, 3, die Figuren in ihren Farben, ein Pokal beim Sieger, Konfetti
  function trophy(g, x, y, s) {
    const px = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a * s, y + b * s, w * s, h * s); };
    px(2, 0, 12, 1, "#7a5208"); px(1, 1, 14, 7, "#7a5208");
    px(2, 1, 12, 6, "#f0b43c"); px(3, 1, 2, 5, "#ffe39a"); px(0, 2, 2, 3, "#7a5208"); px(14, 2, 2, 3, "#7a5208");
    px(3, 8, 10, 2, "#7a5208"); px(4, 8, 8, 1, "#d99a1a"); px(6, 10, 4, 3, "#7a5208"); px(7, 10, 2, 3, "#f0b43c");
    px(4, 13, 8, 3, "#7a5208"); px(5, 13, 6, 2, "#f0b43c");
  }
  function podiumScene(cv, f) {
    const g = cv.getContext("2d"), W = cv.width, H = cv.height;
    g.imageSmoothingEnabled = false;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const conf = Array.from({ length: 90 }, () => ({ x: rnd() * W, y: rnd() * H, v: 20 + rnd() * 30, ph: rnd() * 6.28, c: ["#f0b43c", "#c14a63", "#8fd6a2", "#7fbaf2", "#ffffff", "#f59bbe"][(rnd() * 6) | 0] }));
    // Mitte Platz 1 (am höchsten), links Platz 2, rechts Platz 3
    const steps = [{ place: 0, x: W / 2 - 75, w: 150, h: 120 }, { place: 1, x: W / 2 - 235, w: 150, h: 84 }, { place: 2, x: W / 2 + 85, w: 150, h: 60 }];
    const t0 = performance.now();
    function draw(t) {
      g.clearRect(0, 0, W, H);
      const gr = g.createRadialGradient(W / 2, 90, 10, W / 2, 120, 300);
      gr.addColorStop(0, "rgba(240,180,60,.30)"); gr.addColorStop(1, "rgba(240,180,60,0)");
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (const st of steps) {
        const slot = f.place[st.place];
        if (slot == null) continue;
        const top = H - st.h;
        g.fillStyle = "#0d0e12"; g.fillRect(st.x - 2, top - 2, st.w + 4, st.h + 2);
        g.fillStyle = st.place === 0 ? "#f0b43c" : st.place === 1 ? "#c9ced8" : "#d08a52"; g.fillRect(st.x, top, st.w, st.h);
        g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(st.x, top, st.w, 5);
        g.fillStyle = "#1a1d25"; g.font = "bold 40px Bungee, sans-serif"; g.textAlign = "center"; g.fillText(String(st.place + 1), st.x + st.w / 2, top + 54);
        const img = G.portrait(slot, true), sc = 3;
        let hop = 0;
        if (!reduce && st.place === 0) { const ph = t % 1.4; if (ph < 0.35) hop = -Math.round(Math.sin((Math.PI * ph) / 0.35) * 14); }
        g.drawImage(img, Math.round(st.x + st.w / 2 - (img.width * sc) / 2), Math.round(top - G.NURSE_GROUND.big * sc + hop), img.width * sc, img.height * sc);
        if (st.place === 0) trophy(g, st.x + st.w - 30, top - 52, 3);
      }
      for (const c of conf) {
        const y = ((c.y + c.v * t) % (H + 10)) - 10, x = Math.round(c.x + Math.sin(t * 2 + c.ph) * 5);
        g.fillStyle = c.c;
        if (Math.sin(t * 6 + c.ph) > 0) g.fillRect(x, Math.round(y), 4, 2); else g.fillRect(x, Math.round(y), 2, 4);
      }
    }
    function loop(now) { if (!cv.isConnected) return; draw((now - t0) / 1000); requestAnimationFrame(loop); }
    draw(0);
    if (!reduce) requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- Level-Editor (nur auf dieser Seite)
  const editorHost = $("#editorHost");
  function editorClosed() { return editorHost.hidden; }
  $("#btnEditor").onclick = () => {
    if (!editorClosed()) return;
    if (room && (room.phase === "final" || (race && !race.done))) return toast("Den Level-Editor gibt es, sobald das Finale vorbei ist.");
    viewEl.hidden = true; editorHost.hidden = false;
    window.JRED.open(editorHost, {
      lib, defaults: DEFAULT_LIB, si: setup.si,
      onSave: (l) => saveLib(l),
      onClose: () => { editorHost.hidden = true; viewEl.hidden = false; screen = ""; render(); },
    });
  };

  // ---------------------------------------------------------------- Sitzung, Ton, Vollbild
  const dlg = $("#dlg");
  $("#btnSess").onclick = () => { $("#dlgCode").textContent = sess.code; dlg.hidden = false; $("#btnDlgClose").focus(); };
  $("#btnDlgClose").onclick = () => { dlg.hidden = true; };
  $("#btnNewSess").onclick = () => { dlg.hidden = true; stopRace(); newSession(); };
  $("#btnWipe").onclick = () => {
    dlg.hidden = true; stopRace();
    if (net) net.send({ t: "wipe" });
    setTimeout(() => { U.store("jr.teacher", null); newSession(); toast("Die Sitzung wurde beendet und alle Daten gelöscht."); }, 400);
  };
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !dlg.hidden) dlg.hidden = true; });
  const btnSound = $("#btnSound");
  function showSound() { btnSound.textContent = A.muted ? "Ton: aus" : "Ton: an"; btnSound.setAttribute("aria-pressed", String(!A.muted)); }
  btnSound.onclick = () => { A.setMuted(!A.muted); showSound(); };
  showSound();
  const btnFull = $("#btnFull");
  if (!document.fullscreenEnabled) btnFull.hidden = true;
  btnFull.onclick = () => {
    try { if (document.fullscreenElement) document.exitFullscreen(); else { const p = document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } } catch (e) { /* nicht erlaubt */ }
  };

  if (sess && /^[A-Z0-9]{5}$/.test(sess.code) && sess.key) connect(); else newSession();
  window.__teacher = { get room() { return room; }, get net() { return net; }, get screen() { return screen; }, get race() { return race; }, get lib() { return lib; } };
})();
