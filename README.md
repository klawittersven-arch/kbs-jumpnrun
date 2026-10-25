# KBS Jump-’n’-Run!

Das Jump’n’Run der Karoline-Breitinger-Schule mit Klassenmodus. Es läuft im Browser, auf dem Laptop wie auf dem Handy, ohne Installation und ohne Konten.

| Seite | Adresse | Für wen |
|---|---|---|
| Startseite | `/` | alle: mit Code mitspielen oder allein üben |
| Klassenmodus | `/lehrer` | Lehrkraft am Laptop mit Beamer, mit Level-Editor |
| Mitspielen | `/mitspielen` | SuS, wird über den QR-Code geöffnet |

Den Level-Editor gibt es nur auf der Lehrer-Seite. Die Seiten, die die SuS über den QR-Code öffnen, enthalten weder den Editor noch einen Link dorthin.

Figuren, Level und Grafik sind eigene Werke (© 2026 Sven Klawitter). Die Sprungphysik folgt den Bewegungswerten des NES-Klassikers. Das Spiel enthält keine Grafiken, Level oder Töne aus Nintendo-Spielen.

---

## Einmalige Einrichtung bei Cloudflare (etwa 10 Minuten)

Voraussetzung: ein kostenloses Cloudflare-Konto und dieses Repository bei GitHub.

1. Bei Cloudflare anmelden: <https://dash.cloudflare.com>
2. Links im Menü **Workers & Pages** öffnen. Je nach Ansicht steht der Punkt unter **Compute (Workers)**.
3. **Create application** (Anwendung erstellen) wählen, dann **GitHub** bzw. **Import a repository**.
4. Wenn Cloudflare nach GitHub fragt: verbinden und der Cloudflare-App den Zugriff auf das Repository `kbs-jumpnrun` erlauben.
5. Das Repository **kbs-jumpnrun** auswählen.
6. Einstellungen prüfen:
   - **Project name / Worker name:** `kbs-jumpnrun` (muss genau so heißen, sonst schlägt der Build fehl)
   - **Build command:** leer lassen
   - **Deploy command:** `npx wrangler deploy` (ist voreingestellt)
   - **Root directory:** leer lassen
7. **Save and Deploy** (bzw. **Deploy**) klicken. Nach ein bis zwei Minuten ist das Spiel online.
8. Die Adresse steht danach in der Übersicht des Workers, etwa `https://kbs-jumpnrun.<deine-subdomain>.workers.dev`.
   Den Klassenmodus erreichst du unter **`https://kbs-jumpnrun.<deine-subdomain>.workers.dev/lehrer`**. Speichere ihn als Lesezeichen.

**Updates:** Jede Änderung, die im Hauptzweig dieses GitHub-Repositorys landet, veröffentlicht Cloudflare automatisch.

---

## Ablauf im Unterricht

1. **Lehrer-Link am Laptop öffnen**, Beamer und Lautsprecher an. Oben rechts steht der Code der Sitzung.
2. **Qualifying einrichten:** ein Level wählen und die Rundenzahl (1 bis 5, Standard 1). Bei mehr Runden muss das Level mehrmals hintereinander geschafft werden. Dann **Qualifying starten und QR-Code zeigen**.
3. **Die SuS scannen den QR-Code**, geben Vornamen und den ersten Buchstaben des Nachnamens ein (z. B. „Lena K.“) und tippen auf **Start**. Nach einem Countdown läuft das Level auf dem Handy.
   - Im Klassenmodus wird **nur gegangen**, auch am Laptop. Gesteuert wird mit dem Steuerkreuz und „Springen“; länger drücken springt höher.
   - Jede und jeder hat **einen Versuch**. Leben gibt es unbegrenzt: Wer erwischt wird oder abstürzt, beginnt das Level von vorn, die Uhr läuft weiter.
   - Während des Laufs geht nichts übers Netz. Im Ziel wird die Zeit einmal gesendet.
4. **Die Zeiten erscheinen live am Beamer**, sortiert nach Zeit. Unpassende Namen entfernst du mit dem **×**. **Qualifying neu starten** beginnt von vorn mit denselben Einstellungen und demselben QR-Code.
5. **Finale einrichten**, sobald mindestens zwei im Ziel sind: Die vier Schnellsten sind vorausgewählt. Tippe Namen an, um sie hinzuzufügen oder zu entfernen (2 bis 4). Wähle die zwei Level des Finales und ob alle im **gemeinsamen Level** laufen (siehe unten). Sobald alle Handys als verbunden angezeigt werden: **Finale starten**.
6. **Finale:** Nach einem Countdown spielen alle gleichzeitig, jede und jeder auf dem eigenen Handy, in der eigenen Farbe (Weiß, Blau, OP-Grün, Rosa). Wer zuerst an der Fahne des zweiten Levels ist, gewinnt.
   - Der Beamer zeigt **ein großes Breitbild**, die Kamera folgt der Spitze. Über den Figuren stehen die Initialen.
   - Oben zeigt eine **Fortschrittsleiste** für alle, wie weit sie sind. Wer gerade nicht im Bild ist, bekommt einen Pfeil am Rand.
   - Das Finale endet, wenn höchstens noch einer läuft oder drei im Ziel sind. Mit **Finale jetzt beenden** gewinnt, wer gerade vorne liegt.
