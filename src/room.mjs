// Raum-Logik einer Klasse: Anmeldung, Qualifying, Finale mit 2 bis 4 Spielern, Siegerehrung.
// Diese Datei kennt weder Cloudflare noch Node. Der Server-Adapter (src/worker.mjs für Cloudflare,
// server/local.mjs für den Laptop) reicht Verbindungen und Speicher herein.
//
// Im Finale schicken die Handys nur ihre Tastendrücke (ein Zeichen pro Frame). Der Raum reicht sie an die anderen
// Finalisten und den Beamer weiter und rechnet das Rennen mit derselben Engine selbst nach, sobald alle Eingaben
// eines Frames da sind. So steht die Reihenfolge im Ziel fest, ohne einem Gerät vertrauen zu müssen.
import E from '../public/js/engine.js';

export const MAX_PLAYERS = 60;
export const MAX_ROUNDS = 5;
export const MIN_FINAL = 2, MAX_FINAL = 4;
const MAX_FINAL_FRAMES = 60 * 60 * 15; // ein Finale dauert höchstens 15 Minuten
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' -]{0,15}$/;

export function cleanName(first, initial) {
  first = String(first || '').trim().replace(/\s+/g, ' ');
  initial = String(initial || '').trim();
  if (!NAME_RE.test(first)) return null;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]$/.test(initial)) return null;
  const cap = s => s.charAt(0).toLocaleUpperCase('de-DE') + s.slice(1);
  return cap(first) + ' ' + initial.toLocaleUpperCase('de-DE') + '.';
}
const int = (v, lo, hi, def) => {
  v = Number(v);
  return Number.isInteger(v) && v >= lo && v <= hi ? v : def;
};
const INPUT_RE = /^[0-O]*$/; // Zeichen '0' (48) bis 'O' (79): 32 mögliche Eingaben pro Frame

export function freshState(code) {
  return {
    v: 1, code, teacherKey: null, created: 0, updated: 0,
    phase: 'setup', // setup | quali | final-setup | final | podium
    quali: null, // { stage, rounds, lv }
    players: {},
    order: [], // pids in Anmelde-Reihenfolge
    final: null,
    lv: 0, // zählt jede neue Leveldatei hoch, damit die Geräte wissen, wann sie neu laden müssen
  };
}

export class RoomLogic {
  /**
   * @param {object} io  Adapter:
   *   io.load() -> Promise<state|null>
   *   io.save(state) -> Promise
   *   io.wipe() -> Promise
   *   io.conns() -> Array<{ws, meta, send(obj), sendRaw(str), close(code, reason)}>
   *   io.setMeta(conn, meta)
   *   io.now() -> ms
   */
  constructor(io) { this.io = io; this.s = null; this.race = null; }

  async state(code) {
    if (!this.s) this.s = (await this.io.load()) || freshState(code);
    return this.s;
  }
  async persist() { this.s.updated = this.io.now(); await this.io.save(this.s); }

  // ---------- Verbindungen
  async open(conn, q) {
    const s = await this.state(q.code);
    const role = q.role === 'teacher' ? 'teacher' : 'player';
    if (role === 'teacher') {
      const key = String(q.key || '');
      if (key.length < 12 || key.length > 64) return this.reject(conn, 'bad-key');
      if (!s.teacherKey) { s.teacherKey = key; s.created = this.io.now(); await this.persist(); }
      else if (s.teacherKey !== key) return this.reject(conn, 'code-taken');
      this.io.setMeta(conn, { role: 'teacher' });
      conn.send(this.roomMsg());
    } else {
      const pid = String(q.pid || '');
      if (!/^[a-z0-9]{8,24}$/.test(pid)) return this.reject(conn, 'bad-pid');
      if (!s.teacherKey) return this.reject(conn, 'no-room');
      this.io.setMeta(conn, { role: 'player', pid });
      conn.send(this.youMsg(pid));
      this.pushTeachers();
    }
  }
  reject(conn, why) {
    try { conn.send({ t: 'error', why }); conn.close(4001, why); } catch (e) {}
  }
  async close(conn) {
    const m = conn.meta || {};
    if (m.role !== 'player') return;
    await this.state();
    this.closing = conn.ws;
    try { this.pushTeachers(); } finally { this.closing = null; }
  }

