// Töne von „KBS Jump-'n'-Run!“: kurze Synthesizer-Klänge, keine Musik, keine Audiodateien.
(function () {
  "use strict";
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem("jr-muted") === "1"; } catch (e) { /* ohne Speicher: Ton an */ }

  // Browser erlauben Ton erst nach einer Berührung oder einem Tastendruck
  function ensure() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; }
  }
  ["pointerdown", "pointerup", "touchend", "keydown"].forEach((ev) =>
    document.addEventListener(ev, ensure, { capture: true, passive: true }));

  function tone(f0, f1, dur, type, vol, delay = 0) {
    if (!ctx || muted || ctx.state !== "running") return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  const SFX = {
    jump: () => tone(330, 640, 0.12, "square", 0.05),
    jumpBig: () => tone(220, 470, 0.15, "square", 0.05),
    stomp: () => tone(260, 90, 0.1, "square", 0.07),
    kick: () => tone(180, 120, 0.06, "square", 0.07),
    smack: () => tone(420, 120, 0.14, "square", 0.06),
    bump: () => tone(110, 80, 0.07, "triangle", 0.09),
    thud: () => tone(90, 70, 0.05, "triangle", 0.07),
    break: () => { tone(160, 60, 0.18, "square", 0.06); tone(300, 90, 0.12, "triangle", 0.05); },
    coin: () => { tone(988, 988, 0.05, "square", 0.04); tone(1319, 1319, 0.16, "square", 0.04, 0.05); },
    sprout: () => tone(260, 780, 0.3, "triangle", 0.07),
    grow: () => [392, 494, 587, 784].forEach((f, i) => tone(f, f, 0.08, "square", 0.04, i * 0.07)),
    shrink: () => [784, 587, 494, 392].forEach((f, i) => tone(f, f, 0.08, "square", 0.04, i * 0.07)),
    die: () => tone(520, 120, 0.6, "square", 0.06),
    flag: () => tone(880, 330, 0.5, "triangle", 0.06),
    finish: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.12, "square", 0.05, i * 0.09)),
    split: () => [659, 988].forEach((f, i) => tone(f, f, 0.08, "square", 0.04, i * 0.08)),
    go: () => tone(660, 660, 0.06, "square", 0.04),
    count: () => tone(440, 440, 0.12, "square", 0.05),
    start: () => tone(880, 880, 0.3, "square", 0.05),
    speed: () => [523, 784, 1046, 1568].forEach((f, i) => tone(f, f * 1.06, 0.07, "square", 0.05, i * 0.045)),
    speedEnd: () => tone(700, 300, 0.25, "triangle", 0.05),
    slime: () => { tone(200, 70, 0.22, "square", 0.05); tone(120, 60, 0.3, "triangle", 0.08, 0.04); },
    fanfare: () => [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, f, i === 5 ? 0.5 : 0.14, "square", 0.05, i * 0.15)),
  };

  // Ereignisse der Engine, die einen Ton haben
  const EVENT_SFX = {
    jump: "jump", jumpBig: "jumpBig", kick: "kick", bump: "bump", thud: "thud", sprout: "sprout", grow: "grow", shrink: "shrink",
    stomp: "stomp", smack: "smack", shellWall: "thud", coin: "coin", bonus: "coin", break: "break", flag: "flag", die: "die",
    speed: "speed", speedEnd: "speedEnd", slime: "slime",
  };
  function eventSound(e) { const k = EVENT_SFX[e.t]; if (k) SFX[k](); }

  window.JRA = {
    SFX, eventSound, ensure,
    get muted() { return muted; },
    setMuted(v) {
      muted = !!v;
      try { localStorage.setItem("jr-muted", muted ? "1" : "0"); } catch (e) { /* egal */ }
    },
  };
})();
