// Builds data/skincare-catalog.csv: every skincare product we can find across big
// retailers and brand sites, so the DEW catalog can be cross-checked for gaps.
// Products only (names, brands, prices, photos), no reviews. Same polite fetching as
// the review scraper: our own user agent, robots.txt, and 3 seconds between requests to a host.
//
//   node scripts/build-catalog.js                 all sources
//   node scripts/build-catalog.js --only ulta,obf  some sources
//
// Sources
//   ulta     Ulta Beauty: each brand's skin care page (brand list from Ulta's own sitemap)
//   dermstore Dermstore: product sitemap; brand matched against brands found elsewhere
//   shopify  Retailers and brand stores on Shopify (Credo, Soko Glam, Peach & Lily, brand sites)
//   obf      Open Beauty Facts, the open product database (ODbL licence)
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { politeFetch, BlockedError } from '../scraper/http.js';

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const want = (s) => !only || only.includes(s);
const log = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);

/* ---------- skincare filter ---------- */

// Checked in order; the first match is the product's category.
const CATEGORIES = [
  ['Sunscreen', /\bspf\b|sunscreen|sun ?screen|sun (cream|milk|fluid|stick|serum|essence|gel|lotion)|uv (defen|shield|protect)/],
  ['Eye care', /\beye (cream|serum|gel|balm|mask|patch|treatment|concentrate|contour)|under[- ]eye|eye patches/],
  ['Lip care', /\blip (balm|mask|treatment|scrub|serum|sleeping|butter|therapy)/],
  ['Cleanser', /cleans|face wash|facial wash|foaming wash|micellar|makeup remover|cleansing (balm|oil|water)/],
  ['Exfoliant', /exfoli|\bscrub\b|\bpeel\b|peeling|\baha\b|\bbha\b|glycolic|salicylic|resurfac/],
  ['Mask', /\bmask\b|\bmasque\b|sheet mask|sleeping pack|wash[- ]off pack/],
  ['Toner + essence', /\btoner\b|\btonic\b|\bessence\b|face mist|facial mist|facial spray|toner pad|\bpads?\b/],
  ['Serum + treatment', /serum|ampoule|ampule|concentrate|\bdrops\b|booster|retin|treatment|spot (gel|patch|treat)|pimple patch|acne patch|niacinamide|vitamin c|hyaluronic/],
  ['Face oil', /face oil|facial oil|\boil\b.*\bface\b|rosehip oil|squalane/],
  ['Moisturizer', /moistur|\bcream\b|\bcrème\b|\bcreme\b|lotion|emulsion|gel[- ]cream|water cream|day cream|night cream|\bbalm\b|hydrator|hydrating gel/],
  ['Body care', /body (lotion|wash|oil|cream|butter|scrub|serum|mist)|hand cream|foot cream|deodorant/],
];
// Makeup, hair, fragrance, tools and merch are left out.
const EXCLUDE = /foundation|concealer|mascara|eyeliner|eye liner|lipstick|lip gloss|\bgloss\b|lip liner|lip stain|lip tint|blush|bronzer|highlighter|eyeshadow|eye shadow|palette|\bbrow|\blash|primer|setting (spray|powder)|pressed powder|loose powder|\bnail|polish|shampoo|conditioner|\bhair|scalp|dry shampoo|fragrance|perfume|parfum|eau de|cologne|candle|gift card|e-gift|\bbrush|sponge|\btool\b|tote|pouch|bag\b|keychain|\bmerch|sweatshirt|t-shirt|\bmirror|razor|toothpaste|mouthwash|supplement|gummies|capsules|vitamins for|\bdevice\b|led mask|wand|dermaplan|gua sha|roller|headband|refill bottle|empty|tester|sample card|cosmetic bag/;

export function categorize(...texts) {
  const t = texts.filter(Boolean).join(' ').toLowerCase();
  if (EXCLUDE.test(t)) return null;
  return CATEGORIES.find(([, re]) => re.test(t))?.[0] ?? null;
}

/* ---------- output ---------- */

const products = new Map(); // normalized brand|name -> row
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '’').trim();
const counts = {};