  // ---------- Nachrichten
  async message(conn, raw) {
    const m = conn.meta || {};
    if (typeof raw !== 'string' || raw.length > (m.role === 'teacher' ? 262144 : 16384)) return;
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;
    const s = await this.state();
    if (msg.t === 'sync') { conn.send({ t: 'sync', c: msg.c, s: this.io.now() }); return; }
    if (msg.t === 'in') return this.input(conn, msg, s, m);
    if (msg.t === 'logs?') return this.sendLogs(conn, s, m);
    if (msg.t === 'level?') return this.sendLevels(conn, s, m);
    if (m.role === 'teacher') return this.teacherMsg(conn, msg, s);
    if (m.role === 'player') return this.playerMsg(conn, msg, s, m.pid);
  }

  async teacherMsg(conn, msg, s) {
    switch (msg.t) {
      case 'quali-open': {
        const stage = E.normalizeStage(msg.stage, 0);
        if (!stage) return conn.send({ t: 'error', why: 'bad-level' });
        s.lv++;
        s.quali = { stage, rounds: int(msg.rounds, 1, MAX_ROUNDS, 1), lv: s.lv, si: int(msg.si, 0, 99, 0) };
        if (msg.reset) { s.players = {}; s.order = []; }
        s.phase = 'quali'; s.final = null; this.race = null;
        await this.persist(); this.pushAll(); return;
      }
      case 'phase': {
        if (msg.phase === 'setup' || (msg.phase === 'quali' && s.quali)) {
          s.phase = msg.phase; s.final = null; this.race = null;
          await this.persist(); this.pushAll();
        }
        return;
      }
      case 'kick': {
        const pid = String(msg.pid || ''); if (!s.players[pid]) return;
        if (s.final && s.final.p.includes(pid) && s.phase === 'final') return conn.send({ t: 'error', why: 'kick-finalist' });
        delete s.players[pid]; s.order = s.order.filter(p => p !== pid);
        for (const c of this.io.conns()) if ((c.meta || {}).pid === pid) c.send({ t: 'kicked' });
        await this.persist(); this.pushTeachers(); return;
      }
      case 'final-setup': {
        const f = this.makeFinal(s, msg);
        if (!f) return conn.send({ t: 'error', why: 'final-players' });
        s.final = f; s.phase = 'final-setup'; this.race = null;
        await this.persist(); this.pushAll(); return;
      }
      case 'final-start': {
        if (s.phase !== 'final-setup' || !s.final) return;
        // die Lehrkraft schickt ihre aktuelle Auswahl mit: genau diese wird gespielt
        if (msg.p) {
          const f = this.makeFinal(s, msg);
          if (!f) return conn.send({ t: 'error', why: 'final-players' });
          s.final = f;
        }
        const f = s.final, on = this.online();
        if (!f.p.every(pid => on.has(pid))) return conn.send({ t: 'error', why: 'final-offline' });
        f.state = 'running'; f.startAt = this.io.now() + 6000; f.fin = f.p.map(() => null); f.place = [];
        f.round = (f.round || 0) + 1; f.doneAt = 0;
        s.phase = 'final';
        this.startRace(f);
        await this.persist(); this.pushAll(); return;
      }
      case 'final-end': {
        const f = s.final; if (!f || s.phase !== 'final') return;
        this.advance(s);
        this.conclude(s, true);
        await this.persist(); this.pushAll(); return;
      }
      case 'final-cancel': {
        const f = s.final; if (!f || s.phase !== 'final') return;
        f.state = 'ready'; f.startAt = 0; this.race = null;
        s.phase = 'final-setup';
        await this.persist(); this.pushAll(); return;
      }
      case 'wipe': {
        for (const c of this.io.conns()) { try { c.send({ t: 'ended' }); c.close(4000, 'ended'); } catch (e) {} }
        this.s = null; this.race = null; await this.io.wipe(); return;
      }
    }
  }

  // Finale aus der Nachricht der Lehrkraft: Spieler (2–4, in Startreihenfolge = Farbe), zwei Level, gemeinsames Level ja/nein
  makeFinal(s, msg) {
    const p = Array.isArray(msg.p) ? msg.p.map(String) : [];
    if (p.length < MIN_FINAL || p.length > MAX_FINAL || new Set(p).size !== p.length || !p.every(pid => s.players[pid])) return null;
    const raw = Array.isArray(msg.stages) ? msg.stages.slice(0, 2) : [];
    const stages = raw.map((st, i) => E.normalizeStage(st, i));
    if (stages.length !== 2 || stages.some(st => !st)) return null;
    s.lv++;
    return {
      p, names: p.map(pid => s.players[pid].name), stages, si: Array.isArray(msg.si) ? msg.si.slice(0, 2).map(v => int(v, 0, 99, 0)) : [0, 1],
      shared: !!msg.shared, lv: s.lv, state: 'ready', startAt: 0, fin: p.map(() => null), place: [], round: s.final ? s.final.round || 0 : 0, doneAt: 0,
    };
  }

