'use strict';
/* =========================================================
   Ultimate Team Career — state, economy, packs, missions
   ========================================================= */
const CAREER_KEY = 'ohanaFC27.career';
const SEASON_GAMES = 7, PROMO_PTS = 12, RELEG_PTS = 5;
const DIV_OVR = { 10: 57, 9: 61, 8: 65, 7: 69, 6: 72, 5: 75, 4: 78, 3: 81, 2: 84, 1: 87 };
const divSkill = d => 0.22 + (10 - d) * 0.078;
const KITS = [
  ['#00b4d8', '#ffffff'], ['#e63946', '#ffffff'], ['#111827', '#f5c84c'], ['#16a34a', '#ffffff'],
  ['#7c3aed', '#fde68a'], ['#f97316', '#111111'], ['#f8fafc', '#1d4ed8'], ['#facc15', '#1e3a8a'],
];

/* ---------- Packs ---------- */
const PACKS = {
  bronze:   { name: 'Bronze Pack',       price: 750,    tint: 'bronze', desc: '6 players. Mostly bronze, one silver-or-better.', slots: [[5, { bronze: .9, silver: .1 }], [1, { silver: .7, gold: .3 }]] },
  silver:   { name: 'Silver Pack',       price: 2500,   tint: 'silver', desc: '6 players. Silvers with a shot at gold.', slots: [[5, { silver: .85, gold: .15 }], [1, { gold: .8, rare: .2 }]] },
  gold:     { name: 'Gold Pack',         price: 7500,   tint: 'gold',   desc: '6 gold players, chance of rare.', slots: [[5, { gold: .8, rare: .2 }], [1, { rare: .9, hero: .1 }]] },
  premium:  { name: 'Premium Gold Pack', price: 15000,  tint: 'rare',   desc: '9 golds, one guaranteed rare. Small Hero/Icon chance.', slots: [[8, { gold: .65, rare: .35 }], [1, { rare: .85, hero: .12, icon: .03 }]] },
  ultimate: { name: 'Ultimate Pack',     price: 40000,  tint: 'hero',   desc: '9 rare golds. Strong Hero and Icon odds.', slots: [[8, { rare: .92, hero: .06, icon: .02 }], [1, { rare: .6, hero: .3, icon: .1 }]] },
  icon:     { name: 'Icon Pack',         price: 120000, tint: 'icon',   desc: 'One guaranteed Icon plus four rare golds.', slots: [[4, { rare: 1 }], [1, { icon: 1 }]] },
};
function rollRarity(w) { let r = Math.random(), acc = 0; for (const k in w) { acc += w[k]; if (r <= acc) return k; } return Object.keys(w)[0]; }
function drawPlayer(rarity, exclude) {
  const pool = PLAYERS.filter(p => p.rarity === rarity && !exclude.has(p.id));
  if (!pool.length) return null;
  const min = Math.min(...pool.map(p => p.ovr));
  const weights = pool.map(p => Math.exp(-(p.ovr - min) / 5));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}
function openPackContents(id) {
  const out = [], seen = new Set();
  for (const [n, w] of PACKS[id].slots) for (let i = 0; i < n; i++) { const p = drawPlayer(rollRarity(w), seen); if (p) { out.push(p); seen.add(p.id); } }
  return out.sort((a, b) => rarityRank(b) - rarityRank(a) || b.ovr - a.ovr);
}
const RANK = { bronze: 0, silver: 1, gold: 2, rare: 3, hero: 4, icon: 5 };
const rarityRank = p => RANK[p.rarity];
const sellValue = p => Math.max(50, Math.round(p.price * 0.45 / 50) * 50);

