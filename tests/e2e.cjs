// Ende-zu-Ende-Test einer Unterrichtsstunde im Browser: Lehrer-Seite und vier Handys am lokalen Server.
// Braucht Playwright mit Chromium:  node tests/e2e.cjs [Ordner für Bildschirmfotos]
// Startet den lokalen Server selbst (Port 8798) und nutzt kurze Testlevel, damit alles schnell geht.
"use strict";
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const PORT = 8798, BASE = "http://localhost:" + PORT;
const SHOTS = process.argv[2] || null;
let fails = 0, checks = 0;
function ok(cond, name, info) {
  checks++;
  if (cond) console.log("  ✓ " + name);
  else { fails++; console.log("  ✗ " + name + (info !== undefined ? "  → " + JSON.stringify(info) : "")); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// springt immer wieder: „Springen“ 350 ms halten (ein kurzes Tippen ergibt nur einen kleinen Hüpfer)
function jumping(pages) {
  let on = true;
  pages.forEach(async (p, i) => {
    await sleep(i * 170);
    while (on) {
      await p.keyboard.down("Space").catch(() => {});
      await sleep(350);
      await p.keyboard.up("Space").catch(() => {});
      await sleep(450);
    }
  });
  return () => { on = false; };
}
async function until(fn, ms, what) {
  const t0 = Date.now();
  for (;;) {
    let v = null;
    try { v = await fn(); } catch (e) { v = null; }
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error("Zeitüberschreitung: " + what);
    await sleep(150);
  }
}
async function shot(page, name) { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + ".png") }); }