  async playerMsg(conn, msg, s, pid) {
    switch (msg.t) {
      case 'join': {
        if (s.phase !== 'quali') return conn.send({ t: 'error', why: 'not-open' });
        const name = cleanName(msg.first, msg.initial);
        if (!name) return conn.send({ t: 'error', why: 'bad-name' });
        let p = s.players[pid];
        if (!p) {
          if (s.order.length >= MAX_PLAYERS) return conn.send({ t: 'error', why: 'full' });
          let shown = name, n = 2;
          const taken = new Set(Object.values(s.players).map(x => x.name));
          while (taken.has(shown)) shown = name + ' ' + (n++);
          p = s.players[pid] = { name: shown, status: 'racing', total: null, splits: null, deaths: 0, at: this.io.now() };
          s.order.push(pid);
        }
        await this.persist();
        conn.send(this.youMsg(pid)); this.pushTeachers(); return;
      }
      case 'result': {
        const p = s.players[pid]; if (!p) return conn.send({ t: 'error', why: 'unknown' });
        const total = Number(msg.frames);
        if (!(total > 0 && total < 60 * 60 * 60)) return;
        // gilt nur für das Qualifying, in dem gespielt wurde
        if (!s.quali || int(msg.lv, 0, 1e9, -1) !== s.quali.lv) return conn.send({ t: 'result-old' });
        if (p.total == null) {
          p.total = Math.round(total);
          p.splits = Array.isArray(msg.splits) ? msg.splits.slice(0, MAX_ROUNDS).map(x => Math.round(Number(x) || 0)) : null;
          p.deaths = int(msg.deaths, 0, 9999, 0);
          p.status = 'done';
          p.at = this.io.now();
          await this.persist();
        }
        conn.send({ t: 'result-ok' });
        this.pushPlayers(); this.pushTeachers(); return;
      }
    }
  }

  // ---------- Finale: Eingaben sammeln, weiterreichen, nachrechnen
  startRace(f) {
    const stages = f.stages.map(E.stageView);
    this.race = {
      round: f.round, logs: f.p.map(() => ''), stepped: 0,
      m: E.createMatch(stages, [0, 1], f.p.length, { shared: f.shared, regrow: f.shared }),
    };
  }
  // das laufende Rennen; nach dem Zieleinlauf werden Eingaben noch kurz weitergereicht, damit der Beamer den
  // Schluss zeigt. Nach einem Neustart des Servers sind die Protokolle weg: die Handys schicken sie noch einmal ('need').
  raceFor(s) {
    const f = s.final;
    if (!f) return null;
    if (s.phase === 'final' && f.state === 'running') {
      if (!this.race || this.race.round !== f.round) this.startRace(f);
      return this.race;
    }
    if (s.phase === 'podium' && this.race && this.race.round === f.round && this.io.now() - f.doneAt < 20000) return this.race;
    return null;
  }
  async input(conn, msg, s, m) {
    if (m.role !== 'player') return;
    const race = this.raceFor(s); if (!race) return;
    const slot = s.final.p.indexOf(m.pid); if (slot < 0) return;
    const from = int(msg.f, 0, MAX_FINAL_FRAMES, -1), d = typeof msg.d === 'string' ? msg.d : '';
    if (from < 0 || !INPUT_RE.test(d)) return;
    const have = race.logs[slot].length;
    if (from > have) { conn.send({ t: 'need', s: slot, from: have }); return; }
    const part = d.slice(have - from).slice(0, MAX_FINAL_FRAMES - have);
    if (!part) return;
    race.logs[slot] += part;
    const out = JSON.stringify({ t: 'in', s: slot, f: have, d: part });
    for (const c of this.io.conns()) {
      const cm = c.meta || {};
      if (c.ws === conn.ws) continue;
      if (cm.role === 'teacher' || (cm.role === 'player' && s.final.p.includes(cm.pid))) c.sendRaw(out);
    }
    if (s.phase === 'final' && this.advance(s)) { this.conclude(s, false); await this.persist(); this.pushAll(); }
  }
  // das Rennen bis zum letzten Frame rechnen, für den alle Eingaben da sind; true, wenn jemand neu im Ziel ist
  advance(s) {
    const race = this.race, f = s.final;
    if (!race) return false;
    let upTo = Infinity;
    for (const l of race.logs) upTo = Math.min(upTo, l.length);
    let changed = false;
    while (race.m.frame < upTo) {
      const fr = race.m.frame, bits = race.logs.map(l => E.charInput(l[fr]));
      E.stepMatch(race.m, bits);
      race.m.recs.forEach((r, i) => { if (r.fin != null && f.fin[i] == null) { f.fin[i] = r.fin; changed = true; } });
    }
    return changed;
  }
  // Platzierung: wer im Ziel ist nach Zeit, dann nach Fortschritt. Das Finale endet, wenn höchstens einer
  // noch läuft oder drei im Ziel sind (oder die Lehrkraft es beendet).
  conclude(s, force) {
    const f = s.final, n = f.p.length;
    const done = f.fin.filter(x => x != null).length;
    if (!force && done < Math.min(3, n - 1)) return;
    const m = this.race && this.race.m;
    const order = f.p.map((_, i) => i).sort((a, b) => {
      const fa = f.fin[a], fb = f.fin[b];
      if (fa != null || fb != null) return fa == null ? 1 : fb == null ? -1 : fa - fb || a - b;
      return m ? E.progressOf(m, m.recs[b]) - E.progressOf(m, m.recs[a]) || a - b : a - b;
    });
    f.place = order;
    f.state = 'done'; f.doneAt = this.io.now();
    s.phase = 'podium';
  }
  sendLogs(conn, s, m) {
    const race = this.raceFor(s); if (!race) return;
    if (m.role === 'player' && !s.final.p.includes(m.pid)) return;
    conn.send({ t: 'logs', round: race.round, logs: race.logs });
  }
  sendLevels(conn, s, m) {
    const out = { t: 'levels', lv: s.lv, quali: s.quali ? s.quali.stage : null, qlv: s.quali ? s.quali.lv : 0, final: null, flv: 0 };
    const f = s.final;
    if (f && (m.role === 'teacher' || (m.role === 'player' && f.p.includes(m.pid)))) { out.final = f.stages; out.flv = f.lv; }
    conn.send(out);
  }