/* ---------- Missions ---------- */
const MISSIONS = [
  { id: 'play1', name: 'First Whistle', desc: 'Play your first career match', stat: 'matches', target: 1, reward: { pack: 'bronze' } },
  { id: 'win1', name: 'Off the Mark', desc: 'Win a match', stat: 'wins', target: 1, reward: { coins: 1000 } },
  { id: 'pack3', name: 'Pack Opener', desc: 'Open 3 packs', stat: 'packs', target: 3, reward: { coins: 1500 } },
  { id: 'goals10', name: 'Goal Machine', desc: 'Score 10 goals', stat: 'goals', target: 10, reward: { coins: 2000 } },
  { id: 'cs1', name: 'Shut Out', desc: 'Win without conceding', stat: 'cleanSheets', target: 1, reward: { coins: 1500 } },
  { id: 'buy2', name: 'Transfer Window', desc: 'Buy 2 players on the transfer market', stat: 'bought', target: 2, reward: { coins: 1500 } },
  { id: 'spec5', name: 'Superpowers', desc: 'Use 5 special powers in career matches', stat: 'specials', target: 5, reward: { coins: 2000 } },
  { id: 'win5', name: 'Winning Habit', desc: 'Win 5 matches', stat: 'wins', target: 5, reward: { pack: 'silver' } },
  { id: 'big1', name: 'Statement Win', desc: 'Win by 3 or more goals', stat: 'bigWins', target: 1, reward: { pack: 'silver' } },
  { id: 'r65', name: 'Silver Standard', desc: 'Reach a team rating of 65', stat: 'rating', target: 65, reward: { pack: 'silver' } },
  { id: 'streak3', name: 'On Fire', desc: 'Win 3 matches in a row', stat: 'bestStreak', target: 3, reward: { coins: 3000 } },
  { id: 'hat1', name: 'Hat-trick Hero', desc: 'Score 3 or more goals in one match', stat: 'hatTricks', target: 1, reward: { pack: 'gold' } },
  { id: 'promo1', name: 'Going Up', desc: 'Win a promotion', stat: 'promotions', target: 1, reward: { pack: 'gold' } },
  { id: 'r72', name: 'Golden Generation', desc: 'Reach a team rating of 72', stat: 'rating', target: 72, reward: { pack: 'gold' } },
  { id: 'goals50', name: 'Fifty Up', desc: 'Score 50 goals', stat: 'goals', target: 50, reward: { pack: 'gold' } },
  { id: 'win15', name: 'Serial Winners', desc: 'Win 15 matches', stat: 'wins', target: 15, reward: { pack: 'premium' } },
  { id: 'div5', name: 'Halfway There', desc: 'Reach Division 5', stat: 'climb', target: 5, reward: { pack: 'premium' } },
  { id: 'r78', name: 'Contenders', desc: 'Reach a team rating of 78', stat: 'rating', target: 78, reward: { pack: 'premium' } },
  { id: 'r84', name: 'Elite Squad', desc: 'Reach a team rating of 84', stat: 'rating', target: 84, reward: { pack: 'ultimate' } },
  { id: 'div1', name: 'Top Flight', desc: 'Reach Division 1', stat: 'climb', target: 9, reward: { pack: 'ultimate' } },
  { id: 'title', name: 'Champions', desc: 'Win the Division 1 title', stat: 'titles', target: 1, reward: { pack: 'icon' } },
];
// Repeatable "daily" objectives, checked against a single match result
const DAILY = [
  { id: 'd_win', desc: 'Win a match', coins: 500, check: m => m.gf > m.ga },
  { id: 'd_score2', desc: 'Score 2+ goals in a match', coins: 400, check: m => m.gf >= 2 },
  { id: 'd_cs', desc: 'Keep a clean sheet', coins: 500, check: m => m.ga === 0 },
  { id: 'd_pass', desc: 'Complete 30+ passes in a match', coins: 400, check: m => m.passOk >= 30 },
  { id: 'd_tack', desc: 'Win 5+ tackles in a match', coins: 350, check: m => m.tackles >= 5 },
  { id: 'd_spec', desc: 'Use a special power in a match', coins: 300, check: m => m.specials >= 1 },
  { id: 'd_poss', desc: 'Have 55%+ possession in a match', coins: 400, check: m => m.possPct >= 55 },
  { id: 'd_shots', desc: 'Have 6+ shots on target in a match', coins: 400, check: m => m.onTarget >= 6 },
];

