'use strict';
/* =========================================================
   OHANA FC 27 — match engine
   Top-down 11v11. World units: pitch 1050 x 680.
   ========================================================= */
const P = { L: 1050, H: 680, GW: 50, BAR: 26, BOX_D: 165, BOX_W: 205, SIX_D: 55, SIX_W: 100 };
const GRAV = 950;
const rnd = Math.random;
const gaussR = () => (rnd() + rnd() + rnd() - 1.5) / 0.5;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }

/* ---------------- Input ---------------- */
const KEYMAPS = {
  p1:   { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], pass: ['KeyC'], shoot: ['KeyV'], sprint: ['ShiftLeft'], special: ['KeyB'] },
  p2:   { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], pass: ['KeyK', 'Numpad1'], shoot: ['KeyL', 'Numpad2'], sprint: ['KeyJ', 'Numpad0'], special: ['KeyI', 'Numpad3'] },
  solo: { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], pass: ['KeyC', 'KeyK'], shoot: ['KeyV', 'KeyL', 'Space'], sprint: ['ShiftLeft', 'ShiftRight', 'KeyJ'], special: ['KeyB', 'KeyI'] },
};
const GAME_KEYS = new Set(Object.values(KEYMAPS).flatMap(m => Object.values(m).flat()));

class Input {
  constructor() {
    this.keys = new Set();
    this.down = e => { if (GAME_KEYS.has(e.code)) e.preventDefault(); this.keys.add(e.code); };
    this.up = e => this.keys.delete(e.code);
    this.blur = () => this.keys.clear();
    addEventListener('keydown', this.down);
    addEventListener('keyup', this.up);
    addEventListener('blur', this.blur);
  }
  destroy() { removeEventListener('keydown', this.down); removeEventListener('keyup', this.up); removeEventListener('blur', this.blur); }
  read(mapName, padIndex) {
    const m = KEYMAPS[mapName], k = c => m[c].some(x => this.keys.has(x));
    const s = { mx: (k('right') ? 1 : 0) - (k('left') ? 1 : 0), my: (k('down') ? 1 : 0) - (k('up') ? 1 : 0), pass: k('pass'), shoot: k('shoot'), sprint: k('sprint'), special: k('special'), pause: false };
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads[padIndex];
    if (gp) {
      const b = i => gp.buttons[i] && gp.buttons[i].pressed;
      let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (Math.hypot(ax, ay) < 0.22) ax = ay = 0;
      if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = -1; if (b(13)) ay = 1;
      if (ax || ay) { s.mx = ax; s.my = ay; }
      s.pass = s.pass || b(0); s.shoot = s.shoot || b(1) || b(2);
      s.special = s.special || b(3) || b(4); s.sprint = s.sprint || b(5) || b(7) || b(6);
      s.pause = b(9);
    }
    const l = Math.hypot(s.mx, s.my); if (l > 1) { s.mx /= l; s.my /= l; }
    return s;
  }
}

/* ---------------- Sound (synthesized, no files) ---------------- */
class Sfx {
  constructor() { this.muted = false; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } this.crowd = null; }
  noiseBuf() {
    if (this._nb) return this._nb;
    const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (this._nb = b);
  }
  noise(dur, freq, q, vol, attack = 0.005) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const t = c.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); s.stop(t + dur + 0.05);
  }
  kick(p = 0.5) { this.noise(0.12, 180 + p * 200, 1.2, 0.35 + p * 0.4); }
  tackle() { this.noise(0.18, 400, 0.8, 0.3); }
  whistle(long) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime;
    const blast = (st, dur) => {
      const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
      o.frequency.value = 2900; o2.frequency.value = 37; o2.connect(g.gain);
      const g2 = c.createGain(); g2.gain.setValueAtTime(0, st); g2.gain.linearRampToValueAtTime(0.09, st + 0.02); g2.gain.setValueAtTime(0.09, st + dur - 0.05); g2.gain.linearRampToValueAtTime(0, st + dur);
      o.connect(g); g.connect(g2); g2.connect(c.destination); o.start(st); o2.start(st); o.stop(st + dur); o2.stop(st + dur);
    };
    if (long) { blast(t, 0.3); blast(t + 0.4, 0.3); blast(t + 0.8, 0.9); } else blast(t, 0.35);
  }
  roar() { this.noise(3.2, 700, 0.4, 0.5, 0.4); this.noise(2.5, 1500, 0.6, 0.18, 0.3); }
  ooh() { this.noise(1.2, 500, 0.7, 0.22, 0.15); }
  power() {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(880, t + 0.35);
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.5);
  }
  startCrowd() {
    if (!this.ctx || this.crowd) return;
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf(); s.loop = true; f.type = 'bandpass'; f.frequency.value = 450; f.Q.value = 0.5;
    g.gain.value = this.muted ? 0 : 0.045; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
    this.crowd = { s, g };
  }
  setMuted(m) { this.muted = m; if (this.crowd) this.crowd.g.gain.value = m ? 0 : 0.045; }
  stop() { if (this.crowd) { try { this.crowd.s.stop(); } catch (e) { } this.crowd = null; } }
}

/* ---------------- Player attributes from a card ---------------- */
function attrsFor(card, slotPos) {
  const pen = posPenalty(card.pos, slotPos) * 0.6, s = card.stats;
  let a;
  if (card.pos === 'GK') a = { pac: s.spd, sho: 30 + s.kic * 0.3, pas: s.kic, dri: 45, def: 40, phy: 60, gk: (s.div + s.han + s.ref + s.pos) / 4, div: s.div, han: s.han, ref: s.ref };
  else a = { pac: s.pac, sho: s.sho, pas: s.pas, dri: s.dri, def: s.def, phy: s.phy, gk: 25, div: 25, han: 25, ref: 25 };
  if (slotPos === 'GK' && card.pos !== 'GK') a.gk = a.div = a.han = a.ref = 32;
  for (const k of OUT_KEYS) a[k] = clamp(a[k] - pen, 15, 99);
  return a;
}

/* =========================================================
   Match
   ========================================================= */
class Match {
  /* opts: { canvas, home, away, control:[ctlHome, ctlAway] ('solo'|'p1'|'p2'|'cpu'),
             duration (real seconds), skill (CPU 0..1), onEnd(result), onPause(bool) }
     team spec: { name, short, c1, c2, formation, cards:[11] } */
  constructor(opts) {
    this.o = opts;
    this.cv = opts.canvas; this.ctx = this.cv.getContext('2d');
    this.input = new Input();
    this.sfx = opts.sfx || new Sfx();
    this.duration = opts.duration || 300;
    this.clock = 0; this.half = 1;
    this.ball = { x: P.L / 2, y: P.H / 2, z: 0, vx: 0, vy: 0, vz: 0, owner: null, lastTouch: null, shot: null, curve: null, passTarget: null, passFrom: null, inHands: false, spin: 0 };
    this.shotId = 0;
    this.teams = [this.mkTeam(opts.home, 0, 1, opts.control[0]), this.mkTeam(opts.away, 1, -1, opts.control[1])];
    this.fixKitClash();
    this.humans = [];
    const colors = ['#22e6ff', '#ff4f7b'];
    this.teams.forEach(t => {
      const c = opts.control[t.idx];
      if (c !== 'cpu') {
        const h = { map: c, pad: c === 'p2' ? 1 : 0, team: t, player: null, charge: 0, charging: false, prev: {}, color: colors[this.humans.length], label: c === 'p2' ? 'P2' : 'P1', switchT: 0, idleT: 0 };
        t.human = h; this.humans.push(h);
      }
    });
    this.events = []; this.msg = null; this.parts = []; this.shake = 0;
    this.cam = { x: P.L / 2, y: P.H / 2 };
    this.state = 'restart'; this.stateT = 0; this.restart = null;
    this.paused = false; this.ended = false;
    this.kickoff(0);
    this.say('KICK OFF', `${this.teams[0].name} vs ${this.teams[1].name}`, 2);
    this.sfx.whistle(false); this.sfx.startCrowd();
    this.onKey = e => { if (e.code === 'Escape' || e.code === 'KeyP') this.togglePause(); };
    addEventListener('keydown', this.onKey);
    this.resize = () => this.fit(); addEventListener('resize', this.resize); this.fit();
    this.last = performance.now(); this.acc = 0;
    this.raf = requestAnimationFrame(t => this.frame(t));
  }

