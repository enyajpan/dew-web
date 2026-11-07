// Suggests brand-site product pages for catalog products that have no review
// source yet, by matching names against each Shopify store's public product list.
//   node scripts/find-sources.js            -> prints suggestions
//   node scripts/find-sources.js --write    -> also appends confident matches to scraper/sources.json
import { readFile, writeFile } from 'node:fs/promises';
import { PRODUCTS } from '../js/data.js';
import { fetchJson } from '../scraper/http.js';

// Official US storefronts per brand (Shopify unless noted).
const STORES = {
  Innisfree: ['us.innisfree.com'],
  Goodal: ['goodal.com', 'goodalglobal.com'],
  Anua: ['anua.us', 'anuaskin.com'],
  'Beauty of Joseon': ['beautyofjoseon.com'],
  DRMTLGY: ['drmtlgy.com'],
  Torriden: ['torriden.us', 'torriden.com'],
  Biodance: ['biodance.com'],
  'Tower 28': ['tower28beauty.com'],
  Farmacy: ['farmacybeauty.com'],
  COSRX: ['www.cosrx.com', 'cosrx.com'],
  Bubble: ['hellobubble.com'],
  numbuzin: ['numbuzin.us', 'numbuzin.com'],
  'Summer Fridays': ['summerfridays.com'],
};

const SKIP = /mini|travel|trial|sample|set|duo|trio|kit|bundle|refill|jumbo|gift|value|amazon|^es-|^au-/i;
const words = (s) => s.toLowerCase().replace(/[^a-z0-9+ ]+/g, ' ').split(/\s+/).filter((w) => w.length > 1);

function score(name, title) {
  const a = new Set(words(name));
  const b = new Set(words(title));
  const hit = [...a].filter((w) => b.has(w)).length;
  return hit / Math.max(a.size, 1) - 0.02 * Math.max(0, b.size - a.size);
}

async function storeProducts(domain) {
  const all = [];
  for (let page = 1; page <= 4; page++) {
    const { products } = await fetchJson(`https://${domain}/products.json?limit=250&page=${page}`);
    if (!products?.length) break;
    all.push(...products);
  }
  return all;
}

const sourcesFile = new URL('../scraper/sources.json', import.meta.url);
const sources = JSON.parse(await readFile(sourcesFile, 'utf8'));
const covered = new Set(sources.map((s) => s.product_id));
const added = [];

for (const [brand, domains] of Object.entries(STORES)) {
  const wanted = Object.entries(PRODUCTS).filter(([id, p]) => p.brand === brand && !covered.has(id));
  if (!wanted.length) continue;
  let domain; let catalog = [];
  for (const d of domains) {
    try { catalog = await storeProducts(d); domain = d; if (catalog.length) break; } catch (e) { console.log(`  ${d}: ${e.message}`); }
  }
  if (!catalog.length) { console.log(`✗ ${brand}: no public product list found`); continue; }
  for (const [id, p] of wanted) {
    const best = catalog
      .filter((c) => !SKIP.test(c.handle) && !SKIP.test(c.title))
      .map((c) => ({ c, s: score(p.name, c.title) }))
      .sort((x, y) => y.s - x.s)[0];
    const ok = best && best.s >= 0.6;
    console.log(`${ok ? '✓' : '?'} ${id.padEnd(16)} ${p.name.padEnd(42)} → ${best ? `${best.c.title} (${best.s.toFixed(2)})` : 'none'}`);
    if (ok) added.push({ product_id: id, retailer: brand.toLowerCase().replace(/[^a-z0-9]/g, ''), url: `https://${domain}/products/${best.c.handle}` });
  }
}

if (process.argv.includes('--write') && added.length) {
  await writeFile(sourcesFile, `${JSON.stringify([...sources, ...added], null, 2)}\n`);
  console.log(`\nAdded ${added.length} sources to scraper/sources.json`);
}