/* ---------- Opponents ---------- */
const TOWNS = ['Eastfield', 'Port Calder', 'Ravenmoor', 'Westbrook', 'Highcliff', 'Saltmarsh', 'Kingsbury', 'Oakhaven', 'Redwater', 'Silverton', 'Blackpine', 'Larkspur', 'Northgate', 'Thornbury', 'Elmstead', 'Brightwater', 'Stormhaven', 'Fairhollow', 'Ironbridge', 'Copperfield', 'Ashcombe', 'Wolfden'];
const SUFFIX = ['Rovers', 'United', 'Athletic', 'City', 'Wanderers', 'FC', 'Albion', 'Town', 'Rangers', 'Dynamo'];
function makeOpponent(div, used) {
  let town; do { town = TOWNS[Math.floor(Math.random() * TOWNS.length)]; } while (used.has(town) && used.size < TOWNS.length); used.add(town);
  const name = `${town} ${SUFFIX[Math.floor(Math.random() * SUFFIX.length)]}`;
  const kit = KITS[Math.floor(Math.random() * KITS.length)];
  const target = DIV_OVR[div], formation = Object.keys(FORMATIONS)[Math.floor(Math.random() * 4)];
  const taken = new Set();
  const pids = FORMATIONS[formation].map(([pos]) => {
    let pool = PLAYERS.filter(p => p.pos === pos && !taken.has(p.id) && Math.abs(p.ovr - target) <= 3 && p.rarity !== 'icon' && p.rarity !== 'hero');
    if (!pool.length) pool = PLAYERS.filter(p => POS_LINE[p.pos] === POS_LINE[pos] && !taken.has(p.id) && Math.abs(p.ovr - target) <= 5);
    if (!pool.length) pool = PLAYERS.filter(p => !taken.has(p.id)).sort((a, b) => Math.abs(a.ovr - target) - Math.abs(b.ovr - target)).slice(0, 10);
    const p = pool[Math.floor(Math.random() * pool.length)]; taken.add(p.id); return p.id;
  });
  return { name, short: town.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase(), c1: kit[0], c2: kit[1], formation, pids, result: null };
}

/* =========================================================
   Career state
   ========================================================= */