function add(row) {
  const brand = clean(row.brand);
  const name = clean(row.name);
  if (!name) return;
  const category = row.category ?? categorize(name, row.type);
  if (!category) return;
  const key = `${norm(brand)}|${norm(name)}`;
  counts[row.retailer] = (counts[row.retailer] ?? 0) + 1;
  const had = products.get(key);
  if (had) {
    if (!had.retailers.includes(row.retailer)) had.retailers.push(row.retailer);
    had.price_usd ||= row.price_usd ?? '';
    had.image_url ||= row.image_url ?? '';
    had.rating ||= row.rating ?? '';
    had.review_count ||= row.review_count ?? '';
    return;
  }
  products.set(key, {
    brand, name, category, retailers: [row.retailer], price_usd: row.price_usd ?? '', rating: row.rating ?? '',
    review_count: row.review_count ?? '', url: row.url ?? '', image_url: row.image_url ?? '',
  });
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

function writeCsv(dewNames) {
  const rows = [...products.values()].sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
  const header = ['brand', 'product_name', 'category', 'sold_at', 'price_usd', 'rating', 'review_count', 'in_dew_catalog', 'url', 'image_url'];
  const lines = rows.map((r) => [
    r.brand, r.name, r.category, r.retailers.join('; '), r.price_usd, r.rating, r.review_count,
    dewNames.has(`${norm(r.brand)}|${norm(r.name)}`) ? 'yes' : 'no', r.url, r.image_url,
  ].map(csvCell).join(','));
  mkdirSync('data', { recursive: true });
  writeFileSync('data/skincare-catalog.csv', `${header.join(',')}\n${lines.join('\n')}\n`);
  return rows;
}

/* ---------- Ulta: one page per brand's skin care ---------- */

const decodeJson = (s) => s.replace(/\\u002F/g, '/').replace(/\\"/g, '"').replace(/\\u0026/g, '&');

async function ulta() {
  const xml = await (await politeFetch('https://www.ulta.com/l/brand_filter_sitemap.xml', { accept: 'application/xml' })).text();
  const pages = [...xml.matchAll(/<loc>([^<]+category=skin-care)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  log(`ulta: ${pages.length} brand skin care pages`);
  for (const [i, url] of pages.entries()) {
    try {
      let page = 1;
      let total = Infinity;
      let seen = 0;
      while (seen < total && page <= 20) {
        const html = await (await politeFetch(page === 1 ? url : `${url}&page=${page}`)).text();
        total = Number(html.match(/"resultCount":(\d+)/)?.[1] ?? 0);
        const before = seen;
        // Each product card's data: name, price, rating and reviews, then its id, photo and brand.
        for (const m of html.matchAll(/"productName":"((?:[^"\\]|\\.)+)","priceLabel":"[^"]*","rating":([\d.]+|null),"reviewCount":(\d+|null),"listPrice":"([^"]*)"[\s\S]{0,6000}?"productId":"(\w+)"[\s\S]{0,300}?"imageUrl":"([^"]+)"[\s\S]{0,1500}?"brandName":"((?:[^"\\]|\\.)+)"/g)) {
          const [, name, rating, reviews, price, id, img, brand] = m;
          seen++;
          add({
            retailer: 'Ulta', brand: decodeJson(brand), name: decodeJson(name), category: categorize(decodeJson(name)) ?? 'Skin care (other)',
            price_usd: price.match(/[\d.]+/)?.[0] ?? '', rating: rating === 'null' ? '' : rating, review_count: reviews === 'null' ? '' : reviews,
            url: `https://www.ulta.com/p/${norm(decodeJson(name)).replace(/ /g, "-")}-${id}`, image_url: decodeJson(img),
          });
        }
        if (seen === before) break;
        page++;
      }
    } catch (e) {
      log(`ulta ✗ ${url}: ${e.message}`);
      if (e instanceof BlockedError && e.status === 429) break;
    }
    if (i % 50 === 0) log(`ulta: ${i + 1}/${pages.length} brands, ${counts.Ulta ?? 0} products`);
  }
}

/* ---------- Shopify stores ---------- */