  mkTeam(spec, idx, dir, control) {
    const t = { idx, dir, name: spec.name, short: spec.short, c1: spec.c1, c2: spec.c2, gkc: idx ? '#e8ff3c' : '#ff9a1f', score: 0, meter: 30, human: null,
      skill: control === 'cpu' ? (this.o.skill ?? 0.6) : 0.7, cpu: control === 'cpu', players: [],
      stats: { shots: 0, onTarget: 0, passes: 0, passOk: 0, tackles: 0, poss: 0, specials: 0 } };
    const slots = FORMATIONS[spec.formation || '4-3-3'];
    spec.cards.forEach((card, i) => {
      const [slotPos, d, l] = slots[i];
      const p = { team: t, card, slotPos, home: { d, l }, isGK: slotPos === 'GK', a: attrsFor(card, slotPos), num: i === 0 ? 1 : [0, 3, 4, 5, 2, 8, 6, 10, 11, 9, 7][i] || i + 1,
        x: 0, y: 0, vx: 0, vy: 0, dvx: 0, dvy: 0, face: dir > 0 ? 0 : Math.PI, r: 9, stamina: 100, sprint: false,
        tackleCD: 0, kickCD: 0, stun: 0, lunge: 0, lungeHit: false, contactT: 0, decT: 0, dribDir: { x: dir, y: 0 }, receiving: 0, fx: {}, rolled: -1, reactShot: null, holdT: 0, anim: Math.random() * 10 };
      t.players.push(p);
    });
    return t;
  }
  fixKitClash() {
    const hex = c => { c = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16)); };
    const d = (a, b) => { const x = hex(a), y = hex(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
    const [h, a] = this.teams;
    if (d(h.c1, a.c1) < 120) {
      if (d(h.c1, a.c2) > 150) { const t = a.c1; a.c1 = a.c2; a.c2 = t; }
      else { a.c1 = d(h.c1, '#ffffff') > 200 ? '#f2f2f2' : '#1b1b1b'; a.c2 = a.c1 === '#f2f2f2' ? '#222' : '#eee'; }
    }
  }

  /* ---------- geometry helpers ---------- */
  depth(t, x) { return t.dir > 0 ? x / P.L : (P.L - x) / P.L; }
  lat(t, y) { return t.dir > 0 ? y / P.H : 1 - y / P.H; }
  world(t, d, l) { return { x: t.dir > 0 ? d * P.L : P.L - d * P.L, y: t.dir > 0 ? l * P.H : (1 - l) * P.H }; }
  oppGoalX(t) { return t.dir > 0 ? P.L : 0; }
  ownGoalX(t) { return t.dir > 0 ? 0 : P.L; }
  other(t) { return this.teams[1 - t.idx]; }
  inOwnBox(p, team) { const gx = this.ownGoalX(team || p.team); return Math.abs(p.x - gx) < P.BOX_D && Math.abs(p.y - P.H / 2) < P.BOX_W; }
  say(text, sub, t = 1.6, color) { this.msg = { text, sub, t, max: t, color }; }
  minute() { return Math.min(90, Math.floor(this.clock / this.duration * 90)); }

  /* ---------- restarts ---------- */
  resetBall(x, y) { Object.assign(this.ball, { x, y, z: 0, vx: 0, vy: 0, vz: 0, owner: null, shot: null, curve: null, passTarget: null, passFrom: null, inHands: false }); }
  kickoff(teamIdx) {
    const kt = this.teams[teamIdx];
    this.resetBall(P.L / 2, P.H / 2);
    for (const t of this.teams) for (const p of t.players) {
      const w = this.world(t, p.isGK ? 0.03 : Math.min(p.home.d * 0.6, 0.45), p.home.l);
      p.x = w.x; p.y = w.y; p.vx = p.vy = 0; p.face = t.dir > 0 ? 0 : Math.PI; p.fx = {}; p.stun = 0; p.receiving = 0;
      if (t !== kt) { const dx = p.x - P.L / 2, dy = p.y - P.H / 2, dd = Math.hypot(dx, dy); if (dd < 100) { p.x = P.L / 2 + dx / (dd || 1) * 100; p.y = P.H / 2 + dy / (dd || 1) * 100; } }
    }
    const taker = kt.players.filter(p => !p.isGK).sort((a, b) => this.depth(kt, b.x) - this.depth(kt, a.x))[0];
    taker.x = P.L / 2 - kt.dir * 12; taker.y = P.H / 2;
    this.setRestart(kt, taker, 'kickoff');
  }
  setRestart(team, taker, kind) {
    const b = this.ball;
    b.owner = taker; b.inHands = kind === 'goalkick'; b.vx = b.vy = b.vz = 0; b.z = 0; b.shot = null; b.passTarget = null; b.curve = null;
    taker.vx = taker.vy = 0;
    const tgt = { x: P.L / 2, y: P.H / 2 }; if (kind === 'kickoff') tgt.x = P.L / 2 - team.dir * 100;
    taker.face = Math.atan2(tgt.y - taker.y, tgt.x - taker.x);
    this.state = 'restart'; this.restart = { team, taker, kind, t: 0 };
    if (team.human && !taker.isGK) team.human.player = taker;
    for (const t of this.teams) for (const p of t.players) { p.stun = 0; p.lunge = 0; p.contactT = 0; }
  }
  doThrowIn(x, y) {
    const t = this.other(this.ball.lastTouch ? this.ball.lastTouch.team : this.teams[0]);
    const pos = { x: clamp(x, 10, P.L - 10), y: y < 0 ? -4 : P.H + 4 };
    const taker = this.nearest(t.players.filter(p => !p.isGK), pos);
    taker.x = pos.x; taker.y = pos.y; this.ball.x = pos.x; this.ball.y = y < 0 ? 2 : P.H - 2;
    this.setRestart(t, taker, 'throw');
    this.say('THROW-IN', t.name, 1);
  }
  doGoalLineOut(side) { // side: x=0 or x=L
    const defending = this.teams.find(t => this.ownGoalX(t) === side), attacking = this.other(defending);
    const lt = this.ball.lastTouch;
    if (lt && lt.team === defending) {
      const cy = this.ball.y < P.H / 2 ? 3 : P.H - 3, cx = side === 0 ? 3 : P.L - 3;
      const taker = this.nearest(attacking.players.filter(p => !p.isGK), { x: cx, y: cy });
      taker.x = cx + (side === 0 ? -6 : 6); taker.y = cy + (cy < P.H / 2 ? -6 : 6);
      this.ball.x = cx; this.ball.y = cy;
      this.setRestart(attacking, taker, 'corner');
      this.say('CORNER', attacking.name, 1.2);
    } else {
      const gk = defending.players.find(p => p.isGK) || defending.players[0];
      gk.x = side + defending.dir * 50; gk.y = P.H / 2 + (this.ball.y < P.H / 2 ? -40 : 40);
      this.ball.x = gk.x; this.ball.y = gk.y;
      this.setRestart(defending, gk, 'goalkick');
      this.say('GOAL KICK', defending.name, 1);
    }
  }
  nearest(list, pt) { let b = null, bd = 1e9; for (const p of list) { const d = dist(p, pt); if (d < bd) { bd = d; b = p; } } return b; }

  /* ---------- main loop ---------- */
  fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.dpr = dpr; this.vw = w; this.vh = h;
    this.zoom = Math.max(h / 480, w / 900);
  }
  togglePause(force) {
    if (this.ended) return;
    this.paused = force !== undefined ? force : !this.paused;
    this.input.keys.clear();
    if (this.o.onPause) this.o.onPause(this.paused);
  }
  frame(now) {
    if (this.destroyed) return;
    let dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    // gamepad start button toggles pause
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let st = false; for (const gp of pads || []) if (gp && gp.buttons[9] && gp.buttons[9].pressed) st = true;
    if (st && !this.prevStart) this.togglePause(); this.prevStart = st;
    if (!this.paused) {
      this.acc += dt;
      while (this.acc >= 1 / 60) { this.step(1 / 60); this.acc -= 1 / 60; }
    }
    this.draw();
    this.raf = requestAnimationFrame(t => this.frame(t));
  }
  destroy() {
    this.destroyed = true; cancelAnimationFrame(this.raf); this.input.destroy(); this.sfx.stop();
    removeEventListener('keydown', this.onKey); removeEventListener('resize', this.resize);
  }

  step(dt) {
    if (this.msg) { this.msg.t -= dt; if (this.msg.t <= 0) this.msg = null; }
    this.parts = this.parts.filter(q => (q.t -= dt) > 0);
    for (const q of this.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; }
    this.shake = Math.max(0, this.shake - dt * 2);
    if (this.state === 'fulltime') { this.stateT -= dt; if (this.stateT <= 0 && !this.ended) this.finish(); this.moveAll(dt, true); return; }
    if (this.state === 'goal') {
      this.stateT -= dt; this.ballPhysics(dt, true); this.celebrate(dt);
      if (this.stateT <= 0) { if (this.clock >= this.duration) this.endMatch(); else this.kickoff(this.goalConceder); }
      return;
    }
    if (this.state === 'halftime') {
      this.stateT -= dt;
      if (this.stateT <= 0) { this.teams.forEach(t => t.dir = -t.dir); this.half = 2; this.kickoff(1); this.sfx.whistle(false); }
      return;
    }
    // clock
    this.clock += dt;
    if (this.half === 1 && this.clock >= this.duration / 2) { this.state = 'halftime'; this.stateT = 2.6; this.say('HALF TIME', `${this.teams[0].score} - ${this.teams[1].score}`, 2.6); this.sfx.whistle(true); return; }
    if (this.clock >= this.duration) { this.endMatch(); return; }

    const b = this.ball;
    if (b.owner) b.owner.team.stats.poss += dt;
    for (const t of this.teams) t.meter = Math.min(100, t.meter + dt * (100 / 24));
    if (this.state === 'restart') this.restart.t += dt;

    for (const h of this.humans) this.humanStep(h, dt);
    for (const t of this.teams) this.aiTeam(t, dt);
    this.moveAll(dt, false);
    this.ballStep(dt);
    if (this.state === 'play') { this.interactions(dt); this.checkBounds(); }
  }

  endMatch() {
    this.state = 'fulltime'; this.stateT = 3;
    this.say('FULL TIME', `${this.teams[0].name} ${this.teams[0].score} - ${this.teams[1].score} ${this.teams[1].name}`, 3);
    this.sfx.whistle(true);
    this.ball.owner = null;
  }
  finish() {
    this.ended = true;
    const tot = this.teams[0].stats.poss + this.teams[1].stats.poss || 1;
    const res = {
      score: [this.teams[0].score, this.teams[1].score],
      stats: this.teams.map(t => ({ ...t.stats, possPct: Math.round(t.stats.poss / tot * 100) })),
      events: this.events, names: this.teams.map(t => t.name),
    };
    if (this.o.onEnd) this.o.onEnd(res);
  }

  /* ---------- human control ---------- */
  setHumanPlayer(h, p) { if (p && !p.isGK) h.player = p; }
  humanStep(h, dt) {
    const raw = this.input.read(h.map, h.pad);
    const c = { ...raw, passDown: raw.pass && !h.prev.pass, shootDown: raw.shoot && !h.prev.shoot, shootUp: !raw.shoot && h.prev.shoot, specialDown: raw.special && !h.prev.special };
    h.prev = raw;
    const b = this.ball, t = h.team;
    if (!h.player || h.player.team !== t) h.player = this.nearest(t.players.filter(p => !p.isGK), b);
    if (b.owner && b.owner.team === t && !b.owner.isGK && b.owner !== h.player) h.player = b.owner;
    const p = h.player;
    const aim = (c.mx || c.my) ? { x: c.mx, y: c.my } : { x: Math.cos(p.face), y: Math.sin(p.face) };
    const isTaker = this.state === 'restart' && this.restart.taker === p;
    const lockedOut = this.state === 'restart' && this.restart.team !== t && this.restart.kind === 'kickoff';

    // movement
    p.sprint = c.sprint && (c.mx || c.my) && !isTaker;
    if (isTaker) { p.dvx = p.dvy = 0; if (c.mx || c.my) p.face = Math.atan2(c.my, c.mx); }
    else { const sp = this.maxSpeed(p); p.dvx = c.mx * sp; p.dvy = c.my * sp; }
    if (lockedOut) { p.dvx = p.dvy = 0; }
    p.humanCtl = true;

    if (b.owner === p) {
      if (isTaker) {
        h.idleT += dt;
        if (this.restart.t > 0.35 && (c.passDown || c.shootDown || h.idleT > 7)) { this.doPass(p, aim); h.idleT = 0; }
        return;
      }
      if (c.specialDown) this.activateSpecial(p);
      if (c.passDown) { this.doPass(p, aim); h.charging = false; return; }
      if (c.shootDown) { h.charging = true; h.charge = 0; }
      if (h.charging) {
        h.charge = Math.min(1, h.charge + dt / 0.85);
        if (c.shootUp) { this.doShot(p, h.charge, c.my); h.charging = false; }
      }
    } else {
      h.charging = false;
      if (c.specialDown) this.activateSpecial(p);
      if (this.state !== 'play') return;
      if (c.passDown && !(b.owner && b.owner.team === t)) this.switchPlayer(h);
      if (c.shootDown && p.tackleCD <= 0 && p.stun <= 0) {
        const car = b.owner && b.owner.team !== t ? b.owner : null;
        const target = car || b;
        const ang = dist(p, target) < 70 ? Math.atan2(target.y - p.y, target.x - p.x) : p.face;
        p.lunge = 0.24; p.lungeHit = false; p.face = ang; p.tackleCD = 0.9;
        p.vx = Math.cos(ang) * 290; p.vy = Math.sin(ang) * 290;
      }
      // auto-switch when a teammate is far better placed
      h.switchT -= dt;
      if (h.switchT <= 0 && !(b.owner && b.owner.team === t) && b.passTarget?.team !== t) {
        h.switchT = 0.35;
        const n = this.nearest(t.players.filter(q => !q.isGK), b);
        if (n !== p && dist(p, b) > dist(n, b) * 1.6 + 60) h.player = n;
      }
    }
  }
  switchPlayer(h) {
    const t = h.team, b = this.ball;
    const cand = t.players.filter(q => !q.isGK && q !== h.player).sort((a, c) => dist(a, b) - dist(c, b));
    if (cand[0]) h.player = cand[0];
  }
  maxSpeed(p) {
    let s = (92 + p.a.pac * 0.78) * (0.82 + 0.18 * p.stamina / 100);
    if (p.sprint) s *= 1.33;
    if (this.ball.owner === p) s *= 0.9;
    if (p.fx.speed > 0) s *= 1.45;
    if (p.fx.captain > 0) s *= 1.18;
    if (p.stun > 0) s *= 0.25;
    if (p.team.cpu) s *= 0.93 + 0.09 * p.team.skill;
    return s;
  }

  /* ---------- specials ---------- */
  activateSpecial(p) {
    const t = p.team;
    const tr = p.card.traits.find(x => x !== 'cat');
    if (!tr) { if (t.human) this.say('NO SPECIAL', `${p.card.name} has no active power`, 1); return false; }
    if (t.meter < 100) { if (t.human) this.say('POWER NOT READY', `${Math.floor(t.meter)}%`, 0.8); return false; }
    t.meter = 0; t.stats.specials++;
    const T = TRAITS[tr];
    switch (tr) {
      case 'rocket': p.fx.rocket = 10; break;
      case 'finesse': p.fx.finesse = 10; break;
      case 'speed': p.fx.speed = 5; break;
      case 'magnet': p.fx.magnet = 5; break;
      case 'vision': p.fx.vision = 10; break;
      case 'wall': p.fx.wall = 6; break;
      case 'tank': p.fx.tank = 5; break;
      case 'captain': t.players.forEach(q => q.fx.captain = 6); break;
    }
    p.fx.glow = { color: T.color, t: tr === 'rocket' || tr === 'finesse' || tr === 'vision' ? 10 : 6 };
    this.say(`${T.icon} ${T.name.toUpperCase()}`, p.card.name, 1.4, T.color);
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; this.parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, t: 0.6, c: T.color }); }
    this.sfx.power();
    if (tr === 'vision' && this.ball.owner === p) this.doPass(p, null);
    return true;
  }

  /* ---------- kicking ---------- */
  release(p, cd = 0.25) {
    const b = this.ball; b.owner = null; b.inHands = false; b.lastTouch = p; p.kickCD = cd;
    if (this.state === 'restart') this.state = 'play';
  }
  doShot(p, power, aimY) {
    const b = this.ball, t = p.team, gx = this.oppGoalX(t), gy = P.H / 2;
    let ty;
    if (aimY != null && Math.abs(aimY) > 0.3) ty = gy + Math.sign(aimY) * (P.GW - 13);
    else ty = gy + (p.y < gy ? 1 : -1) * (P.GW - 16) * 0.8;
    const rocket = p.fx.rocket > 0, finesse = p.fx.finesse > 0;
    if (finesse) ty = gy + (p.y < gy ? 1 : -1) * (P.GW - 9);
    const d = Math.hypot(gx - p.x, ty - p.y);
    let speed = (400 + power * 500) * (0.78 + p.a.sho / 450);
    if (rocket) speed *= 1.32; if (finesse) speed *= 0.9;
    let ang = Math.atan2(ty - p.y, gx - p.x);
    let err = (0.03 + (100 - p.a.sho) / 100 * 0.13) * (0.55 + power * 0.7) * (1 + d / 450);
    const opp = this.other(t).players; let press = 1e9; for (const o of opp) press = Math.min(press, dist(o, p));
    if (press < 30) err *= 1.35;
    if (t.cpu) err *= 1.3 - 0.5 * t.skill;
    if (rocket) err *= 0.15; if (finesse) err *= 0.3;
    ang += gaussR() * err;
    let ux = Math.cos(ang), uy = Math.sin(ang);
    b.curve = null;
    if (finesse) {
      const tt = d / speed, c = 520, off = c * tt * tt / 2;
      let nx = -uy, ny = ux; const sgn = -Math.sign(ty - gy || 1) * Math.sign(ny || 1);
      const ax = gx - nx * sgn * off, ay = ty - ny * sgn * off; // aim wide, curl back in
      ang = Math.atan2(ay - p.y, ax - p.x) + gaussR() * err; ux = Math.cos(ang); uy = Math.sin(ang);
      b.curve = { x: nx * sgn * c, y: ny * sgn * c };
    }
    this.release(p, 0.35);
    b.vx = ux * speed; b.vy = uy * speed;
    b.vz = finesse ? 95 : rocket ? 70 + rnd() * 30 : 30 + power * power * 215 + rnd() * 45;
    b.z = 2;
    b.shot = { id: ++this.shotId, team: t, rocket, finesse, by: p };
    b.passTarget = null; b.passFrom = null;
    p.fx.rocket = 0; p.fx.finesse = 0;
    t.stats.shots++;
    this.sfx.kick(power);
    if (rocket) { this.shake = 0.5; for (let i = 0; i < 16; i++) this.parts.push({ x: b.x, y: b.y, vx: ux * 300 + gaussR() * 80, vy: uy * 300 + gaussR() * 80, t: 0.4, c: '#ff7a3d' }); }
  }
  passOptions(p, aim) {
    const t = p.team, opp = this.other(t).players, res = [];
    for (const q of t.players) {
      if (q === p || q.stun > 0) continue;
      const d = dist(p, q); if (d < 40 || d > 640) continue;
      let lane = 1e9, open = 1e9;
      for (const o of opp) { lane = Math.min(lane, segDist(o.x, o.y, p.x, p.y, q.x, q.y)); open = Math.min(open, dist(o, q)); }
      const progress = this.depth(t, q.x) - this.depth(t, p.x);
      let score;
      if (aim) {
        const cos = ((q.x - p.x) * aim.x + (q.y - p.y) * aim.y) / d;
        if (cos < 0.42) continue;
        score = cos * 2 - d / 900 + Math.min(open, 100) / 300 + (lane < 20 ? -0.4 : 0) - (q.isGK ? 0.6 : 0);
      } else {
        if (q.isGK && progress > -0.1) continue;
        score = progress * 2.4 + Math.min(open, 120) / 150 - d / 1400 + (lane < 22 ? (d > 330 ? -0.25 : -1.2) : 0) - (q.isGK ? 0.8 : 0);
      }
      res.push({ q, score, d, lane });
    }
    return res.sort((a, b) => b.score - a.score);
  }
  doPass(p, aim, forced) {
    const b = this.ball, t = p.team, vision = p.fx.vision > 0;
    let target = forced || null;
    if (!target) {
      if (vision) { const o = this.passOptions(p, null); target = o.length ? o.sort((a, c) => this.depth(t, c.q.x) - this.depth(t, a.q.x) + (c.lane > 25) - (a.lane > 25))[0].q : null; }
      else { const o = this.passOptions(p, aim); target = o.length ? o[0].q : null; }
    }
    let ang, speed, vz = 0;
    if (target) {
      const d0 = dist(p, target);
      const lead = Math.min(1.1, d0 / 480) * (target.humanCtl ? 0.5 : 0.75);
      const tx = clamp(target.x + target.vx * lead, 5, P.L - 5), ty = clamp(target.y + target.vy * lead, 5, P.H - 5);
      const d = Math.hypot(tx - p.x, ty - p.y);
      ang = Math.atan2(ty - p.y, tx - p.x);
      speed = clamp(d * 1.2 + 180, 290, 820) * (0.92 + p.a.pas / 900);
      let err = (100 - p.a.pas) / 100 * 0.09;
      if (t.cpu) err *= 1.25 - 0.45 * t.skill;
      if (vision) { err = 0; speed *= 1.12; }
      ang += gaussR() * err;
      // loft long passes over traffic
      let lane = 1e9; for (const o of this.other(t).players) lane = Math.min(lane, segDist(o.x, o.y, p.x, p.y, tx, ty));
      if (d > 330 && lane < 30) { vz = 150 + d * 0.18; speed *= 0.82; }
      b.passTarget = target; target.receiving = 1.6;
      if (t.human && !target.isGK) t.human.player = target;
    } else {
      const a = aim || { x: Math.cos(p.face), y: Math.sin(p.face) };
      ang = Math.atan2(a.y, a.x); speed = 430; b.passTarget = null;
    }
    this.release(p, 0.3);
    b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed; b.vz = vz; b.z = vz ? 1 : 0;
    b.shot = null; b.curve = null; b.passFrom = p;
    p.fx.vision = 0; p.face = ang;
    t.stats.passes++;
    this.sfx.kick(0.2);
  }
  takeBall(p) {
    const b = this.ball;
    if (b.passFrom && b.passFrom.team === p.team && b.passFrom !== p) p.team.stats.passOk++;
    b.owner = p; b.shot = null; b.curve = null; b.passTarget = null; b.passFrom = null; b.lastTouch = p; b.z = 0; b.vz = 0;
    p.receiving = 0; p.holdT = 0;
    b.inHands = p.isGK && this.inOwnBox(p);
    if (p.team.human && !p.isGK) p.team.human.player = p;
  }

  /* ---------- tackles ---------- */
  tryTackle(d, c) {
    d.tackleCD = 1.0; d.contactT = 0;
    const b = this.ball;
    if (b.inHands || b.owner !== c) return;
    if (c.fx.magnet > 0 || c.fx.tank > 0) { d.stun = c.fx.tank > 0 ? 0.9 : 0.45; return; }
    let ch = 0.42 + (d.a.def - c.a.dri) / 110 + (d.a.phy - c.a.phy) / 400;
    if (d.team.cpu) ch += (d.team.skill - 0.5) * 0.18;
    if (d.fx.wall > 0) ch = 0.95;
    ch = clamp(ch, 0.1, 0.95);
    if (rnd() < ch) {
      c.stun = 0.45; c.kickCD = 0.5; d.team.stats.tackles++;
      d.team.meter = Math.min(100, d.team.meter + 8);
      if (rnd() < 0.55) this.takeBall(d);
      else { b.owner = null; b.lastTouch = d; const a = d.face + gaussR() * 0.6; b.vx = Math.cos(a) * 190; b.vy = Math.sin(a) * 190; d.kickCD = 0.15; }
      this.sfx.tackle();
    } else d.stun = 0.55;
  }

  /* ---------- AI ---------- */
  aiTeam(t, dt) {
    const b = this.ball, owner = b.owner, poss = owner ? owner.team : null;
    const field = t.players.filter(p => !p.isGK && p.stun <= 0);
    let chaser = null, cover = null;
    if (poss !== t) {
      const pred = { x: b.x + b.vx * 0.25, y: b.y + b.vy * 0.25 };
      const cands = field.filter(p => !(t.human && t.human.player === p)).sort((a, c) => dist(a, pred) - dist(c, pred));
      const hp = t.human ? t.human.player : null;
      if (!poss) { chaser = cands[0]; if (hp && dist(hp, pred) < dist(chaser, pred) * 1.2) chaser = null; }
      else if (!t.human) { chaser = cands[0]; cover = cands[1]; }
      else { cover = cands[0]; if (hp && dist(hp, owner) > 160) chaser = cands[0], cover = cands[1]; }
    }
    for (const p of t.players) {
      if (t.human && t.human.player === p) continue;
      p.humanCtl = false; p.sprint = false;
      if (p.isGK) { this.gkAI(p, dt); continue; }
      if (this.state === 'restart' && this.restart.taker === p) { this.takerAI(p); continue; }
      if (owner === p) { this.carrierAI(p, dt); continue; }
      let tgt;
      if (b.passTarget === p && !owner) { tgt = { x: b.x + b.vx * 0.2, y: b.y + b.vy * 0.2 }; p.sprint = true; }
      else if (p === chaser) { tgt = owner ? { x: owner.x + owner.vx * 0.15, y: owner.y + owner.vy * 0.15 } : { x: b.x + b.vx * 0.3, y: b.y + b.vy * 0.3 }; p.sprint = dist(p, tgt) > 60; }
      else if (p === cover && owner) {
        const gx = this.ownGoalX(t), gy = P.H / 2, dx = gx - owner.x, dy = gy - owner.y, dd = Math.hypot(dx, dy) || 1;
        tgt = { x: owner.x + dx / dd * 70, y: owner.y + dy / dd * 70 }; p.sprint = dist(p, tgt) > 90;
      } else tgt = this.formTarget(p, poss);
      if (this.state === 'restart') tgt = this.restartAdjust(p, tgt);
      this.steer(p, tgt);
      // contact tackles
      if (owner && owner.team !== t && !b.inHands && this.state === 'play') {
        const range = p.r * 2 + 8 + (p.fx.wall > 0 ? 14 : 0);
        if (dist(p, owner) < range) {
          p.contactT += dt;
          const react = t.cpu ? 0.55 - t.skill * 0.35 : 0.6;
          if (p.contactT > react && p.tackleCD <= 0 && p.stun <= 0) this.tryTackle(p, owner);
        } else p.contactT = 0;
      }
    }
    // human-controlled defender gets a slow automatic tackle on sustained contact
    if (t.human && owner && owner.team !== t && this.state === 'play') {
      const p = t.human.player;
      if (p && dist(p, owner) < p.r * 2 + 8 + (p.fx.wall > 0 ? 14 : 0)) { p.contactT += dt; if (p.contactT > 0.9 && p.tackleCD <= 0 && p.stun <= 0) this.tryTackle(p, owner); }
      else if (p) p.contactT = 0;
    }
  }
  restartAdjust(p, tgt) {
    const r = this.restart, b = this.ball;
    if (r.kind === 'kickoff') { const own = this.depth(p.team, tgt.x); if (own > 0.48) tgt = this.world(p.team, 0.47, this.lat(p.team, tgt.y)); }
    if (p.team !== r.team) { const dx = tgt.x - b.x, dy = tgt.y - b.y, d = Math.hypot(dx, dy); if (d < 90) tgt = { x: b.x + dx / (d || 1) * 90, y: b.y + dy / (d || 1) * 90 }; }
    return tgt;
  }
  formTarget(p, poss) {
    const t = p.team, b = this.ball, bd = this.depth(t, b.x), bl = this.lat(t, b.y);
    const attacking = poss === t || (!poss && b.lastTouch && b.lastTouch.team === t);
    let d, l;
    if (attacking) {
      d = p.home.d * 0.6 + bd * 0.42 + 0.07;
      if (POS_LINE[p.slotPos] === 'A') d += 0.05;
      d = Math.min(d, p.home.d + 0.45);
      l = p.home.l * 0.85 + bl * 0.15;
    } else {
      d = p.home.d * 0.62 + bd * 0.33 - 0.03;
      l = p.home.l * 0.72 + bl * 0.28;
    }
    return this.world(t, clamp(d, 0.05, 0.92), clamp(l, 0.04, 0.96));
  }
  steer(p, tgt, urgent) {
    const dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy);
    if (d < 4) { p.dvx = p.dvy = 0; return; }
    if (!p.sprint && d > 140) p.sprint = urgent || false;
    let sp = this.maxSpeed(p) * Math.min(1, d / 45);
    if (!p.sprint && !urgent && d < 120) sp *= 0.72;
    p.dvx = dx / d * sp; p.dvy = dy / d * sp;
  }
  takerAI(p) {
    p.dvx = p.dvy = 0;
    const r = this.restart, wait = r.kind === 'goalkick' ? 1.3 : 0.9 + (p.team.cpu ? 0 : 0.2);
    if (r.t < wait) return;
    let opts = this.passOptions(p, null);
    if (r.kind === 'kickoff') opts = this.passOptions(p, { x: -p.team.dir, y: 0 });
    if (r.kind === 'goalkick' && (!opts.length || opts[0].lane < 25)) {
      const fwd = p.team.players.filter(q => !q.isGK && POS_LINE[q.slotPos] !== 'D');
      return this.doPass(p, null, fwd[Math.floor(rnd() * fwd.length)]);
    }
    if (r.kind === 'corner') {
      const box = p.team.players.filter(q => !q.isGK && Math.abs(q.x - this.oppGoalX(p.team)) < 200);
      if (box.length) return this.doPass(p, null, box[Math.floor(rnd() * box.length)]);
    }
    this.doPass(p, null, opts.length ? opts[0].q : null);
  }
  carrierAI(p, dt) {
    const t = p.team, b = this.ball, gx = this.oppGoalX(t), gy = P.H / 2;
    const opp = this.other(t).players;
    let press = 1e9, presser = null; for (const o of opp) { const d = dist(o, p); if (d < press) { press = d; presser = o; } }
    const dGoal = Math.hypot(gx - p.x, gy - p.y);
    p.decT -= dt;
    if (p.decT <= 0 || (press < 32 && p.decT < 0.1)) {
      p.decT = 0.16 + (1 - t.skill) * 0.25 + rnd() * 0.12;
      // special
      if (t.meter >= 100 && p.card.traits.some(x => x !== 'cat')) {
        const tr = p.card.traits.find(x => x !== 'cat');
        if (((tr === 'rocket' || tr === 'finesse') && dGoal < 320) || ((tr === 'speed' || tr === 'magnet' || tr === 'tank') && press < 70) || tr === 'vision' || tr === 'captain') {
          if (this.activateSpecial(p) && tr === 'vision') return;
        }
      }
      // shoot
      const angleOK = Math.abs(p.y - gy) < 190 && Math.abs(gx - p.x) > 20;
      if (dGoal < 340 && angleOK) {
        let prob = dGoal < 160 ? 0.8 : dGoal < 240 ? 0.3 : 0.04;
        if (p.fx.rocket > 0 || p.fx.finesse > 0) prob = 1;
        if (press < 35) prob += 0.2;
        if (rnd() < prob) { const pw = clamp(0.4 + dGoal / 560 + rnd() * 0.2, 0.4, 0.95); return this.doShot(p, pw, rnd() < 0.5 ? -1 : 1); }
      }
      // pass
      const opts = this.passOptions(p, null), best = opts[0];
      if (best && ((press < 45 && best.score > -0.5) || (best.score > 0.45 && rnd() < 0.3 + t.skill * 0.25) || (this.inOwnBox(p) && best.score > -0.3))) return this.doPass(p, null, best.q);
      // dribble
      let dx = gx - p.x, dy = (gy + (p.y - gy) * 0.45) - p.y; let dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd;
      let ax = 0, ay = 0;
      for (const o of opp) {
        const ox = o.x - p.x, oy = o.y - p.y, od = Math.hypot(ox, oy);
        if (od > 130 || od < 1) continue;
        if (ox * dx + oy * dy < -10) continue;
        const w = (1 - od / 130) * 1.6, side = (ox * -dy + oy * dx) > 0 ? -1 : 1;
        ax += -dy * side * w; ay += dx * side * w;
      }
      if (p.y < 50) ay += 1; if (p.y > P.H - 50) ay -= 1;
      dx += ax; dy += ay; dd = Math.hypot(dx, dy) || 1;
      p.dribDir = { x: dx / dd, y: dy / dd };
      p.wantSprint = press > 55 || rnd() < 0.3;
    }
    p.sprint = p.wantSprint && p.stamina > 25;
    const sp = this.maxSpeed(p);
    p.dvx = p.dribDir.x * sp; p.dvy = p.dribDir.y * sp;
  }
  gkAI(p, dt) {
    const t = p.team, b = this.ball, gx = this.ownGoalX(t), gy = P.H / 2, inward = t.dir;
    if (this.state === 'restart' && this.restart.taker === p) return this.takerAI(p);
    if (b.owner === p) {
      p.holdT += dt; p.dvx = p.dvy = 0;
      if (p.holdT > 1.1 && this.state === 'play') {
        const opts = this.passOptions(p, null).filter(o => o.lane > 25);
        if (opts.length) this.doPass(p, null, opts[0].q);
        else { const fwd = t.players.filter(q => POS_LINE[q.slotPos] === 'M'); this.doPass(p, null, fwd[Math.floor(rnd() * fwd.length)]); }
      }
      return;
    }
    let tgt;
    const shotIn = b.shot && b.shot.team !== t && b.vx * inward < 0;
    if (shotIn) {
      const tHit = (p.x - b.x) / (b.vx || 1e-6);
      const yInt = tHit > 0 ? b.y + b.vy * tHit : b.y;
      if (!p.reactShot || p.reactShot.id !== b.shot.id) p.reactShot = { id: b.shot.id, t: 0.3 - p.a.ref / 500 + (b.shot.finesse ? 0.12 : 0) + (t.cpu ? (0.5 - t.skill) * 0.12 : 0) };
      p.reactShot.t -= dt;
      if (p.reactShot.t <= 0) {
        tgt = { x: p.x, y: clamp(yInt, gy - P.GW - 25, gy + P.GW + 25) };
        const dy = tgt.y - p.y, sp = 240 + p.a.div * 2.6;
        p.dvx = 0; p.dvy = Math.sign(dy) * Math.min(Math.abs(dy) * 12, sp); p.diving = 0.5;
        return;
      }
      p.dvx = p.dvy = 0; return;
    }
    p.diving = Math.max(0, (p.diving || 0) - dt);
    const ballDist = Math.hypot(b.x - gx, b.y - gy);
    const loose = !b.owner;
    if (loose && this.inOwnBox(b, t) && Math.hypot(b.vx, b.vy) < 450 && (dist(p, b) < 130)) { tgt = { x: b.x, y: b.y }; p.sprint = true; }
    else if (b.owner && b.owner.team !== t && this.inOwnBox(b.owner) && dist(p, b.owner) < 90 && ballDist < 140) { tgt = { x: b.owner.x, y: b.owner.y }; p.sprint = true; }
    else {
      const ux = (b.x - gx) / (ballDist || 1), uy = (b.y - gy) / (ballDist || 1);
      const out = clamp(ballDist * 0.12, 10, 62);
      tgt = { x: gx + ux * out, y: clamp(gy + uy * out, gy - P.GW - 12, gy + P.GW + 12) };
    }
    this.steer(p, tgt, p.sprint);
    // GK tackle on attacker in the box
    if (b.owner && b.owner.team !== t && dist(p, b.owner) < p.r * 2 + 10 && p.tackleCD <= 0 && this.state === 'play') {
      p.contactT += dt; if (p.contactT > 0.25) { p.tackleCD = 1.2; p.contactT = 0; if (rnd() < 0.35 + (p.a.gk - 60) / 120 && !(b.owner.fx.magnet > 0)) { b.owner.stun = 0.5; b.owner.kickCD = 0.5; this.takeBall(p); } else p.stun = 0.4; }
    }
  }

  celebrate(dt) {
    const sc = this.goalScorerP;
    for (const t of this.teams) for (const p of t.players) {
      if (t === this.goalTeam && !p.isGK) { this.steer(p, { x: sc.x + (p.num % 5 - 2) * 14, y: sc.y + (p.num % 3 - 1) * 14 }); }
      else { p.dvx *= 0.9; p.dvy *= 0.9; }
    }
    if (sc) { sc.dvx = Math.cos(this.clock * 3) * 60; sc.dvy = Math.sin(this.clock * 3) * 60; this.clock += 0; }
    this.moveAll(dt, true);
  }

  /* ---------- physics ---------- */
  moveAll(dt, noBall) {
    for (const t of this.teams) for (const p of t.players) {
      for (const k in p.fx) if (typeof p.fx[k] === 'number') p.fx[k] = Math.max(0, p.fx[k] - dt);
      if (p.fx.glow) { p.fx.glow.t -= dt; if (p.fx.glow.t <= 0) p.fx.glow = null; }
      p.tackleCD -= dt; p.kickCD -= dt; p.stun = Math.max(0, p.stun - dt); p.receiving = Math.max(0, p.receiving - dt);
      if (p.lunge > 0) {
        p.lunge -= dt;
        const b = this.ball, car = b.owner;
        if (!p.lungeHit && car && car.team !== t && dist(p, car) < p.r * 2 + 12 + (p.fx.wall > 0 ? 14 : 0)) { p.lungeHit = true; this.tryTackle(p, car); }
        if (p.lunge <= 0 && !p.lungeHit && !(b.owner === p)) p.stun = Math.max(p.stun, 0.3);
      } else {
        const ax = p.dvx - p.vx, ay = p.dvy - p.vy, al = Math.hypot(ax, ay), acc = (this.ball.owner === p ? 700 : p.isGK && p.diving > 0 ? 5000 : 1000) * dt;
        if (al > acc) { p.vx += ax / al * acc; p.vy += ay / al * acc; } else { p.vx = p.dvx; p.vy = p.dvy; }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.x = clamp(p.x, -28, P.L + 28); p.y = clamp(p.y, -24, P.H + 24);
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 15) {
        const ta = Math.atan2(p.vy, p.vx);
        const rate = (this.ball.owner === p ? 5 + p.a.dri / 16 + (p.fx.magnet > 0 ? 8 : 0) : 14) * dt;
        const d = angDiff(p.face, ta); p.face += clamp(d, -rate, rate);
      }
      p.anim += sp * dt * 0.08;
      if (p.sprint && sp > 60) p.stamina = Math.max(0, p.stamina - (13 - p.a.phy / 12) * dt);
      else p.stamina = Math.min(100, p.stamina + 4 * dt);
    }
    // separation
    const all = this.teams[0].players.concat(this.teams[1].players);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], c = all[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy), min = a.r + c.r;
      if (d < min && d > 0.01) {
        const push = (min - d) / 2, nx = dx / d, ny = dy / d;
        a.x -= nx * push; a.y -= ny * push; c.x += nx * push; c.y += ny * push;
        if (a.team !== c.team && !noBall) {
          if (a.fx.tank > 0 && this.ball.owner === a) c.stun = Math.max(c.stun, 0.7);
          if (c.fx.tank > 0 && this.ball.owner === c) a.stun = Math.max(a.stun, 0.7);
        }
      }
    }
  }
  ballStep(dt) {
    const b = this.ball, o = b.owner;
    if (o) {
      const off = b.inHands ? 6 : o.r + 5;
      const tx = o.x + Math.cos(o.face) * off, ty = o.y + Math.sin(o.face) * off;
      const k = Math.min(1, dt * 22);
      b.vx = (tx - b.x) / dt * k; b.vy = (ty - b.y) / dt * k;
      b.x += (tx - b.x) * k; b.y += (ty - b.y) * k;
      b.z = b.inHands ? 10 : 0; b.vz = 0;
      b.spin += Math.hypot(o.vx, o.vy) * dt * 0.15;
      if (this.state === 'play' && (b.x < -1 || b.x > P.L + 1 || b.y < -1 || b.y > P.H + 1)) { b.owner = null; b.lastTouch = o; }
      return;
    }
    this.ballPhysics(dt, false);
  }
  ballPhysics(dt, inNet) {
    const b = this.ball;
    if (b.z > 0 || b.vz > 0) {
      b.vz -= GRAV * dt; b.z += b.vz * dt;
      if (b.z <= 0) { b.z = 0; b.vz = b.vz < -70 ? -b.vz * 0.45 : 0; }
    }
    const fr = b.z > 1 ? 0.12 : 1.15;
    const f = Math.exp(-fr * dt); b.vx *= f; b.vy *= f;
    if (b.curve) {
      if (!b.shot || Math.hypot(b.vx, b.vy) < 200) b.curve = null;
      else { b.vx += b.curve.x * dt; b.vy += b.curve.y * dt; }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.spin += Math.hypot(b.vx, b.vy) * dt * 0.15;
    if (Math.hypot(b.vx, b.vy) < 5) { b.vx = b.vy = 0; }
    if (inNet) {
      const gx = b.x < P.L / 2 ? 0 : P.L, back = gx === 0 ? -20 : P.L + 20;
      if ((gx === 0 && b.x < back) || (gx === P.L && b.x > back)) { b.x = back; b.vx *= -0.2; }
      if (Math.abs(b.y - P.H / 2) > P.GW - 3 && Math.abs(b.x - gx) < 22 && (gx === 0 ? b.x < 0 : b.x > P.L)) { b.y = P.H / 2 + Math.sign(b.y - P.H / 2) * (P.GW - 3); b.vy *= -0.3; }
      if (b.z > P.BAR - 4) { b.z = P.BAR - 4; b.vz = -20; }
    }
  }
  interactions(dt) {
    const b = this.ball;
    // goalkeeper saves
    if (b.shot) for (const t of this.teams) {
      if (t === b.shot.team) continue;
      const gk = t.players.find(p => p.isGK); if (!gk || gk.rolled === b.shot.id) continue;
      const reach = gk.r + 11 + gk.a.div * 0.13 + (gk.diving > 0 ? 7 : 0);
      if (dist(gk, b) < reach && b.z < 20 + gk.a.div * 0.12) {
        gk.rolled = b.shot.id; t.stats; this.other(t).stats.onTarget++;
        const spd = Math.hypot(b.vx, b.vy);
        const close = clamp(1 - dist(gk, b) / reach, 0, 1);
        let ch = 0.6 + close * 0.4 + (gk.a.gk - 70) / 90 - (spd - 700) / 1300 - (b.shot.finesse ? 0.2 : 0) - (b.shot.rocket ? 0.14 : 0) + (gk.card.traits.includes('cat') ? 0.12 : 0);
        if (t.cpu) ch += (t.skill - 0.5) * 0.2;
        ch = clamp(ch, 0.06, 0.93);
        if (rnd() < ch) {
          if (spd < 640 && rnd() < gk.a.han / 115) { this.takeBall(gk); this.say('SAVED!', gk.card.name, 1); }
          else {
            const inward = t.dir;
            b.vx = Math.abs(b.vx) * 0.3 * inward + inward * 60; b.vy = (rnd() - 0.5) * 520 + b.vy * 0.2; b.vz = 60 + rnd() * 160;
            b.shot = null; b.curve = null; b.lastTouch = gk; gk.kickCD = 0.45;
            this.say('WHAT A SAVE!', gk.card.name, 1); this.sfx.ooh();
          }
          return;
        }
      }
    }
    if (b.owner) return;
    // loose ball control
    const spd = Math.hypot(b.vx, b.vy);
    let best = null, bd = 1e9;
    for (const t of this.teams) for (const p of t.players) {
      if (p.kickCD > 0 || p.stun > 0) continue;
      const boxGK = p.isGK && this.inOwnBox(p);
      const d = dist(p, b); if (d > p.r + 6 + (boxGK ? 6 : 0)) continue;
      if (b.z > (boxGK ? 34 : 14)) continue;
      if (b.shot && p.isGK && b.shot.team !== t && p.rolled !== b.shot.id) continue; // save logic handles it
      if (b.shot && b.shot.team === t) continue;
      if (d < bd) { bd = d; best = p; }
    }
    if (!best) return;
    const p = best;
    if (b.shot && b.shot.team !== p.team) {
      if (p.isGK) return;
      p.kickCD = 0.4;
      if (rnd() < 0.35 + p.a.def / 400) { const a = Math.atan2(b.vy, b.vx) + Math.PI + gaussR() * 0.9; b.vx = Math.cos(a) * spd * 0.35; b.vy = Math.sin(a) * spd * 0.35; b.vz = 80; b.shot = null; b.curve = null; b.lastTouch = p; this.say('BLOCKED', p.card.name, 0.8); this.sfx.tackle(); }
      return;
    }
    const ok = spd < 300 || (b.passTarget === p && spd < 900) || rnd() < 0.55 + p.a.dri / 250 - (spd - 300) / 900;
    if (ok) this.takeBall(p);
    else { const a = Math.atan2(b.vy, b.vx) + gaussR() * 0.8; b.vx = Math.cos(a) * spd * 0.45; b.vy = Math.sin(a) * spd * 0.45; b.lastTouch = p; p.kickCD = 0.35; b.passTarget = null; }
  }
  checkBounds() {
    const b = this.ball, gy = P.H / 2;
    if (b.owner) return;
    // posts
    for (const gx of [0, P.L]) for (const py of [gy - P.GW, gy + P.GW]) {
      const dx = b.x - gx, dy = b.y - py, d = Math.hypot(dx, dy);
      if (d < 6 && b.z < P.BAR) {
        const nx = dx / (d || 1), ny = dy / (d || 1), vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; b.x = gx + nx * 6; b.y = py + ny * 6; this.say('OFF THE POST!', '', 1); this.sfx.ooh(); b.shot = null; b.curve = null; }
      }
    }
    for (const gx of [0, P.L]) {
      const crossed = gx === 0 ? b.x < 0 : b.x > P.L;
      if (!crossed) continue;
      const inMouth = Math.abs(b.y - gy) < P.GW;
      if (inMouth && b.z < P.BAR) return this.goal(this.teams.find(t => this.oppGoalX(t) === gx));
      if (inMouth && b.z < P.BAR + 5 && b.vz > -50) { b.vx = -b.vx * 0.5; b.x = gx === 0 ? 1 : P.L - 1; b.vz = -40; this.say('CROSSBAR!', '', 1); this.sfx.ooh(); b.shot = null; return; }
      if (b.shot) this.sfx.ooh();
      return this.doGoalLineOut(gx);
    }
    if (b.y < 0 || b.y > P.H) this.doThrowIn(b.x, b.y);
  }
  goal(team) {
    const b = this.ball, lt = b.lastTouch, og = lt && lt.team !== team;
    team.score++;
    if (b.shot && b.shot.team === team) team.stats.onTarget++;
    const scorer = lt ? lt.card.name : '';
    this.events.push({ team: team.idx, minute: Math.max(1, this.minute()), scorer, og, pid: lt ? lt.card.id : null });
    this.goalTeam = team; this.goalScorerP = lt && lt.team === team ? lt : team.players[9]; this.goalConceder = this.other(team).idx;
    this.state = 'goal'; this.stateT = 3.2; b.shot = null; b.curve = null; b.passTarget = null;
    this.other(team).meter = Math.min(100, this.other(team).meter + 25);
    this.say('GOAL!', og ? `${scorer} (own goal)` : `${scorer} ${this.minute()}'`, 3, team.c1);
    this.sfx.roar(); this.shake = 0.8;
    const gx = this.oppGoalX(team);
    for (let i = 0; i < 70; i++) this.parts.push({ x: gx, y: P.H / 2 + gaussR() * 40, vx: -team.dir * (rnd() * 300) + gaussR() * 80, vy: gaussR() * 220, t: 1.2 + rnd(), c: rnd() < 0.5 ? team.c1 : team.c2 });
  }

  /* =========================================================
     Rendering
     ========================================================= */
  draw() {
    const c = this.ctx, b = this.ball, z = this.zoom * this.dpr;
    const vw = this.vw / this.zoom, vh = this.vh / this.zoom;
    // camera follows ball with a little lead
    const lead = b.owner ? { x: Math.cos(b.owner.face) * 60, y: Math.sin(b.owner.face) * 30 } : { x: b.vx * 0.15, y: b.vy * 0.1 };
    const tx = b.x + lead.x, ty = b.y + lead.y;
    this.cam.x += (tx - this.cam.x) * 0.08; this.cam.y += (ty - this.cam.y) * 0.08;
    const mx = 60, my = 50;
    const cx = vw >= P.L + 2 * mx ? P.L / 2 : clamp(this.cam.x, vw / 2 - mx, P.L + mx - vw / 2);
    const cy = vh >= P.H + 2 * my ? P.H / 2 : clamp(this.cam.y, vh / 2 - my, P.H + my - vh / 2);
    const sx = this.shake > 0 ? gaussR() * this.shake * 4 : 0, sy = this.shake > 0 ? gaussR() * this.shake * 4 : 0;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#1d4d24'; c.fillRect(0, 0, this.cv.width, this.cv.height);
    c.setTransform(z, 0, 0, z, (-cx + vw / 2 + sx) * z, (-cy + vh / 2 + sy) * z);
    this.drawPitch(c);
    this.drawGoal(c, 0, false); this.drawGoal(c, P.L, false);
    // shadows
    const all = this.teams[0].players.concat(this.teams[1].players);
    c.fillStyle = 'rgba(0,0,0,.28)';
    for (const p of all) { c.beginPath(); c.ellipse(p.x + 3, p.y + 4, 10, 6, 0, 0, Math.PI * 2); c.fill(); }
    c.beginPath(); c.ellipse(b.x + 2 + b.z * 0.5, b.y + 3 + b.z * 0.3, 4, 2.6, 0, 0, Math.PI * 2); c.fill();
    // humans' rings
    for (const h of this.humans) if (h.player) {
      const p = h.player; c.strokeStyle = h.color; c.lineWidth = 2;
      c.beginPath(); c.ellipse(p.x, p.y + 3, 14, 9, 0, 0, Math.PI * 2); c.stroke();
    }
    // pass target hint
    if (b.passTarget && !b.owner) { const p = b.passTarget; c.strokeStyle = 'rgba(255,255,255,.5)'; c.setLineDash([3, 3]); c.beginPath(); c.arc(p.x, p.y, 15, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
    const items = all.map(p => ({ y: p.y, p })); items.push({ y: b.y, ball: true });
    items.sort((a, d) => a.y - d.y);
    for (const it of items) it.ball ? this.drawBall(c) : this.drawPlayer(c, it.p);
    this.drawGoal(c, 0, true); this.drawGoal(c, P.L, true);
    for (const q of this.parts) { c.globalAlpha = Math.min(1, q.t * 2); c.fillStyle = q.c; c.fillRect(q.x - 2, q.y - 2, 4, 4); }
    c.globalAlpha = 1;
    // labels above humans
    for (const h of this.humans) if (h.player) {
      const p = h.player;
      c.fillStyle = h.color; c.beginPath(); c.moveTo(p.x, p.y - 18); c.lineTo(p.x - 5, p.y - 26); c.lineTo(p.x + 5, p.y - 26); c.fill();
      c.font = '700 8px "Barlow Condensed", sans-serif'; c.textAlign = 'center';
      c.fillStyle = 'rgba(0,0,0,.6)'; const name = `${h.label} · ${p.card.name}`; const w = c.measureText(name).width + 8;
      c.fillRect(p.x - w / 2, p.y + 14, w, 10); c.fillStyle = '#fff'; c.fillText(name, p.x, p.y + 22);
      if (h.charging) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(p.x - 16, p.y - 36, 32, 5); c.fillStyle = h.charge > 0.85 ? '#ff4d4d' : '#ffd84d'; c.fillRect(p.x - 15, p.y - 35, 30 * h.charge, 3); }
    }
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawHUD(c);
  }
  drawPitch(c) {
    const L = P.L, H = P.H;
    c.fillStyle = '#2f7d32'; c.fillRect(-80, -70, L + 160, H + 140);
    for (let i = 0; i < 14; i++) { c.fillStyle = i % 2 ? '#358a37' : '#2f8034'; c.fillRect(i * L / 14, 0, L / 14 + 0.5, H); }
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2;
    c.strokeRect(0, 0, L, H);
    c.beginPath(); c.moveTo(L / 2, 0); c.lineTo(L / 2, H); c.stroke();
    c.beginPath(); c.arc(L / 2, H / 2, 91.5, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(L / 2, H / 2, 3, 0, Math.PI * 2); c.fill();
    for (const s of [0, 1]) {
      const x = s ? L : 0, d = s ? -1 : 1;
      c.strokeRect(s ? L - P.BOX_D : 0, H / 2 - P.BOX_W, P.BOX_D, P.BOX_W * 2);
      c.strokeRect(s ? L - P.SIX_D : 0, H / 2 - P.SIX_W, P.SIX_D, P.SIX_W * 2);
      c.beginPath(); c.arc(x + d * 110, H / 2, 3, 0, Math.PI * 2); c.fill();
      c.beginPath(); const a = Math.acos((P.BOX_D - 110) / 91.5);
      if (s) c.arc(x - 110, H / 2, 91.5, Math.PI - a, Math.PI + a); else c.arc(110, H / 2, 91.5, -a, a); c.stroke();
      for (const cy of [0, H]) { c.beginPath(); c.arc(x, cy, 10, cy ? (s ? Math.PI : 1.5 * Math.PI) : (s ? 0.5 * Math.PI : 0), cy ? (s ? 1.5 * Math.PI : 2 * Math.PI) : (s ? Math.PI : 0.5 * Math.PI)); c.stroke(); }
    }
    // ad boards
    c.fillStyle = '#0d1424'; c.fillRect(-80, -62, L + 160, 22); c.fillRect(-80, H + 40, L + 160, 22);
    c.font = '800 14px "Barlow Condensed", sans-serif'; c.textAlign = 'center';
    const ads = ['OHANA FC 27', 'ULTIMATE CLUB', 'GOLDEN BOOTS CO.', 'NOVA ENERGY', 'OHANA FC 27', 'ROCKET COLA'];
    ads.forEach((t, i) => { c.fillStyle = i % 2 ? '#00f0a8' : '#f5c84c'; c.fillText(t, -40 + (i + 0.5) * (L + 80) / ads.length, -46); c.fillText(t, -40 + (i + 0.5) * (L + 80) / ads.length, H + 56); });
  }
  drawGoal(c, gx, front) {
    const d = gx === 0 ? -1 : 1, gy = P.H / 2, depth = 22;
    if (!front) {
      c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(gx, gy - P.GW, d * depth, P.GW * 2);
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.6;
      for (let i = 0; i <= depth; i += 5) { c.beginPath(); c.moveTo(gx + d * i, gy - P.GW); c.lineTo(gx + d * i, gy + P.GW); c.stroke(); }
      for (let j = -P.GW; j <= P.GW; j += 6) { c.beginPath(); c.moveTo(gx, gy + j); c.lineTo(gx + d * depth, gy + j); c.stroke(); }
    } else {
      c.strokeStyle = '#fff'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(gx, gy - P.GW); c.lineTo(gx + d * depth, gy - P.GW); c.lineTo(gx + d * depth, gy + P.GW); c.lineTo(gx, gy + P.GW); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(gx, gy - P.GW, 3, 0, Math.PI * 2); c.arc(gx, gy + P.GW, 3, 0, Math.PI * 2); c.fill();
    }
  }
  drawPlayer(c, p) {
    const t = p.team, f = p.face, cs = Math.cos(f), sn = Math.sin(f);
    const sp = Math.hypot(p.vx, p.vy), swing = sp > 20 ? Math.sin(p.anim) * 5 : 0;
    if (p.fx.glow) { c.fillStyle = p.fx.glow.color; c.globalAlpha = 0.28 + 0.12 * Math.sin(performance.now() / 90); c.beginPath(); c.arc(p.x, p.y, 17, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
    // legs
    c.strokeStyle = '#151515'; c.lineWidth = 3.4; c.lineCap = 'round';
    for (const s of [-1, 1]) { const ox = -sn * s * 4, oy = cs * s * 4; c.beginPath(); c.moveTo(p.x + ox, p.y + oy); c.lineTo(p.x + ox + cs * swing * s, p.y + oy + sn * swing * s); c.stroke(); }
    // body
    const kit = p.isGK ? t.gkc : t.c1;
    c.fillStyle = kit; c.strokeStyle = p.isGK ? '#222' : t.c2; c.lineWidth = 2;
    c.beginPath(); c.ellipse(p.x, p.y, 8.5, 8.5, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    // shoulders/arms
    c.fillStyle = p.isGK ? '#222' : t.c2;
    c.beginPath(); c.arc(p.x - sn * 8, p.y + cs * 8, 2.6, 0, Math.PI * 2); c.arc(p.x + sn * 8, p.y - cs * 8, 2.6, 0, Math.PI * 2); c.fill();
    // head
    c.fillStyle = SKIN[p.card.look.skin]; c.beginPath(); c.arc(p.x + cs * 1.5, p.y + sn * 1.5, 4.6, 0, Math.PI * 2); c.fill();
    if (p.card.look.hair !== 3) { c.fillStyle = HAIR[p.card.look.hairColor]; c.beginPath(); c.arc(p.x - cs * 0.5, p.y - sn * 0.5, 4.2, 0, Math.PI * 2); c.fill(); }
    if (p.stun > 0) { c.fillStyle = '#ffe14d'; c.font = '8px sans-serif'; c.textAlign = 'center'; c.fillText('✶', p.x + 6, p.y - 10); }
    // number
    c.fillStyle = p.isGK ? '#111' : t.c2; c.font = '700 6px "Barlow Condensed", sans-serif'; c.textAlign = 'center';
    c.fillText(p.num, p.x - cs * 4.5, p.y - sn * 4.5 + 2);
  }
  drawBall(c) {
    const b = this.ball, r = 4 + b.z * 0.04, y = b.y - b.z * 0.8;
    c.fillStyle = '#fff'; c.strokeStyle = '#222'; c.lineWidth = 0.8;
    c.beginPath(); c.arc(b.x, y, r, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#222'; c.beginPath(); c.arc(b.x + Math.cos(b.spin) * r * 0.45, y + Math.sin(b.spin) * r * 0.45, r * 0.38, 0, Math.PI * 2); c.fill();
    if (b.shot && Math.hypot(b.vx, b.vy) > 500) { c.strokeStyle = b.shot.rocket ? 'rgba(255,120,40,.7)' : 'rgba(255,255,255,.35)'; c.lineWidth = r * 1.5; c.beginPath(); c.moveTo(b.x, y); c.lineTo(b.x - b.vx * 0.04, y - b.vy * 0.04); c.stroke(); }
  }
  drawHUD(c) {
    const W = this.vw, H = this.vh, [t0, t1] = this.teams;
    // scoreboard
    c.font = '800 20px "Barlow Condensed", sans-serif'; c.textBaseline = 'middle';
    const x = 16, y = 14, hgt = 34;
    const box = (bx, w, fill) => { c.fillStyle = fill; c.fillRect(bx, y, w, hgt); };
    box(x, 64, t0.c1); box(x + 64, 92, '#0b0f1a'); box(x + 156, 64, t1.c1); box(x + 220, 64, '#00f0a8');
    c.textAlign = 'center';
    c.fillStyle = this.textOn(t0.c1); c.fillText(t0.short, x + 32, y + hgt / 2 + 1);
    c.fillStyle = '#fff'; c.fillText(`${t0.score}  -  ${t1.score}`, x + 110, y + hgt / 2 + 1);
    c.fillStyle = this.textOn(t1.c1); c.fillText(t1.short, x + 188, y + hgt / 2 + 1);
    c.fillStyle = '#04110c'; c.fillText(`${this.minute()}'`, x + 252, y + hgt / 2 + 1);
    // power meters
    const meter = (mx, t, label) => {
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(mx, y + hgt + 4, 120, 14);
      const full = t.meter >= 100;
      c.fillStyle = full ? `hsl(${(performance.now() / 6) % 360},90%,60%)` : '#f5c84c'; c.fillRect(mx + 2, y + hgt + 6, 116 * t.meter / 100, 10);
      c.font = '700 10px "Barlow Condensed", sans-serif'; c.fillStyle = full ? '#000' : '#fff'; c.textAlign = 'left';
      c.fillText(full ? `${label} POWER READY` : `${label} POWER`, mx + 5, y + hgt + 11.5);
    };
    meter(x, t0, t0.short); meter(x + 156, t1, t1.short);
    // human info
    c.textAlign = 'right'; c.font = '700 13px "Barlow", sans-serif';
    this.humans.forEach((h, i) => {
      const p = h.player; if (!p) return;
      const tr = p.card.traits.find(q => q !== 'cat');
      const txt = `${h.label}: ${p.card.name} (${p.card.ovr} ${p.card.pos})${tr ? ` · ${TRAITS[tr].icon} ${TRAITS[tr].name}` : ''}`;
      c.fillStyle = 'rgba(0,0,0,.55)'; const w = c.measureText(txt).width + 20; c.fillRect(W - w - 12, 14 + i * 26, w, 22);
      c.fillStyle = h.color; c.fillText(txt, W - 22, 25 + i * 26);
    });
    // minimap
    const mw = Math.min(220, W * 0.3), mh = mw * P.H / P.L, mx0 = W / 2 - mw / 2, my0 = H - mh - 12;
    c.fillStyle = 'rgba(10,30,15,.65)'; c.fillRect(mx0, my0, mw, mh);
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1; c.strokeRect(mx0, my0, mw, mh);
    c.beginPath(); c.moveTo(mx0 + mw / 2, my0); c.lineTo(mx0 + mw / 2, my0 + mh); c.stroke();
    for (const t of this.teams) for (const p of t.players) {
      c.fillStyle = (t.human && t.human.player === p) ? t.human.color : t.c1;
      c.beginPath(); c.arc(mx0 + p.x / P.L * mw, my0 + p.y / P.H * mh, 2.6, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(mx0 + this.ball.x / P.L * mw, my0 + this.ball.y / P.H * mh, 2, 0, Math.PI * 2); c.fill();
    // message
    if (this.msg) {
      const m = this.msg, a = Math.min(1, m.t * 3, (m.max - m.t) * 6 + 0.3);
      const big = m.text === 'GOAL!';
      c.globalAlpha = a; c.textAlign = 'center';
      const sc = big ? 1 + Math.max(0, 0.3 - (m.max - m.t)) * 2 : 1;
      c.font = `800 ${Math.round((big ? 96 : 44) * sc)}px "Barlow Condensed", sans-serif`;
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillText(m.text, W / 2 + 3, H * 0.36 + 3);
      c.fillStyle = m.color || '#fff'; c.fillText(m.text, W / 2, H * 0.36);
      if (big) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeText(m.text, W / 2, H * 0.36); }
      if (m.sub) { c.font = '700 20px "Barlow", sans-serif'; c.fillStyle = '#fff'; c.fillText(m.sub, W / 2, H * 0.36 + (big ? 62 : 36)); }
      c.globalAlpha = 1;
    }
    c.textBaseline = 'alphabetic';
  }
  textOn(hex) { const h = hex.replace('#', ''); const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16); return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111' : '#fff'; }
}
