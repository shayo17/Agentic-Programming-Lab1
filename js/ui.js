'use strict';
/* =========================================================
   UI: screens, Kick-Off setup, match screen, results
   ========================================================= */
const $ = (s, el = document) => el.querySelector(s);
const app = () => document.getElementById('app');
const SETTINGS_KEY = 'ohanaFC27.settings';
const Settings = Object.assign({ muted: false, duration: 300, difficulty: 2 }, (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; } })());
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(Settings)); } catch (e) { } }

const DIFFICULTIES = [
  { name: 'Amateur', skill: 0.2 }, { name: 'Semi-Pro', skill: 0.4 }, { name: 'Professional', skill: 0.6 },
  { name: 'World Class', skill: 0.8 }, { name: 'Legendary', skill: 0.97 },
];
const DURATIONS = [{ s: 180, label: '3 min' }, { s: 300, label: '5 min' }, { s: 480, label: '8 min' }, { s: 720, label: '12 min' }];

let sfx = null;
function getSfx() { if (!sfx) sfx = new Sfx(); sfx.setMuted(Settings.muted); if (sfx.ctx && sfx.ctx.state === 'suspended') sfx.ctx.resume(); return sfx; }

/* ---------- Teams available in Kick-Off ---------- */
function kickoffTeams() {
  const list = CLUBS.filter(c => c.tier).map(c => {
    const cards = clubSquad(c.id);
    return { key: c.id, name: c.name, short: c.id, c1: c.c1, c2: c.c2, formation: '4-3-3', cards, ovr: teamRating(cards, '4-3-3') };
  });
  const legends = bestXI(PLAYERS.filter(p => p.rarity === 'icon' || p.rarity === 'hero'), '4-3-3');
  list.unshift({ key: 'LEG', name: 'Legends XI', short: 'LEG', c1: '#f5ecd0', c2: '#8a6d1f', formation: '4-3-3', cards: legends, ovr: teamRating(legends, '4-3-3') });
  if (typeof Career !== 'undefined' && Career.exists()) {
    const u = Career.matchTeam();
    if (u) list.unshift({ key: 'UT', ...u, ovr: teamRating(u.cards, u.formation), mine: true });
  }
  return list;
}

