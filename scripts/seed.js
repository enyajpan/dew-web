// Upserts the app's product catalog (js/data.js) and the scraper's review
// sources (scraper/sources.json) into Supabase. Safe to re-run.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { PRODUCTS } from '../js/data.js';
import { adminClient } from '../scraper/store.js';

if (existsSync('.env')) process.loadEnvFile('.env');

// Products that have review sources but aren't in the prototype catalog yet.
const EXTRA_PRODUCTS = {
  eadem_cloud_cushion: { brand: 'Eadem', name: 'Cloud Cushion Moisturizer', step: 'Moisturize', size: '50 ml', price: 44 },
};

const db = adminClient();
const catalog = { ...PRODUCTS, ...EXTRA_PRODUCTS };
const products = Object.entries(catalog).map(([id, p]) => ({
  id,
  brand: p.brand,
  name: p.name,
  step: p.step ?? null,
  size: p.size ?? null,
  price_usd: p.price ?? null,
  image_path: p.img ?? null,
}));

let { error } = await db.from('products').upsert(products);
if (error) throw new Error(error.message);

const sources = JSON.parse(await readFile(new URL('../scraper/sources.json', import.meta.url), 'utf8'));
({ error } = await db.from('review_sources').upsert(sources, { onConflict: 'url', ignoreDuplicates: true }));
if (error) throw new Error(error.message);

console.log(`Seeded ${products.length} products and ${sources.length} review sources.`);