  // ---------- Sicht auf den Raum
  online() {
    const set = new Set();
    for (const c of this.io.conns()) { const m = c.meta || {}; if (m.role === 'player' && c.ws !== this.closing) set.add(m.pid); }
    return set;
  }
  ranking() {
    const s = this.s;
    const done = s.order.filter(p => s.players[p] && s.players[p].total != null);
    done.sort((a, b) => s.players[a].total - s.players[b].total || s.players[a].at - s.players[b].at);
    return done;
  }
  quali() {
    const q = this.s.quali;
    return q ? { name: q.stage.name, theme: q.stage.theme, rounds: q.rounds, lv: q.lv, si: q.si } : null;
  }
  finalInfo(withPids) {
    const f = this.s.final; if (!f) return null;
    const out = {
      names: f.names, stageNames: f.stages.map(st => st.name), shared: f.shared, lv: f.lv, state: f.state,
      startAt: f.startAt, fin: f.fin, place: f.place, round: f.round, doneAt: f.doneAt, si: f.si,
    };
    if (withPids) { const on = this.online(); out.p = f.p; out.online = f.p.map(pid => on.has(pid)); }
    return out;
  }
  roomMsg() {
    const s = this.s, on = this.online(), rank = this.ranking();
    const players = s.order.filter(p => s.players[p]).map(pid => {
      const p = s.players[pid];
      return { pid, name: p.name, status: p.status, total: p.total, splits: p.splits, deaths: p.deaths, online: on.has(pid), rank: rank.indexOf(pid) + 1 };
    });
    return { t: 'room', code: s.code, phase: s.phase, quali: this.quali(), players, final: this.finalInfo(true), now: this.io.now() };
  }
  youMsg(pid) {
    const s = this.s, p = s.players[pid] || null, f = s.final;
    const rank = this.ranking(), r = rank.indexOf(pid);
    let final = null;
    if (f && f.p.includes(pid) && (s.phase === 'final-setup' || s.phase === 'final' || s.phase === 'podium')) {
      final = Object.assign(this.finalInfo(false), { slot: f.p.indexOf(pid) });
    }
    return {
      t: 'you', phase: s.phase, quali: this.quali(), now: this.io.now(),
      me: p ? { name: p.name, status: p.status, total: p.total, rank: r + 1, of: rank.length } : null,
      final, winner: f && s.phase === 'podium' && f.place.length ? f.names[f.place[0]] : null,
    };
  }
  pushTeachers() {
    if (!this.s) return;
    let msg = null;
    for (const c of this.io.conns()) if ((c.meta || {}).role === 'teacher') { msg = msg || this.roomMsg(); c.send(msg); }
  }
  pushPlayers() {
    if (!this.s) return;
    for (const c of this.io.conns()) { const m = c.meta || {}; if (m.role === 'player') c.send(this.youMsg(m.pid)); }
  }
  pushAll() { this.pushTeachers(); this.pushPlayers(); }
}
