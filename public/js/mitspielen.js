// Handy-Seite der SuS: anmelden, Qualifying spielen, Zeit senden, im Finale mitspielen.
// Hier gibt es keinen Level-Editor; den hat nur die Lehrkraft.
(function () {
  "use strict";
  const E = window.JRE, G = window.JRG, A = window.JRA, I = window.JRI, P = window.JRP, U = window.KUtil;
  const $ = (s) => document.querySelector(s);
  const panel = $("#panel"), gameEl = $("#game"), netdot = $("#netdot"), msgEl = $("#msg"), hTime = $("#hTime"), hInfo = $("#hInfo");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' -]{0,15}$/;
  const INIT_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ]$/;
  const COLOR_NAMES = G.COLORS.map((c) => c.name);

  if (matchMedia("(hover: none) and (pointer: coarse)").matches) document.body.classList.add("touch");
  I.walkOnly = true;
  I.attachPad($("#dpad"), $("#tJump"));
  const view = G.makeView($("#screen"));

  let code = decodeURIComponent((location.hash || "").slice(1)).toUpperCase().replace(/[^A-Z0-9]/g, "");
  let pid = U.store("jr.pid");
  if (!pid || !/^[a-z0-9]{8,24}$/.test(pid)) { pid = U.randomId(16); U.store("jr.pid", pid); }

  let net = null, you = null, screen = "", race = null;
  const lv = { quali: null, qlv: 0, final: null, flv: 0, asked: 0 };
  const saved = U.store("jr.name") || {};
  const form = { first: saved.first || "", initial: saved.initial || "", err: "" };
  const resKey = () => "jr.res." + code;

  // ---------------------------------------------------------------- Ton
  const btnSound = $("#btnSound");
  function showSound() { btnSound.textContent = A.muted ? "Ton: aus" : "Ton: an"; btnSound.setAttribute("aria-pressed", String(!A.muted)); }
  btnSound.onclick = () => { A.setMuted(!A.muted); showSound(); };
  showSound();

  // ---------------------------------------------------------------- Verbindung
  function connect() {
    if (net) net.close();
    net = window.KNet({
      code, params: { role: "player", pid },
      onMessage, onStatus: (s) => { netdot.dataset.s = s; if (s === "online" && race && race.kind === "final") race.N.askLogs(); if (s === "offline" && net.stopped) onStopped(net.stopped); },
    });
    net.open();
  }
  function onStopped(why) {
    if (why === "no-room") return showError("Diese Klasse gibt es nicht (mehr).", "Prüfe den Code oder scanne den QR-Code am Beamer noch einmal.", true);
    if (why === "ended") return showError("Die Sitzung ist beendet.", "Danke fürs Mitspielen! Du kannst die Seite jetzt schließen.");
  }
  function onMessage(m) {
    switch (m.t) {
      case "you": you = m; update(); break;
      case "levels":
        if (m.quali) { lv.quali = m.quali; lv.qlv = m.qlv; }
        if (m.final) { lv.final = m.final; lv.flv = m.flv; }
        update();
        break;
      case "result-ok": case "result-old": U.store(resKey(), null); update(); break;
      case "error": onError(m.why); break;
      case "kicked":
        U.store("jr.pid", null); U.store(resKey(), null); pid = U.randomId(16); U.store("jr.pid", pid);
        stopRace(); net.close();
        showError("Du wurdest von der Lehrkraft aus der Liste entfernt.", "Wenn das ein Versehen war, scanne den QR-Code noch einmal.");
        break;
      case "ended": stopRace(); showError("Die Sitzung ist beendet.", "Danke fürs Mitspielen! Du kannst die Seite jetzt schließen."); break;
      case "in": case "need": case "logs":
        if (race && race.kind === "final") {
          if (m.t === "logs" && race.waitLogs) {
            race.N.restoreOwn(m.logs[race.slot] || "");
            race.waitLogs = false;
          }
          race.N.receive(m);
        }
        break;
    }
  }
  function onError(why) {
    if (why === "bad-name") { form.err = "Bitte nur Buchstaben: Vorname und ein Anfangsbuchstabe."; screen = ""; renderName(); }
    else if (why === "not-open") { screen = ""; update(); }
    else if (why === "full") showError("Die Klasse ist voll.", "Es können höchstens 60 Personen mitspielen.");
    else if (why === "no-room" || why === "bad-pid") onStopped("no-room");
  }
  // Level vom Server holen, wenn sich etwas geändert hat (höchstens einmal pro Sekunde fragen)
  function needLevel(which, want) {
    if (which === "quali" ? lv.qlv === want && lv.quali : lv.flv === want && lv.final) return false;
    if (Date.now() - lv.asked > 1000) { lv.asked = Date.now(); net.send({ t: "level?" }, true); }
    return true;
  }

  // ---------------------------------------------------------------- Ablauf
  function update() {
    if (!you) return;
    const f = you.final, me = you.me;
    if (race && race.kind === "quali") return; // ein Lauf wird nicht unterbrochen
    if (race && race.kind === "final") {
      if (!f || f.round !== race.round || you.phase === "final-setup") { stopRace(); }
      else { if (you.phase === "podium" && f.state === "done") race.done = f; return; }
    }
    if (f) {
      if (you.phase === "final" && f.state === "running") {
        if (needLevel("final", f.lv)) return renderLoading();
        return startFinal(f);
      }
      if (you.phase === "final-setup") return renderInvite(f);
      if (you.phase === "podium" && f.state === "done") return renderFinalResult(f);
    }
    if (you.phase === "final-setup" || you.phase === "final" || you.phase === "podium") return renderSpectator();
    if (!me) {
      if (you.phase === "quali") { if (screen !== "name" && screen !== "joining") renderName(); }
      else renderWait();
      return;
    }
    if (me.status === "done") { U.store(resKey(), null); return renderResult(); }
    const res = U.store(resKey());
    if (res && res.frames && you.quali && res.lv === you.quali.lv) {
      net.send({ t: "result", frames: res.frames, splits: res.splits, deaths: res.deaths, lv: res.lv }, true);
      return renderResult(res);
    }
    if (you.phase !== "quali") return renderWait();
    if (needLevel("quali", you.quali.lv)) return renderLoading();
    if (screen !== "ready") renderReady();
  }

  // ---------------------------------------------------------------- Ansichten
  function setPanel(html) { panel.innerHTML = html; panel.hidden = false; gameEl.hidden = true; }
  function figure(color, size) { const c = G.portrait(color || 0, false); const cv = document.createElement("canvas"); cv.width = c.width; cv.height = c.height; cv.getContext("2d").drawImage(c, 0, 0); if (size) cv.style.width = size; return cv; }
  const roundsTxt = (n) => n + " " + (n === 1 ? "Runde" : "Runden");

  function renderCodeEntry(err) {
    screen = "code";
    setPanel(`<form class="card" id="codeForm" novalidate>
      <h2>Mitspielen</h2>
      <p>Scanne den QR-Code am Beamer oder gib den Code ein, der dort steht.</p>
      <div class="field"><label for="inCode">Code</label><input id="inCode" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="5" placeholder="z. B. K7QXM"></div>
      ${err ? `<p class="err">${esc(err)}</p>` : ""}
      <button class="big-btn" type="submit">Weiter</button></form>`);
    $("#codeForm").onsubmit = (e) => {
      e.preventDefault();
      const v = $("#inCode").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (v.length !== 5) return renderCodeEntry("Der Code hat genau 5 Zeichen.");
      code = v; history.replaceState(null, "", "#" + code); connect(); renderConnecting();
    };
  }
  function renderConnecting() { screen = "connecting"; setPanel(`<div class="card"><h2>Verbinde …</h2><p>Einen Moment, die Klasse wird gesucht.</p></div>`); }
  function renderLoading() { if (screen === "loading") return; screen = "loading"; setPanel(`<div class="card"><h2>Lade das Level …</h2><div class="pulse" aria-hidden="true"></div></div>`); }
  function renderWait() {
    if (screen === "wait") return;
    screen = "wait";
    setPanel(`<div class="card"><h2>Gleich geht's los</h2><p>Deine Lehrkraft richtet das Qualifying gerade ein. Lass diese Seite offen, sie aktualisiert sich von selbst.</p><div class="pulse" aria-hidden="true"></div></div>`);
  }
  function showError(title, text, retry) {
    screen = "error";
    setPanel(`<div class="card"><h2>${esc(title)}</h2><p>${esc(text)}</p>${retry ? '<button class="ghost-btn" id="btnCode">Code eingeben</button>' : ""}</div>`);
    if (retry) $("#btnCode").onclick = () => renderCodeEntry();
  }
  function preview() {
    const a = form.first.trim(), b = form.initial.trim();
    if (!a) return "Lena K.";
    return a.charAt(0).toLocaleUpperCase("de-DE") + a.slice(1) + " " + (b ? b.toLocaleUpperCase("de-DE") + "." : "");
  }
  function renderName() {
    screen = "name";
    const q = you.quali;
    setPanel(`<form class="card" id="nameForm" novalidate>
      <h2>Qualifying</h2>
      <p><strong>${esc(q.name)}</strong> · ${roundsTxt(q.rounds)}. Du spielst allein gegen die Uhr, deine Zeit erscheint am Beamer. Du hast einen Versuch.</p>
      <div class="row">
        <div class="field grow"><label for="inFirst">Vorname</label><input id="inFirst" autocomplete="given-name" maxlength="16" value="${esc(form.first)}" required></div>
        <div class="field initial"><label for="inInit">Nachname</label><input id="inInit" maxlength="1" autocapitalize="characters" autocomplete="off" value="${esc(form.initial)}" placeholder="K" required></div>
      </div>
      <p class="hint">Vom Nachnamen nur den ersten Buchstaben. Am Beamer steht dann: <strong class="preview-name" id="pv">${esc(preview())}</strong></p>
      ${form.err ? `<p class="err">${esc(form.err)}</p>` : ""}
      <button class="big-btn" type="submit">Anmelden</button></form>`);
    const f = $("#inFirst"), i = $("#inInit");
    const upd = () => { form.first = f.value; form.initial = i.value; $("#pv").textContent = preview(); };
    f.oninput = upd; i.oninput = upd;
    $("#nameForm").onsubmit = (e) => {
      e.preventDefault(); upd();
      if (!NAME_RE.test(form.first.trim())) { form.err = "Bitte gib deinen Vornamen ein (nur Buchstaben)."; return renderName(); }
      if (!INIT_RE.test(form.initial.trim())) { form.err = "Bitte gib den ersten Buchstaben deines Nachnamens ein."; return renderName(); }
      form.err = "";
      A.ensure();
      screen = "joining";
      $("#nameForm button").disabled = true; $("#nameForm button").textContent = "Melde an …";
      U.store("jr.name", { first: form.first.trim(), initial: form.initial.trim() });
      net.send({ t: "join", first: form.first.trim(), initial: form.initial.trim() }, true);
    };
    if (!form.first) setTimeout(() => f.focus(), 50);
  }
  function renderReady() {
    screen = "ready";
    const q = you.quali, touch = document.body.classList.contains("touch");
    setPanel(`<div class="card">
      <p class="eyebrow">Qualifying · ${esc(q.name)} · ${roundsTxt(q.rounds)}</p>
      <h2>Bereit, ${esc(you.me.name)}?</h2>
      <p>${q.rounds > 1 ? `Du läufst das Level ${q.rounds}-mal hintereinander. ` : ""}Die Uhr startet nach dem Countdown und stoppt an der letzten Fahne. Wer erwischt wird oder abstürzt, beginnt das Level von vorn, die Uhr läuft weiter.</p>
      <p class="hint">${touch ? "Gehen mit dem Steuerkreuz, springen mit „Springen“. Länger drücken springt höher." : "Gehen mit ← und →, springen mit der Leertaste. Länger drücken springt höher."}</p>
      <button class="big-btn" id="btnGo">Start</button></div>`);
    $("#btnGo").onclick = () => { A.ensure(); startQuali(); };
  }
  function renderResult(local) {
    screen = "result";
    const me = you && you.me, frames = me && me.total != null ? me.total : local && local.frames;
    const sent = me && me.status === "done";
    const splits = local && local.splits;
    setPanel(`<div class="card result">
      <h2>Ziel!</h2>
      <div class="result-time">${P.fmt(frames)}</div>
      ${splits && splits.length ? `<ol class="laplist">${splits.map((t, i) => `<li><span>Runde ${i + 1}</span><span>${P.fmt(t)}</span></li>`).join("")}<li><span>Ziel</span><span>${P.fmt(frames)}</span></li></ol>` : ""}
      <p class="sendstate ${sent ? "ok" : ""}">${sent ? `Deine Zeit ist am Beamer angekommen.${me.rank ? ` Du bist gerade auf <strong>Platz ${me.rank}</strong> von ${me.of}.` : ""}` : "Deine Zeit wird gesendet …"}</p>
      <p>Lass die Seite offen. Die Schnellsten spielen gleich das Finale.</p></div>`);
  }
  function others(f) {
    return f.names.map((n, i) => `<li><span class="dot c${i}"></span> <span class="cname c${i}">${esc(n)}</span>${i === f.slot ? " (du)" : ""}</li>`).join("");
  }
  function renderInvite(f) {
    screen = "invite";
    setPanel(`<div class="card">
      <p class="eyebrow">Finale · ${esc(f.stageNames.join(" + "))}</p>
      <h2>Du bist im Finale!</h2>
      <div class="me-fig" id="meFig"></div>
      <p>Deine Farbe: <strong class="cname c${f.slot}">${esc(COLOR_NAMES[f.slot])}</strong>. ${f.stageNames.length > 1 ? "Gespielt werden zwei Level hintereinander, wer zuerst an der letzten Fahne ist, gewinnt." : "Gespielt wird ein Level, wer zuerst an der Fahne ist, gewinnt."}
      Nach 5 Minuten ist Schluss, dann gewinnt, wer vorne liegt.
      ${f.shared ? "Alle laufen im selben Level: Münzen, Blöcke und Gegner gelten für alle, aber niemand kann dich blockieren." : "Jede und jeder läuft im eigenen Level, die anderen siehst du als Geister."}</p>
      <ul class="flist">${others(f)}</ul>
      <p class="hint">Das Finale startet, sobald deine Lehrkraft am Beamer auf „Finale starten“ drückt. Lass die Seite offen.</p></div>`);
    $("#meFig").appendChild(figure(f.slot, "72px"));
  }
  function renderSpectator() {
    if (screen === "spectator") return;
    screen = "spectator";
    const me = you && you.me;
    setPanel(`<div class="card">
      <h2>Das Finale läuft am Beamer</h2>
      <p>${me && me.total != null ? `Deine Qualifying-Zeit: <strong>${P.fmt(me.total)}</strong>${me.rank ? ` · Platz ${me.rank} von ${me.of}` : ""}. ` : ""}Schau nach vorn und feuere die Finalisten an!</p>
      ${you.winner ? `<p>Gewonnen hat <strong>${esc(you.winner)}</strong>.</p>` : ""}</div>`);
  }
  function renderFinalResult(f) {
    stopRace();
    screen = "final-result";
    const place = f.place.indexOf(f.slot) + 1, win = place === 1;
    setPanel(`<div class="card result">
      ${f.timeUp ? '<p class="eyebrow">Zeit um: nach 5 Minuten gewinnt, wer vorne liegt</p>' : ""}
      <h2>${win ? "Gewonnen!" : place ? "Platz " + place : "Finale beendet"}</h2>
      <div class="me-fig" id="meFig"></div>
      <p>${f.fin[f.slot] != null ? `Deine Zeit: <strong>${P.fmt(f.fin[f.slot])}</strong>` : "Du warst noch nicht an der letzten Fahne."}</p>
      ${!win && f.place.length ? `<p>Gewonnen hat <strong class="cname c${f.place[0]}">${esc(f.names[f.place[0]])}</strong>${f.fin[f.place[0]] != null ? " in " + P.fmt(f.fin[f.place[0]]) : ""}.</p>` : ""}
      <p>Die Siegerehrung siehst du am Beamer.</p></div>`);
    $("#meFig").appendChild(figure(f.slot, "84px"));
  }

  // ---------------------------------------------------------------- Spielen
  let wakeLock = null;
  function keepAwake(on) {
    try {
      if (on && !wakeLock && navigator.wakeLock) navigator.wakeLock.request("screen").then((l) => { wakeLock = l; }).catch(() => {});
      if (!on && wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    } catch (e) { /* ohne Wake Lock geht es auch */ }
  }
  function showGame() {
    panel.hidden = true; gameEl.hidden = false;
    I.releaseAll(); I.enabled = true;
    keepAwake(true);
    if (document.body.classList.contains("touch")) gameEl.scrollIntoView({ block: "start" });
  }
  function stopRace() {
    if (!race) return;
    race.stop();
    race = null;
    I.enabled = false;
    msgEl.innerHTML = "";
    keepAwake(false);
  }
  function say(big, sub, gold) {
    msgEl.innerHTML = (big ? `<div class="big ${gold ? "gold" : ""}">${esc(big)}</div>` : "") + (sub ? `<div class="sub">${esc(sub)}</div>` : "");
  }

  function startQuali() {
    const q = you.quali, stage = E.stageView(E.normalizeStage(lv.quali, 0));
    const plan = Array(q.rounds).fill(0), qlvNow = q.lv;
    showGame();
    screen = "playing";
    let result = null, endT = 0;
    const R = P.localRace({
      stages: [stage], plan, view, color: 0,
      onFinish: (r) => {
        result = { frames: r.frames, splits: r.splits.filter((x) => x != null), deaths: r.deaths, lv: qlvNow };
        U.store(resKey(), result);
        net.send({ t: "result", frames: result.frames, splits: result.splits, deaths: result.deaths, lv: result.lv }, true);
      },
      onTick: (m, rec, st) => {
        hTime.textContent = P.fmt(st.phase === "count" ? 0 : result ? result.frames : m.frame);
        hInfo.innerHTML = `${esc(q.name)}<br><b>Runde ${Math.min(rec.k + 1, plan.length)}/${plan.length}</b>`;
        if (st.phase === "count") say(String(Math.ceil(st.count / 60)), "Gleich geht's los");
        else if (m.frame < 40) say("Los!", "");
        else if (result) say("Ziel!", P.fmt(result.frames), true);
        else if (P.speedNews(rec)) say("Speed!", "", true);
        else if (rec.down) say("", "Nochmal von vorn, die Uhr läuft weiter");
        else msgEl.innerHTML = "";
        if (st.phase === "over" && !endT) endT = performance.now();
        if (endT && performance.now() - endT > 1200) { stopRace(); renderResult(result); update(); }
      },
    });
    race = { kind: "quali", stop: () => R.stop() };
    R.start();
  }

  function startFinal(f) {
    const stages = lv.final.map((d, i) => E.stageView(E.normalizeStage(d, i)));
    const slot = f.slot, n = f.names.length, tags = f.names.map(G.initials), plan = stages.map((_, i) => i);
    showGame();
    screen = "playing";
    const N = P.netRace({
      stages, plan, n, shared: f.shared, local: slot, startAt: f.startAt, now: () => net.serverNow(),
      send: (o) => net.send(o), view,
      onEvents: (ev, m) => {
        const rec = m.recs[slot], w = E.worldFor(m, rec);
        for (const e of ev) {
          if (e.w !== rec.wk) continue;
          if (e.s === slot || e.s === undefined) A.eventSound(e);
          if (w) G.eventFx(view, w, e);
        }
      },
    });
    const late = N.frameNow() > 30;
    race = { kind: "final", N, slot, round: f.round, waitLogs: late, done: null, raf: 0, finishedAt: 0 };
    if (late) N.askLogs();
    let lastCount = 99, lastLimit = 0;
    const look = { colorOf: (s) => s, tagOf: (s) => tags[s] };
    function loop() {
      if (!race || race.N !== N) return;
      race.raf = requestAnimationFrame(loop);
      I.pollGamepad();
      const fnow = N.frameNow();
      if (!race.waitLogs) N.pump();
      const m = N.match(), rec = m.recs[slot];
      view.tick++;
      G.stepParticles(view);
      P.drawRec(view, m, rec, look);
      hTime.textContent = P.fmt(rec.fin != null ? rec.fin : Math.max(0, m.frame));
      hInfo.innerHTML = `Finale<br><b>${plan.length > 1 ? "Etappe " + (rec.k + 1) + "/" + plan.length : esc(f.stageNames[0])}</b>`;
      const limit = P.finalCountdown(m.frame);
      if (limit !== lastLimit) { lastLimit = limit; if (limit > 0) A.SFX.count(); else if (limit < 0) A.SFX.fanfare(); }
      if (race.waitLogs) say("", "Verbinde …");
      else if (limit < 0) {
        const lead = P.standings(m)[0];
        say("Zeit um!", lead.slot === slot ? "Du liegst vorne!" : f.names[lead.slot] + " liegt vorne", true);
      }
      else if (fnow < 0) {
        const c = Math.ceil(-fnow / 60);
        if (c !== lastCount && c <= 3) { lastCount = c; A.SFX.count(); }
        say(c <= 3 ? String(c) : "", c <= 3 ? "Finale" : "Gleich geht's los");
      } else if (fnow < 50) { if (lastCount !== 0) { lastCount = 0; A.SFX.start(); } say("Los!", ""); }
      else if (rec.fin != null) {
        if (!race.finishedAt) { race.finishedAt = performance.now(); A.SFX.finish(); }
        say("Ziel!", P.fmt(rec.fin), true);
      } else if (limit > 0) say(String(limit), "Noch " + limit + (limit === 1 ? " Sekunde" : " Sekunden"));
      else if (P.speedNews(rec)) say("Speed!", "", true);
      else if (rec.down) say("", "Nochmal von vorn");
      else msgEl.innerHTML = "";
      // nach dem Ende kurz das Bild stehen lassen, dann das Ergebnis
      const done = race.done;
      if (done && net.serverNow() - done.doneAt > 3500) { const d = done; stopRace(); renderFinalResult(d); }
    }
    race.stop = () => { cancelAnimationFrame(race.raf); N.flush(true); };
    race.raf = requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- Start
  addEventListener("hashchange", () => {
    const c = decodeURIComponent((location.hash || "").slice(1)).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c.length === 5 && c !== code) { code = c; stopRace(); you = null; connect(); renderConnecting(); }
  });
  if (code.length === 5) { connect(); renderConnecting(); }
  else renderCodeEntry();
  I.enabled = false;

  window.__student = { get you() { return you; }, get net() { return net; }, get screen() { return screen; }, get race() { return race; } };
})();