const Career = {
  s: null,
  exists() { if (this.s) return true; try { return !!localStorage.getItem(CAREER_KEY); } catch (e) { return false; } },
  load() { if (this.s) return this.s; try { this.s = JSON.parse(localStorage.getItem(CAREER_KEY)); } catch (e) { this.s = null; } return this.s; },
  save() { try { localStorage.setItem(CAREER_KEY, JSON.stringify(this.s)); } catch (e) { } },
  reset() { this.s = null; try { localStorage.removeItem(CAREER_KEY); } catch (e) { } },

  create(club, kit) {
    const s = this.s = {
      v: 1, club: club || 'Ohana FC', short: (club || 'Ohana FC').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'OHA',
      c1: KITS[kit][0], c2: KITS[kit][1], coins: 2500, uid: 1, owned: [], formation: '4-3-3', xi: [],
      packs: ['bronze', 'silver'], division: 10, bestDiv: 10, season: null,
      stats: { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, conceded: 0, cleanSheets: 0, packs: 0, bought: 0, sold: 0, specials: 0, hatTricks: 0, bigWins: 0, streak: 0, bestStreak: 0, promotions: 0, titles: 0 },
      claimed: {}, daily: [], log: [],
    };
    // starter squad: bronze players for each 4-3-3 slot + 7 subs
    const taken = new Set();
    const pickPos = pos => { const pool = PLAYERS.filter(p => p.pos === pos && p.rarity === 'bronze' && p.ovr <= 61 && !taken.has(p.id)); const p = pool[Math.floor(Math.random() * pool.length)]; taken.add(p.id); return p; };
    for (const [pos] of FORMATIONS['4-3-3']) s.xi.push(this.add(pickPos(pos).id));
    for (const pos of ['GK', 'CB', 'RB', 'CM', 'LM', 'RW', 'ST']) this.add(pickPos(pos).id);
    this.fillDaily(); this.newSeason(); this.save();
  },
  add(pid) { const uid = this.s.uid++; this.s.owned.push({ uid, pid }); return uid; },
  card(uid) { const o = this.s.owned.find(x => x.uid === uid); return o ? PLAYER_BY_ID[o.pid] : null; },
  owns(pid) { return this.s.owned.some(o => o.pid === pid); },
  ownedCards() { return this.s.owned.map(o => ({ uid: o.uid, card: PLAYER_BY_ID[o.pid] })); },
  xiCards() { return this.s.xi.map(u => this.card(u)); },
  rating() { return teamRating(this.xiCards(), this.s.formation); },
  matchTeam() { const s = this.load(); if (!s) return null; return { name: s.club, short: s.short, c1: s.c1, c2: s.c2, formation: s.formation, cards: this.xiCards() }; },

  setSlot(i, uid) {
    const s = this.s, j = s.xi.indexOf(uid);
    if (j >= 0) s.xi[j] = s.xi[i]; // swap within the XI
    s.xi[i] = uid; this.save();
  },
  autoXI() {
    const all = this.ownedCards(), best = bestXI(all.map(x => x.card), this.s.formation);
    const used = new Set();
    this.s.xi = best.map(c => { const o = all.find(x => x.card === c && !used.has(x.uid)); used.add(o.uid); return o.uid; });
    this.save();
  },
  setFormation(f) { this.s.formation = f; this.save(); },

  addCoins(n) { this.s.coins += n; },
  buyPack(id) { const P = PACKS[id]; if (this.s.coins < P.price) return false; this.s.coins -= P.price; this.save(); return true; },
  // returns {cards, dupes:[{card, coins}]}; new cards go to the club, duplicates are quick-sold
  receivePack(id) {
    const cards = openPackContents(id), res = { cards, dupes: [] };
    for (const c of cards) {
      if (this.owns(c.id)) { const v = sellValue(c); this.s.coins += v; res.dupes.push({ card: c, coins: v }); }
      else this.add(c.id);
    }
    this.s.stats.packs++; this.save();
    return res;
  },
  marketPrice(p) { const h = hashStr(`${p.id}:${this.s.stats.matches}`) % 1000 / 1000; return Math.round(p.price * (0.92 + h * 0.2) / 50) * 50; },
  buy(pid) {
    const p = PLAYER_BY_ID[pid], price = this.marketPrice(p);
    if (this.owns(pid) || this.s.coins < price) return false;
    this.s.coins -= price; this.add(pid); this.s.stats.bought++; this.save(); return true;
  },
  sell(uid) {
    const s = this.s; if (s.owned.length <= 11) return 'You need at least 11 players.';
    const c = this.card(uid); if (!c) return 'Player not found.';
    s.owned = s.owned.filter(o => o.uid !== uid);
    const i = s.xi.indexOf(uid);
    if (i >= 0) { // replace with the best remaining bench player for that slot
      const slot = FORMATIONS[s.formation][i][0];
      const bench = s.owned.filter(o => !s.xi.includes(o.uid)).sort((a, b) => (PLAYER_BY_ID[b.pid].ovr - posPenalty(PLAYER_BY_ID[b.pid].pos, slot)) - (PLAYER_BY_ID[a.pid].ovr - posPenalty(PLAYER_BY_ID[a.pid].pos, slot)));
      s.xi[i] = bench[0].uid;
    }
    s.coins += sellValue(c); s.stats.sold++; this.save(); return null;
  },

  /* ----- season ----- */
  newSeason() {
    const s = this.s, used = new Set();
    s.season = { n: (s.season ? s.season.n : 0) + 1, div: s.division, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, fixtures: Array.from({ length: SEASON_GAMES }, () => makeOpponent(s.division, used)), done: false };
  },
  nextFixture() { const se = this.s.season; return se.fixtures[se.played]; },
  opponentTeam(f) { return { name: f.name, short: f.short, c1: f.c1, c2: f.c2, formation: f.formation, cards: f.pids.map(id => PLAYER_BY_ID[id]) }; },

  // apply a finished match; returns a summary for the result screen
  recordMatch(res) {
    const s = this.s, se = s.season, st = s.stats, f = this.nextFixture();
    const gf = res.score[0], ga = res.score[1], my = res.stats[0];
    f.result = [gf, ga]; se.played++; se.gf += gf; se.ga += ga;
    const div = s.division, coins = [];
    st.matches++; st.goals += gf; st.conceded += ga; st.specials += my.specials;
    if (gf > ga) { se.w++; se.pts += 3; st.wins++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); coins.push(['Win', 500 + (10 - div) * 90]); }
    else if (gf === ga) { se.d++; se.pts += 1; st.draws++; st.streak = 0; coins.push(['Draw', 250 + (10 - div) * 45]); }
    else { se.l++; st.losses++; st.streak = 0; coins.push(['Played', 150 + (10 - div) * 20]); }
    if (gf) coins.push([`Goals ×${gf}`, gf * 60]);
    if (ga === 0) { st.cleanSheets += gf > ga ? 1 : 0; coins.push(['Clean sheet', 150]); }
    if (gf >= 3) st.hatTricks += res.events.some(e => e.team === 0 && !e.og && res.events.filter(x => x.team === 0 && x.pid === e.pid && !x.og).length >= 3) ? 1 : 0;
    if (gf - ga >= 3) st.bigWins++;
    // dailies
    const m = { gf, ga, ...my }, dailies = [];
    for (const d of s.daily) if (!d.done && DAILY.find(x => x.id === d.id).check(m)) { d.done = true; dailies.push(d); }
    let total = coins.reduce((a, c) => a + c[1], 0);
    s.coins += total;
    const out = { coins, total, dailies, seasonEnd: null };
    if (se.played >= SEASON_GAMES) out.seasonEnd = this.endSeason();
    this.save();
    return out;
  },
  endSeason() {
    const s = this.s, se = s.season, st = s.stats;
    let outcome = 'stay', reward = { coins: (11 - s.division) * 500 + se.pts * 100, pack: 'silver' };
    if (se.pts >= PROMO_PTS) {
      if (s.division === 1) { outcome = 'champions'; st.titles++; reward.pack = 'ultimate'; }
      else { outcome = 'promoted'; s.division--; st.promotions++; reward.pack = 'gold'; }
    } else if (se.pts < RELEG_PTS && s.division < 10) { outcome = 'relegated'; s.division++; reward.pack = 'bronze'; }
    s.bestDiv = Math.min(s.bestDiv, s.division);
    s.coins += reward.coins; s.packs.push(reward.pack);
    const summary = { outcome, pts: se.pts, record: `${se.w}-${se.d}-${se.l}`, reward, oldDiv: se.div, newDiv: s.division };
    s.log.unshift({ season: se.n, div: se.div, pts: se.pts, outcome });
    this.newSeason();
    return summary;
  },

  /* ----- missions ----- */
  statValue(stat) { if (stat === 'rating') return this.rating(); if (stat === 'climb') return 10 - this.s.bestDiv; return this.s.stats[stat] || 0; },
  missions() { return MISSIONS.map(m => { const v = this.statValue(m.stat); return { ...m, value: Math.min(v, m.target), done: v >= m.target, claimed: !!this.s.claimed[m.id] }; }); },
  claimable() { return this.missions().filter(m => m.done && !m.claimed).length + this.s.daily.filter(d => d.done).length; },
  claim(id) {
    const m = this.missions().find(x => x.id === id); if (!m || !m.done || m.claimed) return null;
    this.s.claimed[id] = true; this.grant(m.reward); this.save(); return m.reward;
  },
  grant(r) { if (r.coins) this.s.coins += r.coins; if (r.pack) this.s.packs.push(r.pack); },
  fillDaily() {
    const s = this.s;
    while (s.daily.length < 3) {
      const have = new Set(s.daily.map(d => d.id)), pool = DAILY.filter(d => !have.has(d.id));
      const d = pool[Math.floor(Math.random() * pool.length)]; s.daily.push({ id: d.id, done: false });
    }
  },
  claimDaily(i) {
    const d = this.s.daily[i]; if (!d || !d.done) return 0;
    const coins = DAILY.find(x => x.id === d.id).coins; this.s.coins += coins;
    this.s.daily.splice(i, 1); this.fillDaily(); this.save(); return coins;
  },
};
