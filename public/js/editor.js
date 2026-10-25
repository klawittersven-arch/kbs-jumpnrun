// Level-Editor für die Lehrkraft (nur auf der Lehrer-Seite eingebunden, nie auf den Seiten der SuS).
// Bearbeitet die Level-Sammlung dieses Browsers. Jede Änderung wird sofort gespeichert und gilt ab dem nächsten
// Qualifying oder Finale. Mit „Exportieren“ und „Importieren“ lassen sich Level an Kolleginnen und Kollegen weitergeben.
(function () {
  "use strict";
  const E = window.JRE, G = window.JRG, P = window.JRP, I = window.JRI, A = window.JRA;
  const T = E.T, VH = E.VH, ROWS = E.ROWS;
  const ZOOMS = [1, 1.5, 2, 3];
  const THEMES = [["meadow", "Wiese"], ["mine", "Stollen"], ["clinic", "Klinik"], ["glacier", "Gletscher"], ["vineyard", "Weinberg"]];
  const TOOLS = [
    { id: "#", label: "Erde" }, { id: "R", label: "Fels" }, { id: "B", label: "Ziegel" },
    // weiche Trennstriche: lange Namen brechen in den schmalen Knöpfen um
    { id: "b", label: "Münz­ziegel" }, { id: "Q", label: "Münz­block" }, { id: "P", label: "Kristall­block" },
    { id: "o", label: "Münze", sep: true }, { id: "s", label: "Speed-Item" }, { id: "x", label: "Schleim" }, { id: "~", label: "Wasser" },
    { id: "walker", label: "Käfer", sep: true }, { id: "snail", label: "Schnecke" },
    { id: "liftUp", label: "Lift hoch", sep: true }, { id: "liftDown", label: "Lift runter" },
    { id: "start", label: "Start", sep: true }, { id: "flag", label: "Fahne" }, { id: "hut", label: "Hütte" },
    { id: "erase", label: "Radierer", sep: true }, { id: "colAdd", label: "Spalte einfügen" }, { id: "colDel", label: "Spalte löschen" },
  ];
  const TILE_NAME = Object.fromEntries(TOOLS.filter((t) => t.id.length === 1).map((t) => [t.id, t.label.replace(/­/g, "")]));
  const isTileTool = (id) => id.length === 1;
  const paints = (id) => isTileTool(id) || id === "erase";
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const HTML = `
    <div class="editor">
      <div class="ed-head">
        <h2 class="ed-title">Level-Editor</h2>
        <div class="ed-actions">
          <button class="ghost-btn" id="edUndo" type="button" title="Strg+Z">Rückgängig</button>
          <button class="ghost-btn" id="edRedo" type="button" title="Strg+Y">Wiederholen</button>
          <button class="ghost-btn" id="edTest" type="button">Testen</button>
          <button class="big-btn" id="edClose" type="button">Zurück zum Klassenmodus</button>
        </div>
      </div>
      <div class="ed-stages" id="edStages" role="radiogroup" aria-label="Level"></div>
      <div class="ed-tools" id="edTools" role="toolbar" aria-label="Werkzeuge"></div>
      <div class="ed-frame">
        <div class="ed-view" id="edView">
          <div class="ed-inner" id="edInner">
            <canvas id="edCanvas" width="256" height="240" aria-label="Level zum Bearbeiten"></canvas>
            <div class="ed-grid" id="edGrid"></div>
            <div class="ed-rect" id="edRect" hidden></div>
            <div class="ed-cursor" id="edCursor" hidden></div>
          </div>
        </div>
        <div class="ed-ov" id="edOv">
          <canvas id="edOverview" width="206" height="15" aria-label="Übersicht. Antippen oder ziehen verschiebt den Ausschnitt."></canvas>
          <div class="ed-ov-view" id="edOvView"></div>
        </div>
      </div>
      <div class="ed-bar">
        <div class="seg-pick" role="radiogroup" aria-label="Form" id="edShape">
          <button type="button" role="radio" data-shape="pen">Stift</button>
          <button type="button" role="radio" data-shape="rect">Rechteck</button>
        </div>
        <div class="ed-zoom">
          <button class="ghost-btn" id="edZoomOut" type="button" aria-label="Verkleinern">−</button>
          <output id="edZoom">2×</output>
          <button class="ghost-btn" id="edZoomIn" type="button" aria-label="Vergrößern">+</button>
        </div>
        <button class="ghost-btn" id="edGridBtn" type="button" aria-pressed="true">Raster</button>
        <p class="ed-info" id="edInfo"></p>
      </div>
      <p class="ed-status" id="edStatus" aria-live="polite"></p>
      <div class="ed-panel">
        <section>
          <h3>Level</h3>
          <label class="field">Name <input id="edName" type="text" maxlength="24" autocomplete="off" spellcheck="false"></label>
          <div class="seg-pick" role="radiogroup" aria-label="Thema" id="edTheme">${THEMES.map(([id, n]) => `<button type="button" role="radio" data-theme="${id}">${n}</button>`).join("")}</div>
          <p class="hint" id="edSize"></p>
          <div class="ed-row">
            <button class="ghost-btn" id="edDup" type="button">Als neues Level kopieren</button>
            <button class="ghost-btn" id="edNew" type="button">Leeres Level</button>
            <button class="ghost-btn" id="edResetStage" type="button">Zurücksetzen</button>
            <button class="ghost-btn danger" id="edDelete" type="button">Löschen</button>
          </div>
        </section>
        <section>
          <h3>Prüfung</h3>
          <ul class="ed-checks" id="edChecks"></ul>
        </section>
        <section>
          <h3>Speichern und teilen</h3>
          <p class="hint">Jede Änderung wird sofort in diesem Browser gespeichert. Sie gilt ab dem nächsten Qualifying oder Finale, ein laufendes ändert sich nicht.</p>
          <div class="ed-row">
            <button class="ghost-btn" id="edExport" type="button">Exportieren</button>
            <button class="ghost-btn" id="edImport" type="button">Importieren</button>
            <input type="file" id="edFile" accept="application/json,.json" hidden>
            <button class="ghost-btn danger" id="edDefaults" type="button">Standard-Level wiederherstellen</button>
          </div>
        </section>
        <section>
          <h3>So geht’s</h3>
          <ul class="ed-help">
            <li>Klicken oder ziehen malt mit dem gewählten Werkzeug. Die rechte Maustaste radiert.</li>
            <li><b>Rechteck</b> füllt eine Fläche: an einer Ecke drücken, zur anderen ziehen, loslassen.</li>
            <li>Gegner setzt du in das Feld, in dem sie loslaufen. Sie laufen zuerst nach links.</li>
            <li>Die Fahnenstange reicht bis auf das angeklickte Feld. Danach geht die Figur allein zur Hütte.</li>
            <li>Eine Lücke im Boden ist ein Abgrund. Wasser ist nur Deko, wer hineinfällt, stürzt ab.</li>
            <li>Das <b>Speed-Item</b> lässt die Figur 10 Sekunden lang rennen: schneller und mit höheren Sprüngen. Setz es an Stellen, die schwer zu erreichen sind.</li>
            <li><b>Schleim</b> setzt du in das Feld direkt über dem Boden. Wer hineintritt, wird sehr langsam, auch noch 2 Sekunden danach. Gut ist Schleim, den man überspringen oder auf einem anderen Weg umgehen kann.</li>
            <li><b>Lifts</b> fahren endlos hoch oder runter. Ein Klick mit dem anderen Lift-Werkzeug dreht die Richtung um.</li>
            <li>Im Klassenmodus wird nur gegangen: ein Sprung reicht etwa 4 Felder hoch und 5 Felder weit. „Testen“ zeigt, ob das Level zu schaffen ist.</li>
            <li><kbd>Strg</kbd>+<kbd>Z</kbd> macht rückgängig, <kbd>Strg</kbd>+<kbd>Y</kbd> stellt wieder her.</li>
          </ul>
        </section>
      </div>
    </div>
    <div class="ed-test" id="edTestBox" hidden>
      <div class="ed-head">
        <h2 class="ed-title" id="edTestTitle">Testlauf</h2>
        <label class="check"><input type="checkbox" id="edRun"> Rennen erlauben (im Klassenmodus aus)</label>
        <div class="ed-actions">
          <button class="ghost-btn" id="edRetry" type="button">Nochmal <kbd>R</kbd></button>
          <button class="big-btn" id="edBack" type="button">Zurück zum Editor <kbd>Esc</kbd></button>
        </div>
      </div>
      <div class="hudbar"><span class="hud-time" id="edTTime">0:00.000</span><span class="hud-info">Gehen ← →, springen Leertaste${""}</span></div>
      <div class="screen"><canvas id="edTCanvas" width="256" height="240" aria-label="Testlauf"></canvas><div class="overlay" id="edTMsg"></div></div>
    </div>`;

  let el = null, ed = null, opts = null, testRace = null;

  function open(host, o) {
    opts = o;
    host.innerHTML = HTML;
    el = {};
    host.querySelectorAll("[id]").forEach((n) => (el[n.id] = n));
    el.host = host;
    ed = {
      draft: clone(o.lib), si: clamp(o.si || 0, 0, o.lib.stages.length - 1), tool: "#", shape: "pen",
      zoom: window.innerWidth < 700 ? 1.5 : 2, grid: true, undo: [], redo: [], stroke: null, drawQueued: false, cols: 0, toolTheme: "",
    };
    bind();
    buildStages();
    buildTools();
    layout();
    draw();
    renderPanel();
    say("");
    window.scrollTo(0, 0);
  }
  const stage = () => ed.draft.stages[ed.si];

  // ---------------------------------------------------------------- Zeichnen
  function badge(g, t, X, Y) {
    if (t !== "b" && t !== "Q" && t !== "P") return;
    g.fillStyle = "#1a1d25"; g.fillRect(X + 9, Y + 9, 6, 6);
    g.fillStyle = t === "P" ? "#bff0ff" : "#f0b43c"; g.fillRect(X + 10, Y + 10, 4, 4);
  }
  function icon(id, theme) {
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    const x = c.getContext("2d");
    const px = (X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
    if (isTileTool(id)) { G.paintTile(x, theme, id, ".", 0, 0, 0, 0, 0); badge(x, id, 0, 0); }
    else if (id === "walker") x.drawImage(G.BUGS[theme].a[-1], 0, 0);
    else if (id === "snail") x.drawImage(G.SNAILS[theme].a[-1], 0, 0);
    else if (id === "liftUp" || id === "liftDown") {
      const up = id === "liftUp";
      G.drawLift(x, 0, up ? 9 : 2, 16);
      x.fillStyle = "#f0b43c";
      for (let k = 0; k < 4; k++) x.fillRect(8 - k, up ? 2 + k : 14 - k, 2 * k + 1, 1);
    } else if (id === "start") x.drawImage(G.portrait(0, false), -4, -2);
    else if (id === "flag") {
      x.fillStyle = "#d9dce3"; x.fillRect(11, 2, 2, 14);
      x.fillStyle = "#f0b43c"; x.fillRect(10, 0, 4, 2);
      x.fillStyle = "#c14a63";
      for (let k = 0; k < 7; k++) { const len = 7 - Math.abs(k - 3) * 2; x.fillRect(11 - len, 3 + k, len, 1); }
    } else if (id === "hut") {
      x.fillStyle = "#5b2d2d";
      for (let k = 0; k < 5; k++) x.fillRect(7 - k - 1, 2 + k, 2 * k + 4, 1);
      x.fillStyle = "#8a5a2b"; x.fillRect(2, 7, 12, 8);
      x.fillStyle = "#3b2414"; x.fillRect(7, 10, 3, 5);
      x.fillStyle = "#f0d080"; x.fillRect(3, 9, 2, 2); x.fillRect(11, 9, 2, 2);
    } else if (id === "erase") {
      for (let k = 0; k < 7; k++) { px(4 + k, 11 - k, "#2b2a33"); px(5 + k, 12 - k, "#f3a3ac"); px(6 + k, 13 - k, "#f3a3ac"); px(7 + k, 14 - k, "#2b2a33"); }
      for (let k = 0; k < 3; k++) { px(5 + k, 12 - k, "#ffffff"); px(6 + k, 13 - k, "#ffffff"); }
      x.fillStyle = "#9ba2b1"; x.fillRect(1, 15, 14, 1);
    } else {
      x.fillStyle = "#9ba2b1"; x.fillRect(2, 1, 1, 14); x.fillRect(13, 1, 1, 14);
      x.fillStyle = "#f0b43c"; x.fillRect(5, 7, 6, 2);
      if (id === "colAdd") x.fillRect(7, 5, 2, 6);
    }
    return c;
  }
  function buildTools() {
    const theme = stage().theme;
    if (ed.toolTheme !== theme) {
      ed.toolTheme = theme;
      el.edTools.textContent = "";
      for (const t of TOOLS) {
        if (t.sep) { const s = document.createElement("span"); s.className = "tool-sep"; el.edTools.appendChild(s); }
        const b = document.createElement("button");
        b.type = "button"; b.className = "tool"; b.dataset.tool = t.id;
        const label = document.createElement("span");
        label.textContent = t.label;
        b.append(icon(t.id, theme), label);
        el.edTools.appendChild(b);
      }
    }
    el.edTools.querySelectorAll("button[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === ed.tool)));
  }
  function buildStages() {
    el.edStages.textContent = "";
    ed.draft.stages.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "radio"); b.dataset.stage = i;
      b.setAttribute("aria-checked", String(i === ed.si));
      b.textContent = i + 1 + " · " + (s.name || "Level " + (i + 1));
      el.edStages.appendChild(b);
    });
  }
  // das ganze Level, ein Pixel pro Pixel; per CSS vergrößert
  function drawStageData(g, d) {
    const W = d.cols * T, bg = G.BG[d.theme] || G.BG.meadow;
    g.drawImage(bg.sky, 0, 0, W, VH);
    for (const [, img] of bg.layers) for (let x = 0; x < W; x += img.width) g.drawImage(img, x, 0);
    G.drawHut(g, d.hut[0] * T, (d.hut[1] + 1) * T, d.theme);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < d.cols; c++) {
        const t = d.rows[r][c];
        if (t === ".") continue;
        if (t === "x") continue;
        G.paintTile(g, d.theme, t, r > 0 ? d.rows[r - 1][c] : ".", c, r, c * T, r * T, 0);
        badge(g, t, c * T, r * T);
      }
    }
    // Schleim nach dem Boden, damit die Tropfen über der Bodenkante liegen
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < d.cols; c++) {
      if (d.rows[r][c] === "x") G.drawSlime(g, c * T, r * T, 0, c, d.rows[r][c - 1] !== "x", d.rows[r][c + 1] !== "x");
    }
    G.drawPole(g, d.flag[0] * T + 7, 2 * T + 2, (d.flag[1] + 1) * T, false, 0);
    for (const L of d.lifts || []) {
      const X = L.c * T, Y = L.r * T, Wd = L.w * T, up = L.dir === "up";
      g.fillStyle = "rgba(240, 180, 60, 0.14)"; g.fillRect(X, 0, Wd, VH);
      G.drawLift(g, X, Y, Wd);
      const ax = X + Wd / 2, ay = up ? Y - 3 : Y + E.LIFT_H + 2;
      g.fillStyle = "#f0b43c";
      for (let k = 0; k < 4; k++) g.fillRect(ax - k, up ? ay - 3 + k : ay + 3 - k, 2 * k + 1, 1);
    }
    for (const e of d.enemies) {
      const walker = e.kind === "walker";
      g.drawImage(walker ? G.BUGS[d.theme].a[-1] : G.SNAILS[d.theme].a[-1], e.c * T, (e.r + 1) * T - (walker ? 15 : 14));
    }
    const hero = G.portrait(0, false);
    g.drawImage(hero, d.start[0] * T + 8 - hero.width / 2, (d.start[1] + 1) * T - G.NURSE_GROUND.small);
  }
  function draw() {
    ed.drawQueued = false;
    if (!el || el.host.hidden) return;
    const d = stage(), cv = el.edCanvas;
    if (cv.width !== d.cols * T) cv.width = d.cols * T;
    const g = cv.getContext("2d");
    g.imageSmoothingEnabled = false;
    drawStageData(g, d);
    if (el.edOverview.width !== d.cols) el.edOverview.width = d.cols;
    el.edOverview.getContext("2d").drawImage(G.miniMap(E.stageView(d)), 0, 0);
    if (ed.cols !== d.cols) { ed.cols = d.cols; layout(); }
  }
  function queueDraw() { if (!ed.drawQueued) { ed.drawQueued = true; requestAnimationFrame(draw); } }
  function layout() {
    const d = stage(), cell = T * ed.zoom;
    el.edCanvas.style.width = d.cols * cell + "px";
    el.edCanvas.style.height = VH * ed.zoom + "px";
    el.edInner.style.setProperty("--cell", cell + "px");
    el.edZoom.textContent = String(ed.zoom).replace(".", ",") + "×";
    el.edZoomOut.disabled = ed.zoom === ZOOMS[0];
    el.edZoomIn.disabled = ed.zoom === ZOOMS[ZOOMS.length - 1];
    el.edGrid.hidden = !ed.grid;
    el.edGridBtn.setAttribute("aria-pressed", String(ed.grid));
    el.edShape.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.shape === ed.shape)));
    overviewView();
  }
  function overviewView() {
    const v = el.edView, total = v.scrollWidth || 1;
    el.edOvView.style.left = (v.scrollLeft / total) * 100 + "%";
    el.edOvView.style.width = Math.min(100, (v.clientWidth / total) * 100) + "%";
  }
  function setZoom(z) {
    const v = el.edView, center = (v.scrollLeft + v.clientWidth / 2) / (T * ed.zoom);
    ed.zoom = z;
    layout();
    v.scrollLeft = center * T * z - v.clientWidth / 2;
    hover(null);
  }
  function say(text, warn) {
    el.edStatus.textContent = text;
    el.edStatus.classList.toggle("warn", !!warn);
  }
  const liftAt = (d, c, r) => (d.lifts || []).find((L) => L.r === r && c >= L.c && c < L.c + L.w);
  function what(d, c, r) {
    const parts = [];
    if (d.start[0] === c && d.start[1] === r) parts.push("Start");
    if (d.flag[0] === c && d.flag[1] === r) parts.push("Fahne");
    if (d.hut[0] === c && d.hut[1] === r) parts.push("Hütte");
    const e = d.enemies.find((n) => n.c === c && n.r === r);
    if (e) parts.push(e.kind === "walker" ? "Käfer" : "Schnecke");
    const L = liftAt(d, c, r);
    if (L) parts.push(L.dir === "up" ? "Lift hoch" : "Lift runter");
    if (d.rows[r][c] !== ".") parts.push(TILE_NAME[d.rows[r][c]]);
    return parts.join(", ") || "leer";
  }
  function hover(at) {
    if (!at) { el.edCursor.hidden = true; el.edInfo.textContent = ""; return; }
    const cell = T * ed.zoom;
    el.edCursor.hidden = false;
    el.edCursor.style.left = at.c * cell + "px";
    el.edCursor.style.top = at.r * cell + "px";
    el.edInfo.textContent = "Spalte " + at.c + " · Zeile " + at.r + " · " + what(stage(), at.c, at.r);
  }
  function showRect(a, b) {
    const cell = T * ed.zoom;
    el.edRect.hidden = false;
    el.edRect.style.left = Math.min(a.c, b.c) * cell + "px";
    el.edRect.style.top = Math.min(a.r, b.r) * cell + "px";
    el.edRect.style.width = (Math.abs(a.c - b.c) + 1) * cell + "px";
    el.edRect.style.height = (Math.abs(a.r - b.r) + 1) * cell + "px";
  }

  // ---------------------------------------------------------------- Ändern
  function setCell(d, c, r, t) { if (d.rows[r][c] !== t) d.rows[r] = d.rows[r].slice(0, c) + t + d.rows[r].slice(c + 1); }
  function dropEnemy(d, c, r) { const i = d.enemies.findIndex((e) => e.c === c && e.r === r); if (i >= 0) d.enemies.splice(i, 1); }
  function paint(tool, c, r) {
    const d = stage();
    if (tool === "erase") {
      dropEnemy(d, c, r);
      const L = liftAt(d, c, r);
      if (L) d.lifts.splice(d.lifts.indexOf(L), 1);
      setCell(d, c, r, ".");
      return;
    }
    setCell(d, c, r, tool);
    if (E.SOLID.has(tool)) dropEnemy(d, c, r);
  }
  function place(tool, c, r) {
    const d = stage(), row = Math.min(r, ROWS - 2);
    if (tool === "walker" || tool === "snail") {
      const e = d.enemies.find((n) => n.c === c && n.r === row);
      if (e) e.kind = tool;
      else if (d.enemies.length >= E.MAX_ENEMIES) say("Mehr als " + E.MAX_ENEMIES + " Gegner passen nicht in ein Level.", true);
      else { d.enemies.push({ kind: tool, c, r: row }); d.enemies.sort((a, b) => a.c - b.c || a.r - b.r); }
    } else if (tool === "start") d.start = [c, row];
    else if (tool === "flag") d.flag = [c, Math.max(2, row)];
    else if (tool === "hut") d.hut = [c, row];
    else if (tool === "colAdd" || tool === "colDel") columns(c, tool === "colAdd" ? 1 : -1);
    else if (tool === "liftUp" || tool === "liftDown") {
      const dir = tool === "liftUp" ? "up" : "down", L = liftAt(d, c, r);
      if (L) L.dir = dir;
      else if ((d.lifts || []).length >= E.MAX_LIFTS) say("Mehr als " + E.MAX_LIFTS + " Lifts passen nicht in ein Level.", true);
      else {
        d.lifts = d.lifts || [];
        d.lifts.push({ c: clamp(c - 1, 0, d.cols - E.LIFT_W), r, w: E.LIFT_W, dir });
        d.lifts.sort((a, b) => a.c - b.c || a.r - b.r);
      }
    }
  }
  // Spalte c verdoppeln oder löschen; alles rechts davon rückt mit
  function columns(c, dir) {
    const d = stage();
    if (dir > 0 && d.cols >= E.MAX_COLS) return say("Mehr als " + E.MAX_COLS + " Spalten gehen nicht.", true);
    if (dir < 0 && d.cols <= E.MIN_COLS) return say("Weniger als " + E.MIN_COLS + " Spalten gehen nicht.", true);
    d.rows = d.rows.map((row) => (dir > 0 ? row.slice(0, c + 1) + row[c] + row.slice(c + 1) : row.slice(0, c) + row.slice(c + 1)));
    d.cols += dir;
    const shift = (x) => (x > c ? x + dir : x);
    if (dir < 0) d.enemies = d.enemies.filter((e) => e.c !== c);
    for (const e of d.enemies) e.c = shift(e.c);
    for (const L of d.lifts || []) L.c = Math.min(shift(L.c), d.cols - L.w);
    for (const k of ["start", "flag", "hut"]) d[k][0] = Math.min(shift(d[k][0]), d.cols - 1);
  }
  function cellsOnLine(a, b) {
    const out = [];
    let x = a.c, y = a.r;
    const dx = Math.abs(b.c - x), dy = -Math.abs(b.r - y), sx = x < b.c ? 1 : -1, sy = y < b.r ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      out.push([x, y]);
      if (x === b.c && y === b.r) return out;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  // Rückgängig hält ganze Sammlungen (wenige kB) mit dem Level, an dem geändert wurde
  function commit(before) {
    ed.undo.push({ si: ed.si, json: before });
    if (ed.undo.length > 200) ed.undo.shift();
    ed.redo = [];
    changed();
  }
  function changed() { save(); queueDraw(); renderPanel(); }
  function step(from, to) {
    if (!from.length || ed.stroke) return;
    const u = from.pop();
    to.push({ si: ed.si, json: JSON.stringify(ed.draft) });
    ed.draft = JSON.parse(u.json);
    ed.si = clamp(u.si, 0, ed.draft.stages.length - 1);
    buildStages(); buildTools(); layout(); changed();
  }
  const undo = () => step(ed.undo, ed.redo);
  const redo = () => step(ed.redo, ed.undo);
  function change(fn) {
    const before = JSON.stringify(ed.draft);
    fn();
    const did = JSON.stringify(ed.draft) !== before;
    if (did) commit(before);
    return did;
  }
  function save() {
    const lib = E.normalizeLibrary(ed.draft);
    if (lib) opts.onSave(lib);
  }

  // ---------------------------------------------------------------- Seitenleiste
  function checks(d) {
    const out = [];
    const solid = (c, r) => r >= 0 && r < ROWS && E.SOLID.has(d.rows[r][c]);
    const [sc, sr] = d.start, fc = d.flag[0], hc = d.hut[0];
    if (solid(sc, sr) || solid(sc, sr - 1)) out.push("Der Start steckt in einem Block.");
    let floor = false;
    for (let r = sr + 1; r < ROWS; r++) if (solid(sc, r)) floor = true;
    if (!floor) out.push("Unter dem Start ist kein Boden, die Figur fällt sofort hinunter.");
    if (fc <= sc) out.push("Die Fahne steht nicht rechts vom Start.");
    if (hc < fc) out.push("Die Hütte steht links der Fahne, das Level endet dann gleich an der Fahne.");
    if (d.cols * T < 427) out.push("Das Level ist schmaler als das Breitbild am Beamer, rechts bleibt dann ein Rand.");
    let floating = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < d.cols; c++) if (d.rows[r][c] === "x" && !solid(c, r + 1)) floating++;
    if (floating) out.push(floating + "× Schleim ohne Boden darunter: Schleim wirkt nur, wenn man darin steht. Setz ihn direkt auf den Boden.");
    return out;
  }
  function renderPanel() {
    const d = stage(), i = ed.si, def = opts.defaults.stages[i];
    el.edStages.querySelectorAll("button").forEach((b, j) => {
      b.textContent = j + 1 + " · " + (ed.draft.stages[j].name || "Level " + (j + 1));
      b.setAttribute("aria-checked", String(j === i));
    });
    if (document.activeElement !== el.edName) el.edName.value = d.name;
    el.edTheme.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.theme === d.theme)));
    el.edSize.textContent = d.cols + " Spalten, " + d.enemies.length + " Gegner. Die Länge änderst du mit „Spalte einfügen“ und „Spalte löschen“ (" + E.MIN_COLS + " bis " + E.MAX_COLS + " Spalten).";
    el.edResetStage.hidden = !def;
    el.edResetStage.disabled = !def || JSON.stringify(E.normalizeStage(d, i)) === JSON.stringify(def);
    el.edDelete.disabled = ed.draft.stages.length <= 1;
    el.edDup.disabled = el.edNew.disabled = ed.draft.stages.length >= E.MAX_STAGES;
    el.edDefaults.disabled = JSON.stringify(E.normalizeLibrary(ed.draft)) === JSON.stringify(opts.defaults);
    const warns = checks(d);
    el.edChecks.textContent = "";
    for (const t of warns.length ? warns : ["Nichts Auffälliges. Ob das Level zu schaffen ist, zeigt dir „Testen“."]) {
      const li = document.createElement("li");
      li.textContent = t;
      if (warns.length) li.className = "warn";
      el.edChecks.appendChild(li);
    }
    el.edUndo.disabled = !ed.undo.length;
    el.edRedo.disabled = !ed.redo.length;
  }
  function selectStage(i) {
    ed.si = clamp(i, 0, ed.draft.stages.length - 1);
    el.edView.scrollLeft = 0;
    hover(null);
    buildStages(); buildTools(); layout(); draw(); renderPanel();
  }
  function blankStage(n) {
    const cols = 120, rows = [];
    for (let r = 0; r < ROWS; r++) rows.push(r >= 13 ? "#".repeat(cols) : ".".repeat(cols));
    return { name: "Neues Level " + n, theme: "meadow", cols, rows, enemies: [], start: [2, 12], flag: [cols - 16, 12], hut: [cols - 10, 12] };
  }

  // ---------------------------------------------------------------- Testlauf
  function startTest() {
    const lib = E.normalizeLibrary(ed.draft);
    if (!lib) return say("Das Level ist fehlerhaft und kann nicht getestet werden.", true);
    el.host.querySelector(".editor").hidden = true;
    el.edTestBox.hidden = false;
    el.edTestTitle.textContent = "Testlauf · " + lib.stages[ed.si].name;
    I.walkOnly = !el.edRun.checked;
    I.enabled = true;
    I.releaseAll();
    runTest(lib);
  }
  function runTest(lib) {
    if (testRace) testRace.stop();
    const view = G.makeView(el.edTCanvas);
    testRace = P.localRace({
      stages: E.buildStages(lib), plan: [ed.si], view, color: 0,
      onTick: (m, rec, st) => {
        el.edTTime.textContent = P.fmt(st.phase === "count" ? 0 : rec.fin != null ? rec.fin : m.frame);
        el.edTMsg.innerHTML = st.phase === "count" ? `<div class="big">${Math.ceil(st.count / 60)}</div>`
          : rec.fin != null ? `<div class="big gold">Geschafft!</div><div class="sub">${P.fmt(rec.fin)}${rec.deaths ? " · " + rec.deaths + "× neu" : ""}</div>`
          : P.speedNews(rec) ? `<div class="big gold">Speed!</div>`
          : rec.down ? `<div class="sub">Nochmal von vorn</div>` : "";
      },
    }).start();
  }
  function endTest() {
    if (testRace) { testRace.stop(); testRace = null; }
    I.enabled = false;
    I.walkOnly = true;
    el.edTestBox.hidden = true;
    el.host.querySelector(".editor").hidden = false;
    draw();
  }

  // ---------------------------------------------------------------- Bedienung
  function bind() {
    const cell = (e) => {
      const r = el.edCanvas.getBoundingClientRect(), d = stage(), size = r.width / d.cols;
      return { c: clamp(Math.floor((e.clientX - r.left) / size), 0, d.cols - 1), r: clamp(Math.floor((e.clientY - r.top) / size), 0, ROWS - 1) };
    };
    el.edCanvas.addEventListener("pointerdown", (e) => {
      if (ed.stroke || (e.button !== 0 && e.button !== 2)) return;
      e.preventDefault();
      try { el.edCanvas.setPointerCapture(e.pointerId); } catch (err) { /* künstlicher Zeiger */ }
      const tool = e.button === 2 ? "erase" : ed.tool, at = cell(e);
      ed.stroke = { id: e.pointerId, tool, from: at, last: at, before: JSON.stringify(ed.draft), rect: paints(tool) && ed.shape === "rect" };
      if (ed.stroke.rect) showRect(at, at);
      else if (paints(tool)) paint(tool, at.c, at.r);
      else place(tool, at.c, at.r);
      hover(at);
      queueDraw();
    });
    el.edCanvas.addEventListener("pointermove", (e) => {
      const at = cell(e), st = ed.stroke;
      hover(at);
      if (!st || st.id !== e.pointerId) return;
      if (st.rect) showRect(st.from, at);
      else if (paints(st.tool) && (at.c !== st.last.c || at.r !== st.last.r)) {
        for (const [c, r] of cellsOnLine(st.last, at)) paint(st.tool, c, r);
        queueDraw();
      }
      st.last = at;
    });
    const endStroke = (e, cancel) => {
      const st = ed.stroke;
      if (!st || st.id !== e.pointerId) return;
      ed.stroke = null;
      el.edRect.hidden = true;
      if (st.rect && !cancel) {
        const a = st.from, b = st.last;
        for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++) paint(st.tool, c, r);
      }
      if (JSON.stringify(ed.draft) !== st.before) commit(st.before);
      else queueDraw();
    };
    el.edCanvas.addEventListener("pointerup", (e) => endStroke(e, false));
    el.edCanvas.addEventListener("pointercancel", (e) => endStroke(e, true));
    el.edCanvas.addEventListener("lostpointercapture", (e) => endStroke(e, false));
    el.edCanvas.addEventListener("pointerleave", () => { if (!ed.stroke) hover(null); });
    el.edCanvas.addEventListener("contextmenu", (e) => e.preventDefault());
    el.edView.addEventListener("scroll", overviewView, { passive: true });
    el.edView.addEventListener("wheel", (e) => {
      if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      el.edView.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      e.preventDefault();
    }, { passive: false });
    let ovDrag = null;
    const ovJump = (e) => {
      const r = el.edOv.getBoundingClientRect(), v = el.edView;
      v.scrollLeft = clamp((e.clientX - r.left) / r.width, 0, 1) * v.scrollWidth - v.clientWidth / 2;
    };
    el.edOv.addEventListener("pointerdown", (e) => { e.preventDefault(); ovDrag = e.pointerId; try { el.edOv.setPointerCapture(e.pointerId); } catch (err) { /* künstlich */ } ovJump(e); });
    el.edOv.addEventListener("pointermove", (e) => { if (ovDrag === e.pointerId) ovJump(e); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((t) => el.edOv.addEventListener(t, (e) => { if (ovDrag === e.pointerId) ovDrag = null; }));

    el.edTools.addEventListener("click", (e) => {
      const b = e.target instanceof Element && e.target.closest("button[data-tool]");
      if (!b) return;
      ed.tool = b.dataset.tool;
      buildTools();
    });
    el.edStages.addEventListener("click", (e) => {
      const b = e.target instanceof Element && e.target.closest("button[data-stage]");
      if (b && +b.dataset.stage !== ed.si) selectStage(+b.dataset.stage);
    });
    el.edShape.addEventListener("click", (e) => {
      const b = e.target instanceof Element && e.target.closest("button[data-shape]");
      if (b) { ed.shape = b.dataset.shape; layout(); }
    });
    el.edTheme.addEventListener("click", (e) => {
      const b = e.target instanceof Element && e.target.closest("button[data-theme]");
      if (!b) return;
      change(() => { stage().theme = b.dataset.theme; });
      buildTools();
    });
    el.edName.addEventListener("input", () => { stage().name = el.edName.value.slice(0, E.NAME_MAX); save(); renderPanel(); });
    el.edName.addEventListener("change", () => { el.edName.value = stage().name = el.edName.value.replace(/\s+/g, " ").trim(); save(); renderPanel(); });
    el.edZoomOut.onclick = () => setZoom(ZOOMS[Math.max(0, ZOOMS.indexOf(ed.zoom) - 1)]);
    el.edZoomIn.onclick = () => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(ed.zoom) + 1)]);
    el.edGridBtn.onclick = () => { ed.grid = !ed.grid; layout(); };
    el.edUndo.onclick = undo;
    el.edRedo.onclick = redo;
    el.edResetStage.onclick = () => {
      const def = opts.defaults.stages[ed.si];
      if (def && change(() => { ed.draft.stages[ed.si] = clone(def); })) { buildTools(); buildStages(); say("Das Level ist wieder im Original. „Rückgängig“ holt deine Fassung zurück."); }
    };
    el.edDup.onclick = () => {
      if (change(() => { const c = clone(stage()); c.name = (c.name + " Kopie").slice(0, E.NAME_MAX); ed.draft.stages.push(c); })) selectStage(ed.draft.stages.length - 1);
    };
    el.edNew.onclick = () => {
      if (change(() => { ed.draft.stages.push(blankStage(ed.draft.stages.length + 1)); })) selectStage(ed.draft.stages.length - 1);
    };
    el.edDelete.onclick = () => {
      if (ed.draft.stages.length <= 1) return;
      const name = stage().name;
      if (change(() => { ed.draft.stages.splice(ed.si, 1); })) { selectStage(Math.min(ed.si, ed.draft.stages.length - 1)); say("„" + name + "“ gelöscht. „Rückgängig“ holt es zurück."); }
    };
    el.edDefaults.onclick = () => {
      if (change(() => { ed.draft = clone(opts.defaults); })) { selectStage(0); say("Die Standard-Level sind wiederhergestellt. „Rückgängig“ holt deine Sammlung zurück."); }
    };
    el.edExport.onclick = () => {
      const lib = E.normalizeLibrary(ed.draft);
      const blob = new Blob([JSON.stringify(lib, null, 1)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "kbs-jumpnrun-level.json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      say("Die Level-Sammlung wurde als Datei gespeichert. Mit „Importieren“ lässt sie sich in einem anderen Browser laden.");
    };
    el.edImport.onclick = () => el.edFile.click();
    el.edFile.onchange = () => {
      const f = el.edFile.files && el.edFile.files[0];
      el.edFile.value = "";
      if (!f) return;
      if (f.size > 2e6) return say("Die Datei ist zu groß für eine Level-Sammlung.", true);
      f.text().then((txt) => {
        let lib = null;
        try { lib = E.normalizeLibrary(JSON.parse(txt)); } catch (e) { lib = null; }
        if (!lib) return say("Die Datei enthält keine gültigen Level.", true);
        change(() => { ed.draft = lib; });
        selectStage(0);
        say(lib.stages.length + (lib.stages.length === 1 ? " Level importiert." : " Level importiert.") + " „Rückgängig“ holt die vorige Sammlung zurück.");
      });
    };
    el.edTest.onclick = startTest;
    el.edBack.onclick = endTest;
    el.edRetry.onclick = () => runTest(E.normalizeLibrary(ed.draft));
    el.edRun.onchange = () => { I.walkOnly = !el.edRun.checked; el.edRun.blur(); };
    el.edClose.onclick = close;
    document.addEventListener("keydown", onKey);
  }
  function onKey(e) {
    if (!el || el.host.hidden) return;
    if (!el.edTestBox.hidden) {
      if (e.code === "Escape") { e.preventDefault(); endTest(); }
      else if (e.code === "KeyR" && !e.repeat && !(e.target instanceof Element && e.target.closest("input"))) { e.preventDefault(); runTest(E.normalizeLibrary(ed.draft)); }
      return;
    }
    if (!(e.ctrlKey || e.metaKey) || e.altKey || (e.target instanceof Element && e.target.closest("input"))) return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
  }
  function close() {
    endTest();
    document.removeEventListener("keydown", onKey);
    save();
    el.host.innerHTML = "";
    el = null;
    opts.onClose();
  }

  window.JRED = { open };
})();
