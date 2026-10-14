'use strict';
/* =========================================================
   Card + avatar rendering
   ========================================================= */
const SKIN = ['#f6d3b3', '#e8b48c', '#c98e62', '#9a6440', '#6b4226'];
const HAIR = ['#151515', '#3b2414', '#6b4423', '#b07d4f', '#e3c27a', '#8a8a8a'];

function avatarSVG(p, shirt) {
  const L = p.look, sk = SKIN[L.skin], hc = HAIR[L.hairColor];
  const club = CLUB_BY_ID[p.club];
  shirt = shirt || club.c1;
  const trim = club.c2;
  let hair = '';
  switch (L.hair) {
    case 0: hair = `<path d="M30 40 Q30 18 50 17 Q70 18 70 40 Q66 28 50 27 Q34 28 30 40Z" fill="${hc}"/>`; break; // short
    case 1: hair = `<path d="M31 38 Q32 21 50 20 Q68 21 69 38 Q64 30 50 30 Q36 30 31 38Z" fill="${hc}" opacity=".85"/>`; break; // buzz
    case 2: hair = `<path d="M28 52 Q24 16 50 15 Q76 16 72 52 L68 52 Q68 28 50 28 Q32 28 32 52Z" fill="${hc}"/>`; break; // long
    case 3: hair = ''; break; // bald
    case 4: hair = `<ellipse cx="50" cy="26" rx="24" ry="15" fill="${hc}"/>`; break; // afro
    case 5: hair = `<path d="M44 34 Q44 10 50 9 Q56 10 56 34Z" fill="${hc}"/><path d="M31 38 Q32 24 50 23 Q68 24 69 38" fill="none" stroke="${hc}" stroke-width="1.5" opacity=".5"/>`; break; // mohawk
    default: hair = `<path d="M29 42 Q27 17 52 16 Q74 18 71 36 Q60 24 42 30 Q34 33 29 42Z" fill="${hc}"/>`; // swept
  }
  const beard = L.beard ? `<path d="M35 50 Q36 70 50 72 Q64 70 65 50 Q62 62 50 63 Q38 62 35 50Z" fill="${hc}" opacity=".8"/>` : '';
  return `<svg class="avatar" viewBox="0 0 100 100">
    <path d="M10 100 Q12 78 34 74 L66 74 Q88 78 90 100Z" fill="${shirt}"/>
    <path d="M40 74 L50 86 L60 74" fill="none" stroke="${trim}" stroke-width="4"/>
    <rect x="43" y="60" width="14" height="16" rx="5" fill="${sk}"/>
    <ellipse cx="30.5" cy="46" rx="3.5" ry="6" fill="${sk}"/><ellipse cx="69.5" cy="46" rx="3.5" ry="6" fill="${sk}"/>
    <ellipse cx="50" cy="44" rx="19" ry="23" fill="${sk}"/>
    ${beard}
    <ellipse cx="42" cy="44" rx="2.3" ry="2.6" fill="#1d1d1d"/><ellipse cx="58" cy="44" rx="2.3" ry="2.6" fill="#1d1d1d"/>
    <path d="M37 38.5 L46 37.5 M54 37.5 L63 38.5" stroke="${hc}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M50 46 L48 53 L52 53" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.4"/>
    <path d="M44 59 Q50 62 56 59" fill="none" stroke="rgba(60,20,20,.6)" stroke-width="1.8" stroke-linecap="round"/>
    ${hair}
  </svg>`;
}

function clubBadge(clubId) {
  const c = CLUB_BY_ID[clubId] || { c1: '#555', c2: '#fff', id: clubId };
  return `<span class="badge" style="background:${c.c1};color:${c.c2};border-color:${c.c2}">${c.id.slice(0, 3)}</span>`;
}

const RARITY_LABEL = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', rare: 'Rare Gold', hero: 'Hero', icon: 'Icon' };

/* size: font-size scale in px (card is 10em x 14em) */
function cardHTML(p, opts = {}) {
  const size = opts.size || 11;
  const keys = p.pos === 'GK' ? GK_KEYS : OUT_KEYS;
  const stats = keys.map(k => `<div><b>${p.stats[k]}</b><span>${STAT_LABEL[k]}</span></div>`).join('');
  const traits = p.traits.map(t => `<span class="trait" style="--tc:${TRAITS[t].color}" title="${TRAITS[t].name}: ${TRAITS[t].desc}">${TRAITS[t].icon}</span>`).join('');
  const extra = opts.extra || '';
  return `<div class="card r-${p.rarity} ${opts.cls || ''}" style="font-size:${size}px" data-pid="${p.id}" ${opts.uid ? `data-uid="${opts.uid}"` : ''}>
    <div class="c-shine"></div>
    <div class="c-left">
      <div class="c-ovr">${p.ovr}</div>
      <div class="c-pos">${p.pos}</div>
      <div class="c-flag">${flagSVG(p.nat)}</div>
      <div class="c-club">${clubBadge(p.club)}</div>
    </div>
    <div class="c-face">${avatarSVG(p)}</div>
    <div class="c-name">${p.name}</div>
    <div class="c-stats">${stats}</div>
    <div class="c-traits">${traits}</div>
    ${extra}
  </div>`;
}

function fmt(n) { return n.toLocaleString('en-US'); }