7. **Siegerehrung** am Beamer: Treppchen mit den Plätzen 1 bis 3, Pokal und Namen. Danach **Revanche**, **Anderes Finale** oder **Zurück zum Qualifying**.

### Gemeinsames Level oder eigene Level

- **Gemeinsames Level** (Standard): Alle laufen durch dasselbe Level. Niemand kann jemanden blockieren, aber Münzen, zerbrochene Ziegel und Gegner gelten für alle. Damit es fair bleibt: Ziegel wachsen nach 4 Sekunden nach, getretene Panzer treffen nur Gegner und nie Mitspieler, Kristalle bekommt, wer zuerst da ist.
- **Eigene Level** (Haken aus): Jede und jeder läuft im eigenen Level. Die anderen sind als halb durchsichtige Geister zu sehen.

### Level-Editor

Den Editor öffnest du auf der Lehrer-Seite oben mit **Level-Editor**. Du kannst die Standard-Level ändern, kopieren und neue Level bauen (bis zu 12). Jede Änderung wird sofort im Browser der Lehrkraft gespeichert und gilt ab dem nächsten Qualifying oder Finale. **Testen** spielt das Level gleich am Laptop, so wie die SuS es im Klassenmodus spielen. Mit **Exportieren** und **Importieren** gibst du Level an Kolleginnen und Kollegen weiter.

Mitgeliefert sind fünf Level: **Auftakt** (Wiese), **Stollen** (Bergwerk), **Nachtschicht** (Klinikflur bei Nacht), **Gletscherpfad** (Eis und Schnee) und **Weinberg** (Kochertal). Alle sind auch nur gehend zu schaffen.

### Speed-Item und Schleim

- **Speed-Item** (goldener Blitz): Wer ihn einsammelt, rennt 10 Sekunden lang, schneller und mit höheren Sprüngen. Auf dem Handy erscheint groß „Speed!“, die Figur flackert golden und zieht Nachbilder hinter sich her. Ein Balken unter den Münzen zeigt, wie lange es noch wirkt. In jedem Level liegt ein Blitz an einer Stelle, die schwer zu erreichen ist (zum Beispiel oben auf der Eisdecke oder per Lift über der Stollendecke).
- **Schleim** (lila Pfütze am Boden): Wer hineintritt, klebt fest und wird sehr langsam, auch noch 2 Sekunden nach dem Verlassen. Springen geht normal. Jedes Level hat zwei Schleimstellen, die man überspringen oder auf einem anderen Weg umgehen kann (zum Beispiel oben über das Medikamentenregal).
- Im gemeinsamen Level gehört der Blitz dem, der zuerst da ist. Den Schleim gibt es für alle.
- Die **Fahnenstange** zählt in jeder Höhe: Auch wer von einer hohen Treppe oder mit Speed über ihre Spitze springt, greift die Fahne. Am rechten Levelrand steht eine Wand, niemand fällt aus dem Level.

**Tipps**
- Die Handys **quer** halten: Dann liegt das Steuerkreuz links und „Springen“ rechts vom Bild.
- **Mehrere Klassen gleichzeitig:** Jede Lehrkraft öffnet einfach `/lehrer` und bekommt einen eigenen Code. Die Räume sind voneinander getrennt.
- Wer die Seite versehentlich schließt, scannt den QR-Code noch einmal. Das Handy wird wiedererkannt, solange derselbe Browser benutzt wird. Im Finale holt es den verpassten Teil automatisch nach.
- **Sitzung → Neue Sitzung** erzeugt einen neuen Code, zum Beispiel für die nächste Klasse.

---

## Datenschutz

- **Gespeichert wird nur:** Vorname mit Anfangsbuchstabe des Nachnamens und die Zeiten. Keine Konten, keine E-Mail-Adressen, keine Cookies, keine Werbung, kein Tracking.
- Die Daten liegen im Klassenraum-Speicher bei Cloudflare und werden **6 Stunden nach der letzten Änderung automatisch gelöscht**. Sofort löschen: **Sitzung → Sitzung beenden und Daten jetzt löschen**.
- Im Browser der Handys speichert die Seite eine zufällige Geräte-Kennung, den eingegebenen Namen und die eigene Zeit, bis sie angekommen ist. Im Browser der Lehrkraft liegen Code, Einstellungen und die Level-Sammlung.
- Schriften und Programmbibliotheken liegen im Projekt selbst. Die Seiten laden nichts von Google oder anderen Drittanbietern nach.
- Cloudflare ist ein US-Anbieter. Stimme den Einsatz am besten kurz mit der Schulleitung oder dem Datenschutzbeauftragten ab.

