import {
  PRODUCTS, SHELF, PICKS, LAUNCHES, REFILLS, PUBLIC_REVIEWS, COMMUNITY, CREATORS,
  ROUTINE, SAMPLE_SLOTS, CHALLENGES, MILESTONES, ASK_DEW_REPLIES,
} from './data.js';

/* ================= state ================= */

const STORE_KEY = 'dew-state-v1';
const REWARD_PTS = 1500;

const defaultState = () => ({
  setupStep: 2, // onboarding steps finished (0-4)
  answers: {
    location: ['Miami, FL'], lifestyle: ['Outdoors often', 'Works out 4+ a week'], diet: ['Dairy-free'],
    outdoors: ['1–2 hrs'], sleep: ['6–8 hrs'], stress: ['Medium'],
    skinType: ['Combination'], concerns: ['Breakouts', 'Redness', 'Dark spots'], age: ['25–29'], gender: ['Woman'], ethnicity: ['Southeast Asian'],
    goals: ['Clear breakouts', 'Calm redness', 'Fade dark spots'], size: ['Standard  4–5 steps'], budget: ['$15–30'], musts: ['Fragrance-free', 'Cruelty-free'], shops: ['Sephora', 'Olive Young'],
  },
  points: 1240,
  streak: 23,
  cart: [],
  orders: [],
  added: {},
  ratings: Object.fromEntries(SHELF.map((s) => [s.id, s.score])),
  stars: {},
  quickFeel: 'Good',
  quickDone: false,
  shelfOpen: null,
  usePoints: true,
  routinePick: Object.fromEntries(ROUTINE.map((r) => [r.step, 0])),
  pickedMode: 'full',
  sample: { picks: { cleanse: 'gmcleanser', tone: 'anua_toner', moisturize: 'farmacy_halo' }, pay: 'points', status: 'none', verdicts: {} },
  rewardDismissed: false,
  audience: 'Friends',
  filterOpen: false,
  filters: { skin: ['Combination', 'Acne-prone'], env: ['Humid'], sort: 'Most similar to me' },
  helpful: {},
  following: {},
  profileTab: 'progress',
  askOpen: false,
  chat: [
    { me: true, text: 'Can I use my TXA pads on retinol nights?' },
    { me: false, text: 'Yes, if you swipe them in the morning. 41 people with your skin who split them saw less irritation by week 2.' },
  ],
  checkin: { feel: { Hydration: 'Better', Breakouts: 'Much better', Redness: 'Much better', Texture: 'Same', Oiliness: 'Same' }, extra: ['Stressed', 'Lots of sun'], verdict: 'buy', submitted: false, note: '' },
});

let state = load();
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch (e) { /* storage unavailable: run in memory */ }
  return defaultState();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}
function set(patch) { state = { ...state, ...patch }; save(); render(); }

/* ================= helpers ================= */

