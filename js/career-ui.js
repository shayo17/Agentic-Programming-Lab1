'use strict';
/* =========================================================
   Ultimate Team Career — screens
   ========================================================= */
const CUI = { tab: 'home', sel: null, mk: { pos: 'all', rar: 'all', min: 0, q: '', page: 0, afford: false }, club: { pos: 'all' } };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

Career.open = function () { if (!this.load()) showCareerNew(); else showHub(CUI.tab); };

/* ---------- New career ---------- */
function showCareerNew() {
  let kit = 0;
  app().innerHTML = `
  <section class="screen page newcareer">
    <div class="page-head"><button class="btn ghost small" id="back">← Modes</button><h2>New Ultimate Team</h2></div>
    <div class="panel nc-panel">
      <div class="nc-form">
        <label for="club-name">Club name</label>
        <input id="club-name" maxlength="22" value="Ohana FC" autocomplete="off">
        <label>Kit colours</label>
        <div class="kits">${KITS.map((k, i) => `<button class="kit ${i === 0 ? 'on' : ''}" data-kit="${i}" style="--k1:${k[0]};--k2:${k[1]}" aria-label="Kit ${i + 1}"></button>`).join('')}</div>
        <ul class="nc-list">
          <li>You start in <b>Division 10</b> with a squad of 18 bronze players.</li>
          <li>Each season is ${SEASON_GAMES} matches. Get <b>${PROMO_PTS} points</b> to go up a division. Fewer than ${RELEG_PTS} and you go down.</li>
          <li>Win matches for <b>coins</b>. Complete <b>missions</b> for coins and packs. Spend coins in the <b>store</b> and the <b>transfer market</b>.</li>
          <li>Welcome gift: <span class="coins">2,500</span>, a Bronze Pack and a Silver Pack.</li>
        </ul>
        <button class="btn big" id="create">Start career</button>
      </div>
    </div>
  </section>`;
  $('#back').onclick = showModes;
  app().querySelectorAll('.kit').forEach(b => b.onclick = () => { kit = +b.dataset.kit; app().querySelectorAll('.kit').forEach(x => x.classList.toggle('on', x === b)); });
  $('#create').onclick = () => { Career.create($('#club-name').value.trim() || 'Ohana FC', kit); CUI.tab = 'home'; showHub('home'); };
  onKeys(e => { if (e.code === 'Escape') showModes(); });
}

