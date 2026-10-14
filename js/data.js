'use strict';
/* =========================================================
   PITCH LEGENDS — data: nations, clubs, players, traits
   All players & clubs are fictional and generated from a
   fixed seed so every save file sees the same database.
   ========================================================= */

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function gauss(rng) { return (rng() + rng() + rng() - 1.5) / 0.5; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ---------------- Nations ---------------- */
const NATIONS = {
  ENG: { name: 'England', skins: [0, 1, 2, 3, 4], first: ['Jack', 'Oliver', 'Callum', 'Mason', 'Reece', 'Tyler', 'Kieran', 'Luke', 'Danny', 'Jordan', 'Archie', 'Freddie', 'Connor', 'Alfie'], last: ['Ashworth', 'Brennan', 'Caldwell', 'Dawson', 'Fenwick', 'Hartley', 'Kemp', 'Lockwood', 'Marsh', 'Pickering', 'Radcliffe', 'Stanton', 'Thornton', 'Whitfield', 'Hale', 'Rowe'] },
  ESP: { name: 'Spain', skins: [0, 1, 2], first: ['Álvaro', 'Iker', 'Pablo', 'Sergio', 'Dani', 'Hugo', 'Rubén', 'Marcos', 'Javi', 'Unai', 'Adrián', 'Raúl'], last: ['Navarro', 'Ortega', 'Cabrera', 'Delgado', 'Molina', 'Serrano', 'Vidal', 'Rojas', 'Campos', 'Iglesias', 'Prieto', 'Soler', 'Ferrer', 'Lozano'] },
  FRA: { name: 'France', skins: [0, 1, 2, 3, 4], first: ['Lucas', 'Théo', 'Mathis', 'Enzo', 'Nolan', 'Bastien', 'Yanis', 'Rayan', 'Maxime', 'Clément', 'Antoine', 'Jules', 'Malo'], last: ['Moreau', 'Lefèvre', 'Girard', 'Fontaine', 'Roussel', 'Chevalier', 'Mercier', 'Blanchard', 'Gauthier', 'Perrin', 'Lemaire', 'Dufour', 'Marchand', 'Bonnet'] },
  GER: { name: 'Germany', skins: [0, 0, 1, 2], first: ['Lukas', 'Jonas', 'Leon', 'Felix', 'Niklas', 'Tim', 'Moritz', 'Jannik', 'Florian', 'Paul', 'Elias', 'Max'], last: ['Becker', 'Schäfer', 'Hoffmann', 'Krause', 'Richter', 'Vogel', 'Lehmann', 'Kessler', 'Brenner', 'Dietrich', 'Hartmann', 'Ziegler', 'Seidel', 'Kraus'] },
  ITA: { name: 'Italy', skins: [0, 1, 1, 2], first: ['Lorenzo', 'Matteo', 'Federico', 'Riccardo', 'Alessandro', 'Davide', 'Nicolò', 'Gianluca', 'Simone', 'Andrea', 'Tommaso', 'Marco'], last: ['Bianchi', 'Ricci', 'Colombo', 'Greco', 'Gallo', 'Conti', 'Mancini', 'Costa', 'Fabbri', 'Rinaldi', 'Marchetti', 'Ferraro', 'Santoro', 'Lombardi'] },
  BRA: { name: 'Brazil', skins: [1, 2, 3, 4], single: true, first: ['Gabriel', 'Thiago', 'Rafael', 'Matheus', 'Vinícius', 'Igor', 'Caio', 'Diego', 'Bruno', 'Renan', 'Felipe', 'Juninho', 'Wesley', 'Edson'], last: ['Souza', 'Oliveira', 'Pereira', 'Carvalho', 'Ribeiro', 'Almeida', 'Barbosa', 'Teixeira', 'Moraes', 'Farias', 'Nascimento', 'Duarte', 'Rocha', 'Batista'] },
  ARG: { name: 'Argentina', skins: [0, 1, 2], first: ['Santiago', 'Facundo', 'Nicolás', 'Joaquín', 'Tomás', 'Franco', 'Agustín', 'Matías', 'Gonzalo', 'Emiliano', 'Ezequiel', 'Lisandro'], last: ['Fernández', 'Romero', 'Acosta', 'Medina', 'Sosa', 'Benítez', 'Aguirre', 'Ledesma', 'Quiroga', 'Funes', 'Villalba', 'Ibarra', 'Godoy', 'Peralta'] },
  POR: { name: 'Portugal', skins: [0, 1, 2, 3], first: ['João', 'Diogo', 'Rúben', 'Tiago', 'André', 'Gonçalo', 'Nuno', 'Pedro', 'Vitor', 'Bernardo', 'Francisco', 'Rafael'], last: ['Silva', 'Santos', 'Ferreira', 'Pinto', 'Lopes', 'Marques', 'Mendes', 'Correia', 'Antunes', 'Tavares', 'Gaspar', 'Moura', 'Sequeira', 'Brito'] },
  NED: { name: 'Netherlands', skins: [0, 0, 1, 3, 4], first: ['Daan', 'Sem', 'Luuk', 'Jesse', 'Bram', 'Thijs', 'Ruben', 'Stijn', 'Milan', 'Joey', 'Lars', 'Niels'], last: ['de Vries', 'Jansen', 'van Leeuwen', 'Bakker', 'Visser', 'Smit', 'Meijer', 'Mulder', 'de Groot', 'Bos', 'Vos', 'Hendriks', 'van den Berg', 'Kuipers'] },
  BEL: { name: 'Belgium', skins: [0, 0, 1, 3, 4], first: ['Arthur', 'Louis', 'Jules', 'Victor', 'Noah', 'Wout', 'Senne', 'Lander', 'Robbe', 'Thibo', 'Milan', 'Jarne'], last: ['Peeters', 'Maes', 'Claes', 'Goossens', 'Wouters', 'Willems', 'Dubois', 'Lambert', 'Dupont', 'Janssens', 'Michiels', 'Hermans', 'Vermeulen', 'Jacobs'] },
  NGA: { name: 'Nigeria', skins: [3, 4, 4], first: ['Chinedu', 'Emeka', 'Tunde', 'Ifeanyi', 'Samuel', 'Kelechi', 'Victor', 'Ademola', 'Obinna', 'Ikenna', 'Femi', 'Uche'], last: ['Okafor', 'Adeyemi', 'Nwosu', 'Balogun', 'Okonkwo', 'Eze', 'Afolabi', 'Obi', 'Ogunleye', 'Nnamdi', 'Akinola', 'Chukwu', 'Bello', 'Adebayo'] },
  JPN: { name: 'Japan', skins: [0, 1], first: ['Haruto', 'Ren', 'Sota', 'Yuto', 'Kaito', 'Riku', 'Takumi', 'Daiki', 'Kenta', 'Shun', 'Hiroki', 'Yuma'], last: ['Tanaka', 'Suzuki', 'Takahashi', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Matsumoto', 'Inoue'] },
  USA: { name: 'USA', skins: [0, 1, 2, 3, 4], first: ['Tyler', 'Brandon', 'Cole', 'Austin', 'Chase', 'Logan', 'Miles', 'Gavin', 'Wyatt', 'Hunter', 'Devin', 'Trent'], last: ['Mitchell', 'Carter', 'Brooks', 'Reynolds', 'Hayes', 'Coleman', 'Foster', 'Bennett', 'Griffin', 'Parker', 'Sullivan', 'Wallace', 'Porter', 'Holt'] },
  MAR: { name: 'Morocco', skins: [1, 2, 3], first: ['Youssef', 'Hamza', 'Ilias', 'Amine', 'Soufiane', 'Zakaria', 'Ayoub', 'Mehdi', 'Anas', 'Bilal', 'Karim', 'Nabil'], last: ['El Amrani', 'Benali', 'Haddad', 'Bennani', 'Tazi', 'Alaoui', 'El Idrissi', 'Chakir', 'Bouzid', 'Rahmouni', 'Fassi', 'Lahlou', 'Kettani', 'Ouazzani'] },
};

/* Simple SVG flags (emoji flags don't render on Windows) */
function flagSVG(code) {
  const v3 = (a, b, c) => `<rect width="10" height="20" fill="${a}"/><rect x="10" width="10" height="20" fill="${b}"/><rect x="20" width="10" height="20" fill="${c}"/>`;
  const h3 = (a, b, c) => `<rect width="30" height="7" fill="${a}"/><rect y="6.6" width="30" height="7" fill="${b}"/><rect y="13.3" width="30" height="7" fill="${c}"/>`;
  let body = '';
  switch (code) {
    case 'FRA': body = v3('#0055a4', '#fff', '#ef4135'); break;
    case 'ITA': body = v3('#009246', '#fff', '#ce2b37'); break;
    case 'BEL': body = v3('#111', '#fae042', '#ed2939'); break;
    case 'NGA': body = v3('#008751', '#fff', '#008751'); break;
    case 'GER': body = h3('#111', '#dd0000', '#ffce00'); break;
    case 'NED': body = h3('#ae1c28', '#fff', '#21468b'); break;
    case 'ESP': body = `<rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/>`; break;
    case 'ARG': body = h3('#74acdf', '#fff', '#74acdf') + `<circle cx="15" cy="10" r="2.2" fill="#f6b40e"/>`; break;
    case 'BRA': body = `<rect width="30" height="20" fill="#009c3b"/><polygon points="15,2.5 27,10 15,17.5 3,10" fill="#ffdf00"/><circle cx="15" cy="10" r="4.2" fill="#002776"/>`; break;
    case 'POR': body = `<rect width="30" height="20" fill="#da291c"/><rect width="12" height="20" fill="#046a38"/><circle cx="12" cy="10" r="3.4" fill="#ffe900"/>`; break;
    case 'ENG': body = `<rect width="30" height="20" fill="#fff"/><rect x="13" width="4" height="20" fill="#ce1124"/><rect y="8" width="30" height="4" fill="#ce1124"/>`; break;
    case 'JPN': body = `<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5.5" fill="#bc002d"/>`; break;
    case 'USA': { let s = ''; for (let i = 0; i < 7; i++) s += `<rect y="${i * 2.86}" width="30" height="1.43" fill="#b22234"/>`; body = `<rect width="30" height="20" fill="#fff"/>${s}<rect width="13" height="10.7" fill="#3c3b6e"/>`; break; }
    case 'MAR': body = `<rect width="30" height="20" fill="#c1272d"/><polygon points="15,5.5 16.3,9.4 20.3,9.4 17.1,11.8 18.3,15.6 15,13.3 11.7,15.6 12.9,11.8 9.7,9.4 13.7,9.4" fill="none" stroke="#006233" stroke-width="1.1"/>`; break;
    default: body = `<rect width="30" height="20" fill="#888"/>`;
  }
  return `<svg class="flag" viewBox="0 0 30 20" preserveAspectRatio="none">${body}</svg>`;
}

/* ---------------- Positions ---------------- */
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const POS_LINE = { GK: 'G', CB: 'D', LB: 'D', RB: 'D', CDM: 'M', CM: 'M', CAM: 'M', LM: 'M', RM: 'M', LW: 'A', RW: 'A', ST: 'A' };
const POS_NEAR = { GK: [], CB: ['LB', 'RB', 'CDM'], LB: ['RB', 'LM', 'CB'], RB: ['LB', 'RM', 'CB'], CDM: ['CM', 'CB'], CM: ['CDM', 'CAM'], CAM: ['CM', 'ST'], LM: ['LW', 'LB', 'RM'], RM: ['RW', 'RB', 'LM'], LW: ['LM', 'RW', 'ST'], RW: ['RM', 'LW', 'ST'], ST: ['CAM', 'LW', 'RW'] };
function posPenalty(cardPos, slotPos) {
  if (cardPos === slotPos) return 0;
  if (cardPos === 'GK' || slotPos === 'GK') return 40;
  if (POS_NEAR[cardPos].includes(slotPos)) return 2;
  if (POS_LINE[cardPos] === POS_LINE[slotPos]) return 5;
  return 12;
}

/* Formations: d = depth from own goal (0..1), l = lateral (0 = team's left) */
const FORMATIONS = {
  '4-3-3': [['GK', .03, .5], ['LB', .22, .14], ['CB', .17, .38], ['CB', .17, .62], ['RB', .22, .86], ['CM', .42, .28], ['CDM', .34, .5], ['CM', .42, .72], ['LW', .66, .16], ['ST', .73, .5], ['RW', .66, .84]],
  '4-4-2': [['GK', .03, .5], ['LB', .22, .14], ['CB', .17, .38], ['CB', .17, .62], ['RB', .22, .86], ['LM', .45, .14], ['CM', .40, .38], ['CM', .40, .62], ['RM', .45, .86], ['ST', .72, .38], ['ST', .72, .62]],
  '4-2-3-1': [['GK', .03, .5], ['LB', .22, .14], ['CB', .17, .38], ['CB', .17, .62], ['RB', .22, .86], ['CDM', .34, .38], ['CDM', .34, .62], ['LW', .58, .16], ['CAM', .56, .5], ['RW', .58, .84], ['ST', .74, .5]],
  '3-5-2': [['GK', .03, .5], ['CB', .18, .25], ['CB', .16, .5], ['CB', .18, .75], ['LM', .45, .1], ['CDM', .35, .38], ['CDM', .35, .62], ['RM', .45, .9], ['CAM', .55, .5], ['ST', .73, .38], ['ST', .73, .62]],
};

/* ---------------- Special powers ---------------- */
const TRAITS = {
  rocket:  { name: 'Rocket Shot',     icon: '🚀', color: '#ff5a36', desc: 'Next shot is a thunderbolt: much faster and pinpoint accurate.' },
  finesse: { name: 'Finesse Curl',    icon: '🎯', color: '#36c5ff', desc: 'Next shot curls into the far corner and fools the keeper.' },
  speed:   { name: 'Lightning Burst', icon: '⚡', color: '#ffe236', desc: '+45% top speed for 5 seconds.' },
  magnet:  { name: 'Magnet Feet',     icon: '🧲', color: '#d05cff', desc: 'Cannot be tackled for 5 seconds; razor-sharp turns.' },
  vision:  { name: 'Vision Pass',     icon: '👁️', color: '#4dffa6', desc: 'Next pass is a perfect laser to the most dangerous teammate.' },
  wall:    { name: 'Iron Wall',       icon: '🧱', color: '#b0b8c4', desc: 'For 6 seconds: huge tackle range and tackles almost always win.' },
  cat:     { name: 'Cat Reflexes',    icon: '🧤', color: '#ff9f1c', desc: 'Passive (goalkeeper): makes far more saves.' },
  captain: { name: 'Captain',         icon: '🎖️', color: '#ffd166', desc: 'Whole team runs 18% faster for 6 seconds.' },
  tank:    { name: 'Bulldozer',       icon: '🦏', color: '#9a7b4f', desc: '5 seconds of pure strength: can\'t lose the ball, knocks defenders over.' },
};
const TRAITS_BY_POS = {
  GK: ['cat'], CB: ['wall', 'tank', 'captain'], LB: ['speed', 'wall'], RB: ['speed', 'wall'],
  CDM: ['wall', 'tank', 'captain'], CM: ['vision', 'captain', 'tank'], CAM: ['vision', 'finesse', 'magnet'],
  LM: ['speed', 'magnet', 'vision'], RM: ['speed', 'magnet', 'vision'], LW: ['speed', 'magnet', 'finesse'], RW: ['speed', 'magnet', 'finesse'],
  ST: ['rocket', 'finesse', 'tank', 'speed'],
};

/* ---------------- Clubs (fictional) ---------------- */
const CLUBS = [
  { id: 'RSO', name: 'Real Solaria',       c1: '#f4f4f4', c2: '#d4af37', tier: 86 },
  { id: 'NBR', name: 'Northbridge United', c1: '#c8102e', c2: '#ffffff', tier: 85 },
  { id: 'IMS', name: 'Inter Mistral',      c1: '#0b3d91', c2: '#111111', tier: 84 },
  { id: 'ACV', name: 'AC Veloce',          c1: '#1a1a1a', c2: '#e3242b', tier: 83 },
  { id: 'BKW', name: 'Borussia Kraftwerk', c1: '#ffd400', c2: '#111111', tier: 82 },
  { id: 'OAZ', name: 'Olympique Azur',     c1: '#1e5bc6', c2: '#ffffff', tier: 81 },
  { id: 'ATF', name: 'Atlético Fuego',     c1: '#d62828', c2: '#1d3557', tier: 80 },
  { id: 'SPL', name: 'Sporting Lumen',     c1: '#0a8f3c', c2: '#ffffff', tier: 78 },
  { id: 'DYN', name: 'Dynamo Polaris',     c1: '#2a6fdb', c2: '#e8f1ff', tier: 75 },
  { id: 'FCH', name: 'FC Harbor City',     c1: '#00a6a6', c2: '#022b3a', tier: 72 },
  { id: 'RCV', name: 'Racing Valle',       c1: '#6a0dad', c2: '#ffffff', tier: 70 },
  { id: 'KRV', name: 'Kingsport Rovers',   c1: '#1f7a1f', c2: '#f5f5f5', tier: 68 },
  { id: 'AST', name: 'Athletic Stonevale', c1: '#8b0000', c2: '#ffffff', tier: 65 },
  { id: 'MRN', name: 'Marina SC',          c1: '#ff7f11', c2: '#111111', tier: 62 },
  { id: 'GLD', name: 'Golden Valley FC',   c1: '#e5b80b', c2: '#2b2b2b', tier: 60 },
  { id: 'RIV', name: 'Riverside Town',     c1: '#7fb3d5', c2: '#1b2631', tier: 58 },
  { id: 'ASH', name: 'Ashford Athletic',   c1: '#5d4037', c2: '#ffcc80', tier: 56 },
  { id: 'MIL', name: 'Millbrook FC',       c1: '#455a64', c2: '#ffeb3b', tier: 54 },
  { id: 'ICON', name: 'Icons',             c1: '#f5ecd0', c2: '#8a6d1f', tier: 0 },
  { id: 'HERO', name: 'Heroes',            c1: '#3a1078', c2: '#ffd166', tier: 0 },
];
const CLUB_BY_ID = Object.fromEntries(CLUBS.map(c => [c.id, c]));

/* ---------------- Stat generation ---------------- */
const ARCH = {
  ST:  { pac: 2, sho: 6, pas: -7, dri: 1, def: -45, phy: 1 },
  LW:  { pac: 8, sho: 0, pas: -2, dri: 6, def: -45, phy: -10 },
  RW:  { pac: 8, sho: 0, pas: -2, dri: 6, def: -45, phy: -10 },
  LM:  { pac: 6, sho: -6, pas: 2, dri: 3, def: -25, phy: -6 },
  RM:  { pac: 6, sho: -6, pas: 2, dri: 3, def: -25, phy: -6 },
  CAM: { pac: 0, sho: 2, pas: 6, dri: 6, def: -35, phy: -10 },
  CM:  { pac: -4, sho: -4, pas: 5, dri: 2, def: -6, phy: 0 },
  CDM: { pac: -8, sho: -14, pas: 0, dri: -4, def: 5, phy: 6 },
  LB:  { pac: 6, sho: -25, pas: -3, dri: -2, def: 0, phy: -2 },
  RB:  { pac: 6, sho: -25, pas: -3, dri: -2, def: 0, phy: -2 },
  CB:  { pac: -10, sho: -35, pas: -12, dri: -15, def: 6, phy: 7 },
  GK:  { div: 2, han: 0, kic: -8, ref: 3, spd: -20, pos: 1 },
};
const OUT_KEYS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
const GK_KEYS = ['div', 'han', 'kic', 'ref', 'spd', 'pos'];
const STAT_LABEL = { pac: 'PAC', sho: 'SHO', pas: 'PAS', dri: 'DRI', def: 'DEF', phy: 'PHY', div: 'DIV', han: 'HAN', kic: 'KIC', ref: 'REF', spd: 'SPD', pos: 'POS' };

function makeStats(rng, pos, ovr) {
  const a = ARCH[pos], s = {};
  for (const k in a) s[k] = clamp(Math.round(ovr + a[k] + gauss(rng) * 3.5), 18, 99);
  return s;
}
function rarityOf(ovr, rng) {
  if (ovr < 65) return 'bronze';
  if (ovr < 75) return 'silver';
  return (ovr >= 83 || rng() < 0.3) ? 'rare' : 'gold';
}
function cardPrice(p) {
  let base = 150 * Math.pow(1.135, p.ovr - 50);
  if (p.rarity === 'rare') base *= 1.25;
  if (p.rarity === 'hero') base *= 1.8;
  if (p.rarity === 'icon') base *= 2.6;
  base *= 1 + p.traits.length * 0.08;
  const r = base < 1000 ? 50 : base < 10000 ? 100 : 1000;
  return Math.max(150, Math.round(base / r) * r);
}

/* ---------------- Build the player database ---------------- */
const PLAYERS = [];
const PLAYER_BY_ID = {};
(function buildDB() {
  const rng = mulberry(20270914);
  const natCodes = Object.keys(NATIONS);
  const template = ['GK', 'GK', 'CB', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'ST', 'CM'];
  const used = new Set();
  let id = 1;
  for (const club of CLUBS) {
    if (!club.tier) continue;
    // each club leans on 3 main nations
    const natPool = [pick(rng, natCodes), pick(rng, natCodes), pick(rng, natCodes), ...natCodes];
    template.forEach((pos, i) => {
      const nat = pick(rng, natPool), N = NATIONS[nat];
      let first, last, name, tries = 0;
      do { first = pick(rng, N.first); last = pick(rng, N.last); tries++; } while (used.has(first + last) && tries < 30);
      used.add(first + last);
      const starter = i !== 1 && i !== 17;
      const ovr = clamp(Math.round(club.tier + gauss(rng) * 3.2 - (starter ? 0 : 4) + (pos === 'ST' && i === 15 ? 2 : 0)), 46, 91);
      name = N.single && rng() < 0.5 ? first : last;
      const p = mkPlayer(id++, `${first} ${last}`, name, nat, club.id, pos, ovr, rng);
      PLAYERS.push(p);
    });
  }
  // Heroes & Icons — handcrafted fictional legends
  const specials = [
    ['Leandro Ferraz', 'Ferraz', 'BRA', 'ST', 96, ['rocket', 'magnet'], 'icon'],
    ['Henrik Vandenberg', 'Vandenberg', 'NED', 'CAM', 95, ['vision', 'finesse'], 'icon'],
    ['Zacharie Delacroix', 'Delacroix', 'FRA', 'CM', 95, ['magnet', 'vision'], 'icon'],
    ['Dario Monterossi', 'Monterossi', 'ITA', 'CB', 94, ['wall', 'captain'], 'icon'],
    ['Esteban Quiroga', 'E. Quiroga', 'ARG', 'CAM', 94, ['finesse', 'magnet'], 'icon'],
    ['Oskar Brandvold', 'Brandvold', 'GER', 'GK', 94, ['cat'], 'icon'],
    ['Augustine Okoro', 'Okoro', 'NGA', 'ST', 93, ['speed', 'rocket'], 'icon'],
    ['Rui Santarém', 'Santarém', 'POR', 'RW', 93, ['speed', 'finesse'], 'icon'],
    ['Geoff Hartwell', 'Hartwell', 'ENG', 'CDM', 92, ['captain', 'tank'], 'icon'],
    ['Takeshi Moriyama', 'Moriyama', 'JPN', 'CM', 91, ['vision'], 'icon'],
    ['Marco Ventura', 'Ventura', 'ITA', 'CAM', 90, ['finesse'], 'hero'],
    ['Marcus Delaney', 'Delaney', 'ENG', 'ST', 90, ['rocket'], 'hero'],
    ['Florent Lacaze', 'Lacaze', 'FRA', 'LW', 90, ['magnet', 'speed'], 'hero'],
    ['Pablo Arrieta', 'Arrieta', 'ESP', 'CM', 89, ['vision'], 'hero'],
    ['Klaus Reinhardt', 'Reinhardt', 'GER', 'CB', 89, ['wall'], 'hero'],
    ['Sander Bijl', 'Bijl', 'NED', 'GK', 89, ['cat'], 'hero'],
    ['Youssef Benkirane', 'Benkirane', 'MAR', 'RW', 88, ['speed', 'magnet'], 'hero'],
    ['Tyrese Holloway', 'Holloway', 'USA', 'LB', 88, ['speed'], 'hero'],
    ['Chidi Okereke', 'Okereke', 'NGA', 'CDM', 88, ['tank'], 'hero'],
    ['Kenji Arakawa', 'Arakawa', 'JPN', 'RB', 87, ['speed', 'wall'], 'hero'],
  ];
  for (const [full, short, nat, pos, ovr, traits, rarity] of specials) {
    const p = mkPlayer(id++, full, short, nat, rarity === 'icon' ? 'ICON' : 'HERO', pos, ovr, rng, traits, rarity);
    PLAYERS.push(p);
  }
  for (const p of PLAYERS) PLAYER_BY_ID[p.id] = p;

  function mkPlayer(id, full, name, nat, club, pos, ovr, rng, traits, rarity) {
    const stats = makeStats(rng, pos, ovr + (rarity ? 1 : 0));
    if (!traits) {
      traits = [];
      const chance = clamp((ovr - 55) / 55, 0.04, 0.65);
      if (rng() < chance) traits.push(pick(rng, TRAITS_BY_POS[pos]));
      if (ovr >= 85 && rng() < 0.35) { const t = pick(rng, TRAITS_BY_POS[pos]); if (!traits.includes(t)) traits.push(t); }
    }
    const N = NATIONS[nat];
    const look = {
      skin: N.skins[Math.floor(rng() * N.skins.length)],
      hair: Math.floor(rng() * 7), hairColor: Math.floor(rng() * 6), beard: rng() < 0.3,
    };
    const p = { id, full, name, nat, club, pos, ovr, stats, traits, look, rarity: rarity || rarityOf(ovr, rng) };
    p.price = cardPrice(p);
    return p;
  }
})();

/* ---------------- Team helpers ---------------- */
function bestXI(cards, formation) {
  const slots = FORMATIONS[formation];
  const order = slots.map((s, i) => i).sort((a, b) => (slots[a][0] === 'GK' ? -1 : 0) - (slots[b][0] === 'GK' ? -1 : 0));
  const pool = cards.slice();
  const res = new Array(slots.length).fill(null);
  for (const i of order) {
    let best = -1, bestV = -1e9;
    pool.forEach((c, j) => { const v = c.ovr - posPenalty(c.pos, slots[i][0]) * 1.5; if (v > bestV) { bestV = v; best = j; } });
    if (best >= 0) res[i] = pool.splice(best, 1)[0];
  }
  return res;
}
function teamRating(cards, formation) {
  const slots = FORMATIONS[formation];
  let sum = 0, n = 0;
  cards.forEach((c, i) => { if (c) { sum += Math.max(1, c.ovr - posPenalty(c.pos, slots[i][0])); n++; } });
  return n ? Math.round(sum / 11) : 0;
}
function clubSquad(clubId, formation = '4-3-3') {
  return bestXI(PLAYERS.filter(p => p.club === clubId), formation);
}