---

## Kosten

Der kostenlose Cloudflare-Tarif reicht für den Unterricht. Im Qualifying sendet jedes Handy nur zwei Nachrichten (Anmeldung und Zeit). Im Finale schickt jedes Handy etwa 15 kleine Pakete pro Sekunde mit seinen Tastendrücken. Ein Finale mit vier Spielern und zwei Leveln ergibt damit einige Tausend Nachrichten. Cloudflare rechnet eingehende WebSocket-Nachrichten gebündelt ab (nach den aktuellen Preisangaben 20 Nachrichten wie eine Anfrage). Das Laden der Spieldateien zählt nicht mit.

---

## Notlösung ohne Cloudflare: Laptop als Server

1. [Node.js](https://nodejs.org) installieren (Version 18 oder neuer).
2. Das Repository herunterladen (bei GitHub: **Code → Download ZIP**) und entpacken.
3. Im Projektordner ein Terminal öffnen und `node server/local.mjs` eingeben.
4. Im Terminal erscheint eine Zeile „Im Netz: http://192.168.…:8787/lehrer“. Genau diese Adresse am Laptop öffnen (nicht `localhost`), damit der QR-Code die Netzwerkadresse des Laptops enthält.

Voraussetzung: Handys und Laptop sind im selben WLAN, und das WLAN erlaubt Verbindungen zwischen den Geräten. Viele Schul-WLANs blockieren das, deshalb ist Cloudflare der Normalfall.

---

## Technik

| Ordner/Datei | Inhalt |
|---|---|
| `public/js/engine.js` | Spiellogik: Physik, Gegner, Rennen über mehrere Level, Abgleich übers Netz (Rollback). Läuft im Browser und auf dem Server |
| `public/js/gfx.js` | Grafik: Figuren in vier Farben, fünf Themen, Initialen, Breitbild |
| `public/js/levels.js` | die fünf mitgelieferten Level |
| `public/js/play.js` | Spielablauf: Qualifying, Finale übers Netz, Beamer-Kamera |
| `public/js/lehrer.js`, `public/js/editor.js` | Beamer-Seite und Level-Editor (nur dort eingebunden) |
| `public/js/mitspielen.js` | Handy-Seite: Anmeldung, Qualifying, Finale |
| `public/js/solo.js` | Startseite mit Üben |
| `public/js/net.js` | WebSocket-Verbindung mit automatischem Wiederverbinden und Uhrabgleich |
| `src/room.mjs` | Raum-Logik einer Klasse (unabhängig vom Server) |
| `src/worker.mjs` | Cloudflare Worker und Durable Object (ein Raum je Code) |
| `server/local.mjs` | Lokaler Server ohne Zusatzpakete |

**So bleibt das Finale fair:** Die Spiellogik ist deterministisch. Gleiche Level und gleiche Tastendrücke ergeben auf jedem Gerät exakt dasselbe Spiel. Die Handys schicken nur ihre Tastendrücke, ein Zeichen pro Frame. Jedes Gerät rechnet das ganze Rennen nach. Kommt eine Eingabe später an als gedacht, rechnet es ab diesem Frame neu. Der Server rechnet das Rennen mit derselben Engine mit und legt daraus die Reihenfolge im Ziel fest.

**Tests**
- `npm test`: Engine (verhält sich allein gespielt Frame für Frame wie das Einzelspiel, Abgleich mit vier Handys und Beamer) und Raum-Logik.
- `node tools/bot.js --walk`: Ein Such-Bot prüft, ob jedes Level nur gehend zu schaffen ist. Den Lift-Abschnitt in „Stollen“ findet er allein nicht; er wurde abschnittsweise geprüft.
- `node tools/bot.js --walk --items` prüft, ob jedes Speed-Item gehend erreichbar ist (Stollen abschnittsweise mit `node tools/stollen-item.js`), `node tools/bot.js --walk --schleim`, ob man allen Schleim vermeiden kann.
- `node tests/e2e.cjs`: eine ganze Stunde im Browser mit Lehrer-Seite und vier Handys (braucht [Playwright](https://playwright.dev) mit Chromium).

**Lizenzen:** Schriften Bungee, Rubik und Silkscreen unter SIL Open Font License (siehe `public/fonts/`). QR-Code-Generator von Kazuhiko Arase unter MIT-Lizenz (`public/js/qrcode.js`). Das Schullogo gehört der Karoline-Breitinger-Schule.