/* ---------- Title screen ---------- */
let keyHandler = null;
function onKeys(fn) { if (keyHandler) removeEventListener('keydown', keyHandler); keyHandler = fn; if (fn) addEventListener('keydown', fn); }
function showTitle() {
  const fan = ['Lacaze', 'Ferraz', 'Delacroix'].map(n => PLAYERS.find(p => p.name === n));
  app().innerHTML = `
  <section class="title-screen" id="title">
    <div class="beams" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="pitch-lines" aria-hidden="true"></div>
    <div class="title-fan" aria-hidden="true">${fan.map((p, i) => cardHTML(p, { size: 15, cls: `fan fan-${i}` })).join('')}</div>
    <div class="title-copy">
      <p class="eyebrow">The 2027 season</p>
      <h1 class="game-logo"><span class="lg-ohana">Ohana</span><span class="lg-fc">FC</span><span class="lg-27">27</span></h1>
      <p class="title-sub">Collect cards. Unleash special powers. Build your Ultimate Team.</p>
      <button class="press-start" id="start">Press <kbd>Enter</kbd> to start</button>
    </div>
  </section>`;
  const go = () => { getSfx(); showModes(); };
  $('#start').onclick = go;
  onKeys(e => { if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') { e.preventDefault(); go(); } });
}

/* ---------- Mode select ---------- */
function showModes() {
  const hasCareer = typeof Career !== 'undefined';
  app().innerHTML = `
  <section class="screen page modes">
    <div class="page-head"><button class="btn ghost small" id="back">← Title</button><h2 class="brand-small">Ohana FC 27</h2></div>
    <p class="eyebrow">Choose a mode</p>
    <div class="mode-cards">
      <button class="mode-card kick" id="m-kick">
        <span class="mc-num">01</span>
        <b>Kick-Off</b>
        <span>Jump straight into a match. Play against the computer, or challenge a friend on the same keyboard.</span>
        <span class="mc-tags"><i>vs Computer</i><i>2 Players</i></span>
      </button>
      <button class="mode-card career" id="m-career">
        <span class="mc-num">02</span>
        <b>Ultimate Team Career</b>
        <span>${hasCareer ? 'Start with a bronze squad. Win matches for coins, complete missions, open packs and buy better players.' : 'Start with a bronze squad, earn coins and packs, and climb to Division 1. Arriving in the next update.'}</span>
        <span class="mc-tags"><i>Packs</i><i>Missions</i><i>Transfer market</i></span>
      </button>
    </div>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="m-ctl">Controls</button></div>
  </section>`;
  $('#back').onclick = showTitle;
  $('#m-kick').onclick = showKickoffType;
  $('#m-career').onclick = () => hasCareer ? Career.open() : toast('Ultimate Team Career is being built. Try Kick-Off for now.');
  $('#m-ctl').onclick = () => showControls(showModes);
  onKeys(e => { if (e.code === 'Escape') showTitle(); if (e.code === 'Digit1') showKickoffType(); if (e.code === 'Digit2') $('#m-career').click(); });
}
function showMenu() { showModes(); }

/* ---------- Kick-Off: vs CPU or 2 players ---------- */
function showKickoffType() {
  app().innerHTML = `
  <section class="screen page modes">
    <div class="page-head"><button class="btn ghost small" id="back">← Modes</button><h2>Kick-Off</h2></div>
    <p class="eyebrow">Who's playing?</p>
    <div class="mode-cards">
      <button class="mode-card" id="k-cpu"><span class="mc-num">1P</span><b>Play vs Computer</b><span>You control one team. Choose the difficulty from Amateur to Legendary.</span><span class="mc-tags"><i>Arrows + S D A</i><i>Gamepad</i></span></button>
      <button class="mode-card p2" id="k-2p"><span class="mc-num">2P</span><b>2 Players</b><span>Head to head on one keyboard. Player 1 uses W A S D, Player 2 uses the arrow keys. Gamepads work too.</span><span class="mc-tags"><i>Same keyboard</i><i>2 gamepads</i></span></button>
    </div>
  </section>`;
  $('#back').onclick = showModes;
  $('#k-cpu').onclick = () => { KO.mode = 'solo'; showKickoff(); };
  $('#k-2p').onclick = () => { KO.mode = '2p'; showKickoff(); };
  onKeys(e => { if (e.code === 'Escape') showModes(); if (e.code === 'Digit1') $('#k-cpu').click(); if (e.code === 'Digit2') $('#k-2p').click(); });
}

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- Controls ---------- */
function keycaps(k) { const t = k.split(' '); return t.every(x => x.length <= 1) ? t.map(x => `<kbd>${x}</kbd>`).join('') : `<kbd>${k}</kbd>`; }
function guideHTML(map, title, color) {
  return `<div class="guide" style="--gc:${color || 'var(--accent)'}"><h3>${title}</h3><dl>${KEY_GUIDE[map].map(([act, k]) => `<dt>${act}</dt><dd>${keycaps(k)}</dd>`).join('')}</dl></div>`;
}
const GUIDE_TIPS = `<ul class="tips">
    <li><b>Shooting:</b> hold the shoot key to fill the power bar above your player, then let go. Hold up or down while shooting to aim at a corner. Full power can fly over the bar.</li>
    <li><b>Defending:</b> get close to the player with the ball and press the defend key to tackle. Press switch to control the teammate nearest the ball.</li>
    <li><b>Special powers:</b> when the power bar under the score says READY, press the special key. Your player's power is shown at the top right.</li>
    <li>Press <kbd>H</kbd> during a match to show or hide this guide. Press <kbd>Esc</kbd> to pause.</li>
  </ul>`;
const CONTROLS_HTML = `<div class="controls-grid">${guideHTML('solo', 'Vs Computer', '#22e6ff')}${guideHTML('p1', '2 Players · Player 1', '#22e6ff')}${guideHTML('p2', '2 Players · Player 2', '#ff4f7b')}${guideHTML('pad', 'Gamepad', '#f5c84c')}</div>${GUIDE_TIPS}`;
function showControls(back) {
  onKeys(e => { if (e.code === 'Escape') back(); });
  app().innerHTML = `<section class="screen page"><div class="page-head"><button class="btn ghost small" id="back">← Back</button><h2>Controls</h2></div><div class="panel">${CONTROLS_HTML}</div></section>`;
  $('#back').onclick = back;
}

/* ---------- Kick-Off setup ---------- */
const KO = { mode: 'solo', home: 0, away: 3 };
function showKickoff() {
  const teams = kickoffTeams();
  KO.home = clamp(KO.home, 0, teams.length - 1); KO.away = clamp(KO.away, 0, teams.length - 1);
  if (KO.home === KO.away) KO.away = (KO.home + 1) % teams.length;
    const side = (i, which) => {
    const t = teams[i], stars = t.cards.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 3);
    const who = KO.mode === 'cpu' ? 'CPU' : which === 'home' ? 'P1' : KO.mode === '2p' ? 'P2' : 'CPU';
    return `<div class="team-pick" style="--kit:${t.c1};--kit2:${t.c2}">
      <div class="tp-top"><span class="ctl-tag ${who.toLowerCase()}">${who}</span><span class="muted">${which === 'home' ? 'Home' : 'Away'}</span></div>
      <div class="tp-row">
        <button class="arrow" data-t="${which}" data-d="-1" aria-label="Previous team">‹</button>
        <div class="tp-name"><div class="crest">${t.short}</div><h3>${t.name}</h3><div class="ovr-pill">OVR ${t.ovr}</div>${t.mine ? '<div class="muted">Your Ultimate Team</div>' : ''}</div>
        <button class="arrow" data-t="${which}" data-d="1" aria-label="Next team">›</button>
      </div>
      <div class="tp-cards">${stars.map(p => cardHTML(p, { size: 8.5 })).join('')}</div>
    </div>`;
  };
  app().innerHTML = `
  <section class="screen page kickoff">
    <div class="page-head"><button class="btn ghost small" id="back">← Back</button><h2>${KO.mode === '2p' ? '2 Players' : 'Play vs Computer'}</h2></div>
    <div class="versus">${side(KO.home, 'home')}<div class="vs">VS</div>${side(KO.away, 'away')}</div>
    <div class="ko-opts panel">
      ${KO.mode === '2p' ? '' : `<div class="opt"><label>CPU difficulty</label><div class="seg small">${DIFFICULTIES.map((d, i) => `<button class="${Settings.difficulty === i ? 'on' : ''}" data-diff="${i}">${d.name}</button>`).join('')}</div></div>`}
      <div class="opt"><label>Match length</label><div class="seg small">${DURATIONS.map(d => `<button class="${Settings.duration === d.s ? 'on' : ''}" data-dur="${d.s}">${d.label}</button>`).join('')}</div></div>
      <div class="opt"><label>Sound</label><div class="seg small"><button class="${!Settings.muted ? 'on' : ''}" data-snd="on">On</button><button class="${Settings.muted ? 'on' : ''}" data-snd="off">Off</button></div></div>
    </div>
    <div class="panel"><div class="controls-grid">${KO.mode === '2p' ? guideHTML('p1', 'Player 1', '#22e6ff') + guideHTML('p2', 'Player 2', '#ff4f7b') : guideHTML('solo', 'Your controls', '#22e6ff')}</div></div>
    <div class="row" style="justify-content:center;gap:14px">
      <button class="btn ghost" id="ctl">All controls</button>
      <button class="btn big" id="play">Play match</button>
    </div>
  </section>`;
  $('#back').onclick = showKickoffType;
  $('#ctl').onclick = () => showControls(showKickoff);
  onKeys(e => { if (e.code === 'Escape') showKickoffType(); if (e.code === 'Enter') $('#play').click(); });
  app().querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { Settings.difficulty = +b.dataset.diff; saveSettings(); showKickoff(); });
  app().querySelectorAll('[data-dur]').forEach(b => b.onclick = () => { Settings.duration = +b.dataset.dur; saveSettings(); showKickoff(); });
  app().querySelectorAll('[data-snd]').forEach(b => b.onclick = () => { Settings.muted = b.dataset.snd === 'off'; saveSettings(); showKickoff(); });
  app().querySelectorAll('.arrow').forEach(b => b.onclick = () => {
    const k = b.dataset.t, n = teams.length;
    let v = (KO[k] + +b.dataset.d + n) % n;
    if (v === KO[k === 'home' ? 'away' : 'home']) v = (v + +b.dataset.d + n) % n;
    KO[k] = v; showKickoff();
  });
  $('#play').onclick = () => {
    const control = KO.mode === 'solo' ? ['solo', 'cpu'] : KO.mode === '2p' ? ['p1', 'p2'] : ['cpu', 'cpu'];
    startMatch({ home: teams[KO.home], away: teams[KO.away], control, skill: DIFFICULTIES[Settings.difficulty].skill, duration: Settings.duration,
      onDone: res => showResult(res, [{ label: 'Rematch', fn: () => startMatch(lastMatchOpts) }, { label: 'Back to Kick-Off', fn: showKickoff }]) });
  };
}