const P = (id) => PRODUCTS[id];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `$${n.toFixed(2).replace(/\.00$/, '')}`;
const money2 = (n) => `$${n.toFixed(2)}`;
const band = (s) => (s >= 9 ? 'b1' : s >= 8 ? 'b2' : s >= 7 ? 'b3' : s >= 6 ? 'b4' : 'b5');
const ring = (s, sm) => `<span class="ring ${sm ? 'sm ' : ''}${band(+s)}">${(+s).toFixed(1)}</span>`;
const pctBand = (p) => band(p / 10);
const match = (p) => `<span class="pill match ${pctBand(p)}">${p}% similar</span>`;
const thumb = (id, w = 48, h = 56) => `<span class="thumb" style="width:${w}px;height:${h}px"><img src="${P(id).img}" alt="${esc(P(id).name)}"></span>`;
const svg = (name, w) => `<img src="assets/svg/${name}.svg" alt="" style="width:${w}px">`;
const starsTxt = (n) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
const shelfItem = (id) => SHELF.find((s) => s.id === id);
const cartCount = () => state.cart.reduce((a, c) => a + c.qty, 0);
const strength = () => state.setupStep * 25;
const route = () => (location.hash.replace(/^#\/?/, '') || 'for-you').split('?')[0];
const go = (r) => { location.hash = `#/${r}`; };

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.innerHTML = `<div class="toast">${esc(msg)}</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.innerHTML = ''; }, 2600);
}

function addToCart(id, kind = 'pick', note = '') {
  const cart = [...state.cart];
  const existing = cart.find((c) => c.id === id && c.kind === kind);
  if (existing) existing.qty += 1;
  else cart.push({ id, kind, note, qty: 1 });
  set({ cart, added: { ...state.added, [id]: true } });
  toast(`Added ${P(id).name} to your cart`);
}

function earn(pts, why) {
  set({ points: state.points + pts });
  if (why) toast(`+${pts} pts  ${why}`);
}

/* ================= top nav ================= */

function nav(active) {
  const tabs = [['for-you', 'For you'], ['creators', 'Creators'], ['community', 'Community'], ['picked', 'Picked for you']];
  const n = cartCount();
  return `
    <a href="#/for-you" aria-label="DEW home"><img class="logo" src="assets/svg/logo.svg" alt="DEW"></a>
    <form class="search" data-form="search" role="search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="#9a9e92" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="#9a9e92" stroke-width="2" stroke-linecap="round"/></svg>
      <input name="q" placeholder="Search products, ingredients, people…" value="${esc(state.lastSearch || '')}" autocomplete="off">
    </form>
    <span class="nav-spacer"></span>
    <nav class="tabs">${tabs.map(([r, l]) => `<a class="tab ${active === r ? 'active' : ''}" href="#/${r}">${l}</a>`).join('')}</nav>
    <a class="pts-pill" href="#/profile" title="Your points">${svg('flame', 20)}${state.points.toLocaleString()} PTS</a>
    <a class="icon-btn" href="#/cart" aria-label="Cart, ${n} items">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 4h2.2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.1" stroke="#141C11" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="19.5" r="1.4" fill="#141C11"/><circle cx="17" cy="19.5" r="1.4" fill="#141C11"/></svg>
      ${n ? `<span class="badge-count">${n}</span>` : ''}
    </a>
    <button class="icon-btn" data-act="toast" data-msg="No new notifications" aria-label="Notifications">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" stroke="#141C11" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 20.5a2 2 0 0 0 4 0" stroke="#141C11" stroke-width="1.8"/></svg>
    </button>
    <a href="#/profile" aria-label="Your profile"><img class="avatar" src="assets/img/progress/w5.jpg" alt=""></a>`;
}

/* ================= left column: check-in + shelf ================= */

function quickCheckin() {
  const feels = ['Rough', 'Meh', 'Okay', 'Good', 'Glowing'];
  const target = 'anua_night';
  const s = state.stars[target] ?? 4;
  return `
    <section class="card stack" aria-label="Quick check-in">
      <div class="row between"><span class="h4" style="font-size:15px">How’s your skin today?</span><span class="mono">+10 pts</span></div>
      <div class="row wrap" style="gap:6px">${feels.map((f) => `<button class="chip ${state.quickFeel === f ? 'on' : ''}" data-act="feel" data-v="${f}">${f}</button>`).join('')}</div>
      <div class="row card soft" style="padding:10px">
        ${thumb(target, 30, 36)}
        <div class="grow"><div class="small" style="font-weight:500">Rate Anua Retinol Night Cream</div><div class="xs muted">Week 3: is it working?</div></div>
        <span class="stars">${[1, 2, 3, 4, 5].map((i) => `<button class="${i <= s ? 'on' : ''}" data-act="star" data-id="${target}" data-v="${i}" aria-label="${i} stars">★</button>`).join('')}</span>
      </div>
      <button class="btn dark block" data-act="quick-checkin" ${state.quickDone ? 'disabled' : ''}>${state.quickDone ? 'Logged today ✓' : 'Log check-in'}</button>
    </section>`;
}

function shelfRows(items, { selectable = true, open } = {}) {
  const rows = [items.slice(0, 6), items.slice(6, 12)].filter((r) => r.length);
  return `<div class="shelf">${rows.map((r) => `<div class="plank-row">${r.map((s) => `
      <button class="slot ${open === s.id ? 'active' : ''}" ${selectable ? `data-act="shelf-open" data-id="${s.id}"` : ''} aria-label="${esc(P(s.id).name)}">
        <img src="${P(s.id).img}" alt="">${s.arriving ? '<span class="pill arriving" style="background:var(--lime)">new</span>' : ''}
      </button>`).join('')}</div>`).join('<div style="height:8px"></div>')}</div>`;
}

function myShelf() {
  const items = [...SHELF, ...(state.orders.flatMap((o) => o.items.filter((i) => !SHELF.some((s) => s.id === i.id)).map((i) => ({ id: i.id, arriving: true, score: null }))))].slice(0, 12);
  const open = state.shelfOpen ? shelfItem(state.shelfOpen) : null;
  const rank = open ? [...SHELF].sort((a, b) => state.ratings[b.id] - state.ratings[a.id]).findIndex((s) => s.id === open.id) + 1 : 0;
  return `
    <section class="card stack" aria-label="My shelf" style="position:relative">
      <div class="row between">
        <div><h2 class="h2" style="font-size:28px">My Shelf</h2><div class="xs muted">${SHELF.length} products  ranked by you</div></div>
        <a class="btn" href="#/search">+ Add</a>
      </div>
      ${shelfRows(items, { open: state.shelfOpen })}
      <p class="xs muted" style="margin-top:6px">Tap any product to rate it, review it or log a refill.</p>
      ${open ? `
        <div class="shelf-pop stack" style="position:relative;width:auto">
          <div class="row between"><span class="mono">${esc(P(open.id).brand)}</span><button class="link" style="color:#fff" data-act="shelf-close">Close</button></div>
          <div class="h4" style="font-size:17px;font-weight:400">${esc(P(open.id).name)}</div>
          <div class="row" style="gap:22px">
            <div><div class="k">Using for</div><div class="v">${open.weeks} weeks</div></div>
            <div><div class="k">Your rank</div><div class="v">#${rank} of ${SHELF.length}</div></div>
            <div><div class="k">Score</div><div class="v">${state.ratings[open.id].toFixed(1)}</div></div>
          </div>
          <div class="bar"><span style="width:${open.daysLeft ? Math.min(100, open.daysLeft * 4) : 82}%"></span></div>
          <div class="xs" style="color:#c8dcc9">Since ${open.since}  ${esc(P(open.id).step)} step  ${open.use}${open.daysLeft ? `  ~${open.daysLeft} days left` : ''}</div>
          <div class="row"><span class="k">Rate it</span><span class="stars">${[1, 2, 3, 4, 5].map((i) => `<button class="${i <= Math.round(state.ratings[open.id] / 2) ? 'on' : ''}" data-act="rate-shelf" data-id="${open.id}" data-v="${i}" aria-label="${i} stars">★</button>`).join('')}</span></div>
          <div class="row">
            <a class="btn sm" href="#/check-in">Review</a>
            <button class="btn sm" data-act="refill" data-id="${open.id}">Log refill</button>
            <button class="btn sm" data-act="ask" data-q="${esc(`What pairs well with ${P(open.id).name}?`)}">Ask Dew</button>
          </div>
        </div>` : ''}
    </section>`;
}

function finishProfileCard() {
  if (state.setupStep >= 4) return '';
  const left = [[3, 'Preferences + goals', '~1 min'], [4, 'Your current shelf', '~2 min']].filter(([n]) => n > state.setupStep);
  return `
    <section class="card dark stack">
      <div class="row">${svg('hydrate', 26)}${svg('treat', 26)}${svg('protect', 26)}</div>
      <span class="mono lime">Skin profile: ${state.setupStep} of 4 done</span>
      <h3 class="h2" style="font-size:26px">Finish your profile to unlock Picked for you</h3>
      <div class="meter"><span style="width:${strength()}%"></span></div>
      ${left.map(([n, l, t]) => `<a class="row" href="#/setup/${n}" style="text-decoration:none;padding:8px 12px;border-radius:10px;background:rgb(255 255 255 / 8%)"><span class="grow small">${n}: ${l}</span><span class="xs" style="color:#c8dcc9">${t}</span></a>`).join('')}
      <p class="xs" style="color:#c8dcc9">Each step sharpens your picks. Finish both: +150 pts and picks matched on all 4 steps.</p>
      <a class="btn primary" href="#/setup/${state.setupStep + 1}" style="align-self:flex-start">Finish my profile →</a>
    </section>`;
}

function downloadApp() {
  return `
    <section class="card dark stack">
      <div class="row">${svg('hydrate', 26)}${svg('treat', 26)}${svg('protect', 26)}</div>
      <span class="mono lime">Track on the go</span>
      <h3 class="h3" style="font-size:24px">Log your progress in the DEW app</h3>
      <p class="small" style="color:#c8dcc9">Take your weekly progress photo with the same framing every time, tick off your AM and PM routine, and get refill nudges. Everything syncs back here.</p>
      <a class="row" href="#/profile" data-act="toast" data-msg="The DEW iOS app is coming soon" style="align-self:flex-start;gap:8px;padding:8px 16px 8px 12px;background:#000;border:1px solid #a6a6a6;border-radius:9px;text-decoration:none;color:#fff">
        <svg width="18" height="22" viewBox="0 0 814 1000"><path fill="#fff" d="M788 340c-6 4-110 63-110 193 0 151 132 204 136 206-1 3-21 73-70 145-44 63-90 126-160 126s-88-41-169-41c-79 0-107 42-171 42s-109-58-160-130C25 797 0 677 0 563c0-183 119-280 236-280 62 0 114 41 153 41 37 0 95-43 166-43 27 0 124 2 188 99zM549 154c30-35 51-84 51-133 0-7-1-14-2-19-48 2-105 32-140 72-27 31-53 80-53 130 0 8 1 15 2 18 3 1 9 1 14 1 43 0 97-29 128-69z"/></svg>
        <span><span style="display:block;font-size:9px">Download on the</span><span style="font-size:17px;font-weight:500;line-height:1">App Store</span></span>
      </a>
    </section>`;
}

const leftCol = (extra = '') => `${quickCheckin()}${myShelf()}${extra}`;

/* ================= right rail ================= */

function rightRail() {
  return `
    <section class="card stack">
      <h3 class="h4">New from brands you love</h3>
      <p class="xs muted">Just launched by brands already on your shelf</p>
      ${LAUNCHES.map((l) => `
        <div class="row" style="align-items:flex-start">
          ${thumb(l.id, 40, 48)}
          <div class="grow stack" style="gap:2px">
            <span class="mono">${esc(P(l.id).brand)}</span>
            <span class="small" style="font-weight:500">${esc(P(l.id).name)}</span>
            <span class="xs"><span class="mono" style="color:var(--forest)">${l.step}</span>  ${l.helps}  ${l.buy}% buy</span>
          </div>
          <button class="add-btn ${state.added[l.id] ? 'added' : ''}" data-act="add" data-id="${l.id}" aria-label="Add to cart">${state.added[l.id] ? '✓' : '+'}</button>
        </div>`).join('')}
      <button class="btn block" data-act="search" data-q="new">See all new launches</button>
    </section>
    <section class="card stack" style="margin-bottom:56px">
      <span class="mono forest">Running low</span>
      <h3 class="h4" style="font-size:17px;font-weight:400">Want to refill or replace something on your shelf?</h3>
      ${REFILLS.map((r) => `
        <div class="card soft stack" style="padding:12px">
          <div class="row">${thumb(r.id, 34, 42)}<div class="grow"><div class="small" style="font-weight:500">${esc(P(r.id).name)}</div><div class="xs muted">${r.note}</div></div></div>
          <div class="row wrap" style="gap:6px">
            ${r.action === 'refill'
              ? `<button class="btn dark sm" data-act="refill" data-id="${r.id}">Refill ${money(P(r.id).price)}</button>`
              : `<button class="btn dark sm" data-act="swap" data-id="${r.replaceWith}" data-from="${r.id}">Replace</button>`}
            <span class="btn sm" style="cursor:default">${r.alt}</span>
          </div>
        </div>`).join('')}
    </section>`;
}

function askDew() {
  if (!state.askOpen) return `<button class="askdew-pill" data-act="ask-open">${svg('hydrate', 22)}Ask Dew <span class="arrow">↑</span></button>`;
  return `
    <section class="askdew-panel" aria-label="Ask Dew">
      <div class="row">${svg('hydrate', 22)}<span class="h4 grow">Ask Dew</span><button class="link mono" data-act="ask-close">Minimize ↘</button></div>
      <p class="xs muted">Your AI skincare assistant. Answers pull from your shelf, tracker and people like you.</p>
      <div class="chat" id="chat">${state.chat.map((m) => `<div class="msg ${m.me ? 'me' : 'dew'}">${esc(m.text)}</div>`).join('')}</div>
      <div class="row wrap" style="gap:6px">
        ${['Swap my Bioré for winter?', 'Best SPF for humid days', 'What is a sample box?'].map((q) => `<button class="chip" data-act="ask" data-q="${q}">↳ ${q}</button>`).join('')}
      </div>
      <form class="chat-input" data-form="ask"><input name="q" placeholder="Ask about your routine…" autocomplete="off"><button class="send" aria-label="Send">↑</button></form>
    </section>`;
}

/* ================= For you ================= */

function pickRow(p, i) {
  const pr = P(p.id);
  return `
    <div class="pick">
      <span class="rank">${i + 1}</span>
      ${thumb(p.id, 56, 56)}
      <div class="grow stack" style="gap:4px">
        <span class="mono">${esc(pr.brand)}</span>
        <span style="font-size:15px">${esc(pr.name)}</span>
        <span class="small muted">${esc(p.why)}</span>
        <span class="row xs muted" style="gap:14px"><span class="buybar"><span style="width:${p.buy}%"></span></span><span class="mono" style="color:var(--ink)">${p.buy}% say buy</span><span>${p.results}</span><span>${p.matched} matched</span></span>
      </div>
      ${ring(p.score)}
      <button class="add-btn ${state.added[p.id] ? 'added' : ''}" data-act="add" data-id="${p.id}" aria-label="Add ${esc(pr.name)} to cart" title="${money(pr.price)}">${state.added[p.id] ? '✓' : '+'}</button>
    </div>`;
}

function verdictReview(r) {
  return `
    <div class="card stack" style="padding:18px">
      <div class="row" style="align-items:flex-start">
        <span class="btn sm ${r.verdict === 'buy' ? 'dark' : ''}" style="cursor:default;${r.verdict === 'buy' ? '' : 'background:var(--olive);border-color:var(--olive);color:#fff'}">${r.verdict === 'buy' ? '✓ Buy' : '✕ Don’t buy'}</span>
        <div class="grow"><div class="mono">Results seen</div><div class="h4" style="font-weight:400;font-size:16px">${r.resultWeek}</div></div>
        ${thumb(r.product, 34, 40)}
        <div style="max-width:150px"><div class="mono">${esc(P(r.product).brand)}</div><div class="small">${esc(P(r.product).name)}</div></div>
        ${ring(r.score)}
      </div>
      <div class="row wrap" style="gap:6px"><span class="mono">Changes</span>${r.changes.map((c) => `<span class="tag">${c}</span>`).join('')}</div>
      <p>“${esc(r.text)}”</p>
      <div class="row"><img class="avatar" style="width:24px;height:24px" src="${r.avatar}" alt=""><span class="small">${esc(r.name)}</span><span class="src">${r.source}</span><span class="xs faint grow">${r.meta}</span>${match(r.similar)}</div>
    </div>`;
}

function forYou() {
  const done = state.setupStep >= 4;
  const tags = ['Combination', 'Breakouts + redness', 'Humid  Miami', '25–29', 'Dairy-free'];
  const main = `
    <div class="row between"><h1 class="h2">For you</h1></div>
    <div class="row wrap" style="gap:8px"><span class="mono">Matched to you</span>${tags.map((t) => `<span class="tag">${t}</span>`).join('')}<a class="xs" href="#/setup/1">Edit profile</a></div>
    <section class="hero">
      ${done ? '' : '<span class="mono lime">Picked for you</span>'}
      <h2 class="h1">Too many options? We’ll pick for you.</h2>
      <div class="row" style="align-items:flex-end;gap:20px">
        <div class="grow stack">
          <p class="xs" style="color:#d9e6d6">${done ? 'One product per step, chosen from 1,486 people who match you on all 4 profile steps.' : `Picked for you builds a 4-step routine from people like you. Finish ${4 - state.setupStep} more profile steps to unlock it.`}</p>
          ${done ? '<a class="btn lime" href="#/picked" style="align-self:flex-start">See my routine →</a>' : `<a class="btn lime" href="#/setup/${state.setupStep + 1}" style="align-self:flex-start">Finish profile to unlock →</a>`}
        </div>
        <div class="box-illo" aria-hidden="true">
          <span class="bottle" style="left:40px;height:56px"></span><span class="bottle" style="left:80px;height:70px;width:24px"></span><span class="bottle" style="left:120px;height:48px;width:44px"></span><span class="bottle" style="left:176px;height:60px;width:22px"></span>
          <span class="lid"></span><span class="box"></span><span class="label">Your box</span>
        </div>
      </div>
    </section>
    <section class="card">
      <div class="row between" style="align-items:flex-start"><div><h3 class="h4">Picked for your routine</h3><p class="xs muted">Ranked by impact for you, not just ratings. 10 picks from people with your skin.</p></div><button class="link mono" data-act="search" data-q="">See all 48 →</button></div>
      <h4 class="small" style="font-weight:500;margin-top:14px">Fills a gap in your routine</h4>
      ${PICKS.gaps.map(pickRow).join('')}
      <hr class="divider">
      <h4 class="small" style="font-weight:500;margin-top:8px">Want to try something new?</h4>
      ${PICKS.fresh.map(pickRow).join('')}
      <p class="xs faint" style="margin-top:8px">Why these? We look at what your shelf is missing, what’s almost empty, and what people like you upgraded to.</p>
    </section>
    <section class="card stack">
      <h3 class="h4">What people like you are saying</h3>
      <p class="xs muted">Public reviews from people with your skin, from Sephora, Reddit and YesStyle. Your friends are on the Community tab.</p>
      ${PUBLIC_REVIEWS.map(verdictReview).join('')}
      <a class="btn" href="#/community" style="align-self:flex-start">Show more reviews</a>
    </section>`;
  return { layout: '', left: leftCol(finishProfileCard()), main, right: rightRail(), ask: true };
}

/* ================= onboarding ================= */

const SETUP = [
  { n: 1, name: 'Lifestyle', title: 'Start with how you live', sub: 'Climate, sun, sleep and diet change what works on your skin. This takes about a minute.', groups: [
    ['Where + how you live', 'protect', [['location', 'Location', ['Miami, FL', 'Humid  74%', 'High UV'], true], ['lifestyle', 'Lifestyle', ['Outdoors often', 'Works out 4+ a week', 'Indoors with AC all day', 'Travels often', 'Sleeps under 6 hours', 'Wears makeup daily', 'Stressful job']], ['diet', 'Diet', ['Balanced', 'Dairy-free', 'Vegan', 'Vegetarian', 'Lots of sugar', 'High protein', 'Drinks 2L+ water']]]],
    ['Your day-to-day', 'cleanse', [['outdoors', 'Time outdoors', ['Mostly indoors', '1–2 hrs', '3+ hrs'], true], ['sleep', 'Sleep', ['Under 6 hrs', '6–8 hrs', '8+ hrs'], true], ['stress', 'Stress lately', ['Low', 'Medium', 'High'], true]]],
  ] },
  { n: 2, name: 'My skin', title: 'Tell us about your skin', sub: 'Skin type, concerns and background are how we find people whose results predict yours.', groups: [
    ['Skin', 'cleanse', [['skinType', 'Skin type', ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'], true], ['concerns', 'Concerns', ['Breakouts', 'Redness', 'Dark spots', 'Texture', 'Large pores', 'Dryness', 'Fine lines', 'Sensitivity']]]],
    ['About you', 'hydrate', [['age', 'Age range', ['Under 18', '18–24', '25–29', '30–34', '35–44', '45+'], true], ['gender', 'Gender', ['Woman', 'Man', 'Non-binary', 'Prefer not to say'], true], ['ethnicity', 'Ethnicity (optional)', ['East Asian', 'South Asian', 'Southeast Asian', 'Black', 'Hispanic / Latine', 'Middle Eastern', 'White', 'Mixed', 'Prefer not to say']]]],
  ] },
  { n: 3, name: 'Preferences + goals', title: 'What do you want from your routine?', sub: 'Your goals rank the picks. Budget and must-haves filter out anything that doesn’t fit.', groups: [
    ['Preferences + goals', 'treat', [['goals', 'Top goals (pick up to 3)', ['Clear breakouts', 'Calm redness', 'Fade dark spots', 'Smoother texture', 'Hydration', 'Anti-aging', 'Glow'], false, 3], ['size', 'Routine size', ['Minimal  3 steps', 'Standard  4–5 steps', 'Full  6+ steps'], true], ['budget', 'Budget per product', ['Under $15', '$15–30', '$30–60', '$60+'], true], ['musts', 'Must-haves', ['Fragrance-free', 'Cruelty-free', 'Vegan', 'Reef-safe SPF', 'Fungal-acne safe', 'Pregnancy-safe']], ['shops', 'Where you shop', ['Sephora', 'Ulta', 'Amazon', 'Olive Young', 'Brand sites']]]],
  ] },
  { n: 4, name: 'Current shelf', title: 'Add what’s already on your shelf', sub: 'The last step. We’ll find the gaps in your routine and remind you before things run out.' },
];

function strengthCard() {
  const rows = [['+50 pts', 'for every step you finish'], ['Picked for you', 'your 4-step routine'], ['Your match pool', 'people like you'], ['Refill reminders', 'before you run out']];
  return `
    <section class="card dark stack">
      <span class="mono lime">Profile strength</span>
      <div class="row" style="align-items:baseline"><span style="font-size:64px;line-height:1">${strength()}%</span><span class="mono lime">→ 100%</span></div>
      <div class="meter"><span style="width:${strength()}%"></span></div>
      <p class="xs" style="color:#d9e6d6">Picks are ${strength()}% personalized right now. Finish all 4 steps for picks built only from people like you.</p>
      <div class="stack" style="gap:8px;padding:12px;border-radius:12px;background:rgb(255 255 255 / 8%)">
        <span class="mono lime">Finish to unlock</span>
        ${rows.map(([a, b]) => `<div class="row xs" style="gap:6px"><span style="color:var(--lime)">✦</span><span style="font-weight:500">${a}</span><span style="color:#d9e6d6">${b}</span></div>`).join('')}
        <p class="xs" style="color:#d9e6d6">What are points for? 500 pts takes $5 off, and 1,500 pts unlocks a free sample box of your top 3 picks.</p>
      </div>
      <div class="row">${svg('hydrate', 24)}${svg('treat', 24)}${svg('protect', 24)}</div>
    </section>`;
}

function chipGroup([key, label, opts, single, max]) {
  const sel = state.answers[key] || [];
  return `<div class="stack" style="gap:8px"><span class="field-label">${label}</span><div class="row wrap" style="gap:6px">${opts.map((o) => `<button class="chip ${sel.includes(o) ? 'on' : ''}" data-act="answer" data-key="${key}" data-v="${esc(o)}" data-single="${single ? 1 : ''}" data-max="${max || ''}">${o}</button>`).join('')}</div></div>`;
}

function setupPage(n) {
  if (n === 'done') return setupDone();
  const s = SETUP[n - 1];
  const bar = `<div class="steps-bar">${SETUP.map((x) => `<div class="${x.n < n ? 'done' : x.n === n ? 'cur' : ''}">${x.n}  ${x.name}</div>`).join('')}</div>`;
  const body = s.groups ? s.groups.map(([t, icon, fields]) => `
      <section class="card stack" style="gap:16px">
        <div class="row">${svg(icon, 24)}<h3 class="h4" style="font-size:16px">${t}</h3></div>
        ${fields.map(chipGroup).join('')}
      </section>`).join('') : `
      <section class="card stack">
        <div class="row">${svg('cleanse', 24)}<h3 class="h4" style="font-size:16px">What’s on your shelf right now?</h3></div>
        <div class="row"><input class="grow" style="height:38px;border:1px solid var(--line);border-radius:10px;padding:0 12px;font:inherit" placeholder="Search a product to add…"><button class="btn" data-act="toast" data-msg="Scanning works in the DEW app">Scan barcode</button><button class="btn" data-act="toast" data-msg="Imported 11 products from your Sephora orders">Import orders</button></div>
        <p class="xs muted">${SHELF.length} products added. Tap a product to rank it.</p>
        ${shelfRows(SHELF, { selectable: false })}
        <div class="notice">We use your shelf to find what your routine is missing, what’s running low and what to replace.</div>
      </section>`;
  const back = n > 1 ? `<a class="btn" href="#/setup/${n - 1}">← Back</a>` : '<a class="btn" href="#/for-you">Skip for now</a>';
  const next = n < 4 ? `<button class="btn primary" data-act="setup-next" data-n="${n}">Continue to ${SETUP[n].name.toLowerCase()} →</button>` : '<button class="btn dark" data-act="setup-next" data-n="4">Finish my profile →</button>';
  const main = `${bar}<span class="mono" style="margin-top:12px">Step ${n} of 4</span><h1 class="h1">${s.title}</h1><p class="muted">${s.sub}</p>${body}<div class="row between">${back}${next}</div>`;
  return { layout: 'layout-focus', main, right: strengthCard() };
}

function setupDone() {
  const main = `
    <section class="hero hero-image" style="min-height:288px;justify-content:center;padding:32px">
      <div class="row">${svg('hydrate', 30)}${svg('treat', 30)}${svg('protect', 30)}</div>
      <span class="mono forest">4 of 4 ✓</span>
      <h1 class="h1" style="white-space:normal;max-width:680px;color:var(--forest)">Congratulations, you’ve completed your skin profile</h1>
      <p class="small" style="color:var(--forest)">Every pick, ranking and review you see is now matched on all four steps: lifestyle, skin, goals and shelf.</p>
    </section>
    <div class="grid-2">
      <section class="card dark stack">
        <span class="mono lime">Your match pool: unlocked</span>
        <span style="font-size:64px;line-height:1">1,486</span>
        <p class="xs" style="color:#d9e6d6">people like you who’ve reviewed or tracked products. Their results now rank everything you see.</p>
        ${[['Same climate + lifestyle', '12.4k', 100], ['+ similar skin', '4.1k', 60], ['+ same goals + budget', '2.3k', 40], ['+ overlapping shelf', '1,486', 25]].map(([a, b, w]) => `<div class="stack" style="gap:4px"><div class="row between xs"><span>${a}</span><span class="mono lime">${b}</span></div><div class="meter" style="height:5px"><span style="width:${w}%"></span></div></div>`).join('')}
      </section>
      <section class="card stack">
        <h3 class="h4">Unlocked for you</h3>
        ${[['Picked for you', 'Your 4-step routine, one product per step'], ['Smarter home picks', 'Ranked by gaps, refills and upgrades'], ['Refill reminders', 'We nudge you before you run out'], ['Weekly check-ins', 'Track your skin, rate your products']].map(([a, b]) => `<div class="row" style="align-items:flex-start"><span class="ring sm" style="background:var(--forest);border-color:var(--forest);color:#fff">✓</span><div><div class="small" style="font-weight:500">${a}</div><div class="xs muted">${b}</div></div></div>`).join('')}
        <span class="grow"></span>
        <a class="btn dark block" href="#/for-you">Explore products →</a>
      </section>
    </div>
    <p class="xs faint">You can edit any step later from your profile.</p>`;
  return { layout: 'layout-solo', main: `<div class="stack" style="max-width:1200px;width:100%;margin:0 auto;gap:20px">${main}</div>` };
}

/* ================= creators ================= */

function creatorShelfProducts(c) {
  if (c.shelf) return Object.values(c.shelf).flat().map(([id]) => id);
  return c.products;
}

function creatorsPage() {
  const cards = CREATORS.map((c) => {
    const items = creatorShelfProducts(c).slice(0, 16);
    const following = state.following[c.id];
    return `
      <article class="card stack creator-card">
        <div class="row"><img class="avatar" style="width:44px;height:44px" src="${c.avatar}" alt=""><div class="grow"><div class="h4">${c.name}</div><div class="xs muted">${c.handle}  ${c.followers} followers</div></div>${match(c.match).replace('similar', 'like you')}</div>
        <div class="row wrap" style="gap:6px">${c.tags.slice(0, 3).map((t) => `<span class="tag">${t}</span>`).join('')}</div>
        <div class="card soft row" style="padding:12px">${thumb(c.holyGrail, 40, 50)}<div class="grow"><span class="mono forest">★ Holy grail</span><div class="small" style="font-weight:500">${esc(P(c.holyGrail).name)}</div><div class="xs muted">“${c.quote}”</div></div>${ring(c.id === 'kara' ? 9.4 : 8.8 + (c.match % 7) / 10, true)}</div>
        <div class="mini stack" style="gap:12px">
          <div class="row between"><span class="mono">${c.name.split(' ')[0]}’s shelf</span><span class="xs muted">${items.length} products</span></div>
          ${[items.slice(0, 8), items.slice(8, 16)].filter((r) => r.length).map((r) => `<div class="plank-row">${r.map((id) => `<img src="${P(id).img}" alt="${esc(P(id).name)}" title="${esc(P(id).name)}">`).join('')}</div>`).join('<div style="height:6px"></div>')}
        </div>
        <div class="row"><button class="btn ${following ? '' : 'dark'}" data-act="follow" data-id="${c.id}">${following ? 'Following ✓' : 'Follow'}</button><a class="btn" href="#/creators/${c.id}">View shelf →</a></div>
      </article>`;
  }).join('');
  const main = `
    <div class="stack" style="max-width:1392px;width:100%;margin:0 auto;gap:16px">
      <h1 class="h2">Creators like you</h1>
      <div class="row wrap" style="gap:8px"><span class="mono">Matched to you</span>${['Combination', 'Breakouts + redness', 'Humid  Miami', '25–29'].map((t) => `<span class="tag">${t}</span>`).join('')}<span class="xs faint">Creators with your skin, climate and age match yours. Sponsored posts are always labeled.</span></div>
      <div class="grid-3">${cards}</div>
    </div>`;
  return { layout: 'layout-solo', main };
}

function rankCard(title, ids, scores, holy) {
  return `<div class="card stack" style="padding:16px"><h4 class="h4" style="font-size:14px">${title}</h4>${ids.map((id, i) => `
    <div class="row"><span style="font-size:18px;color:var(--ink-3);width:12px">${i + 1}</span>${thumb(id, 32, 38)}<div class="grow">${holy === id ? '<div class="mono forest">★ Holy grail</div>' : ''}<div class="mono">${esc(P(id).brand)}</div><div class="small">${esc(P(id).name)}</div></div>${ring(scores[id] ?? 8, true)}</div>`).join('')}</div>`;
}

function creatorPage(id) {
  const c = CREATORS.find((x) => x.id === id) || CREATORS[0];
  const shelf = c.shelf || { 'Top products': c.products.map((p, i) => [p, 9.4 - i * 0.2]) };
  const scores = Object.fromEntries(Object.values(shelf).flat());
  const categories = c.categories || Object.fromEntries(Object.entries(c.products.reduce((a, p) => { (a[P(p).step] ||= []).push(p); return a; }, {})).map(([k, v]) => [k, v.slice(0, 3)]));
  const purposes = c.purposes || {};
  const sharedIds = creatorShelfProducts(c).filter((p) => SHELF.some((s) => s.id === p));
  const left = `
    <section class="card stack">
      <a class="mono" href="#/creators" style="text-decoration:none">← Creators like you</a>
      <div class="row"><img class="avatar" style="width:72px;height:72px" src="${c.avatar}" alt=""><div><div class="h2" style="font-size:26px">${c.name}</div><div class="xs muted">${c.handle}  ${c.followers} followers</div></div></div>
      <div class="card" style="background:var(--lime);border-color:var(--lime);padding:14px"><span class="mono" style="color:var(--ink)">${c.match}% like you</span><p class="xs">Matched on combination skin, acne-prone, humid climate, age 25–29 and ${sharedIds.length + 5} shared products.</p></div>
      <div class="row wrap" style="gap:6px">${c.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
      <div class="row between"><div><div class="h2">${creatorShelfProducts(c).length}</div><div class="xs muted">products</div></div><div><div class="h2">${c.reviews || 31}</div><div class="xs muted">reviews</div></div><div><div class="h2">${c.weeks || 18}</div><div class="xs muted">weeks tracked</div></div></div>
      <div class="row"><button class="btn ${state.following[c.id] ? '' : 'dark'}" data-act="follow" data-id="${c.id}">${state.following[c.id] ? 'Following ✓' : 'Follow'}</button><button class="btn" data-act="toast" data-msg="${sharedIds.length} products in common">Compare with my shelf</button></div>
    </section>
    <section class="card stack">
      <div class="row between"><h3 class="h4">${c.name.split(' ')[0]}’s shelf</h3><span class="xs muted">${creatorShelfProducts(c).length} products</span></div>
      ${Object.entries(shelf).map(([name, items]) => `
        <div class="stack" style="gap:6px">
          <span class="mono">${name}</span>
          <div class="plank-row" style="min-height:76px;gap:8px">${items.map(([pid, s]) => `<div class="stack" style="gap:3px;align-items:center"><img src="${P(pid).img}" alt="${esc(P(pid).name)}" title="${esc(P(pid).name)}" style="width:44px;height:56px;object-fit:contain"><span class="score-pill ${band(s)}">${s.toFixed(1)}</span></div>`).join('')}</div>
          <div style="height:6px"></div>
        </div>`).join('')}
    </section>`;
  const main = `
    <div class="row between"><h1 class="h2">Top products</h1><span class="seg"><button class="on">By category</button><button data-act="toast" data-msg="Scroll down for Best for…">By purpose</button><button data-act="toast" data-msg="Scroll down for reviews">Reviews</button></span></div>
    <section class="stack"><h2 class="h3">${c.name.split(' ')[0]}’s rankings by category</h2><p class="xs muted">Everything she uses, ranked by her within each step. Her holy grail is her #1 ${P(c.holyGrail).step.toLowerCase()} pick.</p>
      <div class="grid-3">${Object.entries(categories).map(([t, ids]) => rankCard(t, ids, scores, c.holyGrail)).join('')}</div></section>
    ${Object.keys(purposes).length ? `<section class="stack"><h2 class="h3">Best for…</h2><p class="xs muted">What she would recommend for each skin goal.</p><div class="grid-3">${Object.entries(purposes).map(([t, ids]) => rankCard(t, ids, scores)).join('')}</div></section>` : ''}
    ${c.publicReviews ? `<section class="stack"><h2 class="h3">${c.name.split(' ')[0]}’s public reviews</h2><p class="xs muted">Posted on Sephora, TikTok and YouTube, pulled into DEW.</p>
      <div class="grid-3">${c.publicReviews.map(([pid, src, when, txt]) => `<div class="card stack" style="padding:16px"><div class="row">${thumb(pid, 32, 38)}<div class="grow"><div class="mono">${esc(P(pid).brand)}</div><div class="small">${esc(P(pid).name)}</div></div>${ring(scores[pid] ?? 8)}</div><p class="small">“${esc(txt)}”</p><div class="row"><span class="src">${src}</span><span class="xs muted">${when}</span></div></div>`).join('')}</div></section>` : ''}
    <section class="card row between">
      <div><h3 class="h4">You share ${sharedIds.length} of ${c.name.split(' ')[0]}’s ${creatorShelfProducts(c).length} products</h3><p class="xs muted">Her top 3 that you don’t own: ${creatorShelfProducts(c).filter((p) => !sharedIds.includes(p)).slice(0, 3).map((p) => P(p).name).join(', ')}.</p></div>
      <button class="btn dark" data-act="add-many" data-ids="${creatorShelfProducts(c).filter((p) => !sharedIds.includes(p)).slice(0, 3).join(',')}">Add her top 3 to my cart</button>
    </section>`;
  return { layout: 'layout-wide', left, main };
}

/* ================= community ================= */

function communityPage() {
  const sortFns = {
    'Most similar to me': (a, b) => b.similar - a.similar,
    'Newest first': () => 0,
    'Highest rated': (a, b) => b.score - a.score,
    'Lowest rated': (a, b) => a.score - b.score,
  };
  const feed = COMMUNITY.filter((r) => (state.audience === 'Friends' ? r.rel === 'Friend' : r.rel === 'Following')).sort(sortFns[state.filters.sort]);
  const f = state.filters;
  const fchip = (group, v, single) => `<button class="chip ${(single ? f[group] === v : f[group].includes(v)) ? 'on' : ''}" data-act="filter" data-group="${group}" data-v="${v}" data-single="${single ? 1 : ''}">${v}</button>`;
  const panel = state.filterOpen ? `
    <section class="card stack" style="box-shadow:0 6px 20px rgb(0 0 0 / 8%)">
      <div class="row wrap" style="gap:6px"><span class="mono">Skin</span>${['Combination', 'Acne-prone', 'Oily', 'Dry', 'Sensitive'].map((v) => fchip('skin', v)).join('')}<span class="mono">Environment</span>${['Humid', 'Dry climate', 'Cold winters', 'High UV'].map((v) => fchip('env', v)).join('')}</div>
      <div class="row wrap" style="gap:6px"><span class="mono">Sort</span>${Object.keys(sortFns).map((v) => fchip('sort', v, true)).join('')}</div>
      <div class="row"><button class="btn" data-act="filters-clear">Clear all</button><button class="btn dark" data-act="filters-toggle">Show ${feed.length} reviews</button></div>
    </section>` : '';
  const active = f.skin.length + f.env.length + 1;
  const main = `
    <div class="row between">
      <h1 class="h2">Community</h1>
      <span class="seg">${['Friends', 'Following'].map((a) => `<button class="${state.audience === a ? 'on' : ''}" data-act="audience" data-v="${a}">${a}</button>`).join('')}</span>
      <button class="btn ${state.filterOpen ? 'dark' : ''}" data-act="filters-toggle">${state.filterOpen ? '✕' : '⚲'}  Filter + sort  ${active}</button>
    </div>
    ${panel}
    <div class="notice">Reviews from your friends and people you follow, ranked by how similar their skin is to yours. <a href="#/setup/2" class="xs grow" style="text-align:right">Edit skin profile</a></div>
    ${feed.map((r, i) => `
      <article class="card stack">
        <div class="row"><img class="avatar" src="${r.avatar}" alt=""><div class="grow"><div class="row"><span class="h4">${esc(r.name)}</span><span class="src">${r.rel}</span></div><div class="xs muted">${r.rel}  ${r.when}</div></div>${match(r.similar)}</div>
        <div class="row">${thumb(r.product, 56, 56)}<div class="grow"><div class="mono">${esc(P(r.product).brand)}</div><div style="font-size:15px">${esc(P(r.product).name)}</div><div class="xs muted">${r.usage}</div></div>${ring(r.score)}</div>
        <p>${esc(r.text)}</p>
        <div class="row wrap" style="gap:6px">${r.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
        ${r.photos ? `<div class="stack" style="gap:6px"><span class="mono">Tracked progress: ${r.photos.length} check-ins via DEW tracker</span><div class="grid-3" style="grid-template-columns:repeat(4,1fr)">${r.photos.map((p, j) => `<div class="photo"><img src="assets/img/progress/${p}.jpg" alt=""><span class="mono">Week ${[1, 2, 4, 6][j]}</span></div>`).join('')}</div></div>` : ''}
        <div class="row xs muted" style="gap:18px">
          <button class="link" style="text-decoration:none;${state.helpful[r.name + i] ? 'color:var(--forest);font-weight:500' : ''}" data-act="helpful" data-k="${esc(r.name + i)}">▲ Helpful  ${r.helpful + (state.helpful[r.name + i] ? 1 : 0)}</button>
          <span>◌ ${r.comments} comments</span><span class="grow"></span>
          ${r.score >= 6 ? `<button class="btn" data-act="add" data-id="${r.product}">${state.added[r.product] ? 'In your cart ✓' : '+ Add to cart'}</button>` : '<button class="btn" data-act="toast" data-msg="Hidden from your picks">Hide product</button>'}
        </div>
      </article>`).join('') || '<div class="empty">No reviews match these filters.</div>'}`;
  return { layout: '', left: leftCol(), main, right: rightRail(), ask: true };
}

/* ================= Picked for you (full size + sample it first) ================= */

function modeToggle() {
  return `<span class="seg" style="align-self:flex-start">
    <button class="${state.pickedMode === 'full' ? 'on' : ''}" data-act="picked-mode" data-v="full">Full-size routine<small>4 products  ${money(routineTotal())}</small></button>
    <button class="${state.pickedMode === 'sample' ? 'on' : ''}" data-act="picked-mode" data-v="sample">Sample it first<small>3 minis  free with pts</small></button>
  </span>`;
}

const routineIds = () => ROUTINE.map((r) => r.options[state.routinePick[r.step]]);
const routineTotal = () => ROUTINE.reduce((a, r) => a + (r.owned && r.options[state.routinePick[r.step]] === r.owned ? 0 : P(r.options[state.routinePick[r.step]]).price), 0);

function pickedPage() {
  const sample = state.pickedMode === 'sample';
  const hero = `
    <section class="hero hero-image" style="padding:32px;min-height:240px;justify-content:center">
      <h1 class="h1" style="color:var(--forest);white-space:normal">${sample ? 'Your routine, sampled for you.' : 'Your routine, picked just for you.'}</h1>
      <p class="small" style="color:var(--forest);max-width:520px">${sample ? 'Not ready to commit? Get your top 3 picks in travel sizes first. Enough for about 2 weeks, free with your points.' : 'One product per step. You already have a great sunscreen, so we kept it and only filled the gaps.'}</p>
      <div class="row wrap" style="gap:6px">${['Combination', 'Breakouts + redness', 'Humid  Miami', '25–29', 'Dairy-free'].map((t) => `<span class="tag" style="background:#ffffffb0">${t}</span>`).join('')}</div>
    </section>`;
  if (sample) return { layout: 'layout-wide', left: leftCol(), main: hero + modeToggle() + sampleBuilder() };
  const cards = ROUTINE.map((r, i) => {
    const id = r.options[state.routinePick[r.step]];
    const owned = r.owned === id;
    return `
      <div class="card stack" style="padding:16px;${owned ? 'background:var(--surface-soft);border:2px solid var(--forest)' : ''}">
        <div class="row">${svg(r.icon, 20)}<span class="mono">${i + 1}  ${r.step}</span></div>
        <div class="thumb" style="height:150px;width:100%;background:${owned ? '#fff' : 'var(--surface-soft)'}"><img src="${P(id).img}" alt="" style="max-height:130px"></div>
        <div class="row" style="align-items:flex-start"><div class="grow"><div class="mono">${esc(P(id).brand)}</div><div class="small" style="font-weight:500">${esc(P(id).name)}</div></div>${ring(9.4 - i * 0.3 - state.routinePick[r.step] * 0.3)}</div>
        <div class="mono" style="color:var(--ink)">${r.buy}% of people like you say buy</div>
        <div class="xs muted">Results in ${r.results}</div>
        <p class="xs muted">${owned ? r.why : r.why}</p>
        <div class="row between">${owned ? '<span class="mono">On your shelf</span>' : `<span class="mono">Est. ${money(P(id).price)}</span>`}<button class="btn sm" data-act="routine-swap" data-step="${r.step}">↻ Swap</button></div>
      </div>`;
  }).join('');
  const main = `${hero}${modeToggle()}
    <div class="grid-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">${cards}</div>
    <section class="card row between wrap">
      <div class="row" style="gap:28px"><div><div class="mono">New products</div><div class="h3">${ROUTINE.filter((r) => r.owned !== routineIds()[ROUTINE.indexOf(r)]).length}</div></div><div><div class="mono">Est. total</div><div class="h3">${money(routineTotal())}</div></div><div><div class="mono">Expected results</div><div class="h3">3–4 weeks</div></div><div><div class="mono">Backed by</div><div class="h3">1,486 people</div></div></div>
      <div class="stack" style="align-items:flex-end"><button class="btn dark" data-act="add-routine">Add box to cart</button><button class="btn primary" data-act="toast" data-msg="Added to your shelf. Tracking starts today.">Add to shelf + start tracking</button></div>
    </section>
    <div class="notice"><span class="mono forest">Why only 4?</span><span class="grow">We hid 44 other products that scored lower for your profile, so you can decide in a minute instead of a weekend.</span></div>`;
  return { layout: 'layout-wide', left: leftCol(), main };
}

function sampleBuilder() {
  const sm = state.sample;
  const slots = SAMPLE_SLOTS.map((s, i) => {
    const id = sm.picks[s.key];
    return `
      <div class="card stack" style="padding:18px">
        <div class="row between"><span class="mono">${i + 1}  ${s.label}</span><span class="pill" style="background:var(--lime)">Mini</span></div>
        <div class="thumb" style="height:160px;width:100%"><img src="${P(id).img}" alt="" style="max-height:130px"></div>
        <div class="row" style="align-items:flex-start"><div class="grow"><div class="mono">${esc(P(id).brand)}</div><div style="font-size:15px">${esc(P(id).name)}</div></div>${ring(s.score[id])}</div>
        <div class="xs muted">${s.mini[id]} mini  full size ${P(id).size}</div>
        <div class="mono" style="color:var(--ink)">${s.buy[id]}% of people like you say buy</div>
        <hr class="divider"><span class="mono faint">Swap for</span>
        <div class="row wrap" style="gap:6px">${s.options.filter((o) => o !== id).map((o) => `<button class="chip" data-act="sample-swap" data-key="${s.key}" data-id="${o}"><img src="${P(o).img}" alt="" style="width:16px;height:20px;object-fit:contain">${esc(P(o).brand)} ${esc(P(o).name.split(' ').slice(0, 2).join(' '))}</button>`).join('')}</div>
      </div>`;
  }).join('');
  const pays = [['points', 'Free with 1,500 pts', `You have ${state.points.toLocaleString()} pts`, state.points >= 1500], ['mixed', '750 pts + $6', 'Keep 750 pts for later', state.points >= 750], ['cash', '$12', 'Save all your points', true]];
  const can = pays.find((p) => p[0] === sm.pay)?.[3];
  return `
    <div class="grid-3">${slots}</div>
    <section class="card row wrap" style="gap:24px">
      <div class="grow stack">
        <h3 class="h4" style="font-size:16px">Pay for your sample box</h3>
        <div class="row" style="gap:8px;align-items:stretch">${pays.map(([k, a, b, ok]) => `<button class="opt ${sm.pay === k ? 'on' : ''}" data-act="sample-pay" data-v="${k}" ${ok ? '' : 'disabled style="opacity:.5"'}><span class="radio"></span><span><span class="small" style="font-weight:500;display:block">${a}</span><span class="xs muted">${ok ? b : `Needs ${k === 'points' ? 1500 : 750} pts`}</span></span></button>`).join('')}</div>
        <p class="xs muted">Box value $18. Loved one? Its sample value comes off the full size later.</p>
      </div>
      <div class="stack" style="align-items:flex-end"><button class="btn dark" data-act="sample-checkout" ${can ? '' : 'disabled'}>Get my sample box →</button><span class="xs muted">Ships free  arrives in 3 days</span></div>
    </section>
    <div class="notice"><span class="mono forest">Why samples?</span><span class="grow">Most people like you test a product for 2 weeks before buying full size. Your day-14 check-in decides what you keep.</span></div>`;
}

/* ================= cart + checkout ================= */

function totals() {
  const sub = state.cart.reduce((a, c) => a + (c.price ?? P(c.id).price) * c.qty, 0);
  const credit = state.cart.reduce((a, c) => a + (c.credit || 0) * c.qty, 0);
  const ptsOff = state.usePoints ? Math.min(Math.floor(state.points / 500) * 5, Math.max(0, sub - credit)) : 0;
  const ship = sub - credit >= 35 || sub === 0 ? 0 : 5.95;
  const tax = Math.max(0, sub - credit - ptsOff) * 0.07;
  return { sub, credit, ptsOff, ptsUsed: ptsOff * 100, ship, tax, total: Math.max(0, sub - credit - ptsOff) + ship + tax };
}

function checkoutSteps(cur) {
  return `<div class="steps-bar" style="max-width:520px">${['Cart', 'Shipping', 'Payment', 'Done'].map((s, i) => `<div class="${i < cur ? 'done' : i === cur ? 'cur' : ''}">${i + 1}  ${s}</div>`).join('')}</div>`;
}

const KIND_LABEL = { pick: 'Picked for you', routine: 'From your routine', refill: 'Refill', swap: 'Swap', full: 'Full size after trial' };

function cartPage() {
  const t = totals();
  const items = state.cart.map((c, i) => `
    <div class="row" style="padding:18px;${i ? 'border-top:1px solid var(--line)' : ''}">
      ${thumb(c.id, 60, 70)}
      <div class="grow stack" style="gap:3px">
        <span class="pill" style="align-self:flex-start;background:${c.kind === 'swap' ? 'var(--lime)' : 'var(--surface-soft)'}">${KIND_LABEL[c.kind] || 'Picked for you'}</span>
        <span class="mono">${esc(P(c.id).brand)}</span><span style="font-size:15px">${esc(P(c.id).name)}</span>
        <span class="xs muted">${esc(c.note || P(c.id).size)}${c.credit ? `  Sample credit −${money(c.credit)}` : ''}</span>
      </div>
      <span class="qty"><button data-act="qty" data-i="${i}" data-d="-1" aria-label="Decrease">−</button><span class="mono" style="color:var(--ink)">${c.qty}</span><button data-act="qty" data-i="${i}" data-d="1" aria-label="Increase">+</button></span>
      <div class="stack" style="align-items:flex-end;width:70px;gap:4px"><span style="font-size:16px;font-weight:500">${money((c.price ?? P(c.id).price) * c.qty)}</span><button class="link" data-act="remove" data-i="${i}">Remove</button></div>
    </div>`).join('');
  const main = `
    ${checkoutSteps(0)}
    <h1 class="h1">Your cart</h1>
    <p class="muted">One checkout for every brand. DEW orders from the brand or an authorized retailer at the same price, and adds each product to your shelf when it arrives.</p>
    ${state.cart.length ? `<section class="card" style="padding:0">${items}</section>` : `<section class="card empty"><p class="h3">Your cart is empty</p><p class="small" style="margin:8px 0 16px">Add picks from For you, refills from your shelf, or a whole routine.</p><a class="btn dark" href="#/picked">See my routine →</a></section>`}
    <p class="xs muted">Prices match the brand site. Free returns within 30 days if a product breaks you out: tell Dew in your weekly check-in.</p>`;
  const right = `
    <section class="card stack" style="padding:24px">
      <h3 class="h4" style="font-size:18px">Order summary</h3>
      <div class="row between small"><span class="muted">Subtotal (${cartCount()} items)</span><span>${money2(t.sub)}</span></div>
      ${t.credit ? `<div class="row between small"><span class="muted">Sample credit</span><span style="color:var(--forest)">−${money2(t.credit)}</span></div>` : ''}
      <div class="row between small"><span class="muted">Shipping</span><span>${t.ship ? money2(t.ship) : 'Free over $35'}</span></div>
      <div class="card soft row" style="padding:12px">${svg('flame', 20)}<div class="grow"><div class="small" style="font-weight:500">Use ${t.ptsUsed.toLocaleString()} of your ${state.points.toLocaleString()} pts</div><div class="xs muted">500 pts = $5 off</div></div><button class="toggle ${state.usePoints ? 'on' : ''}" data-act="use-points" aria-label="Use points"><i></i></button></div>
      <div class="row between small"><span class="muted">Points</span><span style="color:var(--forest)">−${money2(t.ptsOff)}</span></div>
      <div class="row between small"><span class="muted">Estimated tax</span><span>${money2(t.tax)}</span></div>
      <hr class="divider">
      <div class="row between"><span style="font-size:18px;font-weight:500">Total</span><span style="font-size:18px;font-weight:500">${money2(t.total)}</span></div>
      <span class="xs muted">Arrives Thu, Nov 12 to Miami, FL 33131</span>
      <button class="btn dark block" data-act="checkout" ${state.cart.length ? '' : 'disabled'}>Checkout  ${money2(t.total)}</button>
      <button class="btn block" data-act="checkout" ${state.cart.length ? '' : 'disabled'}>Apple Pay</button>
      <p class="xs muted">Your new products land on your shelf as “arriving”. Tracking starts on day 1, so your week-4 check-in knows what changed.</p>
    </section>`;
  return { layout: 'layout-solo-rail', main, right };
}

function orderPlaced() {
  const o = state.orders[state.orders.length - 1];
  if (!o) return { layout: 'layout-solo', main: '<div class="empty"><p class="h3">No orders yet</p><a class="btn dark" href="#/picked" style="margin-top:16px">See my routine →</a></div>' };
  const main = `
    <section class="card stack" style="max-width:640px;width:100%;margin:48px auto 0;padding:40px">
      <div class="row">${svg('hydrate', 34)}${svg('treat', 34)}${svg('protect', 34)}</div>
      <span class="mono forest">Order #${o.no} placed</span>
      <h1 class="h1">Your routine is on its way.</h1>
      <p class="muted">${o.items.length} products, arriving Thu, Nov 12. We added them to your shelf as “arriving” and will start tracking on day 1.</p>
      <div class="row wrap">${o.items.map((i) => thumb(i.id, 52, 62)).join('')}</div>
      <div class="card soft row" style="padding:12px">${svg('flame', 20)}<span class="small">+${o.earned} pts earned on this order. You have ${state.points.toLocaleString()} pts.</span></div>
      <div class="row"><a class="btn dark" href="#/for-you">Back to For you</a><button class="btn" data-act="toast" data-msg="Tracking: label created, ships tomorrow">Track order</button></div>
    </section>`;
  return { layout: 'layout-solo', main };
}

/* ================= sample box flow ================= */

function sampleCheckout() {
  const sm = state.sample;
  const ids = SAMPLE_SLOTS.map((s) => sm.picks[s.key]);
  const value = SAMPLE_SLOTS.reduce((a, s) => a + s.value, 0) + 0;
  const payLabel = { points: ['−1,500 pts', 0], mixed: ['−750 pts', 6], cash: ['No points', 12] }[sm.pay];
  const tax = payLabel[1] * 0.07;
  const main = `
    ${checkoutSteps(0)}
    <h1 class="h1">Your sample box</h1>
    <p class="muted">Three travel-size minis of your top-matched picks, about 2 weeks of use. We check in on day 3, 7 and 14, then you decide what to buy full size.</p>
    <section class="card" style="padding:0">${SAMPLE_SLOTS.map((s, i) => { const id = sm.picks[s.key]; return `
      <div class="row" style="padding:18px;${i ? 'border-top:1px solid var(--line)' : ''}">${thumb(id, 60, 70)}
        <div class="grow stack" style="gap:3px"><span class="pill" style="align-self:flex-start;background:var(--lime)">Mini  ${s.mini[id]}</span><span class="mono">${esc(P(id).brand)}</span><span style="font-size:15px">${esc(P(id).name)}</span><span class="xs muted">Step ${i + 1}  ${s.label}</span></div>
        <span style="font-size:16px;font-weight:500">${money(s.value)}</span></div>`; }).join('')}</section>
    <p class="xs muted">Minis come in a recyclable DEW sample box. One free box per 1,500 pts.</p>
    <a class="btn" href="#/picked" data-act="picked-mode" data-v="sample" style="align-self:flex-start">← Change my picks</a>`;
  const right = `
    <section class="card stack" style="padding:24px">
      <h3 class="h4" style="font-size:18px">Order summary</h3>
      <div class="row between small"><span class="muted">Box value (3 minis)</span><span>${money2(value)}</span></div>
      <div class="row between small"><span class="muted">Shipping</span><span>Free</span></div>
      <div class="row between small"><span class="muted">Points</span><span style="color:var(--forest)">${payLabel[0]}</span></div>
      <div class="row between small"><span class="muted">Estimated tax</span><span>${money2(tax)}</span></div>
      <hr class="divider">
      <div class="row between"><span style="font-size:18px;font-weight:500">Total</span><span style="font-size:18px;font-weight:500">${money2(payLabel[1] + tax)}</span></div>
      <span class="xs muted">Arrives Sat, Nov 7 to Miami, FL 33131</span>
      <button class="btn dark block" data-act="sample-place">Place order  ${payLabel[1] ? money2(payLabel[1] + tax) : 'free'}</button>
      <p class="xs muted">Your minis land on your shelf marked “sample”, so check-ins track them apart from your full-size products.</p>
    </section>`;
  void ids;
  return { layout: 'layout-solo-rail', main, right };
}

function samplePlaced() {
  const sm = state.sample;
  const steps = [['Day 1', 'Start all three', 'Cleanser AM + PM, toner after, moisturizer last. Take your day-1 photo in the app.'], ['Day 3', 'Quick check-in', 'Any stinging, pilling or breakouts? Tap Working, Not sure or Not working.'], ['Day 7', 'Halfway photo', 'Same framing as day 1. Your skin score updates.'], ['Day 14', 'Verdict', 'Love it, not sure or not for me. Loved ones get the sample value off full size.']];
  const main = `
    <div class="stack" style="max-width:640px;width:100%;margin:32px auto 0;gap:20px">
      <section class="card stack" style="padding:40px">
        <div class="row">${svg('hydrate', 34)}${svg('treat', 34)}${svg('protect', 34)}</div>
        <span class="mono forest">Sample box #DEW-S0193 placed</span>
        <h1 class="h1">Your sample box is on its way.</h1>
        <p class="muted">3 minis arriving Sat, Nov 7. Start them together on day 1 so your check-ins can tell what is working.</p>
        <div class="row">${SAMPLE_SLOTS.map((s) => thumb(sm.picks[s.key], 52, 62)).join('')}</div>
        <div class="card soft row" style="padding:12px">${svg('flame', 20)}<span class="small">Each trial check-in earns +10 pts toward your next box.</span></div>
        <div class="row"><a class="btn dark" href="#/sample/verdict">Skip to day 14 (demo) →</a><button class="btn" data-act="toast" data-msg="Your box ships tomorrow">Track box</button></div>
      </section>
      <section class="card stack" style="padding:28px">
        <h2 class="h3">Your 2-week trial</h2>
        ${steps.map(([d, t, desc], i) => `<div class="tl"><span class="when ${i === 0 ? 'on' : ''}">${d}</span><div><div class="small" style="font-weight:500">${t}</div><div class="xs muted">${desc}</div></div></div>`).join('')}
      </section>
    </div>`;
  return { layout: 'layout-solo', main };
}

function sampleVerdict() {
  const sm = state.sample;
  const info = { gmcleanser: ['13 of 14 days', 'Oiliness: better', 'Gentle, no tight feeling after.'], anua_toner: ['14 of 14 days', 'Redness: much better', 'Redness around my nose calmed by day 7.'], farmacy_halo: ['9 of 14 days', 'Breakouts: worse', 'Too rich for Miami humidity. Two new bumps on my chin.'] };
  const defaults = { gmcleanser: 'love', anua_toner: 'love', farmacy_halo: 'no' };
  const verdict = (id) => sm.verdicts[id] || defaults[id] || 'unsure';
  const ids = SAMPLE_SLOTS.map((s) => sm.picks[s.key]);
  const loved = SAMPLE_SLOTS.filter((s) => verdict(sm.picks[s.key]) === 'love');
  const full = loved.reduce((a, s) => a + P(sm.picks[s.key]).price, 0);
  const credit = loved.reduce((a, s) => a + s.value, 0);
  const cards = SAMPLE_SLOTS.map((s) => {
    const id = sm.picks[s.key]; const v = verdict(id); const [used, change, quote] = info[id] || ['14 of 14 days', 'Logged daily', 'Worked well with my routine.'];
    return `
      <div class="card stack" style="padding:20px;${v === 'love' ? 'border:2px solid var(--forest)' : ''}">
        <div class="row">${thumb(id, 64, 78)}<div class="grow"><span class="pill" style="background:var(--lime)">Mini</span><div class="mono">${esc(P(id).brand)}</div><div style="font-size:15px">${esc(P(id).name)}</div></div>${ring(v === 'no' ? 5.8 : s.score[id])}</div>
        <div class="row wrap" style="gap:6px"><span class="tag">${used}</span><span class="tag">${change}</span></div>
        <p class="small">“${quote}”</p>
        <div class="verdict-seg">${[['love', 'Love it'], ['unsure', 'Not sure'], ['no', 'Not for me']].map(([k, l]) => `<button class="${k} ${v === k ? 'on' : ''}" data-act="verdict" data-id="${id}" data-v="${k}">${l}</button>`).join('')}</div>
        ${v === 'no' ? `<div class="card soft row" style="padding:10px">${thumb('levelup', 28, 34)}<div class="grow"><div class="small" style="font-weight:500">Try a Bubble Level Up mini instead</div><div class="xs muted">Lighter gel, 92% match. 300 pts, free shipping.</div></div></div>` : ''}
      </div>`;
  }).join('');
  const main = `
    <div class="stack" style="max-width:1200px;width:100%;margin:0 auto;gap:20px">
      <span class="mono forest">Day 14 of 14  Sample box #DEW-S0193</span>
      <h1 class="h1">How did your samples do?</h1>
      <p class="muted">Your trial is done. Keep what worked, drop what didn’t. Your verdicts re-rank your picks and help 1,486 people like you.</p>
      <div class="grid-3">${cards}</div>
      <section class="card dark row wrap" style="padding:28px;gap:28px;align-items:flex-start">
        <div class="grow stack">
          <span class="mono lime">Go full size</span>
          <h2 class="h2">${loved.length ? `Keep the ${loved.length} you loved` : 'Nothing loved yet'}</h2>
          ${loved.map((s) => `<div class="row between small"><span>${esc(P(sm.picks[s.key]).name)}  ${P(sm.picks[s.key]).size}</span><span>${money(P(sm.picks[s.key]).price)}</span></div>`).join('')}
          ${loved.length ? `<div class="row between small" style="opacity:.75"><span>Sample credit (the minis you tried)</span><span>−${money(credit)}</span></div><hr class="divider" style="background:rgb(255 255 255 / 25%)"><div class="row between"><span>Total before points</span><span style="font-weight:500">${money(full - credit)}</span></div>` : '<p class="small" style="opacity:.75">Mark a sample as Love it to buy the full size with your sample credit.</p>'}
        </div>
        <div class="stack" style="align-items:flex-end">
          <button class="btn primary" data-act="verdict-cart" ${loved.length ? '' : 'disabled'}>Add ${loved.length} full size${loved.length === 1 ? '' : 's'} to cart →</button>
          <button class="btn" data-act="toast" data-msg="Refills set for every 8 weeks">Subscribe: refill every 8 weeks</button>
          <span class="xs" style="opacity:.75">Full sizes replace the minis on your shelf when they arrive.</span>
        </div>
      </section>
      <div class="notice"><span class="mono forest">Not for me?</span><span class="grow">Products you mark Not for me drop in your rankings and won’t be picked for you again. Your verdict shows up for people like you as a public review.</span></div>
    </div>`;
  void ids;
  return { layout: 'layout-solo', main };
}

/* ================= weekly check-in ================= */

function checkinPage() {
  const c = state.checkin;
  const scale = ['Much worse', 'Worse', 'Same', 'Better', 'Much better'];
  const rate = [['goodal_toner', 'Week 6  AM'], ['anua_guasha', 'Week 4  PM'], ['boj_glow', 'Week 6  AM + PM'], ['cerave_int', 'Week 3  PM']];
  const status = (id) => state.stars[`st_${id}`] || (state.ratings[id] >= 6 ? 'Working' : 'Not working');
  const main = `
    <span class="mono">Week 6 check-in: Nov 3  ~2 min</span>
    <h1 class="h1">How’s your skin this week?</h1>
    <p class="muted">Two parts: how your skin is doing overall, then how each product is working. Both sharpen your picks.</p>
    <section class="card stack" style="gap:16px">
      <div class="row between"><div><h2 class="h4" style="font-size:16px">Overall skin health</h2><p class="xs muted">Your whole routine, not one product</p></div><span class="pill" style="background:var(--lime)">Part 1: you</span></div>
      <div class="row" style="align-items:stretch">
        <div class="card soft grow stack"><span class="mono">Skin health score</span><div class="row" style="align-items:baseline"><span style="font-size:52px;line-height:1">8.4</span><span class="xs" style="color:var(--forest)">▲ 0.6 vs last week</span></div>
          <div class="bars" style="height:90px">${[38, 50, 58, 66, 74, 92].map((h, i) => `<div><i style="height:${h}%;${i < 5 ? 'background:var(--fill-muted)' : ''}"></i><span class="mono">W${i + 1}</span></div>`).join('')}</div></div>
        <div class="stack" style="width:200px"><div class="photo"><img src="assets/img/progress/w5.jpg" alt="This week’s progress photo"><span class="private" style="position:absolute;top:8px;left:8px">🔒 Private</span></div><span class="xs muted">Only you can see this. <button class="link" data-act="toast" data-msg="Open the DEW app to retake">Retake ↺</button></span></div>
      </div>
      <span class="field-label">How does your skin feel vs last week?</span>
      ${Object.keys(c.feel).map((k) => `<div class="row"><span class="small" style="width:90px">${k}</span><div class="grid-3 grow" style="grid-template-columns:repeat(5,1fr);gap:6px">${scale.map((s) => `<button class="chip ${c.feel[k] === s ? 'on' : ''}" style="justify-content:center;background:${c.feel[k] === s ? '' : 'var(--surface-soft)'};border-color:transparent" data-act="ci-feel" data-k="${k}" data-v="${s}">${s}</button>`).join('')}</div></div>`).join('')}
      <span class="field-label">Anything different this week?</span>
      <div class="row wrap" style="gap:6px">${['Poor sleep', 'Stressed', 'Traveled', 'Period week', 'Lots of sun', 'Tried something new'].map((x) => `<button class="chip ${c.extra.includes(x) ? 'on' : ''}" data-act="ci-extra" data-v="${x}">${x}</button>`).join('')}</div>
    </section>
    <section class="card stack">
      <div class="row between"><div><h2 class="h4" style="font-size:16px">Rate your products</h2><p class="xs muted">Quick taps. Each rating updates your shelf ranking.</p></div><span class="pill" style="background:var(--surface-soft)">Part 2: products</span></div>
      ${rate.map(([id, when]) => { const st = Math.round(state.ratings[id] / 2); return `
        <div class="row card soft" style="padding:12px">${thumb(id, 30, 38)}<div class="grow"><div class="small" style="font-weight:500">${esc(P(id).brand)} ${esc(P(id).name)}</div><div class="xs muted">${when}</div></div>
          <span class="stars">${[1, 2, 3, 4, 5].map((i) => `<button class="${i <= st ? 'on' : ''}" data-act="rate-shelf" data-id="${id}" data-v="${i}" aria-label="${i} stars">★</button>`).join('')}</span>
          ${['Working', 'Not sure', 'Not working'].map((s) => `<button class="chip ${status(id) === s ? 'on' : ''}" data-act="ci-status" data-id="${id}" data-v="${s}">${s}</button>`).join('')}
        </div>`; }).join('')}
    </section>
    <section class="card stack">
      <h2 class="h4" style="font-size:16px">Part 3  Your Anua TXA Brightening Pad hit week 6. Buy or don’t buy?</h2>
      <p class="xs muted">Only asked when a product reaches its typical results week. This is the first thing people like you see on your review.</p>
      <div class="grid-2">${[['buy', '✓ Buy', 'It worked for me and I’d repurchase'], ['skip', '✕ Don’t buy', 'Didn’t work, or not worth it']].map(([k, a, b]) => `<button class="card stack" data-act="ci-verdict" data-v="${k}" style="text-align:left;${c.verdict === k ? 'background:var(--forest);color:#fff;border-color:var(--forest)' : ''}"><span style="font-size:28px">${a}</span><span class="xs" style="opacity:.8">${b}</span></button>`).join('')}</div>
      <div class="row"><span class="mono">Your score</span><span class="buybar grow" style="height:6px"><span style="width:91%"></span></span><span style="font-size:22px">9.1</span><span class="tag">Re-ranks to #2 of 11</span></div>
      <textarea data-input="ci-note" placeholder="Add a note for people like you (optional)…" style="min-height:70px;border:1px solid var(--line);border-radius:12px;padding:12px;font:inherit;resize:vertical">${esc(c.note)}</textarea>
    </section>
    <div class="row between"><button class="btn" data-act="toast" data-msg="Draft saved">Save draft</button><button class="btn dark" data-act="ci-submit" ${c.submitted ? 'disabled' : ''}>${c.submitted ? 'Submitted ✓' : 'Submit check-in  +60 pts'}</button></div>`;
  const right = `
    <section class="card dark stack"><span class="mono lime">Preview: how others see it</span><span class="btn sm lime" style="align-self:flex-start;cursor:default">${c.verdict === 'buy' ? '✓ Buy' : '✕ Don’t buy'}</span><p class="small">Results by week 6  Lighter dark spots, more even tone</p><p class="xs" style="color:#c8dcc9">Mia  Combination  Humid  25–29  6 weeks tracked</p></section>
    <section class="card stack"><div class="row">${svg('flame', 22)}<span class="h4">+60 points</span></div><p class="xs muted">Your review helps 1,486 people like you skip the guesswork. ${Math.max(0, REWARD_PTS - state.points)} pts to your free sample box.</p></section>`;
  return { layout: '', left: leftCol(), main, right, ask: true };
}

/* ================= profile ================= */

function trackerRail() {
  const toGo = Math.max(0, REWARD_PTS - state.points);
  return `
    <h2 class="h3">Your tracker</h2>
    <section class="card stack"><div class="row">${svg('flame', 44)}<span style="font-size:48px;line-height:1">${state.streak}</span></div><span class="mono">Day streak</span>
      <div class="row" style="gap:6px">${'MTWTFSS'.split('').map((d, i) => `<span class="stack" style="align-items:center;gap:3px"><i style="width:14px;height:14px;border-radius:99px;display:block;background:${i < 6 ? 'var(--olive)' : 'var(--fill-muted)'}"></i><span class="mono">${d}</span></span>`).join('')}</div></section>
    <section class="card stack">
      <div class="row">${svg('star', 26)}<span style="font-size:26px">${toGo ? `${toGo} pts to go` : 'Unlocked!'}</span></div>
      <span class="mono">${Math.min(state.points, REWARD_PTS).toLocaleString()} of 1,500 pts</span>
      <div class="buybar" style="width:100%;height:8px"><span style="width:${Math.min(100, (state.points / REWARD_PTS) * 100)}%;background:var(--lime)"></span></div>
      <button class="card soft row" style="padding:10px;text-align:left" data-act="${toGo ? 'toast' : 'reward-open'}" data-msg="Earn ${toGo} more pts with check-ins and orders">${thumb('anua_toner', 30, 38)}<span><span class="mono">Prize: free sample box</span><span class="small" style="display:block">Minis of your top cleanser, toner and moisturizer</span></span></button>
      ${toGo ? '<button class="link" data-act="demo-points">Demo: jump to 1,500 pts</button>' : ''}
    </section>
    <section class="card stack"><span class="mono">Today</span>${[['hydrate', 'AM routine', '5/5'], ['treat', 'PM routine', '3/4'], ['protect', 'SPF reapply', '1/2']].map(([i, a, b]) => `<div class="row small">${svg(i, 18)}<span class="grow">${a}</span><span class="mono" style="color:var(--ink)">${b}</span></div>`).join('')}</section>
    <section class="card stack"><span class="mono">Skin score</span><div class="row" style="align-items:baseline"><span style="font-size:44px;line-height:1">8.4</span><span class="xs" style="color:var(--forest)">+1.9 since wk 1</span></div>
      <svg viewBox="0 0 200 50" style="width:100%;height:50px"><polyline fill="none" stroke="#113916" stroke-width="2" points="0,44 30,40 60,36 90,30 120,24 150,18 180,12 200,8"/></svg></section>
    <button class="link" data-act="reset" style="align-self:flex-start;margin-top:8px">Reset demo data</button>`;
}

function profilePage() {
  const tab = state.profileTab;
  const header = `
    <section class="card row" style="gap:20px;align-items:flex-start">
      <img class="avatar" style="width:88px;height:88px" src="assets/img/progress/w5.jpg" alt="">
      <div class="grow stack">
        <div class="row"><h1 class="h2">Mia Tan</h1><span class="pill" style="background:var(--lime)">Skin profile ${strength()}%</span></div>
        <div class="row wrap" style="gap:6px">${['Combination', 'Breakouts + redness', 'Humid  Miami', '25–29', 'Fragrance-free', '$15–30'].map((t) => `<span class="tag">${t}</span>`).join('')}</div>
        <div class="row small" style="gap:24px"><span><b style="font-weight:500">${state.streak}</b> <span class="muted">day streak</span></span><span><b style="font-weight:500">${state.points.toLocaleString()}</b> <span class="muted">points</span></span><span><b style="font-weight:500">6</b> <span class="muted">weeks tracked</span></span><span><b style="font-weight:500">4</b> <span class="muted">reviews</span></span></div>
      </div>
      <div class="stack"><a class="btn dark" href="#/setup/1">Update skin profile</a><button class="btn" data-act="toast" data-msg="Profile link copied">Share profile</button></div>
    </section>
    <div class="notice">Moved, changed your diet or started a new medication? Update your skin profile and we’ll re-rank your picks.</div>
    <span class="seg" style="align-self:flex-start">${[['rankings', 'My rankings'], ['progress', 'My progress']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="profile-tab" data-v="${k}">${l}</button>`).join('')}</span>`;
  let body;
  if (tab === 'rankings') {
    const R = state.ratings;
    const sorted = (ids) => [...ids].sort((a, b) => R[b] - R[a]);
    const cats = { Cleanser: ['inn_cleanser'], 'Toner + pads': ['anua_txa', 'goodal_toner'], Serum: ['boj_glow'], 'Moisturizer + night cream': ['anua_night', 'cerave_int', 'anua_guasha'], Sunscreen: ['biore'], Eyes: ['drmtlgy_eye', 'sana_eye'], Masks: ['torriden_mask'] };
    const purp = { 'Best for brightening': ['boj_glow', 'anua_txa', 'goodal_toner'], 'Best for hydration': ['torriden_mask', 'cerave_int', 'boj_glow'], 'Best for anti-aging': ['anua_night', 'sana_eye'], 'Best for dark circles': ['drmtlgy_eye', 'sana_eye'], 'Best for pores': ['goodal_toner', 'inn_cleanser'], 'Best for sunny days': ['biore'] };
    body = `
      <section class="stack"><h2 class="h3">My rankings by category</h2><p class="xs muted">Your ${SHELF.length} products, ranked by your own scores within each step.</p><div class="grid-2">${Object.entries(cats).map(([t, ids]) => rankCard(t, sorted(ids), R)).join('')}</div></section>
      <section class="stack"><h2 class="h3">Best for…</h2><p class="xs muted">What you would recommend to someone with your skin.</p><div class="grid-2">${Object.entries(purp).map(([t, ids]) => rankCard(t, sorted(ids), R)).join('')}</div></section>
      <p class="xs muted">Ranks update every time you rate a product in your check-in or on your shelf.</p>`;
  } else {
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    const partial = [3, 7, 11, 16, 18, 23];
    const missed = [];
    body = `
      <section class="card stack" style="gap:16px">
        <div class="row between"><h2 class="h4" style="font-size:16px">Usage</h2><span class="seg"><button class="on">Day</button><button data-act="toast" data-msg="Weekly view coming soon">Week</button><button data-act="toast" data-msg="Monthly view coming soon">Month</button></span></div>
        <div class="row" style="align-items:flex-start;gap:24px">
          <div class="stack"><span class="mono">Daily log: November</span>
            <div class="cal">${'MTWTFSS'.split('').map((d) => `<span class="mono" style="height:16px">${d}</span>`).join('')}${days.map((d) => `<span class="${d > 21 ? 'future' : missed.includes(d) ? 'missed' : partial.includes(d) ? 'partial' : 'full'} ${d === 21 ? 'today' : ''}">${d}</span>`).join('')}</div>
            <div class="legend"><span><i style="background:var(--lime)"></i>Full routine</span><span><i style="background:var(--r3)"></i>Partial</span><span><i style="background:var(--surface-soft)"></i>Missed</span></div></div>
          <div class="stack grow"><span class="mono">Week by week: % of routine done</span>
            <div class="bars">${[62, 78, 74, 85, 88, 93, 95, 86].map((v, i) => `<div><span class="mono" style="color:var(--ink)">${v}%</span><i class="${i === 7 ? 'cur' : ''}" style="height:${v}%"></i><span class="mono">W${i + 1}</span></div>`).join('')}</div>
            <span class="xs muted">Week 8 is in progress. Best week so far: week 7 at 95%.</span></div>
        </div>
        <div class="grid-2">
          <div class="card stack"><div class="row between"><h3 class="h4">Challenges</h3><span class="mono forest">Earn points</span></div>${CHALLENGES.map(([t, d, n, of, pts]) => `<div class="stack" style="gap:4px"><div class="row between"><span class="small" style="font-weight:500">${t}</span><span class="mono forest">+${pts} pts</span></div><span class="xs muted">${d}</span><div class="buybar" style="width:100%"><span style="width:${(n / of) * 100}%;background:var(--lime)"></span></div><span class="mono">${n} / ${of}</span></div>`).join('')}</div>
          <div class="card stack"><h3 class="h4">Milestones</h3>${MILESTONES.map(([t, d, ok]) => `<div class="row card ${ok ? '' : 'soft'}" style="padding:10px;${ok ? 'background:var(--fill-muted);border-color:transparent' : ''}"><span class="ring sm" style="${ok ? 'background:var(--forest);border-color:var(--forest);color:#fff' : 'border-color:var(--line)'}">${ok ? '✓' : '○'}</span><div><div class="small" style="font-weight:500">${ok ? '' : 'Next: '}${t}</div><div class="xs muted">${d}</div></div></div>`).join('')}</div>
        </div>
      </section>
      <section class="card stack">
        <div class="row between"><div class="row"><h3 class="h4">Progress photos</h3><span class="private">🔒 Private</span></div><button class="link mono" data-act="toast" data-msg="Add this week’s photo in the DEW app">Add this week +</button></div>
        <p class="xs muted">Only you can see these. Pick any photo to attach it to a review, or keep them all private.</p>
        <div class="grid-3" style="grid-template-columns:repeat(6,1fr);gap:8px">${['w0', 'w1', 'w2', 'w3', 'w4', 'w5'].map((p, i) => `<div class="photo"><img src="assets/img/progress/${p}.jpg" alt="Week ${i + 1}"><span class="mono">Wk ${i + 1}</span></div>`).join('')}</div>
      </section>
      <h2 class="h3">Check-in log</h2>
      <section class="card stack">
        <div class="row"><img class="avatar" style="width:28px;height:28px" src="assets/img/progress/w5.jpg" alt=""><span class="small grow">Mia Tan  This morning: logged on iPhone</span></div>
        <h3 class="h2">Week 6 check-in: before vs now</h3>
        <div class="row small" style="gap:28px"><span><span class="mono">Consistency</span><br>92%</span><span><span class="mono">Streak</span><br>${state.streak} days</span><span><span class="mono">Skin score</span><br>8.4 ▲0.6</span><span><span class="mono">Points</span><br>+60</span></div>
        <div class="grid-2"><div class="photo" style="aspect-ratio:4/3"><img src="assets/img/progress/w0.jpg" alt="Week 1"><span class="mono">Week 1</span></div><div class="photo" style="aspect-ratio:4/3"><img src="assets/img/progress/w5.jpg" alt="Week 6"><span class="mono">Week 6</span></div></div>
        <p>Redness around my nose is basically gone. Breakouts down to one this week.</p>
        <div class="row"><span class="private">🔒 Private</span><span class="xs muted grow">Only you can see this check-in</span><button class="btn" data-act="toast" data-msg="Attached to your TXA pad review">Attach to a review</button></div>
      </section>
      <h2 class="h3">My reviews</h2>
      <div class="grid-2">${[['boj_glow', 'buy', 'Week 3', 'Glass-skin glow by week 3, and it sits fine under my Bioré.'], ['anua_txa', 'buy', 'Week 6', 'My dark spots from summer are noticeably lighter.'], ['anua_guasha', 'skip', 'None by week 4', 'Stung on retinol nights and pilled under my lotion.']].map(([id, v, w, t]) => `
        <div class="card stack" style="padding:16px"><div class="row between"><span class="btn sm ${v === 'buy' ? 'dark' : ''}" style="cursor:default;${v === 'buy' ? '' : 'background:var(--olive);border-color:var(--olive);color:#fff'}">${v === 'buy' ? '✓ Buy' : '✕ Don’t buy'}</span>${ring(state.ratings[id], true)}</div>
          <div class="row">${thumb(id, 28, 36)}<div><div class="mono">${esc(P(id).brand)}</div><div class="small">${esc(P(id).name)}</div></div></div>
          <span class="mono">Results seen: ${w}</span><p class="small">“${t}”</p><span class="xs muted">Public: helped 48 people like you</span></div>`).join('')}</div>`;
  }
  return { layout: '', left: leftCol(downloadApp()), main: header + body, right: trackerRail(), ask: true };
}

/* ================= search ================= */

function searchPage() {
  const q = (state.lastSearch || '').trim().toLowerCase();
  const hits = Object.entries(PRODUCTS).filter(([, p]) => !q || q === 'new' || `${p.brand} ${p.name} ${p.step}`.toLowerCase().includes(q));
  const list = q === 'new' ? LAUNCHES.map((l) => [l.id, P(l.id)]) : hits;
  const main = `
    <h1 class="h2">${q && q !== 'new' ? `Results for “${esc(state.lastSearch)}”` : q === 'new' ? 'New launches' : 'All products'}</h1>
    <p class="xs muted">${list.length} products. Tap + to add to your cart.</p>
    <section class="card">${list.map(([id, p], i) => `
      <div class="pick"><span class="rank" style="font-size:14px">${i + 1}</span>${thumb(id, 48, 52)}<div class="grow"><div class="mono">${esc(p.brand)}</div><div>${esc(p.name)}</div><div class="xs muted">${p.step} step  ${p.size}</div></div><span class="small">${money(p.price)}</span>
        <button class="add-btn ${state.added[id] ? 'added' : ''}" data-act="add" data-id="${id}" aria-label="Add">${state.added[id] ? '✓' : '+'}</button></div>`).join('') || '<div class="empty">Nothing found. Try “toner” or “SPF”.</div>'}</section>`;
  return { layout: '', left: leftCol(), main, right: rightRail(), ask: true };
}

/* ================= reward modal ================= */

function rewardModal() {
  const r = route();
  if (state.points < REWARD_PTS || state.rewardDismissed || state.sample.status !== 'none' || r.startsWith('sample') || r.startsWith('setup') || (r === 'picked' && state.pickedMode === 'sample')) return '';
  return `
    <div class="scrim" data-act="reward-later">
      <section class="modal" role="dialog" aria-label="Free sample box unlocked" data-stop>
        <div class="row">${svg('flame', 30)}${svg('star', 26)}</div>
        <span class="mono forest">1,500 pts reached</span>
        <h2 class="h2" style="font-size:34px">Your free sample box is unlocked</h2>
        <p class="muted">Try before you commit. We picked your top-matched cleanser, toner and moisturizer and shrunk them to travel size, enough for about 2 weeks. Free with your points.</p>
        <div class="card soft row" style="justify-content:center;gap:24px;align-items:flex-end">${SAMPLE_SLOTS.map((s) => `<div class="stack" style="align-items:center;gap:4px"><img src="${P(state.sample.picks[s.key]).img}" alt="" style="height:88px;width:70px;object-fit:contain"><span class="small" style="font-weight:500">${s.label}</span><span class="mono">${s.mini[state.sample.picks[s.key]]}</span></div>`).join('')}</div>
        <div class="row between small"><span class="muted">Box value $18</span><span style="color:var(--forest);font-weight:500">Yours for 1,500 pts</span></div>
        <div class="row"><button class="btn dark grow" data-act="reward-build">Build my sample box →</button><button class="btn" data-act="reward-later">Later</button></div>
        <span class="xs muted">You can swap any of the three. Points never expire.</span>
      </section>
    </div>`;
}

/* ================= render ================= */

function view() {
  const r = route();
  const [a, b] = r.split('/');
  if (a === 'setup') return { tab: '', ...setupPage(b === 'done' ? 'done' : Math.min(4, Math.max(1, +b || 1))) };
  if (a === 'creators') return b ? { tab: 'creators', ...creatorPage(b) } : { tab: 'creators', ...creatorsPage() };
  if (a === 'community') return { tab: 'community', ...communityPage() };
  if (a === 'picked') return { tab: 'picked', ...pickedPage() };
  if (a === 'cart') return { tab: '', ...cartPage() };
  if (a === 'order-placed') return { tab: '', ...orderPlaced() };
  if (a === 'sample') return { tab: 'picked', ...(b === 'placed' ? samplePlaced() : b === 'verdict' ? sampleVerdict() : sampleCheckout()) };
  if (a === 'check-in') return { tab: '', ...checkinPage() };
  if (a === 'profile') return { tab: '', ...profilePage() };
  if (a === 'search') return { tab: '', ...searchPage() };
  return { tab: 'for-you', ...forYou() };
}

let lastRoute = null;
function render() {
  const v = view();
  const r = route();
  const app = document.getElementById('app');
  const scrolls = lastRoute === r ? [...app.querySelectorAll('.col')].map((c) => c.scrollTop) : [];
  document.getElementById('topnav').innerHTML = nav(v.tab);
  app.className = `app ${v.layout || 'layout-3'}`;
  const cols = [];
  if (v.left) cols.push(`<aside class="col" aria-label="Your shelf">${v.left}</aside>`);
  cols.push(`<main class="col${v.layout === 'layout-solo' ? '' : ''}" id="main">${v.main}</main>`);
  if (v.right) cols.push(`<aside class="col rail" aria-label="Side panel">${v.right}</aside>`);
  app.innerHTML = cols.join('');
  [...app.querySelectorAll('.col')].forEach((c, i) => { if (scrolls[i]) c.scrollTop = scrolls[i]; });
  document.getElementById('overlay').innerHTML = `${v.ask ? askDew() : ''}${rewardModal()}`;
  const chat = document.getElementById('chat');
  if (chat) chat.scrollTop = chat.scrollHeight;
  lastRoute = r;
  document.title = `DEW  ${({ 'for-you': 'For you', creators: 'Creators', community: 'Community', picked: 'Picked for you' })[v.tab] || 'Skincare picked by people like you'}`;
}

/* ================= events ================= */

const actions = {
  toast: (d) => toast(d.msg),
  feel: (d) => set({ quickFeel: d.v }),
  star: (d) => set({ stars: { ...state.stars, [d.id]: +d.v } }),
  'quick-checkin': () => { set({ quickDone: true, streak: state.streak + 1 }); earn(10, 'Check-in logged'); },
  'shelf-open': (d) => set({ shelfOpen: state.shelfOpen === d.id ? null : d.id }),
  'shelf-close': () => set({ shelfOpen: null }),
  'rate-shelf': (d) => { set({ ratings: { ...state.ratings, [d.id]: +d.v * 2 } }); toast(`Rated ${P(d.id).name} ${d.v} of 5. Your rankings updated.`); },
  refill: (d) => addToCart(d.id, 'refill', `Refill  ${shelfItem(d.id)?.daysLeft ? `~${shelfItem(d.id).daysLeft} days left` : 'from your shelf'}`),
  swap: (d) => addToCart(d.id, 'swap', `Replaces ${P(d.from).name} (you rated it ${state.ratings[d.from].toFixed(1)})`),
  add: (d) => addToCart(d.id, 'pick'),
  'add-many': (d) => { d.ids.split(',').filter(Boolean).forEach((id) => addToCart(id, 'pick')); },
  search: (d) => { set({ lastSearch: d.q }); go('search'); },
  'ask-open': () => set({ askOpen: true }),
  'ask-close': () => set({ askOpen: false }),
  ask: (d) => askDewSend(d.q),
  answer: (d) => {
    const cur = state.answers[d.key] || [];
    let next;
    if (d.single) next = [d.v];
    else if (cur.includes(d.v)) next = cur.filter((x) => x !== d.v);
    else next = d.max && cur.length >= +d.max ? [...cur.slice(1), d.v] : [...cur, d.v];
    set({ answers: { ...state.answers, [d.key]: next } });
  },
  'setup-next': (d) => {
    const n = +d.n;
    const gained = n > state.setupStep ? 50 : 0;
    set({ setupStep: Math.max(state.setupStep, n), points: state.points + gained });
    if (gained) toast(`+50 pts  Step ${n} done`);
    go(n >= 4 ? 'setup/done' : `setup/${n + 1}`);
  },
  follow: (d) => { set({ following: { ...state.following, [d.id]: !state.following[d.id] } }); },
  audience: (d) => set({ audience: d.v }),
  'filters-toggle': () => set({ filterOpen: !state.filterOpen }),
  'filters-clear': () => set({ filters: { skin: [], env: [], sort: 'Most similar to me' } }),
  filter: (d) => {
    const f = { ...state.filters };
    if (d.single) f[d.group] = d.v;
    else f[d.group] = f[d.group].includes(d.v) ? f[d.group].filter((x) => x !== d.v) : [...f[d.group], d.v];
    set({ filters: f });
  },
  helpful: (d) => set({ helpful: { ...state.helpful, [d.k]: !state.helpful[d.k] } }),
  'picked-mode': (d) => set({ pickedMode: d.v }),
  'routine-swap': (d) => { const r = ROUTINE.find((x) => x.step === d.step); set({ routinePick: { ...state.routinePick, [d.step]: (state.routinePick[d.step] + 1) % r.options.length } }); },
  'add-routine': () => {
    const cart = [...state.cart];
    ROUTINE.forEach((r, i) => { const id = r.options[state.routinePick[r.step]]; if (r.owned === id) return; if (!cart.some((c) => c.id === id)) cart.push({ id, kind: 'routine', qty: 1, note: `Step ${i + 1}  ${r.step}` }); });
    set({ cart }); go('cart'); toast('Your routine box is in your cart');
  },
  'sample-swap': (d) => set({ sample: { ...state.sample, picks: { ...state.sample.picks, [d.key]: d.id } } }),
  'sample-pay': (d) => set({ sample: { ...state.sample, pay: d.v } }),
  'sample-checkout': () => go('sample/checkout'),
  'sample-place': () => {
    const cost = { points: 1500, mixed: 750, cash: 0 }[state.sample.pay];
    if (cost > state.points) { toast(`You need ${cost - state.points} more pts for this option`); return; }
    set({ points: state.points - cost, sample: { ...state.sample, status: 'placed' }, rewardDismissed: true });
    go('sample/placed');
  },
  verdict: (d) => set({ sample: { ...state.sample, verdicts: { ...state.sample.verdicts, [d.id]: d.v } } }),
  'verdict-cart': () => {
    const cart = [...state.cart];
    SAMPLE_SLOTS.forEach((s) => { const id = state.sample.picks[s.key]; const v = state.sample.verdicts[id] || ({ gmcleanser: 'love', anua_toner: 'love' }[id]); if (v === 'love' && !cart.some((c) => c.id === id && c.kind === 'full')) cart.push({ id, kind: 'full', qty: 1, credit: s.value, note: `${P(id).size}  you tried the ${s.mini[id]} mini` }); });
    set({ cart, sample: { ...state.sample, status: 'done' } }); go('cart');
  },
  qty: (d) => { const cart = [...state.cart]; cart[d.i] = { ...cart[d.i], qty: cart[d.i].qty + +d.d }; if (cart[d.i].qty <= 0) cart.splice(d.i, 1); set({ cart }); },
  remove: (d) => { const cart = [...state.cart]; const [rm] = cart.splice(d.i, 1); const added = { ...state.added }; delete added[rm.id]; set({ cart, added }); },
  'use-points': () => set({ usePoints: !state.usePoints }),
  checkout: () => {
    const t = totals();
    const earned = Math.round(t.total);
    const order = { no: `DEW-${20480 + state.orders.length + 1}`, items: state.cart.map((c) => ({ id: c.id, qty: c.qty })), total: t.total, earned };
    set({ orders: [...state.orders, order], cart: [], added: {}, points: state.points - t.ptsUsed + earned });
    go('order-placed');
  },
  'ci-feel': (d) => set({ checkin: { ...state.checkin, feel: { ...state.checkin.feel, [d.k]: d.v } } }),
  'ci-extra': (d) => { const e = state.checkin.extra; set({ checkin: { ...state.checkin, extra: e.includes(d.v) ? e.filter((x) => x !== d.v) : [...e, d.v] } }); },
  'ci-status': (d) => set({ stars: { ...state.stars, [`st_${d.id}`]: d.v } }),
  'ci-verdict': (d) => set({ checkin: { ...state.checkin, verdict: d.v } }),
  'ci-submit': () => { set({ checkin: { ...state.checkin, submitted: true } }); earn(60, 'Weekly check-in submitted'); },
  'profile-tab': (d) => set({ profileTab: d.v }),
  'demo-points': () => set({ points: REWARD_PTS, rewardDismissed: false }),
  'reward-open': () => set({ rewardDismissed: false }),
  'reward-later': () => set({ rewardDismissed: true }),
  'reward-build': () => { set({ pickedMode: 'sample', rewardDismissed: true }); go('picked'); },
  reset: () => { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } state = defaultState(); go('for-you'); render(); toast('Demo data reset'); },
};

function askDewSend(q) {
  if (!q || !q.trim()) return;
  const hit = ASK_DEW_REPLIES.find(([re]) => re.test(q));
  const reply = hit ? hit[1] : 'Good question. People with your skin who tracked this for 4+ weeks mostly kept their routine simple: one new product at a time, two weeks apart.';
  set({ askOpen: true, chat: [...state.chat, { me: true, text: q.trim() }, { me: false, text: reply }] });
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  if (el.dataset.act === 'reward-later' && e.target.closest('[data-stop]') && el.classList.contains('scrim')) return;
  const fn = actions[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'A' && el.dataset.act === 'toast') e.preventDefault();
  fn({ ...el.dataset });
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  const q = new FormData(form).get('q') || '';
  if (form.dataset.form === 'search') { set({ lastSearch: q }); go('search'); }
  if (form.dataset.form === 'ask') askDewSend(q);
});

document.addEventListener('input', (e) => {
  if (e.target.dataset.input === 'ci-note') { state.checkin.note = e.target.value; save(); }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (state.askOpen) set({ askOpen: false }); else if (state.shelfOpen) set({ shelfOpen: null }); }
});

window.addEventListener('hashchange', () => { render(); document.querySelectorAll('.col').forEach((c) => { c.scrollTop = 0; }); });
render();
