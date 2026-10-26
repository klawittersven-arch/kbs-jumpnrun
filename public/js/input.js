// Eingabe: Tastatur, Touch (Steuerkreuz und „Springen“) und Gamepad.
// sample() liefert einmal pro Spiel-Frame die Eingabe als Zahl (Bits wie in der Engine).
// Im Klassenmodus wird nur gegangen: Rennen (B) gibt es dann nicht, auch nicht an Tastatur und Gamepad.
(function () {
  "use strict";
  const E = window.JRE;
  const NAMES = ["up", "down", "left", "right", "a", "b"];
  const held = new Map(); // Taste -> Quellen (Tastaturcode, Finger, Gamepad)
  const latched = new Set(); // seit dem letzten Frame gedrückt, so zählt auch ein sehr kurzes Tippen
  let jumpEdge = false, enabled = true, walkOnly = true, onPress = null;
  const count = (n) => (held.get(n) ? held.get(n).size : 0);
  const isDown = (n) => count(n) > 0 || latched.has(n);

  function press(name, src) {
    if (!enabled) return;
    let s = held.get(name);
    if (!s) held.set(name, (s = new Set()));
    if (s.has(src)) return;
    s.add(src);
    if (s.size === 1) {
      latched.add(name);
      if (name === "a") jumpEdge = true;
      mark(name, true);
      if (onPress) onPress(name);
    }
  }
  function release(name, src) {
    const s = held.get(name);
    if (!s || !s.delete(src)) return;
    if (s.size === 0) mark(name, false);
  }
  function releaseAll() {
    for (const [name, s] of held) if (s.size) { s.clear(); mark(name, false); }
    latched.clear();
    jumpEdge = false;
  }
  function mark(name, on) {
    document.querySelectorAll('[data-btn="' + name + '"]').forEach((n) => n.classList.toggle("on", on));
  }

  const KEYMAP = {
    ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
    ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
    KeyX: "a", Space: "a", KeyK: "a",
    KeyZ: "b", KeyY: "b", KeyJ: "b", ShiftLeft: "b", ShiftRight: "b",
  };
  const isTyping = (t) => t instanceof Element && !!t.closest("input, textarea, select, [contenteditable]");
  const isControl = (t) => t instanceof Element && !!t.closest("button, a, input, select, textarea");
  document.addEventListener("keydown", (e) => {
    if (!enabled || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (isControl(e.target) && (e.code === "Enter" || e.code === "Space")) return;
    const name = KEYMAP[e.code];
    if (!name) return;
    e.preventDefault();
    if (!e.repeat) press(name, "k:" + e.code);
  });
  document.addEventListener("keyup", (e) => {
    const name = KEYMAP[e.code];
    if (name) release(name, "k:" + e.code);
  });
  window.addEventListener("blur", releaseAll);

  // Touch: jeder Finger zählt für sich, so kann man zwischen den Richtungen gleiten
  function bindTouch(area, onFinger) {
    const fingers = new Map();
    const set = (id, names) => {
      const prev = fingers.get(id) || new Set();
      for (const n of prev) if (!names.has(n)) release(n, "p" + id);
      for (const n of names) if (!prev.has(n)) press(n, "p" + id);
      fingers.set(id, names);
    };
    const end = (e) => {
      if (!fingers.has(e.pointerId)) return;
      set(e.pointerId, new Set());
      fingers.delete(e.pointerId);
    };
    area.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try { area.setPointerCapture(e.pointerId); } catch (err) { /* künstlicher Zeiger */ }
      set(e.pointerId, onFinger(e, area.getBoundingClientRect()));
    });
    area.addEventListener("pointermove", (e) => {
      if (fingers.has(e.pointerId)) set(e.pointerId, onFinger(e, area.getBoundingClientRect()));
    });
    area.addEventListener("pointerup", end);
    area.addEventListener("pointercancel", end);
    area.addEventListener("lostpointercapture", end);
    area.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  function attachPad(dpad, jump) {
    if (dpad) bindTouch(dpad, (e, r) => {
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const s = new Set();
      if (Math.hypot(dx, dy) < 0.15) return s;
      if (dx > 0.3) s.add("right"); else if (dx < -0.3) s.add("left");
      if (dy > 0.5) s.add("down"); else if (dy < -0.5) s.add("up");
      if (!s.size) s.add(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
      return s;
    });
    if (jump) bindTouch(jump, () => new Set(["a"]));
  }

  // Gamepad (Standardbelegung): untere oder linke Taste rennt, rechte oder obere springt
  let padId = "";
  function pollGamepad() {
    let list = [];
    try { list = navigator.getGamepads ? Array.from(navigator.getGamepads()) : []; } catch (e) { list = []; }
    const gp = list.find((p) => p && p.connected) || null;
    const id = gp ? gp.id : "";
    if (id !== padId) { if (padId) for (const n of NAMES) release(n, "g"); padId = id; }
    if (!gp) return;
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const want = {
      a: b(1) || b(3), b: b(0) || b(2),
      up: b(12) || ay < -0.5, down: b(13) || ay > 0.5, left: b(14) || ax < -0.5, right: b(15) || ax > 0.5,
    };
    for (const n in want) (want[n] ? press : release)(n, "g");
  }

  // Eingabe für den nächsten Spiel-Frame
  function sample() {
    const bits = E.encodeInput({
      left: isDown("left"), right: isDown("right"), a: isDown("a"), b: !walkOnly && isDown("b"), aPressed: jumpEdge,
    });
    jumpEdge = false;
    latched.clear();
    return bits;
  }

  // iPhone/iPad (Safari): schnelles Tippen auf „Springen“ darf nicht ins Bild zoomen. Das CSS (touch-action) verhindert
  // das meist schon; manche Safari-Versionen zoomen trotzdem. Deshalb im Spielbereich zusätzlich:
  //  - zwei Berührungen kurz hintereinander lösen kein Doppeltipp-Zoomen aus (außer auf Knöpfen, die sollen klicken),
  //  - das Zoomen mit zwei Fingern ist gesperrt, solange das Spiel zu sehen ist,
  //  - ist doch gezoomt worden, springt die Ansicht beim nächsten Druck auf die Steuerung auf 100 % zurück.
  function guardZoom(game) {
    const visible = () => !game.hidden;
    let last = 0;
    game.addEventListener("touchend", (e) => {
      const quick = e.timeStamp - last < 450;
      last = e.timeStamp;
      if (quick && !(e.target.closest && e.target.closest("button,a,input,label,select,textarea"))) e.preventDefault();
    }, { passive: false });
    game.addEventListener("dblclick", (e) => e.preventDefault());
    for (const t of ["gesturestart", "gesturechange"]) document.addEventListener(t, (e) => { if (visible()) e.preventDefault(); }, { passive: false });
    game.addEventListener("pointerdown", () => resetZoom());
    if (window.visualViewport) window.visualViewport.addEventListener("resize", () => { if (visible()) resetZoom(); });
  }
  // Zoom zurücksetzen: kurz die größte Vergrößerung auf 1 setzen, danach wieder wie vorher (so lässt Safari den Zoom los)
  let resetting = false;
  function resetZoom() {
    const vv = window.visualViewport, meta = document.querySelector('meta[name="viewport"]');
    if (resetting || !vv || !meta || vv.scale <= 1.02) return;
    resetting = true;
    const orig = meta.getAttribute("content");
    meta.setAttribute("content", orig + ",maximum-scale=1");
    setTimeout(() => { meta.setAttribute("content", orig); resetting = false; }, 350);
  }

  window.JRI = {
    attachPad, guardZoom, sample, releaseAll, pollGamepad, isDown,
    set walkOnly(v) { walkOnly = !!v; },
    get walkOnly() { return walkOnly; },
    set enabled(v) { enabled = !!v; if (!enabled) releaseAll(); },
    get enabled() { return enabled; },
    set onPress(fn) { onPress = fn; },
    get gamepad() { return padId; },
  };
})();