const SHOPIFY = {
  // multi-brand retailers
  'credobeauty.com': 'Credo Beauty', 'sokoglam.com': 'Soko Glam', 'peachandlily.com': 'Peach & Lily', 'www.thedetoxmarket.com': 'The Detox Market',
  'www.follain.com': 'Follain', 'wishtrend.com': 'Wishtrend', 'www.beautybay.com': 'Beauty Bay',
  // brand stores
  'www.glowrecipe.com': 'Glow Recipe', 'www.summerfridays.com': 'Summer Fridays', 'byoma.com': 'BYOMA', 'www.lovekinship.com': 'Kinship', 'hellobubble.com': 'Bubble',
  'mytopicals.com': 'Topicals', 'starface.world': 'Starface', 'peaceoutskincare.com': 'Peace Out', 'kravebeauty.com': 'KraveBeauty', 'www.youthtothepeople.com': 'Youth To The People',
  'www.herbivorebotanicals.com': 'Herbivore', 'versedskin.com': 'Versed', 'supergoop.com': 'Supergoop!', 'naturium.com': 'Naturium', 'www.theinkeylist.com': 'The INKEY List',
  'www.rhodeskin.com': 'rhode', 'www.tower28beauty.com': 'Tower 28', 'www.iliabeauty.com': 'ILIA', 'www.farmacybeauty.com': 'Farmacy', 'biossance.com': 'Biossance',
  'www.cosrx.com': 'COSRX', 'beautyofjoseon.com': 'Beauty of Joseon', 'anua.us': 'Anua', 'roundlab.us': 'Round Lab', 'skin1004.com': 'SKIN1004', 'medicube.us': 'medicube',
  'www.heroCosmetics.com': 'Hero Cosmetics', 'sundayriley.com': 'Sunday Riley', 'www.drunkelephant.com': 'Drunk Elephant', 'www.tatcha.com': 'Tatcha', 'www.olehenriksen.com': 'Ole Henriksen',
  'www.paulaschoice.com': 'Paula’s Choice', 'www.firstaidbeauty.com': 'First Aid Beauty', 'www.murad.com': 'Murad', 'www.dermalogica.com': 'Dermalogica', 'www.kiehls.com': 'Kiehl’s',
  'www.freshbeauty.com': 'fresh', 'www.laneige.com': 'Laneige', 'www.sulwhasoo.com': 'Sulwhasoo', 'us.drjart.com': 'Dr. Jart+', 'www.innisfree.com': 'innisfree',
  'eadem.co': 'Eadem', 'www.biodance.com': 'Biodance', 'www.kosas.com': 'Kosas', 'www.saiehello.com': 'Saie', 'www.merit.com': 'Merit', 'www.glossier.com': 'Glossier',
  'www.solawave.co': 'Solawave', 'www.osea.com': 'OSEA', 'www.drdennisgross.com': 'Dr. Dennis Gross', 'www.pca-skin.com': 'PCA Skin', 'www.vintnersdaughter.com': 'Vintner’s Daughter',
  'www.kateSomerville.com': 'Kate Somerville', 'www.peterthomasroth.com': 'Peter Thomas Roth', 'www.mariobadescu.com': 'Mario Badescu', 'www.boscia.com': 'boscia', 'www.bliss.com': 'Bliss',
  'www.pixibeauty.com': 'Pixi', 'www.cocokind.com': 'cocokind', 'www.thayers.com': 'Thayers', 'www.acure.com': 'Acure', 'www.alpynbeauty.com': 'Alpyn Beauty', 'www.skinfix.com': 'Skinfix',
  'www.bybi.com': 'BYBI', 'www.alleyoop.com': 'Alleyoop', 'www.bondiboost.com': 'Bondi Sands', 'www.unseensunscreen.com': 'Supergoop!', 'www.blackgirlsunscreen.com': 'Black Girl Sunscreen',
  'www.sunbum.com': 'Sun Bum', 'www.coola.com': 'COOLA', 'www.isntree.com': 'Isntree', 'www.purito.com': 'Purito', 'www.torriden.us': 'Torriden', 'www.mixsoon.us': 'mixsoon',
  'www.numbuzin.com': 'numbuzin', 'www.goodal.com': 'Goodal', 'www.axis-y.com': 'AXIS-Y', 'www.haruharuwonder.com': 'Haruharu Wonder', 'www.klairscosmetics.com': 'Klairs',
  'www.elfcosmetics.com': 'e.l.f.', 'www.bubbleskincare.com': 'Bubble', 'www.thebodyshop.com': 'The Body Shop', 'www.youngking.com': 'Youngking', 'www.ritual.com': 'Ritual',
  'www.goodmolecules.com': 'Good Molecules', 'www.minimalist.co': 'Minimalist', 'www.deciem.com': 'DECIEM', 'www.wishfulskin.com': 'Wishful', 'www.florencebymills.com': 'florence by mills',
  'www.laroche-posay.us': 'La Roche-Posay', 'www.cerave.com': 'CeraVe', 'www.neutrogena.com': 'Neutrogena', 'www.cetaphil.com': 'Cetaphil', 'www.vanicream.com': 'Vanicream',
  'www.aveeno.com': 'Aveeno', 'www.differin.com': 'Differin', 'www.olay.com': 'Olay', 'www.eucerinus.com': 'Eucerin', 'www.aquaphorus.com': 'Aquaphor', 'www.bioderma.us': 'Bioderma',
  'www.avene.us': 'Avène', 'www.vichyusa.com': 'Vichy', 'www.caudalie.com': 'Caudalie', 'www.clarinsusa.com': 'Clarins', 'www.shiseido.com': 'Shiseido', 'www.clinique.com': 'Clinique',
  'www.esteelauder.com': 'Estée Lauder', 'www.lancome-usa.com': 'Lancôme', 'www.origins.com': 'Origins', 'www.elemis.com': 'ELEMIS', 'www.augustinusbader.com': 'Augustinus Bader',
  'www.drbarbarasturm.com': 'Dr. Barbara Sturm', 'www.111skin.com': '111SKIN', 'www.zo-skinhealth.com': 'ZO Skin Health', 'www.skinceuticals.com': 'SkinCeuticals', 'www.obagi.com': 'Obagi',
  'www.ourteenageskin.com': 'Teenage Skin', 'www.typology.com': 'Typology', 'www.dieux.com': 'Dieux', 'www.joannavargas.com': 'Joanna Vargas', 'www.ursamajorvt.com': 'Ursa Major',
  'www.necessaire.com': 'Nécessaire', 'www.experiencesoft.com': 'Soft Services', 'www.wearecarebrands.com': 'Care', 'www.hydropeptide.com': 'HydroPeptide', 'www.sio-beauty.com': 'SiO Beauty',
};