/* ---------- Hub ---------- */
const TABS = [['home', 'Season'], ['squad', 'Squad'], ['store', 'Store'], ['market', 'Transfer Market'], ['missions', 'Missions'], ['club', 'My Club']];
function showHub(tab) {
  CUI.tab = tab || CUI.tab;
  const s = Career.s, claim = Career.claimable();
  app().innerHTML = `
  <section class="hub">
    <header class="hub-head">
      <div class="hub-in">
        <button class="btn ghost small" id="hub-back">← Modes</button>
        <div class="club-id"><div class="crest" style="--kit:${s.c1};--kit2:${s.c2}">${esc(s.short)}</div><div><h2>${esc(s.club)}</h2><div class="muted">Division ${s.division} · Season ${s.season.n}</div></div></div>
        <div class="hub-stats">
          <div><span>Coins</span><b class="coins" id="hub-coins">${fmt(s.coins)}</b></div>
          <div><span>Team rating</span><b>${Career.rating()}</b></div>
          <div><span>Unopened packs</span><b>${s.packs.length}</b></div>
        </div>
      </div>
      <nav class="tabs hub-in" role="tablist">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${CUI.tab === k}" class="${CUI.tab === k ? 'on' : ''}" data-tab="${k}">${l}${k === 'missions' && claim ? `<i class="dot">${claim}</i>` : ''}${k === 'store' && s.packs.length ? `<i class="dot">${s.packs.length}</i>` : ''}</button>`).join('')}</nav>
    </header>
    <div class="hub-body hub-in" id="tab"></div>
  </section>`;
  $('#hub-back').onclick = showModes;
  app().querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { CUI.sel = null; showHub(b.dataset.tab); });
  onKeys(e => { if (e.code === 'Escape' && !$('.pack-overlay')) showModes(); });
  ({ home: tabHome, squad: tabSquad, store: tabStore, market: tabMarket, missions: tabMissions, club: tabClub })[CUI.tab]($('#tab'));
}

/* ---------- Season tab ---------- */
function tabHome(el) {
  const s = Career.s, se = s.season, f = Career.nextFixture(), opp = Career.opponentTeam(f), oppOvr = teamRating(opp.cards, opp.formation);
  const myOvr = Career.rating(), pct = Math.min(100, se.pts / PROMO_PTS * 100);
  const diffWord = oppOvr - myOvr > 4 ? 'Tough' : oppOvr - myOvr < -4 ? 'Favourable' : 'Even';
  el.innerHTML = `
  <div class="home-grid">
    <div class="next panel">
      <p class="eyebrow">Match ${se.played + 1} of ${SEASON_GAMES} · Division ${s.division}</p>
      <div class="fixture">
        <div class="fx-team"><div class="crest big" style="--kit:${s.c1};--kit2:${s.c2}">${esc(s.short)}</div><b>${esc(s.club)}</b><span class="ovr-pill">OVR ${myOvr}</span></div>
        <div class="fx-vs">VS</div>
        <div class="fx-team"><div class="crest big" style="--kit:${opp.c1};--kit2:${opp.c2}">${opp.short}</div><b>${opp.name}</b><span class="ovr-pill">OVR ${oppOvr}</span></div>
      </div>
      <div class="fx-meta"><span class="chip-s ${diffWord.toLowerCase()}">${diffWord} match</span><span class="muted">${opp.formation} · CPU level ${Math.round(divSkill(s.division) * 100)}</span><span class="muted">Win: <span class="coins">${fmt(500 + (10 - s.division) * 90)}</span> + 60 per goal</span></div>
      <div class="row" style="justify-content:center"><button class="btn big" id="play-next">Play match</button></div>
      <div class="opp-stars">${opp.cards.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 4).map(p => cardHTML(p, { size: 7 })).join('')}</div>
    </div>
    <div class="col-stack">
      <div class="panel">
        <h3>Season ${se.n}</h3>
        <div class="season-line"><b>${se.pts}</b><span>points</span><span class="muted">${se.w}W ${se.d}D ${se.l}L · ${se.gf}-${se.ga}</span></div>
        <div class="promo-bar" role="progressbar" aria-valuenow="${se.pts}" aria-valuemax="${PROMO_PTS}"><i style="width:${pct}%"></i><em style="left:${RELEG_PTS / PROMO_PTS * 100}%"></em></div>
        <p class="muted small-text">${s.division === 1 ? `${PROMO_PTS} points wins the title.` : `${PROMO_PTS} points for promotion to Division ${s.division - 1}.`} ${s.division < 10 ? `Under ${RELEG_PTS} means relegation.` : ''}</p>
        <ol class="fixtures">${se.fixtures.map((x, i) => {
          const r = x.result, cls = !r ? (i === se.played ? 'next' : '') : r[0] > r[1] ? 'w' : r[0] === r[1] ? 'd' : 'l';
          return `<li class="${cls}"><span>${x.name}</span><b>${r ? `${r[0]}–${r[1]}` : i === se.played ? 'Next' : '–'}</b></li>`;
        }).join('')}</ol>
      </div>
      ${s.log.length ? `<div class="panel"><h3>History</h3><ul class="hist">${s.log.slice(0, 5).map(l => `<li>Season ${l.season} · Div ${l.div} · ${l.pts} pts · <b class="${l.outcome}">${l.outcome}</b></li>`).join('')}</ul></div>` : ''}
    </div>
  </div>`;
  $('#play-next').onclick = playCareerMatch;
}

function playCareerMatch() {
  const s = Career.s, f = Career.nextFixture();
  const home = Career.matchTeam(), away = Career.opponentTeam(f);
  if (home.cards.some(c => !c)) { toast('Your starting XI has an empty slot. Fix it in Squad.'); return; }
  startMatch({
    home, away, control: ['solo', 'cpu'], skill: divSkill(s.division), duration: Settings.duration,
    onQuit: () => showHub('home'),
    onDone: res => {
      const out = Career.recordMatch(res);
      const rows = out.coins.map(([l, c]) => `<div class="rw"><span>${l}</span><b class="coins">${fmt(c)}</b></div>`).join('');
      const dl = out.dailies.map(d => `<div class="rw"><span>Daily objective done: ${DAILY.find(x => x.id === d.id).desc}</span><b>Claim in Missions</b></div>`).join('');
      let se = '';
      if (out.seasonEnd) {
        const e = out.seasonEnd, title = { promoted: `Promoted to Division ${e.newDiv}!`, relegated: `Relegated to Division ${e.newDiv}`, champions: 'Division 1 Champions!', stay: `Staying in Division ${e.newDiv}` }[e.outcome];
        se = `<div class="season-end ${e.outcome}"><p class="eyebrow">Season over · ${e.record} · ${e.pts} pts</p><h2>${title}</h2><p>Season reward: <span class="coins">${fmt(e.reward.coins)}</span> and a ${PACKS[e.reward.pack].name}.</p></div>`;
      }
      const extra = `${se}<div class="panel rewards"><h3>Rewards</h3>${rows}${dl}<div class="rw total"><span>Total</span><b class="coins">${fmt(out.total)}</b></div></div>`;
      showResult(res, [{ label: 'Continue', fn: () => showHub('home') }], extra);
    },
  });
}

/* ---------- Squad tab ---------- */
function tabSquad(el) {
  const s = Career.s, slots = FORMATIONS[s.formation], xi = Career.xiCards();
  const fit = (c, pos) => { const p = posPenalty(c.pos, pos); return p === 0 ? 'good' : p <= 2 ? 'ok' : p <= 5 ? 'meh' : 'bad'; };
  const sel = CUI.sel, selPos = sel != null ? slots[sel][0] : null;
  const bench = Career.ownedCards().filter(o => !s.xi.includes(o.uid))
    .sort((a, b) => selPos ? (b.card.ovr - posPenalty(b.card.pos, selPos)) - (a.card.ovr - posPenalty(a.card.pos, selPos)) : b.card.ovr - a.card.ovr);
  el.innerHTML = `
  <div class="squad-grid">
    <div class="squad-pitch-wrap">
      <div class="row squad-tools">
        <label for="formation" class="muted">Formation</label>
        <select id="formation">${Object.keys(FORMATIONS).map(f => `<option ${f === s.formation ? 'selected' : ''}>${f}</option>`).join('')}</select>
        <button class="btn ghost small" id="auto">Auto-pick best XI</button>
        <span class="grow"></span><span class="ovr-pill">Team OVR ${Career.rating()}</span>
      </div>
      <div class="squad-pitch">
        ${slots.map(([pos, d, l], i) => {
          const c = xi[i];
          return `<button class="slot ${sel === i ? 'sel' : ''}" data-slot="${i}" style="left:${8 + l * 84}%;top:${90 - (d / 0.76) * 80}%">
            ${c ? cardHTML(c, { size: 5.6 }) : '<div class="empty-slot">+</div>'}
            <span class="slot-pos ${c ? fit(c, pos) : 'bad'}">${pos}</span></button>`;
        }).join('')}
      </div>
      <p class="muted small-text">Click a position, then click a player from the bench to put him in. Click two positions to swap them. The coloured label shows position fit: green is natural, yellow is close, red costs rating.</p>
    </div>
    <div class="bench panel">
      <h3>${sel != null ? `Pick a ${selPos}` : 'Bench & reserves'} <span class="muted">(${bench.length})</span></h3>
      <div class="bench-list">${bench.map(o => `<button class="bench-card" data-uid="${o.uid}" ${sel == null ? 'disabled' : ''}>${cardHTML(o.card, { size: 7 })}${selPos ? `<span class="slot-pos ${fit(o.card, selPos)}">${o.card.ovr - posPenalty(o.card.pos, selPos)} as ${selPos}</span>` : ''}</button>`).join('') || '<p class="muted">No reserves. Open packs or buy players to build depth.</p>'}</div>
    </div>
  </div>`;
  $('#formation').onchange = e => { Career.setFormation(e.target.value); CUI.sel = null; showHub('squad'); };
  $('#auto').onclick = () => { Career.autoXI(); CUI.sel = null; showHub('squad'); toast('Best XI selected.'); };
  el.querySelectorAll('.slot').forEach(b => b.onclick = () => {
    const i = +b.dataset.slot;
    if (CUI.sel == null) CUI.sel = i;
    else if (CUI.sel === i) CUI.sel = null;
    else { const a = s.xi[CUI.sel]; s.xi[CUI.sel] = s.xi[i]; s.xi[i] = a; Career.save(); CUI.sel = null; }
    showHub('squad');
  });
  el.querySelectorAll('.bench-card').forEach(b => b.onclick = () => { if (CUI.sel == null) return; Career.setSlot(CUI.sel, +b.dataset.uid); CUI.sel = null; showHub('squad'); });
}

/* ---------- Store tab ---------- */
function packArt(id, size = '') { const P = PACKS[id]; return `<div class="pack-art p-${P.tint} ${size}"><span>OHANA<br>FC 27</span><b>${P.name.replace(' Pack', '')}</b></div>`; }
function tabStore(el) {
  const s = Career.s;
  const mine = {}; s.packs.forEach(p => mine[p] = (mine[p] || 0) + 1);
  el.innerHTML = `
  ${s.packs.length ? `<div class="panel"><h3>My packs</h3><div class="pack-row">${Object.entries(mine).map(([id, n]) => `<div class="pack-tile">${packArt(id)}<div class="pt-info"><b>${PACKS[id].name}</b><span class="muted">×${n}</span><button class="btn small" data-open="${id}">Open</button></div></div>`).join('')}</div></div>` : ''}
  <div class="panel"><h3>Buy packs</h3>
    <div class="pack-row">${Object.entries(PACKS).map(([id, P]) => `<div class="pack-tile">${packArt(id)}<div class="pt-info"><b>${P.name}</b><span class="muted">${P.desc}</span><button class="btn small gold" data-buy="${id}" ${s.coins < P.price ? 'disabled' : ''}>${fmt(P.price)} coins</button></div></div>`).join('')}</div>
    <p class="muted small-text">Duplicate players are sold automatically at their quick-sell value.</p>
  </div>`;
  el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { const id = b.dataset.open; s.packs.splice(s.packs.indexOf(id), 1); Career.save(); openPackFlow(id); });
  el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const id = b.dataset.buy; if (Career.buyPack(id)) openPackFlow(id); });
}

/* ---------- Pack opening ---------- */
function openPackFlow(id) {
  const res = Career.receivePack(id), best = res.cards[0], walkout = RANK[best.rarity] >= 3;
  const ov = document.createElement('div');
  ov.className = `pack-overlay r-glow-${best.rarity}`; document.body.appendChild(ov);
  const s = getSfx();
  let stage = 0, timers = [];
  const later = (fn, t) => timers.push(setTimeout(fn, t));
  const finish = () => {
    timers.forEach(clearTimeout); stage = 9;
    const dupes = new Set(res.dupes.map(d => d.card.id));
    ov.innerHTML = `<div class="po-final">
      <p class="eyebrow">${PACKS[id].name}</p><h2>Your new players</h2>
      <div class="po-grid">${res.cards.map((c, i) => `<div class="po-item" style="animation-delay:${i * 70}ms">${cardHTML(c, { size: 10 })}${dupes.has(c.id) ? `<span class="dupe">Duplicate · sold <span class="coins">${fmt(res.dupes.find(d => d.card.id === c.id).coins)}</span></span>` : '<span class="newtag">New</span>'}</div>`).join('')}</div>
      <div class="row" style="justify-content:center"><button class="btn" id="po-done">Send to club</button><button class="btn ghost" id="po-squad">Go to Squad</button></div></div>`;
    ov.querySelector('#po-done').onclick = () => { ov.remove(); showHub(CUI.tab); };
    ov.querySelector('#po-squad').onclick = () => { ov.remove(); CUI.sel = null; showHub('squad'); };
  };
  ov.innerHTML = `<div class="po-stage"><div class="po-pack">${packArt(id, 'big')}</div><p class="muted">Click to open · Esc to skip</p></div>`;
  ov.onclick = e => {
    if (stage === 0) {
      stage = 1; ov.querySelector('.po-pack').classList.add('shake');
      s.noise(0.6, 900, 0.5, 0.25, 0.3);
      if (!walkout) { later(finish, 700); return; }
      const C = CLUB_BY_ID[best.club];
      later(() => { ov.innerHTML = `<div class="po-stage walk"><div class="beam"></div><div class="wo-step">${flagSVG(best.nat)}<span>${NATIONS[best.nat].name}</span></div></div>`; s.whistle(false); }, 800);
      later(() => { ov.querySelector('.walk').insertAdjacentHTML('beforeend', `<div class="wo-step"><b class="wo-pos">${best.pos}</b></div>`); }, 2000);
      later(() => { ov.querySelector('.walk').insertAdjacentHTML('beforeend', `<div class="wo-step"><span class="crest big" style="--kit:${C.c1};--kit2:${C.c2}">${C.id.slice(0, 3)}</span><span>${C.name}</span></div>`); }, 3100);
      later(() => { ov.innerHTML = `<div class="po-stage walk reveal"><div class="beam"></div><div class="po-best">${cardHTML(best, { size: 22 })}</div><p class="muted">Click to continue</p></div>`; s.roar(); stage = 2; }, 4300);
    } else if (stage === 2 || stage === 1) finish();
  };
  const k = e => { if (e.code === 'Escape' && stage !== 9) { e.stopPropagation(); finish(); } if (stage === 9 && e.code === 'Enter') { ov.querySelector('#po-done')?.click(); } };
  addEventListener('keydown', k, true);
  new MutationObserver((_, o) => { if (!document.body.contains(ov)) { removeEventListener('keydown', k, true); o.disconnect(); } }).observe(document.body, { childList: true });
}

/* ---------- Transfer market ---------- */
function tabMarket(el) {
  const s = Career.s, m = CUI.mk, PER = 24;
  const q = m.q.trim().toLowerCase();
  let list = PLAYERS.filter(p => (m.pos === 'all' || p.pos === m.pos) && (m.rar === 'all' || p.rarity === m.rar) && p.ovr >= m.min && (!q || p.full.toLowerCase().includes(q)));
  if (m.afford) list = list.filter(p => Career.marketPrice(p) <= s.coins);
  list.sort((a, b) => b.ovr - a.ovr);
  const pages = Math.max(1, Math.ceil(list.length / PER)); m.page = Math.min(m.page, pages - 1);
  const shown = list.slice(m.page * PER, m.page * PER + PER);
  el.innerHTML = `
  <div class="panel market-filters">
    <div class="opt"><label for="mk-q">Search name</label><input id="mk-q" value="${esc(m.q)}" placeholder="e.g. Navarro" autocomplete="off"></div>
    <div class="opt"><label for="mk-pos">Position</label><select id="mk-pos"><option value="all">Any</option>${POSITIONS.map(p => `<option ${m.pos === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
    <div class="opt"><label for="mk-rar">Rarity</label><select id="mk-rar"><option value="all">Any</option>${Object.keys(RANK).map(r => `<option value="${r}" ${m.rar === r ? 'selected' : ''}>${RARITY_LABEL[r]}</option>`).join('')}</select></div>
    <div class="opt"><label for="mk-min">Min OVR</label><select id="mk-min">${[0, 60, 65, 70, 75, 80, 85, 90].map(v => `<option value="${v}" ${m.min === v ? 'selected' : ''}>${v || 'Any'}</option>`).join('')}</select></div>
    <label class="check"><input type="checkbox" id="mk-aff" ${m.afford ? 'checked' : ''}> Only what I can afford</label>
  </div>
  <p class="muted small-text">${list.length} players · prices change after every match.</p>
  <div class="market-grid">${shown.map(p => {
    const price = Career.marketPrice(p), owned = Career.owns(p.id);
    return `<div class="mk-item">${cardHTML(p, { size: 9 })}<div class="mk-buy">${owned ? '<span class="muted">In your club</span>' : `<button class="btn small gold" data-pid="${p.id}" ${price > s.coins ? 'disabled' : ''}>Buy ${fmt(price)}</button>`}</div></div>`;
  }).join('') || '<p class="muted">No players match these filters.</p>'}</div>
  <div class="row pager"><button class="btn ghost small" id="pg-prev" ${m.page === 0 ? 'disabled' : ''}>← Prev</button><span class="muted">Page ${m.page + 1} / ${pages}</span><button class="btn ghost small" id="pg-next" ${m.page >= pages - 1 ? 'disabled' : ''}>Next →</button></div>`;
  const re = () => { m.page = 0; tabMarket(el); };
  $('#mk-q').oninput = e => { m.q = e.target.value; clearTimeout(tabMarket._t); tabMarket._t = setTimeout(() => { re(); const i = $('#mk-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); };
  $('#mk-pos').onchange = e => { m.pos = e.target.value; re(); };
  $('#mk-rar').onchange = e => { m.rar = e.target.value; re(); };
  $('#mk-min').onchange = e => { m.min = +e.target.value; re(); };
  $('#mk-aff').onchange = e => { m.afford = e.target.checked; re(); };
  $('#pg-prev').onclick = () => { m.page--; tabMarket(el); };
  $('#pg-next').onclick = () => { m.page++; tabMarket(el); };
  el.querySelectorAll('[data-pid]').forEach(b => b.onclick = () => {
    const p = PLAYER_BY_ID[+b.dataset.pid];
    if (Career.buy(p.id)) { toast(`${p.full} joined your club.`); showHub('market'); }
  });
}

/* ---------- Missions ---------- */
function rewardText(r) { return r.pack ? PACKS[r.pack].name : `${fmt(r.coins)} coins`; }
function tabMissions(el) {
  const s = Career.s, ms = Career.missions();
  const open = ms.filter(m => !m.claimed), done = ms.filter(m => m.claimed);
  el.innerHTML = `
  <div class="panel"><h3>Daily objectives</h3><p class="muted small-text">Complete these in any career match. A new one replaces each one you claim.</p>
    <div class="mission-list">${s.daily.map((d, i) => { const D = DAILY.find(x => x.id === d.id); return `<div class="mission ${d.done ? 'ready' : ''}"><div class="m-main"><b>${D.desc}</b><span class="muted">Reward: <span class="coins">${fmt(D.coins)}</span></span></div>${d.done ? `<button class="btn small" data-daily="${i}">Claim</button>` : '<span class="muted">In progress</span>'}</div>`; }).join('')}</div>
  </div>
  <div class="panel"><h3>Milestones</h3>
    <div class="mission-list">${open.map(m => `<div class="mission ${m.done ? 'ready' : ''}">
      <div class="m-main"><b>${m.name}</b><span class="muted">${m.desc}</span>
      <div class="m-bar"><i style="width:${m.value / m.target * 100}%"></i></div><span class="m-prog">${m.value} / ${m.target}</span></div>
      <div class="m-reward"><span class="${m.reward.pack ? 'pk' : 'coins'}">${rewardText(m.reward)}</span>${m.done ? `<button class="btn small" data-claim="${m.id}">Claim</button>` : ''}</div></div>`).join('')}</div>
    ${done.length ? `<details><summary class="muted">Completed (${done.length})</summary><ul class="hist">${done.map(m => `<li>${m.name} · ${rewardText(m.reward)}</li>`).join('')}</ul></details>` : ''}
  </div>`;
  el.querySelectorAll('[data-claim]').forEach(b => b.onclick = () => { const r = Career.claim(b.dataset.claim); if (r) toast(r.pack ? `${PACKS[r.pack].name} added. Open it in the Store.` : `+${fmt(r.coins)} coins`); showHub('missions'); });
  el.querySelectorAll('[data-daily]').forEach(b => b.onclick = () => { const c = Career.claimDaily(+b.dataset.daily); if (c) toast(`+${fmt(c)} coins`); showHub('missions'); });
}

/* ---------- My club ---------- */
function tabClub(el) {
  const s = Career.s, f = CUI.club;
  const groups = { GK: ['GK'], DEF: ['CB', 'LB', 'RB'], MID: ['CDM', 'CM', 'CAM', 'LM', 'RM'], ATT: ['LW', 'RW', 'ST'] };
  const list = Career.ownedCards().filter(o => f.pos === 'all' || groups[f.pos].includes(o.card.pos)).sort((a, b) => b.card.ovr - a.card.ovr);
  el.innerHTML = `
  <div class="row"><div class="seg small">${['all', 'GK', 'DEF', 'MID', 'ATT'].map(k => `<button class="${f.pos === k ? 'on' : ''}" data-f="${k}">${k === 'all' ? 'All' : k}</button>`).join('')}</div><span class="muted">${s.owned.length} players</span>
    <span class="grow"></span><button class="btn danger small" id="reset">Delete career</button></div>
  <div class="market-grid">${list.map(o => `<div class="mk-item">${cardHTML(o.card, { size: 9 })}<div class="mk-buy">${s.xi.includes(o.uid) ? '<span class="xi-tag">Starting XI</span>' : ''}<button class="btn ghost small" data-sell="${o.uid}">Sell ${fmt(sellValue(o.card))}</button></div></div>`).join('')}</div>
  <div class="overlay" id="confirm" hidden><div class="panel confirm-box"><h3 id="cf-title"></h3><p class="muted" id="cf-text"></p><div class="row" style="justify-content:center"><button class="btn danger" id="cf-yes"></button><button class="btn ghost" id="cf-no">Cancel</button></div></div></div>`;
  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { f.pos = b.dataset.f; showHub('club'); });
  const confirm = (title, text, yes, fn) => { $('#cf-title').textContent = title; $('#cf-text').textContent = text; $('#cf-yes').textContent = yes; $('#confirm').hidden = false; $('#cf-yes').onclick = fn; $('#cf-no').onclick = () => $('#confirm').hidden = true; };
  el.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => {
    const uid = +b.dataset.sell, c = Career.card(uid);
    confirm(`Sell ${c.full}?`, `You get ${fmt(sellValue(c))} coins.${s.xi.includes(uid) ? ' He starts, so the best bench player replaces him.' : ''}`, 'Sell', () => {
      const err = Career.sell(uid); if (err) toast(err); else toast(`Sold for ${fmt(sellValue(c))} coins.`); showHub('club');
    });
  });
  $('#reset').onclick = () => confirm('Delete this career?', 'Your club, coins, players and progress will be erased. This cannot be undone.', 'Delete career', () => { Career.reset(); showModes(); });
}