/* ---------- Match screen ---------- */
let currentMatch = null, lastMatchOpts = null;
function startMatch(o) {
  lastMatchOpts = o; onKeys(null);
  if (currentMatch) currentMatch.destroy();
  app().innerHTML = `<section class="match-screen">
    <canvas id="pitch"></canvas>
    <div class="overlay" id="pause" hidden>
      <div class="panel pause-box">
        <h2>Paused</h2>
        <div class="col"><button class="btn" id="resume">Resume</button><button class="btn ghost" id="mute">${Settings.muted ? 'Sound on' : 'Sound off'}</button><button class="btn danger" id="quit">Quit match</button></div>
        <details><summary>Controls</summary>${CONTROLS_HTML}</details>
      </div>
    </div>
    <div class="key-guide" id="kguide">${o.control.filter(c => c !== 'cpu').map(c => guideHTML(c, c === 'p2' ? 'Player 2' : c === 'p1' ? 'Player 1' : 'Controls', c === 'p2' ? '#ff4f7b' : '#22e6ff')).join('')}<p>Press <kbd>H</kbd> to hide or show</p></div>
    <button class="pause-btn" id="pbtn" aria-label="Pause">❚❚</button>
  </section>`;
  const s = getSfx();
  currentMatch = new Match({
    canvas: $('#pitch'), home: o.home, away: o.away, control: o.control, skill: o.skill, duration: o.duration, sfx: s,
    onPause: p => { $('#pause').hidden = !p; },
    onGuide: () => { const g = $('#kguide'); if (g) { clearTimeout(g._t); g.hidden = !g.hidden; } },
    onEnd: res => { const m = currentMatch; setTimeout(() => { if (m) m.destroy(); currentMatch = null; o.onDone(res); }, 50); },
  });
  const kg = $('#kguide'); if (kg) kg._t = setTimeout(() => { kg.hidden = true; }, 9000);
  $('#resume').onclick = () => currentMatch.togglePause(false);
  $('#pbtn').onclick = () => currentMatch.togglePause(true);
  $('#mute').onclick = e => { Settings.muted = !Settings.muted; saveSettings(); s.setMuted(Settings.muted); e.target.textContent = Settings.muted ? 'Sound on' : 'Sound off'; };
  $('#quit').onclick = () => { currentMatch.destroy(); currentMatch = null; (o.onQuit || showKickoff)(); };
}

