// Imports every skincare product from the brand stores in scraper/stores.json
// (public Shopify product lists) into Supabase as products + review sources.
//   node scripts/import-catalog.js            -> import
//   node scripts/import-catalog.js --dry-run  -> print what would be imported
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fetchJson, politeFetch } from '../scraper/http.js';

if (existsSync('.env')) process.loadEnvFile('.env');
const dryRun = process.argv.includes('--dry-run');

// A listing's page is live if it loads without redirecting somewhere else.
async function isLive(url) {
  try {
    const res = await politeFetch(url);
    await res.body?.cancel();
    return new URL(res.url).pathname.replace(/\/$/, '') === new URL(url).pathname;
  } catch {
    return false;
  }
}

// Not single skincare products, or not skincare at all.
const EXCLUDE = /gift ?card|e-?gift|bundle|\bsets?\b|\bkit\b|\bduo\b|\btrio\b|\bminis?\b|travel|trial|sample|refill|insert|jumbo|value|collection|routine|merch|swag|tote|bag|pouch|keychain|case|mirror|phone|book|accessor|\bhat\b|hoodie|shirt|sticker|candle|perfume|fragrance|supplement|foundation|concealer|blush|bronzer|mascara|liner|brow|highlight|lipstick|lip ?gloss|lip ?tint|lip makeup|lip jelly|tint|eyeshadow|shadow|shimmer|palette|brush|sponge|puff|tool|claw|clip|headband|scrunchie|shipping|donation|\btest\b|-uk$|-eu$|-au$|-ca$|-global$|contour|shineon|lip oil jelly|soap saver|^gua sha$/i;
const SKINCARE = /clean|toner|tonic|serum|essence|ampoule|moistur|cream|lotion|gel|mask|pad|spf|sunscreen|sun |balm|oil|mist|spray|treatment|exfoli|peel|eye|retinol|acid|patch|lip|barrier|repair|skin|face|facial|hydrat|niacinamide|vitamin|peptide|cica|soothing|spot/i;

const STEPS = [
  ['Cleanse', /clean|wash|micellar|cleansing oil|balm cleanser/i],
  ['Protect', /spf|sunscreen|\bsun\b|uv/i],
  ['Eyes', /eye/i],
  ['Lips', /lip/i],
  ['Masks', /mask|patch/i],
  ['Tone', /toner|tonic|pad|mist|essence/i],
  ['Treat', /serum|ampoule|treatment|retinol|acid|peel|exfoli|spot|oil/i],
  ['Moisturize', /moistur|cream|lotion|gel|balm|barrier/i],
];
const stepFor = (text) => STEPS.find(([, re]) => re.test(text))?.[0] ?? null;

async function storeCatalog(domain) {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const { products } = await fetchJson(`https://${domain}/products.json?limit=250&page=${page}`);
    if (!products?.length) break;
    all.push(...products);
  }
  return all;
}

const stores = JSON.parse(await readFile(new URL('../scraper/stores.json', import.meta.url), 'utf8'));
const db = dryRun ? null : (await import('../scraper/store.js')).adminClient();

// Pages we already track, by retailer + Shopify handle (so anua.us and anua.com don't double up).
const tracked = new Set();
if (db) {
  const { data, error } = await db.from('review_sources').select('retailer, url');
  if (error) throw new Error(error.message);
  for (const s of data) tracked.add(`${s.retailer}:${new URL(s.url).pathname.split('/products/')[1]}`);
}

let total = 0;
for (const { domain, retailer, brand } of stores) {
  let catalog;
  try { catalog = await storeCatalog(domain); } catch (e) { console.log(`✗ ${brand}: ${e.message}`); continue; }

  const skincare = catalog.filter((p) => {
    const text = `${p.title} ${p.handle} ${p.product_type} ${(p.tags ?? []).join(' ')}`;
    return !EXCLUDE.test(`${p.title} ${p.handle} ${p.product_type}`) && SKINCARE.test(text);
  });

  // Stores often list one product several times (regional or size-variant pages, e.g.
  // "(25ml)", "4ea"), and some of those copies redirect to the home page. Keep one
  // listing per product: the first live page, trying unsized listings first.
  const sized = (t) => /\(\s*\d+\s*(ml|ea|g)\s*\)|\b\d+\s?ea\b/i.test(t);
  const groups = new Map();
  for (const p of skincare) {
    const key = p.title.toLowerCase().replace(/\(.*?\)|\b\d+\s?(ml|ea|g)\b|[^a-z0-9]/g, '');
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const picked = [];
  for (const listings of groups.values()) {
    if (listings.some((p) => tracked.has(`${retailer}:${p.handle}`))) continue;
    listings.sort((a, b) => sized(a.title) - sized(b.title));
    for (const p of listings) {
      if (await isLive(`https://${domain}/products/${p.handle}`)) { picked.push(p); break; }
    }
  }

  const products = picked.map((p) => ({
    id: `${retailer}-${p.handle}`.slice(0, 80),
    brand,
    name: p.title.trim(),
    step: stepFor(`${p.product_type} ${p.title}`),
    size: null,
    price_usd: p.variants?.[0]?.price ? Number(p.variants[0].price) : null,
    image_path: p.images?.[0]?.src ?? null,
  }));
  const sources = picked.map((p, i) => ({ product_id: products[i].id, retailer, url: `https://${domain}/products/${p.handle}` }));

  console.log(`${brand.padEnd(18)} ${String(catalog.length).padStart(4)} listed  ${String(picked.length).padStart(4)} skincare to import`);
  if (dryRun) { products.forEach((p) => console.log(`    ${p.step ?? '-'}  ${p.name}`)); continue; }

  let { error } = await db.from('products').upsert(products);
  if (error) throw new Error(error.message);
  ({ error } = await db.from('review_sources').upsert(sources, { onConflict: 'url', ignoreDuplicates: true }));
  if (error) throw new Error(error.message);
  total += picked.length;
}
if (!dryRun) console.log(`\nImported ${total} products.`);