async function shopifyStore(domain, label) {
  let n = 0;
  for (let page = 1; page <= 40; page++) {
    const res = await politeFetch(`https://${domain}/products.json?limit=250&page=${page}`, { accept: 'application/json' });
    if (!(res.headers.get('content-type') ?? '').includes('json')) return n;
    const { products: items = [] } = await res.json();
    if (!items.length) break;
    for (const p of items) {
      const tags = Array.isArray(p.tags) ? p.tags.join(' ') : p.tags;
      const category = categorize(p.title, p.product_type, tags.match(/skin ?care|face|serum|moistur|cleans|spf|sunscreen|toner|mask/i)?.[0]);
      if (!category) continue;
      n++;
      add({
        retailer: label, brand: p.vendor || label, name: p.title, category, price_usd: p.variants?.[0]?.price ?? '',
        url: `https://${domain}/products/${p.handle}`, image_url: p.images?.[0]?.src ?? '',
      });
    }
  }
  return n;
}

async function shopify() {
  const queue = Object.entries(SHOPIFY);
  // Different hosts run side by side; each host still gets one request every 3 seconds.
  await Promise.all(Array.from({ length: 12 }, async () => {
    while (queue.length) {
      const [domain, label] = queue.shift();
      try { log(`shopify ${label}: ${await shopifyStore(domain, label)} skincare products`); } catch (e) { log(`shopify ${label} skipped: ${e.message}`); }
    }
  }));
}

/* ---------- Dermstore: product sitemap ---------- */