/* ---------- Result screen ---------- */
function showResult(res, actions, extraHTML = '') {
  onKeys(null);
  const [a, b] = res.score, s = res.stats;
  const row = (label, x, y, pct) => `<div class="st-row"><b>${x}${pct ? '%' : ''}</b><span>${label}</span><b>${y}${pct ? '%' : ''}</b></div>`;
  const goals = i => res.events.filter(e => e.team === i).map(e => `<div>${e.scorer}${e.og ? ' (OG)' : ''} ${e.minute}'</div>`).join('') || '<div class="muted">–</div>';
  app().innerHTML = `
  <section class="screen page result">
    <p class="eyebrow">Full time</p>
    <div class="final">
      <div class="f-team"><h3>${res.names[0]}</h3><div class="scorers">${goals(0)}</div></div>
      <div class="f-score">${a}<span>–</span>${b}</div>
      <div class="f-team"><h3>${res.names[1]}</h3><div class="scorers">${goals(1)}</div></div>
    </div>
    ${extraHTML}
    <div class="panel stats">
      ${row('Possession', s[0].possPct, s[1].possPct, true)}
      ${row('Shots', s[0].shots, s[1].shots)}
      ${row('On target', s[0].onTarget, s[1].onTarget)}
      ${row('Passes completed', `${s[0].passOk}/${s[0].passes}`, `${s[1].passOk}/${s[1].passes}`)}
      ${row('Tackles won', s[0].tackles, s[1].tackles)}
      ${row('Specials used', s[0].specials, s[1].specials)}
    </div>
    <div class="row" style="justify-content:center">${actions.map((x, i) => `<button class="btn ${i ? 'ghost' : ''}" data-act="${i}">${x.label}</button>`).join('')}</div>
  </section>`;
  app().querySelectorAll('[data-act]').forEach(b => b.onclick = () => actions[+b.dataset.act].fn());
}

window.addEventListener('DOMContentLoaded', showTitle);