// kurze Testlevel: flacher Weg mit Stufe, Lücke und einem Käfer
function tiny(name, theme) {
  const cols = 72, rows = [];
  for (let r = 0; r < 13; r++) rows.push(".".repeat(cols));
  rows.push("#".repeat(30) + ".." + "#".repeat(cols - 32), "#".repeat(30) + ".." + "#".repeat(cols - 32));
  rows[12] = rows[12].slice(0, 20) + "RR" + rows[12].slice(22);
  rows[9] = rows[9].slice(0, 12) + "BQB" + rows[9].slice(15);
  return { name, theme, cols, rows, enemies: [{ kind: "walker", c: 40, r: 12 }], start: [2, 12], flag: [52, 12], hut: [58, 12] };
}
const LIB = { version: 1, stages: [tiny("Probe", "clinic"), tiny("Eis", "glacier"), tiny("Reben", "vineyard")] };

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, "..", "server", "local.mjs")], { env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: "ignore" });
  await sleep(600);
  const browser = await chromium.launch();
  const errors = [];
  const watch = (page, who) => {
    page.on("pageerror", (e) => errors.push(who + ": " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(who + ": " + m.text()); });
  };
  try {
    console.log("\n== Lehrkraft richtet das Qualifying ein");
    const tctx = await browser.newContext({ viewport: { width: 1500, height: 940 } });
    await tctx.addInitScript((lib) => { try { localStorage.setItem("jr.levels", JSON.stringify(lib)); } catch (e) { /* egal */ } }, LIB);
    const teacher = await tctx.newPage();
    watch(teacher, "Lehrkraft");
    await teacher.goto(BASE + "/lehrer");
    await until(() => teacher.evaluate(() => window.__teacher.room && window.__teacher.room.phase === "setup"), 8000, "Raum");
    ok(await teacher.locator(".lvl").count() === 3, "die Level aus dem Lehrer-Browser stehen zur Wahl");
    await teacher.locator(".stepper button").nth(1).click(); // 2 Runden
    await teacher.click("#btnOpen");
    await until(() => teacher.evaluate(() => window.__teacher.screen === "quali"), 5000, "Qualifying");
    const code = await teacher.evaluate(() => window.__teacher.room.code);
    ok(/^[A-Z0-9]{5}$/.test(code) && await teacher.locator("#qr").isVisible(), "QR-Code und Code " + code + " am Beamer");
    await shot(teacher, "1-beamer-qr");

    console.log("\n== Vier Handys melden sich an und spielen das Qualifying");
    const names = [["Lena", "k"], ["Mehmet", "ö"], ["Zoë", "m"], ["Jonas", "b"]];
    const phones = [];
    for (let i = 0; i < 4; i++) {
      const ctx = await browser.newContext(i === 0 ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 420, height: 860 } });
      const p = await ctx.newPage();
      watch(p, names[i][0]);
      await p.goto(BASE + "/mitspielen#" + code);
      await p.waitForSelector("#inFirst");
      ok(await p.locator("text=Level-Editor").count() === 0 && await p.locator("a[href*=lehrer]").count() === 0, names[i][0] + ": kein Editor und kein Lehrer-Link auf der Handy-Seite");
      await p.fill("#inFirst", names[i][0]);
      await p.fill("#inInit", names[i][1]);
      await p.click("#nameForm button");
      await p.waitForSelector("#btnGo");
      phones.push(p);
    }
    await until(() => teacher.evaluate(() => window.__teacher.room.players.length === 4), 5000, "Anmeldungen");
    ok(true, "vier Namen am Beamer");
    // alle starten; verschieden lange Pausen, damit die Zeiten verschieden sind
    for (let i = 0; i < 4; i++) {
      await phones[i].click("#btnGo");
      await sleep(80);
    }
    await shot(phones[0], "2-handy-countdown");
    await sleep(3000);
    await Promise.all(phones.map(async (p, i) => {
      await sleep(i * 400);
      await p.keyboard.down("ArrowRight");
    }));
    // springen über Stufe, Lücke und Käfer
    const stopJump = jumping(phones);
    await sleep(2500);
    await shot(phones[0], "3-handy-quali");
    await until(() => teacher.evaluate(() => window.__teacher.room.players.filter((p) => p.total != null).length === 4), 60000, "alle im Ziel");
    stopJump();
    for (const p of phones) await p.keyboard.up("ArrowRight");
    const quali = await teacher.evaluate(() => window.__teacher.room.players.map((p) => ({ n: p.name, t: p.total, r: p.rank })));
    ok(quali.every((q) => q.t > 600), "alle Zeiten sind am Beamer angekommen", quali);
    await until(() => phones[3].evaluate(() => window.__student.screen === "result"), 8000, "Ergebnis am Handy");
    ok(await phones[3].locator(".result-time").isVisible(), "das Handy zeigt die eigene Zeit und den Platz");
    await shot(teacher, "4-beamer-zeiten");
    await shot(phones[3], "5-handy-ergebnis");

    console.log("\n== Finale mit vier Spielern im gemeinsamen Level");
    await teacher.click("#btnFinal");
    await until(() => teacher.evaluate(() => window.__teacher.screen === "final-setup"), 5000, "Finale einrichten");
    const fs0 = await teacher.evaluate(() => window.__teacher.room.final);
    ok(fs0.p.length === 4 && fs0.shared === true, "vier Finalisten vorausgewählt, gemeinsames Level an");
    await until(() => teacher.evaluate(() => !document.querySelector("#btnStart").disabled), 5000, "Start bereit");
    await shot(teacher, "6-beamer-finale-einrichten");
    await until(() => phones[1].evaluate(() => window.__student.screen === "invite"), 5000, "Einladung");
    await shot(phones[1], "7-handy-einladung");
    await teacher.click("#btnStart");
    await until(() => teacher.evaluate(() => window.__teacher.race), 5000, "Rennen am Beamer");
    await until(() => phones[0].evaluate(() => window.__student.race && window.__student.race.kind === "final"), 5000, "Rennen am Handy");
    await sleep(6200);
    await Promise.all(phones.map(async (p, i) => { await sleep(i * 300); await p.keyboard.down("ArrowRight"); }));
    const stopJump2 = jumping(phones);
    await sleep(3000);
    await shot(teacher, "8-beamer-finale");
    await shot(phones[2], "9-handy-finale");
    await until(() => teacher.evaluate(() => window.__teacher.room.phase === "podium"), 60000, "Finale entschieden");
    stopJump2();
    const fin = await teacher.evaluate(() => window.__teacher.room.final);
    ok(fin.place.length === 4 && fin.fin.filter((x) => x != null).length >= 3, "drei im Ziel, Platzierung steht fest", fin);
    // Gleichstand der Geräte: jedes Handy hat dieselben Zielzeiten wie der Server gerechnet
    // (der Beamer zeigt das Rennen ein paar Frames hinter der Echtzeit)
    await sleep(800);
    const local = await Promise.all(phones.map((p) => p.evaluate(() => window.__student.race ? window.__student.race.N.match().recs.map((r) => r.fin) : null)));
    const beam = await teacher.evaluate(() => window.__teacher.race ? window.__teacher.race.N.match().recs.map((r) => r.fin) : null);
    const same = (a) => a && fin.fin.every((f, i) => f == null || a[i] === f);
    ok(same(beam), "der Beamer kommt auf dieselben Zielzeiten wie der Server", { beam, server: fin.fin });
    ok(local.filter(Boolean).every(same), "jedes Handy auch", local);
    await until(() => teacher.evaluate(() => window.__teacher.screen === "podium"), 9000, "Siegerehrung");
    await sleep(600);
    ok(await teacher.locator("#podCv").isVisible(), "Siegerehrung mit Treppchen am Beamer");
    await shot(teacher, "10-beamer-siegerehrung");
    await until(() => phones[0].evaluate(() => window.__student.screen === "final-result"), 9000, "Ergebnis am Handy");
    await shot(phones[0], "11-handy-finalergebnis");
    for (const p of phones) await p.keyboard.up("ArrowRight");

    console.log("\n== Zweites Finale: nur zwei, jede im eigenen Level");
    await teacher.click("#btnNewFinal");
    await until(() => teacher.evaluate(() => window.__teacher.screen === "final-setup"), 5000, "Finale einrichten");
    // Zoë und Jonas abwählen, gemeinsames Level aus
    await teacher.locator(".fpick", { hasText: "Jonas" }).click();
    await until(() => teacher.evaluate(() => window.__teacher.room.final.p.length === 3), 4000, "drei gewählt");
    await teacher.locator(".fpick", { hasText: "Zoë" }).click();
    await until(() => teacher.evaluate(() => window.__teacher.room.final.p.length === 2), 4000, "zwei gewählt");
    await teacher.click("#chkShared");
    await until(() => teacher.evaluate(() => window.__teacher.room.final.shared === false), 4000, "eigene Level");
    await until(() => phones[2].evaluate(() => window.__student.screen === "spectator"), 5000, "Zoë schaut zu");
    ok(true, "abgewählte Handys zeigen „Das Finale läuft am Beamer“");
    await until(() => teacher.evaluate(() => !document.querySelector("#btnStart").disabled), 5000, "Start bereit");
    await teacher.click("#btnStart");
    await until(() => phones[1].evaluate(() => window.__student.race && window.__student.race.kind === "final"), 5000, "Rennen am Handy");
    await sleep(6200);
    const two = phones.slice(0, 2);
    await Promise.all(two.map(async (p, i) => { await sleep(i * 500); await p.keyboard.down("ArrowRight"); }));
    let stopJump3 = jumping([phones[0]]);
    await sleep(2500);
    await shot(teacher, "13-beamer-geister");
    await shot(phones[1], "14-handy-geister");
    // Mehmet lädt mitten im Finale die Seite neu: das Handy holt den Stand vom Server und spielt weiter
    await phones[1].reload();
    await until(() => phones[1].evaluate(() => window.__student.race && window.__student.race.kind === "final" && !window.__student.race.waitLogs), 8000, "Handy wieder im Rennen");
    ok(true, "nach dem Neuladen ist das Handy wieder im Finale");
    await phones[1].keyboard.down("ArrowRight");
    const stopB = jumping([phones[1]]);
    const stopA = stopJump3;
    stopJump3 = () => { stopA(); stopB(); };
    await until(() => teacher.evaluate(() => window.__teacher.room.phase === "podium" && window.__teacher.room.final.round === 2), 60000, "zweites Finale entschieden");
    stopJump3();
    for (const p of two) await p.keyboard.up("ArrowRight");
    const fin2 = await teacher.evaluate(() => window.__teacher.room.final);
    // der Beamer zeigt das Rennen ein paar Frames hinter der Echtzeit: kurz warten, bis er so weit ist
    const winner2 = fin2.place[0];
    const beam2 = await until(() => teacher.evaluate((w) => {
      const r = window.__teacher.race;
      const f = r ? r.N.match().recs.map((x) => x.fin) : null;
      return f && f[w] != null ? f : null;
    }, winner2), 3000, "Beamer im Ziel").catch(() => null);
    ok(fin2.place.length === 2 && fin2.fin.filter((x) => x != null).length === 1 && beam2 && beam2[fin2.place[0]] === fin2.fin[fin2.place[0]],
      "mit zwei Spielern entscheidet der erste Zieleinlauf, Beamer und Server stimmen überein", { fin2, beam2 });
    const ph2 = await Promise.all(two.map((p) => p.evaluate((w) => { const r = window.__student.race; return r ? r.N.match().recs[w].fin : null; }, winner2)));
    ok(ph2.every((x) => x === fin2.fin[winner2]), "auch das neu geladene Handy kommt auf dieselbe Zielzeit", ph2);
    await until(() => teacher.evaluate(() => window.__teacher.screen === "podium"), 9000, "zweite Siegerehrung");

    console.log("\n== Level-Editor nur für die Lehrkraft");
    await teacher.click("#btnEditor");
    await teacher.waitForSelector("#edCanvas");
    ok(await teacher.locator(".tool").count() === 18, "Editor mit allen Werkzeugen");
    await teacher.fill("#edName", "Mein Level");
    await teacher.dispatchEvent("#edName", "change");
    const saved = await teacher.evaluate(() => JSON.parse(localStorage.getItem("jr.levels")).stages[0].name);
    ok(saved === "Mein Level", "Änderungen werden im Lehrer-Browser gespeichert");
    await shot(teacher, "12-editor");
    await teacher.click("#edClose");
    ok(await teacher.locator("#editorHost").isHidden(), "zurück im Klassenmodus");
    ok(errors.length === 0, "keine Fehler in den Browser-Konsolen", errors);
  } catch (e) {
    fails++;
    console.log("  ✗ Abbruch: " + e.message);
    if (errors.length) console.log(errors.join("\n"));
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(`\n${checks - fails} von ${checks} Prüfungen bestanden.`);
  process.exit(fails ? 1 : 0);
})();
