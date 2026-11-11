import {
  PRODUCTS, SHELF, PICKS, LAUNCHES, REFILLS, PUBLIC_REVIEWS, COMMUNITY, CREATORS,
  ROUTINE, SAMPLE_SLOTS, CHALLENGES, MILESTONES, ASK_DEW_REPLIES, MEMBERS, PEER_ROUTINES,
} from './data.js?v=9';
import { useJson, onData, productsUrl, reviewsUrl } from './api.js?v=2';
import { auth, initAuth, currentUser, firstName, signUp, signIn, signOut, resetPassword, loadAppState, saveAppState, accessToken } from './auth.js?v=3';

/* ================= state ================= */

const STORE_KEY = 'dew-state-v1';
const REWARD_PTS = 1500;

const defaultState = () => ({
  setupStep: 2, // onboarding steps finished (0-4)
  answers: {
    location: ['Miami, Florida'], climate: { place: 'Miami, Florida', humidity: { value: 74, label: 'Humid' }, uv: { value: 7.4, label: 'High UV' }, dryness: { label: 'Moist air' } }, diet: ['Dairy-free'],
    outdoors: ['1–2 hrs'], sleep: ['6–8 hrs'], stress: ['Medium'], hydration: ['Drinks 2L+ water'],
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
// "Drinks 2L+ water" used to be a Diet option; it now lives under Hydration.
function migrate(s) {
  // Pop-ups (Compare shelves, Why this?, Share a moment) never reopen on reload.
  s = { ...s, compare: null, why: null, moment: null };
  // Hi-fi v7 #128: the Anua TXA pad is now Mia's top product (was 9.1).
  if (s.ratings?.anua_txa === 9.1) s = { ...s, ratings: { ...s.ratings, anua_txa: 9.5 } };
  const diet = s.answers?.diet;
  if (!diet?.includes('Drinks 2L+ water')) return s;
  return { ...s, answers: { ...s.answers, diet: diet.filter((d) => d !== 'Drinks 2L+ water'), hydration: s.answers.hydration?.length ? s.answers.hydration : ['Drinks 2L+ water'] } };
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return migrate({ ...defaultState(), ...JSON.parse(raw) });
  } catch (e) { /* storage unavailable: run in memory */ }
  return defaultState();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  saveAppState(state);
}

// A brand-new account starts with an empty skin profile, no points and no orders.
const newAccountState = () => ({
  ...defaultState(), setupStep: 0, answers: {}, points: 0, streak: 0, quickDone: false,
  shelfDemo: false, shelfAdds: [], ratings: {}, saved: [], cart: [], orders: [], added: {},
  chat: [{ me: false, text: 'Hi! Ask me anything about your routine, ingredients or what people with your skin use.' }],
});
function set(patch) { state = { ...state, ...patch }; save(); render(); }

/* ================= helpers ================= */

// Live catalog from Supabase, keyed by id. Empty until /api/products answers.
// Plus catalog-only products (16k+, no reviews yet) that search or a lookup has brought in.
const found = new Map();
const remember = (list) => { (list ?? []).forEach((p) => found.set(p.id, p)); return list ?? []; };
const liveProducts = () => ({ ...Object.fromEntries(found), ...Object.fromEntries((useJson(productsUrl).data ?? []).map((p) => [p.id, p])) });
// One product's live data, fetching catalog products (ids starting "cat-") on demand.
function liveProduct(id) {
  const p = liveProducts()[id];
  if (p || !String(id).startsWith('cat-')) return p;
  const one = useJson(`/api/products?id=${encodeURIComponent(id)}`).data;
  if (one) found.set(id, one);
  return one;
}
const searchProducts = (q) => remember(useJson(`/api/products?q=${encodeURIComponent(q.trim().toLowerCase())}`).data);
// Store photos are up to 4000px; ask the image CDN for a shelf-sized copy.
const smallImg = (u) => (u && /cdn\.shopify\.com/.test(u) ? `${u}${u.includes('?') ? '&' : '?'}width=400` : u && /media\.ultainc\.com/.test(u) ? `${u}?w=400` : u);
const P = (id) => {
  if (PRODUCTS[id]) return PRODUCTS[id];
  const p = liveProduct(id);
  return { brand: p?.brand ?? '', name: p?.name ?? id, img: smallImg(p?.image_path) ?? 'assets/svg/hydrate.svg', price: Number(p?.price_usd ?? 0), step: p?.step ?? '', size: p?.size ?? '' };
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `$${n.toFixed(2).replace(/\.00$/, '')}`;
const money2 = (n) => `$${n.toFixed(2)}`;
const band = (s) => (s >= 9 ? 'b1' : s >= 8 ? 'b2' : s >= 7 ? 'b3' : s >= 6 ? 'b4' : 'b5');
const ring = (s, sm) => `<span class="ring ${sm ? 'sm ' : ''}${band(+s)}">${(+s).toFixed(1)}</span>`;
const pctBand = (p) => band(p / 10);
const match = (p) => `<span class="pill match ${pctBand(p)}">${p}% similar</span>`;
const thumb = (id, w = 48, h = 56) => `<span class="thumb" style="width:${w}px;height:${h}px"><img src="${P(id).img}" alt="${esc(P(id).name)}"></span>`;
// ?v= busts browser caches when the character art changes in Figma.
const SVG_V = 4;
const svg = (name, w) => `<img src="assets/svg/${name}.svg?v=${SVG_V}" alt="" style="width:${w}px">`;
const starsTxt = (n) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
// The sample shelf is only for the demo; a new account's shelf starts empty.
const baseShelf = () => (state.shelfDemo === false ? [] : SHELF);
const shelfItem = (id) => baseShelf().find((s) => s.id === id);
const cartCount = () => state.cart.reduce((a, c) => a + c.qty, 0);
const strength = () => state.setupStep * 25;
const route = () => (location.hash.replace(/^#\/?/, '') || 'for-you').split('?')[0];

/* ================= live reviews ================= */

const RETAILERS = { eadem: 'Eadem', tower28: 'Tower 28', shiseido: 'Shiseido', farmacy: 'Farmacy', biodance: 'Biodance', laneige: 'Laneige', sephora: 'Sephora', ulta: 'Ulta', oliveyoung: 'Olive Young' };
const retailerName = (r) => RETAILERS[r] ?? r.replace(/^\w/, (c) => c.toUpperCase());
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const productLink = (id, text) => `<a class="plink" href="#/product/${id}">${text}</a>`;

// The published rating with the most reviews behind it, e.g. "★ 4.8  1,904 reviews on Tower 28".
function liveRating(id) {
  const lp = liveProduct(id);
  if (lp?.catalog_only) return lp.listed_rating ? `<span class="live-rating">★ ${(+lp.listed_rating).toFixed(1)}${lp.listed_review_count ? `  ${lp.listed_review_count.toLocaleString()} reviews` : ''} on ${esc(lp.sold_at.split('; ')[0])}</span>` : '';
  const best = (lp?.ratings ?? []).filter((r) => r.rating_avg != null).sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0))[0];
  return best ? `<span class="live-rating">★ ${(+best.rating_avg).toFixed(1)}${best.review_count ? `  ${best.review_count.toLocaleString()} reviews` : ''} on ${retailerName(best.retailer)}</span>` : '';
}

// Skin type tags. Types found only in the review text are marked so people can tell them apart.
function skinTags(r) {
  const types = r.skin_types ?? (r.attributes?.skin_type ? [r.attributes.skin_type] : []);
  const picked = r.attributes?.skin_type;
  return types.map((t) => {
    const fromText = r.skin_type_source === 'review text' || (picked && !picked.toLowerCase().includes(t.toLowerCase().slice(0, 4)));
    return `<span class="tag" ${fromText ? 'title="Mentioned in the review text"' : ''}>${esc(t)} skin${fromText ? ' <span class="faint">· from review</span>' : ''}</span>`;
  }).join('');
}

function liveReview(r, withProduct) {
  const a = r.attributes ?? {};
  const n = Math.round(+r.rating || 0);
  const pid = r.product_id;
  return `
    <div class="card stack live-review">
      ${withProduct ? `<div class="row">${thumb(pid, 34, 40)}<div class="grow"><div class="mono faint">${esc(r.products?.brand ?? P(pid).brand)}</div>${productLink(pid, `<span class="small">${esc(r.products?.name ?? P(pid).name)}</span>`)}</div></div>` : ''}
      <div class="row" style="gap:10px"><span class="review-stars" aria-label="${n} of 5 stars">${starsTxt(n)}</span>${r.title ? `<span class="h4" style="font-size:15px;font-weight:500">${esc(r.title)}</span>` : ''}</div>
      ${r.body ? `<p class="review-body">${esc(r.body)}</p>` : ''}
      <div class="row wrap" style="gap:6px">${skinTags(r)}${a.skin_tone ? `<span class="tag">${esc(a.skin_tone)}</span>` : ''}${a.incentivized ? '<span class="tag">Gifted</span>' : ''}</div>
      <div class="row" style="gap:8px"><span class="small">${esc(r.author_name ?? 'Anonymous')}</span>${r.verified ? '<span class="xs" style="color:var(--forest)">✓ Verified buyer</span>' : ''}<span class="xs faint grow">${fmtDate(r.reviewed_at)}</span><a class="src view-on" href="${esc(r.review_sources?.url ?? '#')}" target="_blank" rel="noopener">View on ${esc(retailerName(r.review_sources?.retailer ?? ''))} ↗</a></div>
    </div>`;
}
const go = (r) => { location.hash = `#/${r}`; };

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.innerHTML = `<div class="toast">${esc(msg)}</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.innerHTML = ''; }, 2600);
}

// Every product as "Brand · Name", for the search boxes' suggestions.
function catalogEntries() {
  const ids = new Set([...Object.keys(PRODUCTS), ...Object.keys(liveProducts())]);
  return [...ids].map((id) => [id, `${P(id).brand} · ${P(id).name}`]);
}
const productFromQuery = (q) => catalogEntries().find(([, label]) => label.toLowerCase() === q.trim().toLowerCase())?.[0];

function addToShelf(id) {
  if (signedOut()) { state = { ...state, authNotice: 'Create a free account to build your shelf.' }; go('signup'); return; }
  if (shelfIds().includes(id)) { toast(`${P(id).name} is already on your shelf`); return; }
  set({ shelfAdds: [...(state.shelfAdds ?? []), id] });
  toast(`Added ${P(id).name} to your shelf`);
}

function addToCart(id, kind = 'pick', note = '') {
  if (signedOut()) { state = { ...state, authNotice: 'Create a free account to save products to your cart and shelf.' }; go('signup'); return; }
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

const signedOut = () => auth.enabled && !currentUser();

function nav(active) {
  if (signedOut()) {
    return `
    <a href="#/welcome" aria-label="Dew home"><img class="logo" src="assets/svg/logo.svg" alt="Dew"></a>
    <form class="search" data-form="search" role="search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="#9a9e92" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="#9a9e92" stroke-width="2" stroke-linecap="round"/></svg>
      <input name="q" data-suggest="search" placeholder="Search products and reviews…" value="${esc(state.lastSearch || '')}" autocomplete="off" role="combobox" aria-controls="search-suggest" aria-expanded="false">
      <div class="suggest-box search-suggest" id="search-suggest" role="listbox"></div>
    </form>
    <span class="nav-spacer"></span>
    <a class="tab ${active === 'reviews' ? 'active' : ''}" href="#/reviews">Public reviews</a>
    <a class="tab" href="#/login">Log in</a>
    <a class="btn dark" href="#/signup">Create account</a>`;
  }
  const tabs = [['for-you', 'Explore'], ['people', 'People'], ['reviews', 'Public reviews'], ['picked', 'Picked for you']];
  const n = cartCount();
  return `
    <a href="#/for-you" aria-label="Dew home"><img class="logo" src="assets/svg/logo.svg" alt="Dew"></a>
    <form class="search" data-form="search" role="search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="#9a9e92" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="#9a9e92" stroke-width="2" stroke-linecap="round"/></svg>
      <input name="q" data-suggest="search" placeholder="Search products, ingredients, people…" value="${esc(state.lastSearch || '')}" autocomplete="off" role="combobox" aria-controls="search-suggest" aria-expanded="false">
      <div class="suggest-box search-suggest" id="search-suggest" role="listbox"></div>
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
    <section class="card stack quick-checkin" aria-label="Quick check-in">
      <div class="row between"><span class="h4">How’s your skin today?</span><span class="mono forest">+10 pts</span></div>
      <div class="feel-row">${feels.map((f) => `<button class="chip ${state.quickFeel === f ? 'on' : ''}" data-act="feel" data-v="${f}">${f}</button>`).join('')}</div>
      <div class="row rate-row">
        <span class="thumb" style="width:26px;height:32px;background:#fff;padding:2px"><img src="${P(target).img}" alt=""></span>
        <div class="grow" style="min-width:0"><div class="small ellipsis" style="font-weight:500">Rate Anua Retinol Night Cream</div><div class="xs faint">Week 3: is it working?</div></div>
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
  const base = baseShelf();
  const added = (state.shelfAdds ?? []).filter((id) => !base.some((s) => s.id === id)).map((id) => ({ id, weeks: 0, since: 'today', use: 'Just added', added: true }));
  const onShelf = new Set([...base.map((s) => s.id), ...added.map((s) => s.id)]);
  const arriving = [...new Set(state.orders.flatMap((o) => o.items.map((i) => i.id)))].filter((id) => !onShelf.has(id)).map((id) => ({ id, arriving: true, score: null }));
  const items = [...base, ...added, ...arriving].slice(0, 12);
  const open = state.shelfOpen ? (shelfItem(state.shelfOpen) ?? added.find((x) => x.id === state.shelfOpen)) : null;
  const ranked = [...base, ...added].sort((a, b) => (state.ratings[b.id] ?? 0) - (state.ratings[a.id] ?? 0));
  const rank = open ? ranked.findIndex((s) => s.id === open.id) + 1 : 0;
  return `
    <section class="stack my-shelf" aria-label="My shelf" style="position:relative">
      <div class="row between">
        <div><h2 class="h2 shelf-title">My Shelf</h2><div class="xs muted">${base.length + added.length} products  ranked by you</div></div>
        <a class="btn" href="#/search">+ Add</a>
      </div>
      ${items.length ? shelfRows(items, { open: state.shelfOpen }) : '<div class="empty" style="padding:20px 8px">Your shelf is empty. Tap “+ Add” to add the products you use.</div>'}
      ${open ? `
        <div class="shelf-pop stack" style="position:relative;width:auto">
          <div class="row between"><span class="mono">${esc(P(open.id).brand)}</span><button class="link" style="color:#fff" data-act="shelf-close">Close</button></div>
          <div class="h4" style="font-size:17px;font-weight:400">${esc(P(open.id).name)}</div>
          <div class="row" style="gap:22px">
            <div><div class="k">Using for</div><div class="v">${open.added ? 'Just added' : `${open.weeks} weeks`}</div></div>
            <div><div class="k">Your rank</div><div class="v">#${rank} of ${ranked.length}</div></div>
            <div><div class="k">Score</div><div class="v">${state.ratings[open.id] != null ? state.ratings[open.id].toFixed(1) : '–'}</div></div>
          </div>
          <div class="bar"><span style="width:${open.daysLeft ? Math.min(100, open.daysLeft * 4) : 82}%"></span></div>
          <div class="xs" style="color:#c8dcc9">Since ${open.since}  ${esc(P(open.id).step)} step  ${open.use}${open.daysLeft ? `  ~${open.daysLeft} days left` : ''}</div>
          <div class="row"><span class="k">Rate it</span><span class="stars">${[1, 2, 3, 4, 5].map((i) => `<button class="${i <= Math.round((state.ratings[open.id] ?? 0) / 2) ? 'on' : ''}" data-act="rate-shelf" data-id="${open.id}" data-v="${i}" aria-label="${i} stars">★</button>`).join('')}</span></div>
          <div class="row">
            <a class="btn sm" href="#/check-in">Review</a>
            <a class="btn sm" href="#/product/${open.id}">Reviews</a>
            <button class="btn sm" data-act="refill" data-id="${open.id}">Log refill</button>
            <button class="btn sm" data-act="ask" data-q="${esc(`What pairs well with ${P(open.id).name}?`)}">Ask <span class="nc">Dew</span></button>
          </div>
        </div>` : ''}
    </section>`;
}

function finishProfileCard() {
  if (state.setupStep >= 4) return '';
  const left = [[3, 'Preferences + goals', '~1 min'], [4, 'Your current shelf', '~2 min']].filter(([n]) => n > state.setupStep);
  return `
    <section class="card dark stack finish-card">
      <div class="row" style="gap:6px">${svg('hydrate', 24)}${svg('treat', 26)}${svg('protect', 26)}</div>
      <span class="mono lime">Skin profile: ${state.setupStep} of 4 done</span>
      <h3 class="finish-title">Finish your profile to unlock Picked for you</h3>
      <div class="seg-meter">${[1, 2, 3, 4].map((i) => `<i class="${i <= state.setupStep ? 'on' : ''}"></i>`).join('')}</div>
      ${left.map(([n, l, t]) => `<a class="todo" href="#/setup/${n}"><i></i><span class="grow">${n}: ${l}</span><span class="t">${t}</span></a>`).join('')}
      <p class="xs" style="color:var(--canvas)">Each step sharpens your picks. Finish both: +150 pts and picks matched on all 4 steps.</p>
      <a class="btn lime" href="#/setup/${state.setupStep + 1}" style="align-self:flex-start">Finish my profile →</a>
    </section>`;
}

function downloadApp() {
  return `
    <section class="card dark stack">
      <div class="row">${svg('hydrate', 26)}${svg('treat', 26)}${svg('protect', 26)}</div>
      <span class="mono lime">Track on the go</span>
      <h3 class="h3" style="font-size:24px">Log your progress in the Dew app</h3>
      <p class="small" style="color:#c8dcc9">Take your weekly progress photo with the same framing every time, tick off your AM and PM routine, and get refill nudges. Everything syncs back here.</p>
      <a class="row" href="#/profile" data-act="toast" data-msg="The Dew iOS app is coming soon" style="align-self:flex-start;gap:8px;padding:8px 16px 8px 12px;background:#000;border:1px solid #a6a6a6;border-radius:var(--radius-sm);text-decoration:none;color:#fff">
        <svg width="18" height="22" viewBox="0 0 814 1000"><path fill="#fff" d="M788 340c-6 4-110 63-110 193 0 151 132 204 136 206-1 3-21 73-70 145-44 63-90 126-160 126s-88-41-169-41c-79 0-107 42-171 42s-109-58-160-130C25 797 0 677 0 563c0-183 119-280 236-280 62 0 114 41 153 41 37 0 95-43 166-43 27 0 124 2 188 99zM549 154c30-35 51-84 51-133 0-7-1-14-2-19-48 2-105 32-140 72-27 31-53 80-53 130 0 8 1 15 2 18 3 1 9 1 14 1 43 0 97-29 128-69z"/></svg>
        <span><span style="display:block;font-size:9px">Download on the</span><span style="font-size:17px;font-weight:500;line-height:1">App Store</span></span>
      </a>
    </section>`;
}

function runningLow() {
  const low = REFILLS.filter((r) => shelfIds().includes(r.id));
  if (!low.length) return '';
  return `
    <section class="card stack running-low" aria-label="Running low">
      <div class="row between"><span class="h4" style="font-size:13px">Running low</span><span class="xs faint">Refill or replace</span></div>
      ${low.map((r) => {
        const inCart = state.cart.some((c) => c.id === r.id && c.kind === 'refill');
        const left = r.action === 'replace' ? `<span class="xs faint">${r.note}</span>` : `<span class="row" style="gap:6px"><span class="low-bar"><span style="width:${r.note.includes('day') ? 12 : 40}%"></span></span><span class="xs faint">${r.note.replace('~', '')}</span></span>`;
        return `
        <div class="row" style="gap:8px">
          ${thumb(r.id, 24, 30)}
          <div class="grow" style="min-width:0"><div class="xs ellipsis" style="font-weight:500;color:var(--ink)">${esc(P(r.id).name)}</div>${left}</div>
          ${inCart
            ? '<button class="btn sm" disabled>In cart ✓</button>'
            : r.action === 'replace'
              ? `<a class="btn sm" href="#/product/${r.replaceWith}">Replace</a>`
              : `<button class="btn dark sm" data-act="refill" data-id="${r.id}">Refill${P(r.id).price ? ` ${money(P(r.id).price)}` : ''}</button>`}
        </div>`;
      }).join('')}
    </section>`;
}

// Figma Hi-fi v7 "Shelf panel": one white panel holding the check-in, the shelf, running low and the shelf hint.
const leftCol = (extra = '', after = '') => `<div class="side-panel">${quickCheckin()}${myShelf()}${runningLow()}<p class="xs muted">Tap any product to rate it, review it or log a refill.</p>${extra}</div>${after}`;

/* ================= right rail ================= */

function rightRail() {
  const saved = state.saved ?? [];
  const shown = state.savedAll ? saved : saved.slice(0, 5);
  const total = saved.reduce((a, id) => a + (P(id).price || 0), 0);
  return `
    <section class="card stack want-rail" style="margin-bottom:56px">
      <div class="row between"><h2 class="h4">Want to try</h2><span class="mono forest">${saved.length} saved</span></div>
      <p class="xs faint">Save picks from Explore, People and Picked for you. Buy them, or sample them with points.</p>
      ${saved.length ? shown.map((id) => `
        <div class="row" style="align-items:flex-start;gap:10px">
          ${thumb(id, 40, 44)}
          <div class="grow stack" style="gap:2px;min-width:0">
            <span class="mono faint" style="font-size:9px">${esc(P(id).brand)}</span>
            ${productLink(id, `<span class="small" style="font-weight:500">${esc(P(id).name)}</span>`)}
            <span class="row" style="gap:8px">${P(id).price ? `<span class="mono" style="color:var(--ink)">${money(P(id).price)}</span>` : ''}<button class="link mono forest rail-link" data-act="add" data-id="${id}">${state.added[id] ? 'In cart ✓' : 'Add to cart'}</button></span>
          </div>
        </div>`).join('') : '<div class="empty" style="padding:20px 8px">Nothing saved yet. Tap “+ Want to try” on a pick or review.</div>'}
      ${saved.length > 5 ? `<button class="btn block" data-act="saved-all">${state.savedAll ? 'Show fewer' : `Show all ${saved.length}`}</button>` : ''}
      ${saved.length ? `<button class="btn dark block" data-act="add-many" data-ids="${saved.join(',')}">Add all to cart${total ? ` · ${money(total)}` : ''}</button>` : ''}
    </section>`;
}

function askDew() {
  if (!state.askOpen) return `<button class="askdew-pill" data-act="ask-open">${svg('hydrate', 22)}Ask Dew <span class="arrow">↑</span></button>`;
  return `
    <section class="askdew-panel" aria-label="Ask Dew">
      <div class="row">${svg('hydrate', 22)}<span class="h4 grow">Ask Dew</span><button class="link mono" data-act="ask-close">Minimize ↘</button></div>
      <p class="xs muted">${currentUser() ? 'Your AI skincare assistant, powered by Claude. Answers use your skin profile, your shelf and Dew’s review data.' : 'Your AI skincare assistant. Log in to chat with Dew for real.'}</p>
      <div class="chat" id="chat">${state.chat.map((m) => `<div class="msg ${m.me ? 'me' : 'dew'}${m.pending ? ' typing' : ''}">${m.pending ? '<span></span><span></span><span></span>' : esc(m.text)}</div>`).join('')}</div>
      <div class="row wrap" style="gap:6px">
        ${['What should I add to my routine?', 'Best SPF for humid days', 'Can I use retinol and vitamin C together?'].map((q) => `<button class="chip" data-act="ask" data-q="${q}">↳ ${q}</button>`).join('')}
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
        ${productLink(p.id, `<span style="font-size:15px">${esc(pr.name)}</span>`)}
        <span class="small muted">${esc(p.why)}</span>
        ${liveRating(p.id)}
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

// Newest public reviews from people with your skin type; sample reviews if the API is unavailable.
function peopleLikeYou() {
  const skin = state.answers.skinType?.[0];
  const live = useJson(reviewsUrl({ skinType: skin, limit: 3 }));
  const reviews = live.data?.reviews ?? [];
  const body = live.status === 'loading'
    ? '<div class="empty">Loading reviews…</div>'
    : reviews.length
      ? reviews.map((r) => liveReview(r, true)).join('')
      : PUBLIC_REVIEWS.map(verdictReview).join('');
  return `
    <section class="card stack">
      <h3 class="h4">What people like you are saying</h3>
      <p class="xs muted">${reviews.length ? `The newest reviews from people with ${skin ? `${esc(skin.toLowerCase())} skin` : 'skin like yours'}, collected from brand sites.` : 'Public reviews from people with your skin, from Sephora, Reddit and YesStyle.'} Your friends and creators are on the People tab.</p>
      ${body}
      <a class="btn" href="#/people" style="align-self:flex-start">Show more reviews</a>
    </section>`;
}

// Top 3 products for this person from real review data (see /api/recommendations).
// Falls back to the prototype's picks if the API is unavailable.
const shelfIds = () => [...baseShelf().map((x) => x.id), ...(state.shelfAdds ?? [])];

function recommendationsCard() {
  const a = state.answers;
  const owned = [...new Set(shelfIds().map((id) => P(id).step).filter(Boolean))];
  const params = new URLSearchParams({ owned: owned.join(','), exclude: [...shelfIds(), ...(state.hiddenPicks ?? [])].join(',') });
  if (a.skinType?.[0]) params.set('skin_type', a.skinType[0]);
  if (a.concerns?.length) params.set('concerns', a.concerns.join(','));
  const recs = useJson(`/api/recommendations?${params}`);
  if (recs.status === 'error' || (recs.status === 'ok' && !recs.data.picks?.length)) {
    return `<section class="card"><h3 class="h4">Picked for your routine</h3>${PICKS.gaps.slice(0, 3).map((p, i) => pickRow(p, i) + followUse(p.id)).join('')}</section>`;
  }
  const picks = recs.data?.picks ?? [];
  const pick = (r, i) => {
    const pr = r.product;
    const pl = r.people_like_you;
    const who = pl.skin_type ? `people with ${pl.skin_type.toLowerCase()} skin` : 'reviewers';
    return `
      <article class="rec">
        <div class="row" style="gap:16px;align-items:flex-start">
          <span class="rank">${i + 1}</span>
          <span style="margin-top:14px">${thumb(pr.id, 56, 56)}</span>
          <div class="grow stack" style="gap:4px;min-width:0">
            <span class="mono faint">${esc(pr.brand)}</span>
            ${productLink(pr.id, `<span class="rec-name">${esc(pr.name)}</span>`)}
            <div class="row wrap" style="gap:6px">${r.step ? `<span class="gap-chip ${r.gap ? 'on' : ''}">${r.gap ? `Fills your ${esc(r.step.toLowerCase())} gap` : esc(r.step)}</span>` : ''}${r.solves.map((c) => `<span class="rec-tag">${esc(c)}</span>`).join('')}</div>
            <span class="row" style="gap:14px;margin-top:4px"><span class="buybar"><span style="width:${pl.pct_positive}%"></span></span><span class="buy-pct">${pl.pct_positive}% say BUY</span><span class="xs muted">${pl.reviews.toLocaleString()} reviews</span>${r.matched ? `<span class="xs faint">${r.matched} matched</span>` : ''}</span>
          </div>
          <span style="margin-top:20px">${ring(pl.avg_rating * 2)}</span>
        </div>
        <div class="rec-why">
          <div class="stack" style="gap:6px">
            <span class="mono forest">What this solves</span>
            <p class="rec-p">${esc(r.what_solves)}</p>
            ${r.fit ? `<p class="small muted">${esc(r.fit)}</p>` : ''}
          </div>
          <div class="stack" style="gap:6px">
            <span class="mono forest">What people like you are saying</span>
            <p class="rec-p">${pl.pct_positive}% of ${pl.reviews.toLocaleString()} ${who} rated it 4★ or more.</p>
            ${pl.quotes.slice(0, 1).map((q) => `<blockquote><span class="small">“${esc(q.body.trim())}”</span><span class="xs faint" style="display:block;margin-top:2px">${esc(q.author_name ?? 'Reviewer')}${q.skin_types?.length ? `, ${esc(q.skin_types.join(' + ').toLowerCase())} skin` : ''}</span></blockquote>`).join('')}
          </div>
        </div>
        <div class="row wrap" style="gap:8px">
          <a class="btn" href="#/product/${pr.id}">See all reviews + ratings</a>
          ${pr.price_usd ? `<button class="btn dark" data-act="add" data-id="${pr.id}">${state.added[pr.id] ? '✓ In your cart' : 'Add to cart'}</button>` : ''}
          <button class="btn" data-act="save" data-id="${pr.id}">${(state.saved ?? []).includes(pr.id) ? '✓ Saved' : '+ Want to try'}</button>
          <span class="grow"></span>
          <button class="link mono why-link" data-act="why-open" data-id="${pr.id}" data-step="${esc(r.step ?? '')}" data-gap="${r.gap ? 1 : 0}" data-pct="${pl.pct_positive}" data-n="${pl.reviews}">Why this?</button>
        </div>
        ${followUse(pr.id)}
      </article>`;
  };
  return `
    <section class="card stack" style="gap:18px">
      <div class="stack" style="gap:3px">
        <h2 class="h4" style="font-size:17px">Your top 3 picks</h2>
        <p class="small muted">Based on your skin profile and what’s already on your shelf, ranked by how people with skin like yours rated them.</p>
      </div>
      ${recs.status === 'loading' ? '<div class="empty">Finding your picks…</div>' : picks.map(pick).join('<hr class="divider">')}
    </section>`;
}

// Tags that sum up the skin profile, e.g. Combination · Breakouts + Redness · Humid · Miami · 25–29.
// The climate tag comes from the typed location, so it only appears once a place was found.
function profileTags(extra = []) {
  const a = state.answers;
  return [a.skinType?.[0], a.concerns?.slice(0, 2).join(' + '), a.climate && `${a.climate.humidity.label} · ${a.climate.place.split(',')[0]}`, a.age?.[0], a.diet?.[0], ...extra].filter(Boolean).map(esc);
}

// "Your box" from Figma Hi-fi v7 (node 186:3742): four product shapes behind an olive lid and a photo box.
const BOX_ILLO = `<svg class="box-illo" viewBox="0 0 194 124" aria-hidden="true">
  <defs><clipPath id="box-clip"><rect x="8.45" y="51.48" width="176" height="70.4" rx="8.8"/></clipPath></defs>
  <g fill="#F7F6F3">
    <path d="M172.4 79.2c2.09 0 3.75-1.75 3.63-3.84l-2.64-48.25a3.47 3.47 0 0 0-1.89-2.99v-3.85c0-1.47-1.2-2.67-2.67-2.67h-13.23c-1.48 0-2.67 1.2-2.67 2.67v3.6a3.47 3.47 0 0 0-2.46 3.28l-2.1 48.25c-.1 2.07 1.56 3.8 3.63 3.8h20.4Z"/>
    <rect x="83.87" y="17.6" width="50.09" height="14.79" rx="5.37"/><path d="M75.33 42.78c0-5.74 4.65-10.39 10.38-10.39h46.11c5.74 0 10.39 4.65 10.39 10.39v16.35c0 5.74-4.65 10.39-10.39 10.39H85.71c-5.73 0-10.38-4.65-10.38-10.39V42.78Z"/>
    <path d="M66.48 35.47a2.79 2.79 0 0 1 2.79 2.79v32.49c0 3.7-3 6.69-6.69 6.69H56.5c-3.7 0-6.69-3-6.69-6.69V38.26a2.79 2.79 0 0 1 2.79-2.79 2.79 2.79 0 0 1-2.79-2.79V22.53c0-3.7 3-6.69 6.69-6.69h6.08c3.7 0 6.69 3 6.69 6.69v10.15a2.79 2.79 0 0 1-2.79 2.79Z"/>
    <path d="M19.48 15.86c2.28.16 3.87.6 5.32 1.05 1.44.44 2.65.86 4.38 1.11 1.63.24 3.12.05 4.21-.22a10 10 0 0 0 1.66-.51l.08-.03a1.5 1.5 0 0 1 1.3 2.7l-.01.01-.06.03a11.3 11.3 0 0 1-2.27.76c-.66.16-1.45.3-2.33.37v4.93h3.35c1.27 0 2.3 1.03 2.3 2.3v4.99c0 .21-.03.41-.08.6h.27c3.36 0 6.09 2.73 6.09 6.09v31.35c0 3.37-2.73 6.09-6.09 6.09H21.14c-3.37 0-6.09-2.72-6.09-6.09V40c0-3.36 2.72-6.09 6.09-6.09h.27a2.3 2.3 0 0 1-.08-.6v-4.99c0-1.27 1.03-2.3 2.3-2.3h3.25v-5.39c-1.11-.27-2.06-.58-2.95-.85-1.35-.42-2.69-.78-4.65-.92a6.6 6.6 0 0 0-4.09 1.04c-.49.3-.87.61-1.12.84l-.33.34a1.5 1.5 0 0 1-2.2-2.03l.03-.03.08-.09c.1-.1.24-.25.42-.42.36-.33.89-.76 1.57-1.18a9.7 9.7 0 0 1 5.85-1.48Z"/>
  </g>
  <image href="assets/img/hero.jpg" x="8.45" y="51.48" width="176" height="70.4" preserveAspectRatio="xMidYMid slice" clip-path="url(#box-clip)"/>
  <rect x="5.81" y="44" width="181.28" height="15.84" rx="5.28" fill="#A1A261"/>
  <text x="96.5" y="89.1" text-anchor="middle" fill="#113916" font-family="Geist Mono, monospace" font-size="8.8" font-weight="500" letter-spacing="0.35">YOUR BOX</text>
</svg>`;

function forYou() {
  const done = state.setupStep >= 4;
  const tags = profileTags();
  const missing = 4 - state.setupStep;
  const main = `
    <h1 class="h2 page-title">Explore</h1>
    <div class="row wrap" style="gap:8px"><span class="mono faint">Matched to you</span>${tags.map((t) => `<span class="tag">${t}</span>`).join('')}${done ? '<a class="edit-link" href="#/setup/1">Edit profile</a>' : `<a class="edit-link" href="#/setup/${state.setupStep + 1}">${missing} step${missing === 1 ? '' : 's'} missing →</a>`}</div>
    <section class="hero hero-pick">
      <div class="hero-text">
        <h2 class="hero-title">Too many options? We’ll pick for you.</h2>
        <p class="hero-sub">One product per step, chosen from 1,486 people who match you on all 4 profile steps.</p>
        <a class="btn lime" href="#/picked" style="align-self:flex-start;margin-top:12px">See my routine →</a>
      </div>
      <div class="hero-box">${BOX_ILLO}</div>
    </section>
    ${recommendationsCard()}`;
  return { layout: '', left: leftCol(finishProfileCard()), main, right: rightRail() };
}

/* ================= onboarding ================= */

const SETUP = [
  { n: 1, name: 'My skin', title: 'Start with you and your skin', sub: 'Age, skin type and concerns are how we find people whose results predict yours. This takes about a minute.', groups: [
    ['About you', 'hydrate', [['age', 'Age range', ['Under 18', '18–24', '25–29', '30–34', '35–44', '45+'], true], ['gender', 'Gender', ['Woman', 'Man', 'Non-binary', 'Prefer not to say'], true], ['ethnicity', 'Ethnicity (optional)', ['East Asian', 'South Asian', 'Southeast Asian', 'Black', 'Hispanic / Latine', 'Middle Eastern', 'White', 'Mixed', 'Prefer not to say']]]],
    ['Skin', 'cleanse', [['skinType', 'Skin type', ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'], true], ['concerns', 'Concerns', ['Breakouts', 'Redness', 'Dark spots', 'Texture', 'Large pores', 'Dryness', 'Fine lines', 'Sensitivity']]]],
  ] },
  { n: 2, name: 'Environment + lifestyle', title: 'Where and how you live', sub: 'Humidity, sun, sleep and diet change what works on your skin.', groups: [
    ['Your environment', 'protect', [['location', 'Where you live']]],
    ['Your day-to-day', 'cleanse', [['outdoors', 'Time outdoors', ['Mostly indoors', '1–2 hrs', '3+ hrs'], true], ['sleep', 'Sleep', ['Under 6 hrs', '6–8 hrs', '8+ hrs'], true], ['stress', 'Stress lately', ['Low', 'Medium', 'High'], true], ['diet', 'Diet', ['Balanced', 'Dairy-free', 'Vegan', 'Vegetarian', 'Lots of sugar', 'High protein']], ['hydration', 'Hydration', ['Under 1L a day', '1–2L a day', 'Drinks 2L+ water'], true]]],
  ] },
  { n: 3, name: 'Preferences + goals', title: 'What do you want from your routine?', sub: 'Your goals rank the picks. Budget and must-haves filter out anything that doesn’t fit.', groups: [
    ['Preferences + goals', 'treat', [['goals', 'Top goals (pick up to 3)', ['Clear breakouts', 'Calm redness', 'Fade dark spots', 'Smoother texture', 'Hydration', 'Anti-aging', 'Glow'], false, 3], ['size', 'Routine size', ['Minimal  3 steps', 'Standard  4–5 steps', 'Full  6+ steps'], true], ['budget', 'Budget per product', ['Under $15', '$15–30', '$30–60', '$60+'], true], ['musts', 'Must-haves', ['Fragrance-free', 'Cruelty-free', 'Vegan', 'Reef-safe SPF', 'Fungal-acne safe', 'Pregnancy-safe']], ['shops', 'Where you shop', ['Sephora', 'Ulta', 'Amazon', 'Target', 'Walmart', 'Drugstores & Pharmacies', 'Bluemercury', 'Olive Young', 'Brand sites', 'Other']]]],
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
      <div class="stack" style="gap:8px;padding:12px;border-radius:var(--radius-md);background:rgb(255 255 255 / 8%)">
        <span class="mono lime">Finish to unlock</span>
        ${rows.map(([a, b]) => `<div class="row xs unlock-row"><span style="color:var(--lime)">✦</span><span style="font-weight:500">${a}</span><span style="color:#d9e6d6">${b}</span></div>`).join('')}
        <p class="xs" style="color:#d9e6d6">What are points for? 500 pts takes $5 off, and 1,500 pts unlocks a free sample box of your top 3 picks.</p>
      </div>
      <div class="row" style="gap:6px">${svg('hydrate', 24)}${svg('treat', 26)}${svg('protect', 26)}</div>
    </section>`;
}

function locationField(label) {
  const a = state.answers;
  const c = a.climate;
  const look = state.climateLookup ?? {};
  // Profiles saved before locations were typed have a place but no climate yet: look it up once.
  const typed = /humid|uv\b/i.test(a.location?.[0] ?? '') ? '' : (a.location?.[0] ?? '');
  if (typed && !c && !look.busy && !look.error) setTimeout(() => lookUpClimate(typed), 0);
  const chips = c ? `
      <div class="row wrap" style="gap:6px"><span class="chip on">${esc(c.humidity.label)}: ${c.humidity.value}% humidity</span><span class="chip on">${esc(c.uv.label)}: UV ${c.uv.value}</span></div>
      <span class="xs muted">Averages for ${esc(c.place)} over the last 30 days.</span>` : '';
  return `<div class="stack" style="gap:8px"><span class="field-label">${label}</span>
      <form class="row" data-form="location"><input name="q" class="grow" value="${esc(typed)}" style="height:38px;border:1px solid var(--line);border-radius:var(--radius-sm);padding:0 12px;font:inherit" placeholder="Type your city, e.g. Austin, TX" autocomplete="address-level2"><button class="btn dark">${c ? 'Update' : 'Find'}</button></form>
      ${look.busy ? '<span class="xs muted">Checking humidity and UV…</span>' : look.error ? `<span class="xs" style="color:#b3261e">${esc(look.error)}</span>` : chips}</div>`;
}

async function lookUpClimate(q) {
  q = q.trim();
  if (!q) { set({ answers: { ...state.answers, location: [], climate: null }, climateLookup: {} }); return; }
  if (state.climateLookup?.busy || q === state.answers.climate?.place) return;
  set({ climateLookup: { busy: true } });
  try {
    const r = await fetch(`/api/climate?q=${encodeURIComponent(q)}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? 'Weather data is unavailable right now.');
    set({ answers: { ...state.answers, location: [data.place], climate: data }, climateLookup: {} });
  } catch (err) {
    set({ answers: { ...state.answers, location: [q], climate: null }, climateLookup: { error: err.message } });
  }
}

function chipGroup([key, label, opts, single, max]) {
  if (key === 'location') return locationField(label);
  const sel = state.answers[key] || [];
  return `<div class="stack" style="gap:8px"><span class="field-label">${label}</span><div class="row wrap" style="gap:6px">${opts.map((o) => `<button class="chip ${sel.includes(o) ? 'on' : ''}" data-act="answer" data-key="${key}" data-v="${esc(o)}" data-single="${single ? 1 : ''}" data-max="${max || ''}">${o}</button>`).join('')}</div></div>`;
}

// Setup step 4 shelf, grouped by routine step like the Figma (Cleanse + tone, Treat, Moisturize, Protect + lips...).
const SHELF_GROUPS = [['Cleanse + tone', 'cleanse', ['Cleanse', 'Tone']], ['Treat', 'treat', ['Treat', 'Masks']], ['Moisturize', 'hydrate', ['Moisturize', 'Eyes']], ['Protect + lips', 'protect', ['Protect', 'Lips']]];
function groupedShelf(ids) {
  const stepOf = (id) => String(P(id).step ?? '').replace(/ step$/, '').replace('Eye', 'Eyes').replace('Eyess', 'Eyes');
  const used = new Set();
  const groups = SHELF_GROUPS.map(([label, icon, steps]) => {
    const items = ids.filter((id) => !used.has(id) && steps.includes(stepOf(id)));
    items.forEach((id) => used.add(id));
    return [label, icon, items];
  });
  const rest = ids.filter((id) => !used.has(id));
  if (rest.length) groups.push(['Other', 'cleanse', rest]);
  return `<div class="shelf grouped-shelf">${groups.filter(([, , items]) => items.length).map(([label, icon, items]) => `
    <div class="row" style="gap:6px">${svg(icon, 16)}<span class="mono faint">${label}</span></div>
    <div class="plank-row">${items.slice(0, 7).map((id) => `<span class="slot"><img src="${P(id).img}" alt="${esc(P(id).name)}"></span>`).join('')}</div>`).join('<div style="height:10px"></div>')}</div>`;
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
        <form class="shelf-search" data-form="shelf-add"><div class="row" style="gap:6px"><input name="q" data-suggest="shelf" class="grow shelf-input" placeholder="Start typing a brand or product, e.g. “Heartleaf”" autocomplete="off" role="combobox" aria-controls="shelf-suggest" aria-expanded="false"><button type="button" class="btn" data-act="toast" data-msg="Scanning works in the Dew app">Scan barcode</button><button type="button" class="btn" data-act="toast" data-msg="Order import is coming soon">Import orders</button></div><div class="suggest-box" id="shelf-suggest" role="listbox"></div></form>
        ${shelfIds().length ? groupedShelf(shelfIds()) : '<p class="xs muted">Your shelf is empty. Add the products you use now.</p>'}
        <div class="notice">We use your shelf to find what your routine is missing, what’s running low and what to replace.</div>
      </section>`;
  const back = n > 1 ? `<a class="btn" href="#/setup/${n - 1}">← Back</a>` : '<a class="btn" href="#/for-you">Skip for now</a>';
  const next = n < 4 ? `<button class="btn dark" data-act="setup-next" data-n="${n}">Continue to ${SETUP[n].name.toLowerCase()} →</button>` : '<button class="btn dark" data-act="setup-next" data-n="4">Finish my profile →</button>';
  const main = `${bar}<span class="mono" style="margin-top:12px">Step ${n} of 4</span><h1 class="h1">${s.title}</h1><p class="muted">${s.sub}</p>${body}<div class="row between setup-nav">${back}${next}</div>`;
  return { layout: 'layout-focus', main, right: strengthCard() };
}

function setupDone() {
  const pool = [['Same climate + lifestyle', '12.4k', 100], ['+ similar skin', '4.1k', 60], ['+ same goals + budget', '2.3k', 40], ['+ overlapping shelf', '1,486', 25]];
  const unlocked = [['Picked for you', 'Your 4-step routine, one product per step'], ['Smarter home picks', 'Ranked by gaps, refills and upgrades'], ['Refill reminders', 'We nudge you before you run out'], ['Weekly check-ins', 'Track your skin, rate your products']];
  const main = `
    <div class="done-page">
      <section class="done-banner">
        <div class="stack" style="gap:10px;max-width:720px">
          <div class="row" style="gap:6px">${svg('hydrate', 36)}${svg('treat', 38)}${svg('protect', 34)}</div>
          <span class="mono" style="color:var(--ink)">4 of 4 ✓</span>
          <h1 class="h1" style="color:var(--forest)">Congratulations, you’ve completed your skin profile</h1>
          <p class="small" style="color:var(--ink)">Every pick, ranking and review you see is now matched on all four steps: lifestyle, skin, goals and shelf.</p>
        </div>
        <div class="done-strength">
          <span class="mono lime">Profile strength</span>
          <span class="big">100%</span>
          <span class="mono lime">+200 pts earned</span>
        </div>
      </section>
      <div class="done-cards">
        <section class="card dark stack" style="gap:12px;padding:22px">
          <span class="mono lime">Your match pool: unlocked</span>
          <span style="font-size:64px;line-height:1.1;letter-spacing:-.02em">1,486</span>
          <p class="xs" style="color:#fff;max-width:340px">people like you who’ve reviewed or tracked products. Their results now rank everything you see.</p>
          ${pool.map(([a, b, w]) => `
            <div class="row" style="align-items:flex-end;gap:24px">
              <div class="stack" style="gap:6px;width:56%"><span class="xs">${a}</span><div class="meter" style="height:5px;background:rgb(255 255 255 / 12%)"><span style="width:${w}%"></span></div></div>
              <span class="grow"></span><span class="mono lime">${b}</span>
            </div>`).join('')}
        </section>
        <section class="card stack" style="gap:12px;padding:22px">
          <h3 style="font-size:15px;font-weight:500">Unlocked for you</h3>
          ${unlocked.map(([a, b]) => `<div class="row" style="align-items:center;gap:12px"><span class="check">✓</span><div><div class="small">${a}</div><div class="xs faint">${b}</div></div></div>`).join('')}
          <span class="grow"></span>
          <a class="btn dark block" href="#/for-you" style="justify-content:flex-start">Explore products →</a>
        </section>
      </div>
      <p class="xs faint">You can edit any step later from your profile.</p>
    </div>`;
  return { layout: 'layout-solo', main };
}

/* ================= creators ================= */

function creatorShelfProducts(c) {
  if (c.shelf) return Object.values(c.shelf).flat().map(([id]) => id);
  return c.products;
}

function rankCard(title, ids, scores, holy) {
  return `<div class="card stack" style="padding:16px"><h4 class="h4" style="font-size:14px">${title}</h4>${ids.map((id, i) => `
    <div class="row"><span style="font-size:18px;color:var(--ink-3);width:12px">${i + 1}</span>${thumb(id, 32, 38)}<div class="grow">${holy === id ? '<div class="mono forest">★ Holy grail</div>' : ''}<div class="mono">${esc(P(id).brand)}</div><div class="small">${esc(P(id).name)}</div></div>${ring(scores[id] ?? 8, true)}</div>`).join('')}</div>`;
}

// ---- creator pages (Hi-fi v7 05 + 05b), also used for your own public page (08c) ----

const PAGE_THEMES = {
  blush: 'linear-gradient(110deg, #fbe0e5 0%, #fdeee4 55%, #fdf3df 100%)',
  sky: 'linear-gradient(110deg, #e6f1fa 0%, #e9f3f0 55%, #f0f5df 100%)',
  lime: 'linear-gradient(110deg, #eef7cf 0%, #f4f8e6 100%)',
  sand: 'linear-gradient(110deg, #f6eee2 0%, #f8f3ea 100%)',
  white: '#ffffff',
};
const BEST_FOR_STEP = { Cleanse: 'Best for gentle cleansing', Tone: 'Best for prep', Treat: 'Best for targeted care', Moisturize: 'Best for hydration', Protect: 'Best for daily SPF', Eye: 'Best for eyes', Mask: 'Best for a reset', Lip: 'Best for lips' };
const bestForStep = (id) => BEST_FOR_STEP[String(P(id).step).split(' ')[0]] ?? 'Best for everyday';
const AGO = ['2 weeks ago', '3 weeks ago', '1 month ago', '5 weeks ago', '6 weeks ago', '2 months ago', '3 months ago'];
const SOURCES = ['TikTok', 'Sephora', 'YouTube', 'Instagram'];

// One shape for every creator, filled in from whatever their data has.
function creatorModel(c) {
  const first = c.name.split(' ')[0];
  const top3 = Object.fromEntries(c.top3 ?? []);
  const shelfScores = c.shelf ? Object.fromEntries(Object.values(c.shelf).flat()) : {};
  const ids = c.shelf ? creatorShelfProducts(c) : [...new Set([...(c.top3 ?? []).map(([id]) => id), ...creatorShelfProducts(c)])];
  const scored = ids.map((id, i) => [id, shelfScores[id] ?? top3[id] ?? Math.max(6.8, 8.7 - i * 0.15)]);
  const ranked = [...scored].sort((a, b) => b[1] - a[1]);
  const score = Object.fromEntries(scored);
  const purposeOf = (id) => Object.entries(c.purposes ?? {}).find(([, v]) => v.includes(id))?.[0];
  const recs = c.recs
    ? c.recs.map(([id, best, note]) => ({ id, best, note, score: score[id] }))
    : ranked.slice(0, 5).map(([id, s], i) => ({ id, score: s, best: purposeOf(id) ?? bestForStep(id), note: id === c.holyGrail ? c.quote : ['Still on my shelf after months of testing.', 'Does exactly what it says, nothing more.', 'An easy yes for my skin type.', 'I reach for this most days.', 'Quietly one of my favorites.'][i] }));
  const holy = c.holyGrail ?? recs[0].id;
  const holyNote = c.recs?.find(([id]) => id === holy)?.[2] ?? c.quote;
  const reviews = [...(c.publicReviews ?? []), ...(c.moreReviews ?? [])].map(([id, src, when, txt]) => ({ id, src, when, txt, score: score[id] ?? 8 }));
  if (!reviews.length) recs.forEach((r, i) => reviews.push({ id: r.id, src: SOURCES[i % 4], when: AGO[i % AGO.length], txt: r.note, score: r.score }));
  return {
    key: c.id, kind: c.kind ?? 'creator', first, name: c.name, avatar: c.avatar, handle: c.handle, followers: c.followers, match: c.match, tags: c.tags,
    matchNote: `Matched on ${[...(c.skin ?? []), c.environment].filter(Boolean).join(', ').toLowerCase()} climate, age ${c.age ?? '25–29'} and ${((n) => `${n} shared product${n === 1 ? '' : 's'}`)(ids.filter((p) => SHELF.some((s) => s.id === p)).length)}.`,
    blurb: c.blurb ?? `Hi, I’m ${first}. ${(c.skin ?? c.tags.slice(0, 2)).join(', ')} skin${c.location ? ` in ${c.location.split(',')[0]}` : ''}. ${c.quote} Everything here is something I’ve used for at least a month.`,
    announcement: c.announcement, theme: c.theme ?? ['sky', 'lime', 'sand', 'blush'][c.id.length % 4],
    stats: [[ids.length, 'products'], [c.reviews ?? reviews.length, 'reviews'], [c.weeks ?? 12 + (c.id.length * 3) % 20, 'weeks tracked']],
    holy: { id: holy, score: score[holy] ?? 9, note: holyNote },
    recs, ranked, score, reviews,
    using: (id) => { const i = ranked.findIndex(([x]) => x === id); return ['8 months', '6 months', '5 months', '4 months', '3 months', '10 weeks', '8 weeks', '6 weeks'][Math.min(i, 7)]; },
    bestFor: (id) => recs.find((r) => r.id === id)?.best ?? purposeOf(id) ?? bestForStep(id),
    noteFor: (id) => recs.find((r) => r.id === id)?.note ?? reviews.find((r) => r.id === id)?.txt ?? 'Still testing this one.',
    footer: true,
  };
}

const bestChip = (t) => `<span class="best-chip">${esc(t)}</span>`;

function pageBanner(m, edit) {
  const ann = m.announcement;
  return `
    <section class="page-banner stack" style="background:${PAGE_THEMES[m.theme] ?? PAGE_THEMES.sky}">
      <div class="row between"><span class="mono" style="color:#c2412d">From ${esc(m.first)}</span><span class="theme-chip"><i style="background:#f6c9d1"></i><i style="background:#fbe6c4"></i>${esc(m.first)}’s page theme</span></div>
      <p class="page-blurb">${esc(m.blurb)}</p>
      ${ann ? `<div class="announce row"><span class="announce-tag">Announcement</span><div class="grow"><div class="small">${esc(ann[0])}</div><div class="xs faint">${esc(ann[1])}  ·  ${esc(ann[2])}</div></div><button class="link mono" data-act="toast" data-msg="${esc(m.first)}’s latest shelf changes are highlighted below">See changes →</button></div>` : ''}
    </section>`;
}

function holyBanner(m, who) {
  const h = m.holy;
  return `
    <section class="holy-banner row">
      <span class="holy-img"><img src="${P(h.id).img}" alt=""></span>
      <div class="grow stack" style="gap:6px">
        <span class="mono lime">★ ${esc(who)}’s holy grail</span>
        <span class="mono" style="color:#c8dcc9">${esc(P(h.id).brand)}</span>
        <span class="h3" style="font-size:22px">${esc(P(h.id).name)}</span>
        <span class="small" style="color:#dfe9df">“${esc(h.note)}”</span>
        <div class="row" style="margin-top:4px"><button class="btn sm lime" data-act="add" data-id="${h.id}">Add to cart</button><button class="btn sm ghost-light" data-act="save" data-id="${h.id}">${(state.saved ?? []).includes(h.id) ? 'Saved ✓' : '+ Want to try'}</button></div>
      </div>
      <span class="ring lg-ring">${h.score.toFixed(1)}</span>
    </section>`;
}

function recList(m, { edit } = {}) {
  return `<section class="card stack rec-list">${m.recs.map((r, i) => `
    <div class="rec-row row">
      <span class="top3-n" style="font-size:20px;width:16px">${i + 1}</span>${thumb(r.id, 44, 50)}
      <div class="grow stack" style="gap:5px;min-width:0">
        <span class="mono faint">${esc(P(r.id).brand)}</span><span class="small" style="font-size:14px">${esc(P(r.id).name)}</span>
        <div>${bestChip(r.best)}</div>
        ${edit && state.editNote === r.id
          ? `<form class="row" data-form="rec-note" data-id="${r.id}" style="gap:6px"><input class="shelf-input grow" name="note" value="${esc(r.note)}" maxlength="160"><button class="btn sm dark">Save</button></form>`
          : `<p class="small muted">“${esc(r.note)}”</p>`}
        ${edit && state.editNote !== r.id ? `<button class="link mono" style="align-self:flex-start" data-act="edit-note" data-id="${r.id}">Edit note</button>` : ''}
      </div>${ring(r.score, true)}
    </div>`).join('')}</section>`;
}

function pageShelf(m, { edit, who } = {}) {
  const ids = m.ranked.map(([id]) => id);
  const open = state.pageShelfOpen?.[m.key];
  const rows = [ids.slice(0, Math.ceil(ids.length / 2)), ids.slice(Math.ceil(ids.length / 2))];
  const rank = open ? ids.indexOf(open) + 1 : 0;
  const peer = PUBLIC_REVIEWS.find((r) => r.product === open);
  return `
    <section class="card stack">
      <div><h2 class="h3">${edit ? 'My shelf' : `${esc(m.first)}’s shelf`}</h2><div class="xs muted">${ids.length} products  ·  ${edit ? 'drag to reorder, tap one to rate it or edit your note' : `tap one to see ${esc(m.first)}’s rating and notes`}</div></div>
      <div class="shelf page-shelf">${rows.map((r, ri) => `<div class="plank-row">${r.map((id) => `
        <button class="slot ${open === id ? 'active' : ''}" data-act="page-shelf" data-key="${m.key}" data-id="${id}" aria-label="${esc(P(id).name)}"><img src="${P(id).img}" alt=""></button>`).join('')}${edit && ri === 1 ? '<a class="slot add-slot" href="#/search" aria-label="Add product"><span>+<br>Add product</span></a>' : ''}</div>`).join('<div style="height:8px"></div>')}</div>
      ${open ? `
        <div class="shelf-pop page-pop">
          <div class="stack" style="gap:10px">
            <div class="row between"><span class="mono">${esc(P(open).brand)}</span></div>
            <div class="h3" style="font-size:20px">${esc(P(open).name)}</div>
            <div class="row" style="gap:28px">
              <div><div class="k">${edit ? 'Your' : `${esc(m.first)}’s`} rank</div><div class="v">#${rank} of ${ids.length}</div></div>
              <div><div class="k">${edit ? 'Your' : `${esc(m.first)}’s`} score</div><div class="v">${m.score[open].toFixed(1)}</div></div>
              <div><div class="k">Using for</div><div class="v">${m.using(open)}</div></div>
            </div>
            <div>${bestChip(m.bestFor(open))}</div>
            <div class="row">${edit
              ? `<a class="btn sm lime" href="#/check-in">Rate it</a><button class="btn sm ghost-light" data-act="edit-note" data-id="${open}">Edit note</button>`
              : `<a class="btn sm lime" href="#/product/${open}">See all reviews</a><button class="btn sm ghost-light" data-act="save" data-id="${open}">${(state.saved ?? []).includes(open) ? 'Saved ✓' : '+ Want to try'}</button>`}</div>
          </div>
          <div class="stack" style="gap:8px">
            <div class="row between"><span class="mono" style="color:#c8dcc9">Reviews</span><button class="link mono" style="color:#fff" data-act="page-shelf" data-key="${m.key}" data-id="${open}">Close</button></div>
            <div class="pop-review"><p class="small">“${esc(m.noteFor(open))}”</p><span class="mono" style="color:#c8dcc9">${edit ? 'Your note' : esc(m.first)}  ·  ${m.using(open)} in</span></div>
            ${peer ? `<div class="pop-review"><p class="small">“${esc(peer.text)}”</p><span class="mono" style="color:#c8dcc9">Combination skin  ·  ${peer.similar ?? 88}% like you</span></div>` : ''}
          </div>
        </div>` : ''}
    </section>`;
}

function pageReviews(m) {
  const f = { q: '', product: '', rating: '', sort: 'newest', limit: 5, ...(state.cr?.[m.key] ?? {}) };
  const q = f.q.trim().toLowerCase();
  const age = (w) => { const n = parseInt(w, 10) || 1; return /month/.test(w) ? n * 4 : n; };
  let list = m.reviews.filter((r) => (!f.product || r.id === f.product)
    && (!f.rating || (f.rating === 'high' ? r.score >= 9 : f.rating === 'mid' ? r.score >= 8 && r.score < 9 : r.score < 8))
    && (!q || `${P(r.id).brand} ${P(r.id).name} ${r.txt}`.toLowerCase().includes(q)));
  list = [...list].sort((a, b) => (f.sort === 'highest' ? b.score - a.score : f.sort === 'lowest' ? a.score - b.score : age(a.when) - age(b.when)));
  const products = [...new Set(m.reviews.map((r) => r.id))];
  const sel = (name, opts, cur) => `<select class="rv-select" data-change="cr-filter" data-key="${m.key}" data-f="${name}" aria-label="${name}">${opts.map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  return `
    <section class="card stack">
      <form class="row" data-form="cr-search" data-key="${m.key}" style="gap:8px"><input class="shelf-input grow" name="q" value="${esc(f.q)}" placeholder="Search ${esc(m.first)}’s reviews, e.g. “sunscreen”" style="height:40px"><button class="btn dark">Search</button></form>
      <div class="row wrap" style="gap:8px">
        ${sel('product', [['', `All products (${products.length})`], ...products.map((id) => [id, P(id).name])], f.product)}
        ${sel('rating', [['', 'Any rating'], ['high', '9.0 and up'], ['mid', '8.0 to 8.9'], ['low', 'Under 8.0']], f.rating)}
        ${sel('sort', [['newest', 'Sort: Newest'], ['highest', 'Sort: Highest rated'], ['lowest', 'Sort: Lowest rated']], f.sort)}
      </div>
    </section>
    <div class="row between xs muted"><span>${list.length} review${list.length === 1 ? '' : 's'}</span><span>${list.length ? `Showing 1–${Math.min(f.limit, list.length)}` : ''}</span></div>
    ${list.slice(0, f.limit).map((r) => `
      <article class="card stack" style="gap:10px">
        <div class="row">${thumb(r.id, 32, 36)}<div class="grow"><div class="mono faint">${esc(P(r.id).brand)}</div><div class="small">${esc(P(r.id).name)}</div></div><span class="score-pill ${band(r.score)}">${r.score.toFixed(1)}</span></div>
        <p>“${esc(r.txt)}”</p>
        <div class="row"><span class="src">${esc(r.src)}</span><span class="xs muted">${esc(r.when)}</span></div>
      </article>`).join('') || `<div class="empty">No reviews match. <button class="link" data-act="cr-clear" data-key="${m.key}">Clear filters</button></div>`}
    ${list.length > f.limit ? `<button class="btn" style="align-self:flex-start" data-act="cr-more" data-key="${m.key}">Show more reviews</button>` : ''}`;
}

function pageMain(m, { who, top } = {}) {
  const tab = state.pageTab?.[m.key] ?? 'products';
  const toggle = `<span class="seg">${[['products', 'All products'], ['diary', 'Diary'], ['reviews', 'All reviews']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="page-tab" data-key="${m.key}" data-v="${k}">${l}</button>`).join('')}</span>`;
  const shared = m.ranked.map(([id]) => id).filter((id) => SHELF.some((s) => s.id === id));
  const gaps = m.ranked.map(([id]) => id).filter((id) => !shared.includes(id)).slice(0, 3);
  return `${top ?? ''}${pageBanner(m)}
    <div class="row between"><h1 class="h2">${esc(who)}’s ${tab === 'reviews' ? 'reviews' : tab === 'diary' ? 'diary' : 'products'}</h1>${toggle}</div>
    ${tab === 'diary' ? diaryTimeline(diaryFor(m), m.key === 'me' ? 'public' : state.following[m.key] || m.kind === 'friend' ? 'follower' : 'public') : tab === 'reviews' ? pageReviews(m) : `
      ${holyBanner(m, who)}
      <div><h2 class="h3">Top recommendations</h2><p class="xs muted">${esc(who)}’s five favorites, with notes on each.</p></div>
      ${recList(m)}
      ${pageShelf(m, { who })}
      ${m.footer ? `<section class="card row between"><div><h3 class="h4">You share ${shared.length} of ${esc(m.first)}’s ${m.ranked.length} products</h3><p class="xs muted">${gaps.length} products ${esc(m.first)} rates highly would fill gaps on your shelf: ${gaps.map((p) => P(p).name).join(', ')}.</p></div><button class="btn dark" data-act="add-many" data-ids="${gaps.join(',')}">Add ${esc(m.first)}’s top 3 to my cart</button></section>` : ''}`}`;
}

function pageSide(m, { back, actions, note }) {
  return `
    <section class="card stack">
      ${back}
      <div class="row"><img class="avatar" style="width:72px;height:72px" src="${m.avatar}" alt=""><div><div class="h2" style="font-size:26px">${esc(m.name)}</div><div class="xs muted">${esc(m.handle)}  ${esc(m.followers)} followers</div>${m.kind && m.kind !== 'creator' ? `<div style="margin-top:4px">${kindTag(m.kind)}</div>` : ''}</div></div>
      ${m.match ? `<div class="card" style="background:var(--lime);border-color:var(--lime);padding:14px"><span class="mono" style="color:var(--ink)">${m.match}% like you</span><p class="xs" style="margin-top:6px">${esc(m.matchNote)}</p></div>` : (m.sideNote ?? '')}
      <div class="row wrap" style="gap:6px">${m.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      <div class="row between">${m.stats.map(([n, l]) => `<div><div class="h2">${n}</div><div class="xs muted">${l}</div></div>`).join('')}</div>
      <div class="row wrap" style="gap:8px">${actions}</div>
      <div class="notice xs">${note}</div>
    </section>`;
}

// Your own page: the same layout creators get. Notes and order are yours to edit.
const MY_RECS = [
  ['anua_txa', 'Best for dark spots', 'Six weeks in and my summer dark spots are noticeably lighter. One pad every morning before coffee.'],
  ['biore', 'Best for daily SPF', 'Ten weeks in and zero breakouts. Feels like nothing, even at the beach.'],
  ['boj_glow', 'Best for glow', 'My “I slept 8 hours” serum. Two drops and I look awake.'],
  ['anua_night', 'Best for texture', 'Gentle enough that I can use it 3 nights a week without peeling.'],
  ['torriden_mask', 'Best for hydration', 'Sunday reset, usually with a face mask and a bad reality show.'],
];
const MY_BLURB = 'Hi, I’m Mia! Miami girl, matcha addict and weekend beach person. I fell into skincare during a rough breakout year and now I test everything so you don’t have to. Come say hi.';

function myModel() {
  const pg = state.myPage ?? {};
  const R = state.ratings;
  const shelf = [...baseShelf().map((x) => x.id), ...(state.shelfAdds ?? [])].filter((v, i, a) => a.indexOf(v) === i);
  const ranked = shelf.map((id) => [id, R[id] ?? 8]).sort((a, b) => b[1] - a[1]);
  const score = Object.fromEntries(ranked);
  const notes = pg.notes ?? {};
  const recs = MY_RECS.filter(([id]) => shelf.includes(id)).map(([id, best, note]) => ({ id, best, note: notes[id] ?? note, score: score[id] })).sort((a, b) => b.score - a.score);
  const name = currentUser() ? firstName() || 'You' : 'Mia Tan';
  return {
    key: 'me', first: name.split(' ')[0], name, avatar: 'assets/img/progress/w5.jpg', handle: '@miatan', followers: '38', match: 0,
    tags: profileTags([state.answers.musts?.[0]]).slice(0, 5),
    blurb: pg.blurb ?? MY_BLURB, theme: pg.theme ?? 'sky',
    announcement: pg.announcement === '' ? null : [pg.announcement ?? 'Week 6 check-in: redness is down and my chin finally cleared. The retinol night cream is staying.', 'Posted today', 'Shelf updated today'],
    stats: [[shelf.length, 'products'], [4, 'reviews'], [6, 'weeks tracked']],
    holy: { id: recs[0]?.id ?? ranked[0]?.[0], score: recs[0]?.score ?? 9, note: recs[0]?.note ?? '' },
    recs, ranked, score,
    reviews: recs.map((r, i) => ({ id: r.id, src: 'Dew', when: AGO[i % AGO.length], txt: r.note, score: r.score })),
    using: (id) => { const w = shelfItem(id)?.weeks; return w ? `${w} weeks` : 'Just added'; },
    bestFor: (id) => recs.find((r) => r.id === id)?.best ?? bestForStep(id),
    noteFor: (id) => notes[id] ?? recs.find((r) => r.id === id)?.note ?? 'No note yet.',
    footer: false,
  };
}

function myPageEditor() {
  const m = myModel();
  const pg = state.myPage ?? {};
  return `
    <section class="page-banner edit stack" style="background:${PAGE_THEMES[m.theme]}">
      <div class="row between wrap" style="gap:8px"><div class="row"><span class="announce-tag lime">Editing your public page</span><span class="xs muted">Changes save as you go</span></div>
        <div class="row theme-pick"><span class="mono faint">Background</span>${Object.keys(PAGE_THEMES).map((k) => `<button class="swatch ${m.theme === k ? 'on' : ''}" style="background:${PAGE_THEMES[k]}" data-act="page-theme" data-v="${k}" aria-label="${k} background"></button>`).join('')}<button class="link xs" data-act="toast" data-msg="Photo backgrounds come with the Dew app">+ Photo</button></div></div>
      <label class="blurb-edit stack"><span class="row between"><span class="mono faint">Blurb</span><span class="mono faint">${m.blurb.length} / 200</span></span>
        <textarea data-input="page-blurb" maxlength="200" rows="3">${esc(m.blurb)}</textarea></label>
      <form class="announce row" data-form="page-announce"><span class="announce-tag">Announcement</span><input class="grow" name="text" value="${esc(pg.announcement ?? m.announcement?.[0] ?? '')}" placeholder="Share an update with your followers"><button class="btn sm dark">Post</button></form>
    </section>
    <div><h2 class="h3">My top recommendations</h2><p class="xs muted">Your five favorites, with a note on each. Ranked by your scores.</p></div>
    ${recList(m, { edit: true })}
    <a class="dashed-btn" href="#/search">+ Add a recommendation</a>
    ${pageShelf(m, { edit: true })}
    <p class="xs muted">Your scores update every time you rate a product in your check-in. Only your blurb, recommendations, shelf and public reviews are shown to others.</p>`;
}

function myPublicPage() {
  const m = myModel();
  m.sideNote = '<div class="card soft stack" style="padding:12px;gap:6px"><span class="mono" style="color:var(--ink)">Public preview</span><p class="xs">This is what other Dew members see. They also see how closely their skin matches yours.</p></div>';
  const left = pageSide(m, {
    back: '<a class="mono" href="#/profile" style="text-decoration:none">← Back to editing</a>',
    actions: '<a class="btn dark" href="#/profile">Back to editing</a>',
    note: 'Only your blurb, shelves, ratings and public reviews are shown. Your photos and check-ins stay private.',
  });
  const top = '<div class="viewing-bar row between"><span class="small">You’re viewing your page the way the public sees it.</span><a class="mono" href="#/profile">Back to editing →</a></div>';
  return { layout: 'layout-wide', left, main: pageMain(m, { who: m.first, top }) };
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

// "Box reveal (animated)" from Figma Hi-fi v7 (186:9796): the box sits closed, shakes three times,
// the lid flaps swing open and your four routine products pop out with the characters.
// playBoxReveal() steps data-s from 1 to 6 with the prototype's timings.
function boxReveal() {
  const ids = routineIds();
  return `
    <div class="picked-box" role="img" aria-label="Your Dew 4-step box opening">
      <div class="rbox" data-s="1"><div class="rbox-in">
        <i class="rb-flap l"></i><i class="rb-flap r"></i><i class="rb-band"></i>
        ${ids.map((id, i) => `<img class="rb-p p${i}" src="${P(id).img}" alt="">`).join('')}
        <img class="rb-front" src="assets/svg/box-front.svg?v=${SVG_V}" alt="">
        <img class="rb-c treat" src="assets/svg/treat.svg?v=${SVG_V}" alt="">
        <img class="rb-c star" src="assets/svg/star.svg?v=${SVG_V}" alt="">
        <img class="rb-c hydrate" src="assets/svg/hydrate.svg?v=${SVG_V}" alt="">
      </div></div>
    </div>`;
}

let boxTimers = [];
function playBoxReveal(fresh) {
  boxTimers.forEach(clearTimeout); boxTimers = [];
  const box = document.querySelector('.rbox');
  if (!box) return;
  const still = !fresh || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still) { box.classList.add('no-anim'); box.dataset.s = '6'; return; }
  // [step, wait before it starts (ms)]: 0.8s hold, three 0.12s shakes, lid 0.25s, pop 0.45s
  let t = 0;
  [[2, 800], [3, 130], [4, 130], [5, 130], [6, 300]].forEach(([n, wait]) => {
    t += wait;
    boxTimers.push(setTimeout(() => { box.dataset.s = String(n); }, t));
  });
}

function pickedPage() {
  if ((state.pickedSource ?? 'dew') === 'people') return peerRoutinesPage();
  const sample = state.pickedMode === 'sample';
  const hero = `
    <section class="hero picked-hero">
      <div class="stack" style="gap:10px;flex:1;min-width:0">
        <h1 class="picked-title">${sample ? 'Your routine, sampled for you.' : 'Your routine, picked just for you.'}</h1>
        <p class="picked-sub">${sample ? 'Not ready to commit? Get your top 3 picks in travel sizes first. Enough for about 2 weeks, free with your points.' : 'One product per step. You already have a great sunscreen, so we kept it and only filled the gaps.'}</p>
        <div class="row wrap" style="gap:6px;margin-top:6px">${profileTags().map((t) => `<span class="tag">${t}</span>`).join('')}</div>
      </div>
      ${boxReveal()}
    </section>`;
  if (sample) return { layout: 'layout-wide', left: leftCol(), main: sourceToggle() + hero + modeToggle() + sampleBuilder() };
  const f = state.pickFilters ?? { budget: '$30–$60', keep: true, fragrance: false, vegan: false };
  const fchip = (on, label, k, v) => `<button class="chip ${on ? 'on' : ''}" data-act="pick-filter" data-k="${k}"${v ? ` data-v="${v}"` : ''}>${label}</button>`;
  const filters = `
    <div class="row wrap" style="gap:6px"><span class="mono faint">Budget</span>${['Under $30', '$30–$60', 'Any'].map((b) => fchip(f.budget === b, b, 'budget', b)).join('')}<span style="width:6px"></span>${fchip(f.keep, `${f.keep ? '✓ ' : ''}Keep what’s on my shelf`, 'keep')}${fchip(f.fragrance, 'Fragrance-free only', 'fragrance')}${fchip(f.vegan, 'Vegan', 'vegan')}</div>`;
  const cards = ROUTINE.map((r, i) => {
    const id = r.options[state.routinePick[r.step]];
    const owned = r.owned === id;
    return `
      <div class="card stack step-card">
        <div class="row" style="gap:8px">${svg(r.icon, 24)}<span class="mono">${i + 1}: ${r.step}</span></div>
        <div class="thumb step-img"><img src="${P(id).img}" alt=""></div>
        <div class="row" style="align-items:flex-start;gap:8px"><div class="grow" style="min-width:0"><div class="mono faint">${esc(P(id).brand)}</div><div class="small" style="font-weight:500">${esc(P(id).name)}</div></div>${ring(9.4 - i * 0.3 - state.routinePick[r.step] * 0.3)}</div>
        <div class="stack" style="gap:3px"><div class="buy-pct">${r.buy}% of people like you say BUY</div><div class="xs muted">Results in ${r.results}</div></div>
        <p class="xs muted grow">${r.why}</p>
        <div class="row between">${owned ? '<span class="mono forest" style="font-size:12px">On your shelf</span>' : `<span class="mono" style="font-size:12px;color:var(--ink)">Est. ${money(P(id).price)}</span>`}${owned ? '<button class="btn" data-act="toast" data-msg="Kept on your shelf">Keep ✓</button>' : `<button class="btn" data-act="routine-swap" data-step="${r.step}">↻ Swap</button>`}</div>
      </div>`;
  }).join('');
  const stat = (k, v) => `<div class="stack" style="gap:2px"><span class="mono faint">${k}</span><span class="h4">${v}</span></div>`;
  const main = `${sourceToggle()}${hero}${modeToggle()}${filters}
    <div class="grid-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">${cards}</div>
    <section class="card row wrap box-summary">
      ${stat('New products', ROUTINE.filter((r) => r.owned !== routineIds()[ROUTINE.indexOf(r)]).length)}${stat('Est. total', money(routineTotal()))}${stat('Expected results', '3–4 weeks')}${stat('Backed by', '1,486 people  212 tracked routines')}
      <span class="grow"></span>
      <button class="btn dark" data-act="add-routine">Add box to cart</button>
    </section>
    <div class="notice why-four"><span class="mono forest">Why only 4?</span><span class="grow">We hid 44 other products that scored lower for your profile, so you can decide in a minute instead of a week.</span><button class="edit-link" style="border:0;background:none;cursor:pointer" data-act="toast" data-msg="All 48 scored products are coming soon">Show them →</button></div>`;
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
    <p class="muted">One checkout for every brand. Dew orders from the brand or an authorized retailer at the same price, and adds each product to your shelf when it arrives.</p>
    ${state.cart.length ? `<section class="card" style="padding:0">${items}</section>` : `<section class="card empty"><p class="h3">Your cart is empty</p><p class="small" style="margin:8px 0 16px">Add picks from Explore, refills from your shelf, or a whole routine.</p><a class="btn dark" href="#/picked">See my routine →</a></section>`}
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
      <span class="mono forest">Order #${o.no.replace(/^Dew/i, '<span class="nc">Dew</span>')} placed</span>
      <h1 class="h1">Your routine is on its way.</h1>
      <p class="muted">${o.items.length} products, arriving Thu, Nov 12. We added them to your shelf as “arriving” and will start tracking on day 1.</p>
      <div class="row wrap">${o.items.map((i) => thumb(i.id, 52, 62)).join('')}</div>
      <div class="card soft row" style="padding:12px">${svg('flame', 20)}<span class="small">+${o.earned} pts earned on this order. You have ${state.points.toLocaleString()} pts.</span></div>
      <div class="row"><a class="btn dark" href="#/for-you">Back to Explore</a><button class="btn" data-act="toast" data-msg="Tracking: label created, ships tomorrow">Track order</button></div>
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
    <p class="xs muted">Minis come in a recyclable Dew sample box. One free box per 1,500 pts.</p>
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
        <span class="mono forest">Sample box #<span class="nc">Dew</span>-S0193 placed</span>
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
      <span class="mono forest">Day 14 of 14  Sample box #<span class="nc">Dew</span>-S0193</span>
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
          <button class="btn lime" data-act="verdict-cart" ${loved.length ? '' : 'disabled'}>Add ${loved.length} full size${loved.length === 1 ? '' : 's'} to cart →</button>
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
    <span class="mono faint">Week 6 check-in: Nov 3  ~2 min</span>
    <h1 class="h1">How’s your skin this week?</h1>
    <p class="small muted">Two parts: how your skin is doing overall, then how each product is working. Both sharpen your picks.</p>
    <section class="card stack" style="gap:16px">
      <div class="row between"><div><h2 class="h4" style="font-size:16px">Overall skin health</h2><p class="xs muted">Your whole routine, not one product</p></div><span class="pill" style="background:var(--lime)">Part 1: you</span></div>
      <div class="row" style="align-items:stretch">
        <div class="card soft grow stack"><span class="mono">Skin health score</span><div class="row" style="align-items:baseline"><span style="font-size:52px;line-height:1">8.4</span><span class="xs" style="color:var(--forest)">▲ 0.6 vs last week</span></div>
          <div class="bars" style="height:90px">${[38, 50, 58, 66, 74, 92].map((h, i) => `<div><i style="height:${h}%;${i < 5 ? 'background:var(--fill-muted)' : ''}"></i><span class="mono">W${i + 1}</span></div>`).join('')}</div></div>
        <div class="stack" style="width:200px"><div class="photo"><img src="assets/img/progress/w5.jpg" alt="This week’s progress photo"><span class="private" style="position:absolute;top:8px;left:8px">🔒 Private</span></div><span class="xs muted">Only you can see this. <button class="link" data-act="toast" data-msg="Open the Dew app to retake">Retake ↺</button></span></div>
      </div>
      <span class="field-label">How does your skin feel vs last week?</span>
      ${Object.keys(c.feel).map((k) => `<div class="row"><span class="small" style="width:90px">${k}</span><div class="grid-3 grow" style="grid-template-columns:repeat(5,1fr);gap:6px">${scale.map((s, i) => `<button class="scale-seg ${c.feel[k] === s ? 'on' : i < 3 ? 'low' : ''}" data-act="ci-feel" data-k="${k}" data-v="${s}">${s}</button>`).join('')}</div></div>`).join('')}
      <span class="field-label">Anything different this week?</span>
      <div class="row wrap" style="gap:6px">${['Poor sleep', 'Stressed', 'Traveled', 'Period week', 'Lots of sun', 'Tried something new'].map((x) => `<button class="chip ${c.extra.includes(x) ? 'on' : ''}" data-act="ci-extra" data-v="${x}">${x}</button>`).join('')}</div>
    </section>
    <section class="card stack">
      <div class="row between"><div><h2 class="h4" style="font-size:16px">Rate your products</h2><p class="xs muted">Quick taps. Each rating updates your shelf ranking.</p></div><span class="pill" style="background:var(--lime)">Part 2: products</span></div>
      ${rate.map(([id, when]) => { const st = Math.round(state.ratings[id] / 2); return `
        <div class="row card soft" style="padding:12px">${thumb(id, 30, 38)}<div class="grow"><div class="small" style="font-weight:500">${esc(P(id).brand)} ${esc(P(id).name)}</div><div class="xs muted">${when}</div></div>
          <span class="stars">${[1, 2, 3, 4, 5].map((i) => `<button class="${i <= st ? 'on' : ''}" data-act="rate-shelf" data-id="${id}" data-v="${i}" aria-label="${i} stars">★</button>`).join('')}</span>
          ${['Working', 'Not sure', 'Not working'].map((s) => `<button class="chip sm ${status(id) === s ? 'on' : ''}" data-act="ci-status" data-id="${id}" data-v="${s}">${s}</button>`).join('')}
        </div>`; }).join('')}
    </section>
    <section class="card stack">
      <h2 class="small" style="font-size:13px;font-weight:500">Part 3  Your Anua TXA Brightening Pad hit week 6. Buy or don’t buy?</h2>
      <p class="xs muted">Only asked when a product reaches its typical results week. This is the first thing people like you see on your review.</p>
      <div class="grid-2">${[['buy', '✓ BUY', 'It worked for me and I’d repurchase'], ['skip', '✕ DON’T BUY', 'Didn’t work, or not worth it']].map(([k, a, b]) => `<button class="card stack" data-act="ci-verdict" data-v="${k}" style="text-align:left;${c.verdict === k ? 'background:var(--forest);color:#fff;border-color:var(--forest)' : ''}"><span style="font-size:28px">${a}</span><span class="xs" style="opacity:.8">${b}</span></button>`).join('')}</div>
      <div class="row"><span class="mono">Your score</span><span class="buybar grow" style="height:6px"><span style="width:91%"></span></span><span style="font-size:22px">9.1</span><span class="tag">Re-ranks to #2 of 11</span></div>
      <textarea data-input="ci-note" placeholder="Add a note for people like you (optional)…" style="min-height:70px;border:1px solid var(--line);border-radius:var(--radius-sm);padding:12px;font:inherit;resize:vertical">${esc(c.note)}</textarea>
    </section>
    <div class="row between"><button class="btn" data-act="toast" data-msg="Draft saved">Save draft</button><button class="btn dark" data-act="ci-submit" ${c.submitted ? 'disabled' : ''}>${c.submitted ? 'Submitted ✓' : 'Submit check-in  +60 pts'}</button></div>`;
  const right = `
    <section class="card dark stack"><span class="mono lime">Preview: how others see it</span><span class="btn sm lime" style="align-self:flex-start;cursor:default">${c.verdict === 'buy' ? '✓ Buy' : '✕ Don’t buy'}</span><p class="small">Results by week 6  Lighter dark spots, more even tone</p><p class="xs" style="color:#c8dcc9">Mia  Combination  Humid  25–29  6 weeks tracked</p></section>
    <section class="card stack"><div class="row">${svg('flame', 22)}<span class="h4">+60 points</span></div><p class="xs muted">Your review helps 1,486 people like you skip the guesswork. ${Math.max(0, REWARD_PTS - state.points)} pts to your free sample box.</p></section>`;
  return { layout: '', left: leftCol(), main, right };
}

/* ================= profile ================= */

function trackerRail() {
  const toGo = Math.max(0, REWARD_PTS - state.points);
  return `
    <h2 class="h3">Your tracker</h2>
    <section class="card stack"><div class="row">${svg('flame', 44)}<span style="font-size:48px;line-height:1">${state.streak}</span></div><span class="mono">Day streak</span>
      <div class="row" style="gap:6px">${'MTWTFSS'.split('').map((d, i) => `<span class="stack" style="align-items:center;gap:3px"><i style="width:14px;height:14px;border-radius:var(--radius-full);display:block;background:${i < 6 ? 'var(--olive)' : 'var(--fill-muted)'}"></i><span class="mono">${d}</span></span>`).join('')}</div></section>
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
        <div class="row"><h1 class="h2">${esc(currentUser() ? firstName() || 'You' : 'Mia Tan')}</h1><span class="pill" style="background:var(--lime)">Skin profile ${strength()}%</span></div>
        <div class="row wrap" style="gap:6px">${profileTags([state.answers.musts?.[0], state.answers.budget?.[0]]).map((t) => `<span class="tag">${t}</span>`).join('')}</div>
        <div class="row small" style="gap:24px"><span><b style="font-weight:500">${state.streak}</b> <span class="muted">day streak</span></span><span><b style="font-weight:500">${state.points.toLocaleString()}</b> <span class="muted">points</span></span><span><b style="font-weight:500">6</b> <span class="muted">weeks tracked</span></span><span><b style="font-weight:500">4</b> <span class="muted">reviews</span></span></div>
      </div>
      <div class="stack"><a class="btn dark" href="#/setup/1">Update skin profile</a><button class="btn" data-act="toast" data-msg="Profile link copied">Share profile</button><a class="btn view-public" href="#/profile/public">View as public →</a>${currentUser() ? '<button class="btn" data-act="log-out">Log out</button>' : ''}</div>
    </section>
    <div class="notice">Moved, changed your diet or started a new medication? Update your skin profile and we’ll re-rank your picks.</div>
    <span class="seg" style="align-self:flex-start">${[['rankings', 'My rankings'], ['progress', 'My progress']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="profile-tab" data-v="${k}">${l}</button>`).join('')}</span>`;
  let body;
  if (tab === 'rankings') {
    return { layout: 'layout-wide', left: leftCol('', downloadApp()), main: header + myPageSplit() };
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
          <div class="card stack"><div class="row between"><h3 class="h4">Challenges</h3><span class="mono forest">Earn points</span></div>${CHALLENGES.map(([t, d, n0, of, pts], i) => { const n = Math.min(of, state.chal?.[t] ?? n0); return `<div class="row" style="gap:12px;align-items:flex-start"><span class="challenge-icon">${svg(['hydrate', 'protect', 'cleanse', 'treat'][i % 4], 26)}</span><div class="stack grow" style="gap:4px"><div class="row between"><span class="small" style="font-weight:500">${t}</span><span class="mono forest">${n >= of ? 'Done ✓' : `+${pts} pts`}</span></div><span class="xs muted">${d}</span><div class="buybar" style="width:100%"><span style="width:${(n / of) * 100}%;background:var(--lime)"></span></div><div class="row between"><span class="mono">${n} / ${of}</span>${n < of ? `<button class="link mono forest" data-act="chal-log" data-t="${t}">Log today +</button>` : ''}</div></div></div>`; }).join('')}</div>
          <div class="card stack"><h3 class="h4">Milestones</h3>${MILESTONES.map(([t, d, ok]) => `<div class="row card ${ok ? '' : 'soft'}" style="padding:10px;${ok ? 'background:var(--fill-muted);border-color:transparent' : ''}">${ok ? '<span class="ring sm" style="background:var(--forest);border-color:var(--forest);color:#fff">✓</span>' : `<span class="ring sm" style="border-color:transparent;background:#fff">${svg(t.includes('Shelf') ? 'star' : 'flame', 16)}</span>`}<div><div class="small" style="font-weight:500">${ok ? '' : 'NEW: '}${t}</div><div class="xs muted">${d}</div></div></div>`).join('')}</div>
        </div>
      </section>
      <section class="card stack">
        <div class="row between"><div class="row"><h3 class="h4">Progress photos</h3><span class="private">🔒 Private</span></div><button class="link mono" data-act="toast" data-msg="Add this week’s photo in the Dew app">Add this week +</button></div>
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
      <div class="grid-2">${[['anua_txa', 'buy', 'Week 6', 'My dark spots from summer are noticeably lighter.'], ['boj_glow', 'buy', 'Week 3', 'Glass-skin glow by week 3, and it sits fine under my Bioré.'], ['anua_guasha', 'skip', 'None by week 4', 'Stung on retinol nights and pilled under my lotion.']].map(([id, v, w, t]) => `
        <div class="card stack" style="padding:16px"><div class="row between"><span class="btn sm ${v === 'buy' ? 'dark' : ''}" style="cursor:default;${v === 'buy' ? '' : 'background:var(--olive);border-color:var(--olive);color:#fff'}">${v === 'buy' ? '✓ Buy' : '✕ Don’t buy'}</span>${ring(state.ratings[id], true)}</div>
          <div class="row">${thumb(id, 28, 36)}<div><div class="mono">${esc(P(id).brand)}</div><div class="small">${esc(P(id).name)}</div></div></div>
          <span class="mono">Results seen: ${w}</span><p class="small">“${t}”</p><span class="xs muted">Public: helped 48 people like you</span></div>`).join('')}</div>`;
  }
  return { layout: '', left: leftCol('', downloadApp()), main: header + body, right: trackerRail() };
}

/* ================= public reviews ================= */

const RV_SORTS = [['newest', 'Newest'], ['helpful', 'Most helpful'], ['highest', 'Highest rated'], ['lowest', 'Lowest rated']];
const RV_RATINGS = [['', 'Any rating'], ['5', '5 stars'], ['4', '4 stars'], ['low', '3 stars or less']];

// Every review Dew has collected, newest first, searchable and filterable by product.
function reviewsPage() {
  const f = { q: '', product: '', skin: '', rating: '', sort: 'newest', limit: 20, ...state.rv };
  const p = new URLSearchParams({ limit: String(f.limit), sort: f.sort });
  if (f.q) p.set('q', f.q);
  if (f.product) p.set('product', f.product);
  if (f.skin) p.set('skin_type', f.skin);
  if (f.rating) p.set('rating', f.rating);
  const feed = useJson(`/api/reviews?${p}`);
  const reviews = feed.data?.reviews ?? [];
  const total = feed.data?.total ?? 0;
  const products = Object.values(liveProducts()).filter((x) => x.review_count > 0).sort((a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`));
  const filtered = f.q || f.product || f.skin || f.rating;
  const main = `
    <div class="row between" style="align-items:flex-end">
      <div class="stack" style="gap:4px"><h1 class="h2">Public reviews</h1><p class="xs muted">A live feed of reviews collected from brand websites. Updated every day; each one links to where it was posted.</p></div>
      ${statsLine() ? `<span class="xs faint live-count">${statsLine()}</span>` : ''}
    </div>
    <section class="card stack" style="gap:12px">
      <form class="rv-search" data-form="reviews-search" role="search">
        <input name="q" value="${esc(f.q)}" placeholder="Search reviews, e.g. “sunscreen white cast”" autocomplete="off">
        <button class="btn dark">Search</button>
      </form>
      <div class="row wrap" style="gap:8px">
        <select class="rv-select" data-change="rv-product" aria-label="Product">
          <option value="">All products (${products.length})</option>
          ${products.map((x) => `<option value="${x.id}" ${x.id === f.product ? 'selected' : ''}>${esc(x.brand)} · ${esc(x.name)} (${x.review_count.toLocaleString()})</option>`).join('')}
        </select>
        <select class="rv-select" data-change="rv-rating" aria-label="Rating">${RV_RATINGS.map(([v, l]) => `<option value="${v}" ${v === f.rating ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select class="rv-select" data-change="rv-sort" aria-label="Sort">${RV_SORTS.map(([v, l]) => `<option value="${v}" ${v === f.sort ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div class="row wrap" style="gap:6px"><span class="mono">Skin type</span>
        <button class="chip ${!f.skin ? 'on' : ''}" data-act="rv-skin" data-v="">All</button>
        ${SKIN_TYPES.map((t) => `<button class="chip ${f.skin === t ? 'on' : ''}" data-act="rv-skin" data-v="${t}">${t}</button>`).join('')}
      </div>
    </section>
    <div class="row between"><span class="small muted">${feed.status === 'ok' ? `${total.toLocaleString()} ${filtered ? 'matching ' : ''}reviews` : ''}</span>${filtered ? '<button class="link clear-link" data-act="rv-clear">Clear filters</button>' : ''}</div>
    ${feed.status === 'loading' ? '<div class="empty">Loading reviews…</div>'
      : feed.status === 'error' ? '<div class="empty">Reviews are unavailable right now.</div>'
      : reviews.length ? `<div class="stack" style="gap:12px">${reviews.map((r) => liveReview(r, true)).join('')}</div>`
      : '<div class="empty">No reviews match. Try fewer words or another product.</div>'}
    ${reviews.length < total ? '<button class="btn" data-act="rv-more" style="align-self:center">Show more reviews</button>' : ''}`;
  return signedOut() ? { layout: 'layout-solo', main: `<div class="public-page stack">${main}</div>` } : { layout: '', left: leftCol(), main, right: rightRail() };
}

/* ================= welcome + accounts ================= */

// Live totals from /api/stats, e.g. "56,446 reviews across 152 products".
function statsLine() {
  const s = useJson('/api/stats').data;
  return s ? `${s.label.reviews} reviews across ${s.label.products_with_reviews} products` : '';
}

function welcomePage() {
  const s = useJson('/api/stats').data;
  const feed = useJson(reviewsUrl({ limit: 3 })).data?.reviews ?? [];
  const steps = [
    ['1', 'Build your skin profile', 'Skin type, concerns, climate and goals. About three minutes.'],
    ['2', 'Get matched with people like you', 'We find reviewers whose skin, climate and age match yours, and rank products by what worked for them.'],
    ['3', 'Sample, track, repeat', 'Try minis with points before buying full size, then check in weekly to see what’s actually working.'],
  ];
  const features = [
    ['Picked for you', 'One product per routine step, chosen from thousands of people who match you.', 'treat'],
    ['Reviews from your skin type', 'Real reviews from brand sites, filtered to people with skin like yours.', 'hydrate'],
    ['Sample before you buy', 'Earn points for check-ins and trade them for a free sample box.', 'flame'],
    ['Track what works', 'Weekly check-ins and progress photos rank your shelf by results.', 'protect'],
  ];
  const main = `
    <div class="welcome stack">
      <section class="welcome-hero">
        <div class="stack" style="gap:18px;max-width:560px">
          <span class="mono forest">Your personal skincare companion</span>
          <h1 class="display">Skincare picked by people like you.</h1>
          <p class="lead">Dew matches you with people who share your skin, climate and goals, then picks, samples and tracks a routine that works for you.</p>
          <div class="row wrap" style="gap:10px"><a class="btn dark" href="#/signup">Create free account</a><a class="btn" href="#/login">Log in</a></div>
          <a class="xs" href="#/search" data-act="search" data-q="">Or browse products and reviews without an account →</a>
        </div>
        <div class="welcome-art" aria-hidden="true"><img src="assets/img/hero.jpg" alt=""></div>
      </section>
      ${s ? `<section class="welcome-stats">
        <div><span class="stat">${s.label.reviews}</span><span class="xs muted">reviews collected</span></div>
        <div><span class="stat">${s.label.products_with_reviews}</span><span class="xs muted">products with reviews</span></div>
        <div><span class="stat">${s.label.brands}</span><span class="xs muted">brands</span></div>
        <div><span class="stat">5</span><span class="xs muted">skin types to filter by</span></div>
      </section>` : ''}
      <section class="stack" style="gap:14px">
        <h2 class="h2">How Dew works</h2>
        <div class="grid-3">${steps.map(([n, t, d]) => `<div class="card stack"><span class="step-n">${n}</span><h3 class="h4">${t}</h3><p class="small muted">${d}</p></div>`).join('')}</div>
      </section>
      <section class="stack" style="gap:14px">
        <h2 class="h2">What you get</h2>
        <div class="grid-2">${features.map(([t, d, icon]) => `<div class="card row" style="gap:16px;align-items:flex-start">${svg(icon, 32)}<div class="stack" style="gap:4px"><h3 class="h4">${t}</h3><p class="small muted">${d}</p></div></div>`).join('')}</div>
      </section>
      ${feed.length ? `<section class="stack" style="gap:14px">
        <div class="row between"><h2 class="h2">Fresh from reviewers</h2><a class="xs" href="#/search" data-act="search" data-q="">Browse all products →</a></div>
        <div class="grid-3">${feed.map((r) => liveReview(r, true)).join('')}</div>
      </section>` : ''}
      <section class="welcome-cta">
        <h2 class="h2" style="color:#fff">Ready to find what works for your skin?</h2>
        <p style="color:#cbdbea">Free to join. Your profile takes about three minutes.</p>
        <a class="btn lime" href="#/signup">Create free account</a>
      </section>
      <footer class="xs muted row between wrap" style="padding:8px 0 24px"><span>© 2026 Dew</span><span>Reviews are collected from brand websites and belong to their authors.</span></footer>
    </div>`;
  return { layout: 'layout-solo', main };
}

function authCard({ title, sub, form, foot }) {
  return {
    layout: 'layout-solo',
    main: `
      <div class="auth-wrap">
        <section class="auth-card stack">
          <img src="assets/svg/logo.svg" alt="Dew" style="width:84px">
          <div class="stack" style="gap:6px"><h1 class="h2">${title}</h1><p class="small muted">${sub}</p></div>
          ${state.authError ? `<div class="auth-error" role="alert">${esc(state.authError)}</div>` : ''}
          ${state.authNotice ? `<div class="auth-notice" role="status">${esc(state.authNotice)}</div>` : ''}
          ${form}
          <p class="small muted" style="text-align:center">${foot}</p>
        </section>
        <aside class="auth-side stack">
          <span class="mono lime">Why <span class="nc">Dew</span></span>
          <p class="h3" style="color:#fff;font-weight:400">“Redness around my nose was gone by week 2.”</p>
          <p class="xs" style="color:#cbdbea">Find the products that worked for people with your skin type, climate and goals.</p>
          ${statsLine() ? `<span class="xs" style="color:#cbdbea">${statsLine()}</span>` : ''}
        </aside>
      </div>`,
  };
}

const field = (name, label, type, extra = '') => `<label class="field"><span>${label}</span><input name="${name}" type="${type}" ${extra} required></label>`;

function signupPage() {
  return authCard({
    title: 'Create your account',
    sub: 'Free forever. Next you’ll build your skin profile so we can match you with people like you.',
    form: `<form class="stack" data-form="signup" style="gap:12px">
      ${field('first_name', 'First name', 'text', 'autocomplete="given-name"')}
      ${field('email', 'Email', 'email', 'autocomplete="email"')}
      ${field('password', 'Password', 'password', 'autocomplete="new-password" minlength="8"')}
      <span class="xs muted">At least 8 characters.</span>
      <button class="btn dark block" ${state.authBusy ? 'disabled' : ''}>${state.authBusy ? 'Creating account…' : 'Create account'}</button>
    </form>`,
    foot: 'Already have an account? <a href="#/login">Log in</a>',
  });
}

function loginPage() {
  return authCard({
    title: 'Welcome back',
    sub: 'Log in to see your picks, shelf and progress.',
    form: `<form class="stack" data-form="login" style="gap:12px">
      ${field('email', 'Email', 'email', 'autocomplete="email"')}
      ${field('password', 'Password', 'password', 'autocomplete="current-password"')}
      <button class="btn dark block" ${state.authBusy ? 'disabled' : ''}>${state.authBusy ? 'Logging in…' : 'Log in'}</button>
      <button type="button" class="link" data-act="reset-password" style="align-self:center">Forgot your password?</button>
    </form>`,
    foot: 'New to Dew? <a href="#/signup">Create an account</a>',
  });
}

/* ================= product ================= */

const SKIN_TYPES = ['Combination', 'Oily', 'Dry', 'Normal', 'Sensitive'];
const SOURCE_NOTE = {
  blocked: 'This site doesn’t allow automated access, so we can’t show its reviews yet.',
  needs_partnership: 'Star rating only. Full reviews need a data partnership with this site’s review provider.',
  paused: 'Paused.',
};

// AI summary of what reviewers liked and didn't (from /api/summary).
function summaryCard(id) {
  const s = useJson(`/api/summary?product=${encodeURIComponent(id)}`).data;
  if (!s) return '';
  const list = (items, kind) => items.length
    ? `<ul class="pc-list ${kind}">${items.map((p) => `<li><span>${esc(p.point)}</span><span class="pc-mentions">${esc(p.mentions)}</span></li>`).join('')}</ul>`
    : '<p class="xs muted">No common complaints.</p>';
  return `
    <section class="card stack ai-summary">
      <div class="row between"><h3 class="h4">What reviewers say</h3><span class="mono">AI summary</span></div>
      <p style="font-size:13px">${esc(s.summary)}</p>
      <div class="grid-2">
        <div class="stack" style="gap:8px"><span class="mono forest">Pros</span>${list(s.pros, 'pros')}</div>
        <div class="stack" style="gap:8px"><span class="mono" style="color:#b23a24">Cons</span>${list(s.cons, 'cons')}</div>
      </div>
      <p class="xs faint">Summarized by Claude from ${s.review_count.toLocaleString()} reviews on ${fmtDate(s.generated_at)}. It can miss nuance, so read the reviews below too.</p>
    </section>`;
}

function productPage(id) {
  const p = P(id);
  const products = useJson(productsUrl);
  const live = liveProduct(id);
  const mine = state.answers.skinType?.[0];
  let skin = state.reviewSkin === undefined ? mine : state.reviewSkin; // null = all skin types
  const limit = state.reviewLimit ?? 10;
  let revs = useJson(reviewsUrl({ product: id, skinType: skin, limit }));
  // Some sites don't ask reviewers for skin type. If the default filter finds nothing, show everything.
  let noSkinData = false;
  if (state.reviewSkin === undefined && skin && revs.status === 'ok' && !revs.data.total) {
    const all = useJson(reviewsUrl({ product: id, limit }));
    if (all.status !== 'ok' || all.data.total) { revs = all; skin = null; noSkinData = true; }
  }
  const reviews = revs.data?.reviews ?? [];
  const total = revs.data?.total ?? 0;
  const ratingsByRetailer = Object.fromEntries((live?.ratings ?? []).map((r) => [r.retailer, r]));

  const sourcesCard = products.status === 'error'
    ? '<p class="xs muted">Live ratings are unavailable right now.</p>'
    : (live?.sources ?? []).map((s) => {
      const r = ratingsByRetailer[s.retailer];
      return `
        <div class="pick">
          <div class="grow"><div style="font-size:13px">${esc(retailerName(s.retailer))}</div>${SOURCE_NOTE[s.status] ? `<div class="xs muted">${SOURCE_NOTE[s.status]}</div>` : ''}</div>
          ${r?.rating_avg != null ? `<span class="live-rating">★ ${(+r.rating_avg).toFixed(1)}${r.review_count ? `  ${r.review_count.toLocaleString()} reviews` : ''}</span>` : '<span class="xs faint">No rating</span>'}
          <a class="btn sm" href="${esc(s.url)}" target="_blank" rel="noopener">View ↗</a>
        </div>`;
    }).join('') || (live?.catalog_only
      ? `<div class="pick"><div class="grow"><div style="font-size:15px">Sold at ${esc(live.sold_at)}</div><div class="xs muted">From Dew’s product catalog. We don’t collect reviews for this product yet.</div></div>${live.product_url ? `<a class="btn sm" href="${esc(live.product_url)}" target="_blank" rel="noopener">View ↗</a>` : ''}</div>`
      : `<p class="xs muted">${products.status === 'loading' ? 'Loading…' : 'We don’t track any review pages for this product yet.'}</p>`);

  const reviewList = revs.status === 'loading'
    ? '<div class="empty">Loading reviews…</div>'
    : revs.status === 'error'
      ? '<div class="empty">Reviews are unavailable right now.</div>'
      : reviews.length
        ? reviews.map((r) => liveReview(r)).join('')
        : `<div class="empty">No reviews${skin ? ` from people with ${esc(skin.toLowerCase())} skin` : ''} yet.${skin ? ' <button class="link" data-act="review-skin" data-v="">See all reviews</button>' : ''}</div>`;

  const main = `
    <a class="xs" href="javascript:history.back()">← Back</a>
    <section class="card row" style="gap:20px;align-items:center">
      ${thumb(id, 96, 112)}
      <div class="grow stack" style="gap:6px">
        <span class="mono faint">${esc(p.brand)}</span>
        <h1 class="h2" style="font-size:28px">${esc(p.name)}</h1>
        <span class="xs muted">${[p.step && `${p.step} step`, p.size, p.price ? money(p.price) : ''].filter(Boolean).join(' · ')}</span>
        ${liveRating(id)}
      </div>
      <div class="stack" style="gap:8px;align-self:flex-start">
        ${p.price ? `<button class="btn dark" data-act="add" data-id="${id}">${state.added[id] ? '✓ In your cart' : 'Add to cart'}</button>` : ''}
        <button class="btn" data-act="save" data-id="${id}">${(state.saved ?? []).includes(id) ? '✓ Saved' : '+ Want to try'}</button>
      </div>
    </section>
    ${summaryCard(id)}
    <section class="card"><h3 class="h4">${live?.catalog_only ? 'Where it’s sold' : 'Where it’s reviewed'}</h3>${sourcesCard}</section>
    <section class="card stack">
      <div class="row between"><h3 class="h4">Reviews</h3><span class="xs muted">${revs.status === 'ok' ? `${total.toLocaleString()} ${skin ? `from ${esc(skin.toLowerCase())} skin` : 'total'}` : ''}</span></div>
      <div class="row wrap" style="gap:6px">
        <button class="chip ${!skin ? 'on' : ''}" data-act="review-skin" data-v="">All skin types</button>
        ${SKIN_TYPES.map((t) => `<button class="chip ${skin === t ? 'on' : ''}" data-act="review-skin" data-v="${t}">${t}${t === mine ? ' (you)' : ''}</button>`).join('')}
      </div>
      ${noSkinData ? `<p class="xs muted">These reviewers didn’t share their skin type, so you’re seeing all reviews.</p>` : ''}
      ${live?.catalog_only && !total ? '<div class="empty">No reviews collected for this product yet.</div>' : reviewList}
      ${reviews.length < total ? '<button class="btn" data-act="reviews-more" style="align-self:flex-start">Show more reviews</button>' : ''}
      ${statsLine() ? `<p class="xs faint live-count">Dew has collected ${statsLine()} so far.</p>` : ''}
    </section>`;
  return signedOut() ? { layout: 'layout-solo', main: `<div class="public-page stack">${main}</div>` } : { layout: '', left: leftCol(), main, right: rightRail() };
}

/* ================= search ================= */

function searchPage() {
  const q = (state.lastSearch || '').trim().toLowerCase();
  const catalog = { ...Object.fromEntries(Object.keys(liveProducts()).map((id) => [id, P(id)])), ...PRODUCTS };
  // Every catalog match, 40 at a time ("Show more" loads the next 40).
  const pages = q && q !== 'new' ? Array.from({ length: state.searchPages ?? 1 }, (_, i) => useJson(`/api/products?q=${encodeURIComponent(q)}&paged=1&limit=40&offset=${i * 40}`)) : [];
  const remote = pages.flatMap((p) => remember(p.data?.products));
  const total = pages[0]?.data?.total ?? 0;
  const hits = Object.entries(catalog).filter(([, p]) => !q || q === 'new' || `${p.brand} ${p.name} ${p.step}`.toLowerCase().includes(q));
  for (const r of remote) if (!hits.some(([id]) => id === r.id)) hits.push([r.id, P(r.id)]);
  const list = q === 'new' ? LAUNCHES.map((l) => [l.id, P(l.id)]) : hits;
  const main = `
    <h1 class="h2">${q && q !== 'new' ? `Results for “${esc(state.lastSearch)}”` : q === 'new' ? 'New launches' : 'All products'}</h1>
    <p class="xs muted">${q && q !== 'new' && total > list.length ? `Showing ${list.length} of ${total.toLocaleString()} products` : `${list.length} products`}. Tap + to add to your cart.${statsLine() ? `  ·  ${statsLine()} in Dew so far` : ''}</p>
    <section class="card">${list.map(([id, p], i) => `
      <div class="pick"><span class="rank" style="font-size:14px">${i + 1}</span>${thumb(id, 48, 52)}<div class="grow"><div class="mono">${esc(p.brand)}</div><div>${productLink(id, esc(p.name))}</div><div class="xs muted">${[p.step && `${p.step} step`, p.size].filter(Boolean).join('  ')}</div>${liveRating(id)}</div><span class="small">${p.price ? money(p.price) : ''}</span>
        ${signedOut() ? '' : `<button class="btn sm" data-act="shelf-add" data-id="${id}">${shelfIds().includes(id) ? 'On shelf ✓' : '+ Shelf'}</button>`}
        <button class="add-btn ${state.added[id] ? 'added' : ''}" data-act="add" data-id="${id}" aria-label="Add">${state.added[id] ? '✓' : '+'}</button></div>`).join('') || (pages.some((p) => p.status === 'loading') ? '<div class="empty">Searching…</div>' : '<div class="empty">Nothing found. Try “toner” or “SPF”.</div>')}</section>
    ${total > remote.length ? `<button class="btn" data-act="search-more" style="align-self:flex-start">Show more (${(total - remote.length).toLocaleString()} left)</button>` : ''}`;
  return signedOut() ? { layout: 'layout-solo', main: `<div class="public-page stack">${main}</div>` } : { layout: '', left: leftCol(), main, right: rightRail() };
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

/* ================= Hi-fi v8: People (Creators + Community in one tab) ================= */

const KIND_NAME = { creator: 'Creator', friend: 'Friend', member: 'Member', fof: 'Friend of a friend' };
const kindTag = (k) => (k ? `<span class="kind-tag ${k}">${KIND_NAME[k]}</span>` : '');
const personById = (id) => {
  const c = CREATORS.find((x) => x.id === id);
  return c ? { ...c, kind: 'creator' } : MEMBERS.find((m) => m.id === id);
};
const personProducts = (p) => (p.shelf ? creatorShelfProducts(p) : [...new Set([...(p.top3 ?? []).map(([id]) => id), ...(p.products ?? [])])]);
const hashOf = (s) => [...String(s)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);

// Card for anyone on Find people: the Creators like you card (Hi-fi v7 04) for every kind of person.
function personCard(c) {
  const following = state.following[c.id];
  const top3 = c.top3 ?? [[c.holyGrail, 9]];
  const rows = top3.map(([pid, s], i) => `
    <div class="row top3-row ${i === 0 ? 'holy' : ''}"><span class="top3-n">${i + 1}</span>${thumb(pid, 30, 36)}<div class="grow" style="min-width:0">${i === 0 ? '<div class="mono forest">★ Holy grail</div>' : `<div class="mono faint">${esc(P(pid).brand)}</div>`}<div class="small top3-name">${esc(P(pid).name)}</div></div>${ring(s, true)}</div>`).join('');
  return `
    <article class="card stack creator-card">
      <div class="row" style="align-items:flex-start;gap:12px"><img class="avatar" style="width:52px;height:52px" src="${c.avatar}" alt=""><div class="stack grow" style="gap:4px;min-width:0"><div class="row wrap" style="gap:6px"><span class="h4">${esc(c.name)}</span>${c.kind === 'creator' ? '' : kindTag(c.kind)}</div><div class="row wrap" style="gap:6px"><span class="pill gap">${c.match}% like you</span></div><div class="xs faint">${esc(c.handle)}  ${c.followers} followers</div>${c.location ? `<div class="xs muted">${esc(c.location)}  ·  Age ${c.age}</div>` : ''}${c.via ? `<div class="xs forest">${esc(c.via)}</div>` : ''}</div></div>
      <div class="stack" style="gap:8px">
        <div class="row wrap" style="gap:6px"><span class="mono faint creator-k">Skin type</span>${(c.skin ?? c.tags.slice(0, 2)).map((t) => `<span class="tag">${t}</span>`).join('')}</div>
        <div class="row wrap" style="gap:6px"><span class="mono faint creator-k">Environment</span><span class="tag">${c.environment ?? c.tags[2]}</span></div>
      </div>
      <div class="creator-top3 stack" style="gap:4px"><span class="mono" style="color:var(--ink);margin-bottom:4px">Top 3 products</span>${rows}</div>
      <div class="row wrap"><button class="btn ${following ? '' : 'dark'}" data-act="follow" data-id="${c.id}">${following ? 'Following ✓' : 'Follow'}</button><a class="btn" href="#/people/${c.id}">View full shelf →</a></div>
    </article>`;
}

const FIND_TABS = [['creators', 'Creators', 'Creators like you', 'Creators whose skin, climate and age match yours. Sponsored posts are always labeled.'], ['members', 'Members', 'Members like you', 'Dew members matched to you on skin type, climate and age, ranked by how similar they are.'], ['fof', 'Friends of friends', 'Friends of friends', 'People your friends follow, with skin like yours.']];
function findPeoplePage(tab = state.findTab ?? 'creators') {
  const [, , title, sub] = FIND_TABS.find(([k]) => k === tab) ?? FIND_TABS[0];
  const list = tab === 'creators' ? CREATORS.map((c) => ({ ...c, kind: 'creator' })) : MEMBERS.filter((m) => (tab === 'fof' ? m.kind === 'fof' : m.kind === 'member')).sort((a, b) => b.match - a.match);
  const main = `
    <div class="stack" style="max-width:1392px;width:100%;margin:0 auto;gap:16px">
      <a class="mono" href="#/people" style="text-decoration:none">← People</a>
      <div class="row between wrap" style="gap:12px"><h1 class="h2">${title}</h1><span class="seg">${FIND_TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="find-tab" data-v="${k}">${l}</button>`).join('')}</span></div>
      <div class="row wrap" style="gap:8px"><span class="mono">Matched to you</span>${profileTags().slice(0, 4).map((t) => `<span class="tag">${t}</span>`).join('')}<span class="xs faint">${sub}</span></div>
      <div class="creator-grid four">${list.map(personCard).join('')}</div>
    </div>`;
  return { layout: 'layout-solo', main };
}

// Creator posts in the People feed: each creator's latest update or their holy-grail note.
function creatorPosts() {
  return [...CREATORS].sort((a, b) => b.match - a.match).slice(0, 4).map((c, i) => ({
    pid: c.id, name: c.name, avatar: c.avatar, rel: 'Creator', when: ['3 days ago', '4 days ago', '1 week ago', '2 weeks ago'][i], product: c.holyGrail,
    usage: `Holy grail  ${c.location ?? ''}`, score: c.top3?.find(([p]) => p === c.holyGrail)?.[1] ?? 9, similar: c.match, tags: c.tags.slice(0, 3),
    text: c.announcement?.[0] ?? c.quote, helpful: 64 + i * 37, comments: 6 + i * 3,
  }));
}

function peopleRail() {
  const sug = ['riley', 'hana', 'lu'].map(personById).filter(Boolean);
  const why = (p) => p.moved ?? p.via ?? `${p.environment} · ${(p.skin ?? []).join(', ')}`;
  return `${rightRail().replace('margin-bottom:56px', '')}
    <section class="card stack" style="margin-bottom:56px">
      <h2 class="h4">People like you</h2>
      ${sug.map((p) => `
        <div class="row" style="gap:10px;align-items:flex-start">
          <a href="#/people/${p.id}"><img class="avatar" style="width:36px;height:36px" src="${p.avatar}" alt=""></a>
          <div class="grow stack" style="gap:3px;min-width:0"><div class="row wrap" style="gap:6px"><a class="small plink" style="font-weight:500" href="#/people/${p.id}">${esc(p.name)}</a>${kindTag(p.kind)}</div><span class="xs muted">${p.match}% like you  ·  ${esc(why(p))}</span></div>
          <button class="btn sm ${state.following[p.id] ? '' : 'dark'}" data-act="follow" data-id="${p.id}">${state.following[p.id] ? '✓' : 'Follow'}</button>
        </div>`).join('')}
      <a class="btn block" href="#/people/find">Find more people like you</a>
    </section>`;
}

function peoplePage() {
  const sortFns = {
    'Most similar to me': (a, b) => b.similar - a.similar,
    'Newest first': () => 0,
    'Highest rated': (a, b) => b.score - a.score,
    'Lowest rated': (a, b) => a.score - b.score,
  };
  const aud = state.peopleAudience ?? 'Everyone';
  const all = [...COMMUNITY.map((r) => ({ ...r, rel: r.rel === 'Friend' ? 'Friend' : 'Member' })), ...creatorPosts()];
  const feed = all.filter((r) => aud === 'Everyone' || (aud === 'Friends' ? r.rel === 'Friend' : r.rel === 'Creator')).sort(sortFns[state.filters.sort]);
  const f = state.filters;
  const fchip = (group, v, single) => `<button class="chip ${(single ? f[group] === v : f[group].includes(v)) ? 'on' : ''}" data-act="filter" data-group="${group}" data-v="${v}" data-single="${single ? 1 : ''}">${v}</button>`;
  const panel = state.filterOpen ? `
    <section class="card stack" style="box-shadow:0 6px 20px rgb(0 0 0 / 8%)">
      <div class="row wrap" style="gap:6px"><span class="mono">Skin</span>${['Combination', 'Acne-prone', 'Oily', 'Dry', 'Sensitive'].map((v) => fchip('skin', v)).join('')}<span class="mono">Environment</span>${['Humid', 'Dry climate', 'Cold winters', 'High UV'].map((v) => fchip('env', v)).join('')}</div>
      <div class="row wrap" style="gap:6px"><span class="mono">Sort</span>${Object.keys(sortFns).map((v) => fchip('sort', v, true)).join('')}</div>
      <div class="row"><button class="btn" data-act="filters-clear">Clear all</button><button class="btn dark" data-act="filters-toggle">Show ${feed.length} posts</button></div>
    </section>` : '';
  const active = f.skin.length + f.env.length + 1;
  const kindOf = { Friend: 'friend', Member: 'member', Creator: 'creator' };
  const main = `
    <div class="row between">
      <h1 class="h2">People</h1>
      <span class="seg">${['Everyone', 'Friends', 'Creators'].map((a) => `<button class="${aud === a ? 'on' : ''}" data-act="people-audience" data-v="${a}">${a}</button>`).join('')}</span>
      <button class="btn ${state.filterOpen ? 'dark' : ''}" data-act="filters-toggle">${state.filterOpen ? '✕' : '⚲'}  Filter + sort  ${active}</button>
    </div>
    ${panel}
    <div class="notice match-banner"><span class="forest">●</span><span class="grow">Friends, creators and members, ranked by similarity to you: ${profileTags().join(' ')}</span><a href="#/setup/2" class="edit-link">Edit skin profile</a></div>
    ${feed.map((r, i) => `
      <article class="card stack review-card">
        <div class="row"><a href="#/people/${r.pid}"><img class="avatar" src="${r.avatar}" alt=""></a><div class="grow"><div class="row"><a class="h4 plink" href="#/people/${r.pid}">${esc(r.name)}</a>${kindTag(kindOf[r.rel])}</div><div class="xs muted">${r.when}</div></div>${match(r.similar)}</div>
        <div class="row" style="gap:12px">${thumb(r.product, 56, 56)}<div class="grow"><div class="mono faint">${esc(P(r.product).brand)}</div><div class="h4">${esc(P(r.product).name)}</div><div class="xs muted">${r.usage}</div></div>${ring(r.score)}</div>
        <p style="font-size:13px">${esc(r.text)}</p>
        <div class="row wrap" style="gap:6px">${r.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
        ${r.photos ? `<div class="stack" style="gap:6px"><span class="mono faint">Tracked progress: ${r.photos.length} check-ins via <span class="nc">Dew</span> tracker</span><div class="row" style="gap:8px">${r.photos.map((p, j) => `<div class="photo review-photo"><img src="assets/img/progress/${p}.jpg" alt=""><span class="mono">Week ${[1, 2, 4, 6][j]}</span></div>`).join('')}</div></div>` : ''}
        <div class="row small muted review-actions" style="gap:18px">
          <button class="link" style="text-decoration:none;${state.helpful[r.name + i] ? 'color:var(--forest);font-weight:500' : ''}" data-act="helpful" data-k="${esc(r.name + i)}">▲ Helpful  ${r.helpful + (state.helpful[r.name + i] ? 1 : 0)}</button>
          <span>◌ ${r.comments} comments</span><button class="link" style="text-decoration:none" data-act="toast" data-msg="Link copied">↗ Share</button><span class="grow"></span>
          ${r.score >= 6 ? `<button class="btn" data-act="save" data-id="${r.product}">${(state.saved ?? []).includes(r.product) ? 'Saved ✓' : 'Save'}</button>` : '<button class="btn" data-act="toast" data-msg="Hidden from your picks">Hide product</button>'}
        </div>
      </article>`).join('') || '<div class="empty">No posts match these filters.</div>'}`;
  return { layout: '', left: leftCol(), main, right: peopleRail() };
}

function personPage(id) {
  const c = personById(id) || { ...CREATORS[0], kind: 'creator' };
  const m = creatorModel(c);
  const following = state.following[c.id];
  const left = pageSide(m, {
    back: '<a class="mono" href="#/people" style="text-decoration:none">← People</a>',
    actions: `<button class="btn ${following ? '' : 'dark'}" data-act="follow" data-id="${c.id}">${following ? 'Following ✓' : 'Follow'}</button><button class="btn" data-act="compare-open" data-id="${c.id}">Compare shelves</button>`,
    note: c.kind === 'creator' ? `${esc(m.first)}’s scores count the same as anyone’s. Sponsored products are labeled on the shelf.` : `${esc(m.first)} is a Dew member. Only their public shelf, ratings and diary posts are shown.`,
  });
  return { layout: 'layout-wide', left, main: pageMain(m, { who: m.first }) };
}

/* ---- Diary: a timeline of check-ins, challenges and profile changes (other explorations B3) ---- */

function myDiary() {
  const place = state.answers.climate?.place?.split(',')[0];
  const moved = place && place !== 'Miami' ? [{ when: 'Today', kind: 'Profile change', title: `Moved to ${place}`, text: 'Skin profile updated. Picks re-ranked for the new climate.', aud: 'Everyone' }] : [];
  return [...(state.diary ?? []), ...moved,
    { when: 'Nov 9', kind: 'Check-in', title: 'Week 6 check-in', text: 'Redness is down and my chin finally cleared. The retinol night cream is staying.', aud: 'Everyone', product: 'anua_night' },
    { when: 'Nov 2', kind: 'Milestone', title: '10 reviews written', text: 'Ten products reviewed after 4+ weeks each.', aud: 'Followers' },
    { when: 'Oct 31', kind: 'Milestone', title: 'First month tracked', text: 'Tracked 30 days in a row.', aud: 'Only me' }];
}

function diaryFor(m) {
  if (m.key === 'me') return myDiary();
  const h = m.holy.id;
  const next = m.recs.find((r) => r.id !== h);
  return [
    m.announcement ? { when: 'Today', kind: 'Update', title: 'Shelf update', text: m.announcement[0], aud: 'Everyone' } : { when: '3 days ago', kind: 'Check-in', title: `Week ${m.stats[2][0]} check-in`, text: `Still reaching for the ${P(h).name} every day. “${m.holy.note}”`, aud: 'Everyone', product: h },
    { when: '1 week ago', kind: 'Challenge', title: 'SPF Every Day complete', text: '14 days of sunscreen in a row. Spots are noticeably lighter.', aud: 'Followers' },
    next && { when: '3 weeks ago', kind: 'Product added', title: `Added ${P(next.id).name}`, text: next.note, aud: 'Everyone', product: next.id },
    { when: '2 months ago', kind: 'Milestone', title: 'First month tracked', text: 'Tracked 30 days in a row.', aud: 'Everyone' },
  ].filter(Boolean);
}

// viewer: 'owner' sees everything; 'follower' sees Everyone + Followers; 'public' sees Everyone.
function diaryTimeline(entries, viewer = 'public') {
  const shown = entries.filter((e) => viewer === 'owner' || e.aud === 'Everyone' || (viewer === 'follower' && e.aud === 'Followers'));
  if (!shown.length) return '<div class="empty">No public diary posts yet.</div>';
  const slug = (k) => k.toLowerCase().replace(/[^a-z]+/g, '-');
  return `<div class="diary">${shown.map((e) => `
    <div class="diary-row">
      <div class="diary-date"><span class="mono">${esc(e.when)}</span><i></i></div>
      <article class="card stack diary-card ${e.aud === 'Only me' ? 'private' : ''}">
        <div class="row wrap" style="gap:8px"><span class="kind-chip ${slug(e.kind)}">${esc(e.kind)}</span><span class="small" style="font-weight:500">${esc(e.title)}</span><span class="grow"></span><span class="aud-pill ${e.aud === 'Only me' ? 'private' : ''}">${e.aud === 'Only me' ? '🔒 ' : ''}${esc(e.aud)}</span></div>
        <div class="row" style="gap:12px;align-items:flex-start"><p class="small muted grow">${esc(e.text)}</p>${e.photo ? `<span class="diary-photo"><img src="${e.photo}" alt="Progress photo"></span>` : ''}${e.product ? thumb(e.product, 40, 44) : ''}</div>
      </article>
    </div>`).join('')}</div>`;
}

/* ---- Compare shelves (other explorations F2·3), on anyone's page ---- */

function compareModal() {
  if (!state.compare) return '';
  const c = personById(state.compare);
  if (!c) return '';
  const m = creatorModel(c);
  const mine = [...new Set(shelfIds())];
  const theirs = m.ranked.map(([id]) => id);
  const only = theirs.filter((id) => !mine.includes(id));
  const both = theirs.filter((id) => mine.includes(id));
  const onlyMe = mine.filter((id) => !theirs.includes(id));
  const saved = state.saved ?? [];
  const item = (id, sub, extra = '') => `
    <div class="cmp-item">
      ${thumb(id, 40, 46)}
      <div class="grow stack" style="gap:3px;min-width:0"><span class="mono faint">${esc(P(id).brand)}</span>${productLink(id, `<span class="small">${esc(P(id).name)}</span>`)}<span class="xs muted">${sub}</span>${extra}</div>
    </div>`;
  const col = (title, cls, ids, render, foot = '') => `
    <section class="cmp-col ${cls}"><div class="row between"><span class="mono" style="color:var(--ink)">${title}</span><span class="mono faint">${ids.length}</span></div>
      <div class="stack" style="gap:8px">${ids.map(render).join('') || '<div class="xs muted" style="padding:12px 0">Nothing here.</div>'}</div>${foot}</section>`;
  return `
    <div class="scrim" data-act="compare-close">
      <section class="modal cmp-modal" role="dialog" aria-label="Compare shelves with ${esc(m.name)}" data-stop>
        <div class="row" style="gap:14px">
          <span class="cmp-faces"><img class="avatar" src="assets/img/progress/w5.jpg" alt=""><img class="avatar" src="${m.avatar}" alt=""></span>
          <div class="grow"><div class="mono faint">Compare shelves</div><h2 class="h2" style="font-size:28px">You and ${esc(m.name)}</h2></div>
          ${m.match ? `<span class="pill gap">${m.match}% skin match</span>` : ''}
          <button class="link mono" data-act="compare-close">Close ✕</button>
        </div>
        <div class="cmp-grid">
          ${col(`Only ${esc(m.first)} uses`, 'theirs', only, (id) => item(id, `${esc(m.first)} rates it ${m.score[id].toFixed(1)}  ·  ${esc(m.bestFor(id))}`, `
            <div class="row wrap" style="gap:6px;margin-top:4px"><button class="btn sm ${saved.includes(id) ? '' : ''}" data-act="save" data-id="${id}">${saved.includes(id) ? 'Saved ✓' : '+ Want to try'}</button><button class="btn sm dark" data-act="add" data-id="${id}">${state.added[id] ? 'In cart ✓' : 'Add to cart'}</button></div>`),
            only.length ? `<div class="row wrap" style="gap:8px"><button class="btn dark" data-act="add-many" data-ids="${only.join(',')}">Add all ${only.length} to cart</button><button class="btn" data-act="save-many" data-ids="${only.join(',')}">Save all to Want to try</button></div>` : '')}
          ${col('Both of you', 'both', both, (id) => item(id, `You ${(state.ratings[id] ?? 8).toFixed(1)}  ·  ${esc(m.first)} ${m.score[id].toFixed(1)}`))}
          ${col('Only you use', 'mine', onlyMe, (id) => item(id, `You rate it ${(state.ratings[id] ?? 8).toFixed(1)}`))}
        </div>
      </section>
    </div>`;
}

/* ---- Explore: who you follow uses each pick, and "Why this?" (other explorations F2, E1) ---- */

const FOLLOW_NOTES = ['Holy grail territory for me.', 'Took a few weeks, but it’s staying.', 'Gentle enough to use every day.', 'Repurchased twice already.', 'Works best with sunscreen every morning.', 'My skin calmed down within a couple of weeks.'];
function followedPeople() {
  return [...MEMBERS.filter((m) => m.kind === 'friend'), ...CREATORS.filter((c) => state.following[c.id]).map((c) => ({ ...c, kind: 'creator' }))];
}
function followersUsing(id) {
  const pool = followedPeople();
  const h = hashOf(id);
  const real = pool.filter((p) => personProducts(p).includes(id));
  const picks = real.length ? real : [pool[h % pool.length], pool[(h >> 4) % pool.length]].filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 1 + (h % 2));
  return picks.slice(0, 3).map((p, i) => ({ p, score: p.top3?.find(([x]) => x === id)?.[1] ?? 8.3 + ((h >> (i + 2)) % 13) / 10, weeks: 3 + ((h >> (i + 5)) % 9), note: FOLLOW_NOTES[(h + i) % FOLLOW_NOTES.length] }));
}
function followUse(id) {
  const people = followersUsing(id);
  if (!people.length) return '';
  return `
    <div class="follow-use">
      <span class="mono forest">People you follow who use this</span>
      ${people.map(({ p, score, weeks, note }) => `
        <div class="row" style="gap:10px">
          <a href="#/people/${p.id}"><img class="avatar" style="width:28px;height:28px" src="${p.avatar}" alt=""></a>
          <div class="grow row wrap" style="gap:6px;min-width:0"><a class="small plink" style="font-weight:500" href="#/people/${p.id}">${esc(p.name)}</a>${kindTag(p.kind)}<span class="xs muted">${p.match}% like you  ·  used ${weeks} weeks</span><span class="small muted" style="flex-basis:100%">“${esc(note)}”</span></div>
          ${ring(score, true)}
        </div>`).join('')}
    </div>`;
}

function whyModal() {
  const w = state.why;
  if (!w) return '';
  const skin = (state.answers.skinType?.[0] ?? 'combination').toLowerCase();
  const friend = followersUsing(w.id)[0];
  const n = +w.n || 0;
  const reasons = [
    [3, w.gap === '1' ? `Your routine has no ${esc(String(w.step || 'treatment').toLowerCase())} step yet, and this is the top-rated one for people with ${skin} skin.` : `It’s rated higher by people like you than the ${esc(String(w.step || 'product').toLowerCase())} you use now.`],
    [2, `${w.pct}% of ${n.toLocaleString()} people with ${skin} skin rated it 4★ or more.`],
    friend && [1, `${esc(friend.p.name)}, ${friend.p.kind === 'creator' ? 'a creator you follow' : 'a friend'} with ${friend.p.match}% similar skin, rates it ${friend.score.toFixed(1)}.`],
  ].filter(Boolean);
  const dots = (k) => '●'.repeat(k) + '○'.repeat(3 - k);
  return `
    <div class="scrim" data-act="why-close">
      <section class="modal" role="dialog" aria-label="Why this pick" data-stop>
        <div class="row between"><span class="mono forest">Why this?</span><button class="link mono" data-act="why-close">Close ✕</button></div>
        <div class="row" style="gap:14px">${thumb(w.id, 56, 56)}<div><div class="mono faint">${esc(P(w.id).brand)}</div><h2 class="h3">${esc(P(w.id).name)}</h2></div></div>
        <span class="mono faint">Because</span>
        ${reasons.map(([k, t]) => `<div class="row" style="gap:12px;align-items:flex-start"><span class="mono forest" style="width:34px;flex:none">${dots(k)}</span><p class="small">${t}</p></div>`).join('')}
        <div class="notice row" style="gap:8px"><span class="mono" style="color:var(--ink)">${n > 200 ? 'High' : 'Medium'} confidence</span><span class="xs muted">Based on ${n.toLocaleString()} reviews from people with ${skin} skin, your shelf and your profile.</span></div>
        <div class="row wrap" style="gap:8px"><button class="btn" data-act="why-own" data-id="${w.id}">I already own it</button><button class="btn" data-act="why-hide" data-id="${w.id}">Not interested</button><button class="btn" data-act="why-fewer">Show fewer like this</button></div>
      </section>
    </div>`;
}

/* ---- Picked for you: Dew's routine or one from someone like you (other explorations R3) ---- */

function sourceToggle() {
  const src = state.pickedSource ?? 'dew';
  return `<span class="seg source-seg" style="align-self:flex-start">${[['dew', 'Picked by Dew', 'One product per step, from 1,486 people like you'], ['people', 'From people like you', 'Start from a real routine that worked']].map(([k, l, s]) => `<button class="${src === k ? 'on' : ''}" data-act="picked-source" data-v="${k}">${l}<small>${s}</small></button>`).join('')}</span>`;
}
const routineIdsOf = (r) => r.products.map((x) => (Array.isArray(x) ? x[0] : x));

function peerRoutinesPage() {
  const goal = state.peerGoal ?? 'Fade dark spots';
  const list = PEER_ROUTINES.filter((r) => r.goal === goal);
  const common = list.find((r) => r.common);
  const people = list.filter((r) => !r.common);
  const goals = [...new Set(PEER_ROUTINES.map((r) => r.goal))];
  const cards = people.map((r) => {
    const p = personById(r.who);
    return `
      <article class="card stack peer-card">
        <div class="row" style="gap:10px"><a href="#/people/${p.id}"><img class="avatar" style="width:40px;height:40px" src="${p.avatar}" alt=""></a><div class="grow stack" style="gap:2px;min-width:0"><div class="row wrap" style="gap:6px"><span class="small" style="font-weight:500">${esc(p.name)}</span>${kindTag(p.kind)}</div><span class="xs muted">${p.match}% match  ·  ${esc((p.skin ?? []).join(', '))}  ·  ${esc(p.environment)}  ·  ${p.age}</span></div></div>
        <span class="xs muted">Started with: ${esc(r.start)}</span>
        <div class="peer-result">${esc(r.result)}</div>
        <div class="row" style="gap:6px">${routineIdsOf(r).map((id) => thumb(id, 40, 44)).join('')}</div>
        <div class="row between"><span class="xs faint">${r.users} people like you used it  ·  ${r.kept}% kept it</span><a class="btn sm" href="#/picked/routine/${r.id}">See routine</a></div>
      </article>`;
  }).join('');
  const main = `${sourceToggle()}
    <div class="stack" style="gap:4px"><h1 class="h2">Routines that worked for people like you</h1><p class="small muted">Real routines from people matched to you who reached the same goal, with their weekly check-ins. Pick one to start from.</p></div>
    <div class="row wrap" style="gap:6px"><span class="mono faint">Goal</span>${goals.map((g) => `<button class="chip ${g === goal ? 'on' : ''}" data-act="peer-goal" data-v="${g}">${g}</button>`).join('')}</div>
    ${common ? `
    <section class="peer-common row">
      <div class="grow stack" style="gap:6px"><span class="mono lime">Most common routine  ·  ${common.users} people like you</span><span class="h3" style="color:#fff">${common.products.length} products, ${common.kept}% kept it after 8 weeks</span><span class="small" style="color:#dfe9df">Median ${common.weeks} weeks to results for “${esc(goal.toLowerCase())}”.</span></div>
      <div class="row" style="gap:8px">${common.products.map((id) => `<span class="peer-thumb">${thumb(id, 52, 52)}</span>`).join('')}</div>
      <a class="btn lime" href="#/picked/routine/${common.id}/mine">Use this routine</a>
    </section>` : ''}
    <div class="peer-grid">${cards}</div>
    <div class="notice"><span class="mono forest">How this works</span> Each routine comes from someone with skin like yours who tracked it on Dew. Members can stay anonymous; only skin details, products and results are shown.</div>`;
  return { layout: 'layout-wide', left: leftCol(), main };
}

function routineDetail(id) {
  const r = PEER_ROUTINES.find((x) => x.id === id && !x.common) ?? PEER_ROUTINES.find((x) => !x.common);
  const p = personById(r.who);
  const max = Math.max(...r.trend);
  const left = `
    <section class="card stack">
      <a class="mono" href="#/picked" style="text-decoration:none">← Routines like yours</a>
      <div class="row"><img class="avatar" style="width:72px;height:72px" src="${p.avatar}" alt=""><div><div class="h2" style="font-size:24px">${esc(p.name)}</div>${kindTag(p.kind)}</div></div>
      <div class="card" style="background:var(--lime);border-color:var(--lime);padding:14px"><span class="mono" style="color:var(--ink)">${p.match}% like you</span><p class="xs" style="margin-top:6px">${esc(p.moved ?? `${(p.skin ?? []).join(', ')} skin, ${p.environment.toLowerCase()} climate, ${p.age}.`)}</p></div>
      <div class="row wrap" style="gap:6px">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      <span class="xs muted">Tracked ${r.tracked} weeks  ·  ${r.tracked} check-ins</span>
      <div class="row wrap" style="gap:8px"><button class="btn ${state.following[p.id] ? '' : 'dark'}" data-act="follow" data-id="${p.id}">${state.following[p.id] ? 'Following ✓' : 'Follow'}</button><a class="btn" href="#/people/${p.id}">View profile</a></div>
    </section>`;
  const main = `
    <div class="stack" style="gap:4px"><span class="mono faint">Goal: ${esc(r.goal.toLowerCase())}  ·  started with ${esc(r.start.toLowerCase())}</span><h1 class="h2">${esc(r.result)}</h1></div>
    <div class="routine-grid">
      <div class="stack" style="gap:16px">
        <section class="card stack"><div class="row between"><h2 class="h4">Weekly check-ins</h2><span class="xs muted">Lower is better</span></div>
          <div class="bars trend">${r.trend.map((v, i) => `<div><span class="mono" style="color:var(--ink)">${v}</span><i class="${i === r.trend.length - 1 ? 'cur' : ''}" style="height:${(v / max) * 100}%"></i><span class="mono">W${i + 1}</span></div>`).join('')}</div>
          ${r.dip ? `<span class="xs muted">${esc(r.dip)}</span>` : ''}</section>
        <section class="card stack"><h2 class="h4">Their routine</h2>
          ${r.products.map(([pid, when, note]) => `<div class="row" style="gap:12px">${thumb(pid, 44, 50)}<div class="grow stack" style="gap:2px;min-width:0"><span class="mono faint">${esc(P(pid).brand)}  ·  ${esc(P(pid).step)}</span>${productLink(pid, `<span class="small">${esc(P(pid).name)}</span>`)}<span class="xs muted">“${esc(note)}”</span></div><span class="tag">${esc(when)}</span></div>`).join('')}
        </section>
      </div>
      <div class="stack" style="gap:16px">
        <section class="card stack" style="background:#f9f6c9;border-color:transparent"><span class="mono" style="color:var(--ink)">What I’d change</span><p>“${esc(r.change)}”</p></section>
        <section class="card stack"><span class="h4">${r.users} people like you used this routine</span><span class="small muted">${r.kept}% kept it after 8 weeks</span></section>
        <a class="btn dark block" href="#/picked/routine/${r.id}/mine">Make it mine →</a>
      </div>
    </div>`;
  return { layout: 'layout-wide', left, main };
}

function routineMine(id) {
  const r = PEER_ROUTINES.find((x) => x.id === id) ?? PEER_ROUTINES[0];
  const ids = routineIdsOf(r);
  const mine = [...new Set(shelfIds())];
  const have = ids.filter((x) => mine.includes(x));
  // Cleansers and sunscreens are close enough to swap for what you own; treatments and moisturizers aren't.
  const close = ids.filter((x) => !mine.includes(x) && ['Cleanse', 'Protect'].includes(P(x).step)).map((x) => [x, mine.find((m) => P(m).step === P(x).step)]).filter(([, m]) => m);
  const add = ids.filter((x) => !mine.includes(x) && !close.some(([c]) => c === x));
  const total = add.reduce((a, x) => a + (P(x).price || 0), 0);
  const who = r.common ? `the most common routine (${r.users} people like you)` : `${personById(r.who).name}’s routine`;
  const col = (title, cls, body) => `<section class="card stack mine-col ${cls}"><span class="mono" style="color:var(--ink)">${title}</span>${body || '<div class="xs muted">Nothing here.</div>'}</section>`;
  const row = (x, sub, extra = '') => `<div class="mine-item">${thumb(x, 44, 50)}<div class="grow stack" style="gap:2px;min-width:0"><span class="mono faint">${esc(P(x).brand)}</span><span class="small">${esc(P(x).name)}</span><span class="xs muted">${sub}</span>${extra}</div></div>`;
  const main = `
    <a class="mono" href="${r.common ? '#/picked' : `#/picked/routine/${r.id}`}" style="text-decoration:none">← Back</a>
    <div class="stack" style="gap:4px"><h1 class="h2">Make it yours</h1><p class="small muted">Starting from ${esc(who)}, merged with your shelf. You only buy what you don’t already have.</p></div>
    <div class="mine-grid">
      ${col(`You already have (${have.length})`, 'have', have.map((x) => row(x, `${P(x).step}  ·  on your shelf`)).join(''))}
      ${col(`Close enough (${close.length})`, 'close', close.map(([x, m]) => row(x, `Your ${esc(P(m).name)} covers ${esc(P(x).step.toLowerCase())}`, `<button class="link mono" style="align-self:flex-start" data-act="add" data-id="${x}">${state.added[x] ? 'In cart ✓' : 'Swap it in anyway'}</button>`)).join(''))}
      ${col(`Add to your box (${add.length})`, 'add', add.map((x) => row(x, `${P(x).step}  ·  ${money(P(x).price)}`)).join(''))}
    </div>
    <section class="card row wrap box-summary">
      <div class="stack" style="gap:2px"><span class="mono faint">New products</span><span class="h4">${add.length}</span></div>
      <div class="stack" style="gap:2px"><span class="mono faint">Est. total</span><span class="h4">${money(total)}</span></div>
      <div class="stack" style="gap:2px"><span class="mono faint">Based on</span><span class="h4">${r.common ? `${r.users} people` : esc(personById(r.who).name)}</span></div>
      <span class="grow"></span>
      ${add.length ? `<button class="btn" data-act="save-many" data-ids="${add.join(',')}">Save to Want to try</button><button class="btn dark" data-act="routine-mine-cart" data-ids="${add.join(',')}">Add ${add.length} to cart</button>` : '<span class="small muted">You already have everything in this routine.</span>'}
    </section>`;
  return { layout: 'layout-wide', left: leftCol(), main };
}

/* ---- My page: edit beside a live preview (other explorations A2) ---- */

function myPageSplit() {
  const m = myModel();
  const pg = state.myPage ?? {};
  const as = state.previewAs ?? 'public';
  const editor = `
    <section class="card stack page-editor">
      <div class="row between"><h2 class="h4" style="font-size:16px">Edit your page</h2><span class="saved-tag">Saved</span></div>
      <label class="stack" style="gap:6px"><span class="mono faint">Blurb</span>
        <span class="blurb-box"><textarea data-input="page-blurb" maxlength="200" rows="4">${esc(m.blurb)}</textarea><span class="blurb-count mono">${m.blurb.length} / 200</span></span></label>
      <div class="stack" style="gap:6px"><span class="mono faint">Background</span><div class="row theme-pick">${Object.keys(PAGE_THEMES).map((k) => `<button class="swatch ${m.theme === k ? 'on' : ''}" style="background:${PAGE_THEMES[k]}" data-act="page-theme" data-v="${k}" aria-label="${k} background"></button>`).join('')}<button class="link xs" data-act="toast" data-msg="Photo backgrounds come with the Dew app">+ Photo</button></div></div>
      <form class="stack" data-form="page-announce" style="gap:6px"><span class="mono faint">Announcement</span><div class="row" style="gap:6px"><input class="shelf-input grow" name="text" value="${esc(pg.announcement ?? m.announcement?.[0] ?? '')}" placeholder="Share an update with your followers"><button class="btn sm dark">Post</button></div></form>
      <div class="row between"><span class="mono faint">Top recommendations</span><a class="link mono" href="#/search">+ Add</a></div>
      ${recList(m, { edit: true })}
    </section>`;
  const viewer = as === 'follower' ? 'follower' : 'public';
  const preview = `
    <div class="stack page-preview">
      <div class="row between wrap" style="gap:8px"><div class="row" style="gap:8px"><h2 class="h4" style="font-size:16px">Live preview</h2><span class="xs muted">Updates as you type</span></div>
        <div class="row" style="gap:8px"><span class="xs muted">Viewing as</span><span class="seg">${[['public', 'Public'], ['follower', 'Follower'], ['matched', 'Matched visitor']].map(([k, l]) => `<button class="${as === k ? 'on' : ''}" data-act="preview-as" data-v="${k}">${l}</button>`).join('')}</span></div></div>
      <div class="preview-frame stack">
        <div class="row" style="gap:12px"><img class="avatar" style="width:52px;height:52px" src="${m.avatar}" alt=""><div class="grow"><div class="h3">${esc(m.name)}</div><div class="xs muted">${esc(m.handle)}  ${m.followers} followers</div></div>${as === 'matched' ? '<span class="pill gap">94% skin match with you</span>' : ''}<span class="btn sm dark" aria-hidden="true">Follow</span></div>
        <div class="row wrap" style="gap:6px">${m.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        ${pageBanner(m)}
        ${holyBanner(m, m.first)}
        <div><h3 class="h4">Top recommendations</h3></div>
        ${recList(m)}
        <div><h3 class="h4">Diary</h3><p class="xs muted">${viewer === 'follower' ? 'Followers see posts shared with everyone and with followers.' : 'The public sees posts shared with everyone.'}</p></div>
        ${diaryTimeline(myDiary(), viewer)}
      </div>
    </div>`;
  return `<div class="split-edit">${editor}${preview}</div>
    ${pageShelf(m, { edit: true })}
    <p class="xs muted">Your scores update every time you rate a product in your check-in. Only your blurb, recommendations, shelf, diary posts and public reviews are shown to others.</p>`;
}

/* ---- Share a moment when a challenge is finished (other explorations B2) ---- */

const MOMENT_TEXT = {
  'Hydrate Hero': 'Seven days of AM + PM moisturizer and my skin feels so much calmer. The retinol night cream is staying.',
  'SPF Every Day': 'Two weeks of sunscreen every single day. My dark spots are noticeably lighter.',
  'Photo Friday': 'Four weeks of progress photos in a row. Seeing them side by side is wild.',
  'Honest Reviewer': 'Ranked three products I’ve used for 4+ weeks. Honest takes only.',
};
const MOMENT_PRODUCTS = { 'Hydrate Hero': ['anua_night', 'cerave_int'], 'SPF Every Day': ['biore'], 'Photo Friday': [], 'Honest Reviewer': ['anua_txa', 'boj_glow'] };
function momentModal() {
  const t = state.moment;
  if (!t) return '';
  const ch = CHALLENGES.find(([x]) => x === t);
  const aud = state.momentAud ?? 'Everyone';
  const photo = state.momentPhoto;
  return `
    <div class="scrim" data-act="moment-close">
      <section class="modal" role="dialog" aria-label="Share a moment" data-stop>
        <div class="row" style="gap:14px"><span class="moment-badge">${svg('star', 30)}</span><div class="grow"><span class="mono" style="color:var(--olive)">Challenge complete</span><h2 class="h2" style="font-size:28px">${esc(t)}  ·  +${ch?.[4] ?? 0} pts</h2></div><button class="link mono" data-act="moment-close">✕</button></div>
        <hr class="divider">
        <h3 class="h3">Share it on your page?</h3>
        <p class="xs muted">We drafted this from your check-ins. Edit it or post as is.</p>
        <textarea class="moment-text" data-input="moment-text" rows="3">${esc(state.momentText ?? MOMENT_TEXT[t] ?? '')}</textarea>
        <div class="row" style="gap:12px">
          <span class="diary-photo lg ${photo ? 'on' : ''}"><img src="assets/img/progress/w5.jpg" alt="This week’s progress photo"></span>
          <div class="stack grow" style="gap:6px"><span class="private" style="align-self:flex-start">🔒 Private unless you add it</span><button class="btn sm" style="align-self:flex-start" data-act="moment-photo">${photo ? 'Added to post ✓' : 'Add this week’s photo'}</button></div>
        </div>
        ${(MOMENT_PRODUCTS[t] ?? []).length ? `<div class="row wrap" style="gap:6px"><span class="mono faint">Products</span>${MOMENT_PRODUCTS[t].map((id) => `<span class="tag">${esc(P(id).name)}</span>`).join('')}</div>` : ''}
        <div class="row" style="gap:10px"><span class="xs muted">Who sees it</span><span class="seg">${['Everyone', 'Followers', 'Only me'].map((a) => `<button class="${aud === a ? 'on' : ''}" data-act="moment-aud" data-v="${a}">${a}</button>`).join('')}</span></div>
        <div class="row"><button class="btn dark" data-act="moment-post">Post to my page</button><button class="btn" data-act="moment-close">Not now</button></div>
      </section>
    </div>`;
}

/* ================= render ================= */

// Pages anyone can see; everything else needs an account once accounts are on.
const PUBLIC_ROUTES = ['welcome', 'signup', 'login', 'search', 'product', 'reviews'];

function view() {
  const r = route();
  const [a, b] = r.split('/');
  if (a === 'welcome') return { tab: '', ...welcomePage() };
  if (a === 'signup') return { tab: '', ...signupPage() };
  if (a === 'login') return { tab: '', ...loginPage() };
  if (a === 'reviews') return { tab: 'reviews', ...reviewsPage() };
  if (a === 'setup') return { tab: '', ...setupPage(b === 'done' ? 'done' : Math.min(4, Math.max(1, +b || 1))) };
  const c3 = r.split('/')[2], c4 = r.split('/')[3];
  if (a === 'people') return { tab: 'people', ...(b === 'find' ? findPeoplePage() : b ? personPage(b) : peoplePage()) };
  if (a === 'creators') return { tab: 'people', ...(b ? personPage(b) : findPeoplePage('creators')) };
  if (a === 'community') return { tab: 'people', ...peoplePage() };
  if (a === 'picked') return { tab: 'picked', ...(b === 'routine' ? (c4 === 'mine' ? routineMine(c3) : PEER_ROUTINES.find((x) => x.id === c3)?.common ? routineMine(c3) : routineDetail(c3)) : pickedPage()) };
  if (a === 'cart') return { tab: '', ...cartPage() };
  if (a === 'order-placed') return { tab: '', ...orderPlaced() };
  if (a === 'sample') return { tab: 'picked', ...(b === 'placed' ? samplePlaced() : b === 'verdict' ? sampleVerdict() : sampleCheckout()) };
  if (a === 'check-in') return { tab: '', ...checkinPage() };
  if (a === 'profile') return { tab: '', ...(b === 'public' ? myPublicPage() : profilePage()) };
  if (a === 'search') return { tab: '', ...searchPage() };
  if (a === 'product' && b) return { tab: '', ...productPage(b) };
  return { tab: 'for-you', ...forYou() };
}

let lastRoute = null;
function render() {
  if (!auth.ready) return;
  const [a] = route().split('/');
  if (signedOut() && !PUBLIC_ROUTES.includes(a)) { location.replace('#/welcome'); return; }
  if (auth.enabled && currentUser() && ['welcome', 'signup', 'login'].includes(a)) { location.replace('#/for-you'); return; }
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
  playBoxReveal(lastRoute !== r);
  // Ask Dew is pinned to the bottom right on every page, signed in or not.
  document.getElementById('overlay').innerHTML = `${askDew()}${rewardModal()}${compareModal()}${whyModal()}${momentModal()}`;
  const chat = document.getElementById('chat');
  if (chat) chat.scrollTop = chat.scrollHeight;
  lastRoute = r;
  document.title = `Dew  ${({ 'for-you': 'Explore', people: 'People', picked: 'Picked for you' })[v.tab] || 'Skincare picked by people like you'}`;
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
  search: (d) => { set({ lastSearch: d.q, searchPages: 1 }); go('search'); },
  'search-more': () => set({ searchPages: (state.searchPages ?? 1) + 1 }),
  'log-out': () => signOut(),
  save: (d) => {
    const saved = state.saved ?? [];
    const has = saved.includes(d.id);
    set({ saved: has ? saved.filter((x) => x !== d.id) : [d.id, ...saved] });
    toast(has ? 'Removed from Want to try' : `Saved ${P(d.id).name} to Want to try`);
  },
  'saved-all': () => set({ savedAll: !state.savedAll }),
  'shelf-add': (d) => addToShelf(d.id),
  'rv-skin': (d) => set({ rv: { ...state.rv, skin: d.v, limit: 20 } }),
  'rv-more': () => set({ rv: { ...state.rv, limit: (state.rv?.limit ?? 20) + 20 } }),
  'rv-clear': () => set({ rv: { sort: state.rv?.sort ?? 'newest' } }),
  'reset-password': async () => {
    const email = document.querySelector('[data-form="login"] input[name="email"]')?.value;
    if (!email) { set({ authError: 'Enter your email above, then tap “Forgot your password?” again.', authNotice: '' }); return; }
    try { await resetPassword(email); set({ authError: '', authNotice: `If there’s an account for ${email}, we’ve sent a reset link.` }); } catch (err) { set({ authError: err.message }); }
  },
  'review-skin': (d) => set({ reviewSkin: d.v || null, reviewLimit: 10 }),
  'reviews-more': () => set({ reviewLimit: (state.reviewLimit ?? 10) + 10 }),
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
  'pick-filter': (d) => { const f = state.pickFilters ?? { budget: '$30–$60', keep: true, fragrance: false, vegan: false }; set({ pickFilters: d.k === 'budget' ? { ...f, budget: d.v } : { ...f, [d.k]: !f[d.k] } }); },
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
    const order = { no: `Dew-${20480 + state.orders.length + 1}`, items: state.cart.map((c) => ({ id: c.id, qty: c.qty })), total: t.total, earned };
    set({ orders: [...state.orders, order], cart: [], added: {}, points: state.points - t.ptsUsed + earned });
    go('order-placed');
  },
  'ci-feel': (d) => set({ checkin: { ...state.checkin, feel: { ...state.checkin.feel, [d.k]: d.v } } }),
  'ci-extra': (d) => { const e = state.checkin.extra; set({ checkin: { ...state.checkin, extra: e.includes(d.v) ? e.filter((x) => x !== d.v) : [...e, d.v] } }); },
  'ci-status': (d) => set({ stars: { ...state.stars, [`st_${d.id}`]: d.v } }),
  'ci-verdict': (d) => set({ checkin: { ...state.checkin, verdict: d.v } }),
  'ci-submit': () => { set({ checkin: { ...state.checkin, submitted: true } }); earn(60, 'Weekly check-in submitted'); },
  'profile-tab': (d) => set({ profileTab: d.v }),
  'page-tab': (d) => set({ pageTab: { ...state.pageTab, [d.key]: d.v } }),
  'page-shelf': (d) => set({ pageShelfOpen: { ...state.pageShelfOpen, [d.key]: state.pageShelfOpen?.[d.key] === d.id ? null : d.id } }),
  'cr-more': (d) => { const f = state.cr?.[d.key] ?? {}; set({ cr: { ...state.cr, [d.key]: { ...f, limit: (f.limit ?? 5) + 5 } } }); },
  'cr-clear': (d) => set({ cr: { ...state.cr, [d.key]: {} } }),
  'edit-note': (d) => set({ editNote: d.id, profileTab: 'rankings' }),
  'page-theme': (d) => set({ myPage: { ...state.myPage, theme: d.v } }),
  'demo-points': () => set({ points: REWARD_PTS, rewardDismissed: false }),
  'reward-open': () => set({ rewardDismissed: false }),
  'reward-later': () => set({ rewardDismissed: true }),
  'reward-build': () => { set({ pickedMode: 'sample', rewardDismissed: true }); go('picked'); },
  'find-tab': (d) => set({ findTab: d.v }),
  'people-audience': (d) => set({ peopleAudience: d.v }),
  'compare-open': (d) => set({ compare: d.id }),
  'compare-close': () => set({ compare: null }),
  'save-many': (d) => { const ids = d.ids.split(',').filter(Boolean); set({ saved: [...new Set([...ids, ...(state.saved ?? [])])] }); toast(`Saved ${ids.length} to Want to try`); },
  'why-open': (d) => set({ why: { id: d.id, step: d.step, gap: d.gap, pct: d.pct, n: d.n } }),
  'why-close': () => set({ why: null }),
  'why-own': (d) => { set({ why: null }); addToShelf(d.id); },
  'why-hide': (d) => { set({ why: null, hiddenPicks: [...new Set([...(state.hiddenPicks ?? []), d.id])] }); toast('Got it. We won’t pick this for you again.'); },
  'why-fewer': () => { set({ why: null }); toast('We’ll show fewer picks like this'); },
  'picked-source': (d) => set({ pickedSource: d.v }),
  'peer-goal': (d) => set({ peerGoal: d.v }),
  'routine-mine-cart': (d) => { d.ids.split(',').filter(Boolean).forEach((id) => addToCart(id, 'pick', 'From a routine like yours')); go('cart'); },
  'preview-as': (d) => set({ previewAs: d.v }),
  'chal-log': (d) => {
    const ch = CHALLENGES.find(([t]) => t === d.t);
    const n = Math.min(ch[3], (state.chal?.[d.t] ?? ch[2]) + 1);
    set({ chal: { ...state.chal, [d.t]: n } });
    if (n >= ch[3]) { set({ moment: d.t, momentText: null, momentPhoto: false, momentAud: 'Everyone' }); earn(ch[4], `${d.t} complete`); } else toast(`Logged. ${ch[3] - n} to go`);
  },
  'moment-close': () => set({ moment: null }),
  'moment-aud': (d) => set({ momentAud: d.v }),
  'moment-photo': () => set({ momentPhoto: !state.momentPhoto }),
  'moment-post': () => {
    const t = state.moment;
    const entry = { when: 'Today', kind: 'Challenge', title: `${t} complete`, text: state.momentText ?? MOMENT_TEXT[t] ?? '', aud: state.momentAud ?? 'Everyone', photo: state.momentPhoto ? 'assets/img/progress/w5.jpg' : null, product: (MOMENT_PRODUCTS[t] ?? [])[0] };
    set({ moment: null, diary: [entry, ...(state.diary ?? [])] });
    toast(entry.aud === 'Only me' ? 'Saved to your diary' : 'Posted to your page diary');
  },
  reset: () => { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } state = defaultState(); go('for-you'); render(); toast('Demo data reset'); },
};

// Signed in: Claude answers through /api/ask. Otherwise (or if it fails), canned demo replies.
async function askDewSend(q) {
  if (!q || !q.trim()) return;
  const question = q.trim();
  const history = [...state.chat, { me: true, text: question }];
  if (!currentUser()) {
    const hit = ASK_DEW_REPLIES.find(([re]) => re.test(question));
    const reply = hit ? hit[1] : 'Good question. People with your skin who tracked this for 4+ weeks mostly kept their routine simple: one new product at a time, two weeks apart.';
    set({ askOpen: true, chat: [...history, { me: false, text: reply }] });
    return;
  }
  set({ askOpen: true, chat: [...history, { me: false, text: '…', pending: true }] });
  const a = state.answers;
  const profile = {
    skinType: a.skinType?.[0], concerns: a.concerns, goals: a.goals, location: a.location?.[0],
    climate: a.climate && `${a.climate.humidity.label.toLowerCase()} (${a.climate.humidity.value}% humidity), ${a.climate.uv.label.toLowerCase()}, ${a.climate.dryness.label.toLowerCase()}`,
    shelf: shelfIds().map((id) => `${P(id).brand} ${P(id).name}${P(id).step ? ` (${P(id).step})` : ''}`),
  };
  let reply;
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${await accessToken()}` },
      body: JSON.stringify({ messages: history.filter((m) => !m.pending).map((m) => ({ role: m.me ? 'user' : 'assistant', content: m.text })), profile }),
    });
    const data = await res.json();
    reply = data.reply ?? data.error ?? 'Dew couldn’t answer just now. Try again.';
  } catch {
    reply = 'Dew couldn’t answer just now. Check your connection and try again.';
  }
  set({ chat: [...history, { me: false, text: reply }] });
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  if (el.classList.contains('scrim') && e.target.closest('[data-stop]')) return;
  const fn = actions[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'A' && el.dataset.act === 'toast') e.preventDefault();
  fn({ ...el.dataset });
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  const fd = new FormData(form);
  const q = fd.get('q') || '';
  if (form.dataset.form === 'cr-search') { const k = form.dataset.key; set({ cr: { ...state.cr, [k]: { ...(state.cr?.[k] ?? {}), q, limit: 5 } } }); return; }
  if (form.dataset.form === 'rec-note') { const note = String(fd.get('note') || '').trim(); set({ editNote: null, myPage: { ...state.myPage, notes: { ...state.myPage?.notes, [form.dataset.id]: note } } }); toast('Note saved to your public page'); return; }
  if (form.dataset.form === 'page-announce') { set({ myPage: { ...state.myPage, announcement: String(fd.get('text') || '').trim() } }); toast('Announcement posted'); return; }
  if (form.dataset.form === 'search') {
    const id = pickedSuggestion() ?? productFromQuery(q);
    closeSuggest();
    form.querySelector('input')?.blur();
    if (id) go(`product/${id}`); else { set({ lastSearch: q, searchPages: 1 }); go('search'); }
  }
  if (form.dataset.form === 'shelf-add') shelfAddFromQuery(form, q);
  if (form.dataset.form === 'location') lookUpClimate(q);
  if (form.dataset.form === 'ask') askDewSend(q);
  if (form.dataset.form === 'reviews-search') set({ rv: { ...state.rv, q: q.trim(), limit: 20 } });
  if (form.dataset.form === 'signup' || form.dataset.form === 'login') submitAuth(form.dataset.form, fd);
});

const AUTH_ERRORS = {
  'Invalid login credentials': 'That email and password don’t match an account.',
  'Email not confirmed': 'Confirm your email first: open the link we sent you, then log in.',
  'User already registered': 'There’s already an account with that email. Try logging in.',
};

async function submitAuth(kind, fd) {
  set({ authBusy: true, authError: '', authNotice: '' });
  try {
    if (kind === 'signup') {
      const { needsConfirmation } = await signUp({ email: fd.get('email'), password: fd.get('password'), firstName: fd.get('first_name') });
      if (needsConfirmation) set({ authBusy: false, authNotice: `Check ${fd.get('email')} for a link to confirm your account. It opens your skin profile.` });
    } else {
      await signIn({ email: fd.get('email'), password: fd.get('password') });
    }
  } catch (err) {
    set({ authBusy: false, authError: AUTH_ERRORS[err.message] ?? err.message });
  }
}

// Signing in loads that account's saved state; a brand-new account starts onboarding.
async function onAuthChange(event, user) {
  if (user) {
    const saved = await loadAppState();
    state = saved ? migrate({ ...defaultState(), ...saved }) : newAccountState();
    state.authBusy = false; state.authError = ''; state.authNotice = '';
    save();
    go(saved ? 'for-you' : 'setup/1');
    render();
  } else {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    state = defaultState();
    go('welcome');
    render();
  }
}

document.addEventListener('change', (e) => {
  if (e.target.closest('[data-form="location"]')) lookUpClimate(e.target.value);
  const key = { 'rv-product': 'product', 'rv-rating': 'rating', 'rv-sort': 'sort' }[e.target.dataset.change];
  if (key) set({ rv: { ...state.rv, [key]: e.target.value, limit: 20 } });
  if (e.target.dataset.change === 'cr-filter') { const k = e.target.dataset.key; set({ cr: { ...state.cr, [k]: { ...(state.cr?.[k] ?? {}), [e.target.dataset.f]: e.target.value, limit: 5 } } }); }
  if (e.target.dataset.input === 'page-blurb') { state.myPage = { ...state.myPage, blurb: e.target.value }; save(); }
});

document.addEventListener('input', (e) => {
  if (e.target.dataset.input === 'ci-note') { state.checkin.note = e.target.value; save(); }
  if (e.target.dataset.input === 'moment-text') { state.momentText = e.target.value; save(); }
  if (e.target.dataset.input === 'page-blurb') {
    state.myPage = { ...state.myPage, blurb: e.target.value }; save();
    document.querySelectorAll('.page-preview .page-blurb').forEach((el) => { el.textContent = e.target.value; });
    const c = e.target.parentElement.querySelector('.blurb-count'); if (c) c.textContent = `${e.target.value.length} / 200`;
  }
  if (e.target.matches('[data-suggest]')) suggestFor(e.target);
});

/* Product search dropdown for the top search bar and the shelf step. Dew's own list instead of
   the browser's suggestion list, which only shows a product when the typed text appears in it
   word for word ("body shop satsuma" hid "Body Shop · Satsuma Hand Cream"). Every typed word
   just has to appear somewhere in the brand or name, and the whole 18k-product catalog is searched.
   Inputs opt in with data-suggest="shelf" (pick = add to shelf) or "search" (pick = open product). */
const queryWords = (q) => String(q).toLowerCase().replace(/[·,]/g, ' ').split(/\s+/).filter(Boolean);
const matchesWords = (label, words) => words.every((w) => label.toLowerCase().includes(w));
let suggestHits = [];
let suggestActive = -1;
let suggestTimer;
let suggestSeq = 0;

async function catalogMatches(q) {
  const words = queryWords(q);
  if (!words.length) return [];
  const r = await fetch(`/api/products?q=${encodeURIComponent(words.join(' '))}`);
  const api = r.ok ? remember(await r.json()).map((p) => p.id) : [];
  // Dew's own sample products first, then the catalog in its ranked order.
  const local = Object.keys(PRODUCTS).filter((id) => matchesWords(`${P(id).brand} ${P(id).name}`, words));
  return [...new Set([...local, ...api])];
}

const suggestBox = (input) => input?.closest('form')?.querySelector('.suggest-box');

function drawSuggest(input, q) {
  const box = suggestBox(input);
  if (!box) return;
  const open = q.trim().length >= 2;
  input.setAttribute('aria-expanded', String(open));
  box.classList.toggle('open', open);
  if (!open) { box.innerHTML = ''; return; }
  const shelf = input.dataset.suggest === 'shelf';
  const onShelf = new Set(shelfIds());
  const item = (id, i) => {
    const inner = `${thumb(id, 36, 36)}<span class="grow"><span class="xs muted">${esc(P(id).brand)}</span><span class="suggest-name">${esc(P(id).name)}</span></span>${shelf && onShelf.has(id) ? '<span class="xs muted">On shelf ✓</span>' : ''}`;
    const cls = `suggest-item ${i === suggestActive ? 'active' : ''}`;
    return shelf
      ? `<button type="button" role="option" class="${cls}" data-act="shelf-add" data-id="${esc(id)}">${inner}</button>`
      : `<a role="option" class="${cls}" href="#/product/${esc(id)}">${inner}</a>`;
  };
  const all = shelf ? '' : `<button type="submit" class="suggest-all xs">See all results for “${esc(q.trim())}” →</button>`;
  box.innerHTML = suggestHits.length
    ? suggestHits.slice(0, 8).map(item).join('') + all
    : `<div class="xs muted suggest-empty">No products match “${esc(q.trim())}”. Try fewer words or just the brand.</div>${all}`;
}

function suggestFor(input) {
  clearTimeout(suggestTimer);
  suggestActive = -1;
  const value = input.value;
  if (value.trim().length < 2) { suggestHits = []; drawSuggest(input, value); return; }
  const seq = ++suggestSeq;
  suggestTimer = setTimeout(async () => {
    try {
      const hits = await catalogMatches(value);
      if (seq !== suggestSeq) return; // a newer keystroke is already searching
      suggestHits = hits;
      drawSuggest(input, value);
    } catch (err) { /* keep the current suggestions */ }
  }, 180);
}

// The highlighted suggestion, if the arrow keys picked one.
const pickedSuggestion = () => suggestHits[suggestActive];
const closeSuggest = () => { clearTimeout(suggestTimer); suggestSeq++; suggestHits = []; suggestActive = -1; };

// Shelf "Add" or Enter: the highlighted suggestion, else an exact name, else the best match.
async function shelfAddFromQuery(form, q) {
  if (!q.trim()) return;
  let id = pickedSuggestion() ?? productFromQuery(q);
  if (!id) {
    clearTimeout(suggestTimer);
    try { id = (await catalogMatches(q))[0]; } catch (err) { /* handled below */ }
  }
  if (id) { closeSuggest(); form.reset(); addToShelf(id); } else toast(`No product matches “${q.trim()}”. Try fewer words or just the brand.`);
}

document.addEventListener('keydown', (e) => {
  if (!e.target.matches?.('[data-suggest]')) return;
  if (e.key === 'Escape') { closeSuggest(); drawSuggest(e.target, ''); return; }
  if (!suggestHits.length) return;
  const n = Math.min(suggestHits.length, 8);
  if (e.key === 'ArrowDown') { e.preventDefault(); suggestActive = (suggestActive + 1) % n; drawSuggest(e.target, e.target.value); }
  if (e.key === 'ArrowUp') { e.preventDefault(); suggestActive = (suggestActive - 1 + n) % n; drawSuggest(e.target, e.target.value); }
});
// Keep the box focused while a suggestion is clicked; close the list when focus leaves.
document.addEventListener('mousedown', (e) => { if (e.target.closest('.suggest-box')) e.preventDefault(); });
document.addEventListener('click', (e) => { if (e.target.closest('a.suggest-item')) { closeSuggest(); document.activeElement?.blur?.(); } });
document.addEventListener('focusout', (e) => { if (e.target.matches?.('[data-suggest]')) setTimeout(() => drawSuggest(e.target, ''), 150); });
document.addEventListener('focusin', (e) => { if (e.target.matches?.('[data-suggest]') && e.target.value.trim().length >= 2) suggestFor(e.target); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (state.compare || state.why || state.moment) set({ compare: null, why: null, moment: null }); else if (state.askOpen) set({ askOpen: false }); else if (state.shelfOpen) set({ shelfOpen: null }); }
});

window.addEventListener('hashchange', () => {
  // Each product page starts filtered to your skin type, showing the first 10 reviews.
  if (route().startsWith('product/')) state = { ...state, reviewSkin: undefined, reviewLimit: 10 };
  // A creator page (or your public page) always opens on All products with nothing selected.
  if (/^(creators\/|people\/|profile\/public)/.test(route())) state = { ...state, pageTab: {}, pageShelfOpen: {}, cr: {} };
  state = { ...state, compare: null, why: null };
  // Keep a notice that sent you to sign-up or log-in (e.g. "create an account to save products").
  state = { ...state, authError: '', authNotice: ['signup', 'login'].includes(route()) ? state.authNotice : '' };
  render();
  document.querySelectorAll('.col').forEach((c) => { c.scrollTop = 0; });
});
onData(render);
initAuth(onAuthChange).then(async (user) => {
  if (user) {
    const saved = await loadAppState();
    if (saved) state = migrate({ ...defaultState(), ...saved });
  }
  render();
});