async function dermstore(brands) {
  const index = await (await politeFetch('https://www.dermstore.com/sitemapindex-product.xml.gz', { accept: 'application/xml' })).arrayBuffer();
  const maps = [...unzip(Buffer.from(index)).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  // Longest known brand name that starts the URL slug, e.g. "la-roche-posay-toleriane-..." -> La Roche-Posay
  const bySlug = [...brands].map((b) => [norm(b).replace(/ /g, '-'), b]).filter(([s]) => s.length > 1).sort((a, b) => b[0].length - a[0].length);
  for (const m of maps) {
    const xml = unzip(Buffer.from(await (await politeFetch(m, { accept: 'application/xml' })).arrayBuffer()));
    for (const [, url, slug] of xml.matchAll(/<loc>(https:\/\/www\.dermstore\.com\/p\/([^/]+)\/\d+\/)<\/loc>/g)) {
      const s = slug.replace(/-\d+(ml|g|oz|fl-oz|pc|pack)$/, '').replace(/-(\d+-)?\d+(ml|g|oz|fl-oz)(-[\w-]+)?$/, '');
      const hit = bySlug.find(([b]) => s.startsWith(`${b}-`));
      const rest = hit ? s.slice(hit[0].length + 1) : s;
      const name = rest.split('-').map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
      add({ retailer: 'Dermstore', brand: hit?.[1] ?? '', name, url });
    }
  }
}

/* ---------- Open Beauty Facts ---------- */

async function openBeautyFacts() {
  const res = await politeFetch('https://static.openbeautyfacts.org/data/en.openbeautyfacts.org.products.csv.gz', { accept: '*/*' });
  const text = unzip(Buffer.from(await res.arrayBuffer()));
  const lines = text.split('\n');
  const head = lines[0].split('\t');
  const col = (k) => head.indexOf(k);
  const [iName, iBrand, iCats, iCountries, iImg, iCode] = ['product_name', 'brands_en','categories_en', 'countries_en', 'image_url', 'code'].map(col);
  for (const line of lines.slice(1)) {
    const f = line.split('\t');
    const cats = f[iCats] ?? '';
    if (!/skin|face|facial|sun|cleans|moistur|serum|cream|toner|mask|lotion/i.test(cats)) continue;
    const brand = (f[iBrand] ?? '').split(',')[0];
    if (!brand || !f[iName]) continue;
    add({
      retailer: 'Open Beauty Facts', brand, name: f[iName], category: categorize(f[iName], cats), url: `https://world.openbeautyfacts.org/product/${f[iCode]}`,
      image_url: f[iImg] ?? '',
    });
  }
}

/* ---------- run ---------- */

// Some servers send sitemaps already decompressed even when the file ends in .gz.
function unzip(buf) { return (buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf).toString(); }

// --merge starts from the existing CSV, so one source can be re-run without the rest.
function loadExisting() {
  const [head, ...lines] = readFileSync('data/skincare-catalog.csv', 'utf8').trim().split('\n');
  const cols = head.split(',');
  for (const line of lines) {
    const cells = [...line.matchAll(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)].map((m) => m[1].replace(/^"|"$/g, '').replace(/""/g, '"'));
    const r = Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? '']));
    for (const retailer of r.sold_at.split('; ')) add({ ...r, name: r.product_name, retailer });
  }
  log(`merged ${products.size} products from the existing CSV`);
}
if (args.includes('--merge') && existsSync('data/skincare-catalog.csv')) loadExisting();

const dewNames = new Set();
if (existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) { const m = l.match(/^(\w+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}
if (process.env.SUPABASE_URL) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/products?select=brand,name`, { headers: { apikey: process.env.SUPABASE_ANON_KEY } });
  for (const p of await r.json()) dewNames.add(`${norm(p.brand)}|${norm(p.name)}`);
}

const jobs = [];
if (want('ulta')) jobs.push(ulta().catch((e) => log(`ulta failed: ${e.message}`)));
if (want('shopify')) jobs.push(shopify());
if (want('obf')) jobs.push(openBeautyFacts().catch((e) => log(`open beauty facts failed: ${e.message}`)));
const save = setInterval(() => writeCsv(dewNames), 60000);
await Promise.all(jobs);
if (want('dermstore')) {
  await dermstore(new Set([...products.values()].map((p) => p.brand).filter(Boolean))).catch((e) => log(`dermstore failed: ${e.message}`));
}
clearInterval(save);
const rows = writeCsv(dewNames);
log('per source:', counts);
log(`${rows.length} unique products from ${new Set(rows.map((r) => r.brand)).size} brands → data/skincare-catalog.csv`);
