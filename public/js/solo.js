// Startseite: mit Code mitspielen oder allein ein Level üben (nur gehen, wie im Klassenmodus).
(function () {
  "use strict";
  const E = window.JRE, G = window.JRG, A = window.JRA, I = window.JRI, P = window.JRP, U = window.KUtil;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lib = E.normalizeLibrary(window.JR_LEVELS), stages = E.buildStages(lib);
  const home = $("#home"), game = $("#game"), msg = $("#msg");
  if (matchMedia("(hover: none) and (pointer: coarse)").matches) document.body.classList.add("touch");
  I.walkOnly = true;
  I.enabled = false;
  I.attachPad($("#dpad"), $("#tJump"));
  const view = G.makeView($("#screen"));
  let race = null, si = 0;

  const btnSound = $("#btnSound");
  function showSound() { btnSound.textContent = A.muted ? "Ton: aus" : "Ton: an"; btnSound.setAttribute("aria-pressed", String(!A.muted)); }
  btnSound.onclick = () => { A.setMuted(!A.muted); showSound(); };
  showSound();

  $("#joinForm").onsubmit = (e) => {
    e.preventDefault();
    const v = $("#inCode").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (v.length !== 5) { $("#joinErr").hidden = false; return; }
    location.href = "mitspielen#" + v;
  };

  // Bestzeit je Level, an den Inhalt des Levels gebunden
  const key = (i) => "jr.best." + lib.stages[i].name + "." + JSON.stringify(lib.stages[i]).length;
  function renderLevels() {
    const box = $("#levels");
    box.innerHTML = "";
    lib.stages.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      const cv = document.createElement("canvas");
      cv.width = 427; cv.height = 240;
      const w = E.createSoloWorld(stages, i);
      G.drawWorld(G.makeView(cv), w, { cam: 0, figures: [{ p: w.p, color: 0 }] });
      b.appendChild(cv);
      const best = U.store(key(i));
      const t = document.createElement("span");
      t.innerHTML = `<b>${i + 1} · ${esc(s.name)}</b><small>${best ? "Bestzeit " + P.fmt(best) : "noch keine Zeit"}</small>`;
      b.appendChild(t);
      b.onclick = () => { A.ensure(); play(i); };
      box.appendChild(b);
    });
  }

  function play(i) {
    si = i;
    if (race) race.stop();
    home.hidden = true; game.hidden = false;
    I.enabled = true; I.releaseAll();
    if (document.body.classList.contains("touch")) game.scrollIntoView({ block: "start" });
    let done = null;
    race = P.localRace({
      stages, plan: [i], view, color: 0,
      onFinish: (r) => {
        const best = U.store(key(i));
        done = { frames: r.frames, best, pb: !best || r.frames < best };
        if (done.pb) U.store(key(i), r.frames);
      },
      onTick: (m, rec, st) => {
        $("#hTime").textContent = P.fmt(st.phase === "count" ? 0 : done ? done.frames : m.frame);
        $("#hInfo").innerHTML = `Üben<br><b>${esc(lib.stages[i].name)}</b>`;
        if (st.phase === "count") msg.innerHTML = `<div class="big">${Math.ceil(st.count / 60)}</div>`;
        else if (m.frame < 40) msg.innerHTML = `<div class="big">Los!</div>`;
        else if (done) msg.innerHTML = `<div class="big gold">${done.pb ? "Bestzeit!" : "Ziel!"}</div><div class="sub">${P.fmt(done.frames)}${!done.pb ? " · Bestzeit " + P.fmt(done.best) : ""}</div>`;
        else if (P.speedNews(rec)) msg.innerHTML = `<div class="big gold">Speed!</div>`;
        else if (rec.down) msg.innerHTML = `<div class="sub">Nochmal von vorn, die Uhr läuft weiter</div>`;
        else msg.innerHTML = "";
      },
    }).start();
  }
  function back() {
    if (race) { race.stop(); race = null; }
    I.enabled = false;
    game.hidden = true; home.hidden = false;
    renderLevels();
  }
  $("#btnRetry").onclick = () => play(si);
  $("#btnBack").onclick = back;
  document.addEventListener("keydown", (e) => {
    if (game.hidden || e.target instanceof HTMLInputElement) return;
    if (e.code === "KeyR" && !e.repeat) { e.preventDefault(); play(si); }
    else if (e.code === "Escape") { e.preventDefault(); back(); }
  });
  renderLevels();
})();
